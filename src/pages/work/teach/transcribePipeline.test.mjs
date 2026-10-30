import test from 'node:test'
import assert from 'node:assert/strict'
import { createTranscriber, toLines, withVoice, bytesToBase64 } from './transcribePipeline.js'

const WAV = new Uint8Array([82, 73, 70, 70])                       // stand-in bytes; the server is faked
const utt = (startMs, endMs) => ({ startMs, endMs, wav: WAV })
const noSleep = async () => {}
const err = (status, data) => Object.assign(new Error('x'), { status, data })

test('segment timestamps place each sentence inside the utterance; text-only falls back to the start', () => {
  const lines = toLines({ startMs: 10000, endMs: 15000 }, { text: 'a b', segments: [{ startMs: 200, endMs: 900, text: ' open transfers ' }, { startMs: 2500, endMs: 3100, text: 'then approve' }] }, 'trainer')
  assert.deepEqual(lines, [
    { t: 10200, endT: 10900, text: 'open transfers', speaker: 'trainer' },
    { t: 12500, endT: 13100, text: 'then approve', speaker: 'trainer' },
  ])
  assert.deepEqual(toLines({ startMs: 5000, endMs: 7000 }, { text: ' hello ' }, 'presenter'), [{ t: 5000, endT: 7000, text: 'hello', speaker: 'presenter' }])
  assert.deepEqual(toLines({ startMs: 0, endMs: 1 }, { text: '' }, 'trainer'), [])     // silence
})

test('sends every utterance, keeps speakers, returns lines in time order', async () => {
  const sent = []
  const tx = createTranscriber({
    transcribe: async ({ audio, mime }) => { sent.push({ audio, mime }); return { text: `line ${sent.length}` } },
    sleep: noSleep,
  })
  tx.enqueue(utt(4000, 5000), { speaker: 'presenter' })
  tx.enqueue(utt(1000, 2000))
  const { lines, errors } = await tx.drain()
  assert.equal(sent.length, 2)
  assert.equal(sent[0].mime, 'audio/wav')
  assert.equal(sent[0].audio, bytesToBase64(WAV))
  assert.deepEqual(lines.map((l) => [l.t, l.speaker]), [[1000, 'trainer'], [4000, 'presenter']])
  assert.deepEqual(errors, [])
})

test('a transient failure is retried; a chunk that keeps failing is recorded, never dropped silently', async () => {
  let calls = 0
  const flaky = createTranscriber({ transcribe: async () => { calls++; if (calls === 1) throw err(503); return { text: 'ok' } }, sleep: noSleep })
  flaky.enqueue(utt(0, 1000))
  const a = await flaky.drain()
  assert.equal(calls, 2)
  assert.equal(a.lines.length, 1)

  const broken = createTranscriber({ transcribe: async () => { throw err(500) }, sleep: noSleep })
  broken.enqueue(utt(2000, 3000), { speaker: 'presenter' })
  const b = await broken.drain()
  assert.deepEqual(b.errors, [{ code: 'TRANSCRIBE_FAILED', startMs: 2000, endMs: 3000, speaker: 'presenter', status: 500 }])

  let badCalls = 0
  const bad = createTranscriber({ transcribe: async () => { badCalls++; throw err(400) }, sleep: noSleep })
  bad.enqueue(utt(0, 1))
  await bad.drain()
  assert.equal(badCalls, 1)                                         // a 400 is not retried
})

test('a provider that cannot transcribe stops the pipeline at once and is reported once', async () => {
  let calls = 0
  const tx = createTranscriber({
    transcribe: async () => { calls++; throw err(400, { code: 'AI-NO-TRANSCRIBE', needsTranscribeKey: true }) },
    concurrency: 1, sleep: noSleep,
  })
  for (let i = 0; i < 5; i++) tx.enqueue(utt(i * 1000, i * 1000 + 500))
  const r = await tx.drain()
  assert.equal(calls, 1)
  assert.equal(r.unavailable, true)
  assert.equal(r.skipped, 4)
  assert.deepEqual(r.errors.map((e) => e.code), ['TRANSCRIBE_UNAVAILABLE'])
})

test('concurrency is bounded and live captions fire per line', async () => {
  let inFlight = 0, peak = 0
  const captions = []
  const tx = createTranscriber({
    transcribe: async () => { inFlight++; peak = Math.max(peak, inFlight); await new Promise((r) => setTimeout(r, 5)); inFlight--; return { text: 'x' } },
    concurrency: 2, sleep: noSleep, onLine: (l) => captions.push(l.t),
  })
  for (let i = 0; i < 6; i++) tx.enqueue(utt(i * 100, i * 100 + 50))
  const r = await tx.drain()
  assert.ok(peak <= 2)
  assert.equal(r.lines.length, 6)
  assert.equal(captions.length, 6)
})

test('withVoice merges pipeline lines into a stopped capture, sorted and de-duplicated', () => {
  const cap = { t0: 0, events: [], voice: [{ t: 3000, text: 'b' }] }
  const out = withVoice(cap, [{ t: 1000, text: 'a', speaker: 'trainer' }, { t: 3000, text: 'b' }])
  assert.deepEqual(out.voice.map((v) => v.text), ['a', 'b'])
  assert.equal(out.events, cap.events)
})

test('drain with nothing queued resolves immediately', async () => {
  const tx = createTranscriber({ transcribe: async () => ({ text: '' }) })
  assert.deepEqual(await tx.drain(), { lines: [], errors: [], unavailable: false, skipped: 0 })
})
