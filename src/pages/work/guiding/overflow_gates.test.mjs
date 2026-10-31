// Layout gates for two overflow classes found at 380 / 640 (2026-10-31):
//   1. a collapsed guidance one-liner (glance, goal, Next) holding RichText
//      key chips must clamp and wrap, never nowrap + ellipsis: a nowrap line
//      let the last inline chip run past the clip;
//   2. the admin table base class must not carry a min-width: it forced even a
//      two-column table past a 640 / 380 viewport (wide tables scroll inside
//      .wka-table-wrap on their own content width; a floor is set per table).
import test from 'node:test'
import assert from 'node:assert/strict'
import { GUIDE_CSS } from '../guideView.css.js'
import { WORKADMIN_CSS } from '../../workadmin/workadmin.css.js'

// The declarations of one selector block: every rule whose selector list
// contains the class as a whole selector or in a compound selector.
function rulesFor(css, cls) {
  const out = []
  const re = /([^{}]+)\{([^{}]*)\}/g
  let m
  const plain = css.replace(/\/\*[\s\S]*?\*\//g, ' ')   // comments carry prose, not selectors
  while ((m = re.exec(plain))) {
    const sels = m[1].split(',').map((s) => s.trim())
    if (sels.some((s) => s === cls || s.endsWith(' ' + cls) || s.endsWith('>' + cls))) out.push(m[2])
  }
  return out.join(';')
}

test('collapsed guidance one-liners clamp and wrap instead of nowrap + ellipsis', () => {
  for (const cls of ['.gv-glance-t', '.gv-goal-t', '.gv-next-t']) {
    const decl = rulesFor(GUIDE_CSS, cls)
    assert.ok(decl, `${cls} is styled`)
    assert.doesNotMatch(decl, /white-space:\s*nowrap/, `${cls} must not be nowrap`)
    assert.doesNotMatch(decl, /text-overflow:\s*ellipsis/, `${cls} must not ellipsize a chip`)
    assert.match(decl, /-webkit-line-clamp:\s*2/, `${cls} clamps to two lines`)
    assert.match(decl, /overflow-wrap:\s*anywhere/, `${cls} wraps long tokens`)
  }
})

test('the admin table base class has no min-width; a select in a cell shrinks with its column', () => {
  const table = rulesFor(WORKADMIN_CSS, 'table.wka-table')
  assert.ok(table, 'table.wka-table is styled')
  assert.doesNotMatch(table, /min-width/, 'no base min-width on every table')
  const sel = rulesFor(WORKADMIN_CSS, '.wka-select')
  assert.match(sel, /min-width:\s*0/, 'a select may shrink')
  assert.match(sel, /max-width:\s*100%/, 'a select never exceeds its box')
})
