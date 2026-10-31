// The destructive-command warning is sent as a stable reason CODE (plus the
// flagged part of the command), never as an English sentence, and every code is
// worded in every locale. Before destructive_rules.js the server sent
// destructiveWhy ('permanently deletes files and cannot be undone') and every
// language showed that English inside its own sentence.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { DESTRUCTIVE_RULES, DESTRUCTIVE_CODES, classifyDestructive, destructiveReasonOf, destructiveEnglish, withDestructive } from './destructive_rules.js'
import { workPlan } from './work.js'
import enPartial from '../src/i18n/locales/en/destructiveGate.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const LOCALE_DIR = path.join(ROOT, 'src', 'i18n', 'locales')

test('a destructive command yields a code and the flagged part, no English sentence', () => {
  const r = classifyDestructive(['sudo rm -rf /var/www/old'], null)
  assert.equal(r.destructive, true)
  assert.equal(r.code, 'deleteFiles')
  assert.equal(r.params.match, 'rm -rf')
  assert.equal(classifyDestructive([], { content: 'DROP DATABASE prod;' }).code, 'dropDbObject')
  assert.equal(classifyDestructive(['ls -la'], null).destructive, false)
})

test('every code is unique and has a sentence in English and in every locale', async () => {
  assert.equal(new Set(DESTRUCTIVE_CODES).size, DESTRUCTIVE_CODES.length)
  const en = enPartial.destructiveGate
  for (const c of DESTRUCTIVE_CODES) assert.ok(typeof en.reason[c] === 'string' && en.reason[c].trim(), `en: ${c}`)
  assert.equal(en.body, undefined, 'the old English {why} sentence is gone')
  const files = fs.readdirSync(LOCALE_DIR).filter((f) => f.endsWith('.js') && f !== 'en.js' && f !== 'en-GB.js')
  assert.ok(files.length >= 14, files.join(','))
  for (const f of files) {
    const mod = (await import(new URL(`file:///${path.join(LOCALE_DIR, f).replace(/\\/g, '/')}`).href)).default
    const g = mod && mod.destructiveGate
    assert.ok(g, `${f}: destructiveGate`)
    assert.equal(g.body, undefined, `${f}: old body key removed`)
    for (const k of ['label', 'reveal', 'check', 'flagged']) assert.ok(String(g[k] || '').trim(), `${f}: ${k}`)
    for (const c of DESTRUCTIVE_CODES) {
      const s = g.reason && g.reason[c]
      assert.ok(typeof s === 'string' && s.trim(), `${f}: reason.${c}`)
      assert.notEqual(s, en.reason[c], `${f}: reason.${c} is still English`)
      assert.doesNotMatch(s, /—/, `${f}: no em dash`)
    }
  }
})

test('a planned step carries destructiveReason { code, params } and no English why', async () => {
  const ai = { async generate() { return JSON.stringify({ steps: [
    { text: 'Clean the build folder', commands: ['rm -rf ./build'] },
    { text: 'List the files', commands: ['ls'] },
  ] }) } }
  const plan = await workPlan(ai, {}, { base: 'BASE', goal: 'clean up the build' })
  const [a, b] = plan.steps
  assert.equal(a.destructive, true)
  assert.deepEqual(a.destructiveReason, { code: 'deleteFiles', params: { match: 'rm -rf' } })
  assert.equal(a.destructiveWhy, undefined)
  assert.equal(b.destructive, false)
  assert.equal(b.destructiveReason, null)
})

test('a stored step keeps its reason, derived from its own commands (never trusted from the caller)', () => {
  const s = withDestructive({ text: 'x', commands: ['git push --force origin main'], destructive: false })
  assert.deepEqual([s.destructive, s.destructiveReason.code], [true, 'rewriteGitHistory'])
  const forged = withDestructive({ text: 'y', commands: ['echo hi'], destructive: true, destructiveReason: { code: 'shutdown' } })
  assert.equal(forged.destructive, undefined)
  assert.equal(forged.destructiveReason, undefined)
})

test('sessions saved before codes existed (English phrase only) still map to a code', () => {
  for (const r of DESTRUCTIVE_RULES) {
    assert.deepEqual(destructiveReasonOf({ destructive: true, destructiveWhy: r.en }), { code: r.code, params: {} })
  }
  assert.deepEqual(destructiveReasonOf({ destructive: true, destructiveWhy: 'something new' }), { code: 'unknown', params: {} })
  assert.deepEqual(destructiveReasonOf({ destructive: true, destructiveReason: { code: 'nope' } }), { code: 'unknown', params: {} })
  assert.equal(destructiveReasonOf({ destructive: false }), null)
  assert.equal(destructiveEnglish({ destructive: true, destructiveReason: { code: 'emptyTable', params: {} } }), 'empties a table')
})
