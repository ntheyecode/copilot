# Enterprise project management: flows, roles, assignment, dashboards, risk and reports

Status: design spec, 2026-10-28. Not built. The enterprise control layer on top of the live project engine. Supersedes and absorbs the earlier `team-projects-spec.md` (its "Model A" collaborative ownership is Phase 1 here). Grounded in the current code; US spelling; think-like-enterprise.

## 1. The model: two orthogonal axes the admin sets per user

A company admin sets, at user creation and editing, TWO independent things:

1. **Work flow** (how guided tasks reach this user):
   - **Worker** - only does tasks a manager assigned to them; sees NO "start a task". 
   - **Independent** - self-serve, starts their own tasks (today's behavior); not assigned to.
   - **Mixed** - both: a manager can assign to them AND they can start their own.
2. **Management role** (a grant on top, may be none):
   - **Project Manager (PM)** - creates projects, breaks them into tasks, assigns tasks to company users, and sees the dashboards and reports for the users and projects they manage.
   - **Senior Project Manager (Sr PM)** - oversees PMs: sees which projects each PM manages, generates project reports across them, can start a task and assign a PM, and can reassign a whole project from one PM to another.
   - **GRC** - read-only oversight of ALL projects: a comprehensive dashboard with graphs, status and risks. No create/assign.

The axes are orthogonal: a PM (role) with a Mixed flow can both manage projects and personally run assigned tasks. A pure Worker has no role. Existing roles stay (`member`, `company_admin`, `executive`); the new management roles extend them.

## 2. Permissions matrix (who can do what)

| Capability | Worker | Independent | PM | Sr PM | GRC | Company admin |
|---|---|---|---|---|---|---|
| Start own task | no | yes | per flow | yes | no | per flow |
| Receive assigned task | yes | no | per flow | per flow | no | per flow |
| Create project + tasks | no | no | yes | yes | no | yes |
| Assign task to a user | no | no | yes (own projects) | yes (any) | no | yes |
| Reassign a task from one user to another | no | no | yes (own projects) | yes (any) | no | yes |
| See a managed user's dashboard/reports | no | no | yes (their assignees) | yes (all) | read-only (all) | yes |
| Reassign a project to another PM | no | no | no | yes | no | yes |
| Assign/He a PM to a project | no | no | no | yes | no | yes |
| All-projects risk/status dashboard | no | no | own | all | all (read-only) | all |
| Set a user's flow + role | no | no | no | no | no | yes (+ Sr PM for PM assignment) |

Flow ("per flow") means the Worker/Independent/Mixed axis governs it even when the user also holds a role.

## 3. Data model changes (grounded)

- **User** (`store.js`): add `workFlow` in {`worker`,`independent`,`mixed`} (default `independent` for existing individuals; company admin sets it). Extend the company role set `COMPANY_ROLES` (`store.js:2079`, today `['member','company_admin','executive']`) with `project_manager`, `senior_project_manager`, `grc`. A user has one `companyRole` plus the `workFlow`.
- **Project** (`work_project.js newProject`, today keyed to `workUserId`): add `companyId` (the owning tenant) and `managerId` (the PM who owns it); keep `createdBy`. Ownership moves from "one user" to "a company project managed by a PM", which is the Team Projects Model A refactor. Individual (non-company) users keep today's per-user projects unchanged (backward compatible).
- **Task** (`work_project.js newTask`): add `assigneeId` (the user doing it), `assignedAt` (timestamp, for the SLA/risk clock), `assignedBy`. Task state already exists (pending/active/done/rerun) and the dependency graph already gates actionability; "who is doing it" is the new `assigneeId`.
- **Assignment events + logs**: every assign, reassign, flow/role change, project hand-over and task state change appends to a detailed, append-only log with who/what/when/why (reuses the destructive-logging discipline and the hash-chained audit log already in the product).

## 4. Flow behavior

- A **Worker** opening the app sees their **assigned task queue**, not the "Start a task" wizard. They run each assigned task through the existing guided loop; they cannot create a task or a project.
- An **Independent** user sees the Start-a-task wizard exactly as today, and is not in any PM's assignable pool.
- A **Mixed** user sees both: their assigned queue and the Start button.
- The flow is enforced server-side (the start-task route refuses a Worker) and reflected in the UI (the Worker simply has no Start affordance), so it is real segregation, not a hidden button.

## 5. Project Manager dashboard

- **My projects**: each with progress (tasks completed / total), state (ongoing / held / done), and the end-state checks.
- **Per project**: the task map with each task's state and **assignee**; which tasks are **incomplete**, **completed**, **not started**; which user is doing which task now.
- **Assign / reassign flow**: pick a task, pick an assignable company user (Worker or Mixed), assign; the user gets it in their queue; the assignment is logged and starts (or resets) the SLA clock. A PM can also **reassign a task from one user to another** within their projects (moves `assigneeId`, resets `assignedAt`, preserves the task's progress/state and its guided session, logged with who/from/to/why). The previous assignee's queue drops it; the new assignee's queue gains it.
- **User productivity report** (per assignee): what they are working on, time spent (from session telemetry), solved or not, and counts of not-started / in-progress / completed / incomplete. Exportable in the unified report style.
- A PM sees only the users and projects they manage (segregation).

## 6. Senior Project Manager dashboard

- **All PMs and their projects**: a roll-up of every PM, the projects they manage, and each project's status.
- **Project reports** across all PMs (the unified report style, the project-report engine extended to the manager tier).
- **Start a task and assign a PM**: a Sr PM can create a project/task and hand it to a PM to manage.
- **Reassign a project**: move a whole project from one PM to another (updates `managerId`, re-scopes the old and new PM's dashboards, logged with reason). In-flight assignee tasks are preserved; only the managing PM changes.

## 7. GRC dashboard (read-only oversight)

- **All projects** across the company, with **graphs**: status split (completed / ongoing / held), throughput over time, load per PM.
- **Risk register**, computed, not manual:
  - a task **waiting more than 5 days since assignment** without being started or completed (the SLA breach you named; threshold configurable),
  - a project **held** beyond a threshold,
  - an **overdue** project end-state,
  - an **unassigned** actionable task sitting idle.
  Each risk is a row with the project, task, owner, age and the suggested action.
- **Detailed logs**: the full assignment / reassignment / state-change / flow-change trail, filterable. Read-only; GRC never creates or assigns.

## 8. Reports

- **Project report** (success / security / issues) already exists per project (`work_project_report.js`); extend it to roll up at the PM and Sr PM tiers and to carry the risk register for GRC.
- **User productivity report**: per user, across their assigned tasks - time spent, solved vs not, state counts, and a trend. New, built on the session telemetry (`recordSessionCall`, `meterCost`) and the project task outcomes already captured.
- All reports in the unified report style; honest (no model/provider names, guarantees-not-mechanism, hypothetical savings only where applicable).

## 9. Segregation, logs, tiering

- **Segregation** is enforced server-side on every route (a PM cannot read another PM's users; a Worker cannot create; GRC is read-only), not just hidden in the UI. This is a compliance property.
- **Detailed logs** for every control action, append-only, who/what/when/why, reusing the hash-chained audit log.
- **Tiering**: this is a company / enterprise capability, consistent with Projects being Depth-2; GRC and Sr PM are enterprise-plan roles.

## 10. The ownership refactor (the heart of Phase 1)

The project store is per-user today (`createWorkProject(workUserId)`, `listWorkProjects(workUserId)`). Phase 1 moves a COMPANY project to `{ companyId, managerId, tasks:[{assigneeId,...}] }` with membership-checked, role-scoped access, while leaving individual per-user projects exactly as they are (backward compatible). The engine itself - the up-front map, just-in-time expansion, the dependency graph, the ledger, injection, reports - carries over unchanged; what changes is ownership keying, task assignment, and "next actionable task for ME (my assignee tasks, dependencies met)".

## 11. Phased build plan

1. **Phase 1 - data model + segregation core (backend):** `workFlow` + the new roles; project `companyId`/`managerId`, task `assigneeId`/`assignedAt`; the ownership refactor with role-scoped, membership-checked access; the start-task refusal for Workers; assignment + reassignment + the logged events. Pure, tested, no UI yet.
2. **Phase 2 - assignment + Worker queue (client):** admin user-create/edit gains flow + role; the Worker's assigned-task queue replaces Start; the PM's assign action.
3. **Phase 3 - PM dashboard:** projects, per-project task/assignee view, incomplete/completed/not-started, who-is-doing-what.
4. **Phase 4 - Sr PM dashboard:** all-PMs roll-up, start+assign a PM, reassign projects, cross-PM reports.
5. **Phase 5 - GRC dashboard + risk engine:** all-projects graphs, the computed risk register (>5-day SLA etc.), the full log view.
6. **Phase 6 - productivity reports:** per-user productivity across assigned tasks, exportable.

Each phase ships tested and render-verified; the backend (Phase 1 and the route/segregation work) is built carefully as the foundation before the dashboards.

## 12. Open decisions for the owner

1. SLA threshold default (you said 5 days) and whether GRC/admin can tune it per company.
2. Whether a Sr PM is also implicitly a PM (can manage projects directly) or purely oversees.
3. Whether GRC is company-scoped only, or a platform-level oversight role too.
4. "Held" state semantics: who can hold a project and why (manual hold vs auto-hold on a blocker).
5. Whether reassigning a project also reassigns its in-flight tasks' assignees, or only the managing PM (spec assumes only the PM changes).

## 13. Honest feasibility and risk

Feasible and high-value - this is the enterprise control plane that makes WorkCoPilot a managed, auditable work platform, not just a personal guide. The real work and risk is Phase 1: the ownership refactor and the server-side segregation (getting the permission matrix right on every route is where compliance lives). The dashboards and reports are additive on top and reuse the existing engine, telemetry and report style. Build Phase 1 carefully and tested; the rest follows.
