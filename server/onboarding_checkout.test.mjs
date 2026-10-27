// The PAID path of the subscribe onboarding with a FAKE Stripe client injected
// through the billing dep (no network, no real key): checkout session reuse,
// server-side confirm from Stripe (ownership check, open / paid / replay), the
// webhook racing the confirm, "already subscribed" refusal, and entry.
import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'
import express from 'express'
import session from 'express-session'

const here = path.dirname(fileURLToPath(import.meta.url))
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wc-onbco-'))
process.env.WORK_DATA_DIR = tmp
process.env.PORT = '0'
process.env.WORK_MFA_DISABLED = '1'
process.env.WORK_EMAIL_SINK_FILE = path.join(tmp, 'emails.jsonl')
const relative = (f) => 'file://' + path.join(here, f).replace(/\\/g, '/')
const store = await import(relative('store.js'))
const { registerOnboardingRoutes } = await import(relative('onboarding.js'))

// ---- a fake Stripe: records what was created, serves what we tell it -------
const stripeState = { created: [], sessions: {}, subs: {}, expired: [] }
const fakeStripe = {
  checkout: { sessions: {
    create: async (params) => { const id = 'cs_test_' + (stripeState.created.length + 1); stripeState.created.push({ id, params }); stripeState.sessions[id] = { id, status: 'open', url: 'https://checkout.stripe.test/' + id, ...params, payment_status: 'unpaid' }; return { id, url: stripeState.sessions[id].url } },
    retrieve: async (id) => { const s = stripeState.sessions[id]; if (!s) throw new Error('No such checkout.session: ' + id); return s },
    expire: async (id) => { const s = stripeState.sessions[id]; if (!s) throw new Error('No such checkout.session: ' + id); s.status = 'expired'; stripeState.expired.push(id); return s },
  } },
  subscriptions: { retrieve: async (id) => stripeState.subs[id] },
}
const billing = {
  stripeClient: async () => fakeStripe,
  billingConfigured: () => true,
  billingPriceMap: () => ({ basic: 'price_basic', advanced: 'price_adv' }),
  createSubscriptionCheckout: async (st, user, { plan, cycle, successUrl, cancelUrl }) => {
    const r = await fakeStripe.checkout.sessions.create({ mode: 'subscription', client_reference_id: String(user.id), metadata: { workUserId: String(user.id), plan, cycle }, success_url: successUrl, cancel_url: cancelUrl })
    return { url: r.url, id: r.id }
  },
}
// Mark a fake session as paid by Stripe (what a completed card payment looks like).
function stripePays(id, { status = 'active', interval = 'month' } = {}) {
  const s = stripeState.sessions[id]
  s.status = 'complete'; s.payment_status = 'paid'; s.customer = 'cus_' + id; s.subscription = 'sub_' + id
  stripeState.subs['sub_' + id] = { id: 'sub_' + id, status, current_period_end: 1900000000, items: { data: [{ price: { id: 'price_adv', recurring: { interval } } }] } }
}

// ---- a minimal host app with the same session shape as index.js --------------
const app = express()
app.use(express.json())
app.use(session({ secret: 't', resave: false, saveUninitialized: false, cookie: { httpOnly: true, sameSite: 'lax' } }))
const establishSession = (req, u) => { req.session.uid = u.id; req.session.epoch = store.bumpSessionEpoch(u.id) }
const resolveWorkIdentity = (req) => { const u = req.session.uid && store.getUser(req.session.uid); return u ? { ok: true, user: u, workUser: u, impersonating: null } : null }
registerOnboardingRoutes(app, { store, establishSession, resolveWorkIdentity, authBlocked: () => false, authFail: () => {}, authOk: () => {}, ipOf: () => '127.0.0.1', LEGAL_VERSION: 'test', billing })
const srv = await new Promise((resolve) => { const s = app.listen(0, () => resolve(s)) })
const base = `http://127.0.0.1:${srv.address().port}`
after(() => { try { srv.closeAllConnections?.() } catch {} return new Promise((r) => srv.close(r)) })

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
  const lines = fs.readFileSync(process.env.WORK_EMAIL_SINK_FILE, 'utf8').trim().split('\n').map((l) => JSON.parse(l)).filter((m) => m.type === 'verify_email' && m.to === email)
  return lines[lines.length - 1].data.code
}
const uniq = () => 'pay' + Math.random().toString(36).slice(2, 8) + '@example.com'
const sidOf = (c) => c.data.url.split('/').pop()
const PW = 'Str0ng-passw0rd'
async function verifiedAccount(j, plan = 'advanced', cycle = 'annual') {
  const email = uniq()
  const s = await req(j, 'POST', '/api/work/onboarding/signup', { email, password: PW, plan, cycle, acceptTerms: true })
  assert.equal(s.status, 200)
  // Checkout before verification is refused (a proven identity pays).
  const early = await req(j, 'POST', '/api/work/onboarding/checkout', {})
  assert.equal(early.status, 403); assert.equal(early.data.needsVerification, true)
  const v = await req(j, 'POST', '/api/work/onboarding/verify', { code: await codeFor(email) })
  assert.equal(v.status, 200); assert.equal(v.data.step, 'pay', 'billing configured: the verified account moves to pay')
  return { email, user: store.findUserByLogin(email) }
}

test('checkout creates one Stripe session, reuses it while open, and re-creates after a plan change', async () => {
  const j = jar()
  const { user } = await verifiedAccount(j)
  const c1 = await req(j, 'POST', '/api/work/onboarding/checkout', {})
  assert.equal(c1.status, 200, JSON.stringify(c1.data)); assert.match(c1.data.url, /^https:\/\/checkout\.stripe\.test\/cs_test_/)
  const created = stripeState.created.length
  const p = stripeState.created[created - 1].params
  assert.equal(p.client_reference_id, String(user.id)); assert.equal(p.metadata.plan, 'advanced'); assert.equal(p.metadata.cycle, 'annual')
  assert.match(p.success_url, /\/workcopilot\/signup\/pay\?checkout=success&session_id=\{CHECKOUT_SESSION_ID\}$/)
  assert.match(p.cancel_url, /\/workcopilot\/signup\/pay\?checkout=cancel$/)
  assert.equal(store.getOnboarding(user.id).checkoutSessionId, c1.data.url.split('/').pop())
  // A double click / refresh: the same open session comes back, nothing new is created.
  const c2 = await req(j, 'POST', '/api/work/onboarding/checkout', {})
  assert.equal(c2.data.url, c1.data.url); assert.equal(c2.data.reused, true); assert.equal(stripeState.created.length, created)
  // A reload that re-sends the SAME intent through GET /state is a pure read: the open session survives.
  const st = await req(j, 'GET', '/api/work/onboarding/state?plan=advanced&cycle=annual')
  assert.equal(st.data.step, 'pay'); assert.equal(store.getOnboarding(user.id).checkoutSessionId, sidOf(c1))
  const c2b = await req(j, 'POST', '/api/work/onboarding/checkout', {})
  assert.equal(c2b.data.reused, true)
  // Change plan: the old session is EXPIRED at Stripe before a fresh one exists (never two payable sessions).
  const pl = await req(j, 'POST', '/api/work/onboarding/plan', { plan: 'basic', cycle: 'monthly' })
  assert.equal(pl.data.plan, 'basic'); assert.equal(store.getOnboarding(user.id).checkoutSessionId, null)
  const c3 = await req(j, 'POST', '/api/work/onboarding/checkout', {})
  assert.notEqual(c3.data.url, c1.data.url); assert.equal(stripeState.created.length, created + 1)
  assert.equal(stripeState.created[created].params.metadata.plan, 'basic')
  assert.ok(stripeState.expired.includes(sidOf(c1)), 'the replaced session was expired at Stripe')
  assert.equal(stripeState.sessions[sidOf(c1)].status, 'expired')
})

test('confirm: foreign session refused, open session is pending, paid session activates once, webhook replay is a no-op', async () => {
  const j = jar()
  const { user } = await verifiedAccount(j)
  const c = await req(j, 'POST', '/api/work/onboarding/checkout', {})
  const sid = c.data.url.split('/').pop()
  // Someone else's session id never activates this account.
  const j2 = jar(); const other = await verifiedAccount(j2)
  const foreign = await req(j2, 'POST', '/api/work/onboarding/confirm', { sessionId: sid })
  assert.equal(foreign.status, 403); assert.equal(store.userCanUseService(other.user.id), false)
  // Back from Stripe but not paid (abandoned / async): pending, no access.
  const open = await req(j, 'POST', '/api/work/onboarding/confirm', { sessionId: sid })
  assert.equal(open.status, 200); assert.equal(open.data.status, 'open'); assert.equal(store.userCanUseService(user.id), false)
  assert.equal((await req(j, 'POST', '/api/work/onboarding/enter')).status, 402, 'no entry without entitlement')
  assert.equal((await req(j, 'POST', '/api/work/onboarding/confirm', { sessionId: 'not-a-session' })).status, 400)
  // Stripe reports it paid: confirm activates from Stripe's record.
  stripePays(sid, { interval: 'year' })
  const paid = await req(j, 'POST', '/api/work/onboarding/confirm', { sessionId: sid })
  assert.equal(paid.status, 200); assert.equal(paid.data.status, 'active'); assert.equal(paid.data.step, 'active'); assert.equal(paid.data.fresh, true)
  const sub = store.getUser(user.id).subscription
  assert.equal(sub.status, 'active'); assert.equal(sub.plan, 'advanced'); assert.equal(sub.cycle, 'annual')
  assert.equal(sub.stripeCustomerId, 'cus_' + sid); assert.equal(sub.stripeSubscriptionId, 'sub_' + sid)
  assert.equal(store.userCanUseService(user.id), true)
  // The webhook lands afterwards (same session): identical state, no change.
  const { applyCheckoutSession } = await import(relative('billing_checkout.js'))
  let alerts = 0
  const r = await applyCheckoutSession(fakeStripe, store, stripeState.sessions[sid], { price: billing.billingPriceMap(), onNew: () => { alerts++ } })
  assert.equal(r.activated, false); assert.equal(alerts, 0, 'already live: the new-subscription alert does not fire again')
  // Confirm again (browser refresh on the success page): idempotent.
  const again = await req(j, 'POST', '/api/work/onboarding/confirm', { sessionId: sid })
  assert.equal(again.data.status, 'active')
  // No second charge: checkout is refused for an active account.
  const dup = await req(j, 'POST', '/api/work/onboarding/checkout', {})
  assert.equal(dup.status, 409); assert.equal(dup.data.alreadySubscribed, true)
  // Enter -> session established (MFA off in this host); onboarding completed.
  const en = await req(j, 'POST', '/api/work/onboarding/enter')
  assert.equal(en.status, 200); assert.ok(en.data.user)
  assert.ok(store.getOnboarding(user.id).completedAt)
  const st = await req(j, 'GET', '/api/work/onboarding/state')
  assert.equal(st.data.signedIn, true); assert.equal(st.data.step, 'active'); assert.equal(st.data.fresh, false, 'returning subscriber: not the welcome copy')
})

test('webhook-first: when Stripe activates before the browser returns, confirm just reports active', async () => {
  const j = jar()
  const { user } = await verifiedAccount(j, 'basic', 'monthly')
  const c = await req(j, 'POST', '/api/work/onboarding/checkout', {})
  const sid = c.data.url.split('/').pop()
  stripePays(sid)
  const { applyCheckoutSession } = await import(relative('billing_checkout.js'))
  let alerts = 0
  const r = await applyCheckoutSession(fakeStripe, store, stripeState.sessions[sid], { price: billing.billingPriceMap(), onNew: () => { alerts++ } })
  assert.equal(r.activated, true); assert.equal(alerts, 1)
  const conf = await req(j, 'POST', '/api/work/onboarding/confirm', { sessionId: sid })
  assert.equal(conf.data.status, 'active')
  assert.equal(store.getUser(user.id).subscription.plan, 'basic', 'the checkout metadata plan (what the customer chose) wins, as in the webhook')
  assert.equal(store.getUser(user.id).subscription.cycle, 'monthly', 'the cycle comes from the Stripe price interval')
})

test('a paid session whose subscription is still incomplete is "processing", not active', async () => {
  const j = jar()
  const { user } = await verifiedAccount(j, 'basic', 'monthly')
  const c = await req(j, 'POST', '/api/work/onboarding/checkout', {})
  const sid = c.data.url.split('/').pop()
  stripePays(sid, { status: 'incomplete' })
  const conf = await req(j, 'POST', '/api/work/onboarding/confirm', { sessionId: sid })
  assert.equal(conf.data.status, 'processing'); assert.equal(store.userCanUseService(user.id), false)
  assert.equal((await req(j, 'POST', '/api/work/onboarding/enter')).status, 402)
})

test('a signed-in subscriber who hits the flow again is told so and never charged', async () => {
  const j = jar()
  const { user } = await verifiedAccount(j)
  store.setSubscription(user.id, { status: 'active', plan: 'premium' })
  const st = await req(j, 'GET', '/api/work/onboarding/state?plan=basic')
  assert.equal(st.data.step, 'active'); assert.equal(st.data.subscription.status, 'active')
  assert.equal((await req(j, 'POST', '/api/work/onboarding/checkout', { plan: 'basic' })).data.alreadySubscribed, true)
})
