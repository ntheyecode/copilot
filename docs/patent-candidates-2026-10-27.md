# Patent candidates from the 2026-10-27 WorkCoPilot work

**Status:** read-only review of what shipped on `main` on 2026-10-27, cross-referenced against the existing patent material. Drafting support for the inventor and a registered practitioner; not legal advice, not a freedom-to-operate opinion. No code was changed for this review.

**Existing patent material read (the "already claimed" baseline):**
- `patent-package/final/utility/claims.md` - the 20 claims as prepared for filing (independents 1 / 10 / 16) plus Appendix A candidate independents A1 (tiered workflow-template retrieval), A2 (clean-success template capture), A3 (unified tenant policy), A4 (screen-derived clarification with free re-plan).
- `patent-package/final/utility/specification.md` - [0001]-[0089]; notably [0030] (strong second model for escalation), [0035] (template matcher consulted before planning), [0042] (model escalation on unusable output), [0071]-[0081] (template capture/retrieval), [0087] (model routing and reliability ladder).
- `patent-package/05-novelty-synthesis-and-claims-v2.md` - the five-cluster prior-art synthesis; `patent-package/editable/novel-claims.md` - the 14 novel elements table.
- No claim language is embedded in code comments (grep of `server/` for patent/claim terms hits only the IP method-anchor regex and the BIP39 wordlist).

**Today's code assessed (commits on `main`, 2026-10-27):** `fa12bfd` B1 depth entitlement, `1c36a84` depth governance routes, `a26374c`/`a4fe972` project model + store, `433cd15` map planner + endpoints, `a985636` zero-tolerance gate, `7d85ec0` inject dedupe + placement, `49833a3` project reports, `7886470` one source for vision-capability, `cde56cc`/`bce2bd1`/`ea45661` empty-response failover, `2452c9b` watch-loop 2-of-5 tolerance, `9b0f2f5` critiqued/deepened telemetry, `df7624d` how-to learnings capture, `dbc7efa` template reuse + capture wiring.

**Reduction-to-practice legend:** RTP = shipped and exercised by a route; RTP-partial = module exists and is unit-tested but a leg of the mechanism is not yet called from any route; Constructive = would need the specification to carry it.

---

## 1. Guidance DEPTH entitlement with a superadmin ceiling and a company-admin pool clamp

**Files:** `server/guidance_depth.js` (pure resolver), `server/store.js` effectiveGuidanceDepth / setCompanyGuidanceDepth / setCompanyPoolDepth (lines ~5695-5722), `server/work_depth_routes.js`.

**(a) What it is.** A two-level depth entitlement (`standard` vs `deep`) where a platform operator sets a per-tenant ceiling, a tenant administrator assigns a depth per seat pool, and the resolver clamps the pool assignment to the ceiling so a tenant can never grant beyond its grant; `deep` unlocks the Project engine and removes the open-task concurrency cap.

**(b) Novelty argument.** Thin. Hierarchical delegated entitlements with "cannot exceed the grantor" clamping are standard licensing / RBAC / quota-delegation practice (feature flags with tenant overrides, Azure/AWS service-quota delegation, seat-pool licensing). The only product-specific angle is that the entitlement selects a *planning depth* (single task vs multi-task project) rather than a feature toggle.

**(c) Existing coverage.** Not claimed anywhere in the package (the package claims policy objects, not entitlements). But it is also almost certainly prior art as a mechanism and would face a strong Section 101 (abstract business rule) rejection on its own.

**(d) Recommendation.** Do not pursue as an independent. At most, a dependent limitation on a Project-engine claim ("wherein the project map is generated only for a user whose resolved guidance depth, being a pool depth clamped to a tenant ceiling set by an operator above the tenant administrator, is the deep level"). RTP.

---

## 2. Project engine: plan the MAP up front, expand each task's steps JUST-IN-TIME, grounded in a forward-learnings ledger

**Files:** `server/work_project.js`, `server/work_project_plan.js`, `server/work_project_routes.js` (create + expand), `server/store.js` appendWorkProjectLearning / recordWorkProjectTaskOutcome (~5795-5806).

**(a) What it is.** A large goal is planned once at the workstream level into an ordered, dependency-annotated task map with a stated project end-state (`done` sentence + `checks`). Each task carries only its goal and a `doneState`; its micro-steps are expanded by a second planning call only when the task becomes active, and that expansion is seeded with a project-scoped `learnings` ledger that completed tasks append to, so task N is planned with facts discovered during tasks 1..N-1. Each expanded task is run as an ordinary guided session (the claim-1 observe/instruct/verify loop), and the task's `doneState` is the verification target at the task level.

**(b) Novelty argument.** The general ideas are prior art: hierarchical task networks and lazy/as-needed decomposition (HTN planning; ADaPT "As-Needed Decomposition and Planning", 2023; Plan-and-Solve; ReWOO; TaskWeaver), memory-carrying agents (Reflexion, Voyager skill library, Agent Workflow Memory), and project/WBS management tools with dependencies. What is not found in that art, taken together, is the specific combination: (i) two-tier planning where only the upper tier is generated up front and carries a *screen-visible* done-state per task and a *screen-verifiable* project end-state, (ii) the lower tier being generated just-in-time *for a human performer* and fed into a per-frame vision-verified guidance loop (not executed by an agent), (iii) a deterministic, deduped, bounded forward ledger that is written when a task is verified done from the display and injected as "verified current facts" into the next expansion, and (iv) task-level advancement gated on the project dependency graph (nextActionableTask / availableTasks). The human-performer + screen-verification coupling is what distinguishes it from agent planning memory; the just-in-time expansion from the forward ledger is what distinguishes it from WalkMe/Whatfix multi-step flows and from WBS tools.

**(c) Existing coverage.** NEW relative to the claim set. Claim 1 and the spec [0032]-[0043] describe a single flat plan; [0040] mentions a discrepancy indication used for re-planning and template supersession; nothing in the package describes a two-level plan, lazy expansion, a project end-state, or a cross-task learnings ledger. Appendix A1/A2 (templates) operate *across sessions of different users*, not *within one project across its own tasks*, so there is no overlap, but a practitioner should write the ledger claim so it does not read on A2's template capture.

**Honesty note on RTP.** RTP-partial. The map planner, gate, store, `expand` route (reads the ledger) and task-state transitions are wired and tested. The ledger *write* leg (`store.appendWorkProjectLearning`, `recordWorkProjectTaskOutcome`) exists and is unit-tested (`work_project_store.test.mjs`) but no production route or finalize path calls it yet, so today the ledger is always empty at expansion time. The project-level `doneState` is also not yet consumed by the navigator as a verification target. Either wire these before filing or rely on the specification to enable them.

**(d) Draft independent claim (method).**
> A computer-implemented method of guiding a human performer through a multi-task project in one or more target applications, comprising: receiving a project goal; obtaining, from a planning machine-learning model, a project map comprising an ordered plurality of task descriptors and a project end-state, each task descriptor comprising a task goal, a done-state describing display content that will be visible when the task is complete, and a set of dependencies on earlier task descriptors, the project map containing no step-level instructions; maintaining, for the project, a learnings ledger of generalized facts; selecting as the next task the lowest-ordered task descriptor whose dependencies are each in a done state; in response to the selection, and not before, obtaining from the planning machine-learning model an ordered plan of steps for the selected task only, the planning machine-learning model being supplied with the contents of the learnings ledger as verified current facts; guiding the human performer through the ordered plan of steps by presenting one instruction at a time without injecting any input event into the target application and advancing each step only when a captured frame of the display shows the visible-when-done condition of the step satisfied; upon the captured frame showing the done-state of the selected task satisfied, marking the task descriptor done and appending to the learnings ledger at least one generalized fact derived from the guided steps of the selected task, the appending being deduplicated against existing entries; and repeating the selecting, obtaining and guiding for each remaining task descriptor, such that a later task's plan of steps is generated from facts learned during earlier tasks of the same project, and declaring the project complete only when every task descriptor is done and the project end-state is shown satisfied.

---

## 3. Zero-tolerance breakdown gate: refuse a false project, a filler task, or a duplicate task

**Files:** `server/work_project_validate.js`, used by `server/work_project_routes.js` create.

**(a) What it is.** A deterministic, model-free gate between the map planner and persistence: a breakdown becomes a project only if it has >= 2 *distinct real* tasks, where "real" requires both an aim and a non-empty done-state, duplicates are collapsed by normalized label before counting, dependency references must resolve, the graph must be acyclic (3-colour DFS with cycle-member reporting), and the project end-state must be defined; a too-long single workflow is only *hinted* as possibly-a-project, never auto-split. Failing the gate returns the user to a single task with a suggested goal.

**(b) Novelty argument.** Each check alone is routine (schema validation, DAG cycle detection, dedupe). The defensible idea is the *policy*: "task = one verifiable workflow, a task without a screen-visible done-state is not a task, and a plan cannot be padded into project-hood by filler or restatement" applied as a hard precondition to a model-generated decomposition, with the asymmetric rule that over-splitting is an error but under-splitting is only advisory. LLM-output validators and "planning critics" are known (self-critique, verifier models), but a deterministic verifiability-based gate on decomposition granularity for a human-performed, screen-verified plan is not something I can point to in the cited art.

**(c) Existing coverage.** NEW relative to the claims; conceptually a sibling of the "clean-success predicate" (A2) and the "destructive-operation gate" (claim 14) in that it is deterministic and model-free, but it operates on a different artifact (the decomposition, before any work begins). RTP.

**(d) Draft claim.** Best as a dependent of the Section 2 claim; as an independent it is weak. Dependent form:
> The method of [claim 2], further comprising, before persisting the project map, applying a deterministic gate without invoking any machine-learning model, the gate (i) counting as real only task descriptors having both a task goal and a non-empty done-state, (ii) collapsing task descriptors whose normalized labels are equal to a single task descriptor before counting, (iii) rejecting the project map and returning the project goal as a single task when fewer than two distinct real task descriptors remain, and (iv) rejecting the project map when any task descriptor is not real, any dependency references a task descriptor not in the map, the dependency graph contains a cycle, or the project end-state is empty, wherein a count of steps in a single task exceeding a threshold produces an advisory indication only and never a division of the task.

---

## 4. Mid-journey task injection: deterministic dedupe + dependency-aware placement that never creates a cycle

**Files:** `server/work_project_inject.js`, `server/store.js` injectWorkProjectTask (~5812-5821), route `/inject`.

**(a) What it is.** A request that arrives mid-project is first compared to planned tasks by normalized word-token Jaccard (>= 0.6) and, on a hit, folded into the existing task instead of created; otherwise a new task is placed either immediately *before* a named blocker (inheriting the blocker's upstream dependencies, and gating the blocker on it), immediately *after* the latest of its named dependencies, or at the frontier (after the last not-done task); every placement is probed for cycles and, if the requested edge would close one, the edge is dropped and the task appended with a `cycleAvoided` note, orders renumbered 1..N, inputs never mutated.

**(b) Novelty argument.** Inserting a node into a DAG with cycle checks and token-similarity dedupe are textbook. The modest hook is the *human-guidance* framing: the dedupe guards the "false project" policy of Section 3 at runtime (so a mid-journey request cannot pad the project), the "blocks task X" placement is a prerequisite-insertion at the task tier analogous to claim 6's step-tier prerequisite insertion, and a cycle-closing request degrades to append-with-notice rather than refusing the user.

**(c) Existing coverage.** NEW relative to the claims, but likely obvious over standard scheduling/WBS art. Claim 6 covers prerequisite insertion at the *step* tier from the *frame*; this is at the *task* tier from a *user request*, so no overlap. RTP.

**(d) Recommendation.** Dependent claim on Section 2 only:
> The method of [claim 2], further comprising receiving, while a task of the project is active, a further request from the human performer; computing a token-set similarity between the further request and the task goal of each task descriptor; when the similarity of a best-matching task descriptor meets a threshold, associating the further request with that task descriptor and creating no task descriptor; and otherwise creating a new task descriptor and inserting it into the ordered plurality immediately before a task descriptor named as blocked by it, adding the new task descriptor to the dependencies of the blocked task descriptor and the blocked task descriptor's dependencies to the new task descriptor, or immediately after the latest of its named dependencies, or after the last task descriptor not in a done state, wherein an insertion whose added dependency would form a cycle is performed without that dependency and an indication of the omitted dependency is recorded.

---

## 5. Vision reliability (a): one source of truth for "can this model read a screen" = the priced ratecard

**Files:** `server/ai.js` isVisionModel / rateFor / RATECARD (~575-592), findVisionModel (~468-482).

**(a) What it is.** Vision capability is decided by the same curated per-provider ratecard row that prices the model (most-specific-first regex, `vision` flag), with a name-hint regex only for a model the ratecard has never seen; the vision-model picker and the vision failover both consult this one predicate.

**(b) Novelty argument.** None patentable. This is a single-source-of-truth refactor (SUPREME RULE II) that fixed a drift bug (`qwen*-flash` priced as vision but dropped by a second regex). Capability registries and model catalogs are prior art.

**(c) Existing coverage.** Not claimed; not claim-worthy. RTP.

**(d) Recommendation.** No claim. Keep as an engineering practice note.

---

## 6. Vision reliability (b): empty model output treated as a first-class, retriable failover trigger across models and providers, with key errors never masked

**Files:** `server/ai.js` isEmptyResponse / reasonOf / chat / failoverChat / analyseImages (~281-458), `server/ai_failover.test.mjs`.

**(a) What it is.** A 200-OK response with empty content (after one in-call retry) is classified as `empty`, placed alongside `retired` and `rate_limit` as a reason that walks the reliability ladder (another current model on the same key, then the next configured provider, then a crisp coded exhaustion error), is excluded from the ladder for auth/key errors, and every hop is emitted to an incident trail with the reason. For vision, the same on-key heal applies, but cross-provider vision failover is deliberately *not* done at this layer (frames stay on the chosen key / data boundary) and one empty read is not a failure at all (see Section 7).

**(b) Novelty argument.** Weak. Model cascades, fallback on failure, and "treat empty output as retriable" are prior art (FrugalGPT, RouteLLM, LangChain/LiteLLM fallbacks, OpenRouter auto-routing, circuit-breaker libraries). The package itself already graded "model escalation" as Tier C / anticipated (synthesis I-7). The one semi-distinct limitation is the *data-boundary asymmetry*: text can cross providers but a screen frame never leaves the credential it was captured under (tied to the tenant-pinned-credentials rule at spec [0087]).

**(c) Existing coverage.** Largely ALREADY DESCRIBED: spec [0042] (escalation on unusable output, logged to user), [0087] (reliability ladder: retired/rate-limited -> other current model on same credentials -> next provider in platform mode only; tenant credentials never silently replaced; frame of a pinned tenant never routed to platform credentials). Today's change adds "empty" as a reason within that already-described ladder. No claim in the final set recites the ladder (v1 claim 7 was dropped as anticipated). RTP.

**(d) Recommendation.** No new independent. If counsel wants it, a dependent on claim 10/16 reading: "wherein the guidance server classifies a response from a machine-learning model that is successful but contains no content as a retriable failure, and in response obtains the navigation record from a different vision-capable model available under the same credential, without transmitting the redacted frame under any other credential." It is a defensive dependent at best.

---

## 7. Vision reliability (c): stateful transient-empty tolerance in the watch loop (withhold the strong model until a persistent empty streak)

**Files:** `server/store.js` VISION_EMPTY_TOLERANCE / bumpVisionEmptyStreak / resetVisionEmptyStreak (~5823-5837), `server/index.js` /watch handler (~2552-2566), `server/ai.js` analyseImages comment (~427-433), `server/work.js` escalateVision (~223-236).

**(a) What it is.** In the continuous watch loop, a frame whose navigation record has neither guidance nor observation is counted as an "unreadable frame" on a per-session consecutive streak; within the tolerance (2) the strong backup model is *withheld* (not spent, no incident raised) because the next frame usually recovers; only when the streak reaches the tolerance is the strong model allowed to escalate; a readable frame resets the streak; a manual "deep" read always escalates. One-off (non-loop) reads still escalate immediately on a weak result.

**(b) Novelty argument.** Mechanically this is a consecutive-failure threshold (circuit-breaker / hysteresis / N-of-M debouncing), which is prior art in reliability engineering. The non-obvious element is the *inversion relative to the existing claim*: the specification [0042] says an unusable first-model output is re-submitted to the stronger model "for that call" - i.e., escalate immediately. Today's change says that in a *continuous, frame-sampled* loop over a non-instant human action, a single unreadable frame is a property of the *display* (transition, blur, loading), not of the model, so escalation on one is wrong: it switches models on noise, spends the expensive model, and raises a false incident. Making escalation a function of persistence across frames rather than of one frame's usability is a real, defensible refinement, and it is specific to screen-sampled human guidance (an agent that acts on each frame cannot tolerate a blank read the same way).

**(c) Existing coverage.** NOT claimed, and it *qualifies* what spec [0042] describes (immediate escalation). A continuation claiming it would need the specification amended to describe the loop-mode tolerance as an embodiment; the current spec arguably teaches away from it. Also note the fused telemetry: the audit still records every frame and the withheld escalation is not silent in the operator log. RTP (streak counter + gating are live; the "2 of 5" window in the commit title is implemented as a consecutive-streak threshold of 2, not a sliding 5-frame window - the claim should recite what the code does).

**(d) Draft dependent claim (on claim 1 or 10).**
> The method of claim 1, wherein frames are captured repeatedly while the user performs the current step, and the method further comprises: maintaining, for the session, a count of consecutive navigation records that identify neither an instruction nor an observation; in response to a navigation record that identifies neither an instruction nor an observation while the count is below a tolerance threshold, incrementing the count and presenting no change to the current step without re-submitting the redacted frame to a second machine-learning model; in response to the count reaching the tolerance threshold, re-submitting the redacted frame and the plan to a second machine-learning model having greater capability and recording the re-submission as an event; and resetting the count in response to a navigation record that identifies an instruction or an observation.

---

## 8. Depth telemetry: `critiqued` / `deepened` distinct from `escalated`

**Files:** `server/work.js` workPlan (~671-713, 774-777), `server/index.js` planTele (~2302-2306).

**(a) What it is.** The plan call reports whether the deep self-critique pass ran and whether its hardened output was accepted (only if it is a non-refusal plan with >= the draft's step count), separately from whether a stronger backup model was used; the acceptance rule itself ("never fewer steps, never a refusal, else keep the draft") is a no-degrade gate on a self-critique pass.

**(b) Novelty argument.** Telemetry is not patentable subject matter on its own. The self-critique pass with a monotone acceptance gate (never accept a shorter plan) is a small, sensible rule; self-refinement with verifiers is well-known (Self-Refine, Reflexion, CRITIC).

**(c) Existing coverage.** Not claimed; not described in the spec (the spec has no self-critique pass). Not recommended as a claim. RTP.

**(d) Recommendation.** No claim. Could appear as one sentence in a continuation's specification to support "deep planning" if Section 2 is pursued ("in some embodiments the plan of steps for a task is hardened by a second critique pass whose output replaces the draft only when it contains at least as many steps and is not a refusal").

---

## 9. Proven-workflow template reuse + capture (the private-brain workflow KB) now wired end-to-end

**Files:** `server/index.js` /plan (~2274-2292) and /finalize (~3542-3546), `server/work.js` pickWorkflowTemplate / distillWorkflowTemplate (~2031+), `server/store.js` getWorkflowTemplates / captureWorkflowTemplate / recordTemplateServed (~1681+).

**(a) What it is.** Today's commit `dbc7efa` connected the already-built matcher and distiller: at plan time, a tenant-routed template store is searched; a `strong` match is injected as "a proven workflow ... follow it as the backbone", a `partial` match as "a similar proven workflow ... adapt it"; the serve is counted; at finalize, a session that passes the clean-success predicate is distilled (no model call) and captured into the holder's store. `df7624d` additionally stores how-to drill-down `learning` facts in the cross-session KB.

**(b) Novelty argument.** Already analysed in the package (Invention II).

**(c) Existing coverage.** ALREADY COVERED by Appendix A1 (tiered retrieval: serve / seed / withhold by the conjunctive gate) and A2 (clean-success capture with two-layer scrub), and by spec [0035], [0071]-[0081]. The synthesis (section 1, Invention II) flagged "No - built + unit-tested but not wired into index.js" as the RTP gap; today's wiring *closes that gap*, which materially strengthens A1/A2 (actual, not constructive, reduction to practice). Two small deltas to tell the practitioner: (1) the shipped wiring serves the strong-tier template as *prompt context with a "backbone" directive* rather than the "single adaptation pass" that A1 recites - either amend A1 to "supplying the template to the planning model with an instruction to follow it as the backbone" or add that adaptation pass; (2) the how-to drill-down learnings capture (`df7624d`) is ordinary KB write-through and adds nothing claimable.

**(d) Recommendation.** No new claim. Update the RTP column for II-1 / II-2 in `05-novelty-synthesis-and-claims-v2.md` from "No (not wired)" to "Yes (wired 2026-10-27, `dbc7efa`)" and reconcile the A1 "single adaptation pass" wording with the shipped backbone-directive behaviour.

---

## 10. On-demand project reports (success / security / error)

**Files:** `server/work_project_report.js`, route `/report`.

**(a) What it is.** Pure aggregation of each task's guided session into a project-level success report (confirmed steps rolled up to the end-state checks), a security report (destructive steps + flags), or an issues report (incomplete tasks + flags).

**(b)/(c).** Straightforward reporting over existing artifacts; claim 8 and spec [0085] already cover per-session reports whose confirmed-step detail is gated on verification. Rolling several sessions up to a project end-state is an obvious extension. Not claimable on its own; could be a dependent on Section 2 ("generating a project report comprising, for each task descriptor in a done state, the steps whose visible-when-done conditions were shown satisfied, rolled up against the project end-state checks"). RTP.

---

## Prioritized shortlist of the strongest NEW candidates

1. **Project engine: up-front task MAP with screen-visible task done-states and a project end-state, just-in-time per-task step expansion seeded from a forward-learnings ledger, inside the read-only vision-verified loop (Section 2).** The only candidate from today that is a genuinely new *arrangement* relative to the filed claims and that is not a textbook mechanism. Strength: moderate; it survives only as the full combination (human performer + per-frame verification + lazy expansion + verified-fact ledger + dependency-gated task selection). Risk: HTN / ADaPT / agent-memory art under Section 103. **Action before claiming:** wire the ledger write (`appendWorkProjectLearning` on verified task completion) and make the navigator consume the task `doneState`, or describe both in the specification. Sections 3, 4 and 10 are its best dependents (the deterministic decomposition gate is the most distinctive of the three).

2. **Watch-loop transient-empty tolerance: escalation to the strong model gated on a persistent unreadable-frame streak, not on one frame (Section 7).** Narrow but technically crisp, cheap to claim as a dependent of claim 1/10, and it corrects a limitation the current specification [0042] states too strongly. Strength: moderate-weak (consecutive-failure thresholds are known; the human-guidance-specific rationale is the hook). **Action:** amend the specification to describe the loop-mode tolerance as an embodiment, and recite the consecutive-streak mechanism the code actually implements, not a sliding "2 of 5" window.

3. **Zero-tolerance breakdown gate (Section 3)** - as a dependent of (1), not standalone. The "no done-state means not a task; over-splitting is an error, under-splitting is advisory" policy is the part worth reciting.

Everything else from today is either already covered (template reuse/capture = Appendix A1/A2, now actually reduced to practice; model ladder = spec [0042]/[0087]), ordinary engineering (ratecard single source, telemetry, reports, entitlement clamping), or likely obvious over standard art (DAG insertion with dedupe, empty-output fallback). The most valuable patent-side outcome of today's work is not a new claim but the **closing of the Invention II reduction-to-practice gap** the synthesis explicitly flagged.

---

## Addendum, later on 2026-10-27: what was done with this review

- **Section 2 RTP caveat closed.** Commit `40fde01` wired the ledger write leg: the expand route appends `plan.learning` through `store.appendWorkProjectLearning`, and `/finalize` calls the new `store.completeProjectTaskForSession` (marks the task done, records outcome + telemetry, appends any learning). Status is now RTP for the map, gate, store, selector, expansion, ledger write at expansion, completion and reports. Still specification-supported only: the ledger write at completion from session-confirmed facts (the helper accepts a `learning`, no route passes one) and the navigator consuming the task `doneState` / verifying the project end-state from a frame. These are stated per claim in Appendix B of `patent-package/v2/20-claims.md`.
- **Section 9 closed.** Invention II RTP columns in `patent-package/05-novelty-synthesis-and-claims-v2.md` now read wired (`dbc7efa`); Appendix claim A1 recites the backbone directive as the form of the adaptation pass; spec [0079] describes it.
- **No CIP.** The CIP contingency in "Housekeeping" below assumed a parent on file; none is. The new matter was incorporated into the single application: spec [0090] to [0112] (plus edits to [0001], [0008], [0015], [0024], [0042], [0079]), FIG. 10 to FIG. 13, claim 10 (Section 7, on claim 1) and claims 22 to 29 (Sections 2, 3, 4, 10 and 1(d)); former claims 10 to 20 are now 11 to 21. Reasoning recorded in `patent-package/final/README-WHAT-IS-WHAT.md`. Prior-art refresh for the new matter: `patent-package/final/01-prior-art-search.md` (adds Squint US 12,567,270 B1 and five other references to the IDS).
- Sections 5, 6 and 8 remain unclaimed as recommended; Section 8's critique pass and Section 7's sliding-window alternative are described in the specification ([0101], [0110]) for support only.

## Housekeeping the practitioner should know

- The current specification has no description of two-tier planning, lazy expansion, a project end-state, a learnings ledger, or loop-mode escalation tolerance; any of Sections 2, 3, 4, 7 would need new specification text (a continuation-in-part if filed after the parent, with the usual loss of the parent's priority date for the new matter).
- Date-stamp: all of this work is dated 2026-10-27 on `main`; if the parent application is filed first, these are candidates for a CIP or a separate application, and today's commits are the inventor's evidence of conception and (partial) reduction to practice.
- `docs/guidance-depth-rethink.md` (untracked design note, same date) describes the Section 2 design in more detail, including items not yet built (phase-level `looksLikePhase` gate, automatic forward re-plan arbitrated by `workAudit`, depth parity for re-plans). Those are design intent, not shipped code, and are not assessed here.
