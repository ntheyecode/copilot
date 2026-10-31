// Screenshots of a paying person's billing surfaces for the design gate: the
// dashboard with the billing panel, /work/billing, the "plan ends on" state
// and the failed-payment state, at 1280 and 640, light and dark, in English,
// German and Arabic, against a real `paid` server with Stripe faked at the
// boundary (the same harness the E2E suite uses).
//
//   npm run build
//   node e2e/tools/billing-shots.mjs [--out .e2e-results/individuals-billing]
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from '@playwright/test'
import { bootServer } from '../support/server.mjs'
import { stampLikeDeploy } from '../pages/edition-stamp.mjs'
import { prepContext } from '../pages/browser-prep.mjs'
import { wrap } from '../support/api.mjs'
import { STRIPE_E2E_ENV, deliverEvent } from '../support/stripe-events.mjs'

const argv = process.argv.slice(2)
const val = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d }
const OUT = path.resolve(val('--out', '.e2e-results/individuals-billing'))
const PASSWORD = 'Checkout-Pass-123!'
const SHOTS = [
  { locale: 'en', theme: 'light', widths: [1280, 640] },
  { locale: 'en', theme: 'dark', widths: [1280, 640] },
  { locale: 'de', theme: 'light', widths: [1280] },
  { locale: 'ar', theme: 'light', widths: [1280] },
]

fs.mkdirSync(OUT, { recursive: true })
const server = await bootServer({ edition: 'paid', env: { ...STRIPE_E2E_ENV }, label: 'billing-shots' })
const browser = await chromium.launch()
const problems = []
let n = 0
try {
  for (const s of SHOTS) {
    const context = await browser.newContext({ baseURL: server.baseURL, viewport: { width: 1280, height: 900 }, colorScheme: s.theme })
    await stampLikeDeploy(context, { edition: 'paid', baseURL: server.baseURL })
    await prepContext(context, { locale: s.locale, theme: s.theme })
    const api = wrap(context.request)
    // A paying person: sign up, verify, pick a plan, pay on the fake Checkout.
    const email = `shots${++n}@e2e-mail.net`
    await api.post('/api/work/onboarding/signup', { email, password: PASSWORD, acceptTerms: true })
    const mail = (await server.ctl('emails')).reverse().find((m) => m.type === 'verify_email' && m.to === email)
    await api.post('/api/work/onboarding/verify', { code: mail.data.code })
    await api.post('/api/work/onboarding/plan', { plan: 'advanced', cycle: 'monthly' })
    const page = await context.newPage()
    await page.goto('/workcopilot/signup/pay')
    await page.locator('button.ob-cta').first().click()
    await page.waitForURL(/\/checkout\/cs_/)
    await page.locator('#fake-pay').click()
    await page.waitForURL(/\/workcopilot\/signup\/(pay\?checkout=success|welcome)/)
    await page.locator('button.ob-cta').first().click()
    await page.waitForURL(/\/work(\?|$)/)
    await api.post('/api/work/profile/language', { language: s.locale })
    const me = (await api.get('/api/work/me')).data.user
    const ids = await server.ctl('user.stripe', { id: me.id })
    const shoot = async (name, url, width) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto(url)
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(600)
      const m = await page.evaluate(() => ({ scroll: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth), inner: window.innerWidth }))
      if (m.scroll > m.inner + 1) problems.push(`${name} ${s.locale} ${s.theme} ${width}: ${m.scroll}px wide`)
      const file = path.join(OUT, `${name}-${s.locale}-${s.theme}-${width}.png`)
      await page.screenshot({ path: file, fullPage: true })
      console.log(file)
    }
    for (const width of s.widths) {
      await shoot('dashboard', '/work', width)
      await shoot('billing', '/work/billing', width)
    }
    // Plan set to end: the alert with Resume.
    await api.post('/api/work/subscription/cancel', { reason: 'Design gate' })
    for (const width of s.widths) await shoot('billing-ending', '/work/billing', width)
    await api.post('/api/work/subscription/resume')
    // A failed renewal: the alert with Update payment method.
    await deliverEvent(api.ctx, 'invoice.payment_failed', { id: `in_shots_${n}`, object: 'invoice', customer: ids.customer, subscription: ids.subscription, amount_due: 29900, currency: 'usd' })
    for (const width of s.widths) await shoot('dashboard-past-due', '/work', width)
    await context.close()
  }
} finally {
  await browser.close()
  await server.close()
}
if (problems.length) { console.error('\nSideways scroll:\n' + problems.join('\n')); process.exit(1) }
console.log('\nOK: no billing screen scrolls sideways.')
