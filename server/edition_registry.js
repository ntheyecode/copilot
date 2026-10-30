// ---------------------------------------------------------------------------
// WorkCoPilot deployment editions: the ONE capability registry.
// ---------------------------------------------------------------------------
// One codebase ships as several deployment editions. An edition is a PROFILE:
// a named set of CAPABILITIES. Code never asks "which edition is this?"; it asks
// "is this capability on?" (`caps.has('solo_signup')`). A new edition is a new
// entry here, never a scattered `if (edition === ...)`.
//
// Single source of truth. server/edition.js resolves the active edition from
// the environment; the SPA learns the active capabilities from GET
// /api/work/edition. The file is pure data plus pure functions (no Node or
// browser APIs), so a client module can also import it directly, the way
// src/shared tests import server modules, with no mirror to keep in sync.
// It lives in server/ because that is the folder the server deploy ships.
//
// A capability is a definition. Whether a call site enforces it yet is listed
// in docs/deployment-editions.md ("Wired call sites" / "Not wired yet").
//
// Default edition is `all`, which turns on exactly what the product does today,
// so a server started with no edition config behaves as before.
// ---------------------------------------------------------------------------

// Every capability an edition can enable, with what it means. A call site may
// only ask about an id listed here (has() throws on an unknown id, so a typo
// fails loudly instead of silently reading as "off").
export const CAPABILITIES = Object.freeze({
  solo_signup: 'Individuals can create their own account (email sign-up, the subscribe onboarding, and first-time social sign-in).',
  saas_companies: 'Many company tenants share this server; the platform superadmin creates and manages companies.',
  single_company: 'This server hosts exactly one company tenant (the customer who runs or owns the installation).',
  paid_only: 'There is no free tier: every individual account needs an active paid plan.',
  stripe_billing: 'Plans, checkout, invoices and refunds run through Stripe.',
  offline_licensing: 'Entitlements come from a signed license on the installation instead of Stripe.',
  onprem_setup: 'A first-run setup configures persistence, the first admin, AI keys and licensing.',
  platform_ai: 'The platform AI providers configured by AdmireVeda may serve this installation.',
  ai_custody_customer: 'The customer holds the keys: their own AI provider keys and customer-held Company Brain custody are the default.',
  brain_export: 'Executives can export the Company Brain as an encrypted archive.',
  brain_query: 'The read-only Company Brain query interface is available.',
  external_db: 'Persistence can point at a database the customer owns (a connection string given at setup).',
  public_site: 'The public marketing pages, pricing and the "validate it live" lead capture are served.',
})

// The editions. `capabilities` lists every capability the edition turns on;
// anything not listed is off. Keep the lists explicit (no inheritance) so one
// line answers "does edition X have Y?".
export const EDITIONS = Object.freeze({
  // 1. Everything we run today on admireveda.com: individuals and companies.
  all: {
    label: 'All-inclusive',
    summary: 'Solo users and SaaS company tenants on our hosted service.',
    capabilities: ['solo_signup', 'saas_companies', 'stripe_billing', 'platform_ai', 'brain_export', 'brain_query', 'public_site'],
  },
  // 2. Hosted, companies only: accounts come from company admins and SSO.
  saas: {
    label: 'SaaS companies',
    summary: 'Company tenants on our hosted service; no individual sign-up.',
    capabilities: ['saas_companies', 'stripe_billing', 'platform_ai', 'brain_export', 'brain_query', 'public_site'],
  },
  // 3. Hosted, paying individuals only: no company tenancy, no free tier.
  paid: {
    label: 'Paying users',
    summary: 'Individual accounts on a paid plan; no free tier and no company tenants.',
    capabilities: ['solo_signup', 'paid_only', 'stripe_billing', 'platform_ai', 'public_site'],
  },
  // 4. The customer runs it on their own servers. One company, their own AI
  // keys, offline license, any of the three persistence choices.
  onprem: {
    label: 'On-premises',
    summary: 'Installed on the customer\'s own servers: one company, customer-held keys, offline license.',
    capabilities: ['single_company', 'onprem_setup', 'offline_licensing', 'ai_custody_customer', 'brain_export', 'brain_query', 'external_db'],
  },
  // 5. Managed private cloud: we operate a dedicated install in the customer's
  // cloud. Differs from onprem in two real ways: our cloud AI serves it
  // (platform_ai, billed at usage), and it is invoiced by us, not activated by
  // an offline license. Persistence is the customer's cloud database.
  managed: {
    label: 'Managed private cloud',
    summary: 'A dedicated install we operate in the customer\'s cloud, on their database, with our AI at usage.',
    capabilities: ['single_company', 'onprem_setup', 'platform_ai', 'ai_custody_customer', 'brain_export', 'brain_query', 'external_db'],
  },
})

export const DEFAULT_EDITION = 'all'

// Pairs that can never be on together (validated at import, below).
const EXCLUSIVE = [['saas_companies', 'single_company'], ['stripe_billing', 'offline_licensing']]

function validateRegistry() {
  for (const [name, ed] of Object.entries(EDITIONS)) {
    for (const cap of ed.capabilities) {
      if (!Object.hasOwn(CAPABILITIES, cap)) throw new Error(`[editions] edition "${name}" lists unknown capability "${cap}".`)
    }
    if (new Set(ed.capabilities).size !== ed.capabilities.length) throw new Error(`[editions] edition "${name}" lists a capability twice.`)
    for (const [a, b] of EXCLUSIVE) {
      if (ed.capabilities.includes(a) && ed.capabilities.includes(b)) throw new Error(`[editions] edition "${name}" turns on both "${a}" and "${b}", which exclude each other.`)
    }
    Object.freeze(ed.capabilities)
    Object.freeze(ed)
  }
  if (!EDITIONS[DEFAULT_EDITION]) throw new Error(`[editions] the default edition "${DEFAULT_EDITION}" is not defined.`)
}
validateRegistry()

export const EDITION_IDS = Object.freeze(Object.keys(EDITIONS))

// Turn a configured value into an edition id. Empty means the default. An
// unknown value throws with the valid choices: a typo in the deployment config
// must stop the server, never quietly run as a different edition.
export function resolveEditionId(value) {
  const v = String(value == null ? '' : value).trim().toLowerCase()
  if (!v) return DEFAULT_EDITION
  if (!Object.hasOwn(EDITIONS, v)) throw new Error(`[editions] unknown edition "${value}". Set WORK_EDITION to one of: ${EDITION_IDS.join(', ')} (or leave it unset for "${DEFAULT_EDITION}").`)
  return v
}

// The capability set of one edition: { edition, label, has(cap), list() }.
// has() rejects an id that is not in CAPABILITIES.
export function makeCaps(editionId) {
  const id = resolveEditionId(editionId)
  const on = new Set(EDITIONS[id].capabilities)
  return Object.freeze({
    edition: id,
    label: EDITIONS[id].label,
    has(cap) {
      if (!Object.hasOwn(CAPABILITIES, cap)) throw new Error(`[editions] unknown capability "${cap}". Add it to CAPABILITIES in server/edition_registry.js first.`)
      return on.has(cap)
    },
    list() { return Object.keys(CAPABILITIES).filter((c) => on.has(c)) },
  })
}
