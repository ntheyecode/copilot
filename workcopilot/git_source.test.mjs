// ---------------------------------------------------------------------------
// Tests for workcopilot/git_source.js (node --test).
// Built-ins only; no new dependency. The git section is guarded so the suite
// passes with a clear skip-note when `git` is absent from the machine.
// ---------------------------------------------------------------------------
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

import { listRepoSources, defaultIgnores, isSourceFile } from './git_source.js'

function mkTmp(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix))
}
function write(root, rel, content) {
  const abs = path.join(root, rel)
  fs.mkdirSync(path.dirname(abs), { recursive: true })
  fs.writeFileSync(abs, content)
  return abs
}
function gitAvailable() {
  try {
    const r = spawnSync('git', ['--version'], { encoding: 'utf8', windowsHide: true })
    return !r.error && r.status === 0
  } catch { return false }
}
function git(root, args) {
  const r = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8', windowsHide: true })
  if (r.error || r.status !== 0) throw new Error(`git ${args.join(' ')}: ${(r.stderr || r.error || '').toString().trim()}`)
  return r.stdout.trim()
}
// Isolated git identity + no signing, so the test never touches the real config.
function gitInit(root) {
  git(root, ['init', '-q'])
  git(root, ['config', 'user.email', 'test@workcopilot.local'])
  git(root, ['config', 'user.name', 'WorkCoPilot Test'])
  git(root, ['config', 'commit.gpgsign', 'false'])
}
function gitCommit(root, msg) {
  git(root, ['add', '-A'])
  git(root, ['commit', '-q', '-m', msg, '--no-gpg-sign'])
  return git(root, ['rev-parse', 'HEAD'])
}

// --- exports -----------------------------------------------------------------

test('isSourceFile + defaultIgnores behave as documented', () => {
  assert.equal(isSourceFile('a.js'), true)
  assert.equal(isSourceFile('src/deep/mod.py'), true)
  assert.equal(isSourceFile('notes.md'), true)
  assert.equal(isSourceFile('logo.png'), false)
  assert.equal(isSourceFile('archive.zip'), false)
  assert.equal(isSourceFile('README'), false) // no extension
  const ig = defaultIgnores()
  assert.ok(Array.isArray(ig) && ig.length > 0)
  assert.ok(ig.includes('node_modules/'))
  assert.ok(ig.includes('*.min.*'))
  assert.ok(ig.includes('package-lock.json'))
})

// --- folder walk (non-git) ---------------------------------------------------

test('folder walk returns only source files, excludes ignores, correct sourceId/language/text', async () => {
  const root = mkTmp('gs-folder-')
  try {
    write(root, 'a.js', 'console.log(1)\n')
    write(root, 'README.md', '# hi\n')
    write(root, 'src/b.py', 'print(2)\n')
    write(root, 'node_modules/x.js', 'module.exports = 1\n') // ignored dir
    write(root, 'app.min.js', 'var a=1;') // ignored glob
    write(root, 'logo.png', Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0x01])) // binary (NUL) + non-source ext
    write(root, 'Gemfile.lock', 'GEM\n') // ignored lockfile
    write(root, 'data.bin', Buffer.from([1, 2, 0, 3])) // non-source ext anyway

    const res = await listRepoSources(root)
    assert.equal(res.headCommit, null)
    assert.equal(res.truncated, false)
    assert.equal(res.removed.length, 0)

    const byPath = new Map(res.added.map((e) => [e.path, e]))
    assert.deepEqual([...byPath.keys()].sort(), ['README.md', 'a.js', 'src/b.py'])

    const repoName = path.basename(root)
    assert.equal(byPath.get('a.js').sourceId, `local:${repoName}:a.js`)
    assert.equal(byPath.get('a.js').language, 'javascript')
    assert.equal(byPath.get('src/b.py').language, 'python')
    assert.equal(byPath.get('README.md').language, 'markdown')
    assert.equal(byPath.get('a.js').text, 'console.log(1)\n')
    assert.ok(typeof byPath.get('a.js').revision === 'string' && byPath.get('a.js').revision.length > 0)

    // Ignored / non-source were counted, never silently dropped.
    assert.equal(res.counts.added, 3)
    assert.ok(res.counts.ignored >= 2) // node_modules/x.js, app.min.js, Gemfile.lock
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test('file-count cap truncates with truncated:true + counts', async () => {
  const root = mkTmp('gs-cap-')
  try {
    for (let i = 0; i < 5; i++) write(root, `f${i}.js`, `// file ${i}\n`)
    const res = await listRepoSources(root, { maxFiles: 2 })
    assert.equal(res.added.length, 2)
    assert.equal(res.truncated, true)
    assert.equal(res.counts.added, 2)
    assert.ok(res.counts.truncatedRemaining >= 3)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test('per-file size cap skips the oversize file with truncated:true', async () => {
  const root = mkTmp('gs-size-')
  try {
    write(root, 'small.js', 'ok\n')
    write(root, 'big.js', 'x'.repeat(2000) + '\n')
    const res = await listRepoSources(root, { maxBytesPerFile: 100 })
    assert.deepEqual(res.added.map((e) => e.path), ['small.js'])
    assert.equal(res.truncated, true)
    assert.equal(res.counts.skippedLarge, 1)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test('missing repoPath throws, non-directory throws', async () => {
  await assert.rejects(() => listRepoSources(path.join(os.tmpdir(), 'gs-nope-does-not-exist-xyz')), /does not exist/)
  const root = mkTmp('gs-file-')
  try {
    const f = write(root, 'solo.js', 'x\n')
    await assert.rejects(() => listRepoSources(f), /not a directory/)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

// --- git repo (guarded) ------------------------------------------------------

test('git repo: full list uses git: prefix + blob-sha revision; incremental sinceCommit returns only changed + removed', { skip: gitAvailable() ? false : 'git binary not available - git-specific assertions skipped' }, async () => {
  const root = mkTmp('gs-git-')
  try {
    gitInit(root)
    write(root, 'keep.js', 'const a = 1\n')
    write(root, 'change.js', 'const b = 1\n')
    write(root, 'gone.js', 'const c = 1\n')
    write(root, 'ignored/node_modules/dep.js', 'nope\n')
    const base = gitCommit(root, 'initial')

    // Full enumeration at HEAD.
    const full = await listRepoSources(root)
    assert.ok(/^[0-9a-f]{40}$/.test(full.headCommit), 'headCommit is a 40-hex sha')
    const repoName = path.basename(root)
    const fullPaths = full.added.map((e) => e.path).sort()
    assert.deepEqual(fullPaths, ['change.js', 'gone.js', 'keep.js'])
    const keep = full.added.find((e) => e.path === 'keep.js')
    assert.equal(keep.sourceId, `git:${repoName}:keep.js`)
    assert.ok(/^[0-9a-f]{40}$/.test(keep.revision), 'revision is the blob sha (40-hex)')

    // Second commit: modify one, add one, delete one.
    write(root, 'change.js', 'const b = 2 // changed\n')
    write(root, 'added.js', 'const d = 1\n')
    fs.rmSync(path.join(root, 'gone.js'))
    gitCommit(root, 'second')

    const incr = await listRepoSources(root, { sinceCommit: base })
    const incrPaths = incr.added.map((e) => e.path).sort()
    assert.deepEqual(incrPaths, ['added.js', 'change.js'], 'incremental returns only modified + added source files')
    assert.deepEqual(incr.removed, [`git:${repoName}:gone.js`], 'deleted file surfaces as a removed sourceId')
    assert.equal(incr.added.find((e) => e.path === 'change.js').text, 'const b = 2 // changed\n')
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})
