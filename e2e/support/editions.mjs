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

// UI work that lives on other branches (corporate-only saas look, individuals-only
// paid look, graphical in-app help). The suite already covers the flows that exist
// on this branch; these markers name what to assert once those branches merge.
// Detection is behavioural (does the screen exist yet?), so the tests start
// running by themselves after the merge instead of needing an edit here.
export const PENDING_UI = Object.freeze({
  saasCorporateLook: 'TODO(editions-corp-indiv): saas edition corporate-only marketing and sign-in look is on branch claude/editions-corp-indiv-11f78f; assert it here after the merge.',
  paidIndividualLook: 'TODO(editions-corp-indiv): paid edition individuals-only pricing and sign-up look is on branch claude/editions-corp-indiv-11f78f; assert it here after the merge.',
  newHelpPages: 'TODO(help-new-features): graphical in-app help for the new features is on branch claude/help-new-features-0a5221; assert it here after the merge.',
})
