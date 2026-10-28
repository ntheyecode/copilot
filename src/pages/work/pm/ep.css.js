// Styles for the enterprise project-management surfaces (src/pages/work/pm/*),
// namespaced wd-ep-* on the .wd tokens (workApp.css.js). The chips, pill
// buttons, progress bar, modal shell and task-row recipes are REUSED from the
// Projects sheet (projects.css.js, injected alongside), so nothing is restyled
// twice. Design law: white, minimal; every chip / pill / action is nowrap +
// flex-shrink:0, the flexible text column is the only thing that gives, and at
// narrow widths rows stack instead of overflowing (no sideways scroll). Status
// colors: done = the primary brand (--em), ongoing = the secondary (--em-2),
// held = the amber warning (--warm); every fill is a token.
export const EP_CSS = `
.wd-ep{display:flex;flex-direction:column;gap:18px;min-width:0}
.wd-ep .wd-sec{margin-bottom:0;min-width:0}
.wd-ep .wd-sec>div{min-width:0;flex:1 1 auto}
.wd-ep-head-act{margin-left:auto;align-self:center}
.wd-ep-head-act .short{display:none}
.wd-ep-note{display:flex;gap:9px;align-items:flex-start;padding:10px 12px;border-radius:12px;background:var(--info-fill);border:1px solid var(--info-line);font-size:12.5px;line-height:1.5;color:var(--tx)}
.wd-ep-note svg{flex:none;margin-top:2px;color:var(--info)}
.wd-ep-note.warn{background:var(--warm-fill);border-color:var(--warm-line)}
.wd-ep-note.warn svg{color:var(--warm)}
/* Filter chips: one row, wraps whole chips, never a chip's text. */
.wd-ep-filters{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.wd-ep-filter{display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 11px;border-radius:999px;border:1px solid var(--line);background:var(--panel);color:var(--tx-2);font:inherit;font-size:12.5px;font-weight:600;cursor:pointer;white-space:nowrap;flex-shrink:0;transition:background .15s,border-color .15s,color .15s}
.wd-ep-filter:hover{border-color:var(--line-2);background:var(--line-soft)}
.wd-ep-filter.on{background:var(--em-fill);border-color:var(--em-line);color:var(--em-deep)}
.wd-ep-filter b{font-weight:700;font-variant-numeric:tabular-nums;color:var(--mut);font-size:11.5px}
.wd-ep-filter.on b{color:var(--em-deep)}
/* Status chips reuse .wd-pj-chip; the three project statuses add their color. */
.wd-pj-chip.ongoing{color:var(--em-2-deep);background:var(--info-fill);border-color:var(--info-line)}
.wd-pj-chip.held{color:var(--warm);background:var(--warm-fill);border-color:var(--warm-line)}
.wd-pj-chip.sla{color:var(--warm);background:var(--warm-fill);border-color:var(--warm-line)}
.wd-pj-chip.risk-sla_breach{color:var(--warm);background:var(--warm-fill);border-color:var(--warm-line)}
.wd-pj-chip.risk-project_held{color:var(--warm);background:var(--warm-fill);border-color:var(--warm-line)}
.wd-pj-chip.risk-unassigned_idle{color:var(--em-2-deep);background:var(--info-fill);border-color:var(--info-line)}
.wd-pj-chip.person{color:var(--tx-2);max-width:220px}
.wd-pj-chip.person span{overflow:hidden;text-overflow:ellipsis}
.wd-pj-chip.person.none{color:var(--mut);border-style:dashed;background:var(--panel)}

/* ---- Stat tiles: one tinted borderless tile per number ---- */
.wd-ep-tiles{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
.wd-ep-tile{display:flex;flex-direction:column;gap:2px;padding:14px 16px;border-radius:var(--r);background:var(--tint-neutral);min-width:0}
.wd-ep-tile.green{background:var(--tint-green)}
.wd-ep-tile.blue{background:var(--tint-blue)}
.wd-ep-tile.amber{background:var(--tint-amber)}
.wd-ep-tile-v{font-family:var(--wd-display);font-weight:800;font-size:calc(24px*var(--wc-fs,1));line-height:1.1;letter-spacing:-.02em;color:var(--tx);font-variant-numeric:tabular-nums}
.wd-ep-tile.green .wd-ep-tile-v{color:var(--tint-green-ink)}
.wd-ep-tile.blue .wd-ep-tile-v{color:var(--tint-blue-ink)}
.wd-ep-tile.amber .wd-ep-tile-v{color:var(--tint-amber-ink)}
.wd-ep-tile-l{font-size:12.5px;font-weight:600;color:var(--mut-2);line-height:1.3;overflow-wrap:anywhere}
.wd-ep-tile-s{font-size:11.5px;color:var(--mut);line-height:1.35}

/* ---- Stacked share bar + legend (status split) ---- */
.wd-ep-stack{display:flex;height:14px;border-radius:999px;overflow:hidden;background:var(--track);gap:2px}
.wd-ep-stack>i{display:block;height:100%;min-width:0;transition:width .35s ease}
.wd-ep-stack>i.done,.wd-ep-legend i.done,.wd-ep-bar-fill.done{background:var(--em)}
.wd-ep-stack>i.ongoing,.wd-ep-legend i.ongoing,.wd-ep-bar-fill.ongoing{background:var(--em-2)}
.wd-ep-stack>i.held,.wd-ep-legend i.held,.wd-ep-bar-fill.held{background:var(--warm)}
.wd-ep-legend{display:flex;flex-wrap:wrap;gap:6px 16px;margin-top:10px}
.wd-ep-legend>span{display:inline-flex;align-items:center;gap:7px;font-size:12.5px;color:var(--mut);white-space:nowrap}
.wd-ep-legend i{width:10px;height:10px;border-radius:3px;flex-shrink:0}
.wd-ep-legend b{color:var(--tx);font-variant-numeric:tabular-nums;font-weight:700}
/* ---- Ranked horizontal bars (load per manager) ---- */
.wd-ep-bars{display:flex;flex-direction:column;gap:9px}
.wd-ep-bar{display:grid;grid-template-columns:minmax(90px,170px) 1fr auto;align-items:center;gap:10px;min-width:0}
.wd-ep-bar-l{font-size:13px;font-weight:600;color:var(--tx);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wd-ep-bar-l small{display:block;font-size:11.5px;font-weight:500;color:var(--mut);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wd-ep-bar-track{height:10px;border-radius:999px;background:var(--track);overflow:hidden;min-width:40px}
.wd-ep-bar-fill{display:block;height:100%;border-radius:999px;background:var(--em-2);transition:width .35s ease}
.wd-ep-bar-v{font-size:12.5px;font-weight:700;color:var(--tx-2);font-variant-numeric:tabular-nums;white-space:nowrap;text-align:right}
.wd-ep-chart{padding:16px 18px;display:flex;flex-direction:column;gap:12px}
.wd-ep-chart .wd-sec{margin:0}
.wd-ep-two{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}

/* ---- Project grid (shared card) ---- */
.wd-ep-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.wd-ep-card-meta{display:flex;align-items:center;gap:6px 10px;flex-wrap:wrap;font-size:12.5px;color:var(--mut);min-width:0}
.wd-ep-card-meta span{display:inline-flex;align-items:center;gap:5px;white-space:nowrap}
.wd-ep-card-meta svg{flex-shrink:0}
.wd-ep-card-mgr{min-width:0;overflow:hidden;text-overflow:ellipsis}

/* ---- Roll-up groups (Sr PM) ---- */
.wd-ep-group{display:flex;flex-direction:column;gap:10px}
.wd-ep-group-head{display:flex;align-items:center;gap:10px;min-width:0;flex-wrap:wrap}
.wd-ep-group-head .wd-ic{width:32px;height:32px;border-radius:var(--r-xs)}
.wd-ep-group-head b{font-family:var(--wd-display);font-weight:700;font-size:15.5px;letter-spacing:-.01em;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wd-ep-group-head small{font-size:12.5px;color:var(--mut);white-space:nowrap}

/* ---- Project view head + counts ---- */
.wd-ep-view-head{display:flex;flex-direction:column;gap:8px;min-width:0}
.wd-ep-view-row{display:flex;align-items:center;gap:10px;min-width:0;flex-wrap:wrap}
.wd-ep-view-head h1{font-family:var(--wd-display);font-weight:700;font-size:24px;letter-spacing:-.015em;line-height:1.25;min-width:0;overflow-wrap:anywhere}
.wd-ep-view-goal{font-size:14px;color:var(--mut);line-height:1.55;max-width:76ch;overflow-wrap:anywhere}
.wd-ep-view-acts{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.wd-ep-view-acts .sp{flex:1 1 auto}
.wd-ep-prog{display:flex;align-items:center;gap:12px;min-width:0}

/* ---- Task + assignee rows ---- */
.wd-ep-tasks{display:flex;flex-direction:column;gap:8px;min-width:0}
.wd-ep-task{display:flex;gap:12px;align-items:flex-start;padding:13px 14px 13px 12px;min-width:0}
.wd-ep-task.inProgress{border-color:var(--info-line)}
.wd-ep-task.completed{border-color:var(--em-line)}
/* flex-basis 0 (not auto): in a wrapping row a long title must shrink into the
   column, never push the whole column under the icon tile. */
.wd-ep-task-main{flex:1 1 0;min-width:0;display:flex;flex-direction:column;gap:6px}
.wd-ep-task-row{display:flex;align-items:center;gap:8px;min-width:0;flex-wrap:wrap}
.wd-ep-task-t{font-weight:650;font-size:14.5px;line-height:1.35;color:var(--tx);min-width:0;flex:1 1 160px;overflow-wrap:anywhere}
.wd-ep-task-d{font-size:13px;color:var(--mut);line-height:1.5;overflow-wrap:anywhere}
.wd-ep-task-who{display:flex;align-items:center;gap:6px 10px;flex-wrap:wrap;min-width:0;font-size:12.5px;color:var(--mut)}
.wd-ep-task-who .pbtn{display:inline-flex;align-items:center;gap:5px;background:none;border:none;padding:0;font:inherit;font-size:12.5px;font-weight:600;color:var(--em-2);cursor:pointer;text-decoration:underline;text-underline-offset:3px;text-decoration-color:color-mix(in srgb,var(--em-2) 40%,transparent);min-width:0;max-width:100%}
.wd-ep-task-who .pbtn span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wd-ep-task-who .pbtn svg{flex-shrink:0}
.wd-ep-task-acts{display:flex;align-items:center;gap:6px;flex-shrink:0;flex-wrap:wrap;justify-content:flex-end;max-width:100%}
.wd-ep-task-acts .wd-pj-select{max-width:200px;height:32px}
.wd-ep-task-alert{display:flex;gap:8px;align-items:flex-start;font-size:12.5px;line-height:1.5;color:var(--tx);padding:8px 11px;border-radius:10px;background:var(--warm-fill);border:1px solid var(--warm-line)}
.wd-ep-task-alert svg{flex-shrink:0;margin-top:2px;color:var(--warm)}

/* ---- Worker queue rows ---- */
.wd-ep-queue{display:flex;flex-direction:column;gap:8px;min-width:0}
.wd-ep-q{display:flex;align-items:center;gap:12px;padding:12px 14px;min-width:0;flex-wrap:wrap}
.wd-ep-q-main{flex:1 1 0;min-width:0;display:flex;flex-direction:column;gap:3px}
.wd-ep-q-t{font-weight:600;font-size:14px;line-height:1.35;color:var(--tx);overflow-wrap:anywhere}
.wd-ep-q-m{display:flex;align-items:center;gap:6px 10px;flex-wrap:wrap;font-size:12.5px;color:var(--mut);min-width:0}
.wd-ep-q-m span{white-space:nowrap}
.wd-ep-q-m .proj{min-width:0;overflow:hidden;text-overflow:ellipsis;max-width:100%}
.wd-ep-q-alert{flex-basis:100%;display:flex;gap:8px;align-items:flex-start;font-size:12.5px;line-height:1.5;color:var(--tx);padding:8px 11px;border-radius:10px;background:var(--warm-fill);border:1px solid var(--warm-line)}
.wd-ep-q-alert svg{flex-shrink:0;margin-top:2px;color:var(--warm)}
.wd-ep-q-more{display:inline-flex;align-items:center;gap:7px;flex-shrink:0;white-space:nowrap;align-self:flex-start;margin-top:2px;color:var(--em-deep);font-size:13px;font-weight:600;text-decoration:none;padding:6px 2px}
.wd-ep-q-more:hover{color:var(--em)}

/* ---- Productivity panel ---- */
.wd-ep-prod{display:flex;flex-direction:column;gap:14px;min-width:0}
.wd-ep-prod-time{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;font-size:13px;color:var(--mut)}
.wd-ep-prod-time b{font-family:var(--wd-display);font-weight:800;font-size:22px;letter-spacing:-.02em;color:var(--tx);font-variant-numeric:tabular-nums}
.wd-ep-prod-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}
.wd-ep-prod-list li{display:flex;gap:8px;align-items:flex-start;font-size:13.5px;color:var(--tx-2);line-height:1.45;min-width:0}
.wd-ep-prod-list li svg{flex-shrink:0;margin-top:3px;color:var(--info)}
.wd-ep-prod-list li span{min-width:0;overflow-wrap:anywhere}
.wd-ep-prod-list li small{color:var(--mut)}
.wd-ep-people{display:flex;flex-direction:column;gap:6px}
.wd-ep-person{display:flex;align-items:center;gap:10px;padding:10px 14px;min-width:0}
.wd-ep-person .nm{flex:1 1 auto;min-width:0;font-weight:600;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wd-ep-person .nm small{display:block;font-weight:500;font-size:12px;color:var(--mut)}

/* ---- Risk register + log ---- */
.wd-ep-risks{display:flex;flex-direction:column;gap:8px}
.wd-ep-risk{display:flex;gap:12px;align-items:flex-start;padding:12px 14px;min-width:0;border-left:4px solid var(--warm)}
.wd-ep-risk.unassigned_idle{border-left-color:var(--em-2)}
.wd-ep-risk-main{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:4px}
.wd-ep-risk-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;min-width:0}
.wd-ep-risk-t{font-weight:650;font-size:14px;color:var(--tx);min-width:0;overflow-wrap:anywhere}
.wd-ep-risk-d{font-size:12.5px;color:var(--mut);line-height:1.5;overflow-wrap:anywhere}
.wd-ep-risk-a{font-size:12.5px;color:var(--tx-2);line-height:1.5}
.wd-ep-risk-a b{font-weight:700;color:var(--em-deep)}
/* The log keeps readable columns (a name never breaks mid-word); on a narrow
   screen the wrapper scrolls sideways instead (its own scroller, never the page). */
.wd-ep-log{width:100%;min-width:620px;border-collapse:collapse;font-size:13px}
.wd-ep-log th{text-align:left;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--faint);padding:6px 10px;border-bottom:1px solid var(--line-soft);white-space:nowrap}
.wd-ep-log td{padding:9px 10px;border-bottom:1px solid var(--line-soft);vertical-align:top;color:var(--tx-2);line-height:1.45;min-width:0}
.wd-ep-log td.when{white-space:nowrap;color:var(--mut);font-variant-numeric:tabular-nums}
.wd-ep-log td.what{white-space:nowrap;font-weight:600;color:var(--tx)}
.wd-ep-log td.by{white-space:nowrap}
.wd-ep-log td.detail{overflow-wrap:anywhere;min-width:200px}
.wd-ep-log tr:last-child td{border-bottom:none}
.wd-ep-log-wrap{overflow-x:auto;border:1px solid var(--line-soft);border-radius:var(--r);background:var(--panel)}
.wd-ep-log-tools{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.wd-ep-log-tools .wd-pj-select{max-width:260px}

/* ---- Modal (reuses .wd-pj-modal shell) ---- */
.wd-ep-modal{width:min(560px,100%)}
.wd-ep-modal-body{display:flex;flex-direction:column;gap:14px}
.wd-ep-modal-body p{font-size:13.5px;color:var(--mut);line-height:1.55}

/* ---- Project templates (TemplatesPage / AssignTemplate / TemplateRollup) ----
   Cards reuse .wd-pj-card; the foot keeps Assign + Progress on one line and
   wraps whole controls at phone width. The people checklist is its own
   scroller (never the page); a row is one line, the name truncates. */
.wd-ep-tiles.five{grid-template-columns:repeat(5,minmax(0,1fr))}
.wd-ep-tpl-foot{flex-wrap:wrap;gap:8px 10px}
.wd-ep-tpl-foot .wd-pj-card-open{margin-left:auto}
.wd-ep-pick-tools{display:flex;align-items:center;gap:4px 8px;flex-wrap:wrap;font-size:12.5px;color:var(--mut);min-width:0}
.wd-ep-pick-tools b{color:var(--tx);font-weight:700;font-variant-numeric:tabular-nums}
.wd-ep-pick-tools .sp{flex:1 1 auto}
.wd-ep-people-pick{display:flex;flex-direction:column;gap:2px;max-height:300px;overflow:auto;border:1px solid var(--line-soft);border-radius:var(--r);padding:6px;background:var(--panel)}
.wd-ep-pick{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:var(--r-xs);cursor:pointer;min-width:0;transition:background .15s}
.wd-ep-pick:hover{background:var(--line-soft)}
.wd-ep-pick.on{background:var(--em-fill)}
.wd-ep-pick input{width:16px;height:16px;flex-shrink:0;margin:0;accent-color:var(--em)}
.wd-ep-pick .nm{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600;font-size:13.5px;color:var(--tx)}
.wd-ep-pick small{color:var(--mut);font-size:11.5px;white-space:nowrap;flex-shrink:0}
.wd-ep-who{display:flex;flex-wrap:wrap;gap:6px}
/* Roll-up table (the control-log recipe): the progress column carries a bar +
   percent, the name truncates in its column. */
.wd-ep-runs{min-width:560px}
.wd-ep-runs td.pct{min-width:170px;width:34%}
.wd-ep-run-nm{display:block;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600;color:var(--tx)}
.wd-ep-runbar{display:flex;align-items:center;gap:10px;min-width:0}
.wd-ep-runbar .wd-pj-bar{min-width:80px}
.wd-ep-runbar b{font-size:12.5px;font-weight:700;color:var(--tx-2);font-variant-numeric:tabular-nums;white-space:nowrap;min-width:38px;text-align:right}

@media(max-width:900px){.wd-ep-grid,.wd-ep-two{grid-template-columns:1fr}.wd-ep-tiles.five{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:640px){
 .wd-ep-head-act .full{display:none}
 .wd-ep-head-act .short{display:inline}
 .wd-ep-tiles,.wd-ep-tiles.five{grid-template-columns:repeat(2,minmax(0,1fr))}
 .wd-ep-tpl-foot .wd-pj-card-open{margin-left:0}
 .wd-ep-task{flex-wrap:wrap}
 .wd-ep-task-acts{flex-basis:100%;justify-content:flex-start;padding-left:42px}
 .wd-ep-task-acts .wd-pj-select{max-width:100%;flex:1 1 140px}
 .wd-ep-bar{grid-template-columns:minmax(70px,110px) 1fr auto;gap:8px}
 .wd-ep-view-acts .wd-pj-btn{flex:1 1 auto;justify-content:center}
 .wd-ep-modal{width:100%}
}
@media(prefers-reduced-motion:reduce){.wd-ep-stack>i,.wd-ep-bar-fill,.wd-ep-filter{transition:none}}
`
