// Dashboard PLAN METERS (src/pages/work/PlanMeters.jsx): the "Your plan at a
// glance" tile row (hours this month as a ring, top-up hours or a company
// allowance, open tasks as pips) and the one state banner under it. Classes
// are namespaced wd-pm-*; the ring + pips classes come from planPill.css.js
// (injected by the shell's PlanPill, the single owner of those two meters).
//
// Tiles are soft TINTED cards with no outline (the reference's category
// chips): hours = green, top-up / allowance / pool = blue, tasks = neutral;
// a low state turns the tile amber, an exhausted one danger. Each tile sets
// --pm-ink once and its icon, action and ring read it, so a tone change is
// one class, not four. Tokens come from .wd in workApp.css.js.
export const PLAN_METERS_CSS = `
.wd-pm{margin-top:var(--sp-7)}
.wd-pm-head{margin-bottom:var(--sp-3)}
.wd-pm-head h2{font-family:var(--wd-display);font-weight:700;font-size:var(--fs-lg);letter-spacing:-.01em;line-height:1.3}
.wd-pm-head p{color:var(--mut);font-size:var(--fs-md);margin-top:2px;line-height:1.45;max-width:64ch}
.wd-pm-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--sp-3)}

.wd-pm-tile{--pm-ink:var(--tint-neutral-ink);position:relative;background:var(--tint-neutral);border:none;border-radius:var(--r-lg);box-shadow:var(--sh-0);padding:18px 18px 16px;min-width:0;display:flex;flex-direction:column;gap:12px}
.wd-pm-tile.tint-green{--pm-ink:var(--tint-green-ink);background:var(--tint-green)}
.wd-pm-tile.tint-blue{--pm-ink:var(--tint-blue-ink);background:var(--tint-blue)}
.wd-pm-tile.low{--pm-ink:var(--tint-amber-ink);background:var(--tint-amber)}
.wd-pm-tile.out{--pm-ink:var(--danger);background:var(--danger-fill)}
.wd-pm-top{display:flex;align-items:center;gap:9px;min-width:0}
.wd-pm-ic{display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:var(--r-xs);background:var(--panel);color:var(--pm-ink);border:none;flex-shrink:0}
.wd-pm-ic.alt,.wd-pm-ic.warm{color:var(--pm-ink)}
/* The label wraps to a second line when the text scale or a wider font needs
   it; a tile never truncates its own label (design-time gate). */
.wd-pm-label{font-size:var(--fs-md);color:var(--tx-2);font-weight:600;line-height:1.3;min-width:0;overflow-wrap:anywhere;flex:1 1 auto}

/* Info affordance + tooltip (same mechanics as before: hover on the wrap,
   keyboard focus-visible on the button; one tip at a time). */
.wd-pm-info-wrap{position:relative;flex-shrink:0;display:inline-flex}
.wd-pm-info{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:var(--r-xs);border:none;background:transparent;color:var(--mut);cursor:help;padding:0;transition:color .15s,background .15s}
.wd-pm-info:hover{color:var(--pm-ink);background:var(--panel)}
.wd-pm-tip{position:absolute;z-index:20;top:calc(100% + 8px);right:0;width:max-content;max-width:min(260px,72vw);background:var(--tip-bg);color:var(--tip-tx);font-size:calc(12px*var(--wc-fs,1));font-weight:500;line-height:1.5;border-radius:var(--r-sm);padding:9px 11px;box-shadow:var(--sh-3);opacity:0;visibility:hidden;transform:translateY(-3px);transition:opacity .15s,transform .15s,visibility .15s;pointer-events:none;white-space:normal}
.wd-pm-tip:after{content:"";position:absolute;bottom:100%;right:12px;border:5px solid transparent;border-bottom-color:var(--tip-bg)}
.wd-pm-info-wrap:hover .wd-pm-tip{opacity:1;visibility:visible;transform:none}
@supports selector(:has(a)){.wd-pm-info-wrap:has(.wd-pm-info:focus-visible) .wd-pm-tip{opacity:1;visibility:visible;transform:none}}
@supports not selector(:has(a)){.wd-pm-info-wrap:focus-within .wd-pm-tip{opacity:1;visibility:visible;transform:none}}

/* Tile body: a big ring beside the value (hours tile), or the value alone. */
.wd-pm-body{display:flex;align-items:center;gap:14px;min-width:0}
.wd-pm-body .wd-ring{flex-shrink:0}
.wd-pm-main{min-width:0;flex:1 1 auto}
.wd-pm-value{font-family:var(--wd-display);font-weight:700;font-size:calc(28px*var(--wc-fs,1));line-height:1.05;letter-spacing:-.015em;color:var(--tx);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wd-pm-value small{font-size:calc(13px*var(--wc-fs,1));font-weight:500;color:var(--mut);font-family:var(--wd-body);margin-left:4px}
.wd-pm-tile.low .wd-pm-value{color:var(--warm)}
.wd-pm-tile.out .wd-pm-value{color:var(--danger)}
/* Sub lines wrap rather than clip: a tile is never allowed to cut a value off,
   not even with an ellipsis (design-time gate). */
.wd-pm-sub{font-size:var(--fs-sm);color:var(--mut);line-height:1.4;margin-top:4px;min-width:0;overflow-wrap:anywhere}
.wd-pm-sub.warm{color:var(--warm);font-weight:600}
.wd-pm-sub.out{color:var(--danger);font-weight:600}
.wd-pm-sub svg{vertical-align:-2px;margin-right:3px}
.wd-pm-pipsrow{display:flex;align-items:center;gap:10px;flex-wrap:wrap;min-width:0;margin-top:6px}
/* A quiet secondary action inside a tile (Buy hours): white pill on the tint. */
.wd-pm-act{display:inline-flex;align-items:center;gap:6px;flex-shrink:0;white-space:nowrap;align-self:flex-start;height:32px;padding:0 13px;border-radius:var(--r-pill);border:1px solid transparent;background:var(--panel);color:var(--pm-ink);font:inherit;font-size:var(--fs-sm);font-weight:600;line-height:1;cursor:pointer;text-decoration:none;transition:border-color .15s,box-shadow .15s}
.wd-pm-act:hover{border-color:var(--em-line);box-shadow:var(--sh-2)}
.wd-pm-act svg{flex-shrink:0}

/* Skeleton while usage is loading: same footprint, so nothing jumps. */
.wd-pm-skel-top{height:32px;width:60%;border-radius:var(--r-xs);background:var(--panel);opacity:.8}
.wd-pm-skel-v{height:28px;width:48%;border-radius:7px;background:var(--panel);opacity:.8;margin-top:10px}
.wd-pm-skel-s{height:11px;width:70%;border-radius:6px;background:var(--panel);opacity:.8;margin-top:9px}

/* The one state banner: text + the action that resolves it. */
.wd-pm-state{margin-top:var(--sp-3);display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:12px 16px;border-radius:var(--r);border:none;background:var(--tint-amber)}
.wd-pm-state.out{background:var(--danger-fill)}
.wd-pm-state-t{flex:1 1 260px;min-width:0;display:flex;gap:9px;align-items:flex-start;font-size:var(--fs-md);line-height:1.5;color:var(--tx)}
.wd-pm-state-t svg{flex-shrink:0;margin-top:2px;color:var(--warm)}
.wd-pm-state.out .wd-pm-state-t svg{color:var(--danger)}
.wd-pm-state-acts{display:flex;gap:8px;flex-wrap:wrap;flex-shrink:0}
.wd-pm-state-act{display:inline-flex;align-items:center;justify-content:center;gap:6px;flex-shrink:0;white-space:nowrap;height:34px;padding:0 14px;border-radius:var(--r-pill);border:1px solid var(--em-solid);background:var(--em-solid);color:var(--on-solid);font:inherit;font-size:calc(13px*var(--wc-fs,1));font-weight:600;line-height:1;cursor:pointer;text-decoration:none;transition:filter .15s}
.wd-pm-state-act:hover{filter:brightness(1.05)}
.wd-pm-state-act.ghost{background:var(--panel);color:var(--em-deep);border-color:transparent}
.wd-pm-state-act.ghost:hover{box-shadow:var(--sh-2);filter:none}
.wd-pm-state-act svg{flex-shrink:0}

@media(max-width:640px){
 .wd-pm-grid{grid-template-columns:1fr}
 .wd-pm-state-acts{flex-basis:100%}
 .wd-pm-state-act{flex:1 1 auto}
}
@media(prefers-reduced-motion:reduce){.wd-pm-tip,.wd-pm-act,.wd-pm-state-act{transition:none}}
`
