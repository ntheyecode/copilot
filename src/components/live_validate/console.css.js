// The answer console's styles and its two palettes (LiveValidate REVEAL stage).
//
// Every colour in the console comes from one --c-* token set: the LIGHT palette
// is defined on .lv-root (the default, owner rule 2026-10-31) and the DARK
// palette (the console's original look) under .lv-root.lv-con-dark, the one
// class the theme button toggles (console_theme.js). No rule below names a
// colour directly, so a palette change is a token change and both themes stay
// in step. The dialog chrome around the console (header, ask, lead form,
// footer bar) keeps the widget's own --ink/--panel tokens in LiveValidate.jsx.
//
// Contrast (WCAG AA, text 4.5:1), measured on the surface each token sits on
// (white, --c-bg2, or its own 13-22% tint): light --c-tx 18.7, --c-tx2 10.6,
// --c-mut 5.1, --c-dim 5.0, --c-acc 5.3, --c-cyan 5.2, --c-warm 5.3, --c-warm2
// 8.3, --c-no 5.9, --c-copy 10.1, --c-ok-tx 4.7; dark --c-tx 16.9, --c-mut 6.8,
// --c-acc 14.6, --c-warm 12.2 (the console's original values).
// The terminal block (shared CmdBlock) stays a dark terminal in both themes.
import { STEP_TASTE_CSS } from './step_taste.css.js'

export const CONSOLE_CSS = `
/* ===== console palette: light (default) ================================= */
.lv-root{
 --c-bg1:#ffffff;--c-bg2:#f4f7fb;--c-line:rgba(12,18,34,.1);--c-line2:rgba(12,18,34,.18);
 --c-fill:rgba(12,18,34,.035);--c-fill2:rgba(12,18,34,.07);
 --c-tx:#0c1222;--c-tx2:#2f3a4e;--c-mut:#5b6578;--c-dim:#5e6879;--c-head:#0c1222;
 --c-acc:#066b45;--c-acc-line:rgba(6,107,69,.35);--c-acc-strong:rgba(6,107,69,.6);--c-acc-fill:rgba(10,157,102,.07);--c-acc-fill2:rgba(10,157,102,.13);
 --c-cyan:#07659a;--c-cyan-line:rgba(7,101,154,.35);--c-cyan-strong:rgba(7,101,154,.6);--c-cyan-fill:rgba(7,101,154,.06);--c-cyan-fill2:rgba(7,101,154,.13);--c-cyan-ring:rgba(7,101,154,.16);
 --c-warm:#9a4a06;--c-warm2:#6f3404;--c-warm-line:rgba(242,106,67,.45);--c-warm-strong:rgba(242,106,67,.65);--c-warm-fill:rgba(255,154,77,.12);--c-warm-fill2:rgba(255,154,77,.22);--c-warm-dot:#f26a43;
 --c-no:#b42318;--c-no-line:rgba(180,35,24,.35);--c-no-fill:rgba(255,99,99,.1);
 --c-ok-bg:#0a9d66;--c-ok-tx:#04261a;--c-copy:#0c3b5c;--c-focus:#086fa8;
 --c-shadow:0 24px 60px -34px rgba(12,18,34,.35),inset 0 1px 0 rgba(255,255,255,.8)
}
/* ===== console palette: dark (the visitor's switch) ===================== */
.lv-root.lv-con-dark{
 --c-bg1:#151829;--c-bg2:#0c0e18;--c-line:rgba(255,255,255,.08);--c-line2:rgba(255,255,255,.16);
 --c-fill:rgba(255,255,255,.04);--c-fill2:rgba(255,255,255,.08);
 --c-tx:#eef0f6;--c-tx2:#dfe4f0;--c-mut:#9aa0b4;--c-dim:#7f879b;--c-head:#ffffff;
 --c-acc:#8cf5c4;--c-acc-line:rgba(140,245,196,.32);--c-acc-strong:rgba(140,245,196,.6);--c-acc-fill:rgba(140,245,196,.06);--c-acc-fill2:rgba(10,157,102,.16);
 --c-cyan:#39d3ff;--c-cyan-line:rgba(57,211,255,.3);--c-cyan-strong:rgba(57,211,255,.6);--c-cyan-fill:rgba(57,211,255,.07);--c-cyan-fill2:rgba(57,211,255,.14);--c-cyan-ring:rgba(57,211,255,.13);
 --c-warm:#ffcf8a;--c-warm2:#ffe9cf;--c-warm-line:rgba(255,179,92,.4);--c-warm-strong:rgba(255,179,92,.65);--c-warm-fill:rgba(255,179,92,.08);--c-warm-fill2:rgba(255,179,92,.16);--c-warm-dot:#ffb35c;
 --c-no:#ff9b9b;--c-no-line:rgba(255,99,99,.35);--c-no-fill:rgba(255,99,99,.12);
 --c-ok-bg:#0a9d66;--c-ok-tx:#04261a;--c-copy:#cfe9ff;--c-focus:#39d3ff;
 --c-shadow:0 34px 80px -34px rgba(0,0,0,.7),inset 0 1px 0 rgba(255,255,255,.05)
}
/* the theme switch in the dialog head: a real button, pressed = dark */
.lv-theme{display:inline-flex;align-items:center;gap:6px;flex:0 0 auto;height:30px;padding:0 10px;border-radius:999px;border:1px solid var(--line);background:var(--chip);color:var(--mut);font:inherit;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;transition:color .14s,border-color .14s,background .14s}
.lv-theme:hover{color:var(--tx);border-color:var(--em2)}
.lv-theme[aria-pressed="true"]{color:#fff;background:#151829;border-color:#151829}
.lv-theme:focus-visible{outline:3px solid var(--em2);outline-offset:2px}
.lv-theme svg{flex:0 0 auto}
.wm-cov-head-r{display:inline-flex;align-items:center;gap:8px;flex:0 0 auto}
/* ===== REVEAL: the product console ======================================= */
.lv-reveal{padding:16px 18px 18px}
.lv-console{background:linear-gradient(180deg,var(--c-bg1) 0%,var(--c-bg2) 100%);border:1px solid var(--c-line);border-radius:18px;padding:14px 16px 16px;color:var(--c-tx);box-shadow:var(--c-shadow);min-width:0;overflow:hidden;transition:background .2s,color .2s,border-color .2s}
.lv-con-head{display:flex;align-items:center;gap:7px;font-size:13px;padding:0 2px 12px;color:var(--c-tx2);min-width:0}
.lv-con-head .d{width:9px;height:9px;border-radius:50%;flex:0 0 auto}
.lv-con-head .d.r{background:#ff5f57}.lv-con-head .d.y{background:#febc2e}.lv-con-head .d.g{background:#28c840}
.lv-con-head b{margin-inline-start:6px;font-family:var(--disp);font-weight:800;color:var(--c-head);white-space:nowrap}
.lv-con-live{display:inline-flex;align-items:center;gap:5px;margin-inline-start:8px;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--c-acc);white-space:nowrap}
.lv-con-live i{width:7px;height:7px;border-radius:50%;background:#e23b3b;animation:lv-pulse 1.5s infinite}
.lv-con-tag{margin-inline-start:auto;font-size:10px;letter-spacing:.12em;color:var(--c-acc);border:1px solid var(--c-acc-line);border-radius:999px;padding:2px 9px;white-space:nowrap}
.lv-con-goal{font-size:14px;line-height:1.5;color:var(--c-tx);background:var(--c-fill);border:1px solid var(--c-line);border-radius:11px;padding:9px 12px;overflow-wrap:anywhere}
.lv-k{font-size:10px;letter-spacing:.14em;color:var(--c-acc);font-weight:800;margin-inline-end:8px;vertical-align:1px}
/* planning live: three status lines that land one after another */
.lv-scan{position:relative;margin-top:12px;display:flex;flex-direction:column;gap:10px;padding:13px 13px;border:1px solid var(--c-cyan-line);border-radius:13px;background:var(--c-cyan-fill);overflow:hidden}
.lv-scan-beam{position:absolute;top:0;bottom:0;left:0;width:40%;background:linear-gradient(90deg,transparent,var(--c-cyan-fill2),transparent);animation:lv-beam 1.7s linear infinite;pointer-events:none}
.lv-scan-beam.soft{opacity:.7;animation-duration:2.2s}
@keyframes lv-beam{from{transform:translateX(-120%)}to{transform:translateX(320%)}}
.lv-scan-row{position:relative;display:flex;align-items:center;gap:10px;font-size:13.5px;line-height:1.4;color:var(--c-dim);transition:color .25s}
.lv-scan-row .tick{position:relative;width:20px;height:20px;border-radius:50%;border:1.5px solid var(--c-line2);display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;color:transparent;transition:background .25s,border-color .25s,box-shadow .25s}
.lv-scan-row.on{color:var(--c-tx)}
.lv-scan-row.on .tick{border-color:var(--c-cyan);box-shadow:0 0 0 4px var(--c-cyan-ring)}
.lv-scan-row.on .tick:after{content:'';width:8px;height:8px;border-radius:50%;background:var(--c-cyan);animation:lv-blip .9s ease-in-out infinite}
@keyframes lv-blip{0%,100%{transform:scale(.6);opacity:.5}50%{transform:scale(1);opacity:1}}
.lv-scan-row.done{color:var(--c-tx2)}
.lv-scan-row.done .tick{background:var(--c-ok-bg);border-color:var(--c-ok-bg);color:var(--c-ok-tx)}
/* verdict stamp + answer + what it sees */
.lv-verdict{display:flex;align-items:center;gap:12px;margin-top:13px;padding:12px 14px;border-radius:14px;animation:lv-pop .55s cubic-bezier(.2,1.4,.4,1) both}
@keyframes lv-pop{0%{opacity:0;transform:scale(.6)}55%{transform:scale(1.06)}100%{opacity:1;transform:scale(1)}}
.lv-vbadge{width:40px;height:40px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto}
.lv-vlabel{font-family:var(--disp);font-weight:800;font-size:19px;line-height:1.2;letter-spacing:-.01em;min-width:0;overflow-wrap:anywhere}
.lv-verdict.ok{background:var(--c-acc-fill2);border:1px solid var(--c-acc-line)}
.lv-verdict.ok .lv-vbadge{background:var(--c-ok-bg);color:var(--c-ok-tx);animation:lv-glow 1.7s ease-in-out infinite}
.lv-verdict.ok .lv-vlabel{color:var(--c-acc)}
@keyframes lv-glow{0%,100%{box-shadow:0 0 0 5px rgba(10,157,102,.12)}50%{box-shadow:0 0 0 11px rgba(10,157,102,.18)}}
.lv-verdict.mid{background:var(--c-warm-fill2);border:1px solid var(--c-warm-line)}
.lv-verdict.mid .lv-vbadge{background:#ffb35c;color:#2a1206}.lv-verdict.mid .lv-vlabel{color:var(--c-warm)}
.lv-verdict.no{background:var(--c-no-fill);border:1px solid var(--c-no-line)}
.lv-verdict.no .lv-vbadge{background:#ff6363;color:#fff}.lv-verdict.no .lv-vlabel{color:var(--c-no)}
.lv-verdict.off{background:var(--c-fill);border:1px solid var(--c-line)}
.lv-verdict.off .lv-vbadge{background:var(--c-fill2);color:var(--c-tx2)}.lv-verdict.off .lv-vlabel{color:var(--c-tx2);font-size:16px}
.lv-answer{margin:12px 2px 0;font-size:14.5px;line-height:1.65;color:var(--c-tx2);overflow-wrap:anywhere;opacity:0;animation:lv-rise .45s ease .2s forwards}
/* Inline code / keys / links come from the shared RichText with the console's
   accent token; only the focus ring is the console's. Every control shows focus. */
.lv-console a:focus-visible,.lv-console button:focus-visible,.lv-console summary:focus-visible{outline:2px solid var(--c-focus);outline-offset:2px;border-radius:6px}
.lv-sees{position:relative;display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin-top:12px;padding:9px 12px;border:1px solid var(--c-cyan-line);background:var(--c-cyan-fill);border-radius:11px;font-size:13px;line-height:1.5;color:var(--c-tx);overflow:hidden;opacity:0;animation:lv-rise .45s ease .32s forwards}
.lv-seek{display:inline-flex;align-items:center;gap:6px;flex:0 0 auto;font-size:10px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--c-cyan)}
.lv-seetxt{flex:1;min-width:0;overflow-wrap:anywhere}
@keyframes lv-rise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
/* The step cards, "Exactly how" and the locked teaser: step_taste.css.js */
${STEP_TASTE_CSS}
/* The step's link-out / copy row (shared StepLink markup, the console's look).
   The terminal block carries its own styles (shared CmdBlock), only its font
   scale variable is set here. Commands and paths stay LTR in RTL locales. */
.lv-console{--wc-fs:1}
.lv-console .wc-open{display:inline-flex;align-items:center;gap:6px;max-width:100%;margin-top:9px;padding:6px 11px 6px 10px;border-radius:9px;color:var(--c-cyan);background:var(--c-cyan-fill);border:1px solid var(--c-cyan-line);font-size:13px;font-weight:700;text-decoration:none;overflow-wrap:anywhere;transition:background .14s}
.lv-console .wc-open:hover,.lv-console .wc-open:focus-visible{background:var(--c-cyan-fill2);text-decoration:underline;text-underline-offset:3px}
.lv-console .wc-open svg{flex:0 0 auto}
.lv-console .wc-copyrow{display:flex;align-items:center;gap:8px;margin-top:9px;padding:5px 7px 5px 11px;background:var(--c-fill);border:1px solid var(--c-line2);border-radius:9px;max-width:100%;min-width:0;direction:ltr;text-align:left}
.lv-console .wc-copyrow-t{flex:1;min-width:0;font-family:var(--mono);font-size:12.5px;color:var(--c-tx);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.lv-console .wc-copybtn{flex:0 0 auto;display:inline-flex;align-items:center;gap:5px;height:28px;padding:0 10px;border-radius:7px;border:1px solid var(--c-line2);background:var(--c-fill);color:var(--c-copy);font:inherit;font-size:11.5px;font-weight:600;cursor:pointer;white-space:nowrap;transition:background .14s}
.lv-console .wc-copybtn:hover{background:var(--c-fill2)}
.lv-console .wc-copybtn.done{color:var(--c-acc);border-color:var(--c-acc-line);background:var(--c-acc-fill2)}
.lv-console pre{max-width:100%}
/* ===== the live-session preview, on the plan ============================= */
/* the one precondition line */
.lv-ready{display:flex;align-items:flex-start;gap:8px;margin-top:12px;padding:0 2px;font-size:13px;line-height:1.5;color:var(--c-tx2);overflow-wrap:anywhere;opacity:0;animation:lv-rise .45s ease .3s forwards}
.lv-ready>svg{flex:0 0 auto;margin-top:3px;color:var(--c-acc)}
.lv-ready>span{min-width:0}
/* the band that names what is playing: simulated, on this plan */
.lv-sim{margin-top:14px;display:flex;flex-direction:column;gap:3px;padding:9px 12px;border-radius:11px;border:1px solid var(--c-warm-line);background:var(--c-warm-fill);min-width:0;animation:lv-rise .4s ease both}
.lv-sim-h{display:inline-flex;align-items:center;gap:7px;font-size:10px;letter-spacing:.14em;text-transform:uppercase;font-weight:800;color:var(--c-warm)}
.lv-sim-h i{width:7px;height:7px;border-radius:50%;background:var(--c-warm-dot);flex:0 0 auto;animation:lv-pulse-warm 1.5s infinite}
@keyframes lv-pulse-warm{0%{box-shadow:0 0 0 0 rgba(255,179,92,.5)}70%{box-shadow:0 0 0 6px rgba(255,179,92,0)}100%{box-shadow:0 0 0 0 rgba(255,179,92,0)}}
.lv-sim-n{font-size:12px;line-height:1.45;color:var(--c-tx2);overflow-wrap:anywhere}
/* step card states: being watched, seen done, corrected */
.lv-step{transition:border-color .3s,background .3s,box-shadow .3s}
.lv-step.cur{border-color:var(--c-cyan-strong);background:var(--c-cyan-fill);box-shadow:0 0 0 3px var(--c-cyan-ring)}
.lv-step.drift{border-color:var(--c-warm-strong);background:var(--c-warm-fill);box-shadow:0 0 0 3px var(--c-warm-fill2)}
.lv-step.ok{border-color:var(--c-acc-strong);background:var(--c-acc-fill2)}
.lv-step-l .watch{color:var(--c-cyan)}
.lv-step-l .ok{color:var(--c-acc)}
.lv-step-st{display:flex;align-items:flex-start;gap:7px;margin-top:9px;font-size:12.5px;line-height:1.45;color:var(--c-acc);overflow-wrap:anywhere;animation:lv-rise .35s ease both}
.lv-step-st>svg{flex:0 0 auto;margin-top:2px}
.lv-step-st>span{min-width:0}
.lv-step-st b{font-weight:800}
.lv-step-st .m{color:var(--c-tx2);font-weight:500}
.lv-step-st.watch{color:var(--c-cyan);align-items:center}
.lv-step-st.watch i{width:8px;height:8px;border-radius:50%;background:var(--c-cyan);flex:0 0 auto;animation:lv-blip .9s ease-in-out infinite}
/* the guide's correction bubble, in its own words */
.lv-bubble{position:relative;margin-top:10px;padding:9px 11px 9px 38px;border-radius:12px;border:1px solid var(--c-warm-line);background:var(--c-warm-fill);font-size:13px;line-height:1.5;color:var(--c-warm2);overflow-wrap:anywhere;animation:lv-bubble-in .4s cubic-bezier(.2,.9,.3,1.2) both}
[dir="rtl"] .lv-bubble{padding:9px 38px 9px 11px}
.lv-bubble .av{position:absolute;inset-inline-start:10px;top:10px;width:20px;height:20px;border-radius:50%;background:linear-gradient(135deg,#ffb35c,#ff7a59);color:#1a0e08;display:inline-flex;align-items:center;justify-content:center}
.lv-bubble .who{display:block;font-size:10px;letter-spacing:.12em;text-transform:uppercase;font-weight:800;color:var(--c-warm);margin-bottom:2px}
.lv-bubble .fix{display:flex;align-items:center;gap:5px;margin-top:7px;font-size:11.5px;font-weight:800;color:var(--c-acc);animation:lv-rise .3s ease both}
@keyframes lv-bubble-in{from{opacity:0;transform:translateY(6px) scale(.97)}to{opacity:1;transform:none}}
/* the end of the plan: seen and confirmed */
.lv-complete{display:flex;align-items:center;gap:12px;margin-top:12px;padding:12px 14px;border-radius:14px;background:var(--c-acc-fill2);border:1px solid var(--c-acc-line);min-width:0;animation:lv-pop .55s cubic-bezier(.2,1.4,.4,1) both}
.lv-complete .lv-vbadge{background:var(--c-ok-bg);color:var(--c-ok-tx);animation:lv-glow 1.7s ease-in-out infinite}
.lv-complete>span:last-child{min-width:0}
.lv-complete b{display:block;font-family:var(--disp);font-weight:800;font-size:16.5px;line-height:1.2;color:var(--c-acc);overflow-wrap:anywhere}
.lv-complete span span{display:block;font-size:12.5px;line-height:1.4;color:var(--c-tx2);margin-top:2px;overflow-wrap:anywhere}
/* the three promises, as pills (rows on a phone, so a pill never wraps) */
.lv-promise{list-style:none;margin:10px 0 0;padding:0;display:flex;flex-wrap:wrap;gap:7px}
.lv-promise li{display:inline-flex;align-items:center;gap:6px;max-width:100%;padding:5px 11px 5px 9px;border-radius:999px;border:1px solid var(--c-line2);background:var(--c-fill);font-size:12px;font-weight:700;color:var(--c-tx);white-space:nowrap}
.lv-promise svg{flex:0 0 auto;color:var(--c-warm)}
/* what you get, in one line */
.lv-val{margin-top:12px;display:flex;flex-wrap:wrap;gap:6px 14px;font-size:12.5px;color:var(--c-mut);opacity:0;animation:lv-rise .4s ease forwards;animation-delay:var(--d,0ms)}
.lv-val span{display:inline-flex;align-items:center;gap:6px}
.lv-val svg{color:var(--c-acc);flex:0 0 auto}
/* the ask: this, every day */
.lv-cta{margin-top:14px;border-radius:16px;padding:16px;background:linear-gradient(135deg,rgba(255,154,77,.18),rgba(242,106,67,.1));border:1px solid rgba(255,154,77,.42);animation:lv-ctain .5s cubic-bezier(.2,.8,.2,1) both;min-width:0}
@keyframes lv-ctain{from{opacity:0;transform:translateY(10px) scale(.985)}to{opacity:1;transform:none}}
.lv-cta-h{font-family:var(--disp);font-weight:800;font-size:20px;color:var(--c-head);letter-spacing:-.01em;line-height:1.2}
.lv-cta-sub{margin:5px 0 26px;font-size:13.5px;color:var(--c-tx2);line-height:1.5}
.lv-plan{position:relative;display:flex;align-items:center;gap:12px;flex-wrap:wrap;background:var(--c-fill);border:1px solid var(--c-line2);border-radius:13px;padding:14px 13px 11px;min-width:0}
.lv-plan-rib{position:absolute;top:-10px;inset-inline-start:12px;font-size:10px;letter-spacing:.1em;text-transform:uppercase;font-weight:800;color:#1a0e08;background:linear-gradient(135deg,#ffb35c,#ff7a59);border-radius:999px;padding:3px 9px;white-space:nowrap}
.lv-plan-n{font-family:var(--disp);font-weight:800;font-size:19px;color:var(--c-head)}
.lv-plan-p{font-weight:800;font-size:17px;color:var(--c-warm);white-space:nowrap}
.lv-plan-p small{font-weight:600;font-size:12px;color:var(--c-mut);margin-inline-start:1px}
.lv-plan-d{flex-basis:100%;font-size:12.5px;color:var(--c-tx2);line-height:1.4}
.lv-cta-btns{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}
.lv-start{flex:1 1 230px;display:inline-flex;align-items:center;justify-content:center;gap:9px;border:none;border-radius:12px;padding:13px 18px;font:inherit;font-weight:800;font-size:15px;color:#1a0e08;background:linear-gradient(135deg,#ffb35c,#ff7a59);cursor:pointer;box-shadow:0 16px 36px -14px rgba(255,122,89,.7);transition:transform .14s,box-shadow .14s;white-space:nowrap;min-width:0;text-decoration:none}
.lv-start:hover{transform:translateY(-1px);box-shadow:0 20px 40px -14px rgba(255,122,89,.8)}
.lv-compare{flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;gap:7px;border:1px solid var(--c-line2);background:transparent;color:var(--c-tx);border-radius:12px;padding:13px 16px;font:inherit;font-weight:700;font-size:14px;cursor:pointer;white-space:nowrap;transition:background .14s}
.lv-compare:hover{background:var(--c-fill2)}
.lv-trust{margin:11px 0 0;font-size:12px;color:var(--c-mut);display:flex;flex-wrap:wrap;gap:6px 14px}
.lv-trust span{display:inline-flex;align-items:center;gap:5px}
.lv-trust svg{color:var(--c-acc)}
@media(max-width:560px){
 .lv-theme{padding:0 8px}.lv-theme-tx{display:none}
}
`
