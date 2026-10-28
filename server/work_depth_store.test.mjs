// Guidance-depth store setters: the superadmin ceiling and the company-admin pool
// assignment, with the clamp (a pool can never exceed the ceiling - SUPREME III/VI).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const storePath = 'file://' + path.join(here, 'store.js').replace(/\\/g, '/')
process.env.WORK_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'wc-depth-'))
process.env.PORT = '0'
const store = await import(storePath)
const uniq = (p) => p + Math.random().toString(36).slice(2, 7)

test('company ceiling defaults from plan; a pool assignment is clamped to the ceiling', () => {
  const co = store.createCompany({ name: uniq('DepthCo'), plan: 'basic', seats: 5 })
  // basic plan -> default ceiling 'standard'
  assert.equal(store.getCompanyGuidanceDepth(co.id), 'standard')
  // a pool set to deep is clamped back to the standard ceiling
  assert.equal(store.setCompanyPoolDepth(co.id, 'members', 'deep'), 'standard')
  assert.deepEqual(store.getCompanyPoolDepths(co.id), { members: 'standard' })
  // superadmin raises the ceiling to deep -> a deep pool now sticks
  assert.equal(store.setCompanyGuidanceDepth(co.id, 'deep'), 'deep')
  assert.equal(store.setCompanyPoolDepth(co.id, 'members', 'deep'), 'deep')
  assert.deepEqual(store.getCompanyPoolDepths(co.id), { members: 'deep' })
  // a pool can still be held BELOW the ceiling
  assert.equal(store.setCompanyPoolDepth(co.id, 'contractors', 'standard'), 'standard')
})

test('a premium-plan company defaults to a deep ceiling', () => {
  const co = store.createCompany({ name: uniq('PremCo'), plan: 'premium', seats: 5 })
  assert.equal(store.getCompanyGuidanceDepth(co.id), 'deep')
})
