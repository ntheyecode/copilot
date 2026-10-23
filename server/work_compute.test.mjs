// Tests for the on-device compute engine (server/compute_spec.js). The AI only
// ever emits a spec over a SCHEMA (never the rows); validateSpec gates it to the
// whitelist, runSpec executes it locally. These lock in: correct math, operator
// precedence in derive, group aggregation, output:number, and that unsafe or
// out-of-schema specs are REJECTED (the safety guarantee - no code, no unknown cols).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validateSpec, runSpec, compileExpr } from './compute_spec.js'

const schema = [{ name: 'region', type: 'string' }, { name: 'status', type: 'string' }, { name: 'amount', type: 'number' }]
const rows = [
  { region: 'East', status: 'paid', amount: '1000' },
  { region: 'East', status: 'open', amount: '500' },
  { region: 'West', status: 'paid', amount: '240' },
  { region: 'West', status: 'paid', amount: '2000' },
]

test('validateSpec accepts a clean filter+group+sort spec', () => {
  const spec = { steps: [
    { op: 'filter', where: [{ col: 'status', cmp: 'eq', value: 'paid' }] },
    { op: 'group', by: ['region'], agg: [{ fn: 'sum', col: 'amount', as: 'total' }] },
    { op: 'sort', by: 'total', dir: 'desc' },
  ], output: 'table' }
  assert.equal(validateSpec(spec, schema).ok, true)
})

test('group+sum computes correct per-group totals on paid rows', () => {
  const spec = { steps: [
    { op: 'filter', where: [{ col: 'status', cmp: 'eq', value: 'paid' }] },
    { op: 'group', by: ['region'], agg: [{ fn: 'sum', col: 'amount', as: 'total' }] },
    { op: 'sort', by: 'total', dir: 'desc' },
  ], output: 'table' }
  const r = runSpec(spec, rows)
  assert.deepEqual(r.rows, [{ region: 'West', total: 2240 }, { region: 'East', total: 1000 }])
})

test('output:number returns a single aggregate (grand total of paid)', () => {
  const spec = { steps: [{ op: 'filter', where: [{ col: 'status', cmp: 'eq', value: 'paid' }] }], output: 'number', value: { fn: 'sum', col: 'amount' } }
  assert.equal(validateSpec(spec, schema).ok, true)
  assert.equal(runSpec(spec, rows).value, 3240)
})

test('derive respects arithmetic precedence and parentheses', () => {
  // amount * 0.0825 + 10  vs  amount * (0.0825 + 10)
  const r1 = runSpec({ steps: [{ op: 'derive', as: 'x', expr: 'amount * 0.0825 + 10' }], output: 'table' }, [{ amount: '1000' }])
  assert.equal(Math.round(r1.rows[0].x * 100) / 100, 92.5)
  const r2 = runSpec({ steps: [{ op: 'derive', as: 'x', expr: 'amount * (0.0825 + 10)' }], output: 'table' }, [{ amount: '1000' }])
  assert.equal(Math.round(r2.rows[0].x * 100) / 100, 10082.5)
})

test('derive unary minus and division work', () => {
  const r = runSpec({ steps: [{ op: 'derive', as: 'x', expr: '-amount / 4' }], output: 'table' }, [{ amount: '100' }])
  assert.equal(r.rows[0].x, -25)
})

test('REJECT: a step on a column not in the schema', () => {
  const v = validateSpec({ steps: [{ op: 'filter', where: [{ col: 'ssn', cmp: 'eq', value: 'x' }] }], output: 'table' }, schema)
  assert.equal(v.ok, false)
  assert.ok(v.errors.join(' ').includes('ssn'))
})

test('REJECT: a derive expr with a function call or unknown name (no code execution)', () => {
  assert.equal(validateSpec({ steps: [{ op: 'derive', as: 'x', expr: 'require("fs")' }], output: 'table' }, schema).ok, false)
  assert.equal(validateSpec({ steps: [{ op: 'derive', as: 'x', expr: 'amount.constructor' }], output: 'table' }, schema).ok, false)
  assert.equal(compileExpr('amount; process.exit()'), null)
})

test('REJECT: an unknown operation', () => {
  assert.equal(validateSpec({ steps: [{ op: 'exec', cmd: 'rm' }], output: 'table' }, schema).ok, false)
})

test('a derived column is usable by a later step', () => {
  const spec = { steps: [
    { op: 'derive', as: 'tax', expr: 'amount * 0.0825' },
    { op: 'group', by: ['region'], agg: [{ fn: 'sum', col: 'tax', as: 'taxTotal' }] },
  ], output: 'table' }
  assert.equal(validateSpec(spec, schema).ok, true)
  const r = runSpec(spec, rows)
  const west = r.rows.find((x) => x.region === 'West')
  assert.equal(Math.round(west.taxTotal * 100) / 100, 184.8) // (240+2000+500? no: all west rows) 240+2000 = 2240 *.0825=184.8
})

// workCompute: the AI emits a spec from the schema (never rows); we validate it,
// repair once if needed, and never return an unsafe/invalid spec.
import { workCompute } from './work.js'
const SCHEMA = [{ name: 'region', type: 'string' }, { name: 'amount', type: 'number' }]
const stubAi = (replies) => { let i = 0; return { generate: async () => replies[Math.min(i++, replies.length - 1)] } }

test('workCompute returns a valid spec the first time', async () => {
  const ai = stubAi([JSON.stringify({ steps: [{ op: 'group', by: ['region'], agg: [{ fn: 'sum', col: 'amount', as: 'total' }] }], output: 'table', explanation: 'Sum amount by region.' })])
  const out = await workCompute(ai, {}, { base: 'b', goal: 'totals by region', want: 'sum by region', schema: SCHEMA, rowCount: 10 })
  assert.equal(out.ok, true)
  assert.equal(out.spec.steps[0].op, 'group')
  assert.match(out.explanation, /region/i)
})

test('workCompute repairs an invalid spec, then succeeds', async () => {
  const ai = stubAi([
    JSON.stringify({ steps: [{ op: 'group', by: ['REGION_TYPO'], agg: [{ fn: 'sum', col: 'amount', as: 'total' }] }], output: 'table' }), // bad col
    JSON.stringify({ steps: [{ op: 'group', by: ['region'], agg: [{ fn: 'sum', col: 'amount', as: 'total' }] }], output: 'table' }), // fixed
  ])
  const out = await workCompute(ai, {}, { base: 'b', goal: 'g', want: 'sum by region', schema: SCHEMA, rowCount: 10 })
  assert.equal(out.ok, true)
  assert.equal(out.spec.steps[0].by[0], 'region')
})

test('workCompute never returns an unsafe spec: falls back to a need', async () => {
  const ai = stubAi([JSON.stringify({ steps: [{ op: 'derive', as: 'x', expr: 'process.exit()' }], output: 'table' })])
  const out = await workCompute(ai, {}, { base: 'b', goal: 'g', want: 'x', schema: SCHEMA, rowCount: 10 })
  assert.equal(out.ok, false)
  assert.ok(out.need && out.need.length > 0)
})
