// Workflow issues inbox styles, layered on WORKADMIN_CSS. Scoped under `.wka`
// and token-driven, so Light / Dark / Heavy follow the console exactly like the
// Teach studio and the executive dashboard. Chips, badges and buttons never
// wrap or shrink (white-space:nowrap; flex-shrink:0); at narrow widths the row
// meta drops under the title instead of squeezing. Verified by rendering at
// ~1280px and ~640px (design-time quality gate).
export const INCIDENTS_CSS = `
.wka .wfi-content { max-width: 1060px; }

/* brand block + title (same head as the Teach studio) */
.wka .wfi-brandblock { display:flex; align-items:center; gap:14px; min-width:0; margin-bottom:6px; }
.wka .wfi-ikon { width:44px; height:44px; border-radius:11px; display:grid; place-items:center; flex:0 0 auto;
  background:var(--wka-accent-soft); border:1px solid var(--wka-accent-line); color:var(--wka-accent-dark); }
.wka .wfi-brand-txt { min-width:0; }
.wka .wfi-eyebrow { display:block; font-size:11px; font-weight:700; letter-spacing:1.2px; text-transform:uppercase;
  color:var(--wka-faint); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:100%; }
.wka .wfi-brandblock .wka-h1 { margin:1px 0 0; }
.wka .wfi-top-link { white-space:nowrap; flex:0 0 auto; }

/* tints shared by chips and badges */
.wka .wfi-t-blue { color:var(--wka-tint-blue-ink); background:var(--wka-tint-blue); }
.wka .wfi-t-green { color:var(--wka-tint-green-ink); background:var(--wka-tint-green); }
.wka .wfi-t-amber { color:var(--wka-tint-amber-ink); background:var(--wka-tint-amber); }
.wka .wfi-t-red { color:var(--wka-red); background:var(--wka-danger-fill); }
.wka .wfi-t-neutral { color:var(--wka-tint-neutral-ink); background:var(--wka-tint-neutral); }

/* summary chips */
.wka .wfi-chips { display:flex; flex-wrap:wrap; gap:8px; margin:4px 0 16px; padding:0; list-style:none; }
.wka .wfi-chip { display:inline-flex; align-items:center; gap:7px; height:30px; padding:0 12px; border-radius:999px;
  font-size:12.5px; font-weight:600; white-space:nowrap; flex:0 0 auto; }
.wka .wfi-chip b { font-variant-numeric:tabular-nums; font-size:13.5px; }

/* filters: segmented state + workflow select */
.wka .wfi-seg { display:inline-flex; background:var(--wka-panel-2); border:1px solid var(--wka-line-2);
  border-radius:999px; padding:3px; gap:2px; flex-shrink:0; }
.wka .wfi-seg-btn { border:0; background:transparent; color:var(--wka-muted); font:inherit; font-size:12.5px;
  font-weight:600; padding:6px 13px; border-radius:999px; cursor:pointer; white-space:nowrap; }
.wka .wfi-seg-btn:hover { color:var(--wka-text); }
.wka .wfi-seg-btn.is-on { background:var(--wka-solid); color:var(--wka-on-solid); }
.wka .wfi-seg-btn:focus-visible { outline:2px solid var(--wka-accent); outline-offset:2px; }
.wka .wfi-wfsel { max-width:260px; min-width:0; flex:0 1 auto; }
.wka .wfi-toolbar .wka-btn { white-space:nowrap; flex:0 0 auto; }

.wka .wfi-readonly { display:flex; gap:9px; align-items:flex-start; margin:0 0 14px; padding:10px 14px; border-radius:10px;
  background:var(--wka-tint-blue); color:var(--wka-tint-blue-ink); font-size:12.5px; line-height:1.5; }
.wka .wfi-readonly svg { flex:0 0 auto; margin-top:2px; }
.wka .wfi-toast { display:flex; gap:9px; align-items:center; flex-wrap:wrap; margin:0 0 14px; padding:10px 14px; border-radius:10px;
  background:var(--wka-tint-green); color:var(--wka-tint-green-ink); font-size:13px; }
.wka .wfi-toast > svg { flex:0 0 auto; }
.wka .wfi-toast .wka-btn { white-space:nowrap; flex:0 0 auto; }
.wka .wfi-toast .wfi-toast-x { margin-left:auto; }
.wka .wfi-toast-t { min-width:0; flex:1 1 220px; }

/* "New since your last visit" */
.wka .wfi-news { border:1px solid var(--wka-accent-line); background:var(--wka-accent-soft); border-radius:12px;
  padding:12px 16px; margin:0 0 16px; }
.wka .wfi-news h2 { display:flex; align-items:center; gap:8px; margin:0 0 8px; font-family:var(--wka-font-head);
  font-size:14px; font-weight:700; color:var(--wka-text); }
.wka .wfi-news h2 svg { color:var(--wka-accent-dark); flex:0 0 auto; }
.wka .wfi-news ul { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:4px; }
.wka .wfi-news li { display:flex; align-items:center; gap:10px; min-width:0; font-size:13px; color:var(--wka-text); }
.wka .wfi-news-t { min-width:0; flex:1 1 auto; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.wka .wfi-news-when { color:var(--wka-faint); font-size:12px; white-space:nowrap; flex:0 0 auto; }
.wka .wfi-news .wka-btn { white-space:nowrap; flex:0 0 auto; }
.wka .wfi-news-more { font-size:12px; color:var(--wka-muted); margin-top:4px; }

/* incident rows: collapsed, expand on click */
.wka .wfi-rows { display:flex; flex-direction:column; gap:10px; }
.wka .wfi-row { border:1px solid var(--wka-line); border-radius:12px; background:var(--wka-panel); overflow:hidden; scroll-margin-top:16px; }
.wka .wfi-row.open { border-color:var(--wka-accent-line); box-shadow:0 1px 2px rgba(26,31,54,0.05); }
.wka .wfi-rowhead { display:flex; align-items:center; gap:12px; width:100%; text-align:left; border:0; background:none;
  cursor:pointer; font:inherit; color:inherit; padding:13px 16px; min-width:0; }
.wka .wfi-rowhead:hover { background:var(--wka-panel-2); }
.wka .wfi-rowhead:focus-visible { outline:2px solid var(--wka-accent); outline-offset:-2px; }
.wka .wfi-chev { flex:0 0 auto; color:var(--wka-faint); transition:transform .18s ease; }
.wka .wfi-row.open .wfi-chev { transform:rotate(90deg); }
[dir='rtl'] .wka .wfi-chev { transform:scaleX(-1); }
[dir='rtl'] .wka .wfi-row.open .wfi-chev { transform:rotate(90deg); }
.wka .wfi-rowmain { min-width:0; flex:1 1 auto; }
.wka .wfi-rowtitle { display:flex; align-items:baseline; gap:8px; min-width:0; }
.wka .wfi-rowtitle b { font-weight:600; color:var(--wka-text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; min-width:0; }
.wka .wfi-ver { font-size:11.5px; color:var(--wka-faint); font-variant-numeric:tabular-nums; white-space:nowrap; flex:0 0 auto; }
.wka .wfi-rowsub { display:block; font-size:12.5px; color:var(--wka-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-top:3px; }
.wka .wfi-rowsub .n { font-weight:600; color:var(--wka-text); }
.wka .wfi-rowmeta { display:flex; align-items:center; gap:8px; flex:0 0 auto; }
.wka .wfi-badge { display:inline-flex; align-items:center; gap:5px; height:22px; padding:0 9px; border-radius:999px;
  font-size:11.5px; font-weight:600; white-space:nowrap; flex:0 0 auto; line-height:1; }
.wka .wfi-badge svg { flex:0 0 auto; }
.wka .wfi-count, .wka .wfi-when { font-size:12px; color:var(--wka-muted); white-space:nowrap; flex:0 0 auto; font-variant-numeric:tabular-nums; }
.wka .wfi-when { color:var(--wka-faint); }

/* expanded body */
.wka .wfi-body { padding:4px 16px 16px; border-top:1px solid var(--wka-line); }
.wka .wfi-grid { display:grid; grid-template-columns:minmax(0,1fr) 300px; gap:20px; margin-top:12px; }
.wka .wfi-grid.no-shot { grid-template-columns:minmax(0,1fr); }
.wka .wfi-sec { margin:0 0 14px; min-width:0; }
.wka .wfi-sec:last-child { margin-bottom:0; }
.wka .wfi-k { display:block; font-size:11px; font-weight:700; letter-spacing:.05em; text-transform:uppercase; color:var(--wka-faint); margin-bottom:5px; }
.wka .wfi-v { font-size:13.5px; line-height:1.55; color:var(--wka-text); overflow-wrap:anywhere; margin:0; }
.wka .wfi-suggest { border:1px solid var(--wka-accent-line); background:var(--wka-accent-soft); border-radius:10px; padding:10px 12px; }
.wka .wfi-suggest .wfi-v { font-weight:600; }
.wka .wfi-hint { font-size:12px; line-height:1.5; color:var(--wka-muted); margin:5px 0 0; }
.wka .wfi-occ { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:6px; }
.wka .wfi-occ li { display:flex; gap:10px; align-items:baseline; min-width:0; font-size:12.5px; }
.wka .wfi-occ-name { font-weight:600; color:var(--wka-text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:45%; flex:0 1 auto; }
.wka .wfi-occ-when { color:var(--wka-faint); white-space:nowrap; flex:0 0 auto; }
.wka .wfi-occ-why { color:var(--wka-muted); min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1 1 auto; }
.wka .wfi-decided { font-size:12.5px; color:var(--wka-muted); line-height:1.5; }
.wka .wfi-decided q { color:var(--wka-text); }

/* screenshot thumbnail + larger view */
.wka .wfi-shot { display:block; width:100%; padding:0; border:1px solid var(--wka-line-2); border-radius:10px; overflow:hidden;
  background:var(--wka-panel-2); cursor:zoom-in; position:relative; }
.wka .wfi-shot img { display:block; width:100%; height:auto; max-height:200px; object-fit:cover; object-position:top left; }
.wka .wfi-shot:focus-visible { outline:2px solid var(--wka-accent); outline-offset:2px; }
.wka .wfi-shot-zoom { position:absolute; right:8px; bottom:8px; width:28px; height:28px; border-radius:8px; display:grid; place-items:center;
  background:var(--wka-panel); color:var(--wka-text); border:1px solid var(--wka-line-2); }
.wka .wfi-shot-broken { display:flex; gap:9px; align-items:flex-start; padding:14px; border:1px dashed var(--wka-line-2); border-radius:10px;
  color:var(--wka-muted); font-size:12.5px; line-height:1.5; background:var(--wka-panel-2); }
.wka .wfi-shot-broken svg { flex:0 0 auto; margin-top:2px; }
.wka .wfi-flag { display:flex; gap:7px; align-items:flex-start; margin-top:8px; font-size:12px; line-height:1.45; color:var(--wka-tint-amber-ink); }
.wka .wfi-flag svg { flex:0 0 auto; margin-top:1px; }
.wfi-lightbox { position:fixed; inset:0; z-index:1000; display:grid; place-items:center; padding:24px;
  background:rgba(12,18,28,0.72); backdrop-filter:blur(2px); }
.wfi-lightbox img { max-width:min(1200px, 100%); max-height:calc(100vh - 96px); border-radius:10px; box-shadow:0 20px 50px -20px rgba(0,0,0,.6); background:#fff; }
.wfi-lightbox .wka-btn { position:absolute; top:16px; right:16px; white-space:nowrap; }

/* actions */
.wka .wfi-acts { display:flex; flex-wrap:wrap; gap:8px; margin-top:16px; padding-top:14px; border-top:1px solid var(--wka-line); align-items:center; }
.wka .wfi-acts .wka-btn { white-space:nowrap; flex:0 0 auto; }
.wka .wfi-notebox { width:100%; margin-top:12px; padding:12px; border:1px solid var(--wka-line-2); border-radius:10px; background:var(--wka-panel-2); }
.wka .wfi-notebox textarea { width:100%; min-height:64px; resize:vertical; box-sizing:border-box; font:inherit; font-size:13px; padding:8px 10px;
  border-radius:9px; border:1px solid var(--wka-line-2); background:var(--wka-panel); color:var(--wka-text); }
.wka .wfi-notebox textarea:focus { outline:none; border-color:var(--wka-accent); box-shadow:0 0 0 3px var(--wka-accent-soft); }
.wka .wfi-notebox label { display:block; font-size:12px; color:var(--wka-muted); margin-bottom:6px; }
.wka .wfi-notebox-acts { display:flex; flex-wrap:wrap; gap:8px; justify-content:flex-end; margin-top:10px; }
.wka .wfi-notebox-acts .wka-btn { white-space:nowrap; flex:0 0 auto; }
.wka .wfi-rowerr { margin-top:12px; }
.wka .wfi-spin { animation:wka-spin 0.8s linear infinite; }

/* gate + empty */
.wka .wfi-scope { max-width:560px; margin:24px auto 0; text-align:center; }
.wka .wfi-scope-body { margin-top:6px; font-size:14px; line-height:1.6; color:var(--wka-muted); overflow-wrap:anywhere; }
.wka .wfi-scope-actions { display:flex; flex-wrap:wrap; justify-content:center; gap:10px; margin-top:18px; }
.wka .wfi-scope-actions .wka-btn { white-space:nowrap; flex:0 0 auto; }

@media (max-width: 760px) {
  .wka .wfi-rowhead { flex-wrap:wrap; row-gap:8px; }
  .wka .wfi-rowmain { flex-basis:calc(100% - 40px); }
  .wka .wfi-rowmeta { flex-wrap:wrap; padding-left:28px; flex:1 1 100%; }
  .wka .wfi-grid { grid-template-columns:minmax(0,1fr); }
  .wka .wfi-shot img { max-height:240px; }
  .wka .wfi-wfsel { max-width:100%; flex:1 1 180px; }
  .wka .wfi-top-link span { display:none; }
}
@media (max-width: 560px) {
  .wka .wfi-brandblock .wka-h1 { font-size:20px; }
  .wka .wfi-seg-btn { padding:6px 10px; }
  .wka .wfi-news li { flex-wrap:wrap; row-gap:2px; }
  .wka .wfi-news-t { flex-basis:100%; white-space:normal; }
}
`
