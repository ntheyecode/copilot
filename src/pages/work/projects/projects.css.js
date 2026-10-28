// Styles for the Projects surface (src/pages/work/projects/*). Namespaced
// wd-pj-* on the white dashboard tokens defined on `.wd` (workApp.css.js):
// --panel, --line, --mut, --em, --em-2, --warm, --violet, --chip, --wd-display.
// Design law: white, minimal, guide-screen fonts; every pill / chip / action is
// nowrap + flex-shrink:0, the flexible text column is the only thing that gives,
// and at narrow widths rows stack instead of overflowing (no sideways scroll).
export const PJ_CSS = `
.wd-pj{display:flex;flex-direction:column;gap:18px;min-width:0}
.wd-pj .wd-sec{margin-bottom:0;min-width:0}
.wd-pj .wd-sec>div{min-width:0;flex:1 1 auto}
.wd-pj-head-act{margin-left:auto;align-self:center}
.wd-pj-head-act .short{display:none}
/* Chips: one recipe, color by state. Never wrap, never shrink. */
.wd-pj-chip{display:inline-flex;align-items:center;gap:5px;height:24px;padding:0 9px;border-radius:999px;border:1px solid var(--chip-line);background:var(--chip);color:var(--tx-2);font-size:11.5px;font-weight:700;letter-spacing:.01em;line-height:1;white-space:nowrap;flex-shrink:0}
.wd-pj-chip svg{flex-shrink:0}
.wd-pj-chip.pending{color:var(--tx-2)}
.wd-pj-chip.locked{color:var(--mut);background:var(--panel);border-style:dashed}
.wd-pj-chip.active{color:var(--info);background:var(--info-fill);border-color:var(--info-line)}
.wd-pj-chip.done{color:var(--em-deep);background:var(--em-fill);border-color:var(--em-line)}
.wd-pj-chip.rerun{color:var(--violet);background:color-mix(in srgb,var(--violet) 10%,#fff);border-color:color-mix(in srgb,var(--violet) 30%,transparent)}
.wd-pj-chip.planning{color:var(--mut)}
.wd-pj-chip.customer{color:var(--em-2);background:var(--info-fill);border-color:var(--info-line);max-width:180px}
.wd-pj-chip.customer span{overflow:hidden;text-overflow:ellipsis}
/* Pill buttons (one 32px recipe) + the filled primary. */
.wd-pj-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:32px;padding:0 13px;border-radius:999px;border:1px solid var(--line);background:var(--panel);color:var(--tx-2);font:inherit;font-weight:600;font-size:13px;cursor:pointer;flex-shrink:0;white-space:nowrap;text-decoration:none;transition:background .15s,border-color .15s,color .15s}
.wd-pj-btn:hover:not(:disabled){border-color:var(--line-2);background:var(--line-soft);color:var(--tx)}
.wd-pj-btn:disabled{opacity:.55;cursor:default}
.wd-pj-btn.primary{background:var(--em);border-color:var(--em);color:#fff}
.wd-pj-btn.primary:hover:not(:disabled){filter:brightness(1.05);background:var(--em);color:#fff}
.wd-pj-btn.quiet{border-color:transparent;background:transparent;color:var(--em-2)}
.wd-pj-btn.quiet:hover:not(:disabled){background:var(--info-fill);color:var(--em-2)}
.wd-pj-btn.icon{width:32px;padding:0;color:var(--mut)}
.wd-pj-btn svg{flex-shrink:0}
/* Progress bar (card + view head). */
.wd-pj-bar{height:5px;border-radius:3px;background:var(--track);overflow:hidden;flex:1 1 auto;min-width:60px}
.wd-pj-bar i{display:block;height:100%;border-radius:3px;background:var(--em);transition:width .4s ease}
.wd-pj-bar.done i{background:var(--em)}
.wd-pj-prog{display:flex;align-items:center;gap:10px;min-width:0}
.wd-pj-prog b{font-size:12.5px;color:var(--tx-2);font-weight:700;white-space:nowrap;flex-shrink:0;font-variant-numeric:tabular-nums}

/* ---- Project cards grid ---- */
.wd-pj-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.wd-pj-card{display:flex;flex-direction:column;gap:10px;padding:16px 16px 14px;min-width:0;text-align:left;color:inherit;text-decoration:none;cursor:pointer}
.wd-pj-card-top{display:flex;align-items:center;gap:8px;min-width:0;flex-wrap:wrap}
.wd-pj-card-top .wd-pj-chip{margin-left:0}
.wd-pj-card-t{font-family:var(--wd-display);font-weight:700;font-size:16px;letter-spacing:-.01em;line-height:1.3;color:var(--tx);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wd-pj-card-g{font-size:13px;color:var(--mut);line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.wd-pj-card-foot{display:flex;align-items:center;gap:10px;min-width:0;margin-top:auto}
.wd-pj-card-next{font-size:12.5px;color:var(--tx-2);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1 1 auto}
.wd-pj-card-next b{color:var(--em-deep);font-weight:600}
.wd-pj-card-open{margin-left:auto;display:inline-flex;align-items:center;gap:5px;color:var(--em-2);font-size:13px;font-weight:600;white-space:nowrap;flex-shrink:0}

/* ---- Filter row (company users with several customers) ---- */
.wd-pj-filter{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.wd-pj-filter label{font-size:12.5px;font-weight:600;color:var(--mut-2);white-space:nowrap}
.wd-pj-select{height:32px;padding:0 30px 0 11px;border-radius:999px;border:1px solid var(--line);background:var(--panel) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%235c6484' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E") no-repeat right 11px center;color:var(--tx);font:inherit;font-size:13px;font-weight:600;appearance:none;-webkit-appearance:none;max-width:260px;min-width:0;text-overflow:ellipsis;cursor:pointer}
.wd-pj-select:focus{border-color:var(--em);outline:none;box-shadow:0 0 0 3px var(--em-fill)}

/* ---- Gate (not entitled), empty, error, skeleton ---- */
.wd-pj-gate{display:flex;gap:14px;align-items:flex-start;padding:18px 18px 16px;border:1px solid var(--em-line)}
.wd-pj-gate .wd-ic{width:40px;height:40px;border-radius:12px}
.wd-pj-gate-body{flex:1 1 auto;min-width:0}
.wd-pj-gate h3{font-family:var(--wd-display);font-weight:700;font-size:17px;letter-spacing:-.01em;margin-bottom:5px}
.wd-pj-gate p{font-size:13.5px;color:var(--mut);line-height:1.55;max-width:66ch}
.wd-pj-gate-acts{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:12px}
.wd-pj-skel{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}

/* ---- Standalone tasks area ---- */
.wd-pj-solo{display:flex;flex-direction:column;gap:8px}
.wd-pj-solo .wd-sess{padding:10px 14px}
.wd-pj-solo-more{font-size:12.5px;color:var(--mut);padding:2px 4px}

/* ---- Modal shell shared by New project + Add to project ---- */
.wd-pj-modal{width:min(620px,100%);max-height:min(88vh,760px);display:flex;flex-direction:column;overflow:hidden;background:var(--panel);border:1px solid var(--line);border-radius:18px;box-shadow:var(--shadow);padding:0}
.wd-pj-modal-top{display:flex;align-items:center;gap:10px;padding:18px 22px 0;min-width:0}
.wd-pj-modal-top .wd-wiz-eyebrow{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis}
.wd-pj-modal-body{flex:1 1 auto;overflow:auto;padding:12px 22px 6px;display:flex;flex-direction:column;gap:14px}
.wd-pj-modal-foot{display:flex;align-items:center;justify-content:flex-end;gap:10px;flex-wrap:wrap;padding:14px 22px 18px;border-top:1px solid var(--line)}
.wd-pj-modal h3{font-family:var(--wd-display);font-weight:700;font-size:20px;letter-spacing:-.012em;line-height:1.3}
.wd-pj-field{display:flex;flex-direction:column;gap:6px;min-width:0}
.wd-pj-field label{font-size:12.5px;font-weight:600;color:var(--mut-2);letter-spacing:.01em;display:flex;gap:6px;align-items:baseline}
.wd-pj-field label .req{color:var(--warm);font-weight:600;font-size:11px}
.wd-pj-field label .opt{color:var(--faint);font-weight:500;font-size:11px}
.wd-pj-input,.wd-pj-ta,.wd-pj-field .wd-pj-select{width:100%;max-width:none;background:var(--field);border:1px solid var(--line);border-radius:12px;padding:10px 13px;color:var(--tx);font:inherit;font-size:14.5px;line-height:1.5;outline:none;transition:border-color .15s,box-shadow .15s}
.wd-pj-field .wd-pj-select{height:42px;border-radius:12px;font-weight:500;padding-right:34px}
.wd-pj-ta{resize:vertical;min-height:110px}
.wd-pj-input::placeholder,.wd-pj-ta::placeholder{color:var(--mut)}
.wd-pj-input:focus,.wd-pj-ta:focus{border-color:var(--em);box-shadow:0 0 0 3px var(--em-fill)}
.wd-pj-help{display:flex;gap:7px;align-items:flex-start;font-size:12.5px;line-height:1.5;color:var(--mut)}
.wd-pj-help svg{flex-shrink:0;margin-top:2px;color:var(--em-2)}
/* Outcome cards inside the modal: one recipe, a left accent by kind. */
.wd-pj-out{position:relative;display:flex;flex-direction:column;gap:10px;padding:16px 16px 16px 20px;border:1px solid var(--line);border-radius:14px;background:var(--card-a);overflow:hidden}
.wd-pj-out::before{content:'';position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--em)}
.wd-pj-out.warn::before{background:var(--warm)}
.wd-pj-out.info::before{background:var(--em-2)}
.wd-pj-out.premium::before{background:var(--violet)}
.wd-pj-out h4{display:flex;align-items:center;gap:8px;font-family:var(--wd-display);font-weight:700;font-size:16px;letter-spacing:-.01em;line-height:1.3;margin:0}
.wd-pj-out h4 svg{flex-shrink:0;color:var(--em)}
.wd-pj-out.warn h4 svg{color:var(--warm)}
.wd-pj-out.info h4 svg{color:var(--em-2)}
.wd-pj-out.premium h4 svg{color:var(--violet)}
.wd-pj-out p{font-size:13.5px;color:var(--mut);line-height:1.55}
.wd-pj-out-goal{font-size:14px;color:var(--tx);background:var(--chip);border:1px solid var(--chip-line);border-radius:10px;padding:9px 12px;line-height:1.5;overflow-wrap:anywhere}
.wd-pj-out-acts{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.wd-pj-out ul{margin:0;padding-left:18px;font-size:13px;color:var(--tx-2);line-height:1.55;display:flex;flex-direction:column;gap:4px}
.wd-pj-divider{height:1px;background:var(--line-soft);margin:2px 0}
.wd-pj-err{display:flex;align-items:flex-start;gap:8px;font-size:13px;color:var(--danger);line-height:1.45}
.wd-pj-err svg{flex-shrink:0;margin-top:2px}

/* ---- Project view ---- */
.wd-pj-back{display:inline-flex;align-items:center;gap:6px;color:var(--mut);font-size:13px;font-weight:600;text-decoration:none;white-space:nowrap;flex-shrink:0;align-self:flex-start}
.wd-pj-back:hover{color:var(--tx)}
.wd-pj-view-head{display:flex;flex-direction:column;gap:8px;min-width:0}
.wd-pj-view-row{display:flex;align-items:center;gap:10px;min-width:0;flex-wrap:wrap}
.wd-pj-view-head h1{font-family:var(--wd-display);font-weight:700;font-size:24px;letter-spacing:-.015em;line-height:1.25;min-width:0;overflow-wrap:anywhere}
.wd-pj-view-goal{font-size:14px;color:var(--mut);line-height:1.55;max-width:76ch;overflow-wrap:anywhere}
/* Finish line card */
.wd-pj-end{display:flex;gap:14px;align-items:flex-start;padding:16px 18px;border-color:var(--em-line)}
.wd-pj-end .wd-ic{width:38px;height:38px;border-radius:11px}
.wd-pj-end-body{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:8px}
.wd-pj-k{font-size:10.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--em-2)}
.wd-pj-end-t{font-size:15px;font-weight:600;color:var(--tx);line-height:1.5;overflow-wrap:anywhere}
.wd-pj-checks{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:5px}
.wd-pj-checks li{display:flex;gap:8px;align-items:flex-start;font-size:13.5px;color:var(--tx-2);line-height:1.5;min-width:0}
.wd-pj-checks li svg{flex-shrink:0;margin-top:3px;color:var(--em)}
.wd-pj-checks li.off svg{color:var(--faint)}
.wd-pj-checks li span{min-width:0;overflow-wrap:anywhere}
/* Pick-next card */
.wd-pj-next{display:flex;flex-direction:column;gap:12px;padding:16px 18px;border-color:var(--em-line);background:linear-gradient(180deg,var(--em-fill) 0%,var(--panel) 70%)}
.wd-pj-next.complete{background:var(--panel)}
.wd-pj-next-head{display:flex;align-items:flex-start;gap:12px;min-width:0}
.wd-pj-next-head .wd-ic{width:36px;height:36px}
.wd-pj-next-head b{display:block;font-family:var(--wd-display);font-weight:700;font-size:16px;letter-spacing:-.01em;line-height:1.3;overflow-wrap:anywhere}
.wd-pj-next-head p{font-size:13px;color:var(--mut);margin-top:2px}
.wd-pj-next-row{display:flex;align-items:center;gap:12px;min-width:0;padding:11px 13px;border:1px solid var(--em-line);border-radius:12px;background:var(--panel)}
.wd-pj-next-row .wd-pj-k{flex-shrink:0;white-space:nowrap}
.wd-pj-next-row .t{flex:1 1 auto;min-width:0;font-size:14px;font-weight:600;color:var(--tx);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wd-pj-next-row .wd-pj-btn{margin-left:auto}
.wd-pj-others{display:flex;flex-direction:column;gap:6px}
.wd-pj-others small{font-size:12.5px;color:var(--mut)}
.wd-pj-others-row{display:flex;flex-wrap:wrap;gap:7px}
.wd-pj-other{display:inline-flex;align-items:center;gap:6px;height:30px;max-width:100%;padding:0 11px;border-radius:999px;border:1px solid var(--line-2);background:var(--panel);color:var(--tx);font:inherit;font-size:12.5px;font-weight:600;cursor:pointer;white-space:nowrap;min-width:0;transition:border-color .15s,background .15s}
.wd-pj-other span{overflow:hidden;text-overflow:ellipsis}
.wd-pj-other:hover{border-color:var(--em);background:var(--em-fill)}
.wd-pj-other svg{flex-shrink:0;color:var(--em)}
/* Task map */
.wd-pj-map{display:flex;flex-direction:column;gap:8px;min-width:0}
.wd-pj-task{display:flex;gap:12px;align-items:flex-start;padding:13px 14px 13px 12px;min-width:0;position:relative}
.wd-pj-task.locked{background:var(--panel-3)}
.wd-pj-task.locked .wd-pj-task-t,.wd-pj-task.locked .wd-pj-task-d{color:var(--mut)}
.wd-pj-task.active{border-color:var(--info-line);box-shadow:0 0 0 1px color-mix(in srgb,var(--info) 14%,transparent),var(--card-shadow)}
.wd-pj-task.done{border-color:var(--em-line)}
.wd-pj-task.rerun{border-color:color-mix(in srgb,var(--violet) 32%,transparent)}
.wd-pj-task-ic{width:30px;height:30px;border-radius:9px;display:inline-flex;align-items:center;justify-content:center;flex:0 0 30px;border:1px solid var(--chip-line);background:var(--chip);color:var(--tx-2);margin-top:1px}
.wd-pj-task-ic.locked{color:var(--mut);background:var(--panel);border-style:dashed}
.wd-pj-task-ic.active{color:var(--info);background:var(--info-fill);border-color:var(--info-line)}
.wd-pj-task-ic.done{color:var(--em);background:var(--em-fill);border-color:var(--em-line)}
.wd-pj-task-ic.rerun{color:var(--violet);background:color-mix(in srgb,var(--violet) 10%,#fff);border-color:color-mix(in srgb,var(--violet) 30%,transparent)}
.wd-pj-task-main{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:6px}
.wd-pj-task-row{display:flex;align-items:center;gap:8px;min-width:0;flex-wrap:wrap}
.wd-pj-task-n{font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--faint);white-space:nowrap;flex-shrink:0}
.wd-pj-task-t{font-weight:650;font-size: 14.5px;line-height:1.35;color:var(--tx);min-width:0;flex:1 1 160px;overflow-wrap:anywhere}
.wd-pj-task-d{font-size:13px;color:var(--mut);line-height:1.5;overflow-wrap:anywhere}
.wd-pj-task-d b{color:var(--tx-2);font-weight:600}
.wd-pj-task-meta{display:flex;align-items:center;gap:6px 8px;flex-wrap:wrap;min-width:0}
.wd-pj-task-dep{display:inline-flex;align-items:center;gap:5px;font-size:12px;color:var(--mut);min-width:0;max-width:100%}
.wd-pj-task-dep svg{flex-shrink:0}
.wd-pj-task-dep span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wd-pj-task-out{font-size:13px;color:var(--tx-2);line-height:1.5;padding:8px 11px;border-radius:10px;background:var(--em-fill);border:1px solid var(--em-line);overflow-wrap:anywhere}
.wd-pj-task-out b{color:var(--em-deep);font-weight:700;margin-right:6px}
.wd-pj-tele{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.wd-pj-tele .wd-pj-chip{height:22px;font-size:11px;font-weight:600;color:var(--mut-2)}
.wd-pj-tele .wd-pj-chip.ok{color:var(--em-deep);background:var(--em-fill);border-color:var(--em-line)}
.wd-pj-tele .wd-pj-chip.warn{color:var(--warm);background:var(--warm-fill);border-color:var(--warm-line)}
.wd-pj-task-acts{display:flex;align-items:center;gap:6px;flex-shrink:0;position:relative}
.wd-pj-task-alert{display:flex;gap:8px;align-items:flex-start;font-size:12.5px;line-height:1.5;color:var(--tx);padding:8px 11px;border-radius:10px;background:var(--warm-fill);border:1px solid var(--warm-line)}
.wd-pj-task-alert svg{flex-shrink:0;margin-top:2px;color:var(--warm)}
/* Per-task menu */
.wd-pj-menu{position:absolute;right:0;top:36px;z-index:5;min-width:160px;background:var(--panel);border:1px solid var(--line);border-radius:12px;box-shadow:var(--shadow);padding:6px;display:flex;flex-direction:column;gap:2px}
.wd-pj-menu button{display:flex;align-items:center;gap:9px;width:100%;padding:8px 10px;border:none;background:none;border-radius:8px;color:var(--tx);font:inherit;font-size:13.5px;font-weight:500;cursor:pointer;text-align:left;white-space:nowrap}
.wd-pj-menu button:hover{background:var(--line-soft)}
.wd-pj-menu button svg{flex-shrink:0;color:var(--mut)}
/* Inject notice */
.wd-pj-notice{display:flex;gap:10px;align-items:flex-start;padding:11px 13px;border-radius:12px;border:1px solid var(--em-line);background:var(--em-fill);font-size:13.5px;line-height:1.5;color:var(--tx)}
.wd-pj-notice.info{border-color:var(--info-line);background:var(--info-fill)}
.wd-pj-notice svg{flex-shrink:0;margin-top:2px;color:var(--em)}
.wd-pj-notice.info svg{color:var(--em-2)}
.wd-pj-notice .body{flex:1 1 auto;min-width:0;overflow-wrap:anywhere}
.wd-pj-notice .body b{font-weight:700}
.wd-pj-notice .x{background:none;border:none;padding:2px;color:var(--mut);cursor:pointer;display:inline-flex;flex-shrink:0;border-radius:6px}
.wd-pj-notice .x:hover{color:var(--tx)}
/* Learnings */
.wd-pj-learn{padding:12px 14px}
.wd-pj-learn summary{list-style:none;display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13.5px;font-weight:600;color:var(--tx-2)}
.wd-pj-learn summary::-webkit-details-marker{display:none}
.wd-pj-learn summary svg{flex-shrink:0;color:var(--em-2)}
.wd-pj-learn ul{margin:10px 0 0;padding-left:18px;font-size:13px;color:var(--tx-2);line-height:1.55;display:flex;flex-direction:column;gap:4px}

@media(max-width:900px){.wd-pj-grid,.wd-pj-skel{grid-template-columns:1fr}}
@media(max-width:640px){
 .wd-pj-head-act .full{display:none}
 .wd-pj-head-act .short{display:inline}
 .wd-pj-task{flex-wrap:wrap}
 .wd-pj-task-acts{flex-basis:100%;justify-content:flex-start;padding-left:42px}
 .wd-pj-task-acts .wd-pj-menu{right:auto;left:42px}
 .wd-pj-next-row{flex-wrap:wrap}
 .wd-pj-next-row .t{white-space:normal;flex-basis:100%}
 .wd-pj-next-row .wd-pj-btn{margin-left:0}
 .wd-pj-gate{flex-wrap:wrap}
 /* The overlay pads 20px each side; the dialog fills that box, never more. */
 .wd-pj-modal{width:100%;max-height:92vh}
 .wd-pj-modal-top,.wd-pj-modal-body,.wd-pj-modal-foot{padding-left:16px;padding-right:16px}
 .wd-pj-card-t{white-space:normal;overflow-wrap:anywhere}
}
@media(prefers-reduced-motion:reduce){.wd-pj-bar i,.wd-pj-btn,.wd-pj-chip{transition:none}}
`
