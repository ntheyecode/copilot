// HTTP end-to-end for the COMPANY-POLICY guidance gate. Boots the real Express app
// (index.js) on an ephemeral port and drives the real /plan endpoint, so this
// exercises the actual runPolicyGate wiring - getEffectiveWorkPolicy -> enforceRules
// -> response.policy + the user-facing flag event - not just the pure engine.
//
// The ONLY external dependency on this path is the AI call inside /plan. The test
// process shares globalThis.fetch with the app, so we wrap fetch: app requests
// (127.0.0.1) pass through; the AI provider host returns a canned plan we control
// (so we can make the guidance TRIP a rule or COMPLY deterministically); any other
// external host returns an empty 200. No network, no real key, no live data.
import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
process.env.WORK_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'wc-polgate-'))
process.env.PORT = '0'
process.env.WORK_MFA_DISABLED = '1'
process.env.SESSION_SECRET = 'policy-gate-e2e-secret'

// The AI stub: what the model "returns" for the next /plan. Switchable per case.
let PLAN_CONTENT = JSON.stringify({ steps: [] })
const realFetch = globalThis.fetch
globalThis.fetch = async (url, opts) => {
  const u = String(url)
  if (u.startsWith('http://127.0.0.1') || u.startsWith('http://localhost')) return realFetch(url, opts)
  if (u.includes('api.openai.com')) {
    return new Response(JSON.stringify({ choices: [{ message: { content: PLAN_CONTENT } }] }), { status: 200, headers: { 'content-type': 'application/json' } })
  }
  // Any other external (OSV / registry / model-list): benign empty success.
  return new Response(JSON.stringify({}), { status: 200, headers: { 'content-type': 'application/json' } })
}

const relative = (f) => 'file://' + path.join(here, f).replace(/\\/g, '/')
const index = await import(relative('index.js'))
const store = await import(relative('store.js'))

const srv = await new Promise((resolve) => { const s = index.app.listen(0, () => resolve(s)) })
const base = `http://127.0.0.1:${srv.address().port}`
after(() => { globalThis.fetch = realFetch; try { srv.closeAllConnections?.() } catch {} return new Promise((r) => srv.close(r)) })

function jar() { return { map: {} } }
async function req(j, method, p, body) {
  const headers = { 'content-type': 'application/json' }
  const cookie = Object.entries(j.map).map(([k, v]) => `${k}=${v}`).join('; ')
  if (cookie) headers.cookie = cookie
  const res = await fetch(base + p, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
  const sc = res.headers.getSetCookie ? res.headers.getSetCookie() : []
  for (const c of sc) { const nv = c.split(';')[0]; const i = nv.indexOf('='); if (i > 0) j.map[nv.slice(0, i)] = nv.slice(i + 1) }
  let data = null
  try { data = await res.json() } catch {}
  return { status: res.status, data }
}

const uniq = (p) => p + Math.random().toString(36).slice(2, 8)

// --- Seed a company with its own AI key, a member, and an ARMED policy that
// forbids FTP, citing the company's written policy by name + section. ---
const company = store.createCompany({ name: 'Acme Corp', plan: 'premium' })
store.setCompanyAiSource(company.id, 'company')
store.setCompanyAiKeys(company.id, { providerId: 'openai', apiKey: 'sk-test-dummy-key', chatModel: 'gpt-4o-mini', visionModel: 'gpt-4o-mini' })
const memberPw = 'Passw0rd!member'
const member = store.createManagedUser({ username: uniq('acme_member_'), password: memberPw, companyId: company.id, companyRole: 'member', tier: 'basic' })
store.setWorkPolicy({ companyId: company.id }, {
  armed: true,
  guidanceRules: [
    { kind: 'forbid', title: 'No FTP for file transfer', pattern: 'ftp', severity: 'high', doc: 'Acme Security Policy', section: '§3.1 File transfer', guidance: 'Use SFTP or SCP instead.' },
    { kind: 'require', title: 'MFA on production access', pattern: 'mfa, 2fa, multi-factor', context: 'production, prod, deploy', severity: 'critical', doc: 'Acme Security Policy', section: '§5 Access control', guidance: 'Require MFA before any production access.' },
  ],
}, 'tester')

async function memberSession() {
  const j = jar()
  const r = await req(j, 'POST', '/api/work/login', { username: member.username, password: memberPw })
  assert.equal(r.status, 200, 'company member signs in (MFA disabled for the test)')
  return j
}

test('armed company policy: a plan that uses FTP is flagged in /plan, cited to the policy', async () => {
  const j = await memberSession()
  const s = store.createWorkSession(member.id, { goal: 'upload the build to the production server' })
  // The model returns a plan that uses FTP (prohibited) on a production step.
  PLAN_CONTENT = JSON.stringify({
    steps: [
      { text: 'Connect to the production server and upload the build over FTP', commands: ['ftp -n prod.example.com'], validate: 'the build file appears on the server' },
      { text: 'Restart the service', commands: ['sudo systemctl restart app'], validate: 'service is active' },
    ],
  })
  const r = await req(j, 'POST', `/api/work/sessions/${s.id}/plan`, { goal: 'upload the build to the production server' })
  assert.equal(r.status, 200, 'plan returns ok')
  assert.ok(Array.isArray(r.data.steps) && r.data.steps.length >= 1, 'steps came back')
  assert.ok(r.data.policy, 'the response carries the company-policy result')
  const f = r.data.policy.findings || []
  const forbid = f.find((x) => x.kind === 'forbid')
  assert.ok(forbid, 'the FTP forbid rule fired')
  assert.match(forbid.doc, /Acme Security Policy/, 'finding cites the company policy document')
  assert.match(forbid.section, /3\.1/, 'finding cites the section')
  assert.match(String(forbid.guidance || ''), /SFTP|SCP/i, 'the compliant alternative is attached')
  // The production step with no MFA also trips the require rule (on-topic).
  assert.ok(f.some((x) => x.kind === 'require'), 'the production-MFA require rule fired on-topic')
  // A user-facing, cited flag event was recorded on the session.
  const sess = store.getWorkSession(member.id, s.id)
  const flags = (sess.events || []).filter((e) => e.kind === 'flag' && /Company policy/i.test(e.text))
  assert.ok(flags.length >= 1, 'a cited company-policy flag event was appended')
  assert.ok(flags.some((e) => /Acme Security Policy/.test(e.text)), 'the flag cites the policy by name')
})

test('armed company policy: a compliant plan produces no findings (no false alarms)', async () => {
  const j = await memberSession()
  const s = store.createWorkSession(member.id, { goal: 'upload the build to the production server' })
  PLAN_CONTENT = JSON.stringify({
    steps: [
      { text: 'Enable MFA, then upload the build to the production server over SFTP', commands: ['sftp prod.example.com'], validate: 'the build file appears on the server' },
    ],
  })
  const r = await req(j, 'POST', `/api/work/sessions/${s.id}/plan`, { goal: 'upload the build to the production server' })
  assert.equal(r.status, 200)
  assert.ok(r.data.policy, 'policy result present (gate ran)')
  assert.equal((r.data.policy.findings || []).length, 0, 'a compliant plan trips nothing')
  assert.equal(r.data.policy.rulesChecked, 2, 'both armed rules were checked')
})

test('no armed policy: the gate stays silent (policy is null)', async () => {
  // A fresh company with NO armed policy: the member sees no policy object.
  const co2 = store.createCompany({ name: 'NoPolicy Inc', plan: 'premium' })
  store.setCompanyAiSource(co2.id, 'company')
  store.setCompanyAiKeys(co2.id, { providerId: 'openai', apiKey: 'sk-test-dummy-key', chatModel: 'gpt-4o-mini', visionModel: 'gpt-4o-mini' })
  const pw = 'Passw0rd!np'
  const m2 = store.createManagedUser({ username: uniq('np_member_'), password: pw, companyId: co2.id, companyRole: 'member', tier: 'basic' })
  const j = jar()
  await req(j, 'POST', '/api/work/login', { username: m2.username, password: pw })
  const s = store.createWorkSession(m2.id, { goal: 'upload a file over FTP' })
  PLAN_CONTENT = JSON.stringify({ steps: [{ text: 'Upload over FTP', commands: ['ftp x.example.com'], validate: 'done' }] })
  const r = await req(j, 'POST', `/api/work/sessions/${s.id}/plan`, { goal: 'upload a file over FTP' })
  assert.equal(r.status, 200)
  assert.equal(r.data.policy ?? null, null, 'no armed policy -> no policy object on the response')
})
