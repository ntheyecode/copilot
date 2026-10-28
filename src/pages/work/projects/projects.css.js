// Styles for the Projects surface (src/pages/work/projects/*). Namespaced
// wd-pj-* (and wd-pr-* for the practice cards), on the design-system tokens
// defined on `.wd` (workApp.css.js): surfaces, brand, the soft category tints,
// the radius / spacing / shadow / type scales. Tokens only: no literal color,
// radius or pixel type size lives here, so Light / Dark / Heavy and the text
// size preference apply everywhere.
//
// Card language (docs/dashboard-redesign-audit.md): white hairline cards for
// content, TINTED borderless cards for state (the task in progress is the
// blue tint, the finish line the green tint, the AI-assist practices violet);
// chips are tinted pills with no outline; the one filled button is the brand's
// white-text-safe shade; the task map is drawn with a dashed connector down
// the icon column (the TaskFlow idiom). Every pill / chip / action is nowrap +
// flex-shrink:0, the flexible text column is the only thing that gives, and at
// narrow widths rows stack instead of overflowing (no sideways scroll).
export const PJ_CSS = `
.wd-pj{display:flex;flex-direction:column;gap:var(--sp-5);min-width:0}
.wd-pj .wd-sec{margin-bottom:0;min-width:0}
.wd-pj .wd-sec>div{min-width:0;flex:1 1 auto}
.wd-pj-head-act{margin-left:auto;align-self:center}
.wd-pj-head-act .short{display:none}
.wd-pj-spin{display:grid;place-items:center;padding:48px 0;color:var(--em)}
/* Chips: one recipe, color by state. Tinted pills, no outline; never wrap,
   never shrink. */
.wd-pj-chip{display:inline-flex;align-items:center;gap:5px;height:24px;padding:0 9px;border-radius:var(--r-pill);border:1px solid transparent;background:var(--tint-neutral);color:var(--tint-neutral-ink);font-size:var(--fs-xs);font-weight:600;letter-spacing:.01em;line-height:1;white-space:nowrap;flex-shrink:0}
.wd-pj-chip svg{flex-shrink:0}
.wd-pj-chip.pending{color:var(--tint-neutral-ink)}
.wd-pj-chip.locked{color:var(--mut);background:transparent;border-color:var(--line-2);border-style:dashed}
.wd-pj-chip.active{color:var(--tint-blue-ink);background:var(--tint-blue)}
.wd-pj-chip.done{color:var(--tint-green-ink);background:var(--tint-green)}
.wd-pj-chip.rerun{color:var(--tint-violet-ink);background:var(--tint-violet)}
.wd-pj-chip.planning{color:var(--tint-neutral-ink)}
.wd-pj-chip.customer{color:var(--tint-blue-ink);background:var(--tint-blue);max-width:180px}
.wd-pj-chip.customer span{overflow:hidden;text-overflow:ellipsis}
/* Pill buttons (one 32px ghost recipe, the shell's .wd-resume) + the filled
   primary on the brand's white-text-safe shade. */
.wd-pj-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:32px;padding:0 13px;border-radius:var(--r-pill);border:1px solid var(--line);background:var(--panel);color:var(--tx-2);font:inherit;font-weight:600;font-size:var(--fs-md);cursor:pointer;flex-shrink:0;white-space:nowrap;text-decoration:none;transition:background .15s,border-color .15s,color .15s}
.wd-pj-btn:hover:not(:disabled){border-color:var(--line-2);background:var(--line-soft);color:var(--tx)}
.wd-pj-btn:disabled{opacity:.55;cursor:default}
.wd-pj-btn.primary{background:var(--em-solid);border-color:var(--em-solid);color:var(--on-solid)}
.wd-pj-btn.primary:hover:not(:disabled){filter:brightness(1.06);background:var(--em-solid);color:var(--on-solid)}
.wd-pj-btn.quiet{border-color:transparent;background:transparent;color:var(--em-2-deep)}
.wd-pj-btn.quiet:hover:not(:disabled){background:var(--tint-blue);color:var(--em-2-deep)}
.wd-pj-btn.icon{width:32px;padding:0;color:var(--mut);border-color:transparent;background:transparent}
.wd-pj-btn svg{flex-shrink:0}
/* Progress bar (card + view head). */
.wd-pj-bar{height:5px;border-radius:3px;background:var(--track);overflow:hidden;flex:1 1 auto;min-width:60px}
.wd-pj-bar i{display:block;height:100%;border-radius:3px;background:var(--em);transition:width .4s ease}
.wd-pj-bar.done i{background:var(--em)}
.wd-pj-prog{display:flex;align-items:center;gap:10px;min-width:0}
.wd-pj-prog.gap{margin-top:4px}
.wd-pj-prog b{font-size:var(--fs-sm);color:var(--tx-2);font-weight:700;white-space:nowrap;flex-shrink:0;font-variant-numeric:tabular-nums}

/* ---- Project cards grid ---- */
.wd-pj-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--sp-3)}
.wd-pj-card{display:flex;flex-direction:column;gap:10px;padding:16px 16px 14px;min-width:0;text-align:left;color:inherit;text-decoration:none;cursor:pointer;border-radius:var(--r-lg)}
.wd-pj-card-top{display:flex;align-items:center;gap:8px;min-width:0;flex-wrap:wrap}
.wd-pj-card-top .wd-pj-chip{margin-left:0}
.wd-pj-card-t{font-family:var(--wd-display);font-weight:700;font-size:var(--fs-lg);letter-spacing:-.01em;line-height:1.3;color:var(--tx);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wd-pj-card-g{font-size:var(--fs-md);color:var(--mut);line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.wd-pj-card-foot{display:flex;align-items:center;gap:10px;min-width:0;margin-top:auto}
.wd-pj-card-next{font-size:var(--fs-sm);color:var(--tx-2);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1 1 auto}
.wd-pj-card-next b{color:var(--em-deep);font-weight:600}
.wd-pj-card-open{margin-left:auto;display:inline-flex;align-items:center;gap:5px;color:var(--em-2-deep);font-size:var(--fs-md);font-weight:600;white-space:nowrap;flex-shrink:0}

/* ---- Filter row (company users with several customers) ---- */
.wd-pj-filter{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.wd-pj-filter label{font-size:var(--fs-sm);font-weight:600;color:var(--mut-2);white-space:nowrap}
/* Select: the native control (its arrow follows the color scheme), on the
   field tokens. */
.wd-pj-select{height:32px;padding:0 11px;border-radius:var(--r-pill);border:1px solid var(--line);background:var(--panel);color:var(--tx);font:inherit;font-size:var(--fs-md);font-weight:600;max-width:260px;min-width:0;text-overflow:ellipsis;cursor:pointer}
.wd-pj-select:focus{border-color:var(--em);outline:none;box-shadow:0 0 0 3px var(--em-fill)}

/* ---- Gate (not entitled), empty, error, skeleton ---- */
.wd-pj-gate{display:flex;gap:14px;align-items:flex-start;padding:18px 18px 16px;border-radius:var(--r-lg)}
.wd-pj-gate .wd-ic{width:40px;height:40px;border-radius:var(--r-sm);background:var(--panel)}
.wd-pj-gate-body{flex:1 1 auto;min-width:0}
.wd-pj-gate h3{font-family:var(--wd-display);font-weight:700;font-size:var(--fs-xl);letter-spacing:-.01em;margin-bottom:5px}
.wd-pj-gate p{font-size:var(--fs-md);color:var(--mut);line-height:1.55;max-width:66ch}
.wd-pj-gate p.gap{margin-top:6px}
.wd-pj-gate-acts{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:12px}
.wd-pj-skel{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--sp-3)}

/* ---- Standalone tasks area ---- */
.wd-pj-solo{display:flex;flex-direction:column;gap:var(--sp-2)}
.wd-pj-solo .wd-sess{padding:10px 14px}
.wd-pj-solo .wd-empty .wd-pj-btn{margin-left:auto}
.wd-pj-solo-more{font-size:var(--fs-sm);color:var(--mut);padding:2px 4px}

/* ---- Modal shell shared by New project + Add to project ---- */
.wd-pj-modal{width:min(620px,100%);max-height:min(88vh,760px);display:flex;flex-direction:column;overflow:hidden;background:var(--panel);border:1px solid var(--line-soft);border-radius:var(--r-lg);box-shadow:var(--sh-3);padding:0}
.wd-pj-modal-top{display:flex;align-items:center;gap:10px;padding:18px 22px 0;min-width:0}
.wd-pj-modal-top .wd-wiz-eyebrow{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis}
.wd-pj-modal-body{flex:1 1 auto;overflow:auto;padding:12px 22px 6px;display:flex;flex-direction:column;gap:14px}
.wd-pj-modal-foot{display:flex;align-items:center;justify-content:flex-end;gap:10px;flex-wrap:wrap;padding:14px 22px 18px;border-top:1px solid var(--line-soft)}
.wd-pj-modal h3{font-family:var(--wd-display);font-weight:700;font-size:var(--fs-2xl);letter-spacing:-.012em;line-height:1.3}
.wd-pj-field{display:flex;flex-direction:column;gap:6px;min-width:0}
.wd-pj-field label{font-size:var(--fs-sm);font-weight:600;color:var(--mut-2);letter-spacing:.01em;display:flex;gap:6px;align-items:baseline}
.wd-pj-field label .req{color:var(--warm);font-weight:600;font-size:var(--fs-xs)}
.wd-pj-field label .opt{color:var(--faint);font-weight:500;font-size:var(--fs-xs)}
.wd-pj-input,.wd-pj-ta,.wd-pj-field .wd-pj-select{width:100%;max-width:none;background:var(--field);border:1px solid var(--line);border-radius:var(--r-sm);padding:10px 13px;color:var(--tx);font:inherit;font-size:var(--fs-base);line-height:1.5;outline:none;transition:border-color .15s,box-shadow .15s}
.wd-pj-field .wd-pj-select{height:42px;border-radius:var(--r-sm);font-weight:500}
.wd-pj-ta{resize:vertical;min-height:110px}
.wd-pj-input::placeholder,.wd-pj-ta::placeholder{color:var(--mut)}
.wd-pj-input:focus,.wd-pj-ta:focus{border-color:var(--em);box-shadow:0 0 0 3px var(--em-fill)}
.wd-pj-help{display:flex;gap:7px;align-items:flex-start;font-size:var(--fs-sm);line-height:1.5;color:var(--mut)}
.wd-pj-help svg{flex-shrink:0;margin-top:2px;color:var(--em-2)}
/* Outcome cards inside the modal: the tint recipe, color by kind (green =
   go, amber = needs a change, blue = information, violet = Premium). */
.wd-pj-out{position:relative;display:flex;flex-direction:column;gap:10px;padding:16px;border:1px solid transparent;border-radius:var(--r);background:var(--tint-green);overflow:hidden}
.wd-pj-out.warn{background:var(--tint-amber)}
.wd-pj-out.info{background:var(--tint-blue)}
.wd-pj-out.premium{background:var(--tint-violet)}
.wd-pj-out h4{display:flex;align-items:center;gap:8px;font-family:var(--wd-display);font-weight:700;font-size:var(--fs-lg);letter-spacing:-.01em;line-height:1.3;margin:0}
.wd-pj-out h4 svg{flex-shrink:0;color:var(--tint-green-ink)}
.wd-pj-out.warn h4 svg{color:var(--tint-amber-ink)}
.wd-pj-out.info h4 svg{color:var(--tint-blue-ink)}
.wd-pj-out.premium h4 svg{color:var(--tint-violet-ink)}
.wd-pj-out p{font-size:var(--fs-md);color:var(--mut);line-height:1.55}
.wd-pj-out-goal{font-size:var(--fs-base);color:var(--tx);background:var(--panel);border:1px solid transparent;border-radius:var(--r-sm);padding:9px 12px;line-height:1.5;overflow-wrap:anywhere}
.wd-pj-out-acts{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.wd-pj-out ul{margin:0;padding-left:18px;font-size:var(--fs-md);color:var(--tx-2);line-height:1.55;display:flex;flex-direction:column;gap:4px}
.wd-pj-divider{height:1px;background:var(--line-soft);margin:2px 0}
.wd-pj-err{display:flex;align-items:flex-start;gap:8px;font-size:var(--fs-md);color:var(--danger);line-height:1.45}
.wd-pj-err svg{flex-shrink:0;margin-top:2px}

/* ---- Project view ---- */
.wd-pj-back{display:inline-flex;align-items:center;gap:6px;color:var(--mut);font-size:var(--fs-md);font-weight:600;text-decoration:none;white-space:nowrap;flex-shrink:0;align-self:flex-start}
.wd-pj-back:hover{color:var(--tx)}
.wd-pj-view-head{display:flex;flex-direction:column;gap:8px;min-width:0}
.wd-pj-view-row{display:flex;align-items:center;gap:10px;min-width:0;flex-wrap:wrap}
.wd-pj-view-head h1{font-family:var(--wd-display);font-weight:700;font-size:var(--fs-3xl);letter-spacing:-.015em;line-height:1.25;min-width:0;overflow-wrap:anywhere}
.wd-pj-view-goal{font-size:var(--fs-base);color:var(--mut);line-height:1.55;max-width:76ch;overflow-wrap:anywhere}
/* Finish line: the green tinted card (status), white icon tile. */
.wd-pj-end{display:flex;gap:14px;align-items:flex-start;padding:16px 18px;border-radius:var(--r-lg)}
.wd-pj-end .wd-ic{width:38px;height:38px;border-radius:var(--r-sm);background:var(--panel)}
.wd-pj-end-body{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:8px}
.wd-pj-k{font-size:var(--fs-sm);font-weight:600;color:var(--tint-green-ink)}
.wd-pj-k.gap{margin-top:4px}
.wd-pj-end-t{font-size:calc(15px*var(--wc-fs,1));font-weight:600;color:var(--tx);line-height:1.5;overflow-wrap:anywhere}
.wd-pj-checks{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:5px}
.wd-pj-checks li{display:flex;gap:8px;align-items:flex-start;font-size:var(--fs-md);color:var(--tx-2);line-height:1.5;min-width:0}
.wd-pj-checks li svg{flex-shrink:0;margin-top:3px;color:var(--em)}
.wd-pj-checks li.off svg{color:var(--faint)}
.wd-pj-checks li span{min-width:0;overflow-wrap:anywhere}
/* Pick-next card: white hairline card; the "up next" row is a green tint. */
.wd-pj-next{display:flex;flex-direction:column;gap:12px;padding:16px 18px;border-radius:var(--r-lg)}
.wd-pj-next-head{display:flex;align-items:flex-start;gap:12px;min-width:0}
.wd-pj-next-head .wd-ic{width:36px;height:36px}
.wd-pj-next-head b{display:block;font-family:var(--wd-display);font-weight:700;font-size:var(--fs-lg);letter-spacing:-.01em;line-height:1.3;overflow-wrap:anywhere}
.wd-pj-next-head p{font-size:var(--fs-md);color:var(--mut);margin-top:2px}
.wd-pj-next-row{display:flex;align-items:center;gap:12px;min-width:0;padding:11px 13px;border:1px solid transparent;border-radius:var(--r);background:var(--tint-green)}
.wd-pj-next-row .wd-pj-k{flex-shrink:0;white-space:nowrap}
.wd-pj-next-row .t{flex:1 1 auto;min-width:0;font-size:var(--fs-base);font-weight:600;color:var(--tx);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wd-pj-next-row .wd-pj-btn{margin-left:auto}
.wd-pj-others{display:flex;flex-direction:column;gap:6px}
.wd-pj-others small{font-size:var(--fs-sm);color:var(--mut)}
.wd-pj-others-row{display:flex;flex-wrap:wrap;gap:7px}
.wd-pj-other{display:inline-flex;align-items:center;gap:6px;height:30px;max-width:100%;padding:0 11px;border-radius:var(--r-pill);border:1px solid var(--line);background:var(--panel);color:var(--tx);font:inherit;font-size:var(--fs-sm);font-weight:600;cursor:pointer;white-space:nowrap;min-width:0;transition:border-color .15s,background .15s}
.wd-pj-other span{overflow:hidden;text-overflow:ellipsis}
.wd-pj-other:hover{border-color:var(--em-line);background:var(--tint-green)}
.wd-pj-other svg{flex-shrink:0;color:var(--em)}

/* ---- Task map: cards down the page with a DASHED CONNECTOR through the icon
   column (the TaskFlow idiom). The connector is drawn once on the list and
   shows in the gaps between cards; each icon tile wears a panel-colored ring so
   it reads as a node on the line. ---- */
.wd-pj-map{display:flex;flex-direction:column;gap:var(--sp-2);min-width:0}
.wd-pj-map .wd-sec{margin-bottom:2px}
.wd-pj-map-add{margin-left:auto;flex-shrink:0}
.wd-pj-map-list{position:relative;display:flex;flex-direction:column;gap:10px;min-width:0}
.wd-pj-map-list::before{content:'';position:absolute;left:27px;top:28px;bottom:28px;width:0;border-left:2px dashed var(--line-2);z-index:0}
.wd-pj-task{position:relative;z-index:1;display:flex;gap:12px;align-items:flex-start;padding:13px 14px 13px 12px;min-width:0;border-radius:var(--r-lg)}
.wd-pj-task.locked .wd-pj-task-t,.wd-pj-task.locked .wd-pj-task-d{color:var(--mut)}
/* The task in progress is the one tinted (blue = in progress) card. */
.wd-pj-task.active{background:var(--tint-blue);border-color:transparent}
.wd-pj-task.active:hover{border-color:transparent}
.wd-pj-task-ic{width:30px;height:30px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;flex:0 0 30px;border:1px solid transparent;background:var(--tint-neutral);color:var(--tint-neutral-ink);margin-top:1px;box-shadow:0 0 0 4px var(--panel)}
.wd-pj-task.active .wd-pj-task-ic{box-shadow:0 0 0 4px var(--tint-blue)}
.wd-pj-task-ic.locked{color:var(--mut);background:var(--panel);border-color:var(--line-2);border-style:dashed}
.wd-pj-task-ic.active{color:var(--on-solid);background:var(--em-2)}
.wd-pj-task-ic.done{color:var(--tint-green-ink);background:var(--tint-green)}
.wd-pj-task-ic.rerun{color:var(--tint-violet-ink);background:var(--tint-violet)}
/* flex-basis 0, not auto: inside the wrapping row (640 and under) an auto
   basis measured the text at its max-content width and pushed the whole text
   column onto its own line under the icon. A zero basis keeps it beside the
   icon and lets it shrink (the latent wrap bug the audit noted). */
.wd-pj-task-main{flex:1 1 0%;min-width:0;display:flex;flex-direction:column;gap:6px}
.wd-pj-task-row{display:flex;align-items:center;gap:8px;min-width:0;flex-wrap:wrap}
.wd-pj-task-n{font-size:var(--fs-xs);font-weight:700;color:var(--faint);white-space:nowrap;flex-shrink:0}
.wd-pj-task-t{font-weight:650;font-size:var(--fs-base);line-height:1.35;color:var(--tx);min-width:0;flex:1 1 160px;overflow-wrap:anywhere}
.wd-pj-task-d{font-size:var(--fs-md);color:var(--mut);line-height:1.5;overflow-wrap:anywhere}
.wd-pj-task-d b{color:var(--tx-2);font-weight:600}
.wd-pj-task-meta{display:flex;align-items:center;gap:6px 8px;flex-wrap:wrap;min-width:0}
.wd-pj-task-dep{display:inline-flex;align-items:center;gap:5px;font-size:var(--fs-sm);color:var(--mut);min-width:0;max-width:100%}
.wd-pj-task-dep svg{flex-shrink:0}
.wd-pj-task-dep span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wd-pj-task-out{font-size:var(--fs-md);color:var(--tx-2);line-height:1.5;padding:8px 11px;border-radius:var(--r-sm);background:var(--tint-green);border:1px solid transparent;overflow-wrap:anywhere}
.wd-pj-task-out b{color:var(--tint-green-ink);font-weight:700;margin-right:6px}
.wd-pj-tele{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.wd-pj-tele .wd-pj-chip{height:22px;font-size:var(--fs-xs);font-weight:600;color:var(--mut-2);background:var(--panel)}
.wd-pj-task.active .wd-pj-tele .wd-pj-chip{background:var(--panel)}
.wd-pj-tele .wd-pj-chip.ok{color:var(--tint-green-ink);background:var(--tint-green)}
.wd-pj-tele .wd-pj-chip.warn{color:var(--tint-amber-ink);background:var(--tint-amber)}
.wd-pj-task-acts{display:flex;align-items:center;gap:6px;flex-shrink:0;position:relative}
.wd-pj-task-alert{display:flex;gap:8px;align-items:flex-start;font-size:var(--fs-sm);line-height:1.5;color:var(--tx);padding:8px 11px;border-radius:var(--r-sm);background:var(--tint-amber);border:1px solid transparent}
.wd-pj-task-alert svg{flex-shrink:0;margin-top:2px;color:var(--warm)}
/* Per-task menu (popover: the sh-3 shadow) */
.wd-pj-menu{position:absolute;right:0;top:36px;z-index:5;min-width:160px;background:var(--panel);border:1px solid var(--line-soft);border-radius:var(--r);box-shadow:var(--sh-3);padding:6px;display:flex;flex-direction:column;gap:2px}
.wd-pj-menu button{display:flex;align-items:center;gap:9px;width:100%;padding:8px 10px;border:none;background:none;border-radius:var(--r-xs);color:var(--tx);font:inherit;font-size:var(--fs-md);font-weight:500;cursor:pointer;text-align:left;white-space:nowrap}
.wd-pj-menu button:hover{background:var(--line-soft)}
.wd-pj-menu button svg{flex-shrink:0;color:var(--mut)}
/* Inject notice: a tinted note (green = added, blue = already covered). */
.wd-pj-notice{display:flex;gap:10px;align-items:flex-start;padding:11px 13px;border-radius:var(--r);border:1px solid transparent;background:var(--tint-green);font-size:var(--fs-md);line-height:1.5;color:var(--tx)}
.wd-pj-notice.info{background:var(--tint-blue)}
.wd-pj-notice svg{flex-shrink:0;margin-top:2px;color:var(--tint-green-ink)}
.wd-pj-notice.info svg{color:var(--tint-blue-ink)}
.wd-pj-notice .body{flex:1 1 auto;min-width:0;overflow-wrap:anywhere}
.wd-pj-notice .body b{font-weight:700}
.wd-pj-notice .x{background:none;border:none;padding:2px;color:var(--mut);cursor:pointer;display:inline-flex;flex-shrink:0;border-radius:6px}
.wd-pj-notice .x:hover{color:var(--tx)}
/* Learnings */
.wd-pj-learn{padding:12px 14px}
.wd-pj-learn summary{list-style:none;display:flex;align-items:center;gap:8px;cursor:pointer;font-size:var(--fs-md);font-weight:600;color:var(--tx-2)}
.wd-pj-learn summary::-webkit-details-marker{display:none}
.wd-pj-learn summary svg{flex-shrink:0;color:var(--em-2)}
.wd-pj-learn ul{margin:10px 0 0;padding-left:18px;font-size:var(--fs-md);color:var(--tx-2);line-height:1.55;display:flex;flex-direction:column;gap:4px}

/* ---- Recommended practices (PracticeCards.jsx): an aside under the map on
   the violet "assist" tint. Small cards, one quiet action each, a dismiss.
   Three across wide, one column narrow; nothing here blocks the plan. ---- */
.wd-pr{display:flex;flex-direction:column;gap:var(--sp-3);margin-top:var(--sp-2)}
.wd-pr-head{display:flex;align-items:flex-start;gap:12px;min-width:0}
.wd-pr-head>div{min-width:0;flex:1 1 auto}
.wd-pr-head b{display:block;font-family:var(--wd-display);font-weight:700;font-size:var(--fs-lg);letter-spacing:-.01em;line-height:1.3;color:var(--tx)}
.wd-pr-head p{font-size:var(--fs-md);color:var(--mut);margin-top:2px;line-height:1.45}
.wd-pr-list{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--sp-3)}
.wd-pr-card{display:flex;flex-direction:column;gap:12px;padding:14px 14px 12px;min-width:0;border-radius:var(--r-lg)}
.wd-pr-body{display:flex;flex-direction:column;gap:5px;min-width:0;flex:1 1 auto}
.wd-pr-t{font-weight:650;font-size:var(--fs-base);line-height:1.35;color:var(--tx);overflow-wrap:anywhere}
.wd-pr-r{font-size:var(--fs-md);color:var(--mut);line-height:1.5;overflow-wrap:anywhere;margin:0}
.wd-pr-src{display:inline-flex;align-items:center;gap:5px;font-size:var(--fs-xs);font-weight:600;color:var(--tint-violet-ink);margin-top:2px;line-height:1.35}
.wd-pr-acts{display:flex;align-items:center;gap:6px;min-width:0}
.wd-pr-act{background:var(--panel);border-color:transparent;color:var(--tint-violet-ink)}
.wd-pr-act:hover:not(:disabled){background:var(--panel);border-color:var(--ai-line);color:var(--tint-violet-ink)}
.wd-pr-act.failed{color:var(--warm)}
.wd-pr-x{margin-left:auto;display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:50%;border:none;background:transparent;color:var(--mut);cursor:pointer;flex-shrink:0;transition:background .15s,color .15s}
.wd-pr-x:hover:not(:disabled){background:var(--panel);color:var(--tx)}
.wd-pr-x:disabled{opacity:.5;cursor:default}

@media(max-width:900px){.wd-pj-grid,.wd-pj-skel{grid-template-columns:1fr}.wd-pr-list{grid-template-columns:1fr}}
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
 .wd-pj-solo .wd-empty{flex-wrap:wrap}
 .wd-pj-solo .wd-empty .wd-pj-btn{margin-left:0;flex-basis:100%}
}
@media(prefers-reduced-motion:reduce){.wd-pj-bar i,.wd-pj-btn,.wd-pj-chip,.wd-pr-x{transition:none}}
`
