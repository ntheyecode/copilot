// Server-side object-level authorization (BOLA / cross-tenant) closure evidence
// (APP-01, DAT-04). Every session getter/mutator is keyed by the CALLER's id, so
// user B (or an admin of another company) can never read or change user A's
// objects, and company oversight is strictly scoped to the caller's own company.
// SYNTHETIC users/companies only, in an isolated temp data dir.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const storePath = new URL('./store.js', import.meta.url).href
process.env.WORK_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'wc-authz-'))
process.env.PORT = '0'
const store = await import(storePath)

const is404 = (e) => e && e.status === 404

// Two companies, each with one admin and one member, plus two standalone users.
const coA = store.createCompany({ name: 'Tenant Alpha Test', seats: 5, adminSeats: 2 })
const coB = store.createCompany({ name: 'Tenant Bravo Test', seats: 5, adminSeats: 2 })
const adminA = store.createManagedUser({ username: 'admin_alpha', password: 'Passw0rd!x', companyId: coA.id, companyRole: 'company_admin' })
const memberA = store.createManagedUser({ username: 'member_alpha', password: 'Passw0rd!x', companyId: coA.id, companyRole: 'member' })
const adminB = store.createManagedUser({ username: 'admin_bravo', password: 'Passw0rd!x', companyId: coB.id, companyRole: 'company_admin' })
const memberB = store.createManagedUser({ username: 'member_bravo', password: 'Passw0rd!x', companyId: coB.id, companyRole: 'member' })
const userA = store.createWorkUser({ username: 'solo_alice', password: 'Passw0rd!x' })
const userB = store.createWorkUser({ username: 'solo_bob', password: 'Passw0rd!x' })

const sA = store.createWorkSession(userA.id, { goal: 'alice private goal' })
const sB = store.createWorkSession(userB.id, { goal: 'bob private goal' })

test('a session is retrievable only with its owner id', () => {
  assert.equal(store.getWorkSession(userA.id, sA.id).goal, 'alice private goal')
  assert.equal(store.getWorkSession(userB.id, sB.id).goal, 'bob private goal')
  assert.equal(store.getWorkSession(userB.id, sA.id), null, 'B cannot fetch A\'s session by id')
  assert.equal(store.getWorkSession(userA.id, sB.id), null, 'A cannot fetch B\'s session by id')
})

test('listing returns only the caller\'s sessions', () => {
  const idsA = store.listWorkSessions(userA.id).map((s) => s.id)
  const idsB = store.listWorkSessions(userB.id).map((s) => s.id)
  assert.ok(idsA.includes(sA.id) && !idsA.includes(sB.id))
  assert.ok(idsB.includes(sB.id) && !idsB.includes(sA.id))
  assert.deepEqual(store.listWorkSessions('nonexistent-user-id'), [])
})

test('every session mutator refuses a non-owner (404) and leaves the object untouched', () => {
  const before = JSON.stringify(store.getWorkSession(userA.id, sA.id))
  assert.throws(() => store.setWorkSessionGoal(userB.id, sA.id, 'hijacked'), is404)
  assert.throws(() => store.appendWorkEvent(userB.id, sA.id, { kind: 'guidance', text: 'injected' }), is404)
  assert.throws(() => store.setWorkSessionMode(userB.id, sA.id, 'watch'), is404)
  assert.throws(() => store.setWorkSessionPaused(userB.id, sA.id, true), is404)
  assert.throws(() => store.setWorkSessionSteps(userB.id, sA.id, [{ do: 'x' }]), is404)
  assert.throws(() => store.endWorkSession(userB.id, sA.id), is404)
  assert.throws(() => store.deleteWorkSession(userB.id, sA.id, 'malicious'), is404)
  assert.equal(store.setWorkDeliverables(userB.id, sA.id, { x: 1 }), null, 'deliverables write is scoped too')
  assert.equal(JSON.stringify(store.getWorkSession(userA.id, sA.id)), before, 'A\'s session is byte-identical')
  assert.ok(store.getWorkSession(userA.id, sA.id), 'A\'s session still exists')
})

test('the owner can still mutate their own session (the controls are not a blanket deny)', () => {
  store.setWorkSessionGoal(userA.id, sA.id, 'alice updated goal')
  assert.equal(store.getWorkSession(userA.id, sA.id).goal, 'alice updated goal')
})

test('company oversight returns only the caller\'s company sessions', () => {
  const sMA = store.createWorkSession(memberA.id, { goal: 'alpha member work' })
  const sMB = store.createWorkSession(memberB.id, { goal: 'bravo member work' })
  const listA = store.listWorkSessionsForCompany(coA.id).map((s) => s.id)
  const listB = store.listWorkSessionsForCompany(coB.id).map((s) => s.id)
  assert.ok(listA.includes(sMA.id) && !listA.includes(sMB.id) && !listA.includes(sA.id) && !listA.includes(sB.id))
  assert.ok(listB.includes(sMB.id) && !listB.includes(sMA.id))
  assert.deepEqual(store.listWorkSessionsForCompany('co-does-not-exist'), [])
})

test('a company admin can read own-company sessions but never another company\'s', () => {
  const sMA = store.createWorkSession(memberA.id, { goal: 'alpha report session' })
  assert.ok(store.getWorkSessionForCompanyAdmin(adminA.id, sMA.id), 'own admin allowed')
  assert.equal(store.getWorkSessionForCompanyAdmin(adminB.id, sMA.id), null, 'other company\'s admin denied')
  assert.equal(store.getWorkSessionForCompanyAdmin(memberA.id, sMA.id), null, 'a plain member is not an admin')
  assert.equal(store.getWorkSessionForCompanyAdmin(userB.id, sMA.id), null, 'standalone user denied')
  assert.equal(store.getWorkSessionForCompanyAdmin(adminA.id, sA.id), null, 'admin cannot reach a standalone user\'s session')
})

test('company admin member-management is scoped to their own company', () => {
  assert.throws(() => store.updateCompanyMember(coA.id, memberB.id, { tier: 'premium' }), is404)
  assert.throws(() => store.removeCompanyMember(coA.id, memberB.id), is404)
  assert.throws(() => store.updateCompanyMember(null, memberA.id, { tier: 'premium' }), (e) => e.status === 403)
  assert.equal(store.listCompanyUsers(coB.id).find((u) => u.id === memberB.id).companyId, coB.id, 'B\'s member untouched')
  const idsA = store.listCompanyUsers(coA.id).map((u) => u.id)
  assert.ok(idsA.includes(memberA.id) && !idsA.includes(memberB.id) && !idsA.includes(adminB.id))
})

test('public user shape never carries credential material', () => {
  // createWorkUser returns the internal record; the signup/login/me routes always
  // wrap it with publicWorkUser before responding, so that is the shape to check.
  const raw = store.getWorkUser(userA.id)
  assert.ok(raw.passwordHash, 'sanity: the internal record does hold a hash')
  for (const u of [store.publicWorkUser(raw), store.publicWorkUser(store.getWorkUser(adminB.id)), memberA]) {
    assert.ok(!('passwordHash' in u), 'no passwordHash field')
    assert.ok(!/passwordHash|\$2[aby]\$/.test(JSON.stringify(u)), 'no bcrypt hash anywhere in the public shape')
  }
  for (const u of store.listCompanyUsers(coA.id)) assert.ok(!('passwordHash' in u))
})
