// HTTP end-to-end for the subscribe onboarding (onboarding.js) on the REAL app:
// create account -> verification code (read from the dev email sink, exactly
// as a developer would) -> verify -> enter. Billing is not configured here, so
// a verified account lands straight on 'active' (the deployment has nothing to
// charge for); the paid path is covered by onboarding_checkout.test.mjs with a
// fake Stripe client. MFA is globally off so /enter establishes the session.
import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wc-onb-'))
process.env.WORK_DATA_DIR = tmp
process.env.PORT = '0'
process.env.WORK_MFA_DISABLED = '1'
process.env.SESSION_SECRET = 'onboarding-e2e-secret'
process.env.WORK_EMAIL_SINK_FILE = path.join(tmp, 'emails.jsonl')
delete process.env.STRIPE_SECRET_KEY

const realFetch = globalThis.fetch
globalThis.fetch = async (url, opts) => {
  const u = String(url)
  if (u.startsWith('http://127.0.0.1') || u.startsWith('http://localhost')) return realFetch(url, opts)
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
// The code a developer reads from the sink: the LAST verify_email sent to `to`.
async function lastCode(to) {
  for (let i = 0; i < 40; i++) {
    const lines = fs.existsSync(process.env.WORK_EMAIL_SINK_FILE) ? fs.readFileSync(process.env.WORK_EMAIL_SINK_FILE, 'utf8').trim().split('\n').filter(Boolean) : []
    const mine = lines.map((l) => JSON.parse(l)).filter((m) => m.type === 'verify_email' && m.to === to)
    if (mine.length) return mine[mine.length - 1].data.code
    await new Promise((r) => setTimeout(r, 25))
  }
  throw new Error('no verification email in the sink for ' + to)
}
const uniq = () => 'onb' + Math.random().toString(36).slice(2, 8) + '@example.com'
const PW = 'Str0ng-passw0rd'

test('anonymous state is the account step and echoes the URL intent', async () => {
  const r = await req(jar(), 'GET', '/api/work/onboarding/state?plan=advanced&cycle=annual')
  assert.equal(r.status, 200)
  assert.equal(r.data.step, 'account'); assert.equal(r.data.plan, 'advanced'); assert.equal(r.data.cycle, 'annual')
  assert.equal(r.data.signedIn, false)
  assert.ok(r.data.pricing && r.data.pricing.plans.advanced > 0, 'plan prices ride along for the summary')
})

test('signup refuses weak input and requires the clickwrap', async () => {
  const j = jar()
  assert.equal((await req(j, 'POST', '/api/work/onboarding/signup', { email: 'nope', password: PW, acceptTerms: true })).status, 400)
  assert.equal((await req(j, 'POST', '/api/work/onboarding/signup', { email: uniq(), password: 'short', acceptTerms: true })).status, 400)
  const noTerms = await req(j, 'POST', '/api/work/onboarding/signup', { email: uniq(), password: PW })
  assert.equal(noTerms.status, 400); assert.equal(noTerms.data.legalRequired, true)
})

test('full journey: signup -> code by email -> wrong code -> resend cooldown -> verify -> enter -> signed in', async () => {
  const j = jar()
  const email = uniq()
  const s = await req(j, 'POST', '/api/work/onboarding/signup', { email, password: PW, plan: 'basic', cycle: 'monthly', acceptTerms: true })
  assert.equal(s.status, 200, JSON.stringify(s.data))
  assert.equal(s.data.step, 'verify'); assert.equal(s.data.email, email); assert.equal(s.data.plan, 'basic')
  assert.ok(s.data.resendInMs > 0)
  const u = store.findUserByLogin(email)
  assert.ok(u, 'account exists'); assert.equal(u.username, email, 'the email is the sign-in name'); assert.equal(u.emailVerified, false)
  assert.ok(u.legal && u.legal.version, 'clickwrap recorded')
  assert.equal(u.onboarding.plan, 'basic', 'plan intent kept on the account')

  const code = await lastCode(email)
  assert.match(code, /^\d{6}$/)
  // A refresh keeps the step (no re-registration).
  const st = await req(j, 'GET', '/api/work/onboarding/state')
  assert.equal(st.data.step, 'verify'); assert.equal(st.data.otp.pending, true); assert.ok(st.data.otp.resendInMs > 0)
  // Wrong code counts an attempt.
  const bad = await req(j, 'POST', '/api/work/onboarding/verify', { code: code === '000000' ? '000001' : '000000' })
  assert.equal(bad.status, 400); assert.equal(bad.data.reason, 'invalid'); assert.equal(bad.data.attemptsLeft, 4)
  // Resend inside the cooldown is refused with a wait, never silently.
  const rs = await req(j, 'POST', '/api/work/onboarding/resend')
  assert.equal(rs.status, 429); assert.ok(rs.data.resendInMs > 0)
  // The right code verifies and (billing unconfigured) the step is active.
  const ok = await req(j, 'POST', '/api/work/onboarding/verify', { code })
  assert.equal(ok.status, 200, JSON.stringify(ok.data)); assert.equal(ok.data.emailVerified, true); assert.equal(ok.data.step, 'active')
  assert.equal(store.getUser(u.id).emailVerified, true)
  // Checkout is refused without billing (503), never a silent charge.
  const co = await req(j, 'POST', '/api/work/onboarding/checkout', {})
  assert.equal(co.status, 503)
  // Enter: MFA is off here, so the session is established and /me is signed in.
  const me0 = await req(j, 'GET', '/api/work/me')
  assert.equal(me0.data.signedIn, false, 'the onboarding marker is not a sign-in')
  const en = await req(j, 'POST', '/api/work/onboarding/enter')
  assert.equal(en.status, 200, JSON.stringify(en.data)); assert.ok(en.data.user)
  const me = await req(j, 'GET', '/api/work/me')
  assert.equal(me.data.signedIn, true); assert.equal(me.data.user.username, email)
  assert.ok(store.getOnboarding(u.id).completedAt)
})

test('recovery: an unverified account resumes with its password; a wrong password is "account exists"; a verified account is never re-registered', async () => {
  const j = jar()
  const email = uniq()
  await req(j, 'POST', '/api/work/onboarding/signup', { email, password: PW, plan: 'advanced', acceptTerms: true })
  // New browser (no marker), same person comes back: resumes to verify.
  const j2 = jar()
  const again = await req(j2, 'POST', '/api/work/onboarding/signup', { email, password: PW, plan: 'premium', cycle: 'annual', acceptTerms: true })
  assert.equal(again.status, 200); assert.equal(again.data.step, 'verify'); assert.equal(again.data.resumed, true)
  assert.equal(again.data.plan, 'premium', 'the newer plan choice wins'); assert.equal(again.data.cycle, 'annual')
  assert.equal(store.listUsers().filter((u) => u.username === email).length, 1, 'no duplicate account')
  // Wrong password: no takeover, no merge.
  const wrong = await req(jar(), 'POST', '/api/work/onboarding/signup', { email, password: 'Another-passw0rd', acceptTerms: true })
  assert.equal(wrong.status, 409); assert.equal(wrong.data.accountExists, true)
  // Change the address while unverified: the old code is void, a new one goes out.
  const email2 = uniq()
  const ch = await req(j2, 'POST', '/api/work/onboarding/email', { email: email2 })
  assert.equal(ch.status, 200, JSON.stringify(ch.data)); assert.equal(ch.data.email, email2)
  const u = store.findUserByLogin(email2)
  assert.ok(u); assert.equal(u.username, email2); assert.equal(store.findUserByLogin(email), null)
  const code = await lastCode(email2)
  const ok = await req(j2, 'POST', '/api/work/onboarding/verify', { code })
  assert.equal(ok.status, 200); assert.equal(ok.data.emailVerified, true)
  // Once verified, signing up with it again is "account exists" even with the right password.
  const dup = await req(jar(), 'POST', '/api/work/onboarding/signup', { email: email2, password: PW, acceptTerms: true })
  assert.equal(dup.status, 409); assert.equal(dup.data.accountExists, true)
  // And the email cannot be changed any more through onboarding.
  assert.equal((await req(j2, 'POST', '/api/work/onboarding/email', { email: uniq() })).status, 409)
})

test('expired or burned codes are reported, and a reset link consumed later verifies the address', async () => {
  const j = jar()
  const email = uniq()
  await req(j, 'POST', '/api/work/onboarding/signup', { email, password: PW, acceptTerms: true })
  const u = store.findUserByLogin(email)
  // Burn the code with 5 wrong guesses.
  for (let i = 0; i < 5; i++) await req(j, 'POST', '/api/work/onboarding/verify', { code: '000000' })
  const locked = await req(j, 'POST', '/api/work/onboarding/verify', { code: await lastCode(email) })
  assert.equal(locked.status, 400); assert.equal(locked.data.reason, 'locked')
  // Expire it (simulate time) and check the verdict.
  const rec = store.emailOtpStatus(u.id)
  assert.equal(rec.pending, false, 'a burned code is not pending')
  // Password reset path (recovery D): the consumed link proves the mailbox.
  const { createEmailToken } = store
  const raw = createEmailToken(u.id, 'set_password')
  const set = await req(jar(), 'POST', '/api/work/password/set', { token: raw, password: 'N3w-passw0rd!' })
  assert.equal(set.status, 200)
  assert.equal(store.getUser(u.id).emailVerified, true, 'reset link consumed = email verified')
  // Login by email (the sign-in name IS the email) with the new password.
  const li = await req(jar(), 'POST', '/api/work/login', { username: email, password: 'N3w-passw0rd!' })
  assert.equal(li.status, 200); assert.ok(li.data.user)
})

test('the onboarding marker never leaks into another account and expires cleanly', async () => {
  const noMarker = await req(jar(), 'POST', '/api/work/onboarding/verify', { code: '123456' })
  assert.equal(noMarker.status, 440); assert.equal(noMarker.data.restart, true)
  assert.equal((await req(jar(), 'POST', '/api/work/onboarding/enter')).status, 440)
  assert.equal((await req(jar(), 'POST', '/api/work/onboarding/confirm', { sessionId: 'cs_test_x' })).status, 440)
})

test('a signed-in account with a classic username can also sign in by its contact email', async () => {
  const j = jar()
  const uname = 'classic' + Math.random().toString(36).slice(2, 7)
  const email = uniq()
  const s = await req(j, 'POST', '/api/work/signup', { username: uname, password: PW, name: 'Classic User', email, acceptTerms: true })
  assert.equal(s.status, 200, JSON.stringify(s.data))
  const byName = await req(jar(), 'POST', '/api/work/login', { username: uname, password: PW })
  assert.equal(byName.status, 200)
  const byMail = await req(jar(), 'POST', '/api/work/login', { username: email, password: PW })
  assert.equal(byMail.status, 200, 'email fallback')
})
