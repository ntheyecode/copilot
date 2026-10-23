// Regression tests for the shared DLP scrubber (work-scrub.js). These lock in
// the fixes for: phone numbers before sentence punctuation, hyphenated sk-/xai-
// provider keys, bare token= secrets, and - the important one - that tokenize +
// rehydrate round-trips EXACTLY even when a labelled secret wraps an already
// token-format value (api_key=ghp_...), which used to leave a nested token.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { scrubSensitive, tokenizeSensitive, rehydrate } from './work-scrub.js'

test('phone number right before a sentence period is redacted', () => {
  const r = scrubSensitive('call +1 (415) 555-0137.')
  assert.equal(r.clean, 'call [PHONE].')
  assert.ok(r.counts.phone >= 1)
})

test('hyphenated provider keys (OpenAI / Anthropic / xAI) are caught', () => {
  assert.match(scrubSensitive('key sk-proj-abc123DEF456ghi789JKL012mno').clean, /\[SECRET\]/)
  assert.match(scrubSensitive('key sk-ant-api03-XYZ9876543210abcdefgzz').clean, /\[SECRET\]/)
  assert.match(scrubSensitive('key xai-ABCDEFGHIJ1234567890xyz').clean, /\[SECRET\]/)
})

test('bare token= and password= secrets are redacted, label kept', () => {
  assert.equal(scrubSensitive('token=randomsecretvalue99').clean, 'token=[REDACTED]')
  assert.equal(scrubSensitive('password: hunter2345').clean, 'password: [REDACTED]')
})

test('structured identifiers still redact (no regression)', () => {
  const r = scrubSensitive('SSN 123-45-6789, Visa 4111 1111 1111 1111, host 10.0.0.42, a@b.com')
  assert.match(r.clean, /\[SSN\]/)
  assert.match(r.clean, /\[CARD\]/)
  assert.match(r.clean, /\[IP\]/)
  assert.match(r.clean, /\[EMAIL\]/)
})

test('tokenize + rehydrate round-trips exactly, including a labelled token-format secret', () => {
  const inputs = [
    'call +1 (415) 555-0137.',
    'Patient John Doe, SSN 123-45-6789, Visa 4111 1111 1111 1111, from 10.0.0.42.',
    'Deploy with api_key=ghp_examplekey1234567890 and reach a@b.com',
    'two emails a@x.com and b@y.com plus the same a@x.com again',
  ]
  for (const s of inputs) {
    const tk = tokenizeSensitive(s)
    assert.equal(rehydrate(tk.clean, tk.map), s, `round-trip failed for: ${s}`)
    // The model-visible text must not contain the raw sensitive value.
    assert.ok(!tk.clean.includes('ghp_examplekey1234567890'))
  }
})

test('the same value gets the same token (stable within a session)', () => {
  const tk = tokenizeSensitive('a@x.com and again a@x.com')
  const toks = tk.clean.match(/\[\[EMAIL_\d+\]\]/g) || []
  assert.equal(toks.length, 2)
  assert.equal(toks[0], toks[1])
})

test('version strings are NOT treated as IPs', () => {
  assert.equal(scrubSensitive('upgraded to v1.2.3.4 today').clean, 'upgraded to v1.2.3.4 today')
})
