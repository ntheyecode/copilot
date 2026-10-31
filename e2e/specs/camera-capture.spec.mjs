// Camera reading (owner, 2026-10-31): the guide can read from a camera pointed
// at another computer or a physical system. In the console's Setup tab an
// individual picks A camera, sees the live preview, and the session requests
// carry x-wc-capture: camera (the plan reads camera frames). A company member
// gets no Camera option until the company admin turns the switch on in the
// console; a forced camera request while it is off is refused 403 CAMERA_OFF.
import { test, expect } from '../support/fixtures.mjs'
import { capsOf } from '../support/editions.mjs'
import { StartTaskPage } from '../pages/StartTaskPage.mjs'
import { GuidingPage } from '../pages/GuidingPage.mjs'
import { CompanyAdmin } from '../pages/CompanyAdmin.mjs'
import { companyTest } from '../support/edition-branch.mjs'

const CAPTURE_HEADER = 'x-wc-capture'

async function openSession(as, user, opts = {}) {
  const { page, api, context } = await as.page(user, { path: null, syntheticScreen: true, syntheticCamera: true, ...opts })
  const start = new StartTaskPage(page)
  await start.open()
  const sessionId = await start.startTask({ title: 'Conveyor restart', goal: 'Restart line 3 from the HMI panel' })
  await new GuidingPage(page).waitForPlan()
  return { page, api, context, sessionId }
}

const setupTab = (page) => page.getByRole('tab', { name: 'Setup' })
const cameraOption = (page) => page.getByRole('radio', { name: /^A camera/ })

test('an individual picks the camera in Setup, aims it in the preview, and the reads carry the camera source', async ({ as, seed, edition, server }) => {
  if (!capsOf(edition).has('solo_signup')) {
    // No personal accounts here: every account is a company account, so the
    // camera starts OFF until a company admin turns it on (the next test).
    const member = (await seed.company({ personas: ['member'] })).users.member
    const me = await (await as.api(member)).get('/api/work/me')
    expect(me.data.user.cameraCapture, 'a company account starts without the camera').toBe(false)
    return
  }
  await server.ctl('ai.reset')
  const solo = await seed.solo()
  const { page, context } = await openSession(as, solo)

  // The first plan read the shared screen (the default source).
  const firstPlan = (await server.ctl('ai.calls', { kind: 'plan' })).at(-1)
  expect(firstPlan.images, 'the first plan read a frame').toBeGreaterThan(0)

  await setupTab(page).click()
  await expect(page.getByTestId('wc-setup')).toBeVisible()
  await expect(page.getByRole('radio', { name: /^My screen/ })).toHaveAttribute('aria-checked', 'true')
  await expect(cameraOption(page)).toBeVisible()

  // Pick the camera: capture restarts on the camera and the watch loop resumes
  // with the camera source on every session request.
  const cameraWatch = page.waitForRequest((r) => r.url().includes('/api/work/sessions/') && r.url().endsWith('/watch') && r.headers()[CAPTURE_HEADER] === 'camera', { timeout: 30_000 })
  await cameraOption(page).click()
  await expect(cameraOption(page)).toHaveAttribute('aria-checked', 'true')
  const preview = page.getByTestId('wc-camera-preview')
  await expect(preview).toBeVisible()
  await expect.poll(() => preview.evaluate((v) => v.videoWidth), 'the live preview shows the camera stream').toBeGreaterThan(0)
  await expect(page.getByRole('switch', { name: 'Show the live view while guiding' })).toHaveAttribute('aria-checked', 'true')
  // The picker lists the browser's cameras and remembers the one that opened.
  const picker = page.getByLabel('Which camera')
  await expect(picker.locator('option')).toHaveCount(3)
  await expect(picker).toHaveValue('e2e-cam-bench')
  await cameraWatch
  expect(await page.evaluate(() => window.__e2eCamera && window.__e2eCamera.calls), 'getUserMedia opened the camera').toBeGreaterThan(0)

  // Back on Guide: the viewfinder stays under the step while the live view is on.
  await page.getByRole('tab', { name: 'Guide' }).click()
  await expect(page.getByTestId('wc-capture-video')).toBeVisible()

  // The choice is remembered: the next task plans from the camera, with frames.
  await server.ctl('ai.reset')
  const planReq = page.waitForRequest((r) => r.url().endsWith('/plan') && r.method() === 'POST', { timeout: 60_000 })
  const start = new StartTaskPage(page)
  await start.open()
  await start.startTask({ title: 'Conveyor speed', goal: 'Set the conveyor speed on the line 3 panel' })
  expect((await planReq).headers()[CAPTURE_HEADER], 'the plan request says it reads from the camera').toBe('camera')
  await new GuidingPage(page).waitForPlan()
  const plans = await server.ctl('ai.calls', { kind: 'plan' })
  expect(plans.length).toBeGreaterThan(0)
  expect(plans.at(-1).images, 'the plan read camera frames').toBeGreaterThan(0)
  await context.close()
})

// Without company tenants the company switch is refused (no skips: the
// edition runs its own version of the check).
const CAMERA_REFUSE = { what: 'the company camera switch', api: [['GET', '/api/work/company/capture'], ['PUT', '/api/work/company/capture']] }
companyTest(test, 'a company member gets the camera only after the company admin turns it on; a forced camera read is refused', CAMERA_REFUSE, async ({ as, seed, edition, server }) => {
  await server.ctl('ai.reset')
  const co = await seed.company({ personas: ['admin', 'member'] })

  // Off by default: no Camera option, an actionable hint, and the server refuses
  // a camera read however it is asked for.
  const { page, api, context, sessionId } = await openSession(as, co.users.member)
  await setupTab(page).click()
  await expect(page.getByTestId('wc-setup')).toBeVisible()
  await expect(cameraOption(page)).toHaveCount(0)
  await expect(page.getByTestId('wc-camera-locked')).toBeVisible()
  const forced = await api.get(`/api/work/sessions/${sessionId}`, { [CAPTURE_HEADER]: 'camera' })
  expect(forced.status, 'a camera read is refused while the switch is off').toBe(403)
  expect(forced.data.code).toBe('CAMERA_OFF')
  expect((await api.get(`/api/work/sessions/${sessionId}`, { [CAPTURE_HEADER]: 'screen' })).status, 'the screen is always fine').toBe(200)

  // The admin turns it on in the console (Data governance, Camera reading).
  const { page: adminPage, context: adminCtx } = await as.page(co.users.admin, { path: null })
  const admin = new CompanyAdmin(adminPage)
  await admin.open()
  await admin.section('Data governance', 'Data governance (DLP)')
  const sw = adminPage.getByRole('switch', { name: 'Camera reading' })
  await expect(sw).toHaveAttribute('aria-checked', 'false')
  const saved = adminPage.waitForResponse((r) => r.url().endsWith('/api/work/company/capture') && r.request().method() === 'PUT')
  await sw.click()
  expect((await saved).status()).toBe(200)
  await expect(sw).toHaveAttribute('aria-checked', 'true')
  await expect(adminPage.getByTestId('wca-camera-state')).toContainText('On')
  await adminCtx.close()

  // The member now has the camera (the grant rides on the signed-in user).
  expect((await api.get(`/api/work/sessions/${sessionId}`, { [CAPTURE_HEADER]: 'camera' })).status).toBe(200)
  await page.reload()
  await new GuidingPage(page).waitForPlan()
  await setupTab(page).click()
  await expect(cameraOption(page)).toBeVisible()
  await expect(page.getByTestId('wc-camera-locked')).toHaveCount(0)
  await cameraOption(page).click()
  await expect(page.getByTestId('wc-camera-preview')).toBeVisible()
  await context.close()
})
