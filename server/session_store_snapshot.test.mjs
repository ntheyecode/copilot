// Regression gate: the server-side session lifetime is FIXED at sign-in (8 h) and
// never slides with activity.
//
// The bug this pins (found by the E2E suite, e2e/FINDINGS.md): the session store
// kept the live req.session object, so express-session's per-request touch()
// reset the stored cookie expiry in memory on every request. A session used at
// least once every 8 h never expired server-side, although the code promises
// "maxAge is fixed at login". The class fix: the store keeps and hands out
// SNAPSHOTS (like any serializing store), never a reference a request can mutate.
import test from 'node:test'
import assert from 'node:assert/strict'
import { bootEdition } from './edition_http_harness.mjs'

const h = await bootEdition('all')
test.after(() => h.close())

function sidOf(jar) {
  const raw = decodeURIComponent(jar.map['workcopilot.sid'] || '')
  return raw.replace(/^s:/, '').split('.')[0]
}

test('activity after sign-in does not move the stored session expiry', async () => {
  const j = await h.superadmin()
  const sid = sidOf(j)
  const before = h.store.getSessionRecord(sid)
  assert.ok(before && before.cookie && before.cookie.expires, 'a session record with an expiry exists after sign-in')
  const e0 = new Date(before.cookie.expires).getTime()
  await new Promise((r) => setTimeout(r, 30))
  for (let i = 0; i < 3; i++) assert.equal((await h.req(j, 'GET', '/api/work/me')).status, 200)
  const after = h.store.getSessionRecord(sid)
  assert.equal(new Date(after.cookie.expires).getTime(), e0, 'the expiry stays where sign-in put it')
})

test('a record read from the store cannot change the stored session', async () => {
  const j = await h.superadmin()
  const sid = sidOf(j)
  const a = h.store.getSessionRecord(sid)
  a.uid = 'someone-else'
  a.cookie.expires = new Date(Date.now() + 365 * 86400000).toISOString()
  const b = h.store.getSessionRecord(sid)
  assert.notEqual(b.uid, 'someone-else')
  assert.notEqual(b.cookie.expires, a.cookie.expires)
})

test('a past expiry signs the session out on its next request', async () => {
  const j = await h.superadmin()
  const sid = sidOf(j)
  const rec = h.store.getSessionRecord(sid)
  rec.cookie.expires = new Date(Date.now() - 1000).toISOString()
  h.store.setSessionRecord(sid, rec)
  const me = await h.req(j, 'GET', '/api/work/me')
  assert.equal(me.data.signedIn, false)
})
