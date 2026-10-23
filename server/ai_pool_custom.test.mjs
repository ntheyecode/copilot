// Multi-key POOL (round-robin) + CUSTOM OpenAI-compatible providers.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const storePath = 'file://' + path.join(here, 'store.js').replace(/\\/g, '/')
process.env.WORK_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'wc-pool-'))
process.env.PORT = '0'
const store = await import(storePath)

test('a provider holds a POOL of keys and getProviderRuntime round-robins them', () => {
  store.setAiProviderKey('openrouter', { apiKey: 'sk-or-KEY-A1111' })
  store.addProviderKey('openrouter', 'sk-or-KEY-B2222')
  store.addProviderKey('openrouter', 'sk-or-KEY-C3333')
  const list = store.adminAiProviders().find((p) => p.id === 'openrouter')
  assert.equal(list.keyCount, 3)
  assert.equal(list.keysMasked.length, 3)
  assert.ok(list.keysMasked.every((m) => /^•+\d{4}$/.test(m)), 'each key masked to a tail')
  // round-robin: consecutive runtimes cycle through the pool
  const picks = [0, 1, 2, 3, 4, 5].map(() => store.getProviderRuntime('openrouter').apiKey)
  const distinct = new Set(picks)
  assert.equal(distinct.size, 3, 'all three keys are handed out')
  assert.deepEqual(picks[0], picks[3], 'cycle repeats after 3')
})

test('adding a duplicate key does not grow the pool', () => {
  store.addProviderKey('openrouter', 'sk-or-KEY-A1111')
  assert.equal(store.adminAiProviders().find((p) => p.id === 'openrouter').keyCount, 3)
})

test('removeProviderKey drops one key; removing the last clears the provider', () => {
  store.removeProviderKey('openrouter', 0)
  assert.equal(store.adminAiProviders().find((p) => p.id === 'openrouter').keyCount, 2)
  store.removeProviderKey('openrouter', 0)
  store.removeProviderKey('openrouter', 0)
  assert.equal(store.adminAiProviders().find((p) => p.id === 'openrouter').configured, false)
})

test('setAiProviderKey with a single key REPLACES the pool', () => {
  store.setAiProviderKey('gemini', { apiKeys: ['g-1111', 'g-2222'] })
  assert.equal(store.adminAiProviders().find((p) => p.id === 'gemini').keyCount, 2)
  store.setAiProviderKey('gemini', { apiKey: 'g-only-9999' })
  const g = store.adminAiProviders().find((p) => p.id === 'gemini')
  assert.equal(g.keyCount, 1)
  assert.ok(g.keyMasked.endsWith('9999'))
})

test('a CUSTOM provider can be added (public https) and shows up in the list', () => {
  store.setCustomProvider({ id: 'together', label: 'Together AI', base: 'https://api.together.xyz/v1', chatModels: 'meta-llama/Llama-3.3-70B', apiKey: 'tog-abcd1234' })
  const t = store.adminAiProviders().find((p) => p.id === 'together')
  assert.ok(t, 'custom provider listed')
  assert.equal(t.custom, true)
  assert.equal(t.base, 'https://api.together.xyz/v1')
  assert.equal(t.configured, true)
  // a custom provider builds a runtime that carries its own definition
  const rt = store.getProviderRuntime('together')
  assert.equal(rt.provider.base, 'https://api.together.xyz/v1')
  assert.equal(rt.provider.kind, 'openai')
})

test('a custom base that is NOT a public https host is rejected (SSRF guard)', () => {
  assert.throws(() => store.setCustomProvider({ id: 'bad1', base: 'http://api.example.com/v1', chatModels: 'm', apiKey: 'k' }), /https/i)
  assert.throws(() => store.setCustomProvider({ id: 'bad2', base: 'https://127.0.0.1/v1', chatModels: 'm', apiKey: 'k' }), /IP|domain/i)
  assert.throws(() => store.setCustomProvider({ id: 'bad3', base: 'https://localhost/v1', chatModels: 'm', apiKey: 'k' }), /allowed|public/i)
  assert.throws(() => store.setCustomProvider({ id: 'bad4', base: 'https://metadata.google.internal/v1', chatModels: 'm', apiKey: 'k' }), /allowed|public/i)
  // none of the bad ones were saved
  const ids = store.adminAiProviders().map((p) => p.id)
  assert.ok(!ids.includes('bad1') && !ids.includes('bad2') && !ids.includes('bad3') && !ids.includes('bad4'))
})

test('cannot shadow a built-in provider id with a custom one', () => {
  assert.throws(() => store.setCustomProvider({ id: 'openai', base: 'https://api.example.com/v1', chatModels: 'm', apiKey: 'k' }), /built-in/i)
})

test('removeCustomProvider deletes the definition and its keys', () => {
  store.removeCustomProvider('together')
  assert.ok(!store.adminAiProviders().some((p) => p.id === 'together'))
  assert.equal(store.getProviderRuntime('together'), null)
})
