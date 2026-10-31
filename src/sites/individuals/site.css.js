// The individuals site: ONE stylesheet of tokens and shared primitives, scoped
// under `.iv` (injected once by IndivShell). Pages add only their own blocks.
//
// Look: "sunlit workbench". Warm paper, deep ink, the brand emerald as the
// signal color and the brand coral as the one call to action. Bricolage
// Grotesque for display, Figtree for body (the AdmireVeda fonts, loaded in
// src/main.jsx). Soft 22px cards on a 1px warm line, a highlighter wash under
// the key phrase of every heading, one benefit visual per section.
//
// Themes: light by default; dark when the document carries data-theme="dark"
// or the visitor's system prefers dark and nothing pinned light. Every color
// is a token, so both themes share one layout. RTL: logical properties only;
// arrows flip under [dir="rtl"].
// The dark token set, once; used for an explicit data-theme and for the system preference.
const DARK = `
  --iv-paper:#0f131c;--iv-paper-2:#171d29;--iv-paper-3:#1d2433;
  --iv-ink:#eef0f6;--iv-ink-2:#aab1c3;--iv-ink-3:#7f879a;
  --iv-line:rgba(255,255,255,.1);--iv-line-2:rgba(255,255,255,.18);
  --iv-mint:#8cf5c4;--iv-mint-ink:#8cf5c4;--iv-mint-soft:rgba(140,245,196,.12);--iv-mint-wash:rgba(140,245,196,.22);
  --iv-coral:#ffb561;--iv-coral-2:#ff7a59;--iv-coral-ink:#241206;
  --iv-sky:#39d3ff;--iv-sun:rgba(255,214,154,.18);
  --iv-shadow:0 18px 50px -28px rgba(0,0,0,.7)`

export const IV_CSS = `
.iv{
  --iv-paper:#fbf7f0;--iv-paper-2:#ffffff;--iv-paper-3:#f3ede2;
  --iv-ink:#17202e;--iv-ink-2:#4b5566;--iv-ink-3:#7a8394;
  --iv-line:#e8e0d2;--iv-line-2:#d9cfbd;
  --iv-mint:#0e9f6e;--iv-mint-ink:#0b7a55;--iv-mint-soft:#e3f5ec;--iv-mint-wash:rgba(14,159,110,.18);
  --iv-coral:#f26a43;--iv-coral-2:#ff9a4d;--iv-coral-ink:#1a0e08;
  --iv-sky:#0a84c2;--iv-sun:#ffe3b3;
  --iv-shadow:0 18px 50px -28px rgba(23,32,46,.35),0 2px 6px -2px rgba(23,32,46,.08);
  --iv-r:22px;--iv-r-sm:14px;
  --iv-display:"Bricolage Grotesque","Figtree",system-ui,sans-serif;
  --iv-body:"Figtree",-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;
  background:var(--iv-paper);color:var(--iv-ink);font-family:var(--iv-body);-webkit-font-smoothing:antialiased;
  min-height:100vh;display:flex;flex-direction:column;text-align:start;overflow-x:clip}
[data-theme='dark'] .iv,.iv[data-theme='dark']{${DARK}}
/* The public document carries data-theme="light" (the product shell owns that
   attribute), so the system preference is read on the site root itself; a
   host can pin the site light with data-theme="light" on .iv. */
@media (prefers-color-scheme:dark){.iv:not([data-theme='light']){${DARK}}}
.iv *,.iv *::before,.iv *::after{box-sizing:border-box}
.iv a{color:inherit;text-decoration:none}
.iv a:focus-visible,.iv button:focus-visible,.iv input:focus-visible,.iv summary:focus-visible{outline:3px solid var(--iv-sky);outline-offset:3px;border-radius:8px}
.iv main{flex:1 0 auto}
.iv-wrap{width:100%;max-width:1160px;margin:0 auto;padding-inline:24px}
.iv h1,.iv h2,.iv h3{font-family:var(--iv-display);letter-spacing:-.02em;margin:0;color:var(--iv-ink);text-wrap:balance}
.iv h1{font-size:clamp(34px,5.4vw,62px);line-height:1.02;font-weight:800}
.iv h2{font-size:clamp(26px,3.4vw,40px);line-height:1.08;font-weight:800}
.iv h3{font-size:19px;line-height:1.25;font-weight:700}
.iv p{margin:0;line-height:1.55;color:var(--iv-ink-2)}
/* the highlighter wash under the key phrase of a heading */
.iv h1 em,.iv h2 em{font-style:normal;background:linear-gradient(transparent 58%,var(--iv-mint-wash) 58%,var(--iv-mint-wash) 92%,transparent 92%);padding-inline:.05em;color:var(--iv-ink)}
.iv-eyebrow{display:inline-flex;align-items:center;gap:8px;font-size:12.5px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--iv-mint-ink);margin-bottom:14px}
.iv-eyebrow::before{content:"";width:18px;height:3px;border-radius:3px;background:linear-gradient(90deg,var(--iv-mint),var(--iv-sky))}
.iv-sec{padding-block:72px}
.iv-sec.tight{padding-block:48px}
.iv-sec.alt{background:var(--iv-paper-3)}
.iv-head{max-width:640px;margin-bottom:34px}
.iv-head p{font-size:17px;margin-top:12px}
.iv-head.center{margin-inline:auto;text-align:center}
.iv-head.center .iv-eyebrow{justify-content:center}
/* buttons */
.iv-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:46px;padding:0 20px;border-radius:14px;font-weight:700;font-size:15px;line-height:1.2;white-space:nowrap;cursor:pointer;border:1px solid transparent;transition:transform .15s,box-shadow .15s,filter .15s,border-color .15s;font-family:inherit}
.iv-btn.primary{background:linear-gradient(135deg,var(--iv-coral),var(--iv-coral-2));color:var(--iv-coral-ink);box-shadow:0 14px 34px -14px rgba(242,106,67,.7)}
.iv-btn.primary:hover{transform:translateY(-2px);filter:brightness(1.03)}
.iv-btn.ghost{background:var(--iv-paper-2);color:var(--iv-ink);border-color:var(--iv-line-2)}
.iv-btn.ghost:hover{border-color:var(--iv-ink-3)}
.iv-btn.mint{background:var(--iv-mint);color:#fff}
[data-theme='dark'] .iv-btn.mint{color:#0c3a28}
.iv-btn.sm{min-height:38px;padding:0 14px;font-size:14px;border-radius:11px}
.iv-arrow{transition:transform .15s}
.iv-btn:hover .iv-arrow{transform:translateX(3px)}
[dir="rtl"] .iv-arrow{transform:scaleX(-1)}
[dir="rtl"] .iv-btn:hover .iv-arrow{transform:scaleX(-1) translateX(3px)}
.iv-ctas{display:flex;gap:12px;flex-wrap:wrap;align-items:center}
/* cards */
.iv-card{position:relative;background:var(--iv-paper-2);border:1px solid var(--iv-line);border-radius:var(--iv-r);padding:24px;box-shadow:var(--iv-shadow)}
.iv-card.flat{box-shadow:none}
.iv-grid{display:grid;gap:18px}
.iv-grid.c2{grid-template-columns:repeat(2,minmax(0,1fr))}
.iv-grid.c3{grid-template-columns:repeat(3,minmax(0,1fr))}
.iv-grid.c4{grid-template-columns:repeat(4,minmax(0,1fr))}
.iv-grid.c5{grid-template-columns:repeat(5,minmax(0,1fr))}
.iv-ic{display:inline-flex;align-items:center;justify-content:center;width:42px;height:42px;border-radius:13px;background:var(--iv-mint-soft);color:var(--iv-mint-ink);flex:0 0 auto}
.iv-ic.sun{background:var(--iv-sun);color:#8a4b12}
[data-theme='dark'] .iv-ic.sun{color:var(--iv-coral)}
.iv-card h3{margin-top:14px}
.iv-card p{margin-top:8px;font-size:15px}
/* a pill / chip */
.iv-pill{display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 12px;border-radius:999px;background:var(--iv-paper-2);border:1px solid var(--iv-line);font-size:13px;font-weight:600;color:var(--iv-ink-2);white-space:nowrap;flex-shrink:0}
.iv-pill.mint{background:var(--iv-mint-soft);border-color:transparent;color:var(--iv-mint-ink)}
.iv-pill .dot{width:8px;height:8px;border-radius:50%;background:var(--iv-mint);box-shadow:0 0 0 0 var(--iv-mint-wash);animation:iv-pulse 1.8s ease-out infinite}
@keyframes iv-pulse{0%{box-shadow:0 0 0 0 var(--iv-mint-wash)}70%{box-shadow:0 0 0 9px transparent}100%{box-shadow:0 0 0 0 transparent}}
/* a check list */
.iv-checks{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px}
.iv-checks li{display:flex;gap:10px;align-items:flex-start;color:var(--iv-ink);font-size:15.5px;line-height:1.45}
.iv-checks li svg{flex:0 0 auto;margin-top:3px;color:var(--iv-mint-ink)}
/* two-column feature band: copy + one visual */
.iv-band{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:48px;align-items:center}
.iv-band.flip>.iv-band-visual{order:-1}
.iv-band-visual{min-width:0}
/* final CTA */
/* the one dark band on every page, in both themes (fixed navy, not the ink token) */
.iv-final{border-radius:28px;background:linear-gradient(135deg,#17202e 0%,#223047 100%);color:#eef0f6;padding:56px 32px;text-align:center;position:relative;overflow:hidden}
[data-theme='dark'] .iv-final{border:1px solid var(--iv-line)}
@media (prefers-color-scheme:dark){.iv:not([data-theme='light']) .iv-final{border:1px solid var(--iv-line)}}
.iv-final::before{content:"";position:absolute;inset:auto -10% -60% -10%;height:70%;background:radial-gradient(closest-side,rgba(140,245,196,.28),transparent 70%);pointer-events:none}
.iv-final h2{color:#fff}
.iv-final h2 em{color:#fff;background:linear-gradient(transparent 58%,rgba(140,245,196,.35) 58%,rgba(140,245,196,.35) 92%,transparent 92%)}
.iv-final p{color:#c7cddb;margin:12px auto 26px;max-width:46ch;font-size:17px}
.iv-final .iv-ctas{justify-content:center}
.iv-final .iv-btn.ghost{background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.2);color:#fff}
/* reveal (the site-wide mechanism in src/reveal.js adds .in) */
.iv [data-reveal]{opacity:0;transform:translateY(12px);transition:opacity .3s ease,transform .3s ease}
.iv [data-reveal].in{opacity:1;transform:none}
@media (prefers-reduced-motion:reduce){.iv [data-reveal]{opacity:1;transform:none;transition:none}.iv-pill .dot{animation:none}.iv-btn{transition:none}}
/* responsive */
@media (max-width:980px){
  .iv-grid.c4,.iv-grid.c5{grid-template-columns:repeat(2,minmax(0,1fr))}
  .iv-grid.c3{grid-template-columns:repeat(2,minmax(0,1fr))}
  .iv-band{grid-template-columns:1fr;gap:28px}
  .iv-band.flip>.iv-band-visual{order:0}
}
@media (max-width:640px){
  .iv-wrap{padding-inline:16px}
  .iv-sec{padding-block:52px}
  .iv-grid.c2,.iv-grid.c3,.iv-grid.c4,.iv-grid.c5{grid-template-columns:1fr}
  .iv-card{padding:20px}
  .iv-final{padding:40px 20px;border-radius:22px}
  .iv-ctas .iv-btn{flex:1 1 auto}
}
`
