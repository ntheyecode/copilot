// Dashboard-only styles for the guided overview additions: the METRICS ROW
// (minutes / tasks / banked credits, each with an info tooltip) and the big
// START A TASK hero CTA. Every class is namespaced `wd-m-*` so it never clashes
// with the shared `wd-*` design system in workApp.css.js (which this page reuses
// read-only). Injected once via a <style> in Dashboard.jsx. It inherits the
// white-dashboard tokens (--em, --panel, --line, --mut, ...) defined on `.wd`,
// and the display font var --wd-display, so it stays on-brand in one surface.
export const DASH_CSS = `
/* ===== Metrics row =========================================================
   A guided, at-a-glance tile set that mirrors the top-bar plan pill (same live
   usage, a welcoming second surface). Section head + a responsive grid of
   tiles; each tile carries a small info affordance whose tooltip guides. */
.wd-m-metrics{margin-top:18px}
.wd-m-metrics-head{margin-bottom:12px}
.wd-m-metrics-head h2{font-family:var(--wd-display);font-weight:700;font-size:16px;letter-spacing:-.01em;line-height:1.3}
.wd-m-metrics-head p{color:var(--mut);font-size:13px;margin-top:3px;line-height:1.45;max-width:64ch}

.wd-m-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}

.wd-m-tile{position:relative;background:var(--panel);border:1px solid var(--line);border-radius:var(--r);box-shadow:var(--card-shadow);padding:14px 16px;min-width:0;transition:border-color .18s,box-shadow .18s}
.wd-m-tile:hover{border-color:var(--line-2)}
.wd-m-tile.low{border-color:var(--warm-line);background:var(--warm-fill)}
.wd-m-tile-top{display:flex;align-items:center;gap:8px;min-width:0}
.wd-m-ic{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:8px;background:var(--em-fill);color:var(--em);border:1px solid var(--em-line);flex-shrink:0}
.wd-m-ic.alt{color:var(--em-2);background:var(--info-fill);border-color:var(--info-line)}
.wd-m-ic.warm{color:var(--warm);background:var(--warm-fill);border-color:var(--warm-line)}
.wd-m-label{font-size:12.5px;color:var(--mut);font-weight:600;line-height:1.3;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1 1 auto}

/* Info affordance + guiding tooltip. The tip shows on hover of the wrap and on
   keyboard focus of the button (focus-within), so it is reachable without a
   mouse. It is width-clamped and left-anchored to the tile, so it never forces
   a horizontal scrollbar at any width. */
.wd-m-info-wrap{position:relative;flex-shrink:0;display:inline-flex}
.wd-m-info{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:7px;border:1px solid var(--line);background:var(--panel);color:var(--mut);cursor:help;padding:0;transition:color .15s,border-color .15s,background .15s}
.wd-m-info:hover{color:var(--em-2);border-color:var(--info-line);background:var(--info-fill)}
.wd-m-tip{position:absolute;z-index:20;top:calc(100% + 8px);left:auto;right:0;width:max-content;max-width:min(248px,72vw);background:var(--tx);color:#fff;font-size:12px;font-weight:500;line-height:1.5;border-radius:10px;padding:9px 11px;box-shadow:var(--shadow);opacity:0;visibility:hidden;transform:translateY(-3px);transition:opacity .15s,transform .15s,visibility .15s;pointer-events:none}
.wd-m-tip:after{content:"";position:absolute;bottom:100%;right:12px;border:5px solid transparent;border-bottom-color:var(--tx)}
.wd-m-info-wrap:hover .wd-m-tip{opacity:1;visibility:visible;transform:none}
/* ONE tip at a time. A mouse click leaves the info button focused, so a plain
   :focus-within kept that tip open while the next tile was hovered (two tips
   visible). Keyboard users still get the tip: it opens on :focus-visible (set
   by Tab, not by a click). Browsers without :has() keep the focus-within rule. */
@supports selector(:has(a)){.wd-m-info-wrap:has(.wd-m-info:focus-visible) .wd-m-tip{opacity:1;visibility:visible;transform:none}}
@supports not selector(:has(a)){.wd-m-info-wrap:focus-within .wd-m-tip{opacity:1;visibility:visible;transform:none}}

.wd-m-value{margin-top:10px;font-family:var(--wd-display);font-weight:700;font-size:26px;line-height:1.05;letter-spacing:-.01em;color:var(--tx);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wd-m-tile.low .wd-m-value{color:var(--warm)}
.wd-m-value small{font-size:13px;font-weight:500;color:var(--faint);font-family:"Figtree",system-ui,sans-serif;margin-left:3px}
.wd-m-sub{margin-top:4px;font-size:12px;color:var(--mut);line-height:1.4;display:flex;align-items:center;gap:6px;min-width:0}
.wd-m-sub .wd-m-lowtag{color:var(--warm);font-weight:700}
.wd-m-sub svg{flex-shrink:0}

/* Skeleton while usage is null: a quiet shimmer, same footprint as a real tile
   so the row never jumps when data lands. */
.wd-m-skel-top{height:28px;width:60%;border-radius:8px;background:var(--track)}
.wd-m-skel-v{height:26px;width:48%;border-radius:7px;background:var(--track);margin-top:12px}
.wd-m-skel-s{height:11px;width:70%;border-radius:6px;background:var(--track);margin-top:9px}

/* Trade action: a quiet full-width bar under the grid. One confident control,
   nowrap so it never breaks; the note gives up its space first at narrow width. */
.wd-m-trade{margin-top:12px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;background:var(--em-fill);border:1px solid var(--em-line);border-radius:var(--r);padding:10px 14px}
.wd-m-trade-note{flex:1 1 220px;min-width:0;font-size:12.5px;color:var(--mut-2);line-height:1.45}
.wd-m-trade-btn{flex-shrink:0;white-space:nowrap;display:inline-flex;align-items:center;gap:7px;height:34px;padding:0 14px;border-radius:999px;border:1px solid var(--em);background:var(--em);color:#fff;font:inherit;font-weight:600;font-size:13.5px;line-height:1;cursor:pointer;transition:filter .15s,opacity .15s}
.wd-m-trade-btn:hover:not(:disabled){filter:brightness(1.05)}
.wd-m-trade-btn:disabled{opacity:.6;cursor:default}
.wd-m-trade-btn svg{flex-shrink:0}

/* ===== Big Start-a-task hero CTA ==========================================
   The page's primary action: an inviting banner with a one-line benefit and a
   large confident button that navigates to /work/start. Icon tile + copy on the
   left, the button on the right; at narrow width the button drops full-width
   under the copy (never wraps or clips). */
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

/* ===== Responsive ==========================================================
   Metrics stack to 1-up and the hero drops its button full-width at the narrow
   gate, so nothing wraps, clips or scrolls sideways at 640. */
@media(max-width:760px){
 .wd-m-hero{padding:18px}
}
@media(max-width:640px){
 .wd-m-grid{grid-template-columns:1fr}
 .wd-m-hero{flex-wrap:wrap;gap:14px}
 .wd-m-hero-ic{width:46px;height:46px}
 .wd-m-hero-title{font-size:20px}
 .wd-m-hero-cta{flex-basis:100%;width:100%}
 /* The tooltip keeps the base right:0 (opens leftward from the info button at the
    tile's right edge) so at narrow width it stays on-screen instead of spilling
    past the right edge. Do not flip it to left:0 here, the anchor is the info
    button near the tile's right edge, not the tile's left. */
}
@media(prefers-reduced-motion:reduce){
 .wd-m-tile,.wd-m-tip,.wd-m-hero-cta,.wd-m-trade-btn{transition:none}
}
`
