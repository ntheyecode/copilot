# WorkCoPilot — U.S. Utility Patent Application Package (DRAFT)

**Applicant:** COE Security LLC (applicant-assignee) — **micro entity, gross-income basis**
**Prepared:** 2026-10-25
**Prepared by:** an AI drafting assistant working from the WorkCoPilot repository (`docs/`, `server/`, `src/`, `workcopilot/`) and live web research

---

## >>> DRAFT — REVIEW NOTICE (read before doing anything else) <<<

1. **This is a DRAFT.** It was prepared for review by **the applicant and a registered patent practitioner** before filing. It is not legal advice and no attorney–client relationship exists.
2. **Nothing in this package has been signed, dated, or certified.** Every field that requires a human fact (inventor names, addresses, income attestation, signatures) is marked **[APPLICANT TO COMPLETE]** / **[APPLICANT TO CONFIRM & SIGN]**. Nothing was guessed.
3. **The prior-art search is good-faith and NON-exhaustive** (keyword search + direct record retrieval; no CPC sweep; no foreign full-text). A professional patentability search is recommended before paying the examination fee. See `01-prior-art-search.md` §0 and §3 for what was and was not checked.
4. **Fees and the micro-entity income limit were read from uspto.gov on 2026-10-25** and are quoted with their sources; they are marked **verify at filing** because the USPTO changes them.
5. **Public-disclosure timing is the applicant's responsibility.** WorkCoPilot is publicly live (admireveda.com) with dated public documents. The applicant must establish the earliest public disclosure / offer-for-sale date of each claimed feature; the U.S. grace period is one year from the inventor's own disclosure (35 U.S.C. 102(b)(1)) and most foreign jurisdictions have none.
6. **Integrity rules applied throughout:** no fabricated patent numbers, assignees, claims, statutes, form numbers, or fees. Where a thing could not be verified it is written as **VERIFY** with what to check.

---

## 1. Package contents

| File | What it is |
|---|---|
| `00-README-and-filing-checklist.md` | This file: contents, notices, Patent Center filing checklist, fee summary. |
| `01-prior-art-search.md` | Search strategy, queries, 15 verified references + verified NPL, and a separate list of references that were mentioned but could **not** be verified (must be checked). |
| `02-novelty-and-claims-strategy.md` | How the invention differs from each close reference; ranked novelty; claim architecture; continuation topics; open risks. |
| `03-specification.md` | Full specification in USPTO order (Title; Cross-Reference; Field; Background; Summary; Brief Description of the Drawings; Detailed Description with reference numerals matching the drawings; Abstract ≤150 words). |
| `04-claims.md` | 20 claims: 3 independent (method / system / CRM) + 17 dependent, with a claim-support map and antecedent-basis self-check. |
| `drawings/FIG1-system-architecture.svg` | FIG. 1 — system 100 block diagram (numerals 110–190). |
| `drawings/FIG2-guidance-loop-flowchart.svg` | FIG. 2 — observe→instruct→verify→correct→advance loop 200 (202–228). |
| `drawings/FIG3-on-device-redaction-pipeline.svg` | FIG. 3 — on-device redaction/tokenization + local reconstruction pipeline 300 (302–336). |
| `drawings/FIG4-guided-step-sequence.svg` | FIG. 4 — sequence diagram 400 of one guided step (402–440). |
| `drawings/FIG5-tenant-egress-governance.svg` | FIG. 5 — tenant-governed egress / screenshot-retention governance 500 (502–532). |
| `05-application-data-sheet-ADS.md` | Draft content for form PTO/AIA/14 (ADS). |
| `06-micro-entity-certification.md` | Draft notes for form PTO/SB/15A (micro entity, gross income basis): the four requirements, the current income limit, who signs. |
| `07-oath-declaration-notes.md` | Inventor declaration (PTO/AIA/01), assignment to COE Security LLC, inventorship determination, power of attorney — checklist. |

All drawings are **black-and-white line art SVG** (no color, no grayscale fills, no photos), each with its figure label and numbered reference numerals matching the specification. They were rendered at 816×1056 px (US Letter) in headless Chrome and checked both visually and with a geometric audit (every text's measured bounding box must sit inside its box with ≥3 px padding, no two labels may overlap, and no line segment may cross a label); convert to **PDF** for upload (see §3).

---

## 2. Micro-entity note (summary — full detail in `06`)

COE Security LLC intends to file as a **micro entity on the gross-income basis** (37 CFR 1.29(a)). All four conditions must hold for **the LLC as applicant/assignee and for every inventor**: (1) small-entity qualification; (2) no inventor/applicant named on more than four prior nonprovisional U.S. applications; (3) nobody's prior-calendar-year gross income exceeded the maximum qualifying gross income; (4) no license/obligation to an entity over the limit. The current limit on the USPTO page is **$262,380 (from 2026-09-15; read 2026-10-25)** — https://www.uspto.gov/PatentMicroentity. **If the LLC's own 2025 gross income exceeds the limit, micro status is unavailable; file as small entity.** [APPLICANT TO CONFIRM]

---

## 3. Patent Center filing checklist (step by step)

### Before you open Patent Center
- [ ] **Practitioner review complete** of `03`, `04`, drawings, and `01`/`02` (claim scope, §101/§112, inventorship, disclosure dates).
- [ ] **Inventorship fixed** claim-by-claim (see `07` §3); inventor names/addresses collected.
- [ ] **Assignment(s)** inventor → COE Security LLC executed (see `07` §2).
- [ ] **Declaration(s)** PTO/AIA/01 signed by each inventor **after** reading the final spec + claims.
- [ ] **SB/15A** micro-entity certification signed (see `06`) — or decide to file as small entity.
- [ ] **Power of attorney** to a registered practitioner signed by an LLC officer (juristic-entity applicant — see `05` §8 note; VERIFY 37 CFR 1.31/1.33(b)).
- [ ] **USPTO.gov account** with identity verification (ID.me or paper) for whoever files; Patent Center sponsorship if a paralegal files for a practitioner.
- [ ] Decide: request non-publication? (foreign-filing consequences — see `05` §5).

### Prepare the documents
- [ ] **Specification + Claims + Abstract → one DOCX** (or separate DOCX files), using the headings in `03` and the claims from `04`. Patent Center reads DOCX section headings to auto-classify. **Filing these in DOCX avoids the non-DOCX surcharge** (37 CFR 1.16(u): $430 / $172 small / **$86 micro** as read 2026-10-25). Optional: also upload an auxiliary PDF of the same content (no fee, "extended until further notice").
  - Abstract on its own page, ≤150 words (current abstract: 149 words).
  - Claims begin on a new page with "What is claimed is:".
  - Do not put the title in a header/footer; keep it as the first line.
- [ ] **Drawings → PDF** (one multi-page PDF or one per figure). Drawings may be filed as PDF without surcharge (USPTO DOCX FAQ). Convert each SVG at Letter size (8.5×11 in), black lines on white, margins per 37 CFR 1.84 (top ≥ 2.5 cm, left ≥ 2.5 cm, right ≥ 1.5 cm, bottom ≥ 1.0 cm — the SVGs were laid out with ≥ 60 px ≈ 1.6 cm margins; **check** and add margin if your converter crops). Tools: a browser "print to PDF" of the SVG, Inkscape, or `rsvg-convert`. Verify text is still legible at 100%.
- [ ] **ADS**: use the **web ADS** in Patent Center (preferred) from `05`, or the fillable PTO/AIA/14 PDF (do not flatten).
- [ ] **Declaration(s)** PTO/AIA/01 (PDF).
- [ ] **SB/15A** (PDF).
- [ ] **Power of attorney** + 37 CFR 3.73(c) statement (PDF) if applicable.
- [ ] **IDS** (optional at filing; no fee if filed within 3 months of filing — VERIFY 37 CFR 1.97(b); otherwise $56 micro, code 3806, as read 2026-10-25): list the verified references from `01` §2 using the Patent Center IDS web form or PTO/SB/08.

### In Patent Center
1. [ ] Sign in → **New submission → Utility — Nonprovisional (35 U.S.C. 111(a))**.
2. [ ] Enter the **web ADS** (title exactly as in the spec; applicant = COE Security LLC, "Assignee"; inventors; correspondence; entity status = small, and attach SB/15A for micro).
3. [ ] Upload DOCX spec/claims/abstract; review the automatic validation report and fix any flagged formatting.
4. [ ] Upload drawings PDF (document code **DRW**), declarations (**OATH**), SB/15A (**MES** / "Certification of Micro Entity Status" — Patent Center will suggest the code), power of attorney (**POA**), assignment (record separately in Assignment Center, not as an application document).
5. [ ] **Fees**: select **micro entity**; confirm the calculator shows basic filing + search + examination = **$400** (see §4). No excess-claim fees should appear (20 claims, 3 independent).
6. [ ] Review the complete submission package; **submit**; pay by card/deposit account/EFT.
7. [ ] Save the **Electronic Acknowledgement Receipt** (application number + confirmation number) and, when issued, the **Filing Receipt**; check it for errors (inventor names, title, entity status) and request correction promptly if needed.
8. [ ] **Record the assignment** in the USPTO Assignment Center against the new application number.
9. [ ] Calendar: **12 months** from filing for any foreign/PCT filing claiming priority; **3 months** for a no-fee IDS; watch for a Notice to File Missing Parts.

---

## 4. Fee summary (micro entity, utility, filed in Patent Center) — VERIFY AT FILING

Source: USPTO Fee Schedule, https://www.uspto.gov/learning-and-resources/fees-and-payment/uspto-fee-schedule — page states **"Effective January 19, 2025 (Last revised August 14, 2026)"**; read **2026-10-25**.

| Fee | 37 CFR | Fee code (micro) | Undiscounted | Small entity | **Micro entity** |
|---|---|---|---|---|---|
| Basic filing fee — utility | 1.16(a) | 3011 | $350 | $140 ($70 electronic, code 4011) | **$70** |
| Search fee — utility | 1.16(k) | 3111 | $770 | $308 | **$154** |
| Examination fee — utility | 1.16(o) | 3311 | $880 | $352 | **$176** |
| **Total due at filing** | | | $2,000 | $730 (electronic) | **$400** |

Contingent fees to avoid (all as read 2026-10-25):

| Contingency | Fee code (micro) | Undiscounted / Small / Micro |
|---|---|---|
| Non-DOCX specification/claims/abstract surcharge (37 CFR 1.16(u)) | 3054 | $430 / $172 / **$86** — avoided by filing DOCX |
| Each claim in excess of 20 (37 CFR 1.16(i)) | 3202 | $200 / $80 / **$40** — n/a at 20 claims |
| Each independent claim in excess of 3 (37 CFR 1.16(h)) | 3201 | $600 / $240 / **$120** — n/a at 3 independent |
| Late inventor's oath/declaration surcharge (37 CFR 1.16(f)) | 3051 | $170 / $68 / **$34** — avoided by filing AIA/01 with the application |
| Information Disclosure Statement fee (37 CFR 1.17(p)) — only if the IDS is filed outside the no-fee window | 3806 | $280 / $112 / **$56** — avoided by filing the IDS within 3 months of filing (VERIFY 37 CFR 1.97(b)) |
| Recording the assignment (37 CFR 1.21(h)) | — | **$0** if submitted electronically; $54 if not (code 8021) |

Micro-entity status itself requires the **SB/15A certification** and the income test in §2.

---

## 5. What the applicant must complete or sign before filing (consolidated)

| Where | Item |
|---|---|
| `05` ADS §2 | Inventor legal name(s), residence, mailing address (citizenship only if the form asks) |
| `05` ADS §3 | Correspondence address / customer number / email / phone |
| `05` ADS §4 | Attorney docket number (optional); confirm drawing sheet count after PDF conversion |
| `05` ADS §5 | Decision on non-publication request |
| `05` ADS §6, §8 | Registered practitioner details; confirm juristic-entity representation requirement |
| `05` ADS §7 | Confirm no provisional / no foreign priority (or add them) |
| `05` ADS §8–9 | COE Security LLC exact legal name and mailing address |
| `05` ADS §10 | Signature (practitioner or authorized party) — at filing |
| `06` §2 | Confirm all four micro-entity conditions for the LLC **and** each inventor (incl. 2025 gross income ≤ $262,380) |
| `06` §3 | SB/15A: first named inventor, signature, name, date, phone |
| `07` §1 | AIA/01 declaration signed by each inventor after reading the final spec/claims |
| `07` §2 | Assignment(s) executed and recorded; confirm no other licensee |
| `07` §3 | Inventorship determined claim-by-claim |
| `07` §4 | Power of attorney + 3.73(c) statement signed by an LLC officer |
| `03` Cross-Reference | Confirm "none" or insert provisional details |
| `02` §5 | Earliest public disclosure / on-sale date for each claimed feature |
| `01` §3 | Have the practitioner verify the "mentioned but not verified" references before the IDS |

---

## 6. Where the technical content came from (for the practitioner's enablement review)

- `docs/investor-technical-overview.md`, `docs/WorkCoPilot-Security-and-Privacy.md`, `docs/data-governance-and-company-spec.md`, `docs/workcopilot-features-oct2026.md`
- `server/work.js` — plan prompt (steps with `validate`, `commands`, `code`, destructive check) and the navigate prompt/JSON contract (`completed`, `current`, `guidance`, `observation`, `flag`, `done`); periodic self-audit
- `server/index.js` — `/plan`, `/watch` (gating, milestone evidence from the already-redacted frame), policy endpoints, audit entries
- `src/frame_scrub.js` — on-device OCR line masking with fail-safe downscale
- `src/scrub.js`, `server/work-scrub.js` — policy-driven scrub / tokenize (`[[TYPE_n]]`, device-only map) / rehydrate (never guess)
- `server/store.js` — policy object (categories, blockWords, customFields, mode, armed/locked), milestone shots, encryption at rest, retention
- `src/pages/WorkPage.jsx` — Document Picture-in-Picture overlay with pop-out fallback; `getDisplayMedia` capture; `prepFrame`
- `workcopilot/main.js` — Electron overlay: always-on-top, click-through, opacity, `setContentProtection`

One honesty note for the specification: the **per-tenant "screenshot-evidence retention" switch (element 514)** is described as part of the policy object; in the current code the retention switch is a **per-user** setting (`reportShots`) alongside a per-company retention window and company-armed DLP policy. The specification describes the tenant-level control as an embodiment (which is permitted — a specification may describe embodiments beyond the shipped code), but the practitioner should confirm the applicant is comfortable claiming it (claim 16) and the applicant may wish to ship the tenant-level switch so that the product matches the claims.
