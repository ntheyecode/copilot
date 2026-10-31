# Company workflows, workflow issues and executive dashboard shots: registered with lib.shot; run through capture.py.
from lib import *  # noqa: F401,F403 (shared capture helpers and the SHOTS registry)
from lib import S, HIDE

# ------------------------------------------------------- Company workflows (all)
@shot('dashboards/company-workflows')
def _(b):
    ctx = session(b, 'jordan', h=2400); pg = open_page(ctx, '/work')
    pg.locator('.wd-cw').first.scroll_into_view_if_needed(); pg.wait_for_timeout(300)
    pg.locator('.wd-cw-head').first.click(); pg.wait_for_timeout(500)
    clip = around(pg, '.wd-cw', pad=16)
    shoot(pg, 'dashboards/company-workflows', clip, {
        'search': ('.wd-cw-tools', 4),
        'details': ('.wd-cw-detail >> visible=true', 4),
        'run': ('.wd-cw-run >> nth=-1', 4),
    })
    ctx.close()

@shot('dashboards/workflow-guide')
def _(b):
    ctx = session(b, 'elena', h=900); fake_display(ctx)
    # The local server has no AI configured: answer only the two AI calls of a
    # run (how-to sub-steps, the screen watch) in the page, with neutral replies.
    import json as _j
    state = {}
    def on_start(route):
        r = route.fetch(); body = r.json(); state['steps'] = body.get('steps', [])
        route.fulfill(response=r, json=body)
    def on_howto(route):
        route.fulfill(json={'steps': [
            {'text': 'In Northwind Billing, open Customers from the left menu.'},
            {'text': 'Type the customer name in the Search box and press Search.'},
        ], 'escalated': False})
    def on_watch(route):
        st = state.get('steps', [])
        route.fulfill(json={'status': 'working', 'observation': 'Customers is open with the search box at the top.', 'flag': '', 'guidance': '',
            'index': 0, 'step': (st[0] if st else None), 'done': False, 'steps': st, 'escalated': False})
    ctx.route('**/api/work/workflows/*/start', on_start)
    ctx.route('**/api/work/sessions/*/howto', on_howto)
    ctx.route('**/api/work/sessions/*/watch', on_watch)
    pg = open_page(ctx, '/work')
    pg.locator('.wd-cw').first.scroll_into_view_if_needed()
    pg.locator('.wd-cw-search input, .wd-cw-tools input').first.fill('refund'); pg.wait_for_timeout(500)
    row = pg.locator('.wd-cw-head', has_text='Issue a customer refund').first
    row.locator('xpath=..').locator('.wd-cw-run').first.click(); pg.wait_for_timeout(5000)
    pg.add_style_tag(content=HIDE)
    unscroll(pg)
    shoot(pg, 'dashboards/workflow-guide', full(pg), {
        'plan': ('.gv-plan, aside >> nth=0', 4),
        'shot': ('.gv-shot-bar', 4),
        'source': (".gv-source, :text('Company workflow') >> xpath=..", 4),
        'done': ("button:has-text('Mark done')", 4),
    })
    pg.locator('.gv-shot-toggle').first.click(); pg.wait_for_timeout(900)
    unscroll(pg)
    full_bb = rect(pg, '.gv-shot-full')
    clip = {'x': full_bb['x'] - 24, 'y': full_bb['y'] - 70, 'width': full_bb['width'] + 48, 'height': full_bb['height'] + 94}
    shoot(pg, 'dashboards/workflow-guide-larger', clip, {
        'full': ('.gv-shot-full', 4),
    })
    ctx.close()

# ------------------------------------------------------------ Workflow issues
@shot('dashboards/workflow-issues')
def _(b):
    ctx = session(b, 'maya', h=1500); pg = open_page(ctx, '/work/workflow-issues')
    pg.locator('.wfi-rowhead', has_text='Step 3').first.click(); pg.wait_for_timeout(900)
    unscroll(pg)
    rows = rect(pg, '.wfi-rows')
    clip = {'x': 0, 'y': 72, 'width': rows['x'] + rows['width'] + 22, 'height': rows['y'] + rows['height'] + 22 - 72}
    shoot(pg, 'dashboards/workflow-issues', clip, {
        'chips': ('.wfi-chips', 4),
        'filters': ('.wfi-toolbar', 2),
        'shot': ('.wfi-shot >> visible=true', 4),
        'suggest': ('.wfi-suggest >> visible=true', 4),
        'actions': ('.wfi-acts >> visible=true', 4),
    })
    ctx.close()

@shot('dashboards/workflow-issues-adopt')
def _(b):
    ctx = session(b, 'maya', h=1500); pg = open_page(ctx, '/work/workflow-issues')
    pg.locator('.wfi-rowhead', has_text='Step 3').first.click(); pg.wait_for_timeout(900)
    pg.locator('.wfi-acts >> visible=true').locator('button.primary').first.click(); pg.wait_for_timeout(700)
    clip = around(pg, '[role=dialog] .wka-panel', pad=1)
    shoot(pg, 'dashboards/workflow-issues-adopt', clip, {})
    ctx.close()

@shot('dashboards/workflow-issues-badge')
def _(b):
    ctx = session(b, 'priya', h=760); pg = open_page(ctx, '/work')
    nav = rect(pg, 'a.wd-nav:has(.wfi-navi)')
    rail = rect(pg, '.wd-rail')
    clip = {'x': 0, 'y': max(0, nav['y'] - 96), 'width': rail['width'], 'height': 150}
    shoot(pg, 'dashboards/workflow-issues-badge', clip, {
        'badge': ('a.wd-nav:has(.wfi-navi)', 2),
    })
    ctx.close()

# ------------------------------------------------------------------- Executive
@shot('dashboards/exec-issues')
def _(b):
    ctx = session(b, 'evelyn', h=3400); pg = open_page(ctx, '/work/exec', wait=3500)
    unscroll(pg)
    clip = around(pg, '.wka-panel:has(.xi-head)', pad=14)
    shoot(pg, 'dashboards/exec-issues', clip, {
        'kinds': ('.xi-kinds', 4),
        'review': ('.xi-head .wka-btn', 4),
    })
    ctx.close()

@shot('dashboards/exec-drilldowns')
def _(b):
    ctx = session(b, 'evelyn', h=2600); pg = open_page(ctx, '/work/exec', wait=3500)
    unscroll(pg)
    a = rect(pg, '.wka-panel:has(.xd-status)'); z = rect(pg, '.wka-panel:has(.xd-two), .xd-two')
    clip = {'x': a['x'] - 14, 'y': a['y'] - 14, 'width': a['width'] + 28, 'height': z['y'] + z['height'] + 14 - (a['y'] - 14)}
    shoot(pg, 'dashboards/exec-drilldowns', clip, {
        'status': ('.xd-status', 4),
        'table': ('.wka-panel:has(.xd-status) .xd-scroll', 4),
        'people': ('.xd-two', 4),
    })
    ctx.close()

@shot('dashboards/exec-brain')
def _(b):
    ctx = session(b, 'evelyn', h=3400); pg = open_page(ctx, '/work/exec', wait=3500)
    unscroll(pg)
    clip = around(pg, '.wka-panel:has(.xb-head)', pad=14)
    shoot(pg, 'dashboards/exec-brain', clip, {
        'note': ('.wka-panel:has(.xb-head) .wka-note >> nth=0', 4),
        'key': ('.xb-actions >> nth=0', 4),
        'download': ('.xb-actions >> nth=1', 4),
    })
    ctx.close()

