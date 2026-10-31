// LinkNotes, the individuals site: ONE stylesheet of tokens and shared
// primitives, scoped under `.ln` (injected once by IndivShell). Pages add only
// their own blocks (prefix per page).
//
// Look (restyle 2026-10-31, after the owner's reference template): soft and
// airy. A lavender-to-white gradient hero with faint concentric arcs, a
// floating white header bar, big geometric headings (Bricolage Grotesque) over
// a friendly body face (Figtree), violet as the one action color with lime as
// the second button, large soft tints (lavender, sage, peach, mint, sky) as
// card and band fills, white cards with a wide soft shadow and no hard border,
// rounded tinted bands INSIDE the container, and a navy footer as the only
// dark surface. The brand colors are the logo's own (violet, lime, ink).
// Nothing here is shared with the AdmireVeda pages (their tokens are iv-/wm-).
//
// Theme: light only, like every public page (owner rule). RTL: logical
// properties only; arrows flip under [dir="rtl"]. Motion: short hover lifts
// and the site-wide reveal, all off under prefers-reduced-motion.
export const LN_CSS = `
.ln{
  --ln-bg:#ffffff;--ln-bg-2:#f7f7fc;--ln-bg-3:#f0eff9;
  --ln-ink:#14122b;--ln-ink-2:#4b4a66;--ln-ink-3:#7b7a96;
  --ln-line:#e9e8f4;--ln-line-2:#d8d6ec;
  --ln-violet:#5b3df5;--ln-violet-2:#7c5cff;--ln-violet-ink:#4a2fe0;--ln-violet-soft:#ebe8ff;
  --ln-lime:#c9f23a;--ln-lime-ink:#2f3a00;--ln-lime-soft:#eef9c9;
  --ln-amber:#ffb020;--ln-amber-soft:#fff3d6;--ln-amber-ink:#6b4a00;
  --ln-lav:#ebe9fb;--ln-lav-2:#e1ddf8;--ln-sage:#eaeedf;--ln-peach:#fbe9df;--ln-mint:#e2f3ea;--ln-sky:#e6edf9;
  --ln-dark:#14122b;--ln-dark-2:#1f1c45;--ln-on-dark:#f3f2ff;--ln-on-dark-2:#b9b6d9;
  --ln-r:20px;--ln-r-sm:12px;--ln-r-lg:28px;
  --ln-shadow:0 4px 34px rgba(91,61,245,.10);--ln-shadow-2:0 18px 44px -14px rgba(20,18,43,.22);
  --ln-arcs:repeating-radial-gradient(circle at 100% 0,transparent 0 118px,rgba(91,61,245,.09) 118px 119.5px);
  --ln-display:"Bricolage Grotesque","Figtree",-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;
  --ln-body:"Figtree",-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;
  --ln-mono:"JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  background:var(--ln-bg);color:var(--ln-ink);font-family:var(--ln-body);-webkit-font-smoothing:antialiased;
  min-height:100vh;display:flex;flex-direction:column;text-align:start;overflow-x:clip}
.ln *,.ln *::before,.ln *::after{box-sizing:border-box}
.ln a{color:inherit;text-decoration:none}
.ln a:focus-visible,.ln button:focus-visible,.ln input:focus-visible,.ln summary:focus-visible{outline:3px solid var(--ln-violet);outline-offset:3px;border-radius:8px}
.ln main{flex:1 0 auto}
.ln-wrap{width:100%;max-width:1180px;margin:0 auto;padding-inline:24px}
.ln h1,.ln h2,.ln h3{font-family:var(--ln-display);margin:0;color:var(--ln-ink);text-wrap:balance}
.ln h1{font-size:clamp(38px,5.4vw,62px);line-height:1.05;font-weight:800;letter-spacing:-.025em}
.ln h2{font-size:clamp(28px,3.4vw,42px);line-height:1.1;font-weight:800;letter-spacing:-.02em}
.ln h3{font-size:20px;line-height:1.3;font-weight:700;letter-spacing:-.01em}
.ln p{margin:0;line-height:1.65;color:var(--ln-ink-2)}
/* the highlighted phrase of a heading: violet, like a stat in a headline */
.ln h1 em,.ln h2 em{font-style:normal;color:var(--ln-violet)}
.ln-eyebrow{display:inline-flex;align-items:center;gap:8px;font-size:15.5px;font-weight:600;color:var(--ln-violet);margin-bottom:14px;letter-spacing:0}
/* sections, tints and the rounded inner band */
.ln-sec{padding-block:96px;position:relative}
.ln-sec.tight{padding-block:56px}
.ln-sec.tint{background:var(--ln-bg-2)}
.ln-sec.grid{background:var(--ln-bg)}
.ln-sec.dark{background:var(--ln-dark);color:var(--ln-on-dark)}
.ln-sec.dark h2,.ln-sec.dark h3{color:#fff}
.ln-sec.dark h2 em{color:var(--ln-lime)}
.ln-sec.dark p{color:var(--ln-on-dark-2)}
.ln-sec.dark .ln-eyebrow{color:var(--ln-lime)}
.ln-band-tint{position:relative;border-radius:var(--ln-r-lg);padding:64px 56px;background:var(--ln-lav);overflow:hidden}
.ln-band-tint.sage{background:var(--ln-sage)}
.ln-band-tint.peach{background:var(--ln-peach)}
.ln-band-tint.mint{background:var(--ln-mint)}
.ln-band-tint.sky{background:var(--ln-sky)}
.ln-band-tint.arcs::before{content:"";position:absolute;inset:0;background:var(--ln-arcs);pointer-events:none;opacity:.9}
.ln-band-tint>*{position:relative}
/* the lavender stage a visual sits on */
.ln-stage{position:relative;border-radius:var(--ln-r-lg);background:linear-gradient(180deg,var(--ln-lav) 0%,var(--ln-lav-2) 100%);padding:32px;overflow:hidden}
.ln-stage::before{content:"";position:absolute;inset:0;background:var(--ln-arcs);pointer-events:none}
.ln-stage>*{position:relative}
.ln-head{max-width:720px;margin-bottom:44px}
.ln-head p{font-size:18px;margin-top:14px}
.ln-head.center{margin-inline:auto;text-align:center}
.ln-head.center .ln-eyebrow{justify-content:center}
/* buttons: solid fills, 12px radius, no border */
.ln-btn{display:inline-flex;align-items:center;justify-content:center;gap:9px;min-height:52px;padding:0 26px;border-radius:12px;font-weight:600;font-size:16px;line-height:1.2;white-space:nowrap;cursor:pointer;border:1px solid transparent;font-family:inherit;transition:transform .15s,box-shadow .15s,background .15s,border-color .15s,color .15s}
.ln-btn.primary{background:var(--ln-violet);color:#fff;border-color:var(--ln-violet)}
.ln-btn.primary:hover{background:var(--ln-violet-ink);border-color:var(--ln-violet-ink);transform:translateY(-2px);box-shadow:0 12px 26px -10px rgba(91,61,245,.65)}
.ln-btn.primary:active{transform:none;box-shadow:none}
.ln-btn.ghost{background:#fff;color:var(--ln-ink);border-color:var(--ln-line-2)}
.ln-btn.ghost:hover{border-color:var(--ln-violet);color:var(--ln-violet)}
.ln-btn.lime{background:var(--ln-lime);color:var(--ln-ink);border-color:var(--ln-lime)}
.ln-btn.lime:hover{transform:translateY(-2px);box-shadow:0 12px 26px -12px rgba(140,170,20,.7)}
.ln-btn.sm{min-height:42px;padding:0 18px;font-size:14.5px}
.ln-btn.link{min-height:0;padding:0;border:0;background:transparent;color:var(--ln-violet);font-weight:600;border-radius:6px}
.ln-btn.link:hover{text-decoration:underline}
.ln-arrow{transition:transform .15s}
.ln-btn:hover .ln-arrow{transform:translateX(3px)}
[dir="rtl"] .ln-arrow{transform:scaleX(-1)}
[dir="rtl"] .ln-btn:hover .ln-arrow{transform:scaleX(-1) translateX(3px)}
.ln-ctas{display:flex;gap:12px;flex-wrap:wrap;align-items:center}
/* cards: white with a wide soft shadow, or a soft tint with none */
.ln-card{position:relative;background:#fff;border:1px solid var(--ln-line);border-radius:var(--ln-r);padding:28px;min-width:0;box-shadow:var(--ln-shadow);transition:transform .2s,box-shadow .2s}
.ln-card.hov:hover{transform:translateY(-4px);box-shadow:var(--ln-shadow-2)}
.ln-card.pop{border-color:var(--ln-violet-soft);box-shadow:0 10px 40px -8px rgba(91,61,245,.28)}
.ln-card.t-lav,.ln-card.t-sage,.ln-card.t-peach,.ln-card.t-mint,.ln-card.t-sky{border-color:transparent;box-shadow:none}
.ln-card.t-lav{background:var(--ln-lav)}
.ln-card.t-sage{background:var(--ln-sage)}
.ln-card.t-peach{background:var(--ln-peach)}
.ln-card.t-mint{background:var(--ln-mint)}
.ln-card.t-sky{background:var(--ln-sky)}
.ln-card h3{margin-top:18px}
.ln-card p{margin-top:8px;font-size:15.5px}
.ln-grid{display:grid;gap:20px}
.ln-grid.c2{grid-template-columns:repeat(2,minmax(0,1fr))}
.ln-grid.c3{grid-template-columns:repeat(3,minmax(0,1fr))}
.ln-grid.c4{grid-template-columns:repeat(4,minmax(0,1fr))}
.ln-grid.c5{grid-template-columns:repeat(5,minmax(0,1fr))}
/* icon tile: a soft disc */
.ln-ic{display:inline-flex;align-items:center;justify-content:center;width:50px;height:50px;border-radius:16px;background:var(--ln-violet-soft);color:var(--ln-violet);flex:0 0 auto}
.ln-ic.lime{background:var(--ln-lime);color:var(--ln-ink)}
.ln-ic.amber{background:var(--ln-amber-soft);color:var(--ln-amber-ink)}
.ln-ic.ink{background:var(--ln-ink);color:var(--ln-lime)}
.ln-ic.white{background:#fff;color:var(--ln-violet);box-shadow:var(--ln-shadow)}
/* pills: nowrap, never shrink */
.ln-pill{display:inline-flex;align-items:center;gap:7px;height:34px;padding:0 14px;border-radius:999px;background:var(--ln-bg-2);border:1px solid var(--ln-line);font-size:13.5px;font-weight:600;color:var(--ln-ink-2);white-space:nowrap;flex-shrink:0}
.ln-pill.lime{background:var(--ln-lime);border-color:var(--ln-lime);color:var(--ln-ink)}
.ln-pill.violet{background:var(--ln-violet-soft);border-color:transparent;color:var(--ln-violet-ink)}
.ln-pill.white{background:#fff;border-color:transparent;box-shadow:var(--ln-shadow)}
.ln-pill.mono{font-family:var(--ln-mono);font-size:12px;letter-spacing:.02em}
.ln-pill .dot{width:8px;height:8px;border-radius:50%;background:var(--ln-violet);box-shadow:0 0 0 0 rgba(91,61,245,.35);animation:ln-pulse 1.8s ease-out infinite}
@keyframes ln-pulse{0%{box-shadow:0 0 0 0 rgba(91,61,245,.35)}70%{box-shadow:0 0 0 9px transparent}100%{box-shadow:0 0 0 0 transparent}}
/* a numbered marker: violet disc */
.ln-num{display:inline-flex;align-items:center;justify-content:center;min-width:38px;height:38px;padding:0 8px;border-radius:50%;background:var(--ln-violet);color:#fff;font-family:var(--ln-display);font-weight:700;font-size:14px;flex:0 0 auto}
/* a check list with violet circled ticks */
.ln-checks{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:12px}
.ln-checks li{display:flex;gap:12px;align-items:flex-start;color:var(--ln-ink);font-size:16px;line-height:1.5}
.ln-checks li svg{flex:0 0 auto;margin-top:2px;color:var(--ln-violet)}
.ln-tick{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;background:var(--ln-violet);color:#fff;flex:0 0 auto;margin-top:1px}
.ln-tick svg{margin:0;color:#fff}
.ln-tick.soft{background:var(--ln-violet-soft);color:var(--ln-violet)}
.ln-tick.soft svg{color:var(--ln-violet)}
.ln-tick.no{background:var(--ln-amber-soft);color:var(--ln-amber-ink)}
.ln-tick.no svg{color:var(--ln-amber-ink)}
/* two-column band: copy + one visual */
.ln-band{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:64px;align-items:center}
.ln-band.flip>.ln-band-visual{order:-1}
.ln-band-visual{min-width:0}
/* the inner page title band: breadcrumb, centered title, lead, and a page's own extras */
.ln-pt{position:relative;margin-top:-86px;background:linear-gradient(180deg,var(--ln-lav) 0%,#f4f2fd 70%,var(--ln-bg) 100%);padding-block:126px 64px;overflow:hidden}
.ln-pt::before{content:"";position:absolute;inset:0;background:var(--ln-arcs);pointer-events:none}
.ln-pt>*{position:relative}
.ln-pt-in{display:flex;flex-direction:column;align-items:center;text-align:center}
.ln-pt-in.split{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:56px;align-items:center;text-align:start}
.ln-pt-in.split .ln-crumbs,.ln-pt-in.split .ln-pt-copy{align-items:flex-start}
.ln-pt-in.split .ln-crumbs{grid-column:1 / -1;margin-bottom:12px;align-self:start}
.ln-pt-in.split .ln-pt-copy{text-align:start}
.ln-pt-in.split .ln-pt-copy .ln-eyebrow{justify-content:flex-start}
.ln-pt-copy{display:flex;flex-direction:column;align-items:center;max-width:820px;min-width:0}
.ln-pt-copy .ln-eyebrow{justify-content:center}
.ln-pt-lead{font-size:18px;margin-top:18px;max-width:58ch}
.ln-pt-in.split .ln-pt-copy{align-items:flex-start}
.ln-pt-star{position:absolute;inset-inline-start:24px;top:46px;color:var(--ln-violet);opacity:.55;pointer-events:none}
.ln-crumbs{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:center;margin:0 0 26px;padding:0;list-style:none;font-size:14px;font-weight:600;color:var(--ln-ink-3)}
.ln-crumbs a{color:var(--ln-violet)}
.ln-crumbs a:hover{text-decoration:underline}
.ln-crumbs li{display:inline-flex;align-items:center;gap:8px}
.ln-crumbs li[aria-current]{color:var(--ln-ink)}
.ln-crumbs .sep{color:var(--ln-line-2)}
[dir="rtl"] .ln-crumbs .sep{transform:scaleX(-1)}
/* the final band: full-bleed lavender with the arcs */
.ln-final-sec{position:relative;background:var(--ln-lav);overflow:hidden;padding-block:96px}
.ln-final-sec::before{content:"";position:absolute;inset:0;background:var(--ln-arcs);pointer-events:none}
.ln-final{position:relative;text-align:center;max-width:820px;margin-inline:auto}
.ln-final p{margin:16px auto 30px;max-width:52ch;font-size:18px}
.ln-final .ln-ctas{justify-content:center}
/* reveal (the site-wide mechanism in src/reveal.js adds .in) */
.ln [data-reveal]{opacity:0;transform:translateY(12px);transition:opacity .3s ease,transform .3s ease}
.ln [data-reveal].in{opacity:1;transform:none}
@media (prefers-reduced-motion:reduce){.ln [data-reveal]{opacity:1;transform:none;transition:none}.ln-pill .dot{animation:none}.ln-btn,.ln-arrow,.ln-card{transition:none}.ln-btn:hover,.ln-card.hov:hover{transform:none}}
/* responsive */
@media (max-width:1040px){
  .ln-grid.c4,.ln-grid.c5{grid-template-columns:repeat(2,minmax(0,1fr))}
  .ln-grid.c3{grid-template-columns:repeat(2,minmax(0,1fr))}
  .ln-band{grid-template-columns:1fr;gap:36px}
  .ln-band.flip>.ln-band-visual{order:0}
  .ln-sec{padding-block:72px}
  .ln-band-tint{padding:48px 32px}
  .ln-pt-in.split{grid-template-columns:1fr;gap:36px}
  .ln-final-sec{padding-block:72px}
}
@media (max-width:880px){.ln-pt{margin-top:-74px;padding-block:106px 52px}}
@media (max-width:640px){
  .ln-wrap{padding-inline:16px}
  .ln-sec{padding-block:56px}
  .ln-sec.tight{padding-block:40px}
  .ln-grid.c2,.ln-grid.c3,.ln-grid.c4,.ln-grid.c5{grid-template-columns:1fr}
  .ln-card{padding:22px}
  .ln-band-tint{padding:32px 20px;border-radius:var(--ln-r)}
  .ln-stage{padding:18px;border-radius:var(--ln-r)}
  .ln-pt{padding-block:98px 44px}
  .ln-pt-star{display:none}
  .ln-pt-lead{font-size:16.5px}
  .ln-final-sec{padding-block:56px}
  .ln-ctas .ln-btn{flex:1 1 auto}
  .ln-head{margin-bottom:28px}
}
`
