// Thin fetch wrapper. Same-origin, cookie session (credentials: 'include').
// Running inside the AI Cloud desktop app (window.refigold exists) we tag every
// request so the server can tell an app sign-in from a browser one - company
// users may only sign in through the app.
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
    throw err
  }
  return data
}

export const api = {
  // auth
  login: (username, password) => req('POST', '/api/login', { username, password }),
  loginVerify: (code) => req('POST', '/api/login/verify', { code }),
  loginRecovery: (key) => req('POST', '/api/login/recovery', { key }),
  resetPassword: (username, code, password) => req('POST', '/api/password/reset', { username, code, password }),
  logout: () => req('POST', '/api/logout'),
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
  workSignup: (username, password) => req('POST', '/api/work/signup', { username, password }),
  workLogin: (username, password) => req('POST', '/api/work/login', { username, password }),
  workLogout: () => req('POST', '/api/work/logout'),
  workSetProfile: (body) => req('POST', '/api/work/profile', body || {}),
  // AI readiness (platform-allowed or own tested key, must have a vision model)
  workAi: () => req('GET', '/api/work/ai'),
  workAiKey: (body) => req('POST', '/api/work/ai/key', body || {}),
  workAiTest: () => req('POST', '/api/work/ai/test'),
  workAppStatus: () => req('GET', '/api/work/app/status'),
  // sessions
  workCreate: (body) => req('POST', '/api/work/sessions', body || {}),
  workList: () => req('GET', '/api/work/sessions'),
  workGet: (id) => req('GET', `/api/work/sessions/${id}`),
  workDelete: (id) => req('DELETE', `/api/work/sessions/${id}`),
  workSetGoal: (id, goal) => req('POST', `/api/work/sessions/${id}/goal`, { goal }),
  // body: { goal?, frame? } (frame = downscaled data URL)
  workPlan: (id, body) => req('POST', `/api/work/sessions/${id}/plan`, body || {}),
  // body: { frame } -> { status, observation, flag, advanced, index, step, done, steps }
  workWatch: (id, body) => req('POST', `/api/work/sessions/${id}/watch`, body || {}),
  // body: { question?, frame }
  workAsk: (id, body) => req('POST', `/api/work/sessions/${id}/ask`, body || {}),
  workStep: (id, index, status) => req('POST', `/api/work/sessions/${id}/step`, { index, status }),
  // Drill-down "how?" on a step. body: { action, stepIndex?, frame? } -> { steps, escalated }
  workHowTo: (id, body) => req('POST', `/api/work/sessions/${id}/howto`, body || {}),
  workModes: () => req('GET', '/api/work/modes'),
  workSetMode: (id, mode) => req('POST', `/api/work/sessions/${id}/mode`, { mode }),
  workReportUrl: (id, dl) => `/api/work/sessions/${id}/report.pdf${dl ? '?dl=1' : ''}`,
  workResearch: (id, question) => req('POST', `/api/work/sessions/${id}/research`, { question }),
  workUsage: () => req('GET', '/api/work/usage'),
  workHeartbeat: (id, seconds) => req('POST', '/api/work/usage/heartbeat', { sessionId: id, seconds }),
  workPause: (id, paused) => req('PATCH', `/api/work/sessions/${id}/pause`, { paused }),
  workDraft: (id, ask) => req('POST', `/api/work/sessions/${id}/draft`, { ask }),
  workFinalize: (id) => req('POST', `/api/work/sessions/${id}/finalize`),
  // support tickets (user)
  workTicketCategories: () => req('GET', '/api/work/ticket-categories'),
  workTickets: () => req('GET', '/api/work/tickets'),
  workTicketCreate: (body) => req('POST', '/api/work/tickets', body || {}),
  workTicketGet: (id) => req('GET', `/api/work/tickets/${id}`),
  workTicketReply: (id, text) => req('POST', `/api/work/tickets/${id}/reply`, { text }),
  // support tickets (superadmin)
  workAdminTickets: (q) => req('GET', `/api/work/admin/tickets${q && Object.keys(q).length ? '?' + new URLSearchParams(q) : ''}`),
  workAdminTicketGet: (id) => req('GET', `/api/work/admin/tickets/${id}`),
  workAdminTicketReply: (id, text) => req('POST', `/api/work/admin/tickets/${id}/reply`, { text }),
  workAdminTicketStatus: (id, status) => req('POST', `/api/work/admin/tickets/${id}/status`, { status }),
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
