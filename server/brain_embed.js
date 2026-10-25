// ---------------------------------------------------------------------------
// WorkCoPilot Company Brain - server-side embedder.
// ---------------------------------------------------------------------------
// Runs the SAME pinned model as the desktop (brain_model.EMBED) so query-time
// and passage-time vectors share one space. transformers.js with the
// onnxruntime-web (WASM) backend - LOCAL ONLY, no network at runtime - is
// LAZY-LOADED (the pdf-parse / tesseract.js requireOptional pattern in
// workcopilot/main.js). This module LOADS even before the embedding packages
// are installed: the dynamic import lives inside embed calls, and a missing
// library (or env BRAIN_EMBED_FAKE=1) drops to a deterministic hash-seeded
// fallback so sibling modules are testable with no model present.
//
// SUPREME RULE XIII (SCA): nothing here runs `npm install`. The lead installs
// the SCA-vetted packages (see the report accompanying this file). Because the
// import is dynamic + guarded, this file never throws "Cannot find module" at
// load time.
//
// AI configurations never silently fail: the mode (model vs fallback) is logged
// once per process, honestly, with the reason.
//
// Contract (frozen):
//   embedPassages(texts) -> Float32Array[]  (L2-normalized, dim 384, no prefix)
//   embedQuery(text)      -> Float32Array    (prefix below, L2-normalized, 384)
//   embedderReady()       -> boolean         (real model loaded and in use)
//
// US spelling. No em dashes.
// ---------------------------------------------------------------------------
import crypto from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { EMBED } from './brain_model.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// bge query instruction. Passages are embedded with NO prefix; only the query
// gets this. Using the wrong prefix side silently halves retrieval quality, so
// it lives in exactly one place.
const QUERY_PREFIX = 'Represent this sentence for searching relevant passages:'

// Where the bundled model lives offline. The ~33 MB int8 model ships with the
// on-prem OFFLINE edition as an extraResource and is pointed at by
// BRAIN_MODEL_DIR; otherwise ./models next to the server. transformers.js then
// resolves files under <dir>/<EMBED.id>/ (e.g. models/Xenova/bge-small-en-v1.5/).
const MODEL_ROOT = process.env.BRAIN_MODEL_DIR || path.join(__dirname, 'models')

let _extractorPromise = null // in-flight / resolved model load (one per process)
let _ready = false // true only when the real model is loaded and serving
let _loggedMode = false // log the active mode exactly once

function logMode(line) {
  if (_loggedMode) return
  _loggedMode = true
  // eslint-disable-next-line no-console
  console.log(line)
}

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

// Deterministic test/fallback vector: seeded purely by the text via sha256 so
// the same string always yields the same unit vector, and different strings
// (including query-prefixed text) yield different vectors. Dim = EMBED.dim.
function deterministicVector(text) {
  const dim = EMBED.dim
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

// Lazy, guarded load of transformers.js + its WASM runtime. Returns the
// feature-extraction pipeline, or null when unavailable (caller falls back).
// Tries the current package name first, then the legacy one, so whichever the
// lead SCA-vets and installs works unchanged.
async function loadExtractor() {
  if (process.env.BRAIN_EMBED_FAKE === '1') return null // forced fallback (tests)
  if (_extractorPromise) return _extractorPromise

  _extractorPromise = (async () => {
    let mod = null
    let lastErr = null
    for (const name of ['@huggingface/transformers', '@xenova/transformers']) {
      try {
        mod = await import(name)
        break
      } catch (e) {
        lastErr = e
      }
    }
    if (!mod) {
      const reason = (lastErr && lastErr.message) || 'transformers.js not installed'
      throw new Error(reason)
    }

    const { env, pipeline } = mod
    // LOCAL ONLY - never reach out over the network at runtime.
    if (env) {
      env.allowRemoteModels = false
      if ('allowLocalModels' in env) env.allowLocalModels = true
      env.localModelPath = MODEL_ROOT
      // Pin the WASM (onnxruntime-web) backend so no native .node binary is
      // required on the deploy target. API shape differs across v2/v3, so each
      // assignment is defensive.
      try {
        if (env.backends && env.backends.onnx && env.backends.onnx.wasm) {
          // keep thread count modest; the server embeds short texts.
          if (typeof env.backends.onnx.wasm.numThreads === 'number' || env.backends.onnx.wasm.numThreads === undefined) {
            env.backends.onnx.wasm.numThreads = 1
          }
        }
      } catch { /* backend tuning is best-effort */ }
    }

    // device:'wasm' (v3) / quantized:true (v2) select the int8 WASM path.
    const extractor = await pipeline('feature-extraction', EMBED.id, {
      quantized: true,
      dtype: EMBED.quant, // 'int8' (ignored by versions that do not know it)
      device: 'wasm',
    })
    return extractor
  })()

  // Forget a failed load so a later call can retry, and never leave the promise
  // rejected-and-cached (that would wedge the fallback path too).
  const p = _extractorPromise
  p.then(
    () => { _ready = true },
    () => { if (_extractorPromise === p) _extractorPromise = null },
  )
  return p
}

// Embed with the real model. `inputs` is a string[]; returns Float32Array[].
async function modelEmbed(extractor, inputs) {
  const output = await extractor(inputs, { pooling: 'mean', normalize: true })
  // transformers.js returns a Tensor; tolist() -> number[][] (one row / input).
  const rows = typeof output.tolist === 'function' ? output.tolist() : output
  return rows.map((row) => l2normalize(Float32Array.from(row)))
}

// Resolve [vectors] for a batch of ALREADY-PREFIXED inputs, honestly logging
// which mode served them. Any model failure degrades to the deterministic
// fallback with a stated reason rather than throwing.
async function embedInputs(inputs) {
  let extractor = null
  if (process.env.BRAIN_EMBED_FAKE !== '1') {
    try {
      extractor = await loadExtractor()
    } catch (e) {
      logMode(`[brain] embeddings: deterministic-fallback (model unavailable: ${(e && e.message) || e})`)
      _ready = false
    }
  }

  if (extractor) {
    try {
      const vectors = await modelEmbed(extractor, inputs)
      logMode(`[brain] embeddings: model (${EMBED.id} ${EMBED.quant}, local WASM)`)
      return vectors
    } catch (e) {
      // Model loaded but inference failed: state it, then fall back.
      _ready = false
      logMode(`[brain] embeddings: deterministic-fallback (inference failed: ${(e && e.message) || e})`)
    }
  } else if (process.env.BRAIN_EMBED_FAKE === '1') {
    logMode('[brain] embeddings: deterministic-fallback (BRAIN_EMBED_FAKE=1)')
    _ready = false
  }

  return inputs.map((t) => deterministicVector(t))
}

// embedPassages: passage side, NO query prefix. Returns one L2-normalized
// Float32Array (dim 384) per input, in order.
export async function embedPassages(texts) {
  const arr = Array.isArray(texts) ? texts : [texts]
  const inputs = arr.map((t) => String(t === null || t === undefined ? '' : t))
  if (inputs.length === 0) return []
  return embedInputs(inputs)
}

// embedQuery: query side, WITH the bge search prefix. Returns one L2-normalized
// Float32Array (dim 384).
export async function embedQuery(text) {
  const input = QUERY_PREFIX + ' ' + String(text === null || text === undefined ? '' : text)
  const [vec] = await embedInputs([input])
  return vec
}

// embedderReady: true only when the real model is loaded and serving (fallback
// mode reports false, so callers can surface a stated degradation honestly).
export function embedderReady() {
  return _ready === true
}
