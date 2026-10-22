// AI-language scrubber invariants (node:test). Guards BOTH scrubbers:
//   - scrubAiLanguage (interview answers) via CATALOG
//   - scrubGuidance (WorkCoPilot guidance) via GUIDANCE_CATALOG
// so a regression in either is caught by `npm test`. Add a row to the matching
// CATALOG in server/ai_language.js whenever a new tell or guidance rule is found.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CATALOG, GUIDANCE_CATALOG, scrubAiLanguage, scrubGuidance, runGuidanceCatalog } from './ai_language.js'

test('interview scrubber catalog: every tell is handled', () => {
  const fails = []
  for (const c of CATALOG) {
    const out = scrubAiLanguage(c.input)
    if (c.mustNotMatch && c.mustNotMatch.test(out)) fails.push(`${c.name}: still matches -> "${out}"`)
    if (c.mustMatch && !c.mustMatch.test(out)) fails.push(`${c.name}: missing expected -> "${out}"`)
  }
  assert.deepEqual(fails, [], fails.join('\n'))
})

test('guidance scrubber catalog: no {PAUSE}, commands intact, confirmations kept', () => {
  const r = runGuidanceCatalog()
  assert.ok(r.pass, r.failures.join('\n'))
  assert.ok(GUIDANCE_CATALOG.length >= 10)
})

test('guidance scrubber never leaks a delivery marker into a long block', () => {
  const out = scrubGuidance('Open the console. Click Launch Instance. Pick the AMI. Name it web-1. Review the summary. This gives you a running instance.')
  assert.ok(!/\{PAUSE\}|\{THINK\}/.test(out))
  assert.ok(/running instance/i.test(out))   // closing confirmation preserved
})

test('guidance scrubber preserves inline commands and placeholders byte-for-byte', () => {
  const cmd = scrubGuidance('Run `git add .; git commit -m "x"; git push` to publish.')
  assert.match(cmd, /git add \.; git commit -m "x"; git push/)
  const ph = scrubGuidance('Replace {your-bucket-name} with your real bucket name.')
  assert.match(ph, /\{your-bucket-name\}/)
})

test('guidance scrubber does not convert a safety refusal into the interview repeat line', () => {
  const out = scrubGuidance("I'm sorry, but I can't help break into that account.")
  assert.ok(!/repeat the question/i.test(out))
})
