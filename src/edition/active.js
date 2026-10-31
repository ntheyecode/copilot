// The SPA's ONE live capability set (browser state, no React).
//
// Boot order:
//   1. At import: the capabilities stamped into the page
//      (<meta name="wcp-capabilities">, written by build/spa_stamp.js when an
//      edition is composed), so the very first paint is already right. A build
//      with no stamp (dev, or today's plain `npm run build`) starts from the
//      default edition's capabilities, which is today's product.
//   2. confirmCaps(): GET /api/work/edition. The server is the authority (it
//      enforces every capability); if it disagrees with the stamp, its answer
//      wins, subscribers re-render, and the mismatch is logged so a wrongly
//      stamped deploy is visible instead of silently half-right.
// Nothing here reads an edition id; only the capability list.
import { CAPS_META, DEFAULT_CAPS, capsFromList, parseCapsStamp, sameCaps } from '../shared/edition_caps.js'

const warn = (m) => { try { console.warn(m) } catch { /* no console */ } }

function readStamp() {
  try {
    const el = typeof document !== 'undefined' ? document.querySelector(`meta[name="${CAPS_META}"]`) : null
    return el ? parseCapsStamp(el.getAttribute('content')) : null
  } catch { return null }
}

let current = capsFromList(readStamp() || DEFAULT_CAPS, { warn })
const listeners = new Set()

export function getCaps() { return current }

export function subscribeCaps(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function setCaps(next) {
  if (sameCaps(current, next)) return
  current = next
  for (const fn of [...listeners]) { try { fn(current) } catch (e) { warn(`[editions] listener failed: ${e && e.message}`) } }
}

// Ask the server once. Never rejects: on a network failure the stamped (or
// default) set stays, which is what the server was deployed with.
let pending = null
export function confirmCaps() {
  if (pending) return pending
  pending = (async () => {
    try {
      const r = await fetch('/api/work/edition', { credentials: 'same-origin' })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const j = await r.json()
      const next = capsFromList(j && j.capabilities, { warn })
      if (!sameCaps(current, next)) warn(`[editions] the page was built for capabilities [${current.key}] but the server runs [${next.key}]; using the server's. Re-stamp the SPA for this server (docs/deployment-editions.md, "Deploy checklist").`)
      setCaps(next)
    } catch (e) {
      warn(`[editions] could not confirm capabilities with the server (${e && e.message}); keeping [${current.key}].`)
    }
    return current
  })()
  return pending
}
