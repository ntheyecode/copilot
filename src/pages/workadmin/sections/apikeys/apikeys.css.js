// Styles for the company console's API keys + Webhooks sections (sections/
// ApiKeys.jsx, sections/Webhooks.jsx and the apikeys/* parts). Tokens only
// (--wka-*), so Light / Dark / Heavy follow the console. Layout rules follow
// the console recipe: compact one-line rows that expand on click, chips and
// buttons that never wrap or clip (nowrap + flex-shrink:0), only the title
// truncates, and at phone width the head wraps onto a second line instead of
// overflowing. Long keys and URLs wrap INSIDE their own box (overflow-wrap:
// anywhere), never the page.
export const API_KEYS_CSS = `
.wka-dev-mono, .wka-dev-code { font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace; }
.wka-dev-how { border: 1px solid var(--wka-line); border-radius: 12px; padding: 12px 14px; margin-bottom: 14px; background: var(--wka-bg-2); display: grid; gap: 8px; font-size: 12.5px; color: var(--wka-muted); min-width: 0; }
.wka-dev-how b { color: var(--wka-text); font-weight: 600; }
.wka-dev-how a { color: var(--wka-accent-ink); font-weight: 600; text-decoration: none; }
.wka-dev-how a:hover { text-decoration: underline; }
.wka-dev-code { display: block; font-size: 12px; background: var(--wka-panel); border: 1px solid var(--wka-line-2); border-radius: 8px; padding: 7px 10px; color: var(--wka-text); overflow-wrap: anywhere; white-space: pre-wrap; margin: 0; min-width: 0; }
.wka-dev-hdr { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 12px; }
.wka-dev-count { font-size: 13px; font-weight: 600; white-space: nowrap; }
.wka-dev-list { display: flex; flex-direction: column; gap: 8px; }
.wka-dev-row { border: 1px solid var(--wka-line); border-radius: 10px; background: var(--wka-panel); min-width: 0; }
.wka-dev-row.faded { opacity: 0.62; }
.wka-dev-row.open { border-color: var(--wka-line-2); }
.wka-dev-head { display: flex; align-items: center; gap: 9px; width: 100%; min-width: 0; padding: 9px 11px; cursor: pointer; border-radius: 9px; background: none; border: 0; font: inherit; color: inherit; text-align: left; }
.wka-dev-head:hover { background: var(--wka-panel-2); }
.wka-dev-head:focus-visible { outline: 2px solid var(--wka-accent); outline-offset: -2px; }
.wka-dev-ic { flex-shrink: 0; display: inline-flex; color: var(--wka-accent); }
/* flex-basis 0 (not auto): in the wrapping phone layout a long nowrap title
   would otherwise be measured at its full width and pushed to its own line
   before it is allowed to shrink; with basis 0 it shares the first line with
   the icon and chevron and truncates there. */
.wka-dev-title { flex: 1 1 0%; min-width: 0; overflow: hidden; }
.wka-dev-title .nm { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; font-weight: 600; color: var(--wka-text); }
.wka-dev-title .sb { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11.5px; color: var(--wka-faint); }
.wka-dev-chips { display: flex; align-items: center; gap: 6px; flex-shrink: 0; min-width: 0; }
.wka-dev-chip { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 600; border: 1px solid var(--wka-line-2); color: var(--wka-muted); white-space: nowrap; flex-shrink: 0; line-height: 1.5; }
.wka-dev-chip.ok { color: var(--wka-tint-green-ink); background: var(--wka-tint-green); border-color: transparent; }
.wka-dev-chip.warn { color: var(--wka-tint-amber-ink); background: var(--wka-tint-amber); border-color: transparent; }
.wka-dev-chip.bad { color: var(--wka-red); background: var(--wka-danger-fill); border-color: transparent; }
.wka-dev-chip.faint { color: var(--wka-faint); }
.wka-dev-chev { flex-shrink: 0; display: inline-flex; color: var(--wka-faint); }
.wka-dev-body { padding: 12px 12px 14px; border-top: 1px solid var(--wka-line); min-width: 0; }
.wka-dev-kv { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 10px 22px; margin-bottom: 12px; }
.wka-dev-kv > div { min-width: 0; }
.wka-dev-kv > div > span { display: block; font-size: 11px; color: var(--wka-faint); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; }
.wka-dev-kv > div.wide { grid-column: 1 / -1; }
.wka-dev-kv b { font-size: 13px; font-weight: 500; color: var(--wka-text); overflow-wrap: anywhere; }
.wka-dev-tags { display: flex; flex-wrap: wrap; gap: 5px; min-width: 0; }
.wka-dev-tags .wka-dev-chip { white-space: normal; max-width: 100%; text-align: left; line-height: 1.35; padding: 3px 8px; }
.wka-dev-acts { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.wka-dev-acts .wka-btn { white-space: nowrap; flex-shrink: 0; }
.wka-dev-sub { border: 1px solid var(--wka-line); border-radius: 10px; padding: 12px; margin-top: 12px; display: grid; gap: 10px; background: var(--wka-bg-2); }
.wka-dev-sub h4 { margin: 0; font-size: 13px; color: var(--wka-text); }
.wka-dev-sub p { margin: 0; font-size: 12.5px; color: var(--wka-muted); }
.wka-dev-secret { border: 1px solid var(--wka-accent-line); background: var(--wka-accent-soft); border-radius: 12px; padding: 14px; margin: 0 0 14px; min-width: 0; }
.wka-dev-secret h3 { margin: 0 0 4px; font-size: 14px; display: flex; gap: 8px; align-items: center; color: var(--wka-text); font-family: var(--wka-font-head); }
.wka-dev-secret p { margin: 0 0 10px; font-size: 12.5px; color: var(--wka-muted); }
.wka-dev-secret-row { display: flex; gap: 8px; align-items: center; min-width: 0; }
.wka-dev-secret-row .wka-dev-code { flex: 1 1 auto; user-select: all; }
.wka-dev-secret-row .wka-btn { flex-shrink: 0; white-space: nowrap; }
.wka-dev-secret-foot { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-top: 10px; }
.wka-dev-form { border: 1px solid var(--wka-line); border-radius: 12px; padding: 14px; margin-bottom: 14px; display: grid; gap: 12px; min-width: 0; }
.wka-dev-form h3 { margin: 0; font-size: 14px; color: var(--wka-text); font-family: var(--wka-font-head); }
.wka-dev-form .wka-input, .wka-dev-form textarea.wka-input { width: 100%; }
.wka-dev-opts { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 8px; }
.wka-dev-opt { display: flex; gap: 9px; align-items: flex-start; padding: 8px 10px; border: 1px solid var(--wka-line); border-radius: 9px; cursor: pointer; font-size: 12.5px; color: var(--wka-text); min-width: 0; }
.wka-dev-opt input { margin: 2px 0 0; flex-shrink: 0; }
.wka-dev-opt .id { display: block; color: var(--wka-faint); font-size: 11px; overflow-wrap: anywhere; }
.wka-dev-opt.on { border-color: var(--wka-accent-line); background: var(--wka-accent-soft); }
.wka-dev-seg { display: flex; flex-wrap: wrap; gap: 6px; }
.wka-dev-seg button { border: 1px solid var(--wka-line-2); background: var(--wka-panel); color: var(--wka-muted); border-radius: 999px; padding: 5px 12px; font: inherit; font-size: 12.5px; cursor: pointer; white-space: nowrap; flex-shrink: 0; }
.wka-dev-seg button.on { border-color: var(--wka-accent); color: var(--wka-accent-ink); background: var(--wka-accent-soft); font-weight: 600; }
.wka-dev-seg button:focus-visible { outline: 2px solid var(--wka-accent); outline-offset: 1px; }
.wka-dev-otp { max-width: 220px; letter-spacing: 0.35em; font-size: 18px; text-align: center; }
.wka-dev-del { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; padding: 7px 0; border-top: 1px solid var(--wka-line); font-size: 12.5px; min-width: 0; }
.wka-dev-del:first-of-type { border-top: 0; }
.wka-dev-del .ev { flex: 1 1 160px; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--wka-text); }
.wka-dev-del .meta { color: var(--wka-faint); font-size: 11.5px; white-space: nowrap; flex-shrink: 0; }
.wka-dev-del .err { flex-basis: 100%; font-size: 11.5px; color: var(--wka-red); overflow-wrap: anywhere; }
.wka-dev-inline-err { font-size: 12.5px; color: var(--wka-red); display: flex; gap: 6px; align-items: flex-start; }
.wka-dev-inline-err svg { flex-shrink: 0; margin-top: 2px; }
.wka-dev-toggle { display: inline-flex; align-items: center; gap: 8px; font-size: 12.5px; color: var(--wka-muted); cursor: pointer; white-space: nowrap; }
.wka-dev-toggle .track { width: 36px; height: 20px; border-radius: 999px; background: var(--wka-line-2); position: relative; transition: background 0.15s; flex-shrink: 0; }
.wka-dev-toggle .track .knob { position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 50%; background: var(--wka-panel); transition: left 0.15s; }
.wka-dev-toggle.on .track { background: var(--wka-accent); }
.wka-dev-toggle.on .track .knob { left: 18px; }
.wka-dev-toggle.busy { opacity: 0.6; cursor: progress; }
@media (max-width: 640px) {
  .wka-dev-head { flex-wrap: wrap; row-gap: 6px; }
  .wka-dev-title { order: 1; }
  .wka-dev-chev { order: 2; }
  .wka-dev-chips { order: 3; flex-basis: 100%; flex-wrap: wrap; padding-left: 24px; }
  .wka-dev-secret-row { flex-direction: column; align-items: stretch; }
}
`
