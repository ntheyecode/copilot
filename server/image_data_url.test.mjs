import test from 'node:test'
import assert from 'node:assert/strict'
import { parseImageDataUrl, isImageDataUrl, MAX_IMAGE_BYTES } from './image_data_url.js'

const PNG4 = 'data:image/png;base64,' + Buffer.from([0x89, 0x50, 0x4e, 0x47]).toString('base64')

test('accepts jpeg/png/webp and reports the type', () => {
  const v = parseImageDataUrl(PNG4)
  assert.equal(v.ok, true)
  assert.equal(v.mime, 'image/png')
  assert.equal(v.ext, 'png')
  assert.ok(Buffer.isBuffer(v.buffer))
  assert.equal(v.buffer.length, 4)
  assert.equal(parseImageDataUrl('data:image/jpeg;base64,AAAA').ext, 'jpg')
  assert.equal(parseImageDataUrl('data:image/webp;base64,AAAA').ext, 'webp')
})

test('another image type passes with ext:null (the session-shot route still accepts it)', () => {
  const v = parseImageDataUrl('data:image/gif;base64,AAAA')
  assert.equal(v.ok, true)
  assert.equal(v.ext, null)
})

test('rejections keep the exact messages and statuses the shot route always used', () => {
  assert.deepEqual(parseImageDataUrl('nope'), { ok: false, status: 400, error: 'dataUrl must be an image data URL (data:image/...).' })
  assert.deepEqual(parseImageDataUrl('data:image/png'), { ok: false, status: 400, error: 'dataUrl is malformed (no base64 payload).' })
  assert.deepEqual(parseImageDataUrl('data:image/png;base64,'), { ok: false, status: 400, error: 'dataUrl has no image payload.' })
  const big = 'data:image/png;base64,' + 'A'.repeat(Math.ceil(((MAX_IMAGE_BYTES + 10) * 4) / 3))
  const r = parseImageDataUrl(big, { decode: false })
  assert.equal(r.ok, false)
  assert.equal(r.status, 413)
})

test('decode:false skips the buffer; isImageDataUrl guards type', () => {
  assert.equal(parseImageDataUrl(PNG4, { decode: false }).buffer, null)
  assert.equal(isImageDataUrl(PNG4), true)
  assert.equal(isImageDataUrl(42), false)
})
