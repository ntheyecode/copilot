// HTTP contract of GET /api/work/team/ai for a COMPANY ADMIN. The route narrows
// publicCompany.companyAi so platform IP (provider, models) never reaches a
// company admin, while the company's own facts stay: the masked key tail, when
// it was set, and WHO entered it (`owner`). The console's "Remove my keys" path
// and the 3-way AI setup (src/shared/ai_source_options.js) read `owner`; an
// earlier IP-scrub dropped it and silently hid that button for every company
// admin. This test fails if either side of the contract moves again.
import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
process.env.WORK_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'wc-coai-'))
process.env.PORT = '0'
process.env.WORK_MFA_DISABLED = '1'
process.env.SESSION_SECRET = 'company-ai-surface-secret'

// App requests pass through; any external host (OSV / registry / model lists)
// returns a benign empty 200. No network, no key, no live data.
const realFetch = globalThis.fetch
globalThis.fetch = async (url, opts) => {
  const u = String(url)
  if (u.startsWith('http://127.0.0.1') || u.startsWith('http://localhost')) return realFetch(url, opts)
  return new Response(JSON.stringify({}), { status: 200, headers: { 'content-type': 'application/json' } })
}

const relative = (f) => 'file://' + path.join(here, f).replace(/\\/g, '/')
const index = await import(relative('index.js'))
const store = await import(relative('store.js'))

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
const pw = 'Passw0rd!admin'

async function adminSession(companyId) {
  const admin = store.createManagedUser({ username: uniq('co_admin_'), password: pw, companyId, companyRole: 'company_admin', tier: 'basic' })
  const j = jar()
  const r = await req(j, 'POST', '/api/work/login', { username: admin.username, password: pw })
  assert.equal(r.status, 200, 'company admin signs in (MFA disabled for the test)')
  return j
}

test('company admin sees owner + masked tail of their own key, never provider or models', async () => {
  const co = store.createCompany({ name: 'Keyed Co', plan: 'premium' })
  store.setCompanyAiSource(co.id, 'company')
  store.setCompanyAiKeys(co.id, { providerId: 'openai', apiKey: 'sk-test-dummy-key-7788', chatModel: 'gpt-4o-mini', visionModel: 'gpt-4o-mini' }, 'company')
  const j = await adminSession(co.id)
  const r = await req(j, 'GET', '/api/work/team/ai')
  assert.equal(r.status, 200)
  assert.equal(r.data.aiSource, 'company')
  assert.equal(r.data.aiReady, true)
  assert.equal(r.data.hasCompanyAi, true)
  assert.ok(r.data.companyAi, 'the key block is present')
  assert.equal(r.data.companyAi.owner, 'company', 'owner survives the narrowing (the console branches on it)')
  assert.equal(r.data.companyAi.keyMasked, '••••7788')
  assert.ok(r.data.companyAi.setAt, 'setAt survives')
  assert.deepEqual(Object.keys(r.data.companyAi).sort(), ['keyMasked', 'owner', 'setAt'], 'nothing else leaks: no providerId, chatModel or visionModel')
})

test('team-entered key reports owner corporate; platform source reports ready with no key block', async () => {
  const co = store.createCompany({ name: 'Managed Co', plan: 'basic' })
  store.setCompanyAiSource(co.id, 'company')
  store.setCompanyAiKeys(co.id, { providerId: 'gemini', apiKey: 'AIza-test-dummy-key-4321' }, 'corporate')
  const j = await adminSession(co.id)
  const r = await req(j, 'GET', '/api/work/team/ai')
  assert.equal(r.status, 200)
  assert.equal(r.data.companyAi.owner, 'corporate')
  assert.equal(r.data.companyAi.providerId, undefined, 'provider stays hidden from the company admin')

  const co2 = store.createCompany({ name: 'Platform Co', plan: 'basic' })
  store.setCompanyAiSource(co2.id, 'platform')
  const j2 = await adminSession(co2.id)
  const r2 = await req(j2, 'GET', '/api/work/team/ai')
  assert.equal(r2.status, 200)
  assert.equal(r2.data.aiSource, 'platform')
  assert.equal(r2.data.aiReady, true, 'shared platform keys are ready at once')
  assert.equal(r2.data.companyAi, null, 'no key block on platform keys')
})

test('company source with no key yet is reported not ready, with the reason', async () => {
  const co = store.createCompany({ name: 'Waiting Co', plan: 'basic' })
  store.setCompanyAiSource(co.id, 'company')
  const j = await adminSession(co.id)
  const r = await req(j, 'GET', '/api/work/team/ai')
  assert.equal(r.status, 200)
  assert.equal(r.data.aiReady, false)
  assert.match(String(r.data.aiReason || ''), /none are set yet/i)
})
