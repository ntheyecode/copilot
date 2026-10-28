# WorkCoPilot: 2026-10-27 decisions, specs and honest assessment

One record of everything worked through on 2026-10-27, so nothing is lost and it can be reviewed as a whole. Status: all of it is on review branches, nothing deployed. The patent material is drafting support, not legal advice; attorney review before filing.

## 1. Patents (done, on a review branch)

The existing three-package patent set (provisional, utility, utility-with-priority, one shared specification) was updated to claim the 2026-10-27 project-engine work.

- Claims 20 to 29: new claim 10 (watch-loop transient-empty tolerance), claim 22 (project-engine method) with dependents 23 to 27, claim 28 (system), claim 29 (medium). Independents 1, 11, 17, 22, 28, 29.
- Specification extended [0090] to [0112]; new drawings FIG. 10 to 13; IDS updated (Squint US 12,567,270 B1, ADaPT, ASAPP, State Farm). build.py and sweep.py both clean.
- Legal framing: nothing is filed yet, so the new matter was incorporated directly into the one application (no continuation-in-part, no priority split); every claim shares one effective date.
- A filing-strategy memo was added: single vs multiple application, and the full small-entity cost comparison.
- Where: branch `patent/project-engine-2026-10-27` (commit 1bcf9da), pushed. Files under `patent-package/final/`.

Single vs multiple, the short version: file once first (provisional now at about 130, then one trimmed utility within twelve months at about 730, roughly 860 in government fees), and let a second patent come out of this one later as a divisional or continuation only when the project-engine group proves worth a second patent's lifetime cost. Two patents up front is cheaper at the counter (about 1,540, because splitting dodges excess-claim fees) but commits to two prosecutions and two twenty-year maintenance bills before you know either is worth it.

Open decisions for a practitioner: absorb the roughly 1,440 excess-claim fees now (29 claims) or trim to 20 claims and 3 independents and hold the rest for a continuation; whether to wire the two constructive claim legs (claim 25 done-state verification, and the "end-state shown satisfied" limb of 22/28/29) into strict reduction-to-practice or drop that limb to a dependent.

## 2. Shipped in a branch now: the desktop-path removal

The Desktop-app choice in the start flow asked App name plus a "Link or path" field (example `C:\Reports\Q3.xlsx`). Removed, because it confused the app's identity with a data-file path, had no server or planner consumer (only folded into the goal text as "at {path}"), implied filesystem access the read-only screen guide does not use, and added friction. App name is kept. Where: branch `feat-context-grounding`, in `src/pages/work/StartTask.jsx`.

## 3. Feature spec: Context grounding, cross-surface

Generalize the start flow's documents step into one optional "bring anything that helps" step (files, and, reconsidered, pasted reference text rather than fetched links), available on both the desktop and the browser with per-surface data handling (files stay on-device on desktop; the knowledge base is the tenant's server-side brain for both). Ungate a light version for all tiers. Where: `docs/context-grounding-spec.md`, branch `feat-context-grounding`.

## 4. Feature spec: Recommended Practices

At project-plan time (and later mid-project and at review), offer a few grounded improvement suggestions for the project type; the person ropes a liked one in and it is injected through the existing gate. Grounding order: company brain, platform brain, curated discipline catalog, model last. Where: `docs/recommended-practices-spec.md`, branch `feat-recommended-practices-spec` (commit 25d2cf5), pushed.

## 5. Honest feasibility and value assessment (the part that matters)

The governing technical truth: everything here feeds the planning call, which produces a shallow five-to-eight step plan generated once. None of it touches the runtime watch loop, which reads the screen directly. So any context's value is bounded by how much better eight generated steps get, and it only helps if the base plan was weak. And the brain-dependent parts are empty on day one (cold start), so their value is back-loaded.

Per item:

- Desktop-path removal. Feasibility trivial, value small but real (friction removal), zero risk. Keep (done).
- Files grounding. Already built. Value high but narrow: it matters when the document is the procedure (implement this spec, fill this template, follow this runbook), little otherwise, and an eight-step plan can only absorb so much. Work needed is only ungating a light version and making it discoverable. Do it.
- Web links. Push back. Low value where most wanted (internal wikis and tickets are auth-walled, so a server fetch gets a login page; public docs are already covered), high risk (SSRF, prompt injection from fetched pages), high complexity. Do not build URL fetch; let the person paste reference text instead, which gives most of the value with none of those problems.
- Knowledge-base pick. Cheap (the brain is already searched at plan time; this just scopes it), low risk, but real value only for a company with a populated brain. Do it, expect the payoff to lag brain data.
- Recommended Practices. Plumbing feasible; the hard part is content quality, weakest exactly at launch (empty brains leave only a finite curated catalog and the model, which is the hallucination risk). Strong differentiator but back-loaded on brain data, and a bad suggestion is worse than none. Ship narrow (a curated catalog for two or three high-stakes domains such as security hardening and cloud migration), measure acceptance rate, widen only once the brain has data.

Cross-cutting truths:

- The real moat is the brain flywheel; both the KB pick and Recommended Practices depend on it, and it is empty early. The highest-leverage investment is populating the brain (clean-success capture is already built), after which these features light up as a consequence. Do not sell them as immediate wins.
- These serve the enterprise and complex-project user, not the mass market. A novice on a generic task already gets the core value from the base plan; context and practices lift bespoke, document-driven, high-stakes work, which is the Premium and Projects tier. Good strategic fit, but not a broad lift.
- Suggestion noise and prompt injection are the two real risks, and both worsen the more you lean on the model and on fetched external content. The grounding-order discipline and the gate are the right mitigations; link fetch runs against them, which is why it is cut.

What to actually ship, in order:

1. Desktop-path removal (done).
2. Files grounding, ungated-light (already built, just open it) - the real immediate value, for document-driven work.
3. Knowledge-base pick (cheap scoping), paired with a push to populate the brain.
4. Recommended Practices, narrow (two or three curated domains, catalog-led not model-led), measured by acceptance rate before widening.
5. Paste-text instead of link fetch; drop URL fetching.

Net: two of five are near-free and useful now (desktop-path, files), one is cheap but brain-gated (KB), one is a real but back-loaded bet to sequence carefully (practices), one is cut (link fetch).

## 6. Next-wave sequencing

1. Now: desktop-path removal, plus the specs for review.
2. Next wave phase 1: context grounding (files, paste-text, ungated light) for both surfaces; KB pick follows with the scoping UI.
3. Next wave phase 2: Recommended Practices MVP, narrow, using the grounded context and the brain; a well-grounded plan is a prerequisite for well-targeted suggestions.
4. Later: mid-task context parity; the Recommended Practices roadmap phases 2 to 6.

Running underneath all of it: keep populating the brain, since it gates the value of phases 1 (KB) and 2 (practices).

## 7. Open decisions for the owner

- Patents: excess fees now vs trim to 20/3; wire the two constructive claim legs or drop the limb to a dependent.
- Context grounding: free light-tier limits (how many files); KB pick in phase 1 or after the scoping UI; whether to keep any fetched-link path at all (recommendation: no, paste-text only); mid-task context in phase 1 or a fast follow.
- Recommended Practices: which two or three domains to curate first; naming.

## 8. Where everything lives

- Patents: branch `patent/project-engine-2026-10-27`, `patent-package/final/` (incl. `filing-strategy-memo.md`). Pushed.
- Recommended Practices spec: branch `feat-recommended-practices-spec`, `docs/recommended-practices-spec.md`. Pushed.
- Context grounding spec + desktop-path code change + this record: branch `feat-context-grounding`, `docs/context-grounding-spec.md`, `docs/session-2026-10-27-decisions.md`, `src/pages/work/StartTask.jsx`.
- All on the ntheyecode/copilot remote, nothing merged to main, nothing deployed. Memory index updated so next session has the full thread.
