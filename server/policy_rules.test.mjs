// Tests for the company security-policy -> enforced guidance-rules engine
// (server/policy_rules.js): deterministic extraction, enforcement with low false
// positives, pattern boundaries, require-rule context gating, and sanitization.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildMatcher, normalizeRule, compileRule, enforceRules,
  extractRulesHeuristic, ruleSummary, RULE_KINDS, RULE_SEVERITIES,
} from './policy_rules.js'

test('buildMatcher: alphanumeric terms get word boundaries (ftp != sftp)', () => {
  const re = buildMatcher('ftp')
  assert.ok(re.test('upload over FTP'))
  re.lastIndex = 0
  assert.equal(re.test('upload over SFTP'), false, 'must not match inside SFTP')
})

test('buildMatcher: symbol-bearing terms match literally (CIDR, api-key)', () => {
  assert.ok(buildMatcher('0.0.0.0/0').test('open to 0.0.0.0/0'))
  assert.equal(buildMatcher('0.0.0.0/0').test('restricted to 10.0.0.0/8'), false)
  assert.ok(buildMatcher('api-key').test('the api-key is here'))
})

test('buildMatcher: /regex/ literal is honored, bad input returns null', () => {
  assert.ok(buildMatcher('/ftps?\\b/i').test('use FTPS'))
  assert.equal(buildMatcher(''), null)
  assert.equal(buildMatcher('/(/'), null, 'uncompilable regex -> null, never throws')
})

test('normalizeRule: bounds + enums + defaults', () => {
  const r = normalizeRule({ kind: 'bogus', severity: 'nope', title: 'x'.repeat(500), pattern: 'p' })
  assert.ok(RULE_KINDS.includes(r.kind))
  assert.ok(RULE_SEVERITIES.includes(r.severity))
  assert.ok(r.title.length <= 120)
  assert.equal(r.enabled, true)
  // context is only kept for require rules
  assert.equal(normalizeRule({ kind: 'forbid', pattern: 'p', context: 'c' }).context, '')
  assert.equal(normalizeRule({ kind: 'require', pattern: 'p', context: 'c' }).context, 'c')
})

test('compileRule: disabled -> null, no-pattern -> null, inert require (no context) -> null', () => {
  assert.equal(compileRule({ kind: 'forbid', pattern: 'ftp', enabled: false }), null)
  assert.equal(compileRule({ kind: 'forbid', pattern: '' }), null)
  assert.equal(compileRule({ kind: 'require', pattern: 'mfa', context: '' }), null)
  assert.ok(compileRule({ kind: 'require', pattern: 'mfa', context: 'login' }))
})

test('enforceRules: forbid fires on a match, stays quiet otherwise', () => {
  const rules = [{ kind: 'forbid', pattern: 'ftp', title: 'No FTP', severity: 'high', doc: 'Policy', section: '§3' }]
  const hit = enforceRules('step: upload over FTP', rules)
  assert.equal(hit.findings.length, 1)
  assert.equal(hit.findings[0].kind, 'forbid')
  assert.equal(hit.findings[0].doc, 'Policy')
  assert.equal(hit.findings[0].section, '§3')
  assert.equal(enforceRules('step: upload over SFTP', rules).findings.length, 0)
})

test('enforceRules: require fires ONLY on-topic and only when the practice is absent', () => {
  const rules = [{ kind: 'require', pattern: 'mfa, 2fa', context: 'production, login', title: 'MFA', severity: 'critical' }]
  // on-topic, practice missing -> unmet
  assert.equal(enforceRules('log in to production with your password', rules).findings.length, 1)
  // on-topic, practice present -> satisfied
  assert.equal(enforceRules('log in to production with MFA', rules).findings.length, 0)
  // off-topic -> never flagged (low false-positive guarantee)
  assert.equal(enforceRules('rename a spreadsheet column', rules).findings.length, 0)
})

test('enforceRules: findings are sorted most-severe first; counts are tallied', () => {
  const rules = [
    { kind: 'forbid', pattern: 'telnet', severity: 'low', title: 'telnet' },
    { kind: 'forbid', pattern: 'plaintext', severity: 'critical', title: 'plaintext' },
  ]
  const r = enforceRules('uses telnet and stores plaintext', rules)
  assert.equal(r.findings[0].severity, 'critical')
  assert.equal(r.counts.forbid, 2)
  assert.equal(r.counts.critical, 1)
})

test('extractRulesHeuristic: recalls imperative rules with sections, no bare-integer noise', () => {
  const doc = `# Secrets Management
Secrets must never be stored in plaintext.
API keys must be stored in the approved vault.
## Network
FTP must not be used; use SFTP instead.
Never open security groups to 0.0.0.0/0.
## Access
Production access requires MFA for all 200 administrators.`
  const rules = extractRulesHeuristic(doc, 'Acme Policy')
  assert.ok(rules.length >= 4, 'should extract several rules')
  // sections are carried through
  assert.ok(rules.some((r) => /Secrets/i.test(r.section)))
  assert.ok(rules.some((r) => /Network/i.test(r.section)))
  // the CIDR literal is captured as a pattern
  assert.ok(rules.some((r) => r.pattern.includes('0.0.0.0/0')))
  // provenance doc name set
  assert.ok(rules.every((r) => r.doc === 'Acme Policy'))
  // no rule is a bare integer like "200"
  assert.ok(!rules.some((r) => /^\d+$/.test(r.pattern.trim())))
})

test('extracted rules enforce with zero false positives on a compliant plan', () => {
  const doc = `Secrets must never be stored in plaintext.
FTP must not be used; use SFTP.
Production access requires MFA.
Never open security groups to 0.0.0.0/0.`
  const rules = extractRulesHeuristic(doc, 'Acme')
  const good = 'Upload over SFTP. Enable MFA before production access. Restrict the security group to 10.0.0.0/8. Keep secrets in the vault.'
  const bad = 'Upload over FTP. Store the password in plaintext. Open the SG to 0.0.0.0/0.'
  assert.equal(enforceRules(good, rules).findings.filter((f) => f.kind === 'forbid').length, 0, 'no false forbids on a compliant plan')
  const badForbids = enforceRules(bad, rules).findings.filter((f) => f.kind === 'forbid').map((f) => f.sample.toLowerCase())
  assert.ok(badForbids.some((s) => s.includes('ftp')))
  assert.ok(badForbids.some((s) => s.includes('plaintext')))
  assert.ok(badForbids.some((s) => s.includes('0.0.0.0/0')))
})

test('ruleSummary counts kinds and enabled', () => {
  const s = ruleSummary([
    { kind: 'forbid', enabled: true }, { kind: 'require', enabled: true }, { kind: 'forbid', enabled: false },
  ])
  assert.equal(s.total, 3)
  assert.equal(s.forbid, 2)
  assert.equal(s.require, 1)
  assert.equal(s.enabled, 2)
})

test('enforceRules never throws on junk input', () => {
  assert.doesNotThrow(() => enforceRules(null, null))
  assert.doesNotThrow(() => enforceRules('text', [null, {}, { kind: 'forbid' }]))
  assert.equal(enforceRules('', [{ kind: 'forbid', pattern: 'x' }]).findings.length, 0)
})
