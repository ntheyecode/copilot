DRAFT — for review by a registered patent practitioner before filing. Not legal advice.

# 40: Drawings: figure list and per-figure description (v2 DRAFT)

> Package note: the v1 package contains black-and-white SVG line art for FIG. 1 to FIG. 5 (`patent-package/drawings/FIG1-system-architecture.svg` to `FIG5-tenant-egress-governance.svg`). The v2 specification extends FIG. 1, 2, 3 and 5 with new reference numerals and adds FIG. 6, 7, 8A, 8B and 9; the 2026-10-27 update adds FIG. 10 to FIG. 13 for the multi-task project engine, the breakdown gate, mid-project injection and the watch-loop tolerance. The generated informal drawings for all thirteen sheets are in `patent-package/final/drawings/` (generator `tools/gen_drawings.py`, manifest `drawings-manifest.md`). Formal drawings that comply with 37 CFR 1.84 (sheet size, margins, line quality, numbering, lead lines, no color or shading unless permitted, consistent numerals) should be prepared or checked by a patent draftsperson from this description and from the specification (file 10) before filing. All reference numerals below match file 10 and file 20.

## Figure list

| Figure | Title | Numeral series | Status |
|---|---|---|---|
| FIG. 1 | System 100 block diagram | 110 to 190 | generated; v1 drawing extended with 136, 157, 164, 166, 168 |
| FIG. 2 | Guidance loop 200 flowchart | 202 to 234 | generated; v1 drawing extended with 230, 232, 234 |
| FIG. 3 | On-device redaction and tokenization pipeline 300 | 302 to 340 | generated; v1 drawing extended with 338, 340 |
| FIG. 4 | Sequence diagram 400 of one guided step | 402 to 440 | generated; unchanged from v1 |
| FIG. 5 | Tenant governance arrangement 500 | 502 to 540 | generated; v1 drawing extended with 534, 536, 538, 540 |
| FIG. 6 | Workflow-template capture and tiered retrieval 600 | 602 to 650 | generated |
| FIG. 7 | Screen-derived clarification flow 700 | 702 to 726 | generated |
| FIG. 8A | Browser presentation embodiment 800 | 802 to 814 | generated |
| FIG. 8B | Desktop presentation embodiment | 820 to 834 | generated |
| FIG. 9 | Destructive-operation display gate 900 | 902 to 916 | generated |
| FIG. 10 | Multi-task project engine arrangement 1000 | 1002 to 1042 | new 2026-10-27 |
| FIG. 11 | Deterministic breakdown gate 1100 | 1102 to 1122 | new 2026-10-27 |
| FIG. 12 | Mid-project task injection flow 1200 | 1202 to 1224 | new 2026-10-27 |
| FIG. 13 | Transient-unreadable-frame tolerance 1300 | 1302 to 1318 | new 2026-10-27 |

Suggested figure for publication (ADS field): FIG. 2.

## Per-figure description

### FIG. 1: System 100

Block diagram. Left: user device 110 containing display 112, screen-capture interface 114, input device 116, target application 190 (drawn inside the display), and guidance client 120. Inside guidance client 120: capture module 122, on-device redaction engine 124, token map 126 (labeled "volatile memory only"), policy-enforcement module 128, local rehydration module 130, presentation layer 132 with floating overlay 134, and clarification card 136. Center: network 140. Right: guidance server 150 containing planning module 152, navigation and verification module 154, server-side policy re-enforcement module 155, audit log 156, clarification handler 157, evidence store 158, policy store 160, security gate 162, instruction-shaping rule set 164, workflow template store 166, and template distiller and matcher 168. Below the server: model services 170 with first model 172 (vision, low latency) and second model 174 (stronger). Tenant administration console 180 connected to policy store 160 and evidence store 158. Arrows: 120 to 150 carry "redacted frame + plan"; 150 to 170 carry "redacted frame + checklist"; 170 to 150 return "navigation record"; 150 to 120 return "single instruction". No arrow from 120 to 190 (annotate: "no input injection"); an arrow from input device 116 to target application 190 labeled "user performs".

### FIG. 2: Guidance loop 200

Flowchart. 202 receive goal; 204 generate plan with planner-generated visible-when-done conditions; 206 capture frame; 208 redact on device; 210 transmit redacted frame and full checklist; 212 obtain navigation record (completed set, current step, guidance, observation, flag, done); 214 decision "visible-when-done condition of instructed step satisfied in frame?"; yes branch to 216 mark completed, timestamp, store redacted frame as evidence once (if policy permits); no branch to 218 corrective instruction; 220 surface flag; 230 prerequisite re-target (drawn as a branch out of 212: "prerequisite absent?" yes: current step becomes prerequisite-establishing step); 232 equivalent-control substitution (branch: "named control absent, equivalent visible?" yes: instruction targets the equivalent control); 234 discrepancy indication recorded and supplied downstream (arrow to session record and to 204 re-plan); 222 present instruction, observation, flag; 224 user performs action (drawn outside the system boundary with a dashed box); 226 decision "done?"; yes to 228 session report; no returns to 206.

### FIG. 3: Pipeline 300

Block diagram, all within a dashed boundary labeled "user device 110". Inputs: outbound text 302 and outbound frames 304. Text path: detector 306; policy 308; action router 310 with four outputs labeled send, redact, withhold, tokenize; token generator 312 (example tokens "[[EMAIL_1]]", "[[IP_2]]"); write to token map 314 (token map 126, labeled "never transmitted, zeroed on reset"); tokenized text 322. Frame path: optical character recognition 316; per-line pass through detector 306 and policy 308 (draw a shared block); line mask 318 (opaque box over whole line bounding box); redacted frame 320; fail-safe downscaler 338 drawn as an alternative path from 304 with the condition "OCR unavailable" and a label "downscaled to illegible resolution; legibility criterion". Transmission 324 crossing the device boundary to remote model 326. Return path: response 328; streaming buffer 340 (labeled "tail held across chunk boundary"); rehydration 330 reading token map 126; missing-token handler 332 (labeled "leave in place, flag incomplete, never guess"); displayed answer 334. Side block: audit entry 336 (labeled "counts, flags, placeholders; no values").

### FIG. 4: Sequence 400

Sequence diagram with five lifelines: human user 402, target application 404, guidance client 406, guidance server 408, model service 410. Messages in order: 412 goal; 414 clean on device and send; 416 obtain plan; 418 return plan; 420 capture frame; 422 redact on device; 424 send redacted frame and checklist; 426 submit to model; 428 navigation record; 430 gating rule and evidence store; 432 return navigation record; 434 present one instruction; 436 user performs action (arrow from 402 to 404 only, drawn with a heavy line and annotated "only state change of the target application"); 438 display changes; 440 next frame captured; loop marker back to 422.

### FIG. 5: Governance arrangement 500

Block diagram. Tenant administrator 502 operates policy editor 504 to produce policy object 506 whose fields are drawn as sub-blocks: per-category actions 508, block words 510, mode 512, screenshot-evidence setting 514, retention window 516, armed and locked state 518 (with "version, last changed by"). Compile arrow from 506 to instruction-shaping rule set 534 (labeled "forbid rules, require rules, versioned with 506"). Lock-release operation 536 drawn as a gate on the edit path into 506 (labeled "re-authentication of role above tenant admin; audit entry with prior and new version"). Scope resolution 520 feeds distribution 522 to member guidance clients 120 (several small boxes). Server re-application 524 on the inbound path. Evidence store 526 gated by setting 514. Retention sweep 528 performing single-operation purge 540 over a group drawn as {session, evidence frames, audit records}. Transmission audit 530 writing records whose schema 538 is drawn as a closed list: policy version, mode, per-category counts, frame sent, purpose. Administrator retrieval 532 scoped to the tenant.

### FIG. 6: Workflow-template arrangement 600

Two-part block diagram. Upper part, capture: completed session record 602; clean-success predicate 604 (labeled "all steps done from screen; final event not an open flag"); distiller 606 (labeled "deterministic, no model call"); workflow template 608 with sub-blocks goal signature 610, application key 612, environment record 614 (jurisdiction, software list, manual-versus-software indicator, conventions), ordered steps 616 (kind, first on-screen target, visible-when-done), success signal 618; pre-scrub 620 (labeled "commands and code exempt"); policy scrub at persist 622; holder-scoped store 624 with company store 626 and shared de-identified store 628 and a tenant switch drawn across both. Lower part, retrieval: new goal 630; signature computation 632; scorer 634 with three inputs (goal similarity, application similarity, environment compatibility) and a weighted sum; tier gate 636 with three outputs: serving tier 638 (to adaptation pass 644), seeding tier 640 (to planner seeding 646), withhold 642 (to "plan without template"); clarification prefill 648 from environment record 614 to FIG. 7; drift-triggered supersede 650 fed by discrepancy indication 234 of FIG. 2 and writing back into store 624 with "one prior version retained".

### FIG. 7: Clarification flow 700

Flowchart. 702 planning call with goal, scope answers and redacted frame; 704 model generates plan and at most one question with two to five options inferred from the frame; 706 decision "answer determinable from frame?" yes: no question; no: 708 clarification card with options 710, free-text entry 712, skip control 714; 716 store answer in session scope; 726 on skip, store skipped record and stated assumption; 718 regeneration request carrying clarification-origin indicator; 720 server branch: "indicator present?" yes: bypass limit check, no decrement; no: check and decrement per-task regeneration limit; 722 regenerated plan; 724 reopen or change answer (arrow back to 708).

### FIG. 8A: Browser embodiment 800

Block diagram. Web application 802 in a browser; user gesture 804; document picture-in-picture window 806 (drawn floating above the target application, showing "current step, command with copy control, observation, flag"); capture prompt 808 shown after 806 is opened (annotate ordering); fallback chain: pop-out window 810, in-page presentation 812; sizing rule 814 (narrow strip, clamped width). Annotation: "window is within a whole-display share; not excluded from self-capture".

### FIG. 8B: Desktop embodiment

Block diagram. Desktop shell 820 with planning window 822 and guiding overlay 824; attributes drawn as tags on 824: always-on-top 826, click-through with hover re-enable 828, content protection 830; monitor picker 832 (also content-protected); companion card 834. Two arrows from 830: one to capture module 122 labeled "overlay pixels absent from analyzed frames", one to an external "other applications: screen share, recording" box labeled "overlay pixels absent from share".

### FIG. 9: Display gate 900

Flowchart. 902 plan step with command or code; 904 catalog of destructive-operation patterns; 906 matcher; decision "match?"; no: display command; yes: 908 annotate with destructive indicator and reason; 910 render reason-labeled placeholder in place of the command (step text remains visible); 912 explicit acknowledgment control; 914 reveal command; 916 record acknowledgment event. Annotation: "gate controls display, not execution; the client never executes".

### FIG. 10: Project engine arrangement 1000

Block diagram. Top row, left to right: project goal 1002; map planner 1004 (labeled "planning model, once, at workstream level; no step-level instruction"); breakdown gate 1018 (labeled "deterministic; FIG. 11") with a "pass" arrow onward and a "fail" arrow down to a rounded box "return as single task (suggested goal)"; project store 1020 (labeled "map + ledger; task states"). Below the goal: depth resolver 1040 (labeled "standard | deep; pool depth clamped to tenant ceiling") with an arrow into the map planner labeled "deep depth required". Left, below the planner: a frame for project map 1006 (labeled "ordered; dependency-annotated; no step-level instruction") containing a frame for one task descriptor 1008 (labeled "one of N; state pending | active | done | rerun") with sub-blocks task goal 1010, done-state 1012 (labeled "display content visible when the task is complete"), dependencies 1014 (labeled "earlier task identifiers"), and an unnumbered block "state; expanded; session link; outcome; telemetry"; below the task descriptor, project end-state 1016 (labeled "done sentence + checks"). Below the map: mid-project injection 1038 (labeled "dedupe; place; FIG. 12") with an arrow into the map. Right column, top to bottom, fed from the store: next-task selector 1022 (labeled "lowest-order pending; all dependencies done; ready set"); just-in-time expander 1024 (labeled "steps of the selected task only; planning model + ledger"); guided session 1028 (labeled "loop 200 of FIG. 2; one instruction; no input injected; verify from redacted frame"); task completion 1030 (labeled "mark done; record outcome + telemetry"); a decision box project completion check 1034 ("all tasks done and end-state shown satisfied?") whose "no" branch returns to the selector along the right edge and whose "yes" branch leads to a rounded "project done" box. Middle column: critique pass 1042 (labeled "hardened plan accepted only if not a refusal and at least the draft's step count") joined to the expander by a two-headed arrow; forward-learnings ledger 1026 (labeled "project-scoped; deduplicated; bounded") with an arrow into the expander labeled "seeds (verified facts)"; ledger write-back 1032 (labeled "planning learning; confirmed facts") fed from task completion and writing into the ledger; project report generator 1036 (labeled "success | security | issues; no model call") fed from the project-done box with the label "on demand, also mid-project". Footnote on the sheet: each guided session is the loop of FIG. 2; the display remains the oracle at both tiers.

### FIG. 11: Breakdown gate 1100

Flowchart. 1102 proposed breakdown from the map planner (task descriptors + end-state); 1104 real-task test (aim and non-empty done-state, both required); 1106 normalize labels (lowercase, trim, collapse spaces) and collapse duplicates; 1108 decision "at least two distinct real tasks?"; no: 1110 return as single task with suggested goal (not a project); yes: 1112 decision "every dependency resolves?"; 1114 decision "acyclic? (three-color depth-first search; cycle members named)"; 1116 decision "end-state defined?"; every "no" branch, together with a filler-task error from 1104 and a duplicate error from 1106, joins a collector leading to 1118 reject with every error listed (not short-circuited; nothing persisted); the final "yes" leads to 1120 accept and persist as project map (store 1020). Side rule 1122 advisory only: a single task whose expanded plan exceeds a step threshold produces a hint to reconsider, never an automatic split. Footnote: over-splitting is an error, under-splitting is advisory; no machine-learning model is invoked.

### FIG. 12: Mid-project injection flow 1200

Flowchart. 1202 further request arrives mid-project; 1204 token-set similarity (normalized word tokens; Jaccard) against the goal and title of each task descriptor; 1206 decision "best similarity at or above threshold?"; yes: 1208 fold into the existing task, no new descriptor; no: 1210 create new task descriptor; 1212 placement selector (hexagon: "blocker named? dependencies named? neither?") with three outputs: 1214 before the named blocker (inherit the blocker's upstream dependencies; the blocker now depends on the new task), 1216 after the latest named dependency, 1218 at the frontier (after the last task not done; no edge added); 1214 and 1216 feed 1220 cycle probe (decision "would an added edge close a cycle? depth-first search"); yes: 1222 drop the offending edge, append at the frontier with a cycle-avoided notice; no, and the output of 1222 and of 1218, lead to 1224 renumber orders consecutively and persist (inputs never mutated). Footnote: the stored map is replaced only by the committed result; a refused placement leaves the project unchanged.

### FIG. 13: Transient-unreadable-frame tolerance 1300

Flowchart. 1302 frame captured in the watch loop (settled; redacted on device); 1304 navigation record from the first model 172 (completed set, current step, guidance, observation, flag, done); 1306 decision "readable? (instruction or observation present)"; yes: 1308 reset the consecutive count and apply the record (verify, advance or correct, FIG. 2); no: 1310 increment the per-session consecutive count; 1312 decision "count at or above tolerance? (for example two)"; no: 1314 withhold the second model 174 (no re-submission; current step and instruction unchanged; no escalation event; frame still audited); yes: 1316 second model 174 permitted (the next unreadable frame is re-submitted with the plan for that call; escalation event recorded); 1318 manual deep read requested by the user escalates regardless of the count (arrow into 1316 labeled "always"); all paths lead to a rounded "next frame" box whose arrow returns to 1302. Footnotes: a one-off read outside the loop escalates immediately; a model error escalates immediately; an empty-content response is a retriable model failure, not an unreadable frame; alternative embodiment, a sliding window over the most recent frames.

## Draftsperson instructions

1. Black line art on white; no color, grayscale fills or photographs. Dashed lines only for system boundaries, the "user performs" box, data that never leaves the device, and signal paths.
2. Each reference numeral appears once per figure with a lead line to its element; numerals must match the specification exactly.
3. US Letter or A4 sheets with 37 CFR 1.84 margins; figure labels "FIG. 1" to "FIG. 13" (FIG. 8A and FIG. 8B on one sheet if space allows).
4. Text within boxes in a plain sans-serif typeface, legible at 100 percent; avoid text in lead lines.
5. Deliver as PDF for Patent Center upload (document code DRW) and keep editable sources.
