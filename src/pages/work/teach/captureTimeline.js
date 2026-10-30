// ===========================================================================
// WorkCoPilot TEACH capture-timeline aligner (Wave 2). Given what a recording
// produced — screen frames, clicks/navigations/submits, and voice narration,
// all stamped on ONE clock — this segments them into ordered DRAFT steps and
// binds each spoken line to the frame it was spoken over.
//
// The renderer does the capturing (reusing Guide mode's `frameFromVideo` +
// `signatureFromVideo`/`changed` + on-device `redactFrame`, and the transcribe
// API for voice). THIS module only ALIGNS, so it is DOM-free and fully
// unit-tested. Wave 3 turns these aligned steps into finished workflow steps
// (with AI drafting); Wave 2 only carries the narration, the control, and the
// frame, on the clock. No AI model/provider or cost is ever named here.
// ===========================================================================

export const DEFAULT_PERIODIC_MS = 4000   // a steady frame beat, so a no-click stretch (reading, waiting) is still captured
export const NARRATION_LEAD_MS = 1500     // narration spoken up to this long BEFORE an action still binds to that action

// Step boundaries. 'change' = the screen settled after a significant change (the
// signal that works everywhere, from captureSession); 'mark' = the trainer's
// mark-step hotkey; click / nav / submit = real actions the desktop agent reports.
const ACTION_KINDS = new Set(['click', 'nav', 'submit', 'change', 'mark'])

// Inputs (one clock, ms):
//   events: [{ t, kind:'click'|'nav'|'submit'|'change'|'mark'|'keypress'|'frame', frame?, target?, url? }]
//   voice:  [{ t, endT?, text }]
// `t` is absolute ms on the same clock as `t0`; output `atMs` is relative to t0.
export function alignCapture({ t0 = 0, events = [], voice = [], periodicMs = DEFAULT_PERIODIC_MS } = {}) {
  const warnings = []
  const beat = Number.isFinite(periodicMs) && periodicMs > 0 ? periodicMs : DEFAULT_PERIODIC_MS
  const ev = (Array.isArray(events) ? events : []).filter((e) => e && Number.isFinite(e.t)).slice().sort((a, b) => a.t - b.t)
  const vo = (Array.isArray(voice) ? voice : []).filter((v) => v && Number.isFinite(v.t) && String(v.text || '').trim()).slice().sort((a, b) => a.t - b.t)
  const rel = (t) => Math.max(0, Math.round(t - t0))

  const voiceEnd = vo.reduce((m, v) => Math.max(m, Number.isFinite(v.endT) ? v.endT : v.t), t0)
  const lastT = Math.max(t0, ev.length ? ev[ev.length - 1].t : t0, voiceEnd)
  const durationMs = rel(lastT)

  const frames = ev.filter((e) => e.frame)
  const nearestFrame = (t) => {
    let best = null, bestD = Infinity
    for (const f of frames) { const d = Math.abs(f.t - t); if (d < bestD) { bestD = d; best = f } }
    return best ? best.frame : null
  }
  const watchStep = (t) => ({ t, kind: 'watch', target: null, url: null, frame: nearestFrame(t), source: 'periodic' })

  // Step boundaries are the ACTIONS; a long narrated gap with no action becomes a
  // 'watch' step (reading / waiting for a result) so nothing silent is lost.
  const markers = []
  let prevT = t0
  for (const e of ev) {
    if (!ACTION_KINDS.has(e.kind)) continue
    if (e.t - prevT > beat && vo.some((v) => v.t >= prevT && v.t < e.t)) markers.push(watchStep(Math.round((prevT + e.t) / 2)))
    markers.push({ t: e.t, kind: e.kind, target: e.target || null, url: e.url || null, frame: e.frame || nearestFrame(e.t), source: 'event' })
    prevT = e.t
  }
  if (lastT - prevT > beat && vo.some((v) => v.t >= prevT && v.t <= lastT)) markers.push(watchStep(Math.round((prevT + lastT) / 2)))
  markers.sort((a, b) => a.t - b.t)

  if (!markers.length) warnings.push({ code: 'CAPTURE_EMPTY', message: 'No actions or narration were captured, so there are no steps yet.' })

  const steps = markers.map((m, i) => ({
    index: i + 1, atMs: rel(m.t), kind: m.kind, source: m.source,
    target: m.target, url: m.url, frame: m.frame || null, hasFrame: !!m.frame, narration: '', _t: m.t,
  }))

  // Bind each narration line: if an action is coming up within the lead (or at the
  // same moment), the line describes THAT action; otherwise it describes the screen
  // the trainer is on now (the latest action at or before it). Narration before
  // every step goes to the first; narration after the last goes to the last.
  for (const v of vo) {
    if (!steps.length) break
    let placed = -1
    const next = steps.findIndex((s) => s._t >= v.t)
    if (next !== -1 && steps[next]._t - v.t <= NARRATION_LEAD_MS) placed = next
    else {
      for (let i = steps.length - 1; i >= 0; i--) if (steps[i]._t <= v.t) { placed = i; break }
      if (placed === -1) placed = 0
    }
    steps[placed].narration = (steps[placed].narration ? `${steps[placed].narration} ` : '') + String(v.text).trim()
  }
  for (const s of steps) {
    if (!s.hasFrame) warnings.push({ code: 'STEP_NO_FRAME', step: s.index, message: `Step ${s.index} has no frame.` })
    delete s._t
  }

  return { durationMs, frameCount: frames.length, steps, warnings }
}

// English defaults for the seeded instruction when the trainer was silent. The UI
// passes `label` = (key, vars) => t(key, vars) so seeds land in the trainer's
// language; these keys are added and translated together with the Record UI
// (i18n release gate). Warnings above carry stable `code`s for the same reason.
export const STEP_TEXT = {
  'teach.capture.step.goTo': 'Go to {url}',
  'teach.capture.step.goNext': 'Go to the next screen',
  'teach.capture.step.review': 'Review this screen',
  'teach.capture.step.moveNext': 'Move to the next screen',
  'teach.capture.step.select': 'Select {target}',
  'teach.capture.step.doStep': 'Do this step',
}
const englishLabel = (key, vars = {}) => String(STEP_TEXT[key] || key).replace(/\{(\w+)\}/g, (_, k) => (vars[k] == null ? '' : String(vars[k])))

// Bridge the aligned steps into the Wave 1 workflow step shape (the draft hand-off).
// No AI here: the instruction is the spoken narration, or a plain action line when
// the trainer was silent. Wave 3 replaces this with AI drafting + "done when".
export function toWorkflowSteps(aligned, { label = englishLabel } = {}) {
  const steps = aligned && Array.isArray(aligned.steps) ? aligned.steps : []
  return steps.map((s) => {
    let instruction = String(s.narration || '').trim()
    if (!instruction) {
      if (s.kind === 'nav') instruction = s.url ? label('teach.capture.step.goTo', { url: s.url }) : label('teach.capture.step.goNext')
      else if (s.kind === 'watch') instruction = label('teach.capture.step.review')
      else if (s.kind === 'change') instruction = s.target ? label('teach.capture.step.select', { target: s.target }) : label('teach.capture.step.moveNext')
      else instruction = s.target ? label('teach.capture.step.select', { target: s.target }) : label('teach.capture.step.doStep')
    }
    return { instruction, target: s.target || null, doneWhen: null, docRef: null, shot: s.frame || null }
  })
}

export default { DEFAULT_PERIODIC_MS, NARRATION_LEAD_MS, STEP_TEXT, alignCapture, toWorkflowSteps }
