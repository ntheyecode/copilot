// ---------------------------------------------------------------------------
// WorkCoPilot Company Brain - on-device embedding model fetcher.
// ---------------------------------------------------------------------------
// Fetches, verifies (SHA-256) and places the pinned embedding model that the
// Company Brain embedder needs so that REAL ingestion is unblocked. Until the
// model files are present, server/brain_embed.js (and workcopilot/brain-embed.js)
// run a DETERMINISTIC hash-seeded fallback (noise vectors): sibling modules
// stay testable, but retrieval quality is meaningless. This script places the
// real files so embedderReady() flips to true.
//
// The pin lives in server/brain_model.js:
//     EMBED = { id: 'Xenova/bge-small-en-v1.5', rev: 'main', dim: 384, quant: 'int8' }
// transformers.js (env.allowRemoteModels = false, env.localModelPath = <dir>)
// resolves files under  <BRAIN_MODEL_DIR>/<EMBED.id>/ , e.g.
//     server/models/Xenova/bge-small-en-v1.5/config.json
//     server/models/Xenova/bge-small-en-v1.5/tokenizer.json
//     server/models/Xenova/bge-small-en-v1.5/tokenizer_config.json
//     server/models/Xenova/bge-small-en-v1.5/onnx/model_quantized.onnx
// so this script's default target is exactly server/models/Xenova/bge-small-en-v1.5.
//
// Node built-ins ONLY (global fetch + node:fs + node:crypto + node:path).
// NO new dependency, NO npm install. Node 18+ (global fetch) required.
//
// ---------------------------------------------------------------------------
// HOW TO RUN
// ---------------------------------------------------------------------------
//   node scripts/fetch-brain-model.mjs                 # default target dir
//   node scripts/fetch-brain-model.mjs <targetDir>     # explicit target dir
//   BRAIN_MODEL_DIR=/opt/models node scripts/fetch-brain-model.mjs
//
// Precedence for the target: CLI arg  >  env BRAIN_MODEL_DIR  >  default.
// NOTE: env BRAIN_MODEL_DIR here is used as the FULL model directory (the one
// that directly contains config.json / onnx/...), matching how the embedder
// reads it: the embedder sets env.localModelPath = BRAIN_MODEL_DIR and then
// transformers.js appends <EMBED.id>. So if you point the server at a custom
// BRAIN_MODEL_DIR=<root>, run this script with <root>/Xenova/bge-small-en-v1.5
// as the target (or pass that path as the arg). The default below already
// bakes in the <root>/Xenova/bge-small-en-v1.5 suffix.
//
// ---------------------------------------------------------------------------
// GIT / PACKAGING  (IMPORTANT)
// ---------------------------------------------------------------------------
// The model is ~30-40 MB of binary weights. DO NOT COMMIT IT TO GIT.
//   * It belongs in BRAIN_MODEL_DIR (default server/models/...) at install or
//     build time, not in the repo history.
//   * Add  server/models/  to .gitignore (it is not ignored today).
//   * For the desktop/on-prem OFFLINE build, place it as an Electron
//     extraResource and point BRAIN_MODEL_DIR at it; for the server image,
//     run this script in the Dockerfile/build step (or mount a volume) so the
//     files land before the sidecar starts and real embedding is enabled.
//
// US spelling. No em dashes.
// ---------------------------------------------------------------------------

import crypto from 'node:crypto'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, '..')

// ---------------------------------------------------------------------------
// The pin. Kept in sync with server/brain_model.js EMBED. If EMBED.id/rev
// change there, change them here too (both are a model change and force a
// re-embed). This duplication is deliberate: this script must have ZERO imports
// from server/* so it can run standalone in a build step before any install.
// ---------------------------------------------------------------------------
const MODEL_ID = 'Xenova/bge-small-en-v1.5'
const MODEL_REV = 'main'
const HF_BASE = `https://huggingface.co/${MODEL_ID}/resolve/${MODEL_REV}`

// The exact files transformers.js needs for a local feature-extraction pipeline
// with the int8 (quantized) ONNX weights. Keep this list EXACT: extra files are
// wasted bandwidth, missing files break the local load.
const MANIFEST = [
  'config.json',
  'tokenizer.json',
  'tokenizer_config.json',
  'onnx/model_quantized.onnx',
]

// ---------------------------------------------------------------------------
// KNOWN_SHA256 - PINNED per-file SHA-256 (hex, lowercase) of each manifest file.
//
//   >>> VERIFY THESE AGAINST HUGGINGFACE BEFORE TRUSTING THEM. <<<
//
// These were computed by this script on first fetch (see "pin-on-first-run"
// below). A lead MUST confirm each value against the upstream repo
//   https://huggingface.co/Xenova/bge-small-en-v1.5/tree/main
// (git LFS pointer / "Copy download link" -> the sha256 in the LFS metadata, or
// by hashing a trusted copy) and only then leave PINNED=true. Pinning a wrong
// hash will REFUSE every future download; pinning a malicious hash would defeat
// the check - so a human confirms the values, once.
//
// To (re)compute: delete/empty the target dir and run the script; it prints the
// computed sha256 for each file. Paste them here and flip PINNED to true.
// ---------------------------------------------------------------------------
const PINNED = true // set false only to re-pin after an intentional model change
const KNOWN_SHA256 = {
  // Computed by this script from the upstream HuggingFace resolve/main on
  // 2026-10-25. A LEAD must confirm these against
  //   https://huggingface.co/Xenova/bge-small-en-v1.5/tree/main
  // (LFS sha256 for the .onnx, direct hash for the small JSON) before relying
  // on them. Size shown as a sanity aid.
  'config.json': 'fa73f90bf92c8cace1fbcb709626306f2bdbc9ea3e5b5f94b440df9b6aa56350', // 683 B
  'tokenizer.json': 'd241a60d5e8f04cc1b2b3e9ef7a4921b27bf526d9f6050ab90f9267a1f9e5c66', // 694.7 KB
  'tokenizer_config.json': '9261e7d79b44c8195c1cada2b453e55b00aeb81e907a6664974b4d7776172ab3', // 366 B
  'onnx/model_quantized.onnx': '6c9c6101a956d62dfb5e7190c538226c0c5bb9cb27b651234b6df063ee7dbfe4', // 32.44 MB
}

// ---------------------------------------------------------------------------
// Target directory resolution. CLI arg > env BRAIN_MODEL_DIR > default.
// Default bakes in the <EMBED.id> suffix so the files land where the embedder
// looks: server/models/Xenova/bge-small-en-v1.5.
// ---------------------------------------------------------------------------
function resolveTargetDir() {
  const arg = process.argv[2]
  if (arg && arg.trim()) return path.resolve(arg.trim())
  if (process.env.BRAIN_MODEL_DIR && process.env.BRAIN_MODEL_DIR.trim()) {
    return path.resolve(process.env.BRAIN_MODEL_DIR.trim())
  }
  return path.join(REPO_ROOT, 'server', 'models', 'Xenova', 'bge-small-en-v1.5')
}

function sha256OfBuffer(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex')
}

function fmtBytes(n) {
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(2)} MB`
  if (n >= 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${n} B`
}

function isPinned(file) {
  const want = KNOWN_SHA256[file]
  return PINNED && typeof want === 'string' && /^[0-9a-f]{64}$/.test(want)
}

// Read an existing file and return its sha256, or null if absent/unreadable.
async function existingSha(dest) {
  try {
    const buf = await fsp.readFile(dest)
    return { sha: sha256OfBuffer(buf), size: buf.length }
  } catch {
    return null
  }
}

// Fetch a URL into a Buffer with a couple of retries for transient network
// hiccups. Throws an actionable error on a non-200 or exhausted retries.
async function fetchBuffer(url, attempts = 3) {
  let lastErr = null
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetch(url, { redirect: 'follow' })
      if (!res.ok) {
        // 401/403 on a public model usually means a bad URL or an outage; 404
        // means the file path/rev is wrong. Surface the code either way.
        throw new Error(`HTTP ${res.status} ${res.statusText}`)
      }
      const ab = await res.arrayBuffer()
      return Buffer.from(ab)
    } catch (e) {
      lastErr = e
      if (i < attempts) {
        const backoff = 500 * i
        process.stdout.write(`  retry ${i}/${attempts - 1} after ${backoff}ms (${(e && e.message) || e})\n`)
        await new Promise((r) => setTimeout(r, backoff))
      }
    }
  }
  throw new Error(`fetch failed for ${url}: ${(lastErr && lastErr.message) || lastErr}`)
}

async function main() {
  const targetDir = resolveTargetDir()
  const anyPinned = MANIFEST.some(isPinned)

  console.log('WorkCoPilot Company Brain - model fetcher')
  console.log(`  model   : ${MODEL_ID} @ ${MODEL_REV} (int8 ONNX, dim 384)`)
  console.log(`  target  : ${targetDir}`)
  console.log(`  verify  : ${anyPinned ? 'SHA-256 pinned (will refuse mismatches)' : 'PIN-ON-FIRST-RUN (hashes not yet pinned)'}`)
  console.log('')

  await fsp.mkdir(targetDir, { recursive: true })

  const computed = {} // file -> sha (for the pin-on-first-run summary)
  let fetched = 0
  let skipped = 0

  for (const file of MANIFEST) {
    const dest = path.join(targetDir, file)
    await fsp.mkdir(path.dirname(dest), { recursive: true })
    const want = isPinned(file) ? KNOWN_SHA256[file] : null

    // Idempotent: if present and (when pinned) matching, skip. If present but
    // its hash does not match a pinned value, refuse and tell the operator.
    const present = await existingSha(dest)
    if (present) {
      if (want) {
        if (present.sha === want) {
          console.log(`  [skip] ${file}  (${fmtBytes(present.size)}, verified)`)
          computed[file] = present.sha
          skipped++
          continue
        }
        throw new Error(
          `${file} already on disk but its SHA-256 does NOT match the pinned value.\n` +
            `    on disk : ${present.sha}\n` +
            `    pinned  : ${want}\n` +
            `    Refusing to use it. Delete ${dest} and re-run, or re-pin if the model changed on purpose.`,
        )
      }
      // Not pinned yet: still skip re-download if present, but record the hash.
      console.log(`  [skip] ${file}  (${fmtBytes(present.size)}, present; hash recorded for pinning)`)
      computed[file] = present.sha
      skipped++
      continue
    }

    // Download.
    const url = `${HF_BASE}/${file}`
    process.stdout.write(`  [get ] ${file}  <- ${url}\n`)
    const buf = await fetchBuffer(url)
    const sha = sha256OfBuffer(buf)

    if (want && sha !== want) {
      throw new Error(
        `${file} downloaded but SHA-256 verification FAILED.\n` +
          `    expected: ${want}\n` +
          `    got     : ${sha}\n` +
          `    Not writing the file. This can mean a corrupted download, an upstream\n` +
          `    model change, or tampering. Re-run; if it persists, confirm the pin.`,
      )
    }

    // Atomic-ish write: temp then rename so a crash mid-write never leaves a
    // half-file that the embedder would try to load.
    const tmp = `${dest}.part-${process.pid}`
    await fsp.writeFile(tmp, buf)
    await fsp.rename(tmp, dest)

    computed[file] = sha
    fetched++
    console.log(`         ${fmtBytes(buf.length)}  sha256=${sha}${want ? '  (verified)' : ''}`)
  }

  console.log('')
  if (!anyPinned) {
    // Pin-on-first-run: print a ready-to-paste KNOWN_SHA256 block.
    console.log('PIN-ON-FIRST-RUN: hashes are NOT yet pinned in this script.')
    console.log('Verify each value against https://huggingface.co/' + MODEL_ID + '/tree/main')
    console.log('then paste this block into KNOWN_SHA256 and set PINNED = true:')
    console.log('')
    console.log('const KNOWN_SHA256 = {')
    for (const file of MANIFEST) {
      console.log(`  '${file}': '${computed[file] || '__FETCH_FAILED__'}',`)
    }
    console.log('}')
    console.log('')
    console.log(`Model files are at ${targetDir} but remain UNVERIFIED until you pin.`)
    process.exitCode = 0
    return
  }

  console.log(`model ready at ${targetDir}  (${fetched} fetched, ${skipped} already present, all SHA-256 verified)`)
}

main().catch((err) => {
  console.error('')
  console.error('ERROR: ' + ((err && err.message) || err))
  console.error('')
  console.error('What to try:')
  console.error('  * Check network access to huggingface.co (proxy/offline build host?).')
  console.error('  * If a SHA mismatch: confirm the pin vs https://huggingface.co/' + MODEL_ID + '/tree/main')
  console.error('  * If HTTP 404: the file path or revision in the manifest is wrong.')
  console.error('  * Re-run - downloads are idempotent and resume per-file.')
  process.exit(1)
})
