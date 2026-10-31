// ai.js model choice against the lifecycle registry: a pinned model past its
// shutdown is never sent (the substitution goes to the provider's named
// replacement and is recorded through onSwitch, SUPREME RULE III), retired ids
// never come out of the live catalog, and the current OpenAI models get
// reasoning effort "none" instead of an undocumented temperature. fetch is
// stubbed at the HTTP boundary; no real AI calls.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { chat, analyseImages, listModels, testKey, PROVIDERS } from './ai.js'
import { chatParamsFor } from './ai_model_params.js'
import { isRetired } from './ai_model_lifecycle.js'

const jsonRes = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body })
const sent = []
const openaiCatalog = ['gpt-4.1-nano', 'gpt-6-luna', 'gpt-5.6-luna', 'gpt-5.6-terra', 'gpt-5.6-sol', 'o4-mini', 'gpt-4o-mini-transcribe', 'gpt-transcribe', 'gpt-image-2.5-sunburst']
const realFetch = global.fetch
global.fetch = async (url, opts) => {
  url = String(url)
  if (url.includes('/models') && !url.includes(':generateContent')) {
    if (url.includes('generativelanguage')) {
      return jsonRes(200, { models: ['gemini-2.0-flash', 'gemini-3.5-flash-lite', 'gemini-3.8-flash'].map((n) => ({ name: `models/${n}`, supportedGenerationMethods: ['generateContent'] })) })
    }
    if (url.includes('groq')) return jsonRes(200, { data: [{ id: 'openai/gpt-oss-20b' }] })
    return jsonRes(200, { data: openaiCatalog.map((id) => ({ id })) })
  }
  if (url.includes('/chat/completions')) {
    const body = JSON.parse(opts.body)
    sent.push(body)
    return jsonRes(200, { choices: [{ message: { content: 'OK ' + body.model } }] })
  }
  if (url.includes(':generateContent')) {
    const model = url.split('/models/')[1].split(':')[0]
    sent.push({ model })
    return jsonRes(200, { candidates: [{ content: { parts: [{ text: 'OK ' + model }] } }] })
  }
  throw new Error('unexpected url ' + url)
}
process.on('exit', () => { global.fetch = realFetch })

test('the built-in default models are current', () => {
  for (const p of ['openai', 'gemini']) for (const m of PROVIDERS[p].chatModels) assert.equal(isRetired(m), false, m)
})

test('a pinned model past its shutdown is never sent; its named replacement serves, recorded', async () => {
  sent.length = 0
  const switches = []
  const got = await chat({ providerId: 'openai', apiKey: 'k-sel-1', chatModel: 'gpt-4.1-nano', onSwitch: (e) => switches.push(e) }, 'sys', [{ role: 'user', content: 'hi' }])
  assert.equal(got, 'OK gpt-5.6-luna')                       // OpenAI's named replacement for gpt-4.1-nano
  assert.deepEqual(sent.map((b) => b.model), ['gpt-5.6-luna'])  // the retired model was never called
  assert.equal(switches.length, 1)
  assert.deepEqual([switches[0].reason, switches[0].fromModel, switches[0].toModel], ['retired', 'gpt-4.1-nano', 'gpt-5.6-luna'])
})

test('a retired Gemini pin heals the same way', async () => {
  sent.length = 0
  const switches = []
  const got = await chat({ providerId: 'gemini', apiKey: 'k-sel-2', chatModel: 'gemini-2.0-flash', onSwitch: (e) => switches.push(e) }, 'sys', [{ role: 'user', content: 'hi' }])
  assert.match(got, /^OK gemini-3\./)
  assert.ok(!sent.some((b) => b.model === 'gemini-2.0-flash'))
  assert.equal(switches[0].reason, 'retired')
})

test('a retired vision pin heals to a current vision model, recorded', async () => {
  sent.length = 0
  const switches = []
  const got = await analyseImages({ providerId: 'openai', apiKey: 'k-sel-3', onSwitch: (e) => switches.push(e) }, 'read', ['data:image/png;base64,AAAA'], 'o4-mini')
  assert.equal(got, 'OK gpt-5.6-terra')   // o4-mini -> gpt-5.6-terra
  assert.ok(!sent.some((b) => b.model === 'o4-mini'))
  assert.equal(switches[0].scope, 'vision')
})

test('the live catalog never offers a retired model, and Test reports the replacement', async () => {
  const ids = await listModels({ providerId: 'openai', apiKey: 'k-sel-4' })
  assert.deepEqual(ids, ['gpt-5.6-luna', 'gpt-5.6-sol', 'gpt-5.6-terra', 'gpt-6-luna'])
  const g = await listModels({ providerId: 'gemini', apiKey: 'k-sel-5' })
  assert.ok(!g.includes('gemini-2.0-flash'))
  const r = await testKey({ providerId: 'openai', apiKey: 'k-sel-6', chatModel: 'gpt-4.1-nano' })
  assert.deepEqual([r.model, r.requestedModel], ['gpt-5.6-luna', 'gpt-4.1-nano'])
})

test('current OpenAI models get reasoning effort none and no temperature; others keep temperature', async () => {
  assert.deepEqual(chatParamsFor('openai', 'gpt-6-luna'), { reasoning_effort: 'none' })
  assert.deepEqual(chatParamsFor('openai', 'gpt-5.6-sol'), { reasoning_effort: 'none' })
  assert.deepEqual(chatParamsFor('openai', 'o3'), {})
  assert.deepEqual(chatParamsFor('openai', 'gpt-4o-mini'), { temperature: 0.3 })
  assert.deepEqual(chatParamsFor('groq', 'openai/gpt-oss-20b'), { temperature: 0.3 })
  sent.length = 0
  await chat({ providerId: 'openai', apiKey: 'k-sel-7', chatModel: 'gpt-6-luna' }, 'sys', [{ role: 'user', content: 'hi' }])
  assert.equal(sent[0].reasoning_effort, 'none')
  assert.equal('temperature' in sent[0], false)
  sent.length = 0
  await analyseImages({ providerId: 'openai', apiKey: 'k-sel-8' }, 'read', ['data:image/png;base64,AAAA'], 'gpt-6-luna')
  assert.equal(sent[0].reasoning_effort, 'none')
  sent.length = 0
  await chat({ providerId: 'groq', apiKey: 'k-sel-9', chatModel: 'openai/gpt-oss-20b' }, 'sys', [{ role: 'user', content: 'hi' }])
  assert.equal(sent[0].temperature, 0.3)
})
