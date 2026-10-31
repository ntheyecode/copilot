// Company console, Company Brain section: a company admin adds a document
// THROUGH THE PAGE (the Add documents drop zone's real file input), reads the
// promise before anything is sent, sees the honest per-file outcome ("Added: N
// passages from ...", the masked count, the file not stored), the keyword-only
// note when this server has no meaning-based search (the E2E server runs with
// the placeholder embedder), and the new inventory row with its passages. A
// file the server cannot read gets one actionable line and the brain is left
// untouched. The API itself is covered by specs/company-brain-documents.spec.mjs.
import { test, expect } from '../support/fixtures.mjs'
import { companyTest } from '../support/edition-branch.mjs'
import { CompanyAdmin } from '../pages/CompanyAdmin.mjs'

const SOP = [
  'Monthly expense summary procedure.',
  'Open the Expenses sheet in the finance workbook, sort the Month column A to Z, then insert a PivotTable that totals Amount by Month.',
  'Questions go to finance.lead@e2e-corp.net before the report is sent.',
].join('\n\n')

const REFUSE = {
  what: 'adding documents to a Company Brain from the company console',
  api: [['POST', '/api/work/brain/documents'], ['GET', '/api/work/brain/inventory']],
  pages: ['/work/company'],
}

companyTest(test, 'a company admin adds a document from the Company Brain section and sees the result and the new row', REFUSE, async ({ as, seed }) => {
  const co = await seed.company({ personas: ['admin'] })
  const { page, api } = await as.page(co.users.admin, { path: null })
  const console_ = new CompanyAdmin(page)
  await console_.open()
  await console_.section('Company Brain')

  // The promise comes before any upload; the brain starts empty.
  const add = page.getByTestId('brain-add')
  await expect(add.getByText('We read it, mask private details under your company policy, and keep only the passages. The file itself is never stored.')).toBeVisible()
  await expect(page.getByText('Your Company Brain is empty')).toBeVisible()
  await expect(page.getByTestId('brain-source-row')).toHaveCount(0)

  // Upload through the drop zone's real file input (the keyboard control is the button beside it).
  await expect(add.getByRole('button', { name: 'Choose documents', exact: true })).toBeEnabled()
  await page.locator('.wka-brain-drop input[type=file]').setInputFiles({ name: 'Expense SOP.txt', mimeType: 'text/plain', buffer: Buffer.from(SOP, 'utf8') })
  const row = page.getByTestId('brain-add-row').filter({ hasText: 'Expense SOP.txt' })
  await expect(row).toHaveAttribute('data-phase', 'done', { timeout: 30_000 })
  const result = row.getByTestId('brain-add-result')
  await expect(result).toContainText(/Added: \d+ passages? from Expense SOP\.txt/)
  await expect(result).toContainText(/\d+ private details? (was|were) masked\./)
  await expect(result).toContainText('The file itself was not stored.')
  // This server has no meaning-based search: said plainly, no model named.
  await expect(page.getByTestId('brain-add-keywords')).toBeVisible()
  await expect(page.getByTestId('brain-add-keywords')).not.toContainText(/model|bge|transformer/i)

  // The inventory refreshed on its own: the document row with its kind and passages.
  const inv = page.getByTestId('brain-source-row').filter({ hasText: 'Expense SOP.txt' })
  await expect(inv).toHaveCount(1)
  await expect(inv).toContainText(/document/i)
  await expect(page.getByText('Your Company Brain is empty')).toHaveCount(0)
  const server = await api.get('/api/work/brain/inventory')
  const src = server.data.sources.find((s) => s.title === 'Expense SOP.txt')
  expect(src, 'the server lists the document').toBeTruthy()
  await expect(inv.locator('td').nth(2)).toHaveText(String(src.chunks))

  // The same document again: up to date, nothing stored twice, still one row.
  await page.locator('.wka-brain-drop input[type=file]').setInputFiles({ name: 'Expense SOP.txt', mimeType: 'text/plain', buffer: Buffer.from(SOP, 'utf8') })
  await expect(page.getByTestId('brain-add-row')).toHaveCount(2)
  const again = page.getByTestId('brain-add-row').filter({ hasText: 'Expense SOP.txt' }).last()
  await expect(again).toHaveAttribute('data-phase', 'done', { timeout: 30_000 })
  await expect(again.getByTestId('brain-add-result')).toContainText('Already up to date: Expense SOP.txt had nothing new.')
  await expect(page.getByTestId('brain-source-row').filter({ hasText: 'Expense SOP.txt' })).toHaveCount(1)

  // A file the server cannot read: one actionable line, no new row.
  await page.locator('.wka-brain-drop input[type=file]').setInputFiles({ name: 'Scan.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer: Buffer.from('PK not a document') })
  const bad = page.getByTestId('brain-add-row').filter({ hasText: 'Scan.docx' })
  await expect(bad).toHaveAttribute('data-phase', 'failed', { timeout: 30_000 })
  await expect(bad).toContainText('No text could be read from it.')
  await expect(page.getByTestId('brain-source-row')).toHaveCount(1)
  // A finished row can be cleared from the list; the inventory is untouched.
  await add.getByRole('button', { name: 'Clear finished' }).click()
  await expect(page.getByTestId('brain-add-row')).toHaveCount(0)
  await expect(page.getByTestId('brain-source-row')).toHaveCount(1)
})
