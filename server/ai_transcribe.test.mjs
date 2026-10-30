import test from 'node:test'
import assert from 'node:assert/strict'
import {
  canTranscribe, pickTranscribeRuntime, chooseTranscribeModel, wantsSegments,
  parseAudioPayload, transcribeAudio, AI_NO_TRANSCRIBE,
} from './ai_transcribe.js'

const groq = { providerId: 'groq', apiKey: 'gsk_test_1' }
const openai = { providerId: 'openai', apiKey: 'sk-test-1' }
const gemini = { providerId: 'gemini', apiKey: 'AIza-test', chatModel: 'gemini-2.5-flash' }
const openrouter = { providerId: 'openrouter', apiKey: 'sk-or-1' }

test('only Groq, OpenAI and Gemini can transcribe, and only with a key', () => {
  assert.equal(canTranscribe(groq), true)
  assert.equal(canTranscribe(openai), true)
  assert.equal(canTranscribe(gemini), true)
  assert.equal(canTranscribe(openrouter), false)
  assert.equal(canTranscribe({ providerId: 'groq' }), false)
  assert.equal(canTranscribe({ providerId: 'moonshot', apiKey: 'x' }), false)
})

test('picks a transcription-capable runtime from the failover ladder and flags the switch', () => {
  const onSwitch = () => {}
  assert.deepEqual(pickTranscribeRuntime(groq), { rt: groq, switched: false })
  const p = pickTranscribeRuntime({ ...openrouter, onSwitch, alternates: [{ providerId: 'moonshot', apiKey: 'm' }, openai] })
  assert.equal(p.switched, true)
  assert.equal(p.rt.providerId, 'openai')
  assert.equal(p.rt.onSwitch, onSwitch)
  assert.equal(p.fromProvider, 'openrouter')
  assert.equal(pickTranscribeRuntime({ ...openrouter, alternates: [] }), null)
})

test('model choice prefers the cheapest dependable model on the key, never diarize or preview', () => {
  assert.equal(chooseTranscribeModel('groq', ['whisper-large-v3', 'whisper-large-v3-turbo', 'llama-3']), 'whisper-large-v3-turbo')
  assert.equal(chooseTranscribeModel('openai', ['whisper-1', 'gpt-4o-transcribe-diarize', 'gpt-4o-mini-transcribe']), 'gpt-4o-mini-transcribe')
  assert.equal(chooseTranscribeModel('openai', ['whisper-1', 'gpt-4o-mini-transcribe'], { avoid: 'gpt-4o-mini-transcribe' }), 'whisper-1')
  assert.equal(chooseTranscribeModel('groq', ['llama-3']), null)
  assert.equal(wantsSegments('whisper-large-v3-turbo'), true)
  assert.equal(wantsSegments('gpt-4o-mini-transcribe'), false)
})

test('audio payload validation: type, size, data-URL form, language', () => {
  const wav = Buffer.from('RIFFxxxxWAVE').toString('base64')
  const ok = parseAudioPayload({ audio: wav, mime: 'audio/wav', language: 'DE' })
  assert.equal(ok.ok, true)
  assert.equal(ok.language, 'de')
  assert.equal(parseAudioPayload({ audio: `data:audio/webm;codecs=opus;base64,${wav}` }).mime, 'audio/webm')
  assert.equal(parseAudioPayload({ audio: wav, mime: 'audio/x-wav' }).mime, 'audio/wav')
  assert.equal(parseAudioPayload({ audio: wav, mime: 'video/mp4' }).status, 400)
  assert.equal(parseAudioPayload({ mime: 'audio/wav' }).status, 400)
  assert.equal(parseAudioPayload({ audio: wav, mime: 'audio/wav', language: 'english' }).language, null)
})

// ---- network paths, with fetch stubbed --------------------------------------
function stubFetch(handler) {
  const real = globalThis.fetch
  const calls = []
  globalThis.fetch = async (url, init = {}) => { calls.push({ url: String(url), init }); return handler(String(url), init, calls.length) }
  return { calls, restore: () => { globalThis.fetch = real } }
}
const json = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body })
const AUDIO = Buffer.from('fake-wav-bytes')

test('Groq: lists models, sends multipart to /audio/transcriptions, returns segments', async () => {
  const s = stubFetch((url) => {
    if (url.endsWith('/models')) return json(200, { data: [{ id: 'whisper-large-v3-turbo' }, { id: 'llama' }] })
    return json(200, { text: 'open transfers', segments: [{ start: 0.5, end: 1.9, text: ' open transfers ' }] })
  })
  try {
    const out = await transcribeAudio({ ...groq, apiKey: 'gsk_test_2' }, { audio: AUDIO, mime: 'audio/wav', language: 'en' })
    assert.equal(out.text, 'open transfers')
    assert.deepEqual(out.segments, [{ startMs: 500, endMs: 1900, text: 'open transfers' }])
    assert.equal(out.model, 'whisper-large-v3-turbo')
    const post = s.calls.find((c) => c.url.endsWith('/audio/transcriptions'))
    assert.ok(post.url.startsWith('https://api.groq.com/'))
    assert.ok(post.init.body instanceof FormData)
    assert.equal(post.init.body.get('response_format'), 'verbose_json')
    assert.equal(post.init.body.get('language'), 'en')
  } finally { s.restore() }
})

test('OpenAI mini transcribe returns text only; silence is an empty string, not an error', async () => {
  const s = stubFetch((url) => (url.endsWith('/models') ? json(200, { data: [{ id: 'gpt-4o-mini-transcribe' }] }) : json(200, { text: '' })))
  try {
    const out = await transcribeAudio({ ...openai, apiKey: 'sk-test-2' }, { audio: AUDIO })
    assert.equal(out.text, '')
    assert.equal(out.segments, null)
  } finally { s.restore() }
})

test('Gemini: inline audio through generateContent', async () => {
  const s = stubFetch(() => json(200, { candidates: [{ content: { parts: [{ text: 'approve the request' }] } }] }))
  try {
    const out = await transcribeAudio(gemini, { audio: AUDIO, mime: 'audio/wav' })
    assert.equal(out.text, 'approve the request')
    assert.ok(s.calls[0].url.includes('/models/gemini-2.5-flash:generateContent'))
    const body = JSON.parse(s.calls[0].init.body)
    assert.equal(body.contents[0].parts[1].inline_data.mime_type, 'audio/wav')
  } finally { s.restore() }
})

test('a retired model self-heals to a current one on the same key, and the switch is recorded', async () => {
  const switches = []
  let n = 0
  const s = stubFetch((url) => {
    if (url.endsWith('/models')) return json(200, { data: [{ id: 'whisper-large-v3-turbo' }, { id: 'whisper-large-v3' }] })
    n++
    return n === 1 ? json(404, { error: { message: 'The model whisper-large-v3-turbo has been decommissioned' } }) : json(200, { text: 'ok', segments: [] })
  })
  try {
    const out = await transcribeAudio({ ...groq, apiKey: 'gsk_test_3', onSwitch: (e) => switches.push(e) }, { audio: AUDIO })
    assert.equal(out.model, 'whisper-large-v3')
    assert.equal(switches.length, 1)
    assert.equal(switches[0].scope, 'transcribe')
    assert.equal(switches[0].toModel, 'whisper-large-v3')
  } finally { s.restore() }
})

test('an unsupported provider and a key error both fail loudly', async () => {
  await assert.rejects(transcribeAudio(openrouter, { audio: AUDIO }), (e) => e.code === AI_NO_TRANSCRIBE && e.ai === true)
  const s = stubFetch((url) => (url.endsWith('/models') ? json(200, { data: [{ id: 'whisper-1' }] }) : json(401, { error: { message: 'Incorrect API key' } })))
  try {
    await assert.rejects(transcribeAudio({ ...openai, apiKey: 'sk-bad-key' }, { audio: AUDIO }), (e) => e.status === 401 && e.ai === true)
  } finally { s.restore() }
})
