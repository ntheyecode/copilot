// LinkNotes, the individuals site: ONE stylesheet of tokens and shared
// primitives, scoped under `.ln` (injected once by IndivShell). Pages add only
// their own blocks (prefix per page).
//
// Look: "graph paper and markers". White paper with a faint dot grid, deep
// indigo ink, electric violet as the one action color and marker lime as the
// highlight. Inter Variable, heavy and tight, for every heading; JetBrains
// Mono for eyebrows, numerals and the exact values the guide gives. Flat
// 1.5px-line cards with a hard offset shadow on the thing that matters,
// pill buttons, a lime marker wash under the key phrase of each heading.
// Nothing here is shared with the AdmireVeda pages (their tokens are iv-/wm-).
//
// Theme: light only, like every public page (owner rule). Dark SECTIONS exist
// (.ln-sec.dark, the brain band, the final band) as fixed-color design, never
// as an OS preference. RTL: logical properties only; arrows flip under
// [dir="rtl"]. Motion: short, and off under prefers-reduced-motion.
export const LN_CSS = `
.ln{
  --ln-bg:#ffffff;--ln-bg-2:#f6f5fc;--ln-bg-3:#efedfa;
  --ln-ink:#14122b;--ln-ink-2:#4a4870;--ln-ink-3:#77759a;
  --ln-line:#e4e2f3;--ln-line-2:#cfcbe8;
  --ln-violet:#5b3df5;--ln-violet-2:#7c5cff;--ln-violet-ink:#4a2fe0;--ln-violet-soft:#ece8ff;
  --ln-lime:#c9f23a;--ln-lime-ink:#2f3a00;--ln-lime-soft:#f1fbc8;
  --ln-amber:#ffb020;--ln-amber-soft:#fff3d6;--ln-amber-ink:#6b4a00;
  --ln-dark:#14122b;--ln-dark-2:#1f1c45;--ln-on-dark:#f3f2ff;--ln-on-dark-2:#b9b6d9;
  --ln-r:20px;--ln-r-sm:12px;
  --ln-pop:5px 5px 0 var(--ln-lime);
  --ln-display:"Inter Variable","Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;
  --ln-body:"Inter Variable","Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;
  --ln-mono:"JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  background:var(--ln-bg);color:var(--ln-ink);font-family:var(--ln-body);-webkit-font-smoothing:antialiased;
  min-height:100vh;display:flex;flex-direction:column;text-align:start;overflow-x:clip}
.ln *,.ln *::before,.ln *::after{box-sizing:border-box}
.ln a{color:inherit;text-decoration:none}
.ln a:focus-visible,.ln button:focus-visible,.ln input:focus-visible,.ln summary:focus-visible{outline:3px solid var(--ln-violet);outline-offset:3px;border-radius:8px}
.ln main{flex:1 0 auto}
.ln-wrap{width:100%;max-width:1180px;margin:0 auto;padding-inline:24px}
.ln h1,.ln h2,.ln h3{font-family:var(--ln-display);margin:0;color:var(--ln-ink);text-wrap:balance}
.ln h1{font-size:clamp(38px,6vw,72px);line-height:.98;font-weight:800;letter-spacing:-.045em}
.ln h2{font-size:clamp(28px,3.8vw,46px);line-height:1.04;font-weight:800;letter-spacing:-.035em}
.ln h3{font-size:19px;line-height:1.25;font-weight:700;letter-spacing:-.015em}
.ln p{margin:0;line-height:1.6;color:var(--ln-ink-2)}
/* the marker wash under the key phrase of a heading */
.ln h1 em,.ln h2 em{font-style:normal;color:var(--ln-ink);background:linear-gradient(transparent 62%,var(--ln-lime) 62%,var(--ln-lime) 94%,transparent 94%);padding-inline:.04em;box-decoration-break:clone;-webkit-box-decoration-break:clone}
.ln-eyebrow{display:inline-flex;align-items:center;gap:9px;font-family:var(--ln-mono);font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--ln-violet-ink);margin-bottom:16px}
.ln-eyebrow::before{content:"";width:10px;height:10px;border-radius:3px;background:var(--ln-lime);border:1.5px solid var(--ln-ink);flex:0 0 auto}
/* sections and the dot grid */
.ln-sec{padding-block:88px;position:relative}
.ln-sec.tight{padding-block:56px}
.ln-sec.tint{background:var(--ln-bg-2)}
.ln-sec.grid{background-image:radial-gradient(var(--ln-line-2) 1.1px,transparent 1.1px);background-size:22px 22px}
.ln-sec.dark{background:var(--ln-dark);color:var(--ln-on-dark)}
.ln-sec.dark h2,.ln-sec.dark h3{color:#fff}
.ln-sec.dark h2 em{color:#fff;background:linear-gradient(transparent 62%,var(--ln-violet) 62%,var(--ln-violet) 94%,transparent 94%)}
.ln-sec.dark p{color:var(--ln-on-dark-2)}
.ln-sec.dark .ln-eyebrow{color:var(--ln-lime)}
.ln-head{max-width:680px;margin-bottom:40px}
.ln-head p{font-size:18px;margin-top:14px}
.ln-head.center{margin-inline:auto;text-align:center}
.ln-head.center .ln-eyebrow{justify-content:center}
/* buttons: pills */
.ln-btn{display:inline-flex;align-items:center;justify-content:center;gap:9px;min-height:50px;padding:0 24px;border-radius:999px;font-weight:700;font-size:15.5px;line-height:1.2;white-space:nowrap;cursor:pointer;border:1.5px solid transparent;font-family:inherit;transition:transform .15s,box-shadow .15s,background .15s,border-color .15s}
.ln-btn.primary{background:var(--ln-violet);color:#fff;border-color:var(--ln-ink);box-shadow:var(--ln-pop)}
.ln-btn.primary:hover{transform:translate(-2px,-2px);box-shadow:7px 7px 0 var(--ln-lime)}
.ln-btn.primary:active{transform:translate(2px,2px);box-shadow:1px 1px 0 var(--ln-lime)}
.ln-btn.ghost{background:var(--ln-bg);color:var(--ln-ink);border-color:var(--ln-line-2)}
.ln-btn.ghost:hover{border-color:var(--ln-ink)}
.ln-btn.lime{background:var(--ln-lime);color:var(--ln-ink);border-color:var(--ln-ink)}
.ln-btn.lime:hover{transform:translateY(-2px)}
.ln-btn.sm{min-height:40px;padding:0 16px;font-size:14px}
.ln-btn.link{min-height:0;padding:0;border:0;background:transparent;color:var(--ln-violet-ink);font-weight:700;border-radius:6px}
.ln-btn.link:hover{text-decoration:underline}
.ln-arrow{transition:transform .15s}
.ln-btn:hover .ln-arrow{transform:translateX(3px)}
[dir="rtl"] .ln-arrow{transform:scaleX(-1)}
[dir="rtl"] .ln-btn:hover .ln-arrow{transform:scaleX(-1) translateX(3px)}
.ln-ctas{display:flex;gap:12px;flex-wrap:wrap;align-items:center}
/* cards: flat line cards; .pop lifts with the hard shadow */
.ln-card{position:relative;background:var(--ln-bg);border:1.5px solid var(--ln-line-2);border-radius:var(--ln-r);padding:26px;min-width:0}
.ln-card.pop{border-color:var(--ln-ink);box-shadow:6px 6px 0 var(--ln-violet-soft)}
.ln-card h3{margin-top:16px}
.ln-card p{margin-top:8px;font-size:15px}
.ln-grid{display:grid;gap:18px}
.ln-grid.c2{grid-template-columns:repeat(2,minmax(0,1fr))}
.ln-grid.c3{grid-template-columns:repeat(3,minmax(0,1fr))}
.ln-grid.c4{grid-template-columns:repeat(4,minmax(0,1fr))}
.ln-grid.c5{grid-template-columns:repeat(5,minmax(0,1fr))}
/* icon tile */
.ln-ic{display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:13px;background:var(--ln-violet-soft);color:var(--ln-violet-ink);flex:0 0 auto;border:1.5px solid transparent}
.ln-ic.lime{background:var(--ln-lime-soft);color:var(--ln-lime-ink)}
.ln-ic.amber{background:var(--ln-amber-soft);color:var(--ln-amber-ink)}
.ln-ic.ink{background:var(--ln-ink);color:var(--ln-lime)}
/* pills: nowrap, never shrink */
.ln-pill{display:inline-flex;align-items:center;gap:7px;height:32px;padding:0 13px;border-radius:999px;background:var(--ln-bg);border:1.5px solid var(--ln-line-2);font-size:13px;font-weight:700;color:var(--ln-ink-2);white-space:nowrap;flex-shrink:0}
.ln-pill.lime{background:var(--ln-lime);border-color:var(--ln-ink);color:var(--ln-ink)}
.ln-pill.violet{background:var(--ln-violet-soft);border-color:transparent;color:var(--ln-violet-ink)}
.ln-pill.mono{font-family:var(--ln-mono);font-size:12px;letter-spacing:.02em}
.ln-pill .dot{width:8px;height:8px;border-radius:50%;background:var(--ln-violet);box-shadow:0 0 0 0 rgba(91,61,245,.35);animation:ln-pulse 1.8s ease-out infinite}
@keyframes ln-pulse{0%{box-shadow:0 0 0 0 rgba(91,61,245,.35)}70%{box-shadow:0 0 0 9px transparent}100%{box-shadow:0 0 0 0 transparent}}
/* a numbered marker */
.ln-num{display:inline-flex;align-items:center;justify-content:center;min-width:34px;height:34px;padding:0 6px;border-radius:10px;background:var(--ln-ink);color:var(--ln-lime);font-family:var(--ln-mono);font-weight:700;font-size:13px;letter-spacing:.04em;flex:0 0 auto}
/* a check list */
.ln-checks{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:11px}
.ln-checks li{display:flex;gap:11px;align-items:flex-start;color:var(--ln-ink);font-size:15.5px;line-height:1.45}
.ln-checks li svg{flex:0 0 auto;margin-top:2px;color:var(--ln-violet)}
.ln-checks li .ln-tick{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:7px;background:var(--ln-lime);border:1.5px solid var(--ln-ink);color:var(--ln-ink);flex:0 0 auto;margin-top:1px}
.ln-checks li .ln-tick svg{margin:0;color:var(--ln-ink)}
/* two-column band: copy + one visual */
.ln-band{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:56px;align-items:center}
.ln-band.flip>.ln-band-visual{order:-1}
.ln-band-visual{min-width:0}
/* the final band */
.ln-final{border-radius:28px;background:var(--ln-dark);color:var(--ln-on-dark);padding:64px 32px;text-align:center;position:relative;overflow:hidden;border:1.5px solid var(--ln-ink)}
.ln-final::before{content:"";position:absolute;inset:auto -10% -70% -10%;height:80%;background:radial-gradient(closest-side,rgba(91,61,245,.55),transparent 70%);pointer-events:none}
.ln-final>*{position:relative}
.ln-final h2{color:#fff}
.ln-final h2 em{color:#fff;background:linear-gradient(transparent 62%,var(--ln-violet) 62%,var(--ln-violet) 94%,transparent 94%)}
.ln-final p{color:var(--ln-on-dark-2);margin:14px auto 28px;max-width:46ch;font-size:18px}
.ln-final .ln-ctas{justify-content:center}
.ln-final .ln-btn.ghost{background:transparent;border-color:rgba(255,255,255,.35);color:#fff}
.ln-final .ln-btn.ghost:hover{border-color:#fff}
/* reveal (the site-wide mechanism in src/reveal.js adds .in) */
.ln [data-reveal]{opacity:0;transform:translateY(12px);transition:opacity .3s ease,transform .3s ease}
.ln [data-reveal].in{opacity:1;transform:none}
@media (prefers-reduced-motion:reduce){.ln [data-reveal]{opacity:1;transform:none;transition:none}.ln-pill .dot{animation:none}.ln-btn,.ln-arrow{transition:none}.ln-btn:hover{transform:none}}
/* responsive */
@media (max-width:1040px){
  .ln-grid.c4,.ln-grid.c5{grid-template-columns:repeat(2,minmax(0,1fr))}
  .ln-grid.c3{grid-template-columns:repeat(2,minmax(0,1fr))}
  .ln-band{grid-template-columns:1fr;gap:32px}
  .ln-band.flip>.ln-band-visual{order:0}
  .ln-sec{padding-block:72px}
}
@media (max-width:640px){
  .ln-wrap{padding-inline:16px}
  .ln-sec{padding-block:56px}
  .ln-sec.tight{padding-block:40px}
  .ln-grid.c2,.ln-grid.c3,.ln-grid.c4,.ln-grid.c5{grid-template-columns:1fr}
  .ln-card{padding:20px}
  .ln-final{padding:44px 20px;border-radius:22px}
  .ln-ctas .ln-btn{flex:1 1 auto}
  .ln-head{margin-bottom:28px}
}
`
