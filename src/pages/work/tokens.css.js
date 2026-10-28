// The in-product DESIGN TOKENS: the ONE source for every color, radius,
// spacing step, shadow and type size the signed-in product uses, with the
// Dark and Heavy mode values and the accessibility overrides for the same
// names. Split out of workApp.css.js (which prepends this and adds the shell +
// component rules) so a host that is NOT inside the app shell can carry the
// same tokens by adding the `wd-tokens` class to its root and injecting this
// sheet alone: the company and superadmin consoles and the executive
// dashboard derive their --wka-* set from these (workadmin.css.js), so every
// surface flips Light / Dark / Heavy and follows the user's brand combination
// from one place (SUPREME II). Tokens only; no layout rule lives here.
//
// Brand: BOTH colors derive from the user's chosen combination
// (src/theme/accent.js sets --accent* and --accent-2* on :root; the literal
// is the default pair, green / blue). --em is the primary (marks, rings,
// icons, soft fills); --em-solid is the primary's white-text-safe fill
// (>= 4.5:1, a button face); --em-deep is the primary's text shade; --em-2 is
// the secondary and --em-2-deep its text shade. Every brand fill / tint is a
// color-mix of these, so no brand color is ever fixed here. Fixed on purpose
// (semantic): --cta orange (the one call-to-action), --warm amber (warning),
// --danger, --info, --ai violet (AI assist) and the violet / amber / neutral
// tints.
export const WD_TOKENS_CSS = `
.wd,.wd-tokens{
  /* ---- Canvas + surfaces (light, the product default) ---- */
  --bg:#f6f7fb;--ink:var(--bg);--ink-soft:#ffffff;
  --panel:#ffffff;--panel-2:#fbfbfd;--panel-3:#f3f5f9;
  --line:#e6e9f0;--line-2:#d3d8e4;--line-soft:#eef0f5;
  --tx:#1a1f33;--tx-2:#2c3350;--mut:#5f6887;--mut-2:#454c6a;--faint:#8b92aa;
  /* ---- Brand (derived from the chosen combination) ---- */
  --em:var(--accent,#0e9f6e);--em-solid:var(--accent-solid,#0c865c);--on-solid:#ffffff;--on-em:var(--accent-contrast,#ffffff);--em-deep:var(--accent-dark,#0b825a);
  --em-2:var(--accent-2,#0a6fb3);--em-2-deep:var(--accent-2-dark,#085b93);
  --em-fill:var(--accent-soft,rgba(14,159,110,.10));--em-fill-2:color-mix(in srgb,var(--em) 18%,var(--panel));--em-line:var(--accent-line,rgba(14,159,110,.32));
  /* ---- The ONE call-to-action color: orange (brand), never an all-orange UI. ---- */
  --cta:#c9501a;--cta-hover:#b4460f;--cta-ink:#ffffff;--cta-fill:#fdf0e8;--cta-line:rgba(201,80,26,.30);
  /* ---- Semantic: amber warning, danger, info, AI assist ---- */
  --warm:#b45309;--warm-2:#d97706;--warm-fill:#fdf4e7;--warm-line:rgba(180,83,9,.30);
  --danger:#d93a4d;--danger-fill:#fdeef0;--danger-line:rgba(217,58,77,.32);
  --info:#0a6fb3;--info-fill:#eaf3fc;--info-line:rgba(10,111,179,.26);
  --ai:#6d4fd6;--ai-fill:#f1edfc;--ai-line:rgba(109,79,214,.26);--violet:var(--ai);--rose:var(--danger);
  /* ---- Soft category tints: a pale fill + a saturated ink of the same hue.
     Brand tints derive from the combination; violet / amber / neutral are
     semantic and stay fixed on purpose. ---- */
  --tint-green:color-mix(in srgb,var(--em) 12%,var(--panel));--tint-green-ink:var(--em-deep);
  --tint-blue:color-mix(in srgb,var(--em-2) 12%,var(--panel));--tint-blue-ink:var(--em-2-deep);
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
  /* ---- Type scale. ONE font-scale var: --wc-fs-app is set on :root by the
     user's text-size preference (src/theme/prefs.js: sm .9 / md 1 / lg 1.15 /
     xl 1.3); every font-size in the .wd sheets is calc(px * var(--wc-fs)). The
     shell chrome (rail, top bar) caps its scale at 1.15. ---- */
  --wc-fs:var(--wc-fs-app,1);--wc-fs-chrome:min(var(--wc-fs-app,1),1.15);
  --fs-xs:calc(11.5px*var(--wc-fs));--fs-sm:calc(12.5px*var(--wc-fs));--fs-md:calc(13.5px*var(--wc-fs));--fs-base:calc(14.5px*var(--wc-fs));--fs-lg:calc(16px*var(--wc-fs));--fs-xl:calc(18px*var(--wc-fs));--fs-2xl:calc(22px*var(--wc-fs));--fs-3xl:calc(26px*var(--wc-fs));
  --wd-display:"Bricolage Grotesque","Figtree",system-ui,sans-serif;
  --wd-body:"Figtree",-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,Roboto,sans-serif}
/* ---- Dark values for the SAME tokens (data-theme on <html>, set by the
   user's theme-mode preference; Light stays the default). ---- */
[data-theme='dark'] :is(.wd,.wd-tokens){
  --bg:#0f1220;--ink-soft:#171a2c;
  --panel:#171a2c;--panel-2:#1b1f33;--panel-3:#1f2439;
  --line:rgba(255,255,255,.09);--line-2:rgba(255,255,255,.16);--line-soft:rgba(255,255,255,.06);
  --tx:#e8eaf6;--tx-2:#d3d8e8;--mut:#a1a7c3;--mut-2:#b8bdd4;--faint:#767d9e;
  --em:var(--accent,#2ec48f);--em-2:var(--accent-2,#4fb6ef);--on-em:#06281c;--em-deep:var(--accent-light,#7ae6bd);--em-2-deep:var(--accent-2-light,#8fcbf5);
  --em-fill:var(--accent-soft,rgba(46,196,143,.13));--em-fill-2:color-mix(in srgb,var(--em) 24%,var(--panel));--em-line:var(--accent-line,rgba(46,196,143,.38));
  --cta:#e8763f;--cta-hover:#f28a56;--cta-ink:#1a0c05;--cta-fill:rgba(232,118,63,.14);--cta-line:rgba(232,118,63,.40);
  --warm:#f0b35a;--warm-2:#f5c46b;--warm-fill:rgba(240,179,90,.12);--warm-line:rgba(240,179,90,.36);
  --danger:#f0637a;--danger-fill:rgba(240,99,122,.12);--danger-line:rgba(240,99,122,.38);
  --info:#6fb8ef;--info-fill:rgba(111,184,239,.12);--info-line:rgba(111,184,239,.34);
  --ai:#a68cf5;--ai-fill:rgba(166,140,245,.13);--ai-line:rgba(166,140,245,.36);
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
/* ---- HEAVY: a bolder, higher-contrast LIGHT variant. Stronger edges, the
   primary's saturated (solid / ink) shades as the accent, denser spacing,
   smaller radii. Same tokens, redefined (the weight rules live with the
   component sheet). ---- */
[data-theme='heavy'] :is(.wd,.wd-tokens){
  --bg:#eef0f5;--panel-2:#f7f8fb;--panel-3:#eceef4;
  --line:#b9c0d0;--line-2:#8f98ae;--line-soft:#d2d7e2;
  --tx:#0d1020;--tx-2:#1a2037;--mut:#3f4766;--mut-2:#2f3652;--faint:#5c6481;
  --em:var(--accent-solid,#0c865c);--em-deep:var(--accent-ink,#085f42);--em-2:var(--accent-2-dark,#085b93);--em-2-deep:var(--accent-2-dark,#085b93);
  --em-fill:color-mix(in srgb,var(--em) 16%,var(--panel));--em-fill-2:color-mix(in srgb,var(--em) 26%,var(--panel));--em-line:color-mix(in srgb,var(--em) 55%,transparent);
  --tint-green:color-mix(in srgb,var(--em) 18%,var(--panel));--tint-blue:color-mix(in srgb,var(--em-2) 18%,var(--panel));
  --tint-violet:#e6dffa;--tint-violet-ink:#3f2a9a;--tint-amber:#fbe9cf;--tint-amber-ink:#7a3a05;--tint-neutral:#e4e7ef;--tint-neutral-ink:#1a2037;
  --cta:#b4460f;--cta-hover:#9c3b0b;--warm:#9a4a07;--danger:#c42a3d;
  --sh-1:0 1px 2px rgba(20,24,44,.10);--sh-2:0 2px 4px rgba(20,24,44,.10),0 10px 24px -16px rgba(26,31,54,.35);
  --r-xs:6px;--r-sm:8px;--r:10px;--r-lg:12px;--r-xl:14px;
  --sp-5:16px;--sp-6:20px;--sp-7:26px;--sp-8:32px}
/* ---- ACCESSIBILITY token overrides, layered on any theme mode
   (data-a11y-* on :root, set by src/theme/prefs.js). ---- */
[data-a11y-contrast='1'] :is(.wd,.wd-tokens){
  --line:#6b7390;--line-2:#3e465f;--line-soft:#9aa2b8;
  --tx:#000000;--tx-2:#0d1020;--mut:#242b45;--mut-2:#1a2037;--faint:#3e465f;--focus:#1a1f33;
  --em-deep:var(--accent-ink,#085f42);--em-2-deep:var(--accent-2-dark,#085b93);
  --tint-green-ink:var(--em-deep);--tint-blue-ink:var(--em-2-deep);--tint-amber-ink:#7a3a05;--tint-violet-ink:#3f2a9a;--tint-neutral-ink:#1a2037;
  --cta:#a63f0d;--cta-hover:#8f350a;--warm:#8a4206;--danger:#b8253a;--info:#084f80}
[data-theme='dark'][data-a11y-contrast='1'] :is(.wd,.wd-tokens){
  --line:rgba(255,255,255,.45);--line-2:rgba(255,255,255,.70);--line-soft:rgba(255,255,255,.30);
  --tx:#ffffff;--tx-2:#f3f4fa;--mut:#d6dae8;--mut-2:#e4e7f2;--faint:#c0c6da;--focus:#ffffff;
  --em-deep:#a8f0d2;--em-2-deep:#b6dcf8;--tint-green-ink:var(--em-deep);--tint-blue-ink:var(--em-2-deep);--tint-amber-ink:#f8d9a0;--tint-violet-ink:#d9ccfc;--tint-neutral-ink:#e4e7f2;
  --cta:#f0884f;--cta-hover:#f59a68;--warm:#f5c46b;--danger:#f58a9b;--info:#9fd0f7}
/* Readable font: a clearer, wider-spaced letterform for every text token. The
   first family loads only if installed; Verdana / Segoe UI are the dependable
   fallbacks on every platform (no new dependency). */
[data-a11y-font='readable'] :is(.wd,.wd-tokens){--wd-body:"Atkinson Hyperlegible","Verdana","Segoe UI",system-ui,sans-serif;--wd-display:var(--wd-body);--wc-font-w:1.18;letter-spacing:.012em;word-spacing:.06em;line-height:1.6}
[data-a11y-targets='1'] :is(.wd,.wd-tokens){--wc-target-w:1.1}
`
