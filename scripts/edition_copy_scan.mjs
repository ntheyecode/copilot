// Edition copy gate (pure functions + the policy tables). Used by
// scripts/check-edition-copy.mjs (prebuild) and src/shared/edition_copy.test.mjs.
//
// 1. OVERLAY SHAPE: every audience overlay (src/i18n/overlays/<audience>/) only
//    overrides keys the base English catalog has (a typo or a stale key fails),
//    with the same type (string vs array vs object), and every locale carries
//    exactly the keys of its audience's en overlay (the i18n release gate for
//    edition wording: a reader never falls back to base wording in their
//    language because one overlay string was missing).
// 2. AUDIENCE SCAN: the merged English catalog an audience reads (base + its en
//    overlay) carries no banned wording in any namespace that audience can see,
//    except under key prefixes whose surface the edition hides (each listed
//    with the reason). The banned list is English; the other locales are
//    covered by (1): a key the en overlay must override is overridden in every
//    locale.
//
// The rendered pages are checked the same way in the browser by
// scripts/scan-rendered-copy.js (see docs/deployment-editions.md).
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { deepMergeEn } from '../src/i18n/deep_merge_en.js'
import { mergeOverlay } from '../src/i18n/overlay_merge.js'

export const LOCALE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'i18n', 'locales')
export const OVERLAY_DIR = path.resolve(LOCALE_DIR, '..', 'overlays')

// ---- policy -----------------------------------------------------------------
// Wording an individuals-only edition never shows (owner, 2026-10-30: "no
// company wording at all"). Word-bounded, case-insensitive.
export const INDIVIDUALS_BANNED = /\b(compan(y|ies|y's)|teams?|team's|teammates?|enterprises?|organi[sz]ations?|orgs?|SSO|single sign-on|governance|admin console|administrators?|admins?|executives?|trainers?|project managers?|seats?|seat pools?|tenants?|B2B|employees?|workforce|colleagues?|Company Brain|signed DPA|Data Processing Addendum)\b/i
// Personal-plan wording an organizations-only edition never shows.
export const ORGANIZATIONS_BANNED = /\b(free (account|trial|plan|tier)|free to (sign up|try|create|start)|sign up (for )?free|start free|create (a |your )?(free )?account|pick a plan|choose a plan|self-service plans?|upgrade|buy (top-up )?hours|top-up)\b/i

// The same rule in each language, for the strings an individuals overlay
// writes (the base strings it does not override are covered by key parity
// with the English scan). Stems, case-insensitive; "SSO" is universal.
export const INDIVIDUALS_BANNED_LOCAL = {
  de: /unternehmen|firma|firmen|\bteams?\b|enterprise|organisation|administrator|\badmin\b|governance|führungskr|\bSSO\b|single sign-on/i,
  fr: /entreprise|société|équipe|organisation|administrateur|gouvernance|dirigeant|\bSSO\b|authentification unique/i,
  es: /empresa|compañía|organización|administrador|gobernanza|ejecutivo|\bSSO\b|inicio de sesión único/i,
  it: /azienda|aziendal|società|\bteam\b|squadra|organizzazione|amministrator|governance|dirigent|\bSSO\b/i,
  'pt-BR': /empresa|companhia|equipe|organização|administrador|governança|executivo|\bSSO\b|login único/i,
  ru: /компани|организац|администратор|корпорат|\bSSO\b|единый вход/i,
  tr: /şirket|kurumsal|ekip|organizasyon|yönetici|\bSSO\b|tek oturum/i,
  id: /perusahaan|\btim\b|organisasi|administrator|\badmin\b|eksekutif|\bSSO\b/i,
  ja: /会社|企業|チーム|組織|管理者|経営|\bSSO\b|シングルサインオン/,
  ko: /회사|기업|팀|조직|관리자|경영진|\bSSO\b|싱글 사인온/,
  zh: /公司|企业|团队|组织|管理员|高管|\bSSO\b|单点登录/,
  ar: /شركة|الشركة|شركات|مؤسسة|فريق|\bSSO\b/,
  hi: /कंपनी|कम्पनी|संगठन|टीम|एडमिन|व्यवस्थापक|प्रशासक|\bSSO\b/,
  vi: /công ty|doanh nghiệp|tổ chức|đội ngũ|quản trị viên|\bSSO\b/i,
}

// Namespaces a person can see on each edition (public pages + the signed-in
// app for a person). Operator consoles (superAdmin, *Admin) are not here: they
// are AdmireVeda's own staff tools, not something a customer reads.
const PUBLIC = ['nav', 'footer', 'common', 'seo', 'home', 'login', 'pricing', 'rel', 'residency', 'widgets', 'guide', 'how', 'notChat',
  'fieldsPage', 'howItWorks', 'faqPage', 'securityPage', 'contactPage', 'useCases', 'demoPage', 'benchmarkPage', 'edition', 'demo', 'enterprise']
const APP = ['onboarding', 'setPasswordPage', 'helpPage', 'helpShared', 'dashboardsHelp', 'workDashboard', 'workShell', 'workStart',
  'workProjects', 'skillsPage', 'stepCard', 'guideConsole', 'usage', 'policyNote', 'billingWidget', 'errorBoundary', 'prefs',
  'buddyPage', 'fullGuide', 'answerBody', 'resultCard', 'composeCard', 'computeCard', 'floatPanel', 'readingStrip', 'guideLevel',
  'guideFontScale', 'accentPicker', 'buddyPicker', 'downloadMenu', 'destructiveGate', 'askFocus', 'securityNote', 'scrubRules', 'supportTickets', 'legalShared']

export const VISIBLE = { individuals: [...PUBLIC, ...APP], organizations: [...PUBLIC, ...APP] }

// Legal and partner pages (terms, privacy, refund, acceptable use,
// sub-processors, disclaimer, affiliate program). They are public on every
// edition, but their wording is a legal document: changing it per audience is
// an owner and counsel decision, not a copy edit. They are scanned and REPORTED
// (scripts/check-edition-copy.mjs prints the count) without failing the build,
// until the owner signs off an individuals version.
export const LEGAL_PENDING = ['termsPage', 'privacyPage', 'refundPage', 'acceptableUsePage', 'subprocessorsPage', 'disclaimerPage', 'cookiePolicyPage', 'accessibilityPage', 'affiliatePage']

// Key prefixes the scan skips, each with its reason. Two kinds:
//   hidden surface  the edition does not render it (the capability or
//                   company-membership check that hides it is named)
//   work content    examples of the person's OWN work (field rosters, demo
//                   task scenarios, example task lines, product names such as
//                   Microsoft Teams); a person's tasks can involve a team or an
//                   admin console without the product speaking to companies.
// A prefix ends at a key boundary.
const WORK_CONTENT = {
  'guide.scenarios': 'work content: demo task scenarios',
  'home.demo.scenarios': 'work content: demo task scenarios',
  'home.fields': 'work content: the field roster',
  'home.marquee': 'work content: the field marquee (SSO / OAuth is a technical topic people get guided through)',
  'fieldsPage.families': 'work content: the field roster',
  'fieldsPage.vignettes': 'work content: field photographs',
  'widgets.validate.chip1': 'work content: an example task line', 'widgets.validate.chip5': 'work content: an example task line',
  'helpPage.desktopsec.items.1': 'work content: Microsoft Teams is a product name (screen-share apps)',
  'workStart.gateCompanyTrialUsed': 'hidden surface: company members only',
}
// Shown only to company members, company admins or platform staff, so an
// individuals-only edition (no company tenants) never renders them.
const COMPANY_MEMBER_ONLY = [
  'workDashboard.cobrand', 'workDashboard.plan.companyLeft', 'workDashboard.plan.yourCompany', 'workDashboard.plan.admin', 'workDashboard.meters.tipAdmin',
  'workDashboard.meters.allowance', 'workDashboard.meters.pool', 'workDashboard.meters.tasks.tipLimit', 'workDashboard.meters.state.pool',
  'workDashboard.meters.state.ceiling', 'workDashboard.meters.state.exhaustedCompany', 'workDashboard.meters.state.lowCompany', 'workDashboard.meters.state.tasksLimit',
  'workDashboard.adminNote', 'workDashboard.adminNoteLink', 'workDashboard.ai.admin', 'workDashboard.ai.adminLink', 'workDashboard.ai.companyAdmin', 'workDashboard.ai.companyAdminLink',
  'workDashboard.ai.member', 'workDashboard.dp.captionCompanyAdmin', 'workDashboard.dp.captionCompany', 'workDashboard.dp.bodyCompanyAdminPre', 'workDashboard.dp.bodyCompanyAdminLink',
  'workDashboard.dp.bodyCompanyAdminPost', 'workDashboard.dp.bodyCompany', 'workDashboard.workflows',
  'workShell.nav.team', 'workShell.nav.exec', 'workShell.nav.admin', 'workShell.nav.queueTip', 'workShell.nav.srpm', 'workShell.nav.srpmTip', 'workShell.top.viewingAs',
  'workShell.plan.companyPool', 'workShell.plan.companyPoolNote', 'workShell.plan.statePool', 'workShell.plan.stateCeiling', 'workShell.plan.stateExhaustedCompany',
  'workShell.plan.stateLowCompany', 'workShell.plan.stateTasksLimit',
  'workStart.gateOutOfHoursCompany', 'workStart.gateCompanyTaskLimit', 'workStart.gateCompanyNoLicense', 'workStart.spaceSub', 'workStart.spaceAria', 'workStart.spaceSummaryAll',
  'workProjects.gate.company', 'workProjects.outcome.upgradeCompany', 'workProjects.create.customerHelp', 'workProjects.create.customerDefault', 'workProjects.create.customerAdminNote',
  'workProjects.practices.srcCompany', 'skillsPage.note.company', 'stepCard.shot', 'guideConsole.source.workflow', 'guideConsole.source.workflowTip', 'usage.outCompany',
  'workShell.legal.docs.dpa',
  'dashboardsHelp.queue', 'dashboardsHelp.pm', 'dashboardsHelp.pmProject', 'dashboardsHelp.srpm', 'dashboardsHelp.grc', 'dashboardsHelp.issues', 'dashboardsHelp.admin',
]
export const HIDDEN = {
  individuals: {
    ...WORK_CONTENT,
    ...Object.fromEntries(COMPANY_MEMBER_ONLY.map((k) => [k, 'hidden surface: rendered only for company members, company admins or platform staff'])),
    'nav.enterprise': 'SiteHeader: the Enterprise link needs companies',
    'footer.enterpriseFeatures': 'SiteFooter: needs companies',
    'footer.dpa': 'SiteFooter: the DPA link needs companies',
    'home.roi': 'WorkMarketing: the #enterprise section needs companies',
    'home.enterprise': 'WorkMarketing: the enterprise chips live in the #enterprise section',
    'enterprise': 'the enterprise demo band (WorkEnterprise only, route needs companies)',
    'seo.enterprise': 'the /enterprise route needs companies',
    'rel.enterprise': 'ReleaseNote group shown on the enterprise page only',
    'pricing.matrix.seats': 'WorkPricing: the seats row needs companies',
    'pricing.matrix.seatOne': 'WorkPricing: the seats row needs companies',
    'pricing.matrix.seatPools': 'WorkPricing: the seats row needs companies',
    'pricing.matrix.groups.enterprise': 'WorkPricing: enterprise rows need companies',
    'pricing.matrix.enterpriseRows': 'WorkPricing: enterprise rows need companies',
    'pricing.forTeams': 'WorkPricing: the Enterprise column needs companies',
    'pricing.entLines': 'WorkPricing: the Enterprise column needs companies',
    'pricing.badgeCustom': 'WorkPricing: the Enterprise column needs companies',
    'pricing.badgeCustomSub': 'WorkPricing: the Enterprise column needs companies',
    'pricing.contact': 'WorkPricing: the Enterprise column CTA needs companies',
    'pricing.plans.enterprise': 'WorkPricing: the Enterprise column needs companies',
    'login.sso': 'WorkLogin: SSO detection needs companies',
    'login.err.enterDomain': 'WorkLogin: an SSO step error (the step needs companies)',
    'login.err.ssoNotFound': 'WorkLogin: an SSO step error (the step needs companies)',
    'login.err.ssoAccount': 'WorkLogin: answers a company SSO account, which cannot exist without companies',
    'securityPage.hero.enterprise': 'WorkSecurity: the enterprise link needs companies',
    'residency': 'WorkSecurity / WorkEnterprise: company data residency needs companies',
    'rel.privacy': 'not rendered by any page (ReleaseNote groups in use: global, billing, enterprise)',
    'login.ssoStep': 'WorkLogin: the SSO step needs companies',
    'login.ssoEntry': 'WorkLogin: the SSO entry needs companies',
    'login.form.company': 'WorkLogin: the company field needs companies',
    'login.form.companyPh': 'WorkLogin: the company field needs companies',
    'widgets.validate.company': 'LiveValidate: the company field needs companies',
    'widgets.validate.companyPh': 'LiveValidate: the company field needs companies',
    'howItWorks.cta.enterprise': 'WorkCapabilities: the enterprise CTA needs companies',
    'faqPage.groups.pricing.items.5': 'WorkFaq: question needs companies',
    'faqPage.groups.security.items.2.links': 'WorkFaq: both links point at company-only pages (enterprise, DPA) and are filtered out',
    'faqPage.groups.who.items.2': 'WorkFaq: question needs companies',
    'faqPage.groups.compliance.items.3': 'WorkFaq: question needs companies',
    'faqPage.groups.compliance.items.4': 'WorkFaq: question needs companies',
    'workDashboard.sub.teamNote': 'Dashboard: the team note needs companies',
    'edition.orgPlans': 'OrgPlans renders only where personal plans are not sold',
    'edition.signupClosed': 'SignupClosed renders only where personal sign-up is off',
    'edition.login': 'WorkLogin: the organizations line renders only where personal sign-up is off',
    'edition.validate': 'LiveValidate: the sales CTA renders only where personal plans are not sold',
    'edition.app': 'Dashboard: the no-plan notice renders only where personal plans are not sold',
  },
  organizations: {
    'pricing.plans': 'WorkPricing: personal plan cards need individual_plans',
    'pricing.matrix': 'WorkPricing: the personal plan matrix needs individual_plans',
    'pricing.start': 'personal plan CTA', 'pricing.startShort': 'personal plan CTA',
    'home.pricing.feats': 'WorkMarketing: personal plan cards need individual_plans',
    'home.pricing.choose': 'personal plan CTA', 'home.pricing.mins': 'personal plan card',
    'faqPage.groups.pricing.items.1': 'WorkFaq: question needs individual_plans',
    'faqPage.groups.pricing.items.2': 'WorkFaq: question needs individual_plans',
    'faqPage.groups.pricing.items.3': 'WorkFaq: question needs individual_plans',
    'faqPage.groups.pricing.items.4': 'WorkFaq: question needs individual_plans',
    'login.heading.create': 'WorkLogin: sign-in only without personal sign-up',
    'login.heading.createPlan': 'WorkLogin: sign-in only',
    'login.subline.create': 'WorkLogin: sign-in only', 'login.subline.createPlan': 'WorkLogin: sign-in only',
    'login.switch': 'WorkLogin: the create switch needs solo_signup', 'login.plan': 'WorkLogin: no plan hand-off',
    'login.form.ariaCreate': 'WorkLogin: the create form needs solo_signup', 'login.form.create': 'WorkLogin: the create form needs solo_signup',
    'login.form.createContinue': 'WorkLogin: the create form needs solo_signup', 'login.err.createFail': 'WorkLogin: the create form needs solo_signup',
    'workStart.gateCompanyTrialUsed': 'company-facing: a company trial, not a personal plan',
    'onboarding': 'the subscribe onboarding route needs solo_signup (SignupClosed renders instead)',
    'workDashboard.sub': 'Dashboard: the plan chooser needs individual_plans',
    'billingWidget': 'WorkBilling: personal subscription management, shown only to an account that already pays',
    'widgets.validate.recommended': 'LiveValidate: plan card needs individual_plans',
    'widgets.validate.startWith': 'LiveValidate: plan card needs individual_plans',
    'widgets.validate.comparePlans': 'LiveValidate: plan card needs individual_plans',
    // Personal-plan purchase and plan-state lines: rendered only for a personal
    // account (canBuy / canUpgrade / the personal meters). No personal account
    // can be created here (sign-up refused), the server sends canUpgrade false,
    // and buying or changing a plan is refused (server/edition_route_gates.js).
    'rel.billing': 'ReleaseNote billing group: rendered by the personal pricing page only',
    'workDashboard.meters.topup': 'personal account only', 'workDashboard.meters.state.exhausted': 'personal account only',
    'workDashboard.meters.state.buy': 'personal account only (canBuy)', 'workDashboard.meters.state.upgrade': 'personal account only (canUpgrade)',
    'workDashboard.buy': 'add-time card: buy button needs canBuyHours (individual_plans)',
    'workShell.top.buyHoursTitle': 'needs canBuyHours', 'workShell.top.buyHours': 'needs canBuyHours',
    'workShell.top.upgradeTitle': 'needs canUpgrade', 'workShell.top.upgradeTitleGeneric': 'needs canUpgrade', 'workShell.top.upgrade': 'needs canUpgrade',
    'workShell.plan.topup': 'personal account only', 'workShell.plan.stateExhausted': 'personal account only',
    'workShell.plan.actBuy': 'needs canBuy', 'workShell.plan.actUpgrade': 'needs canUpgrade', 'workShell.buy': 'buy modal needs canBuyHours',
    'workProjects.outcome.upgradeBody': 'needs canUpgrade', 'workStart.docsCapUpgrade': 'personal plan document cap',
    'workStart.docsCapFull': 'personal plan document cap', 'workStart.qUpgrade': 'needs canUpgrade',
    'helpPage.time': 'personal plan time rules (help section for personal accounts)',
    'usage.outIndividual': 'personal account only', 'usage.lowNote': 'personal account only',
  },
}

// ---- catalog helpers ----------------------------------------------------------
const load = async (file) => (await import(pathToFileURL(file).href)).default || {}

export async function loadEnglish() {
  const en = { ...(await load(path.join(LOCALE_DIR, 'en.js'))) }
  const partials = path.join(LOCALE_DIR, 'en')
  for (const f of fs.readdirSync(partials).filter((x) => x.endsWith('.js')).sort()) deepMergeEn(en, await load(path.join(partials, f)))
  return en
}

export function audiences() {
  if (!fs.existsSync(OVERLAY_DIR)) return []
  return fs.readdirSync(OVERLAY_DIR, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort()
}

export async function loadOverlay(aud, code) {
  const f = path.join(OVERLAY_DIR, aud, `${code}.js`)
  return fs.existsSync(f) ? load(f) : null
}

export function overlayLocales(aud) {
  return fs.readdirSync(path.join(OVERLAY_DIR, aud)).filter((f) => f.endsWith('.js')).map((f) => f.replace(/\.js$/, '')).sort()
}

// Leaf paths -> kind ('string' | 'array[n]'). Arrays are leaves (they
// translate as units and replace wholesale on merge).
export function leaves(val, p = '', out = new Map()) {
  if (Array.isArray(val)) { out.set(p, `array[${val.length}]`); return out }
  if (val && typeof val === 'object') { for (const k of Object.keys(val)) leaves(val[k], p ? `${p}.${k}` : k, out); return out }
  out.set(p, typeof val)
  return out
}
const dig = (obj, p) => p.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj)

// Every string inside a value (arrays and objects flattened), with its path.
function strings(val, p, out) {
  if (typeof val === 'string') out.push([p, val])
  else if (Array.isArray(val)) val.forEach((v, i) => strings(v, `${p}.${i}`, out))
  else if (val && typeof val === 'object') for (const k of Object.keys(val)) strings(val[k], p ? `${p}.${k}` : k, out)
  return out
}

const underPrefix = (p, prefix) => p === prefix || p.startsWith(prefix + '.')

// ---- checks -----------------------------------------------------------------------
export function checkOverlayShape(en, enOverlay, aud) {
  const problems = []
  for (const [p, kind] of leaves(enOverlay)) {
    const baseVal = dig(en, p)
    if (baseVal === undefined) { problems.push(`${aud}/en: ${p} is not a key of the base catalog (an overlay only replaces existing wording)`); continue }
    const baseKind = Array.isArray(baseVal) ? 'array' : typeof baseVal
    const mine = kind.startsWith('array') ? 'array' : kind
    if (baseKind !== mine) problems.push(`${aud}/en: ${p} is ${mine}, the base catalog has ${baseKind}`)
  }
  return problems
}

export function checkOverlayParity(enOverlay, localeOverlay, aud, code) {
  const problems = []
  const want = leaves(enOverlay)
  const got = leaves(localeOverlay || {})
  for (const [p, kind] of want) {
    if (!got.has(p)) problems.push(`${aud}/${code}: missing ${p}`)
    else if (got.get(p) !== kind) problems.push(`${aud}/${code}: ${p} is ${got.get(p)}, en has ${kind}`)
  }
  for (const p of got.keys()) if (!want.has(p)) problems.push(`${aud}/${code}: extra ${p} (not in the en overlay)`)
  return problems
}

export function scanAudience(mergedEn, aud) {
  const banned = aud === 'individuals' ? INDIVIDUALS_BANNED : aud === 'organizations' ? ORGANIZATIONS_BANNED : null
  if (!banned) return []
  const hidden = Object.keys(HIDDEN[aud] || {})
  const hits = []
  for (const ns of VISIBLE[aud] || []) {
    for (const [p, s] of strings(mergedEn[ns], ns, [])) {
      if (hidden.some((h) => underPrefix(p, h))) continue
      const m = s.match(banned)
      if (m) hits.push({ path: p, word: m[0], text: s })
    }
  }
  return hits
}

export async function runAll() {
  const en = await loadEnglish()
  const problems = []
  const hits = {}
  for (const aud of audiences()) {
    const enOv = (await loadOverlay(aud, 'en')) || {}
    problems.push(...checkOverlayShape(en, enOv, aud))
    for (const code of overlayLocales(aud)) {
      if (code === 'en') continue
      const ov = await loadOverlay(aud, code)
      problems.push(...checkOverlayParity(enOv, ov, aud, code))
      const local = aud === 'individuals' && (INDIVIDUALS_BANNED_LOCAL[code] || (code === 'en-GB' ? INDIVIDUALS_BANNED : null))
      if (local) for (const [p, str] of strings(ov, '', [])) { const m = str.match(local); if (m) problems.push(`${aud}/${code}: ${p} reads "${m[0]}" (no company wording on the individuals edition)`) }
    }
    const localeFiles = fs.readdirSync(LOCALE_DIR).filter((f) => f.endsWith('.js')).map((f) => f.replace(/\.js$/, ''))
    for (const code of localeFiles) if (!overlayLocales(aud).includes(code)) problems.push(`${aud}: no overlay file for locale ${code} (src/i18n/overlays/${aud}/${code}.js)`)
    hits[aud] = scanAudience(mergeOverlay(en, enOv), aud)
  }
  // Every other language, over the WHOLE merged catalog it reads (its base
  // locale + its individuals overlay), not only the overlay strings: a base
  // translation can use a company word where the English is neutral.
  const hidden = Object.keys(HIDDEN.individuals)
  for (const code of Object.keys(INDIVIDUALS_BANNED_LOCAL)) {
    const file = path.join(LOCALE_DIR, `${code}.js`)
    if (!fs.existsSync(file)) continue
    const merged = mergeOverlay(await load(file), (await loadOverlay('individuals', code)) || {})
    for (const ns of VISIBLE.individuals) {
      for (const [p, str] of strings(merged[ns], ns, [])) {
        if (hidden.some((h) => underPrefix(p, h)) || (LOCAL_REVIEWED[code] && LOCAL_REVIEWED[code][p])) continue
        const m = str.match(INDIVIDUALS_BANNED_LOCAL[code])
        if (m) problems.push(`individuals/${code}: ${p} reads "${m[0]}" in the merged ${code} catalog (override it in src/i18n/overlays/individuals/, or list it in LOCAL_REVIEWED with the reason)`)
      }
    }
  }
  // Legal pages: reported, not failed (LEGAL_PENDING).
  const pending = []
  const merged = mergeOverlay(en, (await loadOverlay('individuals', 'en')) || {})
  for (const ns of LEGAL_PENDING) for (const [p, str] of strings(merged[ns], ns, [])) if (INDIVIDUALS_BANNED.test(str)) pending.push(p)
  return { problems, hits, legalPending: pending }
}

// Hits of the per-language patterns that a reviewer read and found to be no
// company wording at all (the stem has another meaning in that sentence).
export const LOCAL_REVIEWED = {
  tr: {
    'login.mfa.saveCodesP': '"parola yöneticisi" = password manager',
    'widgets.validate.askPh': '"şirket içi uygulamalar" = in-house apps (the English says in-house)',
    'howItWorks.cards.4.d': '"şirket içi konsollar" = on-prem consoles',
    'useCases.cases.4.benefit': '"reklam yöneticisi" = ad manager (a product)',
    'dashboardsHelp.pmProject.lead': 'help section for project managers (company members only)',
    'workStart.envOnprem': '"şirket içi ürün" = an on-prem product (the English says on-prem)',
  },
  ko: {
    'workDashboard.ai.solo': '"지원팀" = our support team (the English says contact support)',
    'login.mfa.saveCodesP': '"비밀번호 관리자" = password manager',
    'login.mfa.s2P': 'the authenticator app\'s own "work or other account" option',
    'widgets.validate.workEmail': '"회사 이메일" = work email (the English says work email)',
    'useCases.cases.4.benefit': '"광고 관리자" = ad manager (a product)',
    'dashboardsHelp.pmProject.lead': 'help section for project managers (company members only)',
    'dashboardsHelp.pmProject.shot.alt': 'help section for project managers (company members only)',
  },
  it: {
    'helpPage.desktop.docs': '"governance" here renders the English "governed text" (data protection), not company governance',
    'helpPage.desktopfaq.items.1.a': 'as above',
  },
  zh: { 'workDashboard.ai.solo': '"支持团队" = our support team (the English says contact support)' },
  hi: { 'guideConsole.planning.phases.4': 'renders "Working with multimodal vision"; no company meaning' },
}
