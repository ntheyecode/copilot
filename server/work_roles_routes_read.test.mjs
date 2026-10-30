import test from 'node:test'
import assert from 'node:assert/strict'
import { registerWorkRolesRoutes } from './work_roles_routes.js'
import * as work from './work.js'

const A = 'a'.repeat(32) + '.jpg'
const B = 'b'.repeat(32) + '.jpg'
const reply = (o) => JSON.stringify(o)

// Drive the real handler with a fake app + injected deps (no server, no key).
function setup({ step = { id: 's1', instruction: 'Open', shot: A }, primaryReply, strongReply, strong = true } = {}) {
  const routes = new Map()
  const app = { get() {}, patch() {}, delete() {}, post: (p, ...h) => routes.set(p, h[h.length - 1]) }
  const calls = { vision: [], saved: null, resolved: 0, switches: [] }
  const store = {
    prepareStepRead: () => ({ step, nextStep: { id: 's2', shot: B }, meta: { productName: 'Zamina' }, index: 0, total: 2, loadFrame: (r) => `data:image/jpeg;base64,${r}` }),
    saveStepReading: (_u, _w, _s, reading) => { calls.saved = reading; return { id: 'w1', steps: [{ ...step, reading }] } },
  }
  const ai = {
    analyseImages: async (cfg, _prompt, images, model) => {
      calls.vision.push({ provider: cfg.providerId, model, images: images.length })
      return model === 'cheap' ? primaryReply : strongReply
    },
  }
  const resolveWorkRuntime = async () => {
    calls.resolved++
    return { rt: { providerId: 'p1', onSwitch: (e) => calls.switches.push(e) }, visionModel: 'cheap', strong: strong ? { rt: { providerId: 'p1' }, visionModel: 'strong' } : null }
  }
  const pass = (_q, _s, n) => n && n()
  registerWorkRolesRoutes(app, {
    store, work, ai, requireWorkAuth: pass, requireWorkSubscription: pass, guardUserText: () => {}, wrap: (f) => f,
    resolveWorkRuntime, bestPlanningCall: async () => ({}), sendWorkError: (res, e) => res.status(e.status || 500).json({ error: e.message }),
  })
  const handler = routes.get('/api/work/workflows/:id/steps/:stepId/read')
  const run = async () => {
    const res = { code: 200, body: null, status(c) { this.code = c; return this }, json(b) { this.body = b; return this } }
    await handler({ workUser: { id: 't' }, params: { id: 'w1', stepId: 's1' } }, res)
    return res
  }
  return { run, calls }
}

test('read route: a confident cheap read is saved, with before + after frames', async () => {
  const { run, calls } = setup({ primaryReply: reply({ controlLabel: 'Transfers', controlKind: 'tab', doneWhen: 'List shows', confidence: 0.9 }) })
  const res = await run()
  assert.equal(res.code, 200)
  assert.deepEqual(calls.vision, [{ provider: 'p1', model: 'cheap', images: 2 }])
  assert.equal(calls.saved.controlLabel, 'Transfers')
  assert.equal(res.body.workflow.steps[0].reading.afterShot, B)
})

test('read route: a self-doubting cheap read gets one retry on the stronger model', async () => {
  const { run, calls } = setup({
    primaryReply: reply({ controlLabel: 'Maybe Save', confidence: 0.2 }),
    strongReply: reply({ controlLabel: 'Save draft', controlKind: 'button', confidence: 0.88 }),
  })
  const res = await run()
  assert.equal(res.code, 200)
  assert.deepEqual(calls.vision.map((c) => c.model), ['cheap', 'strong'])
  assert.equal(calls.saved.controlLabel, 'Save draft')
})

test('read route: unreadable is an actionable 422 and nothing is saved', async () => {
  const { run, calls } = setup({ primaryReply: 'too blurry', strongReply: 'still blurry' })
  const res = await run()
  assert.equal(res.code, 422)
  assert.equal(res.body.code, 'STEP_READ_UNREADABLE')
  assert.match(res.body.error, /Fill in the control/)
  assert.equal(calls.saved, null)
})

test('read route: a step with no frame never resolves a runtime or calls the model', async () => {
  const { run, calls } = setup({ step: { id: 's1', instruction: 'Open', shot: null } })
  const res = await run()
  assert.equal(res.code, 400)
  assert.equal(res.body.code, 'STEP_READ_NO_FRAME')
  assert.equal(calls.resolved, 0)
  assert.equal(calls.vision.length, 0)
})

test('read route: the response never names a provider or model', async () => {
  const { run } = setup({ primaryReply: reply({ controlLabel: 'Go', confidence: 0.9 }) })
  const res = await run()
  const s = JSON.stringify(res.body)
  assert.doesNotMatch(s, /p1|cheap|strong/)
})

test('read route: the switch to the stronger model is recorded (never silent)', async () => {
  const { run, calls } = setup({
    primaryReply: reply({ controlLabel: '', doneWhen: 'Saved', confidence: 0 }),
    strongReply: reply({ controlLabel: 'Save', confidence: 0.9 }),
  })
  await run()
  assert.equal(calls.switches.length, 1)
  assert.equal(calls.switches[0].reason, 'weak')
  assert.equal(calls.switches[0].toModel, 'strong')
})

test('regression: a backup that answers worse never replaces a usable first answer', async () => {
  const { run, calls } = setup({
    primaryReply: reply({ controlLabel: 'Save', confidence: 0.4 }),
    strongReply: 'I am not sure what this screen shows.',
  })
  const res = await run()
  assert.equal(res.code, 200)
  assert.deepEqual(calls.vision.map((c) => c.model), ['cheap', 'strong'])
  assert.equal(calls.saved.controlLabel, 'Save')
  assert.equal(calls.switches.length, 0)   // the backup's answer was not used
})
