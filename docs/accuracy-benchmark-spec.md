# WorkCoPilot Accuracy Benchmark — Spec v1

Scoped with the owner 2026-10-22 (interview). Purpose: answer the external
risk-review point "no independent accuracy testing is documented" with a real,
honest, reproducible benchmark. This is an approved **multi-session** build.

## Decisions (from the scoping interview)

| # | Decision | Choice |
|---|---|---|
| Q1 | What we measure first | **Result correctness** — does the returned answer/number/table/code/query match a known-correct output |
| Q2 | Domains | **All four**: dev/data (SQL, code, regex, shell, transforms), spreadsheet/finance calcs, cross-profession mix, security/code-review |
| Q3 | Grading | **Hybrid**: deterministic auto-grade (exact/number/JSON/table deep-equal, regex) + **execution** against fixtures where feasible + **LLM-judge** for fuzzy + **human spot-check** of a random sample each run to validate the auto-grader |
| Q4 | Sourcing | **Public eval sets where they exist** (SQL/code sets, published CVE fix pairs) **+ hand-authored** ground-truth for the rest (finance/ops/science) |
| Q5 | Size | **200+ tasks** (commercial-grade), ~50/domain |
| Q6 | Reporting | **Honest per-domain + overall scoreboard**, sample sizes + last-run date, refreshed per release, on a methodology/trust page linked from Security. Publish method + a SAMPLE of tasks; keep a **held-out portion private** (anti-overfit). No fake "pass" badge — the real number stands |
| Q7 | Model under test | **Strong (planning) + fast (guidance) models, reported separately** |
| Q8 | Model naming | **Generic in public** ("a top-ranked model and a fast model" — honors the never-expose-model rule); **exact model + version recorded internally** for reproducibility |

## What a "task" is
`{ id, domain, prompt, inputs?, groundTruth, grader, visibility: public|heldout, source }`
- `prompt`: the goal fed to the result channel (`workResult`), scrub OFF (we're measuring AI correctness, not the privacy layer).
- `grader`: one of `exact` | `number` (± tolerance) | `json` | `table` | `regex` | `exec` (run against a fixture, compare output) | `judge` (LLM-judge vs reference + rubric).
- `visibility`: ~80% public (method + sample shown), ~20% held-out private.

## Grading rigor order (most → least gameable-resistant)
1. `exec` — run SQL against a seeded SQLite, code against test inputs, formulas in a sheet engine; compare real output.
2. deterministic — `exact`/`number`/`json`/`table`/`regex`.
3. `judge` — strong model scores vs reference + rubric (only where 1–2 can't apply).
4. human spot-check — random N per run re-graded by a person to validate the auto-grader; disagreement rate is itself reported.

## Reported numbers (the scoreboard)
Per domain AND overall, for BOTH the strong and the fast model, separately:
pass rate, n, 95% CI, last-run date, grader-mix. Plus the human-spot-check
agreement rate. Public page: generic model labels; internal/superadmin page:
exact model + version + per-task results.

## Build plan (phased; each phase ends shippable)
- **Phase 0 — Harness + pilot (validate before scaling).** `server/eval/` runner: feed task → `workResult` → grader → results store. Implement the deterministic + `exec` + `judge` graders and the held-out split. Prove it end-to-end on a **~20-task pilot slice** (5/domain). No public number yet.
- **Phase 1 — Corpus to 200+.** Author/curate ~50/domain with ground-truth + grader-type + source + visibility. Public sets where they exist; hand-author the rest. Keep the held-out 20% private.
- **Phase 2 — Grading infra hardening.** Sandboxed execution per language (seeded SQLite, JS/Python runners against inputs, a formula engine), LLM-judge calibration, the human-spot-check sampling tool.
- **Phase 3 — Scoreboard.** Public methodology/trust page (generic model labels, per-domain + overall, CI, last-run) linked from Security; internal superadmin detail page (exact model + per-task). 
- **Phase 4 — Per-release wiring.** Run both models, refresh the page, track the trend.

## Honesty guardrails
- No fabricated or rounded-up numbers; report n + CI; if a domain is thin, say so.
- Execution/deterministic grading preferred; `judge` clearly flagged as AI-graded; human-spot-check agreement published.
- Held-out set never published, to keep the number from being gamed.
- Scrub is OFF for the accuracy run (separate concern); note this in the method.
