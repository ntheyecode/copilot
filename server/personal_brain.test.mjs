import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import { createPersonalBrain } from './personal_brain.js'
import { mergeLearnings, parseDistilled, contextForGoal, similarity, distillParts, LIMITS } from './personal_brain_rules.js'

let n = 0
const newId = () => String(++n)
const fakeAi = (answers) => {
  const calls = []
  return { calls, generate: async (_cfg, system, user) => { calls.push({ system, user }); const a = answers[Math.min(calls.length - 1, answers.length - 1)]; return JSON.stringify({ learnings: a }) } }
}
const brainWith = (ai, { text = 'Our VPN is Contoso Connect. Reports go out on Fridays. Contact jo@corp.example for access.' } = {}) => {
  const data = {}
  const writes = []
  const brain = createPersonalBrain({
    db: () => data, persist: () => writes.push(JSON.stringify(data)), ai, runtime: () => ({ provider: 'fake' }),
    extractText: async () => text, newId, log: { info() {} },
  })
  return { brain, data, writes }
}
const DOC = { name: 'How I work.docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', base64: 'UEsDBA==' }

test('a document becomes learnings; the file and its text are never kept', async () => {
  const ai = fakeAi([[{ text: 'Reports go out every Friday afternoon.', kind: 'procedure' }, { text: 'The VPN client is Contoso Connect.', kind: 'fact' }]])
  const { brain, data, writes } = brainWith(ai)
  const tmpBefore = fs.readdirSync(os.tmpdir()).length
  const r = await brain.learnFromDocument('u1', DOC)
  assert.equal(r.added, 2)
  assert.equal(r.fileKept, false)
  assert.equal(r.sources[0].name, 'How I work.docx')
  assert.equal(r.learnings.length, 2)
  const saved = writes.at(-1)
  assert.doesNotMatch(saved, /UEsDBA|jo@corp\.example|Contact jo/, 'no file bytes, no raw text, no personal data stored')
  assert.ok(!('text' in (data.personalBrain.u1.sources[0])), 'a source keeps its name, not its text')
  assert.ok(fs.readdirSync(os.tmpdir()).length <= tmpBefore + 1, 'nothing spooled to disk')
})

test('sensitive values are masked before the AI reads the document', async () => {
  const ai = fakeAi([[{ text: 'Reports go out every Friday afternoon.' }]])
  const { brain } = brainWith(ai)
  const r = await brain.learnFromDocument('u1', DOC)
  assert.doesNotMatch(ai.calls[0].user, /jo@corp\.example/)
  assert.ok(r.masked >= 1)
})

test('the same document again refreshes what it taught; a twin learning is merged, not doubled', async () => {
  const ai = fakeAi([
    [{ text: 'Reports go out every Friday afternoon.' }, { text: 'The VPN client is Contoso Connect.' }],
    [{ text: 'Reports go out every Thursday afternoon now.' }],
  ])
  const { brain } = brainWith(ai)
  await brain.learnFromDocument('u1', DOC)
  const again = await brain.learnFromDocument('u1', { ...DOC, name: 'how i work.DOCX' })
  assert.equal(again.source.refreshed, true)
  assert.deepEqual(again.learnings.map((l) => l.text), ['Reports go out every Thursday afternoon now.'])
  assert.equal(again.sources.length, 1)
})

test('learnings from another source that say the same thing are kept once', () => {
  const brain = { learnings: [{ id: 'a', text: 'The VPN client is Contoso Connect.', sources: ['s1'], at: '1' }] }
  const r = mergeLearnings(brain, 's2', [{ text: 'The VPN client is Contoso Connect' }], { newId, now: '2' })
  assert.equal(r.learnings.length, 1)
  assert.deepEqual(r.learnings[0].sources, ['s1', 's2'])
  assert.equal(r.merged, 1)
  assert.ok(similarity('The VPN client is Contoso Connect.', 'Friday reports go to finance') < LIMITS.sameness)
})

test('forgetting a learning or a whole source; clearing the brain', async () => {
  const ai = fakeAi([[{ text: 'Reports go out every Friday afternoon.' }, { text: 'The VPN client is Contoso Connect.' }]])
  const { brain } = brainWith(ai)
  const r = await brain.learnFromDocument('u1', DOC)
  const v = brain.forgetLearning('u1', r.learnings[0].id)
  assert.equal(v.learnings.length, 1)
  const w = brain.forgetSource('u1', r.source.id)
  assert.equal(w.learnings.length, 0)
  assert.equal(w.sources.length, 0, 'a source with nothing left is not listed')
  assert.throws(() => brain.forgetLearning('u1', 'nope'), /already gone/)
  assert.deepEqual(brain.clear('u1'), { sources: [], learnings: [] })
})

test('desktop session notes are masked and land under Your sessions', () => {
  const { brain } = brainWith(fakeAi([[]]))
  const r = brain.addNotes('u1', ['Deploys run from the release branch, ask ops@corp.example first', 'tiny'])
  assert.equal(r.added, 1)
  assert.doesNotMatch(r.learnings[0].text, /ops@corp\.example/)
  assert.equal(r.sources[0].name, 'Your sessions')
  assert.throws(() => brain.addNotes('u1', []), /No learnings/)
})

test('people are separate: one brain never answers for another', async () => {
  const { brain } = brainWith(fakeAi([[{ text: 'Reports go out every Friday afternoon.' }]]))
  await brain.learnFromDocument('u1', DOC)
  assert.equal(brain.list('u2').learnings.length, 0)
  assert.equal(brain.contextFor('u2', 'send the friday report'), '')
})

test('a task is grounded in the learnings that match it, in any language', () => {
  const ls = [
    { text: 'Reports go out every Friday afternoon.', at: '1' },
    { text: 'The VPN client is Contoso Connect.', at: '2' },
    { text: '週次レポートは金曜日に送ります。', at: '3' },
  ]
  assert.match(contextForGoal(ls, 'Send the weekly report'), /Friday/)
  assert.doesNotMatch(contextForGoal(ls, 'Send the weekly report'), /VPN/)
  assert.match(contextForGoal(ls, '週次レポートを送る'), /金曜日/)
  assert.equal(contextForGoal(ls, ''), '')
})

test('the distiller output is cleaned: kinds, length, placeholders dropped', () => {
  const raw = 'ok {"learnings":[{"text":"Ask [EMAIL] for access","kind":"fact"},{"text":"short"},{"text":"Use the staging stack for demos.","kind":"weird"}]}'
  assert.deepEqual(parseDistilled(raw), [{ text: 'Use the staging stack for demos.', kind: 'fact' }])
  assert.deepEqual(parseDistilled('not json'), [])
  assert.equal(distillParts('x'.repeat(LIMITS.distillChunkChars * 10)).truncated, true)
})

test('no AI configured or an empty document is a clear, actionable refusal', async () => {
  const brain = createPersonalBrain({ db: () => ({}), persist() {}, ai: fakeAi([[]]), runtime: () => null, extractText: async () => 'x', newId, log: { info() {} } })
  await assert.rejects(brain.learnFromDocument('u1', DOC), (e) => e.status === 503 && e.code === 'AI_NOT_CONFIGURED')
  const { brain: b2 } = brainWith(fakeAi([[]]), { text: '   ' })
  await assert.rejects(b2.learnFromDocument('u1', DOC), (e) => e.status === 422)
  const { brain: b3 } = brainWith(fakeAi([[]]))
  await assert.rejects(b3.learnFromDocument('u1', DOC), (e) => e.code === 'NOTHING_LEARNED')
})

test('a cleanly finished session becomes one "this worked" learning', async () => {
  const { sessionLearning } = await import('./personal_brain_rules.js')
  const rec = { app: 'excel', steps: [{ text: 'Open the **Expenses** sheet.' }, { text: 'Insert a `PivotTable` by month' }] }
  assert.deepEqual(sessionLearning('Build my monthly summary', rec), { text: 'For "Build my monthly summary" in excel, this worked: Open the Expenses sheet; Insert a PivotTable by month.', kind: 'procedure' })
  assert.equal(sessionLearning('', rec), null)
  assert.equal(sessionLearning('x goal', { steps: [] }), null)
})
