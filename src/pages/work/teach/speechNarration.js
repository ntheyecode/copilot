// Narration for the Teach recorder: the trainer's spoken words, turned into text
// by the browser's own speech recognition (the Web Speech API) while they record.
// No audio is kept: only the recognized text, stamped on the capture clock at the
// moment the speech STARTED (recordModel.createVoiceStamper), then handed to the
// capture session's addVoice. Where the browser can recognize speech on the
// device, that is requested first; `onDevice` tells the UI which one is in use.
//
// createNarration({ lang, nowMs, onLine, onHearing, onIssue }) ->
//   { start(), pause(), resume(), stop(), abort(), onDevice }
// onIssue(kind): 'denied' (microphone refused), 'nomic' (no microphone found),
// 'network' (the speech service could not be reached). Screen recording carries
// on in every case; the UI explains the state. Small, single purpose.
import { createVoiceStamper } from './recordModel.js'

function Recognizer() {
  if (typeof window === 'undefined') return null
  return window.SpeechRecognition || window.webkitSpeechRecognition || null
}
export function narrationSupported() { return !!Recognizer() }

// Ask whether on-device recognition is ready for this language (newer Chromium).
async function localAvailable(Rec, lang) {
  try {
    if (!Rec || typeof Rec.available !== 'function') return false
    return (await Rec.available({ langs: [lang], processLocally: true })) === 'available'
  } catch { return false }
}

export async function createNarration({ lang, nowMs, onLine, onHearing, onIssue }) {
  const Rec = Recognizer()
  if (!Rec) return null
  const onDevice = await localAvailable(Rec, lang)
  const stamper = createVoiceStamper(nowMs)
  let rec = null, active = false, fatal = false, restartTimer = null, halting = Promise.resolve()

  function build() {
    const r = new Rec()
    r.continuous = true
    r.interimResults = true
    r.lang = lang
    if (onDevice) { try { r.processLocally = true } catch { /* older engine */ } }
    r.onresult = (e) => {
      const lines = stamper.onResult(e.results, e.resultIndex)
      for (const ln of lines) onLine(ln)
      if (onHearing) onHearing(stamper.pending(e.results))
    }
    r.onerror = (e) => {
      const code = e && e.error
      if (code === 'not-allowed' || code === 'service-not-allowed') { fatal = true; onIssue && onIssue('denied') }
      else if (code === 'audio-capture') { fatal = true; onIssue && onIssue('nomic') }
      else if (code === 'network') { fatal = true; onIssue && onIssue('network') }
      // 'no-speech' / 'aborted' are normal pauses in talking; the restart below handles them.
    }
    // The recognizer ends on its own after silence; keep listening while recording.
    r.onend = () => {
      if (onHearing) onHearing('')
      if (!active || fatal) return
      restartTimer = setTimeout(() => { if (active && !fatal) begin() }, 250)
    }
    return r
  }
  function begin() {
    stamper.reset()
    rec = build()
    try { rec.start() } catch { /* already started */ }
  }
  // Stop listening. A graceful stop lets the recognizer deliver the words it was
  // still finishing (resolves when it ends, or after a short bound); `abort` drops
  // them (cancel / unmount, where nothing is kept anyway).
  function halt({ abort = false } = {}) {
    if (restartTimer) { clearTimeout(restartTimer); restartTimer = null }
    if (onHearing) onHearing('')
    const r = rec
    rec = null
    if (!r) return halting
    halting = new Promise((resolve) => {
      const bound = setTimeout(done, 900)
      // Once ended (or past the bound) this recognizer delivers nothing more, so a
      // late result can never land on the next recognizer's stamper.
      function done() { clearTimeout(bound); r.onend = null; r.onresult = null; resolve() }
      r.onend = done
      try { if (abort) { r.onresult = null; r.abort() } else r.stop() } catch { done() }
    })
    return halting
  }
  // Start listening once any recognizer that is still finishing has ended (two at
  // once are refused by some engines).
  function listen() { active = true; halting.then(() => { if (active && !fatal && !rec) begin() }) }

  return {
    onDevice,
    start() { if (!active && !fatal) listen() },
    pause() { active = false; return halt() },
    resume() { if (!active && !fatal) listen() },
    stop() { active = false; return halt() },
    abort() { active = false; return halt({ abort: true }) },
  }
}

export default { narrationSupported, createNarration }
