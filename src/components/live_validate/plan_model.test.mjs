// The live validator's plan model: the reveal, the step cards, the locked
// teaser and the live-session preview all read ONE derivation. These checks
// pin the rules a visitor relies on:
//   * the first HOW_OPEN_COUNT previewed steps open their sub-steps without a
//     click, a later one stays collapsed (behind a real control);
//   * the teaser never invents content: planShape only ever hands out the
//     titles the server sent (roadmap) and never a sub-step for a locked step;
//   * the simulated preview walks every previewed step, ticks every remaining
//     one and ends complete, so the timeline and the list can never disagree.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { planShape, stepMedia, simEvents, simState, howOpenByDefault, HOW_OPEN_COUNT } from './plan_model.js'

const res = {
  preview: [
    { do: 'Open the admin center', url: 'https://admin.example.test', how: ['Sign in', 'Pick Users'] },
    { do: 'Add the user', path: 'Users > Active users > Add a user', how: ['Fill the name', 'Set the domain', 'Next'] },
    { do: 'Assign the licence', how: ['Tick the product', 'Finish'] },
  ],
  roadmap: ['Open the admin center', 'Add the user', 'Assign the licence', 'Send the sign-in details', 'Confirm the mailbox'],
}

test('the first HOW_OPEN_COUNT steps open their sub-steps by default, later ones do not', () => {
  assert.equal(HOW_OPEN_COUNT, 2)
  assert.equal(howOpenByDefault(0), true)
  assert.equal(howOpenByDefault(1), true)
  assert.equal(howOpenByDefault(2), false)
  assert.equal(howOpenByDefault(7), false)
})

test('planShape: shown steps in full, the rest as server titles only (nothing invented)', () => {
  const s = planShape(res)
  assert.equal(s.shown, 3)
  assert.equal(s.total, 5)
  assert.equal(s.remaining, 2)
  assert.deepEqual(s.roadmap.slice(s.shown), ['Send the sign-in details', 'Confirm the mailbox'])
  // every locked entry is a plain title string: no how[] / cmd / url to show
  for (const title of s.roadmap.slice(s.shown)) assert.equal(typeof title, 'string')
})

test('planShape: a short or missing roadmap falls back to the preview titles', () => {
  const s = planShape({ preview: res.preview, roadmap: ['only one'] })
  assert.deepEqual(s.roadmap, res.preview.map((p) => p.do))
  assert.equal(s.remaining, 0)
  const e = planShape(null)
  assert.deepEqual(e, { preview: [], shown: 0, roadmap: [], total: 0, remaining: 0 })
})

test('stepMedia tells a link, a click path and a command apart', () => {
  assert.equal(stepMedia(res.preview[0]).href, 'https://admin.example.test')
  assert.equal(stepMedia(res.preview[1]).path, 'Users > Active users > Add a user')
  assert.deepEqual(stepMedia({ cmd: 'npm test' }), { href: '', path: '', cmd: 'npm test' })
  assert.deepEqual(stepMedia({ cmd: 'Settings > Billing > Add card' }), { href: '', path: 'Settings > Billing > Add card', cmd: '' })
})

test('the simulated preview covers every shown step, every remaining step, then completes', () => {
  const { shown, remaining } = planShape(res)
  const ev = simEvents(shown, remaining)
  const end = simState(ev, ev.length - 1)
  assert.equal(end.done, shown)
  assert.equal(end.ticks, remaining)
  assert.equal(end.complete, true)
  assert.equal(end.fixed, true)
  assert.equal(end.drift, 1, 'the correction plays on step 2 when there is one')
  assert.equal(simState(ev, -1).on, false)
  // one step at a time: while a step is watched no other is done past it
  for (let at = 0; at < ev.length; at++) {
    const s = simState(ev, at)
    if (s.cur >= 0) assert.equal(s.done, s.cur, 'the watched step is the next one after the done ones')
  }
})
