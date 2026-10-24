// ---------------------------------------------------------------------------
// WorkCoPilot - Affiliate program (routes + Stripe Connect payouts).
// ---------------------------------------------------------------------------
// Model (see store.js): superadmin/affiliate-admin approve applicants; an
// approved affiliate gets a sign-in account + a referral code. They earn a % of
// each referral's FIRST payment, paid out via Stripe Connect (automated bank
// transfer). The affiliate ADMIN is a separate admin account (role
// 'affiliate_admin'); superadmin also qualifies.
//
// Routes:
//   Public:      POST /api/affiliate/apply, GET /api/affiliate/go/:code,
//                GET /api/affiliate/public
//   Affiliate:   GET /api/affiliate/dashboard, POST /api/affiliate/connect/onboard,
//                GET /api/affiliate/connect/refresh   (requireWorkAuth)
//   Admin:       /api/work/admin/affiliates*          (requireAffiliateAdmin)
//                /api/work/admin/affiliate/role        (requireSuperAdmin)
//
// Everything Stripe-touching is guarded the same way as billing.js: a missing
// key or package returns a clear 503, never a crash (SUPREME RULE III: surface
// the real reason, never silently reroute).
// ---------------------------------------------------------------------------
import { stripeClient, PUBLIC_SITE } from './billing.js'
import { sendAffiliateApplicationReceivedAsync, sendAffiliateApprovedAsync } from './emails.js'

const SITE = PUBLIC_SITE || 'https://admireveda.com'

// Read the affref cookie without requiring cookie-parser (we only need one key).
function cookieRef(req) {
  const raw = req.headers && req.headers.cookie
  if (!raw) return ''
  for (const part of String(raw).split(';')) {
    const [k, ...v] = part.trim().split('=')
    if (k === 'affref') return decodeURIComponent(v.join('=') || '')
  }
  return ''
}

export function registerAffiliateRoutes(app, deps = {}) {
  const { store, requireWorkAuth, requireAuth, requireAffiliateAdmin, requireSuperAdmin, wrap } = deps
  if (!app || !store || !wrap) return
  const w = wrap

  // ---- Public ----------------------------------------------------------------
  // The landing page reads this to show whether the program is open + the headline rate.
  app.get('/api/affiliate/public', w((req, res) => {
    const c = store.getAffiliateConfig()
    res.json({ enabled: c.enabled, defaultRatePct: c.defaultRatePct })
  }))

  // Apply to become an affiliate (creates a pending application).
  app.post('/api/affiliate/apply', w((req, res) => {
    const b = req.body || {}
    const ip = (req.headers['x-forwarded-for'] || req.ip || '').toString().split(',')[0].trim()
    const out = store.applyAffiliate({
      name: b.name, email: b.email, phone: b.phone, website: b.website,
      audience: b.audience, notes: b.notes, socials: b.socials,
    }, { ip })
    // Thank-you email: application received + being reviewed.
    sendAffiliateApplicationReceivedAsync(String(b.email || '').trim(), String(b.name || '').trim())
    res.json({ ok: true, id: out.id })
  }))

  // Tracked referral link: bump the click, set a 30-day attribution cookie, and
  // redirect to the public site carrying ?ref=CODE (the SPA stores it for signup).
  app.get('/api/affiliate/go/:code', w((req, res) => {
    const code = String(req.params.code || '').toUpperCase().slice(0, 16)
    const ok = store.recordAffiliateClick(code)
    const days = store.getAffiliateConfig().cookieDays || 30
    if (ok) {
      res.cookie
        ? res.cookie('affref', code, { maxAge: days * 24 * 3600 * 1000, httpOnly: false, sameSite: 'lax', path: '/' })
        : res.setHeader('Set-Cookie', `affref=${encodeURIComponent(code)}; Max-Age=${days * 24 * 3600}; Path=/; SameSite=Lax`)
    }
    res.redirect(302, `${SITE}/?ref=${encodeURIComponent(code)}`)
  }))

  // ---- Affiliate (signed in as their own account) ----------------------------
  if (requireWorkAuth) {
    app.get('/api/affiliate/dashboard', requireWorkAuth, w((req, res) => {
      const d = store.affiliateDashboard(req.workUser.id)
      if (!d) return res.status(404).json({ error: 'This account is not an affiliate.' })
      // The ready-to-share referral link (tracked redirect).
      d.referralLink = d.code ? `${SITE}/api/affiliate/go/${d.code}` : null
      res.json(d)
    }))

    // Start / continue Stripe Connect onboarding; returns a hosted onboarding URL.
    app.post('/api/affiliate/connect/onboard', requireWorkAuth, async (req, res) => {
      try {
        const a = store.getAffiliateByUserId(req.workUser.id)
        if (!a || a.status !== 'approved') return res.status(403).json({ error: 'Your affiliate account is not active.' })
        const s = await stripeClient(store)
        if (!s) return res.status(503).json({ error: 'Payouts are not available yet. Please check back shortly.' })
        let acctId = a.stripeAccountId
        if (!acctId) {
          const acct = await s.accounts.create({
            type: 'express', email: a.email,
            capabilities: { transfers: { requested: true } },
            business_type: 'individual', metadata: { affiliateId: a.id, workUserId: req.workUser.id },
          })
          acctId = acct.id
          store.setAffiliateStripe(a.id, { accountId: acctId })
        }
        const link = await s.accountLinks.create({
          account: acctId,
          refresh_url: `${SITE}/affliate?connect=refresh`,
          return_url: `${SITE}/affliate?connect=done`,
          type: 'account_onboarding',
        })
        res.json({ url: link.url })
      } catch (e) {
        res.status(502).json({ error: 'Could not start Stripe onboarding: ' + (e && e.message ? e.message : 'unknown error') })
      }
    })

    // Re-check onboarding status after the affiliate returns from Stripe.
    app.get('/api/affiliate/connect/refresh', requireWorkAuth, async (req, res) => {
      try {
        const a = store.getAffiliateByUserId(req.workUser.id)
        if (!a) return res.status(404).json({ error: 'Not an affiliate.' })
        if (!a.stripeAccountId) return res.json({ onboarded: false, connected: false })
        const s = await stripeClient(store)
        if (!s) return res.status(503).json({ error: 'Payouts are not available yet.' })
        const acct = await s.accounts.retrieve(a.stripeAccountId)
        const onboarded = !!(acct.payouts_enabled && acct.details_submitted)
        store.setAffiliateStripe(a.id, { onboarded })
        res.json({ onboarded, connected: true, payoutsEnabled: !!acct.payouts_enabled })
      } catch (e) {
        res.status(502).json({ error: 'Could not check Stripe status: ' + (e && e.message ? e.message : 'unknown error') })
      }
    })
  }

  // ---- Affiliate admin (separate admin account; superadmin also) -------------
  const adminGate = requireAffiliateAdmin || requireSuperAdmin
  if (requireAuth && adminGate) {
    app.get('/api/work/admin/affiliates', requireAuth, adminGate, w((req, res) => {
      const status = req.query.status ? String(req.query.status) : null
      const affiliates = store.listAffiliates({ status })
      const counts = { pending: 0, approved: 0, suspended: 0, rejected: 0 }
      for (const a of store.listAffiliates({})) if (counts[a.status] != null) counts[a.status]++
      res.json({ affiliates, counts, config: store.getAffiliateConfig() })
    }))
    app.get('/api/work/admin/affiliates/:id', requireAuth, adminGate, w((req, res) => {
      const a = store.publicAffiliateById(req.params.id)
      if (!a) return res.status(404).json({ error: 'Affiliate not found.' })
      res.json({ affiliate: a, referrals: store.listAffiliateReferrals(req.params.id) })
    }))
    app.post('/api/work/admin/affiliates/:id/approve', requireAuth, adminGate, w((req, res) => {
      const ratePct = (req.body && req.body.ratePct != null) ? Number(req.body.ratePct) : null
      const out = store.approveAffiliate(req.params.id, { byUsername: req.user.username, ratePct })
      // Approval email: welcome + set-password link to the dashboard + their rate.
      if (out.userId) { try { sendAffiliateApprovedAsync(out.userId, out.affiliate && out.affiliate.ratePct) } catch { /* email best-effort */ } }
      res.json(out)
    }))
    app.post('/api/work/admin/affiliates/:id/reject', requireAuth, adminGate, w((req, res) => {
      res.json(store.rejectAffiliate(req.params.id, { reason: String((req.body && req.body.reason) || ''), byUsername: req.user.username }))
    }))
    app.post('/api/work/admin/affiliates/:id/suspend', requireAuth, adminGate, w((req, res) => {
      const suspended = !!(req.body && req.body.suspended)
      res.json(store.setAffiliateSuspended(req.params.id, suspended, { reason: String((req.body && req.body.reason) || ''), byUsername: req.user.username }))
    }))
    app.post('/api/work/admin/affiliates/:id/rate', requireAuth, adminGate, w((req, res) => {
      res.json(store.setAffiliateRate(req.params.id, Number((req.body || {}).ratePct), { byUsername: req.user.username }))
    }))
    // Run a payout: transfer the affiliate's EARNED (unpaid) balance to their
    // connected Stripe account, then mark those commissions paid.
    app.post('/api/work/admin/affiliates/:id/payout', requireAuth, adminGate, async (req, res) => {
      try {
        const a = store.getAffiliate(req.params.id)
        if (!a) return res.status(404).json({ error: 'Affiliate not found.' })
        if (a.status !== 'approved') return res.status(400).json({ error: 'Only an active (approved) affiliate can be paid.' })
        if (!a.stripeAccountId || !a.stripeOnboarded) return res.status(400).json({ error: 'This affiliate has not finished Stripe payout onboarding yet.' })
        const refs = store.affiliatePayableRefs(req.params.id)
        const total = Math.round(refs.reduce((s, r) => s + (r.commissionUsd || 0), 0) * 100) / 100
        const minPayout = store.getAffiliateConfig().minPayoutUsd || 0
        if (total <= 0) return res.status(400).json({ error: 'There is no unpaid balance to pay out.' })
        if (total < minPayout) return res.status(400).json({ error: `Balance $${total.toFixed(2)} is below the $${minPayout} minimum payout.` })
        const s = await stripeClient(store)
        if (!s) return res.status(503).json({ error: 'Payouts are not available yet (Stripe not configured).' })
        const transfer = await s.transfers.create({
          amount: Math.round(total * 100), currency: 'usd', destination: a.stripeAccountId,
          description: `WorkCoPilot affiliate payout (${refs.length} referral${refs.length === 1 ? '' : 's'})`,
          metadata: { affiliateId: a.id },
        })
        const marked = store.markAffiliateRefsPaid(req.params.id, refs.map((r) => r.id), { transferId: transfer.id })
        try { store.recordTransaction({ kind: 'affiliate_payout', userId: a.userId || null, amount: -total, currency: 'usd', stripeId: transfer.id, status: 'succeeded', description: `Affiliate payout to ${a.email}` }) } catch { /* ledger best-effort */ }
        try { store.recordAdminAction({ userId: a.userId || null, action: 'affiliate_payout', reason: `$${total.toFixed(2)} (${marked.paid} refs)`, detail: `${a.email} transfer ${transfer.id} by ${req.user.username}` }) } catch { /* audit best-effort */ }
        res.json({ ok: true, paidUsd: total, count: marked.paid, transferId: transfer.id })
      } catch (e) {
        res.status(502).json({ error: 'Payout failed: ' + (e && e.message ? e.message : 'unknown error') })
      }
    })
    // Program settings.
    app.get('/api/work/admin/affiliate-config', requireAuth, adminGate, w((req, res) => res.json(store.getAffiliateConfig())))
    app.post('/api/work/admin/affiliate-config', requireAuth, adminGate, w((req, res) => res.json(store.setAffiliateConfig(req.body || {}))))
    // Who the affiliate admins are (view).
    app.get('/api/work/admin/affiliate-staff', requireAuth, adminGate, w((req, res) => res.json({ staff: store.listAffiliateStaff() })))
  }
  // Grant / revoke the affiliate_admin role (superadmin only).
  if (requireAuth && requireSuperAdmin) {
    app.post('/api/work/admin/affiliate/role', requireAuth, requireSuperAdmin, w((req, res) => {
      res.json({ user: store.setUserRole((req.body || {}).userId, (req.body || {}).role) })
    }))
  }
}

// Bind a referral to a just-created account: prefer the explicit ?ref= the SPA
// captured, fall back to the affref cookie. Called from the signup handler.
export function bindReferralOnSignup(store, req, userId) {
  try {
    const code = String((req.body && req.body.ref) || '').trim() || cookieRef(req)
    if (code) store.bindReferral(userId, code)
  } catch { /* attribution is best-effort, never blocks signup */ }
}
