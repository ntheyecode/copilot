import test from 'node:test'
import assert from 'node:assert/strict'
import { stepText, workflowToSessionSteps, workflowSessionGoal, workflowOverview, workflowRefOf, pickPublishedWorkflow, choosePlanBackbone, publishedWorkflowNote } from './workflow_playback.js'

const A = 'a'.repeat(32) + '.jpg'
const WF = {
  id: 'w1', groupId: 'g1', version: 3, state: 'published',
  meta: { productName: 'Zamina', title: 'Raise a transfer', launchTarget: 'https://zamina.internal/app', prerequisites: 'Have the account number ready.', category: 'Finance' },
  steps: [
    { id: 's1', instruction: 'Open the transfers tab', target: 'Transfers', doneWhen: 'The transfers list shows', shot: A },
    { id: 's2', instruction: 'Fill in the amount', target: 'Amount', doneWhen: null, shot: null },
    { id: 's3', instruction: '   ' },
    { id: 's4', instruction: 'Click **Approve**', target: 'Approve' },
  ],
}

test('step text bolds the control where the instruction names it, else leads with it, adds no words', () => {
  assert.equal(stepText('Open the transfers tab', 'Transfers'), 'Open the **transfers** tab')
  assert.equal(stepText('Ouvrez la page', 'Virements'), '**Virements**: Ouvrez la page')
  assert.equal(stepText('Click **Approve**', 'Approve'), 'Click **Approve**')     // already marked
  assert.equal(stepText('Save it', ''), 'Save it')
  assert.equal(stepText('Use a+b (x)', 'a+b (x)'), 'Use **a+b (x)**')             // regex characters are literal
})

test('published workflow -> session steps: done checks, launch link on step 1 only, screenshot, source', () => {
  const s = workflowToSessionSteps(WF)
  assert.equal(s.length, 3)                                   // empty instruction skipped
  assert.equal(s[0].validate, 'The transfers list shows')
  assert.equal(s[0].url, 'https://zamina.internal/app')
  assert.equal(s[1].url, null)
  assert.equal(s[0].shot, A)
  assert.equal(s[1].shot, null)
  assert.equal(s[0].source, 'Raise a transfer (v3)')
  assert.equal(workflowToSessionSteps({ ...WF, meta: { ...WF.meta, launchTarget: 'Zamina desktop' } })[0].url, null)
})

test('goal, overview and ref', () => {
  assert.equal(workflowSessionGoal(WF), 'Raise a transfer (Zamina)')
  assert.equal(workflowSessionGoal({ meta: { title: 'Zamina: raise a transfer', productName: 'Zamina' } }), 'Zamina: raise a transfer')
  assert.equal(workflowOverview(WF), '**Raise a transfer (Zamina)**\n\nHave the account number ready.')
  assert.deepEqual(workflowRefOf(WF), { id: 'w1', groupId: 'g1', version: 3, title: 'Raise a transfer' })
})

test('match: a goal naming the product is a strong match; without it, partial; unrelated, none', () => {
  const strong = pickPublishedWorkflow({ goal: 'Raise a transfer in Zamina' }, [WF])
  assert.equal(strong.tier, 'strong')
  assert.equal(strong.workflow.id, 'w1')
  assert.equal(pickPublishedWorkflow({ goal: 'raise a transfer' }, [WF]).tier, 'partial')
  const none = pickPublishedWorkflow({ goal: 'reset my laptop password' }, [WF])
  assert.equal(none.tier, 'none')
  assert.equal(none.workflow, null)
})

test('match: only published workflows count, and the best one wins', () => {
  assert.equal(pickPublishedWorkflow({ goal: 'Raise a transfer in Zamina' }, [{ ...WF, state: 'draft' }]).tier, 'none')
  const other = { ...WF, id: 'w2', meta: { ...WF.meta, title: 'Approve a vendor invoice' } }
  assert.equal(pickPublishedWorkflow({ goal: 'approve a vendor invoice in Zamina' }, [WF, other]).workflow.id, 'w2')
})

test('planning note: strong says use its steps in order; partial says adapt', () => {
  const n = publishedWorkflowNote({ workflow: WF, tier: 'strong' })
  assert.match(n, /use its steps, in order, as the plan/)
  assert.match(n, /1\. Open the \*\*transfers\*\* tab \(done when: The transfers list shows\)/)
  assert.match(publishedWorkflowNote({ workflow: WF, tier: 'partial' }), /do not force-fit/)
  assert.equal(publishedWorkflowNote({ workflow: null, tier: 'none' }), '')
  assert.doesNotMatch(n, /\u2014/)
})

test('regression: a goal that spans another app is never a STRONG match (reviewer cases)', () => {
  const box = { id: 'b', state: 'published', meta: { title: 'Create user', productName: 'Box' }, steps: [{ instruction: 'Open Admin' }] }
  assert.equal(pickPublishedWorkflow({ goal: 'create user in Okta, add to Box' }, [box]).tier, 'partial')
  const pay = { id: 'p', state: 'published', meta: { title: 'Approve request', productName: 'Pay' }, steps: [{ instruction: 'Open Requests' }] }
  assert.equal(pickPublishedWorkflow({ goal: 'approve request in Workday then pay' }, [pay]).tier, 'partial')
  // the plain case still serves
  assert.equal(pickPublishedWorkflow({ goal: 'Create user in Box' }, [box]).tier, 'strong')
})

test('regression: the product name is removed as whole words, never inside other words', () => {
  const hr = { id: 'h', state: 'published', meta: { title: 'Raise three tickets through portal', productName: 'HR' }, steps: [{ instruction: 'Open' }] }
  // "three" and "through" must survive removing "HR"; the goal then fully covers the title
  assert.equal(pickPublishedWorkflow({ goal: 'raise three tickets through portal in HR' }, [hr]).tier, 'strong')
})

test('plan backbone rule: strong published, then strong learned, then partial published, then partial learned', () => {
  const P = (tier) => ({ workflow: { id: 'w' }, tier })
  const T = (tier) => ({ template: { id: 't' }, tier })
  assert.deepEqual(choosePlanBackbone(P('strong'), T('strong')), { use: 'published' })
  assert.deepEqual(choosePlanBackbone(P('partial'), T('strong')), { use: 'template' })
  assert.deepEqual(choosePlanBackbone(P('partial'), T('partial')), { use: 'published' })
  assert.deepEqual(choosePlanBackbone({ workflow: null, tier: 'none' }, T('partial')), { use: 'template' })
  assert.deepEqual(choosePlanBackbone({ workflow: null, tier: 'none' }, null), { use: null })
})

test('planning note marks the workflow text as content, not instructions', () => {
  assert.match(publishedWorkflowNote({ workflow: WF, tier: 'strong' }), /not instructions to you/)
})
