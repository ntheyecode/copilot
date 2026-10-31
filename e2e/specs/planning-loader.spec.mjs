// The planning state (src/pages/work/guiding/PlanningLoader.jsx): what the
// person sees between sharing the screen and the first step card. It must
// show their own goal and what is really being read, never a percentage, say
// so honestly when the wait runs long, fill in with the real steps when the
// plan lands, and fit at desktop, narrow and desktop-overlay widths in both
// themes (no sideways scroll, nothing spilling out of the card, no clipped
// nowrap label).
import fs from 'node:fs'
import path from 'node:path'
import { test, expect } from '../support/fixtures.mjs'
import { capsOf } from '../support/editions.mjs'
import { StartTaskPage } from '../pages/StartTaskPage.mjs'
import { GuidingPage } from '../pages/GuidingPage.mjs'

const GOAL = 'Build a monthly expense summary in my spreadsheet'
const WIDTHS = [1280, 640, 380]   // desktop, narrow, the desktop overlay's minimum (workcopilot/main.js minWidth)
const THEMES = ['light', 'dark']

async function taskUser(seed, edition) {
  const caps = capsOf(edition)
  if (caps.has('saas_companies')) return (await seed.company({ personas: ['member'] })).users.member
  return seed.solo()
}

// Screenshots land in PLANNING_SHOTS_DIR when set (a render-verification run),
// else in the test's own output folder. The edition is part of the name: the
// three edition projects run this spec at the same time.
function shotPath(testInfo, name) {
  const dir = process.env.PLANNING_SHOTS_DIR || testInfo.outputDir
  fs.mkdirSync(dir, { recursive: true })
  return path.join(dir, `${name}-${testInfo.project.name}.png`)
}

test('planning shows the goal and the screen read, says so after 12 s, then hands off to the first step', async ({ as, seed, edition, server }, testInfo) => {
  test.setTimeout(150_000)
  // One slow plan: long enough for the honest "still working" note (12 s).
  await server.ctl('ai.script', { rules: [{ kind: 'plan', times: 1, delayMs: 14_000 }] })
  const user = await taskUser(seed, edition)
  const { page } = await as.page(user, { path: null, syntheticScreen: true })
  const start = new StartTaskPage(page)
  await start.open()
  await start.startTask({ title: 'Monthly expense summary', goal: GOAL })

  const plan = page.locator('.wc-plan')
  await expect(plan).toBeVisible({ timeout: 20_000 })
  await expect(plan).toContainText('Building your plan')
  await expect(plan, 'the person sees their own goal').toContainText(GOAL)
  await expect(plan, 'the read line reflects the shared screen').toContainText('Reading what is on your screen right now')
  await expect(plan).toContainText('What you get')
  await expect(plan, 'no fake progress number').not.toContainText('%')
  await expect(plan.locator('.wc-plan-slow'), 'a long wait is named honestly').toBeVisible({ timeout: 20_000 })
  await expect(plan.locator('.wc-plan-slow')).toContainText('Still working')

  // The plan lands: the skeleton fills with the real steps for a beat.
  await expect(plan).toHaveClass(/ready/, { timeout: 30_000 })
  await plan.screenshot({ path: shotPath(testInfo, 'planning-ready-1280-light') }).catch(() => {})
  await expect(plan).toContainText('Your steps are ready')
  await expect(plan).toContainText('3 steps')
  await expect(plan).toContainText('Expenses')

  // Then the step card takes over and the planning view is gone.
  const guide = new GuidingPage(page)
  await guide.waitForPlan()
  await expect(plan).toHaveCount(0)
  await expect(guide.stepCard().first()).toContainText('Expenses')
  const plans = await server.ctl('ai.calls', { kind: 'plan' })
  expect(plans.at(-1).images, 'the plan read the shared screen (so the read line was true)').toBeGreaterThan(0)
})

test('with reduced motion the planning view is static and still hands off to the first step', async ({ as, seed, edition, server }) => {
  test.setTimeout(120_000)
  await server.ctl('ai.script', { rules: [{ kind: 'plan', times: 1, delayMs: 3_000 }] })
  const user = await taskUser(seed, edition)
  const { page } = await as.page(user, { path: null, syntheticScreen: true })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const start = new StartTaskPage(page)
  await start.open()
  await start.startTask({ title: 'Reduced motion', goal: GOAL })
  const plan = page.locator('.wc-plan')
  await expect(plan).toBeVisible({ timeout: 20_000 })
  await expect(plan).toContainText(GOAL)
  // No sweep, no shimmer, no blink: the static end state only.
  await expect(plan.locator('.wc-plan-sweep')).toBeHidden()
  const animated = await page.evaluate(() => [...document.querySelectorAll('.wc-plan, .wc-plan *')].filter((el) => getComputedStyle(el).animationName !== 'none').length)
  expect(animated, 'nothing inside the planning view animates under reduced motion').toBe(0)
  // The landing beat is skipped (no animation to show): straight to the step card.
  await new GuidingPage(page).waitForPlan()
  await expect(plan).toHaveCount(0)
})

test('the planning view fits at 1280, 640 and 380, light and dark', async ({ as, seed, edition, server }, testInfo) => {
  test.setTimeout(240_000)
  const problems = []
  const user = await taskUser(seed, edition)
  for (const theme of THEMES) {
    // Hold the plan open for the whole pass; the console's own timeout is 240 s.
    await server.ctl('ai.script', { rules: [{ kind: 'plan', times: 1, delayMs: 90_000 }] })
    const { page, context } = await as.page(user, { path: null, syntheticScreen: true, theme })
    const start = new StartTaskPage(page)
    await start.open()
    await start.startTask({ title: `Layout ${theme}`, goal: GOAL })
    const plan = page.locator('.wc-plan')
    await expect(plan).toBeVisible({ timeout: 20_000 })
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 })
      await page.waitForTimeout(300)
      const m = await page.evaluate(() => {
        const root = document.querySelector('.wc-plan')
        const rr = root.getBoundingClientRect()
        const spill = [], clipped = []
        for (const el of root.querySelectorAll('*')) {
          const r = el.getBoundingClientRect()
          if (r.width === 0) continue
          if (r.right > rr.right + 1 || r.left < rr.left - 1) spill.push(`${el.tagName.toLowerCase()}.${el.className && el.className.baseVal === undefined ? el.className : ''}`)
          const cs = getComputedStyle(el)
          if (cs.whiteSpace === 'nowrap' && el.scrollWidth > el.clientWidth + 1) clipped.push(`${el.tagName.toLowerCase()}.${el.className}: ${el.textContent.trim().slice(0, 40)}`)
        }
        return {
          scroll: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
          inner: window.innerWidth,
          theme: document.documentElement.getAttribute('data-theme'),
          spill, clipped,
        }
      })
      if (m.scroll > m.inner + 1) problems.push(`${theme} ${width}px: page is ${m.scroll}px wide (scrolls sideways)`)
      if (m.theme !== theme) problems.push(`${theme} ${width}px: data-theme is "${m.theme}"`)
      if (m.spill.length) problems.push(`${theme} ${width}px: spills out of the card: ${m.spill.join(', ')}`)
      if (m.clipped.length) problems.push(`${theme} ${width}px: clipped nowrap text: ${m.clipped.join(' | ')}`)
      await page.screenshot({ path: shotPath(testInfo, `planning-${width}-${theme}`) })
      await plan.screenshot({ path: shotPath(testInfo, `planning-card-${width}-${theme}`) })
    }
    // The honest long-wait note, in this theme too.
    await page.setViewportSize({ width: 1280, height: 900 })
    await expect(plan.locator('.wc-plan-slow')).toBeVisible({ timeout: 20_000 })
    await plan.screenshot({ path: shotPath(testInfo, `planning-card-slow-${theme}`) })
    await context.close()
  }
  expect(problems, problems.join('\n')).toEqual([])
})
