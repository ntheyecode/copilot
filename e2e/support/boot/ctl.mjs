// Whitelisted control commands the E2E tests can run inside the server process.
//
// Seeding goes through the product's own exported store functions (the same
// calls scripts/seed-enterprise-demo.mjs makes), so seeded data is shaped exactly
// like real data. Each test seeds its OWN tenant with a unique prefix, which is
// what keeps parallel tests from stepping on each other.
import fs from 'node:fs'
import { advanceClock, resetClock } from './clock.mjs'
import { blockedCalls } from './net-fakes.mjs'

export const PASSWORD = 'E2e-User-Pass-123!'

// Every company persona the suite drives: role, flow and grants as the company
// admin would set them in the Team tab.
export const COMPANY_PERSONAS = Object.freeze({
  admin: { companyRole: 'company_admin' },
  exec: { companyRole: 'executive' },
  pm: { companyRole: 'project_manager' },
  srpm: { companyRole: 'senior_project_manager' },
  grc: { companyRole: 'grc' },
  member: { companyRole: 'member', workFlow: 'mixed' },
  worker: { companyRole: 'member', workFlow: 'worker' },
  trainer: { companyRole: 'member', workFlow: 'mixed', grants: ['trainer'] },
})

export function makeCtl({ store, fakeAi, receiver, srv, smtp = null, oidc = null, stripe = null }) {
  const need = (x, what) => { if (!x) throw new Error(`${what} is not running in this E2E server`); return x }
  const commands = {
    seedCompany({ prefix, personas = Object.keys(COMPANY_PERSONAS), legal = true, licenseMode = 'flexible' }) {
      const p = clean(prefix)
      const co = store.createCompany({ name: `${p} Industries`, plan: 'advanced', seats: 60, adminSeats: 4, licenseMode })
      const users = {}
      for (const key of personas) {
        const spec = COMPANY_PERSONAS[key]
        const u = store.createManagedUser({ username: `${p}_${key}`, password: PASSWORD, email: `${p}.${key}@e2e-mail.net`, companyId: co.id, companyRole: spec.companyRole, tier: 'advanced' })
        if (spec.workFlow || spec.grants) store.updateCompanyMember(co.id, u.id, { workFlow: spec.workFlow, grants: spec.grants })
        if (legal) store.recordLegalAcceptance(u.id, { method: 'e2e-seed' })
        users[key] = { id: u.id, username: u.username }
      }
      return { companyId: co.id, name: co.name, users, password: PASSWORD }
    },
    seedSolo({ prefix, tier = 'basic', paid = true, legal = true }) {
      const p = clean(prefix)
      const u = store.createManagedUser({ username: `${p}_solo`, password: PASSWORD, email: `${p}.solo@e2e-mail.net`, tier, free: !!paid })
      if (legal) store.recordLegalAcceptance(u.id, { method: 'e2e-seed' })
      return { id: u.id, username: u.username, password: PASSWORD }
    },
    // Fake AI provider: scripted answers, recorded calls.
    'ai.script'({ rules }) { return fakeAi.script(rules) },
    'ai.reset'() { return fakeAi.reset() },
    'ai.calls'({ kind } = {}) { return fakeAi.calls(kind) },
    'clock.advance'({ ms }) { return advanceClock(ms) },
    'clock.reset'() { return resetClock() },
    'hooks.mode'({ mode }) { return receiver.setMode(mode) },
    'hooks.deliveries'() { return receiver.deliveries() },
    'hooks.clear'() { receiver.clear(); return true },
    'net.blocked'() { return blockedCalls() },
    // Fake SMTP relay (fake-smtp.mjs): what the product's mailer delivered.
    'smtp.messages'() { return need(smtp, 'the fake SMTP relay').messages() },
    'smtp.clear'() { need(smtp, 'the fake SMTP relay').clear(); return true },
    // Mock OpenID Connect provider (fake-oidc.mjs).
    'idp.configure'(args) { return need(oidc, 'the mock identity provider').configure(args) },
    'idp.calls'() { return need(oidc, 'the mock identity provider').calls() },
    // Fake Stripe (fake-stripe.mjs): everything it holds (sessions,
    // subscriptions, invoices, charges, customers, schedules, refunds) and every
    // REST call the product made, for webhook payloads and assertions. The
    // product's own safe subscription view is read through its API, never here.
    'stripe.state'() { return need(stripe, 'the fake Stripe').state() },
    'stripe.subscription'({ id }) { return need(stripe, 'the fake Stripe').subscription(id) },
    'stripe.reset'() { return need(stripe, 'the fake Stripe').reset() },
    // A seeded or signed-up account's Stripe ids (server side only; the
    // product never returns them to a client).
    'user.stripe'({ id }) { const u = store.getUser(id); const s = (u && u.subscription) || {}; return { customer: s.stripeCustomerId || null, subscription: s.stripeSubscriptionId || null, status: s.status || 'none' } },
    emails() {
      const f = process.env.WORK_EMAIL_SINK_FILE
      if (!f || !fs.existsSync(f)) return []
      return fs.readFileSync(f, 'utf8').split(/\r?\n/).filter(Boolean).map((l) => { try { return JSON.parse(l) } catch { return { raw: l } } })
    },
    async shutdown() {
      try { store.closeStore() } catch { /* best effort */ }
      await new Promise((r) => { try { srv.closeAllConnections?.() } catch { /* ignore */ } srv.close(() => r()) })
      try { await fakeAi.close() } catch { /* ignore */ }
      try { await receiver.close() } catch { /* ignore */ }
      for (const f of [smtp, oidc, stripe]) { try { if (f) await f.close() } catch { /* ignore */ } }
      return true
    },
  }
  return async (cmd, args) => {
    if (!Object.hasOwn(commands, cmd)) throw new Error(`unknown ctl command "${cmd}"`)
    return commands[cmd](args)
  }
}

function clean(prefix) {
  const s = String(prefix || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 24)
  if (s.length < 2) throw new Error('seed prefix must have at least 2 letters or digits')
  return s
}
