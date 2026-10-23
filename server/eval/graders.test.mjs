// Gate for the accuracy-benchmark deterministic graders + dispatcher.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { gradeExact, gradeNumber, gradeJson, gradeTable, gradeRegex, grade } from './graders.mjs'

test('exact: loose by default, case/space-insensitive', () => {
  assert.equal(gradeExact('  Hello World ', 'hello world').pass, true)
  assert.equal(gradeExact('foo', 'bar').pass, false)
  assert.equal(gradeExact('ABC', 'abc', { caseSensitive: true }).pass, false)
})

test('number: tolerance + extracts from prose/currency', () => {
  assert.equal(gradeNumber('The total is $1,234.50', 1234.5).pass, true)
  assert.equal(gradeNumber('42', 42).pass, true)
  assert.equal(gradeNumber('3.14159', 3.1416, { abs: 1e-3 }).pass, true)
  assert.equal(gradeNumber('100', 200).pass, false)
  assert.equal(gradeNumber('not a number', 5).pass, false)
})

test('json: order-insensitive deep equal, tolerates fences', () => {
  assert.equal(gradeJson('```json\n{"b":2,"a":1}\n```', { a: 1, b: 2 }).pass, true)
  assert.equal(gradeJson('[1,2,3]', [1, 2, 3]).pass, true)
  assert.equal(gradeJson('{"a":1}', { a: 2 }).pass, false)
  assert.equal(gradeJson('prefix {"x":[1,2]} suffix', { x: [1, 2] }).pass, true)
})

test('table: row-set match, loose cells', () => {
  const truth = '| name | qty |\n| --- | --- |\n| apple | 2 |\n| pear | 5 |'
  const good = '| name | qty |\n|---|---|\n| Pear | 5 |\n| Apple | 2 |'   // reordered + case
  const bad = '| name | qty |\n|---|---|\n| apple | 9 |\n| pear | 5 |'
  assert.equal(gradeTable(good, truth).pass, true)
  assert.equal(gradeTable(bad, truth).pass, false)
})

test('regex: matches pattern', () => {
  assert.equal(gradeRegex('SELECT * FROM users WHERE id = 5', 'select .* from users').pass, true)
  assert.equal(gradeRegex('nope', 'select').pass, false)
})

test('dispatcher routes by task.grader and tags the grader', async () => {
  const r = await grade({ grader: 'number', groundTruth: 10 }, 'the answer is 10')
  assert.equal(r.pass, true)
  assert.equal(r.grader, 'number')
  const u = await grade({ grader: 'nope' }, 'x')
  assert.equal(u.pass, false)
})

test('judge grader uses the injected askJudge and stays auditable', async () => {
  const askJudge = async () => '{"verdict":"correct","reason":"matches reference"}'
  const r = await grade({ grader: 'judge', prompt: 'q', groundTruth: 'a' }, 'a', { askJudge })
  assert.equal(r.pass, true)
  assert.equal(r.aiGraded, true)
})

test('exec(js) grades against the injected runner', async () => {
  const runJs = async (code, ex) => eval(`(${code})`)(...ex.args)   // test-only runner
  const task = { grader: 'exec', exec: { kind: 'js', args: [[1, 2, 3]], expected: 6 } }
  const r = await grade(task, 'function(a){return a.reduce((s,x)=>s+x,0)}', { runJs })
  assert.equal(r.pass, true)
})

test('exec: a never-resolving async candidate times out, does not hang (M1)', async () => {
  const runJs = async () => new Promise(() => {})   // never resolves
  const task = { grader: 'exec', exec: { kind: 'js', timeoutMs: 50, expected: 1 } }
  const r = await grade(task, '()=>{}', { runJs })
  assert.equal(r.pass, false)
  assert.match(r.detail, /timed out/)
})

test('table: duplicate reference rows are not over-counted - no false pass (M3)', () => {
  const truth = '| x |\n|---|\n| a |\n| a |\n| b |'
  const bad = '| x |\n|---|\n| a |\n| b |\n| c |'    // one of the two a-rows replaced by a wrong row
  assert.equal(gradeTable(bad, truth).pass, false)
  const good = '| x |\n|---|\n| a |\n| a |\n| b |'
  assert.equal(gradeTable(good, truth).pass, true)
})
