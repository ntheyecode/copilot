// server/brain_store.js - Company Brain vector store (Agent B-2)
//
// Pure-JS brute-force cosine VectorBrainAdapter. One instance: `brainStore`.
// Per-tenant ENCRYPTED files under BRAIN_DIR = path.join(DATA_DIR,'brain',companyId)
// with DATA_DIR from data_dir.js (WORK_DATA_DIR, else <server>/data).
//
// Design (why this layout):
//   The retrieval hot path scores every chunk vector with a dot product (vectors
//   are L2-normalized dim-384, so cosine == dot). Keeping all vectors resident as
//   one Float32Array makes that a tight loop with no per-chunk decrypt. Chunk TEXT
//   is the opposite: large, cold, and only needed for the handful of hits we
//   actually return. So the on-disk tenant state is split into three sealed blobs:
//
//     index.sealed    sealed JSON: manifest (SourceRow[]) + tombstones + per-chunk
//                     metadata (chunkId, sourceId, sourceTitle, ordinal, contentHash,
//                     chunkHash). Opened once when the tenant becomes hot. No text,
//                     no vectors inside, so it is small.
//     vectors.sealed  sealed little-endian float32 bytes for every chunk vector, in
//                     the same order as index.chunks. Decrypted once on hot-load into
//                     a single resident Float32Array for scoring.
//     texts.sealed    sealed JSON map { chunkId: base64(perChunkSealedTextBytes) }.
//                     The OUTER map is sealed so no plaintext structure sits at rest;
//                     each VALUE is additionally sealed per-chunk so that, at query
//                     time, only the returned top-K chunk texts are ever decrypted to
//                     plaintext. Text is never kept resident.
//
//   LRU working set (default 8 tenants, env BRAIN_LRU_TENANTS): a hot tenant keeps
//   metadata + the resident vector Float32Array + the (still-sealed) per-chunk text
//   ciphertext map. Evicting a tenant drops all of that from memory.
//
//   Crypto is the ONLY I/O boundary: every byte written/read goes through
//   brain_crypto's encryptForTenant/decryptForTenant/encryptVectorForTenant/
//   decryptVectorForTenant. A decrypt failure THROWS and is never swallowed into an
//   empty corpus - a tenant with data on disk either decrypts or the call fails loudly.
//
// US spelling, no silent fallback.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  encryptForTenant,
  decryptForTenant,
  encryptVectorForTenant,
  decryptVectorForTenant,
  ensureTenantDek,
  isUnlocked,
} from './brain_crypto.js'
import { activeEmbedModel, publicEmbedModel } from './brain_model.js'
import { resolveDataDir } from './data_dir.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Same resolver as store.js (data_dir.js): WORK_DATA_DIR relocates all on-disk state.
const DATA_DIR = resolveDataDir()
const BRAIN_ROOT = path.join(DATA_DIR, 'brain')

// Default embedding geometry (bge-small-en-v1.5): dim 384, L2-normalized, so
// cosine similarity reduces to a dot product. A tenant's ACTUAL dim is stored in
// its manifest and carried on the resident entry (`resident.dim`), so a tenant
// re-embedded by a larger/newer model (dim 768, 1024, ...) loads, scores, and
// persists at its own geometry. DEFAULT_DIM is used only to seed a brand-new or
// empty tenant, and as the geometry a fresh first upsert adopts. Kept local so
// this module stays self-contained (no import of brain_model for the hot path).
const DEFAULT_DIM = 384
const INDEX_VERSION = 1

const LRU_LIMIT = (() => {
  const raw = Number(process.env.BRAIN_LRU_TENANTS)
  return Number.isInteger(raw) && raw > 0 ? raw : 8
})()

const INDEX_FILE = 'index.sealed'
const VECTORS_FILE = 'vectors.sealed'
const TEXTS_FILE = 'texts.sealed'

// ---- DEK accessor injection ------------------------------------------------
// The lead wires these from the company record (store.js) at boot. We refuse to
// touch disk until they are present: no silent fallback to an unkeyed state.
let _getWrappedDek = null
let _setWrappedDek = null
let _getCustody = null   // optional: companyId -> 'platform' | 'customer'

export function configureBrainStore({ getWrappedDek, setWrappedDek, getCustody }) {
  if (typeof getWrappedDek !== 'function' || typeof setWrappedDek !== 'function') {
    throw new Error('[brain_store] configureBrainStore requires getWrappedDek + setWrappedDek functions')
  }
  _getWrappedDek = getWrappedDek
  _setWrappedDek = setWrappedDek
  _getCustody = typeof getCustody === 'function' ? getCustody : null
}

function assertConfigured() {
  if (!_getWrappedDek || !_setWrappedDek) {
    throw new Error('[brain_store] not configured: call configureBrainStore({ getWrappedDek, setWrappedDek }) before use')
  }
}

// Prime the tenant DEK in brain_crypto's cache before any encrypt/decrypt for this
// tenant. ensureTenantDek mints a fresh DEK when the company has none yet; when it
// does, we persist the new wrappedDek back through the injected accessor so the key
// survives a restart (never a transient in-memory-only DEK).
function primeTenant(companyId) {
  assertConfigured()
  // Customer-held custody: the DEK is wrapped under the customer key, which the platform
  // KEK cannot open. It must already be UNLOCKED (resident) via brain_crypto.unlock*. If not,
  // the tenant is LOCKED - throw a stated error (never auto-mint/auto-unwrap under the KEK,
  // which would either fail or silently create a second, platform-held DEK).
  if (_getCustody && _getCustody(companyId) === 'customer') {
    if (!isUnlocked(companyId)) {
      const err = new Error('Company Brain is locked (encrypted under your key); unlock it to continue')
      err.code = 'BRAIN_LOCKED'
      throw err
    }
    return { dekId: null }   // the resident DEK is used by encrypt/decrypt
  }
  const existing = _getWrappedDek(companyId) || undefined
  const res = ensureTenantDek(companyId, existing)
  if (res && res.wrappedDek && res.wrappedDek !== existing) {
    _setWrappedDek(companyId, res.wrappedDek)
  }
  return res
}

// ---- atomic write (mirrors store.js persist(): temp + fsync + preserve
//      owner/mode + rename) --------------------------------------------------
function writeBlobAtomic(filePath, buf) {
  const tmp = filePath + '.tmp'
  const fd = fs.openSync(tmp, 'w', 0o600)
  try {
    fs.writeSync(fd, buf)
    fs.fsyncSync(fd)
  } finally {
    fs.closeSync(fd)
  }
  try {
    if (fs.existsSync(filePath)) {
      const st = fs.statSync(filePath)
      fs.chownSync(tmp, st.uid, st.gid)
      fs.chmodSync(tmp, st.mode & 0o777)
    }
  } catch { /* non-root same-user writes keep ownership anyway */ }
  fs.renameSync(tmp, filePath)
}

function brainDir(companyId) {
  return path.join(BRAIN_ROOT, String(companyId))
}

function ensureBrainDir(companyId) {
  const dir = brainDir(companyId)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return dir
}

// ---- resident working set (LRU) -------------------------------------------
// resident entry: {
//   sources:    Map<sourceId, SourceRow>
//   tombstones: Tombstone[]
//   chunks:     ChunkMeta[]   (parallel to vectors; {chunkId,sourceId,sourceTitle,ordinal,contentHash,chunkHash})
//   byId:       Map<chunkId, index into chunks>
//   dim:        number        (this tenant's embedding dimension)
//   vectors:    Float32Array  (chunks.length * dim, chunk i at [i*dim, (i+1)*dim))
//   sealedText: Map<chunkId, Buffer>  (per-chunk ciphertext; decrypted only for returned hits)
// }
const _lru = new Map()

function touch(companyId) {
  const key = String(companyId)
  if (_lru.has(key)) {
    const v = _lru.get(key)
    _lru.delete(key)
    _lru.set(key, v)
    return v
  }
  return null
}

function evictIfNeeded() {
  while (_lru.size > LRU_LIMIT) {
    const oldest = _lru.keys().next().value
    _lru.delete(oldest)
  }
}

function emptyResident() {
  return {
    sources: new Map(),
    tombstones: [],
    chunks: [],
    byId: new Map(),
    dim: DEFAULT_DIM,
    vectors: new Float32Array(0),
    sealedText: new Map(),
  }
}

// Load a tenant into the resident set (or return it if already hot). Missing files
// mean "no brain yet" and yield an empty resident set - that is NOT a decrypt
// failure. A present-but-undecryptable blob throws (never served as empty).
function loadTenant(companyId) {
  const key = String(companyId)
  // Custody-lock gate: a locked customer brain serves NOTHING, and we DROP any decrypted
  // working set from memory so vectors/text do not linger in RAM after lock. This runs
  // before the resident-cache fast path, so a lock takes effect immediately.
  if (_getCustody && _getCustody(key) === 'customer' && !isUnlocked(key)) {
    _lru.delete(key)
    const err = new Error('Company Brain is locked (encrypted under your key); unlock it to continue')
    err.code = 'BRAIN_LOCKED'
    throw err
  }
  const hot = touch(key)
  if (hot) return hot

  primeTenant(key)
  const dir = brainDir(key)
  const indexPath = path.join(dir, INDEX_FILE)

  let resident
  if (!fs.existsSync(indexPath)) {
    resident = emptyResident()
  } else {
    const indexSealed = fs.readFileSync(indexPath)
    const manifest = JSON.parse(decryptForTenant(key, indexSealed).toString('utf8'))
    const chunks = Array.isArray(manifest.chunks) ? manifest.chunks : []
    // The tenant's own embedding dim (written at persist). Older manifests, and
    // any without a positive dim, fall back to the default so existing tenants
    // load exactly as before.
    const dim = (Number.isInteger(manifest.dim) && manifest.dim > 0) ? manifest.dim : DEFAULT_DIM

    const vectorsPath = path.join(dir, VECTORS_FILE)
    let vectors
    if (chunks.length === 0) {
      vectors = new Float32Array(0)
    } else {
      if (!fs.existsSync(vectorsPath)) {
        throw new Error(`[brain_store] tenant ${key} index lists ${chunks.length} chunks but ${VECTORS_FILE} is missing`)
      }
      const vecSealed = fs.readFileSync(vectorsPath)
      vectors = decryptVectorForTenant(key, vecSealed, chunks.length * dim)
    }

    const sealedText = new Map()
    const textsPath = path.join(dir, TEXTS_FILE)
    if (fs.existsSync(textsPath)) {
      const textsSealed = fs.readFileSync(textsPath)
      const map = JSON.parse(decryptForTenant(key, textsSealed).toString('utf8'))
      for (const [chunkId, b64] of Object.entries(map)) {
        sealedText.set(chunkId, Buffer.from(b64, 'base64'))
      }
    }

    const byId = new Map()
    chunks.forEach((c, i) => byId.set(c.chunkId, i))
    const sources = new Map()
    for (const row of (manifest.sources || [])) sources.set(row.sourceId, row)

    resident = {
      sources,
      tombstones: Array.isArray(manifest.tombstones) ? manifest.tombstones : [],
      chunks,
      byId,
      dim,
      vectors,
      sealedText,
    }
  }

  _lru.set(key, resident)
  evictIfNeeded()
  return resident
}

// Persist the whole tenant in one shot (the "one blob write" per operation): three
// sealed blobs, each written atomically. Batching N records still produces exactly
// one persist, not N.
function persistTenant(companyId, resident) {
  const key = String(companyId)
  const dir = ensureBrainDir(key)

  const manifest = {
    v: INDEX_VERSION,
    dim: resident.dim,
    sources: Array.from(resident.sources.values()),
    tombstones: resident.tombstones,
    chunks: resident.chunks.map((c) => ({
      chunkId: c.chunkId,
      sourceId: c.sourceId,
      sourceTitle: c.sourceTitle,
      ordinal: c.ordinal,
      contentHash: c.contentHash,
      chunkHash: c.chunkHash,
    })),
  }
  writeBlobAtomic(path.join(dir, INDEX_FILE), encryptForTenant(key, Buffer.from(JSON.stringify(manifest), 'utf8')))

  if (resident.chunks.length > 0) {
    writeBlobAtomic(path.join(dir, VECTORS_FILE), encryptVectorForTenant(key, resident.vectors))
    const textMap = {}
    for (const c of resident.chunks) {
      const sealed = resident.sealedText.get(c.chunkId)
      if (!sealed) throw new Error(`[brain_store] tenant ${key} missing sealed text for chunk ${c.chunkId}`)
      textMap[c.chunkId] = sealed.toString('base64')
    }
    writeBlobAtomic(path.join(dir, TEXTS_FILE), encryptForTenant(key, Buffer.from(JSON.stringify(textMap), 'utf8')))
  } else {
    // No chunks left: remove the vector/text blobs so stats + disk reflect reality.
    for (const f of [VECTORS_FILE, TEXTS_FILE]) {
      const p = path.join(dir, f)
      if (fs.existsSync(p)) fs.rmSync(p)
    }
  }
}

// ---- helpers ---------------------------------------------------------------
// Validate a vector against an EXPECTED dim (the tenant's own dim). A length
// mismatch throws loudly - a wrong-dim vector is never stored or scored.
function toFloat32(vec, dim) {
  if (vec instanceof Float32Array) {
    if (vec.length !== dim) throw new Error(`[brain_store] vector length ${vec.length} != dim ${dim}`)
    return vec
  }
  if (Array.isArray(vec)) {
    if (vec.length !== dim) throw new Error(`[brain_store] vector length ${vec.length} != dim ${dim}`)
    return Float32Array.from(vec)
  }
  throw new Error('[brain_store] vector must be a Float32Array or number[]')
}

// For a fresh/empty tenant, the FIRST stored vector establishes the tenant dim.
// For a non-empty tenant, the dim is fixed (only a full re-embed changes it), so
// an incoming vector of a different length is a loud error, never a silent store.
function resolveUpsertDim(resident, firstVec) {
  if (resident.chunks.length > 0) return resident.dim
  const len = firstVec instanceof Float32Array || Array.isArray(firstVec) ? firstVec.length : 0
  if (!(len > 0)) throw new Error('[brain_store] cannot establish tenant dim from an empty first vector')
  return len
}

function rebuildVectors(resident, vectorById) {
  // vectorById: Map<chunkId, Float32Array(dim)> for the current chunk set.
  const dim = resident.dim
  const out = new Float32Array(resident.chunks.length * dim)
  resident.chunks.forEach((c, i) => {
    const v = vectorById.get(c.chunkId)
    if (!v) throw new Error(`[brain_store] internal: no vector for chunk ${c.chunkId} during rebuild`)
    if (v.length !== dim) throw new Error(`[brain_store] internal: vector for ${c.chunkId} is dim ${v.length}, tenant dim ${dim}`)
    out.set(v, i * dim)
  })
  resident.vectors = out
  resident.byId = new Map()
  resident.chunks.forEach((c, i) => resident.byId.set(c.chunkId, i))
}

function residentVectorAt(resident, i) {
  const dim = resident.dim
  return resident.vectors.subarray(i * dim, (i + 1) * dim)
}

function currentVectorMap(resident) {
  const m = new Map()
  resident.chunks.forEach((c, i) => m.set(c.chunkId, residentVectorAt(resident, i)))
  return m
}

const nowIso = () => new Date().toISOString()

// Rebuild the SourceRow for each affected sourceId from the resident chunk set.
// Sources with zero remaining chunks are tombstoned (reason supplied by caller).
function syncSources(companyId, resident, affectedSourceIds, { reason, opts = {} } = {}) {
  for (const sourceId of affectedSourceIds) {
    const members = resident.chunks
      .filter((c) => c.sourceId === sourceId)
      .sort((a, b) => a.ordinal - b.ordinal)
    const prev = resident.sources.get(sourceId)

    if (members.length === 0) {
      if (prev) {
        resident.sources.delete(sourceId)
        resident.tombstones.push({
          sourceId,
          version: prev.version,
          chunkHashes: prev.chunkHashes || [],
          reason: reason || 'deleted',
          supersededBy: (opts.supersededBy != null ? opts.supersededBy : null),
          at: nowIso(),
        })
      }
      continue
    }

    const first = members[0]
    const meta = opts.source || {}
    const chunkHashes = members.map((c) => c.chunkHash)
    const row = {
      sourceId,
      title: meta.title != null ? meta.title : (first.sourceTitle || prev?.title || ''),
      kind: meta.kind != null ? meta.kind : (prev?.kind || ''),
      revision: meta.revision != null ? meta.revision : (prev?.revision || ''),
      etag: meta.etag != null ? meta.etag : (prev?.etag || ''),
      modifiedTime: meta.modifiedTime != null ? meta.modifiedTime : (prev?.modifiedTime || null),
      version: meta.version != null ? meta.version : (prev ? (prev.version || 1) : 1),
      contentHash: meta.contentHash != null ? meta.contentHash : (first.contentHash || prev?.contentHash || ''),
      acl: 'company-wide',
      status: 'active',
      chunkHashes,
      embeddingModelVersion: meta.embeddingModelVersion != null ? meta.embeddingModelVersion : (prev?.embeddingModelVersion || ''),
      policyVersion: meta.policyVersion != null ? meta.policyVersion : (prev?.policyVersion || ''),
      createdAt: prev?.createdAt || nowIso(),
      updatedAt: nowIso(),
    }
    resident.sources.set(sourceId, row)
  }
}

// Seal one chunk's text to its own ciphertext buffer (so only returned top-K texts
// are ever decrypted). Empty/absent text seals an empty buffer (still a valid chunk).
function sealChunkText(companyId, text) {
  return encryptForTenant(String(companyId), Buffer.from(text == null ? '' : String(text), 'utf8'))
}

// ---- bounded top-K selection ----------------------------------------------
// Keep a worst-first array of size <= topK. Replace the current worst only when a
// higher score arrives. O(N * topK) worst case, bounded memory, no full sort of N.
function topKSelect(scored, topK) {
  const heap = [] // entries {i, score}, kept so heap[0] is the current minimum
  for (const entry of scored) {
    if (heap.length < topK) {
      heap.push(entry)
      if (heap.length === topK) heap.sort((a, b) => a.score - b.score)
    } else if (topK > 0 && entry.score > heap[0].score) {
      // Replace the minimum, then re-settle its position (insertion into a small
      // already-sorted array is cheap for the small topK values we use).
      heap[0] = entry
      let j = 0
      while (j + 1 < heap.length && heap[j].score > heap[j + 1].score) {
        const t = heap[j]; heap[j] = heap[j + 1]; heap[j + 1] = t
        j++
      }
    }
  }
  return heap.sort((a, b) => b.score - a.score) // best-first
}

// ---------------------------------------------------------------------------
export const brainStore = {
  // Idempotent by chunkId. A record whose chunkId already exists is replaced in
  // place (same slot, metadata + vector + sealed text updated); new chunkIds are
  // appended. The whole batch is one persist.
  async upsert(companyId, records, sourceMeta = null) {
    const key = String(companyId)
    if (!Array.isArray(records)) throw new Error('[brain_store] upsert: records must be an array')
    const resident = loadTenant(key)
    if (records.length === 0) return { upserted: 0, bytes: statBytes(key) }

    // A fresh tenant adopts the first vector's dim; an existing tenant keeps its
    // own. This runs before any mutation so a dim mismatch aborts the whole batch.
    resident.dim = resolveUpsertDim(resident, records[0] && records[0].vector)

    const vectorById = currentVectorMap(resident)
    // Snapshot existing vectors into concrete buffers (subarrays alias the resident
    // Float32Array we are about to replace).
    for (const [id, sub] of vectorById) vectorById.set(id, Float32Array.from(sub))

    const affected = new Set()
    let upserted = 0
    for (const rec of records) {
      if (!rec || !rec.chunkId) throw new Error('[brain_store] upsert: each record needs a chunkId')
      const vec = toFloat32(rec.vector, resident.dim)
      const meta = {
        chunkId: rec.chunkId,
        sourceId: rec.sourceId,
        sourceTitle: rec.sourceTitle,
        ordinal: rec.ordinal,
        contentHash: rec.contentHash,
        chunkHash: rec.chunkHash,
      }
      const existingIdx = resident.byId.get(rec.chunkId)
      if (existingIdx != null) {
        resident.chunks[existingIdx] = meta
      } else {
        resident.chunks.push(meta)
        resident.byId.set(rec.chunkId, resident.chunks.length - 1)
      }
      vectorById.set(rec.chunkId, Float32Array.from(vec))
      resident.sealedText.set(rec.chunkId, sealChunkText(key, rec.text))
      if (rec.sourceId != null) affected.add(rec.sourceId)
      upserted++
    }

    rebuildVectors(resident, vectorById)
    syncSources(key, resident, affected, { opts: { source: sourceMeta || {} } })
    persistTenant(key, resident)
    return { upserted, bytes: statBytes(key) }
  },

  // Brute-force cosine (dot product, vectors are L2-normalized). Returns BrainHit[]
  // best-first with vectorScore + score set; text decrypted ONLY for the returned K.
  async query(companyId, queryVector, topK, opts = {}) {
    const key = String(companyId)
    const resident = loadTenant(key)
    const k = Number.isInteger(topK) && topK > 0 ? topK : 0
    if (k === 0 || resident.chunks.length === 0) return []

    const dim = resident.dim
    // Guard: a query vector must match the tenant's geometry. A mismatch (e.g. a
    // 384-dim query against a tenant re-embedded to 768) throws instead of reading
    // past the end and scoring NaN - a wrong result is never served silently.
    const q = toFloat32(queryVector, dim)
    const filter = opts.filterSourceIds ? new Set(opts.filterSourceIds) : null
    const minScore = typeof opts.minScore === 'number' ? opts.minScore : -Infinity

    const scored = []
    for (let i = 0; i < resident.chunks.length; i++) {
      const c = resident.chunks[i]
      if (filter && !filter.has(c.sourceId)) continue
      const base = i * dim
      let dot = 0
      for (let d = 0; d < dim; d++) dot += q[d] * resident.vectors[base + d]
      if (dot < minScore) continue
      scored.push({ i, score: dot })
    }

    const top = topKSelect(scored, k)
    return top.map(({ i, score }) => {
      const c = resident.chunks[i]
      const sealed = resident.sealedText.get(c.chunkId)
      // Decrypt failure here THROWS (decryptForTenant), never an empty-text fallback.
      const text = sealed ? decryptForTenant(key, sealed).toString('utf8') : ''
      return {
        chunkId: c.chunkId,
        sourceId: c.sourceId,
        sourceTitle: c.sourceTitle,
        text,
        vectorScore: score,
        keywordScore: 0,
        score,
      }
    })
  },

  // Atomic replace of ONE source's chunks: drop every existing chunk of sourceId,
  // install `records` as that source's new chunk set, tombstone the old version.
  // One persist.
  async supersede(companyId, sourceId, records, sourceMeta = null) {
    const key = String(companyId)
    if (sourceId == null) throw new Error('[brain_store] supersede: sourceId required')
    if (!Array.isArray(records)) throw new Error('[brain_store] supersede: records must be an array')
    const resident = loadTenant(key)

    const prev = resident.sources.get(sourceId)
    const removed = resident.chunks.filter((c) => c.sourceId === sourceId).length

    // Record the superseded version as a tombstone before we drop its chunks.
    if (prev) {
      resident.tombstones.push({
        sourceId,
        version: prev.version,
        chunkHashes: prev.chunkHashes || [],
        reason: 'version',
        supersededBy: (prev.version || 1) + 1,
        at: nowIso(),
      })
    }

    // Dim is fixed for a non-empty tenant; a brand-new tenant adopts it from the
    // first incoming vector. Decided before mutation so a mismatch aborts cleanly.
    if (records.length) resident.dim = resolveUpsertDim(resident, records[0] && records[0].vector)

    const vectorById = currentVectorMap(resident)
    for (const [id, sub] of vectorById) vectorById.set(id, Float32Array.from(sub))

    // Remove old chunks of this source.
    const keep = []
    for (const c of resident.chunks) {
      if (c.sourceId === sourceId) {
        vectorById.delete(c.chunkId)
        resident.sealedText.delete(c.chunkId)
      } else {
        keep.push(c)
      }
    }
    resident.chunks = keep

    // Install new chunks.
    let upserted = 0
    for (const rec of records) {
      if (!rec || !rec.chunkId) throw new Error('[brain_store] supersede: each record needs a chunkId')
      const vec = toFloat32(rec.vector, resident.dim)
      resident.chunks.push({
        chunkId: rec.chunkId,
        sourceId: rec.sourceId != null ? rec.sourceId : sourceId,
        sourceTitle: rec.sourceTitle,
        ordinal: rec.ordinal,
        contentHash: rec.contentHash,
        chunkHash: rec.chunkHash,
      })
      vectorById.set(rec.chunkId, Float32Array.from(vec))
      resident.sealedText.set(rec.chunkId, sealChunkText(key, rec.text))
      upserted++
    }

    rebuildVectors(resident, vectorById)
    // Version from the source's own revision when provided (latest-by-source-
    // revision, clock-skew safe); else bump the internal counter.
    const sv = (sourceMeta && sourceMeta.version != null) ? sourceMeta.version : ((prev ? (prev.version || 1) : 0) + 1)
    const sourceOpts = { source: { ...(sourceMeta || {}), version: sv } }
    syncSources(key, resident, new Set([sourceId]), { reason: 'version', opts: sourceOpts })
    persistTenant(key, resident)
    return { removed, upserted }
  },

  // Delete by EXACTLY ONE selector: { ids } (chunkIds) or { sourceId }.
  async delete(companyId, { ids, sourceId } = {}) {
    const key = String(companyId)
    const hasIds = ids !== undefined
    const hasSource = sourceId != null
    if ((hasIds ? 1 : 0) + (hasSource ? 1 : 0) !== 1) {
      throw new Error('[brain_store] delete: provide exactly one selector, { ids } or { sourceId }')
    }
    if (hasIds && !Array.isArray(ids)) throw new Error('[brain_store] delete: ids must be an array')
    const resident = loadTenant(key)

    const vectorById = currentVectorMap(resident)
    for (const [id, sub] of vectorById) vectorById.set(id, Float32Array.from(sub))

    const affected = new Set()
    let removed = 0
    let removeFn
    if (hasSource) {
      removeFn = (c) => c.sourceId === sourceId
      affected.add(sourceId)
    } else {
      const idSet = new Set(ids)
      removeFn = (c) => idSet.has(c.chunkId)
    }

    const keep = []
    for (const c of resident.chunks) {
      if (removeFn(c)) {
        vectorById.delete(c.chunkId)
        resident.sealedText.delete(c.chunkId)
        if (c.sourceId != null) affected.add(c.sourceId)
        removed++
      } else {
        keep.push(c)
      }
    }
    resident.chunks = keep

    rebuildVectors(resident, vectorById)
    syncSources(key, resident, affected, { reason: 'deleted' })
    persistTenant(key, resident)
    return { removed }
  },

  async stats(companyId) {
    const key = String(companyId)
    const resident = loadTenant(key)
    const activeSources = Array.from(resident.sources.values()).filter((s) => s.status === 'active').length
    return {
      chunks: resident.chunks.length,
      sources: activeSources,
      dims: resident.dim,
      bytes: statBytes(key),
      resident: _lru.has(key),
    }
  },

  async listSources(companyId) {
    const key = String(companyId)
    const resident = loadTenant(key)
    return Array.from(resident.sources.values()).map((s) => ({ ...s, chunkHashes: [...(s.chunkHashes || [])] }))
  },

  // Enumerate EVERY resident chunk with its decrypted (already-scrubbed) text and
  // metadata. This is the "brain is ready to be re-embedded" read: it confirms the
  // store keeps the raw chunk TEXT, not only vectors, so a bigger model can rebuild
  // the vectors with NO re-upload. Decrypts every chunk's text, so it is for the
  // admin re-embed path only, never the hot retrieval path. A decrypt failure
  // THROWS (never a silent empty), consistent with query().
  async listChunksWithText(companyId) {
    const key = String(companyId)
    const resident = loadTenant(key)
    return resident.chunks.map((c) => {
      const sealed = resident.sealedText.get(c.chunkId)
      const text = sealed ? decryptForTenant(key, sealed).toString('utf8') : ''
      return {
        chunkId: c.chunkId,
        sourceId: c.sourceId,
        sourceTitle: c.sourceTitle,
        ordinal: c.ordinal,
        contentHash: c.contentHash,
        chunkHash: c.chunkHash,
        text,
      }
    })
  },

  // ATOMIC re-embed swap: replace EVERY chunk's vector (and chunkHash) with vectors
  // produced by a different embedding model, set the tenant's new `dim`, and stamp
  // the new embedding-model version (and effective policy version) onto every
  // source row - all in ONE persist. The caller (brain_reembed.js) owns the slow
  // embedding; this method owns the on-disk mutation (SUPREME RULE II: the store is
  // the single owner of the layout). It is all-or-nothing: `records` MUST cover
  // every resident chunk exactly, or it throws BEFORE any write, so an interrupted
  // re-embed never leaves a half-swapped, mixed-dim brain. Optionally re-seals each
  // chunk's text when `text` is supplied (a policy re-scrub can only redact more).
  async reembed(companyId, { dim, records, modelVersion, policyVersion } = {}) {
    const key = String(companyId)
    if (!(Number.isInteger(dim) && dim > 0)) throw new Error('[brain_store] reembed: dim must be a positive integer')
    if (!Array.isArray(records)) throw new Error('[brain_store] reembed: records must be an array')
    const resident = loadTenant(key)
    if (resident.chunks.length === 0) return { chunks: 0, dim: resident.dim, sources: 0 }

    const byId = new Map()
    for (const r of records) {
      if (!r || !r.chunkId) throw new Error('[brain_store] reembed: each record needs a chunkId')
      byId.set(String(r.chunkId), r)
    }
    // Never silently truncate: there must be exactly one new vector per resident chunk.
    if (byId.size !== resident.chunks.length || records.length !== resident.chunks.length) {
      throw new Error(`[brain_store] reembed: expected ${resident.chunks.length} records, got ${records.length} (${byId.size} unique chunkIds)`)
    }

    const vectorById = new Map()
    for (const c of resident.chunks) {
      const r = byId.get(String(c.chunkId))
      if (!r) throw new Error(`[brain_store] reembed: missing new vector for chunk ${c.chunkId}`)
      vectorById.set(c.chunkId, Float32Array.from(toFloat32(r.vector, dim)))
    }
    // All vectors validated: now mutate. chunkHash is rebound to the new model;
    // text is re-sealed only when the caller re-scrubbed it under a new policy.
    for (const c of resident.chunks) {
      const r = byId.get(String(c.chunkId))
      if (r.chunkHash != null) c.chunkHash = String(r.chunkHash)
      if (r.text != null) resident.sealedText.set(c.chunkId, sealChunkText(key, r.text))
    }
    resident.dim = dim
    rebuildVectors(resident, vectorById)

    // Stamp the new pinned model + policy version onto every source row (and refresh
    // its chunkHashes from the now-rebound chunks). syncSources preserves title,
    // kind, revision, version and contentHash (only the fields we pass change).
    const affected = new Set(resident.chunks.map((c) => c.sourceId))
    const srcMeta = {}
    if (modelVersion != null) srcMeta.embeddingModelVersion = String(modelVersion)
    if (policyVersion != null) srcMeta.policyVersion = String(policyVersion)
    syncSources(key, resident, affected, { opts: { source: srcMeta } })

    persistTenant(key, resident)
    return { chunks: resident.chunks.length, dim, sources: affected.size }
  },
}

// Read-only export helper (SUPREME RULE II: the on-disk layout stays owned HERE).
// Returns the tenant's already-sealed blobs as raw Buffers for the password-encrypted
// export (customer_export.js), which copies them verbatim into the encrypted archive
// and re-wraps only the DEK under the export password. This does NOT decrypt anything
// and does NOT change any public adapter method; it just exposes the three sealed
// files' bytes so the archive builder does not hardcode the BRAIN_DIR layout itself.
// `present` is false when the tenant has no stored brain (no index blob).
export function readSealedBlobsForExport(companyId) {
  const dir = brainDir(String(companyId))
  const read = (f) => { try { return fs.readFileSync(path.join(dir, f)) } catch { return null } }
  const index = read(INDEX_FILE)
  const vectors = read(VECTORS_FILE)
  const texts = read(TEXTS_FILE)
  // Bytes only: this helper has no DEK, so it cannot read the geometry from the
  // encrypted manifest. The export reads that from readEmbeddingForExport below.
  return { present: !!(index && index.length), index, vectors, texts }
}

// The tenant's CURRENT embedding geometry for the export label: `dim` is the
// manifest's own dim (what the sealed vectors really are, updated atomically by
// reembed) and `model` is brain_model.activeEmbedModel over the tenant's sources,
// the same rule retrieval and the sync manifest use. Opens the manifest with the
// tenant key, so the exporter calls it only once the brain is resolvable; a
// locked customer brain throws BRAIN_LOCKED (loadTenant's gate), never a guess.
export function readEmbeddingForExport(companyId) {
  const resident = loadTenant(String(companyId))
  return { dim: resident.dim, model: publicEmbedModel(activeEmbedModel(Array.from(resident.sources.values()))) }
}

// Sum the on-disk sealed-blob sizes for the tenant.
function statBytes(companyId) {
  const dir = brainDir(companyId)
  let total = 0
  for (const f of [INDEX_FILE, VECTORS_FILE, TEXTS_FILE]) {
    const p = path.join(dir, f)
    try { total += fs.statSync(p).size } catch { /* missing blob contributes 0 */ }
  }
  return total
}
