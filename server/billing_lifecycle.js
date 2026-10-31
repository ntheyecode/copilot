// ---------------------------------------------------------------------------
// WorkCoPilot - a person's own subscription lifecycle: cancel at period end,
// resume before it ends. Split out of billing.js (no monolith growth).
// ---------------------------------------------------------------------------
//   POST /api/work/subscription/cancel   { reason? }  -> ends at the period end
//   POST /api/work/subscription/resume                -> keeps renewing
//
// Both act on the subscription the account ALREADY pays for, so neither is an
// individual-plan purchase route: an edition that stops selling personal plans
// (server/edition_route_gates.js) still lets a subscriber end or keep theirs
// (never degrade an entitlement). Stripe is the source of truth: the call goes
// to Stripe first, then the store mirrors the answer; the webhook
// (customer.subscription.updated) carries the same flag, so a cancel made in
// the Stripe portal shows up identically. No Stripe id leaves to the client.
// ---------------------------------------------------------------------------

// Pure: the store patch for a Stripe subscription object after a cancel or a
// resume. `cancelAtPeriodEnd` mirrors Stripe; a reason is kept only on cancel.
export function lifecyclePatch(sub, { reason = null } = {}) {
  const atEnd = !!(sub && sub.cancel_at_period_end)
  const patch = { cancelAtPeriodEnd: atEnd }
  if (sub && sub.current_period_end) patch.currentPeriodEnd = new Date(sub.current_period_end * 1000).toISOString()
  if (atEnd && reason) patch.cancelReason = String(reason).slice(0, 300)
  if (!atEnd) patch.cancelReason = null
  return patch
}

// Pure: can this account cancel / resume right now, or why not.
//   { ok: true } | { ok: false, status, error, code }
export function lifecycleCheck(sub, action) {
  const s = sub || {}
  const live = s.status === 'active' || s.status === 'trialing' || s.status === 'past_due'
  if (!s.stripeSubscriptionId || !live) return { ok: false, status: 409, code: 'noSubscription', error: 'There is no active plan to change. Choose a plan to get started.' }
  if (action === 'cancel' && s.cancelAtPeriodEnd) return { ok: false, status: 409, code: 'alreadyEnding', error: 'Your plan is already set to end at the period end. You can resume it any time before then.' }
  if (action === 'resume' && !s.cancelAtPeriodEnd) return { ok: false, status: 409, code: 'notEnding', error: 'Your plan is not set to end, so there is nothing to resume.' }
  return { ok: true }
}

export function registerLifecycleRoutes(app, { store, requireWorkAuth, getStripe, cfg, onCanceled = null, onResumed = null }) {
  const act = (action) => async (req, res) => {
    try {
      const u = req.workUser
      const check = lifecycleCheck(u.subscription, action)
      if (!check.ok) return res.status(check.status).json({ error: check.error, [check.code]: true })
      const s = await getStripe(cfg(store).secret)
      if (!s) return res.status(503).json({ error: 'Billing is not configured yet.' })
      const subId = u.subscription.stripeSubscriptionId
      const reason = action === 'cancel' ? String((req.body || {}).reason || '').trim().slice(0, 300) || null : null
      const params = action === 'cancel'
        ? { cancel_at_period_end: true, ...(reason ? { cancellation_details: { comment: reason } } : {}) }
        : { cancel_at_period_end: false }
      const sub = await s.subscriptions.update(subId, params)
      const patch = lifecyclePatch(sub, { reason })
      const subscription = store.setSubscription(u.id, patch)
      const hook = action === 'cancel' ? onCanceled : onResumed
      if (typeof hook === 'function') { try { hook({ user: store.getUser(u.id) || u, subscription, reason }) } catch { /* never block the answer */ } }
      res.json({ ok: true, action, subscription })
    } catch (e) {
      console.warn(`[billing] subscription ${action} failed: ` + (e && e.message))
      try { if (store.recordWorkIncident) store.recordWorkIncident({ kind: `billing_${action}_failed`, message: `subscription ${action} failed: ${(e && e.message) || 'unknown'}`, userId: req.workUser && req.workUser.id, call: `subscription/${action}` }) } catch { /* best effort */ }
      res.status(502).json({ error: action === 'cancel' ? 'Could not cancel your plan right now. Please try again or write to support.' : 'Could not resume your plan right now. Please try again or write to support.' })
    }
  }
  app.post('/api/work/subscription/cancel', requireWorkAuth, act('cancel'))
  app.post('/api/work/subscription/resume', requireWorkAuth, act('resume'))
}
