// Regression tests for the AI reliability ladder (ai.js chat failover). These
// lock in the enterprise-scale behaviour: a retired or rate-limited model heals
// to another CURRENT model on the SAME key first; if that key has nothing left,
// it fails over to the next configured PROVIDER's key; when everything is
// exhausted it throws a CRISP CODED error; and a key/auth error is NEVER masked
// or failed-over (SUPREME RULE III). Every switch fires cfg.onSwitch so the
// superadmin incident trail is complete. fetch is stubbed per-URL.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { chat, AI_CODES } from './ai.js'

const jsonRes = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body })
let chatHandler = () => jsonRes(200, { choices: [{ message: { content: 'OK' } }] })

const realFetch = global.fetch
global.fetch = async (url, opts) => {
  url = String(url)
  if (url.includes('/models')) {
    if (url.includes('generativelanguage')) return jsonRes(200, { models: [{ name: 'models/gemini-flash-latest', supportedGenerationMethods: ['generateContent'] }] })
    if (url.includes('groq')) return jsonRes(200, { data: [{ id: 'openai/gpt-oss-20b' }, { id: 'openai/gpt-oss-120b' }] })
    return jsonRes(200, { data: [{ id: 'gpt-4o-mini' }, { id: 'gpt-4o' }] })
  }
  if (url.includes('/chat/completions')) return chatHandler(url.includes('groq') ? 'groq' : 'openai', JSON.parse(opts.body).model)
  if (url.includes(':generateContent')) return chatHandler('gemini', url.split('/models/')[1].split(':')[0])
  throw new Error('unexpected url ' + url)
}
process.on('exit', () => { global.fetch = realFetch })

const run = async (cfgIn, handler) => {
  chatHandler = handler
  const switches = []
  const cfg = { apiKey: 'k', onSwitch: (e) => switches.push(e), ...cfgIn }
  let got, err
  try { got = await chat(cfg, 'sys', [{ role: 'user', content: 'hi' }]) } catch (e) { err = e }
  return { got, err, switches }
}

test('retired model heals to another current model on the SAME key', async () => {
  const { got, switches } = await run({ providerId: 'groq', chatModel: 'openai/gpt-oss-DEAD', alternates: [] },
    (prov, model) => model === 'openai/gpt-oss-DEAD'
      ? jsonRes(404, { error: { message: 'The model `gpt-oss-DEAD` does not exist or is not available' } })
      : jsonRes(200, { choices: [{ message: { content: 'OK ' + model } }] }))
  assert.match(got, /OK openai\/gpt-oss-20b/)
  assert.equal(switches.length, 1)
  assert.equal(switches[0].crossProvider, false)
  assert.equal(switches[0].toProvider, 'groq')
})

test('provider fully rate-limited fails over to the next provider key', async () => {
  const { got, switches } = await run({ providerId: 'groq', chatModel: 'openai/gpt-oss-20b', alternates: [{ providerId: 'openai', apiKey: 'k2' }] },
    (prov, model) => prov === 'groq'
      ? jsonRes(429, { error: { message: 'Rate limit reached for model' } })
      : jsonRes(200, { choices: [{ message: { content: 'OK openai ' + model } }] }))
  assert.match(got, /OK openai/)
  assert.ok(switches.some((s) => s.crossProvider && s.toProvider === 'openai'))
})

test('full exhaustion throws a crisp coded error and a fatal switch event', async () => {
  const { err, switches } = await run({ providerId: 'groq', chatModel: 'openai/gpt-oss-20b', alternates: [{ providerId: 'openai', apiKey: 'k2' }] },
    () => jsonRes(429, { error: { message: 'Rate limit reached' } }))
  assert.ok(err)
  assert.equal(err.code, AI_CODES.RATE)
  assert.ok(switches.some((s) => s.fatal && s.code === AI_CODES.RATE))
})

test('a key/auth error is surfaced, never masked or failed-over (SUPREME RULE III)', async () => {
  const { err, switches } = await run({ providerId: 'openai', chatModel: 'gpt-4o-mini', alternates: [{ providerId: 'groq', apiKey: 'k2' }] },
    () => jsonRes(401, { error: { message: 'Incorrect API key provided' } }))
  assert.ok(err)
  assert.equal(err.status, 401)
  assert.equal(switches.length, 0)
})

// An EMPTY/blank model response (the provider returns 200 with no content, as
// gpt-oss-20b does on hard/long prompts) is NOT a model-error and NOT a rate
// limit, so it used to re-throw a bare 502 and give the user nothing - no Plan B.
// It must now flow through the SAME ladder: heal on-key, then fail over, with the
// incident trail showing reason 'empty' (SUPREME RULE III/VI, never silent).
test('an empty response fails over to the next provider and returns its answer', async () => {
  const { got, err, switches } = await run(
    { providerId: 'groq', chatModel: 'openai/gpt-oss-20b', alternates: [{ providerId: 'openai', apiKey: 'k2' }] },
    (prov, model) => prov === 'groq'
      ? jsonRes(200, { choices: [{ message: { content: '' } }] })   // empty on every groq model
      : jsonRes(200, { choices: [{ message: { content: 'OK openai ' + model } }] }))
  assert.equal(err, undefined)                                      // (a) no throw - a working provider answered
  assert.match(got, /OK openai/)
  assert.ok(switches.some((s) => s.reason === 'empty'))             // (b) the empty reason is on the incident trail
  assert.ok(switches.some((s) => s.crossProvider && s.toProvider === 'openai'))
})

test('an empty response on EVERY provider throws a crisp coded error (not a hang, not a silent "")', async () => {
  const { got, err, switches } = await run(
    { providerId: 'groq', chatModel: 'openai/gpt-oss-20b', alternates: [{ providerId: 'openai', apiKey: 'k2' }] },
    () => jsonRes(200, { choices: [{ message: { content: '' } }] }))   // empty on groq AND openai
  assert.equal(got, undefined)
  assert.ok(err)
  assert.equal(err.code, AI_CODES.EXHAUSTED)
  assert.ok(switches.some((s) => s.fatal && s.code === AI_CODES.EXHAUSTED))
})
