// Styles for the top-bar PLAN PILL + its popover (src/pages/work/PlanPill.jsx)
// and the two small meters both the pill and the dashboard share: the hours
// ring (.wd-ring) and the task pips (.wd-pips). Injected once by PlanPill.jsx;
// PlanMeters.jsx reuses the ring + pips classes read-only. Every control is
// nowrap + flex-shrink:0 so the top bar never wraps or clips (design-time gate).
// Tokens (--em, --em-2, --warm, --danger, --panel, --line, --mut, ...) come
// from .wd in workApp.css.js.
export const PLAN_PILL_CSS = `
/* ---- Hours ring: the share of this month's included hours still LEFT. The
   fill is the accent, warm when low, danger when exhausted; the track is a
   lighter step of the same tone (a meter, per the data-viz method). ---- */
.wd-ring{display:inline-block;flex-shrink:0;vertical-align:middle}
.wd-ring .wd-ring-track{stroke:var(--em-line)}
.wd-ring .wd-ring-fill{stroke:var(--em);transition:stroke-dashoffset .5s ease}
.wd-ring.low .wd-ring-track{stroke:var(--warm-line)}
.wd-ring.low .wd-ring-fill{stroke:var(--warm)}
.wd-ring.out .wd-ring-track{stroke:var(--danger-line)}
.wd-ring.out .wd-ring-fill{stroke:var(--danger)}

/* ---- Task pips: one dot per task slot (open tasks of the at-once maximum, or a
   company ceiling), filled while in use. ---- */
.wd-pips{display:inline-flex;align-items:center;gap:3px;flex-shrink:0;line-height:0}
.wd-pips i{display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--panel);border:1.5px solid var(--em-2);box-sizing:border-box}
.wd-pips i.on{background:var(--em-2)}
.wd-pips.lg{gap:5px}
.wd-pips.lg i{width:12px;height:12px;border-width:2px}
.wd-pips.full i{border-color:var(--warm)}
.wd-pips.full i.on{background:var(--warm)}

/* ---- The pill ---- */
.wd-planpill-wrap{position:relative;flex-shrink:0;display:inline-flex}
.wd-planpill{display:inline-flex;align-items:center;gap:9px;flex-shrink:0;white-space:nowrap;height:34px;padding:0 10px 0 11px;border-radius:var(--r-pill);border:1px solid var(--line);background:transparent;color:var(--tx-2);font:inherit;font-size:13px;font-weight:500;line-height:1;cursor:pointer;transition:color .15s,border-color .15s,background .15s}
.wd-planpill:hover,.wd-planpill.on{border-color:var(--line-2);background:var(--line-soft);color:var(--tx)}
.wd-pp-s{display:inline-flex;align-items:center;gap:6px;white-space:nowrap}
.wd-pp-s b{font-weight:700;color:var(--tx);font-variant-numeric:tabular-nums}
.wd-pp-sep{width:1px;height:16px;background:var(--line);flex-shrink:0}
.wd-pp-ca{flex-shrink:0;color:var(--mut);transform:rotate(90deg)}
.wd-planpill.on .wd-pp-ca{transform:rotate(-90deg)}

/* ---- The popover: plan name, the hours meter, top-up / company lines, the task
   slots, then the one actionable state with its action. ---- */
.wd-planpop-back{position:fixed;inset:0;z-index:40;background:transparent;border:0;padding:0;margin:0;cursor:default}
/* white-space:normal on purpose: the top bar's control cluster (.wd-top-right) is
   nowrap so the pills never wrap, and the popover inherits it; every note and
   hint inside must wrap like prose. */
.wd-planpop{position:absolute;top:calc(100% + 8px);right:0;z-index:41;width:300px;max-width:calc(100vw - 28px);background:var(--panel);border:1px solid var(--line-soft);border-radius:var(--r-lg);box-shadow:var(--sh-3);padding:14px 15px;animation:wd-pp-pop .16s ease;text-align:left;white-space:normal}
.wd-planpop-note .t span{min-width:0;overflow-wrap:anywhere}
@keyframes wd-pp-pop{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}
.wd-planpop-head{display:flex;align-items:center;gap:8px;margin-bottom:11px;min-width:0}
.wd-planpop-name{font-family:var(--wd-display);font-weight:700;font-size:15px;letter-spacing:-.01em;line-height:1.2;color:var(--tx);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wd-planpop-tag{display:inline-flex;align-items:center;gap:6px;flex-shrink:0;white-space:nowrap;font-size:10.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--em-deep);background:var(--em-fill);border:none;border-radius:var(--r-pill);padding:4px 9px;margin-left:auto}
.wd-planpop-tag .wd-plan-dot{width:6px;height:6px}
.wd-planpop-stat{padding:10px 0;border-top:1px solid var(--line-soft)}
.wd-planpop-stat:first-of-type{border-top:0;padding-top:0}
.wd-planpop-stat .r{display:flex;align-items:center;justify-content:space-between;gap:10px;min-width:0}
.wd-planpop-stat .k{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;font-weight:600;color:var(--mut);min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wd-planpop-stat .k svg{flex-shrink:0;color:var(--em-2)}
.wd-planpop-stat .v{font-family:var(--wd-display);font-weight:700;font-size:15px;line-height:1.1;color:var(--tx);white-space:nowrap;flex-shrink:0}
.wd-planpop-stat .v small{font-size:11.5px;font-weight:500;color:var(--faint);font-family:"Figtree",system-ui,sans-serif}
.wd-planpop-stat .h{font-size:11.5px;color:var(--faint);margin-top:4px;line-height:1.4}
.wd-planpop-stat .h.warm{color:var(--warm);font-weight:600}
/* The month-hours bar under its row: the filled part is what is LEFT. */
.wd-planpop-bar{height:6px;border-radius:999px;background:var(--em-line);margin-top:8px;overflow:hidden}
.wd-planpop-bar i{display:block;height:100%;border-radius:999px;background:var(--em);transition:width .5s ease}
.wd-planpop-bar.low{background:var(--warm-line)}
.wd-planpop-bar.low i{background:var(--warm)}
.wd-planpop-bar.out{background:var(--danger-line)}
.wd-planpop-bar.out i{background:var(--danger)}
.wd-planpop-pips{display:flex;align-items:center;gap:10px;margin-top:8px;min-width:0;flex-wrap:wrap}
/* State note + action: warm for low / every slot in use, danger for exhausted. */
.wd-planpop-note{margin-top:10px;display:flex;flex-direction:column;gap:9px;padding:10px 12px;border-radius:var(--r-sm);border:none;background:var(--tint-amber);font-size:12.5px;line-height:1.45;color:var(--tx)}
.wd-planpop-note.out{background:var(--danger-fill)}
.wd-planpop-note .t{display:flex;gap:8px;align-items:flex-start}
.wd-planpop-note .t svg{flex-shrink:0;margin-top:2px;color:var(--warm)}
.wd-planpop-note.out .t svg{color:var(--danger)}
.wd-planpop-acts{display:flex;gap:8px;flex-wrap:wrap}
.wd-planpop-act{display:inline-flex;align-items:center;justify-content:center;gap:6px;flex-shrink:0;white-space:nowrap;height:32px;padding:0 13px;border-radius:var(--r-pill);border:1px solid var(--em);background:var(--em);color:var(--on-em);font:inherit;font-size:13px;font-weight:600;line-height:1;cursor:pointer;text-decoration:none;transition:filter .15s}
.wd-planpop-act:hover{filter:brightness(1.05)}
.wd-planpop-act.ghost{background:var(--panel);color:var(--em-deep);border-color:transparent}
.wd-planpop-act.ghost:hover{box-shadow:var(--sh-2);filter:none}
.wd-planpop-act svg{flex-shrink:0}

/* Top bar collapse, widest first: the pill drops its tasks stat and keeps the
   ring + caret so the control stays recognizable at every width. */
@media(max-width:1100px){.wd-planpill{gap:7px;padding:0 9px 0 10px}}
@media(max-width:860px){.wd-planpill>.wd-pp-s.tasks,.wd-planpill>.wd-pp-sep{display:none}}
/* Floater / phone width: a 300px popover right-anchored to a pill near the
   middle of a 380px bar would run off the left edge, so it pins to the
   viewport's side gutters under the 58px top bar instead. */
@media(max-width:480px){.wd-planpop{position:fixed;top:66px;left:14px;right:14px;width:auto;max-width:none}}
@media(prefers-reduced-motion:reduce){.wd-planpop{animation:none}.wd-ring .wd-ring-fill,.wd-planpop-bar i{transition:none}}
`
