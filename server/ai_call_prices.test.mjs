// Transcription and image list prices (server/ai_call_prices.js): every entry
// names its official source and the date it was checked, the prices match the
// providers' pages as read on 2026-10-30, and every model the code can pick by
// name is priced (an unknown one stays "unpriced", never $0 or the text rate).
import test from 'node:test'
import assert from 'node:assert/strict'
import { SOURCES, AUDIO_PRICES_PER_MIN, CALL_TOKEN_PRICES, priceAt, audioPerMinute } from './ai_call_prices.js'
import { costOfEntry } from './ai_usage.js'
import { OPENAI_IMAGE_MODEL, GEMINI_IMAGE_MODEL } from './work-images.js'
import { TRANSCRIBE_FALLBACK, TRANSCRIBE_PREFS } from './ai_transcribe.js'

const OFFICIAL = /^https:\/\/(developers\.openai\.com|ai\.google\.dev|console\.groq\.com)\//
const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''))

test('every price entry carries an official source URL and the date it was checked', () => {
  for (const s of Object.values(SOURCES)) {
    assert.match(s.url, OFFICIAL)
    assert.ok(isDate(s.checked), s.url)
  }
  const all = [
    ...Object.entries(AUDIO_PRICES_PER_MIN),
    ...Object.entries(CALL_TOKEN_PRICES.transcribe),
    ...Object.entries(CALL_TOKEN_PRICES.image),
  ]
  for (const [model, e] of all) {
    assert.ok(e.src && OFFICIAL.test(e.src.url) && isDate(e.src.checked), `${model} has no source`)
  }
})

test('prices as published on 2026-10-30 (OpenAI cut its token-billed transcription rates)', () => {
  assert.deepEqual([CALL_TOKEN_PRICES.transcribe['gpt-4o-transcribe'].input, CALL_TOKEN_PRICES.transcribe['gpt-4o-transcribe'].output], [2.50, 10.00])
  assert.deepEqual([CALL_TOKEN_PRICES.transcribe['gpt-4o-mini-transcribe'].input, CALL_TOKEN_PRICES.transcribe['gpt-4o-mini-transcribe'].output], [1.25, 5.00])
  assert.equal(audioPerMinute('gpt-transcribe'), 0.0045)
  assert.equal(audioPerMinute('openai/whisper-1'), 0.006)
  assert.equal(CALL_TOKEN_PRICES.image['gpt-image-2'].output, 30)
  assert.equal(costOfEntry({ provider: 'openai', model: 'gpt-4o-mini-transcribe', call: 'transcribe', inTokens: 1_000_000, outTokens: 0 }).usd, 1.25)
})

test('dated prices: the rate in force on the day of the call', () => {
  const e = CALL_TOKEN_PRICES.transcribe['gemini-3.8-flash']
  assert.equal(priceAt(e, Date.UTC(2026, 11, 31, 23)).input, 0.75)
  assert.equal(priceAt(e, Date.UTC(2027, 0, 1, 1)).input, 1.50)
  const before = costOfEntry({ provider: 'gemini', model: 'gemini-3.8-flash', call: 'transcribe', inTokens: 1_000_000, outTokens: 0, at: Date.UTC(2026, 9, 30) })
  const after = costOfEntry({ provider: 'gemini', model: 'gemini-3.8-flash', call: 'transcribe', inTokens: 1_000_000, outTokens: 0, at: Date.UTC(2027, 1, 1) })
  assert.deepEqual([before.usd, after.usd], [0.75, 1.5])
})

test('every model the code names for images and transcription is priced', () => {
  for (const m of [OPENAI_IMAGE_MODEL, GEMINI_IMAGE_MODEL]) {
    assert.equal(costOfEntry({ model: m, call: 'image', inTokens: 1, outTokens: 1 }).priced, true, m)
  }
  for (const m of Object.values(TRANSCRIBE_FALLBACK)) assert.ok(audioPerMinute(m) != null, m)
  // Exact ids in the preference lists (/^id$/), the ones the picker asks for by name.
  const exact = Object.values(TRANSCRIBE_PREFS).flat().map((re) => (/^\^([\w.-]+)\$$/.exec(re.source) || [])[1]).filter(Boolean)
  assert.ok(exact.length >= 4)
  for (const m of exact) assert.ok(audioPerMinute(m) != null, `${m} has no per-minute price`)
})

test('an unknown model stays unpriced: counted and flagged, never $0 at a guessed rate', () => {
  assert.deepEqual(costOfEntry({ model: 'gemini-flash-latest', call: 'transcribe', inTokens: 10 }), { usd: 0, priced: false })
  assert.deepEqual(costOfEntry({ model: 'some-new-image-model', call: 'image', outTokens: 10 }), { usd: 0, priced: false })
  assert.deepEqual(costOfEntry({ model: 'mystery-whisper', audioSeconds: 30 }), { usd: 0, priced: false })
})
