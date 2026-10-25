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

// The pinned embedding model. The server runs the SAME model as the desktop so
// query-time vectors live in the same space as ingested passage vectors. A
// change to any field here is a model change and forces a re-embed (new
// chunkHash), which is exactly why rev/quant are part of the chunk hash input.
export const EMBED = { id: 'Xenova/bge-small-en-v1.5', rev: 'main', dim: 384, quant: 'int8' }

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
