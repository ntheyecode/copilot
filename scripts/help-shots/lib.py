# Shared helpers + the SHOTS registry for the help-screenshot capture: sign in
# as a seeded role, set up a screen, screenshot it from the REAL app (seeded
# throwaway API + vite), and record each callout region (the DOM element's box in
# image pixels). capture.py runs the registered shots; README.md has the steps.
import sys, io, json
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image

import os
MAIN = Path(sys.argv[0]).name == 'capture.py'   # argv is the capture's; other tools use HELP_SHOTS_DIR
# Work dir (throwaway, outside the repo): help.env, frames/, shots/ (review copies), geo.json.
S = Path(sys.argv[1]).resolve() if MAIN else Path(os.environ.get('HELP_SHOTS_DIR', '.')).resolve()
REPO = Path(sys.argv[2]) if MAIN else Path('.')
ONLY = sys.argv[3].split(',') if MAIN and len(sys.argv) > 3 and sys.argv[3] else None
THEME = sys.argv[4] if MAIN and len(sys.argv) > 4 else 'light'
WRITE = THEME == 'light'
env = dict(l.split('=', 1) for l in (S / 'help.env').read_text().split('\n') if '=' in l)
PW = env['SEED_PASSWORD']
BASE = os.environ.get('HELP_SHOTS_BASE', 'http://127.0.0.1:5208')
REVIEW = S / 'shots'; REVIEW.mkdir(exist_ok=True)
GEO_FILE = S / 'geo.json'
GEO = json.loads(GEO_FILE.read_text()) if GEO_FILE.exists() else {}
FRAME = (S / 'frames' / 'refund-1.jpg').read_bytes()

HIDE = '.cb-root{display:none!important} *{caret-color:transparent!important} ::-webkit-scrollbar{display:none}'

def session(b, user, w=1280, h=900):
    ctx = b.new_context(viewport={'width': w, 'height': h}, color_scheme=THEME, device_scale_factor=1)
    ctx.add_init_script("try { localStorage.setItem('wc_locale', 'en') } catch (e) {}")
    r = ctx.request.post(BASE + '/api/work/login', data={'username': user, 'password': PW})
    assert r.ok, (user, r.status, r.text()[:200])
    return ctx

def open_page(ctx, path, wait=2200):
    pg = ctx.new_page()
    pg.goto(BASE + path)
    pg.wait_for_timeout(wait)
    pg.add_style_tag(content=HIDE)
    pg.evaluate(f"document.documentElement.setAttribute('data-theme', '{THEME}')")
    pg.wait_for_timeout(300)
    return pg

def rect(pg, sel):
    loc = pg.locator(sel).first
    loc.wait_for(state='visible', timeout=8000)
    bb = loc.bounding_box()
    return bb

def shoot(pg, name, clip, marks):
    """clip: dict x,y,width,height in page px (viewport). marks: {key: selector | (selector, pad)}"""
    # Whole pixels, so the image and its geometry have exactly the same size.
    clip = {k: int(round(clip[k])) for k in ('x', 'y', 'width', 'height')}
    geo = {'w': clip['width'], 'h': clip['height'], 'marks': {}}
    for key, spec in marks.items():
        sel, pad = (spec if isinstance(spec, tuple) else (spec, 6))
        bb = rect(pg, sel)
        x = bb['x'] - clip['x'] - pad; y = bb['y'] - clip['y'] - pad
        # Intersect the padded box with the image: a box cut at the left / top
        # edge loses the cut part too, so it never runs past its element.
        x0, y0 = max(0, x), max(0, y)
        x1 = min(clip['width'], x + bb['width'] + 2 * pad); y1 = min(clip['height'], y + bb['height'] + 2 * pad)
        geo['marks'][key] = [round(x0), round(y0), round(x1 - x0), round(y1 - y0)]
    png = pg.screenshot(clip=clip)
    im = Image.open(io.BytesIO(png)).convert('RGB')
    # A clip past the viewport edge comes back truncated: never pair a cut image
    # with full-size geometry. Give the shot a taller viewport instead.
    if im.size != (geo['w'], geo['h']):
        raise RuntimeError(f"{name}: screenshot is {im.size}, clip is {(geo['w'], geo['h'])}; the clip leaves the viewport, raise the session height")
    out = REPO / 'public' / 'help' / (name + '.webp')
    if WRITE:
        out.parent.mkdir(parents=True, exist_ok=True)
        im.save(out, 'WEBP', quality=84, method=6)
        GEO[name] = geo
    # Review copy with the boxes drawn, to check the geometry by eye.
    from PIL import ImageDraw
    dr = ImageDraw.Draw(im)
    for i, (k, (x, y, w, h)) in enumerate(geo['marks'].items()):
        dr.rectangle([x, y, x + w, y + h], outline=(201, 80, 26), width=3)
        dr.text((x + 4, y + 2), f'{i + 1} {k}', fill=(201, 80, 26))
    im.save(REVIEW / (name.replace('/', '_') + f'-{THEME}.png'))
    print(name, im.size, out.stat().st_size if WRITE else '')

def unscroll(pg):
    pg.evaluate("() => { window.scrollTo(0, 0); document.querySelectorAll('*').forEach((e) => { if (e.scrollTop) e.scrollTop = 0 }) }")
    pg.wait_for_timeout(250)

def to_top(pg, sel):
    pg.locator(sel).first.evaluate("(e) => e.scrollIntoView({ block: 'start' })")
    pg.wait_for_timeout(300)
    pg.evaluate("() => window.scrollBy(0, -100)")
    for el in ['.wka-main', '.wka-body']:
        pg.evaluate(f"() => {{ const m = document.querySelector('{el}'); if (m && m.scrollTop) m.scrollTop = Math.max(0, m.scrollTop - 100) }}")
    pg.wait_for_timeout(300)

def full(pg, top=0, height=None):
    vw = pg.viewport_size
    return {'x': 0, 'y': top, 'width': vw['width'], 'height': height or (vw['height'] - top)}

def around(pg, sel, pad=16, extra_bottom=0, x0=None, x1=None):
    bb = rect(pg, sel)
    vw = pg.viewport_size
    x = max(0, bb['x'] - pad) if x0 is None else x0
    w = (min(vw['width'], bb['x'] + bb['width'] + pad) if x1 is None else x1) - x
    return {'x': x, 'y': max(0, bb['y'] - pad), 'width': w, 'height': bb['height'] + 2 * pad + extra_bottom}

SHOTS = {}
def shot(name):
    def deco(fn): SHOTS[name] = fn; return fn
    return deco

def fake_display(ctx):
    # Headless Chromium cannot share a real screen: a canvas stream of the mock
    # app stands in, so the live recorder renders exactly as it does for a trainer.
    import base64
    b64 = base64.b64encode(FRAME).decode()
    ctx.add_init_script("""
      (() => {
        const src = 'data:image/jpeg;base64,""" + b64 + """';
        const make = async () => {
          const c = document.createElement('canvas'); c.width = 1280; c.height = 720
          const g = c.getContext('2d'); const im = new Image(); im.src = src; await im.decode()
          const draw = () => { g.drawImage(im, 0, 0) }; draw(); setInterval(draw, 200)
          return c.captureStream(5)
        }
        if (navigator.mediaDevices) navigator.mediaDevices.getDisplayMedia = async () => make()
      })()
    """)

def nav_console(pg, label):
    pg.locator('.wka-nav .wka-nav-item', has_text=label).first.click(); pg.wait_for_timeout(1200)

