# WorkCoPilot profession capability audit

**Question under audit:** WorkCoPilot is sold as a read-only, screen-aware guide that "watches your screen and tells you the exact next move." A finance user asked: does it ONLY instruct and navigate ("click this cell, type this"), or can it also RETURN an actual response - a calculated number, a reconciliation, a model, an authored draft, an analysis? If it only gives steps, it is a broken solution for every profession whose real need is a computed or authored output.

**Scope:** analysis only, no code changed. Every claim below is grounded in the code as of 2026-10-22 (repo `D:\RadarOps\copilot`, package `workcopilot` 1.0.0). Files read in full: `server/work.js`, the `/api/work/*` routes in `server/index.js`, `server/method_anchors.js`, `src/pages/WorkMarketing.jsx`, `src/pages/WorkCapabilities.jsx`, `src/pages/WorkUseCases.jsx`, and the console wiring in `src/pages/WorkPage.jsx` and `src/api.js`.

---

## 0. Verdict in one paragraph

WorkCoPilot today is an **instruct-and-observe engine with a thin, partly unwired answer channel**. Five of the thirteen engine functions (plan, how-to, watch, navigate, audit) can only emit an instruction, an on-screen observation, or a flag; they are the entire normal guiding loop. Authored content exists for ONE class only - commands, code and file content - because the plan schema carries `commands[]` and `code{file,content}` (`server/work.js:436`). There is **no designed output for a computed value** anywhere: no field, no prompt instruction asking the model to calculate, no data ingestion beyond an 8,000-character text paste and a 1280-pixel JPEG of the screen, and no execution engine (no sandbox, no math library, no spreadsheet parser in `server/`). A computed figure can leak out through the free-text `workAsk` answer, but that answer is prompted to be "short," tied back to the steps, and is produced by a vision model reading a downscaled screenshot. Two functions that do return authored or analytical deliverables are either dead (`workDraft` has no UI caller) or narrowed to one profession (`workDeliverables` is hard-coded to architecture and security diagram review, and it deliberately hands back prompts for another tool instead of the result). For professions whose core need is a computed or authored RESULT (finance, accounting, FP&A, quant, data engineering, analytics, science, mathematics, ML), the product as built under-delivers; the marketing nevertheless promises those outcomes ("Reconcile the month to the penny," "Build a financial report," "Pitch decks," "Resumes," "Grant applications," "Market research").

---

## 1. Capability map

Output categories used throughout:

- **I** - on-screen INSTRUCTION ("click X, type Y")
- **II** - OBSERVATION / validation of the screen
- **III** - COMPUTED answer or value
- **IV** - AUTHORED content (draft, document, code, query, config)
- **V** - ANALYSIS / judgment

### 1.1 The governing constraint (applies to every call except summary, coverage, scope, deliverables)

Every work call is built by `baseWith()` (`server/work.js:339-345`), which appends the `WORK_MODE` persona (`server/work.js:151-292`). The relevant text:

> "You are WorkCoPilot: a sharp technical expert sitting beside one person, READ-ONLY, solving the task WITH them in real time. You read their screen and tell them the next thing to do, one small action at a time, then watch what happens and react ... You NEVER act for them: you do not click, type, run commands, send messages, or change anything. You only observe and guide." (`server/work.js:153-157`)

Two lines in the same prompt open the door to authored and computed output, but only as a side effect of "how to do it right," never as a deliverable:

> "Terminal commands and code are different: give those exactly and completely." (`server/work.js:177`)

> "give the correct way to do it with the correct syntax, format, figures, settings or wording for that field." (`server/work.js:198`)

Nothing in `WORK_MODE` says "compute the result," "produce the deliverable," or "return the table." The frame is "tell them what to do and verify they did it." The file header states the design intent directly: "It never clicks, types, or acts for the user - it guides and validates only." (`server/work.js:10-13`)

### 1.2 Function-by-function

| Function | Route | What it OUTPUTS (exact fields) | Category | Governing constraint (quote) | Reachable in the normal guiding flow? |
|---|---|---|---|---|---|
| `workPlan` (`work.js:351-491`) | `POST /api/work/sessions/:id/plan` (`index.js:821`) | `steps[] { text, validate, url, commands[], code{file,content} }`, `appContext`, `refusal` | **I** (text/validate), **IV** for code/commands only | "Break the goal into an ordered checklist of concrete steps the user performs themselves." (`work.js:355`) ... "put the EXACT command(s) to run in `commands` ... put the EXACT content to paste in `code`" (`work.js:370-375`) | Yes - the first call of every session |
| `workHowTo` (`work.js:499-560`) | `POST .../howto` (`index.js:1166`) | same step shape as plan, for ONE action | **I**, **IV** (code/commands) | "Break THAT action, and only that action, into an ordered checklist of micro-steps they perform themselves" (`work.js:502-504`) | Yes - the "How?" drill-down on any step |
| `workWatch` (`work.js:566-596`) | not routed directly (legacy; `/watch` uses `workNavigate`) | `{ status: done/working/wrong, observation, flag }` | **II** | "Decide the status by what you actually see ... Keep `observation` to one short sentence" (`work.js:570-576`) | n/a |
| `workNavigate` (`work.js:604-699`) | `POST .../watch` (`index.js:1010`) | `{ completed[], current, guidance, observation, flag, done }` | **I** (guidance), **II** (observation, flag) | "`guidance`: the next action written for THIS exact screen ... One or two short sentences, telling them exactly what to do right now." (`work.js:616-621`) | Yes - every changed frame; THE live loop |
| `workAudit` (`work.js:708-763`) | not routed in `index.js` (defined, periodic use intended) | `{ onTrack, steer, replan, note }` | **II/V** (drift judgment only) | "judge ONE thing: is the work still heading at the goal ... Keep every field to one short sentence." (`work.js:713-727`) | n/a |
| `workAsk` (`work.js:768-805`) | `POST .../ask` (`index.js:1060`) | `{ answer }` free text | **V**, incidental **III/IV** | "answer directly and concretely ... TIE YOUR ANSWER BACK TO THE STEPS ... If the answer is a terminal command or code, give the EXACT command or code ... Keep it short and plainly spoken. Never tell them you performed an action - you only guide." (`work.js:774-782`) | Yes - the Ask box / Analyze button (`WorkPage.jsx:2848-2853`, `3140-3149`) |
| `workAddContext` (`work.js:817-889`) | `POST .../context` (`index.js:1096`) | `{ replan, reason, answer, steps[] }` | **I** (new steps), **V** (answer) | "Decide ONE thing: does the REMAINING plan need to change ... ALWAYS write `answer`: ... what you took in from the context, and the next concrete thing to do" (`work.js:824-839`) | Yes - paperclip / paste in the Ask box |
| `workResearch` (`work.js:894-919`) | `POST .../research` (`index.js:1258`) | free text answer | **V** (grounded fact answer), **I** | "Give exact current steps, commands, settings or official links when they help" (`work.js:900`) | Yes - Research button |
| `workDraft` (`work.js:922-935`) | `POST .../draft` (`index.js:1479`) | free text draft | **IV** (message only) | "The user wants a message drafted (an email, a chat or a status update) about the task. Write it ready to paste ... You do NOT send it" (`work.js:925-927`) | **No.** `api.workDraft` is defined (`src/api.js:137`) but nothing in `src/` calls it. Dead feature. |
| `workSummarize` (`work.js:938-967`) | `/finalize` (`index.js:1490`), `/report.pdf` (`index.js:1231`) | session summary text | **IV** (record of what happened) | "Only use what is in the session record. Do not invent anything." (`work.js:946`) | Yes - at end of session |
| `workCoverage` (`work.js:977-1086`) | public `POST /api/work/coverage` (`index.js:1319`) | `{ verdict, answer, points, roadmap, preview, plan }` | marketing assessment, **I** preview | "You never do the task, never write their code or content, never answer general questions" (`work.js:983`) | Marketing widget only |
| `workScope` (`work.js:1094-1126`) | `POST /api/work/scope` (`index.js:921`) | `{ questions[] }` | intake | "a read-only, screen-aware guide that walks a person through ANY task step by step and never does the task for them." (`work.js:1096`) | Yes - before plan |
| `workDeliverables` (`work.js:1146-1197`) + `workDeliverablesDocument` (`work.js:1199-1225`) | `POST .../deliverables` (`index.js:938`), `GET .../deliverables.pdf` (`index.js:965`) | `{ summary, architecture[], security[], promptIssues, promptTarget, needMore }` + Markdown/PDF | **V** (review), **IV** (prompts for ANOTHER tool, not the artifact) | "You are a principal architect and security reviewer. You never do the task for the person: you review what they show you and hand them ready-to-use prompts to generate the result in their own tools." (`work.js:1148`) | Side feature: the "Review & prompts" chip appears only in the Completed bar after the task ends (`WorkPage.jsx:2632-2637`, `deliverOpen` at `:1991`) |

### 1.3 How much is "instruct the next step" vs "return a response"

- **Normal guiding loop** = scope -> plan -> navigate (every frame) -> how-to -> add-context -> finalize. Of these, plan/how-to/navigate/add-context are I/II with IV restricted to code and commands. Nothing in this loop is designed to return a number, a table, a reconciliation, a model, or a prose deliverable.
- **Answer channels** = `workAsk`, `workResearch` (free text, prompted short, tied back to steps) and `workDeliverables` (architecture/security only, post-task). `workDraft` is unwired.
- Counting the thirteen functions: 5 are pure I/II, 2 are I/II plus code-as-IV, 3 are free-text V, 1 is IV-for-messages (dead), 1 is IV-record, 1 is V+prompts for one profession. **Roughly four fifths of the live product surface instructs; the rest answers in free text with no structured result.**

### 1.4 Hard limits on "computed" output, independent of prompts

1. **Input resolution.** Every frame is downscaled to <=1280px wide JPEG at quality 0.6 (`src/pages/WorkPage.jsx:56-67`, `:93-109`). A ledger, a pivot, or a 200-row statement is not reliably readable digit by digit at that budget. The vision model reads pixels; it does not receive cell values.
2. **No data ingestion.** The console accepts images and text files only; `readContextFile` reads `.csv/.tsv/.json/.txt/...` as plain text truncated to 8,000 characters (`WorkPage.jsx:21-37`); the server caps `note` at 4,000 and `docsText` at 8,000 (`index.js:1109-1110`), plan-time documents at 6,000-8,000 (`index.js:882-883`). There is no `.xlsx` parsing anywhere (no `xlsx`/`exceljs` in `server/`). A 50-column workbook never reaches the model as data.
3. **No execution.** `server/` has no code runner, sandbox, `child_process`, `vm`, or math library. Any "computed" figure is LLM mental arithmetic over an OCR read of a screenshot, with no verification path.
4. **Output budget.** Navigator guidance is "One or two short sentences" (`work.js:620`); observation and audit fields are "one short sentence" (`work.js:576`, `:727`); ask is "Keep it short" (`work.js:781`); deliverables `fix` is sliced to 600 chars and prompts to 6,000 (`work.js:1185`, `:1193-1194`).
5. **DLP tokenization** (when armed) replaces card numbers, IBANs, SSNs, emails, hosts, PII/PHI fields with tokens before anything leaves the device (`server/work-scrub.js:150`, `:233`). Correct for privacy; it also means any arithmetic over tokenized identifiers happens on placeholders. Monetary amounts are not a scrub category, so plain figures do pass.

---

## 2. Profession x need matrix

Needs: (a) navigation / how-to, (b) on-screen validation, (c) COMPUTED answers, (d) AUTHORED content, (e) analysis / review. Need weight: H / M / L. Delivery today: **yes / partial / no**, with the evidence.

Anchor = the regex key in `server/method_anchors.js` that matches the profession (51 anchors total, `METHOD_ANCHOR_KEYS`). "none" = no anchor matches, so the plan gets no methodology grounding.

| Profession (anchor) | (a) nav | (b) validate | (c) computed | (d) authored | (e) analysis | Delivery today | Why |
|---|---|---|---|---|---|---|---|
| **Finance / accounting / FP&A / reconciliation** (`accounting_finance` :116, `financial_audit` :112, `tax` :114; no anchor for DCF/FP&A/quant/Excel) | M | H | **H** | H (journal entries, variance memo, model) | H | (a) yes, (b) partial, **(c) no, (d) no**, (e) partial | Plan says "Match everything, then hunt the variance" and the anchor demands "chase every variance to the penny" (`method_anchors.js:117`), but nothing computes the variance. Ask may quote a difference it reads off a JPEG; unverifiable. No spreadsheet ingestion. |
| **Quant finance / modeling** (none) | L | M | **H** | H (model code, formulas) | H | (a) partial, (c) no, (d) partial (code only), (e) partial | Code/commands ARE first-class (`work.js:436`), so a Python model skeleton can come back in `code`. The model's OUTPUT (a price, a VaR, a sensitivity table) cannot; no execution. No anchor matches "DCF", "quant", "Excel", "pandas". |
| **Data / analytics / BI** (`data_analytics` :46) | M | M | **H** | H (SQL, DAX, metric definitions) | H | (a) yes, (c) no, (d) partial, (e) partial | Anchor insists "Define each metric unambiguously (exact numerator, denominator...)" (`:47`); the plan can author the SQL in `code`, but the resulting number or chart reading is only whatever `workAsk` squeezes from a screenshot. |
| **Data engineering (pipelines, SQL/ETL, big data)** (`data_engineering` :44) | M | M | M | **H** (DDL, dbt models, DAGs, configs) | H | (a) yes, (d) partial-to-yes for code, (c) no, (e) partial | Strongest fit: `commands[]`/`code{}` carry exact SQL/YAML/Python. What is missing: any result of running it (row counts, data-quality checks, schema diffs) - the anchor demands "fail loudly on a breach" (`:45`) but the product cannot see the breach unless it is on screen. |
| **Heavy-data companies / data platforms** (`data_engineering`, `data_analytics`) | M | M | **H** | H | H | (a) yes, (c) no, (d) partial, (e) partial | Same as above at scale; the 1280px frame and 8,000-char text cap are the binding limits. A Spark job's output, a warehouse table, a 10M-row profile never enter the system. |
| **AI companies (ML/model work, eval, training)** (`mlops` :42) | M | M | **H** (metrics, eval tables) | H (training scripts, eval harness, configs) | H | (a) yes, (c) no, (d) partial, (e) partial | Anchor: "evaluate OFFLINE on a held-out set with the right metric" (`:43`); the product can write the eval script in `code`, cannot compute precision/recall or compare runs. It can read a loss curve off the screen and comment (`workAsk`). |
| **Science / research (experimental + computational)** (`research_science` :106) | L | M | **H** (statistics, fits, p-values, effect sizes) | H (methods text, analysis code, figures) | H | (a) partial, (c) no, (d) partial (code), (e) partial | Anchor demands "analyze with the pre-specified test, and report ... effect sizes and uncertainty" (`:107`). WorkCoPilot can tell the researcher which R/Python call to run; it does not return the statistic. |
| **Mathematics (symbolic + numerical)** (none) | L | L | **H** | M (proof sketch, derivation) | H | (c) no, (d) no, (e) partial | No anchor matches "calculus", "algebra", "matlab", "numpy". The product has no notion of a symbolic answer; `workAsk` free text is the only outlet and it is prompted to tie back to a UI plan that does not exist for a math question. Wrong tool shape. |
| **Robotics engineering** (`robotics` :48) | M | M | H (kinematics, tuning values, transforms) | **H** (ROS nodes, launch files, controllers) | H | (a) yes, (c) no, (d) partial (code), (e) partial | Anchor: "closed-loop (PID or model-based) with the real actuator limits" (`:49`). Code and configs can be authored; PID gains, transform matrices or a plan's feasibility are not computed or simulated. |
| **Firmware / embedded** (`embedded_firmware` :62) | M | M | M (timing budgets, register values, CRCs) | **H** (C, ISR code, linker scripts, device tree) | H | (a) yes, (d) partial-to-yes, (c) no, (e) partial | Good fit for the code channel. Timing math ("worst-case execution, jitter", `:63`), register bit-packing or a checksum are not computed. Serial/debugger output is only read if on screen. |
| **OT / industrial control (SCADA, PLC)** (none) | H | H | M (scaling, setpoints, loop tuning) | H (ladder/ST logic, tag maps) | H | (a) partial, (b) partial, (c) no, (d) partial, (e) partial | No anchor matches "SCADA", "PLC", "Modbus". Vendor HMIs are "custom or niche" so the planner is told to defer labels to the live screen (`work.js:364-367`). Safety-critical setpoint math is not computed. |
| **IoT** (none; `embedded_firmware`/`cloud_security` may partially match) | M | M | M | H (device code, MQTT/cloud configs, certs) | H | (a) yes, (c) no, (d) partial, (e) partial | No "IoT" anchor. Code channel works; fleet telemetry analysis (what the data says) does not. |
| **Airlines / aviation operations** (none) | H | H | H (fuel, weight and balance, crew legality, delay math) | M (ops reports, NOTAM summaries) | H | (a) partial, (b) partial, (c) no, (d) no, (e) partial | No anchor matches "aviation", "airline", "flight". Ops tools are custom/in-house (see `work.js:416-417`). The computed needs are regulated and must be exact; an LLM reading a screenshot is not acceptable for them. |
| **Legal / contracts** (`legal_contracts` :118) | L | M | L | **H** (red-lines, clause drafts, memos) | H | (a) yes, (d) no, (e) partial | Anchor: "Flag every deviation ... with a suggested red-line" (`:119`). The use-case page promises "Draft a red-line for every deviation" (`WorkUseCases.jsx:72`), but no function returns a drafted clause; `workDraft` is messages-only and unwired. |
| **Software / DevOps / SRE** (`developer` :66, `devops` :74, `sre` :68) | H | H | L | **H** (code, IaC, pipelines) | H | (a) yes, (b) yes, (d) yes, (e) partial | The profession the engine was shaped for. `commands[]`/`code{}` plus terminal-aware guidance (`work.js:254-261`). Analysis of a long log works via paste (`WorkMarketing.jsx:94`). |
| **Sales / marketing** (`sales` :90, `marketing_growth` :128, `seo`, `content_copywriting` :120) | H | M | M (CAC/LTV, conversion math) | **H** (copy, emails, sequences, decks) | M | (a) yes, (c) no, (d) no, (e) partial | Marquee promises "Email campaigns", "Pitch decks", "Board decks" (`WorkMarketing.jsx:113-116`); the copy anchor says "Write for one reader" (`:121`) but no function authors the copy. |
| **HR / operations** (`hr_recruiting` :92, `supply_chain_ops` :98) | H | M | M (headcount, safety stock, reorder points) | H (job descriptions, policies, offer letters) | M | (a) yes, (c) no, (d) no | "Onboarding", "Resumes", "Payroll" in the marquee; none produce the document or the payroll figure. |
| **Healthcare operations** (`healthcare_clinical` :100) | H | H | L | M (notes, coding) | M | (a) yes, (b) yes, (d) partial | The anchor rightly limits scope to "workflow and documentation only, not medical advice" (`:101`). Navigation-heavy; fits the engine. |
| **Design / UX** (`ux_design` :102) | H | M | L | M (specs, copy) | H (critique) | (a) yes, (e) partial | `workDeliverables` reviews a diagram but is prompted as "principal architect and security reviewer" (`work.js:1148`), not a design reviewer; the issue lists are `architecture[]` and `security[]` only. |
| **Customer support** (`customer_support` :94) | H | M | L | H (replies) | M | (a) yes, (d) no | The one place `workDraft` would shine ("an email, a chat or a status update", `work.js:925`), and it is not wired. |
| **Field / trades (network engineer, sysadmin on a console)** (`network_engineering` :70, `sysadmin_itops` :72) | H | H | L | M (configs) | M | (a) yes, (b) yes, (d) partial | Camera input + on-prem console guidance (`work.js:408-420`) fit well. |
| **Research / academia writing** (`research_science`, `teaching_instructional`) | L | L | M | **H** (papers, lesson plans, rubrics) | H | (d) no | Authored prose is the deliverable; the product has no prose-deliverable channel. |

**Reading the matrix:** every row where (c) or (d) is H and the product shows "no" is a profession we advertise but do not serve at the point where they would judge the product. That is 13 of 22 rows for (c) and 9 of 22 for (d).

---

## 3. Broken-solution callouts

Blunt list of cells where the user needs a RESULT and we return a STEP.

1. **Finance: "Reconcile the month to the penny" with nothing that computes.** The use-case page sells it (`src/pages/WorkUseCases.jsx:64-66`: "it shows exactly what to enter and flags what does not add up," `done: 'the cleared balance equals the statement to the cent'`). The engine has no function whose output is a number, a matched list, or an adjusting entry. The variance the accountant needs is at best a sentence from `workAsk` built on a 1280px JPEG.
2. **"Build a financial report" / "Budgets" / "Expense reports" / "Payroll" / "Tax filing" (`WorkUseCases.jsx:65`, `WorkMarketing.jsx:113-116`).** All are computed-output tasks. The tax anchor says "review for errors and math" (`method_anchors.js:115`); the product cannot do the math, it can only tell the person which screen to check.
3. **Authored business documents promised, no authoring function wired.** "Pitch decks", "Board decks", "Resumes", "Grant applications", "Market research", "Contracts", "Email campaigns" (`WorkMarketing.jsx:113-117`) and "Draft a red-line for every deviation" (`WorkUseCases.jsx:72`). The only prose-authoring function is `workDraft`, limited by prompt to "an email, a chat or a status update" (`work.js:925`) and with **no caller in the UI** (`src/api.js:137` is the only reference). The deliverables document is architecture/security only.
4. **Data, analytics, science, ML, mathematics: the answer is a figure or a table and we return the formula to type.** The code channel is real and useful (`work.js:370-375`, `:436`), but the result of running that code is invisible unless it lands on screen, and even then it is read as pixels. No execution, no data file ingestion, no `.xlsx`. The research anchor's "report ... effect sizes and uncertainty" (`method_anchors.js:107`) and the analytics anchor's "exact numerator, denominator" (`:47`) are promises the engine cannot keep on its own.
5. **Deliverables are a one-profession feature hidden behind "Completed".** `workDeliverables` only knows `architecture[]` and `security[]` issue lists and two diagram prompts (`work.js:1152-1158`), and the chip that opens it renders only after the task is marked complete (`WorkPage.jsx:2632-2637`). An accountant, lawyer, or analyst never sees a deliverable path during the work, and the review shape would not fit them if they did.
6. **Deliverables hand over prompts, not results, by design.** "hand them ready-to-use prompts to generate the result in their own tools" (`work.js:1148`); the document footer says "Paste a prompt into your own LLM or diagram tool" (`work.js:1223`). For a diagram that is defensible. For a reconciliation, a model, or a memo it means the user pays us and then does the work in a different AI.
7. **Four whole domains have no methodology anchor at all:** OT/ICS, IoT, aviation operations, and mathematics/quant finance (verified: no regex in `method_anchors.js` matches "scada", "plc", "modbus", "iot", "aviation", "airline", "flight", "dcf", "fp&a", "excel", "spreadsheet", "pandas", "numpy", "calculus", "algebra"). The planner falls back to the generic WORK_MODE for them, and WORK_MODE lists examples for QA, SDET, developer, DevOps, DevSecOps, robotics/AI, and managers, then says "Accounting, legal, finance, marketing, operations and every other field the same way" (`work.js:218-219`) without a method.
8. **The public coverage bot contradicts the "returns responses" expectation outright.** It is told "You never do the task, never write their code or content" (`work.js:983`), while the same prompt lists "accounting, spreadsheets, tax filing, invoices, payroll ... board decks" as covered (`work.js:988`). A visitor asking "will it compute my variance?" gets a "covered" verdict on a product that will not.

**Partial capability that already exists:**
- `workAsk` with a question returns free-text analysis and can include a figure or a snippet (`work.js:774-782`). It is reachable (Ask box) but prompted short and screen-bound.
- `workAddContext` reads pasted text/CSV up to 8,000 chars and can re-plan (`work.js:819-842`, `index.js:1096-1162`). It answers, but its "answer" is "the next concrete thing to do" (`work.js:839`).
- `workPlan`/`workHowTo` author code, commands, and file content exactly (`work.js:370-375`), and the client never scrubs those fields (`work.js:464-466`).
- `workDeliverables` produces a severity-rated review plus a Markdown/PDF (`work.js:1199-1225`, `index.js:965-971`) - for architecture/security only.
- `workDraft` exists server-side (`index.js:1479-1487`) and is one UI button away from being usable.

---

## 4. Finance litmus test: "Reconcile this month's bank statement to the ledger in Excel"

What the finance user expects at the end: the list of matched items, the list of unmatched items on each side, the variance (one number, to the cent), the proposed adjusting entries (bank fees, interest, timing differences), and a reconciliation report.

What WorkCoPilot does today, step by step:

1. **Goal entered** in the console (`WorkPage.jsx:1112`, placeholder "What do you want to get done?"). `methodAnchorFor()` matches `reconcil` -> `accounting_finance` (`method_anchors.js:116`), injecting "tie each account to its supporting evidence, match transactions, and chase every variance to the penny before signing off" (`:117`).
2. **Scope wizard** (`index.js:921`, `work.js:1094-1107`) asks 2-6 questions. It is prompted as a guide that "never does the task for them" (`:1096`). It may ask "what does done look like," never "do you want me to compute the variance."
3. **Plan** (`index.js:821-916`, `work.js:351-437`). Output is steps such as "Import the bank CSV," "Lock the opening balance," "Use **Data > Filter** on the Cleared column," "In cell `F2` type `=SUMIF(...)`." The `code` field can carry the exact formula. This is the strongest finance moment: it tells the user the right formula.
4. **Live loop** (`index.js:1010-1057`, `work.js:604-660`). Each changed frame goes in as a 1280px JPEG. The navigator returns `guidance` ("Click **Data**, then **Remove Duplicates**"), `observation` ("The sheet shows 184 rows, column F is empty"), and `flag` if a visible value looks wrong. It can catch "you typed the opening balance into the wrong cell" because that is on screen. It cannot say which 11 withdrawals did not clear, because it has 184 rows of 1280-pixel JPEG, not the data.
5. **The user asks "what is my variance and what is causing it?"** -> `workAsk` (`index.js:1060-1087`). The model receives the goal, the plan, the question, and ONE downscaled screenshot. If the totals row is visible and legible it can read "48,210.17" and "48,195.42" and reply "difference 14.75, likely the bank fee on the 14th." That is an OCR read plus mental arithmetic, with no basis shown and no check; if the figure is wrong the accountant signs off on a wrong number. If the totals are off-screen the prompt tells it to ask the user to scroll (`work.js:631-635`).
6. **The user pastes the CSV** via the paperclip -> `workAddContext` (`index.js:1096-1162`). Up to 8,000 characters reach the model (`:1110`), about 100-150 statement lines. The prompt asks it to decide whether the REMAINING PLAN needs to change (`work.js:824`) and to write "the next concrete thing to do" (`:839`). It is not asked to match the rows or compute the variance, and the ledger side would need a second paste that the step shape does not accommodate.
7. **Finish** -> `workSummarize` (`index.js:1490`) writes an overview, steps completed, still open, notes. The report PDF includes milestone screenshots. No reconciliation report, no numbers, because none were produced.
8. **"Review & prompts"** appears after completion (`WorkPage.jsx:2637`). It will return `architecture[]` and `security[]` issue lists and two diagram prompts (`work.js:1152-1158`) - meaningless for a reconciliation.

**Does it compute the figure or point at the cell?** It points at the cell and hands over the formula. The figure, the matched list, the adjustments, and the report are all left to the user. For an accountant who already knows Excel, the product's real value in this task collapses to "a second pair of eyes that catches a wrong cell," which is not what "Reconcile the month to the penny" promises.

---

## 5. Options to discuss (not built)

All four keep the two non-negotiables: WorkCoPilot never clicks, types, or changes anything in the user's app, and sensitive data is governed on-device before it leaves.

### Option A - A structured "result" channel beside the guidance (answer mode)

**What changes.** Add a `result` object to the `workAsk` and `workNavigate` outputs (and a `deliverable` to each plan step): `{ kind: value | table | text | code, body, basis, verifyBy, confidence }`. Prompt the model that when the goal or question calls for a figure, a table, or a drafted text, it must PRODUCE it, cite the on-screen or pasted values it used (`basis`), and give the user a one-line way to confirm it in their own tool (`verifyBy`, e.g. "`=F200-G200` should show 14.75"). The console renders a Result card next to the step card; the session report and PDF include every result. Add a "Give me the result, not just the steps" toggle in the scope wizard that sets the session's expectation.

**Effort.** Small to medium: prompt edits in `workAskSystem`, `workNavigateSystem`, `workPlanSystem`; schema parsing in `work.js`; one React card; report/PDF inclusion.

**Risks.** Hallucinated arithmetic from a screenshot. Mitigations: mandatory `basis` and `verifyBy`, confidence, a higher-resolution region crop for the Analyze button (the user drags a box over the totals), and a hard rule that a `value` without a visible basis is returned as "I cannot read the figure; scroll or paste the values."

**Read-only coexistence.** The result is displayed and copied by the user; nothing is written into their app. This is the same posture as `commands[]` today.

### Option B - Data-grounded compute on the device (finance-grade path)

**What changes.** Let the user attach the actual data (today `.csv/.tsv/.json`; add `.xlsx` via an on-device sheet parser in the web/desktop client, mirroring how documents are already OCR'd locally). The AI produces a computation SPEC (which columns to match on, tolerance, which totals to compare, which formula), and a small deterministic on-device compute helper executes it (sum, diff, join/match, group-by, variance, percent). The device returns the computed table and figure to the console; only the spec and an aggregate summary go to the AI for narration. With DLP armed, raw rows never leave the machine.

**Effort.** Medium to large: parser + compute helper in the client (web and desktop), a `computeSpec` schema in the engine, a results panel, report inclusion, tests on real statements and ledgers.

**Risks.** Scope creep into a spreadsheet engine; mitigate by defining a bounded operation set (match, sum, diff, group, filter, variance, lookup) and routing everything else back to "here is the formula, run it in your tool." Determinism solves the trust problem that Option A alone cannot: the figure comes from code, the AI only explains it.

**Read-only coexistence.** Strongest of the four: the user's app is untouched, the data stays on device, and the AI never does arithmetic.

### Option C - Surface and generalize the authored-output functions in the main flow

**What changes.** Wire `workDraft` (dead today) to a "Write it for me" button beside Ask, and widen its prompt from "an email, a chat or a status update" to any artifact the step needs: memo, journal entry set, variance commentary, SQL query, script, config, test plan, red-line text, job description. Give each method anchor an optional `deliverables` list (the artifacts that discipline actually produces) so the output shape is profession-aware (the accounting anchor yields "adjusting entries + reconciliation note," the QA anchor yields "defect report," the legal anchor yields "red-line with rationale"). Generalize `workDeliverables` from `architecture[]`/`security[]` to an anchor-driven issue taxonomy, and expose the panel during the task, not only after completion.

**Effort.** Small to medium. `workDraft` wiring is a day; anchor-driven deliverable shapes are the real work.

**Risks.** Identity drift from "guide" toward "generator," which the coverage bot currently denies (`work.js:983`). Mitigate by always pairing an authored artifact with "where to paste it and how to verify it," and by keeping the artifact in the console, never pushed into the user's app.

### Option D - Profession-aware scope and honest claims

**What changes.** The scope wizard asks one more question for compute- or author-heavy goals: "Do you want the steps, the result, or both?" and stores the answer on the session; the planner marks each step with what it should PRODUCE. Add anchors for the missing domains (OT/ICS, IoT, aviation ops, mathematics, quant/FP&A/Excel modeling). Until A-C land, tighten the public claims: replace "Reconcile the month to the penny" with what the engine does ("guides the reconciliation and flags what it can see"), and remove authored-deliverable marquee items ("Pitch decks", "Resumes", "Grant applications") or qualify them.

**Effort.** Small. Prompt text, anchor entries, marketing copy.

**Risks.** None technical. The commercial risk is the opposite: continuing to sell computed and authored outcomes the engine does not produce.

### Recommended sequence to discuss

D (honesty and anchors, immediate) -> A (result channel, fast and visible) -> C (wire and generalize authoring) -> B (on-device compute for finance, data, science). A plus B together is what turns "point at the cell" into "here is the figure, here is why, here is how to check it," without ever touching the user's application.

---

## Appendix - evidence index

- Read-only design intent: `server/work.js:10-13`, `:153-157`, `:1096`, `:1148`, `:983`
- Code and commands as first-class authored output: `server/work.js:177`, `:370-375`, `:436`, `:464-466`
- Output budgets: `server/work.js:576`, `:620`, `:727`, `:781`, `:1185`, `:1193-1194`
- Frame budget: `src/pages/WorkPage.jsx:56-67`, `:93-109`
- Text ingestion caps: `src/pages/WorkPage.jsx:21-37`; `server/index.js:882-883`, `:1109-1110`
- No execution or spreadsheet libraries in `server/` (searched: xlsx, exceljs, mathjs, child_process, vm, sandbox, spawn)
- `workDraft` unwired: `src/api.js:137` only reference; `server/index.js:1479-1487`
- Deliverables gating and shape: `src/pages/WorkPage.jsx:1991`, `:2632-2637`; `server/work.js:1146-1197`
- Marketing claims: `src/pages/WorkMarketing.jsx:108`, `:113-117`, `:121`, `:370`; `src/pages/WorkUseCases.jsx:63-66`, `:69-72`; `src/pages/WorkCapabilities.jsx:120-128`
- Anchors present and absent: `server/method_anchors.js` (51 entries; no match for scada, plc, modbus, iot, aviation, airline, flight, dcf, fp&a, excel, spreadsheet, pandas, numpy, calculus, algebra)
