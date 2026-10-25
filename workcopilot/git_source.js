// ---------------------------------------------------------------------------
// WorkCoPilot Company Brain - LOCAL GIT / DISK code-source connector (device).
// ---------------------------------------------------------------------------
// The operator points the desktop at a local git repository or a plain folder;
// this connector ENUMERATES the repo's source files and DETECTS CHANGES so the
// existing device-side ingestion (workcopilot/brain-uploader.js) can chunk +
// scrub + embed them without any raw file ever leaving the machine.
//
// SEPARATION OF CONCERNS (deliberate): this module ONLY enumerates + reads file
// text. It does NOT chunk, scrub, or embed - that is the uploader's job. The
// shape returned here lines up with the uploader's enumerateSources() hook: each
// added entry carries a stable sourceId + a revision the uploader compares
// against the tenant manifest (unchanged() in brain-uploader.js), and text the
// uploader feeds through chunkText -> scrubSensitive -> embedPassages.
//
// NO new npm dependency (SCA rule): Node built-ins only, and the system `git`
// CLI via child_process.spawnSync with an ARGS ARRAY (never a shell string, so
// an untrusted repo path or ref can never be shell-interpolated).
//
// Robustness: a missing `git` binary or a non-repo / corrupt folder degrades to
// a recursive folder walk (never a dead end - SUPREME RULE VIII). One bad file
// (unreadable, binary, oversize) is skipped and COUNTED, never thrown on and
// never silently dropped (SUPREME RULE III - no silent fallback). Caps on file
// count and per-file size set truncated:true + counts so the UI can say so.
//
// US spelling. No em dashes. Node ESM ("type":"module"); the CommonJS uploader
// reaches it through one dynamic import(), exactly as it already does for
// ../server/brain_model.js.
// ---------------------------------------------------------------------------

import { spawnSync } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

// ---------------------------------------------------------------------------
// Source-file extension set. MIRRORED VERBATIM from workcopilot/main.js
// DOC_TEXT_EXT (around line 957) so the connector ingests exactly the file
// types the on-device extractor already understands - one closed set, no drift
// (SUPREME RULE II). main.js keeps DOC_TEXT_EXT as a module-local const that is
// not exported, so it cannot be imported; this is a faithful mirror. If the
// main.js set changes, change it here in the same edit.
// ---------------------------------------------------------------------------
const SOURCE_EXT = /\.(txt|md|markdown|csv|tsv|json|log|ya?ml|xml|html?|js|ts|jsx|tsx|py|java|c|cpp|h|hpp|cs|go|rb|rs|php|sh|sql|ini|conf|env|toml)$/i

// Human-readable language label by extension (best-effort; defaults to the raw
// extension). Only drives the `language` field on each entry; it never gates
// inclusion - SOURCE_EXT alone decides what counts as a source file.
const LANGUAGE_BY_EXT = {
  txt: 'text', md: 'markdown', markdown: 'markdown', csv: 'csv', tsv: 'tsv',
  json: 'json', log: 'text', yaml: 'yaml', yml: 'yaml', xml: 'xml',
  html: 'html', htm: 'html', js: 'javascript', ts: 'typescript',
  jsx: 'javascript', tsx: 'typescript', py: 'python', java: 'java',
  c: 'c', cpp: 'cpp', h: 'c', hpp: 'cpp', cs: 'csharp', go: 'go',
  rb: 'ruby', rs: 'rust', php: 'php', sh: 'shell', sql: 'sql',
  ini: 'ini', conf: 'ini', env: 'dotenv', toml: 'toml',
}

// Caps: generous defaults that keep an accidental point-at-a-huge-tree from
// flooding the uploader. Both are overridable per call.
const DEFAULT_MAX_FILES = 5000
const DEFAULT_MAX_BYTES_PER_FILE = 512 * 1024 // 512 KB
const BINARY_SNIFF_BYTES = 8000 // a NUL in the first 8 KB means "treat as binary"

// ---------------------------------------------------------------------------
// defaultIgnores - the ignore list. Directory-name entries end with "/"; the
// rest are filename globs or exact lockfile names. .gitignore patterns (if a
// .gitignore is present at the repo root) are appended to whatever list is in
// force, so they are honored on both the git and folder-walk paths.
// ---------------------------------------------------------------------------
export function defaultIgnores() {
  return [
    // Version-control + dependency + build output directories.
    '.git/', 'node_modules/', 'vendor/', 'dist/', 'build/', 'out/',
    'coverage/', '.next/', 'target/', '.svn/', '.hg/',
    // Minified bundles.
    '*.min.*',
    // Lockfiles (machine-generated, not authored source).
    'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'npm-shrinkwrap.json',
    'Cargo.lock', 'composer.lock', 'Gemfile.lock', 'poetry.lock', 'go.sum',
    'Pipfile.lock',
    // Binaries / images / media. These are also excluded by the source-ext
    // gate; listed here so defaultIgnores() reads as a complete statement of
    // intent and so a custom source-ext set would still skip them.
    '*.png', '*.jpg', '*.jpeg', '*.gif', '*.webp', '*.bmp', '*.tiff', '*.ico',
    '*.svg', '*.pdf', '*.zip', '*.gz', '*.tar', '*.7z', '*.rar', '*.exe',
    '*.dll', '*.so', '*.dylib', '*.woff', '*.woff2', '*.ttf', '*.eot',
    '*.mp3', '*.mp4', '*.mov', '*.avi', '*.wasm', '*.class', '*.o', '*.a',
  ]
}

// ---------------------------------------------------------------------------
// isSourceFile - true when the path's extension is in the mirrored source set.
// ---------------------------------------------------------------------------
export function isSourceFile(p) {
  return SOURCE_EXT.test(path.basename(String(p == null ? '' : p)))
}

function languageFor(p) {
  const m = SOURCE_EXT.exec(path.basename(String(p == null ? '' : p)))
  if (!m) return 'text'
  const ext = m[1].toLowerCase()
  return LANGUAGE_BY_EXT[ext] || ext
}

function sourceIdFor(prefix, repoName, relPosix) {
  return `${prefix}:${repoName}:${relPosix}`
}

function toPosix(p) {
  return String(p).replace(/\\/g, '/').replace(/^\/+/, '')
}

// ---------------------------------------------------------------------------
// Ignore matcher. Converts a single glob to a one-segment-aware RegExp and
// classifies each ignore entry (directory name / plain name / glob). The
// returned predicate takes a repo-relative posix path and whether it is a dir.
// ---------------------------------------------------------------------------
function globToRegExp(glob) {
  let re = ''
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i]
    if (c === '*') {
      if (glob[i + 1] === '*') { re += '.*'; i++; if (glob[i + 1] === '/') i++ } else re += '[^/]*'
    } else if (c === '?') {
      re += '[^/]'
    } else if ('.+^${}()|[]\\'.includes(c)) {
      re += '\\' + c
    } else {
      re += c
    }
  }
  return new RegExp('^' + re + '$')
}

function makeIgnoreMatcher(globs) {
  const dirNames = new Set()
  const plainNames = new Set()
  const globRules = [] // { re, anchored, basenameOnly }
  for (const raw of globs || []) {
    let entry = toPosix(String(raw == null ? '' : raw).trim())
    if (!entry || entry.startsWith('#')) continue
    if (entry.startsWith('!')) continue // negation is unsupported (best-effort); skip rather than guess
    const isDir = entry.endsWith('/')
    if (isDir) entry = entry.slice(0, -1)
    if (!entry) continue
    const hasSlash = entry.includes('/')
    const hasGlob = /[*?]/.test(entry)
    if (!hasSlash && !hasGlob) {
      plainNames.add(entry)
      if (isDir) dirNames.add(entry)
      continue
    }
    const anchored = entry.startsWith('/')
    if (anchored) entry = entry.slice(1)
    globRules.push({ re: globToRegExp(entry), anchored, basenameOnly: !entry.includes('/') })
  }
  return function ignored(relPath /* posix */) {
    const rel = toPosix(relPath)
    if (!rel) return false
    const segs = rel.split('/').filter(Boolean)
    const base = segs.length ? segs[segs.length - 1] : rel
    for (const s of segs) if (dirNames.has(s)) return true
    if (plainNames.has(base)) return true
    for (const s of segs) if (plainNames.has(s)) return true
    for (const r of globRules) {
      if (r.basenameOnly) { if (r.re.test(base)) return true } else if (r.re.test(rel)) return true
    }
    return false
  }
}

function readGitignore(repoRoot) {
  try {
    const raw = fs.readFileSync(path.join(repoRoot, '.gitignore'), 'utf8')
    return raw.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'))
  } catch {
    return [] // absent or unreadable .gitignore is fine - just no extra patterns
  }
}

// ---------------------------------------------------------------------------
// Per-file reader. Enforces the size cap, skips binary-looking content, and
// computes a content sha1 (used as the revision for non-git / folder sources).
// Returns { text, sha } or { skip: 'large' | 'binary' | 'missing' | 'unreadable' }.
// Never throws - a bad file is reported, not fatal.
// ---------------------------------------------------------------------------
function readSourceFile(absPath, maxBytesPerFile) {
  let st
  try { st = fs.statSync(absPath) } catch { return { skip: 'missing' } }
  if (!st.isFile()) return { skip: 'missing' }
  if (st.size > maxBytesPerFile) return { skip: 'large' }
  let buf
  try { buf = fs.readFileSync(absPath) } catch { return { skip: 'unreadable' } }
  const sniff = Math.min(buf.length, BINARY_SNIFF_BYTES)
  for (let i = 0; i < sniff; i++) if (buf[i] === 0) return { skip: 'binary' }
  return { text: buf.toString('utf8'), sha: crypto.createHash('sha1').update(buf).digest('hex') }
}

function emptyCounts() {
  return {
    added: 0, removed: 0, ignored: 0, nonSource: 0,
    skippedLarge: 0, skippedBinary: 0, skippedUnreadable: 0, skippedSymlink: 0,
    truncatedRemaining: 0,
  }
}

// ---------------------------------------------------------------------------
// git plumbing. spawnSync with an args array (shell:false by default) so the
// repo path and any ref are passed as literal argv, never interpreted.
// ---------------------------------------------------------------------------
function runGit(repoRoot, args) {
  const res = spawnSync('git', ['-C', repoRoot, ...args], {
    encoding: 'buffer', // keep bytes so NUL (-z) splitting is exact
    maxBuffer: 256 * 1024 * 1024,
    windowsHide: true,
  })
  if (res.error) {
    const err = new Error(`git ${args.join(' ')} failed: ${res.error.message}`)
    err.code = res.error.code // ENOENT when the git binary is absent
    throw err
  }
  if (res.status !== 0) {
    const stderr = res.stderr ? res.stderr.toString('utf8').trim() : ''
    throw new Error(`git ${args.join(' ')} exited ${res.status}: ${stderr || 'no stderr'}`)
  }
  return res.stdout // Buffer
}

function splitZ(buf) {
  const s = buf.toString('utf8')
  const parts = s.split('\0')
  if (parts.length && parts[parts.length - 1] === '') parts.pop()
  return parts
}

// A ref we are about to hand to git must not start with "-" (which git would
// read as an option) and must look like a ref/sha. Args are an array so there
// is no shell to inject into; this is defense in depth against option-injection.
function assertSafeRef(ref) {
  const r = String(ref)
  if (!r || r.startsWith('-') || !/^[0-9a-zA-Z._/~^@{}-]+$/.test(r)) {
    throw new Error(`unsafe sinceCommit ref: ${JSON.stringify(ref)}`)
  }
  return r
}

function gitHead(repoRoot) {
  // rev-parse is NOT -z output, so it carries a trailing newline; trim it.
  try { return runGit(repoRoot, ['rev-parse', 'HEAD']).toString('utf8').trim() || null } catch { return null }
}

function gitLsFiles(repoRoot) {
  return splitZ(runGit(repoRoot, ['ls-files', '-z']))
}

// path -> blob sha, from one `git ls-tree -r -z HEAD`. Empty when there is no
// commit yet (fresh repo); callers then fall back to a per-path rev-parse.
function gitBlobShaMap(repoRoot) {
  const map = new Map()
  let out
  try { out = runGit(repoRoot, ['ls-tree', '-r', '-z', 'HEAD']) } catch { return map }
  for (const entry of splitZ(out)) {
    // "<mode> <type> <sha>\t<path>"
    const tab = entry.indexOf('\t')
    if (tab < 0) continue
    const meta = entry.slice(0, tab).split(/\s+/)
    const sha = meta[2]
    const p = toPosix(entry.slice(tab + 1))
    if (sha && p) map.set(p, sha)
  }
  return map
}

function gitRevParsePath(repoRoot, relPosix) {
  // Not -z output: trim the trailing newline so the revision is a clean sha.
  try { return runGit(repoRoot, ['rev-parse', `HEAD:${relPosix}`]).toString('utf8').trim() || '' } catch { return '' }
}

// `git diff --name-status -z <since> HEAD` parsed into changed vs deleted. With
// -z each record is status\0path\0, except renames/copies which are
// status\0oldpath\0newpath\0. Added/modified/renamed-new/copied/typechanged ->
// changed; deleted (and the old side of a rename) -> deleted.
function gitDiff(repoRoot, sinceCommit) {
  const since = assertSafeRef(sinceCommit)
  const tokens = splitZ(runGit(repoRoot, ['diff', '--name-status', '-z', since, 'HEAD']))
  const changed = []
  const deleted = []
  for (let i = 0; i < tokens.length;) {
    const status = tokens[i++]
    if (!status) continue
    const code = status[0]
    if (code === 'R' || code === 'C') {
      const oldPath = tokens[i++]
      const newPath = tokens[i++]
      if (code === 'R' && oldPath) deleted.push(toPosix(oldPath)) // old name goes away
      if (newPath) changed.push(toPosix(newPath))
    } else {
      const p = tokens[i++]
      if (!p) continue
      if (code === 'D') deleted.push(toPosix(p))
      else changed.push(toPosix(p)) // A, M, T, U, etc.
    }
  }
  return { changed, deleted }
}

// ---------------------------------------------------------------------------
// git enumeration (full or incremental).
// ---------------------------------------------------------------------------
function enumerateGit({ repoRoot, repoName, matcher, sinceCommit, maxFiles, maxBytesPerFile }) {
  const counts = emptyCounts()
  let truncated = false
  const headCommit = gitHead(repoRoot)
  const shaMap = gitBlobShaMap(repoRoot)

  let candidates
  const removed = []
  if (sinceCommit != null) {
    const diff = gitDiff(repoRoot, sinceCommit) // incremental: only changed paths
    candidates = diff.changed
    for (const rel of diff.deleted) {
      if (!isSourceFile(rel) || matcher(rel)) continue // only surface source files the uploader knows
      removed.push(sourceIdFor('git', repoName, rel))
    }
  } else {
    candidates = gitLsFiles(repoRoot) // full: every tracked file
  }

  const added = []
  for (const rel of candidates) {
    if (matcher(rel)) { counts.ignored++; continue }
    if (!isSourceFile(rel)) { counts.nonSource++; continue }
    if (added.length >= maxFiles) { counts.truncatedRemaining++; truncated = true; continue }
    const read = readSourceFile(path.join(repoRoot, rel), maxBytesPerFile)
    if (read.skip === 'large') { counts.skippedLarge++; truncated = true; continue }
    if (read.skip === 'binary') { counts.skippedBinary++; continue }
    if (read.skip) { counts.skippedUnreadable++; continue } // missing on disk / unreadable
    const revision = shaMap.get(rel) || gitRevParsePath(repoRoot, rel) || read.sha
    added.push({ sourceId: sourceIdFor('git', repoName, rel), path: rel, language: languageFor(rel), revision, text: read.text })
  }

  counts.added = added.length
  counts.removed = removed.length
  return { headCommit, truncated, counts, added, removed }
}

// ---------------------------------------------------------------------------
// Folder walk (non-git, or git-unavailable degrade). Recursive, symlink-safe
// (symlinks are skipped + counted so a link cannot escape the tree or loop).
// revision = content sha1, since there is no blob sha to lean on.
// ---------------------------------------------------------------------------
function enumerateFolder({ repoRoot, repoName, matcher, prefix, maxFiles, maxBytesPerFile }) {
  const counts = emptyCounts()
  let truncated = false
  const added = []

  const walk = (relDir) => {
    if (added.length >= maxFiles && truncated) { /* keep counting below */ }
    let entries
    try {
      entries = fs.readdirSync(path.join(repoRoot, relDir || '.'), { withFileTypes: true })
    } catch {
      counts.skippedUnreadable++
      return
    }
    entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0)) // deterministic order
    for (const ent of entries) {
      const rel = relDir ? `${relDir}/${ent.name}` : ent.name
      if (ent.isSymbolicLink()) { counts.skippedSymlink++; continue }
      if (ent.isDirectory()) {
        if (matcher(rel)) { counts.ignored++; continue }
        walk(rel)
      } else if (ent.isFile()) {
        if (matcher(rel)) { counts.ignored++; continue }
        if (!isSourceFile(rel)) { counts.nonSource++; continue }
        if (added.length >= maxFiles) { counts.truncatedRemaining++; truncated = true; continue }
        const read = readSourceFile(path.join(repoRoot, rel), maxBytesPerFile)
        if (read.skip === 'large') { counts.skippedLarge++; truncated = true; continue }
        if (read.skip === 'binary') { counts.skippedBinary++; continue }
        if (read.skip) { counts.skippedUnreadable++; continue }
        added.push({ sourceId: sourceIdFor(prefix, repoName, rel), path: rel, language: languageFor(rel), revision: read.sha, text: read.text })
      }
      // Anything else (fifo, socket, block/char device) is intentionally ignored.
    }
  }
  walk('')

  counts.added = added.length
  counts.removed = 0
  return { headCommit: null, truncated, counts, added, removed: [] }
}

// ---------------------------------------------------------------------------
// listRepoSources - the one entry point the uploader wires in.
// ---------------------------------------------------------------------------
export async function listRepoSources(repoPath, {
  sinceCommit = null,
  ignoreGlobs = defaultIgnores(),
  maxFiles = DEFAULT_MAX_FILES,
  maxBytesPerFile = DEFAULT_MAX_BYTES_PER_FILE,
} = {}) {
  const repoRoot = path.resolve(String(repoPath == null ? '' : repoPath))
  let st
  try { st = fs.statSync(repoRoot) } catch { throw new Error(`repoPath does not exist: ${repoRoot}`) }
  if (!st.isDirectory()) throw new Error(`repoPath is not a directory: ${repoRoot}`)

  const caps = {
    maxFiles: Number.isFinite(maxFiles) && maxFiles > 0 ? Math.floor(maxFiles) : DEFAULT_MAX_FILES,
    maxBytesPerFile: Number.isFinite(maxBytesPerFile) && maxBytesPerFile > 0 ? Math.floor(maxBytesPerFile) : DEFAULT_MAX_BYTES_PER_FILE,
  }

  const repoName = path.basename(repoRoot) || 'repo'
  const matcher = makeIgnoreMatcher([...(ignoreGlobs || []), ...readGitignore(repoRoot)])
  const isGit = fs.existsSync(path.join(repoRoot, '.git'))

  if (isGit) {
    try {
      return enumerateGit({ repoRoot, repoName, matcher, sinceCommit, ...caps })
    } catch (e) {
      const msg = String((e && e.message) || e)
      const gitMissing = (e && e.code === 'ENOENT') || /ENOENT/.test(msg)
      const notRepo = /not a git repository/i.test(msg)
      if (!gitMissing && !notRepo) throw e // a real error (e.g. bad sinceCommit) must surface, not degrade silently
      // git binary absent or the .git is not a usable repo: degrade to a folder
      // walk, but keep the stable "git:" sourceId prefix (this IS a git repo),
      // and say what happened + that any sinceCommit could not be honored.
      const r = enumerateFolder({ repoRoot, repoName, matcher, prefix: 'git', ...caps })
      r.counts.note = `git CLI unavailable or not a usable repository (${msg}); enumerated via folder walk`
      if (sinceCommit != null) r.counts.note += '; sinceCommit could not be applied, returned the full source set instead'
      return r
    }
  }

  const r = enumerateFolder({ repoRoot, repoName, matcher, prefix: 'local', ...caps })
  if (sinceCommit != null) r.counts.note = 'sinceCommit ignored: not a git repository, returned the full source set'
  return r
}

export default { listRepoSources, defaultIgnores, isSourceFile }
