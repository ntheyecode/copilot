# In-product dashboard redesign, Phase 1: audit, direction, plan

Date: 2026-10-28. Branch: `worktree-agent-a257e1e21bc156026` (off `main`). Scope: the
design tokens (one source), the flagship Dashboard (`/work`), the app shell, and the
shared blocks the dashboard is built from. Deeper flows are planned below, not touched.

## 1. Principles distilled from the reference

The reference image (a case-routing flow: a neutral card, a violet "AI categorizes" card,
dashed connectors into blue / green / violet team chips) reads calm because of nine
choices, all of which transfer to a productivity dashboard:

1. **Soft neutral canvas, tinted cards, no outlines.** Cards are pale fills (gray, green,
   blue, violet) with a barely-there edge, never a 1px dark border plus a shadow.
2. **Depth from tint and whitespace, not shadow.** Nothing floats; nothing glows.
3. **Generous whitespace.** Large card padding, wide gaps between related blocks.
4. **Large, consistent radius.** One rounded language (16 to 20px) on every container.
5. **One bold label per block.** A single confident title, one muted caption, no eyebrows
   shouting in uppercase.
6. **Crisp single-color iconography on a tint of the same hue.** The icon is the visual;
   the tint names the category (blue / green / violet).
7. **Category color is semantic, not decorative.** Each hue means one thing and is used
   consistently (here: green = plan hours, blue = top-ups and pools, neutral = tasks,
   amber = warning, red = out, violet = AI assist).
8. **A calm violet for the intelligent step.** Used sparingly, as an accent for "assist",
   never as the brand.
9. **Flow is drawn with dashed connectors and quiet motion.** Direction is shown, not
   animated loudly.

The ThemeForest preview is JavaScript-rendered and returned no visual content, so the
image above is the only reference actually studied; nothing was copied from the theme.

## 2. What was weak (before)

Rendered before the change at 1280 and 640 (light; the surface ignored the theme attribute
so "dark" rendered identically). Shots: `C:\ry-work\wcp-dashboard-redesign-shots\before`.

- **The primary action was third on the page.** Greeting, then a "Your plan at a glance"
  head, then three stat tiles, then "Start a task". The owner's design law says the center
  is the action; the numbers were.
- **Wall of outlined cards.** Every block (tiles, hero, chart, rows, buddy card) was a white
  box with a 1px `#e7eaf2` border and a drop shadow; the dashboard read as a grid of boxes
  rather than a calm page.
- **Icon tiles were boxed.** Every 34px icon tile carried its own border, adding a second
  outline inside every outlined card.
- **Mixed radii and spacing.** Containers used 12, 14, 16, 18 and 20px radii; gaps were ad
  hoc (14, 16, 18, 22px), several via inline `style={{ marginTop }}`.
- **The call-to-action was green, not orange.** Brand rule: green / blue palette with an
  orange call-to-action. The hero, flow and start buttons were all accent green, so the one
  action did not stand apart from the (green) status chrome.
- **Top bar was busy.** Eight outlined pills in a row; the Upgrade pill was solid green,
  competing with the green time chip.
- **Hardcoded literals in components.** `#fff`, `#d5d9e6`, `#06281c`, `rgba(8,14,24,.5)`
  and `color-mix(... ,#fff)` lived in six stylesheets, so no dark value could ever apply
  and the palette was duplicated.
- **No dark token values.** `.wd` deliberately had no `[data-theme]` block; a dark theme
  would have shown light cards on a dark body.
- **A real layout defect:** in Recent outcomes the title and the "Finished ... steps done"
  meta were inline spans inside a button and ran together on one line ("...Search
  ConsoleFinished Oct 25"). Visible in the before shot; the DOM gate flagged it as a 2px
  scroll overflow on `.wd-oc-main`.
- **Warning amber and brand orange were the same hue.** `--warm` (#c85a16) served both
  "low hours" warnings and would have had to serve the orange CTA, which breaks the guiding
  color code (amber = warning).

## 3. Direction chosen

### Tokens (single source: `src/pages/work/workApp.css.js`, on `.wd`)

- **Surfaces:** `--bg` (#f6f7fb canvas), `--panel`, `--panel-2`, `--panel-3`; `--line`,
  `--line-2`, `--line-soft`; text `--tx`, `--tx-2`, `--mut`, `--mut-2`, `--faint`.
- **Brand:** `--em` (green, user-themable through `--accent`), `--em-2` (the fixed blue),
  `--em-deep`, `--em-fill`, `--em-fill-2`, `--em-line`, `--on-em`.
- **The one call-to-action:** `--cta` (#c9501a, 4.5:1 on white with white ink),
  `--cta-hover`, `--cta-ink`, `--cta-fill`, `--cta-line`. Only `.wd-cta`, the dashboard
  hero button and the first-run flow button use it.
- **Semantic:** `--warm` is now a true amber (#b45309) for warnings, distinct from the
  orange CTA; `--danger`, `--info`, and `--ai` (calm violet, `--violet` is an alias).
- **Soft category tints:** `--tint-green/-blue/-violet/-amber/-neutral`, each with a
  matching `-ink` for the icon or label on that tint.
- **Scales:** radius `--r-xs 8 / --r-sm 10 / --r 14 / --r-lg 18 / --r-xl 22 / --r-pill`;
  spacing `--sp-1 .. --sp-8` (4px base); shadow `--sh-0 .. --sh-3` (none, rest, hover,
  popover); type `--fs-xs .. --fs-3xl`; fonts `--wd-display`, `--wd-body`.
- **Misc:** `--tip-bg/--tip-tx` (tooltips), `--scrim` (modals), `--chip`, `--field`,
  `--track`.
- **Dark values** for every token under `[data-theme='dark'] .wd`. The in-product
  `ThemeProvider` (`src/theme.jsx`) forces `data-theme=light` (owner law: white
  in-product), so the dark block is dormant by default; it exists so that nothing
  hard-paints a light background and the whole surface flips correctly if a dark theme
  is ever enabled. It was render-verified by setting the attribute after load.

### Cards, spacing, hierarchy

- Two card recipes only: a **white card with a hairline** (`--line-soft`, no shadow) for
  content that needs a white face (chart, rows), and a **tinted card with no border**
  (`.tint-green` / `.tint-blue` / `.tint-neutral`, amber / danger for states) for status.
- Icon tiles are borderless: pale tint plus a saturated same-hue icon.
- One radius per role (`--r-lg` 18px for feature cards, `--r` 14px for rows), section
  gaps on `--sp-6` / `--sp-7`, no inline margins.
- Greeting 26px, section titles 16px, tile values 28px, body 14.5px, captions 13.5px.
- Top bar: ghost pills (border only on Buy hours / Add time), tinted time chip, soft-green
  Upgrade pill, tinted avatar. Rail: 232px, hairline edge, 14px items, soft-green active.

### Dashboard order (`src/pages/work/Dashboard.jsx`)

1. Co-brand strip (company users) 2. Hello + plan line 3. **Primary action** (first-run
flow, or the Start-a-task card with the orange button) 4. Plan meters (three tinted tiles
plus the one state banner) 5. Notes (gate, add time, AI setup) 6. Plan chooser (needsSub)
7. This month 8. Resume where you left off 9. Recent outcomes 10. Buddy + data protection
11. Billing. No control, data flow, route or prop was removed; only the order of 3 and 4
swapped and two inline margins became a class.

## 4. Verification

- `npm run build`: green (prebuild gates: JSX imports, CSS page wildcards, locale integrity,
  widget locale parity).
- Render gate (headless Playwright, `fixture.js` answering every `/api/work/*` call so the
  signed-in dashboard renders without a backend; verify server `--mode localapi` so no call
  can reach production): **16 of 16 CLEAN** after, **16 of 16 FAIL** before.
  Matrix: 1280 and 640, light and dark, three variants (history, first run, low hours with
  every task slot in use), plus the plan popover open and the rail collapsed. The gate
  measures every `.wd` element for right-edge overflow and unclipped scroll width, the
  document and body scroll width, and the height of every pill / nav item / top-bar
  control (no second line). One documented exemption: the 3D buddy avatar (`role=img`,
  30px) carries a preserve-3d tilt layer and a -7% ring inside its own round box; it is
  decoration clipped by its card, not layout overflow.
- Neighbor pages that consume the same tokens (`/work/start`, `/work/tasks`,
  `/work/completed`, `/work/logs`, `/work/skills`, `/work/help`, `/work/support`):
  14 of 14 CLEAN at 1280 and 640, looked at, no regression.
- Shots and scripts: `C:\ry-work\wcp-dashboard-redesign-shots\{before,after,neighbors}`
  (`fixture.js`, `shoot.py`, `shoot_neighbors.py` alongside).
- Not verified: the billing section (`WorkBilling`, shown only to a subscriber with
  invoices) and the company co-brand strip were not in the fixture, so they are restyled
  by tokens but not rendered in this pass. The Guiding console (`/work/session/:id`) is
  bare (no shell) and out of scope.

## 5. Plan for the remaining surfaces (prioritized)

| # | Surface | What it needs | Effort |
|---|---------|---------------|--------|
| 1 | **StartTask wizard** (`StartTask.jsx`, `wizard.css.js`, the coach in `workApp.css.js`) | Adopt the tint recipe for the kind / depth cards (borderless tint, no inner gradient bar), drop the glowing halo on the live coach in favor of the sh-2 lift, orange only on the final Start button, radius / spacing from the scales, dark values already apply. Resumable step state is untouched. | M |
| 2 | **MyTasks / Completed / Logs** (`MyTasks.jsx`, `Completed.jsx`, `Logs.jsx`, `WorkTasks.jsx` row helpers) | One row recipe shared with the dashboard's Resume / Outcomes rows (hairline white row, tinted icon tile, status chip with tint, nowrap pills); collapse multi-field rows to compact expandable rows; empty states on the dashed `.wd-empty` recipe. | M |
| 3 | **Outcomes page** (`Outcomes.jsx` on `/work/completed` and the report actions) | Same row recipe; report actions as ghost pills; the Download menu styled by tokens. | S |
| 4 | **Projects** (`projects/*.jsx`, `projects.css.js`) | Replace the five `color-mix(... ,#fff)` literals with `--tint-violet` / `--ai-fill`; task map nodes on the dashed-connector idiom from TaskFlow; premium chip on the violet tint. | M |
| 5 | **Guiding console** (`Guiding.jsx`, `guideView.css.js`, StepCard, AskFocus) | Keep the guiding color code exactly (emerald current, cyan sees, amber warning, muted next); move its `--brand-*` fallbacks onto the `.wd` tokens so the console and the dashboard share one palette; verify in the floater at 380px as well as 1280 / 640. Highest risk, do last among user surfaces, with its own fixture. | L |
| 6 | **Help / Support** (`Help.jsx`, `Support.jsx`) | Sections still read global `--surface` / `--border`; switch to `.wd-card`; the narrow chip-row nav is already gate-clean. | S |
| 7 | **Company admin console** (`workadmin/*`, `workadmin.css.js`) | Port the token set (`--wka-*` derive from `.wd` tokens or share one file), tinted stat tiles, ghost top bar, kill any remaining dark sidebar rule. Render-verify per section with the existing admin fixture recipe. | L |
| 8 | **Superadmin console** | Same as 7 on the `.wka-super` scope (blue accent), plus the AI config cards and the companies list rows. | L |
| 9 | **Executive dashboard** (`/work/exec`) | Stat tiles and charts on the data-viz method with the dashboard's validated pair (`--em` time, `--em-2` tasks); export (PDF / JPG / CSV) must keep the same tokens. | M |
| 10 | **Shell polish** | A `title` cluster for the top bar on narrow widths (the section title is hidden under 640; consider showing it in the rail header), and a shared `TopBarControl` so the eight controls stay one recipe. | S |

Cross-cutting rules for every phase: tokens only (grep the file for `#` and `rgba(` before
calling it done), both widths and both theme attributes through the gate, look at the
PNGs, no removed control or prop, US spelling, no em-dash, never a model or provider name.

## 6. Proposed, not added

No new dependency was needed. A tiny `clsx`-style helper would make the tile tone classes
tidier, but string concatenation is fine at this size; not worth a package.
