// Browser-side preparation shared by every page object: a deterministic
// locale and theme, the cookie banner already answered (privacy-preserving:
// necessary only), and an optional synthetic screen for getDisplayMedia.
//
// The synthetic screen follows the repo's verified recipe (memory note
// "verify capture flows with a synthetic stream"): a canvas drawing a fake app
// window, exposed through canvas.captureStream(), so the real capture code runs
// end to end without a share picker.
//
// The synthetic camera (syntheticCamera: true) is the same recipe for
// getUserMedia: a canvas drawing a machine panel (an HMI with a status line),
// plus enumerateDevices listing two labeled cameras, so the Setup tab's picker,
// the live preview and the camera frame path all run without a real device.
export async function prepContext(context, { locale = 'en', theme = 'light', syntheticScreen = false, syntheticCamera = false } = {}) {
  await context.addInitScript(({ locale, theme, syntheticScreen, syntheticCamera }) => {
    try {
      localStorage.setItem('wc_consent_v1', JSON.stringify({ version: 1, necessary: true, functional: false, analytics: false }))
      localStorage.setItem('wc_locale', locale)
      localStorage.setItem('wc_theme_mode', theme)
      localStorage.setItem('wc.coach.skip', '1')
    } catch { /* storage blocked: the page still renders with defaults */ }
    if (syntheticCamera) {
      const md = navigator.mediaDevices || (navigator.mediaDevices = {})
      const CAMERAS = [
        { deviceId: 'e2e-cam-bench', kind: 'videoinput', label: 'Workbench camera', groupId: 'g1' },
        { deviceId: 'e2e-cam-usb', kind: 'videoinput', label: 'USB camera', groupId: 'g2' },
      ]
      md.enumerateDevices = async () => CAMERAS.map((c) => ({ ...c, toJSON() { return c } }))
      if (typeof md.addEventListener !== 'function') { md.addEventListener = () => {}; md.removeEventListener = () => {} }
      md.getUserMedia = async (constraints) => {
        const want = constraints && constraints.video && constraints.video.deviceId && constraints.video.deviceId.exact
        if (want && !CAMERAS.some((c) => c.deviceId === want)) { const e = new Error('no such camera'); e.name = 'OverconstrainedError'; throw e }
        const c = document.createElement('canvas')
        c.width = 1280; c.height = 720
        const g = c.getContext('2d')
        let n = 0
        const draw = () => {
          g.fillStyle = '#1b2430'; g.fillRect(0, 0, c.width, c.height)
          g.fillStyle = '#263445'; g.fillRect(60, 60, 1160, 600)
          g.fillStyle = '#e8eef7'; g.font = 'bold 30px sans-serif'; g.fillText('Line 3 HMI: Conveyor control', 90, 120)
          g.fillStyle = '#9fb3c8'; g.font = '24px sans-serif'
          g.fillText('Status: RUNNING   Speed: 1.20 m/s   Temp: 41 C', 90, 180)
          g.fillText('Alarm: none   Mode: AUTO   Shift: B', 90, 220)
          g.fillStyle = n % 2 ? '#2da44e' : '#1f6feb'; g.fillRect(90, 300, 300, 90)
          g.fillStyle = '#fff'; g.font = 'bold 26px sans-serif'; g.fillText('START', 190, 356)
          n += 1
        }
        draw()
        const timer = setInterval(draw, 1000)
        const stream = c.captureStream(5)
        const [track] = stream.getVideoTracks()
        track.getSettings = () => ({ width: 1280, height: 720, frameRate: 5, deviceId: want || CAMERAS[0].deviceId, facingMode: 'environment' })
        const stop = track.stop.bind(track)
        track.stop = () => { clearInterval(timer); stop() }
        window.__e2eCamera = { calls: (window.__e2eCamera ? window.__e2eCamera.calls : 0) + 1, last: constraints }
        return stream
      }
    }
    if (!syntheticScreen) return
    const md = navigator.mediaDevices || (navigator.mediaDevices = {})
    md.getDisplayMedia = async () => {
      const c = document.createElement('canvas')
      c.width = 1280; c.height = 720
      const g = c.getContext('2d')
      // The screen only changes when the test "acts" (window.__e2eScreen.act()),
      // like a person clicking in their app; between actions it is repainted
      // unchanged, so the console's change detector sees a settled screen.
      let state = 0
      const palette = ['#f3f5f8', '#fff4e5', '#e8f5e9', '#ede7f6', '#e3f2fd']
      const draw = () => {
        g.fillStyle = palette[state % palette.length]; g.fillRect(0, 0, c.width, c.height)
        g.fillStyle = '#1f6feb'; g.fillRect(0, 0, c.width, 56)
        g.fillStyle = '#fff'; g.font = 'bold 26px sans-serif'; g.fillText(`Expenses - Sheet (view ${state + 1})`, 24, 38)
        g.fillStyle = '#222'; g.font = '22px sans-serif'
        for (let r = 0; r < 8; r++) g.fillText(`Row ${r + 1}   Month ${((r + state) % 12) + 1}   Amount ${(r + 1) * 125}.00`, 40, 110 + r * 44)
        g.fillStyle = state % 2 ? '#cf222e' : '#2da44e'; g.fillRect(40 + state * 120, 500, 360, 120)
        g.fillStyle = '#2da44e'; g.fillRect(1080, 640, 160, 48); g.fillStyle = '#fff'; g.fillText('Save', 1130, 672)
        // Optional sensitive line at a fixed spot (baseline 472, from x 40), for
        // the on-device masking check: syntheticScreen: { sensitiveLine }.
        if (syntheticScreen && syntheticScreen.sensitiveLine) {
          g.fillStyle = '#222'; g.font = 'bold 28px sans-serif'; g.fillText(syntheticScreen.sensitiveLine, 40, 472)
        }
      }
      window.__e2eScreen = { act() { state += 1; draw(); return state }, state: () => state }
      draw()
      const timer = setInterval(draw, 500)
      const stream = c.captureStream(2)
      const [track] = stream.getVideoTracks()
      track.getSettings = () => ({ width: 1280, height: 720, displaySurface: 'monitor', frameRate: 2 })
      const stop = track.stop.bind(track)
      track.stop = () => { clearInterval(timer); stop() }
      return stream
    }
  }, { locale, theme, syntheticScreen, syntheticCamera })
}
