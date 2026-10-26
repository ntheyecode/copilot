# 01 — Prior-Art Search Report (good-faith, NON-exhaustive)

**Invention:** WorkCoPilot — read-only, screen-aware guidance with on-device redaction/tokenization and tenant-governed data egress
**Applicant:** COE Security LLC
**Search performed:** 2026-10-25, by an AI drafting assistant using web search and direct retrieval of patent records from Google Patents, USPTO Patent Public Search / PPUBS document links, and Justia.
**Status:** DRAFT — for review by the applicant and a registered patent practitioner.

---

## 0. Scope statement (read this first)

This is a **good-faith, keyword-driven, NON-exhaustive** search. It was performed in a single session with general-purpose web search plus direct retrieval of individual patent records. It did **not** include:

- A classification-based (CPC) search across G06F 9/451, G06F 3/048x, G06F 21/62, G06F 40/xx, G06N, H04L 63/xx.
- A full-text search in USPTO PPUBS with Boolean operators.
- Non-U.S. office databases (EPO Espacenet, WIPO PATENTSCOPE, JPO, CNIPA), except incidental WO hits.
- Non-patent literature beyond a handful of arXiv papers and product pages that surfaced incidentally.
- Any review of file histories or prosecution claims amendments.

**Recommendation:** commission a professional patentability search (classification + full-text + NPL) **before filing** or, at minimum, before paying the examination fee. Nothing in this report is a legal opinion of patentability or freedom to operate.

**Integrity rule applied:** every row in the "verified" table below was retrieved directly from the patent record (Google Patents page or Justia/PPUBS record). Where a record could not be opened, the reference is listed separately under "mentioned but NOT verified" with what still needs checking.

---

## 1. Search strategy

### 1.1 Candidate-novel aspects searched

| # | Aspect | Core search concepts |
|---|---|---|
| A1 | Read-only, screen-aware copilot that tells the user the exact next step in any application without acting | "screen-aware assistant", "analyzes screen", "step-by-step instructions", "without performing actions", "RPA" vs "guidance" |
| A2 | Observe → Instruct → Verify → Correct → Advance loop grounded in live screen state | "verify step completed", "screenshot", "before presenting next instruction", "deviation", "correction", "tutorial", "guided help" |
| A3 | On-device redaction / tokenization of screenshots and text before transmission; local reconstruction of the answer | "redact screenshot before transmitting", "tokenize sensitive data prompt", "pseudonymization LLM", "re-identify response", "client-side mapping" |
| A4 | Per-company data-egress policy incl. screenshot-capture retention, enforced on-device | "per-tenant DLP policy", "screen capture", "cloud AI assistant", "administrator disable screenshot", "client-enforced" |
| A5 | No-install in-browser floating overlay; desktop/mobile variants; picture-rich auditable session record | "browser overlay", "digital adoption platform", "walkthrough", "verify step completion", "Document Picture-in-Picture" |

### 1.2 Databases / sources used

- **Google Patents** (patents.google.com) — primary; individual records opened and bibliographic data + claim 1 extracted.
- **USPTO PPUBS** document links (image-ppubs.uspto.gov) — surfaced via web search; several opened via Google Patents equivalents.
- **Justia Patents** (patents.justia.com) — used as a fallback when Google Patents returned 404 for a number.
- **Web search (general)** — 12 distinct queries (listed below), including `site:patents.google.com` constrained queries.
- **arXiv** — incidental non-patent literature hits.

### 1.3 Queries run (verbatim or near-verbatim)

1. `patent screen-aware AI assistant analyzes user screen content provides step-by-step instructions without performing actions`
2. `patent on-device redaction of sensitive information in screenshot before transmitting to remote machine learning model tokenization reconstruct response locally`
3. `patent interactive guidance system verify user completed step by analyzing screenshot before presenting next instruction detect deviation correction`
4. `patent per-tenant data loss prevention policy controls transmission of screen captures to cloud AI assistant administrator disable screenshot capture enforced on client`
5. `patent browser overlay digital adoption platform in-app step-by-step walkthrough WalkMe Whatfix detect UI element verify step completion`
6. `patent large language model prompt pseudonymization placeholder tokens client-side mapping de-identify re-identify response`
7. `patent "screen sharing" assistant multimodal model "next step" guidance user performs action Microsoft Copilot Vision OR Google "Project Astra" patent application`
8. `WalkMe patent "DeepUI" OR "digital adoption" patent number element recognition guidance overlay`
9. `patent tokenizing sensitive data in prompt to large language model detokeniz OR re-identif response client device mapping never transmitted`
10. `site:patents.google.com screenshot "language model" guidance "next step" user instruction verify completed step tutorial assistant`
11. `site:patents.google.com redact OR mask sensitive information screenshot before sending to "language model" OR "machine learning model" client device privacy`
12. `Microsoft patent application 2026 reads your screen answers questions ... passive intent detection` (to verify a third-party summary; **not confirmed** — see §3)

---

## 2. VERIFIED results (record opened and bibliographic data read)

Relevance key: **A1–A5** = aspect(s) above. "Gap" = what the reference does **not** disclose relative to the invention, as read from the retrieved text (claim 1 / abstract / description excerpts). Claim text was often truncated by the retrieval tool; where only a paraphrase was available this is noted.

| # | Number | Title | Assignee / Applicant | Dates | URL | Relevance (one line) |
|---|---|---|---|---|---|---|
| 1 | US 10,852,898 B2 (pub. US 2017/0277312 A1) | System for Interactive Help | Boomersurf LLC | Priority 2012-11-20; filed 2017-02-08; pub. 2017-09-28; granted 2020-12-01 | https://patents.google.com/patent/US20170277312A1/en | **A2/A5.** Authored "task-guides" step the user through GUI objects; next window shown after the prior action is performed. Gap: pre-authored guides per task (not an arbitrary goal planned by a model); detection via GUI-object data-gathering, not screenshot/vision verification; no redaction, no tenant policy. |
| 2 | US 11,989,786 B1 | System and method to enable augmented intelligence guided help | United Services Automobile Association (USAA) | Filed 2021-06-24; granted 2024-05-21 | https://patents.google.com/patent/US11989786B1/en | **A2.** Description discloses per-step check of correct completion with mitigation/corrective action and a check-mark confirmation. Gap: inputs are real-time camera video/audio (AR glasses/phone) and app APIs; no screenshot-of-desktop grounding, no read-only constraint language, no on-device redaction. |
| 3 | US 12,346,977 B1 | System and method to enable augmented intelligence guided help | USAA (divisional of #2) | Filed 2024-02-23; granted 2025-07-01 | https://patents.google.com/patent/US12346977B1/en | **A2.** Claim 1 (paraphrase): AR device, skill-level estimation from speech/body language, assistance class, then "automatically assists" the user. Gap: as #2; also "automatically assists" is the opposite of the read-only constraint. |
| 4 | US 11,036,984 B1 | Interactive instructions | Facebook, Inc. (now Meta Platforms, Inc.) | Priority 2018-06-08; filed 2018-10-05; granted 2021-06-15 | https://patents.google.com/patent/US11036984B1/en | **A2.** Monitors whether a step is finished and generates additional instructions if not. Gap: physical tasks (furniture assembly, cooking) observed by camera; not software UI/screenshots. |
| 5 | US 10,290,222 B2 | Interactive tutorial with integrated escalating prompts | Visautact LLC (current assignee listed as Vizq Technologies Inc — Google Patents flags as possibly inaccurate) | Priority 2015-09-21; filed 2016-06-29; granted 2019-05-14 | https://patents.google.com/patent/US10290222B2/en | **A2.** Tutorial adapts to sensed learner actions; waits for a micro-step to be completed; visual check mark. Gap: pre-built tutorial images; sensing via camera/motion/touch input rather than reading arbitrary screen content; no model-planned steps; no redaction/governance. |
| 6 | US 2025/0238087 A1 | Systems and methods of multimodal user interface automation | Verizon Patent and Licensing Inc. | Filed 2024-01-23; pub. 2025-07-24 | https://patents.google.com/patent/US20250238087A1/en | **A1 (contrast).** Loop: capture UI image + text → generative AI predicts next action → **system performs the action programmatically** "without a physical user's manual interaction." Directly illustrates the agentic/RPA class the invention is distinguished from. |
| 7 | US 12,406,664 B2 | Multimodal assistant understanding using on-screen and device context | Apple Inc. | Filed 2022-01-31; granted 2025-09-02 | https://patents.google.com/patent/US12406664B2/en | **A1.** Uses on-screen/device context to resolve ambiguous utterances; assistant performs tasks via device services. Gap: no step-by-step guidance of a human; acts on device; no redaction/tenant governance. |
| 8 | US 2024/0412720 A1 | Real-time contextually aware artificial intelligence (AI) assistant system and a method for providing a contextualized response to a user using AI | Sergiy Vasylyev (individual) | Filed 2024-06-10; pub. 2024-12-12 | https://patents.google.com/patent/US20240412720A1/en | **A1 (contrast).** Agentic assistant that autonomously performs tasks (books rides/hotels, enters payment details). Camera-based visual input. Gap: not screen-grounded guidance; acts for the user. |
| 9 | US 12,013,965 B2 (pub. US 2023/0087884 A1) | Controlling a screenshot function to obfuscate sensitive information in a screenshot | Capital One Services, LLC | Filed 2021-09-22; pub. 2023-03-23; granted 2024-06-18 | https://patents.google.com/patent/US20230087884A1/en | **A3.** Suspends a device screenshot, masks the GUI portion with sensitive info, allows capture, unmasks. Gap: masking is of the *app's own* known fields in its own GUI; not OCR of an arbitrary third-party app's frame; no transmission to a remote model; no reversible tokenization/rehydration. |
| 10 | US 10,347,293 B1 | Detecting, redacting, and scoring confidential information in video | Droplr Inc. (current assignee listed as Covideo LLC — flagged possibly inaccurate) | Filed 2018-07-31; granted 2019-07-09 | https://patents.google.com/patent/US10347293B1/en | **A3.** Redaction of confidential info in screen-share video; some processing may run client-side. Gap: screen recording/sharing use case, not a guidance loop; no tokenization/reconstruction of a model answer; no tenant policy. |
| 11 | US 2024/0111891 A1 | Systems and methods for sanitizing sensitive data and preventing data leakage using on-demand artificial intelligence models | Capital One Services, LLC | Filed 2022-09-30; pub. 2024-04-04 | https://patents.google.com/patent/US20240111891A1/en | **A3.** Local app on a mobile device classifies and sanitizes sensitive data **before** sending to a remote server that performs second-phase scrubbing (defense in depth). Gap: stored datasets, not screenshots or LLM prompts; irreversible sanitization — no device-only token map and no local rehydration. |
| 12 | US 2025/0005060 A1 (granted as US 12,675,514 B2 per record) | Systems and methods for runtime input and output content moderation for large language models | JPMorgan Chase Bank, N.A. | Priority 2023-06-28; filed 2024-06-27; pub. 2025-01-02 | https://patents.google.com/patent/US20250005060A1/en | **A3.** A moderator program intercepts LLM queries, may mask sensitive info with surrogates before submission. Gap: masking occurs at an organizational moderator (inside the firewall), **not on the user device**; no described restoration of originals in the response; no screenshots. |
| 13 | US 2025/0086310 A1 (granted as US 12,455,980 B2 per record) | Large language model privacy preservation system | International Business Machines Corp. | Filed 2023-09-13; pub. 2025-03-13 | https://patents.google.com/patent/US20250086310A1/en | **A3.** Server-side pre-processing removes PII and normalizes prompts; literal prompt discarded. Gap: removal happens on the server after transmission; no reconstruction; no screenshots. |
| 14 | WO 2026/020009 A1 | Methods and systems for intelligent conversational assistant | Suvoda LLC | Priority 2024-07-17; filed 2025-07-17; pub. 2026-01-22 | https://patents.google.com/patent/WO2026020009A1/en | **A2 (weak).** LLM maps input to predefined questions; deterministic scripts; a validation call checks script was followed. Gap: no screen capture, no human-step verification from screen, clinical-trial data retrieval domain. |
| 15 | US 2026/0161654 A1 | Personalizing Edge Device Queries When Full Context is Unavailable | Google LLC | Filed 2024-12-05; pub. 2026-06-11 | https://patents.google.com/patent/US20260161654A1/en | **Checked and EXCLUDED.** A third-party tracker described this as "filtering sensitive objects out of images before an AI model"; the actual record concerns weighting/locally storing text context elements for on-device query processing. Not screenshot redaction. Listed so the applicant does not re-chase it. |

### 2.1 Non-patent literature and products (verified pages opened or surfaced with URL)

| # | Item | Source | Relevance |
|---|---|---|---|
| N1 | "Screen Copilot — AI Screen Assistant for Real-Time Help & Learning" (product page) | https://www.screencopilot.app/ | **A1.** A commercial product described as analyzing on-screen content and providing step-by-step guidance. **VERIFY**: launch date, exact capabilities, whether it verifies step completion from the screen, whether it redacts on device. Potentially relevant as public-use/§102 art if it predates the effective filing date. |
| N2 | WalkMe "DeepUI" technology page | https://www.walkme.com/technology/ | **A5.** Marketing page says element-recognition is "patented"; no number given. See §3 for the unverified candidate. DAPs overlay guidance on web apps via injected scripts; they do not read arbitrary desktop apps via screenshots and do not redact. |
| N3 | Prεεmpt: Sanitizing Sensitive Prompts for LLMs (arXiv 2504.05147) | https://arxiv.org/abs/2504.05147 | **A3.** Prompt sanitization via format-preserving encryption / differential privacy; not screen frames; academic. |
| N4 | SurrogateShield: Beyond Redaction for High-Utility, Privacy-Preserving LLM Interactions (arXiv 2606.29567) | https://arxiv.org/pdf/2606.29567 | **A3.** Surrogate substitution for LLM prompts. **VERIFY** whether it describes client-side mapping with local restoration of responses; obtain the PDF. |
| N5 | ExplorAR: Assisting Older Adults to Learn Smartphone Apps through AR-powered Trial-and-Error with Interactive Guidance (arXiv 2508.01282) | https://arxiv.org/pdf/2508.01282 | **A2.** Highlights next UI element on a screenshot; error-correction instructions. Academic; reportedly no step-verification gate. |
| N6 | "How to Build a Zero-Knowledge AI Prompt Anonymizer in Pure JavaScript (Two-Way PII Masking)" — DEV Community blog | https://dev.to/bhutto_sahab_95fe7b5d5581/how-to-build-a-zero-knowledge-ai-prompt-anonymizer-in-pure-javascript-two-way-pii-masking-1nl8 | **A3.** Describes browser-side two-way masking (replace, send, restore). **Date VERIFY.** This is the closest NPL to the text tokenize/rehydrate element; it does not address screenshots, step verification, or tenant policy. |
| N7 | "How I Built a PII Tokenization Middleware to Keep Sensitive Data Out of LLM APIs" — DEV Community blog | https://dev.to/yemrealtanay/how-i-built-a-pii-tokenization-middleware-to-keep-sensitive-data-out-of-llm-apis-18po | **A3.** Local vault + restore in response. **Date VERIFY.** Same gap as N6. |
| N8 | Microsoft Presidio (open-source PII detection/anonymization) | (referenced in several search results) | **A3.** Well-known PII detection/anonymization toolkit; operator-side; supports reversible anonymization via its own mapping. Background art for the detector element only. |

---

## 3. Mentioned in search summaries but **NOT verified** (record could not be opened — VERIFY before relying on or citing)

| Number (as reported) | Reported title / assignee | Why it matters | What to check |
|---|---|---|---|
| US 10,949,961 B2 | "Detecting screenshot images for protecting against loss of sensitive screenshot-borne data" — reportedly Netskope, Inc., issued 2021-03-16 (Justia search snippet) | A3/A4 — DLP on screenshot-borne data | Google Patents and Justia returned 404/403 to the tool. Open record; confirm assignee, claims (detection vs. on-device redaction before model call). |
| US 12,067,493 | "Training and configuration of DL stack to detect attempted exfiltration of sensitive screenshot-borne data" (PPUBS link surfaced; assignee not read) | A3/A4 | Open PPUBS record; confirm assignee (likely same family as above). |
| US 11,019,106 | Netskope — "controlled environment" with policy controls on client devices and remote environments (per search summary only) | A4 — client-enforced policy | Confirm number, title, claims; check whether policy covers screen capture. |
| US 12,725,397 | "System and method for providing digital guidance corresponding to software applications" — detects UI elements to guide end users; continuation of 18/791,482; assignee **not read** (possibly WalkMe) | A5 | Record returned 404/403 to the tool. Open via PPUBS: https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/12725397 ; confirm assignee and whether it verifies step completion. |
| US 10,025,941 B1 | "Data element tokenization management" (Google Patents hit; assignee/date not read) | A3 — reversible tokenization under access control | Open record; general tokenization art, likely not LLM-specific. |
| US 11,646,885 | "Safe token storage" — client sends token; separate token server holds mapping (PPUBS hit; assignee/date not read) | A3 — contrast: mapping held on a *server*, not device-only | Open record for bibliographic data. |
| US 2026/0300874 A1 | Reported by a third-party tracker as a Microsoft filing that "reads your screen and answers questions you didn't ask" | A1 | Google Patents returned 404 for this number — **the number may be wrong**. Search by title/assignee (Microsoft Technology Licensing, 2026 publications, "screen context"/"proactive assistant"). |
| US 2026/0278505 A1 | Reported by a third-party tracker as a Google filing on AI agents executing app tasks via built-in automation scripts | A1 (contrast) | Not opened. Verify number and content. |
| US 2026/0289154 A1 | Reported by a third-party tracker as Microsoft "Live Camera Streaming to a Conversational Bot — filters frames locally before transmission" | A3 — local frame filtering before transmission | **Potentially important.** Not opened. Verify number, claims, and whether "filtering" means privacy redaction of frame content. |
| US 10,324,828 B2 | "Generating annotated screenshots based on automated tests" (Google Patents hit) | A2/A5 (weak) — screenshots tied to numbered test steps | Automated testing domain; verify assignee/date if cited. |
| US 7,890,336 B2 | "Interactive task-sensitive assistant" (Google Patents hit; reportedly Google; voice/recipes) | A2 (weak) | Older step-through assistant; verify if cited. |
| US 10,108,440 B2 | "Interactive troubleshooting flowcharts" | A2 (weak) | Verify if cited. |
| US 10,498,748 / GB 2514697 B | Skyhigh Networks — cloud DLP architectures | A4 (background) | Verify if cited. |

---

## 4. Summary of what the search did and did not find

**Found (closest art, by aspect):**

- **A2 (verify-before-advance loop):** USAA US 11,989,786 / US 12,346,977 (per-step correctness check with mitigation, but camera/AR/API inputs, and "automatically assists"); Boomersurf US 10,852,898 (gated step windows from GUI-object detection, pre-authored); Meta US 11,036,984 and Visautact US 10,290,222 (physical/sensed tasks).
- **A1 (read-only vs. agentic):** Verizon US 2025/0238087 and Vasylyev US 2024/0412720 are clear examples of the *acting* class; Apple US 12,406,664 uses on-screen context but acts via device services. **No verified reference was found that claims a screen-grounded assistant which is constrained to instruct-only and verifies the human's action from the next frame.**
- **A3 (on-device redaction + reversible tokenization + local rehydration):** Capital One US 12,013,965 (mask own-GUI fields in a screenshot), Capital One US 2024/0111891 (client-side sanitize then server re-scrub, irreversible), JPMorgan US 2025/0005060 (moderator-side masking, no restore), IBM US 2025/0086310 (server-side). Blog posts N6/N7 describe browser-side two-way text masking for LLM prompts. **No verified reference combined (i) OCR-based redaction of arbitrary-application screen frames on the device using the same policy engine as typed text with (ii) reversible, device-only token mapping and (iii) local rehydration of a streamed model response with a never-guess fallback.**
- **A4 (tenant-governed egress incl. screenshot retention):** general cloud/endpoint DLP art exists (Netskope, Skyhigh — several unverified). **No verified reference was found that ties a per-tenant policy object (categories/block-words/mode/screenshot-retention/lock) to on-device enforcement in an AI guidance client.**
- **A5 (no-install overlay + evidence record):** DAP art (WalkMe family, unverified) overlays guidance on web apps via injected scripts and element locators; none found that floats a browser-native always-on-top window over *any* application while reading the display via screen capture and recording evidence only when a step is verified.

**Not found / not searched:** CPC-class sweeps, EPO/WIPO full text, Chinese/Japanese/Korean filings, and the full text of the unverified candidates in §3 (notably US 2026/0289154 A1 and US 12,725,397). A practitioner search is required.

---

## 5. Duty of disclosure note

Under 37 CFR 1.56 the applicant and practitioner have a duty to disclose information material to patentability known to them. The verified references in §2 (and any §3 reference once verified) should be considered for an **Information Disclosure Statement (IDS)** (form PTO/SB/08a/08b or the Patent Center IDS web form) filed with or shortly after the application. Non-patent literature (N1–N8) should be included where it is material, with dates verified.
