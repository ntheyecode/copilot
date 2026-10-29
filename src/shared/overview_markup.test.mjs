// The overview markup parser: markers become typed tokens, never literal
// characters; whitespace collapses; unmatched runs are dropped; any script
// (including right-to-left Arabic) parses the same way.
import test from 'node:test'
import assert from 'node:assert/strict'
import { parseOverview, overviewPlainText, hasOverview } from './overview_markup.js'

const types = (s) => parseOverview(s).map((t) => t.type)
const noMarkers = (s) => { const out = parseOverview(s).map((t) => t.text).join(''); assert.ok(!/\*\*|==/.test(out), 'a literal marker leaked: ' + out); return out }

test('the three markers become bold / mark / em tokens, everything else text', () => {
  const toks = parseOverview('You will **export the pipeline** from the sheet. ==Done when three CSV files are downloaded==. *Large sheets take a minute.*')
  assert.deepEqual(toks, [
    { type: 'text', text: 'You will ' },
    { type: 'bold', text: 'export the pipeline' },
    { type: 'text', text: ' from the sheet. ' },
    { type: 'mark', text: 'Done when three CSV files are downloaded' },
    { type: 'text', text: '. ' },
    { type: 'em', text: 'Large sheets take a minute.' },
  ])
})

test('whitespace collapses to one paragraph', () => {
  assert.equal(overviewPlainText('  First   line.\n\nSecond\tline.  '), 'First line. Second line.')
})

test('empty / null / marker-only input renders nothing', () => {
  assert.deepEqual(parseOverview(''), [])
  assert.deepEqual(parseOverview(null), [])
  assert.deepEqual(parseOverview('   '), [])
  assert.deepEqual(parseOverview('****'), [])
  assert.equal(hasOverview(undefined), false)
  assert.equal(hasOverview('**Do it**'), true)
})

test('unmatched ** and == are dropped, never shown raw; a lone * stays literal', () => {
  assert.equal(noMarkers('Start **the export and stop.'), 'Start the export and stop.')
  assert.equal(noMarkers('==Done when it works'), 'Done when it works')
  assert.equal(overviewPlainText('Multiply 5 * 3 and move on'), 'Multiply 5 * 3 and move on')
  assert.deepEqual(types('Multiply 5 * 3 and move on'), ['text'])
})

test('nested markers inside an emphasis are stripped so the inner text reads clean', () => {
  const toks = parseOverview('**Register the ==domain== now**.')
  assert.deepEqual(toks, [{ type: 'bold', text: 'Register the domain now' }, { type: 'text', text: '.' }])
  assert.deepEqual(parseOverview('***Really*** bold'), [{ type: 'bold', text: 'Really' }, { type: 'text', text: ' bold' }])
})

test('italics need a tight span: "a * b * c" is not emphasis, "*note*" is', () => {
  assert.deepEqual(types('a * b * c'), ['text'])
  assert.deepEqual(parseOverview('*note*'), [{ type: 'em', text: 'note' }])
  assert.deepEqual(parseOverview('see *this one* here'), [{ type: 'text', text: 'see ' }, { type: 'em', text: 'this one' }, { type: 'text', text: ' here' }])
})

test('the derived server overview (project + goal + done-state) parses', () => {
  const s = 'Part of the project **Portal**. You will **migrate the articles**. ==Done when all links resolve==.'
  assert.deepEqual(types(s), ['text', 'bold', 'text', 'bold', 'text', 'mark', 'text'])
})

test('non-English and right-to-left text parse identically (no word-character assumption)', () => {
  const de = parseOverview('Sie werden **die Pipeline exportieren**. ==Fertig, wenn drei Dateien vorliegen==. *Dauert etwa eine Minute.*')
  assert.deepEqual(de.map((t) => t.type), ['text', 'bold', 'text', 'mark', 'text', 'em'])
  const ar = parseOverview('ستقوم **بتصدير خط المبيعات** من الجدول. ==يُعد منجزًا عند تنزيل ثلاثة ملفات==. *قد يستغرق دقيقة.*')
  assert.deepEqual(ar.map((t) => t.type), ['text', 'bold', 'text', 'mark', 'text', 'em'])
  assert.equal(ar[1].text, 'بتصدير خط المبيعات')
  const ja = parseOverview('**パイプラインを書き出し**ます。==3つのCSVが保存されたら完了==。')
  assert.deepEqual(ja.map((t) => t.type), ['bold', 'text', 'mark', 'text'])
})
