// Edition expectations come from the product's ONE capability registry
// (server/edition_registry.js), never from a hand-kept copy: when an edition
// gains or loses a capability, these expectations move with it.
import { makeCaps } from '../../server/edition_registry.js'

export function capsOf(edition) { return makeCaps(edition) }
