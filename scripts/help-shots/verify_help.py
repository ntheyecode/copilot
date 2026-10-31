# Render-verify the help pages per role, width (1280 / 640) and theme (light /
# dark): which help sections each role sees, no horizontal overflow, every
# annotated image loads, every pin sits inside its image, no raw i18n key, and
# (1280 light) keyboard focus on a pin spotlights its region and key. One JSON
# line per run; any non-empty broken / pinsOut / wide / rawKeys is a failure.
# Usage: HELP_SHOTS_DIR=<workdir> python scripts/help-shots/verify_help.py [locale] [roles]
import sys, json, os
from pathlib import Path
sys.path.insert(0, os.path.dirname(__file__))
import lib as cap
from playwright.sync_api import sync_playwright
OUT = cap.S / 'verify'; OUT.mkdir(exist_ok=True)
LOCALE = sys.argv[1] if len(sys.argv) > 1 else 'en'
ONLY = sys.argv[2].split(',') if len(sys.argv) > 2 else None

CHECK = """async () => {
  const vw = document.documentElement.clientWidth
  const out = { sections: [...document.querySelectorAll('section[id^=help-dash-], section[id^=wkh-]')].map((s) => s.id),
    pageOverflow: document.documentElement.scrollWidth - vw, shots: 0, broken: [], pinsOut: [], wide: [], rawKeys: [] }
  for (const img of document.querySelectorAll('.hs img')) { img.loading = 'eager' }
  await new Promise((r) => setTimeout(r, 1500))
  for (const fig of document.querySelectorAll('.hs')) {
    out.shots++
    const img = fig.querySelector('img'), stage = fig.querySelector('.hs-stage').getBoundingClientRect()
    if (!img.complete || !img.naturalWidth) out.broken.push(img.getAttribute('src'))
    const host = fig.parentElement.getBoundingClientRect()
    if (stage.right > host.right + 1 || stage.right > vw) out.wide.push(img.getAttribute('src') + ' ' + Math.round(stage.right - host.right))
    for (const pin of fig.querySelectorAll('.hs-pin')) {
      const p = pin.getBoundingClientRect()
      if (p.left < stage.left - 1 || p.right > stage.right + 1 || p.top < stage.top - 1 || p.bottom > stage.bottom + 1) out.pinsOut.push(img.getAttribute('src') + ' #' + pin.textContent)
    }
  }
  // anything (outside the intentionally scrollable help nav) poking past the viewport
  for (const el of document.querySelectorAll('.wd-help-body *, .wkh *')) {
    const r = el.getBoundingClientRect()
    if (r.width && r.right > vw + 1 && !el.closest('.wd-help-nav')) { out.wide.push((el.className || el.tagName) + ' +' + Math.round(r.right - vw)); if (out.wide.length > 12) break }
  }
  const txt = (document.querySelector('.wd-help-body, .wkh') || document.body).innerText
  out.rawKeys = (txt.match(/\\b(dashboardsHelp|helpCompany|helpShared|workShell)\\.[\\w.]+/g) || []).slice(0, 8)
  return out
}"""

A11Y = """async () => {
  const pin = document.querySelector('.hs-pin'); if (!pin) return 'no pin'
  pin.focus(); await new Promise((r) => setTimeout(r, 120))
  const fig = pin.closest('.hs'), on = fig.classList.contains('is-on'), li = document.getElementById(pin.getAttribute('aria-describedby'))
  const r = { focusedSpotlight: on, keyHighlighted: !!(li && li.classList.contains('on')), label: pin.getAttribute('aria-label'), describedBy: li ? li.textContent.slice(0, 60) : null }
  pin.click(); await new Promise((r) => setTimeout(r, 80)); r.pressed = pin.getAttribute('aria-pressed')
  pin.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await new Promise((r) => setTimeout(r, 80))
  pin.blur(); await new Promise((r) => setTimeout(r, 80)); r.clearedAfterEsc = !fig.classList.contains('is-on')
  // A touch tap pins, a second tap releases, and nothing stays spotlighted.
  const tap = async () => { for (const type of ['pointerover', 'pointerenter', 'pointerdown']) pin.dispatchEvent(new PointerEvent(type, { pointerType: 'touch', bubbles: type !== 'pointerenter' }))
    pin.focus(); pin.click(); await new Promise((r) => setTimeout(r, 80)) }
  await tap(); r.tapPins = fig.classList.contains('is-on') && pin.getAttribute('aria-pressed') === 'true'
  await tap(); r.secondTapClears = !fig.classList.contains('is-on') && pin.getAttribute('aria-pressed') === 'false'
  pin.blur()
  return r
}"""

# The console's Help nav item, in the locale under test.
import subprocess
HELP_LABEL = subprocess.run(['node', '--input-type=module', '-e',
    f"const m = await import('file:///' + process.argv[1].split(String.fromCharCode(92)).join('/') + '/src/i18n/locales/{'en/workShell' if LOCALE == 'en' else LOCALE}.js'); const d = m.default; console.log(('{LOCALE}' === 'en' ? 'Help' : d.companyAdmin.nav.help))",
    str(cap.REPO.resolve() if str(cap.REPO) != '.' else Path.cwd())], capture_output=True, text=True).stdout.strip() or 'Help'

RUNS = [
    ('maya', '/work/help', 'trainer'), ('jordan', '/work/help', 'member'), ('omar', '/work/help', 'grc'),
    ('evelyn', '/work/help', 'exec'), ('priya', '/work/help', 'pm-trainer'), ('marco', '/work/help', 'pm'), ('alex', '/work/help', 'admin'),
    ('alex', '/work/company', 'console'),
]
with sync_playwright() as p:
    b = p.chromium.launch()
    for user, path, tag in RUNS:
        if ONLY and tag not in ONLY: continue
        for theme in ('light', 'dark'):
            for w in (1280, 640):
                ctx = b.new_context(viewport={'width': w, 'height': 900}, color_scheme=theme)
                ctx.add_init_script(f"try {{ localStorage.setItem('wc_locale', '{LOCALE}') }} catch (e) {{}}")
                r = ctx.request.post(cap.BASE + '/api/work/login', data={'username': user, 'password': cap.PW}); assert r.ok
                pg = ctx.new_page(); pg.goto(cap.BASE + path); pg.wait_for_timeout(2500)
                pg.add_style_tag(content=cap.HIDE)
                pg.evaluate(f"document.documentElement.setAttribute('data-theme', '{theme}')")
                if tag == 'console':
                    pg.locator('.wka-nav .wka-nav-item', has_text=HELP_LABEL).first.click(); pg.wait_for_timeout(1500)
                res = pg.evaluate(CHECK)
                a11y = pg.evaluate(A11Y) if (theme == 'light' and w == 1280) else None
                print(json.dumps({'run': f'{tag}/{theme}/{w}/{LOCALE}', **res, **({'a11y': a11y} if a11y else {})}))
                ctx.close()
    b.close()
