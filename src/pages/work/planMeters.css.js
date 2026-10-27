// Dashboard PLAN METERS (src/pages/work/PlanMeters.jsx): the "Your plan at a
// glance" tile row (hours this month as a ring, top-up hours or a company
// allowance, today's tasks as pips) and the one state banner under it. Classes
// are namespaced wd-pm-*; the ring + pips classes come from planPill.css.js
// (injected by the shell's PlanPill, the single owner of those two meters).
// Tokens come from .wd in workApp.css.js.
export const PLAN_METERS_CSS = `
.wd-pm{margin-top:18px}
.wd-pm-head{margin-bottom:12px}
.wd-pm-head h2{font-family:var(--wd-display);font-weight:700;font-size:16px;letter-spacing:-.01em;line-height:1.3}
.wd-pm-head p{color:var(--mut);font-size:13px;margin-top:3px;line-height:1.45;max-width:64ch}
.wd-pm-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}

.wd-pm-tile{position:relative;background:var(--panel);border:1px solid var(--line);border-radius:var(--r);box-shadow:var(--card-shadow);padding:14px 16px;min-width:0;display:flex;flex-direction:column;gap:10px;transition:border-color .18s}
.wd-pm-tile:hover{border-color:var(--line-2)}
.wd-pm-tile.low{border-color:var(--warm-line);background:var(--warm-fill)}
.wd-pm-tile.out{border-color:color-mix(in srgb,var(--danger) 35%,transparent);background:color-mix(in srgb,var(--danger) 5%,transparent)}
.wd-pm-top{display:flex;align-items:center;gap:8px;min-width:0}
.wd-pm-ic{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:8px;background:var(--em-fill);color:var(--em);border:1px solid var(--em-line);flex-shrink:0}
.wd-pm-ic.alt{color:var(--em-2);background:var(--info-fill);border-color:var(--info-line)}
.wd-pm-ic.warm{color:var(--warm);background:var(--warm-fill);border-color:var(--warm-line)}
.wd-pm-label{font-size:12.5px;color:var(--mut);font-weight:600;line-height:1.3;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1 1 auto}

/* Info affordance + tooltip (same mechanics as the previous metrics row: hover
   on the wrap, keyboard focus-visible on the button; one tip at a time). */
.wd-pm-info-wrap{position:relative;flex-shrink:0;display:inline-flex}
.wd-pm-info{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:7px;border:1px solid var(--line);background:var(--panel);color:var(--mut);cursor:help;padding:0;transition:color .15s,border-color .15s,background .15s}
.wd-pm-info:hover{color:var(--em-2);border-color:var(--info-line);background:var(--info-fill)}
.wd-pm-tip{position:absolute;z-index:20;top:calc(100% + 8px);right:0;width:max-content;max-width:min(260px,72vw);background:var(--tx);color:#fff;font-size:12px;font-weight:500;line-height:1.5;border-radius:10px;padding:9px 11px;box-shadow:var(--shadow);opacity:0;visibility:hidden;transform:translateY(-3px);transition:opacity .15s,transform .15s,visibility .15s;pointer-events:none}
.wd-pm-tip:after{content:"";position:absolute;bottom:100%;right:12px;border:5px solid transparent;border-bottom-color:var(--tx)}
.wd-pm-info-wrap:hover .wd-pm-tip{opacity:1;visibility:visible;transform:none}
@supports selector(:has(a)){.wd-pm-info-wrap:has(.wd-pm-info:focus-visible) .wd-pm-tip{opacity:1;visibility:visible;transform:none}}
@supports not selector(:has(a)){.wd-pm-info-wrap:focus-within .wd-pm-tip{opacity:1;visibility:visible;transform:none}}

/* Tile body: a big ring beside the value (hours tile), or the value alone. */
.wd-pm-body{display:flex;align-items:center;gap:12px;min-width:0}
.wd-pm-body .wd-ring{flex-shrink:0}
.wd-pm-main{min-width:0;flex:1 1 auto}
.wd-pm-value{font-family:var(--wd-display);font-weight:700;font-size:24px;line-height:1.05;letter-spacing:-.01em;color:var(--tx);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wd-pm-value small{font-size:13px;font-weight:500;color:var(--faint);font-family:"Figtree",system-ui,sans-serif;margin-left:3px}
.wd-pm-tile.low .wd-pm-value{color:var(--warm)}
.wd-pm-tile.out .wd-pm-value{color:var(--danger)}
.wd-pm-sub{font-size:12px;color:var(--mut);line-height:1.4;margin-top:3px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wd-pm-sub.wrap{white-space:normal}
.wd-pm-sub.warm{color:var(--warm);font-weight:600}
.wd-pm-sub.out{color:var(--danger);font-weight:600}
.wd-pm-sub svg{vertical-align:-2px;margin-right:3px}
.wd-pm-pipsrow{display:flex;align-items:center;gap:10px;flex-wrap:wrap;min-width:0}
/* A quiet secondary action inside a tile (Buy hours). */
.wd-pm-act{display:inline-flex;align-items:center;gap:6px;flex-shrink:0;white-space:nowrap;align-self:flex-start;height:30px;padding:0 12px;border-radius:999px;border:1px solid var(--em-line);background:var(--panel);color:var(--em-deep);font:inherit;font-size:12.5px;font-weight:600;line-height:1;cursor:pointer;text-decoration:none;transition:background .15s,border-color .15s}
.wd-pm-act:hover{background:var(--em-fill);border-color:var(--em)}
.wd-pm-act svg{flex-shrink:0}

/* Skeleton while usage is loading: same footprint, so nothing jumps. */
.wd-pm-skel-top{height:28px;width:60%;border-radius:8px;background:var(--track)}
.wd-pm-skel-v{height:26px;width:48%;border-radius:7px;background:var(--track);margin-top:12px}
.wd-pm-skel-s{height:11px;width:70%;border-radius:6px;background:var(--track);margin-top:9px}

/* The one state banner: text + the action that resolves it. */
.wd-pm-state{margin-top:12px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:11px 14px;border-radius:var(--r);border:1px solid var(--warm-line);background:var(--warm-fill)}
.wd-pm-state.out{border-color:color-mix(in srgb,var(--danger) 35%,transparent);background:color-mix(in srgb,var(--danger) 6%,transparent)}
.wd-pm-state-t{flex:1 1 260px;min-width:0;display:flex;gap:9px;align-items:flex-start;font-size:13px;line-height:1.5;color:var(--tx)}
.wd-pm-state-t svg{flex-shrink:0;margin-top:2px;color:var(--warm)}
.wd-pm-state.out .wd-pm-state-t svg{color:var(--danger)}
.wd-pm-state-acts{display:flex;gap:8px;flex-wrap:wrap;flex-shrink:0}
.wd-pm-state-act{display:inline-flex;align-items:center;justify-content:center;gap:6px;flex-shrink:0;white-space:nowrap;height:34px;padding:0 14px;border-radius:999px;border:1px solid var(--em);background:var(--em);color:#fff;font:inherit;font-size:13px;font-weight:600;line-height:1;cursor:pointer;text-decoration:none;transition:filter .15s}
.wd-pm-state-act:hover{filter:brightness(1.05)}
.wd-pm-state-act.ghost{background:var(--panel);color:var(--em-deep);border-color:var(--em-line)}
.wd-pm-state-act.ghost:hover{background:var(--em-fill);filter:none}
.wd-pm-state-act svg{flex-shrink:0}

@media(max-width:640px){
 .wd-pm-grid{grid-template-columns:1fr}
 .wd-pm-state-acts{flex-basis:100%}
 .wd-pm-state-act{flex:1 1 auto}
}
@media(prefers-reduced-motion:reduce){.wd-pm-tile,.wd-pm-tip,.wd-pm-act,.wd-pm-state-act{transition:none}}
`
