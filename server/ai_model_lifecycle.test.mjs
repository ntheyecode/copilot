// Model lifecycle gate (server/ai_model_lifecycle.js).
//
// The class this kills: a provider shuts a model down and the product keeps
// asking for it (gpt-image-1 broke image generation on 2026-10-23; gemini-2.0-flash
// sat at the head of the default list for months after 2026-06-01). Every quoted
// model id in server code is checked against the registry, every ladder rung must
// still reach a current model, and every default/fallback must be current.
// "Today" is the real clock; the registry functions take an injected date so the
// unit checks are deterministic.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  MODEL_LIFECYCLE, LIFECYCLE_SOURCES, lifecycleEntry, isRetired, isTrackedProviderId, replacementFor,
  dropRetired, firstCurrent, pickFromLadder, daysToShutdown, lifecycleStatus, preferredReplacement, dayOf,
} from './ai_model_lifecycle.js'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const OFFICIAL = /^https:\/\/(developers\.openai\.com|ai\.google\.dev|console\.groq\.com)\//
const TODAY = Date.now()

// ---- the registry itself -------------------------------------------------------
test('every registry entry is well formed and sourced', () => {
  for (const s of Object.values(LIFECYCLE_SOURCES)) {
    assert.match(s.url, OFFICIAL)
    assert.match(s.checked, /^\d{4}-\d{2}-\d{2}$/)
  }
  for (const e of MODEL_LIFECYCLE) {
    const name = e.model || String(e.pattern)
    assert.ok(['openai', 'gemini', 'groq'].includes(e.provider), name)
    assert.ok(typeof e.model === 'string' || e.pattern instanceof RegExp, name)
    assert.ok(e.shutdown === null || /^\d{4}-\d{2}-\d{2}$/.test(e.shutdown), `${name} shutdown`)
    assert.ok(e.src && OFFICIAL.test(e.src.url), `${name} has no official source`)
    for (const r of [e.replacement, e.routedTo].filter(Boolean)) assert.ok(lifecycleEntry(r), `${name} -> ${r} is not in the registry`)
  }
})

test('retirement is decided by the injected date, on the shutdown day itself', () => {
  assert.equal(isRetired('gpt-image-1', { at: '2026-10-22' }), false)
  assert.equal(isRetired('gpt-image-1', { at: '2026-10-23' }), true)
  assert.equal(isRetired('gpt-4o-mini', { at: '2027-01-13' }), false)
  assert.equal(isRetired('gpt-4o-mini', { at: Date.UTC(2027, 0, 14, 12) }), true)
  assert.equal(isRetired('gpt-4.1-nano-2025-04-14', { at: '2026-11-01' }), true)   // family pattern
  assert.equal(isRetired('gemini-2.0-flash-001', { at: '2026-06-01' }), true)
  assert.equal(isRetired('gemini-1.5-flash-8b', { at: '2026-01-01' }), true)
  assert.equal(isRetired('gemini-flash-latest', { at: '2099-01-01' }), false)        // alias never dates out
  assert.equal(isRetired('openai/gpt-4o-mini', { at: '2099-01-01' }), false)         // a router's slug is not governed
  assert.equal(isRetired('brand-new-model', { at: '2099-01-01' }), false)            // unknown passes through
  assert.equal(dayOf('2026-10-31'), '2026-10-31')
  assert.equal(daysToShutdown('gpt-image-1-mini', { at: '2026-11-01' }), 30)
  assert.equal(lifecycleStatus('gpt-image-1', { at: '2026-10-31' }).status, 'retired')
  assert.equal(lifecycleStatus('gpt-4o', { at: '2026-10-31' }).status, 'retiring')
  assert.equal(lifecycleStatus('gemini-2.5-flash', { at: '2026-10-31' }).status, 'legacy')
})

test('replacements follow the chain to a model that is still served', () => {
  assert.equal(replacementFor('gpt-image-1', { at: '2026-10-31' }), 'gpt-image-2.5-sunburst')
  assert.equal(replacementFor('gpt-4.1-nano', { at: '2026-10-31' }), 'gpt-5.6-luna')
  assert.equal(replacementFor('o4-mini', { at: '2026-10-31' }), 'gpt-5.6-terra')
  assert.equal(replacementFor('gpt-4-turbo', { at: '2026-10-31' }), 'gpt-5.6-sol')
  assert.equal(replacementFor('gemini-2.0-flash', { at: '2026-10-31' }), 'gemini-3.6-flash')
  // gemini-2.0-flash-lite -> gemini-3.1-flash-lite, itself retired on 2027-05-07 -> gemini-3.5-flash-lite
  assert.equal(replacementFor('gemini-2.0-flash-lite', { at: '2027-06-01' }), 'gemini-3.5-flash-lite')
  assert.equal(preferredReplacement('gpt-4o-mini', ['gpt-6-luna', 'gpt-5.6-luna']), 'gpt-6-luna')
  assert.equal(preferredReplacement('gpt-4o-mini', ['gpt-5.6-luna']), null)   // the key does not have it
})

test('dropRetired / firstCurrent / pickFromLadder never return a retired model', () => {
  const at = '2026-10-31'
  assert.deepEqual(dropRetired(['gpt-4.1-nano', 'gpt-6-luna', 'o4-mini', 'gpt-4o-mini', 'mystery'], { at }), ['gpt-6-luna', 'gpt-4o-mini', 'mystery'])
  assert.equal(firstCurrent(['gpt-image-1', 'gpt-image-2.5-sunburst'], { at }), 'gpt-image-2.5-sunburst')
  assert.equal(pickFromLadder([/4\.1-nano/, /gpt-6-luna/], ['gpt-4.1-nano', 'gpt-6-luna'], { at }), 'gpt-6-luna')
  assert.equal(pickFromLadder([/gpt-6-luna/, /gpt-5\.6-luna/], ['gpt-6-luna', 'gpt-5.6-luna'], { at, avoid: 'gpt-6-luna' }), 'gpt-5.6-luna')
})

// ---- the code that names models --------------------------------------------------
// Price tables keep shut-down models on purpose (old ledger rows still price), and
// the registry names them by design; both are exempt from the retired check only.
const RETIRED_OK = new Set(['ai_model_lifecycle.js', 'model-prices.js', 'ai_call_prices.js'])
const LITERAL = /['"`]((?:gpt-|o\d-|whisper-|dall-e-|chatgpt-|text-embedding-|gemini-|imagen-|distil-whisper)[A-Za-z0-9.-]*)['"`]/g

// Every server source file, subfolders included (never server/data, never tests).
function serverSources(dir = HERE, rel = '') {
  const out = []
  for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
    if (d.isDirectory()) {
      if (!rel && (d.name === 'data' || d.name === 'node_modules')) continue
      out.push(...serverSources(path.join(dir, d.name), `${rel}${d.name}/`))
    } else if (/\.(js|mjs)$/.test(d.name) && !d.name.includes('.test.')) {
      out.push({ file: `${rel}${d.name}`, text: fs.readFileSync(path.join(dir, d.name), 'utf8') })
    }
  }
  return out
}
function referencedModels() {
  const out = []
  for (const { file, text } of serverSources()) {
    for (const m of text.matchAll(LITERAL)) if (isTrackedProviderId(m[1])) out.push({ file, model: m[1] })
  }
  return out
}

test('every model id quoted in server code is known to the lifecycle registry', () => {
  const refs = referencedModels()
  assert.ok(refs.length > 20, 'the scan found the model literals')
  const unknown = refs.filter((r) => !lifecycleEntry(r.model)).map((r) => `${r.file}: ${r.model}`)
  assert.deepEqual(unknown, [], 'model ids the lifecycle registry does not know (add them to server/ai_model_lifecycle.js first)')
})

test('no model id quoted in server code is past its shutdown', () => {
  const refs = referencedModels()
  const dead = refs.filter((r) => !RETIRED_OK.has(r.file) && isRetired(r.model, { at: TODAY }))
    .map((r) => `${r.file}: ${r.model} (shut down ${lifecycleEntry(r.model).shutdown}, use ${replacementFor(r.model) || 'a current model'})`)
  assert.deepEqual(dead, [], 'server code names models that are past their shutdown')
})

test('models referenced by server code that shut down within 90 days are reported', () => {
  const soon = [...new Map(referencedModels().filter((r) => !RETIRED_OK.has(r.file)).map((r) => [r.model, r])).values()]
    .map((r) => ({ ...r, days: daysToShutdown(r.model, { at: TODAY }) }))
    .filter((r) => r.days != null && r.days >= 0 && r.days <= 90)
  for (const r of soon) console.warn(`[model-lifecycle] ${r.file}: ${r.model} shuts down in ${r.days} days; replacement ${replacementFor(r.model) || 'none named'}`)
  assert.ok(Array.isArray(soon))
})

// ---- ladders, defaults and fallbacks ------------------------------------------------
const known = MODEL_LIFECYCLE.filter((e) => typeof e.model === 'string' && !e.pattern).map((e) => e.model)

test('every OpenAI / Gemini ladder rung still reaches a current model', async () => {
  const { WORK_VISION_PREF, WORK_VISION_STRONG } = await import('./ai_vision_ladder.js')
  const { TRANSCRIBE_PREFS } = await import('./ai_transcribe.js')
  const ladders = {
    'vision.cheap': WORK_VISION_PREF, 'vision.strong': WORK_VISION_STRONG, transcribe: TRANSCRIBE_PREFS,
  }
  const deadRungs = []
  for (const [name, byProvider] of Object.entries(ladders)) {
    for (const provider of ['openai', 'gemini']) {
      for (const re of (byProvider[provider] || [])) {
        const hits = known.filter((m) => lifecycleEntry(m).provider === provider && re.test(m))
        if (hits.length && hits.every((m) => isRetired(m, { at: TODAY }))) deadRungs.push(`${name}.${provider}: ${re}`)
      }
    }
  }
  assert.deepEqual(deadRungs, [], 'ladder rungs that can only match shut-down models')
})

test('defaults and fallbacks name only current models', async () => {
  const { PROVIDERS } = await import('./ai.js')
  const { TRANSCRIBE_FALLBACK } = await import('./ai_transcribe.js')
  const { IMAGE_MODELS } = await import('./work-images.js')
  const named = [
    ...['openai', 'gemini'].flatMap((p) => PROVIDERS[p].chatModels),
    ...Object.values(TRANSCRIBE_FALLBACK).flat(),
    ...Object.values(IMAGE_MODELS).flat(),
  ]
  for (const m of named) {
    assert.ok(lifecycleEntry(m), `${m} is not in the registry`)
    assert.equal(isRetired(m, { at: TODAY }), false, `${m} is past its shutdown`)
  }
  // The head of each default list is a model with no announced shutdown.
  for (const p of ['openai', 'gemini']) assert.equal(lifecycleEntry(PROVIDERS[p].chatModels[0]).shutdown, null, p)
  for (const list of Object.values(IMAGE_MODELS)) assert.equal(lifecycleEntry(list[0]).shutdown, null, list[0])
})

test('ladder selection over a catalog of only current models', async () => {
  const { WORK_VISION_PREF, WORK_VISION_STRONG } = await import('./ai_vision_ladder.js')
  const openai = ['gpt-5.6-luna', 'gpt-5.6-sol', 'gpt-5.6-terra', 'gpt-6-luna', 'gpt-image-2.5-sunburst', 'gpt-transcribe']
  const gemini = ['gemini-3.5-flash-lite', 'gemini-3.6-flash', 'gemini-3.8-flash', 'gemini-flash-latest']
  const at = '2026-10-31'
  // Cheapest dependable reader first, strongest first for the backup.
  assert.equal(pickFromLadder(WORK_VISION_PREF.openai, openai, { at }), 'gpt-6-luna')
  assert.equal(pickFromLadder(WORK_VISION_PREF.gemini, gemini, { at }), 'gemini-3.5-flash-lite')
  assert.equal(pickFromLadder(WORK_VISION_STRONG.openai, openai, { at }), 'gpt-5.6-sol')
  assert.equal(pickFromLadder(WORK_VISION_STRONG.gemini, gemini, { at }), 'gemini-3.8-flash')
  // A catalog that still lists shut-down models never yields them.
  assert.equal(pickFromLadder(WORK_VISION_PREF.openai, ['gpt-4.1-nano', 'o4-mini', 'gpt-5.6-luna'], { at }), 'gpt-5.6-luna')
  assert.equal(pickFromLadder(WORK_VISION_PREF.gemini, ['gemini-2.0-flash', 'gemini-3.6-flash'], { at }), 'gemini-3.6-flash')
})
