# Teach studio shots: registered with lib.shot; run through capture.py.
from lib import *  # noqa: F401,F403 (shared capture helpers and the SHOTS registry)
from lib import S, HIDE

# ---------------------------------------------------------------- Teach studio
def new_wizard(pg, steps=False):
    pg.locator('.wka-toolbar .wka-btn.primary').click(); pg.wait_for_timeout(400)
    inputs = pg.locator('.wka-formgrid .wka-input')
    for i, v in enumerate(['Northwind Billing', 'Issue a customer refund', 'Finance operations', 'Billing > Customers', 'Finance', '6']):
        inputs.nth(i).fill(v)
    pg.wait_for_timeout(200)
    if steps: pg.locator('.tch-stepper button', has_text='Steps').click(); pg.wait_for_timeout(600)

def panel_clip(pg, sel='section.wka-panel', top=72, pad=22):
    bb = rect(pg, sel)
    return {'x': 0, 'y': top, 'width': bb['x'] + bb['width'] + pad, 'height': bb['y'] + bb['height'] + pad - top}

@shot('teach/studio-list')
def _(b):
    ctx = session(b, 'maya', h=1600); pg = open_page(ctx, '/work/teach')
    pg.locator('.tch-rowhead', has_text='Issue a customer refund').last.click(); pg.wait_for_timeout(500)
    last = rect(pg, '.tch-rows')
    clip = {'x': 0, 'y': 72, 'width': last['x'] + last['width'] + 22, 'height': last['y'] + last['height'] + 22 - 72}
    shoot(pg, 'teach/studio-list', clip, {
        'newWorkflow': '.wka-toolbar .wka-btn.primary',
        'states': ('.tch-rowmeta >> nth=0', 6),
        'actions': '.tch-rowacts >> visible=true',
        'issues': '.tch-issues',
    })
    ctx.close()

@shot('teach/wizard-basics')
def _(b):
    ctx = session(b, 'maya', h=900); pg = open_page(ctx, '/work/teach')
    new_wizard(pg)
    shoot(pg, 'teach/wizard-basics', panel_clip(pg), {
        'stepper': '.tch-stepper',
        'reflect': '.tch-reflect',
        'required': ('.wka-formgrid', 4),
        'footer': '.tch-wizfoot',
    })
    ctx.close()

@shot('teach/wizard-scope')
def _(b):
    ctx = session(b, 'maya', h=900); pg = open_page(ctx, '/work/teach')
    new_wizard(pg)
    pg.locator('.tch-stepper button', has_text='Scope').click(); pg.wait_for_timeout(500)
    shoot(pg, 'teach/wizard-scope', panel_clip(pg), {
        'note': ('.wka-panel .wka-note >> nth=0', 4),
        'ack': ("label.wka-check:has-text('I understand')", 4),
        'mask': ('.tch-maskopt', 4),
    })
    ctx.close()

def open_steps(pg, title):
    pg.locator('.tch-rowhead', has_text=title).first.click(); pg.wait_for_timeout(400)
    pg.locator('.tch-rowacts >> visible=true').locator('button', has_text='Edit').click(); pg.wait_for_timeout(600)
    pg.locator('.tch-stepper button', has_text='Steps').click(); pg.wait_for_timeout(800)

@shot('teach/record-setup')
def _(b):
    ctx = session(b, 'maya', h=1100); pg = open_page(ctx, '/work/teach')
    new_wizard(pg, steps=True)
    pg.locator('.tch-rec-cta button').first.click(); pg.wait_for_timeout(500)
    pg.locator("label.wka-check:has-text(\"call's audio\")").click(); pg.wait_for_timeout(300)
    clip = around(pg, '.tch-rec', pad=18)
    shoot(pg, 'teach/record-setup', clip, {
        'narrate': ('.tch-rec-opt >> nth=0', 4),
        'call': ('.tch-rec-opt >> nth=1', 4),
        'mask': ('.tch-rec-setup .tch-recline >> nth=0', 3),
        'start': '.tch-rec-actions .wka-btn.primary',
    })
    ctx.close()

@shot('teach/recorder-live')
def _(b):
    ctx = session(b, 'maya', h=1100); fake_display(ctx); pg = open_page(ctx, '/work/teach')
    new_wizard(pg, steps=True)
    pg.locator('.tch-rec-cta button').first.click(); pg.wait_for_timeout(400)
    narr = pg.locator('.tch-rec-opt >> nth=0').locator('input')
    if narr.is_checked(): narr.uncheck()
    pg.locator('.tch-rec-actions .wka-btn.primary').click(); pg.wait_for_timeout(4000)
    pg.locator('button', has_text='Mark step').first.click(); pg.wait_for_timeout(1500)
    clip = around(pg, '.tch-rec', pad=18)
    shoot(pg, 'teach/recorder-live', clip, {
        'time': '.tch-rectime',
        'mark': "button:has-text('Mark step')",
        'stop': "button:has-text('Stop and review')",
    })
    ctx.close()

@shot('teach/import')
def _(b):
    ctx = session(b, 'maya', h=1100); pg = open_page(ctx, '/work/teach')
    new_wizard(pg, steps=True)
    pg.locator('.tch-rec-cta button').nth(1).click(); pg.wait_for_timeout(500)
    pg.locator('.tch-rec input[type=file]').set_input_files(str(S / 'refund-call.webm')); pg.wait_for_timeout(1500)
    clip = around(pg, '.tch-rec', pad=18)
    shoot(pg, 'teach/import', clip, {
        'file': ('.tch-rec .tch-rec-row', 4),
        'lang': ('.tch-rec .tch-rec-lang', 4),
        'start': ".tch-rec-actions .wka-btn.primary",
    })
    ctx.close()

@shot('teach/steps-review')
def _(b):
    ctx = session(b, 'maya', h=1900); pg = open_page(ctx, '/work/teach')
    open_steps(pg, 'Add a carrier')
    for i in (0, 2):
        pg.locator('.tch-editstep').nth(i).locator('.tch-editstep-toggle').click(); pg.wait_for_timeout(200)
    pg.wait_for_timeout(600)
    unscroll(pg)
    top = rect(pg, '.tch-read')['y'] - 18
    st = rect(pg, '.tch-editstep >> nth=2')
    clip = {'x': 0, 'y': top, 'width': st['x'] + st['width'] + 22, 'height': st['y'] + st['height'] + 18 - top}
    shoot(pg, 'teach/steps-review', clip, {
        'read': ('.tch-read', 4),
        'mark': ('.tch-editstep >> nth=2 >> .tch-readmark', 4),
        'shot': ('.tch-editstep.open .tch-shot', 4),
        'band': ('.tch-editstep.open .tch-sug-head', 4),
        'use': ('.tch-editstep.open .tch-sug-acts', 4),
    })
    ctx.close()

