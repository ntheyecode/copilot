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
