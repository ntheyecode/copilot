// Stamp a built SPA (a dist/ folder) for one capability set, so the pages a
// server sends are right from the first byte, before any JavaScript runs:
//
//   1. <meta name="wcp-capabilities" content="..."> in every HTML page, which
//      src/edition/active.js reads at import (no flash of the wrong edition;
//      the SPA still confirms with GET /api/work/edition and the server wins).
//   2. The static shell's audience copy (JSON-LD offers, the cost FAQ answer,
//      the <noscript> plans line) from scripts/audience_seo.mjs.
//   3. The public origin (canonical, hreflang, Open Graph, JSON-LD) when the
//      server is not admireveda.com.
//   4. The prerendered marketing routes, regenerated for that audience
//      (scripts/prerender-marketing.mjs --audience --origin), or removed when
//      the capability set serves no public site.
//
// Capability-driven: the input is a capability LIST, never an edition id.
// The default edition's capabilities with the default origin need no stamp at
// all (an unstamped build IS that edition), so stampSpa leaves such a dist
// byte-for-byte untouched.
//
// Idempotent: a page already stamped with the same capabilities and origin is
// left as is; a page stamped for something else is refused ("rebuild first"),
// because the audience copy cannot be swapped twice.
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { CAPABILITIES, EDITIONS, DEFAULT_EDITION, copyAudience } from '../server/edition_registry.js'
import { AUDIENCE_SHELL } from '../scripts/audience_seo.mjs'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
export const DEFAULT_ORIGIN = 'https://admireveda.com'
const META = 'wcp-capabilities'
const PRERENDER_MARK = 'prerendered-by: scripts/prerender-marketing.mjs'

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function capsOf(list) {
  const on = new Set(list)
  for (const c of on) if (!Object.hasOwn(CAPABILITIES, c)) throw new Error(`[stamp] unknown capability "${c}"`)
  return { has: (c) => on.has(c), list: () => Object.keys(CAPABILITIES).filter((c) => on.has(c)) }
}

export function isDefaultStamp(list, origin = DEFAULT_ORIGIN) {
  const want = Object.keys(CAPABILITIES).filter((c) => EDITIONS[DEFAULT_EDITION].capabilities.includes(c)).join(',')
  return capsOf(list).list().join(',') === want && String(origin).replace(/\/+$/, '') === DEFAULT_ORIGIN
}

function htmlFiles(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) htmlFiles(p, out)
    else if (e.name === 'index.html') out.push(p)
  }
  return out
}

function readStamp(html) {
  const m = html.match(new RegExp(`<meta name="${META}" content="([^"]*)"(?: data-origin="([^"]*)")?\\s*/?>`))
  return m ? { caps: m[1], origin: m[2] || DEFAULT_ORIGIN } : null
}

// One exact replacement or a loud failure (a silent no-op would ship the base
// copy to the wrong audience).
function swap(html, re, replacement, what) {
  if (!re.test(html)) throw new Error(`[stamp] dist/index.html is missing ${what}; the shell changed shape, update build/spa_stamp.js`)
  return html.replace(re, () => replacement)
}

// The shell (dist/index.html) for an audience + origin. Pure.
export function stampShell(html, list, { origin = DEFAULT_ORIGIN } = {}) {
  const caps = capsOf(list)
  const key = caps.list().join(',')
  let h = html
  h = swap(h, /<meta charset="UTF-8" \/>/i, `<meta charset="UTF-8" />\n    <meta name="${META}" content="${esc(key)}" data-origin="${esc(origin)}" />`, 'the <meta charset> line')
  const aud = copyAudience(caps)
  const shell = aud && AUDIENCE_SHELL[aud]
  if (shell) {
    // JSON-LD offers: the whole array, re-serialized at the shell's indent.
    h = swap(h, /"offers": \[[\s\S]*?\n {10}\]/, `"offers": [\n${shell.offers.map((o) => `            ${JSON.stringify(o)}`).join(',\n')}\n          ]`, 'the JSON-LD offers array')
    // (swap() inserts its replacement literally, so the kept prefix is matched
    // with a lookbehind instead of a $1 back-reference.)
    h = swap(h, /(?<=\{ "@type": "Question", "name": "How much does it cost\?", "acceptedAnswer": \{ "@type": "Answer", "text": )"[^"]*"/, JSON.stringify(shell.costAnswer), 'the cost FAQ answer')
    h = swap(h, /<p>Self-service plans[\s\S]*?<\/p>/, `<p>${shell.noscriptPlans}</p>`, 'the <noscript> plans line')
  }
  if (origin !== DEFAULT_ORIGIN) h = h.split(DEFAULT_ORIGIN).join(origin)
  return h
}

// Regenerate the prerendered marketing routes for this audience from the
// (already stamped) shell. Returns how many routes were written.
function runPrerender(distDir, caps, origin) {
  const aud = copyAudience(caps)
  const args = [path.join(ROOT, 'scripts', 'prerender-marketing.mjs'), '--dist', distDir, '--origin', origin, ...(aud ? ['--audience', aud] : [])]
  const outText = execFileSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  return (outText.match(/^prerender: \//gm) || []).length
}

// Stamp a dist folder in place. Returns what was done.
export function stampSpa(distDir, list, { origin = DEFAULT_ORIGIN, prerender = true } = {}) {
  const o = String(origin || DEFAULT_ORIGIN).replace(/\/+$/, '')
  if (!/^https?:\/\/[^/\s]+$/.test(o)) throw new Error(`[stamp] the origin must be a bare origin like https://example.com (got "${origin}")`)
  const shellPath = path.join(distDir, 'index.html')
  if (!fs.existsSync(shellPath)) throw new Error(`[stamp] ${shellPath} is missing. Run "npm run build" first.`)
  if (isDefaultStamp(list, o)) return { stamped: false, reason: 'default capabilities and origin: the unstamped build is already right' }
  const caps = capsOf(list)
  const key = caps.list().join(',')
  const shell = fs.readFileSync(shellPath, 'utf8')
  const prior = readStamp(shell)
  if (prior) {
    if (prior.caps === key && prior.origin === o) {
      // Same stamp. If an earlier run died between the shell and the
      // prerender, the routes are missing: finish that step now instead of
      // shipping a stamped dist with no crawler pages.
      const hasRoutes = htmlFiles(distDir).some((f) => f !== shellPath && fs.readFileSync(f, 'utf8').includes(PRERENDER_MARK))
      if (prerender && caps.has('public_site') && !hasRoutes) return { stamped: true, capabilities: key, origin: o, audience: copyAudience(caps), prerenderedRoutes: runPrerender(distDir, caps, o), resumed: true }
      return { stamped: false, reason: 'already stamped for these capabilities and origin' }
    }
    throw new Error(`[stamp] ${shellPath} is already stamped for [${prior.caps}] at ${prior.origin}. Rebuild the SPA (npm run build) and stamp the fresh dist.`)
  }
  // Generated marketing pages derive from the shell; drop them first so none
  // is left with the base audience's copy.
  for (const f of htmlFiles(distDir)) {
    if (f === shellPath) continue
    if (fs.readFileSync(f, 'utf8').includes(PRERENDER_MARK)) fs.rmSync(f)
  }
  const tmp = shellPath + '.tmp'
  fs.writeFileSync(tmp, stampShell(shell, list, { origin: o }))
  fs.renameSync(tmp, shellPath)
  const routes = prerender && caps.has('public_site') ? runPrerender(distDir, caps, o) : 0
  // Every other HTML page (a hand-placed one) still gets the meta tag.
  for (const f of htmlFiles(distDir)) {
    const h = fs.readFileSync(f, 'utf8')
    if (!readStamp(h)) fs.writeFileSync(f, swap(h, /<meta charset="UTF-8" \/>/i, `<meta charset="UTF-8" />\n    <meta name="${META}" content="${esc(key)}" data-origin="${esc(o)}" />`, `the <meta charset> line in ${f}`))
  }
  return { stamped: true, capabilities: key, origin: o, audience: copyAudience(caps), prerenderedRoutes: routes }
}
