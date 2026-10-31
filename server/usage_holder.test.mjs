// AI usage reached through a company API key is booked to the key's company,
// kind 'api', with the key id recorded. Runs the REAL v1 router (routes_v1.js)
// behind the REAL key gate (api_key_auth.js) inside the REAL usage scope
// middleware, with the brain query stubbed to make one metered provider call.
// Before usage_holder.js the holder read req.workUser only, which a key request
// never has, so this spend landed on no company.
import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import { usageHolderOf } from './usage_holder.js'
import { usageScopeMiddleware, reportUsage } from './ai_usage.js'
import { createAiUsageLedger } from './ai_usage_ledger.js'
import { makeRequireApiKey } from './api_key_auth.js'
import { registerV1Routes } from './routes_v1.js'

const KEY = 'wcp_live_test_key_for_usage'
const limiter = () => ({ take: () => ({ ok: true, limit: 100, remaining: 99, retryAfterSec: 0 }) })

async function boot() {
  const data = {}
  const ledger = createAiUsageLedger({ db: () => data, persistSoon: () => {} })
  const app = express()
  app.use(express.json())
  // Exactly how index.js books what no meter drained.
  app.use('/api', usageScopeMiddleware((req, entries) => {
    const h = usageHolderOf(req)
    ledger.recordAiUsage({ companyId: h.companyId, userId: h.userId, kind: h.kind || 'other', apiKeyId: h.apiKeyId, entries })
  }))
  const requireApiKey = makeRequireApiKey({
    resolve: (raw) => (raw === KEY
      ? { ok: true, principal: { keyId: 'key_123', companyId: 'co_acme', scopes: ['brain:query'] } }
      : { ok: false, status: 401, code: 'INVALID_KEY', error: 'bad key' }),
    keyLimiter: limiter(), ipLimiter: limiter(), ipOf: () => '127.0.0.1',
  })
  // The stub stands in for the embedder/AI behind the brain query: one metered call.
  const queryBrain = async (companyId, { q }) => {
    reportUsage({ provider: 'openai', model: 'gpt-4o-mini', usage: { inTokens: 1000, outTokens: 10 }, call: 'chat' })
    return { companyId, q, results: [] }
  }
  class BrainQueryError extends Error {}
  registerV1Routes(app, { store: {}, requireApiKey, queryBrain, BrainQueryError, publicBase: 'http://localhost' })
  const srv = await new Promise((r) => { const s = app.listen(0, '127.0.0.1', () => r(s)) })
  return { ledger, srv, base: `http://127.0.0.1:${srv.address().port}` }
}

test('a metered AI call on /api/v1 is booked to the key company, kind api, with the key id', async () => {
  const { ledger, srv, base } = await boot()
  try {
    const r = await fetch(`${base}/api/v1/brain/query`, { method: 'POST', headers: { authorization: `Bearer ${KEY}`, 'content-type': 'application/json' }, body: JSON.stringify({ q: 'refund policy' }) })
    assert.equal(r.status, 200)
    assert.equal((await r.json()).companyId, 'co_acme')
    // The scope flushes on 'finish'; give the event loop a turn.
    await new Promise((res) => setImmediate(res))
    const rows = ledger.listAiUsage({ companyId: 'co_acme' })
    assert.equal(rows.length, 1)
    assert.equal(rows[0].calls, 1)
    assert.deepEqual(Object.keys(rows[0].byKind), ['api'])
    assert.deepEqual(rows[0].byApiKey, { key_123: { calls: 1, usd: rows[0].byApiKey.key_123.usd } })
    assert.ok(rows[0].byApiKey.key_123.usd > 0)
    // Nothing went to the platform or to a person.
    assert.equal(ledger.listAiUsage().filter((x) => x.holder !== 'c:co_acme').length, 0)
  } finally { srv.close() }
})

test('holder rules: person, support view, API key, nobody', () => {
  assert.deepEqual(usageHolderOf({ workUser: { id: 'u1', companyId: 'c1' } }), { companyId: 'c1', userId: 'u1', kind: null, apiKeyId: null })
  assert.deepEqual(usageHolderOf({ impersonating: true, workUser: { id: 'u1', companyId: 'c1' } }), { companyId: null, userId: null, kind: 'support', apiKeyId: null })
  assert.deepEqual(usageHolderOf({ apiPrincipal: { kind: 'api_key', keyId: 'k', companyId: 'c2' } }), { companyId: 'c2', userId: null, kind: 'api', apiKeyId: 'k' })
  assert.deepEqual(usageHolderOf({}), { companyId: null, userId: null, kind: null, apiKeyId: null })
  assert.deepEqual(usageHolderOf(null), { companyId: null, userId: null, kind: null, apiKeyId: null })
})
