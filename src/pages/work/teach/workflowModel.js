// Pure, React-free helpers for the Teach studio (authoring guided workflows).
// Mirrors the server's own rules (server/workflows_rules.js is the security
// boundary; this only decides what the authoring UI shows and validates before
// a round-trip). Unit-tested in workflowModel.test.mjs. No imports, no I/O.

// The four meta fields the server requires on create/publish (REQUIRED_META in
// server/workflows_rules.js). Kept here as the single client-side source so the
// wizard's validation never drifts from the server's.
export const REQUIRED_META = ['productName', 'title', 'owner', 'launchTarget']

// Every meta field the editor collects, in author-facing order. productName,
// title, owner and launchTarget are required; the rest are optional context.
export const META_FIELDS = [
  'productName', 'title', 'owner', 'launchTarget',
  'version', 'category', 'durationMin',
  'language', 'supportEmail', 'supportContact', 'webLink', 'prerequisites',
]

export function emptyMeta() {
  return {
    productName: '', title: '', owner: '', launchTarget: '',
    version: '', category: '', durationMin: '',
    language: 'en', supportEmail: '', supportContact: '', webLink: '', prerequisites: '',
  }
}

export function emptyStep() {
  return { id: '', instruction: '', target: '', doneWhen: '', docRef: '', shot: '' }
}

// The wizard phases, in order. `key` is the i18n sub-key under teach.wizard.stepper.
export const PHASES = ['basics', 'details', 'scope', 'steps', 'review']

// Which required meta fields are still blank (trimmed). Empty array = all set.
export function missingMeta(meta) {
  const m = meta || {}
  return REQUIRED_META.filter((k) => !String(m[k] == null ? '' : m[k]).trim())
}

// At least one step, and no step with an empty instruction (mirrors the server's
// validateSteps). Returns true when the steps are publishable.
export function stepsValid(steps) {
  const list = Array.isArray(steps) ? steps : []
  if (!list.length) return false
  return list.every((s) => String((s && s.instruction) || '').trim().length > 0)
}

// Everything a publish needs: required meta set AND steps valid.
export function canPublish(meta, steps) {
  return missingMeta(meta).length === 0 && stepsValid(steps)
}

// Lifecycle predicates (same as server/workflows_rules.js). A draft is the only
// editable state; publish acts on a draft; retire acts on a published one.
export function canEditContent(state) { return state === 'draft' }
export function canPublishState(state) { return state === 'draft' }
export function canRetireState(state) { return state === 'published' }
export function canReviseState(state) { return state === 'published' }

// The i18n label key for a workflow state badge.
export function stateLabelKey(state) {
  if (state === 'published') return 'teach.list.state.published'
  if (state === 'retired') return 'teach.list.state.retired'
  return 'teach.list.state.draft'
}

// The .wka-badge variant class for a state (published = active/green,
// draft = paused/amber, retired = ended/muted). Reuses the shared palette.
export function stateBadgeClass(state) {
  if (state === 'published') return 'active'
  if (state === 'retired') return 'ended'
  return 'paused'
}

// Turn the author's form (strings) into the API `meta` payload: trim strings,
// coerce durationMin to a positive integer or omit it, drop blanks so the server
// stores clean values. productName/title/owner/launchTarget always included.
export function metaToPayload(meta) {
  const m = meta || {}
  const out = {}
  for (const k of META_FIELDS) {
    if (k === 'durationMin') continue
    const v = String(m[k] == null ? '' : m[k]).trim()
    if (v) out[k] = v
  }
  const dur = parseInt(m.durationMin, 10)
  if (Number.isFinite(dur) && dur > 0) out.durationMin = dur
  return out
}

// Turn the editor's steps into the API payload: trim every field, keep only
// steps that carry an instruction, drop empty optional fields.
export function stepsToPayload(steps) {
  return (Array.isArray(steps) ? steps : [])
    .map((s) => {
      const instruction = String((s && s.instruction) || '').trim()
      if (!instruction) return null
      const out = { instruction }
      for (const k of ['id', 'target', 'doneWhen', 'docRef', 'shot']) {
        const v = String((s && s[k]) || '').trim()
        if (v) out[k] = v
      }
      return out
    })
    .filter(Boolean)
}

// Hydrate a workflow record's meta into a full editor form (every field present
// as a string so the inputs are controlled).
export function metaToForm(meta) {
  const base = emptyMeta()
  const m = meta || {}
  for (const k of META_FIELDS) {
    if (m[k] != null && m[k] !== '') base[k] = String(m[k])
  }
  if (!base.language) base.language = 'en'
  return base
}

// Hydrate a workflow record's steps into editor rows (every field a string).
export function stepsToForm(steps) {
  return (Array.isArray(steps) ? steps : []).map((s) => ({
    id: String((s && s.id) || ''),
    instruction: String((s && s.instruction) || ''),
    target: String((s && s.target) || ''),
    doneWhen: String((s && s.doneWhen) || ''),
    docRef: String((s && s.docRef) || ''),
    shot: String((s && s.shot) || ''),
  }))
}
