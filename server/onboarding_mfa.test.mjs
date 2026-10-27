// Entry with MFA ON (the default): a brand-new onboarding account must set up an
// authenticator before any session exists, through the SAME /login/mfa endpoints
// every login uses, and the social hooks keep the plan + verified email.
import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wc-onbmfa-'))
process.env.WORK_DATA_DIR = tmp
process.env.PORT = '0'
delete process.env.WORK_MFA_DISABLED
process.env.SESSION_SECRET = 'onboarding-mfa-secret'
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
const totp = await import(relative('totp.js'))
const { socialOnboardingIntent, finishSocialOnboarding, resolveSocialAccount } = await import(relative('onboarding.js'))
const srv = await new Promise((resolve) => { const s = index.app.listen(0, () => resolve(s)) })
const base = `http://127.0.0.1:${srv.address().port}`
after(() => { globalThis.fetch = realFetch; try { srv.closeAllConnections?.() } catch {} return new Promise((r) => srv.close(r)) })

function jar() { return { map: {} } }
async function req(j, method, p, body) {
  const headers = { 'content-type': 'application/json' }
  const cookie = Object.entries(j.map).map(([k, v]) => `${k}=${v}`).join('; ')
  if (cookie) headers.cookie = cookie
  const res = await fetch(base + p, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
  for (const c of (res.headers.getSetCookie ? res.headers.getSetCookie() : [])) { const nv = c.split(';')[0]; const i = nv.indexOf('='); if (i > 0) j.map[nv.slice(0, i)] = nv.slice(i + 1) }
  let data = null; try { data = await res.json() } catch {}
  return { status: res.status, data }
}
async function codeFor(email) {
  for (let i = 0; i < 40; i++) {
    const lines = fs.existsSync(process.env.WORK_EMAIL_SINK_FILE) ? fs.readFileSync(process.env.WORK_EMAIL_SINK_FILE, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)).filter((m) => m.type === 'verify_email' && m.to === email) : []
    if (lines.length) return lines[lines.length - 1].data.code
    await new Promise((r) => setTimeout(r, 25))
  }
  throw new Error('no code')
}
const uniq = () => 'mfa' + Math.random().toString(36).slice(2, 8) + '@example.com'

test('enter with MFA on: authenticator setup through the login MFA endpoint, then signed in', async () => {
  const j = jar()
  const email = uniq()
  await req(j, 'POST', '/api/work/onboarding/signup', { email, password: 'Str0ng-passw0rd', plan: 'basic', acceptTerms: true })
  const v = await req(j, 'POST', '/api/work/onboarding/verify', { code: await codeFor(email) })
  assert.equal(v.data.step, 'active', 'billing unconfigured here')
  assert.equal(v.data.mfaEnabled, true)
  const en = await req(j, 'POST', '/api/work/onboarding/enter')
  assert.equal(en.status, 200, JSON.stringify(en.data))
  assert.equal(en.data.mfaSetup, true); assert.ok(en.data.enroll && en.data.enroll.secret)
  assert.equal((await req(j, 'GET', '/api/work/me')).data.signedIn, false, 'no session before the second factor')
  const bad = await req(j, 'POST', '/api/work/login/mfa/setup', { code: '000000' })
  assert.equal(bad.status, 401)
  const good = await req(j, 'POST', '/api/work/login/mfa/setup', { code: totp.currentToken(en.data.enroll.secret) })
  assert.equal(good.status, 200, JSON.stringify(good.data)); assert.ok(Array.isArray(good.data.backupCodes) && good.data.backupCodes.length)
  const me = await req(j, 'GET', '/api/work/me')
  assert.equal(me.data.signedIn, true); assert.equal(me.data.user.username, email); assert.equal(me.data.user.emailVerified, true)
  // A second enter on the signed-in session is a plain { user }.
  const en2 = await req(j, 'POST', '/api/work/onboarding/enter')
  assert.ok(en2.data.user)
})

test('social hooks: the intent is read only in the subscribe flow; a provider-verified account skips the code and keeps its plan', async () => {
  assert.equal(socialOnboardingIntent({ plan: 'basic' }), null, 'plain social login: untouched')
  assert.deepEqual(socialOnboardingIntent({ flow: 'onboarding', plan: 'Advanced', cycle: 'annual' }), { plan: 'advanced', cycle: 'annual' })
  assert.deepEqual(socialOnboardingIntent({ flow: 'onboarding', plan: 'bogus' }), { plan: null, cycle: 'monthly' })
  const email = uniq()
  const u = store.createSocialUser({ email, displayName: 'Sam Social', provider: 'google' })
  assert.equal(u.needsProfile, true)
  assert.equal(u.emailVerified, true, 'provider-verified from creation')
  let redirected = ''
  const req2 = { session: { save: (cb) => cb() } }
  const res2 = { redirect: (to) => { redirected = to } }
  finishSocialOnboarding(req2, res2, { store, user: u, isNew: true, intent: { plan: 'premium', cycle: 'monthly' } })
  assert.equal(redirected, '/workcopilot/signup/pay')
  assert.equal(req2.session.onboardingUid, u.id)
  const fresh = store.getUser(u.id)
  assert.equal(fresh.emailVerified, true, 'the provider verified the address')
  assert.equal(fresh.needsProfile, false, 'nothing else is asked at sign-up')
  assert.equal(store.getOnboarding(u.id).plan, 'premium')
})

test('resolveSocialAccount: binds only to a proven identity; refuses SSO accounts and unverified classic sign-ups', async () => {
  // A classic sign-up that merely TYPED the victim address (unverified): never linked, never shadowed.
  const victim = uniq()
  const squat = await req(jar(), 'POST', '/api/work/signup', { username: 'sq' + Math.random().toString(36).slice(2, 7), password: 'Str0ng-passw0rd', name: 'Squatter', email: victim, acceptTerms: true })
  assert.equal(squat.status, 200)
  const r1 = resolveSocialAccount(store, { email: victim, displayName: 'Victim', provider: 'google' })
  assert.ok(r1.error && /already exists/.test(r1.error), 'refused with a sign-in / reset hint')
  assert.equal(store.findUserByVerifiedLogin(victim), null)
  // Once that account PROVES the address (reset link consumed), the social login binds to it.
  const squatter = store.findUserByLogin(victim)
  store.markEmailVerified(squatter.id)
  const r2 = resolveSocialAccount(store, { email: victim, displayName: 'Victim', provider: 'google' })
  assert.equal(r2.user && r2.user.id, squatter.id); assert.equal(r2.isNew, false)
  // Nobody has the address: a verified social account is created.
  const fresh = uniq()
  const r3 = resolveSocialAccount(store, { email: fresh, displayName: 'New Person', provider: 'microsoft' })
  assert.equal(r3.isNew, true); assert.equal(r3.user.emailVerified, true); assert.equal(r3.user.username, fresh)
  const r4 = resolveSocialAccount(store, { email: fresh, displayName: 'New Person', provider: 'microsoft' })
  assert.equal(r4.isNew, false); assert.equal(r4.user.id, r3.user.id, 'second social login finds the same account')
  // A company SSO account signs in through its IdP only.
  const sso = store.getUser(r3.user.id); sso.ssoEmail = fresh
  const r5 = resolveSocialAccount(store, { email: fresh, displayName: 'x', provider: 'google' })
  assert.ok(r5.error && /single sign-on/.test(r5.error))
  delete sso.ssoEmail
})
