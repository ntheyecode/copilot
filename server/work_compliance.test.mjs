// Compliance evidence: getWorkComplianceEvidence maps a session's real data to
// controls + responses + evidence, honestly (no claim the system did not make).
// Controls reflect the OWNER's posture; posture tallies are consistent; the
// catalog always covers the core frameworks.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const storePath = 'file://' + path.join(here, 'store.js').replace(/\\/g, '/')
process.env.WORK_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'wc-compliance-'))
process.env.PORT = '0'
const store = await import(storePath)

const u = store.createWorkUser({ username: 'compuser', password: 'Passw0rd!x' })
store.setWorkTier(u.id, 'advanced')

test('returns a controls catalog, posture tally and evidence block', () => {
  const s = store.createWorkSession(u.id, { goal: 'harden an API' })
  store.setWorkSessionSteps(u.id, s.id, [
    { text: 'install the scanner', commands: ['sudo apt install nmap'] },
    { text: 'run the scan', commands: ['nmap -sV target'] },
  ])
  const session = store.getWorkSession(u.id, s.id)
  const ev = store.getWorkComplianceEvidence(session, u.id)
  assert.ok(Array.isArray(ev.controls) && ev.controls.length >= 6, 'has a real controls catalog')
  // Posture tally is internally consistent.
  const { satisfied, partial, na, total } = ev.posture
  assert.equal(satisfied + partial + na, total)
  assert.equal(total, ev.controls.length)
  // Every control has the fields the PDF renders.
  for (const c of ev.controls) {
    assert.ok(c.name && c.response && Array.isArray(c.frameworks))
    assert.ok(['satisfied', 'partial', 'na'].includes(c.status))
  }
  // Execution evidence reflects the real session.
  assert.equal(ev.evidence.totalSteps, 2)
  assert.ok(ev.evidence.codeBlocks >= 2)   // two command blocks
})

test('the core compliance frameworks are each referenced somewhere', () => {
  const s = store.createWorkSession(u.id, { goal: 'x' })
  store.setWorkSessionSteps(u.id, s.id, [{ text: 'a' }])
  const ev = store.getWorkComplianceEvidence(store.getWorkSession(u.id, s.id), u.id)
  const all = ev.controls.flatMap((c) => c.frameworks).join(' ')
  for (const fw of ['SOC 2', 'ISO 27001', 'GDPR', 'NIST']) assert.ok(all.includes(fw), `${fw} is mapped`)
})

test('security-gate control is N/A when the task handed over no code', () => {
  const s = store.createWorkSession(u.id, { goal: 'a no-code task' })
  store.setWorkSessionSteps(u.id, s.id, [{ text: 'just click here' }])
  const ev = store.getWorkComplianceEvidence(store.getWorkSession(u.id, s.id), u.id)
  const sec = ev.controls.find((c) => c.id === 'secure-output')
  assert.equal(sec.status, 'na')
})

test('encryption-at-rest and human-in-the-loop are always satisfied', () => {
  const s = store.createWorkSession(u.id, { goal: 'y' })
  store.setWorkSessionSteps(u.id, s.id, [{ text: 'a' }])
  const ev = store.getWorkComplianceEvidence(store.getWorkSession(u.id, s.id), u.id)
  assert.equal(ev.controls.find((c) => c.id === 'encryption-at-rest').status, 'satisfied')
  assert.equal(ev.controls.find((c) => c.id === 'human-in-loop').status, 'satisfied')
})

test('EVERY advertised framework is covered (maps to >=1 control, has a support line)', () => {
  const s = store.createWorkSession(u.id, { goal: 'z' })
  store.setWorkSessionSteps(u.id, s.id, [{ text: 'a', commands: ['echo hi'] }])
  const ev = store.getWorkComplianceEvidence(store.getWorkSession(u.id, s.id), u.id)
  // The frameworks advertised on the public chips must ALL be present.
  const names = ev.frameworks.map((f) => f.name).join(' | ')
  for (const fw of ['GDPR', 'HIPAA', 'PCI DSS', 'SOC 2', 'ISO/IEC 27001', 'CCPA', 'FedRAMP', 'NIST SP 800-53', 'HITRUST CSF']) {
    assert.ok(names.includes(fw), `${fw} present in the report framework coverage`)
  }
  for (const f of ev.frameworks) {
    assert.ok(f.controls.length >= 1, `${f.name} maps to >=1 control`)
    assert.ok(f.support && f.support.length > 10, `${f.name} has a support statement`)
    assert.ok(['supported', 'partial', 'gap', 'na'].includes(f.status))
  }
})

test('a framework focus foregrounds that framework', () => {
  const s = store.createWorkSession(u.id, { goal: 'focus test' })
  store.setWorkSessionSteps(u.id, s.id, [{ text: 'a' }])
  const ev = store.getWorkComplianceEvidence(store.getWorkSession(u.id, s.id), u.id, { framework: 'hipaa' })
  assert.ok(ev.focus && ev.focus.id === 'hipaa')
  assert.ok(ev.focus.controls.length >= 1)
  // An unknown framework id yields no focus (not a crash).
  const ev2 = store.getWorkComplianceEvidence(store.getWorkSession(u.id, s.id), u.id, { framework: 'not-a-framework' })
  assert.equal(ev2.focus, null)
})
