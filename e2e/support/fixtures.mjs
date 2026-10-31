// Playwright fixtures for the WorkCoPilot suite.
//
//   edition      option (per project): which WORK_EDITION the server runs as
//   serverEnv    option: extra env for a describe that needs a differently
//                configured server (e.g. MFA on); a distinct value gets its own server
//   server       worker-scoped: the booted server ({ baseURL, ctl, ... })
//   seed         test-scoped: seed.company() / seed.solo() with a unique prefix
//   as           test-scoped: as.api(user) and as.page(user) sign a persona in
//
// Every test also asserts, on teardown, that the server made no outbound call
// outside the fakes (no real AI, DNS or webhook traffic).
import { test as base, expect } from '@playwright/test'
import { bootServer } from './server.mjs'
import { apiClient, wrap } from './api.mjs'
import { prepContext } from '../pages/browser-prep.mjs'
import { guardBrowserEgress } from '../pages/browser-egress.mjs'
import { stampLikeDeploy } from '../pages/edition-stamp.mjs'

export const test = base.extend({
  edition: ['all', { option: true, scope: 'worker' }],
  serverEnv: [{}, { option: true, scope: 'worker' }],

  server: [async ({ edition, serverEnv }, use, workerInfo) => {
    const srv = await bootServer({ edition, env: serverEnv, label: `${workerInfo.project.name}#${workerInfo.workerIndex}` })
    await use(srv)
    await srv.close()
  }, { scope: 'worker', timeout: 90_000 }],

  baseURL: async ({ server }, use) => { await use(server.baseURL) },

  seed: async ({ server }, use, testInfo) => {
    let n = 0
    const prefix = () => `t${testInfo.workerIndex}${Date.now().toString(36).slice(-5)}${(n++).toString(36)}`
    await use({
      prefix,
      company: (opts = {}) => server.ctl('seedCompany', { prefix: prefix(), ...opts }),
      solo: (opts = {}) => server.ctl('seedSolo', { prefix: prefix(), ...opts }),
    })
  },

  as: async ({ server, browser }, use) => {
    const opened = []
    const externalCalls = []
    const helper = {
      // A signed-in API client for a seeded persona ({ username }, password shared).
      async api(user, password = user.password || 'E2e-User-Pass-123!') {
        const api = await apiClient(server.baseURL)
        opened.push(api)
        await api.login(user.username, password)
        return api
      },
      anon: async () => { const api = await apiClient(server.baseURL); opened.push(api); return api },
      // A browser page signed in as the persona (sign-in through the real API, in
      // the page's own cookie jar), already on `path`.
      async page(user, { path = '/work', password = user.password || 'E2e-User-Pass-123!', contextOptions = {}, locale = 'en', theme = 'light', syntheticScreen = false, syntheticCamera = false, pinLanguage = true } = {}) {
        const { context } = await helper.context({ contextOptions, locale, theme, syntheticScreen, syntheticCamera })
        const api = wrap(context.request)
        await api.login(user.username, password)
        // Answer the first-run "Choose your language" question the way the
        // modal would (it pins the account's language); a dedicated test drives
        // the modal itself.
        if (pinLanguage) await api.post('/api/work/profile/language', { language: locale })
        const page = await context.newPage()
        if (path) await page.goto(path)
        return { page, context, api }
      },
      // A fresh, signed-out browser context (prepared locale/theme/consent).
      async context({ contextOptions = {}, locale = 'en', theme = 'light', syntheticScreen = false, syntheticCamera = false } = {}) {
        const context = await browser.newContext({ baseURL: server.baseURL, viewport: { width: 1280, height: 800 }, locale: 'en-US', ...contextOptions })
        opened.push({ dispose: () => context.close() })
        externalCalls.push(await guardBrowserEgress(context))
        await stampLikeDeploy(context, { edition: server.edition, baseURL: server.baseURL })
        await prepContext(context, { locale, theme, syntheticScreen, syntheticCamera })
        return { context, page: null }
      },
    }
    await use(helper)
    for (const o of opened.reverse()) { try { await o.dispose() } catch { /* already closed */ } }
    expect(externalCalls.flat(), 'the web app must not call third-party hosts during E2E').toEqual([])
  },

  // Hermetic network: fail the test if the server tried to reach anything real.
  // Also starts every test with the fake AI's default answers and the real date.
  _noRealEgress: [async ({ server }, use) => {
    await server.ctl('ai.reset')
    await server.ctl('clock.reset')
    await server.ctl('hooks.mode', { mode: 'ok' })
    const before = (await server.ctl('net.blocked')).length
    await use()
    const after = await server.ctl('net.blocked')
    expect(after.slice(before), 'the server must not contact real hosts during E2E').toEqual([])
  }, { auto: true }],
})

export { expect }
