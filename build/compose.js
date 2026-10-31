// Compose one edition into a folder that can be installed and started:
//
//   <out>/server/...            the server's TRACKED files (git ls-files), without
//                               tests, test helpers, the eval corpus or any
//                               data/key/env file; plus the public benchmark
//                               results, which the public site reads
//   <out>/dist/...              the built SPA (npm run build first), stamped for
//                               the edition's capabilities (build/spa_stamp.js:
//                               capability meta tag, audience copy in the static
//                               shell, prerendered routes, public origin). The
//                               default edition at the default origin ships the
//                               build byte-for-byte.
//   <out>/editions/start.mjs, profile.js, <edition>/manifest.json
//   <out>/package.json, package-lock.json   (install with npm ci --omit=dev)
//   <out>/ship-manifest.json    edition, capabilities, commit (+ dirty flag),
//                               start command, every file with size and sha256
//
// Checks before anything is handed over:
//   - every relative import of every shipped module resolves to a SHIPPED file,
//     with exact letter case (a Windows build must also start on Linux);
//   - every package a shipped module imports is a production dependency
//     (npm ci --omit=dev will not install devDependencies).
// The bundle is built in a staging folder next to <out> and only renamed into
// place when every check passed, so a failed run never leaves a half bundle
// and never removes the previous one. A bundle is a build artifact: compose
// never writes over an installed server (a folder holding anything beyond the
// files its ship-manifest.json lists, such as server/data, is refused).
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { EDITIONS, EDITION_IDS, makeCaps } from '../server/edition_registry.js'
import { loadManifest } from '../editions/profile.js'
import { importsOf, packagesOf } from './import_check.js'
import { stampSpa, DEFAULT_ORIGIN } from './spa_stamp.js'
import { renameWithRetry } from './fs_retry.js'   // Windows: a scanner's brief lock must not fail the bundle

export const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const MARKER = 'ship-manifest.json'

// What never ships, by path relative to the repo root (posix). Applied on top
// of "tracked by git", so an untracked file never ships either.
export function excluded(rel) {
  const parts = rel.split('/')
  const base = parts[parts.length - 1]
  if (/\.test\.m?js$/.test(base)) return true                        // tests
  if (/harness/.test(base) || /^test_/.test(base)) return true       // test helpers
  if (/^server\/(data|eval)(\/|$)/.test(rel)) return true             // live data, benchmark corpus
  if (parts[0] === 'server' && parts.some((p) => p.startsWith('.'))) return true   // server dotfiles (.env, .enc.key, ...)
  if (/^db\.json/.test(base) || /\.(env|pem|key|log|tmp)$/.test(base) || /^ai-seed\.json$/.test(base)) return true
  if (parts.includes('node_modules')) return true
  return false
}

// Shipped although not tracked: generated public benchmark results, read by
// the public site (GET /api/work/benchmark). Only the *-public.json files.
const EXTRA = [{ dir: 'server/eval/results', match: /-public\.json$/ }]

function gitFiles(root, dir) {
  let out
  try {
    out = execFileSync('git', ['ls-files', '-z', '--', dir], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 })
  } catch (e) {
    throw new Error(`[compose] cannot list the tracked files (git ls-files failed: ${String(e.message).split('\n')[0]}). Compose runs from a git checkout.`)
  }
  return out.split('\0').filter(Boolean).filter((rel) => fs.existsSync(path.join(root, ...rel.split('/'))))
}

function walk(root, rel, out) {
  const abs = path.join(root, ...rel.split('/'))
  if (!fs.existsSync(abs)) return
  for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
    const r = `${rel}/${e.name}`
    if (e.isDirectory()) walk(root, r, out)
    else if (e.isFile()) out.push(r)
  }
}

export function planFiles(edition, { root = ROOT, spa = true } = {}) {
  loadManifest(edition, path.join(root, 'editions'))   // validates the edition folder
  if (spa && !fs.existsSync(path.join(root, 'dist', 'index.html'))) {
    throw new Error('[compose] dist/index.html is missing. Run "npm run build" (or build:harden) first, or pass --no-spa for a server-only bundle.')
  }
  const files = new Set()
  for (const rel of gitFiles(root, 'server')) if (!excluded(rel)) files.add(rel)
  for (const x of EXTRA) { const found = []; walk(root, x.dir, found); for (const rel of found) if (x.match.test(rel)) files.add(rel) }
  if (spa) { const found = []; walk(root, 'dist', found); for (const rel of found) if (!excluded(rel)) files.add(rel) }
  for (const rel of ['editions/start.mjs', 'editions/profile.js', `editions/${edition}/manifest.json`, 'package.json', 'package-lock.json']) {
    if (!fs.existsSync(path.join(root, ...rel.split('/')))) throw new Error(`[compose] ${rel} is missing; the bundle needs it.`)
    files.add(rel)
  }
  return [...files].sort()
}

function git(root, args) {
  try { return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() } catch { return null }
}

// Paths compared the way the file system compares them (case-blind on Windows).
const norm = (p) => { let r = path.resolve(p); try { r = fs.realpathSync.native(r) } catch { /* not there yet */ } return process.platform === 'win32' ? r.toLowerCase() : r }
const inside = (child, parent) => child === parent || child.startsWith(parent.endsWith(path.sep) ? parent : parent + path.sep)

// Where a bundle may be written: an empty or new folder, or an earlier bundle
// (it holds ship-manifest.json) when replace is set. Never a filesystem root,
// never the repository or a folder above it, and inside the repository only
// under out/.
export function checkOut(outAbs, { root = ROOT, replace = false } = {}) {
  const o = norm(outAbs)
  const r = norm(root)
  if (path.parse(o).root === o) throw new Error(`[compose] ${outAbs} is a filesystem root. Pick a folder for the bundle, such as out/<edition>.`)
  if (inside(r, o)) throw new Error('[compose] the output folder cannot be the repository or one of its parents.')
  if (inside(o, r) && !inside(o, norm(path.join(root, 'out'))) ) throw new Error(`[compose] inside the repository a bundle can only go under out/ (got ${outAbs}).`)
  if (fs.existsSync(outAbs) && fs.readdirSync(outAbs).length) {
    if (!fs.existsSync(path.join(outAbs, MARKER))) throw new Error(`[compose] ${outAbs} is not empty and is not an earlier bundle (no ${MARKER}). Pick an empty folder.`)
    if (!replace) throw new Error(`[compose] ${outAbs} holds an earlier bundle. Pass --replace to overwrite it.`)
    // An installed, started bundle keeps live data inside itself (server/data:
    // db.json, the master key). Replace only a bundle that holds nothing but
    // its own listed files (and the node_modules npm ci put there).
    const extra = foreignFiles(outAbs)
    if (extra.length) throw new Error(`[compose] ${outAbs} holds files that are not part of the earlier bundle (${extra.slice(0, 5).join(', ')}${extra.length > 5 ? ', ...' : ''}). It may be an installed server with live data; it is never replaced. Compose into a new folder and upgrade the installation from there.`)
  }
}

function foreignFiles(dir) {
  let listed
  try { listed = new Set(JSON.parse(fs.readFileSync(path.join(dir, MARKER), 'utf8')).files.map((f) => f.path)) } catch { return [MARKER + ' (unreadable)'] }
  listed.add(MARKER)
  const found = []
  const walkAll = (rel) => {
    for (const e of fs.readdirSync(rel ? path.join(dir, ...rel.split('/')) : dir, { withFileTypes: true })) {
      const r = rel ? `${rel}/${e.name}` : e.name
      if (!rel && e.name === 'node_modules') continue
      if (e.isDirectory()) walkAll(r)
      else if (!listed.has(r)) found.push(r)
    }
  }
  walkAll('')
  return found
}

export function compose({ edition, out, root = ROOT, spa = true, replace = false, origin } = {}) {
  if (!EDITION_IDS.includes(edition)) throw new Error(`[compose] unknown edition "${edition}". Choose one of: ${EDITION_IDS.join(', ')}.`)
  if (!out) throw new Error('[compose] --out <folder> is required.')
  const outAbs = path.resolve(out)
  checkOut(outAbs, { root, replace })
  const files = planFiles(edition, { root, spa })
  const shipped = new Set(files)
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
  const prodDeps = new Set(Object.keys(pkg.dependencies || {}))

  // Checks on the source tree, against the planned list, before copying.
  const problems = []
  for (const rel of files) {
    if (!/\.(m?js|cjs)$/.test(rel) || rel.startsWith('dist/')) continue
    const abs = path.join(root, ...rel.split('/'))
    for (const imp of importsOf(abs)) {
      const target = path.relative(root, imp.target).split(path.sep).join('/')
      if (!shipped.has(target)) problems.push(`${rel} imports ${imp.spec}, which is not shipped (or differs in letter case)`)
    }
    for (const name of packagesOf(abs)) if (!prodDeps.has(name)) problems.push(`${rel} imports the package "${name}", which is not in package.json dependencies (npm ci --omit=dev will not install it)`)
  }
  if (problems.length) throw new Error(`[compose] the bundle would not start:\n  ${problems.join('\n  ')}`)

  // The public origin the SPA is stamped with: --origin, else the edition's
  // manifest WORK_PUBLIC_URL default, else admireveda.com.
  const manifest = loadManifest(edition, path.join(root, 'editions'))
  const publicOrigin = String(origin || (manifest.env && manifest.env.WORK_PUBLIC_URL) || DEFAULT_ORIGIN).replace(/\/+$/, '')

  const staging = `${outAbs}.staging-${process.pid}-${Date.now()}`
  try {
    for (const rel of files) {
      const dst = path.join(staging, ...rel.split('/'))
      fs.mkdirSync(path.dirname(dst), { recursive: true })
      fs.copyFileSync(path.join(root, ...rel.split('/')), dst)
    }
    // Stamp the staged copy only (the repository's dist/ is never changed).
    let stamp = null
    if (spa) stamp = stampSpa(path.join(staging, 'dist'), makeCaps(edition).list(), { origin: publicOrigin })
    // List what actually ships, after the stamp (it adds and removes pages).
    const listed = []
    const shippedNow = [...files.filter((rel) => !rel.startsWith('dist/'))]
    if (spa) { const found = []; walk(staging, 'dist', found); shippedNow.push(...found) }
    for (const rel of shippedNow.sort()) {
      const buf = fs.readFileSync(path.join(staging, ...rel.split('/')))
      listed.push({ path: rel, bytes: buf.length, sha256: crypto.createHash('sha256').update(buf).digest('hex') })
    }
    const status = git(root, ['status', '--porcelain', '--untracked-files=no', '--', 'server', 'editions', 'package.json', 'package-lock.json'])
    const ship = {
      edition,
      label: EDITIONS[edition].label,
      capabilities: makeCaps(edition).list(),
      commit: git(root, ['rev-parse', 'HEAD']),
      // true when shipped files differ from that commit (uncommitted edits)
      dirty: status === null ? null : status.length > 0,
      builtAt: new Date().toISOString(),
      spa,
      ...(spa ? { spaStamp: stamp && stamp.stamped ? { capabilities: stamp.capabilities, origin: stamp.origin, audience: stamp.audience, prerenderedRoutes: stamp.prerenderedRoutes } : { unstamped: stamp ? stamp.reason : 'no SPA' } } : {}),
      install: 'npm ci --omit=dev',
      start: `node editions/start.mjs ${edition}`,
      files: listed,
    }
    fs.writeFileSync(path.join(staging, MARKER), JSON.stringify(ship, null, 2) + '\n')
    // Swap in only now. The previous bundle is moved aside, not deleted, until
    // the new one is in place; if the swap fails it is moved back.
    fs.mkdirSync(path.dirname(outAbs), { recursive: true })
    const aside = fs.existsSync(outAbs) ? `${outAbs}.old-${process.pid}-${Date.now()}` : null
    if (aside) renameWithRetry(outAbs, aside)
    try { renameWithRetry(staging, outAbs) } catch (e) {
      if (aside) { try { renameWithRetry(aside, outAbs) } catch { /* left at aside; named in the error */ } }
      throw new Error(`[compose] could not move the new bundle into place (${e.code || e.message}).${aside && fs.existsSync(aside) ? ` The previous bundle is at ${aside}.` : ''}`)
    }
    if (aside) { try { fs.rmSync(aside, { recursive: true, force: true }) } catch { /* the new bundle is in place; a leftover copy is harmless */ } }
    return { out: outAbs, edition, files: listed.length, bytes: listed.reduce((n, f) => n + f.bytes, 0), dirty: ship.dirty }
  } catch (e) {
    try { fs.rmSync(staging, { recursive: true, force: true }) } catch { /* best effort */ }
    throw e
  }
}
