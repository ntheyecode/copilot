// Self-contained styles + tiny formatters for the WorkCoPilot admin console.
// No global app CSS is imported anywhere in this namespace; everything the
// console renders is scoped under .wka so it can be lifted out standalone.

export const WORKADMIN_CSS = `
.wka, .wka * { box-sizing: border-box; }
.wka {
  --wka-bg: #f6f8fb;
  --wka-bg-2: #f6f9fc;
  --wka-panel: #ffffff;
  --wka-panel-2: #f7f9fc;
  --wka-line: #e6e9ef;
  --wka-line-2: #dfe3ea;
  --wka-text: #1a1f36;
  --wka-muted: #3c4257;
  --wka-faint: #8792a2;
  --wka-accent: #635bff;
  --wka-accent-dark: #4b45d6;
  --wka-accent-soft: rgba(99,91,255,0.09);
  --wka-emerald: #0a9d66;
  --wka-cyan: #635bff;   /* re-pointed to the indigo accent: all interactive refs adopt it */
  --wka-amber: #b5790f;
  --wka-red: #c0392b;
  --wka-radius: 12px;
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  background: var(--wka-bg);
  color: var(--wka-text);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  overflow: hidden;
  -webkit-font-smoothing: antialiased;
}

/* Top bar */
.wka-top {
  display: flex; align-items: center; gap: 16px;
  padding: 14px 24px;
  border-bottom: 1px solid var(--wka-line);
  background: #ffffff;
}
.wka-brand { display: flex; flex-direction: column; gap: 2px; }
.wka-brand b { font-size: 15px; letter-spacing: 0.2px; }
.wka-brand span { font-size: 11px; color: var(--wka-muted); text-transform: uppercase; letter-spacing: 1.4px; }
.wka-dot { width: 9px; height: 9px; border-radius: 50%; background: var(--wka-emerald); box-shadow: 0 0 12px var(--wka-emerald); }
.wka-top-right { margin-left: auto; display: flex; align-items: center; gap: 12px; color: var(--wka-muted); font-size: 12px; }
.wka-chip {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 5px 10px; border-radius: 999px;
  border: 1px solid var(--wka-line-2); background: var(--wka-panel-2);
  font-size: 11px; color: var(--wka-text);
}
.wka-chip.ok { border-color: rgba(140,245,196,0.4); color: var(--wka-emerald); }
.wka-chip.warn { border-color: rgba(255,207,122,0.4); color: var(--wka-amber); }

/* Body split */
.wka-body { flex: 1; display: flex; min-height: 0; }
.wka-nav {
  width: 232px; flex-shrink: 0;
  border-right: 1px solid var(--wka-line);
  background: var(--wka-bg-2);
  padding: 16px 12px; display: flex; flex-direction: column; gap: 4px;
}
.wka-nav-item {
  display: flex; align-items: center; gap: 11px;
  padding: 11px 13px; border-radius: 11px;
  color: var(--wka-muted); cursor: pointer; border: 1px solid transparent;
  font-weight: 500; user-select: none;
}
.wka-nav-item:hover { background: #eef0f6; color: var(--wka-text); }
.wka-nav-item.active {
  background: var(--wka-accent-soft);
  color: var(--wka-accent-dark); border-color: transparent; font-weight: 600;
}
.wka-nav-item.active svg { color: var(--wka-accent); }
.wka-nav-foot { margin-top: auto; font-size: 11px; color: var(--wka-faint); padding: 10px 13px; }

.wka-main { flex: 1; min-width: 0; overflow: auto; padding: 26px 30px 48px; }
.wka-h1 { font-size: 21px; margin: 0 0 4px; font-weight: 650; }
.wka-sub { color: var(--wka-muted); margin: 0 0 22px; font-size: 13px; }

/* Cards */
.wka-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 14px; margin-bottom: 26px; }
.wka-card {
  background: var(--wka-panel);
  border: 1px solid var(--wka-line); border-radius: var(--wka-radius);
  padding: 18px 18px 16px;
  box-shadow: 0 1px 2px rgba(31,41,55,0.04), 0 1px 1px rgba(31,41,55,0.03);
}
.wka-card .k { font-size: 12px; color: var(--wka-muted); display: flex; align-items: center; gap: 8px; }
.wka-card .k svg { color: var(--wka-accent); }
.wka-card .v { font-size: 28px; font-weight: 680; margin-top: 10px; letter-spacing: -0.5px; }
.wka-card .foot { font-size: 11px; color: var(--wka-faint); margin-top: 6px; }
.wka-card.accent { border-color: rgba(140,245,196,0.4); }
.wka-card.accent .v { color: var(--wka-emerald); }

/* Panels */
.wka-panel {
  background: var(--wka-panel); border: 1px solid var(--wka-line);
  border-radius: var(--wka-radius); padding: 20px; margin-bottom: 20px;
  box-shadow: 0 1px 2px rgba(31,41,55,0.04), 0 1px 1px rgba(31,41,55,0.03);
}
.wka-panel h2 { font-size: 15px; margin: 0 0 4px; font-weight: 620; }
.wka-panel .desc { color: var(--wka-muted); font-size: 12px; margin: 0 0 16px; }

/* Table */
.wka-toolbar { display: flex; gap: 10px; align-items: center; margin-bottom: 14px; flex-wrap: wrap; }
.wka-input {
  background: var(--wka-bg); border: 1px solid var(--wka-line-2); color: var(--wka-text);
  border-radius: 10px; padding: 9px 12px; font-size: 13px; outline: none; min-width: 0;
}
.wka-input:focus { border-color: var(--wka-accent); box-shadow: 0 0 0 3px var(--wka-accent-soft); }
.wka-search { flex: 1; min-width: 180px; max-width: 360px; }

.wka-table-wrap { overflow-x: auto; border: 1px solid var(--wka-line); border-radius: 12px; background: var(--wka-panel); box-shadow: 0 1px 2px rgba(31,41,55,0.04); }
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
.wka-badge.advanced { color: var(--wka-accent); border-color: rgba(99,91,255,0.35); }
.wka-badge.premium { color: var(--wka-emerald); border-color: rgba(140,245,196,0.4); }
.wka-badge.active { color: var(--wka-emerald); border-color: rgba(140,245,196,0.4); }
.wka-badge.ended { color: var(--wka-faint); }
.wka-badge.paused { color: var(--wka-amber); border-color: rgba(255,207,122,0.4); }
.wka-badge.exhausted { color: var(--wka-red); border-color: rgba(255,138,138,0.4); }

/* Controls */
.wka-select {
  background: var(--wka-bg); border: 1px solid var(--wka-line-2); color: var(--wka-text);
  border-radius: 9px; padding: 7px 9px; font-size: 12px; outline: none; cursor: pointer;
}
.wka-select:focus { border-color: var(--wka-cyan); }
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
  box-shadow: 0 1px 2px rgba(99,91,255,0.25);
}
.wka-btn.primary:hover:not(:disabled) { background: var(--wka-accent-dark); border-color: var(--wka-accent-dark); color: #fff; }
.wka-btn.ghost { background: transparent; }
.wka-btn.sm { padding: 6px 11px; font-size: 12px; border-radius: 8px; }

/* Forms */
.wka-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; }
.wka-field { display: flex; flex-direction: column; gap: 6px; }
.wka-field label { font-size: 12px; color: var(--wka-muted); }
.wka-field .hint { font-size: 11px; color: var(--wka-faint); }
.wka-inline-money { position: relative; display: flex; align-items: center; }
.wka-inline-money .sym { position: absolute; left: 11px; color: var(--wka-faint); font-size: 13px; }
.wka-inline-money .wka-input { padding-left: 24px; width: 100%; }

/* States */
.wka-state { padding: 40px 18px; text-align: center; color: var(--wka-muted); }
.wka-state .big { font-size: 15px; color: var(--wka-text); margin-bottom: 6px; }
.wka-spinner {
  width: 26px; height: 26px; border-radius: 50%;
  border: 3px solid var(--wka-line-2); border-top-color: var(--wka-cyan);
  animation: wka-spin 0.8s linear infinite; margin: 0 auto 14px;
}
@keyframes wka-spin { to { transform: rotate(360deg); } }
.wka-error {
  border: 1px solid rgba(255,138,138,0.35); background: rgba(255,138,138,0.08);
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
.wka-gate .box h2 { margin: 0 0 8px; font-size: 18px; }
.wka-gate .box p { color: var(--wka-muted); margin: 0; font-size: 13px; }

@media (max-width: 760px) {
  .wka-nav { width: 64px; padding: 14px 8px; }
  .wka-nav-item span.label { display: none; }
  .wka-nav-foot { display: none; }
  .wka-main { padding: 20px 16px 40px; }
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
