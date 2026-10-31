// Styles for the executive dashboard drill-downs (projects, performers) and the
// executive-only Company Brain export panel. Layered on WORKADMIN_CSS, scoped
// under `.wka`, token-driven so Light / Dark / Heavy follow the console. Verified
// clean (no overflow / wrap / clip / horizontal scroll) at ~1280px and ~640px.
export const EXEC_DRILL_CSS = `
/* project status mini-tiles */
.wka .xd-status { display:grid; grid-template-columns:repeat(3, minmax(0,1fr)); gap:12px; margin-bottom:16px; }
.wka .xd-stat { border:1px solid var(--wka-line); border-radius:11px; padding:12px 14px; background:var(--wka-panel-2); min-width:0; }
.wka .xd-stat .n { font-family:var(--wka-font-head); font-size:22px; font-weight:700; color:var(--wka-text); font-variant-numeric:tabular-nums; }
.wka .xd-stat .l { font-size:12px; color:var(--wka-muted); margin-top:2px; display:flex; align-items:center; gap:6px; }
.wka .xd-stat .l .dot { width:8px; height:8px; border-radius:50%; flex:0 0 auto; }

/* ranked drill-down table */
.wka .xd-table { width:100%; border-collapse:collapse; }
.wka .xd-table th, .wka .xd-table td { padding:9px 10px; font-size:12.5px; text-align:left; border-top:1px solid var(--wka-line); vertical-align:middle; }
.wka .xd-table thead th { border-top:0; font-size:11px; font-weight:700; letter-spacing:.04em; text-transform:uppercase; color:var(--wka-faint); white-space:nowrap; }
.wka .xd-table td.num, .wka .xd-table th.num { text-align:right; font-variant-numeric:tabular-nums; white-space:nowrap; }
.wka .xd-name { font-weight:600; color:var(--wka-text); min-width:0; max-width:240px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.wka .xd-sub { color:var(--wka-faint); font-size:11.5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.wka .xd-prog { display:flex; align-items:center; gap:8px; min-width:120px; }
.wka .xd-prog-track { flex:1 1 auto; height:8px; border-radius:999px; background:var(--wka-line-2); overflow:hidden; min-width:40px; }
.wka .xd-prog-fill { height:100%; border-radius:999px; background:var(--wka-accent); min-width:3px; }
.wka .xd-prog-v { font-size:11.5px; font-weight:700; color:var(--wka-text); font-variant-numeric:tabular-nums; width:34px; text-align:right; flex:0 0 auto; }
.wka .xd-scroll { overflow-x:auto; }

/* two performer columns */
.wka .xd-two { display:grid; grid-template-columns:repeat(2, minmax(0,1fr)); gap:20px; }
@media (max-width:760px){ .wka .xd-two { grid-template-columns:1fr; } .wka .xd-status { grid-template-columns:1fr; } }

/* brain export panel */
.wka .xb-head { display:flex; align-items:flex-start; gap:12px; }
.wka .xb-ikon { width:40px; height:40px; border-radius:11px; display:grid; place-items:center; flex:0 0 auto;
  background:var(--wka-accent-soft); border:1px solid var(--wka-accent-line); color:var(--wka-accent-dark); }
.wka .xb-row { display:flex; gap:10px; flex-wrap:wrap; align-items:flex-end; margin-top:12px; }
.wka .xb-row .wka-field { flex:1 1 220px; min-width:0; }
.wka .xb-row .wka-btn { flex:0 0 auto; white-space:nowrap; }
.wka .xb-actions { display:flex; gap:10px; flex-wrap:wrap; margin-top:14px; }
.wka .xb-actions .wka-btn { white-space:nowrap; flex:0 0 auto; }
.wka .xb-spin { animation:wka-spin 0.8s linear infinite; }
`
