# Team projects: many people on one project, and the knowledge base they share

Status: design spec, 2026-10-27. Not built. Prompted by a company admin's question: "If I have 10 people working on a project, can I add people to the project, and will they get the same knowledge base and the same tasks that were created earlier, including completion?" This separates what is already true from what is new, and lays out the two models the question is really asking between. Grounded in the current code; US spelling.

## 1. The three parts of the question, answered honestly

1. Same knowledge base? Already true. The company knowledge base is shared across every member of the company today. `store._learnHolder(userId)` resolves a company member to the shared company KB (one object on the company, an admin on/off switch `kbEnabled`, default on). Proven workflows and tool-specific facts learned from one person's successful sessions are already served to the other nine when they plan similar work. Nothing new is needed for KB sharing.
2. Add people to the project? Not today. Projects are per-user: `store.createWorkProject(workUserId, ...)` and `listWorkProjects(workUserId, ...)` key everything to the creator. A project has no membership or sharing. This is the new capability.
3. Same tasks including completion? Depends which of two models is meant, and they behave oppositely on completion. See below.

## 2. Two models (the fork that matters)

"Ten people on a project" is ambiguous between two very different things.

### Model A: collaborative project (one project, many hands)
One shared task map. Tasks are assigned to different members. Completion is shared and single-source: if someone finished task 3 earlier, a newly added member sees it already done. The forward-learnings ledger flows across people (member A's task-1 learnings seed member B's task-2). This is a team executing one rollout together, a work breakdown structure with assignees. "Add people to the project, same tasks and completion" maps most directly to this.

### Model B: clone-to-many (the same procedure for each person)
The project is a template. Each of the ten gets their own run of the same tasks. Completion is per person; the admin sees who has finished. This is standardization and onboarding at scale. The shared KB is the engine here: person 1's run captures the proven workflow, persons 2 to 10 are grounded in it automatically through the company brain.

### Completion semantics, side by side
| | Model A (collaborative) | Model B (clone-to-many) |
|---|---|---|
| Task map | One, shared | One template, copied per person |
| Who does a task | Assigned member | Every person does all of them |
| Completion | Shared, single source; done once, everyone sees it | Per person; admin aggregates who is done |
| Forward-learnings ledger | Shared across members within the project | Per run, but each run is seeded from the shared KB of prior runs |
| Best for | A team delivering one rollout or migration | Onboarding, compliance, a procedure many must each perform |

## 3. Feasibility

### Model A: the bigger lift (an ownership change)
The engine itself carries over: the up-front map, just-in-time task expansion, the dependency graph, the ledger, mid-project injection, and reports all still apply. What changes is ownership and coordination:
- Project ownership moves from a single `workUserId` to a company plus a member set. `createWorkProject` / `listWorkProjects` / `getWorkProject` and the project routes (all currently `req.workUser.id`) gain a company-scoped, membership-checked path.
- A task gains an `assignee`. "Next actionable task" becomes "next actionable task for this member" (assigned to me, dependencies met).
- Task state and completion are shared and must be written safely under concurrent members (one writer semantics per task, as the store already guards task transitions).
- Authz: members may view the project and act on their tasks; only an admin manages membership and assignment.
This is a real refactor of the project's ownership keying. The rest is additive.

### Model B: lighter
Each run is an ordinary single-user project seeded from a shared map and the already-shared company brain. The new parts are an admin action ("assign this project to these people", which creates a run per person) and an aggregation view (who has completed, how far each is). No ownership refactor; it leans on infrastructure that exists.

## 4. Privacy scoping (a firm constraint, not an afterthought)

A shared project must never leak one person's guided-session evidence (redacted frames, the audit trail) to the other members. What is shared is task structure, assignment, and completion state. Raw session artifacts stay per person under that person's egress policy. The forward-learnings ledger is shareable because it holds generalized, already-scrubbed facts, not raw screens. Any team view shows progress and outcomes, never another member's captured frames unless that member's policy permits it.

## 5. Authz and the admin model

This fits the existing company-admin and Customers structure: a team project sits under a Customer, the admin creates it and manages membership and assignment, members work their tasks. Reuses the tenant isolation already in the customer and depth routes.

## 6. Tiering

Team projects are a company and Premium capability, consistent with Projects being Depth-2 and the unlimited-open-tasks entitlement. Model B (assign a procedure to a workforce) and Model A (a team on one rollout) are both squarely enterprise.

## 7. Recommendation

Build Model B first. It is lighter, it leans on the already-shared KB, it is immediately useful for onboarding, standardization and compliance, and its per-person completion gives the admin the audit they asked about. Treat Model A as the larger collaborative build (the ownership refactor) once B proves the demand. Tell the admin now that the knowledge base is already shared company-wide; that part of their question is already answered by the product as it stands.

## 8. Next-wave sequencing (where this sits)

Relative to the other agreed work (`session-2026-10-27-decisions.md`, `context-grounding-spec.md`, `recommended-practices-spec.md`):
1. Shipped: desktop-path removal; context grounding files-for-all-tiers + cap + paste-text (branch feat-context-grounding).
2. Next wave: context grounding KB pick; Recommended Practices narrow.
3. Team projects, Model B (clone-to-many): fits here, since it reuses the shared KB and single-user runs and gives the admin workforce-scale standardization. A good companion to Recommended Practices (a curated procedure, assigned to many, improved by practices).
4. Team projects, Model A (collaborative, shared completion): the larger build, scheduled after B, because it is an ownership refactor.
Underneath all of it, the brain keeps filling, which is what makes both the KB sharing and Model B valuable.

## 9. Open decisions for the owner

1. Which model the admin actually wants first (collaborate on one project, or assign a procedure to many). Likely both over time; B is the cheaper start.
2. For Model B, whether a run is a full project copy per person or a lighter per-person progress record against one shared template.
3. For Model A, the assignment model: self-serve pick from a shared pool, or admin-assigned per task.
4. What a team or admin dashboard shows (progress, outcomes) while honoring the per-person evidence boundary in section 4.

## 10. Honest value and risk

Value is high and enterprise-shaped: this is the payoff for Projects being a company feature, and it answers a real buyer question (a team on a rollout, or a workforce onboarding). Risk is mostly in Model A's ownership refactor and in the privacy boundary; both are manageable with the staged B-then-A plan. The reassuring part, shared KB, is already real, so the admin can be told yes today on that, and "coming, here is the shape" on the rest.
