// Styles for the planning state (PlanningLoader.jsx): the screen the person
// sees between sharing their screen and the first step card. Injected by the
// console next to CONSOLE_CSS, so every color is one of the console's own
// aliases (.wc: --surface, --border, --text, --brand-*, --obs, --success...)
// and Light / Dark / Heavy flow from the one token sheet. No literal palette.
//
// Motion is ONE scan sweep on the stylised screen, a quiet shimmer on the
// step skeleton and the console's existing wc-blink dot. prefers-reduced-motion
// removes all of it and shows the static end state (the screen as read, the
// skeleton as plain placeholders).
export const PLANNING_LOADER_CSS = `
.wc-plan{position:relative;display:flex;flex-direction:column;gap:16px;background:var(--surface);border:1px solid var(--border);border-radius:var(--r-lg,18px);box-shadow:var(--shadow-sm);padding:20px 20px 18px;overflow:hidden;min-width:0}
.wc-plan-head{display:flex;align-items:center;gap:10px;min-width:0}
.wc-plan-dot{flex:0 0 auto;width:9px;height:9px;border-radius:50%;background:var(--brand-500);animation:wc-blink 1.4s ease-in-out infinite}
.wc-plan-ok{flex:0 0 auto;width:22px;height:22px;border-radius:50%;display:grid;place-items:center;color:var(--success);background:var(--success-soft)}
.wc-plan-t{flex:1 1 auto;min-width:0;font-family:var(--wc-display);font-size:18px;font-weight:700;letter-spacing:-.015em;color:var(--text);line-height:1.25;overflow-wrap:anywhere}
.wc-plan-n{flex:0 0 auto;font-size:11.5px;font-weight:700;color:var(--brand-600);background:var(--brand-soft);border-radius:999px;padding:0 10px;height:24px;display:inline-flex;align-items:center;white-space:nowrap;font-variant-numeric:tabular-nums}

/* the picture: a stylised screen being read, beside the goal + the step skeleton */
.wc-plan-grid{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,6fr);gap:16px;align-items:stretch;min-width:0}
.wc-plan-screen{position:relative;min-width:0;min-height:168px;border-radius:14px;border:1px solid var(--border);background:var(--surface-2);overflow:hidden;display:flex;flex-direction:column}
.wc-plan-bar{display:flex;align-items:center;gap:5px;height:22px;padding:0 10px;border-bottom:1px solid var(--border);background:var(--surface)}
.wc-plan-bar i{width:7px;height:7px;border-radius:50%;background:var(--border-strong)}
.wc-plan-bar b{flex:1 1 auto;height:6px;margin:0 28% 0 10px;border-radius:3px;background:var(--border)}
.wc-plan-body{flex:1 1 auto;display:grid;grid-template-columns:30% minmax(0,1fr);gap:10px;padding:10px}
.wc-plan-nav{display:flex;flex-direction:column;gap:7px}
.wc-plan-nav i{display:block;height:7px;border-radius:4px;background:var(--border)}
.wc-plan-nav i:first-child{width:70%;background:var(--border-strong)}
.wc-plan-page{display:flex;flex-direction:column;gap:7px;min-width:0}
.wc-plan-page i{display:block;height:7px;border-radius:4px;background:var(--border)}
.wc-plan-page i.h{height:10px;width:55%;background:var(--border-strong)}
.wc-plan-page i.w2{width:86%}.wc-plan-page i.w3{width:64%}.wc-plan-page i.w4{width:78%}
.wc-plan-page i.btn{margin-top:auto;width:34%;height:14px;border-radius:6px;background:var(--brand-soft);border:1px solid var(--em-ring)}
/* the sweep: a soft band with a hairline that travels down the screen */
.wc-plan-sweep{position:absolute;left:0;right:0;top:22px;height:34px;pointer-events:none;background:linear-gradient(to bottom,transparent,var(--brand-soft));border-bottom:1.5px solid var(--brand-500);opacity:.95;animation:wc-plan-sweep 2.6s cubic-bezier(.45,.05,.55,.95) infinite alternate}
@keyframes wc-plan-sweep{from{transform:translateY(-34px)}to{transform:translateY(calc(100% + 110px))}}
.wc-plan-src{position:absolute;right:8px;bottom:8px;width:26px;height:26px;border-radius:8px;display:grid;place-items:center;color:var(--obs);background:var(--obs-soft);border:1px solid var(--obs-ring)}
.wc-plan.ready .wc-plan-sweep{display:none}
.wc-plan.ready .wc-plan-src{color:var(--success);background:var(--success-soft);border-color:transparent}
/* the caption under the screen: what is being read right now (real state) */
.wc-plan-read{display:flex;align-items:flex-start;gap:8px;font-size:12.5px;line-height:1.45;color:var(--text-muted);min-width:0}
.wc-plan-read svg{flex:0 0 auto;margin-top:2px;color:var(--obs)}
.wc-plan-left{display:flex;flex-direction:column;gap:8px;min-width:0}

/* the right column: the goal, then the step plan taking shape */
.wc-plan-side{display:flex;flex-direction:column;gap:10px;min-width:0}
.wc-plan-goal{border:1px solid var(--border);border-radius:12px;padding:9px 12px;background:var(--surface);min-width:0}
.wc-plan-k{display:block;font-size:10.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--text-faint);white-space:nowrap;margin-bottom:3px}
.wc-plan-goal-t{font-size:calc(14px*var(--wc-fs,1));font-weight:600;line-height:1.4;color:var(--text);overflow:hidden;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow-wrap:anywhere}
.wc-plan-skel{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:7px;min-width:0}
.wc-plan-row{display:flex;align-items:center;gap:9px;min-width:0;padding:7px 10px;border:1px solid var(--border);border-radius:11px;background:var(--surface-2)}
.wc-plan-row-n{flex:0 0 auto;width:20px;height:20px;border-radius:50%;display:grid;place-items:center;font-size:11px;font-weight:700;color:var(--text-muted);background:var(--surface);border:1px solid var(--border);font-variant-numeric:tabular-nums}
.wc-plan-row-bar{flex:1 1 auto;min-width:0;height:8px;border-radius:4px;background:linear-gradient(90deg,var(--border) 0%,var(--border-strong) 45%,var(--border) 90%);background-size:220% 100%;animation:wc-plan-shimmer 1.8s linear infinite}
.wc-plan-row-bar.s2{max-width:72%}.wc-plan-row-bar.s3{max-width:84%}
@keyframes wc-plan-shimmer{from{background-position:120% 0}to{background-position:-100% 0}}
.wc-plan-row-t{flex:1 1 auto;min-width:0;font-size:calc(13px*var(--wc-fs,1));line-height:1.4;color:var(--text);overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow-wrap:anywhere}
.wc-plan.ready .wc-plan-row{background:var(--surface);animation:wc-plan-rowin .3s cubic-bezier(.2,.8,.2,1) both}
.wc-plan.ready .wc-plan-row-n{color:var(--brand-600);background:var(--brand-soft);border-color:transparent}
@keyframes wc-plan-rowin{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}
.wc-plan-more{font-size:12px;color:var(--text-muted);padding:0 2px}
.wc-plan-write{display:flex;align-items:flex-start;gap:8px;font-size:12.5px;line-height:1.45;color:var(--text-muted);min-width:0}
.wc-plan-write svg{flex:0 0 auto;margin-top:2px;color:var(--brand-600)}

/* the promise: three short benefit lines */
.wc-plan-promise{display:flex;flex-direction:column;gap:8px;padding-top:14px;border-top:1px solid var(--border);min-width:0}
.wc-plan-promise ul{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px 14px}
.wc-plan-promise li{display:flex;align-items:flex-start;gap:7px;font-size:12.5px;line-height:1.4;color:var(--text);min-width:0}
.wc-plan-promise li svg{flex:0 0 auto;margin-top:1px;color:var(--success)}
/* a long wait: an honest note, never a bar or a number */
.wc-plan-slow{display:flex;align-items:flex-start;gap:8px;font-size:12.5px;line-height:1.45;color:var(--text);background:var(--surface-2);border:1px solid var(--border);border-radius:11px;padding:9px 12px;animation:wc-line-in .4s cubic-bezier(.2,.8,.2,1) both}
.wc-plan-slow svg{flex:0 0 auto;margin-top:2px;color:var(--warning)}

@media(max-width:640px){
  .wc-plan{padding:16px 14px 14px;gap:14px}
  .wc-plan-grid{grid-template-columns:minmax(0,1fr)}
  .wc-plan-screen{min-height:124px}
  .wc-plan-promise ul{grid-template-columns:minmax(0,1fr)}
  .wc-plan-t{font-size:16.5px}
}
@media(prefers-reduced-motion:reduce){
  .wc-plan-dot,.wc-plan-sweep,.wc-plan-row-bar,.wc-plan-slow,.wc-plan.ready .wc-plan-row{animation:none}
  .wc-plan-sweep{display:none}
  .wc-plan-row-bar{background:var(--border)}
}
`
