// Storage config: defaults, validation, TLS resolution, and no password in any
// message. Pure.
import test from 'node:test'
import assert from 'node:assert/strict'
import { storageConfig, redactDbUrl } from './config.js'

const PW = 'S3cr3t-pa55'
const pgEnv = (extra = {}) => ({ WORK_DB_DRIVER: 'postgres', WORK_DB_URL: `postgres://wcp:${PW}@db.example.com:5432/wcp`, ...extra })

test('no settings means the json driver in the data dir', () => {
  assert.deepEqual({ ...storageConfig({}, { dataDir: '/d' }) }, { driver: 'json', dataDir: '/d' })
  assert.equal(storageConfig({ WORK_DB_DRIVER: ' JSON ' }).driver, 'json')
})

test('an unknown driver or a missing URL is refused with the fix in the message', () => {
  assert.throws(() => storageConfig({ WORK_DB_DRIVER: 'mysql' }), /unknown WORK_DB_DRIVER "mysql".*json, postgres/)
  assert.throws(() => storageConfig({ WORK_DB_DRIVER: 'postgres' }), /needs WORK_DB_URL/)
  assert.throws(() => storageConfig(pgEnv({ WORK_DB_URL: 'mysql://a:b@h/x' })), /must start with postgres/)
  assert.throws(() => storageConfig(pgEnv({ WORK_DB_SCHEMA: 'Bad-Name' })), /WORK_DB_SCHEMA/)
  assert.throws(() => storageConfig(pgEnv({ WORK_DB_TIMEOUT_MS: '-5' })), /WORK_DB_TIMEOUT_MS/)
  assert.throws(() => storageConfig(pgEnv({ WORK_DB_SSL: 'maybe' })), /WORK_DB_SSL must be one of/)
  assert.throws(() => storageConfig(pgEnv({ WORK_DB_SSL_CA: '/no/such/ca.pem' })), /WORK_DB_SSL_CA could not be read/)
})

test('TLS: verify-full for a remote host, disable for localhost, the URL sslmode and WORK_DB_SSL override', () => {
  assert.equal(storageConfig(pgEnv()).ssl, 'verify-full')
  assert.equal(storageConfig(pgEnv({ WORK_DB_URL: 'postgres://u:p@localhost/x' })).ssl, 'disable')
  assert.equal(storageConfig(pgEnv({ WORK_DB_URL: 'postgres://u:p@127.0.0.1/x' })).ssl, 'disable')
  const fromUrl = storageConfig(pgEnv({ WORK_DB_URL: 'postgres://u:p@db.example.com/x?sslmode=require&application_name=a' }))
  assert.equal(fromUrl.ssl, 'require')
  assert.ok(!fromUrl.url.includes('sslmode'), 'sslmode is removed so the client cannot reinterpret it')
  assert.ok(fromUrl.url.includes('application_name=a'), 'other parameters are kept')
  assert.equal(storageConfig(pgEnv({ WORK_DB_URL: 'postgres://u:p@h/x?sslmode=verify-ca' })).ssl, 'verify-full')
  assert.equal(storageConfig(pgEnv({ WORK_DB_SSL: 'disable', WORK_DB_URL: 'postgres://u:p@h/x?sslmode=require' })).ssl, 'disable')
})

test('defaults: schema, timeouts, no auto-migrate', () => {
  const c = storageConfig(pgEnv())
  assert.equal(c.schema, 'workcopilot')
  assert.equal(c.timeoutMs, 30000)
  assert.equal(c.connectTimeoutMs, 15000)
  assert.equal(c.autoMigrate, false)
  assert.equal(storageConfig(pgEnv({ WORK_DB_AUTO_MIGRATE: '1' })).autoMigrate, true)
  assert.ok(Object.isFrozen(c))
})

test('the password never appears in the display string or in any refusal', () => {
  const c = storageConfig(pgEnv())
  assert.ok(!c.display.includes(PW))
  assert.match(c.display, /wcp:\*\*\*@db\.example\.com/)
  assert.equal(redactDbUrl('not a url://u:hunter2@h'), 'not a url://u:***@h')
  for (const extra of [{ WORK_DB_URL: `postgres//u:${PW}@h` }, { WORK_DB_URL: `mysql://u:${PW}@h/x` }, { WORK_DB_URL: `postgres://u:${PW}@/x` }]) {
    try { storageConfig(pgEnv(extra)); assert.fail('should refuse') } catch (e) { assert.ok(!String(e.message).includes(PW), `no password in: ${e.message}`) }
  }
})

test('ssl parameters in the URL are refused so they cannot override WORK_DB_SSL', () => {
  for (const q of ['ssl=0', 'ssl=no-verify', 'sslrootcert=/x.pem', 'sslcert=/c', 'sslkey=/k', 'SSL=true']) {
    assert.throws(() => storageConfig(pgEnv({ WORK_DB_SSL: 'verify-full', WORK_DB_URL: `postgres://u:p@db.example.com/x?${q}` })), /set TLS with WORK_DB_SSL/i, q)
  }
})

test('a password the URL parser would split is refused, and never shown', () => {
  for (const pw of ['123#frag', '12?3', '123/abc', 'a#b']) {
    const url = `postgres://u:${pw}@db.example.com/x`
    try { storageConfig(pgEnv({ WORK_DB_URL: url })); assert.fail(`should refuse ${pw}`) } catch (e) {
      assert.match(e.message, /Percent-encode special characters/, pw)
      assert.ok(!e.message.includes(pw), `no password in: ${e.message}`)
    }
    assert.ok(!redactDbUrl(url).includes(pw), `redacted: ${redactDbUrl(url)}`)
  }
  // Percent-encoded, the same password is fine and still hidden.
  const ok = storageConfig(pgEnv({ WORK_DB_URL: 'postgres://u:123%23frag@db.example.com/x' }))
  assert.ok(!ok.display.includes('123'))
})

test('reserved schema names are refused', () => {
  assert.throws(() => storageConfig(pgEnv({ WORK_DB_SCHEMA: 'pg_catalog' })), /reserved/)
  assert.throws(() => storageConfig(pgEnv({ WORK_DB_SCHEMA: 'information_schema' })), /reserved/)
})

test('connection settings in ?parameters are refused, whatever they are, and never echoed', () => {
  for (const q of ['host=db.remote.example.com', 'password=zzz-secret', 'user=other', 'port=6543', 'options=-c%20role%3Dx', 'dbname=other']) {
    try { storageConfig(pgEnv({ WORK_DB_URL: `postgres://u:p@localhost/db?${q}` })); assert.fail(`should refuse ${q}`) } catch (e) {
      assert.match(e.message, /remove .* from WORK_DB_URL/, q)
      assert.ok(!e.message.includes('zzz-secret'))
    }
  }
  assert.equal(storageConfig(pgEnv({ WORK_DB_URL: 'postgres://u:p@db.example.com/x?application_name=wcp' })).ssl, 'verify-full')
})

test('an empty password is allowed; SSLMODE in any case is honored; masking reaches the last @', () => {
  assert.equal(storageConfig(pgEnv({ WORK_DB_URL: 'postgres://user:@db.example.com/x' })).driver, 'postgres')
  assert.equal(storageConfig(pgEnv({ WORK_DB_URL: 'postgres://u:p@db.example.com/x?SSLMODE=require' })).ssl, 'require')
  try { storageConfig(pgEnv({ WORK_DB_URL: 'postgres://u:p@ss@/db' })); assert.fail('should refuse') } catch (e) {
    assert.ok(!/ss@/.test(e.message), `no password tail in: ${e.message}`)
  }
})
