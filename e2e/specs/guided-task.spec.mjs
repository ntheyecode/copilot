// The core product loop, in the browser: start a task, the plan arrives from
// the (fake) AI reading the shared screen, the watch loop advances steps, a
// flag surfaces, the person asks a question, finishes, and the report exists.
import { test, expect } from '../support/fixtures.mjs'
import { capsOf } from '../support/editions.mjs'
import { StartTaskPage } from '../pages/StartTaskPage.mjs'
import { GuidingPage } from '../pages/GuidingPage.mjs'

// Who can start their own task in this edition: a solo user where individuals
// exist, a company member (mixed flow) where companies exist.
async function taskUsers(seed, edition) {
  const caps = capsOf(edition)
  const out = []
  if (caps.has('solo_signup')) out.push(['solo user', await seed.solo()])
  if (caps.has('saas_companies')) out.push(['company member', (await seed.company({ personas: ['member'] })).users.member])
  return out
}

const STEP1_DONE = { completed: [1], current: 2, guidance: 'Now sort the Month column.', observation: 'The Expenses sheet is open.', flag: '', done: false }
const WRONG_SORT = { completed: [1], current: 2, guidance: 'Use Sort A to Z, not Sort Z to A.', observation: 'The sort order is reversed.', flag: 'You sorted Z to A. Undo and choose Sort A to Z.', done: false }
const ALL_DONE = { completed: [1, 2, 3], current: 3, guidance: 'All done.', observation: 'The pivot table shows monthly totals.', flag: '', done: true }

async function doneCount(api, sessionId) {
  const s = await api.get(`/api/work/sessions/${sessionId}`)
  return ((s.data.session || s.data).steps || []).filter((x) => x.status === 'done').length
}

test('start, plan, watch, flag, ask, finish and report', async ({ as, seed, edition, server }) => {
  for (const [who, user] of await taskUsers(seed, edition)) {
    await test.step(who, async () => {
      await server.ctl('ai.reset')
      await server.ctl('ai.script', { rules: [{ kind: 'watch', times: 1, content: STEP1_DONE }] })
      const { page, api } = await as.page(user, { path: null, syntheticScreen: true })
      const start = new StartTaskPage(page)
      await start.open()
      const sessionId = await start.startTask({ title: 'Monthly expense summary', goal: 'Build a monthly expense summary in my spreadsheet' })

      const guide = new GuidingPage(page)
      await guide.waitForPlan()
      await expect(guide.stepCard().first()).toContainText('Expenses')
      const plans = await server.ctl('ai.calls', { kind: 'plan' })
      expect(plans.length, 'the plan came from the configured AI').toBeGreaterThan(0)
      expect(plans.at(-1).host).toBe('api.openai.com')
      expect(plans.at(-1).images, 'the plan read the shared screen').toBeGreaterThan(0)

      // The first settled screen is read: step 1 is done.
      await expect.poll(() => doneCount(api, sessionId), { timeout: 30_000 }).toBe(1)

      // The person acts, the watch loop reads the settled screen and flags it.
      await server.ctl('ai.script', { rules: [{ kind: 'watch', times: 1, content: WRONG_SORT }] })
      await guide.act()
      await expect(page.getByText('You sorted Z to A', { exact: false }).first()).toBeVisible({ timeout: 30_000 })
      const s1 = await api.get(`/api/work/sessions/${sessionId}`)
      const events = (s1.data.session || s1.data).events || []
      expect(events.some((e) => e.kind === 'flag'), 'the flag is recorded on the session').toBe(true)

      await guide.ask('Where is the sort button?')
      await expect(page.getByText('The Sort button is in the Data menu', { exact: false }).first()).toBeVisible({ timeout: 20_000 })
      await guide.continueGuiding()

      // Fixed it: the next read finishes the plan.
      await server.ctl('ai.script', { rules: [{ kind: 'watch', content: ALL_DONE }] })
      await guide.act()
      await expect.poll(() => doneCount(api, sessionId), { timeout: 30_000 }).toBe(3)

      await guide.end()
      const fin = await api.get(`/api/work/sessions/${sessionId}`)
      expect((fin.data.session || fin.data).status).toBe('ended')
      const report = await api.get(`/api/work/sessions/${sessionId}/report.txt`)
      expect(report.status).toBe(200)
      expect(String(report.data)).toContain('Monthly expense summary')
      const pdf = await api.get(`/api/work/sessions/${sessionId}/report.pdf`)
      expect(pdf.status).toBe(200)
      expect(pdf.headers['content-type']).toContain('application/pdf')
      // What worked goes into a personal account's own brain (the company keeps
      // its own); only the learning, under "Your sessions".
      const brain = await api.get('/api/work/me/brain')
      if (who === 'solo user') {
        const fromSessions = brain.data.learnings.filter((l) => l.sources.includes('sessions'))
        expect(fromSessions.map((l) => l.text).join(' '), 'the finished task was learned').toMatch(/monthly expense summary.*this worked: .*Expenses/i)
      } else {
        expect(brain.status, 'company members use the company brain').toBe(403)
      }
      await page.context().close()
    })
  }
})
