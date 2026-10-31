// The personal brain (owner rule, 2026-10-31): a person teaches their own
// guide with documents. The server learns from each one, masks what is
// sensitive first, keeps ONLY the learnings (the file is never stored and can
// never be downloaded back), refreshes when the same document comes again, and
// the guidance uses what it learned. Company users have the company brain.
import { test, expect } from '../support/fixtures.mjs'
import { capsOf } from '../support/editions.mjs'
import { StartTaskPage } from '../pages/StartTaskPage.mjs'
import { GuidingPage } from '../pages/GuidingPage.mjs'

const DOC_TEXT = 'How I build my monthly summary. Use the Expenses sheet. Pivot by month. Questions: dana.lee@e2e-mail.net'
const doc = (name = 'How I work.txt') => ({ name, mime: 'text/plain', dataBase64: Buffer.from(DOC_TEXT, 'utf8').toString('base64') })

test('a person teaches their own brain; only the learnings are kept, and guidance uses them', async ({ as, seed, edition, server }) => {
  const caps = capsOf(edition)
  await server.ctl('ai.reset')
  if (caps.has('solo_signup')) {
    const solo = await seed.solo()
    const api = await as.api(solo)
    const r = await api.post('/api/work/me/brain/learn', doc())
    expect(r.status, JSON.stringify(r.data)).toBe(200)
    expect(r.data.fileKept).toBe(false)
    expect(r.data.learnings.map((l) => l.text)).toContain('Amounts are always in euros, rounded to two decimals.')
    expect(r.data.masked, 'the email in the document was masked').toBeGreaterThan(0)
    const distill = await server.ctl('ai.calls', { kind: 'distill' })
    expect(distill.at(-1).docText).not.toContain('dana.lee@e2e-mail.net')

    // What the person sees: sources and learnings, never the document itself.
    const view = await api.get('/api/work/me/brain')
    expect(view.data.sources).toHaveLength(1)
    expect(JSON.stringify(view.data)).not.toContain('Pivot by month. Questions')
    for (const p of [`/api/work/me/brain/sources/${r.data.source.id}/download`, `/api/work/me/brain/sources/${r.data.source.id}`]) {
      expect((await api.get(p)).status, `${p} gives nothing back`).toBe(404)
    }

    // The same document again refreshes it (one source, no duplicates).
    const again = await api.post('/api/work/me/brain/learn', doc('how i work.TXT'))
    expect(again.data.source.refreshed).toBe(true)
    expect(again.data.sources).toHaveLength(1)
    expect(again.data.learnings).toHaveLength(2)

    // A task about the same work is grounded in what it learned.
    // (Signing in on the page ends the API client's session: the product keeps
    // one session per person, so the page's own client carries on below.)
    const { page, api: signedIn } = await as.page(solo, { path: null, syntheticScreen: true })
    const start = new StartTaskPage(page)
    await start.open()
    await start.startTask({ title: 'Monthly expense summary', goal: 'Build my monthly expense summary pivot' })
    await new GuidingPage(page).waitForPlan()
    const plans = await server.ctl('ai.calls', { kind: 'plan' })
    expect(plans.some((c) => c.taught), 'the plan read what the person taught').toBe(true)

    // Forget one learning, then everything that document taught.
    const one = await signedIn.del(`/api/work/me/brain/learnings/${again.data.learnings[0].id}`)
    expect(one.status, JSON.stringify(one.data)).toBe(200)
    expect(one.data.learnings).toHaveLength(1)
    const gone = await signedIn.del(`/api/work/me/brain/sources/${again.data.source.id}`)
    expect(gone.data).toEqual({ sources: [], learnings: [] })
  }
  if (caps.has('saas_companies')) {
    const member = (await seed.company({ personas: ['member'] })).users.member
    await server.ctl('ai.reset')   // the "all" edition ran the individual's half first
    const api = await as.api(member)
    const r = await api.post('/api/work/me/brain/learn', doc())
    expect([r.status, r.data.code], 'company users use the company brain').toEqual([403, 'COMPANY_ACCOUNT'])
    expect((await server.ctl('ai.calls', { kind: 'distill' })).length, 'no AI ran for a refused upload').toBe(0)
  }
})
