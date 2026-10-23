// Regression tests for the Result channel honesty guard (work.js shapeResult).
// The Result channel RETURNS the actual answer (number/table/text/code/analysis)
// instead of only instructing. These lock in the SUPREME RULE III/IV guarantees:
// a result is only "grounded" with a traceable basis + a verify step; a naked
// answer is demoted and flagged; missing data returns a "need", never a guess;
// a screen-read figure is caveated; and a code/number body is never prose-scrubbed.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { shapeResult } from './work.js'

const reply = (o) => JSON.stringify(o)

test('a grounded number (basis + verify) passes clean at full confidence', () => {
  const r = shapeResult(reply({ kind: 'number', body: '$42,310.00', basis: 'Sum of column D rows 2-50, values from the pasted ledger', verifyBy: 'Select D2:D50 in Excel and read the status-bar sum', confidence: 0.9 }))
  assert.equal(r.grounded, true)
  assert.equal(r.confidence, 0.9)
  assert.equal(r.caveat, '')
})

test('a naked answer with no basis is demoted and flagged unverified', () => {
  const r = shapeResult(reply({ kind: 'number', body: '1234.5', confidence: 0.95 }))
  assert.equal(r.grounded, false)
  assert.ok(r.confidence <= 0.35)
  assert.match(r.caveat, /unverified/i)
})

test('missing data returns a need, never a fabricated number', () => {
  const r = shapeResult(reply({ kind: 'number', body: 'I cannot reconcile without the ledger.', need: 'the general ledger CSV or XLSX', confidence: 0.2 }))
  assert.equal(r.need, 'the general ledger CSV or XLSX')
  assert.equal(r.grounded, false)
  assert.match(r.caveat, /needs an input/i)
})

test('a figure read off the screen is caveated to confirm against the source', () => {
  const r = shapeResult(reply({ kind: 'number', body: '87%', basis: 'Read the progress value top-right of the screenshot', verifyBy: 'Confirm against the dashboard', confidence: 0.8 }), { fromScreen: true })
  assert.equal(r.grounded, true)
  assert.match(r.caveat, /read from your screen/i)
})

test('a code or number body is kept EXACT (never prose-scrubbed)', () => {
  const sql = 'SELECT id, SUM(amount) FROM orders GROUP BY id;'
  const r = shapeResult(reply({ kind: 'code', body: sql, basis: 'Aggregate per the request', verifyBy: 'Run against a read replica', confidence: 0.85 }))
  assert.equal(r.body, sql)
})

test('an unparseable reply degrades safely to an unverified analysis', () => {
  const r = shapeResult('not json at all')
  assert.equal(r.kind, 'analysis')
  assert.equal(r.grounded, false)
  assert.ok(r.confidence <= 0.35)
})
