// Enterprise allocation GROUPS (the company's "pools"): the client-side registry of
// the pool ids the server governs people by (server/enterprise_quota.js ALLOC_GROUPS;
// the browser cannot import server code, so this is the ONE client copy - every
// console surface reads it from here, never from a local literal list; SUPREME II).
// A person without an explicit group falls back to DEFAULT_ALLOC_GROUP, exactly as
// the server defaults a plain member (enterprise_quota.defaultAllocGroup).
export const ALLOC_GROUPS = ['admin', 'supervisor', 'member']
export const DEFAULT_ALLOC_GROUP = 'member'

// Derive the pools a company actually has from its team roster: every allocGroup
// present on a member, in canonical order, plus the default pool so the list is
// never empty and a newly added member always lands in a governed pool. Unknown
// group ids the server may add later are kept (appended, alphabetical) so a pool
// is never silently dropped (SUPREME VIII). Each pool carries its head count.
export function poolsFromRoster(users) {
  const counts = new Map()
  for (const u of Array.isArray(users) ? users : []) {
    const g = (u && typeof u.allocGroup === 'string' && u.allocGroup) || DEFAULT_ALLOC_GROUP
    counts.set(g, (counts.get(g) || 0) + 1)
  }
  if (!counts.has(DEFAULT_ALLOC_GROUP)) counts.set(DEFAULT_ALLOC_GROUP, 0)
  const known = ALLOC_GROUPS.filter((g) => counts.has(g))
  const extra = [...counts.keys()].filter((g) => !ALLOC_GROUPS.includes(g)).sort()
  return [...known, ...extra].map((id) => ({ id, count: counts.get(id) || 0 }))
}
