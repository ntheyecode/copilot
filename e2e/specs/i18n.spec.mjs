// Key screens in three languages (German, Japanese, Arabic): no raw i18n keys,
// no English left behind, and Arabic lays out right to left. English is
// rendered first as the baseline for each screen.
import { test, expect } from '../support/fixtures.mjs'
import { capsOf } from '../support/editions.mjs'
import { makeWorkflow } from '../support/workflows.mjs'
import { visibleTexts, englishLeaks, rawKeys } from '../support/i18n-check.mjs'

const LOCALES = ['de', 'ja', 'ar']

// Seeded content is the customer's own data and stays as written.
const DATA = ['Credit note', 'Billing portal', 'Finance operations', 'Raise a credit note', 'Invoice 1042', 'Open the Credit notes tab', 'Pick invoice', 'Enter the reason', 'The next screen shows', 'Step 1:', 'Step 2:', 'Step 3:']

async function screens(seed, as, edition) {
  const caps = capsOf(edition)
  const out = []
  if (caps.has('saas_companies')) {
    const co = await seed.company()
    const trainer = await as.api(co.users.trainer)
    const wf = await makeWorkflow(trainer, { title: 'Raise a credit note' })
    const member = await as.api(co.users.member)
    const run = await member.post(`/api/work/workflows/${wf.id}/start`)
    out.push(
      { name: 'member dashboard', user: co.users.member, path: '/work' },
      { name: 'start a task', user: co.users.member, path: '/work/start' },
      { name: 'guided session', user: co.users.member, path: `/work/session/${run.data.sessionId}`, ready: 'section.gv-step' },
      { name: 'teach studio', user: co.users.trainer, path: '/work/teach' },
      { name: 'workflow issues', user: co.users.trainer, path: '/work/workflow-issues' },
      { name: 'pm dashboard', user: co.users.pm, path: '/work/pm' },
      { name: 'oversight', user: co.users.grc, path: '/work/grc' },
      { name: 'executive dashboard', user: co.users.exec, path: '/work/exec' },
      { name: 'company admin', user: co.users.admin, path: '/work/company' },
    )
    DATA.push(co.name.split(' ')[0])
  }
  if (caps.has('solo_signup')) {
    const solo = await seed.solo()
    out.push({ name: 'solo dashboard', user: solo, path: '/work' })
    DATA.push(solo.username)
  }
  return out
}

test('key screens show no raw keys and no English in German, Japanese and Arabic', async ({ as, seed, edition }) => {
  test.setTimeout(240_000)
  const problems = []
  for (const s of await screens(seed, as, edition)) {
    await test.step(s.name, async () => {
      const capture = async (locale) => {
        const { page, context } = await as.page(s.user, { path: s.path, locale })
        await page.waitForLoadState('networkidle')
        if (s.ready) await page.locator(s.ready).first().waitFor()
        await page.waitForTimeout(400)
        const texts = await visibleTexts(page)
        const dir = await page.locator('html').getAttribute('dir')
        const lang = await page.locator('html').getAttribute('lang')
        await context.close()
        return { texts, dir, lang }
      }
      const en = await capture('en')
      problems.push(...rawKeys(en.texts).map((k) => `${s.name} [en]: raw key "${k}"`))
      for (const loc of LOCALES) {
        const got = await capture(loc)
        expect(got.lang, `${s.name}: html lang follows the pinned language`).toMatch(new RegExp(`^${loc}`))
        if (loc === 'ar') expect(got.dir, `${s.name}: Arabic is right to left`).toBe('rtl')
        problems.push(...rawKeys(got.texts).map((k) => `${s.name} [${loc}]: raw key "${k}"`))
        problems.push(...englishLeaks(en.texts, got.texts, { data: DATA }).map((t) => `${s.name} [${loc}]: English "${t}"`))
      }
    })
  }
  expect(problems, problems.join('\n')).toEqual([])
})
