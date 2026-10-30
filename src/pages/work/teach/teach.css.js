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

/* link to the Workflow issues inbox, with a calm unread count */
.wka .tch-issues { white-space:nowrap; flex:0 0 auto; }
.wka .tch-issues-n { min-width:19px; height:19px; padding:0 6px; border-radius:999px; display:inline-grid; place-items:center; font-size:11px; font-weight:700;
  line-height:1; font-variant-numeric:tabular-nums; background:var(--wka-accent-soft); color:var(--wka-accent-dark); border:1px solid var(--wka-accent-line); }

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
.wka .tch-step:disabled { opacity:.5; cursor:not-allowed; }

/* a friendly reflection line ("You're teaching: ...") */
.wka .tch-reflect { display:flex; align-items:flex-start; gap:9px; padding:11px 14px; border-radius:10px; margin:2px 0 16px;
  background:var(--wka-accent-soft); border:1px solid var(--wka-accent-line); color:var(--wka-accent-dark); font-size:13px; line-height:1.5; }
.wka .tch-reflect svg { flex:0 0 auto; margin-top:1px; }
.wka .tch-reflect b { color:var(--wka-accent-dark); }

.wka .tch-phase-lead { color:var(--wka-muted); font-size:13px; margin:0 0 16px; line-height:1.55; }
.wka .tch-full { grid-column:1 / -1; }
.wka .tch-req { color:var(--wka-accent-dark); font-weight:700; }

/* steps editor rows (textareas take the console font, not the UA monospace) */
.wka textarea.wka-input { font-family:inherit; }
.wka .tch-editsteps { display:flex; flex-direction:column; gap:12px; }
.wka .tch-editstep { border:1px solid var(--wka-line); border-radius:12px; padding:14px; background:var(--wka-panel-2); }
.wka .tch-editstep-head { display:flex; align-items:center; gap:10px; min-width:0; }
.wka .tch-editstep.open .tch-editstep-head { margin-bottom:12px; }
.wka .tch-editstep-toggle { display:flex; align-items:center; gap:10px; flex:1 1 auto; min-width:0; border:0; background:none; padding:0;
  font:inherit; color:inherit; text-align:left; cursor:pointer; }
.wka .tch-editstep-toggle:focus-visible { outline:2px solid var(--wka-accent); outline-offset:3px; border-radius:6px; }
.wka .tch-editstep .tch-chev { flex:0 0 auto; color:var(--wka-faint); transition:transform .18s ease; }
.wka .tch-editstep.open .tch-chev { transform:rotate(90deg); }
.wka .tch-editstep-ttl { min-width:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.wka .tch-editstep-ttl.empty { color:var(--wka-faint); font-weight:500; }
.wka .tch-thumb { width:56px; height:34px; flex:0 0 auto; border-radius:6px; object-fit:cover; border:1px solid var(--wka-line); background:var(--wka-panel); }
.wka .tch-thumb-missing { display:grid; place-items:center; color:var(--wka-faint); }
.wka .tch-edit-bar { display:flex; justify-content:flex-end; margin:0 0 8px; }
.wka .tch-edit-bar .wka-btn { white-space:nowrap; flex:0 0 auto; }
.wka .tch-shot { margin:0 0 14px; border:1px solid var(--wka-line); border-radius:10px; overflow:hidden; background:var(--wka-panel); }
.wka .tch-shot img { display:block; width:100%; max-height:260px; object-fit:contain; background:var(--wka-bg-2); }
.wka .tch-shot-missing { display:flex; align-items:center; gap:8px; padding:18px 14px; color:var(--wka-faint); font-size:12.5px; }
.wka .tch-shot figcaption { display:flex; align-items:center; gap:10px; padding:6px 8px 6px 12px; border-top:1px solid var(--wka-line);
  font-size:12px; color:var(--wka-muted); min-width:0; }
.wka .tch-shot figcaption span { flex:1 1 auto; min-width:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.wka .tch-shot figcaption .wka-btn { white-space:nowrap; flex:0 0 auto; }
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

/* scope phase: masking choice */
.wka .tch-maskopt { margin-top:14px; padding-top:14px; border-top:1px solid var(--wka-line); }
.wka .tch-rec-fine { margin:6px 0 0; font-size:12px; color:var(--wka-faint); line-height:1.55; }

/* record a demonstration */
.wka .tch-hidden { display:none; }
.wka .tch-rec { border:1px solid var(--wka-accent-line); border-radius:12px; padding:16px; margin:0 0 16px;
  background:linear-gradient(180deg, var(--wka-accent-soft), var(--wka-panel) 70%); }
.wka .tch-rec.live { border-color:color-mix(in srgb, var(--wka-red) 45%, var(--wka-line)); background:var(--wka-panel); }
.wka .tch-rec-off { display:flex; align-items:flex-start; gap:12px; background:var(--wka-panel-2); border-color:var(--wka-line); }
.wka .tch-rec-row { display:flex; align-items:flex-start; gap:12px; min-width:0; }
.wka .tch-rec-ikon { width:36px; height:36px; border-radius:10px; display:grid; place-items:center; flex:0 0 auto;
  background:var(--wka-accent-soft); border:1px solid var(--wka-accent-line); color:var(--wka-accent-dark); }
.wka .tch-rec-ikon.muted { background:var(--wka-panel); border-color:var(--wka-line); color:var(--wka-faint); }
.wka .tch-rec-ikon.warn { background:var(--wka-tint-amber); border-color:var(--wka-line); color:var(--wka-tint-amber-ink); }
.wka .tch-rec-ikon.ok { background:var(--wka-tint-green); border-color:var(--wka-line); color:var(--wka-tint-green-ink); }
.wka .tch-rec-txt { flex:1 1 0; min-width:0; }
.wka .tch-rec-ttl { font-weight:700; font-size:14px; color:var(--wka-text); line-height:1.4; overflow-wrap:anywhere; }
.wka .tch-rec-txt p { margin:4px 0 0; font-size:13px; color:var(--wka-muted); line-height:1.55; overflow-wrap:anywhere; }
.wka .tch-rec-txt p.tch-rec-honest { display:flex; align-items:flex-start; gap:6px; color:var(--wka-faint); font-size:12.5px; }
.wka .tch-rec-honest svg { flex:0 0 auto; margin-top:3px; }
.wka .tch-rec-cta { display:flex; flex-direction:column; align-items:stretch; gap:8px; flex:0 0 auto; }
.wka .tch-rec-cta .wka-btn, .wka .tch-rec-actions .wka-btn { white-space:nowrap; flex:0 0 auto; }
.wka .tch-rec-setup { margin:14px 0 0 48px; display:flex; flex-direction:column; gap:10px; }
.wka .tch-rec-opt { padding:12px 14px; border:1px solid var(--wka-line); border-radius:10px; background:var(--wka-panel); }
.wka .tch-rec-lang { margin:10px 0 0; max-width:280px; }
.wka .tch-rec-lang .wka-select { width:100%; }
.wka .tch-rec-actions { display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin:14px 0 0 48px; }
.wka .tch-rec-actions .tch-rec-fine { margin:0; flex:1 1 200px; min-width:0; }
.wka .tch-recline { display:flex; align-items:flex-start; gap:8px; font-size:12.5px; color:var(--wka-muted); line-height:1.5; min-width:0; }
.wka .tch-recline svg { flex:0 0 auto; margin-top:2px; color:var(--wka-faint); }
.wka .tch-recline span { min-width:0; overflow-wrap:anywhere; }
.wka .tch-recline.ok svg { color:var(--wka-emerald); }
.wka .tch-recline.warn { color:var(--wka-tint-amber-ink); }
.wka .tch-recline.warn svg { color:var(--wka-tint-amber-ink); }
.wka .tch-rec-txt .tch-recline { margin-top:8px; }
.wka .tch-rec-live { display:grid; grid-template-columns:minmax(0, 1fr); gap:12px; }
.wka .tch-rec-notes { display:flex; flex-direction:column; gap:7px; }
.wka .tch-rec-notes .tch-rec-actions { margin:2px 0 0; }
/* live captions (who said what), the consent check, an imported file's name */
.wka .tch-captions { display:flex; flex-direction:column; gap:4px; padding:8px 12px; border-radius:8px; background:var(--wka-panel-2);
  border:1px solid var(--wka-line); font-size:13px; line-height:1.45; }
.wka .tch-caption { min-width:0; overflow-wrap:anywhere; color:var(--wka-text); }
.wka .tch-caption b { color:var(--wka-accent-dark); font-weight:700; }
.wka .tch-caption:not(:last-child) { color:var(--wka-muted); }
.wka .tch-rec-consent { margin-top:10px; align-items:flex-start; }
.wka .tch-rec-consent input { margin-top:2px; }
.wka .tch-rec-opt .wka-check svg { flex:0 0 auto; color:var(--wka-faint); }
.wka .tch-filename { overflow-wrap:anywhere; }
.wka .tch-recpreview { display:block; width:168px; max-width:40%; aspect-ratio:16 / 10; object-fit:contain; border-radius:8px;
  background:#0b0d12; border:1px solid var(--wka-line); float:right; margin:0 0 8px 12px; }
.wka .tch-progress { height:6px; border-radius:999px; background:var(--wka-panel-2); border:1px solid var(--wka-line); margin-top:10px; overflow:hidden; max-width:420px; }
.wka .tch-progress span { display:block; height:100%; background:var(--wka-accent); transition:width .25s ease; }

/* live recording bar (page + pop-out) */
.wka .tch-recbar { display:flex; flex-direction:column; gap:12px; min-width:0; }
.wka .tch-recbar-top { display:flex; align-items:center; gap:12px; flex-wrap:wrap; min-width:0; }
.wka .tch-recpill { display:inline-flex; align-items:center; gap:7px; padding:4px 11px 4px 9px; border-radius:999px; font-size:12px; font-weight:700;
  white-space:nowrap; flex:0 0 auto; color:var(--wka-red); background:var(--wka-danger-fill); border:1px solid var(--wka-danger-line); }
.wka .tch-recpill.paused { color:var(--wka-tint-amber-ink); background:var(--wka-tint-amber); border-color:var(--wka-line); }
.wka .tch-recdot { width:8px; height:8px; border-radius:50%; background:currentColor; animation:tch-pulse 1.4s ease-in-out infinite; }
.wka .tch-recpill.paused .tch-recdot { animation:none; }
@keyframes tch-pulse { 0%, 100% { opacity:1; } 50% { opacity:.25; } }
@media (prefers-reduced-motion: reduce) { .wka .tch-recdot { animation:none; } }
.wka .tch-rectime { font-size:20px; font-weight:700; font-variant-numeric:tabular-nums; color:var(--wka-text); white-space:nowrap; flex:0 0 auto; }
.wka .tch-recstats { display:inline-flex; gap:12px; flex-wrap:wrap; font-size:12px; color:var(--wka-muted); min-width:0; }
.wka .tch-recstats span { white-space:nowrap; }
.wka .tch-marked { font-size:12px; font-weight:700; color:var(--wka-emerald); white-space:nowrap; }
.wka .tch-recbtns { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.wka .tch-recbtns .wka-btn { white-space:nowrap; flex:0 0 auto; }
.wka .tch-recask { display:flex; align-items:center; gap:10px; flex-wrap:wrap; font-size:13px; color:var(--wka-text); }
.wka .tch-recask > span:first-child { flex:1 1 220px; min-width:0; }
.wka.tch-pip { min-height:100vh; box-sizing:border-box; padding:12px 14px; background:var(--wka-panel); }
.wka .tch-recbar.compact { gap:10px; }
.wka .tch-recbar.compact .tch-rectime { font-size:17px; }
.wka .tch-recbar.compact .tch-narrow-hide { display:none; }

/* not-authorized / scope state */
.wka .tch-scope { max-width:560px; margin:24px auto 0; text-align:center; }
.wka .tch-scope-actions { display:flex; flex-wrap:wrap; justify-content:center; gap:10px; margin-top:18px; }
.wka .tch-scope-actions .wka-btn { white-space:nowrap; flex:0 0 auto; }

@media (max-width:720px){
  .wka .tch-rec-row { flex-wrap:wrap; }
  .wka .tch-rec-cta { flex-direction:row; flex-wrap:wrap; width:100%; padding-left:48px; }
  .wka .tch-rec-setup, .wka .tch-rec-actions { margin-left:0; }
  .wka .tch-recpreview { display:none; }
  .wka .tch-narrow-hide { display:none; }
}
@media (max-width:560px){
  .wka .tch-brandblock .wka-h1 { font-size:20px; }
  .wka .tch-rowmeta .tch-ver { display:none; }
  .wka .tch-thumb { width:44px; height:28px; }
  .wka .tch-rec-cta { padding-left:0; }
}
`
