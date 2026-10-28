# 05 — Novelty synthesis, candidate claim set, and validation of the v1 claims

**DRAFT for review by a registered patent practitioner. Not legal advice. Not a freedom-to-operate / clearance opinion.**
Inventor: **Ravi Kiran Raju Yerra.** Prepared 2026-10-26. Synthesis of five adversarial prior-art searches (core guidance loop, on-device privacy, enterprise governance, private-brain/KB, delivery & interaction UX) + a 192-item feature inventory. Every reference cited below was actually retrieved by the researchers; patent-page claim text was often truncated, so scope statements are description-level and must be confirmed against full claims before filing. Priority/effective-filing date is not fixed here: items dated 2025–2026 are only prior art if they predate your filing date — date-stamp each.

---

## 1. Headline: how many we can realistically patent for

The honest answer is **one strong anchor invention plus three "pursue-with-narrowing" inventions**, supported by roughly **18–22 dependent claims**. None of the broad one-line ideas survives alone; novelty lives in specific *combinations*. By invention:

| # | Invention | Strength | Reduced to practice? | Filing recommendation |
|---|---|---|---|---|
| **I.** | **Core read-only guidance loop** carried on an **on-device-redacted frame** that is simultaneously (a) the vision-model input, (b) the visible-when-done verification artifact, and (c) the only retained step evidence — one instruction, no input injection, advance-only-on-evidence, corrective-on-mismatch | **Medium-high** (only with redaction + evidence fused into the independent claim) | **Yes** (shipped) | **File first.** This is the anchor patent (method/system/CRM = your existing claims 1/10/16). |
| **II.** | **Tiered workflow-template retrieval**: deterministic conjunctive gate (goal-signature score floor AND app-key identity AND structured-environment non-contradiction AND env floor; withhold near-misses) to *serve* a proven template or *seed* a planner, improving by retrieval not training | **Moderate** (narrow gate only; broad idea is anticipated) | **Yes (wired 2026-10-27, `dbc7efa`: `/plan` matches and injects, `/finalize` distills and captures)** | Pursue as a 2nd independent **with narrowing**; actual RTP now; the shipped serving form is a backbone directive, which Appendix A1 now recites as the form of the adaptation pass. |
| **V.** | **Multi-task project engine** (added 2026-10-27): goal planned once into a dependency-ordered task map with per-task screen-visible done-states and a project end-state, no step-level instruction; deterministic breakdown gate; dependency-gated next-task selection; just-in-time step expansion seeded from a project-scoped, deduplicated forward-learnings ledger; each task run as the Invention I loop; mid-project injection with token-set dedupe and cycle-safe placement; project reports | **Moderate** (survives only as the full combination; HTN, ADaPT, ASAPP, State Farm and agent-memory art under §103) | **Yes** for the map, gate, store, selector, expansion, ledger write at expansion, completion and reports (`40fde01`); done-state as navigator target and end-state verification are specification-supported | Filed as independent claims 22 (method), 28 (system), 29 (medium) with dependents 23 to 27, in the same application (no parent on file, so no CIP). |
| **VI.** | **Watch-loop transient-unreadable-frame tolerance** (added 2026-10-27): per-session consecutive count of records with neither instruction nor observation; stronger model withheld and no incident below the tolerance; escalation at the tolerance; reset on a readable record; manual deep read always escalates | **Moderate-weak** (consecutive-failure counters and model cascades are known; the human-guidance rationale is the hook) | **Yes** (`store.js` VISION_EMPTY_TOLERANCE, `/watch` handler) | Dependent claim 10 on claim 1; specification [0108] to [0111] qualifies the immediate escalation of [0042]; sliding window described as an alternative, not claimed. |
| **III.** | **Unified tenant policy** that from one object governs BOTH on-device frame redaction AND the model's instruction-shaping AND evidence retention, with a value-excluding per-transmission audit and single-operation purge | **Moderate** (the conjunction; individual fields are known) | **Partial** (redaction/evidence yes; instruction-shaping + lockable unlock + audit schema need confirming) | Pursue as a 3rd independent = **amended claim 16** (add the instruction-shaping limb). |
| **IV.** | **Screen-derived-options clarification ("Probe")**: one mid-task question whose options are inferred from the captured frame, with Other + Skip, suppressed when the answer is on-screen, and whose answer triggers a **re-plan exempt from the per-task re-plan budget** | **Moderate-weak** (needs technical framing; budget-exemption is the one element with no art found) | **Yes** (the `/clarify` card ships; "Probe" is not a code name) | Pursue as a narrow independent or a strong dependent of I. |

**What this means for filing:** the cleanest path is **one application** anchored on Invention I (claims 1/10/16 as amended) with the best dependents from all clusters, then pursue II/III/IV via additional independents in the same application (accepting a likely **restriction requirement** → divisionals) or as **continuations**. Staying at ≤20 claims / ≤3 independents avoids USPTO excess-claim fees (verify the fee schedule at filing). Counsel decides one-vs-many applications.

---

## 2. NEW candidate claim set (consolidated, tabular)

Tiers: **A** = best chance of surviving §102/§103, file first · **B** = defensible dependent / second-tier independent · **C** = narrow / fallback / deterrent. "RTP" = reduced to practice in the shipped code.

### 2.1 Invention I — core guidance loop (anchor)

| ID | Type | Subject (scope, short) | Novelty basis / closest art + delta | Tier | Maps to v1 | RTP |
|---|---|---|---|---|---|---|
| I-1 | Independent (method) | Plan-conditioned VLM **navigation record** (satisfied-set + single current step + one frame-referencing instruction), advance gated on a later **redacted** frame showing the plan-embedded *visible-when-done* condition, else a corrective instruction; human performs; no input injection; **redaction in the claim** | Crowded parts (SAP US11709691, OpenAI US12051205B1, WalkMe US11520690, Kryon US9569231, USAA US11989786, Pan et al. 2404.06474, Midscene aiAssert) but **no art** combines human-performer + VLM-on-screenshot verification + plan-embedded postcondition + corrective + on-device redaction | A (with redaction) | **= claim 1** | Yes |
| I-2 | Dependent | Navigation record carries observation + flag; corrective instruction derived from the flag | Minor; supports I-1 | B | = claim 2 | Yes |
| I-3 | Dependent | The **verification frame doubles as the sole stored evidence**, stored only on first newly-satisfied determination | Fusion of verification + evidence is where no close art was found | **A** | = claim 8 | Yes |
| I-4 | Dependent | Visible-when-done condition is generated **by the planner model together with the plan**, as display content to be present | Distinguishes WalkMe DOM advancement conditions / Kryon scripted validation | B | new (fold into 1) | Yes |
| I-5 | Dependent | Runtime **prerequisite insertion**: prerequisite absent → current step re-targets to a prerequisite-establishing step | §103 pressure from agent-replanning papers; no close human-guidance art | B | split from claim 6 | Yes |
| I-6 | Dependent | **Equivalent-visible-control substitution** + "app differs from plan" indication, recorded/used downstream (plan-repair) | **No close art found** for flagged equivalent-control substitution in human guidance (WalkMe US12405809 only re-finds the *same* element) | **A-/B** (best dependent in cluster) | split from claim 6 | Yes |
| I-7 | Dependent | Model escalation on incomplete navigation record, user-visible log | Anticipated (FrugalGPT, RouteLLM, Anthropic refusal-fallback) | C | = claim 7 | Yes |
| I-8 | Dependent | Read-only architecture: no input-synthesis interface; presentation layer is the only output path | Anticipated as concept (Copilot Vision, IBM US5493658, Red Hat US11609772) — clarifier only | C | in claim 1 | Yes |

### 2.2 Invention II — tiered workflow-template retrieval (KB / "Private Brain")

| ID | Type | Subject | Novelty basis / closest art + delta | Tier | Maps to v1 | RTP |
|---|---|---|---|---|---|---|
| II-1 | Independent | **Conjunctive tier gate**: STRONG only if weighted(goal-token, app-key, env-compat) ≥ floor AND app keys match AND no env attribute contradicts AND env ≥ floor; SEED tier at a lower floor; else **withhold**; serve STRONG with one adapt pass, seed planner with SEED | Broad idea anticipated (Accenture US12321777B2, Boomersurf US20170277312A1, LLM-Planner, Synapse, AWM, Agent S, CBR 1994); **the specific conjunctive gate + withhold-near-miss** not found | A (narrow) | new | **Yes (wired 2026-10-27, `dbc7efa`; serving = backbone directive)** |
| II-2 | Independent/CRM | **Clean-success capture + deterministic de-identified distillation**: on a guided session with all steps user-confirmed done and no open flag, deterministically build a template (volatility-stripped goal signature, normalized app key, environment from clarification answers, ordered steps with kind + first on-screen target), command/code exempt from pre-scrub but scrubbed under stored policy at persist | Anticipated in part (AWM, Bosch US20260111708A1, SAP US20200401430A1, Soroco US20200183656A1); **the clean-success predicate over a screen-confirmed step record + env extraction + two-layer command-exempt scrub** is the narrower hook | A (narrow) | new | **Yes (wired 2026-10-27, `dbc7efa`: `/finalize` distills and captures)** |
| II-3 | Dependent | Goal similarity = mean(Jaccard, overlap) on a volatility-stripped token set; app similarity treats subset as match | Not found as a claimed function | B | new | Yes (`dbc7efa`) |
| II-4 | Dependent | **Skip/prefill a clarification** whose answer is in the matched template's environment record for the same tenant | **No art found**; verify implemented before claiming | B | new | No (confirm) |
| II-5 | Dependent | Holder scope: company-private shared store vs consented de-identified platform store, selected by account type; tenant switch disables capture + retrieval together | Tenant isolation is routine; the two-scope split is a modest add | C | new | Partial |
| II-6 | Dependent | **Drift-triggered self-heal supersede**: live verification finds the on-screen target moved → replace steps, keep one prior version + serve count | Only distinguishing lifecycle piece (TTL/LRU/versioning are routine) | B | new | No |

### 2.3 Invention III — unified tenant policy (governance)

| ID | Type | Subject | Novelty basis / closest art + delta | Tier | Maps to v1 | RTP |
|---|---|---|---|---|---|---|
| III-1 | Independent | **One policy object** (per-category send/redact/withhold/tokenize, block words, mode, screenshot-evidence flag, armed) that governs (i) per-line OCR masking of frames before egress, (ii) whether a redacted frame may be retained as evidence, **and (iii) the model's single-step instruction** (server-side rule set); per-transmission **value-excluding** audit | NROC US12688280B2, Purview Copilot DLP, Windows Recall policy, SAP US12554888B2 each cover pieces; **the unified sensing+instruction+evidence object with value-excluding audit** not found as one | A (conjunction) | **amend claim 16** (add limb iii) | Partial |
| III-2 | Dependent | Server **re-applies** the identical policy to received frames/text; further removals recorded as category counts | Server second-pass known (WO2014107486, Capital One 2024/0111891); tie to AI-guide frames | B | = claim 18 (strengthen) | Confirm |
| III-3 | Dependent | **Locked** state; tenant-admin edits refused; unlock needs re-auth of a role **above tenant admin** + value-excluding audit entry (actor, prior/new version) | Role step-up known (Oracle US20150082372, SSH US10091239); Microsoft US11368361 tamper-resistant policy | B | = claim 17 **(NOT backed by code — see §4)** | **No** |
| III-4 | Dependent | **Single-operation purge** of sessions older than window + their redacted evidence frames + their audit records | Recall retention known; the atomic cascade incl. audit is unusual (audit normally outlives data) | B | = claim 19 | Confirm |
| III-5 | Dependent | **Value-excluding audit schema** = closed set {policy version, mode, per-category removal counts, frame-sent boolean} that *cannot* store matched values | Styra US10984133 logs policy version; metadata-only logging known; the closed-schema combination not found | B | in claim 16 | Confirm |
| III-6 | Dependent | **Destructive-operation display gating**: command/code in a model step matched vs catalog, suppressed behind a reason-labeled placeholder, revealed only on explicit acknowledgment (auditable) | Microsoft US8694322, IBM US11023609 gate *execution*; here the guide never executes, so gating *display* is the difference | B | = claim 15 | Yes |
| III-7 | Dependent | Policy compiled into **guidance rules** that forbid/rewrite steps exposing a withheld category; guide emits a policy-reason instead | Policy-constrained assistants known (Purview, Policy-as-Prompt); unified with the sensing side is the hook | B | new (F7) | Partial |

### 2.4 Invention IV — screen-derived clarification ("Probe") + privacy/delivery dependents

| ID | Type | Subject | Novelty basis / closest art + delta | Tier | Maps to v1 | RTP |
|---|---|---|---|---|---|---|
| IV-1 | Independent (framed technically) | Mid-session, a model-generated question whose **options are inferred from the captured frame**, with free-text + skip; answer stored in session scope; plan regeneration carries a **clarification-origin flag so it is not counted against a per-task re-plan limit** | IBM US20150039536 (choices+none+free-form), ASAPP US11610064, AndroidInteraction 2503.19537 (screen-derived options), Claude Code AskUserQuestion (Other) each partial; **the free-re-plan metering has no art found** | B→A if framed technically | new | Yes (`/clarify`) |
| IV-2 | Dependent | Question **suppressed when the answer is determinable from the frame**; option set never closes (always Other) | server/work.js prompt rule; AndroidInteraction discusses defaults | B | new | Yes |
| IV-3 | Dependent | Skip proceeds on a stated assumption; answered question reopenable; re-answer re-plans free | No art found for undo + free re-plan | B | new | Yes |
| PRIV-1 | Dependent | **Downscale-to-illegible fail-safe** when OCR unavailable; legibility criterion (min text height / OCR-confidence) | **No art found** for the fallback itself (Google US9426387 is camera, not OCR-trigger) | B | = claim 4 | Confirm |
| PRIV-2 | Dependent | **Leave-and-flag** on altered/absent token; no fuzzy substitution | **No art found** (nearest is fail-closed/block, e.g. Kong Skyflow) | B | = claim 13 | **No (streaming not built)** |
| PRIV-3 | Dependent | One egress policy + detection rules applied to **both** OCR'd frame lines and outbound typed text; block words removed irreversibly w/o token | Analogous (Purview OCR, Presidio, Cataphora US7805673) → keep dependent | B | = claims 3/14 | Partial |
| PRIV-4 | Dependent | Token = type indicator + index; **volatile-only map excluded from every transmission**, zeroed on reset | SAP US12554888 anticipates core; memory-only in OSS tools | C | = claims 5/11 | Yes (whole-string) |
| DLV-1 | Dependent | Desktop guide window simultaneously always-on-top + click-through (hover re-enable) + content-protected so it is **absent from the product's own analyzed frames AND from other apps' screen shares** | Electron setContentProtection/setIgnoreMouseEvents, Microsoft US7689926, trycua #4194 (2026) anticipate/obviate | C | = claim 20 (desktop half) | Yes |
| DLV-2 | Dependent | Browser: Document-PiP opened on gesture **before** capture prompt; degrade PiP→pop-out→in-tab; narrow-strip sizing | Pieces public (Chrome Doc-PiP 2023, Contrast blog 2023); **do not imply browser self-exclusion** (W3C issue #330 — not achievable in browser) | C | = claim 20 (browser half) | Yes |

### 2.5 Inventions V and VI — project engine and watch-loop tolerance (added 2026-10-27)

Source: `docs/patent-candidates-2026-10-27.md` and the refresh `final/01-prior-art-search.md`. Claim numbers are those of `v2/20-claims.md` after the 2026-10-27 renumbering (former claims 10 to 20 are now 11 to 21).

| ID | Type | Subject | Novelty basis / closest art + delta | Tier | Claim | RTP |
|---|---|---|---|---|---|---|
| V-1 | Independent (method / system / CRM) | **Two-tier project engine**: map planned once (task goal + screen-visible done-state + dependencies per task; project end-state; no step-level instruction); lowest-order dependency-met task selected; steps for that task only expanded on selection, seeded with the project ledger as verified facts; each task run as the claim-1 loop; ledger append deduplicated by normalized text; task marked done with an outcome; project complete only when all tasks done and end-state shown satisfied | ADaPT 2311.05772, State Farm US 2024/0330654, ASAPP US 12,645,890, HTN+LLM 2511.12901 each hold a piece; **no reference combines up-front done-state/end-state map + actionability-triggered expansion + human performer with frame verification + project ledger** | A/B (full combination only) | 22, 28, 29 | Yes except the end-state-shown-satisfied limb (spec [0097]) |
| V-2 | Dependent | **Deterministic breakdown gate**: real = aim AND done-state; normalized-label duplicate collapse; ≥ 2 distinct real tasks else single task; unresolved dependency, cycle (3-colour DFS), empty end-state all errors, reported together; over-length single task advisory only, never split | VeriMAP 2510.17109, GNNVerifier 2603.14730, PtcRunner validator, OrchBench each hold a check; **the bundle with the asymmetric over/under-split rule on a human task map** not found | B (bundle) | 23 (also folded into 29) | Yes (`work_project_validate.js`, create route) |
| V-3 | Dependent | **Mid-project injection**: normalized word-token Jaccard dedupe (0.6) → fold; else place before named blocker (inherit upstream deps; blocker gated) / after latest named dependency / at frontier; cycle probe → drop edge, append with notice | eBay US 8,887,163, IBM US 12,248,810, IBM US 7,949,610 hold the DAG mechanics; **similarity dedupe + three-way placement + degrade-to-append-with-notice in a live human project** not found | B | 24 | Yes (`work_project_inject.js`, inject route) |
| V-4 | Dependent | Done-state supplied to the navigator as the task-level verification target; ledger write at verified completion including the discrepancy indication 234 | Ties the ledger to screen-confirmed facts; distinguishes Reflexion / agent memory | B | 25 | Constructive (spec [0094], [0095]; `completeProjectTaskForSession` accepts a learning but no route passes one) |
| V-5 | Dependent | Project reports (success / security / issues) rolled up to the end-state checks; confirmed steps only | Obvious extension of claim 8 reports; kept as a dependent | C | 26 | Yes (`work_project_report.js`) |
| V-6 | Dependent | Guidance depth: pool depth clamped to a tenant ceiling set above the tenant admin; project map only at deep; non-deep user offered a single task | Routine entitlement clamping; §101-exposed alone | C | 27 | Yes (`guidance_depth.js`) |
| VI-1 | Dependent (on claim 1) | **Watch-loop tolerance**: consecutive count of records with neither instruction nor observation; below tolerance withhold the stronger model, leave the step unchanged, record no escalation event; at tolerance re-submit the next unreadable frame; reset on a readable record; manual deep read always escalates | AutoMix 2310.12963, FrugalGPT, RouteLLM (per-query cascades), KVM US 10,585,731 (failure-frame counter, alert only), Squint US 12,567,270 (iteration cap); **persistence-gated capability escalation specific to human screen guidance** not found, but a §103 combination is plausible | B/C | 10 | Yes (`store.js` VISION_EMPTY_TOLERANCE; `/watch`) |

Specification-only support added the same day (no claim): deepened planning with the monotone no-degrade acceptance rule ([0101]); the backbone directive as the shipped form of the serving-tier adaptation pass ([0079]); the sliding-window alternative to the consecutive count ([0110]).

---

## 3. Recommended claim architecture

1. **Independent anchor = amended claim 1/10/16** of Invention I, keeping **on-device redaction + verified-frame-as-sole-evidence inside the independent** (the only combination with no close art). Add I-4 (planner-generated visible-when-done) into claim 1.
2. **Best dependents to carry forward:** I-3, I-6 (strongest), I-5, III-6, PRIV-1, PRIV-2, IV-2/IV-3.
3. **Second independents (expect restriction):** III-1 (amended claim 16 + instruction-shaping limb iii), II-1 and/or II-2 (narrow KB), IV-1 (Probe, technically framed).
4. **Do NOT file as standalone independents:** generic "OCR-mask before transmit" (Adeia US11869126), generic "tokenize + rehydrate with local map" (SAP US12554888), generic "capture successful task → retrieve to seed LLM" (AWM; Accenture US12321777B2), bare "read-only guide user with prompts" (WalkMe US9922008 was invalidated under §101 — **real §101 risk**).

---

## 4. Validation of the v1 20-claim set (patent-package/04-claims.md)

| v1 claim | Verdict | Why / action |
|---|---|---|
| 1 (indep, method) | **Hold, strengthen** | Survives only with redaction + evidence in the claim (already there). Add that the visible-when-done condition is planner-generated and evaluated on the same redacted frame. Biggest risk: §103 combo (Kryon/WalkMe/IBM/USAA + SAP/OpenAI + Pan/Midscene). |
| 2 | Hold | Minor; keep. |
| 3 (on-device OCR mask) | **Keep dependent** | Anticipated alone (Adeia US11869126, Huawei US11861923, Presidio). Fine as dependent of 1. |
| 4 (downscale fail-safe) | **Hold — likely novel** | No art found; add a concrete legibility criterion to give it bite. |
| 5 (tokenize, volatile map) | Keep dependent | Core anticipated by SAP US12554888 (priority 2023-11-17). Keep the volatile-only / excluded-from-transmission language. |
| 6 (prereq + alt-control) | **Split into two** | I-5 and I-6; I-6 (equiv-control + app-differs flag) is the stronger; add downstream use of the flag. |
| 7 (model escalation) | **Low value** | Anticipated (cascade/fallback). Keep as a minor dependent; also note the code escalates on thrown errors too, which claim 7 doesn't recite. |
| 8 (verified frame = evidence) | **Hold — strong** | Fusion point with no close art. Keep prominent. |
| 9 (session report) | Hold | Keep dependent. |
| 10 (indep, system) | Hold, strengthen | Same as 1. |
| 11 (consistent token) | Keep dependent | Common; SAP anticipates in spirit. |
| 12 (progressive streaming rehydration) | **At risk — NOT built** | `rehydrate()` operates on whole strings only (inventory). Either implement streaming or ensure the spec [0039] enables it (constructive RTP); do not assert as working. |
| 13 (leave-and-flag) | **Hold — likely novel** | No art found; narrow but keep. |
| 14 (block words irreversible) | Keep dependent | Presidio `redact` analog; keep tied to the shared-policy structure. |
| 15 (destructive-command gating) | **Hold** | Gating *display* for a read-only guide is a real difference vs execution-gating (Microsoft US8694322, IBM US11023609). |
| 16 (indep, CRM) | **Amend** | Add limb: the policy **also constrains the model's single-step instruction** (III-1 limb iii). As drafted it omits this, the least-covered element. |
| 17 (privileged unlock) | **At risk — NOT backed by code + high §103** | Code only checks a client-sent `_unlock` flag (`store.js:1035`); no higher-privilege re-auth, no audit entry — a company admin could send the flag. §103 from Microsoft US11368361 + Oracle US20150082372. **Implement the re-auth/audit or reframe; confirm before filing.** |
| 18 (deny member weaken + server re-apply) | Hold, keep dependent | Weak alone (Microsoft US11368361); fine on the full combination. |
| 19 (retention purge) | Hold dependent | Keep paired with the value-excluding audit schema. |
| 20 (browser PiP / desktop overlay, "or") | **Split** | Separate browser vs desktop embodiments. **Do not imply the browser window is excluded from self-capture** (not achievable — W3C issue #330); desktop half faces Electron-docs + trycua #4194 (2026) art. |

**Cross-cutting:** confirm the effective filing date against the 2025–2026 third-party art (Copilot Vision Highlights 2025-06; Clicky 2026; SAP US12554888 granted 2026-02; NROC US12688280 granted 2026-07; trycua #4194 2026-09). Prepare an **IDS** citing at minimum the references in §5.

---

## 5. Prior-art to disclose (IDS seed — verify every one before filing)

**Patents (verified at description level; pull full claims):** SAP US 12,554,888 B2 · Adeia/Rovi US 11,869,126 B2 · Huawei US 11,861,923 B2 · OpenAI US 12,051,205 B1 · SAP US 11,709,691 B2 · WalkMe US 11,520,690 B2 · WalkMe US 12,405,809 B2 · Kryon US 9,569,231 B2 / US 9,098,313 B2 · USAA US 11,989,786 B1 · IBM US 5,493,658 A · Red Hat US 11,609,772 B2 · Boomersurf US 10,852,898 B2 / US 2017/0277312 A1 · UiPath US 11,461,164 B2 · Whatfix US 2025/0130827 A1 · Accenture US 12,321,777 B2 · Automation Anywhere US 11,481,304 B1 · Bosch US 2026/0111708 A1 · Intuit US 11,768,304 B1 / US 11,429,351 B2 · NROC US 12,688,280 B2 · Microsoft US 11,368,361 B2 · Oracle US 2015/0082372 A1 · SSH US 10,091,239 B2 · Microsoft US 8,694,322 B2 · IBM US 11,023,609 B2 · Styra US 10,984,133 B1 · Bank of America US 12,554,883 B2 · Microsoft US 7,689,926 B2 · Capital One US 12,013,965 B2 · CallMiner US 10,313,520 B2 · IBM US 2015/0039536 A1 · ASAPP US 11,610,064 B2.
**NPL:** Agent Workflow Memory (arXiv 2409.07429) · Synapse (2306.07863) · Agent S (2410.08164) · ExpeL (2308.10144) · Voyager (2305.16291) · LLM-Planner (2212.04088) · Case-Based Reasoning (Aamodt & Plaza 1994) · Show and Guide (2409.19074) · Pan et al. (2404.06474) · "Are We Done Yet?" (2511.20067) · Midscene aiAssert · AndroidInteraction (2503.19537) · Microsoft Copilot Vision Highlights (2025-06) · Windows Recall managed-policy docs · Microsoft Purview Copilot DLP docs · Chrome Document-PiP spec · Electron setContentProtection.
**Must-pull before filing (not fully read):** Whatfix US 12,725,397 · Microsoft 2025/0110985 family · Zscaler US 12,711,255 B2 · US 12,591,441 · US 12,670,454 (scanned; likely UiPath/LLM-workflow) · Capital One US 2024/0111891 A1 / US 12,361,163.

---

## 6. Filing caveats (read before relying)

- **Practitioner review is required.** This is drafting support, not legal advice, and not an FTO opinion.
- **Reduction to practice:** Invention II (Private Brain) was wired into the server on 2026-10-27 (`dbc7efa`) and Invention V's ledger write leg on the same day (`40fde01`); III-1 limb (iii), III-3 (unlock), III-4/5 (audit/purge), PRIV-2 (streaming), V-4 (done-state as navigator target) and the end-state verification limb of V-1 remain specification-supported and need code confirmation or the inventor's confirmation of conception.
- **Filing posture for the 2026-10-27 matter:** nothing has been filed, so the project engine and the tolerance are incorporated into the one application (claims 10, 22 to 29; FIG. 10 to 13; [0090] to [0112]) rather than held for a continuation-in-part; see `final/README-WHAT-IS-WHAT.md`. For a patent, the **specification** must enable them (constructive RTP) and the inventor must possess the invention — decide per item whether to claim now or after implementation. Do not represent unbuilt features as working in marketing or in a declaration.
- **§101 risk:** keep claims tied to concrete technical mechanisms (on-device redaction, frame-as-evidence, the deterministic gate), not "guide a user through software" (WalkMe US9922008 invalidated).
- **Priority date** governs whether 2025–2026 references are prior art — fix it with counsel and date-stamp each reference and your own first public use (admireveda.com is live).
- **Full prior-art reports** with per-feature analysis + source URLs: `scratchpad/patent/priorart-{guidance,privacy,governance,brain,delivery-ux}.md`. Feature inventory: `scratchpad/patent/feature-inventory.md`.
