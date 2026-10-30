// Integration API, end to end over HTTP against the real Express app: company
// admins mint keys in the console; customer apps call /api/v1 with them.
// Proves tenant isolation (company A's key never touches company B), revoked /
// scope-less / IP-blocked keys fail, keys never reach session or admin routes,
// the per-key rate limit answers 429 + Retry-After, the launch link only works
// for its own employee once, and the OpenAPI document matches the live router.
// Synthetic users/companies only, in an isolated temp data dir.
import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

process.env.WORK_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'wc-apiv1-'))
process.env.PORT = '0'
process.env.WORK_MFA_DISABLED = '1'
process.env.WORK_ADMIN_PASSWORD = 'Admin-Pass-123!'
process.env.SESSION_SECRET = 'api-v1-test-secret'
process.env.WORK_API_RATE_PER_MIN = '40'

const index = await import('./index.js')
const store = await import('./store.js')
const { V1_ROUTES } = await import('./routes_v1.js')
// The brain is configured in index.start(); this test listens directly, so wire it the same way.
const { configureBrainCrypto } = await import('./brain_crypto.js')
const { configureBrainStore } = await import('./brain_store.js')
configureBrainCrypto({ getMasterKey: store.brainMasterKey })
configureBrainStore({ getWrappedDek: store.getCompanyBrainDek, setWrappedDek: store.setCompanyBrainDek, getCustody: store.getCompanyBrainCustody })

const srv = await new Promise((resolve) => { const s = index.app.listen(0, () => resolve(s)) })
const base = `http://127.0.0.1:${srv.address().port}`
after(() => { try { srv.closeAllConnections?.() } catch { /* best effort */ } return new Promise((r) => srv.close(r)) })

function jar() { return { map: {} } }
async function call(j, method, p, body, headers = {}) {
  const h = { 'content-type': 'application/json', ...headers }
  const cookie = j ? Object.entries(j.map).map(([k, v]) => `${k}=${v}`).join('; ') : ''
  if (cookie) h.cookie = cookie
  const res = await fetch(base + p, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) })
  if (j) for (const c of (res.headers.getSetCookie ? res.headers.getSetCookie() : [])) { const nv = c.split(';')[0]; const i = nv.indexOf('='); if (i > 0) j.map[nv.slice(0, i)] = nv.slice(i + 1) }
  let data = null
  try { data = await res.json() } catch { /* empty */ }
  return { status: res.status, data, headers: res.headers }
}
const withKey = (key, method, p, body) => call(null, method, p, body, { authorization: `Bearer ${key}` })
const uniq = (p) => p + Math.random().toString(36).slice(2, 8)
const PASS = 'Passw0rd!xyz'
async function login(username) {
  const j = jar()
  const r = await call(j, 'POST', '/api/work/login', { username, password: PASS })
  assert.equal(r.status, 200, `${username} signs in`)
  return j
}

// Two companies, each with an admin, a member and a published workflow + incident.
function seedCompany(tag) {
  const co = store.createCompany({ name: uniq(`Api ${tag} `), seats: 10, adminSeats: 2 })
  const admin = store.createManagedUser({ username: uniq(`adm${tag}_`), password: PASS, companyId: co.id, companyRole: 'company_admin' })
  const member = store.createManagedUser({ username: uniq(`mem${tag}_`), password: PASS, email: uniq(`m${tag}`) + '@x.test', companyId: co.id, companyRole: 'member' })
  const w = store.createWorkflow(admin.id, { meta: { productName: 'CRM', title: `Refund ${tag}`, owner: 'Pat Owner', launchTarget: 'crm.example.com', supportEmail: 'pat@x.test' }, steps: [{ instruction: 'Open the refund tab' }, { instruction: 'Press Refund', target: 'Refund' }] })
  store.publishWorkflow(admin.id, w.id)
  const draft = store.createWorkflow(admin.id, { meta: { productName: 'CRM', title: `Draft ${tag}`, owner: 'x', launchTarget: 'y' }, steps: [] })
  const inc = store.recordWorkflowIncident({ userId: member.id, sessionId: uniq('s'), workflowRef: { id: w.id, groupId: w.groupId, version: 1, title: `Refund ${tag}`, mode: 'run' }, stepIndex: 0, stepText: 'Open the refund tab', deviation: { kind: 'error', why: 'An error banner showed' } })
  return { co, admin, member, w, draft, inc: inc.incident }
}
const A = seedCompany('A')
const B = seedCompany('B')
const jA = await login(A.admin.username)
const jB = await login(B.admin.username)
async function mint(j, scopes, extra = {}) {
  const r = await call(j, 'POST', '/api/work/company/api-keys', { name: uniq('key '), scopes, ...extra })
  assert.equal(r.status, 201, JSON.stringify(r.data))
  return r.data
}
const ALL = ['brain:query', 'workflows:read', 'workflows:run', 'incidents:read', 'webhooks:manage']
const keyA = (await mint(jA, ALL)).secret
const keyB = (await mint(jB, ALL)).secret

test('the console: only a company admin manages keys; the secret is shown once and never listed', async () => {
  const jm = await login(A.member.username)
  assert.equal((await call(jm, 'GET', '/api/work/company/api-keys')).status, 403)
  assert.equal((await call(jm, 'POST', '/api/work/company/api-keys', { name: 'x', scopes: ['brain:query'] })).status, 403)
  const list = await call(jA, 'GET', '/api/work/company/api-keys')
  assert.equal(list.status, 200)
  assert.deepEqual(list.data.scopes.map((s) => s.id), ALL)
  assert.equal(list.data.stepUp.required, false)
  assert.ok(list.data.keys.length >= 1)
  assert.ok(!JSON.stringify(list.data).includes(keyA.split('_').pop()), 'secret never listed')
  const bad = await call(jA, 'POST', '/api/work/company/api-keys', { name: 'x', scopes: ['billing:write'] })
  assert.deepEqual([bad.status, bad.data.code], [400, 'BAD_SCOPES'])
  assert.ok(store.listAdminActions({ limit: 50 }).some((a) => a.action === 'api_key_create'), 'creation audited')
})

test('a key never reaches session or admin routes (it is not a person)', async () => {
  for (const [m, p] of [['GET', '/api/work/company/api-keys'], ['POST', '/api/work/company/api-keys'], ['GET', '/api/work/me'], ['POST', '/api/work/brain/query'], ['GET', '/api/work/workflows'], ['GET', '/api/work/company/webhooks']]) {
    const r = await withKey(keyA, m, p, m === 'POST' ? { name: 'x', scopes: ALL, q: 'x' } : undefined)
    assert.ok(r.status === 401 || (p === '/api/work/me' && r.data && r.data.signedIn === false), `${m} ${p} -> ${r.status}`)
  }
})

test('tenant isolation: company A key sees only A, and B ids answer 404', async () => {
  const wl = await withKey(keyA, 'GET', '/api/v1/workflows')
  assert.equal(wl.status, 200)
  assert.deepEqual(wl.data.workflows.map((w) => w.id), [A.w.id], 'published only, own company only')
  const json = JSON.stringify(wl.data)
  for (const leak of ['authorId', 'Pat Owner', 'pat@x.test', B.w.id]) assert.ok(!json.includes(leak), leak)
  const one = await withKey(keyA, 'GET', `/api/v1/workflows/${A.w.id}`)
  assert.deepEqual(one.data.workflow.steps.map((s) => s.instruction), ['Open the refund tab', 'Press Refund'])
  assert.ok(!JSON.stringify(one.data).includes('shot'))
  for (const p of [`/api/v1/workflows/${B.w.id}`, `/api/v1/workflows/${A.draft.id}`, `/api/v1/incidents/${B.inc.id}`]) {
    const r = await withKey(keyA, 'GET', p)
    assert.deepEqual([r.status, r.data.code], [404, 'NOT_FOUND'], p)
  }
  const il = await withKey(keyA, 'GET', '/api/v1/incidents')
  assert.deepEqual(il.data.incidents.map((i) => i.id), [A.inc.id])
  for (const k of ['occurrences', 'sessionIds', 'frameRef', 'note', 'userId']) assert.ok(!(k in il.data.incidents[0]), `incident shape has no ${k}`)
  assert.equal((await withKey(keyB, 'GET', `/api/v1/incidents/${B.inc.id}`)).status, 200)
  // launching B's workflow, or targeting B's employee, with A's key fails
  assert.equal((await withKey(keyA, 'POST', `/api/v1/workflows/${B.w.id}/launch`, { employee: { id: A.member.id } })).status, 404)
  const cross = await withKey(keyA, 'POST', `/api/v1/workflows/${A.w.id}/launch`, { employee: { email: B.member.email } })
  assert.deepEqual([cross.status, cross.data.code], [404, 'EMPLOYEE_NOT_FOUND'])
  // webhooks list is company-scoped
  assert.deepEqual((await withKey(keyB, 'GET', '/api/v1/webhooks')).data.endpoints, [])
})

test('brain query runs for the key company through the same queryBrain', async () => {
  const r = await withKey(keyA, 'POST', '/api/v1/brain/query', { q: 'refund policy' })
  assert.equal(r.status, 409, 'an empty brain is a stated error, never a silent empty')
  assert.equal(r.data.code, 'BRAIN_EMPTY')
  assert.equal(typeof r.data.error, 'string')
  assert.deepEqual([(await withKey(keyA, 'POST', '/api/v1/brain/query', { q: '' })).data.code], ['BAD_QUERY'])
})

test('missing, malformed, revoked, scope-less and IP-blocked keys fail with machine codes', async () => {
  let r = await call(null, 'GET', '/api/v1/workflows')
  assert.deepEqual([r.status, r.data.code], [401, 'MISSING_KEY'])
  assert.match(r.headers.get('www-authenticate') || '', /Bearer/)
  r = await withKey('wcp_live_0123456789abcdef_' + 'A'.repeat(43), 'GET', '/api/v1/workflows')
  assert.deepEqual([r.status, r.data.code], [401, 'INVALID_KEY'])
  r = await call(null, 'GET', `/api/v1/workflows?key=${encodeURIComponent(keyA)}`)
  assert.equal(r.status, 401, 'a key in the query string is never accepted')

  const narrow = await mint(jA, ['brain:query'])
  r = await withKey(narrow.secret, 'GET', '/api/v1/workflows')
  assert.deepEqual([r.status, r.data.code], [403, 'INSUFFICIENT_SCOPE'])
  r = await withKey(narrow.secret, 'POST', '/api/v1/webhooks', { url: 'https://hooks.example.org/x', events: ['workflow.published'] })
  assert.deepEqual([r.status, r.data.code], [403, 'INSUFFICIENT_SCOPE'])

  const ipKey = await mint(jA, ['workflows:read'], { ipAllowlist: ['203.0.113.10'] })
  r = await withKey(ipKey.secret, 'GET', '/api/v1/workflows')
  assert.deepEqual([r.status, r.data.code], [403, 'IP_NOT_ALLOWED'])

  const rev = await mint(jA, ['workflows:read'])
  assert.equal((await withKey(rev.secret, 'GET', '/api/v1/workflows')).status, 200)
  const del = await call(jA, 'DELETE', `/api/work/company/api-keys/${rev.key.id}`)
  assert.equal(del.data.key.status, 'revoked')
  r = await withKey(rev.secret, 'GET', '/api/v1/workflows')
  assert.deepEqual([r.status, r.data.code], [401, 'KEY_REVOKED'])
  // B's admin cannot revoke or rotate A's key
  assert.equal((await call(jB, 'DELETE', `/api/work/company/api-keys/${narrow.key.id}`)).status, 404)
  assert.equal((await call(jB, 'POST', `/api/work/company/api-keys/${narrow.key.id}/rotate`, {})).status, 404)
  // rotate: old stops, new works
  const rot = await call(jA, 'POST', `/api/work/company/api-keys/${narrow.key.id}/rotate`, {})
  assert.equal(rot.status, 200)
  assert.equal((await withKey(narrow.secret, 'POST', '/api/v1/brain/query', { q: 'x' })).data.code, 'KEY_REVOKED')
  assert.equal((await withKey(rot.data.secret, 'POST', '/api/v1/brain/query', { q: 'x' })).data.code, 'BRAIN_EMPTY')
})

test('webhook registration refuses private targets before any network call', async () => {
  for (const url of ['https://127.0.0.1/x', 'https://169.254.169.254/latest', 'http://hooks.example.org/x', 'https://localhost/x']) {
    const r = await withKey(keyA, 'POST', '/api/v1/webhooks', { url, events: ['workflow.published'] })
    assert.deepEqual([r.status, r.data.code], [400, 'BAD_URL'], url)
  }
  const r = await call(jA, 'POST', '/api/work/company/webhooks', { url: 'https://10.1.1.1/', events: ['workflow.published'] })
  assert.deepEqual([r.status, r.data.code], [400, 'BAD_URL'])
})

test('launch link: single use, only for the employee it names, through their own sign-in', async () => {
  const r = await withKey(keyA, 'POST', `/api/v1/workflows/${A.w.id}/launch`, { employee: { email: A.member.email } })
  assert.equal(r.status, 201)
  assert.match(r.data.url, /\/work\/launch#[A-Za-z0-9_-]{43}$/)
  assert.equal(r.data.employeeId, A.member.id)
  const token = r.data.url.split('#')[1]
  assert.equal((await call(null, 'POST', '/api/work/launch/redeem', { token })).status, 401, 'the link alone is not a sign-in')
  const wrong = await call(jA, 'POST', '/api/work/launch/redeem', { token })
  assert.deepEqual([wrong.status, wrong.data.code], [403, 'LAUNCH_WRONG_USER'], 'even the company admin cannot use it')
  const jm = await login(A.member.username)
  const ok = await call(jm, 'POST', '/api/work/launch/redeem', { token })
  assert.deepEqual([ok.status, ok.data.workflowId], [200, A.w.id])
  const again = await call(jm, 'POST', '/api/work/launch/redeem', { token })
  assert.deepEqual([again.status, again.data.code], [410, 'LAUNCH_USED'])
})

test('per-key rate limit answers 429 with Retry-After; another key is unaffected', async () => {
  const k = (await mint(jA, ['workflows:read'])).secret
  let hit = null
  for (let i = 0; i < 60 && !hit; i++) {
    const r = await withKey(k, 'GET', '/api/v1/workflows')
    if (r.status === 429) hit = r
  }
  assert.ok(hit, 'the limit is reached')
  assert.equal(hit.data.code, 'RATE_LIMITED')
  assert.ok(Number(hit.headers.get('retry-after')) >= 1)
  assert.equal((await withKey(keyB, 'GET', '/api/v1/workflows')).status, 200)
})

test('a brain query is capped in length and the v1 body limit is small', async () => {
  const r = await withKey(keyB, 'POST', '/api/v1/brain/query', { q: 'x'.repeat(2001) })
  assert.deepEqual([r.status, r.data.code], [400, 'BAD_QUERY'])
  const big = await withKey(keyB, 'POST', '/api/v1/brain/query', { q: 'x', pad: 'y'.repeat(70 * 1024) })
  assert.deepEqual([big.status, big.data.code], [413, 'PAYLOAD_TOO_LARGE'])
})

test('errors keep the v1 shape: unknown route, bad JSON', async () => {
  let r = await withKey(keyA, 'GET', '/api/v1/nope')
  assert.deepEqual([r.status, r.data.code], [404, 'NOT_FOUND'])
  const res = await fetch(base + '/api/v1/brain/query', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${keyA}` }, body: '{bad' })
  r = { status: res.status, data: await res.json() }
  assert.deepEqual([r.status, r.data.code], [400, 'BAD_JSON'])
})

test('the OpenAPI 3.1 document matches the live router exactly (no drift)', async () => {
  const r = await call(null, 'GET', '/api/v1/openapi.json')
  assert.equal(r.status, 200)
  const doc = r.data
  assert.equal(doc.openapi, '3.1.0')
  const documented = new Set()
  for (const [p, ops] of Object.entries(doc.paths)) {
    for (const [m, op] of Object.entries(ops)) {
      documented.add(`${m.toUpperCase()} ${p}`)
      assert.ok(ALL.includes(op['x-required-scope']), `${m} ${p} declares a registry scope`)
      assert.ok(op.security && op.security.length, `${m} ${p} requires the key`)
    }
  }
  const live = new Set()
  for (const layer of index.app._router.stack) {
    const rt = layer.route
    if (!rt || typeof rt.path !== 'string' || !rt.path.startsWith('/api/v1/') || rt.path === '/api/v1/openapi.json') continue
    for (const m of Object.keys(rt.methods)) live.add(`${m.toUpperCase()} ${rt.path.replace(/:([A-Za-z_]+)/g, '{$1}')}`)
  }
  assert.deepEqual([...live].sort(), [...documented].sort())
  assert.equal(live.size, V1_ROUTES.length)
  // every component $ref resolves
  const refs = JSON.stringify(doc).match(/#\/components\/(schemas|responses)\/[A-Za-z0-9]+/g) || []
  for (const ref of new Set(refs)) {
    const [, kind, name] = ref.split('/').slice(1)
    assert.ok(doc.components[kind][name], `${ref} resolves`)
  }
  assert.deepEqual(Object.keys(doc.webhooks).sort(), ['ping', 'workflow.incident.created', 'workflow.published'])
  // never a provider or model name in the public contract
  assert.ok(!/openai|anthropic|gemini|groq|claude|gpt|moonshot|bge/i.test(JSON.stringify(doc)))
})
