// Thin fetch wrapper. Same-origin, cookie session (credentials: 'include').
// Running inside the AI Cloud desktop app (window.refigold exists) we tag every
// request so the server can tell an app sign-in from a browser one - company
// users may only sign in through the app.
import { clean, rehydrateDeep } from './scrub.js'   // client-side DLP: strip/tokenize before sending, rehydrate tokens in responses
const IS_APP = typeof window !== 'undefined' && !!window.refigold
async function req(method, url, body) {
  const headers = {}
  if (body) headers['Content-Type'] = 'application/json'
  if (IS_APP) headers['X-Refigold-App'] = '1'
  const res = await fetch(url, {
    method,
    credentials: 'include',
    headers: Object.keys(headers).length ? headers : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  let data = null
  try { data = await res.json() } catch { /* no body */ }
  if (!res.ok) {
    const err = new Error((data && data.error) || `Request failed (${res.status})`)
    err.status = res.status
    err.data = data || null          // full response body (e.g. taskLimit, mustCompleteCurrent, activeTaskId)
    throw err
  }
  // On-device rehydrate: substitute tokenized values back into the response so
  // the user sees the full answer (no-op unless tokenize mode captured something).
  return rehydrateDeep(data)
}

// Map a caught error to user-safe copy for NON-superadmin surfaces. Known,
// actionable statuses (402 payment required, 403 forbidden, 409 conflict - e.g.
// finish-the-current-task, 429 rate limited) keep their server message, which is
// already written for end users. Everything else (500s, network drops, parse
// failures, raw internals) collapses to one calm, non-technical line so stack
// text, server detail, or any model/provider name can never reach an end user.
// Superadmin-only surfaces may still show err.message directly.
export function friendlyError(err, fallback) {
  const generic = fallback || 'WorkCoPilot is busy, please try again in a moment.'
  if (!err) return generic
  const status = err.status
  const msg = typeof err.message === 'string' ? err.message.trim() : ''
  if (msg && (status === 402 || status === 403 || status === 409 || status === 429)) return msg
  return generic
}

export const api = {
  // auth
  login: (username, password) => req('POST', '/api/login', { username, password }),
  loginVerify: (code) => req('POST', '/api/login/verify', { code }),
  loginRecovery: (key) => req('POST', '/api/login/recovery', { key }),
  resetPassword: (username, code, password) => req('POST', '/api/password/reset', { username, code, password }),
  // WorkCoPilot's own logout. NOT the bare /api/logout: nginx routes the generic
  // path to the sibling Refigoldmine app, so /api/logout never clears this
  // session (logout "did nothing" / flickered back). /api/work/logout hits :4000.
  logout: () => req('POST', '/api/work/logout'),
  me: () => req('GET', '/api/me'),
  // --- MeetAiGene (separate product, own login) ---
  meetMe: () => req('GET', '/api/meet/me'),
  meetSignup: (username, password) => req('POST', '/api/meet/signup', { username, password }),
  meetLogin: (username, password) => req('POST', '/api/meet/login', { username, password }),
  meetLogout: () => req('POST', '/api/meet/logout'),
  meetCreate: (title) => req('POST', '/api/meet/meetings', { title }),
  meetStart: (id, title) => req('POST', `/api/meet/meetings/${id}/start`, { title }),
  meetUploadDoc: (id, body) => req('POST', `/api/meet/meetings/${id}/doc`, body || {}),
  meetList: () => req('GET', '/api/meet/meetings'),
  meetGet: (id) => req('GET', `/api/meet/meetings/${id}`),
  meetDelete: (id) => req('DELETE', `/api/meet/meetings/${id}`),
  // body: { text } OR { audioBase64, mime }, plus { owner, speaker }
  meetTurn: (id, body) => req('POST', `/api/meet/meetings/${id}/turn`, body || {}),
  // body: { intent, question } OR { intent, audioBase64, mime }
  meetAsk: (id, body) => req('POST', `/api/meet/meetings/${id}/ask`, body || {}),
  meetEnroll: (body) => req('POST', '/api/meet/enroll', body || {}),
  meetSetProfile: (body) => req('POST', '/api/meet/profile', body || {}),
  meetStyle: () => req('GET', '/api/meet/style'),
  meetSetStyle: (body) => req('POST', '/api/meet/style', body || {}),
  meetNameSample: (body) => req('POST', '/api/meet/name-sample', body || {}),
  meetNameClear: () => req('POST', '/api/meet/name-sample/clear'),
  // body: { text } OR { audioBase64, mime }
  meetSetContext: (id, body) => req('POST', `/api/meet/meetings/${id}/context`, body || {}),
  meetFinalize: (id) => req('POST', `/api/meet/meetings/${id}/finalize`),
  // AI readiness (platform-allowed or own tested key) + app download gating
  meetAi: () => req('GET', '/api/meet/ai'),
  meetAiKey: (body) => req('POST', '/api/meet/ai/key', body || {}),
  meetAiTest: () => req('POST', '/api/meet/ai/test'),
  meetAppStatus: () => req('GET', '/api/meet/app/status'),
  // superadmin MeetAiGene config
  meetAdminGetPlatformAi: () => req('GET', '/api/meet/admin/platform-ai'),
  meetAdminSetPlatformAi: (allowed) => req('POST', '/api/meet/admin/platform-ai', { allowed }),
  meetAdminGetDeepgram: () => req('GET', '/api/meet/admin/deepgram'),
  meetAdminSetDeepgram: (apiKey, model) => req('POST', '/api/meet/admin/deepgram', { apiKey, model }),
  // --- WorkCoPilot (separate product, own login) ---
  workMe: () => req('GET', '/api/work/me'),
  workSignup: (body) => req('POST', '/api/work/signup', body || {}),
  workLogin: (username, password) => req('POST', '/api/work/login', { username, password }),
  // MFA (TOTP authenticator). Login may return { mfaSetup } (first login) or
  // { mfaRequired }; the client then calls one of these to finish signing in.
  workLoginMfaSetup: (code) => req('POST', '/api/work/login/mfa/setup', { code }),
  workLoginMfa: (code) => req('POST', '/api/work/login/mfa', { code }),
  workMfaStatus: () => req('GET', '/api/work/mfa/status'),
  workMfaResetSelf: (code) => req('POST', '/api/work/mfa/reset', { code }),
  workMfaRegenBackup: (code) => req('POST', '/api/work/mfa/backup/regenerate', { code }),
  workCompanyResetUserMfa: (id, reason) => req('POST', `/api/work/company/users/${id}/mfa/reset`, { reason }),
  workLogout: () => req('POST', '/api/work/logout'),
  workSetProfile: (body) => req('POST', '/api/work/profile', body || {}),
  // AI readiness (platform-allowed or own tested key, must have a vision model)
  workAi: () => req('GET', '/api/work/ai'),
  workAiKey: (body) => req('POST', '/api/work/ai/key', body || {}),
  workAiTest: () => req('POST', '/api/work/ai/test'),
  workAppStatus: () => req('GET', '/api/work/app/status'),
  // White-label company branding (logo + public contact) for the dashboard header.
  workMyCompany: () => req('GET', '/api/work/my-company'),
  // Executive productivity dashboard (company-scoped; no AI model or cost in it).
  workExecProductivity: (days) => req('GET', `/api/work/exec/productivity?days=${days || 30}`),
  // CSV export is a direct browser download (cookie-authed): link to this URL.
  workExecCsvUrl: (days) => `/api/work/exec/productivity.csv?days=${days || 30}`,
  // Billing (Stripe Checkout). workCheckout returns { url } to redirect to.
  workCheckout: (plan, cycle) => req('POST', '/api/work/checkout', { plan, cycle: cycle || 'monthly' }),
  workBuyCredits: (kind, quantity) => req('POST', '/api/work/checkout/credits', { kind, quantity }),
  workSubscription: () => req('GET', '/api/work/subscription'),
  // The account's Stripe invoices, and a Customer Portal link to manage/cancel.
  workInvoices: () => req('GET', '/api/work/invoices'),
  workBillingPortal: () => req('POST', '/api/work/billing/portal'),
  // sessions. Every free-text field is scrubbed CLIENT-SIDE (clean()) before it
  // leaves the browser, so raw PII/PHI/secrets never reach our server or the AI.
  workCreate: (body) => req('POST', '/api/work/sessions', { ...(body || {}), ...(body && body.goal != null ? { goal: clean(body.goal) } : {}) }),
  workList: () => req('GET', '/api/work/sessions'),
  workGet: (id) => req('GET', `/api/work/sessions/${id}`),
  workDelete: (id, reason) => req('DELETE', `/api/work/sessions/${id}${reason ? `?reason=${encodeURIComponent(reason)}` : ''}`),
  workTeamActivity: () => req('GET', '/api/work/team/activity'),
  workTeamAi: () => req('GET', '/api/work/team/ai'),
  workTeamSetAiKeys: (body) => req('POST', '/api/work/team/ai-keys', body || {}),
  // Company admin: view / backup / restore / clear the company knowledge base.
  // Clear + replace are destructive, so they require a reason (logged server-side).
  workTeamLearnings: () => req('GET', '/api/work/team/learnings'),
  workTeamLearningsExportUrl: () => '/api/work/team/learnings/export',   // direct cookie-authed download
  workTeamImportLearnings: (learnings, mode, reason) => req('POST', '/api/work/team/learnings/import', { learnings, mode, reason }),
  workTeamClearLearnings: (reason) => req('POST', '/api/work/team/learnings/clear', { reason }),
  // Company admin: this company's own web-search (Tavily) key (apiKey:'' clears),
  // and the best+cheapest model recommendation for the keys the company runs on.
  workTeamSetWebSearch: (apiKey, provider, reason) => req('POST', '/api/work/team/web-search', { apiKey, provider, ...(reason ? { reason } : {}) }),
  workTeamAiRecommendation: () => req('GET', '/api/work/team/ai-recommendation'),
  workSetGoal: (id, goal) => req('POST', `/api/work/sessions/${id}/goal`, { goal: clean(goal) }),
  // body: { goal?, frame? } (frame = downscaled data URL; when DLP is on it is
  // redacted on-device by frame_scrub before it is passed in by the component)
  workPlan: (id, body) => req('POST', `/api/work/sessions/${id}/plan`, { ...(body || {}), ...(body && body.goal != null ? { goal: clean(body.goal) } : {}) }),
  // Scope wizard: get the goal-specific requirement questions before planning.
  // `depth` ('quick' | 'detailed') is the interview length chosen on the wizard's
  // first step; omitted = the same body as before (backward compatible).
  workScope: (goal, depth) => req('POST', '/api/work/scope', { goal: clean(goal), ...(depth ? { depth } : {}) }),
  // Deliverables: analyze captured page(s) -> findings + two generation prompts + a document.
  workDeliverables: (id, frames) => req('POST', `/api/work/sessions/${id}/deliverables`, { frames: frames || [] }),
  workDeliverablesPdfUrl: (id, dl) => `/api/work/sessions/${id}/deliverables.pdf${dl ? '?dl=1' : ''}`,
  // body: { frame } -> { status, observation, flag, advanced, index, step, done, steps }
  workWatch: (id, body) => req('POST', `/api/work/sessions/${id}/watch`, body || {}),
  // body: { question?, frame }
  workAsk: (id, body) => req('POST', `/api/work/sessions/${id}/ask`, { ...(body || {}), ...(body && body.question != null ? { question: clean(body.question) } : {}) }),
  // Return the actual RESULT (not just steps). body: { question?, frame?, docsText?, deep? };
  // frame is optional (with it, reads the screen; without, computes from goal + pasted data).
  // Text is DLP-tokenized here before it leaves. -> { result: { kind, body, basis, verifyBy,
  // confidence, need, grounded, caveat }, escalated, model }
  workResult: (id, body) => req('POST', `/api/work/sessions/${id}/result`, { ...(body || {}), ...(body && body.question != null ? { question: clean(body.question) } : {}), ...(body && body.docsText != null ? { docsText: clean(body.docsText) } : {}) }),
  // Add context mid-task. body: { note?, docsText?, image?, frame? } where image =
  // an uploaded screenshot/photo (on-device redacted first when DLP is on), frame =
  // optional live screen. Text is DLP-tokenized here before it leaves. ->
  // { replanned, answer, reason, index, step, steps }
  workAddContext: (id, body) => req('POST', `/api/work/sessions/${id}/context`, { ...(body || {}), ...(body && body.note != null ? { note: clean(body.note) } : {}), ...(body && body.docsText != null ? { docsText: clean(body.docsText) } : {}) }),
  workStep: (id, index, status) => req('POST', `/api/work/sessions/${id}/step`, { index, status }),
  workCurrentStep: (id, index) => req('POST', `/api/work/sessions/${id}/current`, { index }),
  // Reference documents (Advanced & Premium): ground the plan in the user's own material.
  workDocsList: () => req('GET', '/api/work/docs'),
  workDocAdd: (payload) => req('POST', '/api/work/docs', payload),  // { name, mime, dataBase64 }
  workDocDelete: (id, reason) => req('DELETE', `/api/work/docs/${id}`, reason ? { reason } : undefined),
  // Drill-down "how?" on a step. body: { action, stepIndex?, frame? } -> { steps, escalated }
  workHowTo: (id, body) => req('POST', `/api/work/sessions/${id}/howto`, { ...(body || {}), ...(body && body.action != null ? { action: clean(body.action) } : {}) }),
  workModes: () => req('GET', '/api/work/modes'),
  workSetMode: (id, mode) => req('POST', `/api/work/sessions/${id}/mode`, { mode }),
  workReportUrl: (id, dl) => `/api/work/sessions/${id}/report.pdf${dl ? '?dl=1' : ''}`,
  workComplianceUrl: (id, dl, framework) => `/api/work/sessions/${id}/compliance.pdf?${[dl ? 'dl=1' : '', framework ? `framework=${encodeURIComponent(framework)}` : ''].filter(Boolean).join('&')}`,
  workComplianceFrameworks: () => req('GET', '/api/work/compliance/frameworks'),
  workComplianceEmail: (id, body) => req('POST', `/api/work/sessions/${id}/compliance/email`, body || {}),
  workContact: (body) => req('POST', '/api/work/contact', body || {}),
  // Affiliate program: public apply + program status; affiliate dashboard +
  // Stripe Connect onboarding (signed in as the affiliate's own account).
  affiliatePublic: () => req('GET', '/api/work/affiliate/public'),
  affiliateApply: (body) => req('POST', '/api/work/affiliate/apply', body || {}),
  affiliateDashboard: () => req('GET', '/api/work/affiliate/dashboard'),
  affiliateConnectOnboard: () => req('POST', '/api/work/affiliate/connect/onboard', {}),
  affiliateConnectRefresh: () => req('GET', '/api/work/affiliate/connect/refresh'),
  // Password: validate a set/reset token, set a new password, request a reset link.
  workPasswordToken: (token) => req('GET', `/api/work/password/token/${encodeURIComponent(token)}`),
  workPasswordSet: (token, password) => req('POST', '/api/work/password/set', { token, password }),
  workPasswordForgot: (login) => req('POST', '/api/work/password/forgot', { login }),
  workResearch: (id, question) => req('POST', `/api/work/sessions/${id}/research`, { question: clean(question) }),
  workUsage: () => req('GET', '/api/work/usage'),
  workHeartbeat: (id, seconds) => req('POST', '/api/work/usage/heartbeat', { sessionId: id, seconds }),
  workPause: (id, paused) => req('PATCH', `/api/work/sessions/${id}/pause`, { paused }),
  // Compose: WRITE the actual document. body: { want (what to write), format?
  // (email|document|outline|bullets|table|code|notes), docsText?, frame?, deep? }.
  // Text is DLP-tokenized before it leaves. -> { compose: { title, format, body,
  // basis, caveat }, escalated, model }
  workCompose: (id, body) => req('POST', `/api/work/sessions/${id}/compose`, { ...(body || {}), ...(body && body.want != null ? { want: clean(body.want) } : {}), ...(body && body.docsText != null ? { docsText: clean(body.docsText) } : {}) }),
  // On-device data compute (privacy-first): send ONLY { want, schema:[{name,type}],
  // rowCount } - NEVER the rows. Returns { spec, explanation, caveat, need, ok }.
  // The caller then runs the spec locally with runSpec() from server/compute_spec.js.
  workCompute: (id, body) => req('POST', `/api/work/sessions/${id}/compute`, { want: clean((body || {}).want || ''), schema: (body || {}).schema || [], rowCount: (body || {}).rowCount || 0 }),
  workFinalize: (id) => req('POST', `/api/work/sessions/${id}/finalize`),
  // company-admin: organization authorization attestation
  workTeamAuthorization: () => req('GET', '/api/work/team/authorization'),
  workTeamAttest: (byName) => req('POST', '/api/work/team/authorization', { attested: true, byName: clean(byName || '') }),
  // company-admin: the company's own data-retention window (days; 0 = keep forever)
  workTeamRetention: () => req('GET', '/api/work/team/retention'),
  workTeamSetRetention: (retentionDays) => req('POST', '/api/work/team/retention', { retentionDays }),
  // support tickets (user)
  workTicketCategories: () => req('GET', '/api/work/ticket-categories'),
  workTickets: () => req('GET', '/api/work/tickets'),
  workTicketCreate: (body) => req('POST', '/api/work/tickets', { ...(body || {}), subject: clean((body && body.subject) || ''), body: clean((body && body.body) || '') }),
  workTicketGet: (id) => req('GET', `/api/work/tickets/${id}`),
  workTicketReply: (id, text) => req('POST', `/api/work/tickets/${id}/reply`, { text: clean(text) }),
  // support tickets (superadmin)
  workAdminTickets: (q) => req('GET', `/api/work/admin/tickets${q && Object.keys(q).length ? '?' + new URLSearchParams(q) : ''}`),
  workAdminTicketGet: (id) => req('GET', `/api/work/admin/tickets/${id}`),
  workAdminTicketReply: (id, text) => req('POST', `/api/work/admin/tickets/${id}/reply`, { text }),
  workAdminTicketStatus: (id, status) => req('POST', `/api/work/admin/tickets/${id}/status`, { status }),
  // tenancy (superadmin): companies, managed users, scrub policy
  workAdminCompanies: () => req('GET', '/api/work/admin/companies'),
  workAdminCreateCompany: (body) => req('POST', '/api/work/admin/companies', body || {}),
  workAdminCompany: (id) => req('GET', `/api/work/admin/companies/${id}`),
  workAdminUpdateCompany: (id, patch) => req('PATCH', `/api/work/admin/companies/${id}`, patch || {}),
  workAdminCompanyScrub: (id, enabled) => req('POST', `/api/work/admin/companies/${id}/scrub`, { enabled }),
  workAdminCreateUser: (body) => req('POST', '/api/work/admin/users', body || {}),
  workAdminUserScrub: (id, enabled) => req('POST', `/api/work/admin/users/${id}/scrub`, { enabled }),
  workAdminUserCompany: (id, companyId, companyRole) => req('POST', `/api/work/admin/users/${id}/company`, { companyId, companyRole }),
  // company admin: manage own-company users
  workCompanyUsers: () => req('GET', '/api/work/company/users'),
  workCompanyCreateUser: (body) => req('POST', '/api/work/company/users', body || {}),
  workCompanyUpdateUser: (id, patch) => req('PATCH', `/api/work/company/users/${id}`, patch || {}),
  workCompanyRemoveUser: (id, reason) => req('DELETE', `/api/work/company/users/${id}`, { reason }),
  // company admin: this company's AI consumption so far (estimated $, per user)
  workTeamConsumption: () => req('GET', '/api/work/team/consumption'),
  // company admin: license + usage dashboard (seat pools, per-tier allocation,
  // minute pool, AI readiness, each person's usage) and the read-only bill.
  workTeamLicenses: () => req('GET', '/api/work/team/licenses'),
  workTeamBilling: () => req('GET', '/api/work/team/billing'),
  // company admin: give one member minutes from the shared company pool
  workCompanyAllocateMinutes: (id, minutes) => req('POST', `/api/work/company/users/${id}/minutes`, { minutes }),
  // company admin: own-company data-governance (DLP) policy
  workPolicy: (companyId) => req('GET', `/api/work/policy?companyId=${encodeURIComponent(companyId || '')}`),
  workSetPolicy: (body) => req('POST', '/api/work/policy', body || {}),
  // individual user (no company): manage your OWN scrub rules. No scope param ->
  // the server defaults to your own user policy; company members are denied.
  workMyPolicy: () => req('GET', '/api/work/policy'),
  workSaveMyPolicy: (body) => req('POST', '/api/work/policy', { ...(body || {}), companyId: undefined, userId: undefined }),
  // company admin: list every member session (completed + in progress)
  workCompanySessions: () => req('GET', '/api/work/company/sessions'),
  // per-session audit log (what was sent to the AI). Owner, their company admin, or superadmin.
  workAuditUrl: (id) => `/api/work/sessions/${id}/audit.log`,
  // change your own password (verifies the current one server-side)
  workChangePassword: (currentPassword, newPassword) => req('POST', '/api/work/profile/password', { currentPassword, newPassword }),
  // SSO (OIDC). Login page resolves a company domain, then does a full-page
  // redirect to the start URL (the server bounces the browser to the IdP).
  workSsoResolve: (domain) => req('GET', `/api/work/sso/resolve?domain=${encodeURIComponent(domain || '')}`),
  workSsoStartUrl: (companyId) => `/api/work/sso/${companyId}/start`,
  // Social sign-in (Google / Microsoft / Apple). Shapes assumed, pending the
  // backend: providers -> { providers: { google: true|false, microsoft: ..., apple: ... } }
  // (the UI treats a failed/404 probe as "unknown, let the button try");
  // start -> a redirect URL; complete -> { ok, mfaSetup?, enroll? } like signup.
  workSocialProviders: () => req('GET', '/api/work/social/providers'),
  workSocialStartUrl: (provider) => `/api/work/social/${encodeURIComponent(provider)}/start`,
  workSocialComplete: (body) => req('POST', '/api/work/social/complete', body || {}),
  // Company admin: read / set SSO for their own company (secret is write-only).
  workCompanyGetSso: () => req('GET', '/api/work/company/sso'),
  workCompanySetSso: (cfg) => req('POST', '/api/work/company/sso', cfg || {}),
  // audit log download URL (per session)
  workAuditUrl: (id) => `/api/work/sessions/${id}/audit.log`,
  // superadmin WorkCoPilot config
  workAdminGetPlatformAi: () => req('GET', '/api/work/admin/platform-ai'),
  workAdminSetPlatformAi: (allowed) => req('POST', '/api/work/admin/platform-ai', { allowed }),
  // two-factor (authenticator apps) - works mid-login (forced enrolment) and
  // from the profile (add/remove devices, regenerate backup codes).
  twofaEnrollStart: (body) => req('POST', '/api/2fa/enroll/start', body || {}),
  twofaEnrollConfirm: (code) => req('POST', '/api/2fa/enroll/confirm', { code }),
  twofaDevices: () => req('GET', '/api/2fa/devices'),
  twofaRenameDevice: (id, name) => req('POST', `/api/2fa/devices/${id}/rename`, { name }),
  twofaRemoveDevice: (id, code) => req('POST', `/api/2fa/devices/${id}/remove`, { code }),
  twofaRegenBackup: (code) => req('POST', '/api/2fa/backup/regenerate', { code }),
  admin2faReset: (id) => req('POST', `/api/admin/users/${id}/2fa/reset`),
  setGlobalTwofa: (required) => req('POST', '/api/super/security/twofa', { required }),
  setCompanyTwofa: (required, companyId) => req('POST', '/api/admin/company/twofa', { required, companyId }),
  // users (admin)
  listUsers: () => req('GET', '/api/users'),
  createUser: (u) => req('POST', '/api/users', u),
  updateUser: (id, u) => req('PATCH', `/api/users/${id}`, u),
  deleteUser: (id) => req('DELETE', `/api/users/${id}`),
  // dashboard
  dashboard: () => req('GET', '/api/dashboard'),
  createGroup: (name) => req('POST', '/api/groups', { name }),
  renameGroup: (id, name) => req('PATCH', `/api/groups/${id}`, { name }),
  deleteGroup: (id) => req('DELETE', `/api/groups/${id}`),
  getTip: (id) => req('GET', `/api/tips/${id}`),
  createTip: (groupId, tip) => req('POST', `/api/groups/${groupId}/tips`, tip),
  updateTip: (id, tip) => req('PATCH', `/api/tips/${id}`, tip),
  deleteTip: (id) => req('DELETE', `/api/tips/${id}`),
  // AI - admin config
  aiConfig: () => req('GET', '/api/ai/config'),
  aiSetProvider: (id, body) => req('PUT', `/api/ai/provider/${id}`, body),
  aiClearProvider: (id) => req('DELETE', `/api/ai/provider/${id}`),
  aiTestProvider: (id, body) => req('POST', `/api/ai/provider/${id}/test`, body),
  aiListModels: (id, body) => req('POST', `/api/ai/provider/${id}/models`, body || {}),
  aiSetActive: (id) => req('PUT', '/api/ai/active', { id }),
  aiSetPrompt: (systemPrompt) => req('PUT', '/api/ai/prompt', { systemPrompt }),
  aiGetPrompt: () => req('GET', '/api/ai/prompt'),
  // Editable behavioural instruction blocks (resume framing, JD, relevance, etc.)
  aiGetPromptBlocks: () => req('GET', '/api/ai/prompt-blocks'),
  aiSetPromptBlock: (key, text) => req('PUT', `/api/ai/prompt-blocks/${key}`, { text }),
  // Full assembled system prompt as the model receives it (superadmin). Optional
  // userId renders it for that candidate; scope = assistant|viva|practice.
  aiAssembledPrompt: (scope, userId) => req('GET', `/api/ai/assembled-prompt?scope=${encodeURIComponent(scope || 'assistant')}${userId ? `&userId=${encodeURIComponent(userId)}` : ''}`),
  // Per-candidate extra instruction (admin + superadmin).
  getUserAdminPrompt: (id) => req('GET', `/api/users/${id}/admin-prompt`),
  setUserAdminPrompt: (id, text) => req('PUT', `/api/users/${id}/admin-prompt`, { text }),
  aiVisionStatus: () => req('GET', '/api/ai/vision-status'),
  // AI - user
  aiStatus: () => req('GET', '/api/ai/status'),
  aiAsk: (payload) => req('POST', '/api/ai/ask', payload),
  // Re-lay the answer we ALREADY have at a new length/format, with the FAST model
  // (no transcription, no retrieval) - so Auto/S/M/L/B feels instant. Streams to
  // the panel via the same live channel as a normal answer. noSource=true means
  // nothing has been answered this sitting yet, so there is nothing to reformat.
  aiReformat: (payload) => req('POST', '/api/ai/reformat', payload),
  // Fire-and-forget client breadcrumb -> server log ([client] ...), so a live
  // sitting can be debugged from journalctl. Never throws into the UI.
  clientLog: (msg) => { try { return req('POST', '/api/ai/clientlog', { msg: String(msg).slice(0, 300) }) } catch { return Promise.resolve() } },
  // Latency-masking openers for the active interview (shown while generating).
  aiFillers: () => req('GET', '/api/ai/fillers'),
  // Filler-set management (superadmin): list sets, read one, replace one.
  aiFillerSets: () => req('GET', '/api/ai/fillers-admin'),
  aiGetFillerSet: (set) => req('GET', `/api/ai/fillers-admin/${encodeURIComponent(set)}`),
  aiSetFillerSet: (set, fillers) => req('PUT', `/api/ai/fillers/${encodeURIComponent(set)}`, { fillers }),
  // Question-type opener buckets (superadmin).
  aiFillerTypes: () => req('GET', '/api/ai/filler-types'),
  aiSetFillerType: (type, openers) => req('PUT', `/api/ai/filler-types/${encodeURIComponent(type)}`, { openers }),
  aiAnalyseScreen: (payload) => req('POST', '/api/ai/analyse-screen', payload),

  // licensing (server is the authority)
  sessionConfig: () => req('GET', '/api/session/config'),
  heartbeat: (minutes) => req('POST', '/api/session/heartbeat', { minutes }),
  listLicenses: () => req('GET', '/api/admin/licenses'),
  setLicense: (id, body) => req('PUT', `/api/users/${id}/license`, body),
  resetLicenseUsage: (id) => req('POST', `/api/users/${id}/license/reset`),
  userStats: () => req('GET', '/api/users/stats'),

  // super admin: companies, email, platform stats
  companies: () => req('GET', '/api/companies'),
  createCompany: (body) => req('POST', '/api/companies', typeof body === 'string' ? { name: body } : (body || {})),
  deleteCompany: (id) => req('DELETE', `/api/companies/${id}`),
  banCompany: (id, banned, reason) => req('PUT', `/api/companies/${id}/ban`, { banned, reason }),
  platformStats: () => req('GET', '/api/platform/stats'),
  // Wave 3: company billing / credits
  companyBilling: (id) => req('GET', `/api/companies/${id}/billing`),
  setCompanyBilling: (id, body) => req('PATCH', `/api/companies/${id}/billing`, body),
  addCredits: (id, amount, note) => req('POST', `/api/companies/${id}/credits`, { amount, note }),
  allocateCredits: (uid, amount) => req('POST', `/api/users/${uid}/credits/allocate`, { amount }),
  reclaimCredits: (uid, amount) => req('POST', `/api/users/${uid}/credits/reclaim`, amount == null ? {} : { amount }),
  myCredits: () => req('GET', '/api/me/credits'),
  creditRequests: (q) => req('GET', `/api/credit-requests${q ? ('?' + q) : ''}`),
  requestCredits: (qty, note) => req('POST', '/api/credit-requests', { qty, note }),
  approveCreditRequest: (id, grantedQty) => req('POST', `/api/credit-requests/${id}/approve`, grantedQty == null ? {} : { grantedQty }),
  rejectCreditRequest: (id, reason) => req('POST', `/api/credit-requests/${id}/reject`, { reason }),
  revokeCreditRequest: (id) => req('POST', `/api/credit-requests/${id}/revoke`),
  alerts: () => req('GET', '/api/alerts'),
  // Managed mode: an admin manages a user's interviews + documents on their behalf
  userInterviews: (uid) => req('GET', `/api/users/${uid}/interviews`),
  createUserInterview: (uid, body) => req('POST', `/api/users/${uid}/interviews`, body || {}),
  getUserInterview: (uid, id) => req('GET', `/api/users/${uid}/interviews/${id}`),
  activateUserInterview: (uid, id) => req('POST', `/api/users/${uid}/interviews/${id}/activate`),
  deleteUserInterview: (uid, id) => req('DELETE', `/api/users/${uid}/interviews/${id}`),
  userInterviewDocs: (uid, id) => req('GET', `/api/users/${uid}/interviews/${id}/docs`),
  addUserInterviewDocUrl: (uid, id, url, kind) => req('POST', `/api/users/${uid}/interviews/${id}/docs/url`, { url, kind }),
  deleteUserInterviewDoc: (uid, id, docId) => req('DELETE', `/api/users/${uid}/interviews/${id}/docs/${docId}`),
  smtpGet: () => req('GET', '/api/smtp'),
  smtpSave: (body) => req('PUT', '/api/smtp', body),
  smtpTest: (to, smtp) => req('POST', '/api/smtp/test', { to, smtp }),

  // saved interviews
  listInterviews: () => req('GET', '/api/interviews'),
  getInterview: (id) => req('GET', `/api/interviews/${id}`),
  createInterview: (name, fromInterviewId, settings) => req('POST', '/api/interviews', { name, fromInterviewId, settings }),
  activateInterview: (id) => req('POST', `/api/interviews/${id}/activate`),
  renameInterview: (id, name) => req('PATCH', `/api/interviews/${id}`, { name }),
  setInterviewSettings: (id, settings) => req('PATCH', `/api/interviews/${id}`, { settings }),
  deleteInterview: (id) => req('DELETE', `/api/interviews/${id}`),
  deleteInterviewLog: (id) => req('DELETE', `/api/interviews/${id}/log`),
  interviewPdfUrl: (id) => `/api/interviews/${id}/pdf`,

  // PREMIUM: Interview Answer Bank. Curate kicks off a background job; poll
  // getInterviewBank for status (idle|curating|ready|failed) + the results.
  curateInterview: (id, opts) => req('POST', `/api/interviews/${id}/curate`, opts || {}),
  getInterviewBank: (id) => req('GET', `/api/interviews/${id}/bank`),
  // PREMIUM: Offline Interview Pack (large JD+resume targeted Q&A for the offline app)
  offlinePackStatus: (id) => req('GET', `/api/interviews/${id}/offline-pack`),
  offlinePackGenerate: (id, depth) => req('POST', `/api/interviews/${id}/offline-pack`, { depth }),
  offlinePackDownloadUrl: (id) => `/api/interviews/${id}/offline-pack/download`,
  offlineAppUrl: () => '/api/app/offline-interview',
  // Interview Prep Pack (printable phone/HR/technical practice doc)
  aiWarm: () => req('POST', '/api/ai/warm'),
  getInterviewPrep: (id) => req('GET', `/api/interviews/${id}/prep`),
  generateInterviewPrep: (id, opts) => req('POST', `/api/interviews/${id}/prep`, opts || {}),
  // PREMIUM: Interview Debrief - post-interview coaching report. Generate kicks
  // off a background job; poll getInterviewDebrief for status + the report.
  getInterviewDebrief: (id) => req('GET', `/api/interviews/${id}/debrief`),
  generateInterviewDebrief: (id, opts) => req('POST', `/api/interviews/${id}/debrief`, opts || {}),
  getInterviewSittings: (id) => req('GET', `/api/interviews/${id}/sittings`),
  // PHASE 2: live self-recording for the debrief (candidate's own mic, gated).
  aiSaid: (body) => req('POST', '/api/ai/said', body || {}),
  aiTranscribe: (body) => req('POST', '/api/ai/transcribe', body || {}),
  getSelfRecord: () => req('GET', '/api/ai/self-record'),
  setSelfRecord: (on) => req('POST', '/api/ai/self-record', { on: !!on }),
  // PREMIUM: web-search provider pool for curation (admin).
  searchConfig: () => req('GET', '/api/ai/search-config'),
  setSearchConfig: (body) => req('PUT', '/api/ai/search-config', body),
  addSearchKey: (key, label) => req('POST', '/api/ai/search-keys', { key, label }),
  removeSearchKey: (index) => req('DELETE', `/api/ai/search-keys/${index}`),
  testSearchKey: (body) => req('POST', '/api/ai/search-keys/test', body || {}),

  // assistant app download
  appInfo: () => req('GET', '/api/app/info'),
  appDownloadUrl: () => '/api/app/download',
  // AI Training Assistant download - gated on the practice licence (server hides
  // it via licensed:false, and hard-gates the download with requirePractice).
  trainingAppInfo: () => req('GET', '/api/training-app/info'),
  trainingAppDownloadUrl: () => '/api/training-app/download',
  // AI - user's own key override (overrides the admin's for that user)
  myAiGet: () => req('GET', '/api/ai/my-provider'),
  myAiSet: (body) => req('PUT', '/api/ai/my-provider', body),
  myAiClear: () => req('DELETE', '/api/ai/my-provider'),
  myAiTest: (body) => req('POST', '/api/ai/my-provider/test', body || {}),
  myAiModels: (body) => req('POST', '/api/ai/my-provider/models', body || {}),
  // AI - session documents
  // Speaker profile + voice calibration
  profile: () => req('GET', '/api/profile'),
  saveProfile: (body) => req('PUT', '/api/profile', body),
  voicePrompts: () => req('GET', '/api/profile/voice/prompts'),
  addVoiceSample: (body) => req('POST', '/api/profile/voice/sample', body),
  analyseVoice: () => req('POST', '/api/profile/voice/analyse', {}),
  clearVoice: () => req('DELETE', '/api/profile/voice'),

  // interview practice (AI is the interviewer)
  practiceStart: (body) => req('POST', '/api/practice/start', body || {}),
  practiceTurn: (body) => req('POST', '/api/practice/turn', body),
  // The suggested read-aloud answer, fetched separately so the question voices
  // instantly (fast, human back-and-forth).
  practiceAnswer: (body) => req('POST', '/api/practice/answer', body),
  // Server-side transcription of a recorded answer clip (the Electron shell can't
  // use the browser SpeechRecognition), best-effort.
  practiceTranscribe: (body) => req('POST', '/api/practice/transcribe', body),
  practiceEnd: (body) => req('POST', '/api/practice/end', body),
  // Separate practice-LICENCE check (the creation checkbox). Gates the Training
  // Assistant with a clear "Practice licence is not available" when off.
  practiceAvailability: () => req('GET', '/api/practice/availability'),
  // The active session, so the click-through answer panel can mirror the toolbar.
  practiceCurrent: () => req('GET', '/api/practice/current'),
  practiceList: () => req('GET', '/api/practice'),
  practiceGet: (id) => req('GET', `/api/practice/${id}`),
  practiceDelete: (id) => req('DELETE', `/api/practice/${id}`),
  practicePdfUrl: (id) => `/api/practice/${id}/pdf`,
  practiceFrameUrl: (id, n) => `/api/practice/${id}/frame/${n}`,

  // Documents are scoped: 'assistant' (default) or 'practice'. Passing a scope
  // keeps the two sets apart end-to-end.
  aiDocs: (scope) => req('GET', `/api/ai/docs${scope ? `?scope=${scope}` : ''}`),
  aiContext: (scope) => req('GET', `/api/ai/context${scope ? `?scope=${encodeURIComponent(scope)}` : ''}`),
  aiReadiness: () => req('GET', '/api/ai/readiness'),
  // Self-service account: email/password changes. When 2FA is on, each requires
  // a current authenticator code (step-up).
  accountEmail: (email, code) => req('POST', '/api/account/email', { email, code }),
  accountPassword: (currentPassword, password, code) => req('POST', '/api/account/password', { currentPassword, password, code }),
  aiAddDoc: (payload) => req('POST', '/api/ai/docs', payload),
  aiAddDocUrl: (payload) => req('POST', '/api/ai/docs/url', payload),
  aiRemoveDoc: (id, scope) => req('DELETE', `/api/ai/docs/${id}${scope ? `?scope=${scope}` : ''}`),
  aiClearDocs: (scope) => req('DELETE', `/api/ai/docs${scope ? `?scope=${scope}` : ''}`),
  // One-time copy of documents between channels ('assistant' <-> 'practice').
  copyDocs: (from, to) => req('POST', '/api/ai/docs/copy', { from, to }),
  // AI - conversation memory
  aiHistory: () => req('GET', '/api/ai/history'),
  aiClearHistory: () => req('DELETE', '/api/ai/history'),
  // Licensing
  licenseStatus: () => req('GET', '/api/license/status'),
  licenseActivate: (token) => req('POST', '/api/license/activate', { token }),
}
