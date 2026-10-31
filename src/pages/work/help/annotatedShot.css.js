// Styles for the annotated help screenshot (AnnotatedShot.jsx) and the short
// how-to path (HelpPath). Used by BOTH help surfaces: the in-app Help page
// (.wd shell) and the company console's Help (.wka, which carries the same
// wd-tokens), so every value reads a shared token (--cta, --panel, --line, --tx,
// --mut, --focus, --wc-fs) and follows Light / Dark / Heavy and the user's text
// size. The callout color is the one call-to-action orange (--cta): it stays
// distinct from the green / blue product UI inside every screenshot.
//
// Design-time gate (SUPREME RULE XIV): the stage never exceeds its column
// (max-width set per shot, width:100%), callout pins clamp inside the image, the
// key list and the path collapse to one column at phone width, and nothing sets
// a fixed width that could force a horizontal scroll at 640px.
export const ANNOTATED_SHOT_CSS = `
.hs{margin:12px 0 26px;min-width:0;--hs-mark:var(--cta,#c9501a)}
.hs-wrap{min-width:0;width:100%}
.hs-stage{position:relative;width:100%;border-radius:12px;border:1px solid var(--line,#e6e9f0);background:var(--panel,#fff);box-shadow:var(--sh-2,0 10px 24px -18px rgba(26,31,54,.22))}
.hs-stage img{display:block;width:100%;height:auto;border-radius:11px}
.hs-ov{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;border-radius:11px;overflow:hidden}
.hs-dim{fill:rgba(14,18,32,.34);opacity:0;transition:opacity .18s ease}
.hs.is-on .hs-dim{opacity:1}
.hs-halo{fill:none;stroke:#fff;stroke-width:5;opacity:.9}
.hs-box{fill:none;stroke:var(--hs-mark);stroke-width:2.25;transition:stroke-width .15s ease}
.hs-box.on{stroke-width:3.5}
.hs-pin{position:absolute;z-index:2;transform:translate(-50%,-50%);width:26px;height:26px;padding:0;border-radius:50%;border:2px solid #fff;background:var(--hs-mark);color:#fff;font:800 calc(12.5px*var(--wc-fs,1))/1 var(--wd-body,system-ui,sans-serif);display:grid;place-items:center;cursor:pointer;box-shadow:0 2px 6px rgba(14,18,32,.35);transition:transform .15s ease}
.hs-pin:hover,.hs-pin.on{transform:translate(-50%,-50%) scale(1.14)}
.hs-pin:focus-visible{outline:3px solid var(--focus,#0e9f6e);outline-offset:2px}
.hs-keys{list-style:none;margin:12px 0 0;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:6px 16px}
.hs-keys li{display:flex;gap:10px;align-items:flex-start;min-width:0;padding:7px 9px;border-radius:10px;font-size:calc(13.5px*var(--wc-fs,1));line-height:1.5;color:var(--mut,#5f6887);transition:background .15s ease}
.hs-keys li.on{background:var(--cta-fill,#fdf0e8)}
.hs-keys li span:last-child{min-width:0;overflow-wrap:anywhere}
.hs-keys b{color:var(--tx,#1a1f33);font-weight:650}
.hs-n{flex:0 0 22px;width:22px;height:22px;margin-top:1px;border-radius:50%;background:var(--hs-mark);color:#fff;font-weight:800;font-size:calc(12px*var(--wc-fs,1));display:grid;place-items:center}
.hs-cap{margin-top:8px;font-size:calc(12.5px*var(--wc-fs,1));color:var(--mut,#5f6887);line-height:1.5}
.hs-path{list-style:none;margin:10px 0 18px;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:8px;counter-reset:hs-path}
.hs-path li{position:relative;display:flex;gap:10px;align-items:flex-start;min-width:0;padding:10px 12px;border:1px solid var(--line,#e6e9f0);border-radius:12px;background:var(--panel,#fff);font-size:calc(13.5px*var(--wc-fs,1));line-height:1.45;color:var(--tx-2,#2c3350)}
.hs-path li span:last-child{min-width:0;overflow-wrap:anywhere}
.hs-path b{color:var(--tx,#1a1f33);font-weight:650}
.hs-path-n{flex:0 0 22px;width:22px;height:22px;border-radius:50%;background:var(--tint-green,#e7f6ef);color:var(--tint-green-ink,#0b7a53);font-weight:800;font-size:calc(12px*var(--wc-fs,1));display:grid;place-items:center}
.hs-lead{max-width:78ch}
.hs-note{display:flex;gap:9px;align-items:flex-start;margin:4px 0 16px;padding:11px 13px;border-radius:12px;background:var(--tint-blue,#eaf3fc);color:var(--tx,#1a1f33);font-size:calc(13.5px*var(--wc-fs,1));line-height:1.5}
.hs-note svg{flex-shrink:0;margin-top:2px;color:var(--tint-blue-ink,#085b93)}
@media (max-width:640px){
  .hs-pin{width:22px;height:22px;font-size:11px}
  .hs-keys,.hs-path{grid-template-columns:1fr}
}
@media (prefers-reduced-motion:reduce){
  .hs-dim,.hs-box,.hs-pin,.hs-keys li{transition:none}
}
`
