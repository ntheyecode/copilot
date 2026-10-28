// KB-spaces: company knowledge collections, space-scoped grounding, admin
// curation, orphan fallback, member-readable list.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const storePath = 'file://' + path.join(here, 'store.js').replace(/\\/g, '/')
process.env.WORK_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'wc-kbsp-'))
process.env.PORT = '0'
const store = await import(storePath)
const uniq = (p) => p + Math.random().toString(36).slice(2, 7)

test('spaces: create (deduped), scope grounding, count, curate, orphan on remove', () => {
  const co = store.createCompany({ name: uniq('Co') })
  const u = store.createManagedUser({ username: uniq('u'), password: 'Passw0rd!x', companyId: co.id })
  const sec = store.addCompanyKbSpace(co.id, 'Security')
  const run = store.addCompanyKbSpace(co.id, 'Runbooks')
  assert.throws(() => store.addCompanyKbSpace(co.id, 'security'), /already exists/i)   // case-insensitive dedupe
  const l1 = store.addLearning(u.id, { app: 'AWS', fact: 'Enable MFA before exposing the console', space: sec.id })
  const l2 = store.addLearning(u.id, { app: 'Deploy', fact: 'Stage in a sandbox before production first', space: run.id })
  const l3 = store.addLearning(u.id, { app: 'General', fact: 'Always take a restorable backup first thing' })   // ungrouped
  assert.ok(l1 && l2 && l3)
  // Scoped to Security: its learnings + ungrouped (always eligible), not Runbooks'.
  const scoped = store.getLearningsFor(u.id, { goal: 'mfa sandbox backup', space: sec.id })
  assert.ok(scoped.some((x) => x.id === l1.id))
  assert.ok(scoped.some((x) => x.id === l3.id))
  assert.ok(!scoped.some((x) => x.id === l2.id))
  // Unscoped sees all three.
  assert.ok(store.getLearningsFor(u.id, { goal: 'mfa sandbox backup' }).length >= 3)
  // Counts + member-readable list.
  assert.equal(store.listCompanyKbSpaces(co.id).find((s) => s.id === sec.id).count, 1)
  assert.equal(store.kbSpacesForUser(u.id).length, 2)
  // Curate: move the ungrouped learning into Runbooks.
  store.setCompanyLearningSpace(co.id, l3.id, run.id)
  assert.equal(store.listCompanyKbSpaces(co.id).find((s) => s.id === run.id).count, 2)
  assert.throws(() => store.setCompanyLearningSpace(co.id, l3.id, 'ks_nope'), /unknown space/i)
  // Remove Runbooks: its learnings fall back to ungrouped (not deleted).
  store.removeCompanyKbSpace(co.id, run.id)
  assert.equal(store.kbSpacesForUser(u.id).length, 1)
  assert.equal(store.getLearningsFor(u.id, { goal: 'sandbox backup' }).length >= 2, true)   // l2,l3 still exist, ungrouped now
})
