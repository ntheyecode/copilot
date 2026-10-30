// A recorded video (Teams / Zoom MP4, WebM...) opened LOCALLY for "Import a
// recording": an object URL in a detached <video>, never uploaded. Provides the
// seekTo(ms) that videoScan.scanVideo drives, and the decoded soundtrack as mono
// PCM for the utterance planner. DOM-only glue; the scan and chunking policy live
// in the tested videoScan.js / audioChunker.js.
import { downmix } from './audioChunker.js'

const coded = (code) => Object.assign(new Error(code), { code })
const once = (el, ok, bad, ms) => new Promise((resolve, reject) => {
  let h = null
  const done = (fn, v) => { clearTimeout(h); el.removeEventListener(ok, onOk); if (bad) el.removeEventListener(bad, onBad); fn(v) }
  const onOk = () => done(resolve)
  const onBad = () => done(reject, coded('IMPORT_UNREADABLE'))
  el.addEventListener(ok, onOk)
  if (bad) el.addEventListener(bad, onBad)
  if (ms) h = setTimeout(() => done(reject, coded('IMPORT_UNREADABLE')), ms)
})

// -> { video, durationMs, dispose() }. Throws IMPORT_UNREADABLE (the browser
// cannot open it) or SCAN_NO_VIDEO (no picture track).
export async function openVideoFile(file) {
  const video = document.createElement('video')
  video.muted = true; video.playsInline = true; video.preload = 'auto'
  const url = URL.createObjectURL(file)
  const dispose = () => { try { video.removeAttribute('src'); video.load() } catch { /* ignore */ } URL.revokeObjectURL(url) }
  try {
    const meta = once(video, 'loadedmetadata', 'error', 20000)
    video.src = url
    await meta
    // Some recordings (WebM from a live recorder) report Infinity until the end is visited.
    if (!Number.isFinite(video.duration)) {
      const known = once(video, 'durationchange', 'error', 20000)
      video.currentTime = 1e9
      await known.catch(() => {})
      if (!Number.isFinite(video.duration)) throw coded('IMPORT_UNREADABLE')
      const back = once(video, 'seeked', 'error', 8000)
      video.currentTime = 0
      await back.catch(() => {})
    }
    if (!video.videoWidth) throw coded('SCAN_NO_VIDEO')
    const durationMs = Math.round((Number.isFinite(video.duration) ? video.duration : 0) * 1000)
    if (!(durationMs > 0)) throw coded('SCAN_NO_VIDEO')
    return { video, durationMs, dispose }
  } catch (e) { dispose(); throw (e && e.code ? e : coded('IMPORT_UNREADABLE')) }
}

// seekTo(ms) -> Promise<video>, resolving once the frame at `ms` is decoded.
export function makeSeeker(video) {
  return async (ms) => {
    const target = Math.min(ms / 1000, Math.max(0, video.duration - 0.05))
    if (Math.abs(video.currentTime - target) > 0.001) {
      const seeked = once(video, 'seeked', 'error', 8000)
      video.currentTime = target
      await seeked
    }
    await new Promise((resolve) => {
      const h = setTimeout(resolve, 250)
      const ok = () => { clearTimeout(h); resolve() }
      if (typeof video.requestVideoFrameCallback === 'function') video.requestVideoFrameCallback(ok)
      else requestAnimationFrame(() => requestAnimationFrame(ok))
    })
    return video
  }
}

// The soundtrack as 16 kHz mono, or null when the browser cannot decode it (or
// there is none). Decoding straight to 16 kHz keeps a long meeting's audio small.
export async function decodeSoundtrack(file, rate = 16000) {
  try {
    const Off = window.OfflineAudioContext || window.webkitOfflineAudioContext
    if (!Off) return null
    const buf = await file.arrayBuffer()
    const ctx = new Off(1, 1, rate)
    const audio = await ctx.decodeAudioData(buf)
    const chans = []
    for (let i = 0; i < audio.numberOfChannels; i++) chans.push(audio.getChannelData(i))
    const mono = downmix(chans)
    return mono.length ? { mono, rate: audio.sampleRate } : null
  } catch { return null }
}

export default { openVideoFile, makeSeeker, decodeSoundtrack }
