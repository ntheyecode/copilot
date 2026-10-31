import test from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import {
  usageFromResponse, costOfEntry, costForCall, createUsageScope, runInUsageScope, reportUsage, drainUsage, summarizeUsage,
  withKeySource, usageScopeMiddleware, runInBackgroundUsage, setUsageSink,
} from './ai_usage.js'
import { analyseImages, generate } from './ai.js'
import { createAiUsageLedger, monthKey } from './ai_usage_ledger.js'

test('provider usage blocks normalize: OpenAI-compatible, Gemini (thinking billed as output), transcription', () => {
  assert.deepEqual(usageFromResponse('openai', { usage: { prompt_tokens: 1200, completion_tokens: 80, prompt_tokens_details: { cached_tokens: 200 } } }),
    { inTokens: 1200, outTokens: 80, cachedTokens: 200 })
  assert.deepEqual(usageFromResponse('gemini', { usageMetadata: { promptTokenCount: 900, candidatesTokenCount: 40, thoughtsTokenCount: 10, cachedContentTokenCount: 0 } }),
    { inTokens: 900, outTokens: 50, cachedTokens: 0 })
  assert.deepEqual(usageFromResponse('openai', { usage: { type: 'duration', seconds: 7.5 } }), { audioSeconds: 7.5 })
  assert.deepEqual(usageFromResponse('openai', { usage: { input_tokens: 30, output_tokens: 12 } }), { inTokens: 30, outTokens: 12, cachedTokens: 0 })
  assert.deepEqual(usageFromResponse('openai', { text: 'hi', duration: 3.2 }), { audioSeconds: 3.2 })
  assert.equal(usageFromResponse('openai', { choices: [] }), null)
  assert.equal(usageFromResponse('gemini', {}), null)
})

test('pricing: tokens at list price, Groq audio has a 10 s minimum, unknown models are flagged unpriced', () => {
  const c = costOfEntry({ provider: 'openai', model: 'gpt-4o-mini', inTokens: 1_000_000, outTokens: 1_000_000 })
  assert.equal(Number(c.usd.toFixed(4)), 0.75)
  assert.equal(c.priced, true)
  const groq = costOfEntry({ provider: 'groq', model: 'whisper-large-v3-turbo', audioSeconds: 2 })
  assert.equal(Number(groq.usd.toFixed(8)), Number(((10 / 60) * (0.04 / 60)).toFixed(8)))
  assert.deepEqual(costOfEntry({ provider: 'x', model: 'mystery-model', inTokens: 10 }), { usd: 0, priced: false })
})

test('scope: nothing is recorded outside a request; inside, the meter drains what each call reported', async () => {
  assert.equal(reportUsage({ provider: 'openai', model: 'gpt-4o-mini', usage: { inTokens: 1 } }), null)
  const scope = createUsageScope()
  await runInUsageScope(scope, async () => {
    await Promise.resolve()
    reportUsage({ provider: 'openai', model: 'gpt-4o-mini', usage: { inTokens: 100, outTokens: 10 } })
    reportUsage({ provider: 'openai', model: 'gpt-4o-mini', usage: null })
    const got = drainUsage()
    assert.equal(got.length, 2)
    assert.deepEqual(got.map((e) => e.actual), [true, false])
    assert.equal(drainUsage().length, 0)
  })
})

test('a call that lands after the response was sent goes straight to the ledger', async () => {
  const late = []
  const scope = createUsageScope()
  scope.onLate = (es) => late.push(...es)
  scope.flushed = true
  await runInUsageScope(scope, async () => { reportUsage({ provider: 'gemini', model: 'gemini-3.5-flash', usage: { inTokens: 5, outTokens: 1 } }) })
  assert.equal(late.length, 1)
  assert.equal(scope.entries.length, 0)
})

test('per-call cost: actuals when reported, the estimate only for calls that reported nothing', () => {
  const A = { provider: 'openai', model: 'gpt-4o-mini', actual: true, inTokens: 1_000_000, outTokens: 0 }
  let estimated = 0
  const est = () => { estimated++; return 1 }
  assert.deepEqual(costForCall([A], est), { usd: 0.15, estimatedUsd: 0, estimateKeySource: 'unknown' })
  assert.equal(estimated, 0)                                       // never estimated when actuals exist
  assert.deepEqual(costForCall([], est), { usd: 1, estimatedUsd: 1, estimateKeySource: 'unknown' })
  // regression: one usage-less call among two estimates only its share, not the whole operation
  const mixed = costForCall([A, { provider: 'openai', model: 'gpt-4o-mini', actual: false, keySource: 'company' }], est)
  assert.deepEqual(mixed, { usd: 0.65, estimatedUsd: 0.5, estimateKeySource: 'company' })
})

test('summaries keep actual, estimated and unpriced calls apart', () => {
  const s = summarizeUsage([
    { provider: 'openai', model: 'gpt-4o-mini', actual: true, inTokens: 10, outTokens: 2 },
    { provider: 'openai', model: 'gpt-4o-mini', actual: false },
    { provider: 'x', model: 'mystery', actual: true, inTokens: 5 },
  ])
  assert.deepEqual([s.calls, s.actualCalls, s.estimatedCalls, s.unpricedCalls, s.inTokens, s.outTokens], [3, 2, 1, 1, 15, 2])
})

// End to end through the real provider code path with a stubbed network.
function stubFetch(body) {
  const real = globalThis.fetch
  globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => body })
  return () => { globalThis.fetch = real }
}

test('regression: a real vision call reports the provider usage (image tokens included), not a char estimate', async () => {
  const restore = stubFetch({ choices: [{ message: { content: '{"ok":true}' } }], usage: { prompt_tokens: 2850, completion_tokens: 40 } })
  try {
    const scope = createUsageScope()
    await runInUsageScope(scope, async () => {
      const out = await analyseImages({ providerId: 'openai', apiKey: 'k' }, 'read', ['data:image/jpeg;base64,AA'], 'gpt-4o-mini')
      assert.equal(out, '{"ok":true}')
      const [e] = drainUsage()
      assert.deepEqual([e.provider, e.model, e.call, e.actual, e.inTokens, e.outTokens], ['openai', 'gpt-4o-mini', 'vision', true, 2850, 40])
    })
  } finally { restore() }
})

test('a Gemini chat call reports usageMetadata', async () => {
  const restore = stubFetch({ candidates: [{ content: { parts: [{ text: 'plan' }] } }], usageMetadata: { promptTokenCount: 400, candidatesTokenCount: 30 } })
  try {
    const scope = createUsageScope()
    await runInUsageScope(scope, async () => {
      await generate({ providerId: 'gemini', apiKey: 'k', chatModel: 'gemini-3.5-flash' }, 'sys', 'goal')
      const [e] = drainUsage()
      assert.deepEqual([e.provider, e.call, e.inTokens, e.outTokens], ['gemini', 'chat', 400, 30])
    })
  } finally { restore() }
})

test('ledger: one monthly record per company with the actual / estimated split; solo accounts kept apart', () => {
  const db = {}
  let saves = 0
  const ledger = createAiUsageLedger({ db: () => db, persistSoon: () => { saves++ }, now: () => new Date(Date.UTC(2026, 9, 30)) })
  const A = { provider: 'openai', model: 'gpt-4o-mini', actual: true, inTokens: 1_000_000, outTokens: 0, call: 'vision', keySource: 'platform' }
  ledger.recordAiUsage({ companyId: 'c1', userId: 'u1', kind: 'guide', entries: [A] })
  ledger.recordAiUsage({ companyId: 'c1', userId: 'u2', kind: 'plan', entries: [], estimatedUsd: 0.05, estimateKeySource: 'company' })
  ledger.recordAiUsage({ userId: 'solo', kind: 'guide', entries: [A] })
  assert.equal(ledger.recordAiUsage({ companyId: 'c1', entries: [] }), null)
  const month = ledger.listAiUsage({ month: '2026-10' })
  assert.equal(month.length, 2)
  const c1 = month.find((r) => r.companyId === 'c1')
  // regression: an estimate-only call counts as a call, so the measured share is honest
  assert.deepEqual([c1.calls, c1.actualCalls, c1.estimatedCalls, c1.actualUsd, c1.estimatedUsd, c1.totalUsd, c1.actualShare], [2, 1, 1, 0.15, 0.05, 0.2, 0.5])
  // regression: only spend on OUR keys is billable; the company's own key spend is shown, not billed
  assert.equal(c1.billableUsd, 0.15)
  assert.deepEqual(c1.byKeySource, { platform: { calls: 1, actualUsd: 0.15, estimatedUsd: 0 }, company: { calls: 1, actualUsd: 0, estimatedUsd: 0.05 } })
  assert.deepEqual(Object.keys(c1.byKind).sort(), ['guide', 'plan'])
  assert.equal(ledger.listAiUsage({ companyId: 'c1' })[0].month, '2026-10')
  assert.equal(monthKey(new Date(Date.UTC(2026, 0, 5))), '2026-01')
  assert.ok(saves >= 3)
})

test('regression: transcription and image calls use their own prices, never the text rate; unknown ones are unpriced', () => {
  const mini = costOfEntry({ provider: 'openai', model: 'gpt-4o-mini-transcribe', call: 'transcribe', inTokens: 1_000_000, outTokens: 0 })
  assert.deepEqual(mini, { usd: 1.25, priced: true })   // OpenAI list price as of 2026-10-30 (ai_call_prices.js)
  assert.equal(costOfEntry({ provider: 'openai', model: 'gpt-image-1', call: 'image', inTokens: 0, outTokens: 1_000_000 }).usd, 40)
  assert.deepEqual(costOfEntry({ provider: 'gemini', model: 'gemini-3.5-flash', call: 'transcribe', inTokens: 1000 }), { usd: 0, priced: false })
})

test('every reported call carries whose key it ran on', async () => {
  const restore = stubFetch({ choices: [{ message: { content: 'ok' } }], usage: { prompt_tokens: 10, completion_tokens: 1 } })
  try {
    await runInUsageScope(createUsageScope(), async () => {
      await analyseImages({ providerId: 'openai', apiKey: 'k', keySource: 'company' }, 'read', ['data:image/jpeg;base64,AA'], 'gpt-4o-mini')
      await analyseImages({ providerId: 'openai', apiKey: 'k' }, 'read', ['data:image/jpeg;base64,AA'], 'gpt-4o-mini')
      assert.deepEqual(drainUsage().map((e) => e.keySource), ['company', 'unknown'])
      await withKeySource('platform', async () => { reportUsage({ provider: 'x', model: 'y', usage: { inTokens: 1 } }) })
      assert.equal(drainUsage()[0].keySource, 'platform')
    })
  } finally { restore() }
})

test('middleware: books what no meter took once, on finish or on a client disconnect, then late calls as they land', async () => {
  const booked = []
  const mw = usageScopeMiddleware((req, entries) => booked.push({ user: req.workUser && req.workUser.id, n: entries.length }))
  const req = { workUser: { id: 'u1', companyId: 'c1' } }
  const res = new EventEmitter()
  let release
  const handlerDone = new Promise((r) => { release = r })
  mw(req, res, async () => {
    await Promise.resolve()
    reportUsage({ provider: 'openai', model: 'gpt-4o-mini', usage: { inTokens: 5 } })   // never metered
    await handlerDone
    reportUsage({ provider: 'openai', model: 'gpt-4o-mini', usage: { inTokens: 7 } })   // lands after the disconnect
  })
  await new Promise((r) => setImmediate(r))
  res.emit('close')            // client went away before 'finish'
  res.emit('finish')           // and a finish later must not book twice
  assert.deepEqual(booked, [{ user: 'u1', n: 1 }])
  release()
  await new Promise((r) => setImmediate(r))
  assert.deepEqual(booked, [{ user: 'u1', n: 1 }, { user: 'u1', n: 1 }])
})

test('background work (no request) is booked straight to the ledger sink under its owner', async () => {
  const got = []
  setUsageSink((r) => got.push(r))
  try {
    await runInBackgroundUsage({ companyId: 'c9', userId: 'u9', kind: 'summary' }, async () => {
      await Promise.resolve()
      reportUsage({ provider: 'gemini', model: 'gemini-3.5-flash', usage: { inTokens: 3, outTokens: 1 } })
    })
    assert.equal(got.length, 1)
    assert.deepEqual([got[0].companyId, got[0].userId, got[0].kind, got[0].entries.length], ['c9', 'u9', 'summary', 1])
  } finally { setUsageSink(null) }
})
