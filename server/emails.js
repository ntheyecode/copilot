// ---------------------------------------------------------------------------
// WorkCoPilot - central transactional email dispatcher (SINGLE SOURCE OF TRUTH).
//
// Every email the product sends goes through sendTemplate(): it renders the
// branded template (server/email_templates.js), sends it over the configured
// SES/SMTP account (server/mailer.js), and - for non-critical mail - never
// throws on the hot path, logging a superadmin incident instead so an email
// problem is visible without breaking the user's action. This is how an
// enterprise product mails: one place, consistent, observable, degrades
// gracefully when SMTP is not yet configured.
// ---------------------------------------------------------------------------
import { sendMail } from './mailer.js'
import { renderEmail } from './email_templates.js'
import * as store from './store.js'

function httpErr(status, message) { const e = new Error(message); e.status = status; return e }

const looksLikeEmail = (s) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(s || '').trim())

// ---- Owner subscription alerts --------------------------------------------
// SINGLE SOURCE OF TRUTH for who gets notified of subscription lifecycle events.
// Defaults to the two owner addresses; overridable via OWNER_ALERT_EMAILS
// (comma / space / semicolon separated). Invalid entries are dropped, and an
// empty / all-invalid override falls back to the defaults so alerts are never
// silently addressed to nobody.
const OWNER_ALERT_DEFAULTS = ['ravi.yerra@coesecurity.com', 'yerraslife@gmail.com']
export const OWNER_ALERT_RECIPIENTS = Object.freeze((() => {
  const raw = String(process.env.OWNER_ALERT_EMAILS || '').trim()
  const parsed = raw ? raw.split(/[,;\s]+/).map((x) => x.trim()).filter(Boolean).filter(looksLikeEmail) : []
  const uniq = [...new Set(parsed.length ? parsed : OWNER_ALERT_DEFAULTS)]
  return uniq
})())

// Human labels for the alert kinds the billing webhook fires.
const OWNER_ALERT_KIND_LABELS = {
  new_subscription: 'activated',
  plan_change: 'plan change',
  cancellation: 'canceled',
  past_due: 'past due',
}

// Notify BOTH owner addresses about one subscription lifecycle event. Reuses the
// graceful sendTemplate path (per-recipient, never throws into the caller). Owner
// rule - never SILENTLY fail: if any recipient did not actually send (SMTP not
// configured, or a send error), a work incident is logged so the miss is
// observable, in addition to the per-send incident sendTemplate already records.
export async function sendOwnerSubscriptionAlert(kind, { user = null, plan = null, status = null, amount = null, currency = 'usd', cycle = null, stripeId = null } = {}) {
  const customer = user ? (user.displayName || user.username || 'A customer') : 'A customer'
  let customerEmail = ''
  try { customerEmail = user ? (store.effectiveUserEmail(user.id) || '') : '' } catch { customerEmail = '' }
  const event = OWNER_ALERT_KIND_LABELS[kind] || String(kind || 'update').replace(/_/g, ' ')
  const data = {
    customer, customerEmail,
    plan: plan || '', status: status || '', cycle: cycle || '',
    amount: amount == null ? '' : amount, currency: currency || 'usd',
    event, reference: stripeId || '', date: new Date().toISOString(), kind: String(kind || ''),
  }
  const results = []
  for (const to of OWNER_ALERT_RECIPIENTS) {
    const r = await sendTemplate('owner_subscription_alert', to, data, {})
    results.push({ to, ...r })
  }
  const undelivered = results.filter((r) => !r.ok)
  if (undelivered.length) {
    try {
      store.recordWorkIncident({
        kind: 'owner_alert_failed',
        message: `Owner subscription alert "${event}" for ${customer} not delivered: ${undelivered.map((r) => `${r.to} (${r.skipped || r.error || 'failed'})`).join('; ')}`.slice(0, 900),
        userId: user ? user.id : null,
      })
    } catch { /* never break on logging */ }
  }
  return results
}

// Fire-and-forget wrapper for the webhook hot path: never awaited, never throws.
export function sendOwnerSubscriptionAlertAsync(kind, info = {}) {
  Promise.resolve().then(() => sendOwnerSubscriptionAlert(kind, info)).catch(() => { /* already logged */ })
}

/**
 * Send one templated email.
 * @param {string} type   an EMAIL_TYPES key (email_templates.js)
 * @param {string} to     recipient address
 * @param {object} data   template data
 * @param {object} opts   { critical, attachment, fromName }
 *   critical=false (default): swallow errors, log an incident, return {ok:false}.
 *   critical=true: throw so the caller can surface it (e.g. set-password email).
 * @returns {Promise<{ok:boolean, to?, messageId?, skipped?, error?}>}
 */
export async function sendTemplate(type, to, data = {}, { critical = false, attachment = null } = {}) {
  const fail = (skip, err) => {
    if (critical) throw (err || httpErr(400, `Email not sent (${skip}).`))
    return { ok: false, ...(skip ? { skipped: skip } : {}), ...(err ? { error: err.message } : {}) }
  }
  if (!to || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(to))) return fail('invalid-recipient')
  const cfg = store.getSmtpSendConfig ? store.getSmtpSendConfig() : null
  if (!cfg) return fail('smtp-not-configured')
  let msg = null
  // Merge the superadmin's stored overrides (subject/heading/body/ctaLabel) with
  // the data so admins can edit every email from the dashboard.
  const overrides = (store.getEmailTemplate ? store.getEmailTemplate(type) : {}) || {}
  try { msg = renderEmail(type, data || {}, overrides) } catch { msg = null }
  if (!msg || !msg.subject || (!msg.html && !msg.text)) return fail('no-template')
  try {
    const r = await sendMail(cfg, { to, subject: msg.subject, text: msg.text || '', html: msg.html || '', ...(attachment ? { attachment } : {}) })
    return { ok: true, to, messageId: r.messageId || null }
  } catch (e) {
    try { store.recordWorkIncident({ kind: 'email_failed', message: `${type} -> ${to}: ${(e && e.message) || e}`.slice(0, 500) }) } catch { /* never break on logging */ }
    return fail(null, e)
  }
}

// Fire-and-forget convenience for non-critical notifications: send in the
// background, never await, never throw into the caller's response path.
export function sendTemplateAsync(type, to, data = {}, opts = {}) {
  Promise.resolve().then(() => sendTemplate(type, to, data, opts)).catch(() => { /* already logged */ })
}

// ---- Account lifecycle emails ---------------------------------------------
const APP_BASE = (process.env.WORK_PUBLIC_URL || 'https://admireveda.com').replace(/\/+$/, '')
const SET_PASSWORD_TTL_LABEL = '48 hours'
export const setPasswordLink = (raw) => `${APP_BASE}/work/set-password?token=${encodeURIComponent(raw)}`

// Welcome a newly-created account. SSO accounts get a no-password welcome; a
// password account gets a one-time set-password link. Returns the send result.
export async function sendAccountWelcome(userId) {
  const u = store.getUser(userId)
  if (!u) return { ok: false, skipped: 'no-user' }
  const to = store.effectiveUserEmail(u.id)
  if (!to) return { ok: false, skipped: 'no-email' }   // nothing to send to (no email on file)
  const company = u.companyId ? ((store.getCompany(u.companyId) || {}).name || '') : ''
  const name = u.displayName || u.username || ''
  if (u.ssoEmail) return sendTemplate('welcome_sso', to, { name, email: to, company })
  const raw = store.createEmailToken(u.id, 'set_password')
  return sendTemplate('welcome_set_password', to, { name, username: u.username, setLink: setPasswordLink(raw), expiresLabel: SET_PASSWORD_TTL_LABEL, company })
}
export function sendAccountWelcomeAsync(userId) {
  Promise.resolve().then(() => sendAccountWelcome(userId)).catch(() => { /* logged in sendTemplate */ })
}

// Affiliate: thank-you right after they apply (no account yet - send to the email
// they entered on the form).
export function sendAffiliateApplicationReceivedAsync(toEmail, name) {
  const to = String(toEmail || '').trim()
  if (!to) return
  Promise.resolve().then(() => sendTemplate('affiliate_application_received', to, { name: name || '' })).catch(() => { /* logged */ })
}
// Affiliate: approved - set-password link + dashboard invite. Mirrors the welcome
// set-password flow but with the affiliate-specific template + the rate.
export async function sendAffiliateApproved(userId, ratePct) {
  const u = store.getUser(userId)
  if (!u) return { ok: false, skipped: 'no-user' }
  const to = store.effectiveUserEmail(u.id)
  if (!to) return { ok: false, skipped: 'no-email' }
  const name = u.displayName || u.username || ''
  // SSO accounts have no password to set; send a no-link approval still.
  if (u.ssoEmail) return sendTemplate('affiliate_approved', to, { name, username: u.username, setLink: `${APP_BASE}/affliate`, expiresLabel: SET_PASSWORD_TTL_LABEL, rate: String(ratePct != null ? ratePct : '') })
  const raw = store.createEmailToken(u.id, 'set_password')
  return sendTemplate('affiliate_approved', to, { name, username: u.username, setLink: setPasswordLink(raw), expiresLabel: SET_PASSWORD_TTL_LABEL, rate: String(ratePct != null ? ratePct : '') })
}
export function sendAffiliateApprovedAsync(userId, ratePct) {
  Promise.resolve().then(() => sendAffiliateApproved(userId, ratePct)).catch(() => { /* logged in sendTemplate */ })
}

// Send a password-reset link (forgot password). SSO accounts reset via their IdP.
export async function sendPasswordReset(userId) {
  const u = store.getUser(userId)
  if (!u) return { ok: false, skipped: 'no-user' }
  if (u.ssoEmail) return { ok: false, skipped: 'sso-account' }
  const to = store.effectiveUserEmail(u.id)
  if (!to) return { ok: false, skipped: 'no-email' }
  const raw = store.createEmailToken(u.id, 'set_password')
  return sendTemplate('reset_password', to, { name: u.displayName || u.username, resetLink: setPasswordLink(raw), expiresLabel: SET_PASSWORD_TTL_LABEL })
}

// Confirm a password was just changed (reuses the set link flow).
export function sendPasswordChangedAsync(userId) {
  Promise.resolve().then(async () => {
    const u = store.getUser(userId); if (!u || u.ssoEmail) return
    const to = store.effectiveUserEmail(u.id); if (!to) return
    return sendTemplate('password_changed', to, { name: u.displayName || u.username })
  }).catch(() => {})
}
