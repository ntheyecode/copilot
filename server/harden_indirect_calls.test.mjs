// IP-hardening pre-pass (scripts/harden-indirect-calls.mjs, wired into the
// ipHardenPlugin in vite.config.js). Rolldown calls CommonJS exports as
// `(0, ns.fn)()`; the obfuscator's numbersToExpressions would inflate each 0.
// The pre-pass swaps that 0 for null: the call stays indirect (`this` stays
// undefined), only real call-site operands change, and look-alike text inside
// strings, templates, regexes and comments is never touched. The plugin must
// also run AFTER Vite's own generateBundle hooks, or hardened builds lose the
// lazy-chunk preload lists (see the comment on the hook in vite.config.js).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { nullIndirectCallZeros } from '../scripts/harden-indirect-calls.mjs'

// The parser and the obfuscator are build devDependencies. Without them (an
// install with --omit=dev) these tests are reported as skipped, with the reason.
let parseAst = null
let JavaScriptObfuscator = null
let missing = ''
try {
  ;({ parseAst } = await import('vite'))
  JavaScriptObfuscator = (await import('javascript-obfuscator')).default
} catch (e) { missing = `build devDependencies not installed (${(e && e.code) || (e && e.message) || e})` }
const needsDeps = missing ? { skip: missing } : {}

// Runs a snippet as strict code (like an ES module chunk) and returns __r.
const run = (code) => new Function(`"use strict";${code};return __r;`)()

test('indirect-call zeros become null and the calls behave exactly the same', needsDeps, () => {
  const src = 'var ns={f(){return this===undefined?"undef":"bound"},g(a){return a+1}};var __r=[(0,ns.f)(),(0,ns.g)(41),ns.f(),(0,ns.f)?.()];'
  const out = nullIndirectCallZeros(src, parseAst)
  assert.equal(out.count, 3)
  assert.equal(out.code, src.replace('(0,ns.f)()', '(null,ns.f)()').replace('(0,ns.g)(41)', '(null,ns.g)(41)').replace('(0,ns.f)?.()', '(null,ns.f)?.()'))
  assert.deepEqual(run(out.code), ['undef', 42, 'bound', 'undef'])
  assert.deepEqual(run(out.code), run(src))
})

test('look-alike text and non-call sequences are left untouched', needsDeps, () => {
  const samples = [
    'var s="(0,a.b)(1)";',
    'var t=`(0,a.b)(1) ${1}`;',
    String.raw`var r=/\(0,a\.b\)\(/;`,
    '// (0,a.b)(1)\nvar c=1;',
    'var a={b:1};var u=(0,a.b);',
    'function f(){}f(0,a);',
    'var w=(1,a.b)();',
    'var x=(0.0,a.b)();',
    'var n=new (0,a.B)();',
    'var g=(0,a.b)`x`;',
  ]
  for (const src of samples) {
    const out = nullIndirectCallZeros(src, parseAst)
    assert.equal(out.count, 0, src)
    assert.equal(out.code, src)
  }
})

test('offsets stay aligned after non-ASCII text', needsDeps, () => {
  const src = 'var s="∞ é 😀";var o={f(){return 7}};var __r=[s.length>0&&(0,o.f)()];'
  const out = nullIndirectCallZeros(src, parseAst)
  assert.equal(out.count, 1)
  assert.ok(out.code.includes('(null,o.f)()'))
  assert.deepEqual(run(out.code), [7])
})

test('a parser that keeps parentheses still gets the rewrite', () => {
  // Shape of `(0,o.f)()` from a parser with preserveParens: the callee is a
  // ParenthesizedExpression wrapping the SequenceExpression.
  const src = '(0,o.f)();'
  const zero = { type: 'Literal', value: 0, start: 1, end: 2 }
  const seq = { type: 'SequenceExpression', start: 1, end: 6, expressions: [zero, { type: 'MemberExpression', start: 3, end: 6 }] }
  const call = { type: 'CallExpression', start: 0, end: 9, callee: { type: 'ParenthesizedExpression', start: 0, end: 7, expression: seq }, arguments: [] }
  const ast = { type: 'Program', start: 0, end: src.length, body: [{ type: 'ExpressionStatement', start: 0, end: 10, expression: call }] }
  const out = nullIndirectCallZeros(src, () => ast)
  assert.equal(out.count, 1)
  assert.equal(out.code, '(null,o.f)();')
})

test('refuses (returns the input unchanged, with a reason) when it cannot parse safely', () => {
  const src = 'var o={f(){}};(0,o.f)();'
  const offsets = nullIndirectCallZeros(src, () => ({ type: 'Program', end: src.length + 5, body: [] }))
  assert.equal(offsets.code, src)
  assert.equal(offsets.count, 0)
  assert.match(offsets.skipped, /offsets/)
  const thrown = nullIndirectCallZeros(src, () => { throw new SyntaxError('boom') })
  assert.equal(thrown.code, src)
  assert.equal(thrown.count, 0)
  assert.match(thrown.skipped, /parse failed: boom/)
})

test('obfuscated with numbersToExpressions, the pre-passed code is smaller and keeps `this` undefined', needsDeps, () => {
  const opts = { target: 'browser', compact: true, seed: 1, identifierNamesGenerator: 'hexadecimal', renameGlobals: false, stringArray: true, stringArrayThreshold: 0.75, numbersToExpressions: true, simplify: true }
  const src = `var ns={f(a){return [a,this===undefined]}};var __r=[${Array.from({ length: 50 }, (_, i) => `(0,ns.f)(${i})`).join(',')}];`
  const expected = run(src)
  assert.ok(expected.every(([, undef]) => undef === true))
  const plain = JavaScriptObfuscator.obfuscate(src, opts).getObfuscatedCode()
  const pre = JavaScriptObfuscator.obfuscate(nullIndirectCallZeros(src, parseAst).code, opts).getObfuscatedCode()
  assert.ok(pre.length < plain.length, `pre-pass ${pre.length} bytes vs ${plain.length}`)
  assert.deepEqual(run(pre), expected)
  assert.deepEqual(run(plain), expected)
})

test('the hardening plugin runs last and obfuscates the pre-passed code (wiring gate)', () => {
  const cfg = fs.readFileSync(new URL('../vite.config.js', import.meta.url), 'utf8')
  assert.match(cfg, /import \{ nullIndirectCallZeros \} from '\.\/scripts\/harden-indirect-calls\.mjs'/)
  assert.match(cfg, /generateBundle:\s*\{\s*order:\s*'post',\s*async handler\(/)
  assert.match(cfg, /nullIndirectCallZeros\(file\.code,/)
  assert.match(cfg, /obfuscator\.obfuscate\(pre\.code,/)
})
