import test from 'node:test'
import assert from 'node:assert/strict'
import { untranslatedKeys, values } from './check-untranslated.mjs'

const en = { site: { title: 'Talk to our sales team', brand: 'WorkCoPilot', list: ['Penetration testing', 'Help desk'], n: 'OK', mail: 'you@example.com' }, admin: { x: 'Left as English here' } }
const ns = new Set(['site'])

test('a copied English value is caught; names, short tokens and other namespaces are not', () => {
  const loc = { site: { title: 'Talk to our sales team', brand: 'WorkCoPilot', list: ['Test di penetrazione', 'Help desk'], n: 'OK', mail: 'you@example.com' }, admin: { x: 'Left as English here' } }
  assert.deepEqual(untranslatedKeys(en, loc, { code: 'it', namespaces: ns }), ['site.title', 'site.list.1'])
  assert.equal(values(en).get('site.list.0'), 'Penetration testing', 'walks values, not types')
})

test('a kept value needs its locale on the allowlist', () => {
  const loc = { site: { title: 'Parla con noi', list: ['x', 'Help desk'] } }
  const allow = { 'site.list.1': { locales: ['pt-BR'], why: 'loanword' } }
  assert.deepEqual(untranslatedKeys(en, loc, { code: 'it', namespaces: ns, allow }), ['site.list.1'])
  assert.deepEqual(untranslatedKeys(en, loc, { code: 'pt-BR', namespaces: ns, allow }), [])
})
