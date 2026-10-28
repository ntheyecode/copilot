# Future features roadmap: clearing the big items one by one

Status: plan, 2026-10-28. The large features deferred from the clean-slate sweep, sequenced by value x readiness and built one at a time. Each is backend-first (my lane, no conflict with in-flight UI agents), then UI. US spelling.

## Progress (2026-10-28)
All four backends are SHIPPED to `main` (backend-first; each on its own branch, full server suite green, boot smoke + route gating verified):
- #1 Recommended Practices phase 2 (single-task tips) - backend shipped earlier this session.
- #2 KB-spaces (pickable company knowledge collections) - `main` 098bb29.
- #3 Recommended Practices phase 3 (outcome learning + per-company ranking) - `main` ca3c058.
- #4 Team projects Model B (clone-to-many: templates, per-person runs, rollup) - `main` f3dea15.
REMAINING: the UI for each (KB picker, tips/practice cards, team-template admin + rollup dashboard), to be built by a Fable agent once the in-flight dashboard+practices-cards agent merges, then a consolidated deploy through the standard runbook. None of the four backends is deployed to prod yet (batched with the dashboard UI).

## The sequence

### 1. Recommended Practices - phase 2 (single-task tips + mid-journey) [BACKEND SHIPPED]
- **Delivers**: (a) single-task TIPS for all tiers - when a Lite/Basic/Advanced person plans a single task, offer 1-2 grounded improvement tips from the catalog (no rope-in, just a tip + optional how-to), a gentle upgrade nudge to Projects; (b) MID-JOURNEY suggestions - while a project task is active, surface a contextual practice for the current task.
- **Reuses (live)**: the shipped catalog + `suggestPractices` (work_practices.js), the project engine, the guided loop. Nothing new in the grounding model.
- **New**: a single-task suggest entry (match the catalog against the task goal), routes `POST /api/work/sessions/:id/practices` (all tiers, tips) and the mid-journey hook on the active task; small client tip cards.
- **Backend/UI**: backend now; tip cards UI after the dashboard agent frees up.
- **Effort/risk**: low. Pure catalog reuse; no brain-data dependency.

### 2. KB-spaces model + KB pick (context grounding completion) [BACKEND SHIPPED - main 098bb29]
- **Delivers**: the company brain becomes pickable COLLECTIONS/spaces (e.g. "Runbooks", "Security", "Onboarding"); at plan time a user can SCOPE grounding to a chosen space; the "Bring your context" step gains the KB picker (files + paste-text + KB, the full set).
- **Reuses**: `_learnHolder` / the company KB, the templates, the context-grounding step (shipped).
- **New (foundation)**: a KB-spaces data model (a brain partitioned into named collections with membership), CRUD (company-admin curated), and a `space` scope parameter threaded through the brain search / template retrieval; the picker UI.
- **Why second**: it is the FOUNDATION that unblocks platform-brain practices and per-org ranking (phase 3); and it completes context grounding.
- **Effort/risk**: moderate (a real data-model addition to the brain); backend-heavy.

### 3. Recommended Practices - phase 3 (retrospective + platform-brain + per-org ranking) [BACKEND SHIPPED - main ca3c058]
- **Delivers**: (a) RETROSPECTIVE capture - at finalize, a clean-success session distils a practice back into the brain so the org's own proven steps become suggestions; (b) PLATFORM-brain practices - scrubbed cross-tenant patterns as a suggestion source; (c) PER-ORG learned RANKING - accept/dismiss history tunes which practices surface for each company.
- **Reuses**: the clean-success capture (shipped), the scrub chokepoint, phase-1 grounding order, KB-spaces (phase 2).
- **New**: the retrospective distil-to-practice write, the platform-brain source + its gate, the accept/dismiss telemetry -> ranking.
- **Why third**: back-loaded on brain DATA and needs KB-spaces; highest value once the flywheel has turned.
- **Effort/risk**: moderate; value compounds over time.

### 4. Team projects - clone-to-many (Model B) [BACKEND SHIPPED - main f3dea15]
- **Delivers**: a project becomes a TEMPLATE a PM/admin assigns to MANY people; each person runs their own copy; completion is PER PERSON; the admin sees an aggregation (who finished, how far). The complement to the enterprise Model A (one project, divided) that shipped.
- **Reuses (live)**: the enterprise project engine + assignment + roles + the shared KB (all shipped this session), the clean-success capture.
- **New**: a template flag + "instantiate per assignee" (clone the map into a per-person run), per-person completion roll-up, the assign-to-many admin action + aggregation dashboard.
- **Why fourth**: high enterprise value and now much more feasible on top of the shipped enterprise layer, but a real build (per-person instancing + aggregation UI) that overlaps the enterprise dashboards, so best after the dashboard redesign settles.
- **Effort/risk**: moderate-high; overlaps enterprise UI.

## Working method
- Build each feature's backend first (pure + tested, server/), commit on its own branch, so it never collides with the UI agents.
- Bring in a Fable agent for each feature's UI once the dashboard/enterprise UI work has merged, to avoid shell/file conflicts.
- Ship each feature through the standard runbook (DB backup, zero-session restart, live verify), batching deploys where sensible.
- Update this file as each item moves to SHIPPED.
