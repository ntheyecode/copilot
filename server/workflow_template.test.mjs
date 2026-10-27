// Workflow-template layer (the "private brain" / task-workflow knowledge base).
// A clean task success is distilled by work.js into a de-identified WORKFLOW TEMPLATE
// and persisted here, so a similar future task is served from proven data instead of a
// cold AI plan. These tests pin the STORE contract: capture scrubs + stores, dedupe/
// supersede by goalSig+app keeps ONE prior version and bumps hits, the cap evicts the
// oldest, decay drops stale templates, tenant isolation holds (company A never sees
// company B; solo users land in the platform brain), serving bumps hits + freshness,
// and empty/unknown input is a safe no-op that never throws.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const storePath = 'file://' + path.join(here, 'store.js').replace(/\\/g, '/')
process.env.WORK_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'wc-wftpl-'))
process.env.PORT = '0'
const store = await import(storePath)

const rnd = () => Math.random().toString(36).slice(2, 8)
const mkCompanyUser = () => {
  const co = store.createCompany({ name: 'Brain Corp ' + rnd(), plan: 'premium' })
  const admin = store.createManagedUser({ username: 'wfadm' + rnd(), password: 'Passw0rd!x', companyId: co.id, tier: 'premium' })
  return { co, admin }
}
const mkSoloUser = () => store.createWorkUser({ username: 'solo' + rnd(), password: 'Passw0rd!x' })

// A distilled record as work.js would hand it in.
const rec = (over = {}) => ({
  goalSig: 'deactivate a former employee okta account',
  app: 'okta',
  appVersion: '2024.x',
  environment: { jurisdiction: 'US-CA', software: ['okta'] },
  steps: [
    { n: 1, text: 'open the Okta admin console Directory People', selection: 'Directory > People' },
    { n: 2, text: 'find the user and choose Deactivate', selection: 'Deactivate' },
  ],
  selections: ['Directory > People', 'Deactivate'],
  successAt: new Date().toISOString(),
  sourceSessionId: 'ws_src_' + rnd(),
  confidence: 0.6,
  ...over,
})

test('capture stores a template and scrubs human-readable fields', () => {
  const { admin } = mkCompanyUser()
  const stored = store.captureWorkflowTemplate(admin.id, rec({
    goalSig: 'email john.doe@acme.com about okta reset my SSN is 123-45-6789',
    steps: [{ n: 1, text: 'call 415-555-1212 then open Directory', selection: 'Directory' }],
  }))
  assert.ok(stored && stored.id.startsWith('wt'), 'returns a stored record with a wt id')
  assert.equal(stored.status, 'active')
  assert.equal(stored.version, 1)
  assert.equal(stored.hits, 0)
  assert.equal(stored.priorVersion, null)
  assert.ok(stored.freshnessAt && stored.createdAt && stored.updatedAt)
  // The scrub chokepoint must have removed the obvious PII before storage.
  const blob = JSON.stringify(stored).toLowerCase()
  assert.ok(!blob.includes('john.doe@acme.com'), 'email scrubbed')
  assert.ok(!blob.includes('123-45-6789'), 'SSN scrubbed')
  assert.ok(!blob.includes('415-555-1212'), 'phone scrubbed')
  // And it is actually retrievable from the holder.
  const list = store.getWorkflowTemplates(admin.id)
  assert.equal(list.length, 1)
  assert.equal(list[0].id, stored.id)
})

test('dedupe/supersede by goalSig+app keeps ONE prior version and bumps hits', () => {
  const { admin } = mkCompanyUser()
  const first = store.captureWorkflowTemplate(admin.id, rec())
  assert.equal(first.version, 1)
  // Same goalSig + app, different steps -> supersede in place, not a duplicate.
  const second = store.captureWorkflowTemplate(admin.id, rec({
    steps: [{ n: 1, text: 'open Directory then People then Deactivate the account', selection: 'Deactivate' }],
    confidence: 0.8,
  }))
  const active = store.getWorkflowTemplates(admin.id)
  assert.equal(active.length, 1, 'no parallel duplicate - single source of truth')
  assert.equal(second.id, first.id, 'same record id, superseded in place')
  assert.equal(second.version, 2, 'version bumped')
  assert.equal(second.hits, 1, 'hits bumped on recapture')
  assert.ok(second.priorVersion, 'one prior version kept')
  assert.equal(second.priorVersion.version, 1)
  assert.equal(second.confidence, 0.8, 'confidence updated from the new record')
  // A THIRD capture keeps exactly ONE prior version (no prior-of-prior nesting).
  const third = store.captureWorkflowTemplate(admin.id, rec({ steps: [{ n: 1, text: 'open the people directory and deactivate', selection: 'x' }] }))
  assert.equal(third.version, 3)
  assert.equal(third.hits, 2)
  assert.equal(third.priorVersion.version, 2)
  assert.equal(third.priorVersion.priorVersion, undefined, 'prior version does not nest its own prior')
})

test('a different app with the same goal is a SEPARATE template', () => {
  const { admin } = mkCompanyUser()
  store.captureWorkflowTemplate(admin.id, rec({ app: 'okta' }))
  store.captureWorkflowTemplate(admin.id, rec({ app: 'entra' }))
  assert.equal(store.getWorkflowTemplates(admin.id).length, 2)
})

test('cap ~500 evicts the oldest (LRU by freshness)', () => {
  const { admin } = mkCompanyUser()
  // Insert well past the cap; each is a distinct goalSig so no dedupe collapses them.
  const total = 520
  for (let i = 0; i < total; i++) {
    store.captureWorkflowTemplate(admin.id, rec({ goalSig: `unique workflow number ${i} for this tenant`, app: 'app' + i }))
  }
  const active = store.getWorkflowTemplates(admin.id)
  assert.equal(active.length, 500, 'holder is capped at TEMPLATE_CAP')
  // The earliest-inserted (oldest freshness) should have been evicted.
  const sigs = new Set(active.map((t) => t.goalSig))
  assert.ok(!sigs.has('unique workflow number 0 for this tenant'), 'oldest evicted')
  assert.ok(sigs.has(`unique workflow number ${total - 1} for this tenant`), 'newest kept')
})

test('decay drops templates unused for more than 90 days, enforces cap', () => {
  const { admin } = mkCompanyUser()
  const fresh = store.captureWorkflowTemplate(admin.id, rec({ goalSig: 'fresh workflow kept', app: 'a' }))
  const stale = store.captureWorkflowTemplate(admin.id, rec({ goalSig: 'stale workflow dropped', app: 'b' }))
  // Backdate the stale one past the decay window (freshnessAt 120 days ago).
  const list = store.getWorkflowTemplates(admin.id)
  const staleRec = list.find((t) => t.id === stale.id)
  staleRec.freshnessAt = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString()
  const dropped = store.decayWorkflowTemplates(admin.id)
  assert.equal(dropped, 1)
  const after = store.getWorkflowTemplates(admin.id)
  assert.equal(after.length, 1)
  assert.equal(after[0].id, fresh.id, 'the fresh template survives')
})

test('recordTemplateServed bumps hits and refreshes freshness', async () => {
  const { admin } = mkCompanyUser()
  const t = store.captureWorkflowTemplate(admin.id, rec())
  const before = t.freshnessAt
  await new Promise((r) => setTimeout(r, 5))
  const served = store.recordTemplateServed(admin.id, t.id)
  assert.equal(served.hits, 1)
  assert.ok(Date.parse(served.freshnessAt) >= Date.parse(before), 'freshness refreshed')
  const served2 = store.recordTemplateServed(admin.id, t.id)
  assert.equal(served2.hits, 2)
})

test('supersedeTemplate self-heals steps, keeps hits + one prior version', () => {
  const { admin } = mkCompanyUser()
  const t = store.captureWorkflowTemplate(admin.id, rec())
  store.recordTemplateServed(admin.id, t.id)  // hits -> 1
  const healed = store.supersedeTemplate(admin.id, t.id, rec({
    steps: [{ n: 1, text: 'the control moved - now open Admin then Users then Deactivate', selection: 'Users' }],
  }))
  assert.equal(healed.id, t.id)
  assert.equal(healed.version, 2, 'version bumped on self-heal')
  assert.equal(healed.hits, 1, 'self-heal is not a new serve; hits preserved')
  assert.ok(healed.priorVersion && healed.priorVersion.version === 1, 'one prior version kept')
  const blob = JSON.stringify(healed.steps).toLowerCase()
  assert.ok(blob.includes('control moved'), 'steps replaced with the corrected flow')
})

test('tenant isolation: company A cannot see company B; solo -> platform brain', () => {
  const a = mkCompanyUser()
  const b = mkCompanyUser()
  store.captureWorkflowTemplate(a.admin.id, rec({ goalSig: 'company A private workflow', app: 'okta' }))
  store.captureWorkflowTemplate(b.admin.id, rec({ goalSig: 'company B private workflow', app: 'okta' }))
  const aList = store.getWorkflowTemplates(a.admin.id)
  const bList = store.getWorkflowTemplates(b.admin.id)
  assert.equal(aList.length, 1)
  assert.equal(bList.length, 1)
  assert.equal(aList[0].goalSig, 'company A private workflow')
  assert.equal(bList[0].goalSig, 'company B private workflow')
  // Company-admin reader is scoped to the one company's brain.
  assert.equal(store.getCompanyWorkflowTemplates(a.co.id).length, 1)
  assert.equal(store.getCompanyWorkflowTemplates(b.co.id).length, 1)
  assert.equal(store.getCompanyWorkflowTemplates(a.co.id)[0].goalSig, 'company A private workflow')
  // A solo user's template lives in the PLATFORM brain, not any company's.
  const solo = mkSoloUser()
  store.captureWorkflowTemplate(solo.id, rec({ goalSig: 'solo platform workflow', app: 'okta' }))
  const soloList = store.getWorkflowTemplates(solo.id)
  assert.ok(soloList.some((t) => t.goalSig === 'solo platform workflow'))
  // The solo template never leaked into either company's private brain.
  assert.ok(!store.getCompanyWorkflowTemplates(a.co.id).some((t) => t.goalSig === 'solo platform workflow'))
  assert.ok(!store.getCompanyWorkflowTemplates(b.co.id).some((t) => t.goalSig === 'solo platform workflow'))
})

test('kbEnabled=false disables the brain (no capture, no retrieval) - no silent fallback to another store', () => {
  const { co, admin } = mkCompanyUser()
  store.setCompanyKbEnabled(co.id, false)
  const r = store.captureWorkflowTemplate(admin.id, rec())
  assert.equal(r, null, 'capture is a no-op when the brain is off')
  assert.deepEqual(store.getWorkflowTemplates(admin.id), [])
})

test('listWorkflowTemplatesMeta returns the light admin shape', () => {
  const { admin } = mkCompanyUser()
  const t = store.captureWorkflowTemplate(admin.id, rec())
  const meta = store.listWorkflowTemplatesMeta(admin.id)
  assert.equal(meta.length, 1)
  assert.deepEqual(Object.keys(meta[0]).sort(), ['app', 'confidence', 'goalSig', 'hits', 'id', 'updatedAt', 'version'])
  assert.equal(meta[0].id, t.id)
})

test('empty / unknown input is a safe no-op and never throws', () => {
  const { admin } = mkCompanyUser()
  assert.doesNotThrow(() => {
    assert.equal(store.captureWorkflowTemplate('no-such-user', rec()), null)
    assert.equal(store.captureWorkflowTemplate(admin.id, null), null)
    assert.equal(store.captureWorkflowTemplate(admin.id, {}), null, 'no goalSig -> no-op')
    assert.equal(store.captureWorkflowTemplate(admin.id, { goalSig: '   ' }), null)
    assert.deepEqual(store.getWorkflowTemplates('no-such-user'), [])
    assert.equal(store.recordTemplateServed(admin.id, 'wt_missing'), null)
    assert.equal(store.recordTemplateServed('no-such-user', 'wt_x'), null)
    assert.equal(store.supersedeTemplate(admin.id, 'wt_missing', rec()), null)
    assert.equal(store.decayWorkflowTemplates('no-such-user'), 0)
    assert.deepEqual(store.listWorkflowTemplatesMeta('no-such-user'), [])
    assert.deepEqual(store.getCompanyWorkflowTemplates('co_missing'), [])
    assert.equal(store.getCompanyWorkflowTemplatesCount('co_missing'), 0)
  })
})
