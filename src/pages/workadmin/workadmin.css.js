// Self-contained styles + tiny formatters for the WorkCoPilot admin console.
// No global app CSS is imported anywhere in this namespace; everything the
// console renders is scoped under .wka so it can be lifted out standalone.

// Google Fonts URL for the WorkCoPilot brand faces (Bricolage Grotesque for
// headings, Figtree for body). The console is self-contained, so each shell
// injects this itself (see ensureWorkAdminFonts) instead of relying on global
// app CSS. Fallbacks keep the console readable before the sheet arrives.
export const WORKADMIN_FONTS_HREF = 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Figtree:wght@400;500;600;700&display=swap'
export function ensureWorkAdminFonts() {
  if (typeof document === 'undefined') return
  if (document.getElementById('wka-fonts')) return
  const l = document.createElement('link')
  l.id = 'wka-fonts'; l.rel = 'stylesheet'; l.href = WORKADMIN_FONTS_HREF
  document.head.appendChild(l)
}

// THEME TOKENS - one token set per dashboard, scoped by a class on the .wka
// root, so each console is styled independently and nothing bleeds across:
//   .wka             -> base surfaces + semantic colours (shared structure)
//   .wka (default)   -> COMPANY-ADMIN theme: brand green accent (#0e9f6e)
//   .wka.wka-super   -> SUPERADMIN theme: deep brand blue accent (#0a84c2),
//                       a brand gradient rule on the top bar and a cool-tinted
//                       nav, so the operator console reads as its own surface
//                       while staying inside the WorkCoPilot palette.
// All component rules below reference ONLY these tokens (no accent literals),
// so re-theming a dashboard is a token change, never a rule hunt.
export const WORKADMIN_CSS = `
.wka, .wka * { box-sizing: border-box; }
.wka {
  --wka-bg: #f6f8fb;
  --wka-bg-2: #f6f9fc;
  --wka-panel: #ffffff;
  --wka-panel-2: #f7f9fc;
  --wka-line: #e6e9ef;
  --wka-line-2: #dfe3ea;
  --wka-text: #111726;
  --wka-muted: #3c4257;
  --wka-faint: #7d8799;
  --wka-emerald: #0e9f6e;
  --wka-amber: #b5790f;
  --wka-red: #c0392b;
  --wka-radius: 12px;
  --wka-font-body: Figtree, Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  --wka-font-head: "Bricolage Grotesque", Figtree, Inter, ui-sans-serif, system-ui, sans-serif;

  /* Company-admin theme (default): brand green. */
  --wka-accent: #0e9f6e;
  --wka-accent-dark: #0b7f58;
  --wka-accent-ink: #085e41;
  --wka-accent-soft: rgba(14,159,110,0.10);
  --wka-accent-line: rgba(14,159,110,0.35);
  --wka-accent-shadow: rgba(14,159,110,0.25);
  /* White, minimal left rail (owner design law: white everywhere in-product).
     The nav is pure white with a hairline divider; hover is a quiet neutral
     wash, active is the quiet accent (green here, blue under .wka-super). */
  --wka-nav-bg: #ffffff;
  --wka-nav-hover: #f2f4f7;
  --wka-top-rule: linear-gradient(90deg, #0e9f6e, #0a84c2);
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
/* Superadmin theme: deep brand blue - distinct from the green company console,
   harmonious with the brand (#0a84c2 is the site's cyan/blue). */
.wka.wka-super {
  --wka-accent: #0a84c2;
  --wka-accent-dark: #086b9e;
  --wka-accent-ink: #0b4f73;
  --wka-accent-soft: rgba(10,132,194,0.10);
  --wka-accent-line: rgba(10,132,194,0.35);
  --wka-accent-shadow: rgba(10,132,194,0.25);
  /* Superadmin stays on a WHITE surface too - only the accent differs (brand
     blue vs the company console's green), so the two dashboards read as the
     same minimal white product with distinct accents, never a dark shell. */
  --wka-bg: #f6f8fb;
  --wka-nav-bg: #ffffff;
  --wka-nav-hover: #f2f4f7;
  --wka-top-rule: linear-gradient(90deg, #0a84c2, #0e9f6e);
}
.wka.wka-super .wka-brand span { color: var(--wka-accent-dark); }

/* Top bar */
.wka-top {
  display: flex; align-items: center; gap: 16px;
  padding: 14px 24px;
  border-bottom: 1px solid var(--wka-line);
  background: var(--wka-panel);
  position: relative;
}
/* Brand rule: a 3px gradient across the top of the console. Token-driven so
   each dashboard carries its own direction/colour pair. */
.wka-top::before { content: ""; position: absolute; left: 0; right: 0; top: 0; height: 3px; background: var(--wka-top-rule); }
.wka-brand { display: flex; flex-direction: column; gap: 2px; }
.wka-brand b { font-family: var(--wka-font-head); font-size: 16px; font-weight: 700; letter-spacing: -0.2px; }
.wka-brand span { font-size: 11px; color: var(--wka-muted); text-transform: uppercase; letter-spacing: 1.4px; font-weight: 600; }
.wka-dot { width: 9px; height: 9px; border-radius: 50%; background: var(--wka-emerald); box-shadow: 0 0 12px var(--wka-emerald); }
.wka-top-right { margin-left: auto; display: flex; align-items: center; gap: 12px; color: var(--wka-muted); font-size: 12px; }
.wka-chip {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 5px 10px; border-radius: 999px;
  border: 1px solid var(--wka-line-2); background: var(--wka-panel-2);
  font-size: 11px; color: var(--wka-text);
}
.wka-chip.ok { border-color: color-mix(in srgb, var(--wka-emerald) 40%, transparent); color: var(--wka-emerald); background: color-mix(in srgb, var(--wka-emerald) 8%, transparent); font-weight: 600; }
.wka-chip.warn { border-color: color-mix(in srgb, var(--wka-amber) 40%, transparent); color: var(--wka-amber); }

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
.wka-nav-item {
  display: flex; align-items: center; gap: 11px;
  padding: 11px 13px; border-radius: 11px;
  color: var(--wka-muted); cursor: pointer; border: 1px solid transparent;
  font-weight: 500; user-select: none;
}
.wka-nav-item:hover { background: var(--wka-nav-hover); color: var(--wka-text); }
.wka-nav-item:focus-visible { outline: 2px solid var(--wka-accent); outline-offset: 1px; }
.wka-nav-item.active {
  background: var(--wka-accent-soft);
  color: var(--wka-accent-ink); border-color: transparent; font-weight: 600;
  box-shadow: inset 3px 0 0 var(--wka-accent);
}
.wka-nav-item.active svg { color: var(--wka-accent); }
.wka-nav-foot { margin-top: auto; font-size: 11px; color: var(--wka-faint); padding: 10px 13px; }

.wka-main { flex: 1; min-width: 0; overflow: auto; padding: 26px 30px 48px; }
.wka-h1 { font-family: var(--wka-font-head); font-size: 23px; margin: 0 0 4px; font-weight: 700; letter-spacing: -0.3px; color: var(--wka-text); }
.wka-sub { color: var(--wka-muted); margin: 0 0 22px; font-size: 13px; }

/* Cards */
.wka-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 14px; margin-bottom: 26px; }
.wka-card {
  background: var(--wka-panel);
  border: 1px solid var(--wka-line); border-radius: var(--wka-radius);
  padding: 18px 18px 16px;
  box-shadow: 0 1px 2px rgba(26,31,54,0.05), 0 8px 22px -14px rgba(26,31,54,0.16);
}
.wka-card .k { font-size: 12px; color: var(--wka-muted); display: flex; align-items: center; gap: 8px; }
.wka-card .k svg { color: var(--wka-accent); }
.wka-card .v { font-family: var(--wka-font-head); font-size: 28px; font-weight: 700; margin-top: 10px; letter-spacing: -0.5px; }
.wka-card .foot { font-size: 11px; color: var(--wka-faint); margin-top: 6px; }
.wka-card.accent { border-color: var(--wka-accent-line); background: linear-gradient(180deg, var(--wka-accent-soft), var(--wka-panel) 70%); }
.wka-card.accent .v { color: var(--wka-accent-dark); }

/* Panels */
.wka-panel {
  background: linear-gradient(180deg, var(--wka-accent-soft), var(--wka-panel) 76px);
  border: 1px solid var(--wka-line);
  border-radius: var(--wka-radius); padding: 22px; margin-bottom: 20px;
  box-shadow: 0 1px 2px rgba(26,31,54,0.04), 0 12px 30px -18px rgba(26,31,54,0.17);
}
.wka-panel h2 { font-family: var(--wka-font-head); font-size: 15.5px; margin: 0 0 5px; font-weight: 700; letter-spacing: -0.1px; color: var(--wka-text); }
.wka-panel .desc { color: var(--wka-muted); font-size: 12px; margin: 0 0 16px; }

/* Table */
.wka-toolbar { display: flex; gap: 10px; align-items: center; margin-bottom: 14px; flex-wrap: wrap; }
.wka-input {
  background: var(--wka-bg); border: 1px solid var(--wka-line-2); color: var(--wka-text);
  border-radius: 10px; padding: 9px 12px; font-size: 13px; outline: none; min-width: 0;
}
.wka-input:focus { border-color: var(--wka-accent); box-shadow: 0 0 0 3px var(--wka-accent-soft); }
.wka-search { flex: 1; min-width: 180px; max-width: 360px; }

.wka-table-wrap { overflow-x: auto; border: 1px solid var(--wka-line); border-radius: 12px; background: var(--wka-panel); box-shadow: 0 1px 2px rgba(26,31,54,0.04), 0 10px 26px -16px rgba(26,31,54,0.15); }
table.wka-table { width: 100%; border-collapse: collapse; font-size: 13px; min-width: 640px; }
.wka-table th {
  text-align: left; padding: 10px 14px; color: var(--wka-faint); font-weight: 600;
  font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px;
  background: var(--wka-panel-2); border-bottom: 1px solid var(--wka-line);
  white-space: nowrap; cursor: pointer; user-select: none;
}
.wka-table th.no-sort { cursor: default; }
.wka-table th .arrow { color: var(--wka-accent); margin-left: 5px; }
.wka-table td { padding: 11px 14px; border-bottom: 1px solid var(--wka-line); vertical-align: middle; }
.wka-table tr:last-child td { border-bottom: none; }
.wka-table tbody tr:hover { background: var(--wka-panel-2); }
.wka-mono { font-variant-numeric: tabular-nums; }

/* Badges */
.wka-badge {
  display: inline-flex; align-items: center; gap: 5px; padding: 3px 9px; border-radius: 999px;
  font-size: 11px; font-weight: 600; border: 1px solid var(--wka-line-2); white-space: nowrap;
}
.wka-badge.basic { color: var(--wka-muted); }
.wka-badge.advanced { color: var(--wka-accent-dark); border-color: var(--wka-accent-line); }
.wka-badge.premium { color: var(--wka-emerald); border-color: color-mix(in srgb, var(--wka-emerald) 40%, transparent); }
.wka-badge.active { color: var(--wka-emerald); border-color: color-mix(in srgb, var(--wka-emerald) 40%, transparent); }
.wka-badge.ended { color: var(--wka-faint); }
.wka-badge.paused { color: var(--wka-amber); border-color: color-mix(in srgb, var(--wka-amber) 40%, transparent); }
.wka-badge.exhausted { color: var(--wka-red); border-color: color-mix(in srgb, var(--wka-red) 40%, transparent); }

/* Controls */
.wka-select {
  background: var(--wka-bg); border: 1px solid var(--wka-line-2); color: var(--wka-text);
  border-radius: 9px; padding: 7px 9px; font-size: 12px; outline: none; cursor: pointer;
}
.wka-select:focus { border-color: var(--wka-accent); box-shadow: 0 0 0 3px var(--wka-accent-soft); }
.wka-select:disabled { opacity: 0.5; cursor: not-allowed; }
.wka-btn {
  display: inline-flex; align-items: center; gap: 7px; cursor: pointer;
  border: 1px solid var(--wka-line-2); background: var(--wka-panel-2); color: var(--wka-text);
  border-radius: 10px; padding: 9px 15px; font-size: 13px; font-weight: 550;
}
.wka-btn:hover:not(:disabled) { border-color: var(--wka-accent); color: var(--wka-accent-dark); }
.wka-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.wka-btn.primary {
  background: var(--wka-accent);
  color: #ffffff; border: 1px solid var(--wka-accent); font-weight: 600;
  box-shadow: 0 1px 2px var(--wka-accent-shadow);
}
.wka-btn:focus-visible { outline: 2px solid var(--wka-accent); outline-offset: 2px; }
.wka-btn.primary:hover:not(:disabled) { background: var(--wka-accent-dark); border-color: var(--wka-accent-dark); color: #fff; }
.wka-btn.ghost { background: transparent; }
.wka-btn.danger {
  background: var(--wka-red);
  color: #ffffff; border: 1px solid var(--wka-red); font-weight: 600;
  box-shadow: 0 1px 2px rgba(192,57,43,0.25);
}
.wka-btn.danger:hover:not(:disabled) { background: #a5301f; border-color: #a5301f; color: #fff; }
.wka-btn.sm { padding: 6px 11px; font-size: 12px; border-radius: 8px; }

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
  background: #fff; transition: left 0.15s;
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
