// ===========================================================================
// WorkCoPilot EXECUTIVE EXPORT PASSPHRASE: pure logic for the key that encrypts
// the Company Brain download. The passphrase is stored ENCRYPTED AT REST on the
// executive's account (sealed under the platform KEK) and reused at download, so
// it is viewable and replaceable from their profile. On the HOSTED service,
// viewing or replacing an EXISTING key needs a fresh MFA code (step-up) when the
// account has MFA enrolled; on-premise the operator sets it freely. The FIRST
// set (no key yet) is always free, so a download can prompt for it inline.
//
// Dependency-injected (seal / open / verifyMfa / hosted / mfaGloballyEnabled) so
// the whole policy is unit-tested; store.js wires the real KEK + MFA.
// ===========================================================================

import { makeMfaStepUp } from './mfa_step_up.js'

export const MIN_EXPORT_PASSPHRASE = 10

function err(status, message) { const e = new Error(message); e.status = status; return e }

// deps: { seal(plain)->cipher, open(cipher)->plain, verifyMfa(user, token)->bool,
//         hosted:boolean, mfaGloballyEnabled():boolean }
export function makeExportKey(deps) {
  const { seal, open, verifyMfa, hosted, mfaGloballyEnabled } = deps

  // A fresh MFA code is required to view/replace an existing key only on the
  // hosted service, only when MFA is globally on, and only for an enrolled user.
  // The rule itself is the shared one in mfa_step_up.js (company API keys use it too).
  const policy = makeMfaStepUp({ verifyMfa, hosted, mfaGloballyEnabled })
  const stepUpNeeded = policy.stepUpNeeded
  function assertStepUp(user, token) {
    policy.assertStepUp(user, token, { message: 'Enter a current authenticator code to view or replace your export passphrase.' })
  }
  function has(user) { return !!(user && user.exportKeyEnc) }

  // Returns the sealed ciphertext for the caller to store on user.exportKeyEnc.
  function set(user, passphrase, { mfaToken } = {}) {
    const pass = String(passphrase == null ? '' : passphrase)
    if (pass.length < MIN_EXPORT_PASSPHRASE) throw err(400, `Use an export passphrase of at least ${MIN_EXPORT_PASSPHRASE} characters.`)
    if (has(user)) assertStepUp(user, mfaToken)    // replacing an existing key is protected; first set is free
    return seal(pass)
  }
  function reveal(user, { mfaToken } = {}) {
    if (!has(user)) return { set: false, passphrase: null }
    assertStepUp(user, mfaToken)
    return { set: true, passphrase: open(user.exportKeyEnc) }
  }
  // The plaintext passphrase to build the archive at download time (server-side only).
  function plain(user) { return has(user) ? open(user.exportKeyEnc) : null }

  return { MIN_EXPORT_PASSPHRASE, stepUpNeeded, has, set, reveal, plain }
}

export default { makeExportKey, MIN_EXPORT_PASSPHRASE }
