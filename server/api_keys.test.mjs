// Company API keys orchestration with a fake store context and a controllable
// clock: RBAC, step-up, show-once secret, rotate (immediate + grace), revoke,
// expiry, tenant isolation, audit, aggregated use, and launch links.
import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { createApiKeys } from './api_keys.js'
import { createLaunchLinks } from './launch_links.js'
import { makeMfaStepUp } from './mfa_step_up.js'
import { derivePepper } from './api_key_rules.js'

function harness({ hosted = false } = {}) {
  const db = {}
  let now = Date.UTC(2026, 9, 30, 12)
  const users = {
    a1: { id: 'a1', companyId: 'cA', companyRole: 'company_admin', name: 'Ann', mfa: { enabled: true } },
    a2: { id: 'a2', companyId: 'cB', companyRole: 'company_admin', name: 'Bo' },
    m1: { id: 'm1', companyId: 'cA', companyRole: 'member', email: 'Mia@A.test', username: 'mia' },
    m2: { id: 'm2', companyId: 'cB', companyRole: 'member', email: 'max@b.test' },
    m3: { id: 'm3', companyId: 'cA', companyRole: 'member', email: 'off@a.test', disabled: true },
  }
  const companies = { cA: { id: 'cA' }, cB: { id: 'cB' } }
  const audits = []
  const pepper = derivePepper(crypto.randomBytes(32))
  const keys = createApiKeys({
    db: () => db, persist: () => {}, persistSoon: () => {}, getUser: (id) => users[id] || null,
    httpErr: (s, m) => Object.assign(new Error(m), { status: s }), company: (id) => companies[id] || null,
    pepper: () => pepper, audit: (a) => audits.push(a), clock: () => now,
    stepUp: makeMfaStepUp({ verifyMfa: (u, t) => t === '246810', hosted, mfaGloballyEnabled: () => true, failures: new Map() }),
  })
  const workflows = { w1: { id: 'w1', companyId: 'cA', state: 'published', meta: { title: 'Refund' } }, w2: { id: 'w2', companyId: 'cB', state: 'published', meta: { title: 'B' } } }
  const links = createLaunchLinks({
    db: () => db, persist: () => {}, getUser: (id) => users[id] || null, httpErr: (s, m) => Object.assign(new Error(m), { status: s }),
    companyUsers: (cid) => Object.values(users).filter((u) => u.companyId === cid),
    workflowFor: (cid, id) => { const w = workflows[id]; return w && w.companyId === cid && w.state === 'published' ? w : null },
    keyActive: (id) => keys.isActive(id), clock: () => now,
  })
  return { db, keys, links, users, companies, audits, workflows, tick: (ms) => { now += ms }, now: () => now }
}

test('create returns the secret once; list never carries it; the key resolves to the company, never a person', () => {
  const h = harness()
  const { key, secret } = h.keys.createApiKey('a1', { name: 'CRM', scopes: ['brain:query', 'workflows:read'], ipAllowlist: [] })
  assert.match(secret, /^wcp_live_[a-f0-9]{16}_/)
  assert.equal(key.last4, secret.slice(-4))
  assert.equal(key.status, 'active')
  const listed = JSON.stringify(h.keys.listApiKeys('a1'))
  // The secret part after the fixed prefix. Not split('_').pop(): the random
  // part is base64url and may itself contain '_', which left a short fragment
  // that the list's last4 could match by chance (a flaky failure).
  const tail = secret.replace(/^wcp_live_[a-f0-9]{16}_/, '')
  assert.ok(tail.length >= 20, 'the secret has a long random part')
  assert.ok(!listed.includes(tail), 'the secret never appears in a list')
  assert.ok(!JSON.stringify(h.db.apiKeys).includes(tail), 'the secret is never stored')
  assert.ok(!JSON.stringify(h.audits).includes(tail), 'the secret is never audited')
  const r = h.keys.resolveApiKey(secret, { ip: '203.0.113.1' })
  assert.deepEqual(r, { ok: true, principal: { kind: 'api_key', keyId: key.id, companyId: 'cA', scopes: ['brain:query', 'workflows:read'] } })
  assert.ok(!('userId' in r.principal))
  assert.equal(h.audits.at(-1).action, 'api_key_create')
})

test('only a company admin of the same company manages keys; companies never see each other', () => {
  const h = harness()
  assert.throws(() => h.keys.createApiKey('m1', { name: 'x', scopes: ['brain:query'] }), (e) => e.status === 403)
  assert.throws(() => h.keys.listApiKeys('m1'), (e) => e.status === 403)
  const { key } = h.keys.createApiKey('a1', { name: 'A key', scopes: ['brain:query'] })
  assert.deepEqual(h.keys.listApiKeys('a2'), [], 'company B sees none of A')
  assert.throws(() => h.keys.revokeApiKey('a2', key.id), (e) => e.status === 404 && e.code === 'NOT_FOUND')
  assert.throws(() => h.keys.rotateApiKey('a2', key.id), (e) => e.status === 404)
  assert.throws(() => h.keys.listApiKeyUsage('a2', key.id), (e) => e.status === 404)
  assert.equal(h.keys.listApiKeys('a1')[0].status, 'active', 'still active after B tried')
})

test('bad input answers with stable codes', () => {
  const h = harness()
  assert.throws(() => h.keys.createApiKey('a1', { name: '', scopes: ['brain:query'] }), (e) => e.code === 'BAD_NAME')
  assert.throws(() => h.keys.createApiKey('a1', { name: 'x', scopes: [] }), (e) => e.code === 'BAD_SCOPES')
  assert.throws(() => h.keys.createApiKey('a1', { name: 'x', scopes: ['users:manage'] }), (e) => e.code === 'BAD_SCOPES')
  assert.throws(() => h.keys.createApiKey('a1', { name: 'x', scopes: ['brain:query'], expiresInDays: 9999 }), (e) => e.code === 'BAD_EXPIRY')
  assert.throws(() => h.keys.createApiKey('a1', { name: 'x', scopes: ['brain:query'], ipAllowlist: ['nope'] }), (e) => e.code === 'BAD_IP')
})

test('hosted + enrolled admin: create and rotate need a current code (shared step-up policy)', () => {
  const h = harness({ hosted: true })
  assert.equal(h.keys.stepUpRequired('a1'), true)
  assert.equal(h.keys.stepUpRequired('a2'), false, 'no MFA enrolled: not asked')
  assert.throws(() => h.keys.createApiKey('a1', { name: 'x', scopes: ['brain:query'] }), (e) => e.status === 401 && e.code === 'STEP_UP_REQUIRED')
  assert.throws(() => h.keys.createApiKey('a1', { name: 'x', scopes: ['brain:query'], mfaToken: '000000' }), (e) => e.code === 'STEP_UP_REQUIRED')
  const { key } = h.keys.createApiKey('a1', { name: 'x', scopes: ['brain:query'], mfaToken: '246810' })
  assert.throws(() => h.keys.rotateApiKey('a1', key.id, {}), (e) => e.code === 'STEP_UP_REQUIRED')
  assert.ok(h.keys.rotateApiKey('a1', key.id, { mfaToken: '246810' }).secret)
  // Revoke is never blocked behind step-up: stopping a leak must be instant.
  const { key: k2 } = h.keys.createApiKey('a1', { name: 'y', scopes: ['brain:query'], mfaToken: '246810' })
  assert.equal(h.keys.revokeApiKey('a1', k2.id).key.status, 'revoked')
})

test('revoked, expired, wrong-secret, wrong-IP and disabled-company keys all fail with distinct codes', () => {
  const h = harness()
  const a = h.keys.createApiKey('a1', { name: 'a', scopes: ['brain:query'] })
  const forged = a.secret.slice(0, -1) + (a.secret.endsWith('A') ? 'B' : 'A')
  assert.equal(h.keys.resolveApiKey(forged).code, 'INVALID_KEY')
  assert.equal(h.keys.resolveApiKey('wcp_live_0000000000000000_' + 'A'.repeat(43)).code, 'INVALID_KEY')
  h.keys.revokeApiKey('a1', a.key.id)
  assert.equal(h.keys.resolveApiKey(a.secret).code, 'KEY_REVOKED')
  const e = h.keys.createApiKey('a1', { name: 'e', scopes: ['brain:query'], expiresInDays: 1 })
  assert.equal(h.keys.resolveApiKey(e.secret).ok, true)
  h.tick(86400000)
  assert.equal(h.keys.resolveApiKey(e.secret).code, 'KEY_EXPIRED')
  const ip = h.keys.createApiKey('a1', { name: 'ip', scopes: ['brain:query'], ipAllowlist: '198.51.100.0/24' })
  assert.equal(h.keys.resolveApiKey(ip.secret, { ip: '198.51.100.9' }).ok, true)
  assert.equal(h.keys.resolveApiKey(ip.secret, { ip: '203.0.113.9' }).code, 'IP_NOT_ALLOWED')
  h.companies.cA.disabled = true
  assert.equal(h.keys.resolveApiKey(ip.secret, { ip: '198.51.100.9' }).code, 'COMPANY_DISABLED')
})

test('rotate: immediate by default; with grace the old key works until the window closes', () => {
  const h = harness()
  const a = h.keys.createApiKey('a1', { name: 'deploy', scopes: ['workflows:read'], expiresInDays: 90, ipAllowlist: ['203.0.113.0/24'] })
  const r1 = h.keys.rotateApiKey('a1', a.key.id)
  assert.equal(h.keys.resolveApiKey(a.secret, { ip: '203.0.113.1' }).code, 'KEY_REVOKED')
  assert.equal(h.keys.resolveApiKey(r1.secret, { ip: '203.0.113.1' }).ok, true)
  assert.deepEqual([r1.key.name, r1.key.scopes, r1.key.ipAllowlist, r1.key.rotatedFromId], ['deploy', ['workflows:read'], ['203.0.113.0/24'], a.key.id])
  assert.equal(r1.previous.rotatedToId, r1.key.id)
  assert.throws(() => h.keys.rotateApiKey('a1', a.key.id), (e) => e.code === 'KEY_REVOKED', 'a revoked key cannot be rotated again')
  const r2 = h.keys.rotateApiKey('a1', r1.key.id, { graceMinutes: 60 })
  assert.equal(h.keys.resolveApiKey(r1.secret, { ip: '203.0.113.1' }).ok, true, 'inside the grace window')
  h.tick(61 * 60000)
  assert.equal(h.keys.resolveApiKey(r1.secret, { ip: '203.0.113.1' }).code, 'KEY_EXPIRED')
  assert.equal(h.keys.resolveApiKey(r2.secret, { ip: '203.0.113.1' }).ok, true)
  assert.deepEqual(h.audits.filter((x) => x.action === 'api_key_rotate').length, 2)
})

test('use is aggregated per key per hour (no row per call), and revoking twice audits once', () => {
  const h = harness()
  const a = h.keys.createApiKey('a1', { name: 'a', scopes: ['brain:query'] })
  for (let i = 0; i < 25; i++) h.keys.recordApiKeyUse(a.key.id, 'cA', { route: 'POST /api/v1/brain/query', denied: i % 5 === 0 })
  h.tick(3600000)
  h.keys.recordApiKeyUse(a.key.id, 'cA', { route: 'GET /api/v1/workflows' })
  const u = h.keys.listApiKeyUsage('a1', a.key.id)
  assert.equal(u.length, 2)
  assert.deepEqual([u[1].count, u[1].denied, u[1].routes['POST /api/v1/brain/query']], [25, 5, 25])
  h.keys.revokeApiKey('a1', a.key.id); h.keys.revokeApiKey('a1', a.key.id)
  assert.equal(h.audits.filter((x) => x.action === 'api_key_revoke').length, 1)
})

test('launch links: bound to company + workflow + employee, single use, short lived, fragment-safe token', () => {
  const h = harness()
  const l = h.links.createLaunchLink('cA', { workflowId: 'w1', employee: { email: 'mia@a.test' } })
  assert.match(l.token, /^[A-Za-z0-9_-]{43}$/)
  assert.equal(l.employeeId, 'm1')
  assert.ok(!JSON.stringify(h.db.launchLinks).includes(l.token), 'only a hash is stored')
  // company B cannot target A's workflow or A's people, and the answer does not tell which
  assert.throws(() => h.links.createLaunchLink('cB', { workflowId: 'w1', employee: { id: 'm2' } }), (e) => e.code === 'NOT_FOUND')
  assert.throws(() => h.links.createLaunchLink('cB', { workflowId: 'w2', employee: { id: 'm1' } }), (e) => e.code === 'EMPLOYEE_NOT_FOUND')
  assert.throws(() => h.links.createLaunchLink('cA', { workflowId: 'w1', employee: { id: 'm3' } }), (e) => e.code === 'EMPLOYEE_DISABLED')
  assert.throws(() => h.links.createLaunchLink('cA', { workflowId: 'w1', employee: {} }), (e) => e.code === 'BAD_EMPLOYEE')
  assert.throws(() => h.links.createLaunchLink('cA', { workflowId: 'w1', employee: { id: 'm1' }, ttlSec: 99999 }), (e) => e.code === 'BAD_TTL')
  // wrong person (even an admin of the same company) is refused and does NOT consume it
  assert.throws(() => h.links.redeemLaunchLink('a1', l.token), (e) => e.status === 403 && e.code === 'LAUNCH_WRONG_USER')
  assert.throws(() => h.links.redeemLaunchLink('m2', l.token), (e) => e.code === 'LAUNCH_WRONG_USER')
  assert.deepEqual(h.links.redeemLaunchLink('m1', l.token), { workflowId: 'w1', title: 'Refund' })
  assert.throws(() => h.links.redeemLaunchLink('m1', l.token), (e) => e.status === 410 && e.code === 'LAUNCH_USED')
  const l2 = h.links.createLaunchLink('cA', { workflowId: 'w1', employee: { id: 'm1' } })
  h.tick(601 * 1000)
  assert.throws(() => h.links.redeemLaunchLink('m1', l2.token), (e) => e.code === 'LAUNCH_EXPIRED')
  assert.throws(() => h.links.redeemLaunchLink('m1', 'A'.repeat(43)), (e) => e.code === 'LAUNCH_INVALID')
  assert.throws(() => h.links.redeemLaunchLink('m1', '../etc'), (e) => e.code === 'LAUNCH_INVALID')
  // a workflow retired after the link was made is not started
  const l3 = h.links.createLaunchLink('cA', { workflowId: 'w1', employee: { id: 'm1' } })
  h.workflows.w1.state = 'retired'
  assert.throws(() => h.links.redeemLaunchLink('m1', l3.token), (e) => e.code === 'WORKFLOW_NOT_PUBLISHED')
})

test('review fixes: denied uses of a real key carry its id, rotate-with-grace respects the cap, a revoked key kills its links', () => {
  const h = harness()
  const a = h.keys.createApiKey('a1', { name: 'a', scopes: ['workflows:run'] })
  h.keys.revokeApiKey('a1', a.key.id)
  const r = h.keys.resolveApiKey(a.secret)
  assert.deepEqual([r.code, r.keyId, r.companyId], ['KEY_REVOKED', a.key.id, 'cA'], 'so the use audit can record it')
  assert.equal(h.keys.resolveApiKey('wcp_live_0000000000000000_' + 'A'.repeat(43)).keyId, undefined, 'an unknown key names nothing')

  for (let i = 0; i < 49; i++) h.keys.createApiKey('a1', { name: 'k' + i, scopes: ['brain:query'] })
  const last = h.keys.createApiKey('a1', { name: 'fiftieth', scopes: ['brain:query'] })
  assert.throws(() => h.keys.rotateApiKey('a1', last.key.id, { graceMinutes: 60 }), (e) => e.code === 'LIMIT_REACHED')
  assert.equal(h.keys.rotateApiKey('a1', last.key.id).key.status, 'active', 'an immediate rotate keeps the count')

  const live = h.keys.createApiKey('a2', { name: 'run', scopes: ['workflows:run'] })
  const link = h.links.createLaunchLink('cB', { workflowId: 'w2', employee: { id: 'm2' }, keyId: live.key.id })
  h.keys.revokeApiKey('a2', live.key.id)
  assert.throws(() => h.links.redeemLaunchLink('m2', link.token), (e) => e.code === 'LAUNCH_EXPIRED')
})
