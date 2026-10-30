// Client-side SINGLE SOURCE for the enterprise work flows + management roles
// (SUPREME RULE II). Mirrors server/work_roles.js (the server is the security
// boundary; this file only decides what the UI SHOWS). Every surface that names
// a role or a flow reads this registry: the company admin's selects, the app
// shell's role-based nav, the page gates and the dashboards. Pure, no React,
// unit-tested in work_roles_options.test.mjs.
//
// Two orthogonal axes per company user (admin-set):
//   workFlow     worker | independent | mixed   (how guided tasks reach them)
//   companyRole  member | company_admin | executive | project_manager |
//                senior_project_manager | grc  (the primary role)
//   grants[]     trainer  (additive, only with a member or project_manager role)

export const WORK_FLOWS = ['worker', 'independent', 'mixed']
export const COMPANY_ROLES = ['member', 'executive', 'project_manager', 'senior_project_manager', 'grc', 'company_admin']
// Additive grants on top of the primary role (mirrors server/work_roles.js).
export const GRANTS = ['trainer']
export function canGrantTrainer(role) { return role === 'member' || role === 'project_manager' }
export const RISK_SLA_DAYS = 5

// Select options: id + the i18n key of the label (+ a short help key). Order is
// the order the admin sees them in (plain roles first, then management roles,
// company admin last).
export const WORK_FLOW_OPTIONS = [
  { id: 'independent', labelKey: 'companyAdmin.flows.independent', helpKey: 'companyAdmin.flows.independentHelp' },
  { id: 'worker', labelKey: 'companyAdmin.flows.worker', helpKey: 'companyAdmin.flows.workerHelp' },
  { id: 'mixed', labelKey: 'companyAdmin.flows.mixed', helpKey: 'companyAdmin.flows.mixedHelp' },
]
export const COMPANY_ROLE_OPTIONS = [
  { id: 'member', labelKey: 'companyAdmin.roles.member' },
  { id: 'executive', labelKey: 'companyAdmin.roles.executive' },
  { id: 'project_manager', labelKey: 'companyAdmin.roles.projectManager' },
  { id: 'senior_project_manager', labelKey: 'companyAdmin.roles.seniorProjectManager' },
  { id: 'grc', labelKey: 'companyAdmin.roles.grc' },
  { id: 'company_admin', labelKey: 'companyAdmin.roles.companyAdmin' },
]
// Grant options: additive checkboxes the admin sets alongside the primary role.
export const GRANT_OPTIONS = [
  { id: 'trainer', labelKey: 'companyAdmin.grants.trainer', helpKey: 'companyAdmin.grants.trainerHelp' },
]
export function roleLabelKey(role) {
  const o = COMPANY_ROLE_OPTIONS.find((x) => x.id === role)
  return o ? o.labelKey : 'companyAdmin.roles.member'
}
export function flowLabelKey(flow) {
  const o = WORK_FLOW_OPTIONS.find((x) => x.id === normalizeFlow(flow))
  return o ? o.labelKey : 'companyAdmin.flows.independent'
}

export function normalizeFlow(v) {
  const s = String(v || '').trim().toLowerCase()
  return WORK_FLOWS.includes(s) ? s : 'independent'
}

// ---- Flow capabilities (same predicates as the server) ----
export function canStartOwnTask(flow) { return normalizeFlow(flow) !== 'worker' }
export function canReceiveAssignment(flow) { return normalizeFlow(flow) !== 'independent' }

// ---- Role predicates ----
export function isSrPM(role) { return role === 'senior_project_manager' }
export function isGRC(role) { return role === 'grc' }
export function isPM(role) { return role === 'project_manager' || isSrPM(role) }
export function isCompanyAdmin(role) { return role === 'company_admin' }
export function hasTrainerGrant(grants) { return Array.isArray(grants) && grants.includes('trainer') }
export function sanitizeGrants(role, grants) {
  const set = Array.isArray(grants) ? [...new Set(grants.filter((g) => GRANTS.includes(g)))] : []
  return set.filter((g) => g !== 'trainer' || canGrantTrainer(role))
}
export function canAuthorWorkflow(role, grants) { return hasTrainerGrant(grants) || isCompanyAdmin(role) }
// Workflow incidents (Wave 3 part C): who RECEIVES a deviation raised while an
// employee follows a published workflow: trainers, PMs and above (PM, Sr PM, GRC),
// company admins and executives. Who may ACT on one (acknowledge, resolve,
// dismiss): trainers, PMs, Sr PMs and company admins. GRC and executives watch.
export function canReceiveWorkflowIncidents(role, grants) {
  return hasTrainerGrant(grants) || isPM(role) || isGRC(role) || isCompanyAdmin(role) || role === 'executive'
}
export function canManageWorkflowIncidents(role, grants) {
  return hasTrainerGrant(grants) || isPM(role) || isCompanyAdmin(role)
}
export function canCreateProject(role) { return isPM(role) || isCompanyAdmin(role) }
export function canAssignTask(role) { return isPM(role) || isCompanyAdmin(role) }
export function canReassignProject(role) { return isSrPM(role) || isCompanyAdmin(role) }
export function canAssignProjectManager(role) { return isSrPM(role) || isCompanyAdmin(role) }
export function canSeeAllProjects(role) { return isSrPM(role) || isGRC(role) || isCompanyAdmin(role) }
export function canManageProject(role, userId, project) {
  if (!project || isGRC(role)) return false
  if (isSrPM(role) || isCompanyAdmin(role)) return true
  return role === 'project_manager' && String(project.managerId) === String(userId)
}

// ONE derivation of what the signed-in user's surfaces look like. The shell,
// the dashboard, the Start page and every enterprise page read this object, so
// a role can never be gated differently in two places. An individual (no
// company) is an ordinary self-serve user with no management surfaces.
export function roleViewOf(user) {
  const company = !!(user && user.companyId)
  const role = company ? (user.companyRole || 'member') : null
  const flow = company ? normalizeFlow(user.workFlow) : 'independent'
  const pm = company && isPM(role)
  const srpm = company && isSrPM(role)
  const grc = company && isGRC(role)
  const admin = company && isCompanyAdmin(role)
  const trainer = company && hasTrainerGrant(user && user.grants)
  return {
    company, role, flow,
    isWorker: flow === 'worker',
    isMixed: flow === 'mixed',
    // What the person DOES: start their own tasks, or receive assigned ones.
    canStart: canStartOwnTask(flow),
    showQueue: company && canReceiveAssignment(flow),
    // Management surfaces.
    isPM: pm, isSrPM: srpm, isGRC: grc, isCompanyAdmin: admin, isTrainer: trainer,
    // Teach studio: anyone holding the trainer grant; a company admin can too.
    showTeach: trainer || admin,               // /work/teach (record + author)
    showIncidents: company && canReceiveWorkflowIncidents(role, user && user.grants),   // workflow deviation inbox
    showPm: pm || admin,                       // /work/pm  (projects I manage)
    showSrPm: srpm || admin,                   // /work/srpm (all managers)
    showGrc: grc || srpm || admin,             // /work/grc  (oversight, read-only for GRC)
    canCreate: company && canCreateProject(role),
    canAssign: company && canAssignTask(role),
    // Project templates (Model B): PM / Sr PM / admin manage them; GRC reads
    // the list and the progress roll-up (the server gates the same way).
    showTemplates: pm || admin || grc,          // /work/templates (+ /:id roll-up)
    canManageTemplates: pm || admin,           // New template, Assign
    canReassignProject: company && canReassignProject(role),
    canAssignManager: company && canAssignProjectManager(role),
    seesAll: company && canSeeAllProjects(role),
    readOnly: grc,
  }
}

// Which company users a task may be handed to (worker or mixed flow). When the
// directory is not readable (a PM gets 403) a person's flow is unknown; one the
// data already shows as an assignee (`seenAsAssignee`, pmModel.peopleIndex) is
// proven assignable by the server's own rule, so they stay in the picker.
export function assignablePeople(people) {
  return (Array.isArray(people) ? people : []).filter((u) => u && (u.workFlow ? canReceiveAssignment(u.workFlow) : !!u.seenAsAssignee))
}
// Who may manage a project (PM, Sr PM; the company admin can create but the
// server requires the MANAGER to be a PM). Same fallback: a person the data
// shows managing a project holds a PM role.
export function managerCandidates(people) {
  return (Array.isArray(people) ? people : []).filter((u) => u && (u.companyRole ? isPM(u.companyRole) : !!u.seenAsManager))
}

export default {
  WORK_FLOWS, COMPANY_ROLES, RISK_SLA_DAYS, WORK_FLOW_OPTIONS, COMPANY_ROLE_OPTIONS,
  roleLabelKey, flowLabelKey, normalizeFlow, canStartOwnTask, canReceiveAssignment,
  GRANTS, GRANT_OPTIONS, canGrantTrainer, hasTrainerGrant, sanitizeGrants,
  isSrPM, isGRC, isPM, isCompanyAdmin, canCreateProject, canAssignTask, canReassignProject,
  canAssignProjectManager, canSeeAllProjects, canManageProject, canAuthorWorkflow, canReceiveWorkflowIncidents, canManageWorkflowIncidents, roleViewOf, assignablePeople, managerCandidates,
}
