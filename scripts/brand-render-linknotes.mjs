// Render the LinkNotes brand files from the ONE mark definition
// (src/components/brand/LinkNotesLogo.jsx LN_MARK + colors) into
// public/brand/linknotes/: mark.svg, favicon.svg, logo.svg, and the PNG icons the
// deploy stamp points the individuals page shell at (build/spa_stamp.js):
// favicon-32.png, favicon-192.png, apple-touch-icon.png (180, solid background),
// icon-512.png (transparent). The SVG stays the source of truth; the PNGs are
// screenshots of it at exact sizes through Playwright's bundled Chromium.
//
//   node scripts/brand-render-linknotes.mjs
import { mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { chromium } from '@playwright/test'

// The mark constants live in a .jsx module (React), so they are read from its
// source text rather than imported; the regexes anchor on the exported names.
import { readFileSync } from 'node:fs'
const src = readFileSync(resolve('src/components/brand/LinkNotesLogo.jsx'), 'utf8')
const pick = (name) => { const m = src.match(new RegExp(`export const ${name} = '([^']+)'`)); if (!m) throw new Error(`${name} not found`); return m[1] }
const VIOLET_LIGHT = pick('LN_VIOLET_LIGHT'), VIOLET_DEEP = pick('LN_VIOLET_DEEP'), LIME = pick('LN_LIME'), INK = pick('LN_INK'), VIOLET = pick('LN_VIOLET')
const route = (src.match(/route: '([^']+)'/) || [])[1]
const routeWidth = Number((src.match(/routeWidth: ([\d.]+)/) || [])[1])
const dot = (src.match(/dot: \{ cx: ([\d.]+), cy: ([\d.]+), r: ([\d.]+), ring: ([\d.]+) \}/) || []).slice(1).map(Number)
if (!route || !routeWidth || dot.length !== 4) throw new Error('LN_MARK could not be read from LinkNotesLogo.jsx')

const defs = (id) => `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${VIOLET_LIGHT}"/><stop offset="1" stop-color="${VIOLET_DEEP}"/></linearGradient></defs>`
const tile = (id, rx) => `<rect width="40" height="40" rx="${rx}" fill="url(#${id})"/>`
const drawing = `<path d="${route}" fill="none" stroke="#fff" stroke-width="${routeWidth}" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${dot[0]}" cy="${dot[1]}" r="${dot[2]}" fill="${LIME}" stroke="${INK}" stroke-width="${dot[3]}"/>`

const markSvg = (rx = 11) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="40" height="40">${defs('g')}${tile('g', rx)}${drawing}</svg>\n`
// The lockup: mark + wordmark. The wordmark is text in the site font with a
// system fallback (Inter, then the platform's sans), kept as text so it stays
// crisp at any size and legible to assistive technology.
const logoSvg = (onDark) => {
  const ink = onDark ? '#ffffff' : INK, accent = onDark ? LIME : VIOLET
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 196 40" width="196" height="40" role="img" aria-label="LinkNotes">${defs('g')}${tile('g', 11)}${drawing}<text x="52" y="30.5" font-family="Inter Variable, Inter, -apple-system, Segoe UI, system-ui, sans-serif" font-weight="800" font-size="33" letter-spacing="-1.1" fill="${ink}">Link<tspan fill="${accent}">Notes</tspan></text></svg>\n`
}

const out = resolve('public/brand/linknotes')
mkdirSync(out, { recursive: true })
writeFileSync(join(out, 'mark.svg'), markSvg())
writeFileSync(join(out, 'favicon.svg'), markSvg())
writeFileSync(join(out, 'logo.svg'), logoSvg(false))
writeFileSync(join(out, 'logo-on-dark.svg'), logoSvg(true))

const page = (svg, bg) => `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:${bg};}svg{display:block}</style></head><body>${svg}</body></html>`
const browser = await chromium.launch()
const shots = [
  ['favicon-32.png', 32, markSvg(), 'transparent', true],
  ['favicon-192.png', 192, markSvg(), 'transparent', true],
  ['icon-512.png', 512, markSvg(), 'transparent', true],
  // iOS masks its own corners and composites on black: a square tile, solid.
  ['apple-touch-icon.png', 180, markSvg(0), VIOLET_DEEP, false],
]
for (const [name, px, svg, bg, transparent] of shots) {
  const p = await browser.newPage({ viewport: { width: px, height: px }, deviceScaleFactor: 1 })
  await p.setContent(page(svg.replace('width="40" height="40"', `width="${px}" height="${px}"`), bg))
  await p.screenshot({ path: join(out, name), omitBackground: transparent, clip: { x: 0, y: 0, width: px, height: px } })
  await p.close()
  console.log(`[brand] ${name} ${px}x${px}`)
}
await browser.close()
console.log(`[brand] wrote ${out} (source of truth: src/components/brand/LinkNotesLogo.jsx) ${pathToFileURL(out).href}`)
