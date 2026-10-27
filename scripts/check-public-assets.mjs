// Public-asset allowlist gate (audit IP-05 / IP-02).
// Scans the built dist/ directory and FAILS (exit 1) if it contains anything that
// must never be served publicly: source maps, source files, env/keys, docs,
// server code, tests, secret-looking names, unexpected dotfiles.
// If dist/ does not exist there is nothing to check: exit 0 (safe in CI pre-build).
// Run:  node scripts/check-public-assets.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIST = path.join(ROOT, 'dist')

// ---- allow rules ----------------------------------------------------------
// Public media (hero images/video, avatars, the public security paper) is served
// intentionally. These are allowed at the root and under the media dirs below.
const MEDIA_EXT = new Set(['.png', '.jpg', '.jpeg', '.svg', '.webp', '.gif', '.ico', '.mp4', '.webm', '.pdf'])
const MEDIA_DIRS = new Set(['buddies', 'media', 'img', 'images'])
// In-app help screenshots: public/help/<role>/<name>.png|webp (served on purpose,
// referenced by the three dashboards' Help sections). Screenshot formats only.
const HELP_DIR = 'help'
const HELP_EXT = new Set(['.png', '.webp', '.jpg', '.jpeg'])
const ASSET_EXT = new Set(['.js', '.css', '.woff2', '.woff', '.ttf', '.png', '.jpg', '.jpeg', '.svg', '.webp', '.gif', '.ico', '.json', '.mp4', '.webm'])
const ROOT_EXT = new Set(['.png', '.svg', '.ico', '.webmanifest', '.jpg', '.jpeg', '.webp', '.gif', '.mp4', '.webm', '.pdf'])
const ROOT_NAMES = new Set(['index.html', 'robots.txt', 'sitemap.xml', 'favicon.ico', 'llms.txt'])
// Root MEDIA is allowed by NAME, not just by extension: every picture, video or
// paper served from the site root is listed here on purpose, so a stray export,
// a screenshot or a draft dropped into public/ fails the gate instead of
// shipping. Add a new asset here in the same change that adds the file.
const ROOT_MEDIA = new Set([
  // favicon set (derived from the AdmireVeda brand mark, scripts in the site-wow pass)
  'favicon.svg', 'favicon-32.png', 'favicon-192.png', 'apple-touch-icon.png',
  // social share + the public security paper
  'og-image.png', 'WorkCoPilot-Security-and-Privacy.pdf',
  // hero / section media
  'hero-aurora.jpg', 'hero-aurora.mp4', 'people-focus.jpg', 'people-focus.mp4', 'people-done.jpg',
  'affiliate-hero.webp', 'ent-focus.webp', 'ent-team.webp', 'help-how-it-works.webp',
  'card-wash-light.jpg', 'card-texture-dark.png',
  // field vignettes (1600x900 + 800x450 "-sm"), generated for the site-wow pass
  'wow-finance.webp', 'wow-finance-sm.webp', 'wow-logistics.webp', 'wow-logistics-sm.webp',
  'wow-healthcare.webp', 'wow-healthcare-sm.webp', 'wow-retail.webp', 'wow-retail-sm.webp',
  'wow-hr.webp', 'wow-hr-sm.webp', 'wow-engineering.webp', 'wow-engineering-sm.webp',
  'wow-support.webp', 'wow-support-sm.webp', 'wow-guide.webp', 'wow-guide-sm.webp',
])
const SAFE_DOTFILES = new Set(['.well-known', '.htaccess-none-placeholder'])

// ---- block rules (checked first, anywhere in dist/) -----------------------
const BLOCK_EXT = new Map([
  ['.map', 'source map'], ['.ts', 'TypeScript source'], ['.tsx', 'TSX source'], ['.jsx', 'JSX source'],
  ['.env', 'env file'], ['.pem', 'PEM key/cert'], ['.key', 'private key'], ['.md', 'markdown doc'],
  ['.mjs', 'ES module / test file'],
])
const BLOCK_DIRS = new Set(['docs', 'server', 'node_modules'])
const BLOCK_NAME_RE = /(secret|credential|private)/i

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name)
    if (ent.isDirectory()) walk(full, out)
    else if (ent.isFile() || ent.isSymbolicLink()) out.push(full)
  }
  return out
}

function classify(rel) {
  const parts = rel.split('/')
  const name = parts[parts.length - 1]
  const lname = name.toLowerCase()
  const ext = path.extname(lname)

  // --- block ---
  for (const seg of parts.slice(0, -1)) {
    if (BLOCK_DIRS.has(seg.toLowerCase())) return `inside forbidden directory "${seg}/"`
  }
  for (const seg of parts) {
    if (seg.startsWith('.') && !SAFE_DOTFILES.has(seg)) return `dotfile/dot-directory "${seg}"`
    if (/^\.env/i.test(seg)) return 'env file'
  }
  if (BLOCK_EXT.has(ext)) return BLOCK_EXT.get(ext)
  if (BLOCK_NAME_RE.test(name)) return 'name contains secret/credential/private'

  // --- allow ---
  if (parts.length === 1) {
    if (ROOT_NAMES.has(lname) || ROOT_MEDIA.has(name)) return null
    if (ROOT_EXT.has(ext)) return `root media "${name}" is not in the ROOT_MEDIA allowlist (scripts/check-public-assets.mjs): add it there in the change that adds the file`
    return 'not on the root allowlist (index.html, robots.txt, sitemap.xml, favicon.ico, llms.txt, or a ROOT_MEDIA entry)'
  }
  if (parts[0] === 'copilot-assets') {
    if (ASSET_EXT.has(ext)) return null
    return `extension "${ext || '(none)'}" not allowed under copilot-assets/`
  }
  // In-app help screenshots under help/**: screenshot image types only.
  if (parts[0] === HELP_DIR) {
    if (HELP_EXT.has(ext)) return null
    return `extension "${ext || '(none)'}" not allowed under help/ (screenshots only: png, webp, jpg)`
  }
  // Public media directories (avatars, images): media file types only.
  if (MEDIA_DIRS.has(parts[0])) {
    if (MEDIA_EXT.has(ext)) return null
    return `extension "${ext || '(none)'}" not allowed under ${parts[0]}/ (media only)`
  }
  return 'outside allowlist (only copilot-assets/**, help/**, media dirs and root files are permitted)'
}

function main() {
  if (!fs.existsSync(DIST) || !fs.statSync(DIST).isDirectory()) {
    console.log('check-public-assets: dist/ not found, nothing to check (run the build first). OK.')
    process.exit(0)
  }
  const files = walk(DIST).map((f) => path.relative(DIST, f).split(path.sep).join('/')).sort()
  const offenders = []
  for (const rel of files) {
    const why = classify(rel)
    if (why) offenders.push({ rel, why })
  }
  if (offenders.length) {
    console.error(`check-public-assets: FAIL, ${offenders.length} of ${files.length} file(s) in dist/ must not be public:`)
    for (const o of offenders) console.error(`  - dist/${o.rel}  ->  ${o.why}`)
    process.exit(1)
  }
  console.log(`check-public-assets: PASS, ${files.length} file(s) scanned in dist/, all on the allowlist.`)
  process.exit(0)
}

main()
