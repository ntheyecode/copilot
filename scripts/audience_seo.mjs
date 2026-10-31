// Crawler-visible copy that differs by AUDIENCE (copyAudience in
// server/edition_registry.js): the static SPA shell (dist/index.html: JSON-LD
// offers, the cost FAQ answer, the <noscript> plans line) and the prerendered
// marketing routes (scripts/prerender-marketing.mjs).
//
// The base copy (audience null: both audiences, the default edition) is NOT repeated here: it
// stays in index.html and the prerender script exactly as before. Only the
// lines that speak to one audience are listed, keyed by the audience, never by
// an edition id. English only: these are the no-JavaScript / crawler fallback
// lines, and the live page renders the visitor's language from the i18n
// overlays (src/i18n/overlays/<audience>/).
//
// Copy rules: honest (no claim the product cannot back), no em-dashes, no
// provider or model names. The individuals copy carries no company wording.
import { BANDS, MIN_USERS, orgPlan } from '../server/org_pricing.js'

// Prices from the ONE registry (server/org_pricing.js), never typed here.
const usd = (n) => `$${n}`
const lowest = (p) => (p.flat != null ? p.flat : Math.min(...Object.values(p.rates)))
const bands = (p) => BANDS.map((b) => `${usd(p.rates[b.id])} for ${b.min.toLocaleString('en-US')}${b.max == null ? '+' : `-${b.max.toLocaleString('en-US')}`} users`).join(', ')
const HOSTED = orgPlan('hosted')
const MANAGED = orgPlan('managed')
const PRIVATE = orgPlan('private')

export const AUDIENCE_SHELL = {
  organizations: {
    offers: [
      { '@type': 'Offer', name: 'Hosted by AdmireVeda', category: 'subscription', priceCurrency: 'USD', price: String(lowest(HOSTED)), description: `WorkCoPilot for your whole organization on our hosted service, AI included: company console, single sign-on, SCIM provisioning, company policy and a guided-hours pool. Per user per month: ${bands(HOSTED)}. Minimum ${MIN_USERS} users; talk to us.` },
      { '@type': 'Offer', name: 'Managed by AdmireVeda', category: 'subscription', priceCurrency: 'USD', price: String(lowest(MANAGED)), description: `We run WorkCoPilot for you, connected to your own database. ${usd(MANAGED.flat)} per user per month plus AI at actual usage. Minimum ${MIN_USERS} users; talk to us.` },
      { '@type': 'Offer', name: 'Private instance', category: 'subscription', priceCurrency: 'USD', price: String(lowest(PRIVATE)), description: `WorkCoPilot in your own cloud on your own AI keys. Per user per month: ${bands(PRIVATE)}. Minimum ${MIN_USERS} users; talk to us.` },
    ],
    costAnswer: `WorkCoPilot is sold to organizations, per user per month with a ${MIN_USERS}-user minimum: hosted by AdmireVeda from ${usd(lowest(HOSTED))}, managed by AdmireVeda at ${usd(MANAGED.flat)} plus AI at usage, or a private instance in your own cloud from ${usd(lowest(PRIVATE))}. Your company size sets the rate for every user. Talk to us.`,
    noscriptPlans: 'Plans for organizations: hosted by AdmireVeda, managed by AdmireVeda, or a private instance. <a href="/workcopilot/contact">Talk to us</a> · <a href="/workcopilot">Sign in to WorkCoPilot</a> · <a href="/workcopilot/use-cases">See the use cases</a>.',
  },
  individuals: {
    offers: [
      { '@type': 'Offer', name: 'Lite', category: 'subscription', description: 'The entry plan: guided hours every month, one task walked through step by step. Current price on the pricing page.' },
      { '@type': 'Offer', name: 'Basic', category: 'subscription', description: 'More guided hours every month, exact commands and code, and roadmaps. Current price on the pricing page.' },
      { '@type': 'Offer', name: 'Advanced', category: 'subscription', description: 'More monthly hours, plus your own document upload and visual examples. Current price on the pricing page.' },
      { '@type': 'Offer', name: 'Premium', category: 'subscription', description: 'The most monthly hours, plus generated visuals and priority guidance. Current price on the pricing page.' },
    ],
    costAnswer: 'WorkCoPilot has four personal plans, Lite, Basic, Advanced and Premium, each with hours of live guidance every month. Extra hours can be bought anytime. Current prices are shown on the pricing page.',
    noscriptPlans: 'Personal plans: Lite, Basic, Advanced and Premium. <a href="/workcopilot/pricing">See pricing</a> · <a href="/workcopilot">Sign in to WorkCoPilot</a> · <a href="/workcopilot/use-cases">See the use cases</a>.',
  },
}

// Prerendered route copy per audience: { [routePath]: { lede?, points? } }.
// Any of label, h1, lede, points replaces the base route's value.
// These describe the organization pages read with the audience's overlay.
// Where an edition serves the individuals site (capability individual_site),
// that site's pages replace those routes wholesale with their own copy
// (src/sites/individuals/seo_pages.js), so nothing here speaks for them.
export const AUDIENCE_ROUTES = {
  organizations: {
    '/workcopilot': {
      label: 'Sign in',
      lede: [
        'AdmireVeda\'s WorkCoPilot sits beside each person on your team and guides any task, step by step, all the way to done.',
        'WorkCoPilot is for organizations. Accounts come from your company administrator or your company single sign-on. To bring it to your company, talk to us.',
      ],
    },
    '/workcopilot/pricing': {
      h1: 'Plans for organizations. Real guided time.',
      lede: [
        `WorkCoPilot is sold to organizations, per user per month with a ${MIN_USERS}-user minimum, with a guided-hours pool your company administrator shares out.`,
        'Talk to us. Security and privacy are built into every deployment, never sold as an upgrade.',
      ],
      points: [
        `Hosted by AdmireVeda, AI included: ${bands(HOSTED)}.`,
        `Managed by AdmireVeda, on your own database: ${usd(MANAGED.flat)} per user per month plus AI at actual usage.`,
        `Private instance in your own cloud, on your own AI keys: ${bands(PRIVATE)}.`,
        'Company Brain and teach workflows: your own know-how, kept private to your company and used in every guided step.',
      ],
    },
  },
  individuals: {
    '/workcopilot': {
      lede: [
        'AdmireVeda\'s WorkCoPilot sits beside you and guides any task, step by step, all the way to done.',
        'Create your account, pick a personal plan, and start guiding.',
      ],
    },
    '/workcopilot/fields': {
      lede: [
        'WorkCoPilot guides work across many professional fields, and the steps read like an expert in that field wrote them.',
      ],
    },
    '/workcopilot/pricing': {
      lede: [
        'Personal plans with guided hours every month. Plans differ in monthly hours and a few power features. Security and privacy are built into every plan, never sold as an upgrade.',
        'Current prices are shown on the live page.',
      ],
      points: [
        'Lite, Basic, Advanced and Premium: each with its own monthly guided hours.',
        'Advanced adds uploading your own reference documents and visual examples.',
        'Premium adds generated visuals on demand and the highest priority.',
        'Plans are billed monthly or yearly and you can cancel yourself anytime.',
      ],
    },
    '/workcopilot/security': {
      points: [
        'On your screen: each outbound frame is checked on your device, and any line with a sensitive value is blacked out before the frame leaves.',
        'In your text: typed or pasted text gets the same protection. Each sensitive value becomes a token, the real values never leave your device, and the answer is rebuilt locally.',
        'Read-only by design: it never clicks, types or runs anything in your systems.',
        'A plain account of how your data moves and how long we keep it, as a disclosure of what the product does today, not a compliance claim.',
      ],
    },
  },
}

// Apply a route override (pure; the base route object is not changed).
export function routeFor(route, audience) {
  const o = audience && AUDIENCE_ROUTES[audience] && AUDIENCE_ROUTES[audience][route.path]
  if (!o) return route
  const out = { ...route }
  for (const k of ['label', 'h1', 'lede', 'points']) if (o[k] !== undefined) out[k] = o[k]
  return out
}
