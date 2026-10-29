import test from 'node:test'
import assert from 'node:assert/strict'
import { makeExportKey } from './export_key.js'

const seal = (p) => `enc:${p}`
const open = (c) => String(c).replace(/^enc:/, '')
function mk({ hosted = false, mfaOn = true } = {}) {
  return makeExportKey({ seal, open, verifyMfa: (u, t) => t === 'good', hosted, mfaGloballyEnabled: () => mfaOn })
}

test('set requires a 10+ char passphrase and seals it', () => {
  const ek = mk()
  assert.throws(() => ek.set({}, 'short'), /at least 10/)
  assert.equal(ek.set({}, 'longenough-pass'), 'enc:longenough-pass')
})

test('on-prem: set, replace, and reveal need no MFA', () => {
  const ek = mk({ hosted: false })
  const user = { mfa: { enabled: true }, exportKeyEnc: seal('existing-pass') }
  assert.equal(ek.stepUpNeeded(user), false)
  assert.doesNotThrow(() => ek.set(user, 'replacement-pass'))
  assert.equal(ek.reveal(user).passphrase, 'existing-pass')
})

test('hosted + MFA enrolled: replace and reveal need a fresh code; first set is free', () => {
  const ek = mk({ hosted: true })
  const user = { id: 'u', mfa: { enabled: true }, exportKeyEnc: seal('secret-pass') }
  assert.equal(ek.stepUpNeeded(user), true)
  assert.throws(() => ek.reveal(user, {}), /authenticator code/)
  assert.throws(() => ek.reveal(user, { mfaToken: 'bad' }), /authenticator code/)
  assert.equal(ek.reveal(user, { mfaToken: 'good' }).passphrase, 'secret-pass')
  assert.throws(() => ek.set(user, 'another-pass', {}), /authenticator code/)
  assert.doesNotThrow(() => ek.set(user, 'another-pass', { mfaToken: 'good' }))
  assert.doesNotThrow(() => ek.set({ id: 'u2', mfa: { enabled: true } }, 'first-pass'))   // no existing key -> free
})

test('hosted but no MFA enrolled, or MFA globally off: no step-up', () => {
  assert.equal(mk({ hosted: true }).stepUpNeeded({ mfa: { enabled: false } }), false)
  assert.equal(mk({ hosted: true, mfaOn: false }).stepUpNeeded({ mfa: { enabled: true } }), false)
})

test('reveal on an unset key returns set:false', () => {
  assert.deepEqual(mk().reveal({}), { set: false, passphrase: null })
})
