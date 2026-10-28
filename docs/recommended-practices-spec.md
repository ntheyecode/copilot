# Recommended Practices: grounded suggestions a user can rope into a plan

Status: design spec, 2026-10-27. Not built. For review before any implementation, like `guidance-projects-spec.md`. US spelling, no generated artifacts, never expose a model or provider, guarantees are never promised.

## 1. Intent

WorkCoPilot guides a person through the work they asked for. This feature lets it also guide them toward *better* work: while planning (and later, mid project), it offers a small number of grounded, optional improvements for this kind of project. If the user likes one, they rope it in and it becomes part of the plan. If not, it is dismissed and never shown again.

The whole value rests on one rule: suggestions are evidence backed, not the model freelancing. A suggestion that cannot name why it is worth doing does not get shown.

## 2. Principles this must honor (existing product law)

- Private brain first. Suggestions are drawn from proven work before any model reasoning. Ties to the brain-first rule and the tiered template retrieval already in `work.js` (`pickWorkflowTemplate`, `distillWorkflowTemplate`) and `store.js` (`getWorkflowTemplates`, `captureWorkflowTemplate`, `recordTemplateServed`).
- Zero tolerance for false tasks. A roped-in suggestion is injected through the existing gate, so it can never create filler or a duplicate.
- Read only, no generation. A suggestion that implies a deliverable hands off a prompt; it never generates a document or image.
- Security first. Suggestions bias toward backups, rollback, least privilege, staging and verification, consistent with the security-first guidance posture.
- Minimal, productized UX. Clean cards, never clutter; the flow is never blocked; dismissals are remembered.
- Never expose a model or provider; label the source in plain words; never present a suggestion as a guarantee or as certification.
- Single source of truth. One practices catalog, one ranking module, one accept path.

## 3. Concept and the three moments it fires

1. At plan time (the MVP). After a project map is generated and passes the zero-tolerance gate, a parallel pass offers 2 to 4 additions or reorderings. Examples: cloud migration, "stage in a sandbox before production" and "add a rollback and validation task before go-live"; ServiceNow rollout, "reconcile the CMDB before enabling discovery"; any public endpoint, "enable MFA before exposing it".
2. Mid project (future). Contextual to the active task and what is on screen: "teams usually verify X here before moving on".
3. Retrospective at finalize (future). "Next time, do Y earlier", which also feeds the brain so the suggestion improves for the whole org.

Suggestions never block planning. At plan time they are produced after the map is returned, so the user always sees the plan first and the cards arrive beside it.

## 4. The suggestion object

A suggestion descriptor (new, persisted per project or session):

```
{
  id,
  source: 'company_brain' | 'platform_brain' | 'discipline_catalog' | 'model',
  confidence: 0..1,
  kind: 'add_task' | 'add_step' | 'reorder' | 'caution' | 'prompt_handoff',
  title,                      // short, plain
  rationale,                  // why, with the source stated in plain words
  disciplineKey,              // the matched method anchor, when any
  proposed: {                 // what roping it in would do
    taskDescriptor?,          // for add_task: goal + doneState + dependsOn hints
    steps?,                   // for add_step
    placement?,               // blocksTaskId | dependsOn | frontier
    promptText?               // for prompt_handoff (no generation)
  },
  state: 'offered' | 'accepted' | 'dismissed',
  servedAt, decidedAt
}
```

## 5. Grounding model (the quality core)

Sources, in descending trust, each producing candidate suggestions that are then merged, deduped and ranked:

1. company_brain. Proven workflows captured from this company's own clean-success sessions. A recurring step or ordering that this org's successful runs share but the current map lacks becomes a suggestion. Rationale reads "based on your team's past work". Fetched via `getWorkflowTemplates(holder)` matched to the goal with the same matcher as `pickWorkflowTemplate`.
2. platform_brain. The same, cross tenant, already scrubbed through the policy chokepoint (commit 9d2a233). Rationale reads "common across teams doing this kind of work".
3. discipline_catalog. A curated best-practices set keyed off `method_anchors.js` (51 disciplines, most-specific-first). Add a `practices` array to each anchor, or a sibling `work_practices_catalog.js` that reads anchors. Authoritative and admin-curatable. Rationale reads "a standard practice for this type of project".
4. model. Last resort only, clearly lower confidence, produced by a constrained prompt (propose only grounded, security-first, dismissible improvements; label each; no fabrication; US spelling), reusing the existing best-planning call path. Rationale is phrased as a suggestion, never a fact.

Dedup against the plan: a candidate already covered by a task in the map is suppressed, reusing the token-set similarity (`tokenize`, `jaccard`) from `work_project_inject.js`. Cap and rank: top 3 at plan time by (source trust times estimated value); fewer mid journey.

## 6. The rope-in contract

- Accept an add_task: build a task descriptor from `proposed.taskDescriptor` and call `store.injectWorkProjectTask` (existing), which runs dependency-aware placement, dedupe and cycle avoidance, and the real-task check (`isRealTask`). A suggestion that would not be a real task is never offered in the first place; the gate is the backstop. Roping in counts against the project's injection budget.
- Accept an add_step: add the step or steps to the active task's plan and re-plan within the goal lock and replan budget.
- Accept a reorder: apply the dependency change through the same injection and cycle checks.
- Accept a prompt_handoff: present `proposed.promptText` for the user to carry to the tool. No generation.
- caution: informational only, no plan change; acknowledging it just dismisses the card.
- Dismiss: mark dismissed, remember it, and never offer an equivalent again (matched by discipline plus token similarity).

## 7. UX

- Plan-time cards appear on the project map screen, under or beside the map, at most three, each with title, one-line rationale with the source in plain words, and Add / Dismiss (and Tell me more, which uses the existing how-to drill-down). Fable owns the design; clean, on brand, no overflow at 1280 and 640.
- Accepting animates the new task into the map at its placed position with a short "added and placed" confirmation; dismissing collapses the card.
- A small, honest empty state when there is nothing worth suggesting (most plans are fine as drawn); never invent filler to fill the slot.

## 8. Telemetry and the flywheel

- Every offered, accepted and dismissed event is recorded with source and reason, through the existing session-telemetry choke point.
- Accepted suggestions whose task reaches clean success are reinforced back into the brain via `captureWorkflowTemplate`, so the org's own practices get stronger over time.
- A company-admin view, "most-accepted practices", lets an org see and eventually curate its standard. This compounding per-company intelligence is the moat.

## 9. Tiering

- Lightweight single-task tips: all tiers (Lite, Basic, Advanced), a natural nudge toward Premium. (Future phase.)
- Rope-in-to-a-project and mid-journey injection: Premium and company-deep, gated by `canUseWorkProjects`, consistent with the project engine.
- Company admins curate the discipline catalog and approve or pin org practices: enterprise governance surface. (Future phase.)

## 10. Guardrails and risks

- Volume: hard cap, ranked, never blocking, always dismissible, dismissals remembered. The default experience is quiet.
- Hallucination: grounding order plus confidence labels plus the zero-tolerance gate on rope-in. The model tier is last and clearly marked.
- Security first: the catalog and the model prompt both bias toward safety steps.
- No generation: prompt_handoff only, never a produced artifact.
- Scope creep: rope-in counts against the injection and replan budgets and respects goal lock, so suggestions cannot balloon a project.
- Privacy: platform_brain candidates pass the scrub chokepoint; no raw cross-tenant content is ever surfaced.
- Latency: plan-time suggestions are produced after the map returns, so they never delay the plan the user is waiting for.

## 11. Proposed modules and endpoints

New (marked clearly as not yet built):
- `server/work_practices.js` (pure): merge, dedupe (reusing inject tokenization), confidence thresholds, ranking, cap. Unit tested.
- `server/work_practices_catalog.js` (or a `practices` field on `method_anchors.js`): the curated discipline best-practices set, single source.
- `server/work_practices_routes.js`: `registerWorkPracticeRoutes`.
- `server/store.js` additions: persist offered/accepted/dismissed per project and session; dismissal memory; telemetry counters.

Endpoints:
- `POST /api/work/projects/:id/practices` generate suggestions for the map (gated by `canUseWorkProjects`).
- `POST /api/work/projects/:id/practices/:sid/accept` rope in (routes to `injectWorkProjectTask` or the step or reorder path).
- `POST /api/work/projects/:id/practices/:sid/dismiss`.
- `POST /api/work/sessions/:id/practices` single-task tips (future, all tiers).

Reused as is: `work_project_inject.js`, the gate in `work_project_validate.js`, the templates and brain in `store.js` and `work.js`, `method_anchors.js`, the scrub chokepoint, `guidance_depth.js`, `llm_guard.js`, the best-planning call path and the session-telemetry choke point.

## 12. MVP (Phase 1), the slice we build and test first

- Trigger: project plan time only, after the gate. Premium and company-deep.
- Sources: company_brain plus discipline_catalog plus the model fallback. platform_brain read-only if cheap, else deferred to Phase 5.
- Kinds: add_task and caution only. Defer add_step, reorder and prompt_handoff.
- Accept: through `injectWorkProjectTask`. Dismiss: remembered.
- UX: up to three Fable cards on the project map screen, source-labeled, dismissible.
- Telemetry: offered, accepted, dismissed, by source.
- Tests: pure ranking and dedupe unit tests; route tests (gated, tenant-scoped, gate-backstopped); a corpus run across the existing large-program project categories measuring suggestion relevance and a false-suggestion rate of zero after the gate; a check that plan-time latency is unchanged (suggestions are post-map and async).

Acceptance bar: suggestions are relevant and few; zero false tasks survive the gate; no plan-time latency regression; dismissals never recur; accept and clean-success round-trips into the brain.

## 13. Future roadmap

- Phase 2: mid-journey contextual suggestions on the active task, from the current screen and goal.
- Phase 3: single-task tips for all tiers, with an upgrade nudge for rope-in beyond a single task.
- Phase 4: retrospective suggestions at finalize that feed the brain; company-admin curation and approval of the org practices set.
- Phase 5: platform_brain cross-tenant practices (scrubbed), discipline-catalog expansion, and the most-accepted-practices analytics.
- Phase 6 (stretch): per-org ranking learned from accept and dismiss history, so each company's suggestions match its own standards.

## 14. Open decisions for the owner

1. Naming: Recommended Practices, Suggested Improvements, or Better Ways.
2. Whether a caution counts against the replan budget (proposed: no, it changes nothing).
3. platform_brain in the MVP or deferred to Phase 5.
4. Catalog curation by company admins in the MVP or a later phase.
5. Model-fallback tier on or off by default (proposed: on, clearly labeled, lowest rank).

## 15. Patent adjacency (note, not a claim)

This leverages matter already in the patent package: the proven-workflow template reuse and capture (Appendix A1 and A2) and the mid-project task injection (claim 24), plus the forward-learnings ledger. A grounded suggestion that a user accepts and that is then placed into the project through the gated, dependency-aware injection may be a narrow continuation angle. Flag for the practitioner after this ships and is reduced to practice; do not overclaim now.

## 16. Honesty and compliance framing

Suggestions are presented as options with a stated basis, never as requirements, guarantees or certifications. Compliance-flavored suggestions name the practice, not an outcome. The brand honesty rules and the no-model-exposure rule apply to every card and every rationale.
