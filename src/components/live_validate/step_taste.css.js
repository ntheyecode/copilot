// Styles for the step taste (StepTaste.jsx): the previewed step cards, their
// "Exactly how" sub-steps and the locked teaser of the remaining steps. Every
// colour is a --c-* token from console.css.js (light by default, dark under
// .lv-con-dark), so the two themes can never drift apart here. Included by
// console.css.js; the step card's rise reads the same stagger the reveal
// timeline uses.
import { STEP_STAGGER_MS } from './plan_model.js'

export const STEP_TASTE_CSS = `
/* the steps, one by one, exactly as the product shows them */
.lv-steps{list-style:none;margin:14px 0 0;padding:0;display:flex;flex-direction:column;gap:10px}
.lv-step{--i:0;opacity:0;animation:lv-rise .45s cubic-bezier(.2,.8,.2,1) forwards;animation-delay:calc(var(--i) * ${STEP_STAGGER_MS}ms);border:1px solid var(--c-acc-line);background:var(--c-acc-fill);border-radius:13px;padding:11px 13px;min-width:0}
.lv-step-l{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--c-acc);font-weight:800;margin-bottom:6px}
.lv-step-l>span{display:inline-flex;align-items:center;gap:6px;min-width:0}
.lv-step-n{color:var(--c-mut);letter-spacing:.06em;font-weight:700;white-space:nowrap;text-transform:none;flex:0 0 auto}
.lv-step-do{font-size:14.5px;font-weight:600;line-height:1.5;color:var(--c-tx);overflow-wrap:anywhere}
/* "Exactly how": the sub-steps. The first cards show them open; a later card
   keeps them behind one full-width control that reads as a control (border,
   chevron, count, verb), never a bare caption. The list stays in the DOM
   (hidden) so aria-controls always points at it. */
.lv-how{margin-top:9px;border:1px solid var(--c-cyan-line);border-radius:11px;background:var(--c-cyan-fill);min-width:0;overflow:hidden}
.lv-how.open{border-color:var(--c-line);background:var(--c-fill)}
.lv-how-t{display:flex;align-items:center;gap:8px;width:100%;min-width:0;padding:8px 11px;border:none;background:transparent;color:var(--c-cyan);font:inherit;text-align:start;cursor:pointer;transition:background .14s}
.lv-how-t:hover{background:var(--c-cyan-fill2)}
.lv-how-chev{flex:0 0 auto;transition:transform .18s}
.lv-how.open .lv-how-chev{transform:rotate(180deg)}
.lv-how-k{font-size:10px;letter-spacing:.14em;text-transform:uppercase;font-weight:800;white-space:nowrap}
.lv-how-c{font-size:11px;font-weight:700;color:var(--c-mut);white-space:nowrap;border:1px solid var(--c-line2);border-radius:999px;padding:1px 7px}
.lv-how-a{margin-inline-start:auto;flex:0 0 auto;font-size:11.5px;font-weight:700;color:var(--c-cyan);white-space:nowrap;text-decoration:underline;text-underline-offset:3px}
.lv-how.open .lv-how-a{color:var(--c-mut)}
.lv-how ol{margin:0;padding:2px 11px 10px 30px;display:flex;flex-direction:column;gap:6px}
[dir="rtl"] .lv-how ol{padding:2px 30px 10px 11px}
.lv-how ol[hidden]{display:none}
.lv-how li{font-size:13px;line-height:1.5;color:var(--c-tx2);overflow-wrap:anywhere}
.lv-how li::marker{color:var(--c-cyan);font-weight:700}
/* what a live session continues with: the real step titles the server sent,
   each row opening to what a live session gives for it (the same three things
   every time, named honestly: never a sub-step the server did not send). */
.lv-locked{position:relative;margin-top:12px;border:1px dashed var(--c-line2);border-radius:13px;padding:11px 13px;background:var(--c-fill);opacity:0;animation:lv-rise .45s ease forwards;animation-delay:var(--d,0ms);min-width:0}
.lv-locked-h{display:flex;align-items:center;gap:8px;font-size:12.5px;font-weight:600;color:var(--c-tx2);margin-bottom:9px;min-width:0;flex-wrap:wrap}
.lv-locked-h>svg{color:var(--c-acc);flex:0 0 auto}
.lv-locked-h>span:first-of-type{min-width:0;flex:1 1 180px}
.lv-lock{display:inline-flex;align-items:center;gap:5px;margin-inline-start:auto;font-size:10px;letter-spacing:.1em;text-transform:uppercase;font-weight:800;color:var(--c-warm);border:1px solid var(--c-warm-line);border-radius:999px;padding:2px 8px;white-space:nowrap}
.lv-locked ol{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}
.lv-locked li{min-width:0;border:1px solid transparent;border-radius:11px;transition:border-color .2s,background .2s}
.lv-locked li.open{border-color:var(--c-line);background:var(--c-fill)}
.lv-lrow{display:flex;align-items:flex-start;gap:10px;flex-wrap:wrap;min-width:0;padding:6px 8px}
.lv-lrow .n{flex:0 0 20px;width:20px;height:20px;border-radius:50%;border:1px solid var(--c-line2);display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--c-mut);margin-top:1px}
.lv-lrow .t{flex:1 1 160px;min-width:0;font-size:13.5px;line-height:1.45;color:var(--c-tx2);overflow-wrap:anywhere;padding-top:2px}
.lv-lrow-b{flex:0 0 auto;margin-inline-start:auto;display:inline-flex;align-items:center;gap:5px;padding:4px 9px;border-radius:999px;border:1px solid var(--c-warm-line);background:var(--c-warm-fill);color:var(--c-warm);font:inherit;font-size:11.5px;font-weight:700;white-space:nowrap;cursor:pointer;transition:background .14s,border-color .14s}
.lv-lrow-b:hover{background:var(--c-warm-fill2);border-color:var(--c-warm-strong)}
.lv-lrow-b svg{flex:0 0 auto;transition:transform .18s}
.lv-locked li.open .lv-lrow-b svg{transform:rotate(180deg)}
.lv-locked li.open .lv-lrow-b{color:var(--c-mut);border-color:var(--c-line2);background:transparent}
.lv-lgive{list-style:none;margin:0;padding:0 8px 9px 38px;display:flex;flex-direction:column;gap:5px}
[dir="rtl"] .lv-lgive{padding:0 38px 9px 8px}
.lv-lgive[hidden]{display:none}
.lv-lgive li{display:flex;align-items:flex-start;gap:7px;font-size:12.5px;line-height:1.45;color:var(--c-tx2);overflow-wrap:anywhere;border:none;background:none;padding:0;border-radius:0}
.lv-lgive svg{flex:0 0 auto;margin-top:2px;color:var(--c-warm)}
.lv-locked li.tick .n{background:var(--c-ok-bg);border-color:var(--c-ok-bg);color:var(--c-ok-tx);transition:background .25s,border-color .25s}
.lv-locked-n{display:flex;align-items:flex-start;gap:7px;margin:9px 0 0;padding:0 2px;font-size:12px;line-height:1.45;color:var(--c-mut);overflow-wrap:anywhere}
.lv-locked-n svg{flex:0 0 auto;margin-top:2px;color:var(--c-acc)}
@media(max-width:560px){
 .lv-how-c{display:none}
 .lv-lgive{padding-inline-start:30px}
}
`
