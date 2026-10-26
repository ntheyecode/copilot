// HTTP end-to-end for the LEGAL CONSENT (clickwrap) gate. Boots the real Express
// app and drives the real signup + consent endpoints + the re-consent gate, so it
// exercises the actual wiring: no account without an explicit acceptance, every
// acceptance recorded with a version, and "whoever it is" (here: a user whose
// accepted version is stale, standing in for a social/SSO/admin-created account)
// is blocked from USING the platform until they accept the current version.
import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
process.env.WORK_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'wc-legal-'))
process.env.PORT = '0'
process.env.WORK_MFA_DISABLED = '1'   // session established on signup, no authenticator step
process.env.SESSION_SECRET = 'legal-consent-e2e-secret'

const realFetch = globalThis.fetch
globalThis.fetch = async (url, opts) => {
  const u = String(url)
  if (u.startsWith('http://127.0.0.1') || u.startsWith('http://localhost')) return realFetch(url, opts)
  return new Response(JSON.stringify({}), { status: 200, headers: { 'content-type': 'application/json' } })
}

const relative = (f) => 'file://' + path.join(here, f).replace(/\\/g, '/')
const index = await import(relative('index.js'))
const store = await import(relative('store.js'))
const { LEGAL_VERSION } = await import(relative('legal.js'))

const srv = await new Promise((resolve) => { const s = index.app.listen(0, () => resolve(s)) })
const base = `http://127.0.0.1:${srv.address().port}`
after(() => { globalThis.fetch = realFetch; try { srv.closeAllConnections?.() } catch {} return new Promise((r) => srv.close(r)) })

function jar() { return { map: {} } }
async function req(j, method, p, body) {
  const headers = { 'content-type': 'application/json' }
  const cookie = Object.entries(j.map).map(([k, v]) => `${k}=${v}`).join('; ')
  if (cookie) headers.cookie = cookie
  const res = await fetch(base + p, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
  const sc = res.headers.getSetCookie ? res.headers.getSetCookie() : []
  for (const c of sc) { const nv = c.split(';')[0]; const i = nv.indexOf('='); if (i > 0) j.map[nv.slice(0, i)] = nv.slice(i + 1) }
  let data = null
  try { data = await res.json() } catch {}
  return { status: res.status, data }
}
const uniq = (p) => p + Math.random().toString(36).slice(2, 8)
const signupBody = (extra = {}) => ({ username: uniq('u'), password: 'Passw0rd!x', name: 'Test User', email: uniq('e') + '@example.com', ...extra })

test('GET /api/work/legal returns the current version and the agreements', async () => {
  const r = await req(jar(), 'GET', '/api/work/legal')
  assert.equal(r.status, 200)
  assert.equal(r.data.version, LEGAL_VERSION)
  const keys = r.data.docs.map((d) => d.key)
  assert.ok(keys.includes('terms') && keys.includes('privacy'), 'terms + privacy are in the set')
})

test('signup WITHOUT accepting is refused (no account, no implied consent)', async () => {
  const r = await req(jar(), 'POST', '/api/work/signup', signupBody())   // no acceptTerms
  assert.equal(r.status, 400)
  assert.equal(r.data.legalRequired, true)
})

test('signup WITH an explicit acceptance creates the account and records consent', async () => {
  const j = jar()
  const r = await req(j, 'POST', '/api/work/signup', signupBody({ acceptTerms: true }))
  assert.equal(r.status, 200)
  assert.ok(r.data.user && r.data.user.id)
  assert.equal(r.data.user.legalRequired, false)                // accepted, so not gated
  assert.equal(r.data.user.legal.version, LEGAL_VERSION)        // the current version is on record
})

test('a user on a STALE version is blocked from using the platform until they accept', async () => {
  const j = jar()
  const s = await req(j, 'POST', '/api/work/signup', signupBody({ acceptTerms: true }))
  const uid = s.data.user.id
  // Stand in for a social / SSO / admin-created account (or a version bump): the
  // accepted version is no longer current.
  store.recordLegalAcceptance(uid, { version: '0000-00-00', method: 'test' })
  assert.equal(store.hasAcceptedCurrentLegal(uid), false)
  const me1 = await req(j, 'GET', '/api/work/me')
  assert.equal(me1.data.user ? me1.data.user.legalRequired : me1.data.legalRequired, true)
  // A guidance action (subscription-gated) is refused with legalRequired, before any work happens.
  const blocked = await req(j, 'POST', '/api/work/sessions/none/plan', { goal: 'do a thing' })
  assert.equal(blocked.status, 403)
  assert.equal(blocked.data.legalRequired, true)
  // Accept the current version, and the legal gate no longer blocks the action.
  const acc = await req(j, 'POST', '/api/work/legal/accept', { accept: true })
  assert.equal(acc.status, 200)
  assert.equal(acc.data.user.legalRequired, false)
  assert.equal(store.hasAcceptedCurrentLegal(uid), true)
  const after2 = await req(j, 'POST', '/api/work/sessions/none/plan', { goal: 'do a thing' })
  assert.notEqual(after2.data && after2.data.legalRequired, true)   // no longer the legal gate
})

test('accept endpoint requires an explicit confirmation', async () => {
  const j = jar()
  await req(j, 'POST', '/api/work/signup', signupBody({ acceptTerms: true }))
  const r = await req(j, 'POST', '/api/work/legal/accept', {})   // missing accept:true
  assert.equal(r.status, 400)
})

test('consent is an append-only audit trail (re-accepts keep history)', async () => {
  const j = jar()
  const s = await req(j, 'POST', '/api/work/signup', signupBody({ acceptTerms: true }))
  const uid = s.data.user.id
  store.recordLegalAcceptance(uid, { version: '0000-00-00', method: 'test' })
  await req(j, 'POST', '/api/work/legal/accept', { accept: true })
  const u = store.getUser(uid)
  assert.ok(Array.isArray(u.legalHistory) && u.legalHistory.length >= 2, 'history keeps each acceptance')
  assert.equal(u.legal.version, LEGAL_VERSION)   // current record is the latest accepted
})
