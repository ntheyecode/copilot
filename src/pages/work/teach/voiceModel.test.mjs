import test from 'node:test'
import assert from 'node:assert/strict'
import {
  transcribeLanguage, narrationLanguages, blockStartMs, pushCaption, speakerKey, voiceWarningLines,
  scanStepFor, LONG_VIDEO_MS, soundtrackUtterances, looksLikeVideo, asTranscribeError, soundtrackFits, MAX_SOUNDTRACK_BYTES, MAX_SOUNDTRACK_MS,
} from './voiceModel.js'
import { createTranscriber } from './transcribePipeline.js'
import { planUtterances } from './audioChunker.js'
import en from '../../../i18n/locales/en/teach.js'

const dig = (o, key) => key.split('.').reduce((x, k) => (x == null ? undefined : x[k]), o)

test('transcribeLanguage prefers the workflow language, then the interface, as 2 letters', () => {
  assert.equal(transcribeLanguage('de', 'fr'), 'de')
  assert.equal(transcribeLanguage('pt-BR', 'en'), 'pt')
  assert.equal(transcribeLanguage('English', 'es'), 'es')
  assert.equal(transcribeLanguage('', 'zh'), 'zh')
  assert.equal(transcribeLanguage(null, null), 'en')
})

test('narrationLanguages has one option per language', () => {
  const out = narrationLanguages([{ code: 'en', name: 'English (US)' }, { code: 'en-GB', name: 'English (UK)' }, { code: 'pt-BR', name: 'Português' }])
  assert.deepEqual(out, [{ value: 'en', name: 'English (US)' }, { value: 'pt', name: 'Português' }])
})

test('blockStartMs places a block at the moment its first sample was heard', () => {
  assert.equal(blockStartMs(10000, 4800, 48000), 9900)
  assert.equal(blockStartMs(500, 0, 48000), 500)
  assert.equal(blockStartMs(500, 100, 0), 500)
})

test('pushCaption keeps the last few lines with a speaker', () => {
  let l = []
  for (const s of ['a', 'b', 'c', 'd']) l = pushCaption(l, { text: s, speaker: s === 'd' ? 'presenter' : undefined })
  assert.deepEqual(l, [{ speaker: 'trainer', text: 'b' }, { speaker: 'trainer', text: 'c' }, { speaker: 'presenter', text: 'd' }])
  assert.equal(pushCaption(l, { text: '  ' }), l)
  assert.equal(typeof dig(en, speakerKey('trainer')), 'string')
  assert.equal(typeof dig(en, speakerKey('presenter')), 'string')
})

test('voiceWarningLines reports unavailable once and counts failed parts, by code', () => {
  assert.deepEqual(voiceWarningLines({ unavailable: true, errors: [{ code: 'TRANSCRIBE_UNAVAILABLE' }] }), [{ key: 'teach.capture.warn.transcribeUnavailable' }])
  assert.deepEqual(voiceWarningLines({ errors: [{ code: 'TRANSCRIBE_FAILED' }, { code: 'TRANSCRIBE_FAILED' }] }), [{ key: 'teach.capture.warn.transcribeFailed', n: 2 }])
  assert.deepEqual(voiceWarningLines(null), [])
  assert.equal(typeof dig(en, 'teach.capture.warn.transcribeUnavailable'), 'string')
  assert.equal(typeof dig(en, 'teach.capture.warn.transcribeFailed_one'), 'string')
  assert.equal(typeof dig(en, 'teach.capture.warn.transcribeFailed_other'), 'string')
})

test('scanStepFor steps long recordings more coarsely', () => {
  assert.equal(scanStepFor(60000), 500)
  assert.equal(scanStepFor(LONG_VIDEO_MS + 1), 1000)
})

test('soundtrackUtterances slices the planned speech on the video clock', () => {
  const rate = 16000
  const mono = new Float32Array(rate * 6)
  for (let i = rate; i < rate * 3; i++) mono[i] = Math.sin(i / 5) * 0.3   // 2 s of "speech" from 1 s
  const plan = planUtterances(mono, rate)
  const jobs = soundtrackUtterances(mono, rate, plan)
  assert.equal(jobs.length, plan.length)
  assert.ok(jobs.length >= 1)
  assert.ok(jobs[0].startMs <= 1000 && jobs[0].endMs >= 3000)
  assert.equal(jobs[0].samples.length, plan[0].end - plan[0].start)
  assert.equal(jobs[0].samples.buffer, mono.buffer, 'a view, not a copy')
  assert.equal(jobs[0].rate, rate)
})

test('no AI set up at all (503 needsKey) stops the pipeline once, like AI-NO-TRANSCRIBE', async () => {
  let calls = 0
  const tr = createTranscriber({
    sleep: async () => {},
    transcribe: async () => { calls++; throw asTranscribeError(Object.assign(new Error('x'), { status: 503, data: { needsKey: true } })) },
  })
  const utt = { startMs: 0, endMs: 1000, wav: new Uint8Array(4) }
  await Promise.all([tr.enqueue(utt), tr.enqueue(utt), tr.enqueue(utt)])
  const d = await tr.drain()
  assert.equal(d.unavailable, true)
  assert.ok(calls <= 2, 'stops sending instead of retrying every clip')
  assert.deepEqual(voiceWarningLines(d), [{ key: 'teach.capture.warn.transcribeUnavailable' }])
  const other = asTranscribeError(Object.assign(new Error('y'), { status: 500 }))
  assert.equal(other.code, undefined)
  // platform allowed but no runtime active: 503 with needsKey false is the same state
  assert.equal(asTranscribeError(Object.assign(new Error('z'), { status: 503, data: { needsKey: false } })).code, 'AI-NO-TRANSCRIBE')
})

test('a cancelled clip (status 499) is not retried, so Cancel never waits on back-off', async () => {
  let calls = 0, slept = 0
  const tr = createTranscriber({ sleep: async () => { slept++ }, transcribe: async () => { calls++; throw Object.assign(new Error('c'), { code: 'SCAN_ABORTED', status: 499 }) } })
  const utt = { startMs: 0, endMs: 1000, wav: new Uint8Array(4) }
  await Promise.all([tr.enqueue(utt), tr.enqueue(utt)])
  assert.equal(calls, 2)
  assert.equal(slept, 0)
})

test('soundtrackFits keeps a huge or very long recording to its screens', () => {
  assert.equal(soundtrackFits({ size: 50e6 }, 60e3), true)
  assert.equal(soundtrackFits({ size: MAX_SOUNDTRACK_BYTES + 1 }, 60e3), false)
  assert.equal(soundtrackFits({ size: 1e6 }, MAX_SOUNDTRACK_MS + 1), false)
  assert.equal(soundtrackFits(null, 0), true)
})

test('looksLikeVideo accepts video files and names, rejects others', () => {
  assert.equal(looksLikeVideo({ type: 'video/mp4', name: 'x' }), true)
  assert.equal(looksLikeVideo({ type: '', name: 'Teams meeting.MP4' }), true)
  assert.equal(looksLikeVideo({ type: 'image/png', name: 'a.png' }), false)
  assert.equal(looksLikeVideo(null), false)
})
