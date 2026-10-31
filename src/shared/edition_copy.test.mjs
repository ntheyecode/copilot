// Edition wording: the overlays are complete in every locale and the banned
// wording never reaches a surface the audience can see (the same check as the
// prebuild gate scripts/check-edition-copy.mjs), plus the scanner itself
// catches what it exists for. Runs in `npm test` (src/shared/*.test.mjs).
import test from 'node:test'
import assert from 'node:assert/strict'
import { runAll, scanAudience, INDIVIDUALS_BANNED, ORGANIZATIONS_BANNED, checkOverlayShape, checkOverlayParity } from '../../scripts/edition_copy_scan.mjs'
import { mergeOverlay } from '../i18n/overlay_merge.js'

test('every audience overlay is well formed and complete in every locale', async () => {
  const { problems } = await runAll()
  assert.deepEqual(problems, [])
})

test('the individuals edition reads no company wording, the organizations edition no personal-plan wording', async () => {
  const { hits } = await runAll()
  assert.deepEqual(hits.individuals.map((h) => `${h.path}: ${h.word}`), [])
  assert.deepEqual(hits.organizations.map((h) => `${h.path}: ${h.word}`), [])
})

test('the banned lists catch the shapes they exist for', () => {
  for (const s of ['Ask your company admin', 'For teams', 'Enterprise sign-in', 'company SSO', 'single sign-on', 'your organization', 'Data governance', 'a trainer published', 'Executive dashboard', 'seat pools']) assert.match(s, INDIVIDUALS_BANNED, s)
  for (const s of ['11:59 PM ET', 'Your plan', 'a step-by-step guide', 'Microsoft']) assert.doesNotMatch(s, INDIVIDUALS_BANNED, s)
  for (const s of ['Start free', 'It is free to create an account', 'Free account, choose a plan', 'Four self-service plans']) assert.match(s, ORGANIZATIONS_BANNED, s)
})

test('the scan skips hidden surfaces and flags visible ones', () => {
  const en = { nav: { enterprise: 'Enterprise', how: 'How it works' }, home: { roi: { h2: 'For your company' }, final: { p: 'Bring your team' } } }
  const hits = scanAudience(en, 'individuals').map((h) => h.path)
  assert.deepEqual(hits, ['home.final.p'])
})

test('overlay shape and parity checks fail loudly', () => {
  const en = { a: { b: 'x', list: ['p', 'q'] } }
  assert.deepEqual(checkOverlayShape(en, { a: { b: 'y', list: { 1: 'r' } } }, 't'), [])
  assert.match(checkOverlayShape(en, { a: { nope: 'y' } }, 't')[0], /not a key of the base catalog/)
  assert.match(checkOverlayShape(en, { a: { b: ['y'] } }, 't')[0], /is array, the base catalog has string/)
  assert.match(checkOverlayParity({ a: { b: 'y' } }, {}, 't', 'de')[0], /missing a\.b/)
  assert.match(checkOverlayParity({ a: { b: 'y' } }, { a: { b: 'y', c: 'z' } }, 't', 'de')[0], /extra a\.c/)
})

test('the overlay merge: deep objects, whole-array replace, index patches, inputs untouched', () => {
  const base = { a: { b: 'x', c: 'y' }, list: [{ t: '1', d: 'one' }, { t: '2', d: 'two' }], chips: ['a', 'b', 'c'] }
  const out = mergeOverlay(base, { a: { b: 'X' }, list: { 1: { d: 'TWO' } }, chips: ['z'] })
  assert.deepEqual(out, { a: { b: 'X', c: 'y' }, list: [{ t: '1', d: 'one' }, { t: '2', d: 'TWO' }], chips: ['z'] })
  assert.equal(base.list[1].d, 'two', 'base is not mutated')
  assert.ok(Array.isArray(out.list))
  assert.equal(mergeOverlay(base, undefined), base)
})
