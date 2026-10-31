// ---------------------------------------------------------------------------
// WorkCoPilot Company Brain - shared constants + deterministic helpers.
// ---------------------------------------------------------------------------
// Pure, dependency-free (node:crypto only). This is the SINGLE SOURCE OF TRUTH
// for the embedding model pin, the shared tokenizer, and the content/chunk
// hashing used across every brain module (ingest, store, retrieve, embed).
// Nothing here does I/O, nothing here is random: same input -> same output,
// forever, so chunk identity is stable across processes and machines.
//
// US spelling. No em dashes.
// ---------------------------------------------------------------------------
import crypto from 'node:crypto'

// bge query instruction. Passages are embedded with NO prefix; only the QUERY
// gets this. Using the wrong prefix side silently halves retrieval quality, so
// it lives in exactly one place and is carried on each model so a non-bge model
// added later can declare its own (single source of truth for the prefix too).
export const BGE_QUERY_PREFIX = 'Represent this sentence for searching relevant passages:'

// ---------------------------------------------------------------------------
// Embedding-model catalog (THE single source of truth for every embedding model
// the brain can use). The default pin is `bge-small-en-v1.5`; the larger entries
// exist so a tenant's vectors can be REBUILT by a bigger/newer model without any
// re-upload (see brain_reembed.js), because the store keeps the scrubbed chunk
// text, not only the vectors. All entries are the standard, open bge family, so
// the one bge query prefix above is valid for every one of them.
//
// These ids/dims are NEUTRAL, STANDARD embedding-model identifiers (the same kind
// already surfaced in the sync manifest for portability). They are NOT the chat
// AI provider/model and must never be conflated with it.
//
// A change to any field of an entry is a MODEL change: it forces a re-embed (the
// chunkHash binds modelId + rev + policy), so a stale vector is never served
// against a new model.
// ---------------------------------------------------------------------------
export const EMBED_MODELS = {
  'bge-small-en-v1.5': { name: 'bge-small-en-v1.5', id: 'Xenova/bge-small-en-v1.5', rev: 'main', dim: 384, quant: 'int8', queryPrefix: BGE_QUERY_PREFIX },
  'bge-base-en-v1.5': { name: 'bge-base-en-v1.5', id: 'Xenova/bge-base-en-v1.5', rev: 'main', dim: 768, quant: 'int8', queryPrefix: BGE_QUERY_PREFIX },
  'bge-large-en-v1.5': { name: 'bge-large-en-v1.5', id: 'Xenova/bge-large-en-v1.5', rev: 'main', dim: 1024, quant: 'int8', queryPrefix: BGE_QUERY_PREFIX },
}

// The DEFAULT pinned model. Its FIELDS are derived from the catalog (one copy of
// the values), but EMBED is deliberately the canonical 4-field public pin
// { id, rev, dim, quant } - the frozen shape the desktop and the sync manifest
// rely on. The catalog entries additionally carry `name` + `queryPrefix` for
// internal use; those never leak into EMBED or the manifest model.
export const DEFAULT_EMBED_MODEL = 'bge-small-en-v1.5'
const _defaultModel = EMBED_MODELS[DEFAULT_EMBED_MODEL]
export const EMBED = { id: _defaultModel.id, rev: _defaultModel.rev, dim: _defaultModel.dim, quant: _defaultModel.quant }

// publicEmbedModel(model): normalize any model (catalog entry or EMBED) down to
// the canonical 4-field public shape, so the manifest model contract is identical
// whatever the tenant's actual model is.
export function publicEmbedModel(model) {
  const m = model || EMBED
  return { id: m.id, rev: m.rev, dim: m.dim, quant: m.quant }
}

// resolveEmbedModel(nameOrConfig) -> a catalog model config. A string must name a
// catalog entry; an unknown name THROWS (AI configs never silently fail - a
// re-embed under an unknown model is an error, never a silent default). A config
// object is accepted only when it already carries the required fields.
export function resolveEmbedModel(nameOrConfig) {
  if (nameOrConfig && typeof nameOrConfig === 'object') {
    const { id, rev, dim } = nameOrConfig
    if (!id || !rev || !(Number.isInteger(dim) && dim > 0)) {
      throw new Error('[brain_model] embedding model config needs { id, rev, dim>0 }')
    }
    return { quant: 'int8', queryPrefix: BGE_QUERY_PREFIX, name: String(id), ...nameOrConfig }
  }
  const key = String(nameOrConfig == null ? '' : nameOrConfig)
  const m = EMBED_MODELS[key]
  if (!m) {
    throw new Error(`[brain_model] unknown embedding model '${key}'. Known: ${Object.keys(EMBED_MODELS).join(', ')}`)
  }
  return m
}

// embeddingModelVersion string <-> model, so a tenant's pinned model (stored on
// each SourceRow as `${id}@${rev}`) can be resolved back to its catalog config
// (and its dim + query prefix) at retrieval time. Returns null when the version
// is absent or not a known catalog entry (the caller falls back to EMBED).
export function embeddingModelVersionOf(model) {
  const m = model || EMBED
  return `${m.id}@${m.rev}`
}
export function resolveEmbedModelByVersion(version) {
  const v = String(version == null ? '' : version)
  if (!v) return null
  for (const m of Object.values(EMBED_MODELS)) {
    if (embeddingModelVersionOf(m) === v) return m
  }
  return null
}

// THE rule for which embedding model a tenant is on right now: the pinned version
// recorded on its ACTIVE sources (a re-embed stamps every source that holds chunks;
// a deleted source holds none and may still carry an older version), resolved to
// its catalog config; the default EMBED when none is recorded (legacy tenants).
// Retrieval, the sync manifest and the export all read this one function, so the
// model they report can never disagree. Pass the tenant's full source list, never
// a filtered page of it.
export function activeEmbedModel(sources) {
  const row = (Array.isArray(sources) ? sources : []).find((s) => s && s.status === 'active' && s.embeddingModelVersion)
  return resolveEmbedModelByVersion(row && row.embeddingModelVersion) || EMBED
}

function sha256Hex(str) {
  return crypto.createHash('sha256').update(String(str), 'utf8').digest('hex')
}

// normalizeText: the canonical text form every hash is taken over, so two
// copies of the same document that differ only in line endings or trailing
// whitespace hash identically (dedupe never duplicates - manifest decision 8).
//   1. CRLF (and lone CR) -> LF
//   2. strip per-line trailing whitespace
//   3. collapse 3+ consecutive blank lines down to a single blank line
//      (a "blank line" is an empty line; 3 blank lines == 4 newlines, so we
//       reduce a run of 4+ newlines to 2 -> one blank line between content)
//   4. trim leading/trailing whitespace of the whole string
export function normalizeText(t) {
  if (t === null || t === undefined) return ''
  let s = String(t)
  s = s.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  s = s.replace(/[ \t]+$/gm, '')
  s = s.replace(/\n{4,}/g, '\n\n')
  return s.trim()
}

// THE shared tokenizer. Every keyword/BM25 arm MUST use this exact function so
// index-time and query-time token sets are built the same way. Do not inline a
// private copy anywhere (single source of truth).
export function tokenize(t) {
  if (t === null || t === undefined) return []
  return String(t).toLowerCase().split(/[^a-z0-9]+/).filter((x) => x.length > 2)
}

// Document identity: sha256 over the normalized text. Same doc in two places,
// or 50 users with the same SOP, hash to one contentHash and are processed once.
export function contentHashOf(text) {
  return sha256Hex(normalizeText(text))
}

// Chunk identity: binds the normalized chunk text to the model (id@rev), the
// quantization-independent model revision, and the effective scrub policy.
// Any of those changing yields a new chunkHash -> a partial re-embed, never a
// stale vector served against a new model or policy.
export function chunkHashOf({ modelId, rev, policyVersion, text }) {
  const mid = modelId === null || modelId === undefined ? '' : String(modelId)
  const r = rev === null || rev === undefined ? '' : String(rev)
  const pv = policyVersion === null || policyVersion === undefined ? '' : String(policyVersion)
  return sha256Hex(`${mid}@${r}|${pv}|` + normalizeText(text))
}

// Stable JSON: object keys sorted recursively so logically-equal policy objects
// serialize identically regardless of key insertion order. Arrays keep order.
function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']'
  const keys = Object.keys(value).sort()
  const parts = []
  for (const k of keys) {
    const v = value[k]
    if (v === undefined) continue // match JSON.stringify: skip undefined members
    parts.push(JSON.stringify(k) + ':' + stableStringify(v))
  }
  return '{' + parts.join(',') + '}'
}

// policyVersionOf: a short, stable fingerprint of the effective scrub policy.
// '' when there is no policy (null/undefined/empty object) so an unscrubbed
// corpus has an explicit, honest empty version rather than a fake one.
export function policyVersionOf(policy) {
  if (policy === null || policy === undefined) return ''
  if (typeof policy === 'object' && !Array.isArray(policy) && Object.keys(policy).length === 0) return ''
  return sha256Hex(stableStringify(policy)).slice(0, 12)
}
