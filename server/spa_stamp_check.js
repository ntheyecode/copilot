// Startup check: does the built SPA (dist/index.html) carry the capability
// stamp of THIS server? A dist deployed without `npm run stamp:spa` (or stamped
// for another edition) would paint the wrong edition first and, worse, serve
// crawlers prerendered copy for the wrong audience; nginx serves dist directly,
// so the server cannot fix the page on the fly. It says so loudly with the fix
// instead (never a silent mismatch, never a refusal to start: the API still
// enforces every capability).
import fs from 'node:fs'
import path from 'node:path'
import { CAPABILITIES, EDITIONS, DEFAULT_EDITION } from './edition_registry.js'

const META_RE = /<meta name="wcp-capabilities" content="([^"]*)"/

// Pure: (index.html text, server capability list) -> null when they agree, or
// a message naming the fix.
export function spaStampProblem(html, serverCaps) {
  const want = Object.keys(CAPABILITIES).filter((c) => serverCaps.includes(c)).join(',')
  const dflt = Object.keys(CAPABILITIES).filter((c) => EDITIONS[DEFAULT_EDITION].capabilities.includes(c)).join(',')
  const m = String(html || '').match(META_RE)
  const got = m ? m[1] : null
  if (got === want) return null
  if (got === null && want === dflt) return null   // an unstamped build IS the default edition
  return `[editions] dist/index.html is stamped for [${got === null ? 'nothing (an unstamped build reads as the default edition)' : got}] but this server runs [${want}]. `
    + 'Visitors see the wrong edition until the page asks the server, and crawlers index the wrong copy. '
    + 'Fix: deploy a bundle from `npm run compose -- --edition <id>`, or run `npm run build && npm run stamp:spa -- --edition <id>` and redeploy dist/.'
}

export function checkSpaStamp(distDir, serverCaps, log = console.error) {
  const f = path.join(distDir, 'index.html')
  if (!fs.existsSync(f)) return null
  let problem = null
  try { problem = spaStampProblem(fs.readFileSync(f, 'utf8'), serverCaps) } catch { return null }
  if (problem) log(problem)
  return problem
}
