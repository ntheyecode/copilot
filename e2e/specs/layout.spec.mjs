// Layout: every role's key screens in light and dark, on a desktop (1280) and
// a narrow (640) window. The page must never scroll sideways, and the chosen
// theme must actually be applied.
import { test, expect } from '../support/fixtures.mjs'
import { capsOf } from '../support/editions.mjs'
import { makeWorkflow } from '../support/workflows.mjs'
import { SUPERADMIN } from '../support/personas.mjs'

const WIDTHS = [1280, 640]
const THEMES = ['light', 'dark']

async function screens(seed, as, edition) {
  const caps = capsOf(edition)
  const out = [{ name: 'admin console', user: SUPERADMIN, path: '/work/admin' }]
  if (caps.has('saas_companies')) {
    const co = await seed.company()
    const trainer = await as.api(co.users.trainer)
    const wf = await makeWorkflow(trainer, { title: 'Layout check workflow' })
    const run = await (await as.api(co.users.member)).post(`/api/work/workflows/${wf.id}/start`)
    out.push(
      { name: 'member dashboard', user: co.users.member, path: '/work' },
      { name: 'guided session', user: co.users.member, path: `/work/session/${run.data.sessionId}`, ready: 'section.gv-step' },
      { name: 'start a task', user: co.users.member, path: '/work/start' },
      { name: 'worker queue', user: co.users.worker, path: '/work/queue' },
      { name: 'teach studio', user: co.users.trainer, path: '/work/teach' },
      { name: 'workflow issues', user: co.users.trainer, path: '/work/workflow-issues' },
      { name: 'pm dashboard', user: co.users.pm, path: '/work/pm' },
      { name: 'sr pm dashboard', user: co.users.srpm, path: '/work/srpm' },
      { name: 'oversight', user: co.users.grc, path: '/work/grc' },
      { name: 'executive', user: co.users.exec, path: '/work/exec' },
      { name: 'company admin', user: co.users.admin, path: '/work/company' },
    )
  }
  if (caps.has('solo_signup')) out.push({ name: 'solo dashboard', user: await seed.solo(), path: '/work' })
  return out
}

test('no sideways scroll and the theme applies, light and dark, 1280 and 640', async ({ as, seed, edition }) => {
  test.setTimeout(300_000)
  const problems = []
  for (const s of await screens(seed, as, edition)) {
    for (const theme of THEMES) {
      await test.step(`${s.name} ${theme}`, async () => {
        const { page, context } = await as.page(s.user, { path: null, theme })
        for (const width of WIDTHS) {
          await page.setViewportSize({ width, height: 900 })
          await page.goto(s.path)
          await page.waitForLoadState('networkidle')
          if (s.ready) await page.locator(s.ready).first().waitFor()
          const m = await page.evaluate(() => ({
            scroll: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
            inner: window.innerWidth,
            theme: document.documentElement.getAttribute('data-theme'),
          }))
          if (m.scroll > m.inner + 1) problems.push(`${s.name} ${theme} ${width}px: page is ${m.scroll}px wide (scrolls sideways)`)
          if (m.theme !== theme) problems.push(`${s.name} ${theme} ${width}px: data-theme is "${m.theme}"`)
        }
        await context.close()
      })
    }
  }
  expect(problems, problems.join('\n')).toEqual([])
})
