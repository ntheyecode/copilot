// WorkCoPilot Company Brain - retrieval (Agent B-4).
//
// THE primary grounding for the plan handler: given a goal + app, return the
// company-source chunks that actually support an answer, each carrying its
// provenance (source title). Hybrid retrieval - a dense vector arm and a sparse
// BM25 keyword arm - fused, re-ranked, and gated by a relevance floor. When
// nothing clears the floor, or there is no brain yet, we return a STATED
// fallback ({ grounded:false, fallbackReason:'no_matching_sources' }) so the
// lead can surface an honest "no matching company source" event. We never
// return a silent empty result dressed as grounded, and never a fabricated
// source.
//
// Single source of truth: the same tokenizer as ingestion (brain_model.tokenize)
// and the same embedder (brain_embed.embedQuery). No parallel copies.

import { brainStore } from './brain_store.js'
import { tokenize, normalizeText, activeEmbedModel } from './brain_model.js'
import { embedQueryWith } from './brain_embed.js'

// Fusion weights (named constants - single source of truth for the blend).
const VECTOR_WEIGHT = 0.6
const KEYWORD_WEIGHT = 0.4
// Re-rank bonuses / caps.
const PHRASE_BONUS = 0.1 // exact multi-word phrase present verbatim in a chunk
const SOURCE_DIVERSITY_CAP = 2 // at most N hits from any one source
// Keep only hits whose fused score clears this floor.
const MIN_SCORE = 0.35
// Anti-fabrication raw-evidence gate: min-max normalization would otherwise lift
// the best pure-noise candidate to 1.0 and fabricate grounding on an empty match.
// A candidate is only real if it has genuine raw evidence from at least one arm:
// a non-trivial raw cosine OR any keyword overlap. This is what makes the
// 'no_matching_sources' fallback reachable on a NON-empty brain, and is required
// to honor "never a fabricated source".
const RAW_VECTOR_FLOOR = 0.30
// BM25 parameters.
const BM25_K1 = 1.5
const BM25_B = 0.75

// Min-max normalize an array into [0,1]. When every value is equal we cannot
// discriminate: positive-but-flat maps to 1 (the single-candidate case), all-
// zero maps to 0 (no signal from this arm).
function minMaxNormalize(arr) {
  if (!arr.length) return []
  let mn = Infinity
  let mx = -Infinity
  for (const x of arr) { if (x < mn) mn = x; if (x > mx) mx = x }
  if (mx <= mn) return arr.map(() => (mx > 0 ? 1 : 0))
  return arr.map((x) => (x - mn) / (mx - mn))
}

// BM25 over a resident candidate pool. Document frequencies are computed from
// the pool's own chunk token-sets (the only chunk TEXT the store API exposes is
// what query() returns for the candidate pool).
function bm25Scores(queryTerms, docTokenSets) {
  const N = docTokenSets.length
  if (!N) return []
  const df = new Map()
  for (const toks of docTokenSets) {
    for (const t of new Set(toks)) df.set(t, (df.get(t) || 0) + 1)
  }
  const avgdl = docTokenSets.reduce((a, d) => a + d.length, 0) / N || 1
  const qTerms = [...new Set(queryTerms)]
  return docTokenSets.map((toks) => {
    const len = toks.length
    const tf = new Map()
    for (const t of toks) tf.set(t, (tf.get(t) || 0) + 1)
    let score = 0
    for (const t of qTerms) {
      const f = tf.get(t) || 0
      if (!f) continue
      const n = df.get(t) || 0
      const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5))
      score += idf * ((f * (BM25_K1 + 1)) / (f + BM25_K1 * (1 - BM25_B + BM25_B * (len / avgdl))))
    }
    return score
  })
}

export async function retrieveForGoal({ companyId, goal, app, topK = 6 }) {
  const NO_MATCH = { hits: [], grounded: false, fallbackReason: 'no_matching_sources' }

  // No brain yet -> stated fallback, before we even embed.
  const sources = (await brainStore.listSources(companyId)) || []
  if (!sources.some((s) => s.status === 'active')) return NO_MATCH

  const goalText = String(goal == null ? '' : goal)
  const appText = String(app == null ? '' : app)
  const queryText = [goalText, appText].filter((s) => s.trim()).join(' \n ')
  if (!queryText.trim()) return NO_MATCH

  // Embed the query under the SAME model the tenant's passages were embedded with,
  // so query and passage vectors share one space (and one dim). The pinned model
  // is recorded on each active source as `embeddingModelVersion` (id@rev); it is
  // the default EMBED unless the tenant was re-embedded by a larger model. An
  // unknown/absent version falls back to the default, matching legacy tenants.
  const queryModel = activeEmbedModel(sources)

  // Candidate pool from the dense arm. Pool size K1 = max(topK*4, 20).
  const K1 = Math.max(topK * 4, 20)
  const qVector = await embedQueryWith(queryModel, queryText)
  const pool = (await brainStore.query(companyId, qVector, K1)) || []
  if (!pool.length) return NO_MATCH

  // Score both arms over the resident pool.
  const queryTerms = tokenize(`${goalText} ${appText}`)
  const docTokenSets = pool.map((h) => tokenize(h.text || ''))
  const rawVector = pool.map((h) => Number(h.vectorScore) || 0)
  const rawKeyword = bm25Scores(queryTerms, docTokenSets)

  const normVector = minMaxNormalize(rawVector)
  const normKeyword = minMaxNormalize(rawKeyword)

  // Recency map for the tiebreak (per source update cursor).
  const recencyBySource = new Map()
  for (const s of sources) {
    const t = Date.parse(s.updatedAt || s.modifiedTime || s.createdAt)
    recencyBySource.set(String(s.sourceId), Number.isNaN(t) ? 0 : t)
  }

  // Exact multi-word phrase match of the goal (verbatim, case-insensitive).
  const phrase = normalizeText(goalText).toLowerCase().replace(/\s+/g, ' ').trim()
  const phraseIsMultiWord = phrase.split(' ').filter(Boolean).length >= 2

  const scored = pool.map((h, i) => {
    const vectorScore = rawVector[i]
    const keywordScore = rawKeyword[i]
    let score = VECTOR_WEIGHT * normVector[i] + KEYWORD_WEIGHT * normKeyword[i]
    const chunkText = (h.text || '').toLowerCase().replace(/\s+/g, ' ')
    if (phraseIsMultiWord && chunkText.includes(phrase)) score += PHRASE_BONUS
    const realEvidence = vectorScore >= RAW_VECTOR_FLOOR || keywordScore > 0
    return {
      chunkId: h.chunkId,
      sourceId: h.sourceId,
      sourceTitle: h.sourceTitle,
      text: h.text,
      vectorScore,
      keywordScore,
      score,
      _real: realEvidence,
      _recency: recencyBySource.get(String(h.sourceId)) || 0,
    }
  })

  // Keep only real-evidence hits that clear the fused floor.
  let kept = scored.filter((h) => h._real && h.score >= MIN_SCORE)
  if (!kept.length) return NO_MATCH

  // Re-rank: score desc, recency desc as the tiebreak.
  kept.sort((a, b) => (b.score - a.score) || (b._recency - a._recency))

  // Source-diversity cap: at most SOURCE_DIVERSITY_CAP hits per sourceId.
  const perSource = new Map()
  const diversified = []
  for (const h of kept) {
    const k = String(h.sourceId)
    const n = perSource.get(k) || 0
    if (n >= SOURCE_DIVERSITY_CAP) continue
    perSource.set(k, n + 1)
    diversified.push(h)
    if (diversified.length >= topK) break
  }

  const hits = diversified.map((h) => ({
    chunkId: h.chunkId,
    sourceId: h.sourceId,
    sourceTitle: h.sourceTitle, // provenance
    text: h.text,
    vectorScore: h.vectorScore,
    keywordScore: h.keywordScore,
    score: h.score,
  }))

  if (!hits.length) return NO_MATCH
  return { hits, grounded: true }
}

export default { retrieveForGoal }
