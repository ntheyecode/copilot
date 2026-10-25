// Superadmin support-impersonation of an INDIVIDUAL user + the Validate-it-live
// lead `country` field. HTTP-level: boots the real Express app (index.js) on an
// ephemeral port and drives it with a cookie jar, because the session-flip and
// the /me banner are middleware behaviour, not pure store calls. MFA is turned
// off (break-glass env flag) so the test can sign in without a second factor.
// Synthetic users/companies only, in an isolated temp data dir.
import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
// Env MUST be set before index.js (and, through it, store.js) is first imported:
// store loads + seeds the DB at import time.
process.env.WORK_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'wc-impersonate-'))
process.env.PORT = '0'
process.env.WORK_MFA_DISABLED = '1'            // break-glass: no second factor in the test
process.env.WORK_ADMIN_PASSWORD = 'Admin-Pass-123!'
process.env.SESSION_SECRET = 'impersonation-test-secret'

// Relative specifiers so these resolve to the SAME module instances index.js
// imports (its own `./store.js`) - the test's store MUST be the app's store.
const index = await import('./index.js')
const store = await import('./store.js')
const { EMAIL_DEFS, renderEmail } = await import('./email_templates.js')

const srv = await new Promise((resolve) => { const s = index.app.listen(0, () => resolve(s)) })
const base = `http://127.0.0.1:${srv.address().port}`
after(() => { try { srv.closeAllConnections?.() } catch { /* best effort */ } return new Promise((r) => srv.close(r)) })

// Minimal cookie jar keyed by cookie name (the session cookie is reset across
// login/stop, same name, so keying by name keeps exactly one live value).
function jar() { return { map: {} } }
async function req(j, method, p, body) {
  const headers = { 'content-type': 'application/json' }
  const cookie = Object.entries(j.map).map(([k, v]) => `${k}=${v}`).join('; ')
  if (cookie) headers.cookie = cookie
  const res = await fetch(base + p, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
  const sc = res.headers.getSetCookie ? res.headers.getSetCookie() : []
  for (const c of sc) { const nv = c.split(';')[0]; const i = nv.indexOf('='); if (i > 0) j.map[nv.slice(0, i)] = nv.slice(i + 1) }
  let data = null
  try { data = await res.json() } catch { /* some responses are empty */ }
  return { status: res.status, data }
}

const uniq = (p) => p + Math.random().toString(36).slice(2, 8)

// A signed-in superadmin session (the seeded `admin` account).
async function adminSession() {
  const j = jar()
  const r = await req(j, 'POST', '/api/work/login', { username: 'admin', password: process.env.WORK_ADMIN_PASSWORD })
  assert.equal(r.status, 200, 'superadmin signs in')
  assert.ok(r.data.user && r.data.user.role === 'superadmin', 'seeded admin is the superadmin')
  return { j, id: r.data.user.id }
}

test('superadmin impersonates an individual: session flips, /me shows the banner, it is audited, stop restores the admin', async () => {
  const { j, id: adminId } = await adminSession()
  const target = store.createWorkUser({ username: uniq('imp_ind_'), password: 'Passw0rd!x', email: uniq('ind') + '@x.test', displayName: 'Terry Target' })
  assert.ok(!target.companyId, 'target is an individual (no company)')

  const beforeStart = store.listAdminActions({ limit: 2000 }).length
  let r = await req(j, 'POST', `/api/work/admin/impersonate/${target.id}`)
  assert.equal(r.status, 200, 'impersonation accepted')
  assert.equal(r.data.ok, true)
  assert.equal(r.data.user.id, target.id, 'returns the impersonated user id')
  assert.equal(r.data.user.name, 'Terry Target', 'returns a display name for the banner')

  // The SAME session now ACTS AS the target, and /me carries the banner payload.
  r = await req(j, 'GET', '/api/work/me')
  assert.equal(r.data.signedIn, true)
  assert.equal(r.data.user.id, target.id, 'session flipped to the target')
  assert.ok(r.data.impersonating, '/me includes the impersonating banner')
  assert.ok(r.data.impersonating.by, 'banner names the admin')
  assert.ok(r.data.impersonating.since, 'banner carries a since timestamp')

  // Audited via the superadmin sink, keyed by the affected user.
  const acts = store.listAdminActions({ limit: 2000 })
  assert.equal(acts.length, beforeStart + 1, 'exactly one audit entry was added')
  const startEntry = acts.find((a) => a.action === 'impersonate_start' && a.userId === target.id)
  assert.ok(startEntry, 'impersonate_start is audited against the target')
  assert.match(startEntry.detail, /superadmin/, 'the acting admin is captured in the audit detail')

  // Stop restores the admin's own view, no banner, and is audited.
  r = await req(j, 'POST', '/api/work/admin/impersonate/stop')
  assert.equal(r.status, 200)
  r = await req(j, 'GET', '/api/work/me')
  assert.equal(r.data.user.id, adminId, 'session restored to the admin')
  assert.ok(!r.data.impersonating, 'banner cleared after stop')
  assert.ok(store.listAdminActions({ limit: 2000 }).some((a) => a.action === 'impersonate_stop' && a.userId === target.id), 'stop is audited')
})

test('impersonating a company member is rejected 400 (individual users only) and the session is NOT flipped', async () => {
  const { j, id: adminId } = await adminSession()
  const co = store.createCompany({ name: uniq('Imp Co '), seats: 5, adminSeats: 1 })
  const member = store.createManagedUser({ username: uniq('imp_mem_'), password: 'Passw0rd!x', companyId: co.id, companyRole: 'member' })

  const r = await req(j, 'POST', `/api/work/admin/impersonate/${member.id}`)
  assert.equal(r.status, 400)
  assert.match(r.data.error, /individual users only/i)
  // Session untouched: still the admin.
  const me = await req(j, 'GET', '/api/work/me')
  assert.equal(me.data.user.id, adminId, 'a rejected impersonation never flips the session')
  assert.ok(!me.data.impersonating)
})

test('self-impersonation is rejected 400', async () => {
  const { j, id: adminId } = await adminSession()
  const r = await req(j, 'POST', `/api/work/admin/impersonate/${adminId}`)
  assert.equal(r.status, 400)
  assert.match(r.data.error, /yourself/i)
})

test('impersonating a superadmin/admin is rejected 403 (never reach up a privilege tier)', async () => {
  const { j } = await adminSession()
  const elevated = store.createWorkUser({ username: uniq('imp_sa_'), password: 'Passw0rd!x', email: uniq('sa') + '@x.test' })
  store.getUser(elevated.id).role = 'superadmin'   // test-only: make the target an admin-tier account
  const r = await req(j, 'POST', `/api/work/admin/impersonate/${elevated.id}`)
  assert.equal(r.status, 403)
  assert.match(r.data.error, /administrators/i)
})

test('a non-superadmin cannot impersonate (403 Superadmin only)', async () => {
  const reg = store.createWorkUser({ username: uniq('imp_reg_'), password: 'Passw0rd!x', email: uniq('reg') + '@x.test' })
  const victim = store.createWorkUser({ username: uniq('imp_vic_'), password: 'Passw0rd!x', email: uniq('vic') + '@x.test' })
  const j = jar()
  let r = await req(j, 'POST', '/api/work/login', { username: reg.username, password: 'Passw0rd!x' })
  assert.equal(r.status, 200, 'ordinary user signs in')
  r = await req(j, 'POST', `/api/work/admin/impersonate/${victim.id}`)
  assert.equal(r.status, 403, 'requireSuperAdmin blocks an ordinary user')
})

test('unknown target user is 404', async () => {
  const { j } = await adminSession()
  const r = await req(j, 'POST', '/api/work/admin/impersonate/no-such-user-id')
  assert.equal(r.status, 404)
})

// ---- Feature 2: Validate-it-live lead `country` --------------------------
test('POST /api/work/leads requires country (400 when missing)', async () => {
  const r = await req(jar(), 'POST', '/api/work/leads', { firstName: 'Lee', lastName: 'Ray', email: uniq('lead') + '@x.test', company: 'Acme' })
  assert.equal(r.status, 400)
  assert.match(r.data.error, /country/i)
})

test('POST /api/work/leads stores country when provided', async () => {
  const email = uniq('leadc') + '@x.test'
  const r = await req(jar(), 'POST', '/api/work/leads', { firstName: 'Lee', lastName: 'Ray', email, company: 'Acme', country: 'Canada' })
  assert.equal(r.status, 200)
  const stored = store.listWorkLeads({ limit: 2000 }).find((l) => l.email === email)
  assert.ok(stored, 'the lead is stored')
  assert.equal(stored.country, 'Canada', 'country is persisted on the lead record')
})

test('the lead_notify email carries the country value through to the rendered body', () => {
  const m = renderEmail('lead_notify', { ...EMAIL_DEFS.lead_notify.sampleData, country: 'Brazil' })
  assert.match(m.text, /Country/, 'the Country label is present')
  assert.match(m.text, /Brazil/, 'the country value reaches the email body')
})
