// Regression: "can this model read a screen" must come from ONE source (the
// curated ratecard via isVisionModel), not a second regex that drifts. The old
// VISION_HINT (/qwen.*vl/) missed qwen*-flash while the ratecard priced those
// same models as vision, so the vision failover filter silently dropped the
// cheapest working screen readers - a pinned OpenRouter/Qwen-flash reader could
// not fail over to another Qwen-flash model (SUPREME RULE II + III + VI). This
// goes red if the class returns in any form: a vision-priced model that
// isVisionModel reports as non-vision.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isVisionModel } from './ai.js'

test('isVisionModel recognizes the cheap OpenRouter Qwen screen readers', () => {
  // These are real, image-capable OpenRouter models the product may pin/fail over
  // to; every one must read as vision-capable.
  for (const m of [
    'qwen/qwen3.7-flash', 'qwen/qwen3.8-flash', 'qwen/qwen3.6-flash',
    'qwen/qwen3-vl-30b-a3b-instruct', 'qwen/qwen3-vl-235b-a22b-instruct',
    'qwen/qwen3.8-omni-flash',
  ]) {
    assert.equal(isVisionModel('openrouter', m), true, `${m} should be vision-capable`)
  }
})

test('isVisionModel still excludes known text-only models', () => {
  assert.equal(isVisionModel('groq', 'openai/gpt-oss-20b'), false)
  assert.equal(isVisionModel('openrouter', 'deepseek/deepseek-chat'), false)
  assert.equal(isVisionModel('openrouter', ''), false)
  assert.equal(isVisionModel('openrouter', null), false)
})

test('class guard: the vision failover candidate set includes a Qwen flash reader', () => {
  // The failover filter in analyseImages keeps only isVisionModel candidates from
  // the live catalog. Simulate that filter over a realistic OpenRouter catalog
  // and assert a cheap flash reader survives (it would NOT under the old
  // /qwen.*vl/ hint).
  const liveCatalog = ['deepseek/deepseek-chat', 'qwen/qwen3.7-flash', 'qwen/qwen3-vl-30b-a3b-instruct']
  const survivors = liveCatalog.filter((m) => isVisionModel('openrouter', m))
  assert.ok(survivors.includes('qwen/qwen3.7-flash'), 'qwen flash must survive the vision failover filter')
  assert.ok(!survivors.includes('deepseek/deepseek-chat'), 'text-only model must be filtered out')
})
