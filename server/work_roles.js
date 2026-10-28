// Enterprise project-management RBAC: work flows + management roles.
// SINGLE SOURCE for the permission matrix (SUPREME RULE II). Pure, no store,
// so it is fully unit-tested and every route reads its answers from here rather
// than re-deciding access inline.
//
// Two orthogonal axes the company admin sets per user:
//   - work FLOW (how guided tasks reach them): worker | independent | mixed
//   - management ROLE (a grant on top; the user's companyRole):
//       member | company_admin | executive  (existing)
//       project_manager | senior_project_manager | grc  (added here)
// A Senior PM is a superset of PM (can also manage projects directly). GRC is
// read-only oversight. The flow governs starting vs receiving tasks regardless
// of role.

export const WORK_FLOWS = ['worker', 'independent', 'mixed']
export const MGMT_ROLES = ['project_manager', 'senior_project_manager', 'grc']
export const RISK_SLA_DAYS = 5          // owner default; configurable per company
const DAY_MS = 86400000

export function normalizeFlow(v) {
  const s = String(v || '').trim().toLowerCase()
  return WORK_FLOWS.includes(s) ? s : 'independent'
}

// ---- Flow capabilities (worker-side) ----
// A worker never self-starts; an independent user is never assigned to; mixed does both.
export function canStartOwnTask(flow) { return normalizeFlow(flow) !== 'worker' }
export function canReceiveAssignment(flow) { return normalizeFlow(flow) !== 'independent' }

// ---- Role predicates (role = the user's companyRole) ----
export function isSrPM(role) { return role === 'senior_project_manager' }
export function isGRC(role) { return role === 'grc' }
// A PM capability holder: PM, or Sr PM (superset), or a company admin.
export function isPM(role) { return role === 'project_manager' || isSrPM(role) }
export function isCompanyAdmin(role) { return role === 'company_admin' }

// ---- Management capabilities ----
export function canCreateProject(role) { return isPM(role) || isCompanyAdmin(role) }
export function canAssignTask(role) { return isPM(role) || isCompanyAdmin(role) }
export function canReassignTask(role) { return isPM(role) || isCompanyAdmin(role) }
export function canReassignProject(role) { return isSrPM(role) || isCompanyAdmin(role) }
export function canAssignProjectManager(role) { return isSrPM(role) || isCompanyAdmin(role) }
// Sr PM, GRC and the company admin see every project in the tenant; a plain PM
// sees only the projects they manage.
export function canSeeAllProjects(role) { return isSrPM(role) || isGRC(role) || isCompanyAdmin(role) }
export function isReadOnlyOversight(role) { return isGRC(role) }
// Only the company admin sets flows and roles; a Sr PM may additionally hand a
// project to a PM (assign the managing PM), but not change a user's flow/role.
export function canSetUserFlowAndRole(role) { return isCompanyAdmin(role) }

// Can this user act on this specific project? GRC is view-only (see canWrite*).
export function canViewProject(role, userId, project) {
  if (!project) return false
  if (canSeeAllProjects(role)) return true
  return isPM(role) && project.managerId === userId
}
// Write (create tasks, assign) on a project: the managing PM, a Sr PM, or admin.
// GRC can never write.
export function canManageProject(role, userId, project) {
  if (!project || isGRC(role)) return false
  if (isSrPM(role) || isCompanyAdmin(role)) return true
  return role === 'project_manager' && project.managerId === userId
}

// ---- Risk engine (computed, not manual) ----
// A task assigned more than slaDays ago and not yet done/active is an SLA breach.
// A held project, an overdue end-state, or an unassigned actionable task are also
// risks (the latter two are computed by the store with project context).
export function taskSlaRisk(task, now = Date.now(), slaDays = RISK_SLA_DAYS) {
  if (!task || !task.assignedAt) return null
  if (task.state === 'done') return null
  const ageMs = now - new Date(task.assignedAt).getTime()
  if (!(ageMs > 0)) return null
  const ageDays = ageMs / DAY_MS
  if (ageDays <= slaDays) return null
  return { kind: 'sla_breach', taskId: task.id, assigneeId: task.assigneeId || null, ageDays: Math.floor(ageDays), slaDays }
}

export default {
  WORK_FLOWS, MGMT_ROLES, RISK_SLA_DAYS, normalizeFlow,
  canStartOwnTask, canReceiveAssignment,
  isSrPM, isGRC, isPM, isCompanyAdmin,
  canCreateProject, canAssignTask, canReassignTask, canReassignProject, canAssignProjectManager,
  canSeeAllProjects, isReadOnlyOversight, canSetUserFlowAndRole,
  canViewProject, canManageProject, taskSlaRisk,
}
