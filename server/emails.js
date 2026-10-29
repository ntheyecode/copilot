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
import fs from 'node:fs'
import { sendMail } from './mailer.js'
import { renderEmail } from './email_templates.js'
import * as store from './store.js'
import * as ai from './ai.js'
import { getLocaleMeta } from './locales.js'

function httpErr(status, message) { const e = new Error(message); e.status = status; return e }

// ---------------------------------------------------------------------------
// Language-aware delivery (owner: language is the key thing when communicating).
// When a recipient is a known user who pinned a NON-English language, the rendered
// prose (subject + text + the visible text of the HTML) is translated best-effort
// with the platform AI before sending. It NEVER degrades and NEVER fails silently:
// English/unset language, no AI runtime, an AI error, an unparseable reply, or a
// dropped link/code all fall back to the ENGLISH render and LOG the fallback. The
// English template stays the single source of truth; nothing here edits it.
// ---------------------------------------------------------------------------
const ENGLISH_LOCALES = new Set(['en', 'en-GB'])
function isEnglishLang(code) { return !code || ENGLISH_LOCALES.has(code) }

// Every fallback is observable (never silent): a console warning AND a superadmin
// incident, so the operator sees exactly which email went out in English and why.
function logEmailTranslationFallback(type, lang, reason) {
  const line = `email translation fallback: ${type} -> ${lang || 'unknown'} (${reason}); sent English`
  try { console.warn(`[emails] ${line}`) } catch { /* ignore */ }
  try { store.recordWorkIncident({ kind: 'email_translation_fallback', message: line.slice(0, 500) }) } catch { /* never break on logging */ }
}

// Tokens that MUST survive verbatim: every URL/link and email address. If the
// translation dropped or altered any of these we do not trust it and send English.
function emailPreserveTokens(str) {
  const s = String(str || '')
  const urls = s.match(/https?:\/\/[^\s"'<>)]+/gi) || []
  const emails = s.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || []
  return [...new Set([...urls, ...emails])]
}

// Tolerant JSON extraction from a model reply (handles a ```json fence or prose
// around the object). Returns the parsed object or null.
function parseJsonLoose(raw) {
  const s = String(raw || '')
  const fenced = s.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const body = fenced ? fenced[1] : s
  const start = body.indexOf('{'); const end = body.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  try { return JSON.parse(body.slice(start, end + 1)) } catch { return null }
}

// Translate one rendered message into the recipient's language. Returns a new
// { subject, text, html } or null (caller then sends the English original). Reuses
// the platform AI runtime (store.getActiveRuntime) and ai.generate - no new client.
async function translateEmailMessage(msg, langCode, type) {
  const rt = (typeof store.getActiveRuntime === 'function') ? store.getActiveRuntime() : null
  if (!rt || !rt.apiKey) { logEmailTranslationFallback(type, langCode, 'ai-unavailable'); return null }
  const meta = getLocaleMeta(langCode) || {}
  const langName = meta.name || langCode
  const system =
    'You are a professional localizer for transactional product emails. ' +
    `Translate the user-visible text into ${langName} (language code ${langCode}). ` +
    'Follow these rules exactly:\n' +
    '- Preserve VERBATIM, never translate or change: URLs and links, one-time codes, reference ids, numbers and amounts, email addresses, and proper names (people, and product/company names such as WorkCoPilot, AdmireVeda, COE Security LLC).\n' +
    '- For the html value, translate ONLY the human-readable text. Keep every HTML tag, attribute, href, class, style and entity exactly as written.\n' +
    '- Keep the meaning; keep it natural and professional. Do not add or remove information. Use hyphens, never em dashes.\n' +
    '- Return ONLY a JSON object with exactly these keys: "subject", "text", "html". Each value is the translated string; return an empty string for an empty input field.'
  const input = JSON.stringify({ subject: msg.subject || '', text: msg.text || '', html: msg.html || '' })
  let raw
  try { raw = await ai.generate(rt, system, input) }
  catch (e) { logEmailTranslationFallback(type, langCode, `ai-error: ${(e && e.message) || 'failed'}`); return null }
  const parsed = parseJsonLoose(raw)
  if (!parsed || typeof parsed !== 'object' || typeof parsed.subject !== 'string' || !parsed.subject.trim()) {
    logEmailTranslationFallback(type, langCode, 'unparseable'); return null
  }
  const out = {
    subject: parsed.subject,
    text: (typeof parsed.text === 'string' && parsed.text) ? parsed.text : (msg.text || ''),
    html: (typeof parsed.html === 'string' && parsed.html) ? parsed.html : (msg.html || ''),
  }
  // Preservation guard: every link/email in the ORIGINAL must appear verbatim in
  // the translation, or we distrust it and send English (never ship a broken link).
  const original = [msg.subject, msg.text, msg.html].join('\n')
  const translated = [out.subject, out.text, out.html].join('\n')
  for (const tok of emailPreserveTokens(original)) {
    if (!translated.includes(tok)) { logEmailTranslationFallback(type, langCode, 'preservation-failed'); return null }
  }
  return out
}

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

// LOCAL DEV / TEST ONLY: when WORK_EMAIL_SINK_FILE names a file, every templated
// email is ALSO appended there as one JSON line ({ at, type, to, subject, text,
// data }) before delivery is attempted. Lets a developer read a verification code
// or a reset link without an SMTP server, and lets the end-to-end tests drive
// the real sign-up flow. Never set in production (the file would hold codes).
// Unset = no-op; a write failure is swallowed so it can never break a send.
const EMAIL_SINK_FILE = (process.env.WORK_HOSTED === '1' || process.env.NODE_ENV === 'production') ? '' : (process.env.WORK_EMAIL_SINK_FILE || '')
function sinkEmailForDev(type, to, data) {
  if (!EMAIL_SINK_FILE) return
  try {
    let subject = '', text = ''
    try { const m = renderEmail(type, data || {}, {}); subject = m.subject || ''; text = m.text || '' } catch { /* keep the raw data */ }
    fs.appendFileSync(EMAIL_SINK_FILE, JSON.stringify({ at: new Date().toISOString(), type, to, subject, text, data: data || {} }) + '\n')
  } catch { /* dev aid only */ }
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
  sinkEmailForDev(type, to, data)
  const cfg = store.getSmtpSendConfig ? store.getSmtpSendConfig() : null
  if (!cfg) return fail('smtp-not-configured')
  let msg = null
  // Merge the superadmin's stored overrides (subject/heading/body/ctaLabel) with
  // the data so admins can edit every email from the dashboard.
  const overrides = (store.getEmailTemplate ? store.getEmailTemplate(type) : {}) || {}
  try { msg = renderEmail(type, data || {}, overrides) } catch { msg = null }
  if (!msg || !msg.subject || (!msg.html && !msg.text)) return fail('no-template')
  // Language-aware delivery: translate the rendered prose into the recipient's
  // pinned language (best-effort, English fallback + logged). Only on the
  // non-critical path - critical mail (set-password / reset links) stays English
  // and FAST so a blocking user action is never slowed, per the async/non-blocking
  // rule; the time-sensitive 6-digit code emails live in mailer.js and are out of
  // scope entirely. English/unset language or no AI runtime is a clean no-op, so
  // emails keep working with no AI and no language set.
  if (!critical) {
    try {
      const lang = (typeof store.workUserLanguageByEmail === 'function') ? store.workUserLanguageByEmail(to) : null
      if (lang && !isEnglishLang(lang)) {
        const translated = await translateEmailMessage(msg, lang, type)
        if (translated) msg = translated
      }
    } catch (e) { logEmailTranslationFallback(type, 'unknown', (e && e.message) || 'error') }
  }
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

// Confirm a password was just changed. Fired from the store's password_changed
// event (both setUserPasswordById and setWorkUserPassword), so callers do not
// invoke it directly - doing so would send the notice twice.
export function sendPasswordChangedAsync(userId) {
  // Recipient is resolved synchronously (like every other store-event handler)
  // so the notice reflects the account as it was at the moment of the change.
  const u = store.getUser(userId); if (!u || u.ssoEmail) return
  const to = userEmail(u.id); if (!to) return
  sendTemplateAsync('password_changed', to, { name: userName(u), username: u.username })
}

// ---- Store-event subscriber: support tickets + account security notices ----
// The store emits a named event from the mutation itself (store.onStoreEvent),
// so every route that performs the action - superadmin console, company admin,
// self-service - triggers the same communication with no per-route wiring.
// Each handler resolves recipients, builds the template data, and fires
// sendTemplateAsync (never awaits, never throws; failures land in the incident
// log through sendTemplate). Staff alerts reuse the superadmin-set notification
// inbox (store.getNotifySettings().contactTo), the same one Contact Us uses.
const SUPPORT_URL = `${APP_BASE}/work?tab=support`
const ADMIN_URL = `${APP_BASE}/work/admin`

function userEmail(userId) {
  return (typeof store.effectiveUserEmail === 'function') ? store.effectiveUserEmail(userId) : null
}
function userName(u) { return (u && (u.displayName || u.username)) || '' }
function staffInbox() {
  try { const n = typeof store.getNotifySettings === 'function' ? store.getNotifySettings() : null; return (n && n.contactTo) || null } catch { return null }
}

function ticketCommon(t) {
  const u = store.getUser(t.userId)
  const company = (u && u.companyId && typeof store.getCompany === 'function') ? ((store.getCompany(u.companyId) || {}).name || '') : ''
  return { u, ticketId: t.id, subject: t.subject || '(no subject)', category: t.category || 'other', company }
}

// Requester opened a ticket: confirmation to them + alert to staff.
function onTicketCreated({ ticket: t, message }) {
  if (!t) return
  const { u, ticketId, subject, category, company } = ticketCommon(t)
  const to = userEmail(t.userId)
  if (to) sendTemplateAsync('ticket_received', to, { name: userName(u), ticketId, subject, category, message: message || '', createdAt: t.createdAt, ticketUrl: SUPPORT_URL })
  const inbox = staffInbox()
  if (inbox) sendTemplateAsync('ticket_staff_notify', inbox, { event: 'New support ticket', name: userName(u) || t.username, username: t.username, email: to || '', company, ticketId, subject, category, status: t.status || 'open', message: message || '', submittedAt: t.createdAt, adminUrl: ADMIN_URL })
}
// Staff replied: "you have a reply" to the requester.
function onTicketAdminReply({ ticket: t, message: m }) {
  if (!t || !m) return
  const { u, ticketId, subject } = ticketCommon(t)
  const to = userEmail(t.userId)
  if (to) sendTemplateAsync('ticket_reply', to, { name: userName(u), ticketId, subject, status: t.status || 'open', reply: m.text || '', repliedBy: m.by || 'Support', repliedAt: m.at, ticketUrl: SUPPORT_URL })
}
// Requester replied (ticket reopened): staff alert so it does not wait unseen.
function onTicketUserReply({ ticket: t, message: m }) {
  if (!t || !m) return
  const { u, ticketId, subject, category, company } = ticketCommon(t)
  const inbox = staffInbox()
  if (inbox) sendTemplateAsync('ticket_staff_notify', inbox, { event: 'New reply on a support ticket', name: userName(u) || t.username, username: t.username, email: userEmail(t.userId) || '', company, ticketId, subject, category, status: t.status || 'open', message: m.text || '', submittedAt: m.at, adminUrl: ADMIN_URL })
}
// Account disabled / re-enabled by an administrator: tell the owner.
function onUserAccess(type, { userId, reason, at }) {
  const u = store.getUser(userId); if (!u) return
  const to = userEmail(u.id); if (!to) return
  if (type === 'user_disabled') sendTemplateAsync('account_disabled', to, { name: userName(u), username: u.username, reason: reason || '', disabledAt: at })
  else sendTemplateAsync('account_enabled', to, { name: userName(u), username: u.username, enabledAt: at })
}
// Authenticator reset (by an admin or by the owner): security notice.
function onMfaReset({ userId, self, at }) {
  const u = store.getUser(userId); if (!u) return
  const to = userEmail(u.id); if (!to) return
  sendTemplateAsync('mfa_reset', to, { name: userName(u), username: u.username, resetBy: self ? 'you' : 'an administrator', resetAt: at })
}
// Company disabled / re-enabled: tell each company administrator.
function onCompanyAccess(type, { name, adminIds, reason, at }) {
  for (const id of (Array.isArray(adminIds) ? adminIds : [])) {
    const u = store.getUser(id); if (!u) continue
    const to = userEmail(u.id); if (!to) continue
    if (type === 'company_disabled') sendTemplateAsync('company_disabled', to, { name: userName(u), company: name || '', reason: reason || '', disabledAt: at })
    else sendTemplateAsync('company_enabled', to, { name: userName(u), company: name || '', enabledAt: at })
  }
}

// ---- Enterprise quota alerts (email channel; dashboard is the primary one) -
// The company admins / owner also get an in-app notification (store), so a
// down mailer never loses the alert (graceful degradation). These never throw.
function companyAdminRecipients(companyId) {
  try {
    return (store.listCompanyUsers(companyId) || [])
      .filter((u) => u.companyRole === 'company_admin')
      .map((u) => ({ name: u.displayName || u.username, to: (typeof store.effectiveUserEmail === 'function') ? store.effectiveUserEmail(u.id) : u.email }))
      .filter((r) => r.to)
  } catch { return [] }
}
async function onCompanyPoolThreshold(p) {
  const company = p.companyName || ''
  for (const to of OWNER_ALERT_RECIPIENTS) await sendTemplate('company_pool_threshold', to, { company, companyName: company, pct: p.pct }, {})
}
async function onHoursRequested(p) {
  const company = p.companyName || ''
  for (const to of OWNER_ALERT_RECIPIENTS) await sendTemplate('company_hours_requested', to, { company, companyName: company, hours: p.hours, byName: p.byName || '', note: p.note || '' }, {})
}
async function onUserCeilingThreshold(p) {
  for (const r of companyAdminRecipients(p.companyId)) await sendTemplate('user_ceiling_threshold', r.to, { name: r.name, company: p.companyName || '', userName: p.userName || '', pct: p.pct }, {})
}
async function onHoursDecided(p) {
  for (const r of companyAdminRecipients(p.companyId)) await sendTemplate('company_hours_decided', r.to, { name: r.name, company: p.companyName || '', hours: p.hours, status: p.status, note: p.note || '' }, {})
}
function fireAndForget(promise) { Promise.resolve(promise).catch(() => { /* already logged by sendTemplate */ }) }

// ---- Enterprise project/task assignment notifications ---------------------
// A member is told when a PM gives them a task, a PM is told when a project is
// handed to them, and a person is told when a procedure (template) is assigned.
// Recipients are resolved synchronously; delivery is async + localized. The
// store never emits these to the actor themselves (no self-notification).
function onWorkTaskAssigned(p) {
  const u = store.getUser(p.assigneeId); if (!u) return
  const to = userEmail(u.id); if (!to) return
  const by = p.byId ? store.getUser(p.byId) : null
  sendTemplateAsync('work_task_assigned', to, {
    name: userName(u), byName: (by && userName(by)) || 'A project manager',
    taskTitle: p.taskTitle || 'a task', projectName: p.projectName || 'a project',
    url: `${APP_BASE}/work/queue`,
  })
}
function onWorkProjectAssigned(p) {
  const u = store.getUser(p.managerId); if (!u) return
  const to = userEmail(u.id); if (!to) return
  const by = p.byId ? store.getUser(p.byId) : null
  sendTemplateAsync('work_project_assigned', to, {
    name: userName(u), byName: (by && userName(by)) || 'A senior project manager',
    projectName: p.projectName || 'a project', url: `${APP_BASE}/work/pm`,
  })
}
function onWorkTemplateAssigned(p) {
  const u = store.getUser(p.userId); if (!u) return
  const to = userEmail(u.id); if (!to) return
  const by = p.byId ? store.getUser(p.byId) : null
  sendTemplateAsync('work_template_assigned', to, {
    name: userName(u), byName: (by && userName(by)) || 'Your team',
    templateName: p.templateName || 'a procedure', url: `${APP_BASE}/work`,
  })
}
const _byName = (id, fallback) => { const b = id ? store.getUser(id) : null; return (b && userName(b)) || fallback }
const ROLE_LABELS = { project_manager: 'Project manager', senior_project_manager: 'Senior project manager', grc: 'GRC (read-only oversight)', company_admin: 'Company admin', executive: 'Executive', member: 'Member' }
const FLOW_LABELS = { worker: 'Worker', independent: 'Independent', mixed: 'Mixed' }
function onWorkTaskUnassigned(p) {
  const u = store.getUser(p.assigneeId); if (!u) return; const to = userEmail(u.id); if (!to) return
  sendTemplateAsync('work_task_unassigned', to, { name: userName(u), byName: _byName(p.byId, 'A project manager'), taskTitle: p.taskTitle || 'a task', projectName: p.projectName || 'a project', url: `${APP_BASE}/work/queue` })
}
function onWorkTaskCompleted(p) {
  const u = store.getUser(p.managerId); if (!u) return; const to = userEmail(u.id); if (!to) return
  sendTemplateAsync('work_task_completed', to, { name: userName(u), doerName: _byName(p.assigneeId, 'Someone'), taskTitle: p.taskTitle || 'a task', projectName: p.projectName || 'a project', url: `${APP_BASE}/work/pm` })
}
function onWorkProjectUnassigned(p) {
  const u = store.getUser(p.managerId); if (!u) return; const to = userEmail(u.id); if (!to) return
  sendTemplateAsync('work_project_unassigned', to, { name: userName(u), byName: _byName(p.byId, 'A senior project manager'), projectName: p.projectName || 'a project', url: `${APP_BASE}/work/pm` })
}
function onWorkProjectHeld(p) {
  const u = store.getUser(p.userId); if (!u) return; const to = userEmail(u.id); if (!to) return
  sendTemplateAsync('work_project_held', to, { name: userName(u), byName: _byName(p.byId, 'A project manager'), projectName: p.projectName || 'a project', reason: p.reason || 'No reason was given.', url: `${APP_BASE}/work` })
}
function onWorkProjectResumed(p) {
  const u = store.getUser(p.userId); if (!u) return; const to = userEmail(u.id); if (!to) return
  sendTemplateAsync('work_project_resumed', to, { name: userName(u), byName: _byName(p.byId, 'A project manager'), projectName: p.projectName || 'a project', url: `${APP_BASE}/work` })
}
function onWorkAccessChanged(p) {
  const u = store.getUser(p.userId); if (!u) return; const to = userEmail(u.id); if (!to) return
  sendTemplateAsync('work_access_changed', to, { name: userName(u), role: ROLE_LABELS[p.role] || 'Member', flow: FLOW_LABELS[p.flow] || 'Independent', url: `${APP_BASE}/work` })
}
function onWorkHoursGranted(p) {
  const u = store.getUser(p.userId); if (!u) return; const to = userEmail(u.id); if (!to) return
  sendTemplateAsync('work_hours_granted', to, { name: userName(u), minutes: String(p.minutes || 0), url: `${APP_BASE}/work` })
}
function onWorkMemberRemoved(p) {
  const u = store.getUser(p.userId); if (!u) return; const to = userEmail(u.id); if (!to) return
  sendTemplateAsync('work_member_removed', to, { name: userName(u), orgName: p.companyName || 'your company' })
}

export function handleStoreEvent(type, payload = {}) {
  switch (type) {
    case 'work_task_assigned': return onWorkTaskAssigned(payload)
    case 'work_task_unassigned': return onWorkTaskUnassigned(payload)
    case 'work_task_completed': return onWorkTaskCompleted(payload)
    case 'work_project_assigned': return onWorkProjectAssigned(payload)
    case 'work_project_unassigned': return onWorkProjectUnassigned(payload)
    case 'work_project_held': return onWorkProjectHeld(payload)
    case 'work_project_resumed': return onWorkProjectResumed(payload)
    case 'work_template_assigned': return onWorkTemplateAssigned(payload)
    case 'work_access_changed': return onWorkAccessChanged(payload)
    case 'work_hours_granted': return onWorkHoursGranted(payload)
    case 'work_member_removed': return onWorkMemberRemoved(payload)
    case 'ticket_created': return onTicketCreated(payload)
    case 'ticket_admin_reply': return onTicketAdminReply(payload)
    case 'ticket_user_reply': return onTicketUserReply(payload)
    case 'user_disabled':
    case 'user_enabled': return onUserAccess(type, payload)
    case 'mfa_reset': return onMfaReset(payload)
    case 'password_changed': return sendPasswordChangedAsync(payload.userId)
    case 'company_disabled':
    case 'company_enabled': return onCompanyAccess(type, payload)
    case 'company_pool_threshold': return fireAndForget(onCompanyPoolThreshold(payload))
    case 'hours_requested': return fireAndForget(onHoursRequested(payload))
    case 'user_ceiling_threshold': return fireAndForget(onUserCeilingThreshold(payload))
    case 'hours_decided': return fireAndForget(onHoursDecided(payload))
    default: return undefined
  }
}
// Subscribe once at import. index.js (and work-admin.js) import this module at
// boot, so the hook is live before any route can run.
if (typeof store.onStoreEvent === 'function') store.onStoreEvent(handleStoreEvent)
