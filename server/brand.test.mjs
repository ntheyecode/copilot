// LinkNotes (the individuals edition) never shows the corporate brand: every
// string the individuals edition renders, in every language, after the
// audience overlay and the brand pass, is free of WorkCoPilot / AdmireVeda /
// admireveda.com and of a doubled "LinkNotes ... LinkNotes" byline. Legal pages
// are left exactly as written (owner decision).
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { BRANDS, brandForAudience, rebrandText, rebrandCatalog, UNBRANDED_NAMESPACES } from './brand.js'
import { LOCALE_DIR, VISIBLE, HIDDEN, loadEnglish, loadOverlay } from '../scripts/edition_copy_scan.mjs'
import { mergeOverlay } from '../src/i18n/overlay_merge.js'

const LN = BRANDS.linknotes
// A brand whose company and product share one name (the rules that drop the
// ownership line and fold "X by X" exist for that case).
const SOLO = { id: 'solo', product: 'Solo', company: 'Solo', domain: 'solo.example', site: 'https://solo.example', supportEmail: 'help@solo.example' }
const LEFTOVER = /WorkCoPilot|AdmireVeda|admireveda\.com/
const DOUBLED = /(MyTaskPilot|LinkNotes)[^.!?。！？\n]{0,24}\1(?! by)/

test('the audience decides the brand', () => {
  assert.equal(brandForAudience('individuals').id, 'linknotes')
  assert.equal(brandForAudience('organizations').id, 'admireveda')
  assert.equal(brandForAudience(null).id, 'admireveda')
})

test('MyTaskPilot by LinkNotes: product, company, bylines, domains and support mail follow the brand', () => {
  const de = { ownership: ['WorkCoPilot, ein Produkt von AdmireVeda.'], bylines: ['von AdmireVeda'] }
  assert.equal(LN.product, 'MyTaskPilot')
  assert.equal(LN.company, 'LinkNotes')
  assert.equal(rebrandText('Preise - WorkCoPilot von AdmireVeda', LN, de), 'Preise - MyTaskPilot von LinkNotes')
  assert.equal(rebrandText('Hilfe: support@admireveda.com. WorkCoPilot, ein Produkt von AdmireVeda.', LN, de), 'Hilfe: support@linknotes.com. MyTaskPilot, ein Produkt von LinkNotes.')
  assert.equal(rebrandText('Pricing - WorkCoPilot by AdmireVeda', LN), 'Pricing - MyTaskPilot by LinkNotes')
  assert.equal(rebrandText('AdmireVeda WorkCoPilot, home', LN), 'LinkNotes MyTaskPilot, home')
  assert.equal(rebrandText('खाता बनाएँ - AdmireVeda का WorkCoPilot', LN), 'खाता बनाएँ - LinkNotes का MyTaskPilot')
  assert.equal(rebrandText('Visit https://admireveda.com/workcopilot', LN), 'Visit https://linknotes.com/workcopilot')
  assert.equal(rebrandText('WorkCoPilot by AdmireVeda', BRANDS.admireveda), 'WorkCoPilot by AdmireVeda', 'the base brand is untouched')
})

test('a brand whose company is the product drops the ownership line and folds "X by X" in any word order', () => {
  const de = { ownership: ['WorkCoPilot, ein Produkt von AdmireVeda.'], bylines: ['von AdmireVeda'] }
  assert.equal(rebrandText('Preise - WorkCoPilot von AdmireVeda', SOLO, de), 'Preise - Solo')
  assert.equal(rebrandText('Hilfe: support@admireveda.com. WorkCoPilot, ein Produkt von AdmireVeda.', SOLO, de), 'Hilfe: help@solo.example.')
  assert.equal(rebrandText('AdmireVeda WorkCoPilot, home', SOLO), 'Solo, home')
  assert.equal(rebrandText('खाता बनाएँ - AdmireVeda का WorkCoPilot', SOLO), 'खाता बनाएँ - Solo')
  assert.equal(rebrandText('AdmireVeda의 WorkCoPilot - 전문가', SOLO), 'Solo - 전문가')
  assert.equal(rebrandText('WorkCoPilot plans the steps, then WorkCoPilot checks each one.', SOLO), 'Solo plans the steps, then Solo checks each one.')
})

test('legal namespaces and non-strings pass through unchanged', () => {
  const out = rebrandCatalog({ termsPage: { a: 'WorkCoPilot by AdmireVeda' }, n: 3, list: ['WorkCoPilot'] }, LN)
  assert.equal(out.termsPage.a, 'WorkCoPilot by AdmireVeda')
  assert.ok(UNBRANDED_NAMESPACES.includes('privacyPage'))
  assert.equal(out.n, 3)
  assert.deepEqual(out.list, ['MyTaskPilot'])
})

const strings = function* (v, p) {
  if (typeof v === 'string') yield [p, v]
  else if (Array.isArray(v)) for (let i = 0; i < v.length; i++) yield* strings(v[i], `${p}.${i}`)
  else if (v && typeof v === 'object') for (const k of Object.keys(v)) yield* strings(v[k], `${p}.${k}`)
}
const load = async (f) => { const m = await import(pathToFileURL(f).href); return m.default || {} }

test('every language on the individuals edition reads MyTaskPilot by LinkNotes, never the corporate brand', async () => {
  const codes = fs.readdirSync(LOCALE_DIR).filter((f) => f.endsWith('.js')).map((f) => f.replace(/\.js$/, ''))
  const en = await loadEnglish()
  const bad = []
  for (const code of codes) {
    const base = code === 'en' ? en : await load(path.join(LOCALE_DIR, `${code}.js`))
    let dict = mergeOverlay(base, (await loadOverlay('individuals', 'en')) || {})
    if (code !== 'en') dict = mergeOverlay(dict, (await loadOverlay('individuals', code)) || {})
    const out = rebrandCatalog(dict, LN)
    // Visible on the individuals edition: the copy scan's own lists (one truth).
    const hidden = Object.keys(HIDDEN.individuals || {})
    for (const ns of VISIBLE.individuals) {
      for (const [p, s] of strings(out[ns], ns)) {
        if (hidden.some((h) => p === h || p.startsWith(`${h}.`))) continue
        if (LEFTOVER.test(s) || DOUBLED.test(s)) bad.push(`${code} ${p}: ${s.slice(0, 120)}`)
      }
    }
  }
  assert.deepEqual(bad, [])
})
