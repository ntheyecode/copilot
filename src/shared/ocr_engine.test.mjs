// The OCR engine's version is one fact (src/shared/ocr_engine.js) and its
// result is read one way (ocrLines). Guards:
//  - the browser CDN version, the desktop bundle and its core never drift;
//  - lines are read from the tesseract.js 6+ block tree (a top-level `lines`
//    read silently found nothing after the 5 -> 7 upgrade and would have left
//    every sensitive line unmasked);
//  - "text but no line boxes" is reported, so the redactor fails safe.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { OCR_VERSION, OCR_DIST, OCR_CORE, OCR_OUTPUT, ocrLines, ocrLostLineBoxes } from './ocr_engine.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')

test('the browser OCR version is the one the desktop app bundles (and its core)', () => {
  const lock = JSON.parse(fs.readFileSync(path.join(ROOT, 'workcopilot', 'package-lock.json'), 'utf8'))
  const pkgs = lock.packages || {}
  assert.equal(pkgs['node_modules/tesseract.js'] && pkgs['node_modules/tesseract.js'].version, OCR_VERSION)
  assert.equal(pkgs['node_modules/tesseract.js-core'] && pkgs['node_modules/tesseract.js-core'].version, OCR_VERSION)
  assert.ok(OCR_DIST.includes(`tesseract.js@${OCR_VERSION}/`) && OCR_CORE.endsWith(`tesseract.js-core@${OCR_VERSION}`))
})

test('no other file pins its own OCR version', () => {
  const hits = []
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name.startsWith('.')) continue
      const p = path.join(d, e.name)
      if (e.isDirectory()) walk(p)
      else if (/\.(m?js|jsx)$/.test(e.name) && !p.endsWith('ocr_engine.js') && !p.endsWith('ocr_engine.test.mjs')) {
        if (/tesseract\\?\.js(-core)?@\d/.test(fs.readFileSync(p, 'utf8'))) hits.push(path.relative(ROOT, p))
      }
    }
  }
  for (const d of ['src', 'server', 'e2e']) walk(path.join(ROOT, d))
  assert.deepEqual(hits, [])
})

test('recognize is asked for the block tree', () => {
  assert.equal(OCR_OUTPUT.blocks, true)
  assert.equal(OCR_OUTPUT.text, true)
})

const box = (x0, y0, x1, y1) => ({ x0, y0, x1, y1 })

test('ocrLines walks blocks > paragraphs > lines (tesseract.js 6+)', () => {
  const data = {
    text: 'Card 4111 1111 1111 1111\nTotal 12\nOK',
    blocks: [
      { paragraphs: [{ lines: [{ text: 'Card 4111 1111 1111 1111', bbox: box(1, 2, 3, 4) }, { text: 'Total 12', bbox: box(5, 6, 7, 8) }] }] },
      { paragraphs: [{ lines: [{ text: 'OK', bbox: box(9, 9, 10, 10) }] }, { lines: null }] },
      null,
    ],
  }
  const lines = ocrLines(data)
  assert.deepEqual(lines.map((l) => l.text), ['Card 4111 1111 1111 1111', 'Total 12', 'OK'])
  assert.deepEqual(lines[0].bbox, box(1, 2, 3, 4))
  assert.equal(ocrLostLineBoxes(data, lines), false)
})

test('ocrLines still reads a legacy top-level lines array', () => {
  const lines = ocrLines({ text: 'a', lines: [{ text: 'a', bbox: box(0, 0, 1, 1) }, null] })
  assert.equal(lines.length, 1)
})

test('text with no line boxes is reported, so the redactor fails safe', () => {
  for (const data of [{ text: 'secret 4111 1111 1111 1111' }, { text: 'x', blocks: null }, { text: 'x', blocks: [] }]) {
    assert.equal(ocrLostLineBoxes(data, ocrLines(data)), true, JSON.stringify(data))
  }
  assert.equal(ocrLostLineBoxes({ text: '   ' }, []), false, 'a blank frame is simply clean')
  assert.equal(ocrLostLineBoxes(null, []), false)
})
