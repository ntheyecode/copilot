// Client view of the deployment-edition capabilities (pure, no React, no DOM).
//
// The registry itself is NOT copied here: CAPABILITIES, the editions and the
// derived rules (companyTenancy, copyAudience) are imported from
// server/edition_registry.js, which is pure data plus pure functions written to
// be shared with the SPA (the same way src/ already imports
// server/compliance_frameworks.js). So there is no client list to drift; the
// parity test (edition_caps.test.mjs) proves the client answers every question
// exactly like the server for every edition.
//
// The SPA only ever learns a capability LIST (from the page's
// <meta name="wcp-capabilities"> stamp or GET /api/work/edition), never asks
// which edition it is, and every gated surface calls caps.has('<capability>').
import { CAPABILITIES, EDITIONS, DEFAULT_EDITION, companyTenancy, copyAudience } from '../../server/edition_registry.js'

export { companyTenancy, copyAudience }

// The name of the meta tag a deploy step stamps into every built HTML page
// (build/spa_stamp.js), so the first paint already knows the capabilities.
export const CAPS_META = 'wcp-capabilities'

// The default edition's capabilities: what a build with no stamp assumes until
// the server answers. The default edition is today's product, so an unstamped
// build renders exactly as before.
export const DEFAULT_CAPS = Object.freeze(Object.keys(CAPABILITIES).filter((c) => EDITIONS[DEFAULT_EDITION].capabilities.includes(c)))

// A capability set from a list. Unknown ids in the LIST are dropped with a
// warning (a newer server may know more than this build; nothing breaks), but
// has() on an unknown id THROWS, so a typo at a call site fails loudly instead
// of silently reading as "off" (same contract as the server's makeCaps).
export function capsFromList(list, { warn = () => {} } = {}) {
  const on = new Set()
  for (const raw of Array.isArray(list) ? list : []) {
    const id = String(raw || '').trim()
    if (!id) continue
    if (Object.hasOwn(CAPABILITIES, id)) on.add(id)
    else warn(`[editions] ignoring unknown capability "${id}" from the server`)
  }
  const ordered = Object.keys(CAPABILITIES).filter((c) => on.has(c))
  return Object.freeze({
    has(cap) {
      if (!Object.hasOwn(CAPABILITIES, cap)) throw new Error(`[editions] unknown capability "${cap}". Add it to CAPABILITIES in server/edition_registry.js first.`)
      return on.has(cap)
    },
    list() { return [...ordered] },
    key: ordered.join(','),
  })
}

// Parse the meta stamp content ("solo_signup,saas_companies,..."). null when
// the page carries no stamp (dev server, or a build deployed without one).
export function parseCapsStamp(content) {
  if (content == null) return null
  return String(content).split(',').map((s) => s.trim()).filter(Boolean)
}

// Same capability set? (order-insensitive)
export function sameCaps(a, b) {
  return !!a && !!b && a.key === b.key
}
