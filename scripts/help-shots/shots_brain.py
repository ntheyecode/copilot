# "Your brain" shots (personal account): registered with lib.shot; run through capture.py.
from lib import *  # noqa: F401,F403 (shared capture helpers and the SHOTS registry)
import json as _j

# The local server has no AI configured: the learn call is answered in the
# page with the view the seed already holds plus the new document, so the
# result moment reads exactly as it does for a person (2 learned, 1 masked).
def _route_learn(ctx):
    def on_learn(route):
        base = ctx.request.get(BASE + '/api/work/me/brain').json()
        src = {'id': 'ps_help_new', 'name': 'How I work.txt', 'kind': 'document', 'learnedAt': '2026-10-31T10:00:00.000Z'}
        new = [
            {'id': 'pl_n1', 'text': 'Monthly summaries use the Expenses sheet with a pivot table by month.', 'kind': 'procedure', 'sources': ['ps_help_new'], 'at': '2026-10-31T10:00:00.000Z'},
            {'id': 'pl_n2', 'text': 'Client questions go to the shared inbox, never to a personal address.', 'kind': 'preference', 'sources': ['ps_help_new'], 'at': '2026-10-31T10:00:01.000Z'},
        ]
        route.fulfill(json={'source': {'id': src['id'], 'name': src['name'], 'refreshed': False}, 'added': 2, 'merged': 0, 'masked': 1, 'truncated': False, 'fileKept': False,
                            'sources': [src] + base['sources'], 'learnings': new + base['learnings']})
    ctx.route('**/api/work/me/brain/learn', on_learn)

def _upload(pg):
    pg.set_input_files('.wd-brain-drop input[type=file]', {'name': 'How I work.txt', 'mimeType': 'text/plain', 'buffer': b'How I build my monthly summary. Use the Expenses sheet. Pivot by month.'})
    pg.locator('.wd-brain-result').wait_for(timeout=8000); pg.wait_for_timeout(400)

@shot('dashboards/your-brain')
def _(b):
    ctx = session(b, 'riley', h=1500); _route_learn(ctx); pg = open_page(ctx, '/work/brain')
    _upload(pg)
    unscroll(pg)
    rows = rect(pg, '.wd-brain-rows')
    clip = {'x': 0, 'y': 60, 'width': pg.viewport_size['width'], 'height': rows['y'] + rows['height'] + 24 - 60}
    shoot(pg, 'dashboards/your-brain', clip, {
        'promise': ('.wd-brain-promise', 4),
        'drop': ('.wd-brain-drop', 4),
        'meter': ('.wd-brain-meter', 4),
        'result': ('.wd-brain-result', 4),
        'rows': ('.wd-brain-rows', 4),
    })
    # The first row opened: each learning with its kind, the Forget controls.
    pg.locator('.wd-brain-rowhead').first.click(); pg.wait_for_timeout(500)
    pg.locator('.wd-brain-listhead').first.evaluate("(e) => e.scrollIntoView({ block: 'start' })"); pg.wait_for_timeout(300)
    pg.evaluate("() => window.scrollBy(0, -24)"); pg.wait_for_timeout(300)
    head = rect(pg, '.wd-brain-listhead'); row = rect(pg, '.wd-brain-row.open')
    clip = {'x': 0, 'y': max(0, head['y'] - 16), 'width': pg.viewport_size['width'], 'height': row['y'] + row['height'] + 20 - max(0, head['y'] - 16)}
    shoot(pg, 'dashboards/your-brain-learned', clip, {
        'kind': ('.wd-brain-row.open .wd-brain-kind >> nth=0', 4),
        'forget': ('.wd-brain-row.open .wd-brain-ls .wd-brain-lforget >> nth=0', 4),
        'forgetSource': ('.wd-brain-row.open .wd-brain-rowfoot .wd-brain-lforget', 4),
        'forgetAll': ('.wd-brain-forgetall', 4),
    })
    ctx.close()
