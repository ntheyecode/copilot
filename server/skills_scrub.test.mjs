// Phase 0: the Skills / KB stored-text scrub gap.
//
// Skills (playbooks/SOPs) and distilled KB learnings are persisted per tenant and
// later injected VERBATIM into AI prompts. They must never store or inject a raw
// name/phone/SSN/PHI/IP/secret/block-listed word. Before this fix they were only
// passed through redactIncidentText (secrets + emails), so phones, SSNs, IPs, PHI
// and block words leaked through on write AND the admin re-upload path bypassed
// even that. These tests FAIL against the old behavior.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const storePath = 'file://' + path.join(here, 'store.js').replace(/\\/g, '/')
process.env.WORK_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'wc-skills-'))
process.env.PORT = '0'
const store = await import(storePath)

test('addSkill strips phone / SSN / IP that the old secrets-only filter let through', () => {
  const u = store.createWorkUser({ username: 'sk-solo1', password: 'Passw0rd!x' })
  store.addSkill(u.id, { title: 'Pager escalation', content: 'Call Bob on 415-555-2671 to escalate; his SSN is 123-45-6789; the box is 10.9.8.7.' })
  const got = store.getSkillsFor(u.id, { goal: 'escalate pager Bob box', app: '' })
  assert.equal(got.length, 1, 'the skill is retrievable')
  const c = got[0].content
  assert.ok(!/415-555-2671/.test(c), 'phone redacted')
  assert.ok(!/123-45-6789/.test(c), 'SSN redacted')
  assert.ok(!/10\.9\.8\.7/.test(c), 'IP redacted')
  assert.ok(/\[PHONE\]/.test(c) && /\[SSN\]/.test(c) && /\[IP\]/.test(c), 'replaced with typed placeholders, so the guidance structure survives')
})

test('addSkill reports what it stripped (counts, never values) for the audit surface', () => {
  const u = store.createWorkUser({ username: 'sk-solo2', password: 'Passw0rd!x' })
  const rec = store.addSkill(u.id, { title: 'Contacts', content: 'Email jane@example.com or call 212-555-0145 for the rollout handoff.' })
  assert.ok(rec.redacted >= 2, 'a redaction count is returned')
  assert.ok(rec.counts && (rec.counts.email || rec.counts.phone), 'counts are typed, never the raw values')
})

test('a company armed policy block word is removed from a stored skill', () => {
  const co = store.createCompany({ name: 'SkCo Titan', plan: 'premium' })
  const admin = store.createManagedUser({ username: 'sk-admin', password: 'Passw0rd!x', companyId: co.id, companyRole: 'company_admin', tier: 'premium' })
  store.setWorkPolicy({ companyId: co.id }, { armed: true, blockWords: ['Project Titan'], categories: {} }, admin.id)
  store.addSkill(admin.id, { title: 'Rollout', content: 'The Project Titan rollout: step one, deploy the gateway, then verify.' })
  const c = store.getSkillsFor(admin.id, { goal: 'rollout deploy gateway verify', app: '' })[0].content
  assert.ok(!/Project Titan/.test(c), 'the block word is gone from the stored skill')
  assert.ok(/\[BLOCKED\]/.test(c), 'replaced with [BLOCKED]')
})

test('company skills stay private across companies after scrub', () => {
  const coA = store.createCompany({ name: 'SkCo A', plan: 'premium' })
  const coB = store.createCompany({ name: 'SkCo B', plan: 'premium' })
  const a = store.createManagedUser({ username: 'skA', password: 'Passw0rd!x', companyId: coA.id, tier: 'basic' })
  const b = store.createManagedUser({ username: 'skB', password: 'Passw0rd!x', companyId: coB.id, tier: 'basic' })
  store.addSkill(a.id, { title: 'Portal', content: 'The approvals queue moved under Admin and Workflow for this company.' })
  assert.ok(store.getSkillsFor(a.id, { goal: 'approvals queue workflow', app: '' }).length === 1, 'company A sees its own skill')
  assert.equal(store.getSkillsFor(b.id, { goal: 'approvals queue workflow', app: '' }).length, 0, 'company B cannot see it')
})

test('admin re-upload (importCompanySkills) scrubs - this path formerly bypassed even secrets', () => {
  const co = store.createCompany({ name: 'SkCo Import', plan: 'premium' })
  const r = store.importCompanySkills(co.id, [
    { title: 'Backup one', content: 'Reach Jane at jane@x.com, call 212-555-0145, SSN 987-65-4321 before the deploy.' },
  ], { replace: true })
  assert.equal(r.count, 1)
  assert.ok(r.redacted >= 3, 'import reports what it stripped')
  const exp = store.exportCompanySkills(co.id)
  const c = exp[0].content
  assert.ok(!/jane@x\.com/.test(c) && !/212-555-0145/.test(c) && !/987-65-4321/.test(c), 'email + phone + SSN all redacted on import')
})

// The one-time migration must re-scrub skills that were stored RAW before this
// fix. Seed a legacy raw skill straight into the DB file (skill content is stored
// plaintext), reload the store fresh, and migrate.
test('migrateScrubStoredText re-scrubs pre-existing raw skills and is guarded', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wc-skills-mig-'))
  process.env.WORK_DATA_DIR = dir
  const seedStore = await import(storePath + '?migseed')
  const co = seedStore.createCompany({ name: 'LegacyCo', plan: 'premium' })
  // Inject a raw legacy skill directly into the persisted DB (simulates pre-fix data).
  const dbFile = path.join(dir, 'db.json')
  const db = JSON.parse(fs.readFileSync(dbFile, 'utf8'))
  const target = db.companies.find((c) => c.id === co.id)
  target.skills = [{ id: 'sklegacy', title: 'Legacy runbook', content: 'Phone the on-call at 415-867-5309, SSN 123-45-6789, host 192.168.44.9.', tags: '', at: '2026-01-01T00:00:00.000Z' }]
  fs.writeFileSync(dbFile, JSON.stringify(db))

  const migStore = await import(storePath + '?migrun')
  const m = migStore.migrateScrubStoredText()
  assert.ok(!m.skipped, 'migration runs the first time')
  assert.ok(m.redacted >= 3, 'the legacy raw values are stripped')
  const after = JSON.parse(fs.readFileSync(dbFile, 'utf8'))
  const skill = after.companies.find((c) => c.id === co.id).skills[0]
  assert.ok(!/415-867-5309/.test(skill.content) && !/123-45-6789/.test(skill.content) && !/192\.168\.44\.9/.test(skill.content), 'legacy skill content scrubbed on disk')
  assert.equal(migStore.migrateScrubStoredText().skipped, true, 'migration is guarded - a second run is a no-op')
})
