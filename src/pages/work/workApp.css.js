// The in-product design system (WD_CSS): the ONE token source for every
// signed-in .wd-* surface (dashboard, start wizard, tasks, help) plus the
// shell styles. Injected once by WorkAppLayout.
//
// Design direction (docs/dashboard-redesign-audit.md): calm, white, airy.
// Soft neutral canvas, white or lightly TINTED cards with no hard outline,
// generous whitespace, one bold label per block, crisp single-color icons on
// a tinted tile, restrained shadow (depth comes from tint + space), one orange
// call-to-action per screen. Brand: green / blue; AI assist: a calm violet.
// Guiding color-code untouched: emerald = current, cyan = what it sees,
// amber = warning, muted = next.
//
// Every color, radius, spacing step, shadow and type size below is a token.
// Components consume tokens only; a literal in a component is the bug.
export const WD_CSS = `
.wd{
  /* ---- Canvas + surfaces (light, the product default) ---- */
  --bg:#f6f7fb;--ink:var(--bg);--ink-soft:#ffffff;
  --panel:#ffffff;--panel-2:#fbfbfd;--panel-3:#f3f5f9;
  --line:#e6e9f0;--line-2:#d3d8e4;--line-soft:#eef0f5;
  --tx:#1a1f33;--tx-2:#2c3350;--mut:#5f6887;--mut-2:#454c6a;--faint:#8b92aa;
  /* ---- Brand accent (green, user-themable via src/theme/accent.js) + the
     fixed blue (--em-2) that stays the "observation" cyan whatever the accent. ---- */
  --em:var(--accent,#0e9f6e);--em-2:#0a84c2;--on-em:var(--accent-contrast,#ffffff);--em-deep:var(--accent-dark,#0b7a53);
  --em-fill:var(--accent-soft,#eaf7f0);--em-fill-2:#d7f1e4;--em-line:var(--accent-line,#bde9d5);
  /* ---- The ONE call-to-action color: orange (brand), never an all-orange UI. ---- */
  --cta:#c9501a;--cta-hover:#b4460f;--cta-ink:#ffffff;--cta-fill:#fdf0e8;--cta-line:rgba(201,80,26,.30);
  /* ---- Semantic: amber warning, danger, info, AI assist ---- */
  --warm:#b45309;--warm-2:#d97706;--warm-fill:#fdf4e7;--warm-line:rgba(180,83,9,.30);
  --danger:#d93a4d;--danger-fill:#fdeef0;--danger-line:rgba(217,58,77,.32);
  --info:#0a6fb3;--info-fill:#eaf3fc;--info-line:rgba(10,111,179,.26);
  --ai:#6d4fd6;--ai-fill:#f1edfc;--ai-line:rgba(109,79,214,.26);--violet:var(--ai);--rose:var(--danger);
  /* ---- Soft category tints (the reference's blue / green / violet chips):
     a pale fill + a saturated ink of the same hue for the icon or label. ---- */
  --tint-green:#eaf7f0;--tint-green-ink:#0b7a53;
  --tint-blue:#eaf3fc;--tint-blue-ink:#0a6fb3;
  --tint-violet:#f1edfc;--tint-violet-ink:#5b3fc4;
  --tint-amber:#fdf4e7;--tint-amber-ink:#9a4a07;
  --tint-neutral:#f1f3f8;--tint-neutral-ink:#454c6a;
  /* ---- Fields, chips, tracks, tooltips, scrim ---- */
  --card-a:#ffffff;--card-b:#fbfcff;
  --chip:#f1f3f8;--chip-line:#e2e6ee;
  --field:#fcfdff;--track:#e6e9f0;
  --tip-bg:#1f2437;--tip-tx:#ffffff;--scrim:rgba(14,18,32,.46);
  --focus:var(--accent,#0e9f6e);
  /* ---- Shadow scale: 0 none, 1 rest, 2 hover / raised, 3 popover / modal ---- */
  --sh-0:none;
  --sh-1:0 1px 2px rgba(20,24,44,.04);
  --sh-2:0 1px 2px rgba(20,24,44,.04),0 10px 24px -18px rgba(26,31,54,.22);
  --sh-3:0 22px 48px -30px rgba(30,40,80,.30);
  --card-shadow:var(--sh-1);--card-shadow-hover:var(--sh-2);--shadow:var(--sh-3);--shadow-sm:0 2px 12px rgba(30,40,80,.08);
  /* ---- Radius scale ---- */
  --r-xs:8px;--r-sm:10px;--r:14px;--r-lg:18px;--r-xl:22px;--r-pill:999px;
  /* ---- Spacing scale (4px base) ---- */
  --sp-1:4px;--sp-2:8px;--sp-3:12px;--sp-4:16px;--sp-5:20px;--sp-6:24px;--sp-7:32px;--sp-8:40px;
  /* ---- Type scale ---- */
  --fs-xs:11.5px;--fs-sm:12.5px;--fs-md:13.5px;--fs-base:14.5px;--fs-lg:16px;--fs-xl:18px;--fs-2xl:22px;--fs-3xl:26px;
  --wd-display:"Bricolage Grotesque","Figtree",system-ui,sans-serif;
  --wd-body:"Figtree",-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,Roboto,sans-serif;
  position:relative;display:flex;min-height:100vh;background:var(--bg);color:var(--tx);overflow-x:clip;
  font-family:var(--wd-body);font-size:15px;line-height:1.55;-webkit-font-smoothing:antialiased}
/* The one tint with no --accent-* counterpart: derived only once a user accent is
   set (data-accent on :root), so the default stays the designed literal above. */
[data-accent] .wd{--em-fill-2:color-mix(in srgb,var(--accent) 18%,var(--panel))}
/* ---- Dark values for the SAME tokens. The in-product ThemeProvider forces
   data-theme=light (owner law: white in-product), so this block is dormant by
   default; it exists so no surface ever hard-paints a light background and the
   whole system flips correctly if a dark theme is ever enabled. ---- */
[data-theme='dark'] .wd{
  --bg:#0f1220;--ink-soft:#171a2c;
  --panel:#171a2c;--panel-2:#1b1f33;--panel-3:#1f2439;
  --line:rgba(255,255,255,.09);--line-2:rgba(255,255,255,.16);--line-soft:rgba(255,255,255,.06);
  --tx:#e8eaf6;--tx-2:#d3d8e8;--mut:#a1a7c3;--mut-2:#b8bdd4;--faint:#767d9e;
  --em:var(--accent,#2ec48f);--em-2:#4fb6ef;--on-em:#06281c;--em-deep:#7ae6bd;
  --em-fill:rgba(46,196,143,.13);--em-fill-2:rgba(46,196,143,.24);--em-line:rgba(46,196,143,.38);
  --cta:#e8763f;--cta-hover:#f28a56;--cta-ink:#1a0c05;--cta-fill:rgba(232,118,63,.14);--cta-line:rgba(232,118,63,.40);
  --warm:#f0b35a;--warm-2:#f5c46b;--warm-fill:rgba(240,179,90,.12);--warm-line:rgba(240,179,90,.36);
  --danger:#f0637a;--danger-fill:rgba(240,99,122,.12);--danger-line:rgba(240,99,122,.38);
  --info:#6fb8ef;--info-fill:rgba(111,184,239,.12);--info-line:rgba(111,184,239,.34);
  --ai:#a68cf5;--ai-fill:rgba(166,140,245,.13);--ai-line:rgba(166,140,245,.36);
  --tint-green:rgba(46,196,143,.12);--tint-green-ink:#7ae6bd;
  --tint-blue:rgba(111,184,239,.12);--tint-blue-ink:#8fcbf5;
  --tint-violet:rgba(166,140,245,.13);--tint-violet-ink:#c3b2fa;
  --tint-amber:rgba(240,179,90,.12);--tint-amber-ink:#f5c46b;
  --tint-neutral:rgba(255,255,255,.05);--tint-neutral-ink:#c5cadc;
  --card-a:#1b1f33;--card-b:#171a2c;
  --chip:rgba(255,255,255,.06);--chip-line:rgba(255,255,255,.12);
  --field:#13162a;--track:rgba(255,255,255,.10);
  --tip-bg:#2a3048;--tip-tx:#f3f4fa;--scrim:rgba(0,0,0,.62);
  --sh-1:0 1px 2px rgba(0,0,0,.30);
  --sh-2:0 1px 2px rgba(0,0,0,.30),0 10px 24px -14px rgba(0,0,0,.55);
  --sh-3:0 22px 48px -24px rgba(0,0,0,.70);--shadow-sm:0 2px 12px rgba(0,0,0,.35)}
.wd *{box-sizing:border-box}
.wd h1,.wd h2,.wd h3{margin:0;color:var(--tx);font-family:var(--wd-display);letter-spacing:-.01em}
.wd p{margin:0}
.wd :focus-visible{outline:2px solid var(--focus);outline-offset:2px;border-radius:var(--r-sm)}
.wd button{cursor:pointer}

/* ---- Shell: left rail + slim top bar ------------------------------------
   The rail is a quiet white column: brand lockup, then the section nav. It
   collapses to a 64px icon strip (toggle in the top bar; automatic under
   900px). Every control in the top bar is nowrap + flex-shrink:0 so nothing
   can wrap or clip; the only flexible element is the spacer. Top-bar controls
   are GHOST pills (no outline at rest) so the bar reads as one calm strip;
   only the time chip (tinted) and the Upgrade pill (soft accent) carry color. */
.wd-rail{width:232px;flex:0 0 232px;position:sticky;top:0;height:100vh;align-self:flex-start;background:var(--panel);border-right:1px solid var(--line-soft);display:flex;flex-direction:column;padding:var(--sp-4) var(--sp-3);gap:2px;transition:width .18s ease,flex-basis .18s ease;z-index:31;overflow:hidden}
.wd-rail.collapsed{width:64px;flex-basis:64px;padding:var(--sp-4) 10px}
.wd-brand{display:flex;align-items:center;gap:10px;padding:4px 8px 18px;min-width:0;width:100%;background:none;border:none;font:inherit;text-align:left;color:inherit;cursor:pointer}
.wd-brand .mark{display:inline-flex;align-items:center;justify-content:center;flex:0 0 26px;line-height:0}
.wd-brand .bt{display:flex;flex-direction:column;line-height:1.12;min-width:0;overflow:hidden}
.wd-brand .bt small{font-size:var(--fs-xs);font-weight:600;color:var(--mut);letter-spacing:.01em;white-space:nowrap}
.wd-brand .bt b{font-family:var(--wd-display);font-weight:700;font-size:15px;color:var(--tx);white-space:nowrap}
.wd-rail.collapsed .wd-brand{padding:4px 0 18px;justify-content:center}
.wd-rail.collapsed .wd-brand .bt,.wd-rail.collapsed .wd-nav-t,.wd-rail.collapsed .wd-sect{display:none}
.wd-navs{display:flex;flex-direction:column;gap:2px}
.wd-sect{font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--faint);padding:16px 12px 6px;white-space:nowrap}
.wd-sect-rule{display:none;height:1px;background:var(--line-soft);margin:10px 6px}
.wd-rail.collapsed .wd-sect-rule{display:block}
.wd-nav{display:flex;align-items:center;gap:11px;width:100%;padding:9px 12px;border-radius:var(--r-sm);border:none;background:none;color:var(--tx-2);font:inherit;font-size:14px;font-weight:500;cursor:pointer;white-space:nowrap;text-decoration:none;text-align:left;transition:background .15s,color .15s}
.wd-nav:hover{background:var(--line-soft);color:var(--tx)}
.wd-nav.on{background:var(--em-fill);color:var(--em-deep);font-weight:600}
.wd-nav svg{flex:0 0 18px;opacity:.9}
.wd-nav.on svg{opacity:1}
.wd-nav .wd-nav-t{overflow:hidden;text-overflow:ellipsis}
.wd-rail.collapsed .wd-nav{justify-content:center;padding:9px 0}
.wd-rail-foot{margin-top:auto;display:flex;flex-direction:column;gap:2px}
.wd-nav.foot{color:var(--mut)}

.wd-main-col{flex:1;min-width:0;display:flex;flex-direction:column}
.wd-top{position:sticky;top:0;z-index:30;height:60px;display:flex;align-items:center;gap:var(--sp-3);padding:0 var(--sp-6);border-bottom:1px solid var(--line-soft);background:var(--panel);min-width:0}
.wd-collapse{width:32px;height:32px;border:1px solid transparent;background:transparent;border-radius:var(--r-xs);display:inline-flex;align-items:center;justify-content:center;color:var(--mut);cursor:pointer;flex-shrink:0;padding:0;transition:background .15s,color .15s}
.wd-collapse:hover{background:var(--line-soft);color:var(--tx)}
.wd-top h2{font-size:var(--fs-lg);font-weight:600;white-space:nowrap;flex-shrink:0;letter-spacing:-.005em}
.wd-top-sp{flex:1 1 8px;min-width:8px}
.wd-top-right{display:flex;align-items:center;gap:6px;flex-shrink:0;white-space:nowrap}
/* Shared chrome for the right-cluster controls: one 34px height, pill radius,
   nowrap + flex-shrink:0 on every one of them. Ghost at rest, tinted on hover. */
.wd-getapp,.wd-addtime,.wd-signout,.wd-buyhrs,.wd-upgrade,.wd-mins{display:inline-flex;align-items:center;justify-content:center;gap:6px;flex-shrink:0;white-space:nowrap;height:34px;border-radius:var(--r-pill);border:1px solid transparent;background:transparent;color:var(--tx-2);font:inherit;font-size:var(--fs-md);font-weight:500;line-height:1;text-decoration:none;cursor:pointer;padding:0 13px;transition:color .15s,border-color .15s,background .15s,filter .15s}
.wd-getapp:hover,.wd-addtime:hover,.wd-signout:hover,.wd-buyhrs:hover{background:var(--line-soft);color:var(--tx)}
.wd-buyhrs,.wd-addtime{border-color:var(--line)}
/* Buy hours: the full label wide, the short one from 1100px down, icon only at 480. */
.wd-buyhrs .short{display:none}
.wd-getapp{position:relative;width:34px;padding:0;color:var(--mut)}
/* Icon-only link: the label stays in the DOM for screen readers and the
   title tooltip carries it for everyone else. */
.wd-getapp span{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.wd-mins{color:var(--em-deep);background:var(--em-fill);font-weight:600;cursor:default}
.wd-mins svg{flex-shrink:0}
.wd-mins.low{color:var(--warm);background:var(--warm-fill)}
.wd-mins.skel{color:transparent;min-width:104px;background:var(--track)}
.wd-upgrade{color:var(--em-deep);background:var(--em-fill);font-weight:600}
.wd-upgrade:hover{background:var(--em-fill-2)}
.wd-addtime{font-weight:600}
.wd-signout{color:var(--mut)}
.wd-avatar{width:34px;height:34px;border-radius:50%;background:var(--em-fill);display:inline-flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;color:var(--em-deep);flex-shrink:0;text-transform:uppercase}

.wd-main{position:relative;z-index:2;width:100%;max-width:1000px;margin:0 auto;padding:var(--sp-7) 28px 56px;min-width:0}
.wd-main.wide{max-width:1120px}
#wd-start-card,#wd-sessions,#wd-skills{scroll-margin-top:76px}

/* ---- Company co-branding strip (white-label) ---------------------------
   Sits above the greeting for company users only. Reads as
   "{Company}, powered by WorkCoPilot": the company owns the left (logo tile,
   name, contact line), a hairline rule separates it from the WorkCoPilot
   mark on the right. One flat panel, 1px line, same card recipe as the rest
   of the home view; no gradients, no second accent. */
.wd-cobrand{display:flex;align-items:center;gap:16px;min-width:0;margin-bottom:var(--sp-6);padding:10px 14px 10px 12px;background:var(--panel);border:1px solid var(--line-soft);border-radius:var(--r);box-shadow:var(--sh-0)}
.wd-cobrand-logo{display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;height:44px;min-width:44px;max-width:168px;padding:0 6px;border-radius:11px;background:var(--panel-3);border:1px solid var(--line-soft);overflow:hidden}
.wd-cobrand-logo img{display:block;max-height:36px;max-width:156px;width:auto;height:auto;object-fit:contain}
.wd-cobrand-logo.mono{color:var(--em);background:var(--em-fill);border-color:var(--em-line)}
.wd-cobrand-logo.mono b{font-family:"Bricolage Grotesque";font-weight:800;font-size:17px;letter-spacing:-.02em;line-height:1}
.wd-cobrand-id{min-width:0;flex:1 1 220px}
.wd-cobrand-eyebrow{display:block;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--mut);line-height:1.2;margin-bottom:3px}
.wd-cobrand-name{display:block;font-family:"Bricolage Grotesque";font-weight:800;font-size:18px;letter-spacing:-.018em;line-height:1.2;color:var(--tx);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wd-cobrand-meta{display:flex;flex-wrap:wrap;align-items:center;gap:4px 14px;margin-top:4px;font-size:12.5px;color:var(--mut);line-height:1.4;min-width:0}
.wd-cobrand-meta > span{display:inline-flex;align-items:center;gap:5px;min-width:0;max-width:100%}
.wd-cobrand-meta svg{flex-shrink:0;opacity:.8}
.wd-cobrand-meta a{color:var(--mut);text-decoration:none;border-bottom:1px solid var(--line-2);transition:color .15s,border-color .15s;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wd-cobrand-meta a:hover{color:var(--em-2);border-color:var(--em-2)}
.wd-cobrand-meta .txt{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wd-cobrand-sep{width:1px;align-self:stretch;background:var(--line);flex-shrink:0;margin:2px 0}
.wd-cobrand-by{display:inline-flex;align-items:center;gap:8px;flex-shrink:0;white-space:nowrap;line-height:1}
.wd-cobrand-by small{font-size:11px;font-weight:600;letter-spacing:.02em;color:var(--mut)}
.wd-cobrand-by b{font-family:"Bricolage Grotesque";font-weight:800;font-size:14px;letter-spacing:-.015em;color:var(--tx)}
.wd-cobrand-by b i{font-style:normal;color:var(--em)}
.wd-cobrand-exec{display:inline-flex;align-items:center;gap:7px;flex-shrink:0;white-space:nowrap;height:36px;padding:0 13px;border-radius:10px;border:1px solid var(--em-line);background:var(--em-fill);color:var(--em);font:inherit;font-size:13px;font-weight:700;line-height:1;text-decoration:none;transition:background .15s,border-color .15s,transform .15s}
.wd-cobrand-exec:hover{background:var(--em-fill-2);border-color:var(--em);transform:translateY(-1px)}
.wd-cobrand-exec svg{flex-shrink:0}
@media(max-width:760px){
 .wd-cobrand{flex-wrap:wrap;gap:12px 14px;padding:12px 14px}
 .wd-cobrand-sep{display:none}
 .wd-cobrand-by{order:3;flex:1 1 auto}
 .wd-cobrand-exec{order:4;margin-left:auto}
}
@media(max-width:480px){
 .wd-cobrand-id{flex:1 1 calc(100% - 60px)}
 .wd-cobrand-name{white-space:normal}
 .wd-cobrand-exec{flex:1 1 100%;justify-content:center;margin-left:0}
}

/* ---- Greeting: compact. One heading, one muted status line, no hero. ---- */
.wd-hello h1{font-family:var(--wd-display);font-weight:700;font-size:var(--fs-3xl);line-height:1.2;letter-spacing:-.015em}
.wd-plan{display:flex;align-items:center;gap:8px;margin-top:5px;color:var(--mut);font-size:var(--fs-base)}
.wd-plan-dot{width:7px;height:7px;border-radius:50%;background:var(--em);flex-shrink:0}
.wd-plan-skel{height:14px;width:260px;max-width:70%;border-radius:7px;margin-top:8px;background:var(--track)}
@keyframes wd-rise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}

/* ---- Cards: one quiet recipe for every block on the home view ----------
   A white face with a hairline (no outline weight, no shadow at rest), or a
   soft TINTED face with no border at all (.wd-card.tint-*). Depth comes from
   tint and whitespace, not from shadow. The head is an icon tile + title +
   muted caption. Icon tiles are borderless: a pale fill with a saturated
   same-hue icon, exactly the reference's category chips. */
.wd-card{background:var(--panel);border:1px solid var(--line-soft);border-radius:var(--r);box-shadow:var(--sh-0);transition:border-color .18s,box-shadow .18s}
.wd-card:hover{border-color:var(--line)}
.wd-card.tint-green{background:var(--tint-green);border-color:transparent}
.wd-card.tint-blue{background:var(--tint-blue);border-color:transparent}
.wd-card.tint-violet{background:var(--tint-violet);border-color:transparent}
.wd-card.tint-neutral{background:var(--tint-neutral);border-color:transparent}
.wd-card-head{display:flex;align-items:flex-start;gap:12px}
.wd-card-t{display:block;font-size:var(--fs-base);font-weight:700;color:var(--tx);line-height:1.3}
.wd-card-c{display:block;font-size:var(--fs-sm);color:var(--mut);margin-top:2px;line-height:1.45}
.wd-ic{display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:var(--r-sm);background:var(--tint-green);color:var(--tint-green-ink);flex-shrink:0;border:none}
.wd-ic.alt{color:var(--tint-blue-ink);background:var(--tint-blue)}
.wd-ic.warm{color:var(--tint-amber-ink);background:var(--tint-amber)}
.wd-ic.ai{color:var(--tint-violet-ink);background:var(--tint-violet)}
.wd-ic.neutral{color:var(--tint-neutral-ink);background:var(--tint-neutral)}
.wd-link{color:var(--em-2);font-weight:600;text-decoration:underline;text-underline-offset:3px;text-decoration-color:color-mix(in srgb,var(--em-2) 40%,transparent)}
.wd-link:hover{text-decoration-color:var(--em-2)}

/* Quiet secondary rows: Buddy + Data protection + Skills share ONE white card
   separated by hairlines. Each is a compact row; the expandable ones open in
   place (Data protection -> ScrubRules, Skills -> SkillsCard body). */
.wd-more{margin-top:var(--sp-5);background:var(--panel);border:1px solid var(--line-soft);border-radius:var(--r);box-shadow:var(--sh-0);overflow:hidden}
.wd-more > * + *{border-top:1px solid var(--line-soft)}
.wd-more .wd-card{border:none;border-radius:0;box-shadow:none;background:transparent}
.wd-more .wd-card:hover{border-color:transparent}
.wd-more .wd-ic{width:32px;height:32px;border-radius:var(--r-xs)}
/* Skills card body */
.wd-sk{display:flex;flex-direction:column;gap:12px}
.wd-sk-lead{font-size:13px;line-height:1.5;color:var(--mut);margin:0}
.wd-sk-note{display:flex;gap:9px;align-items:flex-start;padding:10px 12px;border-radius:11px;background:var(--info-fill);border:1px solid var(--info-line);font-size:12.5px;line-height:1.5;color:var(--tx)}
.wd-sk-note svg{flex:none;margin-top:2px;color:var(--info)}
.wd-sk-note.private{background:var(--em-fill);border-color:var(--em-line)}
.wd-sk-note.private svg{color:var(--em)}
.wd-sk-form{display:flex;flex-direction:column;gap:8px}
.wd-sk-input,.wd-sk-ta{width:100%;background:var(--field);border:1px solid var(--line);border-radius:11px;padding:10px 12px;color:var(--tx);font:inherit;font-size:13.5px;line-height:1.45;outline:none;transition:border-color .15s,box-shadow .15s}
.wd-sk-ta{resize:vertical;min-height:112px}
.wd-sk-input::placeholder,.wd-sk-ta::placeholder{color:var(--mut)}
.wd-sk-input:focus,.wd-sk-ta:focus{border-color:var(--em);box-shadow:0 0 0 3px var(--em-fill)}
.wd-sk-row{display:flex;gap:8px;align-items:center}
.wd-sk-row .wd-sk-input{flex:1 1 auto;min-width:0}
.wd-sk-add{padding:10px 14px;font-size:13.5px;border-radius:11px;flex:0 0 auto}
.wd-sk-err{display:flex;align-items:center;gap:7px;font-size:12.5px;color:var(--danger)}
.wd-sk-empty{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--mut);padding:4px 2px}
.wd-sk-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}
.wd-sk-item{display:flex;align-items:flex-start;gap:10px;padding:9px 10px;border-radius:11px;background:var(--card-a);border:1px solid var(--line)}
.wd-sk-ic{width:26px;height:26px;border-radius:8px;display:grid;place-items:center;background:var(--em-fill);color:var(--em);flex:none}
.wd-sk-body{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}
.wd-sk-body b{font-size:13.5px;font-weight:650;line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wd-sk-meta{display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:11.5px;color:var(--mut)}
.wd-sk-tag{font-style:normal;font-size:10.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--em-2);background:var(--info-fill);border:1px solid var(--info-line);border-radius:999px;padding:1px 7px}
.wd-sk-del{flex:none;width:28px;height:28px;border-radius:8px;display:grid;place-items:center;background:transparent;border:1px solid transparent;color:var(--mut);cursor:pointer;transition:color .15s,border-color .15s,background .15s}
.wd-sk-del:hover{color:var(--danger);border-color:var(--line-2);background:var(--panel)}
.wd-buddy{display:flex;align-items:center;gap:12px;padding:12px 16px;min-width:0;flex-wrap:wrap}
.wd-buddy .wd-card-t,.wd-dp .wd-card-t{font-size:14px}
.wd-buddy .wd-card-body{min-width:0;flex:1 1 200px}
.wd-buddy .wd-card-end{margin-left:auto;flex-shrink:0}
.wd-dp{overflow:hidden;align-self:start}
.wd-dp-btn{width:100%;display:flex;align-items:center;gap:12px;padding:12px 16px;background:transparent;border:none;cursor:pointer;color:var(--tx);text-align:left;font:inherit;transition:background .15s;border-radius:0}
.wd-dp-btn:hover{background:var(--line-soft)}
.wd-dp-btn .wd-card-body{min-width:0;flex:1}
.wd-dp-btn .wd-card-c{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wd-dp-chev{margin-left:auto;color:var(--mut);flex-shrink:0;transition:transform .18s}
.wd-dp-chev.open{transform:rotate(90deg)}
.wd-dp-body{padding:0 14px 14px;border-top:1px solid var(--line-soft);padding-top:12px;font-size:13.5px;color:var(--mut);line-height:1.55}

/* Notes: info (admin access) and warning (gate message) */
.wd-note{display:flex;gap:11px;align-items:flex-start;margin:0 0 14px;padding:12px 15px;border-radius:var(--r);font-size:var(--fs-md);line-height:1.5;border:1px solid transparent;background:var(--info-fill);color:var(--tx)}
.wd-note.wd-gap{margin:var(--sp-5) 0 0}
.wd-note svg{flex-shrink:0;margin-top:2px;color:var(--info)}
.wd-note a{color:var(--info);font-weight:600;text-decoration:underline;text-underline-offset:3px}
/* An action inside a note (e.g. "Add hours" next to the out-of-hours gate): reads as a link, no box. */
.wd-note .wd-note-act{background:none;border:none;padding:0;margin:0;font:inherit;font-weight:600;color:var(--info);text-decoration:underline;text-underline-offset:3px;cursor:pointer;white-space:nowrap}
.wd-note.warn .wd-note-act{color:var(--warm)}
.wd-note.warn{background:var(--warm-fill)}
.wd-note.warn svg{color:var(--warm)}

.wd-buy{margin-top:var(--sp-5);display:flex;gap:13px;align-items:flex-start;border:1px solid transparent;background:var(--tint-green);border-radius:var(--r-lg);padding:16px 18px;box-shadow:var(--sh-0)}
.wd-buy .ic{display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:11px;background:var(--panel);color:var(--tint-green-ink);flex-shrink:0}
.wd-buy h3{font-family:"Bricolage Grotesque";font-weight:700;font-size:16px;margin-bottom:5px}
.wd-buy p{color:var(--mut);font-size:13.5px}
.wd-buy p b{color:var(--tx)}
.wd-buy .x{margin-left:auto;background:none;border:none;color:var(--mut);padding:4px;border-radius:8px;flex-shrink:0}
.wd-buy .x:hover{color:var(--tx)}

/* Plan chooser (free signup needs a plan to guide) */
.wd-sub{margin-top:var(--sp-5);border:1px solid var(--line-soft);background:var(--panel);border-radius:var(--r-lg);padding:18px 18px 16px;box-shadow:var(--sh-0)}
.wd-sub-head{display:flex;gap:13px;align-items:flex-start}
.wd-sub-head .ic{display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:11px;background:var(--em-fill-2);color:var(--em);flex-shrink:0}
.wd-sub-head h3{font-family:"Bricolage Grotesque";font-weight:700;font-size:17px;margin-bottom:5px}
.wd-sub-head p{color:var(--mut);font-size:13.5px;max-width:62ch}
.wd-sub-plans{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:16px}
.wd-sub-plan{position:relative;display:flex;flex-direction:column;align-items:flex-start;gap:4px;text-align:left;border:1px solid var(--line);background:var(--panel);border-radius:14px;padding:14px 14px 13px;cursor:pointer;transition:transform .15s,border-color .15s}
.wd-sub-plan:hover{transform:translateY(-2px);border-color:var(--em)}
.wd-sub-plan:disabled{opacity:.7;cursor:default;transform:none}
.wd-sub-plan.pop{border-color:var(--em)}
.wd-sub-plan .tag{position:absolute;top:-9px;right:12px;font-size:10px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;background:var(--em);color:var(--on-em);padding:3px 8px;border-radius:var(--r-pill)}
.wd-sub-plan .nm{font-family:"Bricolage Grotesque";font-weight:700;font-size:15px}
.wd-sub-plan .pr{font-family:"Bricolage Grotesque";font-weight:800;font-size:24px;line-height:1}
.wd-sub-plan .pr i{font-style:normal;font-size:12px;font-weight:600;color:var(--mut);margin-left:2px}
.wd-sub-plan .hr{font-size:12.5px;color:var(--mut)}
.wd-sub-plan .go{margin-top:8px;display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:var(--em)}
.wd-sub-err{margin-top:12px;display:flex;align-items:center;gap:7px;color:var(--warm);font-size:13px}
.wd-sub-note{margin-top:12px;color:var(--mut);font-size:12.5px}
@media(max-width:720px){.wd-sub-plans{grid-template-columns:1fr}}

.wd-setup{margin-top:var(--sp-5);border:1px solid transparent;background:var(--tint-amber);border-radius:var(--r-lg);padding:16px;box-shadow:var(--sh-0)}
.wd-setup-note{display:flex;align-items:center;gap:9px;color:var(--warm);font-size:13.5px;margin-bottom:12px;font-weight:600}

/* Section head: icon tile + title + caption, shared by the plan form, the
   spaces grid and the sessions list. */
.wd-sec{display:flex;align-items:flex-start;gap:12px;margin-bottom:var(--sp-4)}
.wd-sec h2{font-family:var(--wd-display);font-weight:700;font-size:var(--fs-lg);letter-spacing:-.01em;line-height:1.3;display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}
.wd-sec p{color:var(--mut);font-size:var(--fs-md);margin-top:2px;line-height:1.45}
.wd-sec .wd-ic{margin-top:0}
.wd-sec > div{min-width:0;flex:1 1 auto}

/* START A TASK: the primary action card. White face, 1px line, soft lift;
   the readiness coach lives inside it beneath the head. */
.wd-start{position:relative;margin-top:22px;padding:22px 22px 18px;border-radius:16px;border:1px solid var(--line);background:var(--panel);box-shadow:var(--card-shadow)}
.wd-start .wd-sec{margin-bottom:14px}
.wd-start .wd-sec p{max-width:70ch}
.wd-start .wd-coach{margin-top:2px}
.wd-start label{display:block;font-size:12.5px;color:var(--mut-2);font-weight:600;letter-spacing:.02em;margin-bottom:7px}
.wd-start label .req{color:var(--warm)}
.wd-taskcap{font-size:12px;color:var(--mut);margin-top:8px}
.wd-start textarea{width:100%;resize:vertical;min-height:88px;background:var(--field);border:1px solid var(--line);border-radius:12px;padding:13px 14px;color:var(--tx);font:inherit;font-size:15.5px;line-height:1.5;outline:none;transition:border-color .15s,box-shadow .15s,background .15s}
.wd-start textarea::placeholder{color:var(--mut)}
.wd-start textarea:hover{border-color:var(--line-2)}
.wd-start textarea:focus{border-color:var(--em);box-shadow:0 0 0 3px var(--em-fill);background:var(--panel)}
.wd-nameinput{width:100%;background:var(--field);border:1px solid var(--line);border-radius:12px;padding:11px 14px;color:var(--tx);font:inherit;font-size:15px;outline:none;transition:border-color .15s,box-shadow .15s,background .15s}
.wd-nameinput::placeholder{color:var(--mut)}
.wd-nameinput:hover{border-color:var(--line-2)}
.wd-nameinput:focus{border-color:var(--em);box-shadow:0 0 0 3px var(--em-fill);background:var(--panel)}
.wd-modal-ov{position:fixed;inset:0;z-index:80;display:flex;align-items:center;justify-content:center;padding:20px;background:var(--scrim);backdrop-filter:blur(3px)}
.wd-modal{width:min(440px,calc(100vw - 36px));background:var(--panel);border:1px solid var(--line-soft);border-radius:var(--r-lg);padding:22px;box-shadow:var(--sh-3)}
.wd-modal h3{display:flex;align-items:center;gap:9px;font-family:"Bricolage Grotesque";font-weight:800;font-size:19px;margin:0 0 12px}
.wd-modal h3 svg{color:var(--danger)}
.wd-modal-sess{font-size:14px;font-weight:600;color:var(--tx);background:var(--chip);border:1px solid var(--chip-line);border-radius:10px;padding:9px 12px;margin-bottom:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wd-modal label{display:block;font-size:13px;font-weight:600;color:var(--tx-2);margin-bottom:7px}
.wd-modal label .req{color:var(--danger);font-weight:600;font-size:11.5px;margin-left:4px}
.wd-modal textarea{width:100%;resize:vertical;background:var(--field);border:1px solid var(--line);border-radius:11px;padding:11px;color:var(--tx);font:inherit;font-size:14px;outline:none}
.wd-modal textarea:focus{border-color:var(--em);box-shadow:0 0 0 3px var(--em-fill)}
.wd-modal-note{font-size:11.5px;color:var(--mut);margin-top:9px;line-height:1.5}
.wd-modal-btns{display:flex;justify-content:flex-end;gap:10px;margin-top:16px}
.wd-start-row{display:flex;align-items:center;gap:14px;margin-top:14px;flex-wrap:wrap}
.wd-hint{color:var(--mut);font-size:13px;flex:1;min-width:180px}
.wd-docs{margin-top:16px;padding-top:16px;border-top:1px solid var(--line)}
.wd-docs.locked{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
.wd-docs-row{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.wd-docs-lead{display:inline-flex;align-items:center;gap:7px;font-size:13.5px;font-weight:600;color:var(--tx-2)}
.wd-docs-lead svg{color:var(--em-2)}
.wd-docs-sub{color:var(--mut);font-weight:500;font-size:12px}
.wd-docs-gate{display:inline-flex;align-items:center;gap:5px;font-size:11.5px;font-weight:700;color:var(--warm);background:var(--warm-fill);border:1px solid var(--warm-line);border-radius:999px;padding:3px 10px}
.wd-docs-add{margin-left:auto;display:inline-flex;align-items:center;gap:6px;background:var(--chip);color:var(--tx);border:1px solid var(--chip-line);border-radius:10px;padding:7px 12px;font:inherit;font-weight:600;font-size:13px;white-space:nowrap;cursor:pointer;transition:border-color .15s,background .15s,color .15s}
.wd-docs-add:hover:not(:disabled){border-color:var(--em-line);background:var(--em-fill);color:var(--em)}
.wd-docs-add:disabled{opacity:.6;cursor:default}
.wd-docs-list{display:flex;flex-wrap:wrap;gap:8px;margin-top:11px}
.wd-docs-chip{display:inline-flex;align-items:center;gap:6px;max-width:260px;background:var(--em-fill);border:1px solid var(--em-line);border-radius:9px;padding:5px 7px 5px 10px;font-size:12.5px;color:var(--tx)}
.wd-docs-chip svg{color:var(--em);flex-shrink:0}
.wd-docs-chip .nm{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wd-docs-ocr{font-size:9.5px;font-weight:800;letter-spacing:.04em;color:var(--em-2);background:var(--em-fill-2);border:1px solid var(--em-line);border-radius:5px;padding:1px 5px;flex-shrink:0}
.wd-docs-ocr.low{color:var(--warm);background:var(--warm-fill);border-color:var(--warm-line)}
.wd-docs-chip button{display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:5px;border:none;background:transparent;color:var(--mut);cursor:pointer;flex-shrink:0}
.wd-docs-chip button:hover{background:var(--line-2);color:var(--tx)}
.wd-docs-err{margin-top:9px;display:flex;align-items:center;gap:6px;font-size:12.5px;color:var(--danger)}
.wd-docs-note{margin-top:9px;font-size:11.5px;color:var(--mut);line-height:1.5}
/* The ONE call-to-action: orange on every surface (brand), the only solid
   orange element on a screen. Secondary actions stay green / outline. */
.wd-cta{display:inline-flex;align-items:center;justify-content:center;gap:8px;white-space:nowrap;background:var(--cta);color:var(--cta-ink);border:none;border-radius:var(--r-sm);height:40px;padding:0 20px;font:inherit;font-weight:600;font-size:var(--fs-base);cursor:pointer;transition:background .15s,transform .15s}
.wd-cta:hover:not(:disabled){background:var(--cta-hover)}
.wd-cta:active:not(:disabled){transform:translateY(0)}
.wd-cta:disabled{opacity:.5;cursor:default;transform:none}

.wd-sessions{margin-top:var(--sp-7)}
.wd-sec-count{font-size:12px;color:var(--mut);font-weight:600;border:1px solid var(--chip-line);background:var(--chip);border-radius:var(--r-pill);padding:2px 9px;line-height:1.5;white-space:nowrap;flex-shrink:0}
.wd-sess-list{display:flex;flex-direction:column;gap:var(--sp-2)}
.wd-sess{display:flex;align-items:center;gap:12px;background:var(--panel);border:1px solid var(--line-soft);border-radius:var(--r);padding:12px 16px;box-shadow:var(--sh-0);transition:border-color .2s}
.wd-sess:hover{border-color:var(--line)}
.wd-sess-ic{width:32px;height:32px;border-radius:var(--r-xs);background:var(--tint-blue);color:var(--tint-blue-ink);display:inline-flex;align-items:center;justify-content:center;flex:0 0 32px}
.wd-sess-ic.done{background:var(--tint-green);color:var(--tint-green-ink)}
.wd-sess-main{flex:1;min-width:0}
.wd-sess-title{font-weight:600;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wd-sess-meta{font-size:13px;color:var(--mut);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wd-sess-done{color:var(--em-deep);font-weight:600}
.wd-sess-bar{height:4px;background:var(--track);border-radius:3px;margin-top:8px;overflow:hidden;max-width:380px}
.wd-sess-bar i{display:block;height:100%;border-radius:3px;background:var(--em);transition:width .4s ease}
.wd-resume{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 13px;border-radius:var(--r-pill);border:1px solid var(--line);background:var(--panel);color:var(--tx-2);font:inherit;font-weight:500;font-size:var(--fs-md);cursor:pointer;flex-shrink:0;white-space:nowrap;transition:background .15s,border-color .15s}
.wd-resume:hover{border-color:var(--line-2);background:var(--line-soft)}
.wd-del{background:none;border:none;color:var(--mut);cursor:pointer;padding:7px;border-radius:9px;flex-shrink:0;transition:color .15s,background .15s}
.wd-del:hover{color:var(--danger);background:var(--danger-fill)}
.wd-empty{border:1px dashed var(--line-2);border-radius:var(--r);padding:18px 16px;display:flex;align-items:center;gap:14px;background:var(--panel)}
.wd-empty .ic{display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:var(--r-sm);background:var(--tint-green);border:none;color:var(--tint-green-ink);flex-shrink:0}
.wd-empty b{display:block;color:var(--tx);font-size:var(--fs-base);margin-bottom:2px}
.wd-empty p{color:var(--mut);font-size:var(--fs-md)}
.wd-skel{background:var(--panel);border:1px solid var(--line-soft);border-radius:var(--r);padding:16px;display:flex;flex-direction:column;gap:10px}
.wd-skel i{display:block;height:12px;border-radius:6px;background:var(--track);background-size:200% 100%;animation:wd-sh 1.3s linear infinite}
.wd-skel i.w1{width:52%}.wd-skel i.w2{width:34%}.wd-skel i.w3{width:80%;height:5px}
@keyframes wd-sh{0%{background-position:200% 0}100%{background-position:-200% 0}}
/* Stat tiles: a slim 3-up (minutes left / tasks today / saved tasks). */
.wd-stats{margin-top:var(--sp-4);display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--sp-3)}
.wd-stat{background:var(--tint-neutral);border:none;border-radius:var(--r);padding:14px 16px;min-width:0}
.wd-stat .l{font-size:var(--fs-sm);color:var(--mut);display:flex;align-items:center;gap:7px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wd-stat .l svg{flex-shrink:0}
.wd-stat .v{margin-top:6px;font-size:23px;font-weight:700;font-family:var(--wd-display);line-height:1.1;white-space:nowrap}
.wd-stat .v small{font-size:13px;font-weight:500;color:var(--faint);font-family:var(--wd-body)}
.wd-stat .v.skel{height:26px;width:60%;border-radius:7px;background:var(--track)}

.wd-apps{margin-top:40px}
.wd-apps-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.wd-app{position:relative;display:flex;flex-direction:column;background:linear-gradient(180deg,var(--card-a),var(--card-b));border:1px solid var(--line);border-radius:16px;padding:20px;overflow:hidden}
.wd-app.feat{border-color:var(--em-line);background:linear-gradient(180deg,var(--em-fill),var(--card-b))}
.wd-app-ribbon{position:absolute;top:12px;right:12px;font-size:10.5px;font-weight:700;letter-spacing:.02em;color:var(--on-em);background:linear-gradient(135deg,var(--em),var(--em-2));border-radius:999px;padding:3px 9px}
.wd-app-ic{display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:12px;background:var(--em-fill-2);color:var(--em);margin-bottom:14px}
.wd-app-ic.alt{color:var(--em-2);background:color-mix(in srgb,var(--em-2) 15%,transparent)}
.wd-app h3{font-family:"Bricolage Grotesque";font-size:17px;margin-bottom:6px}
.wd-app p{color:var(--mut);font-size:13.5px;margin-bottom:16px;flex:1}
.wd-app-btn{display:inline-flex;align-items:center;gap:6px;align-self:flex-start;background:var(--chip);border:1px solid var(--line);color:var(--tx);border-radius:10px;padding:8px 13px;font-size:13.5px;font-weight:600;text-decoration:none;transition:border-color .15s,background .15s}
.wd-app-btn:hover{border-color:var(--em-line);background:var(--em-fill)}
.wd-app-btn.off{opacity:.55;pointer-events:none}
.wd-app-here{display:inline-flex;align-items:center;gap:6px;color:var(--em);font-size:13px;font-weight:600}

/* HELP */
.wd-help{display:grid;grid-template-columns:234px 1fr;gap:34px;align-items:start}
.wd-help-nav{position:sticky;top:84px;display:flex;flex-direction:column;gap:2px}
.wd-help-navlabel{font-size:11px;letter-spacing:.14em;color:var(--mut);font-weight:700;margin-bottom:8px;text-transform:uppercase}
.wd-help-nav button{text-align:left;background:none;border:none;color:var(--mut);font:inherit;font-size:14px;padding:8px 11px;border-radius:9px;cursor:pointer;transition:color .15s,background .15s}
.wd-help-nav button:hover{color:var(--tx);background:var(--chip)}
.wd-help-nav button.on{color:var(--tx);background:var(--em-fill);box-shadow:inset 2px 0 0 var(--em)}
.wd-help-start{margin-top:14px;display:inline-flex!important;align-items:center;gap:7px;color:var(--em)!important;border:1px solid var(--em-line)!important;justify-content:center;font-weight:600}
.wd-help-start:hover{background:var(--em-fill)!important}
.wd-help-body{min-width:0}
.wd-help-body h1{font-family:"Bricolage Grotesque";font-weight:800;font-size:clamp(28px,4vw,38px);letter-spacing:-.02em}
.wd-help-lead{color:var(--mut);font-size:18px;margin:10px 0 10px}
.wd-help-body section{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:22px 26px;margin-bottom:16px;box-shadow:0 1px 2px rgba(17,23,38,.04),0 14px 34px -26px rgba(17,23,38,.18);scroll-margin-top:84px}
.wd-help-body h2{font-family:"Bricolage Grotesque";font-weight:800;font-size:22px;letter-spacing:-.01em;margin-bottom:14px;display:flex;align-items:center;gap:11px}
.wd-help-body h2:before{content:"";width:4px;height:22px;border-radius:3px;background:var(--em);flex-shrink:0}
.wd-help-body h3.sub{font-size:15px;font-weight:700;color:var(--tx);margin:16px 0 6px}
.wd-help-body p{color:var(--mut);margin-bottom:10px}
.wd-help-body b{color:var(--tx)}
.wd-help-body ul,.wd-help-body ol{color:var(--mut);margin:0 0 10px;padding-left:22px;display:flex;flex-direction:column;gap:7px}
.wd-help-body li{line-height:1.6}
.wd-tip{display:flex;gap:9px;align-items:flex-start;background:var(--em-fill);border:1px solid var(--em-line);border-radius:12px;padding:12px 14px;color:var(--tx)!important;font-size:14px;margin-top:6px}
.wd-tip svg{color:var(--em);flex-shrink:0;margin-top:3px}
/* Help visuals: a "how it works" illustration + inline-SVG UI mockups. The
   illustration scales to the column width (max 860) and never overflows. */
.wd-hf-fig{margin:18px 0 22px}
.wd-hf-img{display:block;width:100%;max-width:860px;height:auto;border-radius:16px;border:1px solid var(--line);box-shadow:var(--card-shadow)}
.wd-fig{margin:14px 0 8px}
.wd-shot{display:block;width:100%;max-width:440px;height:auto}
.wd-figcap{margin-top:7px;font-size:12px;color:var(--mut);line-height:1.45;font-style:italic}
.wd-steps{list-style:none;padding:0!important;counter-reset:wd-step;display:flex;flex-direction:column;gap:14px!important}
.wd-steps li{position:relative;padding-left:42px;line-height:1.62;min-height:28px;display:block}
.wd-steps li:before{counter-increment:wd-step;content:counter(wd-step);position:absolute;left:0;top:0;width:28px;height:28px;border-radius:50%;background:var(--em-fill-2);color:var(--em);border:1px solid var(--em-line);display:inline-flex;align-items:center;justify-content:center;font-size:13px;font-weight:700}
.wd-faq{border-top:1px solid var(--line);padding:16px 0}
.wd-faq:first-of-type{border-top:none}
.wd-faq b{display:block;color:var(--tx);margin-bottom:5px;font-size:15px}
.wd-faq p{margin:0}
.wd-help-cta{padding:30px 0 0}
/* On-screen flow: numbered step cards, each with a real screenshot. Two columns
   wide, one column narrow; images are fluid (width:100%, height:auto) so nothing
   overflows at 640. Tall captures (a menu, the answer card) get a max width so
   they read as a card, not a tower. */
.wd-hflow{list-style:none;padding:0!important;margin:0;counter-reset:wd-hf;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px!important}
.wd-hflow li{position:relative;min-width:0;display:flex;flex-direction:column;gap:5px;padding:16px 16px 14px;border:1px solid var(--line);border-radius:14px;background:var(--panel);line-height:1.55}
.wd-hflow li>b{display:block;padding-left:38px;color:var(--tx);font-size:15px;font-weight:700;line-height:28px;min-height:28px}
.wd-hflow li>b:before{counter-increment:wd-hf;content:counter(wd-hf);position:absolute;left:16px;top:16px;width:28px;height:28px;border-radius:50%;background:var(--em-fill-2);color:var(--em);border:1px solid var(--em-line);display:inline-flex;align-items:center;justify-content:center;font-size:13px;font-weight:700}
.wd-hflow li>span{color:var(--mut);font-size:14px}
.wd-hflow li>span b{color:var(--tx)}
.wd-hflow li img{display:block;width:100%;height:auto;margin-top:10px;border:1px solid var(--line);border-radius:10px;box-shadow:var(--card-shadow)}
.wd-hflow li img.tall{max-width:300px}
.wd-hflow li img.mid{max-width:460px}
@media(max-width:900px){.wd-hflow{grid-template-columns:1fr}}

@media(max-width:900px){
 .wd-rail{width:64px;flex-basis:64px;padding:14px 10px}
 .wd-rail .wd-brand{padding:6px 0 14px;justify-content:center}
 .wd-rail .wd-brand .bt,.wd-rail .wd-nav-t,.wd-rail .wd-sect{display:none}
 .wd-rail .wd-sect-rule{display:block}
 .wd-rail .wd-nav{justify-content:center;padding:9px 0}
 .wd-apps-grid{grid-template-columns:1fr}
 .wd-help{grid-template-columns:1fr}
 /* Narrow: the section list becomes ONE horizontally scrollable row of chips
    (never a multi-row wrap, per the design-time quality gate). Each chip is
    nowrap + flex-shrink:0; the row scrolls, the page never gets a sideways bar. */
 .wd-help-nav{position:static;flex-direction:row;flex-wrap:nowrap;align-items:center;gap:6px;margin:0 0 10px;max-width:100%;overflow-x:auto;overflow-y:hidden;overscroll-behavior-x:contain;-webkit-overflow-scrolling:touch;scrollbar-width:thin;padding-bottom:6px;scroll-snap-type:x proximity}
 .wd-help-nav .wd-help-navlabel{flex:0 0 auto;margin:0 4px 0 0}
 .wd-help-nav button{flex:0 0 auto;white-space:nowrap;scroll-snap-align:start}
 .wd-help-nav button.on{box-shadow:inset 0 -2px 0 var(--em)}
 .wd-help-nav .wd-help-start{margin-top:0}
 /* While more chips sit past the right edge (data-more, set by Help.jsx), the
    row fades out there so the cut chip reads as "scroll for more", not clipped. */
 .wd-help-nav[data-more="1"]{-webkit-mask-image:linear-gradient(to right,#000 calc(100% - 40px),transparent);mask-image:linear-gradient(to right,#000 calc(100% - 40px),transparent)}
}
/* Top bar collapse, widest first. Labels never wrap; they drop to icons. */
@media(max-width:1100px){
 .wd-addtime,.wd-signout{width:32px;padding:0}
 .wd-addtime span,.wd-signout span{display:none}
 .wd-buyhrs .full{display:none}
 .wd-buyhrs .short{display:inline}
}
@media(max-width:860px){
 .wd-upgrade{width:32px;padding:0}
 .wd-upgrade span{display:none}
 .wd-buyhrs .wd-mins-l{display:none}
 /* The plan pill's own collapse rules live in planPill.css.js (one owner). */
}
@media(max-width:760px){.wd-start{padding:18px 16px 16px}}
@media(max-width:640px){
 .wd-main{padding:var(--sp-5) var(--sp-4) var(--sp-8)}
 .wd-hello h1{font-size:var(--fs-2xl)}
 /* z-index 32 > the rail's 31: at this width the plan pill's popover pins to the
    viewport gutters (planPill.css.js) and must paint over the rail, and the top
    bar is the stacking context it lives in. Wider up, the two never overlap. */
 .wd-top{padding:0 14px;gap:8px;z-index:32}
 /* The section title gives up its space so the plan pill + controls never
    collide or clip at narrow widths; the rail still names the section. */
 .wd-top h2{display:none}
 .wd-top-right{gap:6px}
 .wd-mins{padding:0 10px;font-size:12.5px}
 .wd-mins .wd-mins-l{display:none}
 .wd-stats{grid-template-columns:1fr}
 .wd-buddy .wd-card-end{margin-left:0;width:100%}
}
@media(max-width:480px){
 .wd-mins{padding:0 9px}
 .wd-mins.skel{min-width:64px}
 .wd-avatar{display:none}
 .wd-buyhrs:not(.wd-retry){width:32px;padding:0}
 /* Phone width: the desktop-app link steps aside so sign out never clips. */
 .wd-getapp,.wd-addtime{display:none}
 /* List rows wrap their title and meta instead of clipping them. */
 .wd-sess-title,.wd-sess-meta{white-space:normal;overflow-wrap:anywhere}
 .wd-buyhrs:not(.wd-retry) span{display:none}
 .wd-resume span{display:none}
}
@media(prefers-reduced-motion:reduce){
 .wd *{animation-duration:.001ms!important;transition-duration:.001ms!important}
}
/* Scope wizard */
/* Flat card shadow on the coach + wizard cards (white-only palette). */
.wd-coach-kind,.wd-wiz-depth-card,.wd-coach-sample{box-shadow:var(--card-shadow)}
.wd-coach-opt.on{box-shadow:none}
@media(max-width:760px){.wd-start{padding:20px 18px 20px}}
@media(prefers-reduced-motion:reduce){.wd-card{transition:none}}

.wd-wiz{position:fixed;inset:0;z-index:80;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(27,32,51,.30);backdrop-filter:blur(4px);animation:wd-wiz-fade .18s ease}
@keyframes wd-wiz-fade{from{opacity:0}to{opacity:1}}
/* STABLE wizard card (no CLS): a flex column with a pinned top and a pinned
   footer; only .wd-wiz-body scrolls. White dashboard spec: flat soft shadow on
   a #fff face, 1px hairline border, no inner highlight. */
.wd-wiz-card{width:min(560px,calc(100vw - 32px));max-height:min(80vh,680px);display:flex;flex-direction:column;overflow:hidden;background:var(--panel);border:1px solid var(--line);border-radius:20px;padding:0;box-shadow:var(--shadow);animation:wd-wiz-pop .22s cubic-bezier(.2,.8,.2,1)}
@keyframes wd-wiz-pop{from{opacity:0;transform:translateY(14px) scale(.97)}to{opacity:1;transform:none}}
.wd-wiz-top{display:flex;align-items:center;justify-content:space-between;padding:22px 26px 0;margin-bottom:12px}
.wd-wiz-eyebrow{display:inline-flex;align-items:center;gap:7px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--em-2)}
.wd-wiz-x{background:none;border:none;color:var(--mut);font-size:24px;line-height:1;cursor:pointer;padding:0 4px}
.wd-wiz-x:hover{color:var(--tx)}
.wd-wiz-prog{display:flex;gap:6px;margin:0 26px 18px}
.wd-wiz-prog span{height:5px;flex:1;border-radius:999px;background:var(--track);transition:background .25s}
.wd-wiz-prog span.on{background:linear-gradient(90deg,var(--em),var(--em-2))}
.wd-wiz-q{font-family:"Bricolage Grotesque",sans-serif;font-weight:700;font-size:21px;line-height:1.3;color:var(--tx);margin-bottom:8px}
.wd-wiz-help{display:flex;align-items:flex-start;gap:7px;font-size:13px;line-height:1.5;color:var(--mut);margin-bottom:16px}
.wd-wiz-help svg{flex-shrink:0;margin-top:2px;color:var(--em-2)}
.wd-wiz-choice.has-hint{display:flex;flex-direction:column;gap:3px}
.wd-wiz-choice-l{font-weight:600}
.wd-wiz-choice-h{font-size:12.5px;font-weight:400;line-height:1.45;color:var(--mut)}
.wd-wiz-gate{display:flex;align-items:center;gap:12px;justify-content:space-between;flex-wrap:wrap;background:var(--warm-fill);border:1px solid var(--warm-line);border-radius:12px;padding:10px 13px;margin-bottom:16px;font-size:12.5px;color:var(--warm)}
.wd-wiz-gate span{display:inline-flex;align-items:center;gap:7px}
.wd-wiz-choices{display:flex;flex-direction:column;gap:10px}
.wd-wiz-choice{text-align:left;background:var(--card-a);border:1px solid var(--line-2);border-radius:13px;padding:14px 16px;color:var(--tx);font:inherit;font-size:15px;font-weight:500;cursor:pointer;transition:border-color .15s,background .15s}
.wd-wiz-choice:hover{border-color:var(--em-2);background:var(--em-fill)}
.wd-wiz-text{display:flex;flex-direction:column;gap:12px}
.wd-wiz-text textarea{resize:none;background:var(--field);border:1px solid var(--line-2);border-radius:13px;padding:13px 15px;color:var(--tx);font:inherit;font-size:15px;line-height:1.5;outline:none}
.wd-wiz-text textarea:focus{border-color:var(--em-2)}
.wd-wiz-text .btn{align-self:flex-end}
.wd-wiz-foot{display:flex;align-items:center;flex-wrap:wrap;gap:10px 18px;margin:0;padding:14px 26px 18px;border-top:1px solid var(--line);background:var(--panel)}
.wd-wiz-link{background:none;border:none;color:var(--mut);font:inherit;font-size:13.5px;cursor:pointer;display:inline-flex;align-items:center;gap:5px;padding:0}
.wd-wiz-link:hover{color:var(--tx)}
.wd-wiz-link.strong{margin-left:auto;color:var(--em-2);font-weight:600}

/* ---- Scoping wizard body + reveal: the body has a floor height so a 2-option
   and a 5-option question do not resize the panel; questions and options enter
   with a quiet staggered reveal (reduced-motion safe). */
.wd-wiz-body{flex:1 1 auto;overflow:auto;padding:0 26px 8px;min-height:min(320px,44vh)}
.wd-wiz-reveal{animation:wd-wiz-reveal .34s cubic-bezier(.2,.8,.2,1) both;animation-delay:var(--d,0ms)}
@keyframes wd-wiz-reveal{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:none}}
/* First step: Quick vs Detailed interview. Two equal cards, one accent. */
.wd-wiz-depth{display:grid;grid-template-columns:1fr 1fr;gap:12px}
@media(max-width:520px){.wd-wiz-depth{grid-template-columns:1fr}}
.wd-wiz-depth-card{position:relative;text-align:left;display:flex;flex-direction:column;gap:8px;background:var(--card-a);border:1px solid var(--line-2);border-radius:16px;padding:18px 18px 16px;color:var(--tx);font:inherit;cursor:pointer;overflow:hidden;box-shadow:inset 0 1px 0 rgba(255,255,255,.04),var(--card-shadow);transition:border-color .16s,background .16s,transform .12s,box-shadow .16s}
.wd-wiz-depth-card::before{content:'';position:absolute;left:0;top:0;bottom:0;width:4px;background:linear-gradient(180deg,var(--em),var(--em-2));opacity:0;transition:opacity .16s}
.wd-wiz-depth-card:hover{border-color:var(--em-2);background:var(--em-fill);transform:translateY(-1px);box-shadow:var(--card-shadow-hover)}
.wd-wiz-depth-card:hover::before{opacity:1}
.wd-wiz-depth-ic{width:36px;height:36px;border-radius:11px;display:grid;place-items:center;background:var(--em-fill-2);color:var(--em)}
.wd-wiz-depth-t{font-family:"Bricolage Grotesque",sans-serif;font-weight:700;font-size:17px;letter-spacing:-.01em}
.wd-wiz-depth-d{font-size:13px;line-height:1.5;color:var(--mut)}
.wd-wiz-depth-m{display:inline-flex;align-items:center;gap:6px;margin-top:2px;font-size:11.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--em-2)}
/* Option tags ("Optional") + the Other... affordance that reveals a text field. */
.wd-wiz-tag{display:inline-flex;align-items:center;gap:5px;height:22px;padding:0 9px;border-radius:999px;font-size:10.5px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--em-2);background:var(--info-fill);border:1px solid var(--info-line);margin-left:10px;vertical-align:middle}
.wd-wiz-choice.other{border-style:dashed;color:var(--mut);display:flex;align-items:center;gap:8px}
.wd-wiz-choice.other:hover{color:var(--tx)}
.wd-wiz-other{display:flex;flex-direction:column;gap:10px;margin-top:4px}
.wd-wiz-other textarea{resize:none;background:var(--field);border:1px solid var(--em-2);border-radius:13px;padding:12px 14px;color:var(--tx);font:inherit;font-size:15px;line-height:1.5;outline:none;box-shadow:0 0 0 3px var(--em-fill)}
.wd-wiz-other-row{display:flex;gap:8px;justify-content:flex-end}
.wd-wiz-text .btn,.wd-wiz-other-row .btn{display:inline-flex;align-items:center;gap:6px}
/* Scoping progress (the "csv/js box"): a clean WHITE code card with window
   dots, a monospaced stage log that reveals line by line with check marks, a
   live caret on the running stage, and a thin progress fill. White dashboard
   spec - #f6f8fd face, hairline border, green accents (no dark panel). */
.wd-term{border-radius:14px;overflow:hidden;border:1px solid var(--line);background:var(--panel-3);box-shadow:var(--card-shadow);margin:6px 0 4px}
.wd-term-bar{display:flex;align-items:center;gap:8px;padding:9px 12px;background:var(--card-a);border-bottom:1px solid var(--line)}
.wd-term-dots{display:inline-flex;gap:5px;flex-shrink:0}
.wd-term-dots i{width:9px;height:9px;border-radius:50%;display:inline-block}
.wd-term-title{flex:1;min-width:0;font-family:"JetBrains Mono",ui-monospace,Menlo,Consolas,monospace;font-size:10.5px;letter-spacing:.08em;font-weight:700;color:var(--mut);text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wd-term-pct{font-family:"JetBrains Mono",ui-monospace,monospace;font-size:11px;font-weight:700;color:var(--em-deep);font-variant-numeric:tabular-nums;flex-shrink:0;white-space:nowrap}
.wd-term-body{padding:14px 14px 12px;font-family:"JetBrains Mono",ui-monospace,Menlo,Consolas,monospace;font-size:12.5px;line-height:1.7;color:var(--tx-2);min-height:138px}
.wd-term-line{display:flex;align-items:center;gap:9px;animation:wd-wiz-reveal .3s ease both;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wd-term-line .p{color:var(--em);flex:0 0 auto}
.wd-term-line.past{color:var(--mut)}
.wd-term-line.past .ok{color:var(--em);flex:0 0 auto}
.wd-term-line.on{color:var(--tx)}
.wd-term-caret{display:inline-block;width:8px;height:14px;background:var(--em);margin-left:2px;vertical-align:-2px;animation:wd-term-blink 1s steps(1) infinite}
@keyframes wd-term-blink{50%{opacity:0}}
.wd-term-track{height:3px;background:var(--track)}
.wd-term-fill{height:100%;background:linear-gradient(90deg,var(--em),var(--em-2));transition:width .6s cubic-bezier(.4,0,.2,1)}
.wd-term-foot{display:flex;align-items:center;gap:8px;margin-top:12px;font-size:12.5px;color:var(--mut)}
/* ---- Pre-task readiness coach (inside .wd-start, before the goal box) ----
   Same system as the wizard: a pinned eyebrow + quiet Skip, a 3-dot progress,
   a body with a floor height (no CLS between stages), staggered .wd-wiz-reveal
   entry. Kind cards -> readiness pill rows -> coach panel (warnings by level,
   the tips checklist, the sample card with its orange CTA). */
/* The LIVE pre-task interview is an elevated, softly glowing panel so the
   step the user is on clearly stands out and feels interactive (owner:
   "show the pretask box highlighted, glow, shadowed ... INTERACTIVE"). Only
   the live coach gets this; the finished state (.wd-coach-done) stays plain. */
.wd-coach{position:relative;display:flex;flex-direction:column;gap:12px;padding:18px;border-radius:16px;
  border:1px solid var(--em-line);
  background:linear-gradient(180deg,color-mix(in srgb,var(--em-fill) 62%,#fff) 0%,var(--panel) 46%);
  box-shadow:0 1px 2px rgba(20,24,44,.05),0 22px 46px -28px rgba(14,159,110,.42);
  animation:wd-coach-in .42s cubic-bezier(.2,.8,.2,1) both}
.wd-coach::after{content:'';position:absolute;inset:0;border-radius:16px;pointer-events:none;z-index:0;
  animation:wd-coach-halo 3.8s ease-in-out infinite}
.wd-coach > *{position:relative;z-index:1}
@keyframes wd-coach-in{from{opacity:0;transform:translateY(8px) scale(.992)}to{opacity:1;transform:none}}
@keyframes wd-coach-halo{
  0%,100%{box-shadow:0 0 0 1px color-mix(in srgb,var(--em) 13%,transparent),0 0 0 0 transparent}
  50%{box-shadow:0 0 0 1px color-mix(in srgb,var(--em) 26%,transparent),0 0 26px 2px color-mix(in srgb,var(--em) 13%,transparent)}}
.wd-coach-top{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.wd-coach-eyebrow{display:inline-flex;align-items:center;gap:7px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--em-2)}
.wd-coach-skip{background:none;border:none;color:var(--mut);font:inherit;font-size:13px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:5px;padding:4px 2px;border-radius:8px;transition:color .15s}
.wd-coach-skip:hover{color:var(--tx)}
.wd-coach-prog{display:flex;gap:6px}
.wd-coach-prog span{height:4px;flex:1;max-width:72px;border-radius:999px;background:var(--track);transition:background .25s}
.wd-coach-prog span{overflow:hidden}
.wd-coach-prog span.on{background:linear-gradient(90deg,var(--em),var(--em-2) 60%,var(--em));background-size:200% 100%;animation:wd-coach-prog 2.4s linear infinite}
@keyframes wd-coach-prog{0%{background-position:160% 0}100%{background-position:-60% 0}}
.wd-coach-body{display:flex;flex-direction:column;gap:12px;min-height:280px}
.wd-coach-q{font-family:var(--wd-display);font-weight:700;font-size:20px;line-height:1.3;color:var(--tx)}
.wd-coach-sub{font-size:13.5px;line-height:1.5;color:var(--mut);margin-top:-6px}
.wd-coach-kinds{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:4px}
@media(max-width:760px){.wd-coach-kinds{grid-template-columns:1fr 1fr}}
@media(max-width:480px){.wd-coach-kinds{grid-template-columns:1fr}}
.wd-coach-kind{position:relative;text-align:left;display:flex;flex-direction:column;gap:6px;background:var(--card-a);border:1px solid var(--line-2);border-radius:14px;padding:14px 14px 13px;color:var(--tx);font:inherit;cursor:pointer;overflow:hidden;box-shadow:inset 0 1px 0 rgba(255,255,255,.04),var(--card-shadow);transition:border-color .16s,background .16s,transform .12s,box-shadow .16s}
.wd-coach-kind::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:linear-gradient(180deg,var(--em),var(--em-2));opacity:0;transition:opacity .16s}
.wd-coach-kind:hover,.wd-coach-kind.on{border-color:var(--em-2);background:var(--em-fill);transform:translateY(-1px);box-shadow:var(--card-shadow-hover)}
.wd-coach-kind:hover::before,.wd-coach-kind.on::before{opacity:1}
.wd-coach-kind-ic{width:32px;height:32px;border-radius:10px;display:grid;place-items:center;background:var(--em-fill-2);color:var(--em)}
.wd-coach-kind-l{font-weight:650;font-size:14.5px;line-height:1.3}
.wd-coach-kind-b{font-size:12.5px;line-height:1.45;color:var(--mut)}
.wd-coach-kind-check{position:absolute;top:10px;right:10px;width:20px;height:20px;border-radius:50%;background:var(--em);color:#fff;display:grid;place-items:center;box-shadow:0 2px 8px -2px var(--em);animation:wd-coach-pop .24s cubic-bezier(.2,.9,.3,1.5) both}
@keyframes wd-coach-pop{from{opacity:0;transform:scale(.4)}to{opacity:1;transform:none}}
/* Auto-advance confirmation on a choice-only step (the "flow forward" beat). */
.wd-coach-adv{display:inline-flex;align-items:center;gap:8px;font-size:13.5px;font-weight:600;color:var(--em-deep);white-space:nowrap}
.wd-coach-adv svg{color:var(--em)}
.wd-coach-adv .bar{position:relative;width:48px;height:4px;border-radius:999px;background:var(--em-fill-2);overflow:hidden}
.wd-coach-adv .bar i{position:absolute;inset:0;transform-origin:left;background:linear-gradient(90deg,var(--em),var(--em-2));animation:wd-coach-fill .64s linear forwards}
@keyframes wd-coach-fill{from{transform:scaleX(0)}to{transform:scaleX(1)}}
.wd-coach-foothint{font-size:12.5px;color:var(--mut);line-height:1.4}
.wd-coach-qs{display:flex;flex-direction:column;gap:12px}
.wd-coach-row{display:flex;flex-direction:column;gap:8px;padding:12px 14px;border-radius:13px;background:var(--card-a);border:1px solid var(--line)}
.wd-coach-row-q{font-size:14px;font-weight:600;line-height:1.4;color:var(--tx)}
.wd-coach-opts{display:flex;flex-wrap:wrap;gap:7px}
.wd-coach-opt{display:inline-flex;align-items:center;gap:7px;height:32px;padding:0 12px;border-radius:999px;border:1px solid var(--line-2);background:var(--chip);color:var(--tx);font:inherit;font-size:13px;font-weight:600;cursor:pointer;transition:border-color .15s,background .15s,color .15s}
.wd-coach-opt:hover{border-color:var(--em-2)}
.wd-coach-opt.on{border-color:var(--em);background:var(--em-fill-2);color:var(--tx);box-shadow:0 0 14px -6px var(--em)}
.wd-coach-opt.flag.on{border-color:var(--warm-line);background:var(--warm-fill);color:var(--warm)}
.wd-coach-gate{display:inline-flex;align-items:center;gap:3px;font-size:10px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--warm);background:var(--warm-fill);border:1px solid var(--warm-line);border-radius:999px;padding:1px 6px}
.wd-coach-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:auto;padding-top:6px}
.wd-coach-foot .wd-cta{display:inline-flex;align-items:center;gap:7px}
.wd-coach-warns{display:flex;flex-direction:column;gap:8px}
.wd-coach-warn{display:flex;gap:10px;align-items:flex-start;padding:11px 13px 11px 15px;border-radius:12px;font-size:13.5px;line-height:1.5;color:var(--tx);border:1px solid var(--line);background:var(--card-a);position:relative;overflow:hidden}
.wd-coach-warn::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--line-2)}
.wd-coach-warn svg{flex-shrink:0;margin-top:2px;color:var(--mut)}
.wd-coach-warn.warn{background:var(--warm-fill);border-color:var(--warm-line)}
.wd-coach-warn.warn::before{background:var(--warm)}
.wd-coach-warn.warn svg{color:var(--warm)}
.wd-coach-warn.ready{background:var(--em-fill);border-color:var(--em-line)}
.wd-coach-warn.ready::before{background:var(--em)}
.wd-coach-warn.ready svg{color:var(--em)}
.wd-coach-warn.info::before{background:var(--em-2)}
.wd-coach-warn.info svg{color:var(--em-2)}
.wd-coach-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.15fr);gap:12px}
@media(max-width:760px){.wd-coach-grid{grid-template-columns:1fr}}
.wd-coach-k{display:inline-flex;align-items:center;gap:6px;font-size:10.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--em-2);margin-bottom:8px}
.wd-coach-tips{padding:14px 15px;border-radius:14px;background:var(--card-a);border:1px solid var(--line)}
.wd-coach-tips ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
.wd-coach-tips li{display:flex;gap:8px;align-items:flex-start;font-size:13px;line-height:1.45;color:var(--tx)}
.wd-coach-tips li svg{flex-shrink:0;margin-top:3px;color:var(--em)}
.wd-coach-sample{position:relative;padding:14px 15px 13px 18px;border-radius:14px;background:var(--panel-3);border:1px solid var(--em-line);overflow:hidden;display:flex;flex-direction:column;box-shadow:inset 0 1px 0 rgba(255,255,255,.04),var(--card-shadow)}
.wd-coach-sample::before{content:'';position:absolute;left:0;top:0;bottom:0;width:4px;background:linear-gradient(180deg,var(--em),var(--em-2))}
.wd-coach-sample-t{margin:0 0 12px;font-size:14px;line-height:1.55;color:var(--tx);font-style:italic}
.wd-coach-sample-row{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-top:auto}
.wd-coach-sample-row .wd-cta{display:inline-flex;align-items:center;gap:7px}
.wd-coach-done{display:flex;flex-direction:column}
.wd-coach-reopen{align-self:flex-start;margin-top:12px;background:none;border:none;color:var(--mut);font:inherit;font-size:12.5px;cursor:pointer;display:inline-flex;align-items:center;gap:5px;padding:0;transition:color .15s}
.wd-coach-reopen:hover{color:var(--em-2)}
/* Context interview: reveal fields (step 1), the hero task box (step 3), the
   docs choice row (step 2). White-only, same hairline + green accent system. */
.wd-coach-fields{display:flex;flex-direction:column;gap:12px;margin-top:4px}
.wd-coach-two{display:grid;grid-template-columns:1fr 1fr;gap:10px}
@media(max-width:560px){.wd-coach-two{grid-template-columns:1fr}}
.wd-coach-field{display:flex;flex-direction:column;gap:6px;min-width:0}
.wd-coach-field label{font-size:12.5px;font-weight:600;color:var(--mut-2);letter-spacing:.01em}
.wd-coach-input{width:100%;background:var(--field);border:1px solid var(--line);border-radius:11px;padding:10px 13px;color:var(--tx);font:inherit;font-size:14.5px;outline:none;transition:border-color .15s,box-shadow .15s,background .15s}
.wd-coach-input::placeholder{color:var(--mut)}
.wd-coach-input:hover{border-color:var(--line-2)}
.wd-coach-input:focus{border-color:var(--em);box-shadow:0 0 0 3px var(--em-fill);background:var(--panel)}
.wd-coach-note{display:flex;align-items:flex-start;gap:7px;font-size:12px;line-height:1.5;color:var(--mut)}
.wd-coach-note svg{flex-shrink:0;margin-top:2px;color:var(--em-2)}
.wd-coach-hero{position:relative;padding:18px 18px 16px;border-radius:16px;border:1px solid var(--em-line);background:linear-gradient(180deg,var(--em-fill),var(--panel));box-shadow:var(--card-shadow)}
.wd-coach-hero-k{display:inline-flex;align-items:center;gap:6px;font-size:10.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--em-2);margin-bottom:12px}
.wd-coach-docswrap{margin-top:2px}
.wd-coach-done .wd-coach-docswrap{margin-top:14px}
.wd-coach-choices{display:flex;gap:10px;flex-wrap:wrap}
.wd-coach-choice{display:inline-flex;align-items:center;gap:8px;flex-shrink:0;white-space:nowrap;padding:11px 15px;border-radius:12px;border:1px solid var(--line-2);background:var(--card-a);color:var(--tx);font:inherit;font-size:14px;font-weight:600;cursor:pointer;transition:border-color .15s,background .15s,color .15s}
.wd-coach-choice:hover{border-color:var(--em-2);background:var(--em-fill)}
.wd-coach-choice.primary{border-color:var(--em);background:var(--em-fill-2);color:var(--em-deep)}
.wd-coach-choice.primary:hover{background:var(--em-fill)}
.wd-coach-choice svg{flex-shrink:0}

/* The top-bar plan pill, its popover, the hours ring and the task pips are
   styled in planPill.css.js (injected by PlanPill.jsx, their single owner). */

/* Impersonation banner: a slim, persistent, warm/neutral strip at the very top
   of /work when a superadmin is viewing as this user. nowrap, never overflows.
   It renders OUTSIDE .wd (a sibling ABOVE it in the DOM), so the white-palette
   custom properties scoped to .wd do NOT cascade down to it - carry the few
   tokens it needs on the banner itself so it is always styled wherever it
   mounts (the bug it fixes: with the vars missing, background/border collapse
   and the text/Stop button fall back to unstyled black on transparent). */
.wd-imp{--warm:#c85a16;--warm-fill:rgba(200,90,22,.07);--warm-line:rgba(200,90,22,.28);--panel:#ffffff;display:flex;align-items:center;gap:10px;flex-wrap:nowrap;min-width:0;padding:8px 16px;background:var(--warm-fill);border-bottom:1px solid var(--warm-line);color:var(--warm);font-family:"Figtree",-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,Roboto,sans-serif;font-size:13px;line-height:1.35;box-sizing:border-box}
.wd-imp svg{flex-shrink:0;color:var(--warm)}
.wd-imp-t{min-width:0;flex:1 1 auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wd-imp-t b{font-weight:700}
.wd-imp-stop{flex-shrink:0;white-space:nowrap;display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 13px;border-radius:999px;border:1px solid var(--warm-line);background:var(--panel);color:var(--warm);font:inherit;font-size:12.5px;font-weight:600;cursor:pointer;transition:background .15s,border-color .15s}
.wd-imp-stop:hover{background:var(--warm-fill)}
.wd-imp-stop:disabled{opacity:.6;cursor:default}
/* White-dashboard gate: every pill, stepper segment, nav link, eyebrow and CTA
   in the interview flows stays on one line and is never shrunk/clipped. Whole
   items may wrap to the next row (their flex containers wrap), but an item's
   own text never wraps or truncates. Multi-line CARDS (choices/kinds/depth) are
   deliberately excluded so their captions keep flowing. */
.wd-wiz-eyebrow,.wd-wiz-link,.wd-wiz-tag,.wd-wiz-depth-m,.wd-coach-eyebrow,.wd-coach-skip,.wd-coach-opt,.wd-coach-gate,.wd-coach-k,.wd-coach-reopen,.wd-cta{white-space:nowrap;flex-shrink:0}
.wd-wiz-prog span,.wd-coach-prog span{flex-shrink:0}
/* Quiet "View all / Session logs" link in the Resume section header + footer. */
.wd-sess-all{margin-left:auto;display:inline-flex;align-items:center;gap:6px;flex-shrink:0;white-space:nowrap;color:var(--em-deep);font-size:13px;font-weight:600;text-decoration:none;padding:6px 10px;border-radius:var(--r-pill);transition:background .15s}
.wd-sess-all:hover{background:var(--em-fill)}
.wd-sess-all svg{flex-shrink:0}
.wd-sess-more{display:inline-flex;align-items:center;justify-content:center;gap:7px;flex-shrink:0;white-space:nowrap;align-self:flex-start;margin-top:2px;color:var(--em-deep);font-size:13px;font-weight:600;text-decoration:none;padding:6px 2px}
.wd-sess-more:hover{color:var(--em)}
@media(prefers-reduced-motion:reduce){.wd-wiz-reveal,.wd-term-line{animation:none}.wd-term-caret{animation:none}.wd-term-fill{transition:none}.wd-coach-kind,.wd-coach-opt{transition:none}.wd-coach,.wd-coach::after,.wd-coach-kind-check,.wd-coach-prog span.on,.wd-coach-adv .bar i{animation:none}}
`
