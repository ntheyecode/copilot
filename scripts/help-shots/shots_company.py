# Company console shots (trainer grant, API keys, webhooks): registered with lib.shot; run through capture.py.
from lib import *  # noqa: F401,F403 (shared capture helpers and the SHOTS registry)
from lib import S, HIDE

# -------------------------------------------------------------- Company admin
@shot('company/trainer-grant')
def _(b):
    ctx = session(b, 'alex', h=1100); pg = open_page(ctx, '/work/company', wait=3000)
    nav_console(pg, 'Team')
    tbl = rect(pg, '.wka-table-wrap'); last = rect(pg, "tr:has-text('Jordan Lee')")
    clip = {'x': tbl['x'] - 14, 'y': tbl['y'] - 10, 'width': min(tbl['width'] + 28, 1280 - tbl['x'] + 14), 'height': last['y'] + last['height'] + 10 - (tbl['y'] - 10)}
    shoot(pg, 'company/trainer-grant', clip, {
        'role': ("tr:has-text('Maya Lin') td:nth-child(2) select", 4),
        'trainer': ("tr:has-text('Maya Lin') label.wka-check", 4),
    })
    ctx.close()

@shot('company/api-keys')
def _(b):
    ctx = session(b, 'alex', h=1500); pg = open_page(ctx, '/work/company', wait=3000)
    nav_console(pg, 'API & webhooks')
    pg.locator('.wka-dev-head', has_text='Billing sync').first.click(); pg.wait_for_timeout(500)
    unscroll(pg)
    first = rect(pg, '.wka-main .wka-panel >> nth=0')
    clip = {'x': first['x'] - 14, 'y': first['y'] - 14, 'width': first['width'] + 28, 'height': first['height'] + 28}
    shoot(pg, 'company/api-keys', clip, {
        'create': ("button:has-text('Create key')", 4),
        'row': ('.wka-dev-head >> nth=0', 3),
        'acts': ('.wka-dev-acts >> visible=true', 4),
    })
    ctx.close()

@shot('company/api-key-create')
def _(b):
    ctx = session(b, 'alex', h=1700); pg = open_page(ctx, '/work/company', wait=3000)
    nav_console(pg, 'API & webhooks')
    pg.locator("button:has-text('Create key')").first.click(); pg.wait_for_timeout(500)
    form = pg.locator('.wka-main .wka-panel').first
    form.locator('input.wka-input').first.fill('Ticketing integration (production)')
    form.locator("label:has-text('Read workflows') input").first.check()
    form.locator("label:has-text('Read workflow issues') input").first.check()
    pg.wait_for_timeout(300)
    unscroll(pg)
    first = rect(pg, '.wka-main .wka-panel >> nth=0')
    clip = {'x': first['x'] - 14, 'y': first['y'] - 14, 'width': first['width'] + 28, 'height': first['height'] + 28}
    shoot(pg, 'company/api-key-create', clip, {
        'scopes': (".wka-field:has-text('What this key may do')", 4),
        'expiry': (".wka-field:has-text('Expires in')", 4),
        'ip': (".wka-field:has-text('IP allowlist')", 4),
    })
    form.locator('.wka-btn.primary').last.click(); pg.wait_for_timeout(1500)
    unscroll(pg)
    # Never publish a key-shaped secret, even a throwaway one: show a sample.
    pg.evaluate("""() => { for (const el of document.querySelectorAll('input, textarea, code')) {
      const v = el.value || el.textContent || ''
      if (/^wcp_live_/.test(v.trim()) && v.length > 40) { if ('value' in el && el.tagName !== 'CODE') el.value = 'wcp_live_4f9c2e71d0a85b36_SAMPLE0KEY0SHOWN0ONCE0ONLY'; else el.textContent = 'wcp_live_4f9c2e71d0a85b36_SAMPLE0KEY0SHOWN0ONCE0ONLY' } } }""")
    pg.wait_for_timeout(200)
    clip = around(pg, ".wka-main .wka-panel:has-text('Copy your key now')", pad=14)
    shoot(pg, 'company/api-key-show-once', clip, {
        'copy': ("button:has-text('Copy key')", 4),
        'done': ("button:has-text('I have stored it')", 4),
    })
    ctx.close()

@shot('company/webhooks')
def _(b):
    ctx = session(b, 'alex', h=2000); pg = open_page(ctx, '/work/company', wait=3000)
    nav_console(pg, 'API & webhooks')
    pg.locator('.wka-dev-head', has_text='example.com').first.click(); pg.wait_for_timeout(1200)
    unscroll(pg)
    panel = rect(pg, '.wka-main .wka-panel:has(.wka-dev-del)'); cut = rect(pg, '.wka-dev-del >> nth=3')
    clip = {'x': panel['x'] - 14, 'y': panel['y'] - 14, 'width': panel['width'] + 28, 'height': cut['y'] + cut['height'] + 8 - (panel['y'] - 14)}
    shoot(pg, 'company/webhooks', clip, {
        'events': ('.wka-dev-body >> visible=true >> .wka-dev-tags >> nth=0', 4),
        'acts': ('.wka-dev-body >> visible=true >> .wka-dev-acts >> nth=0', 4),
        'deliveries': ('.wka-dev-del >> nth=0', 4),
    })
    ctx.close()

