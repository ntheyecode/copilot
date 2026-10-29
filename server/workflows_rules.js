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

export const WORKFLOW_STATES = ['draft', 'published', 'retired']
// The metadata the Teach wizard collects at step 1; these four are required.
export const REQUIRED_META = ['productName', 'title', 'owner', 'launchTarget']

const STR = (v) => (v == null ? '' : String(v)).trim()
const CAP = 400   // a single-line metadata field cap

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

export function normalizeStep(step = {}, i = 0) {
  const s = step && typeof step === 'object' ? step : {}
  return {
    id: STR(s.id) || `s${i + 1}`,
    instruction: STR(s.instruction),
    target: STR(s.target) || null,     // the control Guide mode finds on playback
    doneWhen: STR(s.doneWhen) || null, // the completion check
    docRef: STR(s.docRef) || null,     // backing doc id / anchor
    shot: STR(s.shot) || null,         // scrubbed screenshot ref (set by Wave 2 capture)
  }
}

export function validateSteps(steps) {
  const arr = Array.isArray(steps) ? steps.map(normalizeStep) : []
  const firstEmpty = arr.findIndex((s) => !s.instruction)
  return { ok: arr.length > 0 && firstEmpty === -1, steps: arr, firstEmpty }
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
  WORKFLOW_STATES, REQUIRED_META, normalizeMeta, validateMeta,
  normalizeStep, validateSteps, canEditContent, canPublish, canRetire, nextVersion,
}
