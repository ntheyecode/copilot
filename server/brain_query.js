// WorkCoPilot Company Brain - query interface (Wave 4 backend).
//
// A read-only retrieval endpoint so a company's OWN tenant can be queried without
// exporting the brain. It is a thin orchestration layer: it reuses the one
// embedder (brain_embed, via retrieve) and the one hybrid retriever
// (brain_retrieve.retrieveForGoal) - no parallel retrieval logic lives here - and
// returns only the ALREADY-SCRUBBED chunk text plus provenance and a relevance
// score. It never returns vectors, hashes, raw screens, secrets, or any chat AI
// provider/model name.
//
// AI configs never silently fail (SUPREME RULE III): a locked customer brain, an
// empty brain, and a bad query each surface a STATED, actionable error - never a
// silent empty. A genuine "no company source matched" is NOT an error: it returns
// matched:false with a stated note (nothing fabricated), mirroring retrieve's
// honest fallback. When the on-device embedding model is not serving, the result
// carries a stated keyword-only-mode note rather than failing (honest degradation,
// never silent).
//
// Company scope: the caller's companyId is the ONLY tenant touched. The route
// passes req.workUser.companyId; this module never widens that.
//
// US spelling. No em dashes.

import { brainStore } from './brain_store.js'
import { retrieveForGoal } from './brain_retrieve.js'
import { embedderReady } from './brain_embed.js'

const DEFAULT_TOPK = 6
const MAX_TOPK = 20

// A typed error so the route can map code -> HTTP status + a stated message, and
// callers can branch on code without string matching.
export class BrainQueryError extends Error {
  constructor(code, message, status) {
    super(message)
    this.name = 'BrainQueryError'
    this.code = code
    this.status = status
  }
}

function clampTopK(topK) {
  const n = Number(topK)
  if (!Number.isFinite(n)) return DEFAULT_TOPK
  return Math.max(1, Math.min(MAX_TOPK, Math.trunc(n)))
}

function round4(x) {
  const n = Number(x)
  return Number.isFinite(n) ? Math.round(n * 1e4) / 1e4 : 0
}

// queryBrain(companyId, { q, topK }, deps?) -> {
//   matched, topK, semanticSearchReady, hits:[{ text, score, source:{sourceId,title,revision} }], note?, semanticNote?
// }
// deps lets tests inject a fake store / retrieve / embedderReady (mirrors the
// dependency-injection the sibling brain modules already use).
export async function queryBrain(companyId, { q, topK } = {}, deps = {}) {
  const store = deps.store || brainStore
  const retrieve = deps.retrieve || retrieveForGoal
  const embReady = deps.embedderReady || embedderReady

  if (!companyId) {
    throw new BrainQueryError('NO_COMPANY', 'The Company Brain is for company accounts.', 403)
  }
  const query = String(q == null ? '' : q).trim()
  if (!query) {
    throw new BrainQueryError('BAD_QUERY', 'Provide a non-empty query string in `q`.', 400)
  }
  const k = clampTopK(topK)

  // Lock + empty gates FIRST (before embedding). listSources -> loadTenant throws
  // BRAIN_LOCKED for a locked customer-held brain; surface that as a stated,
  // actionable error, never a silent empty result.
  let sources
  try {
    sources = (await store.listSources(companyId)) || []
  } catch (e) {
    if (e && e.code === 'BRAIN_LOCKED') {
      throw new BrainQueryError('BRAIN_LOCKED', 'Your Company Brain is locked. An administrator must unlock it before it can be queried.', 423)
    }
    throw e
  }
  const active = sources.filter((s) => s && s.status === 'active')
  if (!active.length) {
    throw new BrainQueryError('BRAIN_EMPTY', 'Your Company Brain has no documents yet, so there is nothing to query. Add sources first.', 409)
  }

  // Provenance: source revision, keyed by sourceId (retrieve hits carry title +
  // id; we enrich with the stored revision so the caller gets source + revision).
  const revBySource = new Map()
  for (const s of active) revBySource.set(String(s.sourceId), s.revision || '')

  // Reuse the hybrid retriever exactly as the plan handler does (goal = the query,
  // no app context). It embeds the query under the tenant's pinned model and
  // returns scrubbed chunk text + provenance + a fused relevance score.
  const out = await retrieve({ companyId, goal: query, app: '', topK: k })

  const semanticSearchReady = embReady() === true
  const hits = (out && Array.isArray(out.hits) ? out.hits : []).map((h) => ({
    text: h.text,                 // already-scrubbed chunk text (never raw)
    score: round4(h.score),       // fused relevance; higher is closer
    source: {
      sourceId: h.sourceId,
      title: h.sourceTitle || '',
      revision: revBySource.get(String(h.sourceId)) || '',
    },
  }))

  const result = { matched: hits.length > 0, topK: k, semanticSearchReady, hits }
  if (!hits.length) {
    // Stated, not silent: there ARE sources, but none matched. Nothing fabricated.
    result.note = 'No company document matched this query. No source was fabricated.'
  }
  if (!semanticSearchReady) {
    result.semanticNote = 'Semantic search is in keyword-only mode until the on-device embedding model is available; results rank on keyword overlap.'
  }
  return result
}

export default { queryBrain, BrainQueryError }
