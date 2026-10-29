// WorkCoPilot Company Brain - re-embed path (Wave 4 backend).
//
// Rebuilds a tenant's vectors under a DIFFERENT embedding model (a bigger/newer
// one from the brain_model catalog) with NO re-upload. This is possible because
// the store keeps the scrubbed chunk TEXT, not only the vectors
// (brainStore.listChunksWithText confirms it), so we read the text back, embed it
// with the target model, and swap every vector atomically.
//
// Reuses the one embedder (brain_embed.embedPassagesWith) and the one store
// (brainStore.reembed) - no parallel copy of either. The slow part (model
// inference) happens HERE, batched, with progress surfaced and an abort signal
// honored; the on-disk mutation is one ATOMIC store call at the end.
//
// Safety / honesty:
//  - All-or-nothing: the vectors are accumulated in memory and written in a single
//    atomic store.reembed. An abort or a crash mid-run leaves the OLD vectors
//    intact (never a half-swapped, mixed-dim brain). Re-running simply redoes the
//    work from the unchanged source - that is the resumability guarantee. We never
//    silently truncate: the store asserts one new vector per resident chunk.
//  - Privacy: only already-scrubbed text is read back and re-embedded. If a new
//    policy is supplied the text is re-scrubbed (which can only redact MORE) before
//    embedding, and the re-scrubbed text is re-sealed. Raw PII never reappears.
//  - AI configs never silently fail: an unknown target model, a locked brain, and
//    an empty brain each throw a STATED error.
//
// US spelling. No em dashes.

import { brainStore } from './brain_store.js'
import { resolveEmbedModel, chunkHashOf, policyVersionOf, embeddingModelVersionOf } from './brain_model.js'
import { embedPassagesWith } from './brain_embed.js'
import { scrubWithPolicy } from './work-scrub.js'

const DEFAULT_BATCH = 64
const MAX_BATCH = 512

export class ReembedError extends Error {
  constructor(code, message, status) {
    super(message)
    this.name = 'ReembedError'
    this.code = code
    this.status = status
  }
}

function clampBatch(batchSize) {
  const n = Math.trunc(Number(batchSize))
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_BATCH
  return Math.max(1, Math.min(MAX_BATCH, n))
}

// reembedTenant(companyId, { model, policy?, batchSize?, onProgress?, signal? }, deps?)
//   -> { chunks, sources, dim, model:{name,id,rev,dim}, policyVersion, batches }
//
// model     : a catalog name (e.g. 'bge-base-en-v1.5') or a { id, rev, dim } config.
// policy     : OPTIONAL. When given, each chunk's text is re-scrubbed under it and
//              the effective policy version is bumped; when omitted, the existing
//              text and policy version are preserved (only the model changes).
// onProgress : OPTIONAL ({ done, total, batches, phase }) => void, called per batch.
// signal     : OPTIONAL AbortSignal; aborting before the atomic swap leaves the
//              brain unchanged.
// deps        : { store, embed } for tests.
export async function reembedTenant(companyId, { model, policy, batchSize, onProgress, signal } = {}, deps = {}) {
  const store = deps.store || brainStore
  const embed = deps.embed || embedPassagesWith

  if (!companyId) throw new ReembedError('NO_COMPANY', 'The Company Brain is for company accounts.', 403)
  const target = resolveEmbedModel(model) // throws a stated error on an unknown model
  const batch = clampBatch(batchSize)

  // Read sources (for the existing policy version) and every chunk's scrubbed text.
  // Both go through loadTenant, which throws BRAIN_LOCKED for a locked customer
  // brain; surface that as a stated, actionable error.
  let sources
  let chunks
  try {
    sources = (await store.listSources(companyId)) || []
    chunks = (await store.listChunksWithText(companyId)) || []
  } catch (e) {
    if (e && e.code === 'BRAIN_LOCKED') {
      throw new ReembedError('BRAIN_LOCKED', 'Your Company Brain is locked. An administrator must unlock it before it can be re-embedded.', 423)
    }
    throw e
  }
  if (!chunks.length) {
    throw new ReembedError('BRAIN_EMPTY', 'Your Company Brain has no documents yet, so there is nothing to re-embed.', 409)
  }

  const existingPolicyVersion = (sources.find((s) => s && s.policyVersion) || {}).policyVersion || ''
  const rescrub = policy != null
  const effectivePolicyVersion = rescrub ? policyVersionOf(policy) : existingPolicyVersion

  const total = chunks.length
  const batches = Math.ceil(total / batch)
  const records = []
  let done = 0

  for (let i = 0; i < total; i += batch) {
    if (signal && signal.aborted) {
      throw new ReembedError('ABORTED', 'Re-embed was aborted before completion; the brain was not changed.', 409)
    }
    const slice = chunks.slice(i, i + batch)
    const texts = slice.map((c) => (rescrub ? scrubWithPolicy(String(c.text || ''), policy).clean : String(c.text || '')))
    const vectors = await embed(target, texts) // embedPassagesWith(model, texts) -> Float32Array[] at target.dim
    if (!Array.isArray(vectors) || vectors.length !== slice.length) {
      throw new ReembedError('EMBED_FAILED', 'The embedding model did not return a vector for every chunk; the brain was not changed.', 500)
    }
    slice.forEach((c, j) => {
      const clean = texts[j]
      records.push({
        chunkId: c.chunkId,
        vector: vectors[j],
        chunkHash: chunkHashOf({ modelId: target.id, rev: target.rev, policyVersion: effectivePolicyVersion, text: clean }),
        // Re-seal text only when a new policy actually re-scrubbed it.
        text: rescrub ? clean : undefined,
      })
    })
    done += slice.length
    if (typeof onProgress === 'function') {
      try { onProgress({ done, total, batches, phase: 'embed' }) } catch { /* progress is best-effort */ }
    }
  }

  // Last chance to bail out before the atomic on-disk swap.
  if (signal && signal.aborted) {
    throw new ReembedError('ABORTED', 'Re-embed was aborted before completion; the brain was not changed.', 409)
  }

  const modelVersion = embeddingModelVersionOf(target)
  const res = await store.reembed(companyId, {
    dim: target.dim,
    records,
    modelVersion,
    // Only stamp a new policy version when a new policy was applied; otherwise
    // preserve the tenant's existing one (undefined = no change in the store).
    policyVersion: rescrub ? effectivePolicyVersion : undefined,
  })

  return {
    chunks: res.chunks,
    sources: res.sources,
    dim: target.dim,
    // Neutral, standard embedding-model identifier (the same kind already in the
    // manifest). NOT the chat AI provider/model.
    model: { name: target.name, id: target.id, rev: target.rev, dim: target.dim },
    policyVersion: effectivePolicyVersion,
    batches,
  }
}

export default { reembedTenant, ReembedError }
