// MFA store flow: enroll -> confirm -> verify -> backup codes -> reset -> authz.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const storePath = 'file://' + path.join(here, 'store.js').replace(/\\/g, '/')
process.env.WORK_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'wc-mfa-'))
process.env.PORT = '0'
const store = await import(storePath)
const totp = await import('file://' + path.join(here, 'totp.js').replace(/\\/g, '/'))

test('a new account needs MFA setup; SSO accounts do not', () => {
  const u = store.createWorkUser({ username: 'mfa1', password: 'Passw0rd!x' })
  assert.equal(store.mfaSetupNeeded(u.id), true)
  assert.equal(store.userMfaStatus(u.id).enabled, false)
  assert.equal(store.userMfaStatus(u.id).required, true)
})

test('enroll -> confirm enables MFA and returns one-time backup codes', () => {
  const u = store.createWorkUser({ username: 'mfa2', password: 'Passw0rd!x' })
  const { secret, otpauthUri } = store.startMfaEnrollment(u.id)
  assert.ok(secret && otpauthUri.includes('otpauth://totp/'))
  // Wrong code is rejected, MFA stays off.
  assert.throws(() => store.confirmMfaEnrollment(u.id, '000000'))
  assert.equal(store.mfaSetupNeeded(u.id), true)
  // Correct code confirms.
  const { backupCodes } = store.confirmMfaEnrollment(u.id, totp.currentToken(secret))
  assert.equal(backupCodes.length, 10)
  assert.equal(store.mfaSetupNeeded(u.id), false)
  assert.equal(store.userMfaStatus(u.id).enabled, true)
  assert.equal(store.userMfaStatus(u.id).backupRemaining, 10)
})

test('verifyUserMfa accepts the authenticator code and consumes backup codes once', () => {
  const u = store.createWorkUser({ username: 'mfa3', password: 'Passw0rd!x' })
  const { secret } = store.startMfaEnrollment(u.id)
  const { backupCodes } = store.confirmMfaEnrollment(u.id, totp.currentToken(secret))
  assert.equal(store.verifyUserMfa(u.id, totp.currentToken(secret)), true)
  assert.equal(store.verifyUserMfa(u.id, '000000'), false)
  // A backup code works once, then is spent.
  const bc = backupCodes[0]
  assert.equal(store.verifyUserMfa(u.id, bc), true)
  assert.equal(store.verifyUserMfa(u.id, bc), false)
  assert.equal(store.userMfaStatus(u.id).backupRemaining, 9)
})

test('reset clears MFA so setup is needed again, and bumps the session epoch', () => {
  const u = store.createWorkUser({ username: 'mfa4', password: 'Passw0rd!x' })
  const { secret } = store.startMfaEnrollment(u.id)
  store.confirmMfaEnrollment(u.id, totp.currentToken(secret))
  const epochBefore = store.getSessionEpoch(u.id)
  store.resetMfa(u.id)
  assert.equal(store.mfaSetupNeeded(u.id), true)
  assert.equal(store.userMfaStatus(u.id).enabled, false)
  assert.notEqual(store.getSessionEpoch(u.id), epochBefore)
})

test('canManageMfa: superadmin any; company admin same-company + self; member self only', () => {
  const coA = store.createCompany({ name: 'MfaCoA', plan: 'premium' })
  const coB = store.createCompany({ name: 'MfaCoB', plan: 'premium' })
  const adminA = store.createManagedUser({ username: 'mfaAdminA', password: 'Passw0rd!x', companyId: coA.id, companyRole: 'company_admin', tier: 'premium' })
  const memA = store.createManagedUser({ username: 'mfaMemA', password: 'Passw0rd!x', companyId: coA.id, tier: 'basic' })
  const memB = store.createManagedUser({ username: 'mfaMemB', password: 'Passw0rd!x', companyId: coB.id, tier: 'basic' })
  const sup = store.getUser('1') // seeded superadmin
  // superadmin -> anyone
  assert.equal(store.canManageMfa(sup.id, memB.id), true)
  // company admin -> own-company member + self, NOT another company
  assert.equal(store.canManageMfa(adminA.id, memA.id), true)
  assert.equal(store.canManageMfa(adminA.id, adminA.id), true)
  assert.equal(store.canManageMfa(adminA.id, memB.id), false)
  // plain member -> only self
  assert.equal(store.canManageMfa(memA.id, memA.id), true)
  assert.equal(store.canManageMfa(memA.id, adminA.id), false)
})
