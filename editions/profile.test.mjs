// Edition folders and the bootstrap: every registry edition has a valid
// manifest, operator settings win over manifest defaults, and
// `node editions/start.mjs <edition>` really starts the server as that edition.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import net from 'node:net'
import { spawn } from 'node:child_process'
import { EDITION_IDS } from '../server/edition_registry.js'
import { EDITIONS_DIR, loadManifest, profileEnv } from './profile.js'
import { cleanChildEnv } from './test_env.mjs'

test('every edition in the registry has exactly one folder with a valid manifest', () => {
  const folders = fs.readdirSync(EDITIONS_DIR, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort()
  assert.deepEqual(folders, [...EDITION_IDS].sort())
  for (const id of EDITION_IDS) assert.equal(loadManifest(id).edition, id)
})

test('manifest problems are refused with the file named', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wc-manifest-'))
  try {
    const put = (id, m) => { fs.mkdirSync(path.join(dir, id), { recursive: true }); fs.writeFileSync(path.join(dir, id, 'manifest.json'), JSON.stringify(m)) }
    assert.throws(() => loadManifest('nope', dir), /unknown edition "nope"/)
    assert.throws(() => loadManifest('saas', dir), /cannot read/)
    put('saas', { edition: 'paid', env: {} })
    assert.throws(() => loadManifest('saas', dir), /lives in the "saas" folder/)
    put('saas', { edition: 'saas', env: { 'bad-name': 'x' } })
    assert.throws(() => loadManifest('saas', dir), /not an environment variable name/)
    put('saas', { edition: 'saas', env: { WORK_EDITION: 'saas' } })
    assert.throws(() => loadManifest('saas', dir), /do not set WORK_EDITION/)
    put('saas', { edition: 'saas', env: { PORT: 4000 } })
    assert.throws(() => loadManifest('saas', dir), /must be a string/)
  } finally { fs.rmSync(dir, { recursive: true, force: true }) }
})

test('profileEnv sets the edition, fills defaults, and never overrides the operator', () => {
  const m = { edition: 'onprem', env: { WORK_DB_AUTO_MIGRATE: '1', WORK_X: 'a' } }
  assert.deepEqual(profileEnv(m, {}), { WORK_EDITION: 'onprem', WORK_DB_AUTO_MIGRATE: '1', WORK_X: 'a' })
  assert.deepEqual(profileEnv(m, { WORK_DB_AUTO_MIGRATE: '0', WORK_EDITION: 'OnPrem' }), { WORK_EDITION: 'onprem', WORK_X: 'a' })
  assert.throws(() => profileEnv(m, { WORK_EDITION: 'saas' }), /WORK_EDITION is set to "saas"/)
  // Set-but-empty is the operator's choice (the storage config reads it as off);
  // a blank WORK_EDITION is unset, as the server reads it.
  assert.deepEqual(profileEnv(m, { WORK_DB_AUTO_MIGRATE: '', WORK_EDITION: '  ' }), { WORK_EDITION: 'onprem', WORK_X: 'a' })
})

const freePort = () => new Promise((resolve) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)) }) })

test('node editions/start.mjs onprem starts the real server as onprem', { timeout: 60000 }, async () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wc-start-onprem-'))
  const port = await freePort()
  // A clean env: a developer's own WORK_DB_* or keys must never reach the child.
  const env = cleanChildEnv({ WORK_DATA_DIR: dataDir, PORT: String(port), WORK_MFA_DISABLED: '1', SESSION_SECRET: 'start-test' })
  const child = spawn(process.execPath, [path.join(EDITIONS_DIR, 'start.mjs'), 'onprem'], { env, stdio: ['ignore', 'pipe', 'pipe'] })
  let log = ''
  child.stdout.on('data', (d) => { log += d })
  child.stderr.on('data', (d) => { log += d })
  try {
    let body = null
    for (let i = 0; i < 150 && !body && child.exitCode === null && child.signalCode === null; i++) {
      await new Promise((r) => setTimeout(r, 100))
      try { const r = await fetch(`http://127.0.0.1:${port}/api/work/edition`); if (r.ok) body = await r.json() } catch { /* not listening yet */ }
    }
    assert.ok(body, `the server answered (exit ${child.exitCode}; log: ${log.slice(-800)})`)
    assert.equal(body.edition, 'onprem')
    assert.ok(body.capabilities.includes('single_company'))
  } finally {
    if (child.exitCode === null && child.signalCode === null) { child.kill(); await new Promise((r) => child.once('exit', r)) }
    try { fs.rmSync(dataDir, { recursive: true, force: true }) } catch { /* Windows may hold a handle briefly */ }
  }
})

test('an unknown edition stops with usage, before the server loads', { timeout: 30000 }, () => {
  const r = spawn(process.execPath, [path.join(EDITIONS_DIR, 'start.mjs'), 'enterprise'], { env: cleanChildEnv(), stdio: ['ignore', 'pipe', 'pipe'] })
  return new Promise((resolve) => {
    let err = ''
    r.stderr.on('data', (d) => { err += d })
    r.on('exit', (code) => { assert.equal(code, 2); assert.match(err, /unknown edition "enterprise"/); resolve() })
  })
})
