// The "Your brain" page (/work/brain, src/pages/work/brain/): a personal
// account teaches its own guide from the page. The upload goes through the
// drop zone's real file input, the fake AI answers the distill call, the
// result moment reads what happened (learned, masked, file deleted), the
// learnings sit under their source as expandable rows, one learning is
// forgotten with the two-step confirm, and Forget everything needs the
// acknowledgement. A company member has no rail entry and reads the message
// that their workplace keeps its own brain. The API itself is covered by
// specs/personal-brain.spec.mjs.
import { test, expect } from '../support/fixtures.mjs'
import { capsOf } from '../support/editions.mjs'
import { WorkShell } from '../pages/WorkShell.mjs'

const DOC = Buffer.from('How I build my monthly summary. Use the Expenses sheet. Pivot by month. Questions: dana.lee@e2e-mail.net', 'utf8')
const RAIL_LABEL = 'Your brain'

test('a person teaches their brain from the page, reads the learnings and forgets; a company member is sent to the company brain', async ({ as, seed, edition }) => {
  const caps = capsOf(edition)
  if (caps.has('solo_signup')) {
    const solo = await seed.solo()
    const { page, api } = await as.page(solo, { path: '/work/brain' })
    const shell = new WorkShell(page)
    await expect(shell.railLink(RAIL_LABEL)).toBeVisible()
    // The shell's top bar repeats the page name as an h2: scope to the page (build/e2e_heading_scope.test.mjs).
    await expect(page.getByRole('main').getByRole('heading', { name: RAIL_LABEL, level: 2 })).toBeVisible()
    // The promise comes before any upload, and the empty state teaches what to upload.
    await expect(page.getByText('We learn from it, then delete the file.')).toBeVisible()
    await expect(page.getByTestId('brain-empty')).toBeVisible()
    await expect(page.locator('.wd-brain-meter-n')).toContainText('0 of 3 documents')   // a basic plan learns from 3

    // Upload through the drop zone's real file input.
    await page.locator('.wd-brain-drop input[type=file]').setInputFiles({ name: 'How I work.txt', mimeType: 'text/plain', buffer: DOC })
    const result = page.getByTestId('brain-result')
    await expect(result).toContainText('Learned 2 things from How I work.txt', { timeout: 20_000 })
    await expect(result).toContainText(/\d+ private details? (was|were) masked/)
    await expect(result).toContainText('The file has been deleted.')
    await expect(page.getByTestId('brain-empty')).toHaveCount(0)
    await expect(page.locator('.wd-brain-meter-n')).toContainText('1 of 3 documents')

    // The learnings sit under their source; Your sessions is listed and explained.
    const rows = page.getByTestId('brain-source')
    await expect(rows).toHaveCount(2)
    const doc = rows.filter({ hasText: 'How I work.txt' })
    await expect(doc).toContainText('2 learnings')
    await expect(rows.filter({ hasText: 'Your sessions' })).toContainText('Fills up as you finish tasks')
    const head = doc.locator('.wd-brain-rowhead')
    await expect(head).toHaveAttribute('aria-expanded', 'false')
    await head.click()
    await expect(head).toHaveAttribute('aria-expanded', 'true')
    const items = doc.getByTestId('brain-learning')
    await expect(items).toHaveCount(2)
    await expect(doc.getByText('Amounts are always in euros, rounded to two decimals.')).toBeVisible()
    await expect(items.first().locator('.wd-brain-kind')).toBeVisible()

    // Forget one learning: press, then confirm inline. The server agrees.
    await items.first().getByRole('button', { name: /^Forget this learning/ }).click()
    await items.first().getByRole('button', { name: 'Yes, forget it' }).click()
    await expect(items).toHaveCount(1)
    await expect(doc).toContainText('1 learning')
    const view = await api.get('/api/work/me/brain')
    expect(view.data.learnings).toHaveLength(1)
    expect(view.data.filesKept).toBe(false)

    // Forget everything: the danger button stays off until the acknowledgement.
    await page.getByRole('button', { name: 'Forget everything it has learned' }).click()
    const dialog = page.getByRole('dialog', { name: 'Forget everything?' })
    await expect(dialog).toBeVisible()
    const confirm = dialog.getByTestId('brain-confirm')
    await expect(confirm).toBeDisabled()
    await dialog.getByRole('checkbox').check()
    await expect(confirm).toBeEnabled()
    await confirm.click()
    await expect(dialog).toHaveCount(0)
    await expect(page.getByTestId('brain-empty')).toBeVisible()
    await expect(page.locator('.wd-brain-meter-n')).toContainText('0 of 3 documents')
    expect((await api.get('/api/work/me/brain')).data).toMatchObject({ sources: [], learnings: [] })
  }
  if (caps.has('saas_companies')) {
    const member = (await seed.company({ personas: ['member'] })).users.member
    const { page } = await as.page(member, { path: '/work' })
    const shell = new WorkShell(page)
    expect(await shell.railNames(), 'company members have the company brain, not a personal one').not.toContain(RAIL_LABEL)
    await page.goto('/work/brain')
    const notice = page.getByTestId('brain-company')
    await expect(notice).toBeVisible()
    await expect(notice).toContainText('keeps its own brain')
    await expect(page.locator('.wd-brain-drop')).toHaveCount(0)
    await notice.getByRole('link', { name: 'Back to the dashboard' }).click()
    await page.waitForURL(/\/work$/)
  }
})
