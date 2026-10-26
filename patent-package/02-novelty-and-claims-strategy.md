# 02 — Novelty Analysis and Claims Strategy

**Invention:** WorkCoPilot — read-only, screen-aware guidance system with on-device privacy redaction and tenant-governed data egress
**Applicant:** COE Security LLC
**Status:** DRAFT for review by the applicant and a registered patent practitioner. This is a drafting analysis, not a legal opinion.

---

## 1. The invention in one paragraph (as implemented)

A client application on a user's device captures the live display (or a camera view on mobile) while the user works in **any** third-party application. A planning model turns the user's stated goal into an ordered checklist in which each step carries a machine-readable **"validate" condition** ("what is visible when done"), exact commands/code where relevant, and a destructive-action flag from a deterministic gate. A **watch loop** then sends each changed frame, together with the whole checklist, to a vision-capable model that returns a **structured navigation record** — `completed` (step numbers visibly finished), `current` (the one step to do next), `guidance` (a single screen-specific micro-action naming the real control or giving the exact command), `observation` (what is on screen), `flag` (a specific problem and its fix), `done`. The client only *displays* the guidance; **the human performs every action**. The loop does not advance until the expected result is visible in a later frame; a wrong move produces a flag with the corrective micro-action; a missing prerequisite is inserted proactively; UI drift since planning is handled by guiding to the equivalent visible control. Before any frame or text leaves the device, an **on-device redaction engine** OCRs the frame and masks every text line that the **same policy engine** used for typed text identifies as sensitive; typed text is either redacted or **reversibly tokenized** with stable typed placeholders (`[[EMAIL_1]]`, `[[IP_2]]`…) whose token→value map lives **only in device memory**. The model's answer — including streamed partial output — is **rehydrated locally**; a missing or garbled token is left as a placeholder and flagged, never guessed. A **per-company policy object** (per-category send/redact/withhold/tokenize, block-words, custom patterns, mode, screenshot-evidence retention, retention window, armed/locked) is distributed to devices and enforced there (and re-applied server-side as defense in depth); members cannot weaken it. A no-install browser overlay (Document Picture-in-Picture, falling back to a pop-out) floats over the work; the desktop shell adds click-through, opacity and content-protection (excluded from screen shares and from its own capture). When a step is first verified, the **already-redacted frame** is kept as that step's evidence (nothing additional leaves the device), producing a picture-rich session report plus an append-only audit log of exactly what was transmitted (counts of what was stripped, never the values).

Source grounding (repo): `server/work.js` (plan + navigate prompts and JSON contract), `server/index.js` `/watch` handler (verify/advance/evidence), `src/frame_scrub.js` (on-device OCR line masking, fail-safe downscale), `src/scrub.js` + `server/work-scrub.js` (policy-driven scrub / tokenize / rehydrate), `server/store.js` (policy object, armed/locked, milestone evidence, encryption at rest), `src/pages/WorkPage.jsx` (Document PiP overlay, getDisplayMedia capture, `prepFrame`), `workcopilot/main.js` (Electron overlay: always-on-top, click-through, `setContentProtection`).

---

## 2. Differences from the closest verified prior art

| Prior art (verified, see 01) | What it teaches | What it lacks that the invention has |
|---|---|---|
| USAA US 11,989,786 / US 12,346,977 — AI guided help | Per-step correctness check; mitigation on error; check-mark confirmation. | Inputs are AR/phone camera video+audio and application APIs. No **screen-capture of an arbitrary desktop application** as the verification oracle; no **read-only constraint** (claims recite the system "automatically assists"); no structured `completed/current/guidance/observation/flag` contract; no on-device redaction; no tenant egress policy. |
| Boomersurf US 10,852,898 — System for Interactive Help | Step-gated task-guides targeting GUI objects; next window after the prior action. | **Pre-authored** guides per task, matched to the environment — not a model-generated plan for an **arbitrary user-stated goal**; detection via GUI-object data-gathering (DOM/accessibility), not **vision over a screenshot** that works for any app; no redaction, tokenization, governance, or evidence record. |
| Meta US 11,036,984; Visautact US 10,290,222 | Wait for step completion, re-instruct if not. | **Physical** tasks / pre-built tutorials sensed by camera or motion; not software-UI screenshots; no redaction/tenant policy. |
| Verizon US 2025/0238087 — multimodal UI automation | Screenshot + objective → generative AI predicts next action. | The **system performs the action**. The invention is defined by the opposite: the system *never* injects input; the next **frame** (produced by the human's action) is the verification oracle. This reference is useful as a teaching-away/contrast citation. |
| Apple US 12,406,664 — on-screen context | Uses on-screen context to disambiguate a request. | Acts via device services; no step guidance; no verification loop; no redaction/governance. |
| Capital One US 12,013,965 — obfuscate sensitive info in screenshot | Suspend screenshot, mask known GUI portion, capture, unmask. | Masks **its own application's** known fields. The invention OCRs **any** application's frame and applies the **same DLP rule/policy engine** used for text (incl. tenant block-words and custom patterns); no transmission to a model; no tokenization/rehydration. |
| Capital One US 2024/0111891 — client sanitize + server scrub | On-device sanitization before send; server second pass. | Irreversible; datasets, not screen frames or prompts; no **device-only token map** and no **local rehydration** of an answer; no screen frames. |
| JPMorgan US 2025/0005060; IBM US 2025/0086310 | Mask/strip PII before LLM. | Masking at an **organizational moderator / server**, i.e., after the data leaves the device; **no restoration** of originals in the response; no screenshots. |
| DEV blog posts N6/N7 (dates VERIFY) | Browser-side two-way PII masking for LLM prompts, restore in response. | Text only; no screen-frame OCR redaction with shared policy; no verify-before-advance loop; no tenant policy; no evidence capture tied to verified steps. These are the most relevant NPL to the **text** tokenization element and must be assessed by the practitioner for §102/§103 dating. |
| DAP art (WalkMe family — unverified numbers) | Overlay guidance anchored to recognized UI elements in web apps. | Injected into the web page (requires integration/extension); element locators, not **screen-capture vision over any app**; no model-planned arbitrary goals; no redaction; no evidence record. |

---

## 3. Where the strongest novelty appears to lie (ranked)

1. **The read-only verify-before-advance loop with the next frame as the oracle.** The combination of (a) a model-generated plan whose steps each carry a *visible-when-done* condition, (b) a per-frame structured navigation record (`completed`, `current`, `guidance`, `observation`, `flag`, `done`), (c) an explicit *do-not-advance-unless-visible* rule with corrective micro-action, proactive prerequisite insertion and UI-drift re-targeting, and (d) a client that **cannot** inject input, so that the *human's* action — observed in the subsequent frame — is the only state transition. No verified reference puts these together over screen capture of an arbitrary application.

2. **On-device redaction of screen frames using the same policy engine as text, plus reversible device-only tokenization with local (including streaming) rehydration and a never-guess fallback.** The closest art either masks the app's *own* GUI (Capital One), redacts irreversibly (Capital One '891), or masks at a server/moderator (JPMorgan, IBM). The identical-policy coupling (block-words and custom patterns apply to the **image** as well as the text) and the explicit placeholder-left-and-flagged fallback are distinctive.

3. **Per-tenant policy object enforced on the device within an AI guidance client, including whether redacted step-evidence screenshots are retained at all, with arm/lock semantics (members cannot weaken), re-applied server-side.** DLP art exists in general; its application to a screen-aware guidance client with screenshot-retention control appears new in the verified set (the Netskope references must still be checked).

4. **Evidence tied to verification, with zero additional egress.** Keeping the *already-redacted* frame only at the moment a step becomes verified (idempotent per step, encrypted at rest), and an append-only transmission audit with counts not values. Supports an auditable, picture-rich record without a second capture path.

5. **No-install floating overlay via Document Picture-in-Picture with pop-out fallback; desktop content-protection so the overlay is excluded from its own capture and from screen shares.** Likely narrower (platform APIs are known), so it is pursued in dependent claims only.

**Weakest / riskiest aspects:** generic "AI tells you the next step from a screenshot" (likely obvious over USAA + Verizon-style art unless tied to the read-only + frame-oracle structure), and pure text pseudonymization (well documented in NPL). Claims therefore anchor on the *combination* and the *structural* features above, not on the bare idea.

---

## 4. Claim strategy

### 4.1 Architecture of the claim set (20 claims; 3 independent — avoids excess-claim fees)

- **Claim 1 (method, independent)** — the core loop with read-only constraint, visible-when-done conditions, structured navigation record, on-device redaction of the frame *before* transmission, and gated advancement. Broadest reasonable scope that still clears the verified art.
- **Claims 2–9 (dependent on 1)** — tokenization/rehydration, same-policy image+text redaction (OCR line masking), fail-safe downscale, corrective/flag behavior, proactive prerequisite, UI drift, model escalation, evidence capture on verification.
- **Claim 10 (system, independent)** — client device + guidance server, emphasizing the policy-governed on-device redaction/tokenization engine with device-only map and local rehydration, in the context of the read-only loop.
- **Claims 11–15 (dependent on 10)** — stable per-session tokens, typed placeholders, streaming rehydration, never-guess fallback, deterministic destructive-command gate.
- **Claim 16 (CRM, independent)** — tenant-governed egress: policy object with categories, block-words, mode, screenshot-evidence retention, lock; enforced on-device; server re-application; audit with counts not values; within the read-only guidance loop.
- **Claims 17–20 (dependent on 16)** — lock/unlock requiring elevated re-authentication and audit entry; member cannot weaken; retention sweep deleting evidence+audit together; no-install overlay excluded from its own capture.

### 4.2 Drafting principles applied

- **Antecedent basis:** every "the" refers back to an element introduced with "a/an" in the same or a parent claim.
- **Claim differentiation:** each dependent claim adds a feature not required by its parent; no dependent claim merely restates the parent.
- **Read-only constraint is positive and structural:** recited as the client "being configured to present the instruction without injecting any input event into the target application" and advancement being "conditioned on" a subsequently captured frame — i.e., a limitation on what the system does, not a mere statement of intended use.
- **§101 posture:** the claims recite concrete technical operations on captured frames (OCR, pixel masking, canvas re-encoding), a specific data structure exchanged with a model, gating logic, network transmission ordering, and memory-only key-value mapping — improvements to how a computer system protects data and verifies UI state, not an abstract idea of "helping a user." The specification's Detailed Description is written to support this with enabling detail.
- **§112 support:** every claim element maps to a numbered element in the specification and drawings (FIG. 1–5). Nothing is claimed that the spec does not describe.
- **Avoid "means for":** no means-plus-function language, to avoid §112(f) narrowing.
- **Terminology:** "target application" (the arbitrary third-party application being used), "guidance client", "guidance server", "machine-learning model having image-understanding capability" (vision model), "navigation record", "visible-when-done condition", "redacted frame", "token map", "egress policy".

### 4.3 Possible continuation / divisional topics (NOT filed now — flagged for the practitioner)

- Camera-based mobile variant (photo of a physical screen) as the frame source.
- On-device spreadsheet "compute" where only `{what, schema, rowCount}` leaves the device.
- Company-knowledge ("brain") retrieval with policy-version-bound chunk hashes.
- Honesty contract for returned results (confidence meter / "verify by").

These are described briefly in the specification so that they are supported if later claimed, but kept out of the present claims to maintain unity and focus.

---

## 5. Risks and open items for the practitioner

1. **Verify §3 references in 01** (notably US 2026/0289154 A1 "filters frames locally before transmission" and US 12,725,397 digital guidance; Netskope screenshot-DLP family).
2. **Public disclosure / on-sale dates:** WorkCoPilot is live at admireveda.com and documented in dated public docs (e.g., Security & Privacy paper "Rev 1.4 October 2026"; marketing pages). The applicant must confirm the **earliest public disclosure, offer for sale, or public use** date of each claimed feature. The U.S. one-year grace period (35 U.S.C. 102(b)(1)) applies only to the inventor's own disclosures and there is **no** grace period in most foreign jurisdictions. **[APPLICANT TO COMPLETE: earliest public disclosure date per feature]**
3. **Inventorship:** determine the actual inventor(s) of each claim; inventorship is determined by conception of the claimed subject matter. Named inventors must sign the declaration (AIA/01) or a substitute statement must be filed.
4. **Ownership chain:** inventor(s) → COE Security LLC assignment must exist (or be executed) for COE Security LLC to be the 37 CFR 1.46 applicant; record it at the USPTO Assignment Center.
5. **Micro-entity eligibility** depends on the gross income of **each** inventor **and** of the applicant LLC and any licensee; see 06.
