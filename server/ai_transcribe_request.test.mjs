// Transcription request shapes per model family, the gpt-transcribe path end to
// end (stubbed at the HTTP boundary), and per-minute booking from the audio we
// send. No real AI calls.
import test from 'node:test'
import assert from 'node:assert/strict'
import { transcribeFamily, transcribeFields, buildTranscribeForm, wantsSegments } from './ai_transcribe_request.js'
import { transcribeAudio, chooseTranscribeModel, transcribeFallback, transcribeUsage } from './ai_transcribe.js'
import { wavDurationSeconds, audioDurationSeconds } from './audio_duration.js'
import { createUsageScope, runInUsageScope, drainUsage, costOfEntry } from './ai_usage.js'
import { billsPerMinute } from './ai_call_prices.js'

// A real PCM WAV: 16 kHz, mono, 16-bit, `secs` seconds of silence.
function wav(secs, rate = 16000) {
  const data = Math.round(secs * rate) * 2
  const b = Buffer.alloc(44 + data)
  b.write('RIFF', 0); b.writeUInt32LE(36 + data, 4); b.write('WAVE', 8)
  b.write('fmt ', 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22)
  b.writeUInt32LE(rate, 24); b.writeUInt32LE(rate * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34)
  b.write('data', 36); b.writeUInt32LE(data, 40)
  return b
}

test('gpt-transcribe: a languages array replaces language, no verbose segments, no sampling fields', () => {
  assert.equal(transcribeFamily('gpt-transcribe'), 'languages')
  assert.deepEqual(transcribeFields('gpt-transcribe', { language: 'de' }), [['model', 'gpt-transcribe'], ['languages[]', 'de']])
  assert.deepEqual(transcribeFields('gpt-transcribe'), [['model', 'gpt-transcribe']])
  const form = buildTranscribeForm('gpt-transcribe', { audio: wav(1), mime: 'audio/wav', filename: 'chunk.wav', language: 'fr' })
  assert.deepEqual(form.getAll('languages[]'), ['fr'])
  for (const banned of ['language', 'response_format', 'timestamp_granularities[]', 'temperature']) assert.equal(form.get(banned), null, banned)
  assert.ok(form.get('file'))
  assert.equal(wantsSegments('gpt-transcribe'), false)
})

test('whisper keeps verbose_json segments and the singular language', () => {
  for (const m of ['whisper-1', 'whisper-large-v3-turbo']) {
    const form = buildTranscribeForm(m, { audio: wav(1), mime: 'audio/wav', filename: 'chunk.wav', language: 'en' })
    assert.equal(form.get('response_format'), 'verbose_json', m)
    assert.equal(form.get('language'), 'en', m)
    assert.equal(form.get('languages[]'), null, m)
    assert.equal(wantsSegments(m), true, m)
  }
  const mini = buildTranscribeForm('gpt-4o-mini-transcribe', { audio: wav(1), mime: 'audio/wav', filename: 'c.wav', language: 'en' })
  assert.equal(mini.get('response_format'), 'json')
  assert.equal(mini.get('language'), 'en')
  assert.equal(mini.get('languages[]'), null)
})

test('a malformed language code is never sent', () => {
  assert.deepEqual(transcribeFields('gpt-transcribe', { language: 'english' }), [['model', 'gpt-transcribe']])
  assert.equal(transcribeFields('whisper-1', { language: 'EN' }).some(([k]) => k === 'language'), false)
})

test('the picker moves to gpt-transcribe once the older models shut down, and the fallback follows', () => {
  const ids = ['whisper-1', 'gpt-4o-mini-transcribe', 'gpt-transcribe', 'gpt-4o-transcribe-diarize']
  assert.equal(chooseTranscribeModel('openai', ids, { at: '2026-10-31' }), 'gpt-4o-mini-transcribe')
  assert.equal(chooseTranscribeModel('openai', ids, { at: '2027-02-26' }), 'gpt-transcribe')
  // When the cheap model fails, its named replacement comes first (not whisper-1).
  assert.equal(chooseTranscribeModel('openai', ids, { at: '2026-10-31', avoid: 'gpt-4o-mini-transcribe' }), 'gpt-transcribe')
  assert.equal(transcribeFallback('openai', '2026-10-31'), 'gpt-4o-mini-transcribe')
  assert.equal(transcribeFallback('openai', '2027-03-01'), 'gpt-transcribe')
  assert.equal(transcribeFallback('groq', '2027-03-01'), 'whisper-large-v3-turbo')
})

test('WAV duration is read from the header; other containers are unknown, not guessed', () => {
  assert.equal(wavDurationSeconds(wav(2.5)), 2.5)
  assert.equal(audioDurationSeconds(wav(1), 'audio/x-wav'), 1)
  assert.equal(audioDurationSeconds(Buffer.from('webm-bytes'), 'audio/webm'), null)
  assert.equal(wavDurationSeconds(Buffer.from('not a wav file at all, just some bytes padding it')), null)
})

test('gpt-transcribe is booked per minute from the audio we sent when the response has no usage', () => {
  assert.equal(billsPerMinute('gpt-transcribe'), true)
  assert.equal(billsPerMinute('gpt-4o-mini-transcribe'), false)   // token-billed
  assert.deepEqual(transcribeUsage('gpt-transcribe', { text: 'hi' }, wav(30), 'audio/wav'), { audioSeconds: 30 })
  // Token counts the provider does not bill by are replaced by the minutes.
  assert.deepEqual(transcribeUsage('gpt-transcribe', { text: 'hi', usage: { input_tokens: 9, output_tokens: 2 } }, wav(6), 'audio/wav'), { audioSeconds: 6 })
  // A stated duration wins.
  assert.deepEqual(transcribeUsage('gpt-transcribe', { usage: { type: 'duration', seconds: 7 } }, wav(6), 'audio/wav'), { audioSeconds: 7 })
  // Token-billed models keep their tokens.
  assert.equal(transcribeUsage('gpt-4o-mini-transcribe', { usage: { input_tokens: 10, output_tokens: 3 } }, wav(6), 'audio/wav').inTokens, 10)
  const c = costOfEntry({ provider: 'openai', model: 'gpt-transcribe', call: 'transcribe', audioSeconds: 60 })
  assert.deepEqual(c, { usd: 0.0045, priced: true })
})

test('end to end: a catalog of current models only sends a gpt-transcribe request with languages', async () => {
  const real = globalThis.fetch
  const calls = []
  const json = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body })
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), init })
    if (String(url).endsWith('/models')) return json(200, { data: [{ id: 'gpt-transcribe' }, { id: 'gpt-6-luna' }] })
    return json(200, { text: 'Open the billing page.', languages: ['en'] })
  }
  const scope = createUsageScope({})
  try {
    const out = await runInUsageScope(scope, () => transcribeAudio({ providerId: 'openai', apiKey: 'sk-lifecycle-gt1' }, { audio: wav(12), mime: 'audio/wav', language: 'en' }))
    assert.equal(out.model, 'gpt-transcribe')
    assert.equal(out.text, 'Open the billing page.')
    assert.equal(out.segments, null)
    const post = calls.find((c) => c.url.endsWith('/audio/transcriptions'))
    assert.deepEqual(post.init.body.getAll('languages[]'), ['en'])
    assert.equal(post.init.body.get('language'), null)
    assert.equal(post.init.body.get('response_format'), null)
    const [entry] = runInUsageScope(scope, () => drainUsage())
    assert.equal(entry.audioSeconds, 12)
    assert.equal(entry.actual, true)
    assert.ok(Math.abs(costOfEntry(entry).usd - 0.0045 * 12 / 60) < 1e-12)
  } finally { globalThis.fetch = real }
})
