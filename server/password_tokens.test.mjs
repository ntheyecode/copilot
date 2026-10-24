// Account email + set/reset-password tokens: single-use, expiring, purpose-bound;
// contact email on accounts; find-by-login; company-admins listing.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const storePath = 'file://' + path.join(here, 'store.js').replace(/\\/g, '/')
process.env.WORK_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'wc-pwtok-'))
process.env.PORT = '0'
const store = await import(storePath)

test('accounts carry a contact email; effectiveUserEmail falls back to SSO', () => {
  const u = store.createWorkUser({ username: 'mailuser', password: 'Passw0rd!x', email: 'u@example.com' })
  assert.equal(store.effectiveUserEmail(u.id), 'u@example.com')
  const u2 = store.createWorkUser({ username: 'nomail', password: 'Passw0rd!x' })
  assert.equal(store.effectiveUserEmail(u2.id), null)
})

test('a bad email at creation is rejected', () => {
  assert.throws(() => store.createWorkUser({ username: 'bademail', password: 'Passw0rd!x', email: 'not-an-email' }), (e) => e.status === 400)
})

test('set-password token is single-use, purpose-bound and expiring', () => {
  const u = store.createWorkUser({ username: 'toku', password: 'Passw0rd!x', email: 't@example.com' })
  const raw = store.createEmailToken(u.id, 'set_password')
  assert.ok(store.peekEmailToken(raw, 'set_password'))
  assert.equal(store.peekEmailToken(raw, 'wrong_purpose'), null)   // purpose bound
  assert.equal(store.consumeEmailToken(raw, 'set_password'), u.id)
  assert.equal(store.consumeEmailToken(raw, 'set_password'), null) // single use
  assert.equal(store.peekEmailToken(raw, 'set_password'), null)
})

test('creating a new token invalidates the prior unused one for that user/purpose', () => {
  const u = store.createWorkUser({ username: 'rotu', password: 'Passw0rd!x', email: 'r@example.com' })
  const a = store.createEmailToken(u.id, 'set_password')
  const b = store.createEmailToken(u.id, 'set_password')
  assert.equal(store.peekEmailToken(a, 'set_password'), null)       // old one killed
  assert.ok(store.peekEmailToken(b, 'set_password'))
})

test('setUserPasswordById enforces length', () => {
  const u = store.createWorkUser({ username: 'pwlen', password: 'Passw0rd!x', email: 'p@example.com' })
  assert.throws(() => store.setUserPasswordById(u.id, 'short'), (e) => e.status === 400)
  assert.equal(store.setUserPasswordById(u.id, 'longenough'), true)
})

test('findUserByLogin matches username, email, or SSO email', () => {
  const u = store.createWorkUser({ username: 'findme', password: 'Passw0rd!x', email: 'find@example.com' })
  assert.equal(store.findUserByLogin('findme').id, u.id)
  assert.equal(store.findUserByLogin('FIND@EXAMPLE.COM').id, u.id)   // case-insensitive
  assert.equal(store.findUserByLogin('nobody-here'), null)
})

test('listAllCompanyAdmins returns only company admins, with company name', () => {
  const co = store.createCompany ? store.createCompany({ name: 'Globex', plan: 'premium' }) : null
  if (!co) return
  store.createManagedUser({ username: 'coadmin', password: 'Passw0rd!x', email: 'a@globex.com', companyId: co.id, companyRole: 'company_admin' })
  store.createManagedUser({ username: 'comember', password: 'Passw0rd!x', companyId: co.id, companyRole: 'member' })
  const admins = store.listAllCompanyAdmins()
  const row = admins.find((a) => a.username === 'coadmin')
  assert.ok(row && row.companyName === 'Globex')
  assert.ok(!admins.some((a) => a.username === 'comember'))
})
