// Styles for the dashboard MONTH VIEW (src/pages/work/MonthGraph.jsx): guided
// time per day as thin columns, tasks started as a dot strip under them, one
// shared x axis, a legend, a hover / keyboard readout, the totals line and the
// table twin. Namespaced wd-mg-*. Marks carry the dashboard's own validated
// pair (guided time = --em, tasks = --em-2); every label wears text tokens.
export const MONTH_GRAPH_CSS = `
.wd-mg{margin-top:var(--sp-7);background:var(--panel);border:1px solid var(--line-soft);border-radius:var(--r-lg);box-shadow:var(--sh-0);padding:20px 22px 16px;min-width:0}
.wd-mg-head{display:flex;align-items:flex-start;gap:12px;flex-wrap:wrap;margin-bottom:var(--sp-3)}
.wd-mg-head .wd-ic{margin-top:0}
.wd-mg-head-txt{flex:1 1 240px;min-width:0}
.wd-mg-head h2{font-family:var(--wd-display);font-weight:700;font-size:var(--fs-lg);letter-spacing:-.01em;line-height:1.3}
.wd-mg-head p{color:var(--mut);font-size:var(--fs-md);margin-top:2px;line-height:1.45;max-width:64ch}
/* Legend: always present (two series). Swatches mirror the marks: a rect for
   the columns, a dot for the task strip. */
.wd-mg-legend{display:flex;align-items:center;gap:14px;flex-wrap:wrap;flex-shrink:0;font-size:calc(12.5px*var(--wc-fs,1));color:var(--mut);font-weight:600;white-space:nowrap}
.wd-mg-legend span{display:inline-flex;align-items:center;gap:6px}
.wd-mg-legend i{display:inline-block;flex-shrink:0}
.wd-mg-legend i.bar{width:10px;height:10px;border-radius:2px 2px 0 0;background:var(--em)}
.wd-mg-legend i.dot{width:9px;height:9px;border-radius:50%;background:var(--em-2)}

/* The plot. The wrapper is measured (ResizeObserver); the SVG fills it. */
.wd-mg-plot{position:relative;min-width:0;outline:none}
.wd-mg-plot.refresh svg{opacity:.55;transition:opacity .2s}
.wd-mg-plot:focus-visible{outline:2px solid var(--focus);outline-offset:4px;border-radius:10px}
/* Only the plot SVG fills its wrapper; the lucide icons in the head and the
   table button keep their own size attributes. */
.wd-mg-plot>svg{display:block;width:100%;height:auto;overflow:visible;font-family:"Figtree",system-ui,sans-serif}
.wd-mg .grid{stroke:var(--line-soft);stroke-width:1}
.wd-mg .base{stroke:var(--line-2);stroke-width:1}
.wd-mg .month{stroke:var(--line-2);stroke-width:1}
.wd-mg .tick{fill:var(--faint);font-size:calc(11px*var(--wc-fs,1));font-variant-numeric:tabular-nums}
.wd-mg .xl{fill:var(--mut);font-size:calc(11px*var(--wc-fs,1));font-weight:600}
.wd-mg .bar{fill:var(--em);transition:opacity .12s}
.wd-mg .bar.dim{opacity:.45}
.wd-mg .bar.on{opacity:1;filter:brightness(1.12)}
.wd-mg .dot{fill:var(--em-2);stroke:var(--panel);stroke-width:2}
.wd-mg .dot.dim{opacity:.45}
.wd-mg .more{fill:var(--mut);font-size:calc(10px*var(--wc-fs,1));font-weight:700;font-variant-numeric:tabular-nums}
.wd-mg .hit{fill:transparent;cursor:crosshair}
.wd-mg .hit.on{fill:color-mix(in srgb,var(--em) 7%,transparent)}
/* Readout (hover / arrow keys). Values lead, labels follow. */
.wd-mg-tip{position:absolute;z-index:5;top:0;transform:translate(-50%,calc(-100% - 6px));pointer-events:none;background:var(--tip-bg);color:var(--tip-tx);border-radius:var(--r-sm);padding:8px 11px;font-size:calc(12px*var(--wc-fs,1));line-height:1.45;box-shadow:var(--sh-3);white-space:nowrap}
.wd-mg-tip.left{transform:translate(-8%,calc(-100% - 6px))}
.wd-mg-tip.right{transform:translate(-92%,calc(-100% - 6px))}
.wd-mg-tip .d{display:block;font-weight:700;margin-bottom:2px}
.wd-mg-tip .r{display:flex;align-items:center;gap:7px}
.wd-mg-tip .r i{display:inline-block;width:8px;height:3px;border-radius:2px;background:var(--em);flex-shrink:0}
.wd-mg-tip .r i.dot{width:7px;height:7px;border-radius:50%;background:var(--em-2)}
.wd-mg-tip .r b{font-weight:700}
/* Empty frame: the chart stays, the message sits over it. */
.wd-mg-empty{position:absolute;inset:0;display:grid;place-items:center;padding:0 16px;text-align:center;pointer-events:none}
.wd-mg-empty span{background:var(--panel);border:1px solid var(--line);border-radius:999px;padding:7px 14px;font-size:calc(12.5px*var(--wc-fs,1));color:var(--mut);max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

/* Totals line + the table toggle. */
.wd-mg-foot{display:flex;align-items:center;gap:8px 16px;flex-wrap:wrap;margin-top:12px;padding-top:12px;border-top:1px solid var(--line-soft);font-size:calc(13px*var(--wc-fs,1));color:var(--mut)}
.wd-mg-foot b{color:var(--tx);font-weight:700}
.wd-mg-foot .sp{flex:1 1 8px}
.wd-mg-tbtn{display:inline-flex;align-items:center;gap:5px;flex-shrink:0;white-space:nowrap;background:none;border:none;padding:6px 10px;color:var(--em-deep);font:inherit;font-size:calc(13px*var(--wc-fs,1));font-weight:600;cursor:pointer;border-radius:var(--r-pill);transition:background .15s}
.wd-mg-tbtn:hover{background:var(--em-fill)}
.wd-mg-tbtn svg{flex-shrink:0;transition:transform .18s}
.wd-mg-tbtn[aria-expanded="true"] svg.ch{transform:rotate(90deg)}
.wd-mg-table{width:100%;border-collapse:collapse;margin-top:10px;font-size:calc(13px*var(--wc-fs,1))}
.wd-mg-table th{text-align:left;font-size:calc(11.5px*var(--wc-fs,1));font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--faint);padding:6px 8px;border-bottom:1px solid var(--line)}
.wd-mg-table td{padding:7px 8px;border-bottom:1px solid var(--line-soft);color:var(--tx);font-variant-numeric:tabular-nums;white-space:nowrap}
.wd-mg-table td.n,.wd-mg-table th.n{text-align:right}
.wd-mg-tnote{margin-top:8px;font-size:calc(12px*var(--wc-fs,1));color:var(--faint)}

/* Load error + skeleton. */
.wd-mg-err{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:14px;border:1px dashed var(--line-2);border-radius:var(--r);font-size:calc(13.5px*var(--wc-fs,1));color:var(--mut)}
.wd-mg-err svg{flex-shrink:0;color:var(--warm)}
.wd-mg-err b{color:var(--tx);display:block}
.wd-mg-skel{height:190px;border-radius:var(--r-sm);background:var(--track);opacity:.55}

.wd-sr{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
@media(max-width:640px){.wd-mg{padding:14px 12px 12px}}
@media(prefers-reduced-motion:reduce){.wd-mg .bar,.wd-mg-plot.refresh svg,.wd-mg-tbtn svg{transition:none}}
`
