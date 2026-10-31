// ===========================================================================
// WorkCoPilot TEACH audio chunker (Wave 2). Cuts audio at natural pauses into
// short UTTERANCES (about 1.5 to 15 s), so every spoken line is stamped with
// WHEN it was said. A fixed 30 s chunk would stamp half a minute of speech at one
// moment, too coarse to attach a sentence to the right step. Pure silence is
// dropped, so it is never sent or billed.
//
// Pure and DOM-free (unit-tested). The renderer feeds it PCM samples from the
// trainer's mic, the call's audio, or a decoded video soundtrack; the live
// chunker emits each utterance as soon as the speaker pauses.
// ===========================================================================

export const TARGET_RATE = 16000        // speech models want 16 kHz mono
export const WINDOW_MS = 20
export const UTTERANCE_DEFAULTS = Object.freeze({
  minMs: 1500,        // shorter bits next to another utterance are merged into it
  maxMs: 15000,       // longer stretches are split at their quietest moment
  gapMs: 400,         // a pause this long ends an utterance
  padMs: 200,         // context kept on each side of the speech
  floorRms: 0.006,    // never treat anything quieter than this as speech
  noiseFactor: 2.5,   // speech must be this much louder than the noise floor
})

const winSamples = (rate) => Math.max(1, Math.round((rate * WINDOW_MS) / 1000))

export function downmix(channels) {
  const chs = (Array.isArray(channels) ? channels : [channels]).filter((c) => c && c.length)
  if (!chs.length) return new Float32Array(0)
  if (chs.length === 1) return Float32Array.from(chs[0])
  const n = Math.min(...chs.map((c) => c.length))
  const out = new Float32Array(n)
  for (let i = 0; i < n; i++) { let s = 0; for (const c of chs) s += c[i]; out[i] = s / chs.length }
  return out
}

// Downsampling averages each source span (a cheap low-pass against aliasing);
// upsampling interpolates linearly.
export function resample(samples, fromRate, toRate = TARGET_RATE) {
  const src = samples || new Float32Array(0)
  if (!src.length || !(fromRate > 0) || fromRate === toRate) return Float32Array.from(src)
  const ratio = fromRate / toRate
  const n = Math.max(0, Math.floor(src.length / ratio))
  const out = new Float32Array(n)
  if (ratio > 1) {
    for (let i = 0; i < n; i++) {
      const a = Math.floor(i * ratio), b = Math.min(src.length, Math.max(a + 1, Math.floor((i + 1) * ratio)))
      let s = 0; for (let j = a; j < b; j++) s += src[j]
      out[i] = s / (b - a)
    }
  } else {
    for (let i = 0; i < n; i++) {
      const x = i * ratio, i0 = Math.floor(x), i1 = Math.min(i0 + 1, src.length - 1), f = x - i0
      out[i] = src[i0] * (1 - f) + src[i1] * f
    }
  }
  return out
}

export function windowRms(samples, rate) {
  const w = winSamples(rate)
  const n = Math.floor(samples.length / w)
  const out = new Float32Array(n)
  for (let k = 0; k < n; k++) {
    let s = 0
    for (let j = k * w; j < (k + 1) * w; j++) s += samples[j] * samples[j]
    out[k] = Math.sqrt(s / w)
  }
  return out
}

// Speech threshold from the audio itself. With real dynamic range (pauses
// between words), speech must beat the noise floor (the 10th-percentile window)
// but the bar stays low enough that dense speech still counts. With NO dynamic
// range the contrast says nothing, so loudness decides: a flat but loud signal
// is continuous sound (talking without pauses) and is kept, a flat quiet one is
// silence. Biased toward keeping speech: a false keep costs a few cents and an
// empty transcript; a false drop silently loses narration.
export function speechThreshold(rms, { floorRms = UTTERANCE_DEFAULTS.floorRms, noiseFactor = UTTERANCE_DEFAULTS.noiseFactor } = {}) {
  if (!rms || !rms.length) return floorRms
  const sorted = Float32Array.from(rms).sort()
  const at = (p) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))]
  const noise = at(0.1), peak = at(0.95)
  if (peak > noise * 4) return Math.max(floorRms, Math.min(noise * noiseFactor, peak * 0.25))
  if (noise > floorRms * 3) return Math.max(floorRms, noise * 0.5)
  return Math.max(floorRms, noise * noiseFactor)
}

// Plan utterances over a whole buffer: [{ startMs, endMs, start, end }] where
// start/end are sample indexes and times are relative to the buffer start.
export function planUtterances(samples, rate, opts = {}) {
  const o = { ...UTTERANCE_DEFAULTS, ...opts }
  const rms = windowRms(samples || new Float32Array(0), rate)
  if (!rms.length) return []
  const thr = Number.isFinite(o.threshold) ? o.threshold : speechThreshold(rms, o)
  const gapW = Math.ceil(o.gapMs / WINDOW_MS), padW = Math.ceil(o.padMs / WINDOW_MS)
  const maxW = Math.max(1, Math.floor(o.maxMs / WINDOW_MS)), minW = Math.ceil(o.minMs / WINDOW_MS)

  // 1) speech windows separated by short gaps form one group
  const groups = []
  let cur = null, quiet = 0
  for (let k = 0; k < rms.length; k++) {
    if (rms[k] > thr) { if (!cur) cur = { a: k, b: k }; else cur.b = k; quiet = 0 }
    else if (cur && ++quiet >= gapW) { groups.push(cur); cur = null; quiet = 0 }
  }
  if (cur) groups.push(cur)

  // 2) a very short group next to another (under 1 s apart) joins it; an
  //    isolated short word stays its own utterance
  const merged = []
  for (const g of groups) {
    const last = merged[merged.length - 1]
    const short = last && ((last.b - last.a + 1) < minW || (g.b - g.a + 1) < minW)
    if (last && short && (g.a - last.b) * WINDOW_MS < 1000 && (g.b - last.a + 1) <= maxW) last.b = g.b
    else merged.push({ ...g })
  }

  // 3) split anything longer than maxMs at its quietest window in the back half
  const split = []
  for (const g of merged) {
    let a = g.a
    while (g.b - a + 1 > maxW) {
      let cut = a + maxW - 1, best = Infinity
      for (let k = a + Math.floor(maxW / 2); k <= a + maxW - 1; k++) if (rms[k] <= best) { best = rms[k]; cut = k }
      split.push({ a, b: cut })
      a = cut + 1
    }
    split.push({ a, b: g.b })
  }

  // 4) pad, clamp, convert
  const w = winSamples(rate), lastW = rms.length - 1
  return split.map(({ a, b }) => {
    const s = Math.max(0, a - padW), e = Math.min(lastW, b + padW)
    return { startMs: s * WINDOW_MS, endMs: (e + 1) * WINDOW_MS, start: s * w, end: Math.min(samples.length, (e + 1) * w) }
  })
}

// 16-bit PCM mono WAV.
export function encodeWav(samples, rate) {
  const n = samples.length
  const buf = new ArrayBuffer(44 + n * 2)
  const v = new DataView(buf)
  const str = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)) }
  str(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); str(8, 'WAVE'); str(12, 'fmt ')
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, rate, true)
  v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true)
  str(36, 'data'); v.setUint32(40, n * 2, true)
  for (let i = 0; i < n; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }
  return new Uint8Array(buf)
}
// One utterance, ready to send: resampled to 16 kHz mono WAV.
export function utteranceWav(samples, rate) { return encodeWav(resample(samples, rate, TARGET_RATE), TARGET_RATE) }

// Live: push PCM blocks as they are captured (with the capture-clock time of
// each block) and get each utterance as soon as the speaker pauses, or when it
// reaches maxMs. Call flush() on pause and stop, so no speech is held back and a
// paused gap never ends up inside one utterance. Emits
// { startMs, endMs, samples, rate } on the capture clock.
export function createLiveChunker({ rate, onUtterance, ...opts } = {}) {
  if (!(rate > 0) || typeof onUtterance !== 'function') throw new Error('createLiveChunker needs a sample rate and an onUtterance callback.')
  const o = { ...UTTERANCE_DEFAULTS, ...opts }
  const HISTORY = Math.round(30000 / WINDOW_MS)       // 30 s of window levels for the running noise floor
  const history = []
  let buf = new Float32Array(0), bufStartMs = null

  const trimTo = (sample) => { bufStartMs += (sample / rate) * 1000; buf = buf.slice(sample) }
  function process(final) {
    if (!buf.length) { if (final) bufStartMs = null; return }
    const utts = planUtterances(buf, rate, { ...o, threshold: speechThreshold(Float32Array.from(history), o) })
    const bufEndMs = (buf.length / rate) * 1000
    let consumed = 0
    for (const u of utts) {
      const closed = final || (bufEndMs - u.endMs) >= Math.max(0, o.gapMs - o.padMs) || (u.endMs - u.startMs) >= o.maxMs
      if (!closed) break
      onUtterance({ startMs: bufStartMs + u.startMs, endMs: bufStartMs + u.endMs, samples: buf.slice(u.start, u.end), rate })
      consumed = u.end
    }
    if (final) { buf = new Float32Array(0); bufStartMs = null; return }
    if (consumed) trimTo(consumed)
    else if (!utts.length && bufEndMs > 2000) trimTo(Math.max(0, buf.length - Math.round((o.padMs / 1000) * rate)))   // drop silence, keep a little pre-roll
  }

  return {
    push(samples, atMs) {
      if (!samples || !samples.length) return
      if (bufStartMs == null) bufStartMs = Number.isFinite(atMs) ? atMs : 0
      for (const r of windowRms(samples, rate)) { history.push(r); if (history.length > HISTORY) history.shift() }
      const next = new Float32Array(buf.length + samples.length)
      next.set(buf); next.set(samples, buf.length)
      buf = next
      process(false)
    },
    flush() { process(true) },
  }
}

export default {
  TARGET_RATE, WINDOW_MS, UTTERANCE_DEFAULTS,
  downmix, resample, windowRms, speechThreshold, planUtterances, encodeWav, utteranceWav, createLiveChunker,
}
