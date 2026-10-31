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
import { EMBED, BGE_QUERY_PREFIX, resolveEmbedModel } from './brain_model.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The query instruction is carried on the MODEL now (brain_model), so a model
// added later can declare its own. Passages are embedded with NO prefix; only
// the query gets the model's prefix. Kept as a local default for the rare model
// config that omits one.
const DEFAULT_QUERY_PREFIX = BGE_QUERY_PREFIX

// Where the bundled model lives offline. The ~33 MB int8 model ships with the
// on-prem OFFLINE edition as an extraResource and is pointed at by
// BRAIN_MODEL_DIR; otherwise ./models next to the server. transformers.js then
// resolves files under <dir>/<EMBED.id>/ (e.g. models/Xenova/bge-small-en-v1.5/).
const MODEL_ROOT = process.env.BRAIN_MODEL_DIR || path.join(__dirname, 'models')

// Model loads + readiness are keyed by model id, so the DEFAULT model and an
// alternate re-embed model never clobber each other's state. The default model
// id is EMBED.id; its readiness is what embedderReady()/embedderStatus() report
// (that is the one the product surfaces).
const _extractorPromises = new Map() // modelId -> in-flight / resolved load
const _readyByModel = new Map()      // modelId -> true only when real model serving
const _loggedModes = new Set()       // modelId values whose mode was already logged

function logMode(modelId, line) {
  if (_loggedModes.has(modelId)) return
  _loggedModes.add(modelId)
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
// (including query-prefixed text) yield different vectors. Dim is the active
// model's dim (defaults to EMBED.dim) so a fallback vector always matches the
// store geometry the real model would have produced.
function deterministicVector(text, dim = EMBED.dim) {
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

// Lazy, guarded load of transformers.js + its WASM runtime for a GIVEN model.
// Returns the feature-extraction pipeline, or null when unavailable (caller
// falls back). Tries the current package name first, then the legacy one, so
// whichever the lead SCA-vets and installs works unchanged. One load per model
// id per process.
async function loadExtractor(model) {
  if (process.env.BRAIN_EMBED_FAKE === '1') return null // forced fallback (tests)
  const cached = _extractorPromises.get(model.id)
  if (cached) return cached

  const promise = (async () => {
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
    const extractor = await pipeline('feature-extraction', model.id, {
      quantized: true,
      dtype: model.quant, // 'int8' (ignored by versions that do not know it)
      device: 'wasm',
    })
    return extractor
  })()

  _extractorPromises.set(model.id, promise)
  // Forget a failed load so a later call can retry, and never leave the promise
  // rejected-and-cached (that would wedge the fallback path too).
  promise.then(
    () => { _readyByModel.set(model.id, true) },
    () => { if (_extractorPromises.get(model.id) === promise) _extractorPromises.delete(model.id) },
  )
  return promise
}

// Embed with the real model. `inputs` is a string[]; returns Float32Array[].
async function modelEmbed(extractor, inputs) {
  const output = await extractor(inputs, { pooling: 'mean', normalize: true })
  // transformers.js returns a Tensor; tolist() -> number[][] (one row / input).
  const rows = typeof output.tolist === 'function' ? output.tolist() : output
  return rows.map((row) => l2normalize(Float32Array.from(row)))
}

// Resolve [vectors] for a batch of ALREADY-PREFIXED inputs under `model`,
// honestly logging which mode served them. Any model failure degrades to the
// deterministic fallback (at the MODEL's dim) with a stated reason rather than
// throwing.
async function embedInputs(inputs, model) {
  let extractor = null
  if (process.env.BRAIN_EMBED_FAKE !== '1') {
    try {
      extractor = await loadExtractor(model)
    } catch (e) {
      logMode(model.id, `[brain] embeddings[${model.id}]: deterministic-fallback (model unavailable: ${(e && e.message) || e})`)
      _readyByModel.set(model.id, false)
    }
  }

  if (extractor) {
    try {
      const vectors = await modelEmbed(extractor, inputs)
      logMode(model.id, `[brain] embeddings[${model.id}]: model (${model.quant}, local WASM)`)
      return vectors
    } catch (e) {
      // Model loaded but inference failed: state it, then fall back.
      _readyByModel.set(model.id, false)
      logMode(model.id, `[brain] embeddings[${model.id}]: deterministic-fallback (inference failed: ${(e && e.message) || e})`)
    }
  } else if (process.env.BRAIN_EMBED_FAKE === '1') {
    logMode(model.id, `[brain] embeddings[${model.id}]: deterministic-fallback (BRAIN_EMBED_FAKE=1)`)
    _readyByModel.set(model.id, false)
  }

  return inputs.map((t) => deterministicVector(t, model.dim))
}

// embedPassagesWith: passage side under an explicit model (NO query prefix).
// Returns one L2-normalized Float32Array (model.dim) per input, in order.
export async function embedPassagesWith(modelLike, texts) {
  const model = resolveEmbedModel(modelLike)
  const arr = Array.isArray(texts) ? texts : [texts]
  const inputs = arr.map((t) => String(t === null || t === undefined ? '' : t))
  if (inputs.length === 0) return []
  return embedInputs(inputs, model)
}

// embedQueryWith: query side under an explicit model (WITH that model's search
// prefix). Returns one L2-normalized Float32Array (model.dim).
export async function embedQueryWith(modelLike, text) {
  const model = resolveEmbedModel(modelLike)
  const prefix = model.queryPrefix || DEFAULT_QUERY_PREFIX
  const input = prefix + ' ' + String(text === null || text === undefined ? '' : text)
  const [vec] = await embedInputs([input], model)
  return vec
}

// embedPassages / embedQuery: the DEFAULT-model path, unchanged in behavior.
// Thin wrappers over the *With variants so there is one embed implementation.
export async function embedPassages(texts) {
  return embedPassagesWith(EMBED, texts)
}
export async function embedQuery(text) {
  return embedQueryWith(EMBED, text)
}

// embedderReady: true only when the real DEFAULT model is loaded and serving
// (fallback mode reports false, so callers can surface a stated degradation
// honestly). embedderReadyFor(model) answers the same for a specific model.
export function embedderReady() {
  return _readyByModel.get(EMBED.id) === true
}
export function embedderReadyFor(modelLike) {
  const model = resolveEmbedModel(modelLike)
  return _readyByModel.get(model.id) === true
}

// embedderStatus: the same readiness as a small status object for callers that
// want to surface the mode honestly (never silently degrade). `mode` is
// 'model' when the real embedder is serving, 'fallback' when dense vectors are
// the deterministic hash placeholder (keyword-only retrieval). Deliberately
// carries NO model id / provider name - callers that surface this to product
// UIs must expose only the boolean + a generic note (business rule), so the
// identity of EMBED.id never leaks through this accessor.
export function embedderStatus() {
  const ready = _readyByModel.get(EMBED.id) === true
  return { ready, mode: ready ? 'model' : 'fallback' }
}
