// Edition expectations come from the product's ONE capability registry
// (server/edition_registry.js), never from a hand-kept copy: when an edition
// gains or loses a capability, these expectations move with it.
import { makeCaps } from '../../server/edition_registry.js'

export function capsOf(edition) { return makeCaps(edition) }

// Skip a test when the edition does not offer the capability the flow needs,
// with a reason that names the capability, e.g. company flows on `paid`.
export function needCap(test, edition, cap) {
  const caps = makeCaps(edition)
  test.skip(!caps.has(cap), `Edition "${edition}" has no "${cap}" capability, so this flow does not exist there.`)
}
