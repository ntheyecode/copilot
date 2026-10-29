// Teach studio styles, layered on top of WORKADMIN_CSS. Everything is scoped
// under `.wka` so it consumes the shared admin design tokens (colors, fonts,
// spacing) and follows Light / Dark / Heavy exactly like the console around it.
// Verified clean (no overflow / wrap / clip / horizontal scroll) at ~1280px and
// ~640px per the design-time quality gate.
export const TEACH_CSS = `
.wka .tch-content { max-width: 1060px; }

/* brand block + section title (mirrors the exec dashboard's white-label head) */
.wka .tch-brandblock { display:flex; align-items:center; gap:14px; min-width:0; margin-bottom:6px; }
.wka .tch-ikon { width:44px; height:44px; border-radius:11px; display:grid; place-items:center; flex:0 0 auto;
  background:var(--wka-accent-soft); border:1px solid var(--wka-accent-line); color:var(--wka-accent-dark); }
.wka .tch-brand-txt { min-width:0; }
.wka .tch-eyebrow { display:block; font-size:11px; font-weight:700; letter-spacing:1.2px; text-transform:uppercase;
  color:var(--wka-faint); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:100%; }
.wka .tch-brandblock .wka-h1 { margin:1px 0 0; }

/* count chips in the list toolbar */
.wka .tch-counts { display:inline-flex; gap:8px; flex-wrap:wrap; align-items:center; }
.wka .tch-count { display:inline-flex; align-items:center; gap:6px; font-size:12px; color:var(--wka-muted); white-space:nowrap; }
.wka .tch-count b { color:var(--wka-text); font-variant-numeric:tabular-nums; }

/* workflow list: collapsed expandable rows */
.wka .tch-rows { display:flex; flex-direction:column; gap:10px; }
.wka .tch-row { border:1px solid var(--wka-line); border-radius:12px; background:var(--wka-panel); overflow:hidden; }
.wka .tch-row.open { border-color:var(--wka-accent-line); box-shadow:0 1px 2px rgba(26,31,54,0.05); }
.wka .tch-rowhead { display:flex; align-items:center; gap:12px; width:100%; text-align:left; border:0; background:none;
  cursor:pointer; font:inherit; color:inherit; padding:13px 16px; min-width:0; }
.wka .tch-rowhead:hover { background:var(--wka-panel-2); }
.wka .tch-chev { flex:0 0 auto; color:var(--wka-faint); transition:transform .18s ease; }
.wka .tch-row.open .tch-chev { transform:rotate(90deg); }
.wka .tch-rowmain { min-width:0; flex:1 1 auto; }
.wka .tch-rowtitle { display:block; font-weight:600; color:var(--wka-text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.wka .tch-rowsub { display:block; font-size:12px; color:var(--wka-faint); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-top:2px; }
.wka .tch-rowmeta { display:inline-flex; align-items:center; gap:10px; flex:0 0 auto; }
.wka .tch-ver { font-size:11.5px; color:var(--wka-faint); font-variant-numeric:tabular-nums; white-space:nowrap; }
.wka .tch-rowbody { padding:4px 16px 16px; border-top:1px solid var(--wka-line); }
.wka .tch-detail { display:grid; grid-template-columns:repeat(auto-fit, minmax(190px, 1fr)); gap:8px 20px; margin:12px 0 4px; }
.wka .tch-detrow { display:flex; gap:10px; min-width:0; font-size:12.5px; padding:5px 0; border-bottom:1px solid var(--wka-line); }
.wka .tch-detk { color:var(--wka-faint); flex:0 0 auto; min-width:92px; }
.wka .tch-detv { color:var(--wka-text); min-width:0; overflow-wrap:anywhere; }
.wka .tch-steplist { list-style:none; margin:10px 0 0; padding:0; display:flex; flex-direction:column; gap:7px; counter-reset:tch; }
.wka .tch-steplist li { display:flex; gap:10px; font-size:13px; color:var(--wka-text); }
.wka .tch-steplist li::before { counter-increment:tch; content:counter(tch); flex:0 0 auto; width:20px; height:20px; border-radius:6px;
  display:grid; place-items:center; font-size:11px; font-weight:700; background:var(--wka-accent-soft); color:var(--wka-accent-dark); }
.wka .tch-rowacts { display:flex; flex-wrap:wrap; gap:8px; margin-top:14px; }
.wka .tch-rowacts .wka-btn { white-space:nowrap; flex:0 0 auto; }

/* guided wizard: stepper + panel */
.wka .tch-stepper { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:18px; }
.wka .tch-step { display:inline-flex; align-items:center; gap:8px; padding:7px 13px; border-radius:999px; border:1px solid var(--wka-line);
  background:var(--wka-panel); color:var(--wka-muted); font-size:12.5px; font-weight:600; white-space:nowrap; }
.wka .tch-step .n { width:19px; height:19px; border-radius:50%; display:grid; place-items:center; font-size:11px; flex:0 0 auto;
  background:var(--wka-panel-2); color:var(--wka-faint); }
.wka .tch-step.on { border-color:var(--wka-accent-line); background:var(--wka-accent-soft); color:var(--wka-accent-dark); }
.wka .tch-step.on .n { background:var(--wka-solid); color:var(--wka-on-solid); }
.wka .tch-step.done .n { background:var(--wka-accent); color:#fff; }

/* a friendly reflection line ("You're teaching: ...") */
.wka .tch-reflect { display:flex; align-items:flex-start; gap:9px; padding:11px 14px; border-radius:10px; margin:2px 0 16px;
  background:var(--wka-accent-soft); border:1px solid var(--wka-accent-line); color:var(--wka-accent-dark); font-size:13px; line-height:1.5; }
.wka .tch-reflect svg { flex:0 0 auto; margin-top:1px; }
.wka .tch-reflect b { color:var(--wka-accent-dark); }

.wka .tch-phase-lead { color:var(--wka-muted); font-size:13px; margin:0 0 16px; line-height:1.55; }
.wka .tch-full { grid-column:1 / -1; }
.wka .tch-req { color:var(--wka-accent-dark); font-weight:700; }

/* steps editor rows */
.wka .tch-editsteps { display:flex; flex-direction:column; gap:12px; }
.wka .tch-editstep { border:1px solid var(--wka-line); border-radius:12px; padding:14px; background:var(--wka-panel-2); }
.wka .tch-editstep-head { display:flex; align-items:center; gap:10px; margin-bottom:10px; }
.wka .tch-editstep-n { width:24px; height:24px; border-radius:7px; display:grid; place-items:center; flex:0 0 auto;
  font-size:12px; font-weight:700; background:var(--wka-accent-soft); color:var(--wka-accent-dark); }
.wka .tch-editstep-ttl { font-weight:600; font-size:13px; color:var(--wka-text); }
.wka .tch-editstep-tools { margin-left:auto; display:inline-flex; gap:4px; flex:0 0 auto; }
.wka .tch-editstep-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
@media (max-width:760px){ .wka .tch-editstep-grid { grid-template-columns:1fr; } }

/* review summary */
.wka .tch-review { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
@media (max-width:760px){ .wka .tch-review { grid-template-columns:1fr; } }
.wka .tch-missing { display:flex; align-items:flex-start; gap:9px; padding:11px 14px; border-radius:10px; margin:0 0 14px;
  background:var(--wka-tint-amber); border:1px solid var(--wka-line); color:var(--wka-tint-amber-ink); font-size:13px; line-height:1.5; }
.wka .tch-missing svg { flex:0 0 auto; margin-top:1px; }

/* wizard footer actions */
.wka .tch-wizfoot { display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-top:20px; padding-top:16px; border-top:1px solid var(--wka-line); }
.wka .tch-wizfoot .wka-spacer { flex:1 1 auto; }
.wka .tch-wizfoot .wka-btn { white-space:nowrap; flex:0 0 auto; }

.wka .tch-spin { animation:wka-spin 0.8s linear infinite; }

/* not-authorized / scope state */
.wka .tch-scope { max-width:560px; margin:24px auto 0; text-align:center; }
.wka .tch-scope-actions { display:flex; flex-wrap:wrap; justify-content:center; gap:10px; margin-top:18px; }
.wka .tch-scope-actions .wka-btn { white-space:nowrap; flex:0 0 auto; }

@media (max-width:560px){
  .wka .tch-brandblock .wka-h1 { font-size:20px; }
  .wka .tch-rowmeta .tch-ver { display:none; }
}
`
