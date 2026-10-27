// ===========================================================================
// Guidance fidelity + deep planning tests (the Google Search Console class of
// failures). Covers:
//   - the deterministic consistency guard (a failed verify never reads as done)
//   - the cross-system / deep-planning plan rule in the planner PROMPT
//   - the self-critique pipeline (hardens a branchy draft; skips a linear task)
//   - the verify-moment escalation (strong model + full resolution)
//   - the mid-task ASK learn-and-adapt contract (planChanged + forward steps +
//     resumeAt, preserving completed steps)
//   - the shared helpers isVerifyStep / hasFailureSignal
// ===========================================================================
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { workPlan, workPlanSystem, workNavigate, workNavigateSystem, workAskSystem, workWatch, workAsk, normalizeLevel } from './work.js'
import { isVerifyStep, hasFailureSignal } from './work_deep_plan.js'

// ---- stubs ----------------------------------------------------------------
// A vision stub that records every analyseImages call (cfg, visionModel, opts)
// and returns a fixed JSON payload.
function visionStub(payload) {
  const calls = []
  return {
    calls,
    async analyseImages(cfg, _prompt, _frames, vm, opts) {
      calls.push({ cfg, vm, opts: opts || {} })
      return typeof payload === 'function' ? payload(cfg, vm, opts) : JSON.stringify(payload)
    },
    async generate() { return '' },
  }
}
// A text stub that returns each queued response in order (draft, then critique).
function textStub(responses) {
  const calls = []
  let i = 0
  return {
    calls,
    async generate(cfg, system, user) {
      calls.push({ cfg, system, user })
      const r = responses[Math.min(i, responses.length - 1)]
      i += 1
      return r
    },
    async analyseImages() { return '' },
  }
}

// ---- shared helpers -------------------------------------------------------
test('isVerifyStep recognizes verify/confirm moments and ignores plain actions', () => {
  assert.equal(isVerifyStep({ text: 'Click Verify', validate: 'ownership is verified' }), true)
  assert.equal(isVerifyStep({ text: 'Confirm the record', validate: 'record found' }), true)
  assert.equal(isVerifyStep({ text: 'Wait for the record to propagate', validate: 'TXT visible' }), true)
  assert.equal(isVerifyStep({ text: 'Type your email', validate: 'email entered' }), false)
  assert.equal(isVerifyStep(null), false)
})

test('hasFailureSignal catches clear failures and ignores negated/success text', () => {
  assert.equal(hasFailureSignal('Ownership verification failed'), true)
  assert.equal(hasFailureSignal('we could not find your token'), true)
  assert.equal(hasFailureSignal('the value does not match'), true)
  assert.equal(hasFailureSignal('no TXT record found at that host'), true)
  assert.equal(hasFailureSignal('An error banner is shown'), true)
  assert.equal(hasFailureSignal('invalid record'), true)
  // Negated / success forms must NOT read as failure (never block a good step):
  assert.equal(hasFailureSignal('Verified with no errors'), false)
  assert.equal(hasFailureSignal('Success, everything looks good'), false)
  assert.equal(hasFailureSignal('Saved without any problem'), false)
  assert.equal(hasFailureSignal(''), false)
})

// ---- consistency guard: workWatch -----------------------------------------
test('workWatch: a failed verify never reads as done (guard forces wrong)', async () => {
  const ai = visionStub({ status: 'done', observation: 'Ownership verification failed, token not found.', flag: '' })
  const out = await workWatch(ai, {}, {
    base: 'B', goal: 'add my site', frame: 'data:image/jpeg;base64,x', visionModel: 'vm',
    step: { text: 'Verify ownership in Search Console', validate: 'ownership verified' },
  })
  assert.equal(out.status, 'wrong')
  assert.ok(out.flag.length > 0, 'the failure must be surfaced in flag')
})

test('workWatch: a genuine success on a verify step still reads as done', async () => {
  const ai = visionStub({ status: 'done', observation: 'Ownership verified with no errors.', flag: '' })
  const out = await workWatch(ai, {}, {
    base: 'B', goal: 'add my site', frame: 'data:image/jpeg;base64,x', visionModel: 'vm',
    step: { text: 'Verify ownership', validate: 'ownership verified' },
  })
  assert.equal(out.status, 'done')
})

// ---- consistency guard: workNavigate --------------------------------------
test('workNavigate: a failed verify is dropped from completed, current held, done cleared', async () => {
  const steps = [
    { status: 'done', text: 'Copy the TXT value', validate: 'value copied' },
    { status: 'current', text: 'Verify ownership in Search Console', validate: 'ownership verified' },
  ]
  // Model hallucinates completion but its own observation reports the failure.
  const ai = visionStub({
    completed: [1, 2], current: 2, guidance: 'All set', done: true,
    observation: 'Ownership verification failed: we could not find your token; we found a different TXT instead.',
    flag: '',
  })
  const out = await workNavigate(ai, { id: 'cheap' }, {
    base: 'B', goal: 'add my site to Google Search Console', steps, currentStep: 1,
    frame: 'data:image/jpeg;base64,x', visionModel: 'vm', strong: null,
  })
  assert.deepEqual(out.completed, [0], 'the failed verify step (index 1) must be removed from completed')
  assert.equal(out.current, 1, 'current must stay on the failed verify step')
  assert.equal(out.done, false, 'done must be cleared')
  assert.ok(out.flag.length > 0, 'the failure must be surfaced in flag')
})

test('workNavigate: a genuine verify success advances normally (guard does not block)', async () => {
  const steps = [
    { status: 'done', text: 'Copy the TXT value', validate: 'value copied' },
    { status: 'current', text: 'Verify ownership in Search Console', validate: 'ownership verified' },
  ]
  const ai = visionStub({
    completed: [1, 2], current: 2, guidance: 'Done', done: true,
    observation: 'Ownership verified. The success banner is shown.', flag: '',
  })
  const out = await workNavigate(ai, { id: 'cheap' }, {
    base: 'B', goal: 'add my site', steps, currentStep: 1,
    frame: 'data:image/jpeg;base64,x', visionModel: 'vm', strong: null,
  })
  assert.deepEqual(out.completed, [0, 1])
  assert.equal(out.done, true)
})

// ---- verify-moment escalation ---------------------------------------------
test('workNavigate: a verify step reads at full resolution and prefers the strong model', async () => {
  const steps = [{ status: 'current', text: 'Verify ownership in Search Console', validate: 'ownership verified' }]
  const ai = visionStub({ completed: [], current: 1, guidance: 'Click **Verify**', observation: 'The verify dialog is open.', flag: '', done: false })
  await workNavigate(ai, { id: 'cheap' }, {
    base: 'B', goal: 'add my site', steps, currentStep: 0,
    frame: 'data:image/jpeg;base64,x', visionModel: 'cheap-vm',
    strong: { cfg: { id: 'strong' }, visionModel: 'strong-vm' },
  })
  assert.equal(ai.calls.length, 1)
  assert.equal(ai.calls[0].cfg.id, 'strong', 'verify moment should use the strong model')
  assert.equal(ai.calls[0].vm, 'strong-vm')
  assert.equal(ai.calls[0].opts.mediaRes, 'high', 'verify moment should read at full resolution')
})

test('workNavigate: an ordinary step stays on the cheap model at medium resolution', async () => {
  const steps = [{ status: 'current', text: 'Copy the TXT value to the clipboard', validate: 'value copied' }]
  const ai = visionStub({ completed: [], current: 1, guidance: 'Copy it', observation: 'The value is shown.', flag: '', done: false })
  await workNavigate(ai, { id: 'cheap' }, {
    base: 'B', goal: 'add my site', steps, currentStep: 0,
    frame: 'data:image/jpeg;base64,x', visionModel: 'cheap-vm',
    strong: { cfg: { id: 'strong' }, visionModel: 'strong-vm' },
  })
  assert.equal(ai.calls[0].cfg.id, 'cheap', 'ordinary navigation stays on the cheap model')
  assert.equal(ai.calls[0].opts.mediaRes, 'medium')
})

// ---- cross-system / deep-planning plan rule (the PROMPT) -------------------
test('workPlanSystem teaches the full cross-system DNS round trip and the deep structure', () => {
  const sys = workPlanSystem({ base: 'B' })
  assert.match(sys, /cross-system round trip/i)
  assert.match(sys, /registrar/i)
  assert.match(sys, /REPLACE/)             // replace an old/wrong value, not append
  assert.match(sys, /propagat/i)           // realistic propagation wait
  assert.match(sys, /verify/i)             // verify back on the issuing site
  assert.match(sys, /Google Search Console/i)
  assert.match(sys, /google-site-verification=/)
  // The deep branch/recovery structure the planner must encode:
  assert.match(sys, /"branches"/)
  assert.match(sys, /"onFail"/)
})

// ---- self-critique pipeline -----------------------------------------------
test('workPlan hardens a branchy DNS draft with a second self-critique pass', async () => {
  const draft = JSON.stringify({
    appContext: 'Google Search Console',
    steps: [
      { text: 'Copy the TXT record value', validate: 'value is shown' },
      { text: 'Click Verify', validate: 'ownership verified' },
    ],
  })
  const critique = JSON.stringify({
    appContext: 'Google Search Console',
    steps: [
      { text: 'Open Search Console and add a Domain property', validate: 'a TXT record is shown' },
      { text: 'Copy the TXT value', validate: 'value is on the clipboard' },
      {
        text: "Open your domain registrar's DNS settings", validate: 'the DNS records list is shown',
        branches: [
          { when: 'the domain is on Cloudflare', guidance: 'Open the DNS app for the domain' },
          { when: 'the domain is on GoDaddy', guidance: 'Open Domain Settings then DNS' },
        ],
      },
      { text: 'Add or replace the TXT record with the copied value', validate: 'the record is saved' },
      {
        text: 'Wait for propagation, then click Verify', validate: 'ownership is verified',
        onFail: [
          { cause: 'it found a different token', fix: 'copy the current value and replace the old TXT record' },
          { cause: 'not yet propagated', fix: 'wait a few minutes and click Verify again' },
        ],
      },
    ],
  })
  const ai = textStub([draft, critique])
  const out = await workPlan(ai, {}, {
    base: 'B', goal: 'add my site to Google Search Console with DNS TXT verification',
    strong: { cfg: { id: 'strong' } },
  })
  assert.equal(ai.calls.length, 2, 'a branchy goal should run the draft + critique pass')
  assert.ok(out.steps.length >= 5, 'the hardened plan should carry the full round trip')
  assert.equal(out.reason, 'deep')
  const withBranches = out.steps.find((s) => Array.isArray(s.branches))
  assert.ok(withBranches && withBranches.branches.length === 2, 'the registrar fork should be encoded as branches')
  const withOnFail = out.steps.find((s) => Array.isArray(s.onFail))
  assert.ok(withOnFail && withOnFail.onFail.length === 2, 'the verify step should carry onFail recovery')
  assert.ok(withOnFail.onFail[0].cause && withOnFail.onFail[0].fix, 'each onFail entry has a cause and a fix')
})

test('workPlan does NOT run the critique pass for a plain linear task', async () => {
  const ai = textStub([JSON.stringify({ appContext: 'Finder', steps: [{ text: 'Rename the file to report.pdf', validate: 'the file is renamed' }] })])
  const out = await workPlan(ai, {}, { base: 'B', goal: 'rename a file on my desktop' })
  assert.equal(ai.calls.length, 1, 'a plain linear task should not pay for a second pass')
  assert.equal(out.steps.length, 1)
})

// ---- guidance strength (the user-chosen register) -------------------------
test('guidance strength: each level stamps its register into the plan, navigate and ask prompts', () => {
  for (const lvl of ['easy', 'medium', 'technical', 'executive']) {
    const tag = new RegExp(`GUIDANCE STRENGTH: ${lvl.toUpperCase()}`)
    assert.match(workPlanSystem({ base: 'B', level: lvl }), tag)
    assert.match(workNavigateSystem({ base: 'B', level: lvl }), tag)
    assert.match(workAskSystem({ base: 'B', level: lvl }), tag)
  }
})

test('guidance strength: EASY and TECHNICAL registers differ, unknown/absent defaults to MEDIUM', () => {
  const easy = workPlanSystem({ base: 'B', level: 'easy' })
  const tech = workPlanSystem({ base: 'B', level: 'technical' })
  assert.notEqual(easy, tech, 'EASY and TECHNICAL must produce different registers')
  assert.match(easy, /GUIDANCE STRENGTH: EASY/)
  assert.match(tech, /GUIDANCE STRENGTH: TECHNICAL/)
  assert.match(workPlanSystem({ base: 'B' }), /GUIDANCE STRENGTH: MEDIUM/)        // default
  assert.match(workPlanSystem({ base: 'B', level: 'ultra' }), /GUIDANCE STRENGTH: MEDIUM/) // unknown
  assert.equal(normalizeLevel('ultra'), 'medium')
  assert.equal(normalizeLevel('technical'), 'technical')
})

test('guidance strength: workNavigate threads the chosen level into the live system prompt', async () => {
  let seenPrompt = ''
  const ai = {
    async analyseImages(_cfg, prompt) { seenPrompt = prompt; return JSON.stringify({ completed: [], current: 1, guidance: 'x', observation: 'y', flag: '', done: false }) },
  }
  await workNavigate(ai, {}, {
    base: 'B', level: 'technical', goal: 'g',
    steps: [{ status: 'current', text: 'Type a command', validate: 'it ran' }], currentStep: 0,
    frame: 'data:image/jpeg;base64,x', visionModel: 'vm',
  })
  assert.match(seenPrompt, /GUIDANCE STRENGTH: TECHNICAL/, 'a mid-session level change must reach the next navigate output')
})

// ---- mid-task ASK: learn and adapt the plan from the question -------------
test('workAsk: a question that changes the plan returns planChanged + forward steps + resumeAt', async () => {
  const steps = [
    { status: 'done', text: 'Open Search Console', validate: 'it is open' },
    { status: 'current', text: 'Click Verify', validate: 'ownership verified' },
  ]
  const ai = {
    async analyseImages() {
      return JSON.stringify({
        answer: 'Your domain is on Cloudflare, so the TXT record goes there.',
        planChanged: true,
        steps: [
          { text: 'Open the Cloudflare DNS settings for your domain', validate: 'the DNS list is shown' },
          { text: 'Add the TXT record with the copied value', validate: 'the record is saved', onFail: [{ cause: 'a different token is found', fix: 'replace the old value with the current one' }] },
        ],
      })
    },
  }
  const out = await workAsk(ai, {}, {
    base: 'B', goal: 'add my site', question: 'where do I actually add this record?',
    steps, currentStep: 1, frame: 'data:image/jpeg;base64,x', visionModel: 'vm',
  })
  assert.equal(out.planChanged, true)
  assert.equal(out.steps.length, 2, 'only the forward steps are returned')
  assert.equal(out.resumeAt, 1, 'resume right after the one finished step')
  assert.ok(out.steps[1].onFail && out.steps[1].onFail.length === 1, 'forward steps keep the recovery structure')
  assert.ok(out.answer.length > 0)
})

test('workAsk: proactive stuck help with an empty/confused answer explains the current step, no churn', async () => {
  const steps = [
    { status: 'done', text: 'Open Search Console', validate: 'it is open' },
    { status: 'current', text: 'Click Verify', validate: 'ownership verified' },
  ]
  // Confusion, not new information: the model explains the current step and does
  // NOT re-plan, so the plan is not churned.
  const ai = {
    async analyseImages() {
      return JSON.stringify({
        answer: 'Look at the top right of the dialog for the blue **Verify** button, and click it; it rechecks your DNS record.',
        planChanged: false, steps: [],
      })
    },
  }
  const out = await workAsk(ai, {}, {
    base: 'B', goal: 'add my site', question: 'not sure', // vague / stuck
    steps, currentStep: 1, frame: 'data:image/jpeg;base64,x', visionModel: 'vm',
  })
  assert.equal(out.planChanged, false, 'confusion must not churn the plan')
  assert.deepEqual(out.steps, [], 'no forward steps on a stuck-help explanation')
  assert.equal(out.resumeAt, 1, 'stay on the current step')
  assert.ok(out.answer.length > 0, 'a clearer explanation of the current step is returned')
})

test('workAsk: a plain informational question returns planChanged=false with just the answer', async () => {
  const steps = [
    { status: 'done', text: 'Open Search Console', validate: 'it is open' },
    { status: 'current', text: 'Click Verify', validate: 'ownership verified' },
  ]
  const ai = {
    async analyseImages() {
      return JSON.stringify({ answer: 'That spinner just means it is still checking; give it a moment.', planChanged: false, steps: [] })
    },
  }
  const out = await workAsk(ai, {}, {
    base: 'B', goal: 'add my site', question: 'what is this spinner?',
    steps, currentStep: 1, frame: 'data:image/jpeg;base64,x', visionModel: 'vm',
  })
  assert.equal(out.planChanged, false)
  assert.deepEqual(out.steps, [])
  assert.equal(out.resumeAt, 1)
  assert.ok(out.answer.length > 0)
})
