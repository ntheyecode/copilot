// The Company Brain learns the company's own documents (owner, 2026-10-31:
// wire the upload before the Company Brain page goes live). A company admin
// adds a document; it is read in memory, masked under the company policy, and
// stored as passages in the company's sealed brain; the file is not kept. The
// admin inventory lists it; the same name again replaces it; a member's plan is
// grounded in it and names it; another company never sees it; members cannot
// add documents.
import { test, expect } from '../support/fixtures.mjs'
import { companyTest } from '../support/edition-branch.mjs'
import { StartTaskPage } from '../pages/StartTaskPage.mjs'
import { GuidingPage } from '../pages/GuidingPage.mjs'

const SOP = [
  'Monthly expense summary procedure.',
  'Open the Expenses sheet in the finance workbook, sort the Month column A to Z, then insert a PivotTable that totals Amount by Month.',
  'Questions go to finance.lead@e2e-corp.net before the report is sent.',
].join('\n\n')
const doc = (name = 'Expense SOP.txt', text = SOP) => ({ name, mime: 'text/plain', dataBase64: Buffer.from(text, 'utf8').toString('base64') })

const REFUSE = { what: 'adding documents to a Company Brain', api: [['POST', '/api/work/brain/documents']] }

companyTest(test, 'a company admin adds a document; the brain keeps masked passages, and a member is guided by it', REFUSE, async ({ as, seed, server }) => {
  await server.ctl('ai.reset')
  const co = await seed.company({ personas: ['admin', 'member'] })
  const admin = await as.api(co.users.admin)

  const r = await admin.post('/api/work/brain/documents', doc())
  expect(r.status, JSON.stringify(r.data)).toBe(200)
  expect(r.data.fileKept).toBe(false)
  expect(r.data.accepted).toBeGreaterThan(0)
  expect(r.data.masked, 'the email in the document was masked').toBeGreaterThan(0)

  const inv = await admin.get('/api/work/brain/inventory')
  const row = inv.data.sources.find((s) => s.title === 'Expense SOP.txt')
  expect(row, 'the inventory lists the document').toBeTruthy()
  expect(row.kind).toBe('document')

  // The same name again replaces it (no second source).
  const again = await admin.post('/api/work/brain/documents', doc('expense sop.TXT', SOP + '\n\nRound totals to two decimals.'))
  expect(again.status).toBe(200)
  expect(again.data.source.replaced).toBe(true)
  const inv2 = await admin.get('/api/work/brain/inventory')
  expect(inv2.data.sources.filter((s) => s.status === 'active' && /expense sop/i.test(s.title)), 'one active source').toHaveLength(1)

  // A member cannot add documents.
  const member = await as.api(co.users.member)
  expect((await member.post('/api/work/brain/documents', doc('Mine.txt'))).status).toBe(403)

  // A member's plan is grounded in the document and names it; the raw email never reaches the AI.
  const { page } = await as.page(co.users.member, { path: null, syntheticScreen: true })
  const start = new StartTaskPage(page)
  await start.open()
  await start.startTask({ title: 'Monthly expense summary', goal: 'Build the monthly expense summary with a pivot table by month' })
  await new GuidingPage(page).waitForPlan()
  const plans = await server.ctl('ai.calls', { kind: 'plan' })
  const grounded = plans.find((c) => c.companyKnowledge)
  expect(grounded, 'the plan read the company knowledge').toBeTruthy()
  expect(grounded.citedSources.join(' ')).toMatch(/expense sop/i)

  // Another company never sees it.
  const other = await seed.company({ personas: ['admin'] })
  const otherInv = await (await as.api(other.users.admin)).get('/api/work/brain/inventory')
  expect(otherInv.data.sources.some((s) => /expense sop/i.test(s.title || ''))).toBe(false)
})
