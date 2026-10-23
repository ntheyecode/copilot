// Platform AI provider management + the AI-config OTP step-up gate.
//   - adminAiProviders / setAiProviderKey / setActivePlatformProvider / clearAiProvider
//   - aiStepUpStatus / verifyAiStepUp / requireAiStepUpActive / clearAiStepUp
// These back the superadmin "AI providers & keys" panel and its OTP lock.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const storePath = 'file://' + path.join(here, 'store.js').replace(/\\/g, '/')
process.env.WORK_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'wc-aiprov-'))
process.env.PORT = '0'
delete process.env.WORK_MFA_DISABLED
const store = await import(storePath)
const totp = await import('file://' + path.join(here, 'totp.js').replace(/\\/g, '/'))

test('adminAiProviders lists every provider, none configured at first, no raw key', () => {
  const list = store.adminAiProviders()
  assert.ok(list.length >= 4)
  const ids = list.map((p) => p.id)
  for (const id of ['groq', 'openai', 'gemini', 'openrouter']) assert.ok(ids.includes(id), `missing ${id}`)
  for (const p of list) {
    assert.equal(p.configured, false)
    assert.equal(p.active, false)
    assert.equal(p.keyMasked, null)
    assert.ok(!('apiKey' in p), 'raw key must never be listed')
    assert.ok(Array.isArray(p.chatModels))
  }
})

test('setAiProviderKey configures a provider, masks the key, and auto-activates the first one', () => {
  store.setAiProviderKey('openrouter', { apiKey: 'sk-or-v1-TESTKEY1234', chatModel: 'qwen/qwen3.7-flash' })
  const or = store.adminAiProviders().find((p) => p.id === 'openrouter')
  assert.equal(or.configured, true)
  assert.equal(or.active, true, 'first configured provider becomes active')
  assert.equal(or.chatModel, 'qwen/qwen3.7-flash')
  assert.ok(or.keyMasked && or.keyMasked.endsWith('1234'))
  assert.ok(!or.keyMasked.includes('TESTKEY'), 'only a tail is shown')
  assert.equal(store.getActiveProviderId(), 'openrouter')
})

test('a second key does NOT steal active; setActivePlatformProvider makes it primary', () => {
  store.setAiProviderKey('gemini', { apiKey: 'AIza-TESTKEY-5678' })
  assert.equal(store.getActiveProviderId(), 'openrouter')          // unchanged
  store.setActivePlatformProvider('gemini')
  assert.equal(store.getActiveProviderId(), 'gemini')
  const list = store.adminAiProviders()
  assert.equal(list.find((p) => p.id === 'gemini').active, true)
  assert.equal(list.find((p) => p.id === 'openrouter').active, false)
})

test('cannot make an unconfigured provider primary', () => {
  assert.throws(() => store.setActivePlatformProvider('groq'), /save a key/i)
})

test('clearAiProvider removes the key and hands active to another configured one', () => {
  store.clearAiProvider('gemini')                                  // gemini was active
  const list = store.adminAiProviders()
  assert.equal(list.find((p) => p.id === 'gemini').configured, false)
  assert.equal(store.getActiveProviderId(), 'openrouter', 'active falls back to the remaining key')
})

// ---- OTP step-up gate -----------------------------------------------------
test('step-up is locked until a valid authenticator code is verified', () => {
  const u = store.createWorkUser({ username: 'super-otp', password: 'Passw0rd!x' })
  const { secret } = store.startMfaEnrollment(u.id)
  store.confirmMfaEnrollment(u.id, totp.currentToken(secret))

  // Locked before any verification.
  assert.equal(store.aiStepUpStatus(u.id).active, false)
  assert.throws(() => store.requireAiStepUpActive(u.id), (e) => e.status === 403 && e.locked === true)

  // Wrong code stays locked.
  assert.throws(() => store.verifyAiStepUp(u.id, '000000'), (e) => e.status === 401)
  assert.equal(store.aiStepUpStatus(u.id).active, false)

  // Correct code opens the window.
  const st = store.verifyAiStepUp(u.id, totp.currentToken(secret))
  assert.equal(st.active, true)
  assert.ok(st.until > Date.now())
  assert.doesNotThrow(() => store.requireAiStepUpActive(u.id))

  // Lock now closes it again.
  store.clearAiStepUp(u.id)
  assert.equal(store.aiStepUpStatus(u.id).active, false)
})

test('an un-enrolled account cannot open the gate (must set up MFA first)', () => {
  const u = store.createWorkUser({ username: 'noenroll-otp', password: 'Passw0rd!x' })
  assert.equal(store.aiStepUpStatus(u.id).mfaEnrolled, false)
  assert.throws(() => store.verifyAiStepUp(u.id, '123456'), (e) => e.status === 403)
})

test('break-glass (WORK_MFA_DISABLED) opens the gate without a code', async () => {
  process.env.WORK_MFA_DISABLED = '1'
  const freshDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wc-aiprov-bg-'))
  process.env.WORK_DATA_DIR = freshDir
  const s2 = await import(storePath + '?bg=1')     // fresh module instance
  const u = s2.createWorkUser({ username: 'bguser', password: 'Passw0rd!x' })
  const st = s2.aiStepUpStatus(u.id)
  assert.equal(st.breakGlass, true)
  assert.equal(st.active, true, 'gate opens when OTP is off platform-wide')
  assert.doesNotThrow(() => s2.requireAiStepUpActive(u.id))
  delete process.env.WORK_MFA_DISABLED
})
