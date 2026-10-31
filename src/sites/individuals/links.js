// The LinkNotes site's routes, once: the nav links, the sign-in page, the
// pricing page (the "get started" destination) and the funnel hand-off the
// live widget uses. Pure, no React, so the header, the footer, every page
// and the SEO table read the same paths.
export const INDIV_LINKS = Object.freeze([
  { key: 'how', href: '/workcopilot/how-it-works' },
  { key: 'use', href: '/workcopilot/use-cases' },
  { key: 'pricing', href: '/workcopilot/pricing' },
  { key: 'security', href: '/workcopilot/security' },
  { key: 'faq', href: '/workcopilot/faq' },
])
export const SIGN_IN = '/workcopilot'
export const START = '/workcopilot/pricing'
export const CONTACT = '/workcopilot/contact'

// Where the live widget sends a visitor after the taste: the LinkNotes pricing
// page with the recommended plan ribboned (?plan=<id>&from=validate); choosing
// a plan there carries it to sign-up, and the account step continues straight
// into Stripe Checkout. Same path for "compare all plans" (no plan).
export function pricingHref(plan) {
  return `${START}${plan ? `?plan=${encodeURIComponent(plan)}&from=validate` : ''}`
}
export function toPricing(plan) {
  try { window.location.href = pricingHref(plan) } catch { /* no window: nothing to navigate */ }
}

// Opens the live widget (src/components/LiveValidate.jsx listens for this).
export function openLiveWidget() {
  try { window.dispatchEvent(new CustomEvent('wc:open-validate')) } catch { /* no window */ }
}
