# WorkCoPilot — Projects, Tasks & Guidance Depth (design spec)

Status: DRAFT for owner approval. No engine code changed yet. Author: guidance-depth
rethink, 2026-10-27. Supersedes the shape proposed in `guidance-depth-rethink.md`
(phase-ranges inside one flat list) with the owner's stronger model: a first-class
**Project → Task → Step** hierarchy.

Honesty/UX rules hold throughout: never expose a model or provider name to users, no
mechanism/routing talk in user copy, guidance always "guides, you act" (read-only),
US spelling, no em-dash.

---

## 1. Principles

1. **A task is a WORKFLOW, not a step count.** One coherent unit of work with its own
   done-state. Its step count is an output (12, 4, 24, 40) and may grow via clarifying
   questions and mid-journey correction. A task is NEVER split because it crossed a
   number.
2. **A large goal becomes a PROJECT of tasks** when it genuinely spans multiple distinct
   workflows, decided at initial analysis (after scope + clarification), one task per
   workflow.
3. **ZERO TOLERANCE for false projects / false tasks.** Do not split a coherent workflow;
   do not invent filler or duplicate tasks; never fabricate a plan when AI fails. A gate
   enforces this in both directions.
4. **Never lose a plan, task or step.** Everything planned is durable; new planning always
   runs the resilience ladder; total AI failure fails loud, safe and recoverable, never
   silent-empty and never invented.
5. **Depth is entitled and assigned** (superadmin -> company -> user pool). Simple tasks are
   byte-identical to today regardless of depth.
6. **Private Brain first (mandatory).** Every plan — the project map, each task's just-in-time
   step expansion, an injected task, and a rerun — MUST search the company/user Private Brain
   first and ground in what it returns. The search is never skipped and its outcome is always
   surfaced (grounded-in-X, or "no private knowledge covered this", or "brain locked"). It
   grounds, it never blocks: an empty/locked/unavailable brain still yields a plan from best
   practice, with that stated (so sec 9 Plan B and never-miss-a-plan both hold).
7. **Customer is the top grouping** (enterprise / service companies): who the work is for.
   Default always exists for self / product / consumer use.

---

## 2. The task test (makes zero-tolerance enforceable)

A unit is a real **task** only if ALL hold:
- it has its own clear **done-state**;
- it is **independently meaningful and verifiable**;
- it could **stand alone / be rerun** on its own.

A chunk that fails the test is folded into a neighbouring task, never made a task.
A goal whose whole of work is one workflow stays **one task** (no project).

---

## 3. Single task vs project (decided at initial analysis)

Flow (company): `pick customer (Default = self) -> name the project -> scope + clarify -> SEARCH PRIVATE BRAIN (mandatory, first) -> analyze -> decide -> plan map -> execute task-by-task -> rerun on demand`
Flow (individual): same, without the customer step — Premium names a project, regular describes a task.

- **One workflow -> one task** (any number of steps; grows naturally via Q&A and correction).
- **Multiple distinct workflows -> a project**, one task per workflow, each sized to itself
  (task 1 = 12 steps, task 2 = 4, task 3 = 7 ...).
- **"Task max depth" is a SOFT SIGNAL only**, never a guillotine. Two jobs: (a) at analysis,
  nudge "is this really several workflows?" (the semantic task test decides, not the number);
  (b) mid-task, if one task balloons into clearly separable workflows, FLAG and OFFER to
  restructure into a project — never auto-split (auto-split manufactures false tasks).

---

## 4. Data model: Project -> Task -> Step

- **Project**: `{ id, goal, endState {done, checks[]}, tasks[] (ordered), learnings[] (ledger),
  state, scale, owner, createdAt }`. Exists only for Depth-2 (see sec 8).
- **Task**: reuses the existing work-session machinery + `{ projectId, order, title, goal,
  doneState, state, steps[] (expanded just-in-time), plannedBy, dependsOn[] }`.
  `state in { pending, active, done, rerun }`.
- **Step**: unchanged shape (text, validate, url, commands, code, source, branches, onFail,
  destructive). Navigate/store/report are unchanged by the hierarchy above them.
- A single task (no project) is exactly today's session — zero change.

### 4A. Customers (enterprise / service companies)

A **Customer** is the top grouping for **company / enterprise accounts only**: *who the work is
for*. A service company (MSP, consultancy, agency) tags each project to the client it is for, or
to **Default** when working for itself. **Individual accounts — regular (Lite/Basic/Advanced) AND
Premium — have no customer at all**: they go straight to naming a project (Premium) or describing
a task (regular); no picker, not even Default. Hierarchy: company =
**Customer -> Project -> Task -> Step**; individual = **Project -> Task -> Step** (Premium) or a
single **Task** (regular).

- **Customer**: `{ id, companyId, name, state, createdAt }`, belongs to the company.
- **Default** exists for company accounts (work the company does for itself) and cannot be
  deleted. It is a company-scope concept; individual accounts never see a customer or Default.
- **Flow (company):** pick customer (Default = self) -> name the project -> the plan flow (sec 3).
  **Flow (individual):** no customer step; Premium names a project, regular describes a task. A
  company Depth-1 single task is still tagged to a customer; individual Depth-1 has none.
- **Value:** group, report and isolate per customer — a service company sees all projects for
  "Acme", can report per customer, and keeps each customer's work separate.
- **Managed by the company admin** (self-serve CRUD in the company console). The platform
  superadmin does not maintain company customer lists.
- **Future (not v1):** per-customer data boundary / keys (ties to the customer-held-key custody
  architecture); per-customer Private Brain partition.

---

## 5. Plan the map now, expand steps just-in-time

- At analysis, plan the **whole project map at once**: all tasks in order, each with its goal
  + done-state, plus the project **end-state**, so the user sees the entire journey immediately.
- Expand each task into **exact steps when it becomes active** (just-in-time), enriched by the
  learnings gathered so far. Rationale: steps planned weeks ahead go stale and cannot absorb
  earlier tasks' learnings; the map planned up front gives full visibility without that cost.
- The project **end-state is the anchor**: validate the task set reaches it with no gap and no
  scope creep (sec 8).

---

## 6. Forward learnings ledger

- Each finished task appends generalized **learnings** (a moved control, a changed flow, a
  current best practice) to the project ledger. Reuses the existing `learnings` input to the
  planner — no new plumbing; Phase A is what captures/saves learnings in the first place.
- The next task's just-in-time expansion reads the ledger, so task 2 benefits from task 1,
  task 3 from 1+2, and so on.
- **Rerun**: a user may rerun any task; it re-plans that task fresh with the full accumulated
  ledger. Rerun re-executes only that task; downstream tasks are untouched unless the user
  reruns them too.

### 6A. Private Brain grounding (mandatory, runs first)

Before ANY plan is generated — the initial project map, each task's just-in-time step
expansion, a mid-journey injected task, and a rerun — the pipeline MUST first search the
**Private Brain** (the company/user private knowledge: uploaded documents, Company Brain,
skills/playbooks, prior learnings) and pass the results into the planner as grounding.

- **Mandatory + first + ordered:** the planner is never invoked without a prior Private Brain
  search for that goal (gated by a regression test, sec 11). Today's brain retrieval is
  best-effort and conditional; this makes it a required first step.
- **Universal, scoped per tenant:** brain grounding applies to ALL users, not just premium.
  A regular / solo user grounds against the **platform Private Brain first** (plus their own
  uploads); a company user grounds against their **isolated company brain** (tenant isolation
  holds — a company never sees another's). The selected **customer** is carried as context
  (per-customer partitioning is a future extension, sec 4A). Only PROJECTS are gated by plan
  tier; brain grounding is never gated.
- **Grounds, never blocks (reconciles with Plan B + VIII):** when the brain has a match, steps
  cite it (`source` attribution -> "grounded in your documents" chip). When it has nothing,
  surface "no private knowledge covered this, planned from best practice" and plan anyway.
  When it is locked, surface "unlock your Private Brain to ground this" and plan anyway.
  An empty or unavailable brain never stops a plan from being produced.
- **Feeds the ledger:** mid-journey learnings (sec 6) are written back to the Private Brain so
  the next task/project is grounded in them.

---

## 7. Mid-journey new request -> task injection

When a new request arrives mid-journey (typed in Ask, or the guide detects a needed workflow
on screen), run this guarded path:

1. **Dedupe:** does a planned task already cover it? -> point the user there, create nothing.
2. **Small aside?** does it fit as a few steps in the CURRENT task? -> fold into the current
   task (forward re-plan of the remaining steps), NOT a new task. (Primary false-task guard.)
3. **Genuinely new, distinct, sizeable workflow?** -> plan a new task (or several if the
   request itself is large), using the learnings so far.
4. **Place by dependency, not at the end:** blocks the current task -> insert before it (if a
   hard prerequisite, pause current and do it now); independent/downstream -> insert later
   where its prerequisites are met and before whatever needs it; always keep the end-state
   reachable.
5. **Notify + reviewable:** "Created task X and inserted it before Y (because Y needs it),"
   with one-tap **move / not needed**. Auto-inject + notify (owner's choice), kept safe by the
   undo so an injected task can never silently become a false task.

Example: mid "Configure Incident Management", user says "we also need SSO for the portal" ->
no SSO task exists -> distinct sizeable workflow -> plan "Configure SSO for the Service Portal"
-> insert before "Portal go-live" -> notify. Whereas "set the incident SLA to 4 hours" folds
into the current task, no new task.

---

## 8. Depth model & entitlement

Two tiers, Tier 2 includes Tier 1:
- **Depth 1 (Standard / regular users):** single-task guidance + the Phase-A smarts + full
  Private Brain grounding (sec 6A). No projects. When analysis finds the goal is project-sized
  (multiple distinct workflows), the user is NOT handed a project and NOT given a fabricated or
  silently-truncated plan. Instead they get a clear, friendly fork:
  (a) **Upgrade to Premium** to run it as a guided project, or
  (b) **Shorten it** — the guide helps them pick one real task-sized slice to start now
  (a genuine single workflow, chosen with them, never an invented stub).
  Projects are important paid value, so this moment is a clean upgrade prompt, never a dead end.
- **Depth 2 (Deep / Projects):** adds the Project -> Task -> Step capability. Scale-aware, so a
  small goal still runs as a single flat task. Available to the **Premium** individual plan, or
  a company pool the admin granted Deep.

**Plan-tier mapping (individual accounts):** Lite, Basic, Advanced = regular = **Depth 1**
(single task + full Private Brain grounding + the upgrade-or-shorten fork on a project-sized
request). Premium = **Depth 2** (Projects). Company users follow the entitlement chain below,
not the individual tier.

**Concurrent / open tasks:** the current open-task cap (default 4, superadmin-editable per plan)
stays for Lite / Basic / Advanced; **Premium = unlimited open tasks** — a project runs many
tasks, so capping premium at 4 would contradict the feature. The open-task gate reads the plan's
task mode (`open` | `limit N` | `unlimited`) rather than a flat constant; the `tasks` plan config
already models this, so Phase B wires the gate to honor it per plan (and sets Premium to
`unlimited`).

Entitlement chain (single source of truth resolver, like the watch-mode/level resolver):
- **Superadmin -> company:** sets the company **ceiling** (Standard or Deep).
- **Company admin -> user pool:** assigns each seat pool a depth, **clamped to the ceiling**
  (a pool cannot exceed the grant; Deep is greyed out when not granted).
- **Effective depth = clamp(pool, companyCeiling)**. Projects are Premium + company users.

UI surfaces (Dashboard, Projects page) carry the "Large projects for Premium & company users"
message. Depth-1 users never see a project.

---

## 9. Planning resilience — the Plan B ladder (never miss a plan)

A plan, or an honest recoverable state, is produced under ALL circumstances. Extends the one
failover ladder in `ai.js` (SUPREME III/VI/VIII).

1. **Best model** (prod recommendation, e.g. the top chat model).
2. **Empty / weak / error -> fail over across every other configured provider.**
   FIX REQUIRED: an empty response (200, blank content) is today re-thrown, not failed over
   (it is neither a model-error nor a rate-limit). Treat empty/weak as retriable and route it
   through the full provider ladder; log an incident; surface the switch (never silent).
   FIX REQUIRED: planning must always carry a backup chain — `bestPlanningCall` passes
   `backup: null` on the platform path today; give it the remaining configured providers.
3. **Proven template / cached plan** from the workflow-template KB (a previously-validated plan
   for a matching goal). Reuse, not fabrication. (Template wiring is Phase A.)
4. **Total exhaustion** (no provider, no template): preserve everything already planned
   (durable in the store), auto-retry, and surface a clear actionable "AI briefly unavailable,
   retrying" state with the real reason. NEVER fabricate steps, NEVER silent-empty.

**Zero-tolerance reconciliation:** "never miss a plan" guarantees a plan whenever any model or
a proven template can make one; when literally nothing can, it fails loud/safe/recoverable
rather than inventing a false plan. A fabricated plan is a false plan and is forbidden.

Durability: once the map and a task's steps are planned, they persist. An outage mid-journey
cannot drop them; only new planning (a just-in-time expansion or an injected task) waits on the
ladder, while the rest of the project runs.

---

## 10. Build phases

- **Phase A — Foundation (Depth 1):** wire the built-but-unplugged logic (workAudit re-plan
  check, how-to learning capture, workflow-template reuse) and fix the `escalated` telemetry.
  Enables forward-learnings AND Plan-B rung 3. Low risk, no behavior rewrite. + regression tests.
- **Phase B — Entitlement/governance:** store `company.guidanceDepth` ceiling + `pool.guidanceDepth`
  assignment + clamp resolver + authz'd endpoints; thread resolved depth into plan/navigate/ask;
  **customer entity + company-admin CRUD** (company-scoped, Default seeded + undeletable); wire the
  open-task gate to the per-plan task mode (Premium = unlimited). + tests (ceiling clamps pool;
  Premium unlimited tasks; customer tenant isolation).
- **Phase C — Project engine (Depth 2):** Project/Task model + state + rerun; semantic
  single-task-vs-project decision + the task test; plan-map-now / expand-steps-just-in-time;
  forward-learnings ledger; mid-journey task injection; the zero-tolerance validator + gate;
  the Plan B ladder (incl. the two ai.js fixes); a dependency-aware **next / available-task
  resolver** (what to do next + which other tasks are independent and pickable now).
  + "scale:task is byte-identical" gate.
- **Phase D — UI (Fable):** Projects page + Dashboard (project, its tasks, state, rerun, inject
  notice/undo); superadmin company depth selector; company-admin pool selector (ceiling-aware)
  + company-admin **customer management** screen; the **customer dropdown on project start for
  company users only** (individuals go straight to project name / task); "Large projects for
  Premium & company users" copy + the regular-user upgrade-or-shorten prompt. Design-gated
  1280/640. + i18n -> 14 locales.
  **Mature project operations (WOW bar):** every project and task STATE has a real card, alert
  and menu built (nothing stubbed); on a task finishing, prompt to pick the next task OR another
  independent (non-dependent) task; injected-task notice + undo; rerun affordance; progress and
  end-state always visible. Maturity and polish across the entire project flow, not just a list.
- **Phase E — verify + ship:** full suite, build, DB backup, deploy, verify live.

Modules stay small and single-responsibility (SUPREME XV): e.g. `work_project.js` (map +
task state), `work_project_validate.js` (zero-tolerance gate), `work_replan_forward.js`
(shared forward re-plan on the best model with full grounding), `work_plan_resilience.js`
(the Plan B ladder). The host files keep thin wiring only.

---

## 11. Regression gates / ship criteria (SUPREME XI)

- A single task (scale:task) produces byte-identical output to today.
- The validator rejects: a project where one task would suffice; a task failing the task test;
  a task set that does not reach the end-state (gap) or exceeds it (scope creep).
- The planner NEVER returns a silent empty: an empty primary response fails over and is logged;
  exhaustion yields the recoverable state, never [].
- Mid-journey injection dedupes (no duplicate task), folds small asides (no false task), and
  places by dependency.
- Ceiling clamps pool (a pool can never exceed the company grant).
- Rerun re-plans a task with the accumulated ledger and leaves the rest of the project intact.
- The planner is NEVER invoked without a prior Private Brain search for that goal/customer
  (initial map, task expansion, injected task, rerun) — and an empty/locked brain still yields
  a plan (grounds, never blocks).
- For company users the customer picker defaults to Default (= self) and Default cannot be
  deleted; individual accounts (regular + Premium) never show a customer picker.
- A regular (Depth-1) user NEVER gets a project: a project-sized request yields the
  upgrade-or-shorten fork (sec 8), never a fabricated project and never a silently-truncated one.
- Private Brain grounding runs for EVERY user (regular -> platform brain; company -> isolated
  company brain); it is never gated by plan tier.

---

## 13. Reporting, failover governance & final validation (owner additions 2026-10-27)

### Project reports (enterprise + Premium)
A user can generate a report FOR A PROJECT, on demand, reusing the report templates/style
already in the dashboards (one canonical style, SUPREME IX):
- **Success report:** rolls up the successes + confirmed steps of ALL completed tasks in
  the project into one report (per-task outcomes aggregated to project level).
- **Security report** and **Error report:** the project's security-relevant actions/flags,
  and the errors/failures hit and how they were resolved, across its tasks.
Project-level reporting is enterprise + Premium (regular tiers keep the existing per-task
report). Built on the existing report engine + unified style; UI = Fable.

### Completed-task storage, tagging & display (enterprise treatment)
Every task is STORED with full tagging and RETAINED after completion:
`{ projectId (null for a standalone simple task), customerId, title, status
(pending|active|done|rerun), outcome, order, dependsOn[], startedAt/endedAt }` plus its
**telemetry** (what planned it, what guided it, deepened?, any failover/switch, duration,
step count, success signal). Telemetry is persisted on the task + rolled up to the project
at ALL times, never only transient.
Display:
- A completed task shows UNDER its project (grouped by project, in order, each with its
  state + outcome + a telemetry readout), so a project reads as one coherent whole.
- A standalone simple task (no project) shows in its own designated area (recent / standalone
  tasks), NOT mixed into the project view.
- Enterprise treatment throughout: grouping, filters, per-task + per-project telemetry, audit,
  and project report generation (above). UI = Fable; every state has a real card/alert/menu.

### Failover governance (superadmin + company)
- **Failover is ON by default**, for BOTH text and vision (the ai.js ladder).
- The **superadmin** gets the forms / alerts / requirements to see and manage failover:
  configured providers, failover order, live incident alerts (every switch is an incident),
  per-key health. The same controls at the **company** level for a company on its own/
  corporate keys (scoped to that company). All of it built, nothing stubbed.
- Every failover switch stays a surfaced incident (SUPREME III), never silent.

### Dashboard recommendation vs autoheal (kept separate)
- When the AI-config dashboard lists models for the operator to SELECT, show the QUALITY,
  CHEAPEST and fastest recommendations so they pick deliberately. This selection path does
  NOT auto-heal - the operator's pick is honored; a recommendation is guidance, not an
  automatic swap (SUPREME III).
- Autoheal / failover is the SEPARATE runtime safety net (only when a pinned model is dead /
  rate-limited / persistently empty), surfaced as an incident - it never silently overrides
  the operator's deliberate dashboard selection.

### Vision transient-empty tolerance (watch loop)
The continuous watch loop tolerates occasional unreadable frames (target <=2 of 5): one
empty / blurry / transition frame is skipped and the next frame recovers; the vision model is
switched/escalated only on PERSISTENT empties (stateful per-session counter). One-off reads
(plan/how-to with a frame) still escalate an empty to the strong backup. Lands with Phase C.

### Final validation (after Phase C)
Once the project engine is built, run the broad E2E on the LIVE engine: 100+ profession tasks
across multiple LARGE (project-sized) scenarios, verifying task breakdown, how tasks are wired
(dependencies/ordering), how learnings carry forward, how tasks sequentialize, mid-journey
injection, rerun, and the zero-tolerance gates - the 100-task profession harness extended to
projects.

---

## 12. Open decisions (confirm before/with build)

1. Clamp semantic: a pool can never exceed the superadmin ceiling. (Assumed yes.)
2. Mid-journey injection: auto-inject + notify + one-tap undo/move. (Assumed yes.)
3. Plan B never fabricates; on total exhaustion it fails loud/safe/recoverable. (Assumed yes.)
4. "Task max depth" is a soft hint/flag only, never an auto-split. (Assumed yes.)
5. A sensible soft-hint value for task size (~20 steps) to prompt the "is this a project?" look.
6. RESOLVED: customer names are managed by the COMPANY ADMIN (self-serve CRUD); the platform
   superadmin does not maintain them.
7. RESOLVED: individual accounts (regular + Premium) have NO customer and NO picker (not even
   Default); customers + Default are company / enterprise only.
8. "Private Brain first" = always-search-first + outcome surfaced, but it GROUNDS and does not
   BLOCK when the brain is empty/locked (so a plan is still produced). Confirm this reading vs
   a stricter "refuse to plan without a brain match" (which would conflict with Plan B).
