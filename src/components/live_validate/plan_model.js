// The live validator's plan model: pure rules, no React, no DOM.
//
// What the plan looks like (planShape), what a step carries besides its text
// (stepMedia), how the live-session preview plays on it (simEvents / simState)
// and which previewed steps open their sub-steps without a click
// (howOpenByDefault). ONE derivation for the reveal, the step cards, the
// locked teaser and the reveal timeline, so none of them can ever disagree
// (SUPREME RULE II). Covered by plan_model.test.mjs.
import { hrefForUrl, looksLikeClickPath } from '../../shared/links.js'

// The step cards rise one after another; the CSS stagger reads the same value.
export const STEP_STAGGER_MS = 220
// The first previewed steps show their "Exactly how" sub-steps in view, no
// click needed (owner feedback 2026-10-31: a visitor must get a taste of the
// depth at once, not find it behind a small toggle). A later step stays
// collapsed behind a clear, keyboard-reachable control.
export const HOW_OPEN_COUNT = 2
export const howOpenByDefault = (i) => i < HOW_OPEN_COUNT

// What the plan looks like: the first `shown` steps in full, the rest as the
// roadmap of what a live session continues with.
export function planShape(res) {
  const preview = (res && Array.isArray(res.preview)) ? res.preview : []
  const shown = preview.length
  const roadmap = (res && Array.isArray(res.roadmap) && res.roadmap.length >= shown) ? res.roadmap : preview.map((p) => p.do)
  const total = roadmap.length
  return { preview, shown, roadmap, total, remaining: Math.max(0, total - shown) }
}

// What a step carries besides its text, named the way the server names it
// (url / path / cmd, each empty when it does not apply). A response from before
// those fields existed put all three in one "cmd" string: a link, a click path
// ("Settings > Billing > Add card") or a terminal command, told apart here so
// each still renders the right way (link-out, copy row, terminal).
export function stepMedia(p) {
  const url = String((p && p.url) || '').trim(), path = String((p && p.path) || '').trim(), cmd = String((p && p.cmd) || '').trim()
  if (url || path) {
    const href = hrefForUrl(url)
    return { href, path: path || (url && !href ? url : ''), cmd }
  }
  const href = hrefForUrl(cmd)
  if (href) return { href, path: '', cmd: '' }
  if (looksLikeClickPath(cmd)) return { href: '', path: cmd, cmd: '' }
  return { href: '', path: '', cmd }
}

// ---- The live-session preview, played on the plan ------------------------
// Simulated on purpose and labelled as such (the widget watches nothing): it
// shows, on the visitor's OWN steps, the three things a live session does that
// a list of steps cannot show. One step is seen done on screen (the guide
// hand-holds and detects completion), the next gets the guide's correction in
// its own words (it corrects a wrong turn the moment it happens), the rest tick
// through and the plan ends confirmed on screen. The events run in order, each
// after a delay from the previous one; under reduced motion the end state is
// shown at once.
export function simEvents(shown, remaining) {
  const ev = []
  const driftAt = shown > 1 ? 1 : 0   // the correction plays on step 2 when there is one
  for (let i = 0; i < shown; i++) {
    ev.push({ k: 'watch', i, ms: i === 0 ? 0 : 380 })
    if (i === driftAt) { ev.push({ k: 'drift', i, ms: 600 }); ev.push({ k: 'fixed', i, ms: 1250 }) }
    ev.push({ k: 'done', i, ms: i === driftAt ? 760 : 560 })
  }
  for (let j = 0; j < remaining; j++) ev.push({ k: 'tick', j, ms: j === 0 ? 440 : 140 })
  ev.push({ k: 'complete', ms: 380 })
  return ev
}
// Fold the events up to `at` into what the plan shows right now.
export function simState(ev, at) {
  const s = { on: at >= 0, cur: -1, done: 0, drift: -1, fixed: false, ticks: 0, complete: false }
  for (let n = 0; n <= at && n < ev.length; n++) {
    const e = ev[n]
    if (e.k === 'watch') s.cur = e.i
    else if (e.k === 'drift') s.drift = e.i
    else if (e.k === 'fixed') s.fixed = true
    else if (e.k === 'done') { s.done = e.i + 1; s.cur = -1 }
    else if (e.k === 'tick') s.ticks = e.j + 1
    else if (e.k === 'complete') s.complete = true
  }
  return s
}
