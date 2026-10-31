// On-device masking, proven on the pixels: a recorded screen shows a card
// number; the screenshot that reaches the server has that line blacked out,
// an ordinary row beside it is untouched, and the image is full size (so the
// OCR engine really ran, rather than the downscaled fail-safe).
// Guards the OCR engine upgrade: tesseract.js 6+ returns line boxes only when
// asked for blocks, and a missed change would have masked nothing.
import { test, expect } from '../support/fixtures.mjs'
import { needCap } from '../support/editions.mjs'
import { TeachStudio } from '../pages/TeachStudio.mjs'

test.beforeEach(({ edition }) => needCap(test, edition, 'saas_companies'))

const BASICS = { productName: 'Billing portal', title: 'Masked card capture', owner: 'Finance operations', launchTarget: 'Billing > Credit notes' }
// A Luhn-valid test card number: the built-in detector masks it.
const CARD = 'Card on file 4111 1111 1111 1111'

test('a card number on a recorded screen is masked on the device before upload', async ({ as, seed }) => {
  test.setTimeout(180_000)
  const co = await seed.company({ personas: ['trainer'] })
  const { page, api } = await as.page(co.users.trainer, { path: null, syntheticScreen: { sensitiveLine: CARD } })
  const studio = new TeachStudio(page)
  await studio.open()
  await studio.newWorkflow()
  await studio.fillBasics(BASICS)
  await studio.next(); await studio.next()
  await studio.acknowledgeScope()
  await studio.next()

  await page.getByRole('button', { name: 'Record a demonstration' }).first().click()
  const narrate = page.getByLabel('Narrate with my microphone')
  if (await narrate.isChecked()) await narrate.uncheck()
  await page.getByRole('button', { name: 'Share screen and start' }).click()
  await expect(page.getByText('Recording', { exact: true }).first()).toBeVisible()
  for (let i = 0; i < 3; i++) {   // the same rhythm as teach.spec's recording
    await page.evaluate(() => window.__e2eScreen.act())
    await page.waitForTimeout(700)
    await page.getByRole('button', { name: 'Mark step' }).click()
    await page.waitForTimeout(700)
  }
  await page.getByRole('button', { name: 'Stop and review' }).click()
  await expect(page.getByRole('img', { name: /Screenshot for step 1/ })).toBeVisible({ timeout: 120_000 })
  await studio.saveDraft()

  const wf = (await api.get('/api/work/workflows')).data.workflows.find((w) => w.meta.title === BASICS.title)
  const shot = wf && wf.steps[0] && wf.steps[0].shot
  expect(shot, 'the step has its uploaded screenshot').toMatch(/^[a-f0-9]{32}\.(jpg|png|webp)$/)

  // Decode the uploaded frame in the page (same signed-in session) and sample it.
  const m = await page.evaluate(async (ref) => {
    const blob = await (await fetch(`/api/work/workflows/frames/${ref}`, { credentials: 'include' })).blob()
    const bmp = await createImageBitmap(blob)
    const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height
    const g = c.getContext('2d'); g.drawImage(bmp, 0, 0)
    const darkShare = (x0, y0, x1, y1) => {
      const d = g.getImageData(x0, y0, x1 - x0, y1 - y0).data
      let dark = 0, n = 0
      for (let i = 0; i < d.length; i += 4 * 7) { n++; if (d[i] < 50 && d[i + 1] < 50 && d[i + 2] < 50) dark++ }
      return dark / n
    }
    return {
      w: bmp.width, h: bmp.height,
      card: darkShare(60, 452, 430, 472),    // inside the sensitive line's text (it runs about 40..455, 448..476)
      row: darkShare(60, 96, 430, 116),      // "Row 1 ..." above: ordinary text on a light background
    }
  }, shot)

  expect(m.w, 'full-size frame: OCR ran (the fail-safe downscales)').toBe(1280)
  expect(m.card, 'the card line is blacked out').toBeGreaterThan(0.9)
  expect(m.row, 'an ordinary row is left readable').toBeLessThan(0.5)
})
