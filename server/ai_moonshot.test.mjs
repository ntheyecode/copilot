// Moonshot AI (Kimi) - OPTIONAL, operator-selectable OpenAI-compatible provider.
// These lock in SUPREME RULE II (single source of truth): moonshot is a known
// built-in provider, BOTH its region hosts (.ai + .cn) are on the egress
// allowlist, it is NEVER auto-selected or in any default path (it only runs when
// a superadmin configures a key and activates it), and a chat routes to the
// Moonshot base URL. fetch is stubbed per-URL; no real key is needed.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'
import { PROVIDERS, catalog, chat } from './ai.js'

const here = path.dirname(fileURLToPath(import.meta.url))
const storePath = 'file://' + path.join(here, 'store.js').replace(/\\/g, '/')
process.env.WORK_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'wc-moonshot-'))
process.env.PORT = '0'
const store = await import(storePath)

test('moonshot is a known built-in provider, OpenAI-compatible, defaulting to the .ai base', () => {
  const p = PROVIDERS.moonshot
  assert.ok(p, 'moonshot is registered in PROVIDERS')
  assert.equal(p.id, 'moonshot')
  assert.equal(p.kind, 'openai', 'reuses the OpenAI-compatible call path')
  assert.equal(p.base, 'https://api.moonshot.ai/v1', 'international region is the default base')
  assert.ok(Array.isArray(p.chatModels) && p.chatModels.length, 'carries a configurable model list like the other providers')
  // The client-safe catalog (served to the admin AI-config UI) includes it, so
  // the data-driven provider tiles render it with no UI change.
  assert.ok(catalog().some((c) => c.id === 'moonshot'), 'moonshot appears in the client catalog')
})

test('moonshot declares the China-region host as an altHost', () => {
  assert.ok(Array.isArray(PROVIDERS.moonshot.altHosts) && PROVIDERS.moonshot.altHosts.includes('api.moonshot.cn'),
    'the .cn region host is declared on the provider def, so the allowlist derivation picks it up')
})

test('the China-region base (.cn) is on the egress allowlist by PROVIDERS derivation', async () => {
  // Route a chat at the .cn base via a runtime that carries its own def (same
  // shape store.js builds for a region/custom runtime). We never call allowAiHost
  // here, so a successful call PROVES assertAllowedHost found .cn already on the
  // allowlist - i.e. the PROVIDERS altHosts derivation added it. If it were not
  // allowlisted, openaiChat would throw a 502 "host is not on the allowlist".
  const realFetch = global.fetch
  let hitUrl = null
  global.fetch = async (url) => { hitUrl = String(url); return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: 'OK cn' } }] }) } }
  try {
    const cfg = {
      providerId: 'moonshot', apiKey: 'sk-moonshot-TESTKEY', chatModel: 'kimi-k2-0905-preview', alternates: [],
      provider: { id: 'moonshot', label: 'Moonshot AI (Kimi)', base: 'https://api.moonshot.cn/v1', kind: 'openai', chatModels: ['kimi-k2-0905-preview'] },
    }
    const out = await chat(cfg, 'sys', [{ role: 'user', content: 'hi' }])
    assert.match(out, /OK cn/)
    assert.equal(hitUrl, 'https://api.moonshot.cn/v1/chat/completions', 'request reached the .cn region host, not blocked by the egress guard')
  } finally { global.fetch = realFetch }
})

test('moonshot is NOT a default / auto-selected provider (optional only)', () => {
  // Fresh store: nothing configured -> no active provider, moonshot not active.
  const list = store.adminAiProviders().find((p) => p.id === 'moonshot')
  assert.ok(list, 'moonshot is listed as an available provider')
  assert.equal(list.configured, false, 'no key by default')
  assert.equal(list.active, false, 'never active until a superadmin selects it')
  assert.equal(store.getActiveProviderId(), null, 'no provider is active by default')
  assert.equal(store.getActiveRuntime(), null, 'no default platform runtime')
  // It only activates after a superadmin provisions a key AND makes it primary.
  store.setAiProviderKey('moonshot', { apiKey: 'sk-moonshot-TESTKEY' })
  // Saving the FIRST provider key makes it active (same rule as every provider),
  // but that is an explicit superadmin action - not a silent/auto default.
  assert.equal(store.getActiveProviderId(), 'moonshot')
  store.removeProviderKey('moonshot', 0)
  assert.equal(store.getActiveProviderId(), null, 'clearing the key removes it from the active path')
})

test('a Moonshot chat routes to the Moonshot base URL (OpenAI-compatible path)', async () => {
  const realFetch = global.fetch
  let hitUrl = null
  global.fetch = async (url, opts) => {
    hitUrl = String(url)
    return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: 'OK kimi' } }] }) }
  }
  try {
    const cfg = { providerId: 'moonshot', apiKey: 'sk-moonshot-TESTKEY', chatModel: 'kimi-k2-0905-preview', alternates: [] }
    const out = await chat(cfg, 'sys', [{ role: 'user', content: 'hi' }])
    assert.match(out, /OK kimi/)
    assert.equal(hitUrl, 'https://api.moonshot.ai/v1/chat/completions', 'request hit the Moonshot .ai base')
  } finally { global.fetch = realFetch }
})
