// SSRF guard: lexical URL checks, resolved-address classification, and the
// connect-time lookup that defeats DNS rebinding.
import test from 'node:test'
import assert from 'node:assert/strict'
import { checkWebhookUrl, isPublicAddress, makeGuardedLookup, assertResolvesPublic, isPublicHttpUrl } from './egress_guard.js'

test('webhook URLs: https, a public domain name, standard port, no credentials', () => {
  const ok = checkWebhookUrl('https://Hooks.Example.org/wcp?x=1#frag')
  assert.equal(ok.ok, true)
  assert.equal(ok.host, 'hooks.example.org')
  assert.equal(ok.url, 'https://hooks.example.org/wcp?x=1', 'fragment dropped')
  assert.equal(checkWebhookUrl('https://hooks.example.org:8443/x').ok, true)
  const bad = [
    'http://hooks.example.org/x', 'ftp://hooks.example.org', 'https://127.0.0.1/x', 'https://[::1]/x', 'https://10.0.0.5/',
    'https://169.254.169.254/latest/meta-data', 'https://localhost/x', 'https://metadata.google.internal/', 'https://printer.local/',
    'https://intranet/', 'https://user:pass@hooks.example.org/', 'https://hooks.example.org:22/', 'https://0x7f000001/',
    'https://2130706433/', 'not a url', '', 'https://a.example/' + 'x'.repeat(2100),
  ]
  for (const u of bad) assert.equal(checkWebhookUrl(u).ok, false, u)
})

test('resolved addresses: private, loopback, link-local, metadata, CGNAT, multicast, mapped and transition ranges are refused', () => {
  for (const ip of ['8.8.8.8', '1.1.1.1', '93.184.216.34', '2606:4700:4700::1111']) assert.equal(isPublicAddress(ip), true, ip)
  for (const ip of ['127.0.0.1', '10.1.2.3', '172.16.0.1', '172.31.255.255', '192.168.1.1', '169.254.169.254', '100.64.0.1', '0.0.0.0',
    '224.0.0.1', '255.255.255.255', '198.18.0.1', '::1', '::', 'fe80::1', 'fc00::1', 'fd12::1', '::ffff:127.0.0.1', '::ffff:10.0.0.1',
    '64:ff9b::a00:1', '2002:a00:1::', '2001:db8::1', 'ff02::1', '::7f00:1', '::127.0.0.1', '::ffff:0:7f00:1', 'garbage']) {
    assert.equal(isPublicAddress(ip), false, ip)
  }
})

test('guarded lookup refuses any private answer at connect time, including a mixed (rebinding) answer', async () => {
  const fake = (answers) => (h, cb) => cb(null, answers)
  const call = (lookup, opts = {}) => new Promise((resolve) => lookup('hooks.example.org', opts, (e, a, f) => resolve({ e, a, f })))
  let r = await call(makeGuardedLookup({ resolve: fake([{ address: '93.184.216.34', family: 4 }]) }))
  assert.equal(r.e, null); assert.equal(r.a, '93.184.216.34'); assert.equal(r.f, 4)
  r = await call(makeGuardedLookup({ resolve: fake([{ address: '93.184.216.34', family: 4 }, { address: '10.0.0.1', family: 4 }]) }))
  assert.equal(r.e.code, 'EGRESS_PRIVATE_ADDRESS', 'one private answer fails the whole lookup')
  r = await call(makeGuardedLookup({ resolve: fake([{ address: '127.0.0.1', family: 4 }]) }))
  assert.equal(r.e.code, 'EGRESS_PRIVATE_ADDRESS')
  r = await call(makeGuardedLookup({ resolve: fake([{ address: '93.184.216.34', family: 4 }, { address: '2606:4700:4700::1111', family: 6 }]) }), { all: true })
  assert.deepEqual(r.a, [{ address: '93.184.216.34', family: 4 }, { address: '2606:4700:4700::1111', family: 6 }], 'all:true returns every approved address')
  r = await call(makeGuardedLookup({ resolve: (h, cb) => cb(Object.assign(new Error('nx'), { code: 'ENOTFOUND' })) }))
  assert.equal(r.e.code, 'ENOTFOUND')
  await assert.rejects(assertResolvesPublic('x.example.org', { resolve: fake([{ address: '192.168.0.10', family: 4 }]) }), (e) => e.code === 'EGRESS_PRIVATE_ADDRESS')
  assert.equal(await assertResolvesPublic('x.example.org', { resolve: fake([{ address: '8.8.4.4', family: 4 }]) }), true)
})

test('web learning keeps its exact rule after the move (behavior preserved)', () => {
  assert.equal(isPublicHttpUrl('https://docs.example.com/guide'), true)
  assert.equal(isPublicHttpUrl('http://docs.example.com/guide'), true)
  for (const u of ['http://localhost/', 'http://10.0.0.1/', 'http://192.168.1.1/', 'http://[::1]/', 'file:///etc/passwd', 'http://intranet/', 'http://box.corp/']) {
    assert.equal(isPublicHttpUrl(u), false, u)
  }
})
