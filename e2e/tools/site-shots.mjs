// Screenshots of the individuals site for the design gate: every page at 1280
// and 640, light and dark, in English, plus German and Arabic (RTL), against a
// real `paid` server booted the way the E2E suite boots one (fresh temp data
// dir, fake AI, no real egress). Also prints any page that scrolls sideways.
//
//   npm run build
//   node e2e/tools/site-shots.mjs [--out .e2e-results/individuals-site] [--edition paid]
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from '@playwright/test'
import { bootServer } from '../support/server.mjs'
import { stampLikeDeploy } from '../pages/edition-stamp.mjs'
import { prepContext } from '../pages/browser-prep.mjs'

const argv = process.argv.slice(2)
const val = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d }
const OUT = path.resolve(val('--out', '.e2e-results/individuals-site'))
const EDITION = val('--edition', 'paid')
const PAGES = [['home', '/'], ['how', '/workcopilot/how-it-works'], ['pricing', '/workcopilot/pricing'], ['use-cases', '/workcopilot/use-cases'], ['faq', '/workcopilot/faq'], ['security', '/workcopilot/security'], ['sign-in', '/workcopilot/login'], ['sign-up', '/workcopilot/signup']]
const SHOTS = [
  { locale: 'en', theme: 'light', widths: [1280, 640] },
  { locale: 'en', theme: 'dark', widths: [1280, 640] },
  { locale: 'de', theme: 'light', widths: [1280, 640] },
  { locale: 'ar', theme: 'light', widths: [1280, 640] },
]

fs.mkdirSync(OUT, { recursive: true })
const server = await bootServer({ edition: EDITION, label: 'site-shots' })
const browser = await chromium.launch()
const problems = []
try {
  for (const s of SHOTS) {
    const context = await browser.newContext({ baseURL: server.baseURL, viewport: { width: 1280, height: 900 }, colorScheme: s.theme, locale: 'en-US' })
    await stampLikeDeploy(context, { edition: EDITION, baseURL: server.baseURL })
    await prepContext(context, { locale: s.locale, theme: s.theme })
    const page = await context.newPage()
    for (const [name, url] of PAGES) {
      for (const width of s.widths) {
        await page.setViewportSize({ width, height: 900 })
        await page.goto(url)
        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(500)
        const m = await page.evaluate(() => ({ scroll: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth), inner: window.innerWidth, dir: document.documentElement.getAttribute('dir') }))
        if (m.scroll > m.inner + 1) problems.push(`${name} ${s.locale} ${s.theme} ${width}: ${m.scroll}px wide`)
        const file = path.join(OUT, `${name}-${s.locale}-${s.theme}-${width}.png`)
        await page.screenshot({ path: file, fullPage: true })
        console.log(`${file}${m.dir ? ` (dir=${m.dir})` : ''}`)
      }
    }
    await context.close()
  }
} finally {
  await browser.close()
  await server.close()
}
if (problems.length) { console.error('\nSideways scroll:\n' + problems.join('\n')); process.exit(1) }
console.log('\nOK: no page scrolls sideways.')
