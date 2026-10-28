# Guidance depth rethink: planning, path-correction, clarification

**Status:** design proposal, no code changed. Written 2026-10-27 against `D:\RadarOps\copilot` (`server/work.js` 2,323 lines, `server/work_deep_plan.js`, `server/index.js` work routes, `server/store.js` session helpers, `src/pages/work/Guiding.jsx`, `src/pages/work/askFlow.js`). Every line reference below was read in this pass; where a claim is a test result rather than a code read it says so.

**Question under review:** the owner asked whether the guidance engine goes deep enough on three axes for large multi-workstream initiatives (AWS landing zone, on-prem to cloud migration, fresh ServiceNow ITSM rollout, Okta SSO rollout), while a 5-step task must stay a 5-step task.

**Established facts carried in (not re-derived):** no artificial cap anywhere (no `max_tokens`, no `.slice` on steps); planning model in prod is the best recommended chat model, vision follow-ups on the cheap vision model; live runs with `thorough=true` returned 16 to 17 flat steps per initiative where each step is really a phase; the end state was reached; `escalated=false` on all four; navigate corrects one micro-action per frame and never re-plans the remainder; forward re-plans happen only through Ask.

---

## 0. Verdict in one paragraph

The engine is a **task** planner being asked to plan **programs**. Its prompt has one unit of work (a single micro-action, `work.js:571-578`) and one container (a flat `steps[]`, `work.js:639`); nothing in the planner, the critique pass or the schema knows the words scale, phase, workstream, milestone or end state. Faced with a multi-week program and told "one micro-action per step" plus "take them all the way to done", the model does the only thing that fits in one response: it writes phases and labels them steps. The self-critique pass almost certainly fired on all four initiatives (`deepWorthy` returns `true` for each; verified by running the function on representative drafts, section 1.1) but it is a *harden forks and recovery* pass, not a *decompose* pass, so a phase-level draft passes through unchanged. `escalated=false` is a telemetry blind spot, not evidence the pass skipped. Mid-journey, the navigator is strong per frame but has no output channel to change the checklist, the designed step-back pass (`workAudit`) that carries a `replan` verdict is not wired, and no mid-journey discovery is ever persisted. Clarification is well shaped for a task (one question, prefer to plan) and under-shaped for a program, where the structural forks are chained and should be asked just in time, phase by phase. The fix is one shape change (a phase layer with just-in-time expansion to exact micro-steps, planned backward from a stated end state) plus wiring three mechanisms that already exist. Simple tasks are untouched by construction: `scale: task` produces exactly today's output.

---

## 1. Axis 1: planning depth for large initiatives

### 1.1 Current behavior (evidence)

**The unit of work is a micro-action and the container is flat.**
- `workPlanSystem` (`work.js:544-641`): "Break the goal into an ordered checklist of concrete steps ... Each step is one clear action" (`:548-549`); "GO ONE MICRO-ACTION AT A TIME, by default, even when not asked" (`:571`); "Prefer more, smaller, fully-specified steps over a few vague ones" (`:568-569`); "START FROM THE VERY BEGINNING" (`:579`); "BE COMPLETE - INCLUDE EVERY PREREQUISITE" (`:587`). Output shape is a single flat `steps[]` (`:639`). There is no field for scale, phase, workstream, milestone or end state anywhere in the schema.
- `DEEP_PLAN_STRUCTURE` (`work_deep_plan.js:65-91`) adds `branches` and `onFail` per step and says "Keep the steps the person SEES as one clean linear sequence" (`:73`). Depth here means forks and recovery, not decomposition.
- `CROSS_SYSTEM_RULE` (`work_deep_plan.js:21-59`) is a round-trip rule for two-system handoffs (DNS, OAuth, SAML). It scales a task across two consoles; it does not scale a program across months.

**`thorough` (PLAN-HEAVY) asks for more detail per step, not more steps.**
- `work.js:660-667`: "every step must be self-contained and independently verifiable ... Err toward more detail per step." It is keyed to watch-light mode (`index.js:2278`), not to the size of the goal.

**The self-critique pass fires for these initiatives, but it cannot help with granularity.**
- Gate: `deepWorthy` (`work_deep_plan.js:147-154`) returns true when any draft step has `branches`/`onFail`/is a verify step, or when goal + app + step text matches `BRANCHY_RE` (`:146`: sso, saml, configur*, install*, sign-in, integrat*, certificate, metadata ...).
- Verified in this pass by running the exported function on representative phase-level drafts: AWS landing zone `true`, on-prem to AWS migration `true`, ServiceNow ITSM rollout `true`, Okta SSO rollout `true`, control "rename a column in a Google Sheet" `false`. The pass therefore ran on all four.
- What it does: `PLAN_CRITIQUE_DIRECTIVE` (`work_deep_plan.js:99-117`) checks a missing prerequisite, a fork, `onFail` on verify/connect/sign-in/install/save steps, a value the user may lack, and loops. It never asks "is this step really a phase hiding twenty actions?" Acceptance (`work.js:699`) only requires `cparsed.steps.length >= draftLen`, so a 16-phase draft hardened into a 17-phase plan is accepted as-is.
- Why `escalated` reads false: `work.js:701` sets `escalated = true` only `if (strong && strong.cfg)`. The text planning path from `bestPlanningCall` returns `backup: null` on every branch (`index.js:850`, `:857`, `:860`), so `strong` is null and the flag can never flip even when the critique ran and was accepted. No `critiqued` / `critiqueAccepted` field exists. This is a SUPREME RULE III gap (a pass that ran or did not run, invisibly).

**The expansion mechanism exists but is a sidebar, not the plan.**
- `workHowTo` (`work.js:802-877`) expands ONE action into micro-steps ("Do NOT re-plan the whole goal; stay inside this one action", `:815`). Stored as `steps[i].sub` (`store.js:5186-5201`), which drops `branches`, `onFail` and `source`. The client auto-opens it for the active step (`Guiding.jsx:2038-2052`).
- The navigator never sees `sub`: `workNavigateUser` (`work.js:1070-1086`) lists only top-level steps. So the watch loop cannot confirm a sub-step, `validate` on a phase-level step ("the landing zone shows Available") is the only thing it can judge, and the drill-down is not recursive (a sub-step cannot be drilled again).

### 1.2 The gap

For a program the flat micro-step list is the wrong shape in both directions at once: a true micro-step list for an AWS landing zone is many hundreds of actions whose exact clicks in week four cannot be known in week one (and would be stale by then), while the phase list the model actually produces is too coarse for the watch loop to guide or verify. There is no end-state definition to plan backward from, so "done" is whatever the last step says, and the critique pass has no granularity check to catch the collapse. The user gets 17 headings and a watcher that cannot tell which of the 40 actions inside "Configure guardrails" they are on.

### 1.3 Proposed change

**P1a. Scale and end state on the plan (prompt + optional fields, backward compatible).**
Add to the planner output three optional top-level fields, attached only when non-empty exactly as `branches`/`onFail` are today (`work.js:761-762`):
- `scale`: `"task" | "project" | "program"`. Planner instruction: a task is done in one sitting in one or two tools; a project spans several sittings or tools; a program spans weeks, several workstreams and several teams.
- `endState`: `{ done: "<one sentence of the finished state>", checks: ["<visible, checkable acceptance facts>"] }`. Instruction: "DEFINE THE END STATE FIRST AND PLAN BACKWARD FROM IT; the last steps must make every check visible on screen." For `scale: task` the model may omit it (today's behavior).
- `phases`: for `project`/`program` only, `[{ title, goal, stepFrom, stepTo }]` as index ranges over the flat `steps[]`. Steps stay flat, so navigate, store, report and every stored session are unchanged. The UI groups steps under collapsible phase headers; a `task` plan has no `phases` and renders exactly as today.
Also feed `endState.done` into `workNavigateUser` so `"done": true` is judged against the stated end state, not the last step.

**P1b. Granularity gate and a DECOMPOSE pass (new deterministic rule + new critique variant).**
After the draft (and after the harden pass), run a pure rule `looksLikePhase(step)` in `work_deep_plan.js`: no `commands`, no `url`, no `code`, no on-screen control named, text led by a program verb (implement, roll out, migrate, design, establish, define, build out, set up ... across, decommission, onboard, integrate) or spanning several systems, `validate` naming an abstract outcome. If `scale !== 'task'` or more than ~30 percent of steps look like phases, run a second critique variant, `PLAN_DECOMPOSE_DIRECTIVE`: "Each flagged step is a PHASE, not an action. Keep the phase list and the end state. Expand the phases up to the first milestone (and every phase the person is about to start) into exact micro-steps with the usual commands, code, url, validate, branches and onFail. Return the remaining phases as steps marked `phase: true` with a plain `done when` gate; they will be expanded when the person reaches them." Acceptance rule as today (never fewer steps, never a refusal), plus: the flagged steps inside the horizon must have shrunk to non-phase steps or the result is kept but marked `decomposePending`.
Add one bullet to the existing `PLAN_CRITIQUE_DIRECTIVE`: "Is any step really a PHASE (many actions behind one line)? Mark it `phase: true` with a `done when` gate rather than leaving it vague." Add `scale !== 'task'` as a third reason `deepWorthy` returns true.

**P1c. Just-in-time phase expansion (promote the drill-down from sidebar to plan).**
When the step that becomes `current` is `phase: true`, expand it before guiding it. Mechanism: a new `POST /api/work/sessions/:id/expand` (or an `expand` branch inside `/watch` when `steps[current].phase`) that runs a planner-shaped call on the best planning model (`bestPlanningCall`, same grounding as `/plan`: research, KB learnings, skills, Company Brain, the scope brief, the end state, the done steps and the current observation) and returns full plan-shaped steps including `branches`/`onFail`/`source`. A new store helper `expandWorkPhase(sessionId, index, steps)` splices them in place of the phase step (done steps untouched, `n` renumbered, `currentStep` set to the first new step, the phase title kept on each new step as `phaseTitle` for grouping). Each expansion may carry its own single `clarify` (section 3.3). The horizon scales with mode: default expand one phase ahead; in watch-light / PLAN-HEAVY (the person reads the plan as a document) expand every phase at plan time with a bounded concurrency loop, since there is no cap and planning is once per task. The existing "How?" drill-down stays for the one-action case.

**P1d. Make depth observable (telemetry + user-facing line).**
Return `critiqued`, `critiqueAccepted`, `decomposed`, `draftLen`, `finalLen`, `scale`, `phaseCount` from `workPlan` regardless of `strong`; meter the critique call; write them to `appendWorkAudit`. User-facing timeline line, mechanism-free: "This is a larger piece of work. I planned it in N phases toward a clear finish line, and I will lay out the exact steps of each phase as you reach it."

### 1.4 Simple-task preservation and no-degrade

- `scale: task` emits no `phases`, no `phase: true` steps, no expansion calls; the granularity gate never fires on a plan whose steps carry commands, urls or named controls. Regression test: the current planner fixtures must serialize byte-identical when the new fields are absent.
- All new fields are optional and attached only when present (same pattern as `branches`/`onFail`), so stored sessions, `replanKeepingProgress` (`store.js:5498-5526`), the report and the audit log keep working. `replanKeepingProgress` and `setWorkStepHowTo` must be taught to carry `phase`, `phaseTitle`, `source`, `branches`, `onFail` (the how-to store already drops three of these; that is a latent bug worth fixing in the same change).
- Nothing is removed: the harden pass still runs, drill-down still exists, `thorough` still adds detail per step. Depth strictly increases with scale (SUPREME VI, VIII).

### 1.5 Effort and risk

- P1a + P1d: small (prompt text, sanitizers, UI grouping, telemetry). ~1 day including tests.
- P1b: medium (one new directive, one pure rule with tests on real draft fixtures, acceptance logic). ~1 day.
- P1c: medium (endpoint or watch branch, store splice helper with tests, client trigger, horizon policy). ~2 days.
- Risk: prompt drift making the model over-mark steps as phases on medium tasks. Mitigation: the deterministic gate must agree before a decompose pass runs; a wrongly marked phase on a task simply gets expanded on arrival (slower, never shallower).

---

## 2. Axis 2: mid-journey learning and path-correction depth

### 2.1 Current behavior (evidence)

**Per-frame correction is strong but has no channel to change the plan.**
- `workNavigateSystem` (`work.js:971-1069`) handles a missing prerequisite (`:1003-1013`), a changed UI (`:1018-1025`), unanticipated screens (`:1016-1017`), failure hunting (`:1031-1036`), verify mismatches (`:1037-1041`), cross-system hand-off (`:1042-1049`) and planned branches/recovery (`:1050-1055`). Its output is `{ completed, current, guidance, observation, flag, source, done }` (`:1067`). There is no `steps`, no `divergence`, no `learning`. `applyWorkNav` (`store.js:5527-5545`) stores the guidance text and moves the pointer; the checklist text never changes. So after a structural divergence the person sees a correct live instruction above a stale list, frame after frame.

**The step-back pass with a re-plan verdict exists and is not wired.**
- `workAudit` (`work.js:1165-1220`) is designed as a periodic "is the work still heading at the goal" check returning `{ onTrack, steer, replan, note }`. `grep workAudit server/index.js` returns nothing; `docs/workcopilot-profession-capability-audit.md:47` recorded the same on 2026-10-22. Nothing in the live loop ever asks "should the remaining plan change?"

**Forward re-plans are user-initiated only.**
- Ask (`workAsk`, `work.js:1225-1323`): `planChanged` + forward steps merged by `replanKeepingProgress` (`index.js:2619-2624`). Add-context (`workAddContext`, `work.js:1335-1379`; `index.js:2777-2782`). Manual Re-plan modal, budgeted 5 to 10 per task by tier, corporate unlimited (`store.js:3631`, `:3280-3291`). Stuck check-in after 5 minutes (`askFlow.js:26`, `Guiding.jsx:1658-1663`) routes to Ask with a default question, and STUCK-HELP MODE says "do NOT churn the plan" (`work.js:1252-1257`), which is correct for confusion but means the one automatic trigger that exists is explicitly not a re-plan trigger.

**Mid-journey learnings are never persisted; two learning channels are dead.**
- Only the plan-time `learning` is stored (`work.js:630-636`; `index.js:2306`). The how-to engine returns a `learning` field (`work.js:875`) but its prompt never asks for one (`:802-818`) and its handler never stores it (`index.js:2799-2837`). Navigate, Ask and add-context emit no learning at all, although navigate is told to "Note briefly in observation that the UI differs from the plan" (`:1023`); that note dies with the frame.
- The task-workflow knowledge base (`distillWorkflowTemplate` `work.js:2177`, `matchWorkflowTemplate` `work.js:2298`, thresholds `:2039-2045`, tests in `workflow_match.test.mjs`) is pure, tested and not referenced anywhere in `index.js`. A clean finish is never distilled; a new similar task is never seeded.

### 2.2 The gap

When the screen diverges structurally (the console was redesigned, the person took a different valid path, a prerequisite turned out to be already in place, a workstream's assumption was wrong), the engine improvises forever, one action at a time, while the list ahead stays wrong. The person must notice this themselves and either ask or spend a budgeted re-plan. And every discovery made live (a moved control, a changed flow) is re-discovered by the next person, because nothing from the watch loop reaches the KB.

### 2.3 Proposed change

**P2a. Structured divergence and learning on the navigator (prompt + two optional output fields).**
Add to the navigate JSON: `divergence: { kind: "none" | "ui_changed" | "missing_prereq" | "already_done" | "wrong_path" | "plan_invalid", note }` and an optional `learning` (the same "one generalized sentence naming the app and the current fact" contract as the planner, never anything about this person or screen). Deterministic backstop `hasDivergenceSignal(observation)` in `work_deep_plan.js` (renamed, moved, no longer, not on this screen, differs from the plan) in the style of `hasFailureSignal` (`:171-196`), so a model that writes the fact in prose but omits the field still counts.

**P2b. Bounded automatic forward re-plan, arbitrated by the step-back pass (wire `workAudit`, add `workReplanForward`).**
In the `/watch` handler keep a small per-session drift state in the store: `{ driftScore, lastAutoReplanAt, autoReplans, lastDivergenceStep }`. Score rules: `plan_invalid`/`wrong_path` on two consecutive settled frames; or three distinct steps flagged `ui_changed`/`missing_prereq`/`already_done` in one session; or the stuck timer firing while any divergence was seen. When the score crosses the line, run `workAudit` (strong model, full history) as the arbiter. Only on `replan: true` run a forward re-plan of the remaining steps and merge with `replanKeepingProgress`. Use the same planning path as section 3.3 (best planning model, full grounding, harden pass), not the cheap vision call.
Thrash guards: a cooldown (no automatic re-plan within N minutes or M frames of the last plan change, including user-initiated ones); a per-task ceiling on automatic re-plans (separate from the user's budget, which auto re-plans must never consume, exactly as `fromClarify` does not, `index.js:2155-2156`); never while the current step is a verify step with `onFail` (follow the planned recovery first); never when a planned branch matched the screen; the audit's `replan` must be true. Everything is surfaced on the timeline in plain words: "The screen no longer matched the steps ahead, so I updated the remaining steps and kept everything you had finished." The changed steps get a subtle "updated" marker in the list.

**P2c. Persist mid-journey learnings with a confirmation gate (store wiring, no new prompt beyond P2a).**
Store a navigate/ask/context `learning` via `store.addLearning(kind: 'correction')` only after it is observed twice in the session or the step it concerns is confirmed done afterward; this keeps a single misread frame out of the shared KB. Wire the dead how-to `learning` (add it to the how-to schema and store it in the handler). Wire the workflow templates: distill on `/finalize` when the session meets the clean-success bar already encoded in `distillWorkflowTemplate`, match on `/plan` and feed a STRONG match to the planner as "A PROVEN WORKFLOW from an earlier clean run on this tool (treat as current, still confirm against the screen)", a PARTIAL match as a seed. All of it flows through the existing `scrubStoredText` chokepoint (`store.js:1462`) and honors the company KB switch (`store.js:1448-1451`).

### 2.4 Simple-task preservation and no-degrade

- A short task that is going well never crosses the drift line; nothing fires; the per-frame prompt grows by two optional fields only (a few dozen tokens on the lean watch prompt, `work.js:950-963`).
- The navigator's current corrections stay exactly as they are; the re-plan is additive and arbitrated, never a replacement for per-frame guidance.
- Learnings are additive context on future plans and already shown to be safe by the existing KB tests (`kb_learning.test.mjs`, `kb_extraction_adversarial.test.mjs`).

### 2.5 Effort and risk

- P2a: small (prompt lines, sanitizer, backstop regex with tests). ~0.5 day.
- P2b: medium (drift state in store, arbiter wiring, guards, timeline copy, tests for every guard including a thrash simulation). ~2 days.
- P2c: small to medium (three wiring points, confirmation gate, tests). ~1 day.
- Risk: an over-eager automatic re-plan is the one way this could feel worse than today. The arbiter, the cooldown and the ceiling are the controls; ship with conservative numbers and make them operator-editable (SUPREME VIII: policy, not hard caps).

---

## 3. Axis 3: clarification and query depth

### 3.1 Current behavior (evidence)

- **Up front:** `workScope` (`work.js:1870-1910`) asks 1 to 3 (quick), 2 to 6 (standard) or 4 to 7 (detailed) goal-specific questions, chosen by the person (`index.js:2378`), generated once from the goal text alone, capped at 3/6/7 (`:1900`). It already asks what "done" looks like and the environment (`:1884`). There is no follow-up round and no notion of scale.
- **Plan time:** at most ONE `clarify`, with a strong "PREFER to plan" bias (`work.js:637`); answered through `/clarify` and a free re-plan (`index.js:2329-2350`). Correct for a task.
- **Mid-journey:** Ask (`workAsk`) answers from the screen and may re-plan forward. Three depth asymmetries versus the initial plan: it runs on the cheap vision model with the strong model only as a weak-result backup (`index.js:2595`, `work.js:1285`); its forward re-plan receives none of the grounding `/plan` has (no research notes, no KB learnings, no skills, no Company Brain, no scope brief, no PLAN-HEAVY block; compare `index.js:2603-2607` with `:2272-2279`); and it never runs the harden pass. The same holds for `workAddContext`. So every forward re-plan is shallower and less grounded than the plan it replaces, and for a program it rewrites the remaining weeks on a screenshot-reading model.

### 3.2 The gap

For a program the material forks are chained (greenfield or existing AWS accounts; Control Tower or custom; which identity provider; rehost or replatform per wave; which ITSM modules in scope; which apps get SAML versus SCIM) and most only matter when their phase begins. One-shot scoping either front-loads twenty questions nobody can answer in week one or asks six and guesses the rest. And the one channel that can reshape the remaining plan mid-journey is the least grounded call in the engine.

### 3.3 Proposed change

**P3a. Scale-aware scoping with just-in-time questions (prompt change, no new endpoint).**
`workScope` returns a `scale` guess alongside the questions, and for `project`/`program` tags each question `when: "now" | "phase"`. Ask only the `now` questions up front (the structural forks that change the workstreams). Carry the `phase` questions into the plan as `clarify` on the corresponding phase, asked when that phase is expanded (section 1.3 P1c). The UI keeps its one-question-at-a-time card; total clarification depth scales with scope.

**P3b. One bounded follow-up round for programs (prompt + one extra call, gated).**
After the `now` answers, for `scale: program` only, one short call: "Given these answers, is there ONE more structural question whose answer changes the workstreams? Return at most two, or none." Never for `quick` depth; skippable; never repeated.

**P3c. Depth parity for every forward re-plan (refactor of the re-plan path; the highest-value item on this axis).**
Split Ask and add-context into two stages: the current cheap vision call answers the question and decides `planChanged` (keeps latency and cost as today); when `planChanged` is true, a text-only planner call through `bestPlanningCall` with the full `/plan` grounding (scope brief, done steps, the end state, research, KB, skills, brain, PLAN-HEAVY when in watch-light) plus the vision call's observation and the person's question produces the remaining steps, then the harden pass and the granularity gate run on them. The same path serves the automatic re-plan of section 2.3. One module (`work_replan_forward.js`) owns "re-plan the remainder" so Ask, add-context, auto re-plan and the manual Re-plan modal stop carrying four slightly different versions of it (SUPREME II, XV).

### 3.4 Simple-task preservation and no-degrade

- `scale: task` keeps today's scoping counts and today's single plan-time question; no follow-up round; nothing deferred.
- Ask answers arrive exactly as fast as today; only the forward re-plan (already a plan-changing moment the person waits for) gets the heavier, better-grounded call.
- Nothing is removed from any prompt; the re-plan path gains grounding it currently lacks.

### 3.5 Effort and risk

- P3a: small (scope prompt + sanitizer + carrying `clarify` on phases). ~0.5 day once P1c exists.
- P3b: small. ~0.5 day.
- P3c: medium (one new module, four call sites refactored, parity tests asserting the re-plan prompt carries the same grounding blocks as `/plan`). ~1.5 days.
- Risk: P3c adds a second model call to a plan-changing Ask. It is a once-per-change cost on a moment that already feels like planning, and it is the only way to stop re-plans from being the shallow path.

---

## 4. Prioritized shortlist (highest leverage first)

1. **Wire what already exists and make depth observable** (P1d, P2a's backstop, `workAudit` arbiter wiring, dead how-to `learning`, workflow-template distill/match). Lowest effort, zero degradation risk, and it turns three invisible mechanisms into working ones. Fixes the `escalated=false` blind spot so every later claim about depth is measurable.
2. **Phase layer with end state and just-in-time expansion** (P1a, P1b, P1c). The shape change the big initiatives actually need: a program plans backward from a stated finish line into phases, and each phase becomes exact, watchable micro-steps the moment the person reaches it. A 5-step task is untouched by construction.
3. **Depth parity for every forward re-plan** (P3c). Today each re-plan is the least grounded plan in the engine; after this, Ask, add-context, the Re-plan modal and the automatic re-plan all plan with the same model and grounding as the first plan, through one module.
4. **Bounded automatic forward re-plan on structural divergence** (P2b). Arbitrated by the step-back pass, guarded against thrash, never consuming the person's re-plan budget, always announced in plain words.
5. **Persist mid-journey learnings with a confirmation gate** (P2c). The watch loop's discoveries stop dying with the frame; the template KB starts serving proven workflows to the next similar task.
6. **Scale-aware scoping and one follow-up round** (P3a, P3b). Structural questions up front, the rest asked phase by phase; the person is never asked more than one thing at a time.

Suggested gates to add with the work (SUPREME V, VII): a planner fixture test asserting byte-identical output for a small task when the new fields are absent; a `looksLikePhase` test over real draft fixtures (the four initiatives plus five ordinary tasks); a thrash simulation for the drift guards; a parity test that the forward re-plan prompt contains every grounding block `/plan` sends; a telemetry test that `critiqued`/`critiqueAccepted` are always present.

## 5. Honesty and UX rules this proposal keeps

- No model or provider name reaches the user; all new timeline copy speaks about the work ("planned in phases", "updated the steps ahead", "kept everything you finished"), never about passes, models or gates.
- The product remains a guide: every expanded step is still something the person does themselves; the end state is something they see on their own screen; nothing here acts for them.
- Every substitution or automatic change is surfaced on the timeline and in the audit log; nothing new happens silently.
