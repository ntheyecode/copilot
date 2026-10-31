// Stylesheet of /workcopilot/company-brain (root class .wcb). Same design
// language and the same token names as the enterprise page (WorkEnterprise.jsx):
// brand emerald / cyan with the orange CTA, a light page (the shared SiteHeader
// is light; the shared SiteFooter is the one dark band), responsive down to
// 375px, dark tokens under data-theme=dark. Scoped under .wcb only; no
// page-root wildcard sets min-width (scripts/check-css-page-wildcards.mjs).
export const CSS = `
.wcb{--bg:#f3f5fb;--panel:#ffffff;--panel-2:#f7f9fd;--line:#e6e8f1;--line-2:#d3d7e5;--tx:#161a2b;--mut:#5c6484;
  --em:#0e9f6e;--cyan:#0a84c2;--em-fill:rgba(14,159,110,.08);--em-fill-2:rgba(14,159,110,.14);--em-line:rgba(14,159,110,.30);
  --cyan-fill:rgba(10,132,194,.08);--cyan-line:rgba(10,132,194,.26);
  --amber:#b7791f;--amber-soft:rgba(183,121,31,.10);--amber-line:rgba(183,121,31,.34);
  --cta:#f26a43;--cta-2:#e35a31;--cta-ink:#ffffff;--cta-soft:rgba(242,106,67,.10);--cta-line:rgba(242,106,67,.30);--cta-text:#b63f1c;
  --card-shadow:0 1px 2px rgba(26,31,54,.05),0 10px 26px -16px rgba(26,31,54,.16);--card-shadow-hover:0 1px 2px rgba(26,31,54,.06),0 14px 32px -16px rgba(26,31,54,.22);
  --display:"Bricolage Grotesque","Figtree",system-ui,sans-serif;
  position:relative;min-height:100vh;background:var(--bg);color:var(--tx);font-family:"Figtree",system-ui,sans-serif;-webkit-font-smoothing:antialiased;overflow-x:hidden}
[data-theme='dark'] .wcb{--bg:#0a0b12;--panel:#13141f;--panel-2:#181b27;--line:rgba(255,255,255,.08);--line-2:rgba(255,255,255,.15);--tx:#eef0f6;--mut:#9aa0b4;
  --em:#8cf5c4;--cyan:#39d3ff;--em-fill:rgba(140,245,196,.10);--em-fill-2:rgba(140,245,196,.17);--em-line:rgba(140,245,196,.34);
  --cyan-fill:rgba(57,211,255,.10);--cyan-line:rgba(57,211,255,.30);
  --amber:#f5c86b;--amber-soft:rgba(245,200,107,.12);--amber-line:rgba(245,200,107,.36);
  --cta:#ffb561;--cta-2:#ff7a59;--cta-ink:#241206;--cta-soft:rgba(255,160,80,.10);--cta-line:rgba(255,160,80,.32);--cta-text:#ffb561;
  --card-shadow:0 1px 0 rgba(255,255,255,.03) inset,0 10px 26px -20px rgba(0,0,0,.8);--card-shadow-hover:0 1px 0 rgba(255,255,255,.04) inset,0 14px 30px -18px rgba(0,0,0,.9)}
.wcb *{box-sizing:border-box}
.wcb h1,.wcb h2,.wcb h3{margin:0;color:var(--tx);font-family:var(--display);letter-spacing:-.025em}
.wcb a{color:inherit;text-decoration:none}
.wcb-bg{position:fixed;inset:0;z-index:0;pointer-events:none;background-image:radial-gradient(color-mix(in srgb,var(--cyan) 22%,transparent) 1px,transparent 1.2px);background-size:22px 22px;opacity:.32;mask-image:radial-gradient(60% 50% at 70% 10%,#000 20%,transparent 100%);-webkit-mask-image:radial-gradient(60% 50% at 70% 10%,#000 20%,transparent 100%)}
.wcb-wrap{max-width:1160px;margin:0 auto;padding:0 24px;position:relative;z-index:2}
.wcb-eyebrow{display:inline-flex;align-items:center;gap:7px;font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--cyan);margin-bottom:12px;max-width:100%}
.wcb-eyebrow svg{flex:none}
.wcb-eyebrow.warm{color:var(--cta-text)}
.wcb-hl{background:linear-gradient(92deg,var(--em) 0%,var(--cyan) 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
.wcb-lead{color:var(--mut);font-size:15.5px;line-height:1.55;margin:12px 0 0;text-wrap:pretty;max-width:70ch}

/* hero */
.wcb-hero{padding:56px 0 26px}
.wcb-hero-in{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,.95fr);gap:40px;align-items:center;padding:34px 24px;border-radius:28px;border:1px solid var(--line);
  background:
    radial-gradient(760px 320px at 100% 0%,var(--em-fill-2),transparent 62%),
    radial-gradient(620px 300px at 0% 100%,var(--cyan-fill),transparent 62%),
    linear-gradient(135deg,color-mix(in srgb,var(--panel) 96%,transparent),color-mix(in srgb,var(--panel) 84%,transparent));
  box-shadow:var(--card-shadow);position:relative;overflow:hidden}
.wcb-hero-in::before{content:'';position:absolute;left:38px;right:38px;top:0;height:3px;border-radius:2px;background:linear-gradient(90deg,var(--em),var(--cyan) 60%,var(--cta))}
.wcb-hero-in>div{min-width:0}
.wcb-hero h1{font-weight:800;font-size:clamp(32px,4.5vw,56px);line-height:1.02;text-wrap:balance;max-width:17ch}
.wcb-sub{color:var(--mut);font-size:17px;line-height:1.55;max-width:56ch;margin:18px 0 22px;text-wrap:pretty}
.wcb-ctas{display:flex;gap:12px;flex-wrap:wrap;align-items:center}
.wcb-ctas.center{justify-content:center}
.wcb-cta{display:inline-flex;align-items:center;gap:8px;white-space:nowrap;background:linear-gradient(135deg,var(--cta),var(--cta-2));color:var(--cta-ink);border:none;border-radius:12px;padding:13px 20px;font:inherit;font-weight:700;font-size:15px;cursor:pointer;box-shadow:0 12px 30px -14px var(--cta-2);transition:transform .15s,box-shadow .15s,filter .15s;max-width:100%}
.wcb-cta:hover{transform:translateY(-2px);filter:brightness(1.04);box-shadow:0 16px 34px -14px var(--cta-2)}
.wcb-cta.big{padding:16px 28px;font-size:16.5px}
.wcb-cta.alt{background:var(--panel);color:var(--tx);border:1px solid var(--line-2);box-shadow:none}
.wcb-cta.alt:hover{border-color:var(--cyan);color:var(--cyan)}
.wcb-cta svg{flex:none}
[dir="rtl"] .wcb-cta svg{transform:scaleX(-1)}
.wcb-proof{list-style:none;margin:22px 0 0;padding:0;display:flex;flex-direction:column;gap:8px}
.wcb-proof li{display:flex;align-items:flex-start;gap:8px;font-size:14px;color:var(--tx);font-weight:500;line-height:1.4}
.wcb-proof svg{color:var(--em);flex:none;margin-top:2px}

/* hero card: one guided step with its source */
.wcb-card{justify-self:end;width:100%;max-width:440px;border-radius:20px;border:1px solid var(--line);background:var(--panel);box-shadow:var(--card-shadow);overflow:hidden;animation:wcb-rise .6s cubic-bezier(.2,.8,.2,1) both}
.wcb-card-bar{display:flex;align-items:center;gap:8px;padding:11px 14px;border-bottom:1px solid var(--line);font-size:12.5px;font-weight:700;color:var(--mut)}
.wcb-card-bar i{width:9px;height:9px;border-radius:50%;background:var(--line-2);flex:none}
.wcb-card-bar b{color:var(--tx);margin-inline-start:4px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wcb-card-bar .wcb-card-lock{margin-inline-start:auto;display:inline-flex;align-items:center;gap:5px;white-space:nowrap;font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--em);background:var(--em-fill);border:1px solid var(--em-line);border-radius:999px;padding:4px 9px;flex:none}
.wcb-card-body{padding:16px 16px 14px;display:flex;flex-direction:column;gap:10px}
.wcb-card-k{font-family:"JetBrains Mono",ui-monospace,monospace;font-size:11.5px;font-weight:700;letter-spacing:.1em;color:var(--mut);text-transform:uppercase}
.wcb-card-step{position:relative;padding:14px 16px 14px 18px;border-radius:14px;background:var(--em-fill);border:1px solid var(--em-line)}
.wcb-card-step::before{content:'';position:absolute;inset-inline-start:0;top:12px;bottom:12px;width:3px;border-radius:2px;background:linear-gradient(180deg,var(--em),var(--cyan))}
.wcb-card-step p{margin:0;font-size:15px;line-height:1.5;font-weight:600;color:var(--tx)}
.wcb-card-from{display:flex;align-items:flex-start;gap:7px;font-size:13px;line-height:1.45;color:var(--cyan);font-weight:600}
.wcb-card-from svg{flex:none;margin-top:2px}
.wcb-card-check{display:flex;align-items:flex-start;gap:7px;font-size:12.5px;line-height:1.45;color:var(--mut);padding-top:10px;border-top:1px dashed var(--line-2)}
.wcb-card-check svg{color:var(--em);flex:none;margin-top:2px}
@keyframes wcb-rise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}

/* sections */
.wcb-main{padding:10px 24px 80px;display:flex;flex-direction:column;gap:22px}
.wcb-sec{padding:30px 32px 30px;border-radius:24px;border:1px solid var(--line);background:var(--panel);box-shadow:var(--card-shadow);position:relative;overflow:hidden}
.wcb-sec::after{content:'';position:absolute;inset:0;pointer-events:none;background:radial-gradient(520px 200px at 100% 0%,var(--em-fill),transparent 70%)}
.wcb-sec>*{position:relative;z-index:1}
.wcb-sec.prime{border-color:var(--em-line);background:
    radial-gradient(900px 360px at 0% 0%,var(--em-fill-2),transparent 60%),
    radial-gradient(700px 320px at 100% 100%,var(--cyan-fill),transparent 60%),
    var(--panel);box-shadow:0 1px 2px rgba(26,31,54,.05),0 30px 70px -40px rgba(14,159,110,.45)}
.wcb-sec.prime::before{content:'';position:absolute;left:0;right:0;top:0;height:4px;background:linear-gradient(90deg,var(--em),var(--cyan) 55%,var(--cta))}
.wcb-sec-head{max-width:76ch;margin-bottom:22px}
.wcb-sec h2{font-weight:800;font-size:clamp(26px,3.4vw,42px);line-height:1.06;text-wrap:balance}

/* three sources */
.wcb-sources{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
.wcb-source{display:flex;flex-direction:column;gap:10px;padding:20px 18px 18px;border-radius:18px;border:1px solid var(--line);background:var(--panel);box-shadow:var(--card-shadow);min-width:0}
.wcb-source-top{display:flex;align-items:center;justify-content:space-between;gap:8px}
.wcb-source-ic{width:42px;height:42px;border-radius:12px;display:grid;place-items:center;background:linear-gradient(135deg,var(--em-fill-2),var(--cyan-fill));color:var(--em);border:1px solid var(--em-line);flex:none}
.wcb-source:nth-child(2) .wcb-source-ic{background:var(--cta-soft);color:var(--cta-text);border-color:var(--cta-line)}
.wcb-source-k{font-family:"JetBrains Mono",ui-monospace,monospace;font-size:12px;font-weight:700;letter-spacing:.12em;color:var(--mut)}
.wcb-source b{font-family:var(--display);font-size:18px;font-weight:800;letter-spacing:-.015em;line-height:1.2}
.wcb-source p{margin:0;font-size:14px;line-height:1.55;color:var(--mut)}
.wcb-chips{display:flex;flex-wrap:wrap;gap:7px;margin-top:auto;padding-top:6px}
.wcb-chip{display:inline-flex;align-items:center;gap:5px;min-height:26px;padding:4px 10px;border-radius:999px;font-size:12px;font-weight:600;line-height:1.3;color:var(--tx);background:var(--em-fill);border:1px solid var(--em-line)}
.wcb-chip svg{color:var(--em);flex:none}
.wcb-note{display:flex;align-items:flex-start;gap:9px;margin:18px 0 0;padding:12px 14px;border-radius:12px;background:var(--cyan-fill);border:1px solid var(--cyan-line);font-size:13.5px;line-height:1.5;color:var(--tx)}
.wcb-note svg{color:var(--cyan);flex:none;margin-top:2px}

/* feature grids */
.wcb-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
.wcb-grid.four{grid-template-columns:repeat(4,minmax(0,1fr))}
.wcb-feat{position:relative;display:flex;flex-direction:column;gap:8px;padding:18px 18px 17px;border-radius:16px;border:1px solid var(--line);background:var(--panel-2);box-shadow:var(--card-shadow);transition:border-color .18s,box-shadow .18s,transform .15s;overflow:hidden;min-width:0}
.wcb-feat::before{content:'';position:absolute;inset-inline-start:0;top:0;bottom:0;width:3px;background:linear-gradient(180deg,var(--em),var(--cyan));opacity:0;transition:opacity .18s}
.wcb-feat:hover{border-color:var(--line-2);box-shadow:var(--card-shadow-hover);transform:translateY(-2px)}
.wcb-feat:hover::before{opacity:1}
.wcb-feat b{font-size:15.5px;font-weight:700;line-height:1.3;letter-spacing:-.01em}
.wcb-feat p{margin:0;font-size:13.5px;line-height:1.55;color:var(--mut)}
.wcb-ic{width:36px;height:36px;border-radius:11px;display:grid;place-items:center;background:var(--em-fill);color:var(--em);border:1px solid var(--em-line);flex:none}
.wcb-feat.amber .wcb-ic{background:var(--amber-soft);color:var(--amber);border-color:var(--amber-line)}
.wcb-feat.cyan .wcb-ic{background:var(--cyan-fill);color:var(--cyan);border-color:var(--cyan-line)}

/* how it works: diagram + four stages */
.wcb-how-in{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:26px;align-items:center}
.wcb-how-art{min-width:0}
.wcb-how-art .cbf{display:block;width:100%;height:auto;filter:drop-shadow(0 18px 30px rgba(26,31,54,.14))}
[data-theme='dark'] .wcb-how-art .cbf{filter:drop-shadow(0 0 28px rgba(140,245,196,.14)) drop-shadow(0 18px 30px rgba(0,0,0,.55))}
.wcb-stages{list-style:none;margin:0;padding:0;display:grid;gap:10px;min-width:0}
.wcb-stage{display:grid;grid-template-columns:auto minmax(0,1fr);gap:12px;align-items:start;padding:12px 14px;border-radius:14px;border:1px solid var(--line);background:var(--panel-2)}
.wcb-stage-n{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;font-family:"JetBrains Mono",ui-monospace,monospace;font-size:12px;font-weight:700;color:var(--em);background:var(--em-fill);border:1px solid var(--em-line)}
.wcb-stage:nth-child(2) .wcb-stage-n{color:var(--amber);background:var(--amber-soft);border-color:var(--amber-line)}
.wcb-stage b{display:block;font-family:var(--display);font-size:16px;font-weight:800;letter-spacing:-.01em;line-height:1.2}
.wcb-stage p{margin:3px 0 0;font-size:13.5px;line-height:1.5;color:var(--mut)}

/* final */
.wcb-final{text-align:center;padding:40px 24px 10px}
.wcb-final h2{font-weight:800;font-size:clamp(28px,4vw,42px);line-height:1.08;text-wrap:balance}
.wcb-final p{color:var(--mut);font-size:16px;margin:12px auto 22px;max-width:60ch}

@media(max-width:980px){
  .wcb-hero-in{grid-template-columns:1fr;gap:22px}.wcb-card{justify-self:center;max-width:480px}.wcb-hero h1{max-width:none}
  .wcb-sources{grid-template-columns:1fr}
  .wcb-grid,.wcb-grid.four{grid-template-columns:1fr 1fr}
  .wcb-how-in{grid-template-columns:1fr}.wcb-how-art{max-width:620px;margin:0 auto}
}
@media(max-width:640px){
  .wcb-hero{padding:34px 0 18px}.wcb-hero-in{padding:22px 16px;border-radius:20px}
  .wcb-main{padding:6px 14px 56px;gap:14px}.wcb-sec{padding:22px 16px;border-radius:18px}
  .wcb-grid,.wcb-grid.four{grid-template-columns:1fr}
  .wcb-ctas .wcb-cta{width:100%;justify-content:center;white-space:normal;text-align:center}
  .wcb-card-bar .wcb-card-lock{display:none}
}
@media(prefers-reduced-motion:reduce){.wcb-card{animation:none}.wcb-feat,.wcb-cta{transition:none}}
`
