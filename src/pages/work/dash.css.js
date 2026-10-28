// Dashboard-only styles for the overview: the primary START A TASK card and
// the "add more guided time" note's action. Every class is namespaced `wd-m-*`
// so it never clashes with the shared `wd-*` design system in workApp.css.js
// (which this page reuses read-only). The plan meters, month view, outcomes
// and task flow each carry their own stylesheet (planMeters.css.js,
// monthGraph.css.js, outcomes.css.js, taskFlow.css.js). Injected once via a
// <style> in Dashboard.jsx. Tokens only: colors, radii, spacing, type and
// shadow all come from the .wd token set (light + dark), never a literal.
export const DASH_CSS = `
/* ===== The primary action: Start a task ====================================
   First thing under the greeting (the center of the screen is the action, the
   stats come after). A soft green-tinted card with no outline, a white icon
   tile, one bold title, one quiet benefit line, and the single orange
   call-to-action. Icon + copy on the left, the button on the right; at narrow
   width the button drops full-width under the copy (never wraps or clips). */
.wd-m-hero{margin-top:var(--sp-6);display:flex;align-items:center;flex-wrap:wrap;gap:var(--sp-4) var(--sp-5);background:var(--tint-green);border:none;border-radius:var(--r-lg);padding:22px 24px;box-shadow:var(--sh-0);overflow:hidden}
.wd-m-hero-ic{display:inline-flex;align-items:center;justify-content:center;width:52px;height:52px;border-radius:var(--r);background:var(--panel);color:var(--tint-green-ink);border:none;flex-shrink:0}
.wd-m-hero-body{flex:1 1 320px;min-width:0}
.wd-m-hero-eyebrow{display:block;font-size:var(--fs-sm);font-weight:600;color:var(--tint-green-ink);line-height:1.2;margin-bottom:4px}
.wd-m-hero-title{font-family:var(--wd-display);font-weight:700;font-size:var(--fs-2xl);letter-spacing:-.015em;line-height:1.2;color:var(--tx)}
.wd-m-hero-benefit{margin-top:5px;color:var(--mut);font-size:var(--fs-base);line-height:1.5;max-width:60ch}
.wd-m-hero-cta{flex-shrink:0;white-space:nowrap;margin-left:auto;display:inline-flex;align-items:center;justify-content:center;gap:9px;height:46px;padding:0 24px;border-radius:var(--r-sm);border:none;background:var(--cta);color:var(--cta-ink);font-family:var(--wd-display);font-weight:700;font-size:15.5px;line-height:1;cursor:pointer;transition:background .15s,transform .15s}
.wd-m-hero-cta:hover:not(:disabled){background:var(--cta-hover);transform:translateY(-1px)}
.wd-m-hero-cta:active:not(:disabled){transform:none}
.wd-m-hero-cta:disabled{opacity:.5;cursor:default;transform:none}
.wd-m-hero-cta svg{flex-shrink:0}
.wd-m-hero-locked{flex-basis:100%;margin-top:-4px;display:flex;align-items:center;gap:8px;font-size:var(--fs-sm);color:var(--warm);line-height:1.45}
.wd-m-hero-locked svg{flex-shrink:0}

/* ===== "Add more guided time" note: the action under its text ============ */
.wd-m-buy-act{display:inline-flex;align-items:center;gap:6px;flex-shrink:0;white-space:nowrap;margin-top:10px;height:32px;padding:0 13px;border-radius:var(--r-pill);border:1px solid var(--em);background:var(--em);color:var(--on-em);font:inherit;font-size:13px;font-weight:600;line-height:1;cursor:pointer;transition:filter .15s}
.wd-m-buy-act:hover{filter:brightness(1.05)}
.wd-m-buy-act svg{flex-shrink:0}

/* ===== Responsive ==========================================================
   The primary card drops its button full-width at the narrow gate, so nothing
   wraps, clips or scrolls sideways at 640 or 375. */
@media(max-width:760px){
 .wd-m-hero{padding:18px}
}
@media(max-width:640px){
 .wd-m-hero{gap:14px}
 .wd-m-hero-ic{width:46px;height:46px}
 .wd-m-hero-title{font-size:20px}
 .wd-m-hero-cta{flex-basis:100%;width:100%;margin-left:0}
}
@media(prefers-reduced-motion:reduce){
 .wd-m-hero-cta,.wd-m-buy-act{transition:none}
}
`
