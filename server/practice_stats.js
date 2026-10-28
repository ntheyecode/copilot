// Recommended Practices - phase 3: the pure outcome-ranking core (model-free).
//
// Phase 1/2 give a deterministic catalog floor (work_practices.js). Phase 3
// layers LEARNING on top: a company's suggestions are re-ordered by what its
// people actually accept and finish, with PLATFORM-WIDE behaviour as a prior so
// a brand-new company still gets a sensible order on day one.
//
// This module is PURE (no IO, no store, no model). It only scores and sorts; it
// NEVER drops a suggestion - the catalog floor is preserved and only re-ordered
// (SUPREME RULE VI: a smarter order must not shrink what is offered). The store
// owns the counters and feeds them in; keeping the maths here makes it testable
// and keeps the scoring in ONE place (SUPREME RULE II). US spelling.

// A counter triple per practice id: how often it was offered, roped in, finished.
export const EMPTY_STAT = { offered: 0, accepted: 0, completed: 0 }
// Smoothing: pull a thin sample toward the prior until there is real evidence.
export const BASE_ACCEPT_PRIOR = 0.35   // a fresh practice's assumed accept rate
export const BASE_COMPLETE_PRIOR = 0.5  // once roped in, assume a coin-flip finish
export const SMOOTH_STRENGTH = 4        // ~this many offers before org data dominates

function stat(s) { return { ...EMPTY_STAT, ...(s && typeof s === 'object' ? s : {}) } }

// Laplace-smoothed rate: (hits + prior*strength) / (trials + strength). With no
// trials it returns the prior; it approaches the raw rate as trials grow.
export function smoothedRate(hits, trials, prior = BASE_ACCEPT_PRIOR, strength = SMOOTH_STRENGTH) {
  const h = Math.max(0, Number(hits) || 0)
  const t = Math.max(0, Number(trials) || 0)
  const k = Math.max(0, Number(strength) || 0)
  return (h + prior * k) / (t + k)
}

// Score one practice for one company. The platform behaviour is the PRIOR the
// company's own history smooths toward, so a new company inherits the crowd and
// a company with real history overrides it. Returns a number in roughly [0,1].
export function practiceScore(orgStat, platformStat) {
  const o = stat(orgStat)
  const pf = stat(platformStat)
  // Platform rates become the priors (fall back to the base priors when the
  // platform itself has no evidence yet).
  const platformAccept = pf.offered > 0 ? smoothedRate(pf.accepted, pf.offered, BASE_ACCEPT_PRIOR) : BASE_ACCEPT_PRIOR
  const platformComplete = pf.accepted > 0 ? smoothedRate(pf.completed, pf.accepted, BASE_COMPLETE_PRIOR) : BASE_COMPLETE_PRIOR
  const accept = smoothedRate(o.accepted, o.offered, platformAccept)
  const complete = smoothedRate(o.completed, o.accepted, platformComplete)
  // Accept rate leads (did people want it); completion is a quality bonus (did it
  // actually get done once roped in).
  return 0.7 * accept + 0.3 * complete
}

// Re-order suggestions by score, highest first, with the incoming (catalog) order
// kept as a stable tiebreak. Pure: returns a new array of the SAME suggestions,
// none added, none removed.
export function rankSuggestions(suggestions, { orgStats = {}, platformStats = {} } = {}) {
  const list = Array.isArray(suggestions) ? suggestions.slice() : []
  const org = orgStats || {}
  const plat = platformStats || {}
  return list
    .map((s, i) => ({ s, i, score: practiceScore(org[s && s.id], plat[s && s.id]) }))
    .sort((a, b) => (b.score - a.score) || (a.i - b.i))
    .map((x) => x.s)
}

export default { EMPTY_STAT, BASE_ACCEPT_PRIOR, BASE_COMPLETE_PRIOR, SMOOTH_STRENGTH, smoothedRate, practiceScore, rankSuggestions }
