// ---------------------------------------------------------------------------
// WorkCoPilot Company Brain - DEVICE embedder (desktop / Electron main side).
// ---------------------------------------------------------------------------
// Runs the SAME pinned model as the server (brain_model.EMBED) so the vectors
// this device uploads live in the exact space the server queries. On the device
// we are a packaged, per-platform Electron app, so we are allowed native deps:
// real embedding runs through transformers.js on the onnxruntime-NODE backend
// (native .node binary), LOCAL ONLY (no network at runtime). Inference runs in a
// worker_thread so a batch never blocks the main-process IPC (the overlay, the
// pause/save signal, the window controls all stay responsive while we embed).
//
// Single source of truth: the model pin is IMPORTED from ../server/brain_model.js
// (the one dependency-free module the server and the device share). We never copy
// the pin. The L2-normalize math and the deterministic fallback below are kept
// byte-for-byte identical to server/brain_embed.js so a device vector and a
// server vector for the same text are the same vector; that function is not
// exported by the server module, so it cannot be imported and is mirrored here
// with this citation (lead: hoisting it into brain_model.js would remove this
// one mirror - see the Phase 1b report).
//
// AI configurations never silently fail: the active mode (model vs
// deterministic-fallback vs forced-fake) is logged ONCE per process, honestly,
// with the reason. embedderReady()/embedMode() let the uploader REFUSE to upload
// fallback vectors into the shared corpus (never degrade the brain silently).
//
// SUPREME RULE XIII (SCA): nothing here runs `npm install`. The lead installs the
// SCA-vetted native packages (see the Phase 1b report). The transformers import
// is dynamic + guarded inside the worker, so this module LOADS even before those
// packages are installed.
//
// Contract (frozen, device side): embedPassages(texts) -> Float32Array[]
//   (L2-normalized, dim = EMBED.dim = 384, NO query prefix).
//
// US spelling. No em dashes. CommonJS (the workcopilot package is CommonJS; this
// module is loaded by main.js via require()).
// ---------------------------------------------------------------------------
'use strict'

const crypto = require('node:crypto')
const path = require('node:path')

// ---------------------------------------------------------------------------
// The pinned model - imported, never duplicated. brain_model.js is ESM; this is
// a CommonJS module, so we reach it through a cached dynamic import(). It is
// dependency-free (node:crypto only), so pulling it onto the device adds no
// server storage or tenant-crypto code (those stay server-only, by design).
// ---------------------------------------------------------------------------
let _pinPromise = null
function getEmbedPin() {
  if (!_pinPromise) {
    _pinPromise = import('../server/brain_model.js').then((m) => m.EMBED)
  }
  return _pinPromise
}

// Where the bundled model lives offline. The int8 model ships with the desktop
// app as an extraResource and is pointed at by BRAIN_MODEL_DIR; otherwise
// ./models next to this file. transformers.js then resolves files under
// <dir>/<EMBED.id>/ (e.g. models/Xenova/bge-small-en-v1.5/). Never remote.
const MODEL_ROOT = process.env.BRAIN_MODEL_DIR || path.join(__dirname, 'models')

let _mode = 'unknown' // 'model' | 'fake' | 'fallback' | 'unknown'
let _loggedMode = false
let _ready = false

function logMode(mode, line) {
  _mode = mode
  _ready = mode === 'model'
  if (_loggedMode) return
  _loggedMode = true
  // eslint-disable-next-line no-console
  console.log(line)
}

// L2-normalize - identical to server/brain_embed.js (a zero vector stays zero).
function l2normalize(vec) {
  let sum = 0
  for (let i = 0; i < vec.length; i++) sum += vec[i] * vec[i]
  const norm = Math.sqrt(sum)
  const out = new Float32Array(vec.length)
  if (norm > 0) {
    for (let i = 0; i < vec.length; i++) out[i] = vec[i] / norm
  }
  return out
}

// Deterministic test/fallback vector - byte-for-byte identical to
// server/brain_embed.js deterministicVector(), so device-fake == server-fake for
// the same text (sibling modules and tests line up across the wire). Seeded only
// by the text via sha256: same string -> same unit vector, forever.
function deterministicVector(text, dim) {
  const out = new Float32Array(dim)
  let i = 0
  let counter = 0
  const seed = String(text === null || text === undefined ? '' : text)
  while (i < dim) {
    const h = crypto.createHash('sha256').update(counter + '|' + seed, 'utf8').digest()
    for (let b = 0; b + 4 <= h.length && i < dim; b += 4) {
      const u = h.readUInt32LE(b)
      out[i++] = (u / 0xffffffff) * 2 - 1 // map 32-bit word into [-1, 1)
    }
    counter++
  }
  return l2normalize(out)
}

// ---------------------------------------------------------------------------
// The inference worker. Kept as an inline source string so this is one file with
// no sibling to package. It runs the real transformers.js pipeline on the
// onnxruntime-node backend, LOCAL ONLY. The worker is lazy-loaded and guarded:
// a missing native package (not yet SCA-installed) rejects the load, the main
// thread logs the honest reason and the caller decides (the uploader refuses to
// upload fallback vectors; tests force BRAIN_EMBED_FAKE=1 and never spawn this).
// ---------------------------------------------------------------------------
const WORKER_SOURCE = `
'use strict'
const { parentPort, workerData } = require('node:worker_threads')
const EMBED = workerData.embed
const MODEL_ROOT = workerData.modelRoot

let extractorPromise = null
async function loadExtractor() {
  if (extractorPromise) return extractorPromise
  extractorPromise = (async () => {
    let mod = null
    let lastErr = null
    // Try the current package name first, then the legacy one, so whichever the
    // lead SCA-vets and installs works unchanged.
    for (const name of ['@huggingface/transformers', '@xenova/transformers']) {
      try { mod = await import(name); break } catch (e) { lastErr = e }
    }
    if (!mod) throw new Error((lastErr && lastErr.message) || 'transformers.js not installed')
    const { env, pipeline } = mod
    if (env) {
      // LOCAL ONLY - never reach out over the network at runtime.
      env.allowRemoteModels = false
      if ('allowLocalModels' in env) env.allowLocalModels = true
      env.localModelPath = MODEL_ROOT
      // Pin the native onnxruntime-node backend (device is a packaged app).
      try { if (env.backends && env.backends.onnx) { /* onnxruntime-node is auto-selected in Node */ } } catch (e) { /* best-effort */ }
    }
    return pipeline('feature-extraction', EMBED.id, {
      quantized: true,
      dtype: EMBED.quant, // 'int8'
      device: 'cpu',      // onnxruntime-node (native) in the Node/Electron worker
    })
  })()
  const p = extractorPromise
  p.catch(() => { if (extractorPromise === p) extractorPromise = null }) // allow retry
  return p
}

function l2(vec) {
  let s = 0
  for (let i = 0; i < vec.length; i++) s += vec[i] * vec[i]
  const n = Math.sqrt(s)
  const out = new Float32Array(vec.length)
  if (n > 0) for (let i = 0; i < vec.length; i++) out[i] = vec[i] / n
  return out
}

parentPort.on('message', async (job) => {
  try {
    const extractor = await loadExtractor()
    const output = await extractor(job.texts, { pooling: 'mean', normalize: true })
    const rows = typeof output.tolist === 'function' ? output.tolist() : output
    const vectors = rows.map((row) => l2(Float32Array.from(row)))
    const transfer = vectors.map((v) => v.buffer)
    parentPort.postMessage({ id: job.id, vectors }, transfer)
  } catch (e) {
    parentPort.postMessage({ id: job.id, error: (e && e.message) || String(e) })
  }
})
`

let _worker = null
let _jobSeq = 0
const _pending = new Map()

function ensureWorker(pin) {
  if (_worker) return _worker
  const { Worker } = require('node:worker_threads')
  _worker = new Worker(WORKER_SOURCE, { eval: true, workerData: { embed: pin, modelRoot: MODEL_ROOT } })
  _worker.on('message', (msg) => {
    const entry = _pending.get(msg.id)
    if (!entry) return
    _pending.delete(msg.id)
    if (msg.error) entry.reject(new Error(msg.error))
    else entry.resolve(msg.vectors.map((v) => (v instanceof Float32Array ? v : Float32Array.from(v))))
  })
  _worker.on('error', (err) => {
    for (const entry of _pending.values()) entry.reject(err)
    _pending.clear()
    _worker = null // terminated/forgotten; next call starts clean
  })
  _worker.on('exit', () => {
    for (const entry of _pending.values()) entry.reject(new Error('embed worker exited'))
    _pending.clear()
    _worker = null
  })
  return _worker
}

function runOnWorker(pin, texts) {
  const worker = ensureWorker(pin)
  const id = ++_jobSeq
  return new Promise((resolve, reject) => {
    _pending.set(id, { resolve, reject })
    worker.postMessage({ id, texts })
  })
}

// ---------------------------------------------------------------------------
// embedPassages: passage side, NO query prefix. Returns one L2-normalized
// Float32Array (dim 384) per input, in order. Honest mode log, never silent.
// ---------------------------------------------------------------------------
async function embedPassages(texts) {
  const arr = Array.isArray(texts) ? texts : [texts]
  const inputs = arr.map((t) => String(t === null || t === undefined ? '' : t))
  if (inputs.length === 0) return []
  const pin = await getEmbedPin()

  if (process.env.BRAIN_EMBED_FAKE === '1') {
    logMode('fake', '[brain] device embeddings: deterministic-fallback (BRAIN_EMBED_FAKE=1)')
    return inputs.map((t) => deterministicVector(t, pin.dim))
  }

  try {
    const vectors = await runOnWorker(pin, inputs)
    logMode('model', `[brain] device embeddings: model (${pin.id} ${pin.quant}, local onnxruntime-node worker)`)
    return vectors
  } catch (e) {
    // Parity with the server: degrade to the deterministic vector, LOUDLY. The
    // uploader reads embedMode()/embedderReady() and refuses to push these into
    // the shared corpus, so a degraded embedder never silently poisons the brain.
    logMode('fallback', `[brain] device embeddings: deterministic-fallback (model unavailable: ${(e && e.message) || e})`)
    return inputs.map((t) => deterministicVector(t, pin.dim))
  }
}

// embedderReady: true ONLY when the real model served the last batch. Fallback
// and forced-fake report false so callers can surface a stated degradation.
function embedderReady() {
  return _ready === true
}

// embedMode: the honest current mode for the uploader's upload gate.
function embedMode() {
  return _mode
}

// Terminate the worker (app shutdown). Safe to call when none was started.
async function shutdownEmbedder() {
  const w = _worker
  _worker = null
  for (const entry of _pending.values()) entry.reject(new Error('embedder shut down'))
  _pending.clear()
  if (w) { try { await w.terminate() } catch { /* ignore */ } }
}

module.exports = { embedPassages, embedderReady, embedMode, shutdownEmbedder }
