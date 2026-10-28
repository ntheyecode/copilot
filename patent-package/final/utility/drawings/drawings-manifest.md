# Drawings manifest: FIG. 1 to FIG. 13 (WorkCoPilot utility application)

Status: INFORMAL drawings, generated from `tools/gen_drawings.py`. They are suitable for filing as informal drawings and for review; a registered patent draftsperson should formalize them to 37 CFR 1.84 before issuance (sheet margins, minimum 0.32 cm lettering for every label, line quality). The sheets carry no draft or branding text, by design.

Conventions applied: black lines on white only; no color, gradients, fills or shading (arrowheads are solid black); uniform 1.25 px line weight with 0.6 px lead lines; every reference numeral has a lead line to its part; dashed lines only for system boundaries, data that never leaves the device, the user-performs box, and signal paths; plain sans-serif labels; "FIG. N" centered under each figure; portrait US-Letter (8.5 x 11 in), one figure per sheet (FIG. 8A and FIG. 8B share sheet 8 as the drawings description suggests). Dashes are drawn as explicit segments and arrowheads as triangles so every SVG/PDF renderer shows them identically.

## Files

| File | Purpose |
|---|---|
| `FIG-1.svg` ... `FIG-13.svg` | editable source sheets (one per figure; `FIG-8.svg` holds 8A and 8B) |
| `drawings.pdf` | all 13 sheets, portrait US-Letter, for Patent Center upload (document code DRW) |
| `previews/fig-1.png` ... `previews/fig-13.png` | 110 dpi raster previews for on-screen review |
| `numerals.json` | machine-readable per-figure numeral inventory (written by the generator) |
| `tools/gen_drawings.py` | generator; re-run to regenerate every file above after an edit |

Regenerate: `python tools/gen_drawings.py` (needs Python 3 and PyMuPDF for PNG/PDF output; SVGs need no dependency).

## Figures and the reference numerals each contains

### FIG. 1: Screen-aware guidance system 100

Type: block diagram. Sheet: `FIG-1.svg`, page 1 of `drawings.pdf`.

Numerals (32): 100, 110, 112, 114, 116, 120, 122, 124, 126, 128, 130, 132, 134, 136, 140, 150, 152, 154, 155, 156, 157, 158, 160, 162, 164, 166, 168, 170, 172, 174, 180, 190

### FIG. 2: Observe, instruct, verify, correct and advance guidance loop 200

Type: flowchart. Sheet: `FIG-2.svg`, page 2 of `drawings.pdf`.

Numerals (18): 200, 202, 204, 206, 208, 210, 212, 214, 216, 218, 220, 222, 224, 226, 228, 230, 232, 234

### FIG. 3: On-device redaction and tokenization pipeline 300 with local reconstruction

Type: block diagram. Sheet: `FIG-3.svg`, page 3 of `drawings.pdf`.

Numerals (23): 110, 126, 300, 302, 304, 306, 308, 310, 312, 314, 316, 318, 320, 322, 324, 326, 328, 330, 332, 334, 336, 338, 340

Reused from another figure, as the drawings description requires: 110, 126

### FIG. 4: Sequence 400 of one guided step

Type: sequence diagram. Sheet: `FIG-4.svg`, page 4 of `drawings.pdf`.

Numerals (21): 400, 402, 404, 406, 408, 410, 412, 414, 416, 418, 420, 422, 424, 426, 428, 430, 432, 434, 436, 438, 440

### FIG. 5: Tenant-governed egress, instruction-shaping and evidence-retention arrangement 500

Type: block diagram. Sheet: `FIG-5.svg`, page 5 of `drawings.pdf`.

Numerals (22): 120, 500, 502, 504, 506, 508, 510, 512, 514, 516, 518, 520, 522, 524, 526, 528, 530, 532, 534, 536, 538, 540

Reused from another figure, as the drawings description requires: 120

### FIG. 6: Workflow-template capture, storage and tiered-retrieval arrangement 600

Type: block diagram. Sheet: `FIG-6.svg`, page 6 of `drawings.pdf`.

Numerals (26): 600, 602, 604, 606, 608, 610, 612, 614, 616, 618, 620, 622, 624, 626, 628, 630, 632, 634, 636, 638, 640, 642, 644, 646, 648, 650

### FIG. 7: Screen-derived clarification flow 700

Type: flowchart. Sheet: `FIG-7.svg`, page 7 of `drawings.pdf`.

Numerals (14): 700, 702, 704, 706, 708, 710, 712, 714, 716, 718, 720, 722, 724, 726

### FIG. 8A / FIG. 8B: Browser presentation embodiment 800 (8A); desktop presentation embodiment (8B)

Type: block diagrams, one sheet. Sheet: `FIG-8.svg`, page 8 of `drawings.pdf`.

Numerals (17): 122, 800, 802, 804, 806, 808, 810, 812, 814, 820, 822, 824, 826, 828, 830, 832, 834

Reused from another figure, as the drawings description requires: 122

### FIG. 9: Destructive-operation display gate 900

Type: flowchart. Sheet: `FIG-9.svg`, page 9 of `drawings.pdf`.

Numerals (9): 900, 902, 904, 906, 908, 910, 912, 914, 916

### FIG. 10: Multi-task project engine arrangement 1000

Type: block diagram. Sheet: `FIG-10.svg`, page 10 of `drawings.pdf`.

Numerals (22): 1000, 1002, 1004, 1006, 1008, 1010, 1012, 1014, 1016, 1018, 1020, 1022, 1024, 1026, 1028, 1030, 1032, 1034, 1036, 1038, 1040, 1042

### FIG. 11: Deterministic breakdown gate 1100

Type: flowchart. Sheet: `FIG-11.svg`, page 11 of `drawings.pdf`.

Numerals (12): 1100, 1102, 1104, 1106, 1108, 1110, 1112, 1114, 1116, 1118, 1120, 1122

### FIG. 12: Mid-project task injection flow 1200

Type: flowchart. Sheet: `FIG-12.svg`, page 12 of `drawings.pdf`.

Numerals (13): 1200, 1202, 1204, 1206, 1208, 1210, 1212, 1214, 1216, 1218, 1220, 1222, 1224

### FIG. 13: Transient-unreadable-frame tolerance 1300 in the watch loop

Type: flowchart. Sheet: `FIG-13.svg`, page 13 of `drawings.pdf`.

Numerals (10): 1300, 1302, 1304, 1306, 1308, 1310, 1312, 1314, 1316, 1318

## Cross-check against the specification

Reference numerals used in `v2/10-specification.md`: 235. Numerals drawn on at least one figure: 235.

Numerals in the specification NOT yet depicted on any figure: none

Numerals drawn that the specification does not use: none

Numerals cited in the claims-support table of `v2/20-claims.md` not depicted: none

Numeral placement rule: each numeral appears once per figure with its own lead line. Figures also carry a few cross-reference mentions in annotation text (for example "supersede, FIG. 6" in FIG. 2, "step 234, FIG. 2" in FIG. 6, "gated by 162" in FIG. 4, "first model 172" and "second model 174" in FIG. 13, "store 1020" in FIG. 11); these are text, not numeral placements, and a draftsperson may remove them when formalizing.

Suggested figure for publication (ADS): FIG. 2, per the drawings description.

