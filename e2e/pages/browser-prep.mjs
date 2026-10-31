// Browser-side preparation shared by every page object: a deterministic
// locale and theme, the cookie banner already answered (privacy-preserving:
// necessary only), and an optional synthetic screen for getDisplayMedia.
//
// The synthetic screen follows the repo's verified recipe (memory note
// "verify capture flows with a synthetic stream"): a canvas drawing a fake app
// window, exposed through canvas.captureStream(), so the real capture code runs
// end to end without a share picker.
export async function prepContext(context, { locale = 'en', theme = 'light', syntheticScreen = false } = {}) {
  await context.addInitScript(({ locale, theme, syntheticScreen }) => {
    try {
      localStorage.setItem('wc_consent_v1', JSON.stringify({ version: 1, necessary: true, functional: false, analytics: false }))
      localStorage.setItem('wc_locale', locale)
      localStorage.setItem('wc_theme_mode', theme)
      localStorage.setItem('wc.coach.skip', '1')
    } catch { /* storage blocked: the page still renders with defaults */ }
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
  }, { locale, theme, syntheticScreen })
}
