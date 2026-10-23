# WorkCoPilot Accuracy Benchmark

Honest, reproducible measurement of **result correctness** — does WorkCoPilot's
returned answer match a known-correct output. Answers the external risk-review
point "no independent accuracy testing is documented." Full design:
`docs/accuracy-benchmark-spec.md`.

## Layout
- `graders.mjs` — grading functions + dispatcher (deterministic: exact / number /
  json / table / regex; `exec` runs candidate code against a fixture; `judge`
  uses an injected strong model). Pure + unit-tested (`graders.test.mjs`).
- `corpus/*.json` — task sets. Each task:
  `{ id, domain, prompt, grader, groundTruth|exec, graderOpts?, rubric?, visibility: public|heldout, source }`.
  `corpus/pilot.json` is the C0 validation slice (20 tasks, 5/domain).
- `run.mjs` — the runner: feeds each task through the REAL result pipeline
  (`work.workResult`), grades it, aggregates per-domain + overall with 95% CIs,
  for a STRONG and a FAST model separately. Writes an internal detail file
  (exact model + per-task) and a public summary (generic model labels,
  aggregates only, held-out tasks scored but not published).
- `results/` — run outputs (gitignored; internal detail is never published).

## Run
Offline (validate corpus + wiring, no model calls — always safe):
```
node server/eval/run.mjs [corpus.json]
```
Live (produces numbers — needs an AI key; cost applies):
```
WORK_EVAL_PROVIDER=openai WORK_EVAL_KEY=sk-... \
WORK_EVAL_STRONG_MODEL=<strong> WORK_EVAL_FAST_MODEL=<fast> \
node server/eval/run.mjs server/eval/corpus/pilot.json
```
(Optional `WORK_EVAL_FAST_PROVIDER` / `WORK_EVAL_FAST_KEY` if the fast model is on
a different provider/key.)

## Honesty rules (enforced in code + method)
- Deterministic + execution grading preferred; AI-`judge` results are flagged
  `aiGraded` and reported separately. A human spot-check of a random sample each
  run validates the auto-grader (C2 tool).
- Held-out (~20%) tasks are scored but never published, so numbers can't be gamed.
- Report `n` + 95% CI; never a bare rounded-up percentage. Thin domains say so.
- Scrub is OFF for the accuracy run (we measure AI correctness, not the privacy
  layer, which is a separate feature) — stated in the method.
- Public page uses generic model labels ("a top-ranked model", "a fast model");
  the exact model + version is recorded only in the internal detail file.

## Status
- C0 (harness + graders + pilot + runner): built + unit-tested; corpus validates.
- Producing PUBLISHED numbers needs an operator to run it live with a key (above).
- Roadmap: corpus to 200+ (C1), SQL/python execution graders + spot-check tool
  (C2), public scoreboard page + internal detail view (C3), per-release run (C4).
