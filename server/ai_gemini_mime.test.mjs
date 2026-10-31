import test from 'node:test'
import assert from 'node:assert/strict'
import { geminiImageMime } from './ai.js'

test('Gemini image type: accepted types pass, jpg maps to jpeg, anything else stays JPEG', () => {
  assert.equal(geminiImageMime('image/png'), 'image/png')
  assert.equal(geminiImageMime('IMAGE/WEBP'), 'image/webp')
  assert.equal(geminiImageMime('image/jpg'), 'image/jpeg')
  assert.equal(geminiImageMime('image/gif'), 'image/jpeg')     // the long-standing label, never a rejected type
  assert.equal(geminiImageMime('image/bmp'), 'image/jpeg')
  assert.equal(geminiImageMime(null), 'image/jpeg')
})
