// Self-contained styles + tiny formatters for the WorkCoPilot admin console.
// No global app CSS is imported anywhere in this namespace; everything the
// console renders is scoped under .wka so it can be lifted out standalone.

// The WorkCoPilot brand faces (Bricolage Grotesque for headings, Figtree for
// body) are self-hosted and loaded globally in src/main.jsx, so no runtime
// Google Fonts link is injected. This hook is kept as a no-op for its callers.
export function ensureWorkAdminFonts() { /* fonts loaded globally in src/main.jsx */ }
import { WD_TOKENS_CSS } from '../work/tokens.css.js'

// THEME TOKENS - the console's --wka-* set DERIVES from the in-product design
// tokens (src/pages/work/tokens.css.js, prepended below; the root carries the
// `wd-tokens` class), so the consoles share the dashboard's palette, brand
// combination, Light / Dark / Heavy modes and accessibility overrides from ONE
// source (SUPREME II). Scoping by a class on the .wka root:
//   .wka             -> base surfaces + semantic colors (shared structure)
//   .wka (default)   -> COMPANY-ADMIN theme: the primary (green) accent
//   .wka.wka-super   -> SUPERADMIN theme: the secondary (blue) accent, so the
//                       operator console reads as its own surface while staying
//                       inside the same palette.
// All component rules below reference ONLY these tokens (no accent literals),
// so re-theming a dashboard is a token change, never a rule hunt.
export const WORKADMIN_CSS = WD_TOKENS_CSS + `
.wka, .wka * { box-sizing: border-box; }
.wka {
  --wka-bg: var(--bg);
  --wka-bg-2: var(--panel-2);
  --wka-panel: var(--panel);
  --wka-panel-2: var(--panel-3);
  --wka-line: var(--line-soft);
  --wka-line-2: var(--line);
  --wka-text: var(--tx);
  --wka-muted: var(--mut);
  --wka-faint: var(--faint);
  --wka-emerald: var(--em);
  --wka-amber: var(--warm);
  --wka-red: var(--danger);
  --wka-radius: var(--r);
  --wka-font-body: var(--wd-body);
  --wka-font-head: var(--wd-display);
  /* Soft category tints + the one filled button face, from the same source. */
  --wka-tint-green: var(--tint-green); --wka-tint-green-ink: var(--tint-green-ink);
  --wka-tint-blue: var(--tint-blue); --wka-tint-blue-ink: var(--tint-blue-ink);
  --wka-tint-amber: var(--tint-amber); --wka-tint-amber-ink: var(--tint-amber-ink);
  --wka-tint-neutral: var(--tint-neutral); --wka-tint-neutral-ink: var(--tint-neutral-ink);
  --wka-danger-fill: var(--danger-fill); --wka-danger-line: var(--danger-line);
  --wka-solid: var(--em-solid); --wka-on-solid: var(--on-solid);
  --wka-sh-3: var(--sh-3);

  /* Company-admin theme (default): the primary accent. */
  --wka-accent: var(--em);
  --wka-accent-dark: var(--em-deep);
  --wka-accent-ink: var(--em-deep);
  --wka-accent-soft: var(--em-fill);
  --wka-accent-line: var(--em-line);
  --wka-accent-shadow: transparent;
  /* The left rail is the panel face with a hairline; hover is a quiet neutral
     wash, active is the soft accent fill (green here, blue under .wka-super). */
  --wka-nav-bg: var(--panel);
  --wka-nav-hover: var(--line-soft);
  --wka-cyan: var(--wka-accent);   /* legacy alias: every interactive ref adopts the dashboard accent */

  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  background: var(--wka-bg);
  color: var(--wka-text);
  font-family: var(--wka-font-body);
  font-size: 14px;
  line-height: 1.5;
  overflow: hidden;
  -webkit-font-smoothing: antialiased;
}
/* Superadmin theme: the SECONDARY brand color (blue by default), distinct from
   the company console's primary, from the same combination. */
.wka.wka-super {
  --wka-accent: var(--em-2);
  --wka-accent-dark: var(--em-2-deep);
  --wka-accent-ink: var(--em-2-deep);
  --wka-accent-soft: var(--tint-blue);
  --wka-accent-line: var(--info-line);
  --wka-solid: var(--em-2);
  --wka-tint-green: var(--tint-blue); --wka-tint-green-ink: var(--tint-blue-ink);
}
.wka.wka-super .wka-brand span { color: var(--wka-accent-dark); }

/* Top bar: one calm strip on the panel face with a hairline (no gradient
   rule); the chips are ghost pills. */
.wka-top {
  display: flex; align-items: center; gap: 16px;
  padding: 14px 24px;
  border-bottom: 1px solid var(--wka-line);
  background: var(--wka-panel);
  position: relative;
}
.wka-brand { display: flex; flex-direction: column; gap: 2px; }
.wka-brand b { font-family: var(--wka-font-head); font-size: calc(16px * var(--wc-fs, 1)); font-weight: 700; letter-spacing: -0.2px; }
.wka-brand span { font-size: calc(11px * var(--wc-fs, 1)); color: var(--wka-muted); font-weight: 600; }
.wka-dot { width: 9px; height: 9px; border-radius: 50%; background: var(--wka-emerald); }
.wka-top-right { margin-left: auto; display: flex; align-items: center; gap: 8px; color: var(--wka-muted); font-size: 12px; }
.wka-chip {
  display: inline-flex; align-items: center; gap: 6px; flex-shrink: 0;
  height: 28px; padding: 0 11px; border-radius: 999px;
  border: 1px solid transparent; background: var(--wka-tint-neutral);
  font-size: calc(12px * var(--wc-fs, 1)); font-weight: 600; color: var(--wka-tint-neutral-ink); white-space: nowrap;
}
.wka-chip.ok { color: var(--wka-tint-green-ink); background: var(--wka-tint-green); }
.wka-chip.warn { color: var(--wka-tint-amber-ink); background: var(--wka-tint-amber); }

/* Body split */
.wka-body { flex: 1; display: flex; min-height: 0; }
.wka-nav {
  width: 232px; flex-shrink: 0;
  border-right: 1px solid var(--wka-line);
  background: var(--wka-nav-bg);
  padding: 16px 12px; display: flex; flex-direction: column; gap: 4px;
  overflow-y: auto;            /* scroll when there are more sections than fit */
  overscroll-behavior: contain;
}
.wka-nav::-webkit-scrollbar { width: 8px; }
.wka-nav::-webkit-scrollbar-thumb { background: var(--wka-line-2); border-radius: 8px; }
/* Hardening (2026-10-25): the admin is mounted inside the app document, which loads
   the data-theme-driven global sheets (base.css/tokens.css). Neutralize the global
   rules that leak into the console so it ALWAYS uses its own light palette, even if
   data-theme were ever dark: the generic .label span (base.css) stole the nav color,
   and the global scrollbar-thumb border (3px solid var(--bg)) showed as a dark bar. */
.wka .label { color: inherit; }
.wka .hint { color: var(--wka-faint); }
.wka ::-webkit-scrollbar { width: 8px; height: 8px; }
.wka ::-webkit-scrollbar-thumb { background: var(--wka-line-2); border: 2px solid var(--wka-nav-bg); border-radius: 8px; }
.wka { scrollbar-width: thin; scrollbar-color: var(--wka-line-2) transparent; }
.wka-nav-item {
  display: flex; align-items: center; gap: 11px;
  padding: 11px 13px; border-radius: 11px;
  color: var(--wka-muted); cursor: pointer; border: 1px solid transparent;
  font-weight: 500; user-select: none;
}
.wka-nav-item > svg { flex-shrink: 0; }
.wka-nav-item .label { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.wka-nav-item:hover { background: var(--wka-nav-hover); color: var(--wka-text); }
.wka-nav-item:focus-visible { outline: 2px solid var(--wka-accent); outline-offset: 1px; }
.wka-nav-item.active {
  background: var(--wka-accent-soft);
  color: var(--wka-accent-ink); border-color: transparent; font-weight: 600;
}
.wka-nav-item.active svg { color: var(--wka-accent); }
.wka-nav-foot { margin-top: auto; font-size: 11px; color: var(--wka-faint); padding: 10px 13px; }

.wka-main { flex: 1; min-width: 0; overflow: auto; padding: 26px 30px 48px; }
.wka-h1 { font-family: var(--wka-font-head); font-size: 23px; margin: 0 0 4px; font-weight: 700; letter-spacing: -0.3px; color: var(--wka-text); }
.wka-sub { color: var(--wka-muted); margin: 0 0 22px; font-size: 13px; }

/* Stat tiles: the dashboard's tinted, borderless tile recipe (depth from tint
   and whitespace, not shadow). Neutral by default; .accent is the brand tint. */
.wka-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 14px; margin-bottom: 26px; }
.wka-card {
  background: var(--wka-tint-neutral);
  border: 1px solid transparent; border-radius: var(--wka-radius);
  padding: 18px 18px 16px;
  box-shadow: none; min-width: 0;
}
.wka-card .k { font-size: calc(12.5px * var(--wc-fs, 1)); color: var(--wka-muted); display: flex; align-items: center; gap: 8px; }
.wka-card .k svg { color: var(--wka-accent); flex-shrink: 0; }
.wka-card .v { font-family: var(--wka-font-head); font-size: calc(28px * var(--wc-fs, 1)); font-weight: 700; margin-top: 10px; letter-spacing: -0.5px; }
.wka-card .foot { font-size: calc(11.5px * var(--wc-fs, 1)); color: var(--wka-faint); margin-top: 6px; }
.wka-card.accent { background: var(--wka-tint-green); }
.wka-card.accent .v { color: var(--wka-tint-green-ink); }
.wka-card.accent .k svg { color: var(--wka-tint-green-ink); }

/* Panels: the white hairline card (no gradient, no shadow). */
.wka-panel {
  background: var(--wka-panel);
  border: 1px solid var(--wka-line);
  border-radius: var(--wka-radius); padding: 22px; margin-bottom: 20px;
  box-shadow: none;
}
.wka-panel h2 { font-family: var(--wka-font-head); font-size: 15.5px; margin: 0 0 5px; font-weight: 700; letter-spacing: -0.1px; color: var(--wka-text); }
.wka-panel .desc { color: var(--wka-muted); font-size: 12px; margin: 0 0 16px; }

/* Table */
.wka-toolbar { display: flex; gap: 10px; align-items: center; margin-bottom: 14px; flex-wrap: wrap; }
/* A flexible spacer pushes trailing controls to the right without ever forcing
   horizontal overflow; the gate rule (owner): toolbars flex, controls stay put,
   the spacer is the only thing that gives. */
.wka-spacer { flex: 1 1 auto; min-width: 0; }
.wka-input {
  background: var(--wka-bg); border: 1px solid var(--wka-line-2); color: var(--wka-text);
  border-radius: 10px; padding: 9px 12px; font-size: 13px; outline: none; min-width: 0;
}
.wka-input:focus { border-color: var(--wka-accent); box-shadow: 0 0 0 3px var(--wka-accent-soft); }
.wka-search { flex: 1; min-width: 180px; max-width: 360px; }

.wka-table-wrap { max-width: 100%; overflow-x: auto; border: 1px solid var(--wka-line); border-radius: var(--wka-radius); background: var(--wka-panel); box-shadow: none; }
/* A table is as wide as its content and no wider: a wide data table (nowrap
   cells, many columns) scrolls inside its .wka-table-wrap, a small one (a
   category + an action) fits the viewport. The old base min-width: 640px forced
   every table, even a two-column one, past a 640px or 380px viewport; tables
   that need a floor set their own minWidth inline. */
table.wka-table { width: 100%; border-collapse: collapse; font-size: calc(13px * var(--wc-fs, 1)); }
/* A select in a cell fills its column and shrinks with it (min-width: 0), so
   a narrow viewport narrows the control instead of pushing the table out. */
.wka-table td > .wka-select { width: 100%; min-width: 0; max-width: 100%; }
.wka-table th {
  text-align: left; padding: 10px 14px; color: var(--wka-muted); font-weight: 600;
  font-size: calc(12px * var(--wc-fs, 1));
  background: var(--wka-panel-2); border-bottom: 1px solid var(--wka-line);
  white-space: nowrap; cursor: pointer; user-select: none;
}
.wka-table th.no-sort { cursor: default; }
.wka-table th .arrow { color: var(--wka-accent); margin-left: 5px; }
.wka-table td { padding: 9px 14px; border-bottom: 1px solid var(--wka-line); vertical-align: middle; }
.wka-table tr:last-child td { border-bottom: none; }
.wka-table tbody tr:hover { background: var(--wka-panel-2); }
.wka-mono { font-variant-numeric: tabular-nums; }
/* A compact row: one line of controls, never a stack. The cell's inline
   controls stay nowrap; the rest of a row's actions live behind one "More"
   menu (ActionMenu in sections/_shared.jsx), so a row is as tall as a pill. */
.wka-row-acts { display: inline-flex; gap: 6px; align-items: center; white-space: nowrap; }
.wka-cell-main { font-weight: 600; display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }
.wka-cell-sub { font-size: calc(11.5px * var(--wc-fs, 1)); color: var(--wka-faint); white-space: nowrap; }
.wka-cell-msg { font-size: calc(11.5px * var(--wc-fs, 1)); margin-top: 3px; }
.wka-cell-msg.ok { color: var(--wka-emerald); }
.wka-cell-msg.err { color: var(--wka-red); }
.wka-cell-faint { color: var(--wka-faint); font-size: calc(12.5px * var(--wc-fs, 1)); }
.wka-cell-amber { color: var(--wka-amber); }
.wka-cell-emerald { color: var(--wka-emerald); }
.wka-cell-red { color: var(--wka-red); }
.wka-inline { display: inline-flex; gap: 6px; align-items: center; }
.wka-inline.wrap { flex-wrap: wrap; }
.wka-inline svg { flex-shrink: 0; }

/* Action menu: one ghost "More" trigger, a popover on the sh-3 shadow. */
.wka-menu-wrap { position: relative; display: inline-flex; }
.wka-menu { position: absolute; right: 0; top: calc(100% + 4px); z-index: 20; min-width: 200px; background: var(--wka-panel); border: 1px solid var(--wka-line); border-radius: var(--wka-radius); box-shadow: var(--wka-sh-3); padding: 6px; display: flex; flex-direction: column; gap: 2px; }
.wka-menu button { display: flex; align-items: center; gap: 9px; width: 100%; padding: 8px 10px; border: none; background: none; border-radius: 8px; color: var(--wka-text); font: inherit; font-size: calc(13px * var(--wc-fs, 1)); font-weight: 500; cursor: pointer; text-align: left; white-space: nowrap; }
.wka-menu button:hover:not(:disabled) { background: var(--wka-nav-hover); }
.wka-menu button:disabled { opacity: 0.45; cursor: not-allowed; }
.wka-menu button svg { flex-shrink: 0; color: var(--wka-muted); }
.wka-menu button.danger { color: var(--wka-red); }
.wka-menu button.danger svg { color: var(--wka-red); }
.wka-menu button.emerald { color: var(--wka-emerald); }

/* Badges: tinted pills, no outline. */
.wka-badge {
  display: inline-flex; align-items: center; gap: 5px; height: 22px; padding: 0 9px; border-radius: 999px;
  font-size: calc(11.5px * var(--wc-fs, 1)); font-weight: 600; border: 1px solid transparent; white-space: nowrap; line-height: 1;
  background: var(--wka-tint-neutral); color: var(--wka-tint-neutral-ink);
}
.wka-badge.basic { color: var(--wka-tint-neutral-ink); }
.wka-badge.advanced { color: var(--wka-tint-blue-ink); background: var(--wka-tint-blue); }
.wka-badge.premium { color: var(--wka-tint-green-ink); background: var(--wka-tint-green); }
.wka-badge.active { color: var(--wka-tint-green-ink); background: var(--wka-tint-green); }
.wka-badge.ended { color: var(--wka-faint); }
.wka-badge.paused { color: var(--wka-tint-amber-ink); background: var(--wka-tint-amber); }
.wka-badge.exhausted { color: var(--wka-red); background: var(--wka-danger-fill); }
/* Account / subscription status pills - single source so no section hand-rolls a
   red/amber literal. */
.wka-badge.disabled { color: var(--wka-red); background: var(--wka-danger-fill); }
.wka-badge.trialing { color: var(--wka-tint-amber-ink); background: var(--wka-tint-amber); }
.wka-badge.past_due { color: var(--wka-red); background: var(--wka-danger-fill); }
.wka-badge.canceled { color: var(--wka-faint); }
.wka-badge.comp { color: var(--wka-tint-blue-ink); background: var(--wka-tint-blue); }

/* Controls */
.wka-select {
  background: var(--wka-panel); border: 1px solid var(--wka-line-2); color: var(--wka-text);
  border-radius: 9px; padding: 6px 9px; font-size: calc(12.5px * var(--wc-fs, 1)); outline: none; cursor: pointer;
  max-width: 100%; min-width: 0;
}
.wka-select:focus { border-color: var(--wka-accent); box-shadow: 0 0 0 3px var(--wka-accent-soft); }
.wka-select:disabled { opacity: 0.5; cursor: not-allowed; }
/* Buttons: ghost pills (border only), one filled primary on the white-text-safe
   solid, and the destructive one a TINTED pill (danger fill + danger hairline +
   danger ink), the same affordance as the app's delete modal and the dashboard
   trash icon on hover: unmistakably destructive, never a loud filled red block
   (the design law). */
.wka-btn {
  display: inline-flex; align-items: center; gap: 7px; cursor: pointer;
  border: 1px solid var(--wka-line-2); background: var(--wka-panel); color: var(--wka-text);
  border-radius: 999px; height: 36px; padding: 0 15px; font-size: calc(13px * var(--wc-fs, 1)); font-weight: 600;
  white-space: nowrap; flex-shrink: 0; text-decoration: none; transition: background .15s, border-color .15s, color .15s;
}
.wka-btn:hover:not(:disabled) { background: var(--wka-nav-hover); border-color: var(--wka-line-2); color: var(--wka-text); }
.wka-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.wka-btn.primary {
  background: var(--wka-solid);
  color: var(--wka-on-solid); border: 1px solid var(--wka-solid); font-weight: 600;
  box-shadow: none;
}
.wka-btn:focus-visible { outline: 2px solid var(--wka-accent); outline-offset: 2px; }
.wka-btn.primary:hover:not(:disabled) { filter: brightness(1.06); background: var(--wka-solid); border-color: var(--wka-solid); color: var(--wka-on-solid); }
.wka-btn.ghost { background: transparent; border-color: transparent; }
.wka-btn.ghost:hover:not(:disabled) { background: var(--wka-nav-hover); border-color: transparent; }
.wka-btn.danger {
  background: var(--wka-danger-fill);
  color: var(--wka-red); border: 1px solid var(--wka-danger-line); font-weight: 600;
  box-shadow: none;
}
.wka-btn.danger svg { color: var(--wka-red); }
.wka-btn.danger:hover:not(:disabled) { background: color-mix(in srgb, var(--wka-red) 16%, var(--wka-panel)); border-color: var(--wka-red); color: var(--wka-red); }
.wka-btn.danger:focus-visible { outline-color: var(--wka-red); }
/* the icon-only destructive action in a row (remove an integration): bare until
   hovered, then the same danger tint */
.wka-btn.ghost.danger { background: transparent; border-color: transparent; }
.wka-btn.ghost.danger:hover:not(:disabled) { background: var(--wka-danger-fill); border-color: transparent; }
.wka-btn.sm { height: 28px; padding: 0 11px; font-size: calc(12px * var(--wc-fs, 1)); }

/* Collapsible rule rows (PolicyRules): a list of multi-field items that render as
   compact one-line rows by default and expand on click to edit, the scannable
   saved-card pattern. The severity accent is the left border; the head never wraps
   its controls (toggle/kind/sev/title/trash/chevron), only the title truncates. At
   phone width the citation drops to a muted second line so nothing overflows. */
.wka-rule { border: 1px solid var(--wka-line); border-left: 3px solid var(--wka-line-2); border-radius: 10px; background: var(--wka-panel); }
.wka-rule.off { opacity: 0.55; }
.wka-rule-head {
  display: flex; align-items: center; gap: 9px; width: 100%; min-width: 0;
  padding: 9px 11px; cursor: pointer; border-radius: 9px; background: none; border: 0;
  font: inherit; color: inherit; text-align: left;
}
.wka-rule-head:hover { background: var(--wka-panel-2); }
.wka-rule-head:focus-visible { outline: 2px solid var(--wka-accent); outline-offset: -2px; }
.wka-rule-toggle { width: 15px; height: 15px; flex-shrink: 0; cursor: pointer; }
.wka-rule-kind {
  display: inline-flex; align-items: center; gap: 4px; flex-shrink: 0;
  padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 600;
  border: 1px solid var(--wka-line-2); white-space: nowrap;
}
.wka-rule-kind.forbid { color: var(--wka-amber); border-color: color-mix(in srgb, var(--wka-amber) 40%, transparent); }
.wka-rule-kind.req { color: var(--wka-cyan); border-color: var(--wka-accent-line); }
.wka-rule-sev { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
.wka-rule-title { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; font-weight: 550; color: var(--wka-text); }
.wka-rule-cite { flex: 0 1 auto; max-width: 38%; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; color: var(--wka-faint); }
.wka-rule-x { flex-shrink: 0; padding: 4px 7px; }
.wka-rule-chev { flex-shrink: 0; display: inline-flex; color: var(--wka-faint); }
.wka-rule-body { padding: 12px 12px 14px; border-top: 1px solid var(--wka-line); }
@media (max-width: 640px) {
  /* Collapse gracefully: let the head wrap and push the citation onto its own
     muted second line, flush under the title, never a horizontal scrollbar. */
  .wka-rule-head { flex-wrap: wrap; row-gap: 4px; }
  .wka-rule-cite { order: 10; flex-basis: 100%; max-width: 100%; padding-left: 24px; }
}

/* Knowledge spaces (sections/KbSpaces.jsx): one row per space. The name is
   the only flexible column (it truncates); the count badge and the row actions
   stay nowrap. At phone width the actions drop to their own line under the
   name, flush with it, never past the edge. */
.wka-kbs-add { margin-bottom: 14px; }
.wka-kbs-add .wka-kbs-name { flex: 1 1 220px; min-width: 0; max-width: 420px; }
.wka-kbs-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.wka-kbs-row {
  display: flex; align-items: center; gap: 10px; min-width: 0; flex-wrap: wrap;
  padding: 9px 12px; border: 1px solid var(--wka-line); border-radius: 10px; background: var(--wka-panel);
}
.wka-kbs-ic { width: 28px; height: 28px; border-radius: 8px; display: inline-grid; place-items: center; flex-shrink: 0; background: var(--wka-tint-green); color: var(--wka-tint-green-ink); }
.wka-kbs-nm { flex: 1 1 120px; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; font-size: calc(13.5px * var(--wc-fs, 1)); }
.wka-kbs-edit { flex: 1 1 160px; min-width: 0; padding: 6px 10px; font-size: calc(13px * var(--wc-fs, 1)); }
.wka-kbs-row .wka-row-acts { margin-left: auto; flex-shrink: 0; }
@media (max-width: 640px) {
  .wka-kbs-row .wka-row-acts { flex-basis: 100%; margin-left: 0; padding-left: 38px; }
}

/* Forms */
.wka-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; }
.wka-field { display: flex; flex-direction: column; gap: 6px; }
.wka-field label { font-size: 12px; color: var(--wka-muted); }
.wka-field .hint { font-size: 11px; color: var(--wka-faint); }
.wka-formgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px; }
@media (max-width: 760px) { .wka-formgrid { grid-template-columns: 1fr; } }
.wka-check { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; color: var(--wka-text); cursor: pointer; }
.wka-check input { width: 15px; height: 15px; flex-shrink: 0; }
.wka-inline-money { position: relative; display: flex; align-items: center; }
.wka-inline-money .sym { position: absolute; left: 11px; color: var(--wka-faint); font-size: 13px; }
.wka-inline-money .wka-input { padding-left: 24px; width: 100%; }

/* States */
.wka-state { padding: 40px 18px; text-align: center; color: var(--wka-muted); }
.wka-state .big { font-size: 15px; color: var(--wka-text); margin-bottom: 6px; }
.wka-spinner {
  width: 26px; height: 26px; border-radius: 50%;
  border: 3px solid var(--wka-line-2); border-top-color: var(--wka-accent);
  animation: wka-spin 0.8s linear infinite; margin: 0 auto 14px;
}
@keyframes wka-spin { to { transform: rotate(360deg); } }
.wka-error {
  border: 1px solid color-mix(in srgb, var(--wka-red) 35%, transparent); background: color-mix(in srgb, var(--wka-red) 7%, transparent);
  color: var(--wka-red); border-radius: 12px; padding: 14px 16px; font-size: 13px;
  display: flex; align-items: center; gap: 10px; justify-content: space-between;
}
.wka-error .msg { display: flex; align-items: center; gap: 10px; }
.wka-note {
  border: 1px solid var(--wka-line-2); background: var(--wka-bg-2); color: var(--wka-muted);
  border-radius: 10px; padding: 10px 13px; font-size: 12px; margin-bottom: 14px;
  display: flex; align-items: center; gap: 9px;
}
.wka-saved {
  display: inline-flex; align-items: center; gap: 7px; color: var(--wka-emerald); font-size: 12px; font-weight: 600;
}

/* Toggle */
.wka-toggle { display: inline-flex; align-items: center; gap: 12px; cursor: pointer; }
.wka-toggle .track {
  width: 46px; height: 26px; border-radius: 999px; background: var(--wka-line-2);
  position: relative; transition: background 0.15s; flex-shrink: 0;
}
.wka-toggle .track .knob {
  position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; border-radius: 50%;
  background: var(--wka-panel); transition: left 0.15s;
}
.wka-toggle.on .track { background: var(--wka-accent); }
.wka-toggle.on .track .knob { left: 23px; }
.wka-toggle.disabled { opacity: 0.5; cursor: not-allowed; }

/* Access gate */
.wka-gate { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; background: var(--wka-bg); }
.wka-gate .box {
  max-width: 420px; text-align: center; padding: 34px; border: 1px solid var(--wka-line);
  border-radius: 16px; background: var(--wka-panel);
}
.wka-gate .box svg { color: var(--wka-amber); margin-bottom: 12px; }
.wka-gate .box h2 { margin: 0 0 8px; font-size: 18px; font-family: var(--wka-font-head); font-weight: 700; }
.wka-gate .box p { color: var(--wka-muted); margin: 0; font-size: 13px; }

@media (max-width: 760px) {
  .wka-nav { width: 64px; padding: 14px 8px; }
  .wka-nav-item span.label { display: none; }
  .wka-nav-foot { display: none; }
  .wka-main { padding: 20px 16px 40px; }
}

/* Phone width: let the top bar and its chips wrap instead of overflowing the
   viewport (the brand + username + role + sign-out used to push off-screen). */
@media (max-width: 560px) {
  .wka-top { flex-wrap: wrap; row-gap: 8px; padding: 12px 16px; }
  .wka-top-right { margin-left: auto; flex-wrap: wrap; justify-content: flex-end; row-gap: 6px; }
  .wka-h1 { font-size: 19px; }
}
`

// ---- formatters -----------------------------------------------------------
export function hmFromSeconds(seconds) {
  const s = Math.max(0, Math.round(Number(seconds) || 0))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m`
  return `${s}s`
}

export function minutesFromSeconds(seconds) {
  return Math.round((Math.max(0, Number(seconds) || 0) / 60))
}

export function fmtDateTime(value) {
  if (!value) return '-'
  const d = new Date(value)
  if (isNaN(d.getTime())) return '-'
  try {
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  } catch { return d.toISOString().slice(0, 16).replace('T', ' ') }
}

export function fmtMoney(n, currency) {
  const v = Number(n)
  if (!isFinite(v)) return '-'
  const cur = (currency || 'usd').toUpperCase()
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: cur, maximumFractionDigits: 2 }).format(v)
  } catch { return `${v} ${cur}` }
}
