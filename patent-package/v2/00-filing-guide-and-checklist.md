DRAFT — for review by a registered patent practitioner before filing. Not legal advice.

# 00: Filing guide and checklist (v2 package)

Inventor: Ravi Kiran Raju Yerra. Working title: SCREEN-AWARE, READ-ONLY TASK GUIDANCE WITH ON-DEVICE REDACTION, TENANT-GOVERNED DATA EGRESS, SCREEN-DERIVED CLARIFICATION AND TIERED WORKFLOW-TEMPLATE RETRIEVAL. Prepared 2026-10-26 as drafting support from the v1 package (`patent-package/00` to `07`), the synthesis in `patent-package/05-novelty-synthesis-and-claims-v2.md`, the cluster prior-art reports and the feature inventory. Nothing in this package has been signed, dated, certified or filed. Every fact that only the applicant or practitioner can supply is marked [PLACEHOLDER] or [verify].

## 1. Package contents

| File | Markdown master | Editable DOCX | What it is |
|---|---|---|---|
| 00 | `v2/00-filing-guide-and-checklist.md` | `v2/editable/00-filing-guide-and-checklist.docx` | This guide: contents, filing routes, official forms, fees, drawings, checklist, open decisions |
| 10 | `v2/10-specification.md` | `v2/editable/10-specification.docx` | Full utility specification, 89 numbered paragraphs, FIG. 1 to FIG. 9, Inventions I to IV |
| 20 | `v2/20-claims.md` | `v2/editable/20-claims.docx` | Lead set: 20 claims, 3 independent (1, 10, 16); support map; antecedent-basis check; drafting notes; Appendix of four additional candidate independent claims |
| 30 | `v2/30-abstract.md` | `v2/editable/30-abstract.docx` | Abstract, 147 words |
| 40 | `v2/40-drawings-description.md` | `v2/editable/40-drawings-description.docx` | Figure list and per-figure description for the draftsperson |
| 50 | `v2/50-ids-references.md` | `v2/editable/50-ids-references.docx` | IDS reference list mapped to PTO/SB/08a and SB/08b, with a separate must-pull table |
| 60 | `v2/60-application-data-sheet.md` | `v2/editable/60-application-data-sheet.docx` | ADS content for the web ADS or PTO/AIA/14 |
| 70 | `v2/70-inventor-declaration.md` | `v2/editable/70-inventor-declaration.docx` | Declaration content for PTO/AIA/01 (formerly PTO/SB/01) |

The v1 files in `patent-package/` are untouched; the v1 drawings (`patent-package/drawings/FIG1` to `FIG5`) remain the starting point for the formal drawings (see section 5).

Regeneration: the Markdown files are the masters. `v2/tools/md2docx.cjs` rebuilds any DOCX from its master (`node patent-package/v2/tools/md2docx.cjs <in.md> <out.docx>`), and `v2/tools/sweep.py` re-runs the package checks (dash and wording sweep, abstract length, inventor name, citation traceability against the 05 guide and the prior-art reports, reference-numeral consistency). Edit the Markdown and rebuild, or edit the DOCX directly; if both are edited, the Markdown master should be brought back in line.

## 2. Provisional or non-provisional

| Route | What it gives | What it requires | When it fits |
|---|---|---|---|
| Provisional application (35 U.S.C. 111(b)) | A filing date for everything disclosed; 12 months to file the non-provisional; no examination; "patent pending" | A specification that enables what will later be claimed (file 10 is written to that standard), drawings, a cover sheet (PTO/SB/16) and the provisional filing fee; claims are optional | When the public-disclosure clock is a concern (the product is live at admireveda.com; the U.S. grace period is one year from the inventor's own disclosure and most foreign jurisdictions have none) and when counsel wants time to confirm code support for the embodiments listed in section 7 |
| Non-provisional utility application (35 U.S.C. 111(a)) | Examination; the application that can issue as a patent | Specification, claims, abstract, drawings, ADS, declaration, fees; IDS within three months to avoid a fee | When the claim set is settled and inventorship and applicant are fixed |

A provisional filed with file 10 as its specification preserves the date for all four inventions; the non-provisional filed within 12 months then claims its benefit (enter it in file 60, section 7). Counsel decides the route and whether Inventions II to IV go in the same non-provisional (expect a restriction requirement) or in continuations or divisionals.

## 3. Official USPTO forms (download the current revision from the USPTO forms page at filing; verify each form number and revision)

| Purpose | Form | Notes |
|---|---|---|
| Application Data Sheet | Patent Center web ADS (preferred) or PTO/AIA/14 | Content in file 60. If the PDF form is used, upload the original fillable PDF, not a flattened copy |
| Inventor's oath or declaration | PTO/AIA/01 (declaration for an application using an ADS); the pre-AIA form was PTO/SB/01; PTO/AIA/08 is for applications without an ADS; PTO/AIA/02 is the substitute statement | Content in file 70. Execute after the inventor has read the final specification and claims |
| Information Disclosure Statement | PTO/SB/08a (U.S. patents and publications) and PTO/SB/08b (foreign documents and non-patent literature), or the Patent Center IDS web form | List in file 50. Supply copies of non-patent literature. No IDS fee if filed within three months of filing [verify 37 CFR 1.97(b)] |
| Micro entity certification | PTO/SB/15A (gross income basis) or PTO/SB/15B (institution of higher education basis) | Only if every requirement of 37 CFR 1.29 is met by the applicant and the inventor; see section 4 |
| Small entity assertion | No separate form: assert small entity status on the ADS or by paying the small entity fee [verify 37 CFR 1.27(c)] | Use when micro entity does not apply but the applicant qualifies as a small entity under 37 CFR 1.27 |
| Fee transmittal | PTO/SB/17 | Patent Center computes fees at submission; SB/17 is used for paper or as a record |
| Provisional cover sheet (only for the provisional route) | PTO/SB/16 | Names the inventor and title; no claims required |
| Power of attorney (if the applicant is an entity or a practitioner is retained) | PTO/AIA/82 (parts A and B) or PTO/AIA/80, with a 37 CFR 3.73(c) statement on PTO/AIA/96 | [verify current form identifiers] |

## 4. Fees: verify current fees at filing

Fee amounts change by rule. Use the USPTO fee schedule on the day of filing and let Patent Center compute the total. For orientation only, the v1 package recorded the following from the USPTO fee schedule as read on 2026-10-25 (undiscounted / small / micro): basic utility filing fee 350 / 140 (70 electronic) / 70; search fee 770 / 308 / 154; examination fee 880 / 352 / 176; non-DOCX specification surcharge 430 / 172 / 86; each claim over 20: 200 / 80 / 40; each independent claim over 3: 600 / 240 / 120; late declaration surcharge 170 / 68 / 34; IDS fee outside the no-fee window 280 / 112 / 56. The maximum qualifying gross income for micro entity status recorded on 2026-10-25 was 262,380 USD (effective 2026-09-15). All of these are [verify at filing]. The lead claim set (20 claims, 3 independent) incurs no excess-claim fee; adding any Appendix claim from file 20 does.

Micro entity status (37 CFR 1.29, gross income basis) requires all of: small entity qualification; the inventor and applicant not named on more than four prior non-provisional U.S. applications; gross income of the inventor and of the applicant in the preceding calendar year not exceeding the maximum qualifying gross income; and no assignment, grant, conveyance or obligation to an entity exceeding that limit. [PLACEHOLDER: applicant to confirm each condition, or file as small entity]

## 5. Drawings requirement

Drawings are required where necessary to understand the invention (35 U.S.C. 113). File 40 describes FIG. 1 to FIG. 9 with every reference numeral used in files 10 and 20. The v1 SVGs cover FIG. 1 to FIG. 5 and must be extended with the new numerals (136, 157, 164, 166, 168, 230, 232, 234, 338, 340, 534, 536, 538, 540); FIG. 6 to FIG. 9 are new. Formal drawings compliant with 37 CFR 1.84 (black line art, margins, sheet size, numbering, no color) must be prepared by a draftsperson and uploaded as PDF under document code DRW. Informal drawings are acceptable for a provisional; formal drawings are expected for the non-provisional, or a Notice to File Corrected Application Papers may follow.

## 6. Patent Center filing checklist

Before opening Patent Center:

1. Practitioner review of files 10, 20, 30, 40 and 50 complete (claim scope, 35 U.S.C. 101 and 112, inventorship, disclosure dates).
2. Decision on route (section 2) and on applicant (inventor or assignee entity; file 60, section 8).
3. Inventorship confirmed claim by claim (file 70, section 4); inventor residence and mailing address collected.
4. Entity status decided (section 4); PTO/SB/15A completed if micro.
5. Declaration PTO/AIA/01 signed by Ravi Kiran Raju Yerra after reading the final specification and claims.
6. Assignment executed and ready to record if an assignee is the applicant; power of attorney signed if a practitioner is retained.
7. USPTO.gov account with identity verification for whoever files.
8. Decision on non-publication request (file 60, section 5).
9. Earliest public disclosure, public use and offer-for-sale dates established for each claimed feature (admireveda.com is live; dated public documents exist) and compared with the one-year grace period. [PLACEHOLDER]
10. Code-support decisions in section 7 made for each specification-enabled embodiment that is claimed.

Prepare the documents:

1. Specification (file 10, without the package note), claims (file 20 lead set only, beginning on a new page with "What is claimed is:"), and abstract (file 30, on its own page) as DOCX. Filing these parts in DOCX avoids the non-DOCX surcharge. Keep the title as the first line, not in a header.
2. Drawings as PDF (document code DRW).
3. Web ADS from file 60, or fillable PTO/AIA/14.
4. Declaration PDF (document code OATH).
5. PTO/SB/15A PDF if micro entity.
6. Power of attorney and 3.73(c) statement if applicable.
7. IDS from file 50 (web form or SB/08a and SB/08b) with copies of non-patent literature, at filing or within three months.

In Patent Center:

1. New submission, Utility, Nonprovisional under 35 U.S.C. 111(a) (or Provisional under 111(b)).
2. Enter the web ADS; the title must match the specification exactly.
3. Upload the DOCX specification, claims and abstract; review the validation report and correct any flagged formatting.
4. Upload drawings, declaration, entity certification, power of attorney.
5. Select entity status; confirm the fee calculator shows no excess-claim fees for the lead set.
6. Review, submit, pay; save the Electronic Acknowledgement Receipt and, later, the Filing Receipt; check both for errors in inventor name, title and entity status.
7. Record any assignment in the Assignment Center against the new application number.
8. Calendar: 12 months from filing for foreign or PCT filing claiming priority (and for the non-provisional if a provisional was filed); three months for a no-fee IDS; watch for a Notice to File Missing Parts.

## 7. Open decisions and gaps for the practitioner

1. Specification-enabled embodiments without confirmed code support (from 05 §4 and §6; feature inventory): streaming rehydration (claim 11); lock release with higher-privilege re-authentication and audit entry (claim 17); the instruction-shaping rule set compiled and versioned with the policy object (claim 16 limb; partially implemented); server-side discard of a clarification question answered by the frame text (file 10, paragraph [0066]); re-planning and template supersession driven by the discrepancy indication (claim 7, second alternative); tiered workflow-template retrieval, clean-success capture, clarification prefill and drift-triggered supersede (Appendix claims A1 and A2; built and unit-tested but not wired into the server). For each: implement before filing, or rely on the specification as a constructive reduction to practice with the inventor's confirmation that the embodiment was conceived. Do not represent any of them as working in a declaration or in marketing.
2. Applicant identity: inventor as applicant, or an assignee entity (the v1 package named COE Security LLC). Decide, and align files 60 and 70 and the assignment.
3. Whether to add the Appendix claims (file 20) to the same application (fees and restriction) or hold them for a divisional or continuation.
4. 35 U.S.C. 101 posture: keep claims tied to concrete mechanisms (on-device masking before transmission, the redacted frame as the sole evidence, the deterministic tier gate, the clarification-origin indicator and limit bypass). The synthesis notes that a broad "guide the user through software" claim was held ineligible (WalkMe US 9,922,008).
5. 35 U.S.C. 103 exposure: the synthesis expects a combination rejection of the core loop from the tutorial and digital-adoption art plus screenshot-to-vision-model art plus vision-model verification papers; the independent claims therefore keep redaction, planner-generated conditions and evidence fusion. Any data on false-advance rates or similar unexpected results would help.
6. Effective filing date versus 2025 to 2026 third-party art: date-stamp each IDS entry (file 50) against the filing date; several references (NROC US 12,688,280 B2, SAP US 12,554,888 B2, Copilot Vision Highlights, W3C issue #330, trycua issue #4194) fall in that window.
7. The browser embodiment (claim 15) deliberately does not claim exclusion of the guidance window from the device's own capture, because that is not achievable in the browser (W3C issue #330); only the desktop embodiment (claim 20) claims it.
8. Must-pull references (file 50, section C) must be read before the IDS is finalized.
9. Formal drawings (section 5) must be commissioned.
10. The v1 package's note that the screenshot-evidence retention switch is a per-user setting in the shipped code, while the specification describes a tenant-level setting 514, still applies; the applicant may wish to ship the tenant-level switch so that the product matches claim 16.

## 8. Practitioner-review disclaimer

This package is drafting support prepared with an AI tool from the applicant's own source material. It is not legal advice, does not create an attorney-client relationship, and is not a patentability, validity or freedom-to-operate opinion. A registered patent practitioner must review every document, confirm every [verify] and [PLACEHOLDER] item, and decide claim scope, filing route, entity status and the duty-of-disclosure list before anything is filed.
