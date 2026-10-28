// Guidance DEPTH entitlement, client side. Mirrors the server's pure module
// (server/guidance_depth.js) so both consoles reason about depth from ONE place:
//   'standard' = single-task guidance (Lite / Basic / Advanced).
//   'deep'     = Projects: a large goal planned as a map of tasks (Premium level).
// The superadmin grants a company a CEILING; the company admin assigns each pool a
// depth that can never exceed it (the server clamps; the UI locks the option and
// says why, so the operator is never left guessing - SUPREME VIII).
export const WORK_DEPTHS = ['standard', 'deep']
const RANK = { standard: 1, deep: 2 }

export function normalizeDepth(d) { return WORK_DEPTHS.includes(String(d || '')) ? String(d) : 'standard' }
export function depthRank(d) { return RANK[normalizeDepth(d)] }

// Is `depth` assignable under `ceiling`? (Deep under a Standard grant is not.)
export function depthWithinCeiling(depth, ceiling) { return depthRank(depth) <= depthRank(ceiling) }

// The depth a pool actually runs at: its assignment clamped to the ceiling; an
// unassigned pool inherits the ceiling itself (same rule as the server resolver).
export function effectivePoolDepth(poolDepth, ceiling) {
  const c = normalizeDepth(ceiling)
  if (poolDepth == null || poolDepth === '') return c
  const p = normalizeDepth(poolDepth)
  return depthWithinCeiling(p, c) ? p : c
}
