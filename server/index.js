// ---------------------------------------------------------------------------
// WorkCoPilot - standalone single-origin server: REST API + built React SPA.
// ---------------------------------------------------------------------------
// WorkCoPilot ONLY. A WorkCoPilot user IS the account (role user|admin|
// superadmin); "has WorkCoPilot access" is always true for any signed-in user.
// READ-ONLY screen-aware guide: it plans a goal into steps, then watches
// downscaled frames and advances each step when its validation shows on screen.
//
// Readiness gate: platform AI (superadmin-allowed) OR the user's own TESTED key;
// vision needs a vision-capable model or we say exactly what to do (never a
// silent fallback - SUPREME RULE III/VIII). User text is scrubbed of PII/PHI/
// secrets before anything leaves to an AI provider. No em dashes anywhere.
// ---------------------------------------------------------------------------
import express from 'express'
import session from 'express-session'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import * as store from './store.js'
import * as ai from './ai.js'
import * as docs from './docs.js'
import * as work from './work.js'
import { buildWorkReportPdf, buildDeliverablesPdf, buildComplianceReportPdf } from './pdf.js'
import { sendMail } from './mailer.js'
import { verifyReport, attestReport, attestationText, REPORT_CONTACTS } from './report_sign.js'
import { formatWorkReportText } from './report_text.js'
import { COMPLIANCE_FRAMEWORKS } from './compliance_frameworks.js'
import { sendTemplate, sendTemplateAsync, sendAccountWelcomeAsync, sendPasswordReset } from './emails.js'
import { EMAIL_DEFS, renderEmail } from './email_templates.js'
import { Writable } from 'node:stream'
import { registerWorkAdminRoutes } from './work-admin.js'
import { registerWorkShotRoutes } from './work-shots.js'
import { registerWorkDocsRoutes } from './work-docs.js'
import { registerWorkImageRoutes } from './work-images.js'
import { registerSsoRoutes } from './sso.js'
import { registerSocialRoutes } from './social.js'
// Legal consent (clickwrap): the current agreements + version every account must
// accept to use the platform. ONE source of truth (SUPREME RULE II); the signup
// gate, the accept endpoint, and the re-consent gate all read from here.
import { LEGAL_VERSION, legalManifest } from './legal.js'
import * as integrations from './integrations.js'
import { registerWorkBillingRoutes, workStripeWebhook, billingConfigured } from './billing.js'
import { registerAffiliateRoutes, bindReferralOnSignup } from './affiliate.js'
import { claimsReport, claimsMarkdown } from './claims.js'
import { scrubSensitive, scrubWithPolicy, redactionSummary, POLICY_CATEGORIES } from './work-scrub.js'
// Company Brain (per-tenant encrypted knowledge). The server stores the scrubbed,
// already-embedded chunks the desktop sends (it does not re-embed documents), and
// grounds plans from them. configure* are wired at boot; retrieveForGoal is the
// primary company grounding (added alongside skills, never replacing them).
import { configureBrainCrypto, enableCustomerCustody, unlockWithPassphrase, unlockWithRecovery, changePassphrase, lock as brainLock, isUnlocked as brainUnlocked } from './brain_crypto.js'
import { brainStore, configureBrainStore } from './brain_store.js'
import { buildCompanyArchive } from './customer_export.js'
import { retrieveForGoal } from './brain_retrieve.js'
import { buildManifest } from './brain_ingest.js'
import { EMBED, policyVersionOf } from './brain_model.js'
import { embedderReady } from './brain_embed.js'
import { securityReview } from './security_gate.js'
import { enforceRules, extractRulesAI, extractRulesHeuristic, ruleSummary } from './policy_rules.js'
import { COMPLIANCE_PRESETS, COMPLIANCE_LABELS } from './compliance-presets.js'
import { estimateCostUsd } from './model-prices.js'
import * as llmGuard from './llm_guard.js'
import * as extractionWatch from './extraction_watch.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const DIST = path.join(ROOT, 'dist')
// Dev: the Vite proxy (vite.config.js) points /api at :4444, so default to that.
const PORT = process.env.PORT || 4444
const HOSTED = process.env.WORK_HOSTED === '1'
// Optional: a Tavily key enables live web grounding for plan/howto/research. When
// unset, guidance is produced from the model's own knowledge (still fully
// functional); no other provider is contacted.
const WORK_TAVILY_KEY = process.env.WORK_TAVILY_KEY || ''

const app = express()
app.disable('x-powered-by')
// Stripe webhook MUST read the RAW body to verify the signature, so it is
// mounted BEFORE the json parser (otherwise express.json consumes the body and
// the signature check fails). Guarded so a missing key never crashes anything.
app.post('/api/work/stripe/webhook', express.raw({ type: '*/*' }), workStripeWebhook({ store }))
app.use(express.json({ limit: '16mb' })) // generous: pasted base64 frames + uploaded reference docs (base64)

// express-session's default MemoryStore does not survive a restart, which would
// force a fresh login every time (and break the desktop buddy window sharing the
// session). Back sessions with store.js's own atomic-persisted db.json instead.
class FileSessionStore extends session.Store {
  get(sid, cb) { cb(null, store.getSessionRecord(sid)) }
  set(sid, sess, cb) { store.setSessionRecord(sid, sess); cb(null) }
  destroy(sid, cb) { store.destroySessionRecord(sid); cb(null) }
  touch(_sid, _sess, cb) { cb(null) } // maxAge is fixed at login, not extended on activity
}

// Hosted behind nginx/TLS: trust the proxy and mark the cookie Secure. Left off
// for local/desktop runs, where a Secure cookie would never be stored.
if (HOSTED) app.set('trust proxy', 1)

// ---- Security response headers (defense-in-depth; audit APP-06 / WEB-09) ----
// Non-breaking headers on every response. HSTS only when hosted behind TLS.
// Permissions-Policy ALLOWS the capture features the product genuinely needs
// (camera, microphone, display-capture) for same-origin only, and denies the
// rest. The CSP ships REPORT-ONLY first, tuned to the real app (inline styles,
// the on-device OCR worker loaded from a CDN, data:/blob: images and workers,
// Google Fonts), so a strict policy can be validated from violation reports
// before it is switched to enforcing.
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'SAMEORIGIN')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(self), display-capture=(self), geolocation=(), payment=(self)')
  if (HOSTED) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  res.setHeader('Content-Security-Policy-Report-Only', [
    "default-src 'self'",
    "script-src 'self' https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    "img-src 'self' data: blob: https:",
    "media-src 'self' data: blob:",
    "connect-src 'self' https://cdn.jsdelivr.net",
    "worker-src 'self' blob:",
    "frame-ancestors 'self'", "base-uri 'self'", "form-action 'self'",
  ].join('; '))
  next()
})

// ---- Sanctions / embargo geo-block (compliance) --------------------------
// Block comprehensively US-embargoed jurisdictions from the public site and the
// app BEFORE anything loads (HTTP 451 Unavailable For Legal Reasons). The
// visitor's country is read from the edge (CDN / nginx) country header - we do
// NOT geolocate here. FAIL-OPEN by design: an unknown country is never blocked,
// so a missing header can never take the whole site down (SUPREME RULE VIII);
// the edge must set a country header for this to take effect. The Stripe webhook
// (registered above) is unaffected. Fully configurable via env:
//   WORK_SANCTIONS_COUNTRIES  comma list of ISO-3166 alpha-2 (default below)
//   WORK_SANCTIONS_HEADER     an extra header name to check first
//   WORK_SANCTIONS_OFF=1      disable entirely
// NOTE: the authoritative sanctions list is a LEGAL determination - this default
// (OFAC comprehensively-embargoed countries) must be reviewed by counsel and
// kept current. Region-level embargoes (Crimea / Donetsk / Luhansk within UA)
// need region-level geo data at the edge and are added there, not here.
const SANCTIONS_OFF = process.env.WORK_SANCTIONS_OFF === '1'
const SANCTIONED_COUNTRIES = new Set(
  String(process.env.WORK_SANCTIONS_COUNTRIES || 'CU,IR,KP,SY')
    .split(',').map((c) => c.trim().toUpperCase()).filter(Boolean),
)
const COUNTRY_HEADERS = ['cf-ipcountry', 'x-country', 'x-geo-country', 'x-vercel-ip-country', 'x-appengine-country']
function visitorCountry(req) {
  const custom = process.env.WORK_SANCTIONS_HEADER
  const names = custom ? [String(custom).toLowerCase(), ...COUNTRY_HEADERS] : COUNTRY_HEADERS
  for (const h of names) {
    const v = req.headers[h]
    if (v) { const c = String(v).trim().toUpperCase(); if (c && c !== 'XX' && c !== 'T1') return c }
  }
  return null
}
if (!SANCTIONS_OFF && SANCTIONED_COUNTRIES.size) {
  app.use((req, res, next) => {
    const c = visitorCountry(req)
    if (!c || !SANCTIONED_COUNTRIES.has(c)) return next()
    // Log page-level blocks so an operator can see embargoed traffic; skip assets
    // to avoid flooding the incident feed.
    const isPage = !req.path.startsWith('/api/') && !/\.[a-z0-9]{2,5}$/i.test(req.path)
    try { if (isPage && store.recordWorkIncident) store.recordWorkIncident({ kind: 'sanctions_block', message: `Blocked request from ${c}: ${req.path}`.slice(0, 200) }) } catch { /* never break on logging */ }
    console.warn(`[sanctions] blocked request from ${c} ${req.method} ${req.path}`)
    res.status(451)
    if (req.path.startsWith('/api/')) return res.json({ error: 'This service is not available in your location.', code: 'unavailable_legal' })
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    return res.send('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unavailable</title></head><body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:40rem;margin:12vh auto;padding:0 1.25rem;color:#1a1a1a"><h1 style="font-size:1.4rem;margin:0 0 .6rem">WorkCoPilot is not available in your location</h1><p style="color:#555;line-height:1.6;margin:0">For legal and regulatory reasons, WorkCoPilot (AdmireVeda / COE Security LLC) cannot be offered in your country. If you believe this is a mistake, contact support@admireveda.com.</p></body></html>')
  })
}

app.use(session({
  name: 'workcopilot.sid',
  store: new FileSessionStore(),
  secret: process.env.SESSION_SECRET || store.newSessionSecret(),
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', secure: HOSTED, maxAge: 1000 * 60 * 60 * 8 }, // 8h
}))

// ---- helpers --------------------------------------------------------------
// Turn any thrown error into a user-safe response. SYSTEM errors (AI provider
// failures, rate limits, timeouts, and unexpected 500s) are hidden behind a
// generic "system is busy" message and recorded as an incident the superadmin
// can read with the real cause, so a user never sees a raw provider or system
// error. Deliberate, actionable 4xx errors we raise ourselves pass through
// unchanged (add a goal, no seat, use company SSO, company AI keys not set).
function isSystemError(e) {
  if (!e) return true
  if (e.ai) return true                       // any AI-layer failure (quota, key, 5xx)
  if (!e.status) return true                   // unexpected throw
  return e.status >= 500 || e.status === 429   // server error or rate limit
}
function sendWorkError(res, e, req) {
  if (isSystemError(e)) {
    try {
      const wu = (req && req.workUser) || {}
      store.recordWorkIncident({
        kind: (e && e.ai) ? 'ai_error' : 'system_error',
        status: (e && e.status) || null,
        message: ((e && e.code) ? `[${e.code}] ` : '') + ((e && e.message) || 'unknown error'),
        userId: wu.id || null, username: wu.username || '',
        companyId: wu.companyId || null,
        sessionId: (req && req.params && req.params.id) || null,
        call: (req && (req.path || req.originalUrl)) || null,
      })
    } catch { /* never fail on logging */ }
    const extra = (e && e.status === 429) ? ' It may be a few minutes.' : ''
    const ref = (e && e.code) ? ` (ref ${e.code})` : ''
    return res.status(503).json({ error: `The system is busy right now${ref}. Please try again in a little while.${extra}`, busy: true, code: (e && e.code) || null })
  }
  const body = { error: (e && e.message) || 'Server error' }
  if (e && e.locked) { body.locked = true; body.stepUp = e.stepUp || null }   // AI-config OTP step-up lapsed
  return res.status((e && e.status) || 500).json(body)
}
// The language the AI should write its guidance in. The client sends an explicit
// `locale` in the request body; when absent we fall back to the first tag of the
// Accept-Language header, then to 'en'. work.* treats 'en'/unknown as a no-op, so
// this is safe until the client starts sending `locale`.
function readLocale(req) {
  // The user's EXPLICITLY chosen UI language wins: the client sends it on every
  // request as X-WC-Locale (from localStorage 'wc_locale'), so guidance, scope
  // questions and emails render in that language across the app, not just the
  // marketing pages. Fall back to an explicit body.locale, then the browser's
  // Accept-Language, then English. withLocale() validates the code downstream.
  const hdr = String((req && req.headers && req.headers['x-wc-locale']) || '').trim()
  if (hdr) return hdr
  const body = (req && req.body && typeof req.body.locale === 'string') ? req.body.locale.trim() : ''
  if (body) return body
  const al = String((req && req.headers && req.headers['accept-language']) || '').trim()
  const first = al ? al.split(',')[0].split(';')[0].trim() : ''
  return first || 'en'
}
const wrap = (fn) => (req, res) => {
  try { fn(req, res) }
  catch (e) { sendWorkError(res, e, req) }
}
// One place that turns a verified user into a live session, so epoch/loginAt are
// never set on one path and forgotten on another.
//
// SINGLE ACTIVE SESSION (one location at a time, no multi-logins): every
// successful login BUMPS the account's session epoch, which invalidates every
// other live session for this user - their next request fails the epoch check in
// requireAuth / resolveWorkIdentity and is signed out with { loggedOut:true }.
// The new session is then stamped with the fresh epoch, so only this location
// stays signed in. establishSession is the one chokepoint every login path flows
// through (password, MFA, SSO, social), so every path enforces this (SUPREME
// RULE II: single source - no login path can forget it).
function establishSession(req, u) {
  const epoch = store.bumpSessionEpoch(u.id)
  req.session.uid = u.id
  req.session.loginAt = Date.now()
  req.session.epoch = epoch
}
// Signed-in account (any role). Logout-everywhere via the session epoch.
function requireAuth(req, res, next) {
  const u = req.session.uid && store.getUser(req.session.uid)
  if (!u) return res.status(401).json({ error: 'Not signed in' })
  if ((req.session.epoch || 0) !== store.getSessionEpoch(u.id)) {
    return req.session.destroy(() => res.status(401).json({ error: 'Signed out.', loggedOut: true }))
  }
  req.user = u
  next()
}
// Resolve the WorkCoPilot identity a session is ACTING AS, honoring a superadmin's
// support-impersonation overlay. SINGLE source of truth (SUPREME RULE II) so
// requireWorkAuth and GET /api/work/me can never disagree about who the session
// is. The authenticated identity (session.uid) is ALWAYS the real signed-in
// account - admin authority (requireAuth/requireSuperAdmin) reads it unchanged.
// session.workUserId only overlays the acting WORK user, and that overlay is
// honored ONLY on a real superadmin session, only onto a different, EXISTING
// user. A stray/forged workUserId on a non-superadmin session (or pointing at a
// deleted account) never silently flips identity (SUPREME RULE III: fail
// visibly, fall back to the real account - never act as someone unverified).
// Returns:
//   { ok:true, user, workUser, impersonating }  resolved (impersonating:null when not)
//   { stale:true }                               epoch no longer matches -> sign out
//   null                                         not signed in
function resolveWorkIdentity(req) {
  const realId = req.session && req.session.uid
  const real = realId && store.getUser(realId)
  if (!real) return null
  if ((req.session.epoch || 0) !== store.getSessionEpoch(real.id)) return { stale: true }
  const impId = req.session.workUserId
  if (impId && impId !== real.id && real.role === 'superadmin') {
    const target = store.getUser(impId)
    if (target) {
      return {
        ok: true,
        user: target,
        workUser: store.ensureWorkUser(target.id, target.username),
        impersonating: { by: real.displayName || real.username || real.id, since: req.session.impersonatorAt || null },
      }
    }
    // Overlay points at a vanished account: do NOT keep acting as a ghost. Fall
    // through to the admin's own identity (overlay inert) - visible, never silent.
  }
  return { ok: true, user: real, workUser: store.ensureWorkUser(real.id, real.username), impersonating: null }
}
// WorkCoPilot auth: a signed-in account always has WorkCoPilot access (it IS the
// account). Sets req.user + req.workUser (the acting user - the impersonated
// target on a superadmin support session, else the signed-in account) and
// req.impersonating (the banner payload, or null).
function requireWorkAuth(req, res, next) {
  const id = resolveWorkIdentity(req)
  if (!id) return res.status(401).json({ error: 'Not signed in' })
  if (id.stale) return req.session.destroy(() => res.status(401).json({ error: 'Signed out.', loggedOut: true }))
  req.user = id.user
  req.workUser = id.workUser
  req.impersonating = id.impersonating
  next()
}
// Best-effort client IP for consent/audit records: the first X-Forwarded-For hop
// (we sit behind nginx), else the socket address. Bounded by the caller.
function ipOf(req) {
  return (String((req.headers && req.headers['x-forwarded-for']) || '').split(',')[0].trim())
    || req.ip || (req.socket && req.socket.remoteAddress) || null
}
// Billing gate for the "use the service" actions (start a session + the
// guidance calls). Free signup still gives dashboard access, so /me, /signup
// and viewing are never gated - only the actions that actually guide. Runs
// AFTER requireWorkAuth (needs req.workUser). Company members are covered by the
// company; a personal account needs a live plan.
function requireWorkSubscription(req, res, next) {
  // LEGAL CONSENT GATE (whoever it is): no account - email signup, social login,
  // company SSO, or admin-created - may USE the platform until it has accepted the
  // CURRENT agreements. A version bump re-arms this for everyone. Checked BEFORE
  // the admin bypass so it applies to every role; the client shows a blocking
  // consent modal on legalRequired and the user accepts via POST /api/work/legal/accept.
  if (req.workUser && !store.hasAcceptedCurrentLegal(req.workUser.id)) {
    return res.status(403).json({ error: 'Please review and accept the current Terms and Privacy Policy to continue.', legalRequired: true, version: LEGAL_VERSION })
  }
  // Always let admins and superadmins through for operator testing.
  if (req.user && (req.user.role === 'superadmin' || req.user.role === 'admin')) return next()
  // A superadmin-disabled account - or a disabled company - is blocked from ALL
  // service immediately, regardless of billing/seat/subscription state, so a block
  // reflects downstream the moment it is set (the session epoch bump also signs
  // them out everywhere). Checked before any billing-config branch below.
  if (req.workUser) {
    const wu = store.getUser(req.workUser.id)
    if (wu && wu.disabled) return res.status(403).json({ error: 'This account has been disabled. Please contact your administrator.', disabled: true })
    if (wu && wu.companyId) { const c = store.getCompany(wu.companyId); if (c && c.disabled) return res.status(403).json({ error: 'Your company account has been disabled. Please contact your administrator.', disabled: true }) }
  }
  // Company members are covered by a company LICENSE SEAT, not by Stripe, so the
  // seat check applies whether or not Stripe is configured. (Before this, an
  // unconfigured Stripe skipped seat enforcement entirely, so a company could
  // run every over-cap member for free.)
  if (req.workUser && req.workUser.companyId) {
    if (!store.userCanUseService(req.workUser.id)) {
      return res.status(402).json({ error: 'Your company has no license seat for you right now. Ask your company admin to free a seat or add licenses.', needsSeat: true })
    }
    return requireWorkTime(req, res, next)
  }
  // Personal accounts: enforce subscriptions only once billing is actually
  // configured (so existing users are never locked out before Stripe is set up).
  // "Configured" is a usable secret key from the store (superadmin set it in the
  // console) OR the env var.
  if (!billingConfigured(store)) return requireWorkTime(req, res, next)
  if (!store.userCanUseService(req.workUser.id)) {
    return res.status(402).json({ error: 'A subscription is needed to start guiding.', needsSubscription: true })
  }
  requireWorkTime(req, res, next)
}
// Out-of-time gate: a seat / subscription lets you IN, but you still need time
// left today (free daily minutes + purchased balance + company pool). When it is
// all used up we stop the chargeable actions server-side with an ACTIONABLE
// message, instead of relying on the client to notice the heartbeat. Enterprise
// behaviour: never silently keep consuming AI past the limit.
function requireWorkTime(req, res, next) {
  try {
    const usage = store.getWorkUsage(req.workUser.id)
    if (usage && usage.exhausted) {
      const how = req.workUser.companyId
        ? 'Your company admin can allocate more minutes from the company pool.'
        : 'Add hours from your dashboard to keep going now.'
      return res.status(402).json({
        error: `You have used all your WorkCoPilot time for today. It resets at ${usage.resetLabel || '11:59 PM ET'}. ${how}`,
        needsTime: true, resetLabel: usage.resetLabel || '11:59 PM ET',
      })
    }
  } catch (e) {
    // Never block a paying user on a usage-read error - but do NOT fail silently:
    // record an incident so the operator sees that metering degraded (the action
    // is allowed through, which could let usage past the cap go unmetered).
    try { store.recordWorkIncident({ kind: 'metering_degraded', message: 'usage read failed; action allowed without metering: ' + (e && e.message ? e.message : 'unknown'), userId: req.workUser && req.workUser.id, call: 'requireWorkTime' }) } catch { /* best effort */ }
  }
  next()
}
// 'accounting' may OPEN the admin console (to reach Finance) but every other
// admin endpoint stays requireSuperAdmin, and the console UI shows only Finance
// to an accounting viewer. Finance endpoints gate on store.isFinanceUser.
const ADMIN_ROLES = new Set(['admin', 'superadmin', 'accounting', 'affiliate_admin'])
function requireAdmin(req, res, next) {
  if (!req.user || !ADMIN_ROLES.has(req.user.role)) return res.status(403).json({ error: 'Admin access required' })
  next()
}
function requireSuperAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'superadmin') return res.status(403).json({ error: 'Superadmin only.' })
  next()
}
// The affiliate admin is a separate admin account (role 'affiliate_admin');
// superadmin also qualifies. Gates the affiliate-program management endpoints.
function requireAffiliateAdmin(req, res, next) {
  if (!req.user || !store.isAffiliateAdmin(req.user.id)) return res.status(403).json({ error: 'Affiliate admin access required.' })
  next()
}
// AI configuration is a critical page: it is OTP step-up gated (owner 2026-10-23).
// Run AFTER requireAuth/requireSuperAdmin. Throws 403 {locked:true} when the
// authenticator window is not active, so the client re-prompts for the code.
function requireAiStepUp(req, res, next) {
  try { store.requireAiStepUpActive(req.user.id); next() }
  catch (e) { sendWorkError(res, e, req) }
}
// A company admin manages users within their OWN company. Superadmin passes too.
// Must run AFTER requireWorkAuth (needs req.user + req.workUser).
function requireCompanyAdmin(req, res, next) {
  if (req.user && req.user.role === 'superadmin') return next()
  const wu = req.workUser
  if (!wu || wu.companyRole !== 'company_admin' || !wu.companyId) return res.status(403).json({ error: 'Company admin access required.' })
  next()
}
// Executive (or company admin / superadmin) may view the company productivity
// dashboard. Its payload carries NO AI model and NO AI cost (business rules);
// the "savings" there are the customer's hypothetical ROI, not our cost.
function requireExecutive(req, res, next) {
  if (req.user && req.user.role === 'superadmin') return next()
  const wu = req.workUser
  if (!wu || !wu.companyId || !['executive', 'company_admin'].includes(wu.companyRole)) {
    return res.status(403).json({ error: 'Executive or company admin access required.' })
  }
  next()
}
// Scrub a session's user-text (goal + event text) before it is sent to an AI
// provider - but ONLY when scrubbing is enabled for this user (superadmin sets
// it per user; off by default). This is the server-side defense-in-depth layer;
// when on, the client has already scrubbed too. See server/work-scrub.js.
// Policy-aware scrub: an ARMED governance policy for the user (their company's,
// else their own) is the enforced criteria and takes precedence; otherwise the
// legacy on/off scrub. govScrub is the single chokepoint outbound text passes
// through. Pass the request's userId so the policy (block words + per-category
// actions) is applied.
function govScrub(userId, text, on) {
  const pol = userId ? store.getEffectiveWorkPolicy(userId) : null
  if (pol) return scrubWithPolicy(String(text || ''), pol).clean
  return on ? scrubSensitive(String(text || '')).clean : String(text || '')
}
function scrubForAi(s, on, userId) {
  const pol = userId ? store.getEffectiveWorkPolicy(userId) : null
  if (!on && !pol) return { goal: (s && s.goal) || '', events: ((s && s.events) || []) }
  const one = (t) => govScrub(userId, t, on)
  return {
    goal: one((s && s.goal) || ''),
    events: (((s && s.events) || [])).map((e) => ({ ...e, text: one(e.text || '') })),
  }
}
// Scrub one string, policy-aware. Pass the request's userId for policy enforcement.
function scrubIf(on, text, userId) { return govScrub(userId, text, on) }
// Accumulate an estimated AI cost on a session AND record per-call telemetry
// (operator transparency; the AI module does not surface exact token counts, so
// cost is a chars/4 estimate). This is the SINGLE choke point for session call
// metrics - every GUIDE/planning AI call lands here with its session, the model
// actually used, and (where threaded) the per-call `tele` from ai.js telling us
// if a round-robin/failover happened. `kind` labels the call (plan/guide/ask/
// compute/result/compose/howto). Premium = the model served was top-tier.
function meterCost(sessionId, model, inText, outText, images = 0, opts = {}) {
  try {
    const usd = estimateCostUsd(model, String(inText || '').length, String(outText || '').length, images)
    if (usd > 0) store.addWorkSessionCost(sessionId, usd)
    if (sessionId && typeof store.recordSessionCall === 'function') {
      const tele = opts && opts.tele
      const owner = (opts && opts.workUserId) || null
      store.recordSessionCall(owner, sessionId, {
        kind: (opts && opts.kind) || 'guide',
        premium: (tele && tele.model) ? ai.isPremiumModel(tele.model) : ai.isPremiumModel(model),
        roundRobin: !!(tele && tele.roundRobin),
        // cost already added above; don't double-count here
      })
    }
  } catch (_) { /* never break a request over metering */ }
}

// ---- WorkCoPilot vision model resolution ----------------------------------
// WorkCoPilot needs a VISION model (it reads the screen). Pick the cheapest
// capable model per provider so the continuous watch stays cheap (the client
// already downscales frames and only sends on change).
const WORK_VISION_PREF = {
  gemini: [/gemini-3\.1-flash-lite(?!-preview|-image)/i, /gemini-3(\.\d)?-flash-lite(?!-preview|-image)/i, /flash-lite-latest/i, /flash-latest/i, /2\.0-flash(?!-lite)/i, /gemini-3(\.\d)?-flash\b/i, /flash-image/i],
  openai: [/gpt-4o-mini(?!-transcribe|-search|-audio)/i, /4\.1-nano/i, /4\.1-mini/i, /gpt-4o(?!-mini|-transcribe|-audio)/i, /gpt-4\.1\b/i, /o4-mini/i],
  groq: [/scout/i, /maverick/i, /llama.*vl/i, /vision/i],
  // OpenRouter: the cheapest verified screen-reader first (Qwen 3.7 Flash, reasoning
  // off), then other cheap Qwen vision models.
  openrouter: [/qwen3\.7-flash/i, /qwen3\.5-flash/i, /qwen3-vl-30b/i, /qwen.*vl.*instruct/i, /qwen.*flash/i],
}
async function pickWorkVision(rt) {
  try {
    const models = await ai.listModels(rt)
    for (const re of (WORK_VISION_PREF[rt.providerId] || [])) {
      const m = models.find((x) => re.test(x))
      if (m) return m
    }
  } catch { /* fall through to the shared resolver */ }
  return await ai.findVisionModel(rt).catch(() => null)
}
// Strongest-first patterns, for the just-in-time backup / Deep switch.
const WORK_VISION_STRONG = {
  gemini: [/gemini-3(\.\d)?-pro/i, /2\.5-pro/i, /gemini-pro.*vision/i, /flash-latest/i, /gemini-3(\.\d)?-flash\b/i, /2\.0-flash(?!-lite)/i],
  openai: [/gpt-4o(?!-mini|-transcribe|-audio|-search)/i, /gpt-4\.1(?!-nano|-mini)/i, /o4\b/i, /gpt-4-turbo/i, /gpt-4o-mini/i],
  groq: [/maverick/i, /scout/i, /llama.*vl/i, /vision/i],
  openrouter: [/qwen3-vl-235b/i, /qwen3\.8/i, /qwen.*vl.*instruct/i, /qwen3\.7-flash/i],
}
async function pickWorkVisionStrong(rt, avoid) {
  try {
    const models = await ai.listModels(rt)
    for (const re of (WORK_VISION_STRONG[rt.providerId] || [])) {
      const m = models.find((x) => re.test(x) && x !== avoid)
      if (m) return m
    }
  } catch { /* none */ }
  return null
}
// A stronger backup {rt, visionModel} than the primary, or null. Prefers a
// stronger model on the SAME provider first, then any other configured provider.
async function findWorkVisionStrong(req, primary) {
  // A company on its own/corporate keys stays on those keys for the backup too.
  // Before this, the "stronger" fallback for a company-key company was picked
  // from the PLATFORM providers, so a company that chose its own keys (and its
  // own data-governance boundary) could have screen frames sent to our keys.
  const companyRt = store.getCompanyRuntime(req.workUser.id)
  const platform = store.getWorkPlatformAllowed()
  const cfgs = companyRt ? [companyRt] : (platform ? store.getConfiguredRuntimes() : [store.getWorkUserRuntime(req.workUser.id)].filter(Boolean))
  const order = []
  if (primary && primary.rt) { const same = cfgs.find((c) => c.providerId === primary.rt.providerId); if (same) order.push(same) }
  for (const c of cfgs) if (!order.includes(c)) order.push(c)
  const avoid = primary && primary.visionModel
  for (const rt of order) {
    const vm = await pickWorkVisionStrong(rt, (primary && primary.rt && rt.providerId === primary.rt.providerId) ? avoid : null)
    if (vm && !(primary && primary.rt && rt.providerId === primary.rt.providerId && vm === avoid)) {
      return { rt: { ...rt, chatModel: vm, visionModel: vm }, visionModel: vm }
    }
  }
  return null
}
// Find a runtime that can SEE, as {rt, visionModel}, or null. Platform path:
// prefer a configured provider with a vision model (Gemini, then OpenAI, then
// Groq). Own-key path: the user's tested key. The chosen vision model serves
// both the vision calls and the text calls (one cheap multimodal model).
async function findWorkVision(req) {
  // Company on its own/corporate keys: use them for vision too.
  const companyRt = store.getCompanyRuntime(req.workUser.id)
  if (companyRt && companyRt.apiKey) {
    const vm = await pickWorkVision(companyRt)
    return vm ? { rt: { ...companyRt, chatModel: vm, visionModel: vm }, visionModel: vm } : null
  }
  if (store.getWorkPlatformAllowed()) {
    const PREF = ['gemini', 'openai', 'groq']
    const cfgs = store.getConfiguredRuntimes()
    cfgs.sort((a, b) => ((PREF.indexOf(a.providerId) + 1) || 99) - ((PREF.indexOf(b.providerId) + 1) || 99))
    for (const rt of cfgs) {
      const vm = await pickWorkVision(rt)
      if (vm) return { rt: { ...rt, chatModel: vm, visionModel: vm }, visionModel: vm }
    }
    return null
  }
  const rt = store.getWorkUserRuntime(req.workUser.id)
  if (!rt || !rt.apiKey) return null
  const vm = await pickWorkVision(rt)
  return vm ? { rt: { ...rt, chatModel: vm, visionModel: vm }, visionModel: vm } : null
}
// ---- AI reliability failover (enterprise scale) ---------------------------
// The alternate provider keys a text call may fail over to, best-first, when the
// primary key has no current model left. ONLY when the data boundary allows it:
// a company or user on their OWN key stays on that key (empty list), so a key
// outage never silently reroutes their screen/text to platform keys. Platform
// mode may move across the admin's configured providers.
function aiAlternates(req, primaryProviderId) {
  const companyRt = store.getCompanyRuntime(req.workUser.id)
  if (companyRt && companyRt.apiKey) return []
  if (!store.getWorkPlatformAllowed()) return []
  return store.getConfiguredRuntimes().filter((r) => r && r.apiKey && r.providerId !== primaryProviderId)
}
// The web-search (Tavily) key for THIS request's web learning, resolved in the
// same precedence as AI keys: the user's company key first (their data boundary
// and billing), then the platform key the superadmin set, then the env var. ''
// when none - web learning then simply no-ops (planning still works).
function resolveWebSearchKey(req) {
  try {
    const companyKey = req.workUser ? store.getCompanyWebSearchKey(req.workUser.id) : null
    if (companyKey) return companyKey
  } catch { /* fall through */ }
  try { const k = store.getPlatformWebSearchKey(); if (k) return k } catch { /* fall through */ }
  return WORK_TAVILY_KEY
}
// Compute the "best + cheapest right now" recommendation across a set of runtimes
// (configured provider keys). Each provider is scored from its LIVE catalog, then
// we pick the overall cheapest, cheapest vision-capable, and best across them, so
// an admin always sees a current, grounded recommendation. Returns null-ish when
// no provider could be reached (bad keys / all down) - the caller surfaces that.
async function computeAiRecommendation(runtimes) {
  const providers = []
  for (const rt of (runtimes || [])) {
    try { const r = await ai.recommendModels(rt); if (r) providers.push(r) } catch { /* skip a provider that cannot list */ }
  }
  const pickMin = (key) => providers
    .map((p) => p[key] ? { ...p[key], provider: p.provider, label: p.label } : null)
    .filter((x) => x && x.usdPerMtok != null)
    .sort((a, b) => a.usdPerMtok - b.usdPerMtok)[0] || null
  const pickBest = () => providers
    .map((p) => p.best ? { ...p.best, provider: p.provider, label: p.label } : null)
    .filter(Boolean)
    .sort((a, b) => (b.quality - a.quality) || ((a.usdPerMtok ?? 99) - (b.usdPerMtok ?? 99)))[0] || null
  return {
    providers,
    overall: { cheapest: pickMin('cheapest'), cheapestVision: pickMin('cheapestVision'), best: pickBest() },
    note: 'Approximate published list prices, for guidance only - providers change them. The recommendation is drawn from each key\'s live model catalog and refreshes daily.',
  }
}
// Record every model/provider switch as a superadmin incident, and surface a
// quiet, plain-English note in the user's session feed (a switch is resilience,
// not an error - the user never sees the raw cause). Fatal exhaustion is logged
// with its reference code so support can act. Never throws into the AI path.
function makeOnSwitch(req, sessionId) {
  const wu = (req && req.workUser) || {}
  return (evt) => {
    try {
      const label = (id) => (id && ai.PROVIDERS[id] && ai.PROVIDERS[id].label) || id || 'another provider'
      const why = evt.reason === 'rate_limit' ? 'busy (rate limit)' : (evt.reason === 'retired' ? 'retired' : 'unavailable')
      store.recordWorkIncident({
        kind: evt.fatal ? 'ai_exhausted' : 'ai_failover',
        status: evt.fatal ? 503 : null,
        provider: evt.toProvider || evt.fromProvider || null,
        model: evt.toModel || evt.fromModel || null,
        message: evt.fatal
          ? `[${evt.code}] ${evt.scope}: ${label(evt.fromProvider)}/${evt.fromModel || '?'} ${why} and no working model or provider remained`
          : `${evt.scope}: ${label(evt.fromProvider)}/${evt.fromModel || '?'} ${why} - routed to ${label(evt.toProvider)}/${evt.toModel}${evt.crossProvider ? ' (switched provider)' : ' (same provider)'}`,
        userId: wu.id || null, username: wu.username || '',
        companyId: wu.companyId || null, sessionId: sessionId || null, call: evt.scope || null,
      })
      if (sessionId && !evt.fatal) {
        // Agnostic to the user: they learn a switch happened (never silently fail,
        // SUPREME RULE III) but not the provider/model name. Full detail is in the
        // superadmin incident recorded just above.
        store.appendWorkEvent(wu.id, sessionId, { kind: 'ai', text: `Switched to another AI model to keep going - the previous one was ${evt.reason === 'rate_limit' ? 'busy' : 'retired'}.` })
      }
    } catch { /* logging must never break the request */ }
  }
}
// Attach the failover ladder to a runtime before it reaches the AI layer: the
// alternate provider keys and the switch recorder. One place, so text and vision
// runtimes both get it.
function withFailover(req, rt) {
  if (!rt) return rt
  const sessionId = (req && req.params && req.params.id) || null
  return { ...rt, alternates: aiAlternates(req, rt.providerId), onSwitch: makeOnSwitch(req, sessionId) }
}
// MANDATORY security gate, in ONE place (SUPREME RULE II). Deterministically
// verifies the code + dependencies we are about to hand the user BEFORE they act:
// dangerous commands and known-vulnerable library versions are flagged with the
// safe fix, as the real backstop to the secure-coding prompt. Best-effort +
// bounded; a lookup error NEVER blocks the guidance. Returns the `security`
// object (null when there is no code to check), and appends user-facing flags.
async function runSecurityGate(userId, sessionId, codeText) {
  try {
    if (!codeText || !codeText.trim()) return null
    const rev = await Promise.race([securityReview(codeText), new Promise((r) => setTimeout(() => r(null), 12000))])
    if (!rev) return null
    const security = { codeIssues: rev.codeIssues, vulnerable: rev.vulnerable, outdated: rev.outdated, checkedDeps: rev.checkedDeps }
    // Audit the security processing so the log PROVES it ran: SAST (static code
    // review) + SCA (live dependency CVE check against OSV), with any findings as
    // flags. Logged for every code-related relay (plan / result / compose).
    try {
      store.appendWorkAudit(sessionId, {
        call: 'security', scrub: null,
        sast: rev.codeIssues.length
          ? `${rev.codeIssues.length} issue${rev.codeIssues.length === 1 ? '' : 's'} found in the commands/code (injection, hard-coded secrets, least privilege).`
          : 'Commands and code scanned; no issues found.',
        sca: rev.checkedDeps
          ? `${rev.checkedDeps} dependenc${rev.checkedDeps === 1 ? 'y' : 'ies'} verified live against the OSV vulnerability database; ${rev.vulnerable.length} with known CVEs${rev.outdated.length ? `, ${rev.outdated.length} outdated` : ''}.`
          : 'No third-party dependencies in this relay to check.',
        flags: [
          ...rev.codeIssues.slice(0, 6).map((c) => `${c.title}. ${c.fix}`),
          ...rev.vulnerable.slice(0, 6).map((v) => `${v.name} ${v.version}: ${(v.vulns || []).length} known ${(v.vulns || []).length === 1 ? 'vulnerability' : 'vulnerabilities'}${(v.vulns || []).length ? ' (' + (v.vulns || []).slice(0, 3).map((x) => x.id).join(', ') + ')' : ''}`),
        ],
      })
    } catch { /* audit is best-effort, never blocks the gate */ }
    for (const c of rev.codeIssues.slice(0, 4)) store.appendWorkEvent(userId, sessionId, { kind: 'flag', text: `Security: ${c.title}. ${c.fix}` })
    for (const v of rev.vulnerable.slice(0, 4)) {
      const ids = (v.vulns || []).slice(0, 3).map((x) => x.id).join(', ')
      const safe = v.latest || (v.vulns || []).map((x) => x.fixedIn).filter(Boolean).sort().pop() || 'a patched version'
      store.appendWorkEvent(userId, sessionId, { kind: 'flag', text: `Security: ${v.name} ${v.version} has ${v.vulns.length} known ${v.vulns.length === 1 ? 'vulnerability' : 'vulnerabilities'} (${ids}${v.vulns.length > 3 ? ', and more' : ''}). Upgrade to ${safe}${v.latest ? ' (latest)' : ' or later'}.` })
    }
    return security
  } catch { return null }
}
// COMPANY-POLICY gate, in ONE place (SUPREME RULE II). Enforces the company's OWN
// written security rules (forbid/require, extracted from their policy doc) against
// the guidance we are about to hand the user. It NEVER rewrites or deletes the
// model's text (SUPREME RULE VI, no-degrade): it SURFACES each violation / unmet
// requirement with a CITATION back to the policy doc + section and the compliant
// alternative, records it to the immutable audit, and returns the `policy` object
// for the response. Only runs when the company has an ARMED policy carrying rules.
async function runPolicyGate(userId, sessionId, text) {
  try {
    if (!text || !text.trim()) return null
    const pol = store.getEffectiveWorkPolicy(userId)
    const rules = (pol && Array.isArray(pol.guidanceRules)) ? pol.guidanceRules.filter((r) => r && r.enabled !== false) : []
    if (!rules.length) return null
    const { findings, counts } = enforceRules(text, rules)
    // Audit that the policy gate RAN, with any findings (proves enforcement even
    // when nothing fired - SUPREME RULE III, never silently skip).
    try {
      store.appendWorkAudit(sessionId, {
        call: 'policy', scrub: null,
        policy: findings.length
          ? `${findings.length} company-policy ${findings.length === 1 ? 'issue' : 'issues'} found in the guidance (${counts.forbid} prohibited, ${counts.require} required-but-missing).`
          : `Guidance checked against ${rules.length} company security ${rules.length === 1 ? 'rule' : 'rules'}; no issues.`,
        flags: findings.slice(0, 8).map((f) => `${f.kind === 'forbid' ? 'Prohibited' : 'Required'}: ${f.title}${f.doc ? ` (per ${f.doc}${f.section ? `, ${f.section}` : ''})` : ''}${f.guidance ? `. ${f.guidance}` : ''}`),
      })
    } catch { /* audit is best-effort, never blocks the gate */ }
    // User-facing flags carry the citation so the person sees WHICH policy applies.
    for (const f of findings.slice(0, 4)) {
      const cite = f.doc ? ` (per ${f.doc}${f.section ? `, ${f.section}` : ''})` : ''
      const fix = f.guidance ? ` ${f.guidance}` : ''
      const lead = f.kind === 'forbid'
        ? `This step uses something your company policy prohibits: ${f.title}${cite}.${fix}`
        : `Your company policy requires ${f.title}${cite}, which this step does not mention.${fix}`
      store.appendWorkEvent(userId, sessionId, { kind: 'flag', text: 'Company policy: ' + lead })
    }
    return { findings, counts, rulesChecked: rules.length }
  } catch { return null }
}
// Resolve the runtime a request should use. needVision=true requires a vision
// model (plan-with-frame, watch, ask) or we 400 with the fix. Never silently
// no-ops: if nothing is ready, say exactly what to do.
async function resolveWorkRuntime(req, res, { needVision = false } = {}) {
  // Honor an explicit "use our own keys" company choice FIRST: if the keys are not
  // set, fail clearly instead of silently falling back to platform keys. This
  // check used to run AFTER the vision lookup, and the vision lookup happily
  // returned a PLATFORM runtime when the company keys were missing, so a company
  // pinned to its own keys ran on ours without anyone being told.
  const aiReq = store.companyAiRequirement(req.workUser.id)
  if (aiReq.source === 'company' && !aiReq.ready) {
    res.status(503).json({ error: aiReq.reason, needsCompanyKey: true })
    return null
  }
  const v = await findWorkVision(req)
  if (v) {
    v.rt = withFailover(req, v.rt)
    try { v.strong = await findWorkVisionStrong(req, v); if (v.strong) v.strong.rt = withFailover(req, v.strong.rt) } catch { v.strong = null }
    return v
  }
  // A company on its own/corporate keys uses those; else platform, else the user's key.
  const companyRt = store.getCompanyRuntime(req.workUser.id)
  const platform = store.getWorkPlatformAllowed()
  const base = companyRt || (platform ? store.getActiveRuntime() : store.getWorkUserRuntime(req.workUser.id))
  if (!base || !base.apiKey) {
    res.status(503).json({
      error: platform
        ? 'WorkCoPilot AI is not configured. An administrator must set an active AI provider.'
        : 'Add your AI key and test it in Settings before using WorkCoPilot.',
      needsKey: !platform,
    })
    return null
  }
  if (needVision) {
    res.status(400).json({
      error: companyRt
        ? 'Your company AI key has no vision-capable model, so WorkCoPilot cannot read the screen. Ask your company admin to set a provider or model that can see images (Gemini, GPT-4o, or Llama 4 Scout) in Company, AI keys.'
        : platform
          ? 'The platform AI has no vision-capable model, so WorkCoPilot cannot read the screen. Ask the administrator to add a Gemini or OpenAI key in AI Settings.'
          : 'Your AI key has no vision-capable model, so WorkCoPilot cannot read the screen. Use a provider or model that can see images (Gemini, GPT-4o, or Llama 4 Scout), then test it again.',
      needsVision: true,
    })
    return null
  }
  return { rt: withFailover(req, base), visionModel: null, strong: null }
}
// Pick the runtime for a single vision call. `deep` (the user's manual escalate)
// uses the stronger model as primary; otherwise the cheap model is primary and
// the stronger one is the just-in-time auto backup (used only on failure/weak).
function workCallRuntime(rr, deep) {
  if (deep && rr.strong) return { rt: rr.strong.rt, visionModel: rr.strong.visionModel, backup: null, forcedStrong: true, strongModel: rr.strong.visionModel }
  const backup = rr.strong ? { cfg: rr.strong.rt, visionModel: rr.strong.visionModel } : null
  return { rt: rr.rt, visionModel: rr.visionModel, backup, forcedStrong: false, strongModel: rr.strong ? rr.strong.visionModel : null }
}
// PLAN WITH THE BEST MODEL. Planning is one call per session (the watch loop stays
// on the cheap model), so we spend it on the strongest model available on the
// permitted key(s) - respecting the data boundary (own/company key stays on that
// key; platform may pick across configured providers). With a frame we use the
// strongest VISION model (already resolved into rr.strong); without one we pick
// the best CHAT model. Bounded by a timeout, with a safe fallback to the resolved
// runtime so planning never stalls. Returns a `call`-shaped object + `plannedBy`.
async function bestPlanningCall(req, rr, hasFrame) {
  const raced = (p, ms, fb) => Promise.race([p, new Promise((r) => setTimeout(() => r(fb), ms))]).catch(() => fb)
  const wrap = (rt, visionModel, backup, model) => {
    const providerId = (rt && rt.providerId) || null
    const plannedBy = { model: model || null, provider: providerId, label: (ai.PROVIDERS[providerId] || {}).label || providerId, ...ai.modelRank(providerId, model) }
    // Keep the failover ladder on the planning runtime (own/company/configured
    // keys resolved here are raw), so a rate-limited top model still degrades.
    return { call: { rt: withFailover(req, rt), visionModel, backup, forcedStrong: true, strongModel: model }, plannedBy }
  }
  if (hasFrame) {
    // strongest vision model (findWorkVisionStrong already honored the boundary)
    const v = rr.strong || { rt: rr.rt, visionModel: rr.visionModel }
    const backup = rr.strong ? { cfg: rr.rt, visionModel: rr.visionModel } : null
    return wrap(v.rt, v.visionModel, backup, v.visionModel)
  }
  // text: best chat model. Own/company key -> best on that key; platform -> the
  // cached daily recommendation across configured providers.
  const companyRt = store.getCompanyRuntime(req.workUser.id)
  const ownKey = (companyRt && companyRt.apiKey) ? companyRt : (!store.getWorkPlatformAllowed() ? store.getWorkUserRuntime(req.workUser.id) : null)
  try {
    if (ownKey && ownKey.apiKey) {
      const rec = await raced(ai.recommendModels(ownKey), 6000, null)
      const model = (rec && rec.best && rec.best.model) || ownKey.chatModel
      return wrap({ ...ownKey, chatModel: model }, null, null, model)
    }
    let reco = store.getWorkAiRecommendation()
    if (!reco) { const data = await raced(computeAiRecommendation(store.getConfiguredRuntimes()), 8000, null); if (data) reco = store.setWorkAiRecommendation(data) }
    const best = reco && reco.overall && reco.overall.best
    if (best && best.provider) {
      const rt = store.getConfiguredRuntimes().find((x) => x.providerId === best.provider) || rr.rt
      return wrap({ ...rt, chatModel: best.model }, null, null, best.model)
    }
  } catch { /* fall through to the resolved runtime */ }
  return wrap(rr.rt, null, null, rr.rt && rr.rt.chatModel)
}
// Best-effort web research so the plan reflects the LATEST UI/URLs/best practice
// over the model's possibly-stale memory. Uses Tavily when WORK_TAVILY_KEY is
// set; otherwise returns '' (planning still works from model knowledge). Never
// blocks or throws into a request.
async function workResearchNotes(goal, apiKey) {
  const g = String(goal || '').trim()
  const key = apiKey || WORK_TAVILY_KEY
  if (!g || !key) return ''
  try {
    const year = new Date().getFullYear()
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: key,
        query: `${g} - exact current step by step, latest UI, official sign-in or console URL, ${year}`,
        search_depth: 'basic',
        max_results: 5,
      }),
    })
    if (!res.ok) return ''
    const data = await res.json().catch(() => null)
    const results = (data && data.results) || []
    if (!results.length) return ''
    return results.slice(0, 5).map((x) => {
      const t = String(x.title || '').trim()
      const u = String(x.url || '').trim()
      const c = String(x.content || x.snippet || x.text || '').replace(/\s+/g, ' ').trim().slice(0, 600)
      return `- ${t}${u ? ` [${u}]` : ''}${c ? `: ${c}` : ''}`
    }).join('\n')
  } catch { return '' }
}

// ---- Web learning: fetch a link the user gave and read it ------------------
// When a goal says "visit X, read the guides, then help me", the model's own
// memory is not enough - we fetch that page (and a few same-site sub-pages) on
// the SERVER, extract the readable text, and ground the plan in it. Safe by
// construction: only public http(s), never private/internal hosts (no SSRF),
// bounded pages/bytes/time, text only, and it never throws into a request.
function isPublicHttpUrl(u) {
  let url; try { url = new URL(u) } catch { return false }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false
  const h = url.hostname.toLowerCase()
  if (!h.includes('.')) return false
  if (/(^|\.)(localhost|local|internal|intranet|corp|lan|home|test|localdomain|priv|private)$/.test(h)) return false
  if (h.includes(':')) return false // raw IPv6 literal
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (m) {
    const a = +m[1], b = +m[2]
    if (a === 0 || a === 10 || a === 127 || a >= 224 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254) || (a === 100 && b >= 64 && b <= 127)) return false
  }
  return true
}
function htmlToText(html) {
  let s = String(html || '')
  s = s.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<!--[\s\S]*?-->/g, ' ')
  s = s.replace(/<(nav|header|footer|svg|form|noscript)[\s\S]*?<\/\1>/gi, ' ')
  s = s.replace(/<\/(p|div|li|h[1-6]|br|tr|section)>/gi, '\n').replace(/<[^>]+>/g, ' ')
  s = s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#0?39;|&apos;/g, "'").replace(/&quot;/g, '"')
  return s.replace(/[ \t]+/g, ' ').replace(/\n\s*\n\s*/g, '\n').trim()
}
function extractUrls(text) {
  const out = [], seen = new Set()
  for (const m of String(text || '').matchAll(/https?:\/\/[^\s<>"')\]]+/gi)) {
    let u = m[0].replace(/[.,;:)]+$/, '')
    if (!seen.has(u) && isPublicHttpUrl(u)) { seen.add(u); out.push(u) }
  }
  return out
}
async function fetchPageText(url, timeoutMs = 9000, maxBytes = 1_200_000) {
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: ctrl.signal, redirect: 'follow', headers: { 'User-Agent': 'WorkCoPilotBot/1.0 (+https://admireveda.com)', Accept: 'text/html,application/xhtml+xml,text/plain' } })
    clearTimeout(t)
    if (!res.ok) return { error: `HTTP ${res.status}` }
    if (!isPublicHttpUrl(res.url)) return { error: 'redirected off a public host' }
    const ct = res.headers.get('content-type') || ''
    if (!/text\/html|text\/plain|application\/(xhtml|xml)/i.test(ct)) return { error: 'not a readable page' }
    const cl = Number(res.headers.get('content-length') || 0)
    if (cl && cl > maxBytes * 3) return { error: 'page too large' }
    const html = (await res.text()).slice(0, maxBytes)
    return { text: htmlToText(html), finalUrl: res.url, html }
  } catch (e) { clearTimeout(t); return { error: /abort/i.test((e && e.message) || '') ? 'timed out' : 'could not connect' } }
}
// Crawl the links the user gave: fetch each root, then a few same-site sub-pages
// (guides/docs/labs). Returns grounding text + which pages were read + errors.
async function fetchUrlsForLearning(text, { maxRoots = 2, maxPages = 5, perPage = 3500, totalCap = 12000 } = {}) {
  const roots = extractUrls(text).slice(0, maxRoots)
  if (!roots.length) return { grounding: '', pages: [], errors: [] }
  const pages = [], errors = [], fetched = new Set()
  const take = async (u) => {
    if (fetched.has(u) || pages.length >= maxPages) return
    fetched.add(u)
    const r = await fetchPageText(u)
    if (r.error) { errors.push({ url: u, error: r.error }); return r }
    if (r.text && r.text.length > 40) pages.push({ url: r.finalUrl || u, text: r.text })
    return r
  }
  for (const root of roots) {
    const r = await take(root)
    // Follow a few relevant same-site links from the first good page.
    if (r && r.html && pages.length < maxPages) {
      try {
        const origin = new URL(root).origin
        const links = []
        for (const m of r.html.matchAll(/href=["']([^"'#?]+)["']/gi)) {
          let href = m[1]
          try { href = new URL(href, root).href } catch { continue }
          if (!href.startsWith(origin)) continue
          if (!/\/(lab|labs|guide|guides|docs|help|support|how|tutorial|product|products|recover|recovery|setup|start|manual)\b/i.test(href)) continue
          if (!links.includes(href) && href !== root) links.push(href)
          if (links.length >= 6) break
        }
        for (const l of links) { if (pages.length >= maxPages) break; await take(l) }
      } catch { /* link discovery is best-effort */ }
    }
  }
  let grounding = ''
  if (pages.length) {
    grounding = 'CONTENT READ FROM THE WEBSITE THE USER ASKED YOU TO LEARN FROM (ground the steps in this real, current content, not just memory):\n'
      + pages.map((p) => `--- ${p.url} ---\n${p.text.slice(0, perPage)}`).join('\n\n')
    if (grounding.length > totalCap) grounding = grounding.slice(0, totalCap) + '\n[...trimmed]'
  }
  return { grounding, pages, errors }
}

// ===========================================================================
// Auth / session
// ===========================================================================
// WorkCoPilot sign-in (the only login the standalone client uses).
// Auth throttle (audit APP-02 / APP-03): count only FAILED sign-in attempts per
// IP and block a burst, to blunt brute-force and credential-stuffing. Successful
// sign-ins clear the counter, so normal users and shared office IPs are never
// locked out. Fixed window, in memory.
const _authFails = new Map()
const AUTH_WINDOW_MS = 10 * 60 * 1000, AUTH_MAX_FAILS = 10
const _authIp = (req) => (req.ip || (req.headers['x-forwarded-for'] || '').toString().split(',')[0] || 'local').trim()
function authBlocked(req) { const w = _authFails.get(_authIp(req)); return !!(w && Date.now() <= w.resetAt && w.n >= AUTH_MAX_FAILS) }
function authFail(req) { const ip = _authIp(req), now = Date.now(), w = _authFails.get(ip); if (!w || now > w.resetAt) _authFails.set(ip, { n: 1, resetAt: now + AUTH_WINDOW_MS }); else w.n++ }
function authOk(req) { _authFails.delete(_authIp(req)) }

app.post('/api/work/login', wrap((req, res) => {
  if (authBlocked(req)) return res.status(429).json({ error: 'Too many sign-in attempts. Please wait a few minutes and try again.' })
  const { username, password } = req.body || {}
  const u = store.findUser(username)
  // SSO-bound accounts (pre-provisioned by email, no usable password) must come
  // in through their company identity provider, not this form. Tell them plainly
  // instead of returning a confusing "wrong password".
  if (u && u.ssoEmail) {
    return res.status(409).json({ error: "This is a company single sign-on account. Use 'Sign in with your company (SSO)' and enter your company email domain.", sso: true })
  }
  if (!store.verifyPassword(u, password || '')) {
    authFail(req)
    return res.status(401).json({ error: 'Invalid username or password' })
  }
  authOk(req)
  // A superadmin-disabled account cannot sign in (its sessions were already
  // invalidated when it was disabled). Clear message, not a confusing password error.
  if (u.disabled) return res.status(403).json({ error: 'This account has been disabled. Please contact your administrator.' })
  // Break-glass: if MFA is globally disabled (operator env flag), sign in the old
  // way so a broken rollout can be recovered without locking everyone out.
  if (!store.mfaGloballyEnabled()) { establishSession(req, u); return res.json({ user: store.publicWorkUser(u) }) }
  // MFA step-up: do NOT establish the authenticated session until the second
  // factor is satisfied. Everyone with a password must have an authenticator;
  // first login forces setup. The pending markers are the only thing the two
  // MFA endpoints below trust (the session is not authed yet).
  req.session.pendingMfaUid = u.id
  req.session.pendingMfaAt = Date.now()
  if (store.mfaSetupNeeded(u.id)) return res.json({ mfaSetup: true, username: u.username, enroll: store.startMfaEnrollment(u.id) })
  return res.json({ mfaRequired: true, username: u.username })
}))
// The pending-MFA login gate: resolve the user mid-login WITHOUT trusting any
// authenticated session (there is none yet). 15-minute window.
const MFA_PENDING_TTL_MS = 15 * 60 * 1000
function pendingMfaUser(req) {
  const uid = req.session && req.session.pendingMfaUid
  const at = req.session && req.session.pendingMfaAt
  if (!uid || !at || (Date.now() - at) > MFA_PENDING_TTL_MS) return null
  return store.getUser(uid)
}
function clearPendingMfa(req) { if (req.session) { delete req.session.pendingMfaUid; delete req.session.pendingMfaAt } }

// Confirm first-login authenticator setup, then sign in. Returns the one-time
// backup codes (shown once).
app.post('/api/work/login/mfa/setup', wrap((req, res) => {
  const u = pendingMfaUser(req)
  if (!u) return res.status(440).json({ error: 'Your sign-in session expired. Please sign in again.', restart: true })
  let backupCodes
  try { ({ backupCodes } = store.confirmMfaEnrollment(u.id, (req.body || {}).code)) }
  catch (e) { return res.status(e.status || 401).json({ error: e.message }) }
  clearPendingMfa(req)
  establishSession(req, u)
  res.json({ user: store.publicWorkUser(u), backupCodes })
}))
// Verify the authenticator code (or a backup code) on an existing account, then
// sign in.
app.post('/api/work/login/mfa', wrap((req, res) => {
  if (authBlocked(req)) return res.status(429).json({ error: 'Too many attempts. Please wait a few minutes and try again.' })
  const u = pendingMfaUser(req)
  if (!u) return res.status(440).json({ error: 'Your sign-in session expired. Please sign in again.', restart: true })
  if (!store.verifyUserMfa(u.id, (req.body || {}).code)) {
    authFail(req)
    return res.status(401).json({ error: 'That code did not match. Enter the current 6-digit code from your authenticator, or a backup code.' })
  }
  authOk(req)
  clearPendingMfa(req)
  establishSession(req, u)
  res.json({ user: store.publicWorkUser(u) })
}))
// Public signup: a new WorkCoPilot account. The account is created, then the user
// must set up an authenticator before the session is established (MFA on first
// login applies to brand-new accounts too).
app.post('/api/work/signup', wrap((req, res) => {
  if (authBlocked(req)) return res.status(429).json({ error: 'Too many attempts. Please wait a few minutes and try again.' })
  const b = req.body || {}
  const { username, password } = b
  const email = String(b.email || '').trim()
  const displayName = String(b.name || b.displayName || '').trim()
  // Compliance-grade sign-up: name + email are required; phone + company are
  // captured on the account record.
  if (!displayName) return res.status(400).json({ error: 'Enter your full name.' })
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' })
  // CLICKWRAP: no account is created without an explicit acceptance of the current
  // agreements. The checkbox is unticked by default, so this is a real, affirmative
  // consent, not implied-by-signup. Recorded below with the audit fields.
  if (b.acceptTerms !== true) return res.status(400).json({ error: 'You must accept the Terms of Service and Privacy Policy to create an account.', legalRequired: true, version: LEGAL_VERSION })
  const u = store.createWorkUser({ username, password, email, displayName, phone: b.phone, company: b.company })
  // Record the acceptance against the new account (version + timestamp + IP + user
  // agent), so the consent is defensible. The version comes from the server, never
  // the client, so a stale client can never record acceptance of the wrong version.
  store.recordLegalAcceptance(u.id, { ip: ipOf(req), userAgent: req.headers['user-agent'], method: 'signup' })
  // Affiliate attribution (first-touch): bind the referring affiliate from the
  // ?ref= the SPA captured, or the affref cookie. Best-effort, never blocks signup.
  bindReferralOnSignup(store, req, u.id)
  // The email gives the account a contact address (reset + receipts) + a welcome.
  sendTemplateAsync('welcome', email, { name: u.displayName || u.username })
  if (!store.mfaGloballyEnabled()) { establishSession(req, u); return res.json({ user: store.publicWorkUser(u) }) }
  req.session.pendingMfaUid = u.id
  req.session.pendingMfaAt = Date.now()
  res.json({ mfaSetup: true, username: u.username, enroll: store.startMfaEnrollment(u.id) })
}))
// Public: the current agreements + version, so the client can render the consent
// checkbox at signup and the blocking consent modal on first login, and send the
// version back. Version always comes from the server (never trusts the client).
app.get('/api/work/legal', wrap((req, res) => res.json(legalManifest())))
// Signed-in: accept the current agreements. This is how a social / SSO / admin-
// created account (or any user after a version bump) clears the consent gate on
// first use. Recorded with version + timestamp + IP + user agent. Only requires
// auth (NOT the subscription gate), so a user who must accept can always reach it.
app.post('/api/work/legal/accept', requireWorkAuth, wrap((req, res) => {
  if ((req.body || {}).accept !== true) return res.status(400).json({ error: 'Confirm that you accept the current Terms and Privacy Policy.' })
  store.recordLegalAcceptance(req.workUser.id, { ip: ipOf(req), userAgent: req.headers['user-agent'], method: 'first_login' })
  res.json({ ok: true, version: LEGAL_VERSION, user: store.publicWorkUser(store.getUser(req.workUser.id)) })
}))
// Signed-in: your own MFA status.
app.get('/api/work/mfa/status', requireWorkAuth, wrap((req, res) => {
  res.json(store.userMfaStatus(req.workUser.id))
}))
// Signed-in: reset your OWN authenticator (new phone). Requires your current code,
// then signs you out everywhere so you re-enroll on next sign-in.
app.post('/api/work/mfa/reset', requireWorkAuth, wrap((req, res) => {
  if (!store.verifyUserMfa(req.workUser.id, (req.body || {}).code)) return res.status(401).json({ error: 'Enter your current 6-digit code to reset your authenticator.' })
  store.resetMfa(req.workUser.id, { self: true })   // owner-initiated: the security notice says "by you"
  store.recordAdminAction({ userId: req.workUser.id, companyId: req.workUser.companyId || null, action: 'mfa_self_reset', reason: 'reset own authenticator', detail: 're-enroll on next sign-in' })
  res.json({ ok: true, loggedOut: true })
}))
// Signed-in: regenerate backup codes (requires current code). Returned once.
app.post('/api/work/mfa/backup/regenerate', requireWorkAuth, wrap((req, res) => {
  if (!store.verifyUserMfa(req.workUser.id, (req.body || {}).code)) return res.status(401).json({ error: 'Enter your current 6-digit code to regenerate backup codes.' })
  res.json({ backupCodes: store.regenerateBackupCodes(req.workUser.id) })
}))
// Company admin: reset a member's authenticator (lost device). Reason required +
// logged. Scoped to their own company by canManageMfa.
app.post('/api/work/company/users/:id/mfa/reset', requireWorkAuth, requireCompanyAdmin, wrap((req, res) => {
  const targetId = req.params.id
  if (!store.canManageMfa(req.workUser.id, targetId)) return res.status(403).json({ error: 'You can only reset MFA for people in your company.' })
  const reason = String((req.body || {}).reason || '').trim()
  if (reason.length < 3) return res.status(400).json({ error: 'A reason is required to reset a member\'s authenticator (recorded in your audit trail).' })
  const r = store.resetMfa(targetId, { by: req.user.username })   // the store emits the owner's security notice
  store.recordAdminAction({ userId: req.workUser.id, companyId: req.workUser.companyId || null, action: 'mfa_reset', reason, detail: `reset authenticator for ${r.username || targetId}` })
  res.json({ ok: true })
}))

// Soft identity check used on boot + polling, and by the admin console.
app.get('/api/work/me', (req, res) => {
  const id = resolveWorkIdentity(req)
  if (!id) return res.json({ user: null, signedIn: false, access: false })
  if (id.stale) return req.session.destroy(() => res.json({ user: null, signedIn: false, access: false, loggedOut: true }))
  const body = { user: store.publicWorkUser(id.workUser), signedIn: true, access: true }
  // Support impersonation: surface the banner payload so the client can show that
  // a superadmin is viewing AS this user (by whom, since when).
  if (id.impersonating) body.impersonating = id.impersonating
  res.json(body)
})
// Logout clears the session and (via the epoch bump) every other window too.
function doLogout(req, res) {
  if (req.session.uid) store.bumpSessionEpoch(req.session.uid)
  req.session.destroy(() => res.json({ ok: true }))
}
app.post('/api/logout', doLogout)
app.post('/api/work/logout', doLogout)

app.post('/api/work/profile', requireWorkAuth, wrap((req, res) => {
  const { displayName, onboarded } = req.body || {}
  res.json({ user: store.setWorkProfile(req.workUser.id, { displayName, onboarded }) })
}))
// Pin the signed-in user's communication language (first-login attestation). The
// store validates the code against the supported locales (400 on an unknown one)
// and persists it; the returned public user carries { language, languagePinned }
// and GET /api/work/me surfaces the same, so the client always has the current
// value in the signed-in payload.
app.post('/api/work/profile/language', requireWorkAuth, wrap((req, res) => {
  const { language } = req.body || {}
  res.json({ user: store.setWorkUserLanguage(req.workUser.id, language) })
}))
// Set (or clear) the signed-in user's dashboard accent color so it follows them
// across devices. Body: { accent: "<preset key>" | "#rrggbb" | null }.
app.post('/api/work/profile/accent', requireWorkAuth, wrap((req, res) => {
  const accent = (req.body || {}).accent
  res.json({ user: store.setWorkUserAccent(req.workUser.id, accent) })
}))
// Change your own password. Verifies the current password server-side; the new
// one is validated + bcrypt-hashed in the store. Available to any signed-in user.
app.post('/api/work/profile/password', requireWorkAuth, wrap((req, res) => {
  const { currentPassword, newPassword } = req.body || {}
  res.json(store.setWorkUserPassword(req.workUser.id, currentPassword, newPassword))
}))

// ===========================================================================
// AI gating
// ===========================================================================
app.get('/api/work/ai', requireWorkAuth, wrap((req, res) => {
  res.json({ status: store.workAiStatus(req.workUser.id), providers: ai.catalog() })
}))
app.post('/api/work/ai/key', requireWorkAuth, wrap((req, res) => {
  const { providerId, apiKey, chatModel, visionModel } = req.body || {}
  if (!providerId || !apiKey) return res.status(400).json({ error: 'Provider and API key are required.' })
  res.json({ status: store.setWorkUserAi(req.workUser.id, { providerId, apiKey, chatModel, visionModel }) })
}))
app.post('/api/work/ai/test', requireWorkAuth, async (req, res) => {
  try {
    const rt = store.getWorkPlatformAllowed() ? store.getActiveRuntime() : (() => {
      const u = store.getWorkUser(req.workUser.id)
      return u && u.ai && u.ai.apiKey ? { providerId: u.ai.providerId, apiKey: u.ai.apiKey, chatModel: u.ai.chatModel, visionModel: u.ai.visionModel } : null
    })()
    if (!rt || !rt.apiKey) return res.status(400).json({ error: 'No key to test. Add your AI key first.' })
    try {
      const result = await ai.testKey(rt)
      // Probe for a vision model the way the live copilot will, so the user
      // learns at setup time whether a screen can actually be read.
      const v = await findWorkVision(req)
      if (!store.getWorkPlatformAllowed()) store.markWorkUserAiTested(req.workUser.id, true)
      res.json({ ok: true, result, visionModel: v ? v.visionModel : null, hasVision: !!v, status: store.workAiStatus(req.workUser.id) })
    } catch (e) {
      if (!store.getWorkPlatformAllowed()) store.markWorkUserAiTested(req.workUser.id, false)
      res.status(400).json({ ok: false, error: e.message || 'Key test failed', status: store.workAiStatus(req.workUser.id) })
    }
  } catch (e) { sendWorkError(res, e, req) }
})

// ---- app download (gated on AI readiness) ---------------------------------
const WORK_DESKTOP_FILE = 'WorkCoPilot-Setup.exe'
const WORK_APK_FILE = 'WorkCoPilot.apk'
const WORK_MSI_FILE = 'WorkCoPilot-Setup.msi'
// Silent network-deploy command surfaced to company admins (and the deploy docs).
const WORK_MSI_SILENT_CMD = `msiexec /i ${WORK_MSI_FILE} /qn /norestart`
app.get('/api/work/app/status', requireWorkAuth, wrap((req, res) => {
  const dir = path.join(ROOT, 'downloads')
  // The MSI is an enterprise artifact: only company admins (and superadmin) may
  // see it is available or download it.
  const isCompanyAdmin = (req.user && req.user.role === 'superadmin') || (req.workUser && req.workUser.companyRole === 'company_admin')
  res.json({
    ready: store.workUserReady(req.workUser.id),
    desktop: { available: fs.existsSync(path.join(dir, WORK_DESKTOP_FILE)) },
    android: { available: fs.existsSync(path.join(dir, WORK_APK_FILE)) },
    msi: isCompanyAdmin
      ? { available: fs.existsSync(path.join(dir, WORK_MSI_FILE)), silentCommand: WORK_MSI_SILENT_CMD, perMachine: true }
      : null,
  })
}))
function sendWorkApp(req, res, filename) {
  if (!store.workUserReady(req.workUser.id)) {
    return res.status(403).json({ error: 'Set up and test your AI first - then the app unlocks.', needsAi: true })
  }
  const f = path.join(ROOT, 'downloads', filename)
  if (!fs.existsSync(f)) return res.status(404).json({ error: 'That build is not published yet.' })
  res.download(f, filename)
}
app.get('/api/work/app/desktop', requireWorkAuth, (req, res) => sendWorkApp(req, res, WORK_DESKTOP_FILE))
app.get('/api/work/app/android', requireWorkAuth, (req, res) => sendWorkApp(req, res, WORK_APK_FILE))
// MSI is for network deployment by a COMPANY ADMIN (or superadmin) - a per-machine
// silent installer. It is NOT gated on the admin's own AI readiness (they are
// distributing, not running it here), only on being a company admin.
app.get('/api/work/app/msi', requireWorkAuth, requireCompanyAdmin, (req, res) => {
  const f = path.join(ROOT, 'downloads', WORK_MSI_FILE)
  if (!fs.existsSync(f)) return res.status(404).json({ error: 'The MSI is not published yet.' })
  res.download(f, WORK_MSI_FILE)
})

// ===========================================================================
// Admin (console writes; reads are registered by work-admin.js)
// ===========================================================================
// Allow/deny WorkCoPilot users to use the PLATFORM AI key.
app.get('/api/work/admin/platform-ai', requireAuth, requireAdmin, wrap((req, res) => {
  res.json({ platformAiAllowed: store.getWorkPlatformAllowed() })
}))
app.post('/api/work/admin/platform-ai', requireAuth, requireSuperAdmin, requireAiStepUp, wrap((req, res) => {
  res.json(store.setWorkPlatformAllowed(!!(req.body || {}).allowed))
}))
// ---- AI-config OTP step-up (superadmin). GET is the only AI-config endpoint
// NOT gated - it tells the client whether the page is unlocked. POST verifies an
// authenticator code to open the short step-up window; DELETE locks immediately.
// requireAdmin (not requireSuperAdmin): the step-up only re-verifies the caller's
// OWN authenticator and opens a per-user window. Any console role (superadmin,
// accounting, affiliate_admin) may open their own window; what it unlocks is still
// gated per-endpoint (AI config stays superadmin-only; affiliate payout is
// superadmin/affiliate_admin). This lets an affiliate admin step up before a payout.
app.get('/api/work/admin/ai/stepup', requireAuth, requireAdmin, wrap((req, res) => {
  res.json(store.aiStepUpStatus(req.user.id))
}))
app.post('/api/work/admin/ai/stepup', requireAuth, requireAdmin, wrap((req, res) => {
  res.json(store.verifyAiStepUp(req.user.id, (req.body || {}).code))
}))
app.delete('/api/work/admin/ai/stepup', requireAuth, requireAdmin, wrap((req, res) => {
  res.json(store.clearAiStepUp(req.user.id))
}))
// ---- Platform AI PROVIDERS (superadmin): see every AI we can use, enter a key,
// test it, make it primary. Keys are set at runtime (not just the deploy seed),
// so the operator can pin Qwen/OpenRouter/etc. from the dashboard. A raw key is
// NEVER returned - the list only carries a masked tail. OTP step-up gated: the
// list carries masked keys + model config, so it is not shown until verified.
app.get('/api/work/admin/ai/providers', requireAuth, requireSuperAdmin, requireAiStepUp, wrap((req, res) => {
  res.json({ providers: store.adminAiProviders(), activeProvider: store.getActiveProviderId() })
}))
// Save a provider's key (optionally pin chat/vision model) AND test it in one
// step, so the operator sees right away whether it works and can read a screen.
app.post('/api/work/admin/ai/providers/:id', requireAuth, requireSuperAdmin, requireAiStepUp, async (req, res) => {
  try {
    const id = req.params.id
    const { apiKey, chatModel, visionModel } = req.body || {}
    if (!apiKey || !String(apiKey).trim()) return res.status(400).json({ error: 'Enter an API key for this provider.' })
    store.setAiProviderKey(id, { apiKey: String(apiKey).trim(), chatModel: chatModel || undefined, visionModel: visionModel || undefined })
    const rt = store.getProviderRuntime(id)
    try {
      const result = await ai.testKey(rt)
      let visionModelName = null
      try { visionModelName = await pickWorkVision(rt) } catch { /* vision probe is best-effort */ }
      res.json({ ok: true, result, visionModel: visionModelName, hasVision: !!visionModelName, providers: store.adminAiProviders(), activeProvider: store.getActiveProviderId() })
    } catch (e) {
      // The key was saved but failed its test - tell the operator plainly; the
      // provider stays in the list (not active unless it was the first key) so
      // they can correct the key without re-typing everything.
      res.status(400).json({ ok: false, error: e.message || 'Key test failed', providers: store.adminAiProviders(), activeProvider: store.getActiveProviderId() })
    }
  } catch (e) { sendWorkError(res, e, req) }
})
// Re-test a provider already configured, without changing its key.
app.post('/api/work/admin/ai/providers/:id/test', requireAuth, requireSuperAdmin, requireAiStepUp, async (req, res) => {
  try {
    const rt = store.getProviderRuntime(req.params.id)
    if (!rt || !rt.apiKey) return res.status(400).json({ error: 'No key saved for this provider yet.' })
    try {
      const result = await ai.testKey(rt)
      let visionModelName = null
      try { visionModelName = await pickWorkVision(rt) } catch { /* best-effort */ }
      res.json({ ok: true, result, visionModel: visionModelName, hasVision: !!visionModelName })
    } catch (e) {
      res.status(400).json({ ok: false, error: e.message || 'Key test failed' })
    }
  } catch (e) { sendWorkError(res, e, req) }
})
// Make a (configured) provider the active/primary platform runtime.
app.post('/api/work/admin/ai/providers/:id/activate', requireAuth, requireSuperAdmin, requireAiStepUp, wrap((req, res) => {
  res.json({ providers: store.setActivePlatformProvider(req.params.id), activeProvider: store.getActiveProviderId() })
}))
// Remove ALL of a provider's keys; if it was active, active hands off to another.
app.delete('/api/work/admin/ai/providers/:id', requireAuth, requireSuperAdmin, requireAiStepUp, wrap((req, res) => {
  res.json({ providers: store.clearAiProvider(req.params.id), activeProvider: store.getActiveProviderId() })
}))
// ---- Key POOL: add/remove extra keys so load spreads round-robin (throttling).
app.post('/api/work/admin/ai/providers/:id/keys', requireAuth, requireSuperAdmin, requireAiStepUp, async (req, res) => {
  try {
    const key = (req.body || {}).apiKey
    store.addProviderKey(req.params.id, key)
    // Test the just-added key on its own runtime so the operator sees it works.
    const rt = { ...store.getProviderRuntime(req.params.id), apiKey: String(key).trim() }
    let ok = true, error = null, visionModel = null
    try { await ai.testKey(rt); try { visionModel = await pickWorkVision(rt) } catch { /* best-effort */ } }
    catch (e) { ok = false; error = e.message || 'Key test failed' }
    res.json({ ok, error, visionModel, hasVision: !!visionModel, providers: store.adminAiProviders(), activeProvider: store.getActiveProviderId() })
  } catch (e) { sendWorkError(res, e, req) }
})
app.delete('/api/work/admin/ai/providers/:id/keys/:index', requireAuth, requireSuperAdmin, requireAiStepUp, wrap((req, res) => {
  res.json({ providers: store.removeProviderKey(req.params.id, req.params.index), activeProvider: store.getActiveProviderId() })
}))
// ---- CUSTOM provider: add any OpenAI-compatible endpoint (base URL + key). The
// base is validated as a public https FQDN and added to the egress allowlist.
app.post('/api/work/admin/ai/custom', requireAuth, requireSuperAdmin, requireAiStepUp, async (req, res) => {
  try {
    const { id, label, base, chatModels, apiKey } = req.body || {}
    store.setCustomProvider({ id, label, base, chatModels, apiKey })
    // Test it if a key was supplied, so the operator gets immediate confirmation.
    let ok = true, error = null, visionModel = null
    const rt = store.getProviderRuntime(String(id || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, ''))
    if (rt && rt.apiKey) {
      try { await ai.testKey(rt); try { visionModel = await pickWorkVision(rt) } catch { /* best-effort */ } }
      catch (e) { ok = false; error = e.message || 'Key test failed' }
    }
    res.json({ ok, error, visionModel, hasVision: !!visionModel, providers: store.adminAiProviders(), activeProvider: store.getActiveProviderId() })
  } catch (e) { sendWorkError(res, e, req) }
})
app.delete('/api/work/admin/ai/custom/:id', requireAuth, requireSuperAdmin, requireAiStepUp, wrap((req, res) => {
  res.json({ providers: store.removeCustomProvider(req.params.id), activeProvider: store.getActiveProviderId() })
}))
// Plan-heavy / watch-light is OUR model: the SUPERADMIN forces it on for premium
// users (companies' premium members + regular premium). Users have no control.
// GET is readable by any admin; only the superadmin flips it.
app.get('/api/work/admin/watch-light', requireAuth, requireAdmin, wrap((req, res) => {
  res.json({ forceWatchLightPremium: store.getWorkForceWatchLight() })
}))
app.post('/api/work/admin/watch-light', requireAuth, requireSuperAdmin, requireAiStepUp, wrap((req, res) => {
  res.json(store.setWorkForceWatchLight(!!(req.body || {}).on))
}))
// Homepage hero copy. Readable by any admin; only the superadmin edits it.
// POST with an empty/missing pairs array restores the built-in default.
app.get('/api/work/admin/hero', requireAuth, requireAdmin, wrap((req, res) => {
  res.json({ pairs: store.getHeroPairs(), custom: store.isHeroCustom() })
}))
app.post('/api/work/admin/hero', requireAuth, requireSuperAdmin, wrap((req, res) => {
  res.json(store.setHeroPairs((req.body || {}).pairs))
}))
// Platform data-retention window (days; 0 = keep forever). Readable by any admin;
// only the superadmin sets it. A new window is applied on the next hourly sweep.
app.get('/api/work/admin/retention', requireAuth, requireAdmin, wrap((req, res) => {
  res.json({ retentionDays: store.getWorkRetentionDays() })
}))
app.post('/api/work/admin/retention', requireAuth, requireSuperAdmin, wrap((req, res) => {
  const out = store.setWorkRetentionDays((req.body || {}).retentionDays)
  // Apply immediately so the operator sees the effect, not only on the next sweep.
  try { out.purged = store.purgeOldWorkSessions().purged } catch { out.purged = 0 }
  res.json(out)
}))
// Platform web-search (Tavily) key for live web learning. State is readable by
// any admin; only the superadmin sets it. The raw key is never returned.
app.get('/api/work/admin/web-search', requireAuth, requireAdmin, wrap((req, res) => {
  res.json({ ...store.getPlatformWebSearchState(), envFallback: !!WORK_TAVILY_KEY })
}))
app.post('/api/work/admin/web-search', requireAuth, requireSuperAdmin, requireAiStepUp, wrap((req, res) => {
  const { apiKey, provider } = req.body || {}
  res.json({ ...store.setPlatformWebSearch({ apiKey, provider }), envFallback: !!WORK_TAVILY_KEY })
}))
// Superadmin: a company's own web-search key (their data boundary + billing).
app.post('/api/work/admin/companies/:id/web-search', requireAuth, requireSuperAdmin, wrap((req, res) => {
  const { apiKey, provider } = req.body || {}
  res.json(store.setCompanyWebSearch(req.params.id, { apiKey, provider }))
}))
// Best + cheapest recommendation across configured platform providers. Cached;
// refreshes at most once a day unless ?refresh=1. Reachability errors surface as
// a note, never a silent empty (SUPREME RULE III).
app.get('/api/work/admin/ai-recommendation', requireAuth, requireAdmin, async (req, res) => {
  try {
    const force = String((req.query || {}).refresh || '') === '1'
    let reco = force ? null : store.getWorkAiRecommendation()
    if (!reco) {
      const runtimes = store.getConfiguredRuntimes()
      if (!runtimes.length) return res.json({ at: null, providers: [], overall: null, note: 'No platform AI provider is configured yet. Add a key to see a recommendation.' })
      const data = await computeAiRecommendation(runtimes)
      reco = store.setWorkAiRecommendation(data)
    }
    res.json(reco)
  } catch (e) { sendWorkError(res, e, req) }
})
// Set a user's tier, and grant non-expiring minutes (overage). userId is the
// account id.
app.post('/api/work/admin/tier', requireAuth, requireSuperAdmin, wrap((req, res) => {
  const { userId, tier } = req.body || {}
  res.json(store.setWorkTier(userId, tier))
}))
app.post('/api/work/admin/grant-minutes', requireAuth, requireSuperAdmin, wrap((req, res) => {
  const { userId, minutes } = req.body || {}
  res.json(store.grantWorkPurchasedSeconds(userId, (Number(minutes) || 0) * 60))
}))

// ---- Enterprise billing + quota hierarchy (superadmin, per company) --------
// AdmireVeda sets the monthly pool, task policy, overage price, timezone,
// month-end behavior, and the request/Stripe toggles against each company.
app.post('/api/work/admin/companies/:id/enterprise', requireAuth, requireSuperAdmin, wrap((req, res) => {
  const out = store.setCompanyEnterprise(req.params.id, req.body || {})
  store.recordAdminAction({ companyId: req.params.id, action: 'set_enterprise', reason: req.body && req.body.reason || '', detail: 'enterprise pool/policy updated' })
  res.json(out)
}))
// Live pool + per-user consumption for a company (superadmin view).
app.get('/api/work/admin/companies/:id/pool', requireAuth, requireSuperAdmin, wrap((req, res) => {
  res.json(store.companyPoolDashboard(req.params.id))
}))
// Top up (or correct) a company's LIVE pool now, in minutes (reuses the engine).
app.post('/api/work/admin/companies/:id/pool/grant', requireAuth, requireSuperAdmin, wrap((req, res) => {
  const minutes = Number((req.body || {}).minutes) || 0
  res.json(store.grantCompanyPoolSeconds(req.params.id, minutes * 60))
}))
// Additional-hours requests from company admins: list + approve/deny.
app.get('/api/work/admin/companies/:id/hour-requests', requireAuth, requireSuperAdmin, wrap((req, res) => {
  res.json({ requests: store.listCompanyHourRequests(req.params.id) })
}))
app.post('/api/work/admin/companies/:id/hour-requests/:rid/decide', requireAuth, requireSuperAdmin, wrap((req, res) => {
  const { approve, note } = req.body || {}
  res.json(store.decideCompanyHours(req.params.id, req.params.rid, { approve: !!approve, by: req.user && req.user.username || 'superadmin', note }))
}))
// Superadmin notifications inbox (pool-threshold + hour-request alerts).
app.get('/api/work/admin/notifications', requireAuth, requireSuperAdmin, wrap((req, res) => {
  res.json({ notifications: store.listSuperadminNotifications({ limit: Number((req.query || {}).limit) || 100 }), unread: store.superadminUnreadCount() })
}))
app.post('/api/work/admin/notifications/read', requireAuth, requireSuperAdmin, wrap((req, res) => {
  res.json(store.markSuperadminNotificationRead((req.body || {}).id || '*'))
}))

// ---- Superadmin impersonation (support VIEW of an INDIVIDUAL user) ---------
// A superadmin can VIEW the app as an individual user to reproduce an issue they
// reported. This is a fully-audited support VIEW, NOT a privilege grant: the
// session's authenticated identity (session.uid) stays the superadmin, so admin
// authority is unchanged; only the acting WORK user is overlaid via
// session.workUserId, which requireWorkAuth + /api/work/me honor through
// resolveWorkIdentity (single source of truth). The client shows a persistent
// banner (GET /me -> `impersonating`).
// SECURITY (preserved, not bypassed):
//   * Companies are EXCLUDED by owner rule - individual users only.
//   * No self-impersonation, and only ordinary users (never another admin /
//     superadmin) may be viewed - impersonation never reaches up a privilege tier.
//   * It does NOT bypass the customer-held-key custody model: a custody-locked
//     brain stays BRAIN_LOCKED because the DEK is gated on the COMPANY passphrase
//     the admin does not hold - and an individual target has no company brain at
//     all. Company-admin routes (brain unlock/export) 403 for the overlaid user.
//   * There is NO data-export path here - it is a read-only view only.
// Stop impersonating and restore the superadmin's own view. Works whether called
// by the impersonated (overlaid) session or the admin's own: the authenticated
// identity (session.uid) is always the admin, so requireSuperAdmin still passes.
// NOTE: declared BEFORE the `/:userId` route below so the literal `/stop` is not
// captured as a userId param.
app.post('/api/work/admin/impersonate/stop', requireAuth, requireSuperAdmin, wrap((req, res) => {
  const adminId = req.user.id
  const wasViewing = req.session.workUserId && req.session.workUserId !== req.session.uid ? req.session.workUserId : null
  // Restore the admin: with the overlay cleared, resolveWorkIdentity acts as the
  // real signed-in account again (workUserId === uid -> overlay inert).
  req.session.workUserId = req.session.impersonatorId || req.session.uid
  delete req.session.impersonatorId
  delete req.session.impersonatorAt
  store.recordAdminAction({ userId: wasViewing, action: 'impersonate_stop', detail: wasViewing ? `support view ended by superadmin ${req.user.username || adminId}` : 'no active impersonation' })
  // Send the superadmin back to the ADMIN CONSOLE, not the user dashboard they were
  // viewing. Impersonation is superadmin-only, so ending it always returns to the
  // console; the client navigates here instead of reloading the user page.
  res.json({ ok: true, redirect: '/work/admin' })
}))
// Start impersonating an individual user. Declared AFTER `/stop` so `:userId`
// never swallows that literal path.
app.post('/api/work/admin/impersonate/:userId', requireAuth, requireSuperAdmin, wrap((req, res) => {
  const adminId = req.user.id
  const targetId = String(req.params.userId || '').trim()
  const target = targetId && store.getUser(targetId)
  if (!target) return res.status(404).json({ error: 'User not found.' })
  // No self-impersonation - viewing as yourself is a no-op that would only muddy
  // the audit trail and the banner.
  if (target.id === adminId) return res.status(400).json({ error: 'You cannot impersonate yourself.' })
  // Only ordinary individual users. Impersonation must never reach up a privilege
  // tier (admin / superadmin are refused), and companies are excluded by owner rule.
  if (target.role === 'superadmin' || target.role === 'admin') return res.status(403).json({ error: 'Impersonation is for ordinary individual users only, not administrators.' })
  if (target.companyId) return res.status(400).json({ error: 'Impersonation is for individual users only' })
  req.session.workUserId = target.id
  req.session.impersonatorId = adminId
  req.session.impersonatorAt = new Date().toISOString()
  // Audit via the existing superadmin sink. userId = the AFFECTED user (so the
  // log is searchable by who was viewed, matching session_delete's convention);
  // the acting admin is captured in `detail` so the actor is never lost.
  store.recordAdminAction({ userId: target.id, action: 'impersonate_start', detail: `support view started by superadmin ${req.user.username || adminId}` })
  res.json({ ok: true, user: { id: target.id, name: target.displayName || target.username || target.id } })
}))

// ===========================================================================
// Sessions
// ===========================================================================
// Input-side guardrail (OWASP LLM01 prompt injection / LLM07 prompt leakage).
// Inspects one piece of user-typed free text. If it looks like an attempt to
// manipulate WorkCoPilot itself (not a legitimate task), we RECORD it + bump the
// user's counter, and either REFUSE (high-severity extraction / cross-tenant /
// jailbreak) by sending a 400 here, or return a warning to fold into the normal
// response and PROCEED (the prompt already treats input as untrusted data, so a
// medium attempt cannot actually redirect the model). Returns:
//   'refused'  -> response already sent, caller must `return`
//   {guard}    -> warn-and-proceed, caller folds `...g` into its res.json
//   null       -> clean
// IP-04 bulk-extraction alert: note one discrete AI-generation call for this
// user and, on an abnormal burst, raise a superadmin incident. Alert-only -
// never blocks (the daily task cap bounds real use). NOT called on the continuous
// watch loop, so a normal active session cannot trip it.
function watchExtraction(req, call) {
  try {
    const a = extractionWatch.noteGeneration(req.workUser && req.workUser.id)
    if (a) store.recordWorkIncident({ kind: 'extraction_watch', status: 'alert', call, message: `High request volume: ${a.count} generation calls in ${a.windowS}s (possible scripted extraction).`, userId: req.workUser.id, username: req.workUser.username, companyId: req.workUser.companyId || null })
  } catch { /* alerting must never break a request */ }
}

function guardUserText(req, res, text, field, sessionId = null) {
  const hit = llmGuard.inspectUserText(text, { field })
  if (!hit) return null
  const count = store.recordAbuseAttempt({
    userId: req.workUser.id, username: req.workUser.username, companyId: req.workUser.companyId || null,
    sessionId, category: hit.category, severity: hit.severity, field, sample: String(text || '').slice(0, 300),
  })
  const warning = llmGuard.guardWarning({ severity: hit.severity, nth: count })
  const refuse = hit.severity === 'high' && ['prompt_extraction', 'cross_tenant', 'role_play_jailbreak'].includes(hit.category)
  if (refuse) {
    res.status(400).json({ error: warning, guard: { warning, severity: hit.severity, category: hit.category, blocked: true } })
    return 'refused'
  }
  return { guard: { warning, severity: hit.severity, category: hit.category, blocked: false } }
}

app.post('/api/work/sessions', requireWorkAuth, requireWorkSubscription, wrap((req, res) => {
  const { title, goal, scope } = req.body || {}
  const g0 = guardUserText(req, res, goal, 'goal'); if (g0 === 'refused') return
  // Company free trial: a pool of 1-hour sessions shared across the company's
  // users. Consume one here; gate when the pool is used up.
  const cu = store.getUser(req.workUser.id)
  // Daily task gate FIRST (before consuming a company trial): corporate/company
  // accounts are unlimited; capped tiers must finish the current task and stay
  // under their daily task cap (superadmin-set in pricing).
  try {
    store.startWorkTask(req.workUser.id)
  } catch (e) {
    const body = { error: e.message }
    if (e.mustCompleteCurrent) { body.mustCompleteCurrent = true; body.activeTaskId = e.activeTaskId }
    if (e.taskLimit) { body.taskLimit = true; body.cap = e.cap; body.resetLabel = e.resetLabel; if (e.window) body.window = e.window }
    return res.status(e.status || 402).json(body)
  }
  if (cu && cu.companyId) {
    if (store.companyTrialRemaining(cu.companyId) <= 0) {
      return res.status(402).json({ error: 'Your company free trial is used up. Your administrator can add more.', trialExhausted: true })
    }
    store.consumeCompanyTrialSession(cu.companyId)
  }
  res.json({ session: store.createWorkSession(req.workUser.id, { title, goal, scope }), taskUsage: store.getWorkTaskUsage(req.workUser.id), ...(g0 && g0.guard ? { guard: g0.guard } : {}) })
}))
app.get('/api/work/sessions', requireWorkAuth, wrap((req, res) => {
  res.json({ sessions: store.listWorkSessions(req.workUser.id) })
}))
app.get('/api/work/sessions/:id', requireWorkAuth, wrap((req, res) => {
  const s = store.getWorkSession(req.workUser.id, req.params.id)
  if (!s) return res.status(404).json({ error: 'Session not found' })
  res.json({ session: s, replan: store.getWorkReplanUsage(req.workUser.id, req.params.id) })
}))
app.delete('/api/work/sessions/:id', requireWorkAuth, wrap((req, res) => {
  const reason = (req.query && req.query.reason) || (req.body && req.body.reason) || ''
  res.json(store.deleteWorkSession(req.workUser.id, req.params.id, reason))
}))
// Company admin: the user activity log (session deletions etc.) for their company.
app.get('/api/work/team/activity', requireWorkAuth, requireCompanyAdmin, wrap((req, res) => {
  if (!req.workUser.companyId) return res.status(403).json({ error: 'No company in scope.' })
  res.json({ activity: store.listWorkActivity({ companyId: req.workUser.companyId }) })
}))
// Superadmin: the platform-wide destructive-action audit - who deleted what, when
// and WHY. This is where an INDIVIDUAL (no-company) user's guided-session deletion
// surfaces: they have no company admin, so deleteWorkSession mirrors their delete
// into this one audit sink (listAdminActions) with the same accountable discipline
// company members get in their company activity log above. Reads the single audit
// store - never a parallel log. Company members' own deletions stay in the company
// pane (/api/work/team/activity), not duplicated here.
app.get('/api/work/admin/activity', requireAuth, requireSuperAdmin, wrap((req, res) => {
  const limit = Math.max(1, Math.min(2000, Number(req.query && req.query.limit) || 300))
  res.json({ activity: store.listAdminActions({ limit }) })
}))
// Company admin: affirm (or clear) that the organization authorizes WorkCoPilot
// use on its systems. Recorded with the admin's name + time as the evidence.
app.get('/api/work/team/authorization', requireWorkAuth, requireCompanyAdmin, wrap((req, res) => {
  if (!req.workUser.companyId) return res.status(403).json({ error: 'No company in scope.' })
  res.json(store.getCompanyAuthorization(req.workUser.companyId))
}))
app.post('/api/work/team/authorization', requireWorkAuth, requireCompanyAdmin, wrap((req, res) => {
  if (!req.workUser.companyId) return res.status(403).json({ error: 'No company in scope.' })
  const { attested, byName } = req.body || {}
  const co = store.setCompanyAuthorization(req.workUser.companyId, { attested: attested !== false, byName: byName || req.workUser.username })
  res.json({ authorization: co.authorization })
}))
// Company-set data retention: the company admin owns their own window (the
// platform does not control it). 0 = keep forever. Applied on the next sweep.
app.get('/api/work/team/retention', requireWorkAuth, requireCompanyAdmin, wrap((req, res) => {
  if (!req.workUser.companyId) return res.status(403).json({ error: 'No company in scope.' })
  res.json({ retentionDays: store.getCompanyRetentionDays(req.workUser.companyId) })
}))
app.post('/api/work/team/retention', requireWorkAuth, requireCompanyAdmin, wrap((req, res) => {
  if (!req.workUser.companyId) return res.status(403).json({ error: 'No company in scope.' })
  const out = store.setCompanyRetentionDays(req.workUser.companyId, (req.body || {}).retentionDays)
  try { out.purged = store.purgeOldWorkSessions().purged } catch { out.purged = 0 }
  res.json(out)
}))
// Company admin: use the company's OWN AI keys (overrides our corporate keys).
// An empty apiKey clears them and the company falls back to what the superadmin set.
app.post('/api/work/team/ai-keys', requireWorkAuth, requireCompanyAdmin, wrap((req, res) => {
  if (!req.workUser.companyId) return res.status(403).json({ error: 'No company in scope.' })
  const { providerId, apiKey, chatModel, visionModel } = req.body || {}
  res.json(store.setCompanyAiKeys(req.workUser.companyId, { providerId, apiKey, chatModel, visionModel }, 'company'))
}))
app.get('/api/work/team/ai', requireWorkAuth, requireCompanyAdmin, wrap((req, res) => {
  if (!req.workUser.companyId) return res.status(403).json({ error: 'No company in scope.' })
  // Company admins never see the model, provider, or owner of the AI config
  // (platform IP) - only whether a key is set and its masked tail. publicCompany
  // returns a fresh object, and the superadmin console reads it through the admin
  // routes, so this narrowing is scoped to the company-admin surface only.
  const c = store.getCompany(req.workUser.companyId)
  if (c && c.companyAi) c.companyAi = { keyMasked: c.companyAi.keyMasked, setAt: c.companyAi.setAt }
  res.json(c)
}))
// Company admin: this company's own web-search (Tavily) key for live web learning.
app.post('/api/work/team/web-search', requireWorkAuth, requireCompanyAdmin, wrap((req, res) => {
  if (!req.workUser.companyId) return res.status(403).json({ error: 'No company in scope.' })
  const { apiKey, provider } = req.body || {}
  res.json(store.setCompanyWebSearch(req.workUser.companyId, { apiKey, provider }))
}))
// Company admin: best + cheapest recommendation for the keys THIS company runs on
// (its own key if set, otherwise the platform providers). Not cached per-company
// (small, on-demand); reachability errors surface, never a silent empty.
app.get('/api/work/team/ai-recommendation', requireWorkAuth, requireCompanyAdmin, (req, res) => {
  // Model + cost recommendations are platform IP: only the superadmin console
  // sees models and pricing. Company admins get a neutral, managed response -
  // never model names or per-token cost. (The superadmin equivalent lives under
  // the admin routes.)
  res.json({ at: null, providers: [], overall: null, note: 'Your AI is managed by WorkCoPilot.' })
})
// Company admin: this company's AI consumption this far (estimated $, per user).
// Scoped to the admin's OWN company; the superadmin equivalent lives in
// work-admin.js at /api/work/admin/companies/:id/consumption.
app.get('/api/work/team/consumption', requireWorkAuth, requireCompanyAdmin, wrap((req, res) => {
  if (!req.workUser.companyId) return res.status(403).json({ error: 'No company in scope.' })
  // Company admins see usage COUNTS (sessions per member), never AI dollar cost
  // (platform IP). The superadmin console keeps the dollar view via the admin
  // consumption route.
  const d = store.companyConsumption(req.workUser.companyId)
  res.json({
    companyId: d.companyId, sessionCount: d.sessionCount, userCount: d.userCount,
    byUser: (d.byUser || []).map((u) => ({ id: u.id, username: u.username, displayName: u.displayName, sessions: u.sessions })),
  })
}))
// ---- Enterprise quota (company admin sub-allocation + live pool) -----------
// Live pool + per-user consumption for the company admin's own company.
app.get('/api/work/team/pool', requireWorkAuth, requireCompanyAdmin, wrap((req, res) => {
  if (!req.workUser.companyId) return res.status(403).json({ error: 'No company in scope.' })
  res.json(store.companyPoolDashboard(req.workUser.companyId))
}))
// Company admin: set per-group ceilings + the company-wide task policy (only
// able to tighten below the AdmireVeda pool, which is the hard company cap).
app.post('/api/work/team/allocation', requireWorkAuth, requireCompanyAdmin, wrap((req, res) => {
  if (!req.workUser.companyId) return res.status(403).json({ error: 'No company in scope.' })
  res.json(store.setCompanyAllocation(req.workUser.companyId, req.body || {}))
}))
// Company admin: set one member's allocation group and/or per-user ceiling.
app.post('/api/work/team/users/:id/allocation', requireWorkAuth, requireCompanyAdmin, wrap((req, res) => {
  if (!req.workUser.companyId) return res.status(403).json({ error: 'No company in scope.' })
  res.json(store.setUserAllocation(req.workUser.companyId, req.params.id, req.body || {}))
}))
// Company admin: request additional pooled hours (superadmin approves). List too.
app.get('/api/work/team/hour-requests', requireWorkAuth, requireCompanyAdmin, wrap((req, res) => {
  if (!req.workUser.companyId) return res.status(403).json({ error: 'No company in scope.' })
  res.json({ requests: store.listCompanyHourRequests(req.workUser.companyId) })
}))
app.post('/api/work/team/hour-requests', requireWorkAuth, requireCompanyAdmin, wrap((req, res) => {
  if (!req.workUser.companyId) return res.status(403).json({ error: 'No company in scope.' })
  const { hours, note } = req.body || {}
  res.json(store.requestCompanyHours(req.workUser.companyId, req.workUser.id, { hours, note }))
}))
// Company admin: dashboard notifications (75% user-ceiling alerts + request decisions).
app.get('/api/work/team/notifications', requireWorkAuth, requireCompanyAdmin, wrap((req, res) => {
  res.json({ notifications: store.listNotificationsForUser(req.workUser.id, { limit: Number((req.query || {}).limit) || 50 }), unread: store.unreadNotificationCount(req.workUser.id) })
}))
app.post('/api/work/team/notifications/read', requireWorkAuth, requireCompanyAdmin, wrap((req, res) => {
  res.json(store.markNotificationRead(req.workUser.id, (req.body || {}).id || '*'))
}))

// Company admin: view + clear the company's cross-session KNOWLEDGE BASE (the
// generalized, de-identified tool learnings shared across the company's users).
// requireCompanyAdmin here always has a companyId, so clearLearnings only ever
// touches that company's KB, never the platform KB.
app.get('/api/work/team/learnings', requireWorkAuth, requireCompanyAdmin, wrap((req, res) => {
  const cid = req.workUser.companyId; if (!cid) return res.status(403).json({ error: 'No company in scope.' })
  res.json({ kind: 'company', count: store.getCompanyLearningsCount(cid) })
}))
// Backup: download the company's knowledge base as JSON.
app.get('/api/work/team/learnings/export', requireWorkAuth, requireCompanyAdmin, wrap((req, res) => {
  const cid = req.workUser.companyId; if (!cid) return res.status(403).json({ error: 'No company in scope.' })
  // Single chokepoint: once an export password is set, the plaintext side door closes.
  if (store.companyExportPasswordSet(cid)) return res.status(409).json({ error: 'A data-export password is set for this company. Use the encrypted export (/api/work/team/data-export) instead.', encryptedExport: true })
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="workcopilot-knowledge-base-${cid}.json"`)
  res.send(JSON.stringify({ exportedAt: new Date().toISOString(), companyId: cid, learnings: store.exportCompanyLearnings(cid) }, null, 2))
}))
// Restore: import a backup (replace or merge). Replacing is destructive -> logged.
app.post('/api/work/team/learnings/import', requireWorkAuth, requireCompanyAdmin, wrap((req, res) => {
  const cid = req.workUser.companyId; if (!cid) return res.status(403).json({ error: 'No company in scope.' })
  const body = req.body || {}
  const arr = Array.isArray(body.learnings) ? body.learnings : (Array.isArray(body) ? body : null)
  if (!arr) return res.status(400).json({ error: 'Provide a backup with a "learnings" list.' })
  const replace = body.mode !== 'merge'
  if (replace) {
    const reason = String(body.reason || '').trim()
    if (reason.length < 3) return res.status(400).json({ error: 'A reason is required to replace the knowledge base.' })
    store.recordAdminAction({ userId: req.workUser.id, companyId: cid, action: 'kb_restore_replace', reason, detail: `imported ${arr.length} entries (replace)` })
  }
  const count = store.importCompanyLearnings(cid, arr, { replace })
  res.json({ count, mode: replace ? 'replace' : 'merge' })
}))
// Clear the company KB. Destructive -> a reason is REQUIRED and the action is logged.
app.post('/api/work/team/learnings/clear', requireWorkAuth, requireCompanyAdmin, wrap((req, res) => {
  const cid = req.workUser.companyId; if (!cid) return res.status(403).json({ error: 'No company in scope.' })
  const reason = String((req.body || {}).reason || '').trim()
  if (reason.length < 3) return res.status(400).json({ error: 'Please give a reason for clearing the knowledge base.' })
  // SAFEGUARD: clearCompanyLearnings auto-backs-up the KB before wiping it, so a
  // good knowledge base is never lost by accident. The admin gets the backup id
  // back and can restore it from the backups list below.
  const { cleared, backupId } = store.clearCompanyLearnings(cid, { byUserId: req.workUser.id, reason })
  store.recordAdminAction({ userId: req.workUser.id, companyId: cid, action: 'kb_clear', reason, detail: `cleared ${cleared} entries (auto-backup ${backupId || 'none'})` })
  res.json({ cleared, backupId, backedUp: !!backupId })
}))
// Auto-backups taken before each clear (metadata, newest first) - the admin's
// safety net so good learnings are recoverable after a clear-all.
app.get('/api/work/team/learnings/backups', requireWorkAuth, requireCompanyAdmin, wrap((req, res) => {
  const cid = req.workUser.companyId; if (!cid) return res.status(403).json({ error: 'No company in scope.' })
  res.json({ backups: store.listCompanyKbBackups(cid) })
}))
// Download one auto-backup as JSON (same shape as a manual export).
app.get('/api/work/team/learnings/backups/:bid', requireWorkAuth, requireCompanyAdmin, wrap((req, res) => {
  const cid = req.workUser.companyId; if (!cid) return res.status(403).json({ error: 'No company in scope.' })
  const b = store.getCompanyKbBackup(cid, req.params.bid)
  if (!b) return res.status(404).json({ error: 'Backup not found.' })
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="workcopilot-kb-backup-${req.params.bid}.json"`)
  res.send(JSON.stringify({ exportedAt: new Date().toISOString(), companyId: cid, backupId: b.id, takenAt: b.at, learnings: b.learnings || [] }, null, 2))
}))
// Restore an auto-backup into the live KB (replace by default, or merge). Logged.
app.post('/api/work/team/learnings/backups/:bid/restore', requireWorkAuth, requireCompanyAdmin, wrap((req, res) => {
  const cid = req.workUser.companyId; if (!cid) return res.status(403).json({ error: 'No company in scope.' })
  const replace = (req.body || {}).mode !== 'merge'
  const count = store.restoreCompanyKbBackup(cid, req.params.bid, { replace })
  store.recordAdminAction({ userId: req.workUser.id, companyId: cid, action: 'kb_restore_backup', reason: `restore backup ${req.params.bid}`, detail: `restored to ${count} entries (${replace ? 'replace' : 'merge'})` })
  res.json({ count, mode: replace ? 'replace' : 'merge' })
}))

// ---- Skills: add your own playbooks/skills (from any AI) so guidance aligns ---
// with how you/your org work. A company's skills are PRIVATE; a solo user's skills
// join the shared platform skills (consented at signup). Content is scrubbed on the
// device before upload and again here (store.addSkill runs the policy-aware scrub),
// so a raw name/phone/SSN/PHI/IP/secret/block-listed word is never stored or
// injected into a prompt.
app.post('/api/work/skills', requireWorkAuth, wrap((req, res) => {
  const b = req.body || {}
  const rec = store.addSkill(req.workUser.id, { title: b.title, content: b.content || b.text, tags: b.tags })
  if (!rec) return res.status(400).json({ error: 'Add a skill with at least a short description of how to do it.' })
  // Audit what the server stripped on write (types + counts only, never values),
  // so the company admin sees it in the activity log - same surface as plan-time PII.
  if (rec.redacted > 0) store.recordPiiAlert(req.workUser.id, { call: 'skill', counts: rec.counts, total: rec.redacted })
  res.json({ ok: true, skill: rec, redacted: rec.redacted || 0 })
}))
app.get('/api/work/skills', requireWorkAuth, wrap((req, res) => res.json({ skills: store.listSkills(req.workUser.id), scope: (store.getLearningsScope(req.workUser.id) || {}).kind || 'global' })))
app.delete('/api/work/skills/:id', requireWorkAuth, wrap((req, res) => res.json(store.deleteSkill(req.workUser.id, req.params.id))))
// Company skills download / re-upload (admin) - parallel to the KB backup/restore.
app.get('/api/work/team/skills/export', requireWorkAuth, requireCompanyAdmin, wrap((req, res) => {
  const cid = req.workUser.companyId; if (!cid) return res.status(403).json({ error: 'No company in scope.' })
  if (store.companyExportPasswordSet(cid)) return res.status(409).json({ error: 'A data-export password is set for this company. Use the encrypted export (/api/work/team/data-export) instead.', encryptedExport: true })
  res.setHeader('content-type', 'application/json')
  res.send(JSON.stringify({ exportedAt: new Date().toISOString(), companyId: cid, skills: store.exportCompanySkills(cid) }, null, 2))
}))
app.post('/api/work/team/skills/import', requireWorkAuth, requireCompanyAdmin, wrap((req, res) => {
  const body = req.body || {}
  const arr = Array.isArray(body.skills) ? body.skills : (Array.isArray(body) ? body : null)
  if (!arr) return res.status(400).json({ error: 'Provide a backup with a "skills" list.' })
  const r = store.importCompanySkills(req.workUser.companyId, arr, { replace: body.replace !== false })
  // Audit the re-upload scrub (this path previously bypassed even the secrets filter).
  if (r.redacted > 0) store.recordAdminAction({ userId: req.workUser.id, companyId: req.workUser.companyId, action: 'skills_import_scrub', reason: 'skill re-upload', detail: `stripped ${r.redacted} sensitive value(s) across ${r.count} skill(s)` })
  res.json(r)
}))
app.post('/api/work/team/skills/clear', requireWorkAuth, requireCompanyAdmin, wrap((req, res) => {
  const cid = req.workUser.companyId; if (!cid) return res.status(403).json({ error: 'No company in scope.' })
  const reason = String((req.body || {}).reason || '').trim()
  if (reason.length < 3) return res.status(400).json({ error: 'Please give a reason for clearing the skills.' })
  const cleared = store.clearCompanySkills(cid)
  store.recordAdminAction({ userId: req.workUser.id, companyId: cid, action: 'skills_clear', reason, detail: `cleared ${cleared} skills` })
  res.json({ cleared })
}))

// ---- Company sensitivity: privacy / business-contact recipients (admin) -------
// Recipients are a LIST of named people (who may receive the export password and/or
// retrieve sensitive data), NOT app roles. Editing is audited (reason required).
app.get('/api/work/team/privacy-contacts', requireWorkAuth, requireCompanyAdmin, wrap((req, res) => {
  const cid = req.workUser.companyId; if (!cid) return res.status(403).json({ error: 'No company in scope.' })
  res.json(store.getCompanySensitivity(cid))
}))
app.post('/api/work/team/privacy-contacts', requireWorkAuth, requireCompanyAdmin, wrap((req, res) => {
  const cid = req.workUser.companyId; if (!cid) return res.status(403).json({ error: 'No company in scope.' })
  const b = req.body || {}
  const reason = String(b.reason || '').trim()
  if (reason.length < 3) return res.status(400).json({ error: 'A reason is required to change privacy contacts (recorded in the audit trail).' })
  const out = store.setCompanyPrivacyContacts(cid, b.recipients, { byUserId: req.workUser.id, reason, tier: b.tier })
  res.json(out)
}))

// ---- Password-encrypted data export (company admins) -------------------------
// Password SET AT SETUP: we store only a scrypt verifier (never the password / key).
// If email is configured, the password is emailed to every recipient who may receive
// it (the email carries the PASSWORD ONLY, never the archive or a link). If email is
// off, we return the password once for the UI to show (stated mode, no silent drop).
app.post('/api/work/team/export-password', requireWorkAuth, requireCompanyAdmin, wrap((req, res) => {
  const cid = req.workUser.companyId; if (!cid) return res.status(403).json({ error: 'No company in scope.' })
  const password = String((req.body || {}).password || '')
  const status = store.setCompanyExportPassword(cid, password)   // throws 400 if too weak
  store.recordAdminAction({ userId: req.workUser.id, companyId: cid, action: 'export_password_set', reason: 'set data-export password', detail: 'verifier stored; password not stored' })
  const company = store.getCompany(cid)
  const recipients = ((company.sensitivity && company.sensitivity.recipients) || []).filter((r) => r.canReceivePassword && r.email)
  if (store.smtpConfigured()) {
    // The email carries the PASSWORD ONLY. Never the archive, never a download link.
    for (const r of recipients) sendTemplateAsync('export_password_set', r.email, { name: r.name, company: company.name, password })
    return res.json({ ...status, delivery: 'email', emailedCount: recipients.length })
  }
  return res.json({
    ...status, delivery: 'onscreen', password, emailedCount: 0,
    note: 'Email is not configured, so the password was not sent. Share it with your authorized recipients now; it is shown here only once.',
  })
}))
// DOWNLOAD: verify the password, then build + stream the WCPX v1 encrypted archive.
app.post('/api/work/team/data-export', requireWorkAuth, requireCompanyAdmin, wrap((req, res) => {
  const cid = req.workUser.companyId; if (!cid) return res.status(403).json({ error: 'No company in scope.' })
  const password = String((req.body || {}).password || '')
  if (!store.companyExportPasswordSet(cid)) return res.status(409).json({ error: 'Set an export password first (POST /api/work/team/export-password).', needsPassword: true })
  if (!store.checkCompanyExportPassword(cid, password)) return res.status(401).json({ error: 'That password does not match the export password set for this company.' })
  const { buffer, filename, brainMode, brainIncluded, notes } = buildCompanyArchive({ companyId: cid, password })
  store.recordAdminAction({ userId: req.workUser.id, companyId: cid, action: 'data_export', reason: 'encrypted data export', detail: `wcpx ${buffer.length} bytes, brain=${brainMode}` })
  res.setHeader('Content-Type', 'application/octet-stream')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.setHeader('X-WCPX-Brain', brainIncluded ? 'included' : 'skipped')
  if (!brainIncluded && notes && notes.length) res.setHeader('X-WCPX-Note', encodeURIComponent(notes[0]))
  res.send(buffer)
}))

// ---- Company Brain: per-tenant encrypted knowledge from the desktop ----------
// The desktop scrubs + embeds documents ON DEVICE and posts only scrubbed chunks
// + vectors here (never the raw files). The server re-applies the scrub floor
// (defense in depth), stores them encrypted per tenant, and grounds plans from
// them. Ingestion is per company source; any company user's device may contribute.
const BRAIN_MAX_RECORDS = 1000
app.post('/api/work/brain/chunks', requireWorkAuth, wrap(async (req, res) => {
  const cid = req.workUser.companyId
  if (!cid) return res.status(403).json({ error: 'The Company Brain is for company accounts.' })
  const b = req.body || {}
  const source = b.source || {}
  if (!source.sourceId) return res.status(400).json({ error: 'A source id is required.' })
  // A dedupe alias (same content already ingested elsewhere in the tenant): ack, store nothing.
  if (b.alias) return res.json({ ok: true, alias: true, aliasOf: b.aliasOf || null })
  const records = Array.isArray(b.records) ? b.records.slice(0, BRAIN_MAX_RECORDS) : null
  if (!records || !records.length) return res.status(400).json({ error: 'No chunks to store.' })
  // Server-side scrub floor (defense in depth; the device already scrubbed).
  const pol = store.getEffectiveWorkPolicy(req.workUser.id)
  const counts = {}; let redacted = 0; const stored = []
  for (const r of records) {
    if (!r || !r.chunkId) continue
    const sb = pol ? scrubWithPolicy(String(r.text || ''), pol) : scrubSensitive(String(r.text || ''))
    redacted += sb.total || 0
    for (const [k, v] of Object.entries(sb.counts || {})) counts[k] = (counts[k] || 0) + v
    stored.push({
      chunkId: String(r.chunkId), sourceId: source.sourceId, sourceTitle: source.title || r.sourceTitle || '',
      ordinal: Number(r.ordinal) || 0, text: sb.clean, vector: r.vector,
      contentHash: r.contentHash || null, chunkHash: r.chunkHash || null,
    })
  }
  if (!stored.length) return res.status(400).json({ error: 'No valid chunks to store.' })
  const sourceMeta = {
    title: source.title || '', kind: source.kind || '', revision: source.revision || '',
    etag: source.etag || '', modifiedTime: source.modifiedTime || null,
    version: source.version != null ? source.version : null, contentHash: b.contentHash || null,
    embeddingModelVersion: `${EMBED.id}@${EMBED.rev}`, policyVersion: b.policyVersion || policyVersionOf(pol),
  }
  const result = b.supersede
    ? await brainStore.supersede(cid, source.sourceId, stored, sourceMeta)
    : await brainStore.upsert(cid, stored, sourceMeta)
  if (redacted > 0) store.recordPiiAlert(req.workUser.id, { call: 'brain', counts, total: redacted })
  res.json({ ok: true, ...result, redacted })
}))
app.get('/api/work/brain/manifest', requireWorkAuth, wrap(async (req, res) => {
  const cid = req.workUser.companyId
  if (!cid) return res.json({ cursor: null, sources: [], model: EMBED, policyVersion: '' })
  res.json(await buildManifest(cid, { since: req.query.since || null }))
}))
app.get('/api/work/brain/inventory', requireWorkAuth, requireCompanyAdmin, wrap(async (req, res) => {
  const cid = req.workUser.companyId; if (!cid) return res.status(403).json({ error: 'No company in scope.' })
  const stats = await brainStore.stats(cid)
  const sources = (await brainStore.listSources(cid)).map((s) => ({
    sourceId: s.sourceId, title: s.title, kind: s.kind, version: s.version,
    chunks: (s.chunkHashes || []).length, status: s.status, updatedAt: s.updatedAt, policyVersion: s.policyVersion,
  }))
  res.json({ stats, sources })
}))
app.delete('/api/work/brain/sources/:id', requireWorkAuth, requireCompanyAdmin, wrap(async (req, res) => {
  const cid = req.workUser.companyId; if (!cid) return res.status(403).json({ error: 'No company in scope.' })
  const reason = String((req.body || {}).reason || '').trim()
  if (reason.length < 3) return res.status(400).json({ error: 'Please give a reason for removing this source.' })
  const r = await brainStore.delete(cid, { sourceId: req.params.id })
  store.recordAdminAction({ userId: req.workUser.id, companyId: cid, action: 'brain_source_remove', reason, detail: `removed source ${req.params.id} (${r.removed} chunk(s))` })
  res.json(r)
}))
app.post('/api/work/brain/clear', requireWorkAuth, requireCompanyAdmin, wrap(async (req, res) => {
  const cid = req.workUser.companyId; if (!cid) return res.status(403).json({ error: 'No company in scope.' })
  const reason = String((req.body || {}).reason || '').trim()
  if (reason.length < 3) return res.status(400).json({ error: 'Please give a reason for clearing the brain.' })
  const sources = await brainStore.listSources(cid)
  let chunks = 0
  for (const s of sources) { const r = await brainStore.delete(cid, { sourceId: s.sourceId }); chunks += r.removed }
  store.recordAdminAction({ userId: req.workUser.id, companyId: cid, action: 'brain_clear', reason, detail: `cleared ${sources.length} source(s), ${chunks} chunk(s)` })
  res.json({ cleared: sources.length, chunks })
}))

// ---- Company Brain: customer-held-key custody (enable / unlock / lock / rotate) -------
// A company can opt into customer-held encryption: a passphrase + a 24-word recovery phrase
// the platform NEVER stores. After that the brain is LOCKED until the admin unlocks it;
// while unlocked the DEK is resident for a time-boxed window (idle auto-lock). Honest ceiling:
// at-rest zero-access is real; on a running, unlocked managed instance an operator could in
// principle reach decrypted memory during the window - it is NOT "zero-knowledge" (that is
// only literally true on-prem, where we have no root).
const BRAIN_UNLOCK_WINDOW_MS = Math.max(60000, parseInt(process.env.WORK_BRAIN_UNLOCK_WINDOW_MS || String(30 * 60 * 1000), 10) || (30 * 60 * 1000))
const _brainUnlockedAt = new Map()   // companyId -> ms of last unlock (idle auto-lock)
function _noteUnlocked(cid) { _brainUnlockedAt.set(String(cid), Date.now()) }
function _noteLocked(cid) { _brainUnlockedAt.delete(String(cid)) }

app.get('/api/work/brain/security', requireWorkAuth, requireCompanyAdmin, wrap((req, res) => {
  const cid = req.workUser.companyId; if (!cid) return res.status(403).json({ error: 'No company in scope.' })
  const c = store.getCompanyBrainCrypto(cid)
  const custody = (c && c.custody) || 'platform'
  // Honest, non-silent status for dense retrieval: when the on-device embedder
  // is not serving, dense vectors are a deterministic placeholder and only the
  // keyword (BM25) arm carries real signal. Surface the boolean + a generic
  // note so the admin UI can warn; never expose the model/provider name.
  const semanticSearchReady = embedderReady()
  const payload = { custody, enabled: custody === 'customer', locked: custody === 'customer' ? !brainUnlocked(cid) : false, dekId: (c && c.dekId) || null, unlockWindowMinutes: Math.round(BRAIN_UNLOCK_WINDOW_MS / 60000), semanticSearchReady }
  if (!semanticSearchReady) payload.note = 'Semantic search is running in keyword-only mode until the on-device model is available.'
  res.json(payload)
}))
app.post('/api/work/brain/enable-private', requireWorkAuth, requireCompanyAdmin, wrap((req, res) => {
  const cid = req.workUser.companyId; if (!cid) return res.status(403).json({ error: 'No company in scope.' })
  const b = req.body || {}
  const passphrase = String(b.passphrase || '')
  if (passphrase.length < 8) return res.status(400).json({ error: 'Choose a passphrase of at least 8 characters.' })
  if (b.acknowledge !== true) return res.status(400).json({ error: 'You must acknowledge that losing BOTH the passphrase and the recovery phrase means the data cannot be recovered.' })
  if (store.getCompanyBrainCustody(cid) === 'customer') return res.status(409).json({ error: 'Private encryption is already enabled.' })
  const platformWrappedDek = store.getCompanyBrainDek(cid) || null   // re-parent an existing DEK, else born customer-held
  const en = enableCustomerCustody(cid, { passphrase, platformWrappedDek })
  store.enablePrivateEncryption(cid, { salt: en.salt, wrapPass: en.wrapPass, wrappedDek: en.wrappedDek, dekId: en.dekId, kdf: en.kdf })
  _noteUnlocked(cid)
  store.recordAdminAction({ userId: req.workUser.id, companyId: cid, action: 'brain_private_enable', reason: 'enable customer-held encryption', detail: `dek ${en.dekId}` })
  // The recovery phrase is returned ONCE and NEVER stored; the client must show it and confirm it was saved.
  res.json({ ok: true, recoveryPhrase: en.recoveryPhrase, dekId: en.dekId })
}))
app.post('/api/work/brain/unlock', requireWorkAuth, requireCompanyAdmin, wrap((req, res) => {
  const cid = req.workUser.companyId; if (!cid) return res.status(403).json({ error: 'No company in scope.' })
  const c = store.getCompanyBrainCrypto(cid)
  if (!c || c.custody !== 'customer') return res.status(400).json({ error: 'Private encryption is not enabled for this company.' })
  const b = req.body || {}
  try {
    if (b.recoveryPhrase) unlockWithRecovery(cid, { recoveryPhrase: String(b.recoveryPhrase), wrappedDek: c.wrappedDek })
    else unlockWithPassphrase(cid, { passphrase: String(b.passphrase || ''), salt: c.salt, wrapPass: c.wrapPass, wrappedDek: c.wrappedDek, kdf: c.kdf })
  } catch (e) { return res.status(401).json({ error: /passphrase|recovery/i.test(e.message) ? 'That passphrase or recovery phrase is not correct.' : 'Could not unlock the Company Brain.' }) }
  _noteUnlocked(cid)
  store.recordAdminAction({ userId: req.workUser.id, companyId: cid, action: 'brain_unlock', reason: 'unlock company brain', detail: b.recoveryPhrase ? 'via recovery phrase' : 'via passphrase' })
  res.json({ ok: true, unlocked: true })
}))
app.post('/api/work/brain/lock', requireWorkAuth, requireCompanyAdmin, wrap((req, res) => {
  const cid = req.workUser.companyId; if (!cid) return res.status(403).json({ error: 'No company in scope.' })
  brainLock(cid); _noteLocked(cid)
  res.json({ ok: true, locked: true })
}))
app.post('/api/work/brain/rotate-passphrase', requireWorkAuth, requireCompanyAdmin, wrap((req, res) => {
  const cid = req.workUser.companyId; if (!cid) return res.status(403).json({ error: 'No company in scope.' })
  const c = store.getCompanyBrainCrypto(cid)
  if (!c || c.custody !== 'customer') return res.status(400).json({ error: 'Private encryption is not enabled for this company.' })
  const b = req.body || {}
  const newPassphrase = String(b.newPassphrase || '')
  if (newPassphrase.length < 8) return res.status(400).json({ error: 'Choose a new passphrase of at least 8 characters.' })
  let next
  try { next = changePassphrase(cid, { currentPassphrase: b.currentPassphrase, recoveryPhrase: b.recoveryPhrase, salt: c.salt, wrapPass: c.wrapPass, kdf: c.kdf, newPassphrase }) }
  catch (e) { return res.status(401).json({ error: /passphrase|recovery/i.test(e.message) ? 'The current passphrase or recovery phrase is not correct.' : 'Could not change the passphrase.' }) }
  store.setCompanyBrainPassphrase(cid, { salt: next.salt, wrapPass: next.wrapPass, kdf: next.kdf })
  store.recordAdminAction({ userId: req.workUser.id, companyId: cid, action: 'brain_passphrase_rotate', reason: 'rotate brain passphrase', detail: b.recoveryPhrase ? 'via recovery phrase' : 'via current passphrase' })
  res.json({ ok: true })
}))
// Any company user: their company's white-label branding (logo + public contact)
// for the dashboard header. Carries no seats, pricing, AI config or cost.
app.get('/api/work/my-company', requireWorkAuth, wrap((req, res) => {
  if (!req.workUser.companyId) return res.json(null)
  res.json(store.companyBranding(req.workUser.companyId))
}))
// Executive dashboard: company productivity + hypothetical ROI. No AI model and
// no AI cost in the payload (business rules).
app.get('/api/work/exec/productivity', requireWorkAuth, requireExecutive, wrap((req, res) => {
  if (!req.workUser.companyId) return res.status(403).json({ error: 'No company in scope.' })
  const days = Math.min(365, Math.max(1, parseInt(req.query.days, 10) || 30))
  res.json(store.companyProductivity(req.workUser.companyId, { days }))
}))
// Executive CSV export of the productivity data (PDF + image are exported client
// side from the live dashboard).
app.get('/api/work/exec/productivity.csv', requireWorkAuth, requireExecutive, wrap((req, res) => {
  if (!req.workUser.companyId) return res.status(403).json({ error: 'No company in scope.' })
  const days = Math.min(365, Math.max(1, parseInt(req.query.days, 10) || 30))
  const d = store.companyProductivity(req.workUser.companyId, { days })
  const esc = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'
  const rows = []
  rows.push(['Metric', 'Value'].map(esc).join(','))
  rows.push(['Generated', d.generatedAt].map(esc).join(','))
  rows.push(['Window (days)', d.windowDays].map(esc).join(','))
  rows.push(['Members', d.members].map(esc).join(','))
  rows.push(['Tasks completed', d.tasksCompleted].map(esc).join(','))
  rows.push(['Tasks in progress', d.tasksInProgress].map(esc).join(','))
  rows.push(['Avg steps per task', d.avgStepsPerTask].map(esc).join(','))
  rows.push(['Avg minutes per task', d.avgMinutesPerTask].map(esc).join(','))
  rows.push(['Effectiveness %', d.effectivenessPct].map(esc).join(','))
  rows.push(['Fully completed %', d.fullyCompletedPct].map(esc).join(','))
  rows.push(['Time saved hours (estimate)', d.estimated.timeSavedHours].map(esc).join(','))
  rows.push(['Dollars saved (estimate)', d.estimated.dollarsSaved].map(esc).join(','))
  rows.push(['Estimate basis', `${d.estimated.assumptions.manualMinPerStep} min/step manual, $${d.estimated.assumptions.laborUsdPerHour}/hr`].map(esc).join(','))
  rows.push('')
  rows.push(['Task type', 'Completed'].map(esc).join(','))
  for (const t of d.byType) rows.push([t.type, t.count].map(esc).join(','))
  rows.push('')
  rows.push(['Depth', 'Completed'].map(esc).join(','))
  rows.push(['Quick (1-3 steps)', d.depth.quick].map(esc).join(','))
  rows.push(['Standard (4-7 steps)', d.depth.standard].map(esc).join(','))
  rows.push(['Deep (8+ steps)', d.depth.deep].map(esc).join(','))
  rows.push('')
  rows.push(['Member', 'Tasks completed'].map(esc).join(','))
  for (const m of d.topMembers) rows.push([m.name, m.tasks].map(esc).join(','))
  const csv = rows.join('\n')
  const signedCsv = csv + '\n' + attestationText(attestReport(csv, { kind: 'productivity-csv', reportId: '' })).split('\n').map((l) => l ? '# ' + l : l).join('\n')
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', 'attachment; filename="workcopilot-productivity.csv"')
  res.send(signedCsv)
}))
app.post('/api/work/sessions/:id/goal', requireWorkAuth, wrap((req, res) => {
  const g = guardUserText(req, res, (req.body || {}).goal, 'goal', req.params.id); if (g === 'refused') return
  res.json({ session: store.setWorkSessionGoal(req.workUser.id, req.params.id, (req.body || {}).goal), ...(g && g.guard ? { guard: g.guard } : {}) })
}))

// Plan: turn the goal (plus an optional first frame) into the ordered checklist.
app.post('/api/work/sessions/:id/plan', requireWorkAuth, requireWorkSubscription, async (req, res) => {
  try {
    const s = store.getWorkSession(req.workUser.id, req.params.id)
    if (!s) return res.status(404).json({ error: 'Session not found' })
    watchExtraction(req, 'plan')
    const { goal, frame, mode } = req.body || {}
    const gPlan = guardUserText(req, res, goal, 'goal', req.params.id); if (gPlan === 'refused') return
    if (gPlan && gPlan.guard) store.appendWorkEvent(req.workUser.id, req.params.id, { kind: 'ai', text: gPlan.guard.warning })
    // A re-plan = planning a task that already has a goal AND steps. The FIRST
    // plan sets the goal; a re-plan NEVER changes the original request (owner
    // rule) - it only re-adapts the plan with new information (the reason). It
    // also draws on a per-task re-plan budget, gated here BEFORE any tokens are
    // spent so a spent budget fails fast and cheap.
    const isReplan = Array.isArray(s.steps) && s.steps.length > 0 && !!s.goal
    // A clarify-driven re-plan (the user answered a question the guide asked) is
    // NOT a user-requested re-plan: it refines the SAME task with an input we
    // asked for, so it must not burn the per-task re-plan budget. The answer is
    // already folded into the session scope (POST .../clarify) before this call.
    const fromClarify = !!(req.body && req.body.fromClarify)
    if (isReplan && !fromClarify) store.gateWorkReplan(req.workUser.id, req.params.id)
    if (!isReplan && goal != null) store.setWorkSessionGoal(req.workUser.id, req.params.id, goal)
    const useMode = work.normalizeMode(mode != null ? mode : s.mode)
    if (mode != null) store.setWorkSessionMode(req.workUser.id, req.params.id, useMode)
    // On a re-plan we plan from the FROZEN original goal, never the (possibly
    // edited) goal the client sent - the request is locked.
    const useGoal = (isReplan ? s.goal : (goal != null ? goal : s.goal)) || ''
    if (!String(useGoal).trim()) return res.status(400).json({ error: 'Add a goal first.' })
    const r = await resolveWorkRuntime(req, res, { needVision: !!frame }); if (!r) return
    // Plan with the BEST model available (one call per session; the watch loop
    // stays cheap). Surfaced to the user as "Planned by <model>".
    const bp = await bestPlanningCall(req, r, !!frame)
    const call = bp.call
    const plannedBy = bp.plannedBy
    // Scrub PII / PHI / secrets out of the goal and the user's own documents
    // before anything (web search, prompt) leaves to an AI provider - but only
    // when scrubbing is enabled for this user (superadmin policy; off by default).
    const scrubOn = store.workUserScrubOn(req.workUser.id)
    // An armed governance policy (block words + per-category actions) takes
    // precedence; else the legacy on/off scrub. Returns { clean, counts }.
    const pol = store.getEffectiveWorkPolicy(req.workUser.id)
    const scrubText = (t) => pol ? scrubWithPolicy(String(t || ''), pol) : (scrubOn ? scrubSensitive(String(t || '')) : { clean: String(t || ''), counts: {}, total: 0 })
    const goalScrub = scrubText(useGoal)
    const safeGoal = goalScrub.clean
    // Fold the scoping wizard answers into the plan (scrubbed too when enabled).
    const scopeAnswers = (Array.isArray(req.body && req.body.scope) ? req.body.scope : null) || (Array.isArray(s.scope) ? s.scope : null)
    let scopeBrief = scopeAnswers ? work.workScopeBrief(scopeAnswers) : ''
    if (scopeBrief && (pol || scrubOn)) scopeBrief = scrubText(scopeBrief).clean
    // Re-plan flow: a reason (updated instructions) and whether to keep progress
    // (re-plan only the remaining work, preserving the already-done steps).
    const reasonText = (typeof (req.body && req.body.reason) === 'string' && req.body.reason.trim()) ? scrubText(req.body.reason).clean.slice(0, 600) : ''
    const keepProgress = !!(req.body && req.body.keepProgress)
    const doneSteps = keepProgress ? ((s.steps || []).filter((x) => x.status === 'done')) : []
    const planGoal = safeGoal + (scopeBrief ? '\n\n' + scopeBrief : '')
      + (reasonText ? `\n\nWHY RE-PLANNING (updated instructions from the user - honour these): ${reasonText}` : '')
      + (doneSteps.length ? `\n\nALREADY DONE (do NOT repeat these; plan ONLY the remaining work, continuing from where the user is now):\n${doneSteps.map((d, i) => `${i + 1}. ${d.text}`).join('\n')}` : '')
    const research = await Promise.race([
      workResearchNotes(safeGoal, resolveWebSearchKey(req)),
      new Promise((resolve) => setTimeout(() => resolve(''), 15000)),
    ]).catch(() => '')
    // Web learning: if the goal or scope names a link, READ it on the server and
    // ground the plan in the real page content (and a few same-site guide pages),
    // instead of planning from memory. Bounded + SSRF-safe. It ALERTS the user
    // when it reads a link and when a site cannot be reached, so a "learn from
    // this site" task never silently falls flat.
    const linkSource = `${useGoal}\n${scopeAnswers ? scopeAnswers.map((a) => (a && (a.a || a.answer)) || a).join(' ') : ''}`
    const web = await Promise.race([
      fetchUrlsForLearning(linkSource),
      new Promise((resolve) => setTimeout(() => resolve({ grounding: '', pages: [], errors: [] }), 22000)),
    ]).catch(() => ({ grounding: '', pages: [], errors: [] }))
    const webGround = web.grounding ? scrubText(web.grounding).clean : ''
    if (web.pages && web.pages.length) {
      const hosts = [...new Set(web.pages.map((p) => { try { return new URL(p.url).host.replace(/^www\./, '') } catch { return 'the link' } }))].join(', ')
      store.appendWorkEvent(req.workUser.id, req.params.id, { kind: 'ai', text: `Read your link: ${hosts} (${web.pages.length} page${web.pages.length === 1 ? '' : 's'}) and grounded the steps in it.` })
    }
    for (const e of (web.errors || []).slice(0, 2)) {
      const host = (() => { try { return new URL(e.url).host.replace(/^www\./, '') } catch { return String(e.url) } })()
      store.appendWorkEvent(req.workUser.id, req.params.id, { kind: 'flag', text: `Could not reach ${host} (${e.error}). I planned from what I know. Check the link or your connection, and I can read it live.` })
    }
    const combinedResearch = [webGround, research].filter(Boolean).join('\n\n')
    // Desktop on-device path: the app extracts + governs the document locally and
    // passes the text in the request. It is used for THIS plan only and never
    // stored (store.getWorkDocsText is the web path, where docs are persisted).
    const ephemeralDocs = typeof (req.body && req.body.docsText) === 'string' ? req.body.docsText.slice(0, 8000) : ''
    const rawDocs = ephemeralDocs || store.getWorkDocsText(req.workUser.id, { maxChars: 6000 })
    const docScrub = scrubText(rawDocs)
    const userDocs = docScrub.clean
    const groundedResearch = userDocs
      ? (`USER-PROVIDED REFERENCE DOCUMENTS (ground the steps in these and fit the user's environment, but verify against best practice: if a document is wrong, outdated, risky or suboptimal, flag it, give the best proven alternative, and note why - do not follow it blindly):\n${userDocs}\n\n` + (combinedResearch || ''))
      : combinedResearch
    const scrubCounts = {}
    for (const c of [goalScrub.counts, docScrub.counts]) for (const [k, v] of Object.entries(c)) scrubCounts[k] = (scrubCounts[k] || 0) + v
    const redacted = Object.values(scrubCounts).reduce((a, b) => a + b, 0)
    if (redacted > 0) store.appendWorkEvent(req.workUser.id, req.params.id, { kind: 'ai', text: redactionSummary(scrubCounts) })
    // Audit: record exactly what was transmitted to the AI for this plan.
    store.appendWorkAudit(req.params.id, {
      call: 'plan', model: call.visionModel || (call.rt && call.rt.chatModel) || null, scrub: scrubOn, redacted,
      frame: frame ? 'screenshot sent' : null,
      sent: safeGoal + (userDocs ? '\n[+ your reference documents]' : '') + (research ? '\n[+ current research notes]' : ''),
    })
    if (redacted > 0) store.recordPiiAlert(req.workUser.id, { sessionId: req.params.id, call: 'plan', counts: scrubCounts, total: redacted })
    // Cross-session KB: inject what we learned before on these tools (company KB
    // for company users, platform KB for solo users), so the plan starts smarter
    // than the model's training cutoff. Retrieval is scoped + de-identified.
    // Route KB learnings and skills through the SAME scrub chokepoint as the goal
    // and docs before they enter the prompt. They are scrubbed on write too, so
    // this is defense in depth (and honors an armed policy's block words that may
    // post-date the stored record).
    const kbNotes = scrubText(store.getLearningsFor(req.workUser.id, { goal: planGoal, app: s.appContext || '' }).map((l) => `- ${l.app ? l.app + ': ' : ''}${l.fact}`).join('\n')).clean
    const skillNotes = scrubText(store.getSkillsFor(req.workUser.id, { goal: planGoal, app: s.appContext || '' }).map((sk) => `- ${sk.title}${sk.tags ? ' [' + sk.tags + ']' : ''}: ${sk.content}`).join('\n\n')).clean
    // Company Brain: the PRIMARY company grounding. It ADDS to skills/learnings
    // (never replaces them), so an empty brain never degrades the plan. A brain
    // that has sources but matched nothing surfaces a STATED fallback - never
    // silent, never a fabricated source. Solo users have no brain (skipped).
    let brainNotes = ''
    if (req.workUser.companyId) {
      try {
        const brain = await retrieveForGoal({ companyId: req.workUser.companyId, goal: planGoal, app: s.appContext || '', topK: 6 })
        if (brain && brain.grounded && brain.hits && brain.hits.length) {
          brainNotes = scrubText("YOUR COMPANY'S OWN KNOWLEDGE (grounded in your company's documents; cite the named source; prefer it over generic guidance, but flag anything wrong or outdated):\n" + brain.hits.map((h) => `- (per ${h.sourceTitle}) ${h.text}`).join('\n\n')).clean
        } else if (brain && !brain.grounded) {
          const st = await brainStore.stats(req.workUser.companyId).catch(() => null)
          if (st && st.sources > 0) store.appendWorkEvent(req.workUser.id, req.params.id, { kind: 'ai', text: 'No company document covered this, so I planned from general knowledge. Add it to your Company Brain to ground future plans.' })
        }
      } catch (e) {
        if (e && e.code === 'BRAIN_LOCKED') {
          store.appendWorkEvent(req.workUser.id, req.params.id, { kind: 'flag', text: 'Your Company Brain is locked. Unlock it to ground this plan in your company knowledge; for now I planned from general knowledge.' })
        } else { console.warn(`[work] brain retrieval error: ${e.message}`) }
      }
    }
    const planTele = {}
    const plan = await work.workPlan(ai, call.rt, {
      tele: planTele,
      base: store.getSystemPrompt(), mode: useMode, goal: planGoal, frame: frame || null, visionModel: call.visionModel, appContext: s.appContext || '', research: (brainNotes ? brainNotes + '\n\n' : '') + groundedResearch, learnings: kbNotes, skills: skillNotes, strong: call.backup, locale: readLocale(req),
      // Plan-heavy when the user is in watch-light (superadmin-forced for premium):
      // each step must be fully self-contained and self-verifiable, since they
      // follow it with only light, on-demand checks instead of continuous watching.
      thorough: store.effectiveWatchMode(req.workUser.id) === 'light',
    })
    meterCost(req.params.id, planTele.model || call.visionModel || (call.rt && call.rt.chatModel), planGoal + groundedResearch, JSON.stringify(plan.steps || []), frame ? 1 : 0, { kind: 'plan', tele: planTele })
    if (plan.refusal) {
      store.appendWorkEvent(req.workUser.id, req.params.id, { kind: 'flag', text: 'Declined: ' + plan.refusal })
      const cur = store.getWorkSession(req.workUser.id, req.params.id)
      return res.json({ session: cur, steps: cur.steps, refusal: plan.refusal })
    }
    // Honest "Planned by <model>" surface. If the top model had to hand off to a
    // backup (weak result or unavailable), say so and do NOT claim the top model
    // (SUPREME RULE III) - the bold "top-ranked" line only stands when it held.
    const fellBack = !!(plan.escalated || plan.reason === 'strong_failed')
    plannedBy.fellBack = fellBack
    if (fellBack) store.appendWorkEvent(req.workUser.id, req.params.id, { kind: 'ai', text: 'The top model needed a hand, so a backup model finished the plan to keep you moving.' })
    // Model-agnostic to the user: we surface the QUALITY (top-ranked / best on your
    // key), never the model name. The actual model stays in the server audit +
    // superadmin incidents only (owner rule: never expose the model to users).
    else store.appendWorkEvent(req.workUser.id, req.params.id, { kind: 'ai', text: plannedBy.topRanked
      ? `Planned by a top-ranked model (per ${plannedBy.source}).`
      : 'Planned by the best model available on your key.' })
    if (keepProgress && doneSteps.length) store.replanKeepingProgress(req.workUser.id, req.params.id, plan.steps)
    else store.setWorkSessionSteps(req.workUser.id, req.params.id, plan.steps)
    // Count the re-plan against this task's budget (only after it actually
    // produced a plan, so a refusal/failure never burns a re-plan).
    if (isReplan && !fromClarify) store.bumpWorkReplan(req.workUser.id, req.params.id)
    if (plan.appContext) store.setWorkAppContext(req.workUser.id, req.params.id, plan.appContext)
    // Capture a generalized, de-identified learning the model flagged (a current
    // tool fact newer than its memory) into the cross-session KB for next time.
    if (plan.learning) store.addLearning(req.workUser.id, { app: plan.appContext || s.appContext || '', fact: plan.learning, kind: 'fresh' })
    const updated = store.getWorkSession(req.workUser.id, req.params.id)
    // MANDATORY security gate over every command + code block the plan hands over.
    const planCode = (updated.steps || []).map((s) => [...(Array.isArray(s.commands) ? s.commands : []), (s.code && s.code.content) || ''].join('\n')).join('\n')
    const security = await runSecurityGate(req.workUser.id, req.params.id, planCode)
    // Company-policy gate runs over the WHOLE plan (prose + commands + code), since
    // a forbidden/required practice can live in the step text, not only in code.
    const planText = (updated.steps || []).map((s) => [s.text || '', s.validate || '', ...(Array.isArray(s.commands) ? s.commands : []), (s.code && s.code.content) || ''].join('\n')).join('\n')
    const policy = await runPolicyGate(req.workUser.id, req.params.id, planText)
    // User-facing plannedBy carries QUALITY signals only, never the model/provider
    // name (owner rule: never expose the model to users). Full model identity lives
    // in the server audit + superadmin incidents.
    const plannedByPublic = { topRanked: !!plannedBy.topRanked, tier: plannedBy.tier || null, source: plannedBy.source || null, updated: plannedBy.updated || null, vision: !!plannedBy.vision, fellBack: !!plannedBy.fellBack }
    res.json({ session: store.getWorkSession(req.workUser.id, req.params.id), steps: updated.steps, appContext: updated.appContext, plannedBy: plannedByPublic, security, policy, clarify: plan.clarify || null, replan: store.getWorkReplanUsage(req.workUser.id, req.params.id), ...(gPlan && gPlan.guard ? { guard: gPlan.guard } : {}) })
  } catch (e) { sendWorkError(res, e, req) }
})

// Clarify: the user answers a question the guide asked mid-task (option chip or
// free text). We fold the answer into the session scope so the NEXT plan sees it
// the same way it sees the scope-wizard answers, and record it on the timeline.
// The client then triggers a re-plan with { fromClarify: true } so the refinement
// does NOT burn the per-task re-plan budget (we asked for this input, the user did
// not request a fresh re-plan). Honest, scoped, no new sensitive capture.
app.post('/api/work/sessions/:id/clarify', requireWorkAuth, requireWorkSubscription, wrap((req, res) => {
  const s = store.getWorkSession(req.workUser.id, req.params.id)
  if (!s) return res.status(404).json({ error: 'Session not found' })
  const question = String((req.body && req.body.question) || '').trim().slice(0, 240)
  const answer = String((req.body && req.body.answer) || '').trim().slice(0, 600)
  const q = question || 'Clarification'
  // SKIP: the user is unsure. We do NOT block the task - we record the skip
  // honestly and fold a note so the next plan proceeds on its best assumption
  // AND confirms before anything irreversible, instead of re-asking every time.
  // (Chips are only a shortlist the guide inferred; a typed "Other" answer takes
  // the free-text path below, same as any answer.)
  const skipped = !!(req.body && req.body.skipped)
  if (skipped) {
    store.appendWorkScopeAnswer(req.workUser.id, req.params.id, q, '(user was unsure and skipped; proceed with your best assumption, and confirm with the user before any irreversible step)')
    store.appendWorkEvent(req.workUser.id, req.params.id, { kind: 'ai', text: 'You skipped that question. I will proceed on my best assumption and check with you before anything that cannot be undone.' })
    return res.json({ ok: true, skipped: true, session: store.getWorkSession(req.workUser.id, req.params.id) })
  }
  if (!answer) return res.status(400).json({ error: 'Add your answer first, or skip.' })
  store.appendWorkScopeAnswer(req.workUser.id, req.params.id, q, answer)
  store.appendWorkEvent(req.workUser.id, req.params.id, { kind: 'ai', text: `You answered: ${answer}. I will fold that into the next steps.` })
  res.json({ ok: true, session: store.getWorkSession(req.workUser.id, req.params.id) })
}))

// Back / change answer: the user picked the wrong chip or skipped by accident.
// Revert the last answer to THIS question so the guide can ask it again. The
// client then re-opens the clarify card; re-answering folds the correct answer and
// re-plans for free (fromClarify). Costs the user nothing to fix a mis-tap.
app.post('/api/work/sessions/:id/clarify/undo', requireWorkAuth, requireWorkSubscription, wrap((req, res) => {
  const s = store.getWorkSession(req.workUser.id, req.params.id)
  if (!s) return res.status(404).json({ error: 'Session not found' })
  const question = String((req.body && req.body.question) || '').trim().slice(0, 240)
  const removed = store.removeLastWorkScopeAnswer(req.workUser.id, req.params.id, question)
  if (removed) store.appendWorkEvent(req.workUser.id, req.params.id, { kind: 'ai', text: 'Reverted your last answer. Choose again when you are ready.' })
  res.json({ ok: true, undone: !!removed, session: store.getWorkSession(req.workUser.id, req.params.id) })
}))

// Scope: the requirement wizard that runs BEFORE planning. Text-only call on the
// platform model; returns a short, goal-specific question set. The answers are
// sent back on /plan (scope) and folded into the checklist.
app.post('/api/work/scope', requireWorkAuth, requireWorkSubscription, async (req, res) => {
  try {
    const goal = String((req.body || {}).goal || '').trim()
    if (!goal) return res.status(400).json({ error: 'Say what you want to get done first.' })
    const r = await resolveWorkRuntime(req, res, { needVision: false }); if (!r) return
    const call = workCallRuntime(r, false)
    const scrubOn = store.workUserScrubOn(req.workUser.id)
    const safeGoal = scrubOn ? scrubSensitive(goal).clean : goal
    const tier = (store.getWorkUsage(req.workUser.id) || {}).tier || 'basic'
    // The person can pick a short (quick) or thorough (detailed) interview up front.
    const depth = ['quick', 'detailed'].includes((req.body || {}).depth) ? req.body.depth : 'standard'
    const out = await work.workScope(ai, call.rt, { goal: safeGoal, tier, depth, locale: readLocale(req) })
    res.json(out)
  } catch (e) { sendWorkError(res, e, req) }
})

// Deliverables: for a review/design task, analyze the captured page(s) + the
// goal + the scope and return the findings and the two generation prompts, plus
// the assembled Markdown document. Vision when frames are supplied; platform model.
app.post('/api/work/sessions/:id/deliverables', requireWorkAuth, requireWorkSubscription, async (req, res) => {
  try {
    const s = store.getWorkSession(req.workUser.id, req.params.id)
    if (!s) return res.status(404).json({ error: 'Session not found' })
    watchExtraction(req, 'deliverables')
    const frames = Array.isArray(req.body && req.body.frames)
      ? req.body.frames.filter((f) => typeof f === 'string' && f.startsWith('data:')).slice(0, 8) : []
    const goal = s.goal || ''
    if (!String(goal).trim()) return res.status(400).json({ error: 'This session has no goal yet.' })
    const r = await resolveWorkRuntime(req, res, { needVision: frames.length > 0 }); if (!r) return
    const call = workCallRuntime(r, false)
    const scrubOn = store.workUserScrubOn(req.workUser.id)
    const safeGoal = scrubOn ? scrubSensitive(goal).clean : goal
    const scope = Array.isArray(s.scope) ? s.scope : []
    store.appendWorkAudit(req.params.id, {
      call: 'deliverables', model: call.visionModel || (call.rt && call.rt.chatModel) || null, scrub: scrubOn,
      frame: frames.length ? (frames.length + ' screenshot(s) sent') : null, sent: safeGoal,
    })
    const d = await work.workDeliverables(ai, call.rt, { goal: safeGoal, scope, frames, visionModel: call.visionModel })
    meterCost(req.params.id, call.visionModel || (call.rt && call.rt.chatModel), safeGoal, JSON.stringify(d), frames.length, { kind: 'deliverables' })
    // Policy: WorkCoPilot does NOT generate the finished document. We return the
    // REVIEW and the ready-to-use GENERATION PROMPTS (to run in the user's own AI)
    // only - never an AI-written document.
    store.setWorkDeliverables(req.workUser.id, req.params.id, d)
    store.appendWorkEvent(req.workUser.id, req.params.id, { kind: 'ai', text: 'Built the review and the prompts to generate it in your own AI.' })
    res.json({ deliverables: d })
  } catch (e) { sendWorkError(res, e, req) }
})

// The review deliverables as a PDF (built from what the last review stored).
app.get('/api/work/sessions/:id/deliverables.pdf', requireWorkAuth, (req, res) => {
  const s = store.getWorkSession(req.workUser.id, req.params.id)
  if (!s || !s.deliverables) return res.status(404).json({ error: 'No review has been built for this session yet.' })
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `${req.query.dl ? 'attachment' : 'inline'}; filename="workcopilot-review.pdf"`)
  buildDeliverablesPdf(s.deliverables, s.goal || '', res)
})

// ---- Governance policy (DLP) ----------------------------------------------
// Superadmin/admin manage any scope; a company admin manages their own company;
// a user manages their own policy. The wizard seeds category defaults from the
// framework presets. getEffectiveWorkPolicy enforces the armed policy on sends.
function canManagePolicy(req, scope) {
  const role = req.user && req.user.role
  if (role === 'superadmin' || role === 'admin') return true
  // A company ADMIN manages their own company's policy (applies to all members).
  if (scope && scope.companyId && req.workUser && req.workUser.companyRole === 'company_admin' && String(req.workUser.companyId) === String(scope.companyId)) return true
  // An INDIVIDUAL user (not in any company) manages their own policy. A company
  // MEMBER cannot - their company admin governs them, so this is denied for them.
  if (scope && scope.userId && req.workUser && String(req.workUser.id) === String(scope.userId) && !req.workUser.companyId) return true
  return false
}
app.get('/api/work/policy', requireWorkAuth, wrap((req, res) => {
  const scope = req.query.companyId ? { companyId: req.query.companyId } : (req.query.userId ? { userId: req.query.userId } : { userId: req.workUser.id })
  if (!canManagePolicy(req, scope)) return res.status(403).json({ error: 'You cannot manage this policy.' })
  res.json({ policy: store.getWorkPolicy(scope), presets: COMPLIANCE_PRESETS, labels: COMPLIANCE_LABELS, categories: POLICY_CATEGORIES })
}))
app.post('/api/work/policy', requireWorkAuth, wrap((req, res) => {
  const b = req.body || {}
  const scope = b.companyId ? { companyId: b.companyId } : (b.userId ? { userId: b.userId } : { userId: req.workUser.id })
  if (!canManagePolicy(req, scope)) return res.status(403).json({ error: 'You cannot manage this policy.' })
  res.json({ policy: store.setWorkPolicy(scope, b, (req.workUser && req.workUser.username) || null) })
}))

// Ingest a written security policy document and EXTRACT enforceable guidance rules
// (forbid/require) for review. The admin reviews/edits the draft, then saves it via
// POST /api/work/policy (guidanceRules + policyDocs). AI-assisted with a
// deterministic fallback, so it NEVER comes back empty when there are real rules in
// the text (SUPREME RULE III). The policy document text is used only to extract
// rules; it is not stored (only the resulting rules + a provenance stub are).
app.post('/api/work/policy/rules/extract', requireWorkAuth, async (req, res) => {
  try {
    const b = req.body || {}
    const scope = b.companyId ? { companyId: b.companyId } : (b.userId ? { userId: b.userId } : { userId: req.workUser.id })
    if (!canManagePolicy(req, scope)) return res.status(403).json({ error: 'You cannot manage this policy.' })
    const text = String(b.text || '').slice(0, 200000)
    const docName = String(b.docName || '').trim().slice(0, 160)
    if (text.replace(/\s+/g, '').length < 40) return res.status(400).json({ error: 'Paste or upload the security policy text first (at least a short paragraph).' })
    // Soft runtime: use the company/platform/user key if one is ready; otherwise fall
    // back to the deterministic extractor rather than erroring (RULE VIII graceful).
    let rt = null
    try {
      const companyRt = store.getCompanyRuntime(req.workUser.id)
      const platform = store.getWorkPlatformAllowed()
      const base = companyRt || (platform ? store.getActiveRuntime() : store.getWorkUserRuntime(req.workUser.id))
      if (base && base.apiKey) rt = withFailover(req, base)
    } catch { rt = null }
    const result = rt
      ? await extractRulesAI(ai, rt, text, docName)
      : { rules: extractRulesHeuristic(text, docName), source: 'heuristic', note: 'No AI key is configured, so rules were derived deterministically from the policy text. Review them before arming.' }
    res.json({ ...result, summary: ruleSummary(result.rules), docName })
  } catch (e) { sendWorkError(res, e, req) }
})

// Company-level screenshot-capture policy. When OFF, WorkCoPilot keeps NO
// milestone screenshot in any of this company's users' reports or session logs;
// when ON (the default), the existing per-step evidence capture applies. Gated to
// company admins (requireCompanyAdmin - same gate as every other company write
// route) and scoped to the admin's OWN company: the companyId comes from the
// authenticated workUser, never the body, so an admin can only change their own
// company. The store records who/when/what and returns the effective value.
app.post('/api/work/company/report-shots', requireWorkAuth, requireCompanyAdmin, wrap((req, res) => {
  if (!req.workUser.companyId) return res.status(403).json({ error: 'No company in scope.' })
  const enabled = !!(req.body || {}).enabled
  const out = store.setCompanyReportShots(req.workUser.companyId, enabled, (req.workUser && req.workUser.username) || null)
  res.json(out)
}))

// Company admin oversight: list every session of the admin's company members
// (completed AND in progress), so they can pull the report + audit log for any.
app.get('/api/work/company/sessions', requireWorkAuth, wrap((req, res) => {
  const u = req.workUser
  if (!u || u.companyRole !== 'company_admin' || !u.companyId) return res.status(403).json({ error: 'Company admins only.' })
  res.json({ sessions: store.listWorkSessionsForCompany(u.companyId) })
}))

// Watch: the continuous navigator. Reads the WHOLE screen against the WHOLE
// checklist every changed frame, relocates the user, advances the plan, and
// returns a fresh screen-specific instruction for the step they are actually on.
app.post('/api/work/sessions/:id/watch', requireWorkAuth, requireWorkSubscription, async (req, res) => {
  try {
    const s = store.getWorkSession(req.workUser.id, req.params.id)
    if (!s) return res.status(404).json({ error: 'Session not found' })
    const { frame } = req.body || {}
    if (!frame) return res.status(400).json({ error: 'No screen frame supplied.' })
    if (!Array.isArray(s.steps) || s.steps.length === 0) {
      return res.json({ status: 'working', observation: '', flag: '', guidance: '', index: 0, step: null, done: false, steps: [] })
    }
    const rr = await resolveWorkRuntime(req, res, { needVision: true }); if (!rr) return
    const call = workCallRuntime(rr, !!(req.body && req.body.deep))
    const watchScrubOn = store.workUserScrubOn(req.workUser.id)
    const watchGoal = scrubForAi(s, watchScrubOn, req.workUser.id).goal
    const r = await work.workNavigate(ai, call.rt, {
      base: store.getSystemPrompt(), mode: work.normalizeMode(s.mode), goal: watchGoal, steps: s.steps, currentStep: s.currentStep,
      frame, visionModel: call.visionModel, strong: call.backup,
    })
    const escalated = r.escalated || call.forcedStrong
    const usedModel = call.forcedStrong ? call.visionModel : (r.escalated ? call.strongModel : rr.visionModel)
    meterCost(req.params.id, usedModel || call.visionModel, watchGoal + JSON.stringify(s.steps || []), (r.guidance || '') + (r.observation || ''), 1, { kind: 'guide', tele: { roundRobin: !!escalated, model: usedModel } })
    // Audit (logged AFTER the response so it carries the real substance): what
    // actually left the device (the frame + the goal/plan, which is shown once in
    // the header, NOT repeated on every line), plus - for genuine transparency -
    // what the assistant READ from this screen and the guidance it related back.
    store.appendWorkAudit(req.params.id, {
      call: 'watch', model: usedModel || call.visionModel || rr.visionModel || null, scrub: watchScrubOn,
      frame: 'screenshot sent',
      sent: watchScrubOn
        ? 'Screen frame (sensitive on-screen text redacted on the device before sending) + the goal and current plan (goal in the header, not repeated here).'
        : 'Screen frame + the goal and current plan (goal in the header, not repeated here).',
      observed: r.observation || '',
      flag: r.flag || '',
    })
    // Snapshot which steps were already done, so we can tell which ones become
    // confirmed on THIS frame and keep that exact frame as their evidence.
    const prevDone = new Set((s.steps || []).map((x, i) => (x.status === 'done' ? i : -1)).filter((i) => i >= 0))
    const updated = store.applyWorkNav(req.workUser.id, req.params.id, {
      completed: r.completed, curIdx: (r.current != null ? r.current : null), guidance: r.guidance,
    })
    // Reference-document evidence: when a step is newly confirmed on screen, keep
    // the current (already on-device-scrubbed) frame as that step's screenshot.
    // One per step, best-effort, never blocks guidance.
    try {
      if (frame) {
        // First-instruction evidence (owner): keep the VERY FIRST scrubbed frame
        // as the current step's shot, so every guided task has an early screenshot
        // even before any step is confirmed. captureMilestoneShot is one-per-step,
        // so this never duplicates the on-confirm shot for the same step.
        if (!(Array.isArray(s.shots) && s.shots.length)) store.captureMilestoneShot(req.workUser.id, req.params.id, updated.currentStep || 0, frame)
        // Then the normal logic: one shot per step as it is confirmed on screen.
        const newly = (updated.steps || []).map((x, i) => (x.status === 'done' && !prevDone.has(i) ? i : -1)).filter((i) => i >= 0)
        if (newly.length) store.captureMilestoneShot(req.workUser.id, req.params.id, Math.max.apply(null, newly), frame)
      }
    } catch { /* evidence capture is best-effort */ }
    if (r.flag) store.appendWorkEvent(req.workUser.id, req.params.id, { kind: 'flag', text: r.flag })
    if (escalated) store.appendWorkEvent(req.workUser.id, req.params.id, { kind: 'ai', text: `Used a stronger model${call.forcedStrong ? ' - deep pass' : ' to resolve this step'}.` })
    else if (r.reason === 'strong_failed') store.appendWorkEvent(req.workUser.id, req.params.id, { kind: 'ai', text: 'A stronger model was tried but was unavailable, so the quick model result was kept for this step.' })
    const allDone = r.done || updated.currentStep >= updated.steps.length
    res.json({
      status: r.flag ? 'wrong' : (allDone ? 'done' : 'working'),
      observation: r.observation, flag: r.flag, guidance: r.guidance,
      index: updated.currentStep,
      step: updated.steps[updated.currentStep] ? { ...updated.steps[updated.currentStep], source: updated.steps[updated.currentStep].source || '' } : null,
      done: allDone, steps: (updated.steps || []).map((x) => ({ ...x, source: x.source || '' })), escalated,
    })
  } catch (e) { sendWorkError(res, e, req) }
})

// Ask: on-demand "what is this / what do I do here", grounded in the goal + frame.
app.post('/api/work/sessions/:id/ask', requireWorkAuth, requireWorkSubscription, async (req, res) => {
  try {
    const s = store.getWorkSession(req.workUser.id, req.params.id)
    if (!s) return res.status(404).json({ error: 'Session not found' })
    watchExtraction(req, 'ask')
    const { question, frame } = req.body || {}
    if (!frame) return res.status(400).json({ error: 'No screen frame supplied.' })
    const gAsk = guardUserText(req, res, question, 'question', req.params.id); if (gAsk === 'refused') return
    if (gAsk && gAsk.guard) store.appendWorkEvent(req.workUser.id, req.params.id, { kind: 'ai', text: gAsk.guard.warning })
    const rr = await resolveWorkRuntime(req, res, { needVision: true }); if (!rr) return
    const call = workCallRuntime(rr, !!(req.body && req.body.deep))
    const askScrubOn = store.workUserScrubOn(req.workUser.id)
    const sa = scrubForAi(s, askScrubOn, req.workUser.id)
    const qScrub = askScrubOn ? scrubSensitive(question || '') : { clean: question || '', counts: {}, total: 0 }
    store.appendWorkAudit(req.params.id, { call: 'ask', model: call.visionModel || rr.visionModel || null, scrub: askScrubOn, redacted: qScrub.total, frame: 'screenshot sent', sent: qScrub.clean || '[question about the current screen]' })
    if (qScrub.total) store.recordPiiAlert(req.workUser.id, { sessionId: req.params.id, call: 'ask', counts: qScrub.counts, total: qScrub.total })
    const out = await work.workAsk(ai, call.rt, {
      base: store.getSystemPrompt(), mode: work.normalizeMode(s.mode), goal: sa.goal,
      question: qScrub.clean, steps: s.steps || [], currentStep: s.currentStep || 0,
      events: sa.events, appContext: s.appContext || '', frame, visionModel: call.visionModel, strong: call.backup, locale: readLocale(req),
    })
    if (qScrub.total) store.appendWorkEvent(req.workUser.id, req.params.id, { kind: 'ai', text: redactionSummary(qScrub.counts) })
    const escalated = out.escalated || call.forcedStrong
    const usedModel = call.forcedStrong ? call.visionModel : (out.escalated ? call.strongModel : rr.visionModel)
    meterCost(req.params.id, usedModel || call.visionModel, qScrub.clean + (sa.goal || ''), (out && out.answer) || '', frame ? 1 : 0, { kind: 'ask' })
    if (question) store.appendWorkEvent(req.workUser.id, req.params.id, { kind: 'ask', text: String(question) })
    store.appendWorkEvent(req.workUser.id, req.params.id, { kind: 'answer', text: out.answer })
    if (escalated) store.appendWorkEvent(req.workUser.id, req.params.id, { kind: 'ai', text: `Answered with a stronger model${call.forcedStrong ? ' - deep pass' : ''}.` })
    else if (out.reason === 'strong_failed') store.appendWorkEvent(req.workUser.id, req.params.id, { kind: 'ai', text: 'A stronger model was tried but was unavailable, so the quick model result was kept for this answer.' })
    res.json({ answer: out.answer, escalated, ...(gAsk && gAsk.guard ? { guard: gAsk.guard } : {}) })
  } catch (e) { sendWorkError(res, e, req) }
})

// Result: RETURN the actual answer/output (a number, table, draft, query or
// analysis), not just the steps. frame is OPTIONAL - with a screenshot it reads
// the screen, without one it computes from the goal + any pasted data. Read-only:
// the result is handed back for the user to use. The engine enforces honesty (a
// result must carry its basis + a way to verify, or it returns what it needs).
app.post('/api/work/sessions/:id/result', requireWorkAuth, requireWorkSubscription, async (req, res) => {
  try {
    const s = store.getWorkSession(req.workUser.id, req.params.id)
    if (!s) return res.status(404).json({ error: 'Session not found' })
    watchExtraction(req, 'result')
    const { question, frame, docsText, deep } = req.body || {}
    const hasFrame = typeof frame === 'string' && frame.startsWith('data:')
    const rr = await resolveWorkRuntime(req, res, { needVision: hasFrame }); if (!rr) return
    const call = workCallRuntime(rr, !!deep)
    // Same policy-aware scrub as planning/context: an armed policy wins, else the
    // legacy on/off. Goal + the specific ask + any pasted data are all scrubbed.
    const scrubOn = store.workUserScrubOn(req.workUser.id)
    const pol = store.getEffectiveWorkPolicy(req.workUser.id)
    const scrubText = (t) => pol ? scrubWithPolicy(String(t || ''), pol) : (scrubOn ? scrubSensitive(String(t || '')) : { clean: String(t || ''), counts: {}, total: 0 })
    const sa = scrubForAi(s, scrubOn, req.workUser.id)
    const qScrub = scrubText(String(question || '').slice(0, 2000))
    const docScrub = scrubText(String(docsText || '').slice(0, 8000))
    const redacted = qScrub.total + docScrub.total
    store.appendWorkAudit(req.params.id, { call: 'result', model: (hasFrame ? call.visionModel : (call.rt && call.rt.chatModel)) || null, scrub: scrubOn || !!pol, redacted, frame: hasFrame ? 'screenshot sent' : 'no frame', sent: qScrub.clean || '[produce the result for the goal]' })
    if (redacted) {
      const _c = {}
      for (const c of [qScrub.counts, docScrub.counts]) for (const [k, n] of Object.entries(c || {})) _c[k] = (_c[k] || 0) + Number(n || 0)
      store.recordPiiAlert(req.workUser.id, { sessionId: req.params.id, call: 'result', counts: _c, total: redacted })
    }
    const out = await work.workResult(ai, call.rt, {
      base: store.getSystemPrompt(), mode: work.normalizeMode(s.mode), goal: sa.goal,
      question: qScrub.clean, steps: s.steps || [], currentStep: s.currentStep || 0, events: sa.events,
      appContext: s.appContext || '', docsText: docScrub.clean,
      frame: hasFrame ? frame : null, visionModel: hasFrame ? call.visionModel : null, strong: hasFrame ? call.backup : null, locale: readLocale(req),
    })
    if (redacted) store.appendWorkEvent(req.workUser.id, req.params.id, { kind: 'ai', text: redactionSummary({ ...qScrub.counts, ...docScrub.counts }) })
    const escalated = out.escalated || call.forcedStrong
    const usedModel = (hasFrame ? (call.forcedStrong ? call.visionModel : (out.escalated ? call.strongModel : rr.visionModel)) : (call.rt && call.rt.chatModel))
    meterCost(req.params.id, usedModel, qScrub.clean + docScrub.clean + (sa.goal || ''), (out.body || '') + (out.basis || ''), 0, { kind: 'result' })
    if (question) store.appendWorkEvent(req.workUser.id, req.params.id, { kind: 'ask', text: String(question) })
    // A concise, user-facing record for the session feed + report (full result in the response).
    store.appendWorkEvent(req.workUser.id, req.params.id, { kind: 'result', text: `${out.kind}: ${String(out.need || out.body || '').replace(/\s+/g, ' ').trim().slice(0, 200)}` })
    // Security gate on CODE-related results only (a command/query/script we hand back).
    const security = out.kind === 'code' ? await runSecurityGate(req.workUser.id, req.params.id, out.body || '') : null
    // Company-policy gate on the full result (every kind, not only code).
    const policy = await runPolicyGate(req.workUser.id, req.params.id, [out.body, out.basis, out.need].filter(Boolean).join('\n'))
    res.json({ result: out, escalated, security, policy })
  } catch (e) { sendWorkError(res, e, req) }
})

// Compute over the user's DATA, privacy-first: the client parses the CSV/XLSX on
// device and sends ONLY the schema (column names + types + row count) - never the
// rows. This returns a validated, safe computation SPEC (compute_spec.js DSL) that
// the client runs locally against the full data. The raw data never reaches us.
app.post('/api/work/sessions/:id/compute', requireWorkAuth, requireWorkSubscription, async (req, res) => {
  try {
    const s = store.getWorkSession(req.workUser.id, req.params.id)
    if (!s) return res.status(404).json({ error: 'Session not found' })
    const { want, schema, rowCount } = req.body || {}
    if (!Array.isArray(schema) || !schema.length) return res.status(400).json({ error: 'No table schema was provided. Attach a CSV or spreadsheet first.' })
    const rr = await resolveWorkRuntime(req, res, {}); if (!rr) return     // text-only; no frame
    const call = workCallRuntime(rr, false)
    const scrubOn = store.workUserScrubOn(req.workUser.id)
    const pol = store.getEffectiveWorkPolicy(req.workUser.id)
    const scrubText = (t) => pol ? scrubWithPolicy(String(t || ''), pol) : (scrubOn ? scrubSensitive(String(t || '')) : { clean: String(t || ''), counts: {}, total: 0 })
    const sa = scrubForAi(s, scrubOn, req.workUser.id)
    const wantScrub = scrubText(String(want || '').slice(0, 2000))
    // Column names + types only (never a value), capped, so nothing but the shape leaves the device.
    const cleanSchema = schema.slice(0, 60).map((c) => ({ name: String((c && c.name) || '').slice(0, 80), type: String((c && c.type) || '').slice(0, 24) })).filter((c) => c.name)
    store.appendWorkAudit(req.params.id, { call: 'compute', model: (call.rt && call.rt.chatModel) || null, scrub: scrubOn || !!pol, redacted: wantScrub.total, frame: 'schema only (no rows)', sent: `[compute over ${cleanSchema.length} cols] ${wantScrub.clean}`.slice(0, 200) })
    const out = await work.workCompute(ai, call.rt, { base: store.getSystemPrompt(), mode: work.normalizeMode(s.mode), goal: sa.goal, want: wantScrub.clean, schema: cleanSchema, rowCount: Number(rowCount) || 0 })
    if (wantScrub.total) store.appendWorkEvent(req.workUser.id, req.params.id, { kind: 'ai', text: redactionSummary(wantScrub.counts) })
    meterCost(req.params.id, (call.rt && call.rt.chatModel), wantScrub.clean + JSON.stringify(cleanSchema), JSON.stringify(out.spec || {}), 0, { kind: 'compute' })
    store.appendWorkEvent(req.workUser.id, req.params.id, { kind: 'compute', text: (out.ok ? `Computation plan ready (${(out.spec.steps || []).length} steps), run on your device.` : `Could not plan: ${out.need || ''}`).slice(0, 160) })
    res.json({ ...out })
  } catch (e) { sendWorkError(res, e, req) }
})

// Add context mid-task: the user hands over a note, a document's text, and/or an
// uploaded image (screenshot or photo) partway through a guided session. The
// engine reads it, and AUTO-REPLANS only if the remaining work needs to change -
// preserving the already-done steps and resuming at the next step (operator chose
// auto). If no replan is needed it just answers and points at the next action.
// Images are already on-device-redacted by the client (frame_scrub) when DLP is
// on; text here is scrubbed server-side with the same policy as planning.
app.post('/api/work/sessions/:id/context', requireWorkAuth, requireWorkSubscription, async (req, res) => {
  try {
    const s = store.getWorkSession(req.workUser.id, req.params.id)
    if (!s) return res.status(404).json({ error: 'Session not found' })
    watchExtraction(req, 'context')
    const { note, docsText, image, frame } = req.body || {}
    const hasText = !!(String(note || '').trim() || String(docsText || '').trim())
    const images = [image, frame].filter((x) => typeof x === 'string' && x.startsWith('data:'))
    if (!hasText && !images.length) return res.status(400).json({ error: 'Add a note, a document, or an image first.' })
    const gCtx = guardUserText(req, res, note, 'context', req.params.id); if (gCtx === 'refused') return
    if (gCtx && gCtx.guard) store.appendWorkEvent(req.workUser.id, req.params.id, { kind: 'ai', text: gCtx.guard.warning })

    // Same scrub/governance path as planning (policy wins over legacy on/off).
    const scrubOn = store.workUserScrubOn(req.workUser.id)
    const pol = store.getEffectiveWorkPolicy(req.workUser.id)
    const scrubText = (t) => pol ? scrubWithPolicy(String(t || ''), pol) : (scrubOn ? scrubSensitive(String(t || '')) : { clean: String(t || ''), counts: {}, total: 0 })
    const noteScrub = scrubText(String(note || '').slice(0, 4000))
    const docScrub = scrubText(String(docsText || '').slice(0, 8000))

    const needVision = images.length > 0
    const rr = await resolveWorkRuntime(req, res, { needVision }); if (!rr) return
    const call = workCallRuntime(rr, !!(req.body && req.body.deep))
    const safeGoal = scrubText(s.goal || '').clean
    const scrubbedEvents = scrubForAi(s, scrubOn, req.workUser.id).events

    // Best-effort fresh web notes (no-op unless WORK_TAVILY_KEY is set); bounded.
    const research = await Promise.race([
      workResearchNotes(`${noteScrub.clean} ${safeGoal}`, resolveWebSearchKey(req)),
      new Promise((resolve) => setTimeout(() => resolve(''), 12000)),
    ]).catch(() => '')

    const redacted = noteScrub.total + docScrub.total
    store.appendWorkAudit(req.params.id, {
      call: 'context', model: call.visionModel || (call.rt && call.rt.chatModel) || null, scrub: scrubOn, redacted,
      frame: images.length ? `${images.length} image(s) sent` : null,
      sent: `[added context] ${noteScrub.clean ? 'note: ' + noteScrub.clean.slice(0, 200) : ''}${docScrub.clean ? ' [+ document text]' : ''}`.trim(),
    })
    if (redacted > 0) store.appendWorkEvent(req.workUser.id, req.params.id, { kind: 'ai', text: redactionSummary({ ...noteScrub.counts, ...docScrub.counts }) })

    const out = await work.workAddContext(ai, call.rt, {
      base: store.getSystemPrompt(), mode: work.normalizeMode(s.mode), goal: safeGoal,
      steps: s.steps || [], currentStep: s.currentStep || 0, events: scrubbedEvents, appContext: s.appContext || '',
      note: noteScrub.clean, docsText: docScrub.clean, research, images,
      visionModel: call.visionModel, strong: call.backup,
    })
    const escalated = out.escalated || call.forcedStrong
    const usedModel = call.forcedStrong ? call.visionModel : (out.escalated ? call.strongModel : (needVision ? rr.visionModel : (call.rt && call.rt.chatModel)))
    meterCost(req.params.id, usedModel || call.visionModel, safeGoal + noteScrub.clean + docScrub.clean, (out.answer || '') + JSON.stringify(out.steps || []), images.length, { kind: 'context' })

    // Record what the user added (short), so the session history shows the hand-off.
    const addedLabel = noteScrub.clean ? noteScrub.clean.slice(0, 160) : (docScrub.clean ? 'a document' : 'an image')
    store.appendWorkEvent(req.workUser.id, req.params.id, { kind: 'ask', text: `Added context: ${addedLabel}${images.length ? (noteScrub.clean || docScrub.clean ? ' (+ image)' : '') : ''}` })

    let replanned = false
    if (out.replan && Array.isArray(out.steps) && out.steps.length) {
      store.replanKeepingProgress(req.workUser.id, req.params.id, out.steps)
      replanned = true
      store.appendWorkEvent(req.workUser.id, req.params.id, { kind: 'ai', text: 'Updated the remaining steps from what you added, and kept everything you had already finished.' })
    }
    if (out.answer) store.appendWorkEvent(req.workUser.id, req.params.id, { kind: 'answer', text: out.answer })
    if (escalated) store.appendWorkEvent(req.workUser.id, req.params.id, { kind: 'ai', text: `Used a stronger model${call.forcedStrong ? ' - deep pass' : ''}.` })

    const cur = store.getWorkSession(req.workUser.id, req.params.id)
    res.json({
      replanned, reason: out.reason, answer: out.answer,
      index: cur.currentStep,
      step: (cur.steps || [])[cur.currentStep] ? { ...(cur.steps || [])[cur.currentStep], source: (cur.steps || [])[cur.currentStep].source || '' } : null,
      steps: (cur.steps || []).map((x) => ({ ...x, source: x.source || '' })), escalated,
      ...(gCtx && gCtx.guard ? { guard: gCtx.guard } : {}),
    })
  } catch (e) { sendWorkError(res, e, req) }
})

// Drill-down: expand ONE action ("how do I do this?") into a detailed sub-step
// checklist, grounded + scrubbed, stored under the step so it is part of the goal.
app.post('/api/work/sessions/:id/howto', requireWorkAuth, requireWorkSubscription, async (req, res) => {
  try {
    const s = store.getWorkSession(req.workUser.id, req.params.id)
    if (!s) return res.status(404).json({ error: 'Session not found' })
    watchExtraction(req, 'howto')
    const { action, stepIndex, frame } = req.body || {}
    const scrubOn = store.workUserScrubOn(req.workUser.id)
    const act = scrubIf(scrubOn, String(action || "").trim(), req.workUser.id)
    if (!act) return res.status(400).json({ error: 'No action to explain.' })
    const rr = await resolveWorkRuntime(req, res, { needVision: !!frame }); if (!rr) return
    const call = workCallRuntime(rr, !!(req.body && req.body.deep))
    const safeGoal = scrubIf(scrubOn, s.goal || "", req.workUser.id)
    const notes = await Promise.race([
      workResearchNotes(`${act} ${safeGoal}`, resolveWebSearchKey(req)),
      new Promise((resolve) => setTimeout(() => resolve(''), 12000)),
    ]).catch(() => '')
    const ephemeralDocs2 = typeof (req.body && req.body.docsText) === 'string' ? req.body.docsText.slice(0, 5000) : ''
    const userDocs = scrubIf(scrubOn, ephemeralDocs2 || store.getWorkDocsText(req.workUser.id, { maxChars: 4000 }), req.workUser.id)
    const grounded = userDocs
      ? (`USER REFERENCE DOCUMENTS (ground in these, but verify against best practice and flag anything wrong):\n${userDocs}\n\n` + (notes || ''))
      : notes
    const out = await work.workHowTo(ai, call.rt, {
      base: store.getSystemPrompt(), mode: work.normalizeMode(s.mode), goal: safeGoal, action: act,
      frame: frame || null, visionModel: call.visionModel, appContext: s.appContext || '', research: grounded, strong: call.backup, locale: readLocale(req),
    })
    if (out.refusal) {
      store.appendWorkEvent(req.workUser.id, req.params.id, { kind: 'flag', text: 'Declined: ' + out.refusal })
      return res.json({ refusal: out.refusal, steps: [] })
    }
    const idx = Number.isFinite(Number(stepIndex)) ? Number(stepIndex) : null
    let saved = out.steps
    if (idx != null) { try { saved = store.setWorkStepHowTo(req.workUser.id, req.params.id, idx, out.steps) } catch { /* step may be gone; still return the steps */ } }
    const escalated = out.escalated || call.forcedStrong
    store.appendWorkEvent(req.workUser.id, req.params.id, { kind: 'guidance', text: `How-to: ${act}` })
    res.json({ steps: saved, escalated })
  } catch (e) { sendWorkError(res, e, req) }
})

// The guide styles (single source of truth is work.WORK_MODES).
app.get('/api/work/modes', (req, res) => { res.json({ modes: work.WORK_MODES }) })

// Set the guide style for a session.
app.post('/api/work/sessions/:id/mode', requireWorkAuth, wrap((req, res) => {
  const useMode = work.normalizeMode((req.body || {}).mode)
  const s = store.setWorkSessionMode(req.workUser.id, req.params.id, useMode)
  res.json({ session: s, mode: s.mode })
}))

// Post-session report (PDF). ?dl=1 forces a download; else it opens inline.
// Downloadable per-session audit log: exactly what was transmitted to the AI,
// with timestamps, for compliance/auditing. Owner (or superadmin) only.
app.get('/api/work/sessions/:id/audit.log', requireWorkAuth, wrap((req, res) => {
  let s = store.getWorkSession(req.workUser.id, req.params.id)
  // A company admin may pull the audit log of any of their company's members.
  if (!s) s = store.getWorkSessionForCompanyAdmin(req.workUser.id, req.params.id)
  if (!s && req.user && req.user.role === 'superadmin') {
    // superadmin can pull any session's audit log
    s = (store.listAllWorkSessions ? store.listAllWorkSessions() : []).find((x) => x.id === req.params.id) || { id: req.params.id, goal: '' }
  }
  if (!s) return res.status(404).json({ error: 'Session not found' })
  const text = store.formatWorkAuditLog(req.params.id, s)
  const signed = text + attestationText(attestReport(text, { kind: 'audit', reportId: req.params.id }))
  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="workcopilot-${req.params.id}-audit.log"`)
  res.send(signed)
}))

app.get('/api/work/sessions/:id/report.pdf', requireWorkAuth, async (req, res) => {
  try {
    let s = store.getWorkSession(req.workUser.id, req.params.id)
    // A company admin may pull the report of any of their company's members.
    if (!s) s = store.getWorkSessionForCompanyAdmin(req.workUser.id, req.params.id)
    if (!s) return res.status(404).json({ error: 'Session not found' })
    // Summary generation always uses the session OWNER's runtime/scrub (so a
    // company admin downloading a member's report never runs it through the
    // admin's own AI keys or scrub settings).
    const ownerId = s.workUserId
    let achieved = s.summary || ''
    if (!achieved) {
      try {
        const rt = store.getWorkUserRuntime(ownerId)
        if (rt) { achieved = await work.workSummarize(ai, rt, { ...s, ...scrubForAi(s, store.workUserScrubOn(ownerId), ownerId) }); if (achieved) store.setWorkSessionSummary(ownerId, req.params.id, achieved) }
      } catch { /* leave empty; the PDF falls back to the list of done steps */ }
    }
    const modeLabel = (work.WORK_MODES.find((m) => m.id === work.normalizeMode(s.mode)) || {}).label || ''
    const fname = `workcopilot-${String(s.startedAt || '').slice(0, 10) || 'session'}.pdf`
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `${req.query.dl ? 'attachment' : 'inline'}; filename="${fname}"`)
    buildWorkReportPdf(s, res, { achieved, modeLabel })
  } catch (e) { sendWorkError(res, e, req) }
})

// Plain-TEXT session report (same content + completed-only gate as the PDF, as
// a .txt download). Same access scope and summary handling as report.pdf.
app.get('/api/work/sessions/:id/report.txt', requireWorkAuth, async (req, res) => {
  try {
    let s = store.getWorkSession(req.workUser.id, req.params.id)
    if (!s) s = store.getWorkSessionForCompanyAdmin(req.workUser.id, req.params.id)
    if (!s) return res.status(404).json({ error: 'Session not found' })
    const ownerId = s.workUserId
    let achieved = s.summary || ''
    if (!achieved) {
      try {
        const rt = store.getWorkUserRuntime(ownerId)
        if (rt) { achieved = await work.workSummarize(ai, rt, { ...s, ...scrubForAi(s, store.workUserScrubOn(ownerId), ownerId) }); if (achieved) store.setWorkSessionSummary(ownerId, req.params.id, achieved) }
      } catch { /* leave empty; the text report falls back to the list of done steps */ }
    }
    const modeLabel = (work.WORK_MODES.find((m) => m.id === work.normalizeMode(s.mode)) || {}).label || ''
    const fname = `workcopilot-${String(s.startedAt || '').slice(0, 10) || 'session'}.txt`
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.setHeader('Content-Disposition', `${req.query.dl ? 'attachment' : 'inline'}; filename="${fname}"`)
    res.send(formatWorkReportText(s, { achieved, modeLabel }))
  } catch (e) { sendWorkError(res, e, req) }
})

// Compliance report: a RELEVANT, evidence-backed record for ONE task - the
// controls WorkCoPilot enforced, the response for each (grounded in this
// session's real data), and the execution evidence. Same scope as report.pdf:
// the owner, a company admin of the owner's company, or a superadmin. (Email
// delivery lands once mail servers are configured; download is available now.)
app.get('/api/work/sessions/:id/compliance.pdf', requireWorkAuth, async (req, res) => {
  try {
    let s = store.getWorkSession(req.workUser.id, req.params.id)
    if (!s) s = store.getWorkSessionForCompanyAdmin(req.workUser.id, req.params.id)
    if (!s && req.user && req.user.role === 'superadmin') s = (store.listAllWorkSessions ? store.listAllWorkSessions() : []).find((x) => x.id === req.params.id) || null
    if (!s) return res.status(404).json({ error: 'Session not found' })
    const ownerId = s.workUserId
    const owner = store.getUser(ownerId) || {}
    const company = owner.companyId ? (store.getCompany(owner.companyId) || null) : null
    const member = owner.displayName || owner.username || 'Operator'
    const generatedBy = (req.workUser && (req.workUser.displayName || req.workUser.username)) || ''
    const modeLabel = (work.WORK_MODES.find((m) => m.id === work.normalizeMode(s.mode)) || {}).label || ''
    const framework = (req.query && req.query.framework) ? String(req.query.framework) : null
    const evidence = store.getWorkComplianceEvidence(s, ownerId, { framework })
    const fw = framework && evidence.focus ? '-' + evidence.focus.id : ''
    const fname = `workcopilot-compliance${fw}-${String(s.startedAt || '').slice(0, 10) || 'session'}.pdf`
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `${req.query.dl ? 'attachment' : 'inline'}; filename="${fname}"`)
    buildComplianceReportPdf(s, res, { evidence, company: company ? (company.name || '') : '', member, generatedBy, modeLabel })
  } catch (e) { sendWorkError(res, e, req) }
})

// The catalog of frameworks the compliance report can focus on (for the admin
// picker). Public: it is just the list of names we support.
app.get('/api/work/compliance/frameworks', wrap((req, res) => {
  res.json({ frameworks: COMPLIANCE_FRAMEWORKS.map((f) => ({ id: f.id, name: f.name, region: f.region, category: f.category })) })
}))

// Render any streamed PDF builder to a Buffer (for emailing as an attachment).
function pdfToBuffer(builder) {
  return new Promise((resolve, reject) => {
    const chunks = []
    const sink = new Writable({ write(c, _e, cb) { chunks.push(c); cb() } })
    sink.on('finish', () => resolve(Buffer.concat(chunks)))
    sink.on('error', reject)
    try { builder(sink) } catch (e) { reject(e) }
  })
}

// Email the compliance report (PDF attached) - company admin of the owner's
// company, or superadmin. Needs SMTP configured (superadmin > Email).
app.post('/api/work/sessions/:id/compliance/email', requireWorkAuth, async (req, res) => {
  try {
    if (!store.smtpConfigured()) return res.status(400).json({ error: 'Email is not configured yet. A superadmin sets it up under Admin > Email.' })
    let s = store.getWorkSession(req.workUser.id, req.params.id)
    if (!s) s = store.getWorkSessionForCompanyAdmin(req.workUser.id, req.params.id)
    if (!s && req.user && req.user.role === 'superadmin') s = (store.listAllWorkSessions ? store.listAllWorkSessions() : []).find((x) => x.id === req.params.id) || null
    if (!s) return res.status(404).json({ error: 'Session not found' })
    const to = String((req.body || {}).to || '').trim()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) return res.status(400).json({ error: 'Enter a valid recipient address.' })
    const ownerId = s.workUserId
    const owner = store.getUser(ownerId) || {}
    const company = owner.companyId ? (store.getCompany(owner.companyId) || null) : null
    const member = owner.displayName || owner.username || 'Operator'
    const generatedBy = (req.workUser && (req.workUser.displayName || req.workUser.username)) || ''
    const modeLabel = (work.WORK_MODES.find((m) => m.id === work.normalizeMode(s.mode)) || {}).label || ''
    const framework = (req.body && req.body.framework) ? String(req.body.framework) : null
    const evidence = store.getWorkComplianceEvidence(s, ownerId, { framework })
    const pdf = await pdfToBuffer((sink) => buildComplianceReportPdf(s, sink, { evidence, company: company ? (company.name || '') : '', member, generatedBy, modeLabel }))
    const label = evidence.focus ? `${evidence.focus.name} compliance report` : 'Compliance report'
    const fw = framework && evidence.focus ? '-' + evidence.focus.id : ''
    await sendMail(store.getSmtpSendConfig(), {
      to, subject: `${label}: ${s.goal ? String(s.goal).slice(0, 80) : 'WorkCoPilot task'}`,
      text: `Attached is the ${label.toLowerCase()} for the task "${s.goal || ''}" run by ${member}.\n\nThe report carries an authenticity seal (SHA-256 hash + signature) from ${REPORT_CONTACTS ? 'AdmireVeda / COE Security LLC' : ''}. Questions: ${REPORT_CONTACTS.join(' or ')}.\n\nSent ${new Date().toISOString()}.`,
      attachment: { filename: `workcopilot-compliance${fw}-${String(s.startedAt || '').slice(0, 10) || 'session'}.pdf`, content: pdf, contentType: 'application/pdf' },
    })
    res.json({ ok: true, to })
  } catch (e) { sendWorkError(res, e, req) }
})

// Research: user-triggered ONLY (a Research button). Web search now, then a
// current answer. No frame, no continuous web use.
app.post('/api/work/sessions/:id/research', requireWorkAuth, async (req, res) => {
  try {
    const s = store.getWorkSession(req.workUser.id, req.params.id)
    if (!s) return res.status(404).json({ error: 'Session not found' })
    const question = String((req.body || {}).question || '').trim()
    const rr = await resolveWorkRuntime(req, res, { needVision: false }); if (!rr) return
    const scrubOn = store.workUserScrubOn(req.workUser.id)
    const safeQuestion = scrubIf(scrubOn, question, req.workUser.id)
    const safeGoal = scrubIf(scrubOn, s.goal || "", req.workUser.id)
    const notes = await Promise.race([
      workResearchNotes(safeQuestion || safeGoal, resolveWebSearchKey(req)),
      new Promise((resolve) => setTimeout(() => resolve(''), 15000)),
    ]).catch(() => '')
    const answer = await work.workResearch(ai, rr.rt, {
      base: store.getSystemPrompt(), goal: safeGoal, question: safeQuestion, research: notes,
      steps: s.steps || [], currentStep: s.currentStep || 0,
    })
    if (question) store.appendWorkEvent(req.workUser.id, req.params.id, { kind: 'ask', text: 'Research: ' + question })
    store.appendWorkEvent(req.workUser.id, req.params.id, { kind: 'answer', text: answer })
    res.json({ answer, hadResearch: !!notes })
  } catch (e) { sendWorkError(res, e, req) }
})

// ---- Usage metering -------------------------------------------------------
app.get('/api/work/usage', requireWorkAuth, wrap((req, res) => { res.json(store.getWorkUsage(req.workUser.id)) }))
app.post('/api/work/usage/heartbeat', requireWorkAuth, wrap((req, res) => {
  const seconds = Math.max(0, Math.min(20, Number((req.body || {}).seconds) || 0)) // cap one beat
  const usage = store.addWorkUsage(req.workUser.id, seconds)
  res.json({ remainingSeconds: usage.remainingSeconds, freeLeft: usage.freeLeft, exhausted: usage.exhausted })
}))
app.patch('/api/work/sessions/:id/pause', requireWorkAuth, wrap((req, res) => {
  const s = store.setWorkSessionPaused(req.workUser.id, req.params.id, !!(req.body || {}).paused)
  res.json({ session: s, paused: s.paused })
}))
// Keep (or stop keeping) scrubbed milestone screenshots in the session report.
app.post('/api/work/report-shots', requireWorkAuth, wrap((req, res) => {
  res.json({ user: store.setWorkUserReportShots(req.workUser.id, !!(req.body || {}).enabled) })
}))
// Pricing is public (the marketing site reads it); superadmin can change it.
app.get('/api/work/pricing', wrap((req, res) => {
  // annualReady tells the marketing page whether annual CHECKOUT is wired (all
  // three annual Stripe price ids set). When false, an annual pick shows the
  // 20%-off price and routes to sign-up rather than starting a charge.
  const annualReady = (() => { try { return !!store.getBillingPublic().annualReady } catch { return false } })()
  res.json({ ...store.getWorkPricing(), annualReady })
}))

// Public: the homepage hero rotation (headline + subtext pairs). Superadmin-
// editable; the marketing page keeps a built-in fallback so it renders even if
// this call fails.
app.get('/api/work/hero', wrap((req, res) => {
  res.json({ pairs: store.getHeroPairs(), custom: store.isHeroCustom() })
}))

// Public: the accuracy-benchmark scoreboard. Reads the latest PUBLIC summary the
// eval runner wrote (generic model labels, aggregates only, held-out excluded);
// returns { pending: true } until a run exists. Never exposes the internal
// detail file (exact model + per-task). See docs/accuracy-benchmark-spec.md.
app.get('/api/work/benchmark', wrap((req, res) => {
  try {
    const dir = path.join(__dirname, 'eval', 'results')
    const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('-public.json')) : []
    if (!files.length) return res.json({ pending: true, method: 'Result-correctness benchmark; see the methodology. No public run has been recorded yet.' })
    // Newest by mtime.
    const newest = files.map((f) => ({ f, t: fs.statSync(path.join(dir, f)).mtimeMs })).sort((a, b) => b.t - a.t)[0].f
    const data = JSON.parse(fs.readFileSync(path.join(dir, newest), 'utf8'))
    res.json({ pending: false, ...data })
  } catch (e) { res.json({ pending: true, method: 'Benchmark results are not available right now.' }) }
}))

// Public "is my scenario covered?" assistant for the marketing site. The
// guardrail lives in work.workCoverage's system prompt: only a described
// task/scenario gets a real answer; everything else returns verdict
// "offtopic" and never reaches a useful KB answer. Rate-limited per IP so the
// public endpoint cannot be used as a free general-purpose AI.
const coverageHits = new Map()
function coverageRateOk(ip) {
  const now = Date.now(), win = 60 * 60 * 1000, max = 30
  const rec = coverageHits.get(ip) || { t: now, n: 0 }
  if (now - rec.t > win) { rec.t = now; rec.n = 0 }
  rec.n++; coverageHits.set(ip, rec)
  if (coverageHits.size > 5000) { for (const [k, v] of coverageHits) if (now - v.t > win) coverageHits.delete(k) }
  return rec.n <= max
}
app.post('/api/work/coverage', wrap(async (req, res) => {
  const question = String((req.body && req.body.question) || '').trim()
  if (!question) return res.status(400).json({ error: 'Describe your task or scenario.' })
  if (question.length > 1200) return res.status(400).json({ error: 'Please keep it under about 1200 characters.' })
  const ip = String(req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim()
  if (!coverageRateOk(ip)) return res.status(429).json({ error: 'A few too many checks just now - please try again in a little while.' })
  // Log EVERY query + the AI answer against the lead so the superadmin Leads grid
  // shows exactly what each visitor searched and what we answered (newest first).
  // Associated by leadId once captured, otherwise buffered under the browser's
  // anon id and attached on capture. We log the answer TEXT only - never a model
  // id or AI cost. Logged in every return path so it is captured even when
  // platform AI is off or the call fails.
  const leadId = String((req.body && req.body.leadId) || '').trim()
  const anonId = String((req.body && req.body.anonId) || '').trim()
  const logSearch = (out) => { try { store.recordWorkLeadSearch({ leadId, anonId, query: question, response: out && out.answer }) } catch { /* non-fatal */ } }
  const generic = {
    verdict: 'covered', plan: null, product: 'WorkCoPilot', degraded: true,
    answer: 'WorkCoPilot guides you through almost any task on your screen, in any field, one exact step at a time, catching a wrong move and correcting it, and keeping you on the next correct step. Sign in and describe your task to see exactly how it is covered.',
  }
  if (!store.getWorkPlatformAllowed()) { logSearch(generic); return res.json(generic) }
  const cfg = store.getActiveRuntime()
  if (!cfg) { logSearch(generic); return res.json(generic) }
  try {
    const out = await work.workCoverage(ai, cfg, { question, pricing: store.getWorkPricing(), locale: readLocale(req) })
    logSearch(out)
    res.json(out)
  } catch (e) {
    logSearch(generic)
    res.json(generic)   // never show a public visitor an error; flagged degraded
  }
}))

// Public lead capture for the "Validate it live" widget. Captured once per
// browser session (the client gates on sessionStorage) BEFORE the first live
// check. Rate-limited per IP (reuses the coverage limiter) so it cannot be
// hammered. These are contact details the visitor chose to share - stored as
// typed, never scrubbed - and they surface in the superadmin Leads grid.
app.post('/api/work/leads', wrap((req, res) => {
  const b = req.body || {}
  const email = String(b.email || '').trim()
  const country = String(b.country || '').trim()
  if (!String(b.firstName || '').trim() || !String(b.lastName || '').trim() || !email || !String(b.company || '').trim() || !country) {
    return res.status(400).json({ error: 'First name, last name, email, company and country are required.' })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' })
  const ip = String(req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim()
  if (!coverageRateOk(ip)) return res.status(429).json({ error: 'Too many submissions just now - please try again shortly.' })
  const lead = store.addWorkLead({
    firstName: b.firstName, lastName: b.lastName, email, phone: b.phone, company: b.company, country, source: b.source,
  }, { ip, anonId: String(b.anonId || '').trim() })
  // Enterprise mailing: notify the business of the new lead, and thank the
  // person who submitted. Fire-and-forget - never block or fail the submission.
  const notify = store.getNotifySettings()
  const name = `${b.firstName} ${b.lastName}`.trim()
  sendTemplateAsync('lead_notify', notify.leadTo, { name, email, phone: String(b.phone || '').trim(), company: b.company, country, question: b.question || b.source || '', verdict: b.verdict || '', plan: b.plan || '', submittedAt: new Date().toISOString() })
  if (notify.thankYou) sendTemplateAsync('lead_thank_you', email, { name })
  res.json(lead)
}))
// ---- Contact Us (public) --------------------------------------------------
// Capture the form, email the business (recipient is superadmin-set), and send
// the submitter a thank-you. Rate-limited like the lead form.
app.post('/api/work/contact', wrap((req, res) => {
  const b = req.body || {}
  const name = String(b.name || '').trim()
  const email = String(b.email || '').trim()
  const message = String(b.message || '').trim()
  if (!name || !email || !message) return res.status(400).json({ error: 'Name, email and a message are required.' })
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' })
  if (message.length < 5) return res.status(400).json({ error: 'Please add a little more detail to your message.' })
  const ip = String(req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim()
  if (!coverageRateOk(ip)) return res.status(429).json({ error: 'Too many submissions just now - please try again shortly.' })
  const rec = store.addContactSubmission({ name, email, subject: b.subject, message }, { ip })
  const notify = store.getNotifySettings()
  sendTemplateAsync('contact_notify', notify.contactTo, { name, email, subject: b.subject || '(no subject)', message, submittedAt: rec.at, ip })
  if (notify.thankYou) sendTemplateAsync('contact_thank_you', email, { name })
  res.json({ ok: true })
}))

// ---- Password: set (via emailed token), forgot, validate token ------------
// A strong throwaway password for accounts created without one (the person sets
// their own via the emailed link).
function genTempPassword() { return (globalThis.crypto.randomUUID() + globalThis.crypto.randomUUID()).replace(/-/g, '').slice(0, 24) }
// Validate a set/reset token (so the page can greet the user). Public.
app.get('/api/work/password/token/:token', wrap((req, res) => {
  const t = store.peekEmailToken(req.params.token, 'set_password')
  if (!t) return res.status(400).json({ valid: false, error: 'This link is invalid or has expired.' })
  res.json({ valid: true, username: t.username })
}))
// Set a password using a one-time token. Public (the token is the credential).
app.post('/api/work/password/set', wrap((req, res) => {
  const { token, password } = req.body || {}
  if (String(password || '').length < 6) return res.status(400).json({ error: 'Choose a password of at least 6 characters.' })
  const userId = store.consumeEmailToken(String(token || ''), 'set_password')
  if (!userId) return res.status(400).json({ error: 'This link is invalid or has expired. Ask for a new one.' })
  store.setUserPasswordById(userId, password)   // the store emits password_changed -> the owner's notice
  res.json({ ok: true })
}))
// Forgot password: send a reset link. ALWAYS 200 (no account enumeration).
app.post('/api/work/password/forgot', wrap((req, res) => {
  const login = String((req.body || {}).login || '').trim()
  const ip = String(req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim()
  if (login && coverageRateOk(ip)) {
    const u = store.findUserByLogin(login)
    if (u) { Promise.resolve().then(() => sendPasswordReset(u.id)).catch(() => {}) }
  }
  res.json({ ok: true })   // same response whether or not the account exists
}))
// ---- Support tickets (user side: open + thread with the superadmin) -------
app.get('/api/work/ticket-categories', (req, res) => res.json({ categories: store.workTicketCategories() }))
app.get('/api/work/tickets', requireWorkAuth, wrap((req, res) => res.json({ tickets: store.listWorkTicketsForUser(req.workUser.id) })))
app.post('/api/work/tickets', requireWorkAuth, wrap((req, res) => {
  const { category, subject, body } = req.body || {}
  if (!String(subject || '').trim() && !String(body || '').trim()) return res.status(400).json({ error: 'Add a subject and a short description.' })
  res.json(store.createWorkTicket(req.workUser.id, { category, subject, body }))
}))
app.get('/api/work/tickets/:id', requireWorkAuth, wrap((req, res) => {
  const t = store.getWorkTicket(req.params.id)
  if (!t || t.userId !== req.workUser.id) return res.status(404).json({ error: 'Not found' })
  res.json(t)
}))
app.post('/api/work/tickets/:id/reply', requireWorkAuth, wrap((req, res) => {
  const t = store.getWorkTicket(req.params.id)
  if (!t || t.userId !== req.workUser.id) return res.status(404).json({ error: 'Not found' })
  const text = String((req.body && req.body.text) || '').trim()
  if (!text) return res.status(400).json({ error: 'Write a message.' })
  res.json(store.addWorkTicketMessage(req.params.id, { from: 'user', by: req.user.username, text }))
}))

// ---- Company admin: manage users within your own company -----------------
app.get('/api/work/company/users', requireWorkAuth, requireCompanyAdmin, wrap((req, res) => {
  const cid = req.workUser.companyId
  // Every company-scoped route refuses when no company is in scope (a superadmin
  // without a company must use /api/work/admin/companies/:id); without this the
  // list fell through to "users whose companyId is null".
  if (!cid) return res.status(403).json({ error: 'No company in scope.' })
  res.json({ company: store.getCompany(cid), users: store.listCompanyUsers(cid) })
}))
// In LOCKED license mode the company admin cannot change who holds a license
// (add or remove people); only the superadmin can. Role/tier edits are still
// allowed. Returns true when the roster may be changed, else sends 403.
function rosterChangeAllowed(req, res) {
  const c = store.getCompany(req.workUser.companyId)
  if (c && c.licenseMode === 'locked') {
    res.status(403).json({ error: 'Your license roster is managed by WorkCoPilot. Open a support ticket to add or remove who holds a license.', locked: true })
    return false
  }
  return true
}
app.post('/api/work/company/users', requireWorkAuth, requireCompanyAdmin, wrap((req, res) => {
  const cid = req.workUser.companyId
  if (!cid) return res.status(403).json({ error: 'No company in scope.' })
  if (!rosterChangeAllowed(req, res)) return
  const { username, password, email, companyRole, tier, displayName } = req.body || {}
  // Role and plan are validated strictly in the store (a typo is a 400, never a
  // silent default). Both branches run the same seat gate. Every new account is
  // emailed: a non-SSO user gets a set-password link; an SSO user gets a
  // no-password welcome (they sign in through the identity provider).
  if (username && String(username).trim()) {
    // Non-SSO: username (+ optional password) + a contact email for the set link.
    // If no password is given, we set a strong random one - the person sets their
    // own via the emailed link, so the admin never has to hand out a password.
    const user = store.createManagedUser({ username, password: (password && String(password)) || genTempPassword(), email: (email && String(email).trim()) || null, companyId: cid, companyRole, tier })
    sendAccountWelcomeAsync(user.id)
    return res.json(user)
  }
  if (email && String(email).trim()) {
    const user = store.addCompanyMemberByEmail({ companyId: cid, email, companyRole, tier, displayName })
    sendAccountWelcomeAsync(user.id)
    return res.json({ user })
  }
  return res.status(400).json({ error: 'Add a username (for a password account) or an email (for single sign-on).' })
}))
// Company admin: the license + usage dashboard (seats by pool, who holds a
// license, tier breakdown, minute pool, each person's live usage).
app.get('/api/work/team/licenses', requireWorkAuth, requireCompanyAdmin, wrap((req, res) => {
  if (!req.workUser.companyId) return res.status(403).json({ error: 'No company in scope.' })
  res.json(store.companyLicenseSummary(req.workUser.companyId))
}))
// Company admin: read-only view of their own company's bill (seats + ledger).
app.get('/api/work/team/billing', requireWorkAuth, requireCompanyAdmin, wrap((req, res) => {
  if (!req.workUser.companyId) return res.status(403).json({ error: 'No company in scope.' })
  res.json(store.companyBilling(req.workUser.companyId))
}))
// Company admin: give one member minutes from the company's shared pool.
app.post('/api/work/company/users/:id/minutes', requireWorkAuth, requireCompanyAdmin, wrap((req, res) => {
  const cid = req.workUser.companyId
  if (!cid) return res.status(403).json({ error: 'No company in scope.' })
  const minutes = Number((req.body || {}).minutes)
  if (!Number.isFinite(minutes) || minutes <= 0) return res.status(400).json({ error: 'Enter how many minutes to allocate.' })
  res.json(store.allocateCompanyPoolToUser(cid, req.params.id, Math.round(minutes * 60)))
}))
// Company admin: change a member's role or plan within their OWN company. The
// store guards that the target is in this company. An admin cannot change their
// OWN role here (prevents accidentally locking themselves out of the console);
// they may still change their own plan.
app.patch('/api/work/company/users/:id', requireWorkAuth, requireCompanyAdmin, wrap((req, res) => {
  const cid = req.workUser.companyId
  if (!cid) return res.status(403).json({ error: 'No company in scope.' })
  const { companyRole, tier } = req.body || {}
  if (companyRole !== undefined && String(req.params.id) === String(req.workUser.id)) {
    return res.status(400).json({ error: 'You cannot change your own role. Ask another company admin or support.' })
  }
  res.json({ user: store.updateCompanyMember(cid, req.params.id, { companyRole, tier }) })
}))
// Company admin: remove a member from their OWN company (detach, reversible).
// Cannot remove yourself.
app.delete('/api/work/company/users/:id', requireWorkAuth, requireCompanyAdmin, wrap((req, res) => {
  const cid = req.workUser.companyId
  if (!cid) return res.status(403).json({ error: 'No company in scope.' })
  if (!rosterChangeAllowed(req, res)) return
  if (String(req.params.id) === String(req.workUser.id)) {
    return res.status(400).json({ error: 'You cannot remove yourself from the company.' })
  }
  const reason = String((req.body && req.body.reason) || '').trim()
  if (reason.length < 3) return res.status(400).json({ error: 'A reason is required to remove a member (it is recorded in your audit trail).' })
  res.json(store.removeCompanyMember(cid, req.params.id, { reason, byUserId: req.workUser.id }))
}))

app.post('/api/work/admin/pricing', requireAuth, requireSuperAdmin, wrap((req, res) => { res.json(store.setWorkPricing(req.body || {})) }))

// ---- SMTP / email (SES) - superadmin + MFA step-up -------------------------
// The outbound-email config the product uses to deliver reports. SMTP
// credentials are sensitive, so this page is gated behind an MFA step-up (the
// SAME shared window as AI config). The password is write-only: stored
// encrypted and never returned (the view only says whether one is set).
function requireSmtpStepUp(req, res, next) {
  try { store.requireStepUpActive(req.user.id, 'SMTP settings'); next() }
  catch (e) { sendWorkError(res, e, req) }
}
app.get('/api/work/admin/smtp', requireAuth, requireSuperAdmin, requireSmtpStepUp, wrap((req, res) => { res.json({ smtp: store.getSmtpConfig() }) }))
app.post('/api/work/admin/smtp', requireAuth, requireSuperAdmin, requireSmtpStepUp, wrap((req, res) => { res.json({ smtp: store.setSmtpConfig(req.body || {}) }) }))
// Send a test email with the CURRENT (saved) config, so the operator confirms
// the SES credentials end to end before relying on them.
app.post('/api/work/admin/smtp/test', requireAuth, requireSuperAdmin, requireSmtpStepUp, async (req, res) => {
  try {
    const cfg = store.getSmtpSendConfig()
    if (!cfg) return res.status(400).json({ error: 'Save the SMTP host and From address first.' })
    const to = String((req.body || {}).to || '').trim() || cfg.fromEmail
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) return res.status(400).json({ error: 'Enter a valid recipient address.' })
    const r = await sendMail(cfg, {
      to, subject: 'WorkCoPilot SMTP test',
      text: `This is a test email from WorkCoPilot.\n\nIf you received this, outbound email over ${cfg.host}:${cfg.port} is working and reports can be delivered.\n\nSent ${new Date().toISOString()}.`,
    })
    res.json({ ok: true, to, messageId: r.messageId || null })
  } catch (e) { sendWorkError(res, e, req) }
})

// ---- Report authenticity verification (public) ----------------------------
// A third party pastes a report's authenticity stamp here to confirm the report
// was issued by us and has not been altered. Reveals nothing sensitive.
app.post('/api/work/reports/verify', wrap((req, res) => {
  const b = req.body || {}
  res.json(verifyReport({ kind: b.kind, reportId: b.reportId, hash: b.hash, issuedAt: b.issuedAt, signature: b.signature }))
}))

// ---- Notification recipients + Contact inbox (superadmin) ------------------
// Where Contact Us and new-lead notifications go, and the thank-you toggle.
app.get('/api/work/admin/notify', requireAuth, requireSuperAdmin, wrap((req, res) => { res.json({ notify: store.getNotifySettings() }) }))
app.post('/api/work/admin/notify', requireAuth, requireSuperAdmin, wrap((req, res) => { res.json({ notify: store.setNotifySettings(req.body || {}) }) }))
app.get('/api/work/admin/contacts', requireAuth, requireSuperAdmin, wrap((req, res) => { res.json({ contacts: store.listContactSubmissions({ limit: Number(req.query.limit) || 300 }) }) }))
// Delete one / clear all contact messages (reason required + logged in the store).
app.delete('/api/work/admin/contacts/:id', requireAuth, requireSuperAdmin, wrap((req, res) => {
  res.json(store.deleteContactSubmission(req.params.id, { reason: String((req.body && req.body.reason) || '').trim(), by: req.user.username }))
}))
app.post('/api/work/admin/contacts/clear', requireAuth, requireSuperAdmin, wrap((req, res) => {
  res.json(store.clearContactSubmissions({ reason: String((req.body && req.body.reason) || '').trim(), by: req.user.username }))
}))
// Business-claims traceability (superadmin only, behind the authenticator step-up):
// every public claim mapped to the file + code block that backs it, with a status
// and an authenticity seal. A signed Markdown export is available for download.
app.get('/api/work/admin/claims', requireAuth, requireSuperAdmin, requireAiStepUp, wrap((req, res) => {
  res.json(claimsReport())
}))
app.get('/api/work/admin/claims.md', requireAuth, requireSuperAdmin, requireAiStepUp, wrap((req, res) => {
  res.setHeader('Content-Type', 'text/markdown; charset=utf-8')
  res.setHeader('Content-Disposition', 'attachment; filename="workcopilot-business-claims.md"')
  res.send(claimsMarkdown())
}))
// Every company admin across all companies (operational oversight).
app.get('/api/work/admin/company-admins', requireAuth, requireSuperAdmin, wrap((req, res) => { res.json({ admins: store.listAllCompanyAdmins() }) }))

// ---- Editable email templates (superadmin) --------------------------------
// Every email the product sends is editable here - subject, heading, body and
// CTA label, with <Placeholder> tokens. Nothing is static. The branded layout
// and the placeholder catalog come from email_templates.js; the overrides live
// in the store.
app.get('/api/work/admin/email-templates', requireAuth, requireSuperAdmin, wrap((req, res) => {
  const overrides = store.getAllEmailTemplateOverrides()
  const templates = Object.keys(EMAIL_DEFS).map((type) => {
    const d = EMAIL_DEFS[type]
    const ov = overrides[type] || {}
    return {
      type, label: d.label, category: d.category, description: d.description,
      placeholders: d.placeholders || [],
      defaults: { subject: d.defaultSubject, heading: d.defaultHeading, body: d.defaultBody, ctaLabel: d.defaultCtaLabel || '' },
      override: { subject: ov.subject, heading: ov.heading, body: ov.body, ctaLabel: ov.ctaLabel, updatedAt: ov.updatedAt || null },
      hasCta: !!d.ctaUrlToken || !!d.defaultCtaLabel,
    }
  })
  res.json({ templates })
}))
app.post('/api/work/admin/email-templates/:type', requireAuth, requireSuperAdmin, wrap((req, res) => {
  if (!EMAIL_DEFS[req.params.type]) return res.status(404).json({ error: 'Unknown email type.' })
  res.json({ override: store.setEmailTemplate(req.params.type, req.body || {}) })
}))
app.post('/api/work/admin/email-templates/:type/reset', requireAuth, requireSuperAdmin, wrap((req, res) => {
  if (!EMAIL_DEFS[req.params.type]) return res.status(404).json({ error: 'Unknown email type.' })
  res.json({ override: store.resetEmailTemplate(req.params.type) })
}))
// Live preview: render the chosen type with its sample data, applying either the
// DRAFT overrides sent in the body (so the admin previews before saving) or the
// saved ones. Returns the subject + full HTML to show in an iframe.
app.post('/api/work/admin/email-templates/:type/preview', requireAuth, requireSuperAdmin, wrap((req, res) => {
  const d = EMAIL_DEFS[req.params.type]
  if (!d) return res.status(404).json({ error: 'Unknown email type.' })
  const draft = (req.body && typeof req.body === 'object') ? req.body : {}
  const saved = store.getEmailTemplate(req.params.type)
  const overrides = {
    subject: draft.subject != null ? draft.subject : saved.subject,
    heading: draft.heading != null ? draft.heading : saved.heading,
    body: draft.body != null ? draft.body : saved.body,
    ctaLabel: draft.ctaLabel != null ? draft.ctaLabel : saved.ctaLabel,
  }
  let out
  try { out = renderEmail(req.params.type, d.sampleData || {}, overrides) } catch (e) { return res.status(500).json({ error: 'Could not render the preview.' }) }
  res.json({ subject: out.subject, html: out.html })
}))

// Manual step control (the user ticks/unticks or skips).
app.post('/api/work/sessions/:id/step', requireWorkAuth, wrap((req, res) => {
  const { index, status, frame } = req.body || {}
  if (!['done', 'current', 'pending'].includes(status)) return res.status(400).json({ error: 'Bad status' })
  const s = store.updateWorkStep(req.workUser.id, req.params.id, Number(index), status)
  // Evidence: when a step is MARKED DONE and the client sent the current
  // (already on-device-scrubbed) frame, keep it as that step's milestone
  // screenshot - so reports carry scrubbed shots even when steps are confirmed
  // manually, not only via the watch auto-confirm. One per step, best-effort,
  // gated by the owner's reportShots setting inside captureMilestoneShot.
  if (status === 'done' && typeof frame === 'string' && frame.startsWith('data:')) {
    try { store.captureMilestoneShot(req.workUser.id, req.params.id, Number(index), frame) } catch { /* evidence is best-effort */ }
  }
  res.json({ session: s, steps: s.steps, index: s.currentStep })
}))

// Prev / Next navigation in the guide card: move the current pointer without
// marking anything done.
app.post('/api/work/sessions/:id/current', requireWorkAuth, wrap((req, res) => {
  const s = store.setWorkCurrentStep(req.workUser.id, req.params.id, Number((req.body || {}).index))
  res.json({ session: s, steps: s.steps, index: s.currentStep })
}))

// Draft an email / message about the task (read-only output to paste).
// Compose: WRITE the actual document (letter, report, resume section, contract
// clause, red-line notes, outline, table, code), in a chosen format, grounded in
// the goal + any pasted data + optional screen. Read-only output the user copies
// or downloads. Replaces the old dead "draft a message" endpoint.
app.post('/api/work/sessions/:id/compose', requireWorkAuth, requireWorkSubscription, async (req, res) => {
  try {
    const s = store.getWorkSession(req.workUser.id, req.params.id)
    if (!s) return res.status(404).json({ error: 'Session not found' })
    const { want, format, docsText, frame, deep } = req.body || {}
    const hasFrame = typeof frame === 'string' && frame.startsWith('data:')
    const rr = await resolveWorkRuntime(req, res, { needVision: hasFrame }); if (!rr) return
    const call = workCallRuntime(rr, !!deep)
    const scrubOn = store.workUserScrubOn(req.workUser.id)
    const pol = store.getEffectiveWorkPolicy(req.workUser.id)
    const scrubText = (t) => pol ? scrubWithPolicy(String(t || ''), pol) : (scrubOn ? scrubSensitive(String(t || '')) : { clean: String(t || ''), counts: {}, total: 0 })
    const sa = scrubForAi(s, scrubOn, req.workUser.id)
    const wantScrub = scrubText(String(want || '').slice(0, 2000))
    const docScrub = scrubText(String(docsText || '').slice(0, 8000))
    const redacted = wantScrub.total + docScrub.total
    store.appendWorkAudit(req.params.id, { call: 'compose', model: (hasFrame ? call.visionModel : (call.rt && call.rt.chatModel)) || null, scrub: scrubOn || !!pol, redacted, frame: hasFrame ? 'screenshot sent' : 'no frame', sent: (wantScrub.clean || '[write the document for the goal]') + (docScrub.clean ? `\n\n--- pasted source (redacted on the device before sending) ---\n${docScrub.clean}` : '') })
    if (redacted) {
      const _counts = {}
      for (const c of [wantScrub.counts, docScrub.counts]) for (const [k, n] of Object.entries(c || {})) _counts[k] = (_counts[k] || 0) + Number(n || 0)
      store.recordPiiAlert(req.workUser.id, { sessionId: req.params.id, call: 'compose', counts: _counts, total: redacted })
    }
    const out = await work.workCompose(ai, call.rt, {
      base: store.getSystemPrompt(), mode: work.normalizeMode(s.mode), goal: sa.goal,
      want: wantScrub.clean, format: String(format || '').slice(0, 24), steps: s.steps || [], currentStep: s.currentStep || 0,
      events: sa.events, appContext: s.appContext || '', docsText: docScrub.clean,
      frame: hasFrame ? frame : null, visionModel: hasFrame ? call.visionModel : null, strong: hasFrame ? call.backup : null,
    })
    if (redacted) store.appendWorkEvent(req.workUser.id, req.params.id, { kind: 'ai', text: redactionSummary({ ...wantScrub.counts, ...docScrub.counts }) })
    const escalated = out.escalated || call.forcedStrong
    const usedModel = (hasFrame ? (call.forcedStrong ? call.visionModel : (out.escalated ? call.strongModel : rr.visionModel)) : (call.rt && call.rt.chatModel))
    meterCost(req.params.id, usedModel, wantScrub.clean + docScrub.clean + (sa.goal || ''), (out.body || '') + (out.basis || ''), 0, { kind: 'compose' })
    store.appendWorkEvent(req.workUser.id, req.params.id, { kind: 'compose', text: `${out.format}: ${String(out.title || '').slice(0, 120)}` })
    // Security gate on CODE-related compositions only (an authored script/query/config).
    const security = out.format === 'code' ? await runSecurityGate(req.workUser.id, req.params.id, out.body || '') : null
    // Company-policy gate on the composed document (any format).
    const policy = await runPolicyGate(req.workUser.id, req.params.id, [out.title, out.body].filter(Boolean).join('\n'))
    res.json({ compose: out, escalated, security, policy })
  } catch (e) { sendWorkError(res, e, req) }
})

// Finalize: summarize + end. Re-finalizing regenerates.
app.post('/api/work/sessions/:id/finalize', requireWorkAuth, async (req, res) => {
  try {
    const s = store.getWorkSession(req.workUser.id, req.params.id)
    if (!s) return res.status(404).json({ error: 'Session not found' })
    const rr = await resolveWorkRuntime(req, res, {}); if (!rr) return
    const summary = await work.workSummarize(ai, rr.rt, { ...s, ...scrubForAi(s, store.workUserScrubOn(req.workUser.id), req.workUser.id) })
    store.setWorkSessionSummary(req.workUser.id, req.params.id, summary)
    const ended = store.endWorkSession(req.workUser.id, req.params.id)
    res.json({ ok: true, summary, session: { id: ended.id, status: ended.status, endedAt: ended.endedAt } })
  } catch (e) { sendWorkError(res, e, req) }
})

// The current active session, for the desktop buddy overlay to poll (it runs in
// a separate window that shares the session cookie).
app.get('/api/work/active', requireWorkAuth, wrap((req, res) => {
  const active = store.listWorkSessions(req.workUser.id).find((s) => s.status === 'active') || null
  res.json({ session: active })
}))

// ---- module routes (self-contained registers) ----------------------------
registerWorkAdminRoutes(app, { store, work, ai, requireAuth, requireAdmin, requireSuperAdmin, wrap, resolveWorkRuntime })
registerWorkShotRoutes(app, { store, requireWorkAuth, wrap })
registerWorkDocsRoutes(app, { store, requireWorkAuth, wrap, extractDocText: docs.extractText })
registerWorkImageRoutes(app, { store, ai, requireWorkAuth, wrap, resolveWorkRuntime })
// OIDC SSO (Google / Microsoft / Okta). Uses the gates defined above.
registerSsoRoutes(app, { store, establishSession, requireAuth, requireWorkAuth, requireSuperAdmin, requireCompanyAdmin, wrap })
// Social sign-in for individual users (Google + Microsoft OIDC, Facebook OAuth2).
// Reuses the OIDC machinery and the same MFA gate as password + SSO login.
registerSocialRoutes(app, { store, establishSession, wrap })

// SOC/SIEM: auto-relay company alerts (e.g. PII/PHI entered) to the company's
// configured destinations. The relay forwards ONLY alert metadata (categories/
// counts + actor/context) - never the actual sensitive values.
store.setAlertRelay(integrations.makeRelay(store))
app.get('/api/work/company/integrations/catalog', requireWorkAuth, requireCompanyAdmin, wrap((req, res) => res.json({ catalog: integrations.connectorCatalog() })))
app.get('/api/work/company/integrations', requireWorkAuth, requireCompanyAdmin, wrap((req, res) => {
  const list = store.listCompanyIntegrations(req.workUser.companyId).map((i) => {
    const def = integrations.connectorById(i.type)
    const cfg = { ...(i.config || {}) }
    const hasSecret = {}
    // Blank secret VALUES before sending to the client (write-only); report presence.
    for (const f of (def ? def.fields : [])) { if (f.secret) { hasSecret[f.key] = !!cfg[f.key]; cfg[f.key] = '' } }
    return { id: i.id, type: i.type, enabled: !!i.enabled, config: cfg, hasSecret, lastRelayAt: i.lastRelayAt || null, lastRelayOk: (i.lastRelayOk == null ? null : !!i.lastRelayOk), lastRelayError: i.lastRelayError || '' }
  })
  res.json({ integrations: list })
}))
app.post('/api/work/company/integrations', requireWorkAuth, requireCompanyAdmin, wrap((req, res) => {
  const b = req.body || {}
  if (!b.id && !integrations.connectorById(b.type)) return res.status(400).json({ error: 'Unknown integration type.' })
  const saved = store.setCompanyIntegration(req.workUser.companyId, { id: b.id, type: b.type, config: b.config || {}, enabled: b.enabled !== false })
  res.json({ ok: true, id: saved.id })
}))
app.delete('/api/work/company/integrations/:id', requireWorkAuth, requireCompanyAdmin, wrap((req, res) => res.json(store.deleteCompanyIntegration(req.workUser.companyId, req.params.id))))
app.post('/api/work/company/integrations/:id/test', requireWorkAuth, requireCompanyAdmin, async (req, res) => {
  try {
    const integ = store.listCompanyIntegrations(req.workUser.companyId).find((i) => i.id === req.params.id)
    if (!integ) return res.status(404).json({ error: 'Integration not found.' })
    const company = store.getCompany(req.workUser.companyId)
    const payload = integrations.normalizeAlert({ type: 'test', displayName: req.workUser.displayName || req.workUser.username, email: req.workUser.email, companyRole: 'company_admin', companyId: req.workUser.companyId, call: 'test', sessionTitle: 'Integration test', categories: 'test x1', redactedTotal: 1, at: new Date().toISOString() }, (company && company.name) || '')
    payload.title = 'WorkCoPilot: test alert'
    payload.summary = 'This is a test alert from WorkCoPilot, confirming the integration is connected.'
    await integrations.sendTo(integ, payload)
    store.markIntegrationRelay(req.workUser.companyId, integ.id, true)
    res.json({ ok: true })
  } catch (e) {
    try { store.markIntegrationRelay(req.workUser.companyId, req.params.id, false, e && e.message) } catch { /* ignore */ }
    res.status(502).json({ error: (e && e.message) || 'Test failed.' })
  }
})
registerWorkBillingRoutes(app, { store, requireWorkAuth, requireAuth, requireSuperAdmin, requireAiStepUp, wrap })
registerAffiliateRoutes(app, { store, requireWorkAuth, requireAuth, requireAffiliateAdmin, requireSuperAdmin, requireAiStepUp, wrap })

// Public: the Windows desktop installer. A bare /downloads/... path hits the
// nginx catch-all and returns the SPA HTML (a ~6 KB file renamed .exe), so it
// MUST be served via an /api/work path that reaches this app, before the catch-all.
app.get('/api/work/desktop-setup.exe', (req, res) => {
  const f = path.join(ROOT, 'downloads', 'WorkCoPilot-Setup.exe')
  if (!fs.existsSync(f)) return res.status(404).json({ error: 'The installer is not published yet.' })
  res.setHeader('Content-Type', 'application/octet-stream')
  res.setHeader('Content-Disposition', 'attachment; filename="WorkCoPilot-Setup.exe"')
  res.sendFile(f)
})

// Public: the security and privacy paper. Served via an /api/work path so it
// reaches this app (a bare /x.pdf would hit the nginx catch-all). The file ships
// in dist (from public/), so one web deploy carries it. MUST be registered
// before the /api catch-all below, or that 404s it.
app.get('/api/work/security-paper.pdf', (req, res) => {
  const f = path.join(DIST, 'WorkCoPilot-Security-and-Privacy.pdf')
  if (!fs.existsSync(f)) return res.status(404).json({ error: 'Not found' })
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', 'inline; filename="WorkCoPilot-Security-and-Privacy.pdf"')
  res.setHeader('Cache-Control', 'public, max-age=3600')
  res.sendFile(f)
})

// Unknown API route -> JSON 404 (never the SPA HTML).
app.use('/api', (req, res) => res.status(404).json({ error: 'Unknown API route' }))

// ---- static SPA -----------------------------------------------------------
if (fs.existsSync(DIST)) {
  app.use(express.static(DIST, {
    etag: true,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('index.html')) res.setHeader('Cache-Control', 'no-cache, must-revalidate')
      else if (/[.-][A-Za-z0-9_-]{8,}\.(js|css|woff2?|png|svg|jpg)$/.test(filePath)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
    },
  }))
  app.get('*', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, must-revalidate')
    res.sendFile(path.join(DIST, 'index.html'))
  })
} else {
  app.get('*', (req, res) => res.status(503).send(
    '<h1>WorkCoPilot</h1><p>The React app has not been built yet.</p><pre>npm run build</pre><p>then restart the server.</p>'))
}

// ---- crash-safe idle finalize ---------------------------------------------
// A copilot session left active with no activity for this long is auto-ended
// server-side (goal, steps and events were already saved as they happened). A
// summary is added best-effort when a runtime is available.
const WORK_IDLE_MS = 25 * 60 * 1000
const WORK_SWEEP_MS = 5 * 60 * 1000
let workSweeping = false
async function sweepIdleWorkSessions() {
  if (workSweeping) return
  workSweeping = true
  try {
    const stale = store.idleWorkSessionsToFinalize(WORK_IDLE_MS)
    for (const s of stale) {
      try {
        const rt = store.getWorkUserRuntime(s.workUserId)
        if (rt && rt.apiKey && !s.summary && (s.steps || []).length) {
          const summary = await work.workSummarize(ai, rt, { ...s, ...scrubForAi(s, store.workUserScrubOn(s.workUserId), s.workUserId) })
          store.setWorkSessionSummary(s.workUserId, s.id, summary)
        }
        store.endWorkSession(s.workUserId, s.id)
        console.log(`[work] auto-finalized idle session ${s.id}`)
      } catch (e) { console.warn(`[work] auto-finalize failed for ${s.id}: ${e.message}`) }
    }
  } catch (e) { console.warn(`[work] idle sweep error: ${e.message}`) }
  finally { workSweeping = false }
}

// Start listening. Returns a promise that resolves once the server is up.
export function start({ port } = {}) {
  const p = port || PORT
  return new Promise((resolve) => {
    const srv = app.listen(p, () => {
      console.log('')
      console.log('  WorkCoPilot  ->  http://localhost:' + p)
      console.log('  Sign in with the superadmin account (password printed above on first boot).')
      console.log('')
      const workIdleTimer = setInterval(sweepIdleWorkSessions, WORK_SWEEP_MS)
      if (workIdleTimer.unref) workIdleTimer.unref() // never keep the process alive just for a sweep
      // Company Brain: inject the store's master key (KEK) + per-tenant DEK custody
      // so the encrypted vector store reuses the one crypto scheme (single source of
      // truth). Configured once at boot, before any request is served.
      try {
        configureBrainCrypto({ getMasterKey: store.brainMasterKey })
        configureBrainStore({ getWrappedDek: store.getCompanyBrainDek, setWrappedDek: store.setCompanyBrainDek, getCustody: store.getCompanyBrainCustody })
      } catch (e) { console.warn(`[work] brain configure error: ${e.message}`) }
      // Idle auto-lock: lock customer-custody brains whose unlock window has elapsed, so a
      // DEK is never resident longer than the window (time-boxed runtime exposure).
      const brainLockTimer = setInterval(() => {
        const now = Date.now()
        for (const [cid, ts] of _brainUnlockedAt) { if (now - ts > BRAIN_UNLOCK_WINDOW_MS) { try { brainLock(cid) } catch { /* best-effort */ } _brainUnlockedAt.delete(cid) } }
      }, 60 * 1000)
      if (brainLockTimer.unref) brainLockTimer.unref()
      // One-time migration: re-scrub stored skills + KB learnings through the
      // policy-aware chokepoint (closes the historical raw-storage gap). Idempotent
      // and guarded, so it is a no-op on every boot after the first.
      try { const m = store.migrateScrubStoredText(); if (m && !m.skipped) console.log(`[work] stored-text scrub migration: ${m.redacted} value(s) stripped across ${m.records} record(s)`) } catch (e) { console.warn(`[work] stored-text scrub migration error: ${e.message}`) }
      // Data-retention sweep: auto-purge sessions past the superadmin window. Runs
      // once at startup and hourly; a no-op while retention is off (the default).
      const runRetention = () => { try { const r = store.purgeOldWorkSessions(); if (r.purged) console.log(`[work] retention: purged ${r.purged} session(s) older than ${r.retentionDays}d`) } catch (e) { console.warn(`[work] retention sweep error: ${e.message}`) } }
      runRetention()
      const workRetentionTimer = setInterval(runRetention, 60 * 60 * 1000)
      if (workRetentionTimer.unref) workRetentionTimer.unref()
      // Periodic AI-model research (owner directive): on a daily cadence, recompute
      // the best/cheapest recommendation across the configured providers against
      // their LIVE catalogs, so the superadmin's "AI Research" view stays current
      // without anyone clicking refresh. Skipped quietly when no provider is set.
      const refreshAiResearch = async () => {
        try {
          const runtimes = store.getConfiguredRuntimes()
          if (!runtimes.length) return
          if (store.getWorkAiRecommendation()) return   // still fresh (24h cache)
          const data = await computeAiRecommendation(runtimes)
          store.setWorkAiRecommendation(data)
          console.log('[work] ai-research: recommendation refreshed')
        } catch (e) { console.warn(`[work] ai-research refresh error: ${e.message}`) }
      }
      setTimeout(refreshAiResearch, 20000)   // once shortly after boot
      const aiResearchTimer = setInterval(refreshAiResearch, 24 * 60 * 60 * 1000)
      if (aiResearchTimer.unref) aiResearchTimer.unref()
      resolve(srv)
    })
  })
}

// Auto-start only when run directly (`node server/index.js`).
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  start()
}

export { app }
