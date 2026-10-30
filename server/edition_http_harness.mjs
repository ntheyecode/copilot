// Test harness for the edition route tests: boots the REAL app (index.js) as one
// edition, in a fresh temp data dir, and drives it with a cookie jar. Not a test
// file itself (no .test. in the name); edition_<name>_routes.test.mjs import it.
//
// Each node --test file runs in its own process, so setting WORK_EDITION here,
// before index.js (and through it store.js and edition.js) is first imported,
// gives that file its own edition.
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import assert from 'node:assert/strict'

export async function bootEdition(edition, extraEnv = {}) {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), `wc-edition-${edition}-`))
  process.env.WORK_DATA_DIR = dataDir
  process.env.PORT = '0'
  process.env.WORK_MFA_DISABLED = '1'
  process.env.WORK_ADMIN_PASSWORD = 'Admin-Pass-123!'
  process.env.SESSION_SECRET = `edition-${edition}-secret`
  process.env.WORK_EDITION = edition
  for (const [k, v] of Object.entries(extraEnv)) process.env[k] = v
  const index = await import('./index.js')
  const store = await import('./store.js')
  const srv = await new Promise((resolve) => { const s = index.app.listen(0, () => resolve(s)) })
  const base = `http://127.0.0.1:${srv.address().port}`
  const close = async () => {
    try { srv.closeAllConnections?.() } catch { /* best effort */ }
    await new Promise((r) => srv.close(r))
    try { fs.rmSync(dataDir, { recursive: true, force: true }) } catch { /* a still-open handle on Windows: the OS temp cleanup gets it */ }
  }

  const jar = () => ({ map: {} })
  async function req(j, method, p, body, headers = {}) {
    const h = { 'content-type': 'application/json', ...headers }
    const cookie = Object.entries(j.map).map(([k, v]) => `${k}=${v}`).join('; ')
    if (cookie) h.cookie = cookie
    const res = await fetch(base + p, { method, headers: h, body: body === undefined ? undefined : (typeof body === 'string' ? body : JSON.stringify(body)) })
    const sc = res.headers.getSetCookie ? res.headers.getSetCookie() : []
    for (const c of sc) { const nv = c.split(';')[0]; const i = nv.indexOf('='); if (i > 0) j.map[nv.slice(0, i)] = nv.slice(i + 1) }
    let data = null
    try { data = await res.json() } catch { /* some responses are empty */ }
    return { status: res.status, data }
  }
  async function superadmin() {
    const j = jar()
    const r = await req(j, 'POST', '/api/work/login', { username: 'admin', password: process.env.WORK_ADMIN_PASSWORD })
    assert.equal(r.status, 200, 'the seeded superadmin signs in')
    return j
  }
  return { index, store, base, close, jar, req, superadmin }
}
