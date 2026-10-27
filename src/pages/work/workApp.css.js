// The white dashboard shell + card styles (WD_CSS), moved verbatim from
// WorkPage.jsx. Injected once by WorkAppLayout so every .wd-* page shares it.
export const WD_CSS = `
.wd{
  /* White-only palette (the approved dashboard spec): page #f5f7fb, cards
     #fff, hairlines #e7eaf2, ink #1b2033, muted #5c6484, green #0e9f6e,
     blue #0a84c2. The product dashboard is white regardless of the app's
     theme toggle, so there is deliberately no [data-theme] override here. */
  --ink:#f5f7fb;--ink-soft:#ffffff;
  --panel:#ffffff;--panel-2:#ffffff;--panel-3:#f6f8fd;
  --line:#e7eaf2;--line-2:#d5d9e6;--line-soft:#eef1f7;
  --tx:#1b2033;--tx-2:#2b3250;--mut:#5c6484;--mut-2:#434a68;--faint:#8a90a6;
  /* Accent tokens derive from the per-user --accent vars (src/theme/accent.js);
     the literal is this surface's own default. --em-2 (cyan) stays the fixed
     "observation" color so it keeps contrasting whatever accent the user picks. */
  --em:var(--accent,#0e9f6e);--em-2:#0a84c2;--on-em:var(--accent-contrast,#ffffff);--em-deep:var(--accent-dark,#0b7a53);
  --warm:#c85a16;--warm-2:#e4612f;--cta-ink:#ffffff;
  --violet:#7a4ddb;--rose:#d23e6b;
  --em-fill:var(--accent-soft,#eafaf3);--em-fill-2:#d9f3e7;--em-line:var(--accent-line,#bde9d5);
  --warm-fill:rgba(200,90,22,.07);--warm-line:rgba(200,90,22,.28);
  --card-a:#ffffff;--card-b:#fbfcff;
  --chip:#f1f3fa;--chip-line:#e2e6f1;
  --field:#fcfdff;--track:#e7eaf2;
  --shadow:0 22px 48px -30px rgba(30,40,80,.30);--shadow-sm:0 2px 12px rgba(30,40,80,.08);
  --focus:var(--accent,#0e9f6e);--danger:#e23b4e;
  --card-shadow:0 1px 2px rgba(20,24,44,.03);
  --card-shadow-hover:0 1px 2px rgba(20,24,44,.04),0 8px 22px -16px rgba(26,31,54,.18);
  --info:#0a6fb3;--info-fill:#e9f5fc;--info-line:rgba(10,134,194,.26);
  --r:12px;--r-sm:9px;
  position:relative;display:flex;min-height:100vh;background:var(--ink);color:var(--tx);overflow-x:clip;
  --wd-display:"Bricolage Grotesque","Figtree",system-ui,sans-serif;
  font-family:"Figtree",-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,Roboto,sans-serif;font-size:15px;line-height:1.55;-webkit-font-smoothing:antialiased}
/* The one tint with no --accent-* counterpart: derived only once a user accent is
   set (data-accent on :root), so the default stays the designed literal above. */
[data-accent] .wd{--em-fill-2:color-mix(in srgb,var(--accent) 18%,#ffffff)}
.wd *{box-sizing:border-box}
.wd h1,.wd h2,.wd h3{margin:0;color:var(--tx);font-family:var(--wd-display);letter-spacing:-.01em}
.wd p{margin:0}
.wd :focus-visible{outline:2px solid var(--focus);outline-offset:2px;border-radius:10px}
.wd button{cursor:pointer}

/* ---- Shell: left rail + slim top bar ------------------------------------
   The rail is a white column: brand mark + stacked wordmark, then the section
   nav. It collapses to a 64px icon strip (toggle in the top bar; automatic
   under 900px). Every control in the top bar is nowrap + flex-shrink:0 so
   nothing can wrap or clip; the only flexible element is the spacer. */
.wd-rail{width:230px;flex:0 0 230px;position:sticky;top:0;height:100vh;align-self:flex-start;background:var(--panel);border-right:1px solid var(--line);display:flex;flex-direction:column;padding:14px 12px;gap:2px;transition:width .18s ease,flex-basis .18s ease;z-index:31;overflow:hidden}
.wd-rail.collapsed{width:64px;flex-basis:64px;padding:14px 10px}
.wd-brand{display:flex;align-items:center;gap:9px;padding:6px 8px 14px;min-width:0;width:100%;background:none;border:none;font:inherit;text-align:left;color:inherit;cursor:pointer}
.wd-brand .mark{display:inline-flex;align-items:center;justify-content:center;flex:0 0 26px;line-height:0}
.wd-brand .bt{display:flex;flex-direction:column;line-height:1.12;min-width:0;overflow:hidden}
.wd-brand .bt small{font-size:11px;font-weight:600;color:var(--mut);letter-spacing:.01em;white-space:nowrap}
.wd-brand .bt b{font-family:var(--wd-display);font-weight:700;font-size:15px;color:var(--tx);white-space:nowrap}
.wd-rail.collapsed .wd-brand{padding:6px 0 14px;justify-content:center}
.wd-rail.collapsed .wd-brand .bt,.wd-rail.collapsed .wd-nav-t,.wd-rail.collapsed .wd-sect{display:none}
.wd-navs{display:flex;flex-direction:column;gap:2px}
.wd-sect{font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--faint);padding:14px 10px 6px;white-space:nowrap}
.wd-sect-rule{display:none;height:1px;background:var(--line-soft);margin:10px 6px}
.wd-rail.collapsed .wd-sect-rule{display:block}
.wd-nav{display:flex;align-items:center;gap:11px;width:100%;padding:9px 10px;border-radius:var(--r-sm);border:none;background:none;color:var(--tx-2);font:inherit;font-size:14.5px;font-weight:500;cursor:pointer;white-space:nowrap;text-decoration:none;text-align:left;transition:background .15s,color .15s}
.wd-nav:hover{background:var(--line-soft);color:var(--tx)}
.wd-nav.on{background:var(--em-fill);color:var(--em-deep)}
.wd-nav svg{flex:0 0 18px}
.wd-nav .wd-nav-t{overflow:hidden;text-overflow:ellipsis}
.wd-rail.collapsed .wd-nav{justify-content:center;padding:9px 0}
.wd-rail-foot{margin-top:auto;display:flex;flex-direction:column;gap:2px}
.wd-nav.foot{color:var(--mut)}

.wd-main-col{flex:1;min-width:0;display:flex;flex-direction:column}
.wd-top{position:sticky;top:0;z-index:30;height:58px;display:flex;align-items:center;gap:12px;padding:0 24px;border-bottom:1px solid var(--line);background:var(--panel);min-width:0}
.wd-collapse{width:30px;height:30px;border:1px solid var(--line);background:var(--panel);border-radius:8px;display:inline-flex;align-items:center;justify-content:center;color:var(--mut);cursor:pointer;flex-shrink:0;padding:0}
.wd-collapse:hover{background:var(--line-soft);color:var(--tx)}
.wd-top h2{font-size:16px;font-weight:600;white-space:nowrap;flex-shrink:0;letter-spacing:-.005em}
.wd-top-sp{flex:1 1 8px;min-width:8px}
.wd-top-right{display:flex;align-items:center;gap:8px;flex-shrink:0;white-space:nowrap}
/* Shared chrome for the right-cluster controls: one 32px height, pill radius,
   nowrap + flex-shrink:0 on every one of them. */
.wd-getapp,.wd-addtime,.wd-signout,.wd-buyhrs,.wd-upgrade,.wd-mins{display:inline-flex;align-items:center;justify-content:center;gap:6px;flex-shrink:0;white-space:nowrap;height:32px;border-radius:999px;border:1px solid var(--line);background:var(--panel);color:var(--tx-2);font:inherit;font-size:13.5px;font-weight:500;line-height:1;text-decoration:none;cursor:pointer;padding:0 13px;transition:color .15s,border-color .15s,background .15s,filter .15s}
.wd-getapp:hover,.wd-addtime:hover,.wd-signout:hover,.wd-buyhrs:hover{border-color:#d5d9e6;background:var(--line-soft);color:var(--tx)}
.wd-getapp{position:relative;width:32px;padding:0;color:var(--mut)}
/* Icon-only link: the label stays in the DOM for screen readers and the
   title tooltip carries it for everyone else. */
.wd-getapp span{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.wd-mins{color:var(--em-deep);border-color:var(--em-line);background:var(--em-fill);font-weight:600;cursor:default}
.wd-mins svg{flex-shrink:0}
.wd-mins.low{color:var(--warm);border-color:var(--warm-line);background:var(--warm-fill)}
.wd-mins.skel{color:transparent;min-width:104px;border-color:transparent;background:var(--track)}
.wd-upgrade{color:#fff;background:var(--em);border-color:var(--em);font-weight:600}
.wd-upgrade:hover{filter:brightness(1.05)}
.wd-addtime{font-weight:600}
.wd-signout{color:var(--mut)}
.wd-avatar{width:32px;height:32px;border-radius:50%;background:var(--line);display:inline-flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;color:var(--tx-2);flex-shrink:0;text-transform:uppercase}

.wd-main{position:relative;z-index:2;width:100%;max-width:960px;margin:0 auto;padding:30px 26px 48px;min-width:0}
.wd-main.wide{max-width:1120px}
#wd-start-card,#wd-sessions,#wd-skills{scroll-margin-top:74px}

/* ---- Company co-branding strip (white-label) ---------------------------
   Sits above the greeting for company users only. Reads as
   "{Company}, powered by WorkCoPilot": the company owns the left (logo tile,
   name, contact line), a hairline rule separates it from the WorkCoPilot
   mark on the right. One flat panel, 1px line, same card recipe as the rest
   of the home view; no gradients, no second accent. */
.wd-cobrand{display:flex;align-items:center;gap:16px;min-width:0;margin-bottom:22px;padding:10px 14px 10px 12px;background:var(--panel);border:1px solid var(--line);border-radius:var(--r);box-shadow:var(--card-shadow)}
.wd-cobrand-logo{display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;height:44px;min-width:44px;max-width:168px;padding:0 6px;border-radius:11px;background:var(--card-a);border:1px solid var(--line);overflow:hidden}
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
.wd-hello h1{font-family:var(--wd-display);font-weight:700;font-size:22px;line-height:1.25;letter-spacing:-.01em}
.wd-plan{display:flex;align-items:center;gap:8px;margin-top:3px;color:var(--mut);font-size:14px}
.wd-plan-dot{width:7px;height:7px;border-radius:50%;background:var(--em);flex-shrink:0}
.wd-plan-skel{height:14px;width:260px;max-width:70%;border-radius:7px;margin-top:8px;background:var(--track)}
@keyframes wd-rise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}

/* ---- Cards: one quiet recipe for every block on the home view ----------
   White (or panel) face, 1px line, soft lift, an icon tile + title + muted
   caption in the head. Matches the admin console so the two feel like one
   product. */
.wd-card{background:var(--panel);border:1px solid var(--line);border-radius:var(--r);box-shadow:var(--card-shadow);transition:border-color .18s,box-shadow .18s}
.wd-card:hover{border-color:var(--line-2)}
.wd-card-head{display:flex;align-items:flex-start;gap:12px}
.wd-card-t{display:block;font-size:14.5px;font-weight:700;color:var(--tx);line-height:1.3}
.wd-card-c{display:block;font-size:12.5px;color:var(--mut);margin-top:2px;line-height:1.45}
.wd-ic{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:10px;background:var(--em-fill);color:var(--em);flex-shrink:0;border:1px solid var(--em-line)}
.wd-ic.alt{color:var(--em-2);background:color-mix(in srgb,var(--em-2) 10%,transparent);border-color:color-mix(in srgb,var(--em-2) 28%,transparent)}
.wd-ic.warm{color:var(--warm);background:var(--warm-fill);border-color:var(--warm-line)}
.wd-link{color:var(--em-2);font-weight:600;text-decoration:underline;text-underline-offset:3px;text-decoration-color:color-mix(in srgb,var(--em-2) 40%,transparent)}
.wd-link:hover{text-decoration-color:var(--em-2)}

/* Quiet secondary rows: Buddy + Data protection + Skills share ONE white card
   separated by hairlines. Each is a compact row; the expandable ones open in
   place (Data protection -> ScrubRules, Skills -> SkillsCard body). */
.wd-more{margin-top:16px;background:var(--panel);border:1px solid var(--line);border-radius:var(--r);box-shadow:var(--card-shadow);overflow:hidden}
.wd-more > * + *{border-top:1px solid var(--line-soft)}
.wd-more .wd-card{border:none;border-radius:0;box-shadow:none;background:transparent}
.wd-more .wd-card:hover{border-color:transparent}
.wd-more .wd-ic{width:30px;height:30px;border-radius:8px}
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
.wd-buddy{display:flex;align-items:center;gap:12px;padding:10px 14px;min-width:0;flex-wrap:wrap}
.wd-buddy .wd-card-t,.wd-dp .wd-card-t{font-size:14px}
.wd-buddy .wd-card-body{min-width:0;flex:1 1 200px}
.wd-buddy .wd-card-end{margin-left:auto;flex-shrink:0}
.wd-dp{overflow:hidden;align-self:start}
.wd-dp-btn{width:100%;display:flex;align-items:center;gap:12px;padding:10px 14px;background:transparent;border:none;cursor:pointer;color:var(--tx);text-align:left;font:inherit;transition:background .15s;border-radius:0}
.wd-dp-btn:hover{background:var(--line-soft)}
.wd-dp-btn .wd-card-body{min-width:0;flex:1}
.wd-dp-btn .wd-card-c{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wd-dp-chev{margin-left:auto;color:var(--mut);flex-shrink:0;transition:transform .18s}
.wd-dp-chev.open{transform:rotate(90deg)}
.wd-dp-body{padding:0 14px 14px;border-top:1px solid var(--line-soft);padding-top:12px;font-size:13.5px;color:var(--mut);line-height:1.55}

/* Notes: info (admin access) and warning (gate message) */
.wd-note{display:flex;gap:11px;align-items:flex-start;margin:0 0 14px;padding:12px 15px;border-radius:12px;font-size:13.5px;line-height:1.5;border:1px solid var(--info-line);background:var(--info-fill);color:var(--tx)}
.wd-note svg{flex-shrink:0;margin-top:2px;color:var(--info)}
.wd-note a{color:var(--info);font-weight:600;text-decoration:underline;text-underline-offset:3px}
.wd-note.warn{border-color:var(--warm-line);background:var(--warm-fill)}
.wd-note.warn svg{color:var(--warm)}

.wd-buy{margin-top:14px;display:flex;gap:13px;align-items:flex-start;border:1px solid var(--em-line);background:var(--panel);border-radius:16px;padding:16px 18px;box-shadow:var(--card-shadow)}
.wd-buy .ic{display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:11px;background:var(--em-fill-2);color:var(--em);flex-shrink:0}
.wd-buy h3{font-family:"Bricolage Grotesque";font-weight:700;font-size:16px;margin-bottom:5px}
.wd-buy p{color:var(--mut);font-size:13.5px}
.wd-buy p b{color:var(--tx)}
.wd-buy .x{margin-left:auto;background:none;border:none;color:var(--mut);padding:4px;border-radius:8px;flex-shrink:0}
.wd-buy .x:hover{color:var(--tx)}

/* Plan chooser (free signup needs a plan to guide) */
.wd-sub{margin-top:14px;border:1px solid var(--line);background:var(--panel);border-radius:16px;padding:18px 18px 16px;box-shadow:var(--card-shadow)}
.wd-sub-head{display:flex;gap:13px;align-items:flex-start}
.wd-sub-head .ic{display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:11px;background:var(--em-fill-2);color:var(--em);flex-shrink:0}
.wd-sub-head h3{font-family:"Bricolage Grotesque";font-weight:700;font-size:17px;margin-bottom:5px}
.wd-sub-head p{color:var(--mut);font-size:13.5px;max-width:62ch}
.wd-sub-plans{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:16px}
.wd-sub-plan{position:relative;display:flex;flex-direction:column;align-items:flex-start;gap:4px;text-align:left;border:1px solid var(--line);background:var(--panel);border-radius:14px;padding:14px 14px 13px;cursor:pointer;transition:transform .15s,border-color .15s}
.wd-sub-plan:hover{transform:translateY(-2px);border-color:var(--em)}
.wd-sub-plan:disabled{opacity:.7;cursor:default;transform:none}
.wd-sub-plan.pop{border-color:var(--em)}
.wd-sub-plan .tag{position:absolute;top:-9px;right:12px;font-size:10px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;background:var(--em);color:#06281c;padding:3px 8px;border-radius:999px}
.wd-sub-plan .nm{font-family:"Bricolage Grotesque";font-weight:700;font-size:15px}
.wd-sub-plan .pr{font-family:"Bricolage Grotesque";font-weight:800;font-size:24px;line-height:1}
.wd-sub-plan .pr i{font-style:normal;font-size:12px;font-weight:600;color:var(--mut);margin-left:2px}
.wd-sub-plan .hr{font-size:12.5px;color:var(--mut)}
.wd-sub-plan .go{margin-top:8px;display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:var(--em)}
.wd-sub-err{margin-top:12px;display:flex;align-items:center;gap:7px;color:var(--warm);font-size:13px}
.wd-sub-note{margin-top:12px;color:var(--mut);font-size:12.5px}
@media(max-width:720px){.wd-sub-plans{grid-template-columns:1fr}}

.wd-setup{margin-top:14px;border:1px solid var(--warm-line);background:var(--panel);border-radius:16px;padding:16px;box-shadow:var(--card-shadow)}
.wd-setup-note{display:flex;align-items:center;gap:9px;color:var(--warm);font-size:13.5px;margin-bottom:12px;font-weight:600}

/* Section head: icon tile + title + caption, shared by the plan form, the
   spaces grid and the sessions list. */
.wd-sec{display:flex;align-items:flex-start;gap:12px;margin-bottom:14px}
.wd-sec h2{font-family:var(--wd-display);font-weight:700;font-size:17px;letter-spacing:-.01em;line-height:1.3;display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}
.wd-sec p{color:var(--mut);font-size:13.5px;margin-top:2px;line-height:1.45}
.wd-sec .wd-ic{margin-top:1px}

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
.wd-modal-ov{position:fixed;inset:0;z-index:80;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(8,14,24,.5);backdrop-filter:blur(3px)}
.wd-modal{width:min(440px,calc(100vw - 36px));background:var(--panel);border:1px solid var(--line);border-radius:18px;padding:22px;box-shadow:var(--shadow)}
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
.wd-cta{display:inline-flex;align-items:center;justify-content:center;gap:8px;white-space:nowrap;background:var(--em);color:#fff;border:none;border-radius:10px;height:40px;padding:0 20px;font:inherit;font-weight:600;font-size:14.5px;cursor:pointer;transition:filter .15s,transform .15s}
.wd-cta:hover:not(:disabled){filter:brightness(1.05)}
.wd-cta:active:not(:disabled){transform:translateY(0)}
.wd-cta:disabled{opacity:.5;cursor:default;transform:none}

.wd-sessions{margin-top:16px}
.wd-sec-count{font-size:12px;color:var(--mut);font-weight:600;border:1px solid var(--line);background:var(--chip);border-radius:999px;padding:2px 9px;line-height:1.5}
.wd-sess-list{display:flex;flex-direction:column;gap:8px}
.wd-sess{display:flex;align-items:center;gap:12px;background:var(--panel);border:1px solid var(--line);border-radius:var(--r);padding:12px 16px;box-shadow:var(--card-shadow);transition:border-color .2s}
.wd-sess:hover{border-color:var(--line-2)}
.wd-sess-ic{width:30px;height:30px;border-radius:8px;background:var(--info-fill);color:var(--em-2);display:inline-flex;align-items:center;justify-content:center;flex:0 0 30px}
.wd-sess-ic.done{background:var(--em-fill);color:var(--em)}
.wd-sess-main{flex:1;min-width:0}
.wd-sess-title{font-weight:600;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wd-sess-meta{font-size:13px;color:var(--mut);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wd-sess-done{color:var(--em);font-weight:600}
.wd-sess-bar{height:4px;background:var(--track);border-radius:3px;margin-top:8px;overflow:hidden;max-width:380px}
.wd-sess-bar i{display:block;height:100%;border-radius:3px;background:var(--em);transition:width .4s ease}
.wd-resume{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 13px;border-radius:999px;border:1px solid var(--line);background:var(--panel);color:var(--tx-2);font:inherit;font-weight:500;font-size:13.5px;cursor:pointer;flex-shrink:0;white-space:nowrap;transition:background .15s,border-color .15s}
.wd-resume:hover{border-color:#d5d9e6;background:var(--line-soft)}
.wd-del{background:none;border:none;color:var(--mut);cursor:pointer;padding:7px;border-radius:9px;flex-shrink:0;transition:color .15s,background .15s}
.wd-del:hover{color:var(--danger);background:color-mix(in srgb,var(--danger) 12%,transparent)}
.wd-empty{border:1px dashed var(--line-2);border-radius:var(--r);padding:18px 16px;display:flex;align-items:center;gap:14px;background:var(--panel)}
.wd-empty .ic{display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:10px;background:var(--em-fill);border:1px solid var(--em-line);color:var(--em);flex-shrink:0}
.wd-empty b{display:block;color:var(--tx);font-size:14.5px;margin-bottom:2px}
.wd-empty p{color:var(--mut);font-size:13.5px}
.wd-skel{background:var(--panel);border:1px solid var(--line);border-radius:var(--r);padding:16px;display:flex;flex-direction:column;gap:10px}
.wd-skel i{display:block;height:12px;border-radius:6px;background:var(--track);background-size:200% 100%;animation:wd-sh 1.3s linear infinite}
.wd-skel i.w1{width:52%}.wd-skel i.w2{width:34%}.wd-skel i.w3{width:80%;height:5px}
@keyframes wd-sh{0%{background-position:200% 0}100%{background-position:-200% 0}}
/* Stat tiles: a slim 3-up (minutes left / tasks today / saved tasks). */
.wd-stats{margin-top:16px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.wd-stat{background:var(--panel);border:1px solid var(--line);border-radius:var(--r);padding:14px 16px;min-width:0}
.wd-stat .l{font-size:12.5px;color:var(--mut);display:flex;align-items:center;gap:7px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wd-stat .l svg{flex-shrink:0}
.wd-stat .v{margin-top:6px;font-size:23px;font-weight:700;font-family:var(--wd-display);line-height:1.1;white-space:nowrap}
.wd-stat .v small{font-size:13px;font-weight:500;color:var(--faint);font-family:"Figtree",system-ui,sans-serif}
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
 .wd-planpill{gap:7px;padding:0 9px 0 11px}
}
@media(max-width:860px){
 .wd-upgrade{width:32px;padding:0}
 .wd-upgrade span{display:none}
 .wd-buyhrs .wd-mins-l{display:none}
 /* Pill collapses to its banked-credits stat + caret (minutes stays in the
    min-left pill alongside; tasks + full detail live in the popover). */
 .wd-planpill>.wd-pp-s:nth-child(1),.wd-planpill>.wd-pp-s:nth-child(3),.wd-planpill>.wd-pp-sep{display:none}
}
@media(max-width:760px){.wd-start{padding:18px 16px 16px}}
@media(max-width:640px){
 .wd-main{padding:22px 16px 40px}
 .wd-top{padding:0 14px;gap:8px}
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

/* Compact plan pill (top bar): minutes left, tasks left, banked credits in one
   tight pill, with a popover for the full detail + the trade action. Replaces
   the old body plan card. Each micro-stat stays on one line (nowrap) and the
   whole pill shrinks gracefully at narrow widths (labels drop, then stats drop
   to just the banked count) so the top bar never overflows or clips. */
.wd-planpill-wrap{position:relative;flex-shrink:0;display:inline-flex}
.wd-planpill{display:inline-flex;align-items:center;gap:9px;flex-shrink:0;white-space:nowrap;height:32px;padding:0 10px 0 12px;border-radius:999px;border:1px solid var(--line);background:var(--panel);color:var(--tx-2);font:inherit;font-size:13px;font-weight:500;line-height:1;cursor:pointer;transition:color .15s,border-color .15s,background .15s}
.wd-planpill:hover,.wd-planpill.on{border-color:#d5d9e6;background:var(--line-soft);color:var(--tx)}
.wd-pp-s{display:inline-flex;align-items:center;gap:5px;white-space:nowrap}
.wd-pp-s svg{flex-shrink:0;color:var(--em-2)}
.wd-pp-s b{font-weight:700;color:var(--tx)}
.wd-pp-sep{width:1px;height:16px;background:var(--line);flex-shrink:0}
.wd-pp-ca{flex-shrink:0;color:var(--mut);transform:rotate(90deg)}
.wd-planpill.on .wd-pp-ca{transform:rotate(-90deg)}
/* Click-catcher behind the popover (closes on outside click). */
.wd-planpop-back{position:fixed;inset:0;z-index:40;background:transparent;border:0;padding:0;margin:0;cursor:default}
.wd-planpop{position:absolute;top:calc(100% + 8px);right:0;z-index:41;width:270px;max-width:calc(100vw - 28px);background:var(--panel);border:1px solid var(--line);border-radius:14px;box-shadow:var(--shadow);padding:14px 15px;animation:wd-pp-pop .16s ease}
@keyframes wd-pp-pop{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}
.wd-planpop-head{display:flex;align-items:center;gap:8px;margin-bottom:11px;min-width:0}
.wd-planpop-name{font-family:var(--wd-display);font-weight:700;font-size:15px;letter-spacing:-.01em;line-height:1.2;color:var(--tx);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wd-planpop-tag{display:inline-flex;align-items:center;gap:6px;flex-shrink:0;white-space:nowrap;font-size:10.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--em-deep);background:var(--em-fill);border:1px solid var(--em-line);border-radius:999px;padding:3px 9px;margin-left:auto}
.wd-planpop-tag .wd-plan-dot{width:6px;height:6px}
.wd-planpop-stat{padding:9px 0;border-top:1px solid var(--line-soft)}
.wd-planpop-stat:first-of-type{border-top:0;padding-top:0}
.wd-planpop-stat .r{display:flex;align-items:baseline;justify-content:space-between;gap:10px;min-width:0}
.wd-planpop-stat .k{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;color:var(--mut);min-width:0}
.wd-planpop-stat .k svg{flex-shrink:0;color:var(--em-2)}
.wd-planpop-stat .v{font-family:var(--wd-display);font-weight:700;font-size:17px;line-height:1.1;color:var(--tx);white-space:nowrap;flex-shrink:0}
.wd-planpop-stat .v small{font-size:11.5px;font-weight:500;color:var(--faint);font-family:"Figtree",system-ui,sans-serif}
.wd-planpop-stat .h{font-size:11px;color:var(--faint);margin-top:3px;line-height:1.4}
.wd-trade-btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;flex-shrink:0;white-space:nowrap;height:36px;padding:0 15px;border-radius:999px;border:1px solid var(--em);background:var(--em);color:#fff;font:inherit;font-size:13.5px;font-weight:600;cursor:pointer;transition:filter .15s,opacity .15s}
.wd-trade-btn:hover{filter:brightness(1.05)}
.wd-trade-btn:disabled{opacity:.6;cursor:default}
.wd-trade-btn svg{flex-shrink:0}
.wd-planpop-trade{width:100%;margin-top:12px}

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
.wd-sess-all{margin-left:auto;display:inline-flex;align-items:center;gap:6px;flex-shrink:0;white-space:nowrap;color:var(--em-2);font-size:13px;font-weight:600;text-decoration:none;padding:2px 2px}
.wd-sess-all:hover{color:var(--em-deep)}
.wd-sess-all svg{flex-shrink:0}
.wd-sess-more{display:inline-flex;align-items:center;justify-content:center;gap:7px;flex-shrink:0;white-space:nowrap;align-self:flex-start;margin-top:2px;color:var(--em-2);font-size:13px;font-weight:600;text-decoration:none;padding:6px 2px}
.wd-sess-more:hover{color:var(--em-deep)}
@media(prefers-reduced-motion:reduce){.wd-wiz-reveal,.wd-term-line{animation:none}.wd-term-caret{animation:none}.wd-term-fill{transition:none}.wd-coach-kind,.wd-coach-opt{transition:none}.wd-coach,.wd-coach::after,.wd-coach-kind-check,.wd-coach-prog span.on,.wd-coach-adv .bar i{animation:none}}
`
