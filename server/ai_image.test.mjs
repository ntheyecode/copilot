// Image generation (server/ai_image.js): request bodies for the current models,
// model choice through the lifecycle registry, the retired-model step to the next
// model (recorded), and Organization Verification surfaced without leaking the
// provider's text. fetch is stubbed at the HTTP boundary; no real AI calls.
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  IMAGE_MODELS, OPENAI_IMAGE_MODEL, GEMINI_IMAGE_MODEL, imageModelsFor, openaiImageBody, geminiImageBody,
  imageFromRuntime, imageUserError, isOrgVerificationError, IMAGE_CODES,
} from './ai_image.js'
import { isRetired } from './ai_model_lifecycle.js'

const json = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body })
function stubFetch(handler) {
  const real = globalThis.fetch
  const calls = []
  globalThis.fetch = async (url, init = {}) => { calls.push({ url: String(url), body: init.body ? JSON.parse(init.body) : null }); return handler(String(url), calls.length) }
  return { calls, restore: () => { globalThis.fetch = real } }
}

test('the OpenAI body is exactly model, prompt, n and size: no response_format, no style', () => {
  const b = openaiImageBody('gpt-image-2.5-sunburst', 'a diagram')
  assert.deepEqual(b, { model: 'gpt-image-2.5-sunburst', prompt: 'a diagram', n: 1, size: '1024x1024' })
  assert.equal('response_format' in b, false)
  assert.equal('style' in b, false)
  assert.deepEqual(geminiImageBody('x').generationConfig, { responseModalities: ['IMAGE'] })
})

test('the preferred image models are current; retired ones are never offered', () => {
  assert.equal(OPENAI_IMAGE_MODEL, 'gpt-image-2.5-sunburst')
  assert.equal(GEMINI_IMAGE_MODEL, 'gemini-3.1-flash-lite-image')
  for (const m of Object.values(IMAGE_MODELS).flat()) assert.equal(isRetired(m), false, m)
  assert.deepEqual(imageModelsFor('openai', '2026-10-31'), ['gpt-image-2.5-sunburst', 'gpt-image-2.5-flare'])
  assert.deepEqual(imageModelsFor('groq'), [])
})

test('OpenAI: sends the current model and reads b64_json', async () => {
  const s = stubFetch(() => json(200, { data: [{ b64_json: 'QUJD' }], usage: { input_tokens: 12, output_tokens: 4000 } }))
  try {
    const out = await imageFromRuntime({ providerId: 'openai', apiKey: 'sk-img-1' }, 'a flow chart')
    assert.equal(out.dataUrl, 'data:image/png;base64,QUJD')
    assert.equal(s.calls[0].url, 'https://api.openai.com/v1/images/generations')
    assert.deepEqual(s.calls[0].body, { model: 'gpt-image-2.5-sunburst', prompt: 'a flow chart', n: 1, size: '1024x1024' })
  } finally { s.restore() }
})

test('a model the provider reports missing steps to the next one, and the switch is recorded', async () => {
  const s = stubFetch((url, n) => (n === 1
    ? json(404, { error: { message: 'The model gpt-image-2.5-sunburst does not exist or you do not have access to it.' } })
    : json(200, { data: [{ b64_json: 'WFla' }] })))
  const switches = []
  try {
    const out = await imageFromRuntime({ providerId: 'openai', apiKey: 'sk-img-2', onSwitch: (e) => switches.push(e) }, 'x')
    assert.equal(out.model, 'gpt-image-2.5-flare')
    assert.equal(s.calls[1].body.model, 'gpt-image-2.5-flare')
    assert.deepEqual([switches[0].scope, switches[0].fromModel, switches[0].toModel], ['image', 'gpt-image-2.5-sunburst', 'gpt-image-2.5-flare'])
  } finally { s.restore() }
})

test('Organization Verification is surfaced clearly, without the provider text or model', async () => {
  const msg = 'Your organization must be verified to use the model `gpt-image-2.5-sunburst`. Please go to: https://platform.openai.com/settings/organization/general and click on Verify Organization.'
  assert.equal(isOrgVerificationError(msg), true)
  const s = stubFetch(() => json(403, { error: { message: msg } }))
  const switches = []
  try {
    const e = await imageFromRuntime({ providerId: 'openai', apiKey: 'sk-img-3', onSwitch: (x) => switches.push(x) }, 'x').then(() => null, (x) => x)
    assert.ok(e && e.orgVerification)
    assert.equal(s.calls.length, 1, 'not retried on another model')
    assert.equal(switches[0].code, IMAGE_CODES.ORG_VERIFY)
    const ue = imageUserError(e)
    assert.equal(ue.status, 403)
    assert.equal(ue.code, IMAGE_CODES.ORG_VERIFY)
    assert.match(ue.error, /organization verification/i)
    assert.doesNotMatch(ue.error, /gpt|openai|gemini|platform\.openai/i)
  } finally { s.restore() }
})

test('any other provider failure reaches the user as a plain message', () => {
  const ue = imageUserError(Object.assign(new Error('Billing hard limit reached for gpt-image-2.5-sunburst'), { status: 400, providerMessage: 'x' }))
  assert.deepEqual([ue.status, ue.code], [502, IMAGE_CODES.FAILED])
  assert.doesNotMatch(ue.error, /gpt|billing/i)
})

test('Gemini: the current image model through generateContent with an IMAGE modality', async () => {
  const s = stubFetch(() => json(200, { candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: 'R0VN' } }] } }] }))
  try {
    const out = await imageFromRuntime({ providerId: 'gemini', apiKey: 'AIza-img-1' }, 'x')
    assert.equal(out.dataUrl, 'data:image/png;base64,R0VN')
    assert.ok(s.calls[0].url.includes('/models/gemini-3.1-flash-lite-image:generateContent'))
  } finally { s.restore() }
})
