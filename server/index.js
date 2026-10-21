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
import { buildWorkReportPdf, buildDeliverablesPdf } from './pdf.js'
import { registerWorkAdminRoutes } from './work-admin.js'
import { registerWorkShotRoutes } from './work-shots.js'
import { registerWorkDocsRoutes } from './work-docs.js'
import { registerWorkImageRoutes } from './work-images.js'
import { registerSsoRoutes } from './sso.js'
import { registerWorkBillingRoutes, workStripeWebhook, billingConfigured } from './billing.js'
import { scrubSensitive, scrubWithPolicy, redactionSummary, POLICY_CATEGORIES } from './work-scrub.js'
import { COMPLIANCE_PRESETS, COMPLIANCE_LABELS } from './compliance-presets.js'

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
app.use(session({
  name: 'workcopilot.sid',
  store: new FileSessionStore(),
  secret: process.env.SESSION_SECRET || store.newSessionSecret(),
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', secure: HOSTED, maxAge: 1000 * 60 * 60 * 8 }, // 8h
}))

// ---- helpers --------------------------------------------------------------
const wrap = (fn) => (req, res) => {
  try { fn(req, res) }
  catch (e) { res.status(e.status || 500).json({ error: e.message || 'Server error' }) }
}
// One place that turns a verified user into a live session, so epoch/loginAt are
// never set on one path and forgotten on another.
function establishSession(req, u) {
  req.session.uid = u.id
  req.session.loginAt = Date.now()
  req.session.epoch = store.getSessionEpoch(u.id)
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
// WorkCoPilot auth: a signed-in account always has WorkCoPilot access (it IS the
// account). Sets req.user + req.workUser (the same record).
function requireWorkAuth(req, res, next) {
  const u = req.session.uid && store.getUser(req.session.uid)
  if (!u) return res.status(401).json({ error: 'Not signed in' })
  if ((req.session.epoch || 0) !== store.getSessionEpoch(u.id)) {
    return req.session.destroy(() => res.status(401).json({ error: 'Signed out.', loggedOut: true }))
  }
  req.user = u
  req.workUser = store.ensureWorkUser(u.id, u.username)
  next()
}
// Billing gate for the "use the service" actions (start a session + the
// guidance calls). Free signup still gives dashboard access, so /me, /signup
// and viewing are never gated - only the actions that actually guide. Runs
// AFTER requireWorkAuth (needs req.workUser). Company members are covered by the
// company; a personal account needs a live plan.
function requireWorkSubscription(req, res, next) {
  // Enforce subscriptions only once billing is actually configured (so existing
  // users are never locked out before Stripe is set up), and always let admins
  // and superadmins through for operator testing. "Configured" is a usable
  // secret key from the store (superadmin set it in the console) OR the env var.
  if (!billingConfigured(store)) return next()
  if (req.user && (req.user.role === 'superadmin' || req.user.role === 'admin')) return next()
  if (!store.userCanUseService(req.workUser.id)) {
    return res.status(402).json({ error: 'A subscription is needed to start guiding.', needsSubscription: true })
  }
  next()
}
const ADMIN_ROLES = new Set(['admin', 'superadmin'])
function requireAdmin(req, res, next) {
  if (!req.user || !ADMIN_ROLES.has(req.user.role)) return res.status(403).json({ error: 'Admin access required' })
  next()
}
function requireSuperAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'superadmin') return res.status(403).json({ error: 'Superadmin only.' })
  next()
}
// A company admin manages users within their OWN company. Superadmin passes too.
// Must run AFTER requireWorkAuth (needs req.user + req.workUser).
function requireCompanyAdmin(req, res, next) {
  if (req.user && req.user.role === 'superadmin') return next()
  const wu = req.workUser
  if (!wu || wu.companyRole !== 'company_admin' || !wu.companyId) return res.status(403).json({ error: 'Company admin access required.' })
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

// ---- WorkCoPilot vision model resolution ----------------------------------
// WorkCoPilot needs a VISION model (it reads the screen). Pick the cheapest
// capable model per provider so the continuous watch stays cheap (the client
// already downscales frames and only sends on change).
const WORK_VISION_PREF = {
  gemini: [/flash-lite-latest/i, /gemini-3(\.\d)?-flash-lite/i, /flash-latest/i, /2\.0-flash(?!-lite)/i, /gemini-3(\.\d)?-flash\b/i, /flash-image/i],
  openai: [/gpt-4o-mini(?!-transcribe|-search|-audio)/i, /4\.1-nano/i, /4\.1-mini/i, /gpt-4o(?!-mini|-transcribe|-audio)/i, /gpt-4\.1\b/i, /o4-mini/i],
  groq: [/scout/i, /maverick/i, /llama.*vl/i, /vision/i],
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
  const platform = store.getWorkPlatformAllowed()
  const cfgs = platform ? store.getConfiguredRuntimes() : [store.getWorkUserRuntime(req.workUser.id)].filter(Boolean)
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
// Resolve the runtime a request should use. needVision=true requires a vision
// model (plan-with-frame, watch, ask) or we 400 with the fix. Never silently
// no-ops: if nothing is ready, say exactly what to do.
async function resolveWorkRuntime(req, res, { needVision = false } = {}) {
  const v = await findWorkVision(req)
  if (v) { try { v.strong = await findWorkVisionStrong(req, v) } catch { v.strong = null } return v }
  const platform = store.getWorkPlatformAllowed()
  const base = platform ? store.getActiveRuntime() : store.getWorkUserRuntime(req.workUser.id)
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
      error: platform
        ? 'The platform AI has no vision-capable model, so WorkCoPilot cannot read the screen. Ask the administrator to add a Gemini or OpenAI key in AI Settings.'
        : 'Your AI key has no vision-capable model, so WorkCoPilot cannot read the screen. Use a provider or model that can see images (Gemini, GPT-4o, or Llama 4 Scout), then test it again.',
      needsVision: true,
    })
    return null
  }
  return { rt: base, visionModel: null, strong: null }
}
// Pick the runtime for a single vision call. `deep` (the user's manual escalate)
// uses the stronger model as primary; otherwise the cheap model is primary and
// the stronger one is the just-in-time auto backup (used only on failure/weak).
function workCallRuntime(rr, deep) {
  if (deep && rr.strong) return { rt: rr.strong.rt, visionModel: rr.strong.visionModel, backup: null, forcedStrong: true, strongModel: rr.strong.visionModel }
  const backup = rr.strong ? { cfg: rr.strong.rt, visionModel: rr.strong.visionModel } : null
  return { rt: rr.rt, visionModel: rr.visionModel, backup, forcedStrong: false, strongModel: rr.strong ? rr.strong.visionModel : null }
}
// Best-effort web research so the plan reflects the LATEST UI/URLs/best practice
// over the model's possibly-stale memory. Uses Tavily when WORK_TAVILY_KEY is
// set; otherwise returns '' (planning still works from model knowledge). Never
// blocks or throws into a request.
async function workResearchNotes(goal) {
  const g = String(goal || '').trim()
  if (!g || !WORK_TAVILY_KEY) return ''
  try {
    const year = new Date().getFullYear()
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: WORK_TAVILY_KEY,
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

// ===========================================================================
// Auth / session
// ===========================================================================
// WorkCoPilot sign-in (the only login the standalone client uses).
app.post('/api/work/login', wrap((req, res) => {
  const { username, password } = req.body || {}
  const u = store.findUser(username)
  if (!store.verifyPassword(u, password || '')) {
    return res.status(401).json({ error: 'Invalid username or password' })
  }
  establishSession(req, u)
  res.json({ user: store.publicWorkUser(u) })
}))
// Public signup: a new WorkCoPilot account (role user), signed in immediately.
app.post('/api/work/signup', wrap((req, res) => {
  const { username, password } = req.body || {}
  const u = store.createWorkUser({ username, password })
  establishSession(req, u)
  res.json({ user: store.publicWorkUser(u) })
}))
// Soft identity check used on boot + polling, and by the admin console.
app.get('/api/work/me', (req, res) => {
  const u = req.session.uid && store.getUser(req.session.uid)
  if (!u) return res.json({ user: null, signedIn: false, access: false })
  if ((req.session.epoch || 0) !== store.getSessionEpoch(u.id)) {
    return req.session.destroy(() => res.json({ user: null, signedIn: false, access: false, loggedOut: true }))
  }
  res.json({ user: store.publicWorkUser(store.ensureWorkUser(u.id, u.username)), signedIn: true, access: true })
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
  } catch (e) { res.status(e.status || 500).json({ error: e.message || 'Server error' }) }
})

// ---- app download (gated on AI readiness) ---------------------------------
const WORK_DESKTOP_FILE = 'WorkCoPilot-Setup.exe'
const WORK_APK_FILE = 'WorkCoPilot.apk'
app.get('/api/work/app/status', requireWorkAuth, wrap((req, res) => {
  const dir = path.join(ROOT, 'downloads')
  res.json({
    ready: store.workUserReady(req.workUser.id),
    desktop: { available: fs.existsSync(path.join(dir, WORK_DESKTOP_FILE)) },
    android: { available: fs.existsSync(path.join(dir, WORK_APK_FILE)) },
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

// ===========================================================================
// Admin (console writes; reads are registered by work-admin.js)
// ===========================================================================
// Allow/deny WorkCoPilot users to use the PLATFORM AI key.
app.get('/api/work/admin/platform-ai', requireAuth, requireAdmin, wrap((req, res) => {
  res.json({ platformAiAllowed: store.getWorkPlatformAllowed() })
}))
app.post('/api/work/admin/platform-ai', requireAuth, requireAdmin, wrap((req, res) => {
  if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Superadmin only.' })
  res.json(store.setWorkPlatformAllowed(!!(req.body || {}).allowed))
}))
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

// ===========================================================================
// Sessions
// ===========================================================================
app.post('/api/work/sessions', requireWorkAuth, requireWorkSubscription, wrap((req, res) => {
  const { title, goal, scope } = req.body || {}
  res.json({ session: store.createWorkSession(req.workUser.id, { title, goal, scope }) })
}))
app.get('/api/work/sessions', requireWorkAuth, wrap((req, res) => {
  res.json({ sessions: store.listWorkSessions(req.workUser.id) })
}))
app.get('/api/work/sessions/:id', requireWorkAuth, wrap((req, res) => {
  const s = store.getWorkSession(req.workUser.id, req.params.id)
  if (!s) return res.status(404).json({ error: 'Session not found' })
  res.json({ session: s })
}))
app.delete('/api/work/sessions/:id', requireWorkAuth, wrap((req, res) => {
  res.json(store.deleteWorkSession(req.workUser.id, req.params.id))
}))
app.post('/api/work/sessions/:id/goal', requireWorkAuth, wrap((req, res) => {
  res.json({ session: store.setWorkSessionGoal(req.workUser.id, req.params.id, (req.body || {}).goal) })
}))

// Plan: turn the goal (plus an optional first frame) into the ordered checklist.
app.post('/api/work/sessions/:id/plan', requireWorkAuth, requireWorkSubscription, async (req, res) => {
  try {
    const s = store.getWorkSession(req.workUser.id, req.params.id)
    if (!s) return res.status(404).json({ error: 'Session not found' })
    const { goal, frame, mode } = req.body || {}
    if (goal != null) store.setWorkSessionGoal(req.workUser.id, req.params.id, goal)
    const useMode = work.normalizeMode(mode != null ? mode : s.mode)
    if (mode != null) store.setWorkSessionMode(req.workUser.id, req.params.id, useMode)
    const useGoal = (goal != null ? goal : s.goal) || ''
    if (!String(useGoal).trim()) return res.status(400).json({ error: 'Add a goal first.' })
    const r = await resolveWorkRuntime(req, res, { needVision: !!frame }); if (!r) return
    const call = workCallRuntime(r, !!(req.body && req.body.deep))
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
    const planGoal = safeGoal + (scopeBrief ? '\n\n' + scopeBrief : '')
    const research = await Promise.race([
      workResearchNotes(safeGoal),
      new Promise((resolve) => setTimeout(() => resolve(''), 15000)),
    ]).catch(() => '')
    const rawDocs = store.getWorkDocsText(req.workUser.id, { maxChars: 6000 })
    const docScrub = scrubText(rawDocs)
    const userDocs = docScrub.clean
    const groundedResearch = userDocs
      ? (`USER-PROVIDED REFERENCE DOCUMENTS (ground the steps in these and fit the user's environment, but verify against best practice: if a document is wrong, outdated, risky or suboptimal, flag it, give the best proven alternative, and note why - do not follow it blindly):\n${userDocs}\n\n` + (research || ''))
      : research
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
    const plan = await work.workPlan(ai, call.rt, {
      base: store.getSystemPrompt(), mode: useMode, goal: planGoal, frame: frame || null, visionModel: call.visionModel, appContext: s.appContext || '', research: groundedResearch, strong: call.backup,
    })
    if (plan.refusal) {
      store.appendWorkEvent(req.workUser.id, req.params.id, { kind: 'flag', text: 'Declined: ' + plan.refusal })
      const cur = store.getWorkSession(req.workUser.id, req.params.id)
      return res.json({ session: cur, steps: cur.steps, refusal: plan.refusal })
    }
    if (frame && (plan.escalated || call.forcedStrong)) store.appendWorkEvent(req.workUser.id, req.params.id, { kind: 'ai', text: `Planned with a stronger model (${call.strongModel || 'backup'})${call.forcedStrong ? ' - deep pass you asked for' : ' to get a usable plan'}.` })
    store.setWorkSessionSteps(req.workUser.id, req.params.id, plan.steps)
    if (plan.appContext) store.setWorkAppContext(req.workUser.id, req.params.id, plan.appContext)
    const updated = store.getWorkSession(req.workUser.id, req.params.id)
    res.json({ session: updated, steps: updated.steps, appContext: updated.appContext })
  } catch (e) { res.status(e.status || 500).json({ error: e.message || 'Server error' }) }
})

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
    const out = await work.workScope(ai, call.rt, { goal: safeGoal, tier })
    res.json(out)
  } catch (e) { res.status(e.status || 500).json({ error: e.message || 'Server error' }) }
})

// Deliverables: for a review/design task, analyze the captured page(s) + the
// goal + the scope and return the findings and the two generation prompts, plus
// the assembled Markdown document. Vision when frames are supplied; platform model.
app.post('/api/work/sessions/:id/deliverables', requireWorkAuth, requireWorkSubscription, async (req, res) => {
  try {
    const s = store.getWorkSession(req.workUser.id, req.params.id)
    if (!s) return res.status(404).json({ error: 'Session not found' })
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
    const documentMd = work.workDeliverablesDocument({ goal: safeGoal, d })
    store.setWorkDeliverables(req.workUser.id, req.params.id, d)   // so the PDF endpoint can render it
    store.appendWorkEvent(req.workUser.id, req.params.id, { kind: 'ai', text: 'Built the review and the generation prompts.' })
    res.json({ deliverables: d, documentMd })
  } catch (e) { res.status(e.status || 500).json({ error: e.message || 'Server error' }) }
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
  if (scope && scope.companyId && req.workUser && req.workUser.companyRole === 'company_admin' && String(req.workUser.companyId) === String(scope.companyId)) return true
  if (scope && scope.userId && req.workUser && String(req.workUser.id) === String(scope.userId)) return true
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
    store.appendWorkAudit(req.params.id, { call: 'watch', model: call.visionModel || rr.visionModel || null, scrub: watchScrubOn, frame: 'screenshot sent', sent: `[continuous screen navigation against the plan] goal: ${watchGoal}` })
    const r = await work.workNavigate(ai, call.rt, {
      base: store.getSystemPrompt(), mode: work.normalizeMode(s.mode), goal: watchGoal, steps: s.steps, currentStep: s.currentStep,
      frame, visionModel: call.visionModel, strong: call.backup,
    })
    const escalated = r.escalated || call.forcedStrong
    const usedModel = call.forcedStrong ? call.visionModel : (r.escalated ? call.strongModel : rr.visionModel)
    const updated = store.applyWorkNav(req.workUser.id, req.params.id, {
      completed: r.completed, curIdx: (r.current != null ? r.current : null), guidance: r.guidance,
    })
    if (r.flag) store.appendWorkEvent(req.workUser.id, req.params.id, { kind: 'flag', text: r.flag })
    if (escalated) store.appendWorkEvent(req.workUser.id, req.params.id, { kind: 'ai', text: `Used a stronger model (${usedModel || 'backup'})${call.forcedStrong ? ' - deep pass' : ' to resolve this step'}.` })
    const allDone = r.done || updated.currentStep >= updated.steps.length
    res.json({
      status: r.flag ? 'wrong' : (allDone ? 'done' : 'working'),
      observation: r.observation, flag: r.flag, guidance: r.guidance,
      index: updated.currentStep, step: updated.steps[updated.currentStep] || null,
      done: allDone, steps: updated.steps, escalated, model: usedModel,
    })
  } catch (e) { res.status(e.status || 500).json({ error: e.message || 'Server error' }) }
})

// Ask: on-demand "what is this / what do I do here", grounded in the goal + frame.
app.post('/api/work/sessions/:id/ask', requireWorkAuth, requireWorkSubscription, async (req, res) => {
  try {
    const s = store.getWorkSession(req.workUser.id, req.params.id)
    if (!s) return res.status(404).json({ error: 'Session not found' })
    const { question, frame } = req.body || {}
    if (!frame) return res.status(400).json({ error: 'No screen frame supplied.' })
    const rr = await resolveWorkRuntime(req, res, { needVision: true }); if (!rr) return
    const call = workCallRuntime(rr, !!(req.body && req.body.deep))
    const askScrubOn = store.workUserScrubOn(req.workUser.id)
    const sa = scrubForAi(s, askScrubOn, req.workUser.id)
    const qScrub = askScrubOn ? scrubSensitive(question || '') : { clean: question || '', counts: {}, total: 0 }
    store.appendWorkAudit(req.params.id, { call: 'ask', model: call.visionModel || rr.visionModel || null, scrub: askScrubOn, redacted: qScrub.total, frame: 'screenshot sent', sent: qScrub.clean || '[question about the current screen]' })
    const out = await work.workAsk(ai, call.rt, {
      base: store.getSystemPrompt(), mode: work.normalizeMode(s.mode), goal: sa.goal,
      question: qScrub.clean, steps: s.steps || [], currentStep: s.currentStep || 0,
      events: sa.events, appContext: s.appContext || '', frame, visionModel: call.visionModel, strong: call.backup,
    })
    if (qScrub.total) store.appendWorkEvent(req.workUser.id, req.params.id, { kind: 'ai', text: redactionSummary(qScrub.counts) })
    const escalated = out.escalated || call.forcedStrong
    const usedModel = call.forcedStrong ? call.visionModel : (out.escalated ? call.strongModel : rr.visionModel)
    if (question) store.appendWorkEvent(req.workUser.id, req.params.id, { kind: 'ask', text: String(question) })
    store.appendWorkEvent(req.workUser.id, req.params.id, { kind: 'answer', text: out.answer })
    if (escalated) store.appendWorkEvent(req.workUser.id, req.params.id, { kind: 'ai', text: `Answered with a stronger model (${usedModel || 'backup'})${call.forcedStrong ? ' - deep pass' : ''}.` })
    res.json({ answer: out.answer, escalated, model: usedModel })
  } catch (e) { res.status(e.status || 500).json({ error: e.message || 'Server error' }) }
})

// Drill-down: expand ONE action ("how do I do this?") into a detailed sub-step
// checklist, grounded + scrubbed, stored under the step so it is part of the goal.
app.post('/api/work/sessions/:id/howto', requireWorkAuth, requireWorkSubscription, async (req, res) => {
  try {
    const s = store.getWorkSession(req.workUser.id, req.params.id)
    if (!s) return res.status(404).json({ error: 'Session not found' })
    const { action, stepIndex, frame } = req.body || {}
    const scrubOn = store.workUserScrubOn(req.workUser.id)
    const act = scrubIf(scrubOn, String(action || "").trim(), req.workUser.id)
    if (!act) return res.status(400).json({ error: 'No action to explain.' })
    const rr = await resolveWorkRuntime(req, res, { needVision: !!frame }); if (!rr) return
    const call = workCallRuntime(rr, !!(req.body && req.body.deep))
    const safeGoal = scrubIf(scrubOn, s.goal || "", req.workUser.id)
    const notes = await Promise.race([
      workResearchNotes(`${act} ${safeGoal}`),
      new Promise((resolve) => setTimeout(() => resolve(''), 12000)),
    ]).catch(() => '')
    const userDocs = scrubIf(scrubOn, store.getWorkDocsText(req.workUser.id, { maxChars: 4000 }), req.workUser.id)
    const grounded = userDocs
      ? (`USER REFERENCE DOCUMENTS (ground in these, but verify against best practice and flag anything wrong):\n${userDocs}\n\n` + (notes || ''))
      : notes
    const out = await work.workHowTo(ai, call.rt, {
      base: store.getSystemPrompt(), mode: work.normalizeMode(s.mode), goal: safeGoal, action: act,
      frame: frame || null, visionModel: call.visionModel, appContext: s.appContext || '', research: grounded, strong: call.backup,
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
    res.json({ steps: saved, escalated, model: call.forcedStrong ? call.visionModel : (out.escalated ? call.strongModel : rr.visionModel) })
  } catch (e) { res.status(e.status || 500).json({ error: e.message || 'Server error' }) }
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
  if (!s && req.user && req.user.role === 'superadmin') {
    // superadmin can pull any session's audit log
    s = (store.listAllWorkSessions ? store.listAllWorkSessions() : []).find((x) => x.id === req.params.id) || { id: req.params.id, goal: '' }
  }
  if (!s) return res.status(404).json({ error: 'Session not found' })
  const text = store.formatWorkAuditLog(req.params.id, s)
  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="workcopilot-${req.params.id}-audit.log"`)
  res.send(text)
}))

app.get('/api/work/sessions/:id/report.pdf', requireWorkAuth, async (req, res) => {
  try {
    const s = store.getWorkSession(req.workUser.id, req.params.id)
    if (!s) return res.status(404).json({ error: 'Session not found' })
    let achieved = s.summary || ''
    if (!achieved) {
      try {
        const rt = store.getWorkUserRuntime(req.workUser.id)
        if (rt) { achieved = await work.workSummarize(ai, rt, { ...s, ...scrubForAi(s, store.workUserScrubOn(req.workUser.id), req.workUser.id) }); if (achieved) store.setWorkSessionSummary(req.workUser.id, req.params.id, achieved) }
      } catch { /* leave empty; the PDF falls back to the list of done steps */ }
    }
    const modeLabel = (work.WORK_MODES.find((m) => m.id === work.normalizeMode(s.mode)) || {}).label || ''
    const fname = `workcopilot-${String(s.startedAt || '').slice(0, 10) || 'session'}.pdf`
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `${req.query.dl ? 'attachment' : 'inline'}; filename="${fname}"`)
    buildWorkReportPdf(s, res, { achieved, modeLabel })
  } catch (e) { res.status(e.status || 500).json({ error: e.message || 'Server error' }) }
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
      workResearchNotes(safeQuestion || safeGoal),
      new Promise((resolve) => setTimeout(() => resolve(''), 15000)),
    ]).catch(() => '')
    const answer = await work.workResearch(ai, rr.rt, {
      base: store.getSystemPrompt(), goal: safeGoal, question: safeQuestion, research: notes,
      steps: s.steps || [], currentStep: s.currentStep || 0,
    })
    if (question) store.appendWorkEvent(req.workUser.id, req.params.id, { kind: 'ask', text: 'Research: ' + question })
    store.appendWorkEvent(req.workUser.id, req.params.id, { kind: 'answer', text: answer })
    res.json({ answer, hadResearch: !!notes })
  } catch (e) { res.status(e.status || 500).json({ error: e.message || 'Server error' }) }
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
// Pricing is public (the marketing site reads it); superadmin can change it.
app.get('/api/work/pricing', wrap((req, res) => { res.json(store.getWorkPricing()) }))

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
  const generic = {
    verdict: 'covered', plan: null, product: 'WorkCoPilot', degraded: true,
    answer: 'WorkCoPilot guides you through almost any task on your screen, in any field, one exact step at a time. Sign in and describe your task to see exactly how it is covered.',
  }
  if (!store.getWorkPlatformAllowed()) return res.json(generic)
  const cfg = store.getActiveRuntime()
  if (!cfg) return res.json(generic)
  try {
    res.json(await work.workCoverage(ai, cfg, { question, pricing: store.getWorkPricing() }))
  } catch (e) {
    res.json(generic)   // never show a public visitor an error; flagged degraded
  }
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
  res.json({ company: store.getCompany(cid), users: store.listCompanyUsers(cid) })
}))
app.post('/api/work/company/users', requireWorkAuth, requireCompanyAdmin, wrap((req, res) => {
  const cid = req.workUser.companyId
  const { username, password, companyRole, tier } = req.body || {}
  // A company admin can only create into their OWN company. Scrub stays governed
  // by the company policy (they cannot grant a weaker policy than the company's).
  res.json(store.createManagedUser({ username, password, companyId: cid, companyRole: companyRole === 'company_admin' ? 'company_admin' : 'member', tier }))
}))

app.post('/api/work/admin/pricing', requireAuth, requireSuperAdmin, wrap((req, res) => { res.json(store.setWorkPricing(req.body || {})) }))

// Manual step control (the user ticks/unticks or skips).
app.post('/api/work/sessions/:id/step', requireWorkAuth, wrap((req, res) => {
  const { index, status } = req.body || {}
  if (!['done', 'current', 'pending'].includes(status)) return res.status(400).json({ error: 'Bad status' })
  const s = store.updateWorkStep(req.workUser.id, req.params.id, Number(index), status)
  res.json({ session: s, steps: s.steps, index: s.currentStep })
}))

// Draft an email / message about the task (read-only output to paste).
app.post('/api/work/sessions/:id/draft', requireWorkAuth, async (req, res) => {
  try {
    const s = store.getWorkSession(req.workUser.id, req.params.id)
    if (!s) return res.status(404).json({ error: 'Session not found' })
    const rr = await resolveWorkRuntime(req, res, {}); if (!rr) return
    const draft = await work.workDraft(ai, rr.rt, { base: store.getSystemPrompt(), goal: s.goal || '', ask: (req.body || {}).ask || '', session: s })
    res.json({ draft })
  } catch (e) { res.status(e.status || 500).json({ error: e.message || 'Server error' }) }
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
  } catch (e) { res.status(e.status || 500).json({ error: e.message || 'Server error' }) }
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
registerWorkBillingRoutes(app, { store, requireWorkAuth, requireAuth, requireSuperAdmin, wrap })

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
      resolve(srv)
    })
  })
}

// Auto-start only when run directly (`node server/index.js`).
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  start()
}

export { app }
