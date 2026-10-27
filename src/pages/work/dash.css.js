// Dashboard-only styles for the overview: the big START A TASK hero CTA and the
// "add more guided time" note's action. Every class is namespaced `wd-m-*` so
// it never clashes with the shared `wd-*` design system in workApp.css.js
// (which this page reuses read-only). The plan meters, month view, outcomes
// and task flow each carry their own stylesheet (planMeters.css.js,
// monthGraph.css.js, outcomes.css.js, taskFlow.css.js). Injected once via a
// <style> in Dashboard.jsx. It inherits the white-dashboard tokens (--em,
// --panel, --line, --mut, ...) defined on `.wd`, and the display font var
// --wd-display, so it stays on-brand in one surface.
export const DASH_CSS = `
/* ===== Big Start-a-task hero CTA ==========================================
   The page's primary action once you have a session: an inviting banner with a
   one-line benefit and a large confident button that navigates to /work/start.
   Icon tile + copy on the left, the button on the right; at narrow width the
   button drops full-width under the copy (never wraps or clips). */
.wd-m-hero{margin-top:18px;display:flex;align-items:center;gap:18px;background:var(--panel);border:1px solid var(--em-line);border-radius:16px;padding:20px 22px;box-shadow:var(--card-shadow);overflow:hidden}
.wd-m-hero-ic{display:inline-flex;align-items:center;justify-content:center;width:52px;height:52px;border-radius:14px;background:var(--em-fill);color:var(--em);border:1px solid var(--em-line);flex-shrink:0}
.wd-m-hero-body{flex:1 1 auto;min-width:0}
.wd-m-hero-eyebrow{display:block;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--em);line-height:1.2;margin-bottom:4px}
.wd-m-hero-title{font-family:var(--wd-display);font-weight:800;font-size:22px;letter-spacing:-.015em;line-height:1.2;color:var(--tx)}
.wd-m-hero-benefit{margin-top:5px;color:var(--mut);font-size:14px;line-height:1.5;max-width:60ch}
.wd-m-hero-cta{flex-shrink:0;white-space:nowrap;display:inline-flex;align-items:center;justify-content:center;gap:9px;height:46px;padding:0 24px;border-radius:12px;border:none;background:var(--em);color:#fff;font-family:var(--wd-display);font-weight:700;font-size:15.5px;line-height:1;cursor:pointer;transition:filter .15s,transform .15s}
.wd-m-hero-cta:hover:not(:disabled){filter:brightness(1.06);transform:translateY(-1px)}
.wd-m-hero-cta:active:not(:disabled){transform:none}
.wd-m-hero-cta:disabled{opacity:.5;cursor:default;transform:none}
.wd-m-hero-cta svg{flex-shrink:0}
.wd-m-hero-locked{flex-basis:100%;margin-top:4px;display:flex;align-items:center;gap:8px;font-size:12.5px;color:var(--warm);line-height:1.45}
.wd-m-hero-locked svg{flex-shrink:0}

/* ===== "Add more guided time" note: the action under its text ============ */
.wd-m-buy-act{display:inline-flex;align-items:center;gap:6px;flex-shrink:0;white-space:nowrap;margin-top:10px;height:32px;padding:0 13px;border-radius:999px;border:1px solid var(--em);background:var(--em);color:#fff;font:inherit;font-size:13px;font-weight:600;line-height:1;cursor:pointer;transition:filter .15s}
.wd-m-buy-act:hover{filter:brightness(1.05)}
.wd-m-buy-act svg{flex-shrink:0}

/* ===== Responsive ==========================================================
   The hero drops its button full-width at the narrow gate, so nothing wraps,
   clips or scrolls sideways at 640 or 375. */
@media(max-width:760px){
 .wd-m-hero{padding:18px}
}
@media(max-width:640px){
 .wd-m-hero{flex-wrap:wrap;gap:14px}
 .wd-m-hero-ic{width:46px;height:46px}
 .wd-m-hero-title{font-size:20px}
 .wd-m-hero-cta{flex-basis:100%;width:100%}
}
@media(prefers-reduced-motion:reduce){
 .wd-m-hero-cta,.wd-m-buy-act{transition:none}
}
`
