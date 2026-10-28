// Styles for RECENT OUTCOMES (src/pages/work/Outcomes.jsx): completed tasks as
// compact expandable rows (collapsed by default, one open at a time), each
// opening to its goal, step list and report actions. Namespaced wd-oc-*.
export const OUTCOMES_CSS = `
.wd-oc{margin-top:var(--sp-7)}
.wd-oc-list{display:flex;flex-direction:column;gap:var(--sp-2)}
.wd-oc-row{background:var(--panel);border:1px solid var(--line-soft);border-radius:var(--r);box-shadow:var(--sh-0);min-width:0;overflow:hidden;transition:border-color .18s}
.wd-oc-row:hover{border-color:var(--line)}
.wd-oc-row.open{border-color:var(--em-line)}
.wd-oc-btn{width:100%;display:flex;align-items:center;gap:12px;padding:12px 16px;background:transparent;border:none;color:var(--tx);text-align:left;font:inherit;cursor:pointer;min-width:0;border-radius:0}
.wd-oc-btn:hover{background:var(--line-soft)}
.wd-oc-ic{width:32px;height:32px;border-radius:var(--r-xs);background:var(--tint-green);color:var(--tint-green-ink);display:inline-flex;align-items:center;justify-content:center;flex:0 0 32px;border:none}
/* Title over meta, each on its own line (they are spans inside a button, so
   the stacking must be explicit or they run together on one line). */
.wd-oc-main{flex:1;min-width:0;display:flex;flex-direction:column;overflow:hidden}
.wd-oc-t{display:block;font-weight:600;font-size:calc(14px*var(--wc-fs,1));overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wd-oc-m{display:block;font-size:var(--fs-sm);color:var(--mut);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wd-oc-m b{color:var(--em-deep);font-weight:600}
.wd-oc-chev{margin-left:auto;color:var(--mut);flex-shrink:0;transition:transform .18s}
.wd-oc-row.open .wd-oc-chev{transform:rotate(90deg)}
.wd-oc-body{padding:0 14px 14px 56px;border-top:1px solid var(--line-soft);padding-top:12px;display:flex;flex-direction:column;gap:12px}
.wd-oc-k{font-size:calc(10.5px*var(--wc-fs,1));font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--em-2);margin-bottom:5px}
.wd-oc-goal{font-size:calc(13.5px*var(--wc-fs,1));color:var(--tx-2);line-height:1.5;white-space:pre-wrap;overflow-wrap:anywhere}
.wd-oc-steps{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}
.wd-oc-steps li{display:flex;gap:8px;align-items:flex-start;font-size:calc(13px*var(--wc-fs,1));line-height:1.45;color:var(--tx-2);min-width:0}
.wd-oc-steps li svg{flex-shrink:0;margin-top:2px;color:var(--em)}
.wd-oc-steps li.todo svg{color:var(--faint)}
.wd-oc-steps li span{min-width:0;overflow-wrap:anywhere}
.wd-oc-more{font-size:calc(12.5px*var(--wc-fs,1));color:var(--faint)}
.wd-oc-acts{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.wd-oc-open{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 13px;border-radius:var(--r-pill);border:1px solid var(--line);background:var(--panel);color:var(--tx-2);font:inherit;font-weight:500;font-size:var(--fs-md);cursor:pointer;flex-shrink:0;white-space:nowrap;transition:background .15s,border-color .15s}
.wd-oc-open:hover{border-color:var(--line-2);background:var(--line-soft)}
.wd-oc-open svg{flex-shrink:0}
.wd-oc-all{display:inline-flex;align-items:center;justify-content:center;gap:7px;flex-shrink:0;white-space:nowrap;align-self:flex-start;margin-top:2px;color:var(--em-deep);font-size:calc(13px*var(--wc-fs,1));font-weight:600;text-decoration:none;padding:6px 2px}
.wd-oc-all:hover{color:var(--em)}
@media(max-width:640px){.wd-oc-body{padding-left:14px}}
@media(max-width:480px){.wd-oc-t,.wd-oc-m{white-space:normal;overflow-wrap:anywhere}}
@media(prefers-reduced-motion:reduce){.wd-oc-row,.wd-oc-chev,.wd-oc-open{transition:none}}
`
