import test from 'node:test'
import assert from 'node:assert/strict'
import { deviationPromptBlock, parseDeviation, deviationHook, DEVIATION_KINDS } from './workflow_deviation.js'
import { workNavigate, workNavigateSystem, workNavigateUser } from './work.js'

test('prompt: names the workflow, lists every kind, keeps slips out, forbids personal data', () => {
  const p = deviationPromptBlock('Raise a "transfer"')
  assert.match(p, /WORKFLOW THE COMPANY PUBLISHED \("Raise a 'transfer'"\)/)   // title quotes neutralized
  for (const k of DEVIATION_KINDS) assert.ok(p.includes(k), k)
  assert.match(p, /simply slipped and is putting it right/)
  assert.match(p, /Never put personal data/)
  assert.doesNotMatch(p, /\u2014/)
})

test('parse: valid deviations only; extraStep only for an untrained path; text cleaned', () => {
  assert.equal(parseDeviation({}), null)
  assert.equal(parseDeviation({ deviation: null }), null)
  assert.equal(parseDeviation({ deviation: { kind: 'weird', why: 'x' } }), null)
  assert.equal(parseDeviation({ deviation: { kind: 'error', why: '  ' } }), null)
  assert.deepEqual(parseDeviation({ deviation: { kind: 'UI_CHANGED', why: 'Expected **Approve**,\nsaw Submit', extraStep: 'ignored' } }),
    { kind: 'ui_changed', why: 'Expected Approve, saw Submit', extraStep: null })
  assert.deepEqual(parseDeviation({ deviation: { kind: 'untrained_path', why: 'A consent page appeared', extraStep: 'Click **Accept**' } }),
    { kind: 'untrained_path', why: 'A consent page appeared', extraStep: 'Click Accept' })
})

const fakeAi = (reply, seen) => ({ analyseImages: async (_cfg, prompt) => { seen.prompt = prompt; return reply } })
const nav = (ai, extra) => workNavigate(ai, { providerId: 'p' }, {
  base: 'B', goal: 'Raise a transfer', steps: [{ text: 'Open **Transfers**', status: 'current' }, { text: 'Approve', status: 'pending' }],
  currentStep: 0, frame: 'data:image/jpeg;base64,AA', visionModel: 'v', extra,
})

test('navigator hook: a workflow session gets the block and its parsed deviation in the same read', async () => {
  const seen = {}
  const reply = JSON.stringify({ completed: [], current: 1, guidance: 'Click Accept', observation: 'A consent page', flag: '', done: false,
    deviation: { kind: 'untrained_path', why: 'A consent page appeared before Transfers', extraStep: 'Click Accept' } })
  const r = await nav(fakeAi(reply, seen), deviationHook('Raise a transfer'))
  assert.match(seen.prompt, /THIS CHECKLIST IS A WORKFLOW THE COMPANY PUBLISHED/)
  assert.deepEqual(r.extra, { kind: 'untrained_path', why: 'A consent page appeared before Transfers', extraStep: 'Click Accept' })
  assert.equal(r.guidance, 'Click Accept')   // normal guidance unchanged
})

test('regression: a session that follows no workflow keeps the exact same prompt and no extra', async () => {
  const seen = {}
  const r = await nav(fakeAi(JSON.stringify({ completed: [], current: 1, guidance: 'g', observation: 'o' }), seen), null)
  assert.equal(r.extra, null)
  assert.doesNotMatch(seen.prompt, /WORKFLOW THE COMPANY PUBLISHED/)
  const steps = [{ text: 'Open **Transfers**', status: 'current' }, { text: 'Approve', status: 'pending' }]
  assert.equal(seen.prompt, `${workNavigateSystem({ base: 'B' })}

${workNavigateUser({ goal: 'Raise a transfer', steps, currentStep: 0 })}`)
})
