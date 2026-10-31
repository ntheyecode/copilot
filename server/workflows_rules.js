// ===========================================================================
// WorkCoPilot TEACH WORKFLOWS: pure shape + lifecycle rules for a guided
// workflow a trainer (or company admin) authors and users are then guided
// through. No store, no I/O, fully unit-tested. workflows_store.js owns
// persistence + RBAC; this module owns validation and the state machine
// (owner rule: pure rules separate from orchestration).
//
// A workflow belongs to a company, is authored by a user, and moves:
//   draft -> published -> retired        (delete is separate, from any state)
// Versions share a groupId; publishing a new version retires the prior
// published one in the same group, so a user mid-task on the live guide is
// never cut off until the new version is actually published.
// ===========================================================================
import { stripGuideMarkup } from './guide_markup.js'

export const WORKFLOW_STATES = ['draft', 'published', 'retired']
// The metadata the Teach wizard collects at step 1; these four are required.
export const REQUIRED_META = ['productName', 'title', 'owner', 'launchTarget']

const STR = (v) => (v == null ? '' : String(v)).trim()
const CAP = 400   // a single-line metadata field cap

// A step's `shot` is a captured frame stored by workflow_frames.js: 128-bit random
// hex + an image extension. Anything else is dropped, so a step can never point at
// an arbitrary path or another tenant's file.
export const FRAME_REF_RE = /^[a-f0-9]{32}\.(jpg|png|webp)$/
export function isFrameRef(ref) { return typeof ref === 'string' && FRAME_REF_RE.test(ref) }

export function normalizeMeta(meta = {}) {
  const m = meta && typeof meta === 'object' ? meta : {}
  const one = (v) => STR(v).slice(0, CAP)
  const dur = Number(m.durationMin)
  return {
    productName: one(m.productName),
    title: one(m.title),
    version: one(m.version),
    owner: one(m.owner),
    supportEmail: one(m.supportEmail),
    supportContact: one(m.supportContact),
    webLink: one(m.webLink),
    launchTarget: one(m.launchTarget),
    category: one(m.category),
    language: one(m.language) || 'en',
    prerequisites: one(m.prerequisites),
    durationMin: Number.isFinite(dur) && dur > 0 ? Math.min(100000, Math.floor(dur)) : null,
  }
}

export function validateMeta(meta) {
  const m = normalizeMeta(meta)
  const missing = REQUIRED_META.filter((k) => !m[k])
  return { ok: missing.length === 0, missing, meta: m }
}

// Wave 3: what the step reader saw in the step's frame. A SUGGESTION only: it sits
// beside the trainer's own target/doneWhen and never replaces them; the trainer
// accepts it in review. It is bound to the frame it was read from, so a step whose
// shot changed drops its stale reading instead of showing one for another screen.
export const CONTROL_KINDS = ['button', 'link', 'menu', 'tab', 'field', 'checkbox', 'option', 'icon', 'other', 'none']
// One line of plain text: no control characters, no bold/backtick markup.
const LINE = (v, n) => stripGuideMarkup(STR(v).replace(/[\u0000-\u001f\u007f]+/g, ' ')).replace(/\s+/g, ' ').trim().slice(0, n)
export function normalizeReading(r, shot) {
  if (!r || typeof r !== 'object' || !shot || r.shot !== shot) return null
  const controlLabel = LINE(r.controlLabel, 120)
  const doneWhen = LINE(r.doneWhen, 300)
  if (!controlLabel && !doneWhen) return null
  const c = Number(r.confidence)
  return {
    controlLabel: controlLabel || null,
    controlKind: CONTROL_KINDS.includes(r.controlKind) ? r.controlKind : 'other',
    doneWhen: doneWhen || null,
    confidence: Number.isFinite(c) ? Math.max(0, Math.min(1, Math.round(c * 100) / 100)) : 0,
    shot,
    afterShot: isFrameRef(r.afterShot) ? r.afterShot : null,
    at: STR(r.at).slice(0, 40) || null,
  }
}

export function normalizeStep(step = {}, i = 0) {
  const s = step && typeof step === 'object' ? step : {}
  const shot = isFrameRef(s.shot) ? s.shot : null   // scrubbed frame ref from the Wave 2 capture, or none
  return {
    id: STR(s.id) || `s${i + 1}`,
    instruction: STR(s.instruction),
    target: STR(s.target) || null,     // the control Guide mode finds on playback
    doneWhen: STR(s.doneWhen) || null, // the completion check
    docRef: STR(s.docRef) || null,     // backing doc id / anchor
    shot,
    reading: normalizeReading(s.reading, shot),
  }
}

export function validateSteps(steps) {
  const arr = Array.isArray(steps) ? steps.map(normalizeStep) : []
  // Step ids are unique within a workflow: a repeated id (a deleted step's id
  // reused by position, a pasted row) gets a fresh one, so an action on one step
  // can never land on another.
  const seen = new Set()
  let n = arr.length
  for (const s of arr) {
    while (seen.has(s.id)) s.id = `s${++n}`
    seen.add(s.id)
  }
  const firstEmpty = arr.findIndex((s) => !s.instruction)
  return { ok: arr.length > 0 && firstEmpty === -1, steps: arr, firstEmpty }
}

// Readings are written by the step reader only. On a save, each step keeps the
// reading the server already holds for it (the client's copy is never trusted),
// and loses it when the frame it was read with is no longer its frame, or its
// after-frame is no longer the next step's frame (the "done when" described a
// screen that is not there now).
// A reading belongs to its STEP, not to its frame: two steps can share a frame
// (a click that does not change the screen), so the same step id with the same
// frame wins; only a step with a new id falls back to an unclaimed reading of
// the same frame whose after-frame fits (an exact after-frame match first).
export function carryReadings(prevSteps, nextSteps) {
  const held = (Array.isArray(prevSteps) ? prevSteps : []).filter((s) => s && s.shot && s.reading)
  const byId = new Map(held.filter((s) => s.id).map((s) => [s.id, s]))
  const nextIds = new Set(nextSteps.map((s) => s.id))
  const claimed = new Set(held.filter((p) => nextIds.has(p.id)))   // owned by a step still present
  return nextSteps.map((s, i) => {
    if (!s.shot) return { ...s, reading: null }
    const after = nextSteps[i + 1] ? nextSteps[i + 1].shot : null
    const fits = (p) => p && p.shot === s.shot && (!p.reading.afterShot || p.reading.afterShot === after)
    const own = byId.get(s.id)
    let src = null
    if (own) src = fits(own) ? own : null
    else {
      const open = held.filter((p) => !claimed.has(p) && fits(p))
      src = open.find((p) => p.reading.afterShot === after) || open[0] || null
      if (src) claimed.add(src)
    }
    return { ...s, reading: src ? normalizeReading(src.reading, s.shot) : null }
  })
}

// Lifecycle predicates. A draft is the only editable state; a published
// workflow is changed by revising it into a new draft (so the live one keeps
// running), and publishing that retires the old one.
export function canEditContent(state) { return state === 'draft' }
export function canPublish(state) { return state === 'draft' }
export function canRetire(state) { return state === 'published' }

export function nextVersion(versionsInGroup) {
  const list = Array.isArray(versionsInGroup) ? versionsInGroup : []
  return list.reduce((mx, v) => Math.max(mx, Number(v && v.version) || 0), 0) + 1
}

export default {
  WORKFLOW_STATES, REQUIRED_META, FRAME_REF_RE, isFrameRef, normalizeMeta, validateMeta,
  CONTROL_KINDS, normalizeReading, normalizeStep, validateSteps, carryReadings, canEditContent, canPublish, canRetire, nextVersion,
}
