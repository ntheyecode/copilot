// ONE source of truth for guidance DEPTH entitlement.
//   Depth 1 = 'standard' : single-task guidance (Lite / Basic / Advanced, regular).
//   Depth 2 = 'deep'     : Projects (Premium, or a company pool granted Deep).
// Pure logic, deliberately separated from the store so it is unit-tested without db
// state (SUPREME II single-source, XV small module). store.effectiveGuidanceDepth reads
// the user + company and delegates here. A pool assignment can NEVER exceed the company
// ceiling - the company admin distributes WITHIN the superadmin's grant.
export const WORK_DEPTHS = ['standard', 'deep']
const RANK = { standard: 1, deep: 2 }

export function normalizeDepth(d) { return WORK_DEPTHS.includes(String(d || '')) ? String(d) : 'standard' }
export function depthRank(d) { return RANK[normalizeDepth(d)] }

// Clamp a wanted depth to a ceiling: never exceed it (admin cannot grant beyond the
// superadmin grant), but a lower want is honored.
export function clampDepth(want, ceiling) {
  const w = normalizeDepth(want)
  const c = normalizeDepth(ceiling)
  return depthRank(w) <= depthRank(c) ? w : c
}

// Resolve the effective depth from the account shape.
//  - Individual: Premium = deep; Lite / Basic / Advanced = standard.
//  - Company member: the pool (allocGroup) assignment clamped to the company ceiling;
//    an unset pool defaults to the ceiling itself.
export function resolveGuidanceDepth({ tier, isCompanyMember = false, companyCeiling = null, poolDepth = null } = {}) {
  if (isCompanyMember) {
    const ceiling = normalizeDepth(companyCeiling)
    return clampDepth(poolDepth == null ? ceiling : poolDepth, ceiling)
  }
  return tier === 'premium' ? 'deep' : 'standard'
}

// Projects (Depth 2) are available only at 'deep'.
export function canUseProjects(depth) { return normalizeDepth(depth) === 'deep' }
