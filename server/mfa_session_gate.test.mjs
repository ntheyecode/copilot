// Gate: every sign-in path that establishes a session goes through the MFA
// step (owner rule, 2026-10-31: corporate users set up an authenticator on
// first sign-in; company admin and superadmin can reset it). establishSession
// is the one chokepoint; this scan fails when a NEW call site appears that is
// neither after a verified MFA code nor the operator's break-glass switch,
// unless it sits in a single sign-on module (the identity provider owns MFA
// there, and SSO accounts are exempt by design in store.mfaSetupNeeded).
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const DIR = path.dirname(fileURLToPath(import.meta.url))
// Identity-provider sign-in: the IdP enforces its own MFA.
const SSO_FILES = new Set(['sso.js', 'saml_sso.js'])
// A call is covered when, on its line or within the 3 lines before it, the
// code either just verified the second factor (clearPendingMfa runs right
// after a code was accepted) or is the break-glass branch (MFA turned off by
// the operator, WORK_MFA_DISABLED).
const COVERED = /clearPendingMfa\(|mfaGloballyEnabled\(\)/

export function unguardedSessionCalls(file, src) {
  if (SSO_FILES.has(path.basename(file))) return []
  const lines = src.split(/\r?\n/)
  const out = []
  lines.forEach((line, i) => {
    if (!/establishSession\(req\b/.test(line) || /function establishSession/.test(line)) return
    const window = lines.slice(Math.max(0, i - 3), i + 1).join('\n')
    if (!COVERED.test(window)) out.push(`${path.basename(file)}:${i + 1}: ${line.trim()}`)
  })
  return out
}

test('every session-establishing sign-in path is behind the MFA step', () => {
  const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.js') && !f.includes('.test.'))
  const bad = files.flatMap((f) => unguardedSessionCalls(f, fs.readFileSync(path.join(DIR, f), 'utf8')))
  assert.deepEqual(bad, [], `These sign-in paths skip MFA. Route them through pendingMfaUid + /api/work/login/mfa(/setup):\n${bad.join('\n')}`)
})

test('the scan catches a sign-in path that skips MFA (self-test)', () => {
  const skip = "app.post('/api/work/magic', (req, res) => {\n  const u = store.getUser(req.body.id)\n  establishSession(req, u)\n})"
  assert.equal(unguardedSessionCalls('magic.js', skip).length, 1)
  const ok = "  clearPendingMfa(req)\n  establishSession(req, u)"
  assert.equal(unguardedSessionCalls('index.js', ok).length, 0)
  assert.equal(unguardedSessionCalls('saml_sso.js', skip).length, 0, 'identity-provider sign-in is exempt')
})
