// The edition composer: what ships, what never ships, where a bundle may be
// written, the refusal of a bundle that would not start, and a real boot of a
// composed bundle.
import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import net from 'node:net'
import { spawn, execFileSync } from 'node:child_process'
import { compose, planFiles, excluded, checkOut, ROOT } from './compose.js'
import { EDITION_IDS, makeCaps } from '../server/edition_registry.js'
import { cleanChildEnv } from '../editions/test_env.mjs'

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wc-compose-'))
const bootOut = path.join(ROOT, 'out', `compose-test-${process.pid}`)
after(() => {
  for (const d of [tmp, bootOut]) { try { fs.rmSync(d, { recursive: true, force: true }) } catch { /* best effort */ } }
  try { fs.rmdirSync(path.join(ROOT, 'out')) } catch { /* not empty or not there: leave it */ }
})

// A throwaway repository: files written, then `git add`ed (compose ships tracked files).
function fakeRoot(name, files, { untracked = {} } = {}) {
  const root = path.join(tmp, name)
  const w = (rel, s) => { const p = path.join(root, ...rel.split('/')); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s) }
  const base = {
    'editions/start.mjs': "import './profile.js'\n",
    'editions/profile.js': 'export {}\n',
    'editions/all/manifest.json': JSON.stringify({ edition: 'all', env: {} }),
    'package.json': JSON.stringify({ dependencies: { pg: '1' } }),
    'package-lock.json': '{}',
  }
  for (const [rel, s] of Object.entries({ ...base, ...files })) w(rel, s)
  execFileSync('git', ['init', '-q'], { cwd: root, stdio: 'ignore' })
  execFileSync('git', ['add', '-A'], { cwd: root, stdio: 'ignore' })
  for (const [rel, s] of Object.entries(untracked)) w(rel, s)
  return root
}

test('tests, test helpers, live data, the eval corpus, dotfiles and key/env files never ship', () => {
  for (const rel of ['server/store.test.mjs', 'server/edition_http_harness.mjs', 'server/storage/test_pg_server.mjs', 'server/data/db.json', 'server/eval/run.mjs', 'server/x/db.json', 'server/x/db.json.corrupt-1', 'server/.enc.key', 'server/a.pem', 'server/prod.env', 'server/.env', 'server/.secret/x.js', 'server/x.log', 'server/db.json.tmp', 'server/ai-seed.json']) {
    assert.equal(excluded(rel), true, rel)
  }
  for (const rel of ['server/store.js', 'server/storage/postgres_worker.js', 'server/edition_registry.js', 'dist/index.html']) assert.equal(excluded(rel), false, rel)
})

test('only tracked files ship: an untracked data copy or secret next to the code stays behind', () => {
  const root = fakeRoot('untracked', { 'server/a.js': 'export {}\n' }, { untracked: { 'server/data.bak/db.json.corrupt-9': 'secret', 'server/notes.txt': 'x', 'server/models/w.bin': 'x' } })
  const files = planFiles('all', { root, spa: false })
  assert.ok(files.includes('server/a.js'))
  assert.ok(!files.some((f) => f.includes('data.bak') || f.includes('notes.txt') || f.includes('models/')), files.join(', '))
})

test('each edition composes a server bundle; the manifest lists capabilities and every file', () => {
  for (const id of EDITION_IDS) {
    const out = path.join(tmp, 'ed-' + id)
    const r = compose({ edition: id, out, spa: false })
    assert.ok(r.files > 50, `${id}: shipped ${r.files} files`)
    const ship = JSON.parse(fs.readFileSync(path.join(out, 'ship-manifest.json'), 'utf8'))
    assert.equal(ship.edition, id)
    assert.deepEqual(ship.capabilities, makeCaps(id).list())
    assert.equal(ship.start, `node editions/start.mjs ${id}`)
    assert.equal(typeof ship.dirty, 'boolean')
    const paths = ship.files.map((f) => f.path)
    assert.ok(paths.includes('server/edition_registry.js') && paths.includes('server/storage/postgres_worker.js') && paths.includes(`editions/${id}/manifest.json`))
    assert.ok(!paths.some((p) => p.startsWith('server/data/') || /\.test\.m?js$/.test(p)))
    for (const other of EDITION_IDS.filter((x) => x !== id)) assert.ok(!paths.some((p) => p.startsWith(`editions/${other}/`)), `${id} does not carry the ${other} folder`)
    for (const f of ship.files) assert.match(f.sha256, /^[0-9a-f]{64}$/)
    assert.ok(!fs.readdirSync(tmp).some((n) => n.includes('.staging-')), 'no staging folder left')
  }
})

test('where a bundle may go: never a root, the repo, a parent, or a repo folder outside out/', () => {
  const refuse = (p, re, opts) => assert.throws(() => checkOut(p, { root: ROOT, ...opts }), re, p)
  refuse(path.parse(ROOT).root, /filesystem root/)
  refuse(ROOT, /repository or one of its parents/)
  refuse(path.dirname(ROOT), /repository or one of its parents/)
  if (process.platform === 'win32') refuse(ROOT.toUpperCase(), /repository or one of its parents/)
  refuse(path.join(ROOT, 'server'), /only go under out\//, { replace: true })
  refuse(path.join(ROOT, 'docs'), /only go under out\//, { replace: true })
  // A non-empty folder that is not a bundle is never replaced.
  const busy = path.join(tmp, 'busy'); fs.mkdirSync(busy, { recursive: true }); fs.writeFileSync(path.join(busy, 'keep.txt'), 'x')
  refuse(busy, /not an earlier bundle/, { replace: true })
  assert.equal(fs.readFileSync(path.join(busy, 'keep.txt'), 'utf8'), 'x')
  // An earlier bundle needs --replace, then is replaced.
  const prev = path.join(tmp, 'prev')
  compose({ edition: 'all', out: prev, spa: false })
  refuse(prev, /Pass --replace/)
  compose({ edition: 'saas', out: prev, spa: false, replace: true })
  assert.equal(JSON.parse(fs.readFileSync(path.join(prev, 'ship-manifest.json'), 'utf8')).edition, 'saas')
  checkOut(path.join(ROOT, 'out', 'x'), { root: ROOT })   // allowed
  // node_modules from npm ci does not block a replace.
  fs.mkdirSync(path.join(prev, 'node_modules', 'pg'), { recursive: true }); fs.writeFileSync(path.join(prev, 'node_modules', 'pg', 'index.js'), '')
  checkOut(prev, { root: ROOT, replace: true })
  assert.throws(() => compose({ edition: 'enterprise', out: path.join(tmp, 'e'), spa: false }), /unknown edition/)
})

test('a bundle that was installed and holds live data is never replaced', () => {
  const inst = path.join(tmp, 'installed')
  compose({ edition: 'onprem', out: inst, spa: false })
  fs.mkdirSync(path.join(inst, 'server', 'data'), { recursive: true })
  fs.writeFileSync(path.join(inst, 'server', 'data', 'db.json'), '{"users":[]}')
  fs.writeFileSync(path.join(inst, 'server', 'data', '.enc.key'), 'k')
  assert.throws(() => compose({ edition: 'onprem', out: inst, spa: false, replace: true }), /server\/data\/(db\.json|\.enc\.key).*installed server/)
  assert.equal(fs.readFileSync(path.join(inst, 'server', 'data', 'db.json'), 'utf8'), '{"users":[]}')
})

test('if the new bundle cannot be moved into place, the previous one stays', { skip: process.platform !== 'win32' && 'needs Windows file locking' }, () => {
  const out = path.join(tmp, 'locked')
  compose({ edition: 'all', out, spa: false })
  const before = fs.readFileSync(path.join(out, 'ship-manifest.json'), 'utf8')
  const fd = fs.openSync(path.join(out, 'package.json'), 'r')   // an open handle blocks renaming the folder on Windows
  try {
    assert.throws(() => compose({ edition: 'saas', out, spa: false, replace: true }), (e) => /could not move|EBUSY|EPERM|EACCES/.test(String(e.code || '') + ' ' + e.message))
  } finally { fs.closeSync(fd) }
  assert.equal(fs.readFileSync(path.join(out, 'ship-manifest.json'), 'utf8'), before)
  assert.ok(!fs.readdirSync(tmp).some((n) => n.startsWith('locked.') ), 'no staging or aside folder left')
})

test('a bundle that would not start is refused and the previous bundle is left as it was', () => {
  const root = fakeRoot('broken', {
    'server/a.js': "import './gone.js'\n",
    'server/b.js': "import './Store.js'\n",
    'server/store.js': 'export {}\n',
    'server/c.js': "import pad from 'left-pad'\nimport pg from 'pg'\nimport fs from 'node:fs'\nimport path from 'path'\n",
  })
  const out = path.join(tmp, 'keep-prev')
  compose({ edition: 'all', out, spa: false })
  const before = fs.readFileSync(path.join(out, 'ship-manifest.json'), 'utf8')
  assert.throws(() => compose({ edition: 'all', out, root, spa: false, replace: true }), (e) =>
    /server\/a\.js imports \.\/gone\.js/.test(e.message) &&
    /server\/b\.js imports \.\/Store\.js/.test(e.message) &&          // letter case must match exactly
    /"left-pad", which is not in package\.json dependencies/.test(e.message) &&
    !/"pg"|"fs"|"path"/.test(e.message))
  assert.equal(fs.readFileSync(path.join(out, 'ship-manifest.json'), 'utf8'), before, 'the earlier bundle is untouched')
})

test('a missing SPA build or a missing lockfile is refused before anything is written', () => {
  const root = fakeRoot('nospa', { 'server/a.js': 'export {}\n' })
  assert.throws(() => planFiles('all', { root, spa: true }), /npm run build/)
  fs.rmSync(path.join(root, 'package-lock.json'))
  const out = path.join(tmp, 'nolock')
  assert.throws(() => compose({ edition: 'all', out, root, spa: false }), /package-lock\.json is missing/)
  assert.ok(!fs.existsSync(out))
})

const freePort = () => new Promise((resolve) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)) }) })

// The composed bundle itself starts: its own editions/start.mjs, its own copy of
// the server. Written under out/ so its packages resolve from this checkout's
// node_modules (on a target, npm ci --omit=dev installs them).
test('a composed onprem bundle boots from its own folder', { timeout: 60000 }, async () => {
  compose({ edition: 'onprem', out: bootOut, spa: false })
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wc-bundle-boot-'))
  const port = await freePort()
  const child = spawn(process.execPath, [path.join(bootOut, 'editions', 'start.mjs'), 'onprem'], {
    env: cleanChildEnv({ WORK_DATA_DIR: dataDir, PORT: String(port), WORK_MFA_DISABLED: '1', SESSION_SECRET: 'bundle-boot' }), stdio: ['ignore', 'pipe', 'pipe'],
  })
  let log = ''
  child.stdout.on('data', (d) => { log += d })
  child.stderr.on('data', (d) => { log += d })
  try {
    let body = null
    for (let i = 0; i < 200 && !body && child.exitCode === null && child.signalCode === null; i++) {
      await new Promise((r) => setTimeout(r, 100))
      try { const r = await fetch(`http://127.0.0.1:${port}/api/work/edition`); if (r.ok) body = await r.json() } catch { /* not listening yet */ }
    }
    assert.ok(body, `the bundle answered (exit ${child.exitCode}; log: ${log.slice(-800)})`)
    assert.equal(body.edition, 'onprem')
    assert.match(log, /data dir .*wc-bundle-boot-/)
  } finally {
    if (child.exitCode === null && child.signalCode === null) { child.kill(); await new Promise((r) => child.once('exit', r)) }
    try { fs.rmSync(dataDir, { recursive: true, force: true }) } catch { /* Windows may hold a handle briefly */ }
  }
})
