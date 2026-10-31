// The desktop overlay ("floater"): the real Electron app from workcopilot/,
// loading the console from the E2E server. Window behaviour is checked twice:
// from Electron's own API and from Win32 itself (extended style, display
// affinity), so a flag the app sets but Windows ignores would still fail.
import fs from 'node:fs'
import { test, expect } from '../support/fixtures.mjs'
import { launchDesktop, newUserDataDir, mainWindowState, win32Probe } from './desktop-app.mjs'
import { prepContext } from '../pages/browser-prep.mjs'
import { LoginPage } from '../pages/LoginPage.mjs'
import { StartTaskPage } from '../pages/StartTaskPage.mjs'
import { GuidingPage } from '../pages/GuidingPage.mjs'

test.skip(process.platform !== 'win32', 'The overlay window checks use Win32 (this suite runs on the Windows build machine).')

const WDA_EXCLUDEFROMCAPTURE = 0x11

async function signIn(app, page, user) {
  await prepContext(app.context(), { locale: 'en' })
  await page.goto(page.url())   // re-load with the prepared consent + locale
  const login = new LoginPage(page)
  await login.open()
  await login.signIn(user.username, user.password)
  await page.waitForURL(/\/work$/)
  await expect(page.getByRole('heading', { level: 1 }).first()).toHaveText(/^Hello/)
}

test.describe('desktop overlay', () => {
  let dirs = []
  test.afterEach(() => { for (const d of dirs) { try { fs.rmSync(d, { recursive: true, force: true }) } catch { /* Electron may hold a file a moment longer */ } } dirs = [] })

  test('launches, loads the console from the configured server, and keeps the sign-in across restarts', async ({ server, seed }) => {
    const co = await seed.company({ personas: ['member'] })
    const user = { ...co.users.member, password: co.password }
    const userDataDir = newUserDataDir(); dirs.push(userDataDir)

    let { app, page } = await launchDesktop({ serverURL: server.baseURL, userDataDir })
    expect(page.url().startsWith(server.baseURL), 'the overlay loads the configured server').toBe(true)
    await page.waitForURL(/\/workcopilot/)                  // /work sends a signed-out visitor to sign in
    expect(await page.evaluate(() => !!(window.workDesktop && window.workDesktop.isDesktop))).toBe(true)
    await signIn(app, page, user)
    await app.close()

    ;({ app, page } = await launchDesktop({ serverURL: server.baseURL, userDataDir }))
    await page.waitForURL(/\/work$/)
    await expect(page.getByRole('heading', { level: 1 }).first()).toHaveText(/^Hello/)
    await app.close()
  })

  test('always on top, opacity, click-through and content protection hold at the OS level', async ({ server, seed }) => {
    const co = await seed.company({ personas: ['member'] })
    const userDataDir = newUserDataDir(); dirs.push(userDataDir)
    const { app, page } = await launchDesktop({ serverURL: server.baseURL, userDataDir })
    await signIn(app, page, { ...co.users.member, password: co.password })
    const call = (fn, arg) => page.evaluate(([f, a]) => window.workDesktop[f](a), [fn, arg])

    // Content protection is ON by default: Windows excludes the window from capture.
    let st = await mainWindowState(app)
    expect(win32Probe(st.hwnd).affinity, 'hidden from screen capture by default').toBe(WDA_EXCLUDEFROMCAPTURE)
    expect(await call('setContentProtection', false)).toBe(false)
    expect(win32Probe(st.hwnd).affinity).toBe(0)
    expect(await call('setContentProtection', true)).toBe(true)
    expect(win32Probe(st.hwnd).affinity).toBe(WDA_EXCLUDEFROMCAPTURE)

    // Plan mode is a normal window; guide mode floats on top.
    expect(st.onTop).toBe(false)
    expect(await call('setMode', 'guide')).toBe('guide')
    st = await mainWindowState(app)
    expect(st.onTop).toBe(true)
    expect(win32Probe(st.hwnd).topmost, 'WS_EX_TOPMOST is set').toBe(true)
    expect(await call('setAlwaysOnTop', false)).toBe(false)
    expect(win32Probe(st.hwnd).topmost).toBe(false)
    await call('setAlwaysOnTop', true)
    // Moving the floating window (guide maximize and back) keeps it on top:
    // on Electron 45 a bounds change could drop TOPMOST (main.js placeWin).
    for (let i = 0; i < 2; i++) {
      await call('winMaximize')
      await expect.poll(() => win32Probe(st.hwnd).topmost, 'still on top after a guide maximize toggle').toBe(true)
    }

    // Opacity.
    expect(await call('setOpacity', 0.6)).toBeCloseTo(0.6, 2)
    st = await mainWindowState(app)
    expect(st.opacity).toBeCloseTo(0.6, 1)
    expect(win32Probe(st.hwnd).layered, 'a translucent window is layered').toBe(true)
    expect(await call('setOpacity', 0.05), 'never fully invisible').toBeCloseTo(0.2, 2)
    await call('setOpacity', 1)

    // Click-through (interact behind): clicks fall through to the app below.
    expect(await call('setClickThrough', true)).toBe(true)
    const state = await page.evaluate(() => window.workDesktop.getState())
    expect(state.clickThrough).toBe(true)
    expect(win32Probe(st.hwnd).transparent, 'WS_EX_TRANSPARENT while click-through is on').toBe(true)
    expect(await call('setClickThrough', false)).toBe(false)
    expect(win32Probe(st.hwnd).transparent).toBe(false)

    // Back to plan mode: never left click-through, opacity restored.
    expect(await call('setMode', 'plan')).toBe('plan')
    st = await mainWindowState(app)
    expect(st.onTop).toBe(false)
    expect(st.opacity).toBe(1)

    // The shell answers screen capture itself: no browser picker. On a PC with
    // several monitors it uses the remembered one, chosen here the way the start
    // wizard does (with none remembered it would open its own monitor picker).
    const monitors = await page.evaluate(() => window.workDesktop.getMonitors())
    if (monitors.length) expect((await page.evaluate((id) => window.workDesktop.chooseMonitorId(id), monitors[0].id)).ok).toBe(true)
    const track = await page.evaluate(async () => {
      const s = await navigator.mediaDevices.getDisplayMedia({ video: true })
      const t = s.getVideoTracks()[0]
      const out = { kind: t.kind, live: t.readyState === 'live' }
      s.getTracks().forEach((x) => x.stop())
      return out
    })
    expect(track).toEqual({ kind: 'video', live: true })
    await app.close()
  })

  test('a guided task runs inside the overlay and floats on top while guiding', async ({ server, seed }) => {
    const co = await seed.company({ personas: ['member'] })
    const userDataDir = newUserDataDir(); dirs.push(userDataDir)
    const { app, page } = await launchDesktop({ serverURL: server.baseURL, userDataDir })
    await signIn(app, page, { ...co.users.member, password: co.password })
    // A synthetic screen instead of this PC's real desktop: nothing personal is captured.
    await prepContext(app.context(), { locale: 'en', syntheticScreen: true })
    await page.reload()
    await server.ctl('ai.script', { rules: [{ kind: 'watch', times: 1, content: { completed: [1], current: 2, guidance: 'Now sort the Month column.', observation: 'The sheet is open.', flag: '', done: false } }] })

    const start = new StartTaskPage(page)
    await start.open()
    const sessionId = await start.startTask({ title: 'Overlay task', goal: 'Build a monthly expense summary in my spreadsheet' })
    const guide = new GuidingPage(page)
    await guide.waitForPlan()
    await expect(page.getByText(/^Step 2 of 3$/).filter({ visible: true }).first()).toBeVisible({ timeout: 30_000 })
    // In the overlay an open session IS guide mode: compact and on top, by itself
    // (the browser's "Float on top" picture-in-picture button is not needed here).
    await expect.poll(async () => (await mainWindowState(app)).onTop).toBe(true)
    expect(win32Probe((await mainWindowState(app)).hwnd).topmost, 'on top at the OS level while guiding').toBe(true)
    expect((await page.evaluate(() => window.workDesktop.getState())).mode).toBe('guide')
    await guide.end()
    const s = await page.evaluate(async (id) => (await fetch(`/api/work/sessions/${id}`, { credentials: 'include' })).json(), sessionId)
    expect((s.session || s).status).toBe('ended')
    await app.close()
  })
})
