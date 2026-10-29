// WorkCoPilot Company Brain - ingestion (Agent B-4).
//
// Turns an extracted source document into privacy-scrubbed, embedded,
// content-addressed BrainRecords and writes them to the per-tenant encrypted
// vector store. Privacy is enforced at the chokepoint: EVERY chunk is scrubbed
// (policy-aware) BEFORE it is embedded or stored, so raw PII / secrets never
// reach the embedder or the sealed index. Nothing is dropped silently - the
// caller gets an honest tally of accepted / skipped / superseded / tombstoned /
// redacted so the operator sees exactly what happened.
//
// Single source of truth: the one scrub engine (work-scrub.js), the one
// tokenizer + hash set (brain_model.js), the one embedder (brain_embed.js), the
// one store (brain_store.js). This module adds no parallel copy of any of them.

import { brainStore } from './brain_store.js'
import { EMBED, contentHashOf, chunkHashOf, policyVersionOf, resolveEmbedModelByVersion, publicEmbedModel } from './brain_model.js'
import { embedPassages } from './brain_embed.js'
import { scrubSensitive, scrubWithPolicy } from './work-scrub.js'
import { chunkCode, detectLanguage } from './brain_code_chunk.js'

// Chunking targets. ~1800 chars per chunk with ~300 chars of overlap so a step
// that straddles a boundary still has context on both sides.
const CHUNK_TARGET = 1800
const CHUNK_OVERLAP = 300

// ---------------------------------------------------------------------------
// chunkText: split a document into ~1800-char chunks with ~300 overlap, on
// heading / blank-line boundaries, NEVER cutting through a numbered or bulleted
// step. A single block that is itself larger than the target is hard-windowed
// by characters (with overlap) as a last resort.
// ---------------------------------------------------------------------------

// Line spans over the ORIGINAL text so every chunk keeps exact char offsets.
function lineSpans(text) {
  const spans = []
  let pos = 0
  const parts = text.split('\n')
  for (let i = 0; i < parts.length; i++) {
    const line = parts[i]
    spans.push({ start: pos, end: pos + line.length, line })
    pos += line.length + 1 // + the '\n' we split on
  }
  return spans
}

const isBlankLine = (l) => /^\s*$/.test(l)
const isHeadingLine = (l) => /^\s{0,3}#{1,6}\s+\S/.test(l)
// A numbered ("1." / "1)") or bulleted ("-" / "*" / "+") step marker. A line that
// STARTS a step begins a new block; a step's wrapped continuation lines (no
// marker) attach to it, so a multi-line step is never cut.
const isStepMarker = (l) => /^\s{0,6}(?:[-*+]\s+|\d+[.)]\s+)\S/.test(l)

// Break the text into atomic blocks: a maximal run of non-blank lines, with a
// markdown heading OR a list-step marker always starting a fresh block. Blank
// lines separate blocks. Because every step starts its own block (even in a
// tight list with no blank lines between items), a chunk boundary can only fall
// BETWEEN steps, never inside one.
function splitBlocks(text) {
  const spans = lineSpans(text)
  const blocks = []
  let cur = null
  const push = () => { if (cur) { blocks.push(cur); cur = null } }
  for (const s of spans) {
    if (isBlankLine(s.line)) { push(); continue }
    if (isHeadingLine(s.line) || isStepMarker(s.line)) push() // heading / step begins a new block
    if (!cur) cur = { start: s.start, end: s.end }
    else cur.end = s.end
  }
  push()
  return blocks.map((b) => ({ start: b.start, end: b.end, text: text.slice(b.start, b.end) }))
}

// Hard character-window fallback for a single block that exceeds the target.
// Used ONLY when a block (e.g. one gigantic paragraph with no blank lines) is
// bigger than CHUNK_TARGET, so there is no step boundary to break on.
function hardWindow(block) {
  const out = []
  const { start, text } = block
  let i = 0
  while (i < text.length) {
    const end = Math.min(i + CHUNK_TARGET, text.length)
    out.push({ start: start + i, end: start + end, text: text.slice(i, end) })
    if (end >= text.length) break
    i = Math.max(0, end - CHUNK_OVERLAP)
  }
  return out
}

export function chunkText(text) {
  const src = String(text == null ? '' : text)
  if (!src.trim()) return []

  // Atoms: blocks, with any oversized block pre-split by the char-window fallback.
  const atoms = []
  for (const b of splitBlocks(src)) {
    if (b.text.length > CHUNK_TARGET) atoms.push(...hardWindow(b))
    else atoms.push(b)
  }

  const chunks = []
  let cur = []
  let curLen = 0
  let carryLen = 0 // length of leading carried-over atoms (overlap) in cur

  const emit = () => {
    if (!cur.length) return
    const first = cur[0]
    const last = cur[cur.length - 1]
    chunks.push({ ord: chunks.length, charStart: first.start, charEnd: last.end, text: src.slice(first.start, last.end) })
  }

  for (const a of atoms) {
    const alen = a.text.length
    // Flush only once there is at least one FRESH atom beyond the carried overlap,
    // so we never emit a chunk that is just a duplicate of the previous tail.
    if (curLen > carryLen && curLen + alen > CHUNK_TARGET) {
      emit()
      // Build the overlap carry from the trailing atoms of the chunk just closed.
      const carry = []
      let clen = 0
      for (let j = cur.length - 1; j >= 0; j--) {
        if (carry.length && clen + cur[j].text.length > CHUNK_OVERLAP) break
        carry.unshift(cur[j])
        clen += cur[j].text.length
        if (clen >= CHUNK_OVERLAP) break
      }
      cur = carry
      curLen = clen
      carryLen = clen
    }
    cur.push(a)
    curLen += alen
  }
  emit()

  // Re-number ords densely (emit() already assigns them in order).
  return chunks.map((c, i) => ({ ord: i, charStart: c.charStart, charEnd: c.charEnd, text: c.text }))
}

// ---------------------------------------------------------------------------
// Version comparison for the supersede decision. Handles numeric versions,
// ISO timestamps, and plain string revisions. Returns true when `incoming` is
// strictly newer than `prior`.
// ---------------------------------------------------------------------------
function isVersionNewer(incoming, prior) {
  if (prior == null || prior === '') return incoming != null && incoming !== ''
  if (incoming == null || incoming === '') return false
  const ni = Number(incoming)
  const np = Number(prior)
  if (Number.isFinite(ni) && Number.isFinite(np)) return ni > np
  const ti = Date.parse(incoming)
  const tp = Date.parse(prior)
  if (!Number.isNaN(ti) && !Number.isNaN(tp)) return ti > tp
  return String(incoming) > String(prior)
}

// ---------------------------------------------------------------------------
// ingestSource: scrub -> embed -> hash -> dedupe -> supersede/upsert.
// Returns an honest tally: { accepted, skipped, superseded, tombstoned, redacted }.
// ---------------------------------------------------------------------------
export async function ingestSource(companyId, { source, version, extractedText, policy }) {
  const result = { accepted: 0, skipped: 0, superseded: 0, tombstoned: 0, redacted: 0 }
  if (!source || source.id == null) throw new Error('ingestSource: source.id is required')

  const text = String(extractedText == null ? '' : extractedText)
  const policyVersion = policyVersionOf(policy)
  const contentHash = contentHashOf(text) // whole-document identity

  // 1) Chunk, then SCRUB each chunk BEFORE anything else touches it.
  //    CODE sources chunk by symbol (brain_code_chunk.js) so a retrieval hit
  //    points at one whole function/class, not a mid-body prose window. The
  //    chunk shape is byte-identical { ord,charStart,charEnd,text }, so every
  //    downstream step (scrub -> chunkHashOf -> embed -> BrainRecords ->
  //    supersede/upsert) is unchanged.
  const lang = detectLanguage(source.path || source.title || source.id || '')
  const isCode = source.kind === 'code' || lang !== 'text'
  const chunks = isCode ? chunkCode(text, { language: lang }) : chunkText(text)
  const scrubbed = chunks.map((c) => {
    const r = policy ? scrubWithPolicy(c.text, policy) : scrubSensitive(c.text)
    result.redacted += (r.total || 0)
    return { ord: c.ord, clean: r.clean }
  })

  // 2) Per-chunk content-address (over the SCRUBBED text, pinned to model+policy).
  const metas = scrubbed.map((c) => ({
    ord: c.ord,
    clean: c.clean,
    chunkHash: chunkHashOf({ modelId: EMBED.id, rev: EMBED.rev, policyVersion, text: c.clean }),
  }))

  // 3) Inspect what already lives in the store for dedupe + supersede.
  const existing = await brainStore.listSources(companyId)
  const activeRows = (existing || []).filter((s) => s.status === 'active')
  const prior = activeRows.find((s) => String(s.sourceId) === String(source.id))
  const priorHashes = new Set(prior ? (prior.chunkHashes || []) : [])
  const globalHashes = new Set()
  for (const s of activeRows) for (const h of (s.chunkHashes || [])) globalHashes.add(h)

  const supersede = Boolean(prior) && isVersionNewer(version, prior.version)

  // Decide which chunks we actually embed + store.
  //  - supersede: the new version fully REPLACES the source, so every current
  //    chunk is (re)stored; carried-over unchanged chunks count as "skipped".
  //  - upsert (new source or same/older re-ingest): store only chunks whose hash
  //    is not already resident; identical chunks are skipped (true dedupe).
  let toStore
  if (supersede) {
    toStore = metas
    result.skipped = metas.filter((c) => priorHashes.has(c.chunkHash)).length
  } else {
    const dedupeAgainst = prior ? priorHashes : globalHashes
    toStore = metas.filter((c) => !dedupeAgainst.has(c.chunkHash))
    result.skipped = metas.length - toStore.length
  }

  // 4) Embed the SCRUBBED chunks we are storing (no raw text ever embedded).
  const vectors = toStore.length ? await embedPassages(toStore.map((c) => c.clean)) : []

  // 5) Build BrainRecords.
  const records = toStore.map((c, i) => ({
    chunkId: `${source.id}::${c.ord}`,
    sourceId: source.id,
    sourceTitle: source.title || source.name || String(source.id),
    ordinal: c.ord,
    text: c.clean, // scrubbed
    vector: vectors[i],
    contentHash,
    chunkHash: c.chunkHash,
  }))

  // 6) Write: supersede a newer version (atomic replace + tombstone old chunks),
  //    else upsert the fresh chunks. A fully-unchanged re-ingest writes nothing.
  if (supersede) {
    await brainStore.supersede(companyId, source.id, records)
    result.superseded = records.length
    result.tombstoned = (prior.chunkHashes || []).length
    result.accepted = records.filter((r) => !priorHashes.has(r.chunkHash)).length
  } else if (records.length) {
    await brainStore.upsert(companyId, records)
    result.accepted = records.length
  }

  return result
}

// ---------------------------------------------------------------------------
// buildManifest: the sync inventory. One row per source (latest by revision),
// optionally only those changed since a cursor. Reports the pinned model + the
// effective policy version so a client can tell when a re-embed is required.
// ---------------------------------------------------------------------------
function cursorValue(s) {
  const t = Date.parse(s && (s.updatedAt || s.modifiedTime || s.createdAt))
  return Number.isNaN(t) ? 0 : t
}
function revisionNewer(a, b) {
  // Prefer explicit revision ordering, fall back to the update cursor.
  if (a && b && a.revision != null && b.revision != null && a.revision !== b.revision) {
    return isVersionNewer(a.revision, b.revision)
  }
  return cursorValue(a) > cursorValue(b)
}

export async function buildManifest(companyId, { since } = {}) {
  const rows = (await brainStore.listSources(companyId)) || []

  // Latest-by-source-revision: collapse to one row per sourceId.
  const latest = new Map()
  for (const s of rows) {
    const prev = latest.get(String(s.sourceId))
    if (!prev || revisionNewer(s, prev)) latest.set(String(s.sourceId), s)
  }

  let sources = [...latest.values()]
  if (since != null && since !== '') {
    const sinceVal = Number.isFinite(Number(since)) ? Number(since) : Date.parse(since) || 0
    sources = sources.filter((s) => cursorValue(s) > sinceVal)
  }
  sources.sort((a, b) => cursorValue(a) - cursorValue(b))

  const cursor = sources.length
    ? cursorValue(sources[sources.length - 1])
    : (Number.isFinite(Number(since)) ? Number(since) : 0)
  const policyVersion = (sources.find((s) => s.policyVersion) || {}).policyVersion || ''

  // Report the tenant's ACTUAL pinned model (it may have been re-embedded by a
  // larger model), resolved from the sources' embeddingModelVersion; default to
  // the pinned EMBED when none is recorded. A client re-embeds when this differs
  // from what it holds.
  const modelVersion = (sources.find((s) => s.embeddingModelVersion) || {}).embeddingModelVersion
  const model = publicEmbedModel(resolveEmbedModelByVersion(modelVersion) || EMBED)

  return { cursor, sources, model, policyVersion }
}

export default { chunkText, ingestSource, buildManifest }
