// Private Brain - the Task-Workflow Knowledge Base. These cover the two PURE
// functions in work.js: distillWorkflowTemplate (a completed session -> a
// reusable, de-identified template record, decision 3 clean-success bar) and
// matchWorkflowTemplate (best template + serve/seed/none tier on a new task).
// No I/O, no AI: work.js is imported directly, like the planner tests. The store
// layer (store.js) and the index.js hooks are tested separately.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const workPath = 'file://' + path.join(here, 'work.js').replace(/\\/g, '/')
const work = await import(workPath)

// A clean, fully-completed Okta offboarding session (every step confirmed done).
const cleanSession = () => ({
  id: 'ws_clean1',
  goal: "Deactivate a former employee's Okta account",
  appContext: 'Okta',
  scope: [
    { q: 'Which jurisdiction?', a: 'US-CA' },
    { q: 'Which software are you using?', a: 'Okta' },
  ],
  events: [{ t: '2026-10-26T10:00:00Z', kind: 'guidance', text: 'started' }],
  endedAt: '2026-10-26T10:05:00Z',
  steps: [
    { n: 1, text: 'Open the **Okta admin console**, then Directory > People', validate: 'the People list is visible', url: 'https://admin.okta.com/', commands: [], code: null, status: 'done', doneAt: '2026-10-26T10:01:00Z' },
    { n: 2, text: 'Find the user and click **Deactivate**', validate: 'account status shows Deactivated', url: null, commands: [], code: null, status: 'done', doneAt: '2026-10-26T10:04:00Z' },
  ],
})

// ---------------------------------------------------------------------------
// DISTILLER
// ---------------------------------------------------------------------------

test('distill produces a template record from a clean completed session', () => {
  const t = work.distillWorkflowTemplate(cleanSession())
  assert.ok(t, 'a clean success distills to a record')
  // match signature
  assert.equal(t.goalSig, 'deactivate former employee okta account')
  assert.deepEqual(t.goalTokens, ['deactivate', 'former', 'employee', 'okta', 'account'])
  assert.equal(t.app, 'okta')
  // environment pulled from the scope answers
  assert.equal(t.environment.jurisdiction, 'US-CA')
  assert.deepEqual(t.environment.software, ['Okta'])
  assert.equal(t.environment.manual, false)       // a concrete tool was named
  assert.equal(t.environment.conventions.length, 2)
  // the proven ordered workflow + action KIND + the key selection (first bold)
  assert.equal(t.steps.length, 2)
  assert.equal(t.steps[0].kind, 'navigate')       // it carries a url
  assert.equal(t.steps[0].selection, 'Okta admin console')
  assert.equal(t.steps[1].kind, 'ui')
  assert.equal(t.steps[1].selection, 'Deactivate')
  // success provenance + seed
  assert.equal(t.successSignal, 'account status shows Deactivated')
  assert.equal(t.successAt, '2026-10-26T10:04:00Z')
  assert.equal(t.sourceSessionId, 'ws_clean1')
  assert.equal(t.confidence, work.WORKFLOW_CONFIDENCE_SEED)
  // persistence fields are the store layer's job, not set here
  assert.equal(t.id, undefined)
  assert.equal(t.version, undefined)
  assert.equal(t.hits, undefined)
})

test('distill de-identifies obvious PII in the outline (defensive, pre-scrub)', () => {
  const s = cleanSession()
  s.steps[1].text = 'Email jane.doe@acme.com and deactivate account 12345678'
  const t = work.distillWorkflowTemplate(s)
  assert.ok(!/jane\.doe@acme\.com/.test(t.steps[1].text), 'email is redacted')
  assert.ok(!/12345678/.test(t.steps[1].text), 'long id run is redacted')
  assert.match(t.steps[1].text, /\[email\]/)
  assert.match(t.steps[1].text, /\[number\]/)
})

test('distill returns null on an incomplete session (a step not done) - decision 3', () => {
  const s = cleanSession()
  s.steps[1].status = 'current'   // last step never confirmed done
  assert.equal(work.distillWorkflowTemplate(s), null)
})

test('distill returns null on a session with no steps', () => {
  const s = cleanSession()
  s.steps = []
  assert.equal(work.distillWorkflowTemplate(s), null)
})

test('distill returns null when a flag dominates the tail (not a clean success)', () => {
  const s = cleanSession()
  s.events.push({ t: '2026-10-26T10:06:00Z', kind: 'flag', text: 'wrong user selected' })
  assert.equal(work.distillWorkflowTemplate(s), null)
})

// ---------------------------------------------------------------------------
// GOAL SIGNATURE normalization
// ---------------------------------------------------------------------------

test('goalSig normalizes similar goals (case, punctuation, volatile year) to the same signature', () => {
  const a = work.workflowGoalSignature('File my 2024 taxes in TurboTax')
  const b = work.workflowGoalSignature('file my 2026 taxes in TurboTax!!!')
  assert.equal(a.sig, b.sig)                       // the year is a volatile specific, stripped
  assert.equal(a.sig, 'file taxe turbotax')        // "my"/"in" dropped, "taxes" singularized
  // possessive + case + trailing punctuation collapse to one signature too
  const c = work.workflowGoalSignature("Deactivate a former employee's Okta account.")
  const d = work.workflowGoalSignature('DEACTIVATE A FORMER EMPLOYEE OKTA ACCOUNT')
  assert.equal(c.sig, d.sig)
})

// ---------------------------------------------------------------------------
// MATCHER - tiers
// ---------------------------------------------------------------------------

test('matcher returns STRONG for a near-identical goal + same app + compatible env', () => {
  const tmpl = work.distillWorkflowTemplate(cleanSession())
  const r = work.matchWorkflowTemplate(
    "Deactivate a former employee's Okta account",
    'Okta',
    { jurisdiction: 'US-CA', software: ['Okta'] },
    [tmpl],
  )
  assert.equal(r.tier, 'strong')
  assert.ok(r.score >= work.WORKFLOW_SERVE_FLOOR)
  assert.equal(r.template, tmpl)
})

test('matcher returns PARTIAL for a loose overlap (same app, partial goal overlap)', () => {
  const tmpl = work.distillWorkflowTemplate(cleanSession())
  const r = work.matchWorkflowTemplate('Offboard an employee in Okta', 'Okta', {}, [tmpl])
  assert.equal(r.tier, 'partial')
  assert.ok(r.score >= work.WORKFLOW_SEED_FLOOR && r.score < work.WORKFLOW_SERVE_FLOOR)
  assert.equal(r.template, tmpl)    // the candidate is still returned so the plan can be seeded
})

test('matcher returns NONE for an unrelated goal + unrelated app', () => {
  const tmpl = work.distillWorkflowTemplate(cleanSession())
  const r = work.matchWorkflowTemplate('Create an AWS EC2 instance', 'AWS', { software: ['aws'] }, [tmpl])
  assert.equal(r.tier, 'none')
  assert.equal(r.template, null)    // a near-miss is adapted; nothing matched here
  assert.ok(r.score < work.WORKFLOW_SEED_FLOOR)
})

test('an app mismatch downgrades an otherwise-identical goal from STRONG to PARTIAL', () => {
  const tmpl = work.distillWorkflowTemplate(cleanSession())
  // same goal, but a different IdP + incompatible software -> must not be served as proven
  const r = work.matchWorkflowTemplate(
    "Deactivate a former employee's Okta account",
    'Azure AD',
    { software: ['azure'] },
    [tmpl],
  )
  assert.notEqual(r.tier, 'strong')
  assert.equal(r.tier, 'partial')
})

test('empty templates -> none (fast path, no candidates)', () => {
  const r = work.matchWorkflowTemplate("Deactivate a former employee's Okta account", 'Okta', {}, [])
  assert.deepEqual(r, { template: null, score: 0, tier: 'none' })
})

test('matcher picks the highest-scoring template among several candidates', () => {
  const okta = work.distillWorkflowTemplate(cleanSession())
  const aws = work.distillWorkflowTemplate({
    id: 'ws_aws', goal: 'Create an AWS EC2 instance', appContext: 'AWS',
    scope: [{ q: 'Which software?', a: 'AWS' }], events: [],
    steps: [{ n: 1, text: 'Open the EC2 console', validate: 'the EC2 dashboard is visible', url: null, commands: [], code: null, status: 'done', doneAt: '2026-10-26T09:00:00Z' }],
  })
  const r = work.matchWorkflowTemplate("Deactivate a former employee's Okta account", 'Okta', { software: ['Okta'] }, [aws, okta])
  assert.equal(r.template, okta)
  assert.equal(r.tier, 'strong')
})
