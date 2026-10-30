import test from 'node:test'
import assert from 'node:assert/strict'
import {
  downmix, resample, planUtterances, encodeWav, utteranceWav, createLiveChunker, speechThreshold, windowRms,
  TARGET_RATE, UTTERANCE_DEFAULTS,
} from './audioChunker.js'

const RATE = 16000
// Deterministic synthetic audio: low background noise plus "speech" (a 220 Hz
// tone) in the given [fromMs, toMs) spans.
function signal(totalMs, speech = [], { noise = 0.002, amp = 0.3 } = {}) {
  const n = Math.round((totalMs / 1000) * RATE)
  const out = new Float32Array(n)
  let seed = 7
  const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648 - 0.5 }
  for (let i = 0; i < n; i++) {
    const ms = (i / RATE) * 1000
    const talking = speech.some(([a, b]) => ms >= a && ms < b)
    out[i] = rnd() * 2 * noise + (talking ? amp * Math.sin((2 * Math.PI * 220 * i) / RATE) : 0)
  }
  return out
}
const near = (actual, expected, tol = 60) => Math.abs(actual - expected) <= tol

test('two spoken bursts become two padded utterances; the silence is dropped', () => {
  const u = planUtterances(signal(8000, [[1000, 3000], [5000, 6500]]), RATE)
  assert.equal(u.length, 2)
  assert.ok(near(u[0].startMs, 800) && near(u[0].endMs, 3200), JSON.stringify(u[0]))
  assert.ok(near(u[1].startMs, 4800) && near(u[1].endMs, 6700), JSON.stringify(u[1]))
})

test('pure silence or noise yields no utterances (nothing to send or bill)', () => {
  assert.deepEqual(planUtterances(new Float32Array(RATE * 5), RATE), [])
  assert.deepEqual(planUtterances(signal(5000, []), RATE), [])
})

test('long continuous speech is split into pieces no longer than maxMs', () => {
  const u = planUtterances(signal(40000, [[0, 40000]]), RATE)
  assert.ok(u.length >= 3)
  for (const x of u) assert.ok(x.endMs - x.startMs <= UTTERANCE_DEFAULTS.maxMs + 2 * UTTERANCE_DEFAULTS.padMs + 40, JSON.stringify(x))
  assert.ok(near(u[0].startMs, 0) && near(u[u.length - 1].endMs, 40000))
})

test('a short blip right before speech joins it; an isolated short word stays its own', () => {
  const joined = planUtterances(signal(6000, [[1000, 1200], [2000, 4000]]), RATE)
  assert.equal(joined.length, 1)
  const isolated = planUtterances(signal(9000, [[1000, 1300], [5000, 7000]]), RATE)
  assert.equal(isolated.length, 2)
})

test('speech threshold ignores steady noise but still catches dense speech', () => {
  const quiet = windowRms(signal(3000, []), RATE)
  assert.equal(speechThreshold(quiet), UTTERANCE_DEFAULTS.floorRms)    // noise below the floor
  const busy = windowRms(signal(3000, [[0, 2800]]), RATE)
  assert.ok(speechThreshold(busy) < 0.2)                              // well below the speech level
})

test('downmix, resample and WAV encoding', () => {
  assert.deepEqual(Array.from(downmix([Float32Array.of(1, 0), Float32Array.of(0, 1)])), [0.5, 0.5])
  assert.equal(resample(new Float32Array(48000), 48000).length, 16000)
  assert.equal(resample(new Float32Array(8000), 8000).length, 16000)
  const wav = encodeWav(Float32Array.of(0, 1, -1), 16000)
  const txt = (a, b) => String.fromCharCode(...wav.slice(a, b))
  assert.equal(txt(0, 4), 'RIFF'); assert.equal(txt(8, 12), 'WAVE'); assert.equal(txt(36, 40), 'data')
  const v = new DataView(wav.buffer)
  assert.equal(v.getUint32(24, true), 16000)
  assert.equal(v.getUint32(40, true), 6)
  assert.equal(v.getInt16(46, true), 32767)
  assert.equal(utteranceWav(new Float32Array(48000), 48000).length, 44 + TARGET_RATE * 2)
})

test('live chunker: emits an utterance once the speaker pauses, stamped on the capture clock', () => {
  const got = []
  const ch = createLiveChunker({ rate: RATE, onUtterance: (u) => got.push(u) })
  const sig = signal(5000, [[1000, 3000]])
  const block = RATE / 10                                         // 100 ms blocks
  for (let i = 0; i < sig.length; i += block) ch.push(sig.slice(i, i + block), 5000 + (i / RATE) * 1000)
  assert.equal(got.length, 1)
  assert.ok(near(got[0].startMs, 5800, 80) && near(got[0].endMs, 8200, 80), JSON.stringify({ s: got[0].startMs, e: got[0].endMs }))
  assert.equal(got[0].rate, RATE)
  ch.flush()
  assert.equal(got.length, 1)                                     // nothing pending
})

test('live chunker: long speech is emitted in pieces without waiting for a pause, and flush releases the rest', () => {
  const got = []
  const ch = createLiveChunker({ rate: RATE, onUtterance: (u) => got.push(u) })
  const sig = signal(20000, [[0, 20000]])
  const block = RATE / 10
  for (let i = 0; i < sig.length; i += block) ch.push(sig.slice(i, i + block), (i / RATE) * 1000)
  assert.ok(got.length >= 1)                                      // a maxMs piece left before the end
  ch.flush()
  const last = got[got.length - 1]
  assert.ok(near(last.endMs, 20000, 80))
  assert.throws(() => createLiveChunker({ rate: 0, onUtterance: () => {} }), /sample rate/)
})
