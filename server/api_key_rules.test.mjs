// Pure rules for company API keys: format, hashing, validation, IP allowlist,
// status, and the public shape (no hash / salt / secret ever leaves).
import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import * as R from './api_key_rules.js'
import { makeMfaStepUp } from './mfa_step_up.js'

test('a minted key parses back to its id and secret, and junk never parses', () => {
  const id = R.newKeyId(); const secret = R.newSecret()
  const raw = R.formatKey(id, secret)
  assert.match(raw, /^wcp_live_[a-f0-9]{16}_[A-Za-z0-9_-]{43}$/)
  assert.deepEqual(R.parseKey(raw), { id, secret })
  // base64url may contain `_`: the fixed-length id keeps parsing unambiguous
  assert.deepEqual(R.parseKey(R.formatKey('0123456789abcdef', '_'.repeat(43))), { id: '0123456789abcdef', secret: '_'.repeat(43) })
  for (const bad of ['', null, 'wcp_live_', `wcp_test_${id}_${secret}`, `wcp_live_${id}_${secret}x`, `wcp_live_${id.toUpperCase()}_${secret}`, `Bearer ${raw}`]) {
    assert.equal(R.parseKey(bad), null, String(bad))
  }
})

test('the bearer header is the only accepted carrier', () => {
  assert.equal(R.bearerFrom('Bearer abc'), 'abc')
  assert.equal(R.bearerFrom('bearer   abc  '), 'abc')
  assert.equal(R.bearerFrom('Basic abc'), null)
  assert.equal(R.bearerFrom(''), null)
  assert.equal(R.bearerFrom('Bearer a b'), null)
})

test('the hash is peppered + salted HMAC, compared in constant time, and binds the id', () => {
  const pepper = R.derivePepper(crypto.randomBytes(32))
  const other = R.derivePepper(crypto.randomBytes(32))
  const id = R.newKeyId(); const salt = R.newSalt(); const secret = R.newSecret()
  const h = R.hashSecret(pepper, id, salt, secret)
  assert.ok(R.hashesEqual(h, R.hashSecret(pepper, id, salt, secret)))
  assert.ok(!R.hashesEqual(h, R.hashSecret(other, id, salt, secret)), 'a different pepper (stolen db, no KEK) never verifies')
  assert.ok(!R.hashesEqual(h, R.hashSecret(pepper, R.newKeyId(), salt, secret)), 'the id is bound into the hash')
  assert.ok(!R.hashesEqual(h, R.hashSecret(pepper, id, R.newSalt(), secret)), 'the salt is bound into the hash')
  assert.ok(!R.hashesEqual(h, 'short'), 'length mismatch never throws, just fails')
  assert.ok(!h.includes(secret))
  assert.throws(() => R.derivePepper(Buffer.alloc(8)))
})

test('names, expiry and grace are validated with stable codes', () => {
  assert.equal(R.validateName('  CRM \n sync '), 'CRM sync')
  assert.throws(() => R.validateName('   '), (e) => e.code === 'BAD_NAME' && e.status === 400)
  assert.throws(() => R.validateName('x'.repeat(81)), (e) => e.code === 'BAD_NAME')
  const t = Date.UTC(2026, 0, 1)
  assert.deepEqual(R.expiryFrom(null, t), { expiresAt: null, ttlDays: null })
  assert.deepEqual(R.expiryFrom(30, t), { expiresAt: new Date(t + 30 * 86400000).toISOString(), ttlDays: 30 })
  for (const bad of [0, -1, 731, 1.5, 'abc']) assert.throws(() => R.expiryFrom(bad, t), (e) => e.code === 'BAD_EXPIRY', String(bad))
  assert.equal(R.rotateGrace(undefined), 0)
  assert.equal(R.rotateGrace(60), 60)
  assert.throws(() => R.rotateGrace(1441), (e) => e.code === 'BAD_EXPIRY')
})

test('IP allowlist: v4, v6, CIDR, v4-mapped v6; empty allows all; junk is refused', () => {
  const list = R.normalizeIpAllowlist('203.0.113.7, 198.51.100.0/24\n2001:db8::/32')
  assert.deepEqual(list, ['203.0.113.7', '198.51.100.0/24', '2001:db8::/32'])
  assert.ok(R.ipAllowed(list, '203.0.113.7'))
  assert.ok(R.ipAllowed(list, '::ffff:203.0.113.7'), 'a v4-mapped v6 caller matches its v4 rule')
  assert.ok(R.ipAllowed(list, '198.51.100.200'))
  assert.ok(R.ipAllowed(list, '2001:db8:1::5'))
  assert.ok(!R.ipAllowed(list, '203.0.113.8'))
  assert.ok(!R.ipAllowed(list, '2001:db9::1'))
  assert.ok(!R.ipAllowed(list, 'not-an-ip'))
  assert.ok(R.ipAllowed([], '1.2.3.4'))
  assert.ok(!R.ipAllowed(['::/0'], '1.2.3.4'), 'a v6 entry never admits an IPv4 caller')
  assert.ok(R.ipAllowed(['::/0'], '2001:4860::1'))
  assert.ok(!R.ipAllowed(['10.0.0.0/8'], '2001:4860::1'))
  for (const bad of ['1.2.3', '1.2.3.4/33', '::1/129', 'example.com', '1.2.3.4/8/2']) {
    assert.throws(() => R.normalizeIpAllowlist([bad]), (e) => e.code === 'BAD_IP', bad)
  }
  assert.throws(() => R.normalizeIpAllowlist(Array.from({ length: 51 }, (_, i) => `10.0.0.${i}`)), (e) => e.code === 'BAD_IP')
})

test('status and the public shape: hash, salt and secret never leave', () => {
  const t = Date.now()
  const rec = { id: 'abcdefabcdefabcd', companyId: 'c1', name: 'n', scopes: ['brain:query'], hash: 'H', salt: 'S', hashAlg: R.HASH_ALG, last4: 'wxyz', createdAt: 'x', createdBy: 'u1', expiresAt: null, ipAllowlist: [], revokedAt: null }
  assert.equal(R.keyStatus(rec, t), 'active')
  assert.equal(R.keyStatus({ ...rec, expiresAt: new Date(t - 1).toISOString() }, t), 'expired')
  assert.equal(R.keyStatus({ ...rec, revokedAt: 'x' }, t), 'revoked')
  const pub = R.publicKey(rec, t, () => 'Ada')
  const json = JSON.stringify(pub)
  for (const k of ['hash', 'salt', 'hashAlg', 'secret', 'companyId']) assert.ok(!(k in pub), k)
  assert.ok(!json.includes('"H"') && !json.includes('"S"'))
  assert.equal(pub.prefix, 'wcp_live_abcdefabcdefabcd')
  assert.deepEqual(pub.createdBy, { id: 'u1', name: 'Ada' })
})

test('the shared MFA step-up policy: hosted + MFA on + enrolled only', () => {
  const ok = (u, t) => t === '123456'
  const enrolled = { id: 'u-step', mfa: { enabled: true } }
  const hosted = makeMfaStepUp({ verifyMfa: ok, hosted: true, mfaGloballyEnabled: () => true, failures: new Map() })
  assert.equal(hosted.stepUpNeeded(enrolled), true)
  assert.equal(hosted.stepUpNeeded({}), false, 'not enrolled: not asked')
  assert.throws(() => hosted.assertStepUp(enrolled, ''), (e) => e.status === 401 && e.code === 'STEP_UP_REQUIRED')
  assert.throws(() => hosted.assertStepUp(enrolled, '000000'), (e) => e.status === 401)
  hosted.assertStepUp(enrolled, '123456')
  assert.equal(makeMfaStepUp({ verifyMfa: ok, hosted: false, mfaGloballyEnabled: () => true }).stepUpNeeded(enrolled), false, 'on-premise: not asked')
  assert.equal(makeMfaStepUp({ verifyMfa: ok, hosted: true, mfaGloballyEnabled: () => false }).stepUpNeeded(enrolled), false, 'break-glass: not asked')
})

test('step-up locks the account after 5 wrong codes; a missing code is not counted; success resets', () => {
  let now = 0
  const failures = new Map()
  const seen = []
  const p = makeMfaStepUp({ verifyMfa: (u, t) => t === '111111', hosted: true, mfaGloballyEnabled: () => true, clock: () => now, failures, onFailure: (u, x) => seen.push(x.locked) })
  const u = { id: 'u1', mfa: { enabled: true } }
  for (let i = 0; i < 3; i++) assert.throws(() => p.assertStepUp(u, ''), (e) => e.code === 'STEP_UP_REQUIRED')
  assert.equal(seen.length, 0, 'asking for a code is not a failure')
  for (let i = 0; i < 4; i++) assert.throws(() => p.assertStepUp(u, '000000'), (e) => e.status === 401)
  p.assertStepUp(u, '111111')
  for (let i = 0; i < 5; i++) assert.throws(() => p.assertStepUp(u, '000000'), (e) => e.status === 401)
  assert.deepEqual(seen.slice(-2), [false, true], 'the fifth wrong code reports the lock')
  assert.throws(() => p.assertStepUp(u, '111111'), (e) => e.status === 429 && e.code === 'STEP_UP_LOCKED', 'locked even with the right code')
  const other = makeMfaStepUp({ verifyMfa: () => true, hosted: true, mfaGloballyEnabled: () => true, clock: () => now, failures })
  assert.throws(() => other.assertStepUp(u, '111111'), (e) => e.code === 'STEP_UP_LOCKED', 'one counter across every step-up (export key, API keys)')
  now += 15 * 60 * 1000 + 1
  p.assertStepUp(u, '111111')
})

test('auth middleware: network buckets, valid keys never locked out by neighbors, company-wide limit', async () => {
  const { makeRequireApiKey, networkKey } = await import('./api_key_auth.js')
  const { createRateLimiter } = await import('./api_rate_limit.js')
  assert.equal(networkKey('2001:db8:1:2:aaaa::1'), networkKey('2001:db8:1:2:bbbb::9'), 'one /64, one bucket')
  assert.notEqual(networkKey('2001:db8:1:3::1'), networkKey('2001:db8:1:2::1'))
  const good = 'wcp_live_' + 'a'.repeat(16) + '_' + 'G'.repeat(43)
  const gate = makeRequireApiKey({
    resolve: (raw) => (raw === good ? { ok: true, principal: { keyId: 'k1', companyId: 'c1', scopes: ['brain:query'] } } : { ok: false, status: 401, code: 'INVALID_KEY', error: 'no' }),
    ipOf: () => '203.0.113.5',
    keyLimiter: createRateLimiter({ perMinute: 100 }), companyLimiter: createRateLimiter({ perMinute: 3 }), ipLimiter: createRateLimiter({ perMinute: 2 }),
  })('brain:query')
  const run = (auth) => new Promise((resolve) => {
    const res = { headers: {}, headersSent: false, setHeader(k, v) { this.headers[k] = v }, status(c) { this.code = c; return this }, json(b) { this.body = b; this.headersSent = true; resolve(this) } }
    gate({ method: 'POST', path: '/x', headers: { authorization: auth } }, res, () => resolve({ code: 200, headers: res.headers }))
  })
  assert.equal((await run('Bearer bad1')).body.code, 'INVALID_KEY')
  assert.equal((await run('Bearer bad2')).body.code, 'INVALID_KEY')
  const flood = await run('Bearer bad3')
  assert.deepEqual([flood.code, flood.body.code], [429, 'RATE_LIMITED'])
  assert.equal((await run('Bearer ' + good)).code, 200, 'a valid key is not refused for failures of its neighbors')
  await run('Bearer ' + good)
  await run('Bearer ' + good)
  const co = await run('Bearer ' + good)
  assert.equal(co.code, 429, 'the company-wide limit applies across keys')
  assert.match(co.body.error, /your company/)
  assert.ok(Number(co.headers['Retry-After']) >= 1)
})
