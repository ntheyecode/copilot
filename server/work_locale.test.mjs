// Tests for "AI guides in the user's language" (server side).
// Locks in: the locale -> language map and the one shared instruction
// (localeInstruction), and that workPlan actually PREPENDS that instruction to
// the model's system prompt. English / unknown / empty locales are a no-op, so
// the feature is safe until the client starts sending `locale`.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { languageForLocale, localeInstruction, workPlan } from './work.js'

test('known locale codes map to their language name', () => {
  assert.equal(languageForLocale('es'), 'Spanish')
  assert.equal(languageForLocale('pt-BR'), 'Portuguese')
  assert.equal(languageForLocale('zh'), 'Chinese')
  assert.equal(languageForLocale('ja'), 'Japanese')
  assert.equal(languageForLocale('ko'), 'Korean')
  assert.equal(languageForLocale('ar'), 'Arabic')
})

test('locale resolution is case-insensitive and tolerates region subtags', () => {
  assert.equal(languageForLocale('pt-br'), 'Portuguese')   // case
  assert.equal(languageForLocale('ES'), 'Spanish')         // case
  assert.equal(languageForLocale('fr-FR'), 'French')       // Accept-Language style
  assert.equal(languageForLocale('zh-CN'), 'Chinese')      // base-subtag fallback
})

test('English / unknown / empty resolve to no instruction (safe no-op)', () => {
  assert.equal(localeInstruction('en'), '')
  assert.equal(localeInstruction('en-US'), '')   // English region still English
  assert.equal(localeInstruction(''), '')
  assert.equal(localeInstruction(undefined), '')
  assert.equal(localeInstruction('kl'), '')      // unknown -> treated as en
  assert.equal(languageForLocale('nope'), null)
})

test('the instruction names the language and protects the exact tokens', () => {
  const ins = localeInstruction('es')
  assert.match(ins, /^Respond in Spanish /)
  assert.match(ins, /Never translate or alter commands, code, file paths, URLs/)
  assert.match(ins, /\[\[SECRET_1\]\]/)
  assert.match(ins, /keep all of those exactly as-is\.$/)
})

// Thread test: workPlan must PREPEND the instruction to the system prompt it
// sends to the model, and must send NOTHING extra for English.
function stubAi() {
  const seen = []
  return {
    seen,
    async generate(_cfg, system, _user) {
      seen.push(system)
      return JSON.stringify({ appContext: 'x', steps: [{ text: 'Do a thing', validate: 'it is done' }] })
    },
  }
}

test('workPlan prepends the language instruction for a non-English locale', async () => {
  const ai = stubAi()
  const out = await workPlan(ai, {}, { base: 'BASE', goal: 'ship it', locale: 'es' })
  assert.equal(out.steps.length, 1)
  assert.equal(ai.seen.length, 1)
  assert.ok(ai.seen[0].startsWith('Respond in Spanish '), 'system prompt should start with the Spanish instruction')
})

test('workPlan adds nothing for English (default and explicit)', async () => {
  const aiEn = stubAi()
  await workPlan(aiEn, {}, { base: 'BASE', goal: 'ship it', locale: 'en' })
  assert.equal(aiEn.seen[0].startsWith('Respond in'), false)

  const aiDefault = stubAi()
  await workPlan(aiDefault, {}, { base: 'BASE', goal: 'ship it' })   // no locale passed
  assert.equal(aiDefault.seen[0].startsWith('Respond in'), false)
})
