import React, { useEffect, useRef, useState } from 'react'
import { Check } from 'lucide-react'

// WorkCard - the single, shared marketing card primitive for the whole site.
// One premium shell (layered surface + brand hairline + corner glow + optional
// on-brand texture + considered hover-lift + on-scroll reveal), composed from a
// few small sub-parts so every page's card shapes read as ONE design language.
//
// It injects its own stylesheet (and the brand fonts) once, so any page can use
// it without importing a global stylesheet. It is themeable per page via the
// `theme` prop ("light" | "dark") and per card via `tone` (accent pair).
//
// Variants are composed, not hard-coded:
//   plain        -> <WorkCard><WorkCard.Head .../><WorkCard.Body>..</WorkCard.Body></WorkCard>
//   with-icon    -> Head with `icon`
//   with-visual  -> a top node (inline SVG, image) as the first child, then Head/Body
//   proof-strip  -> <WorkCard.Proof> the mono "mechanism" strip (device-screen feel)
//   checklist    -> <WorkCard.Points items={[...]} />
//   before/after -> tone="danger" / tone="ok" on two cards, each wrapping its panel
//
// LOOK: the default visual language is "Option C - Depth and brand glow" in LIGHT
// theme: a layered white surface, a soft emerald->cyan corner glow blurred into
// the top corner (drifts inward on hover), a gradient duotone icon tile with a
// glass highlight, a thin brand top-hairline, a quiet mono "proof" check-log, and
// a soft multi-stop shadow. The whole site is light; there are NO dark card
// surfaces. The `tone` system is kept, and each tone is realized as an Option-C
// light card with that accent as the glow / hairline / icon-tile / ink color.
//
// TEXTURE SLOT: the shell reads `--wc-tex` (a url) behind the surface, under a
// near-opaque white veil so only a faint light wash shows through. The default is
// the light repo asset (/card-wash-light.jpg); the dark texture is no longer used.
// Pass `texture={false}` to opt out, or `texPos` to re-crop so reuse never looks
// repetitive. If an asset fails to load the card still looks finished on CSS alone.

const STYLE_ID = 'workcard-css'

// Brand fonts are self-hosted and loaded globally in src/main.jsx; only the
// scoped component stylesheet is injected at runtime.
function ensureAssets() {
  if (typeof document === 'undefined') return
  if (!document.getElementById(STYLE_ID)) {
    const s = document.createElement('style')
    s.id = STYLE_ID; s.textContent = WORKCARD_CSS
    document.head.appendChild(s)
  }
}

// On-scroll reveal with a per-card stagger, gated by prefers-reduced-motion.
function useReveal(enabled, delay) {
  const ref = useRef(null)
  const [shown, setShown] = useState(!enabled)
  useEffect(() => {
    if (!enabled) { setShown(true); return }
    const reduce = typeof window !== 'undefined' && window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) { setShown(true); return }
    const el = ref.current; if (!el) return
    let timer
    const io = new IntersectionObserver((ents) => {
      ents.forEach((e) => {
        if (e.isIntersecting) { io.disconnect(); timer = setTimeout(() => setShown(true), delay || 0) }
      })
    }, { threshold: 0.14 })
    io.observe(el)
    return () => { io.disconnect(); clearTimeout(timer) }
  }, [enabled, delay])
  return [ref, shown]
}

export default function WorkCard({
  theme = 'light', tone, delay = 0, as = 'div', href, onClick, interactive,
  texture = true, texPos, reveal = true, className = '', style, children, ...rest
}) {
  ensureAssets()
  const [ref, shown] = useReveal(reveal, delay)
  const isInteractive = interactive != null ? interactive : (!!onClick || (as === 'a' && !!href) || as === 'button')
  const cls = [
    'wc-card',
    theme === 'dark' ? 'wc-dark' : 'wc-light',
    tone ? `t-${tone}` : '',
    texture ? 'wc-tex' : '',
    isInteractive ? 'wc-int' : '',
    reveal ? 'wc-reveal' : '',
    shown ? 'wc-in' : '',
    className,
  ].filter(Boolean).join(' ')
  const st = { ...(style || {}), ...(texPos ? { '--wc-tex-pos': texPos } : null) }
  const Tag = as
  const props = { ref, className: cls, style: st, onClick, ...rest }
  if (as === 'a') props.href = href
  return <Tag {...props}>{children}</Tag>
}

// Icon tile (gradient duotone) + optional eyebrow + title.
WorkCard.Head = function Head({ icon: Icon, eyebrow, title, align = 'center', children }) {
  return (
    <div className={'wc-head' + (align === 'start' ? ' wc-head-stack' : '')}>
      {Icon ? <span className="wc-ic">{React.isValidElement(Icon) ? Icon : <Icon size={18} />}</span> : null}
      <div className="wc-htext">
        {eyebrow ? <span className="wc-eyebrow">{eyebrow}</span> : null}
        {title ? <h3 className="wc-title">{title}</h3> : null}
        {children}
      </div>
    </div>
  )
}

// The mono "mechanism" strip - a quiet light "check log" (Option C) that shows
// the how, not just tells it. Light surface, mono type, on-brand chip vocabulary.
WorkCard.Proof = function Proof({ children, className = '' }) {
  return <div className={'wc-proof ' + className}>{children}</div>
}

WorkCard.Body = function Body({ children, className = '' }) {
  return <p className={'wc-body ' + className}>{children}</p>
}

WorkCard.Points = function Points({ items, icon: Icon = Check }) {
  return (
    <ul className="wc-points">
      {items.map((it, i) => <li key={i}><Icon size={14} /><span>{it}</span></li>)}
    </ul>
  )
}

WorkCard.Link = function Link({ children, onClick, as = 'button', href, target, rel }) {
  if (as === 'a') return <a className="wc-link" href={href} target={target} rel={rel}>{children}</a>
  return <button type="button" className="wc-link" onClick={onClick}>{children}</button>
}

WorkCard.Media = function Media({ children, className = '' }) {
  return <div className={'wc-media ' + className}>{children}</div>
}

const WORKCARD_CSS = `
/* ==================================================================
   WorkCard - site-wide card primitive, "Option C - Depth + brand glow"
   realized in LIGHT theme. One white surface, a soft emerald->cyan
   corner glow, a duotone glass icon tile, a brand top-hairline, a quiet
   mono proof check-log, and a considered hover-lift. No dark surfaces.
   ================================================================== */
.wc-card{
  --wc-ease:cubic-bezier(.2,.7,.2,1);
  /* surface + ink */
  --wc-s1:#ffffff; --wc-s2:#fbfdfc;
  --wc-line:rgba(10,13,18,.09);
  --wc-tx:#0a0d12; --wc-mut:#3d4650; --wc-dim:#6b7680;
  --wc-title:#0a0d12; --wc-icfg:#ffffff;
  /* default accent = emerald -> cyan (Option C) */
  --wc-c1:#8cf5c4; --wc-c2:#39d3ff;         /* bright pair: top hairline */
  --wc-ic1:#10a271; --wc-ic2:#0a93c4;       /* deep pair: icon tile + ticks */
  --wc-ink:#0a7fa8;                          /* readable accent ink: eyebrow + link */
  --wc-g1:rgba(140,245,196,.55);             /* corner glow, front */
  --wc-g2:rgba(57,211,255,.40);              /* corner glow, behind */
  --wc-tex:url('/card-wash-light.jpg');
  --wc-sh:0 1px 2px rgba(10,13,18,.04),0 18px 40px -22px rgba(10,13,18,.18);
  --wc-sh-h:0 1px 2px rgba(10,13,18,.05),0 30px 60px -24px rgba(10,13,18,.26);

  position:relative;display:flex;flex-direction:column;gap:14px;
  font-family:"Figtree","Helvetica Neue",system-ui,sans-serif;
  border:1px solid var(--wc-line);border-radius:20px;padding:24px;
  color:var(--wc-tx);overflow:hidden;isolation:isolate;
  background-color:var(--wc-s1);
  box-shadow:var(--wc-sh);
  transition:transform .45s var(--wc-ease),border-color .45s var(--wc-ease),box-shadow .45s var(--wc-ease);
}
.wc-card>*{position:relative;z-index:1}

/* texture slot - a faint LIGHT wash kept under a near-opaque white veil,
   so only a whisper shows through. Dark texture is never used. */
.wc-card.wc-tex{
  background-image:
    linear-gradient(180deg, rgba(255,255,255,.90), rgba(255,255,255,.94)),
    var(--wc-tex);
  background-size:cover,cover;
  background-position:center,var(--wc-tex-pos,center);
  background-repeat:no-repeat,no-repeat;
}

/* top brand hairline */
.wc-card::before{content:"";position:absolute;inset:0 0 auto 0;height:2px;z-index:3;pointer-events:none;
  background:linear-gradient(90deg,var(--wc-c1),var(--wc-c2) 55%,transparent);opacity:.95}

/* corner glow - duotone emerald+cyan cloud, blurred into the top corner,
   drifts inward on hover. Sits over the white surface, under the content. */
.wc-card::after{content:"";position:absolute;z-index:-1;pointer-events:none;
  width:250px;height:250px;right:-80px;top:-130px;border-radius:50%;opacity:.9;
  filter:blur(30px);
  background:
    radial-gradient(circle at 62% 60%, var(--wc-g1), transparent 68%),
    radial-gradient(circle at 42% 42%, var(--wc-g2), transparent 70%);
  transition:transform .6s var(--wc-ease),opacity .6s var(--wc-ease)}

/* theme classes both resolve to LIGHT so no stray dark card can appear */
.wc-card.wc-dark,.wc-card.wc-light{}

/* tone = per-card accent realized as a light Option-C card. Each tone sets the
   full accent set: hairline (c1/c2), icon tile + ticks (ic1/ic2), ink, glow. */
.wc-card.t-cyan{
  --wc-c1:#39d3ff;--wc-c2:#8cf5c4; --wc-ic1:#0a93c4;--wc-ic2:#10a271; --wc-ink:#0a7fa8;
  --wc-g1:rgba(57,211,255,.52);--wc-g2:rgba(140,245,196,.38)}
.wc-card.t-amber{
  --wc-c1:#f5c86b;--wc-c2:#f5a742; --wc-ic1:#e9962b;--wc-ic2:#d67d12; --wc-ink:#8f5a07;
  --wc-g1:rgba(245,200,107,.55);--wc-g2:rgba(245,167,66,.34)}
.wc-card.t-violet{
  --wc-c1:#9b7bff;--wc-c2:#39d3ff; --wc-ic1:#6d4bd8;--wc-ic2:#2f9fd6; --wc-ink:#6d4bd8;
  --wc-g1:rgba(155,123,255,.48);--wc-g2:rgba(57,211,255,.34)}
.wc-card.t-pink{
  --wc-c1:#ff6f93;--wc-c2:#f5a742; --wc-ic1:#e14d74;--wc-ic2:#e0872a; --wc-ink:#c43d66;
  --wc-g1:rgba(255,111,147,.46);--wc-g2:rgba(245,167,66,.32)}
.wc-card.t-danger{
  --wc-c1:#ff9a8f;--wc-c2:#ff7a6b; --wc-ic1:#e5574f;--wc-ic2:#d83a30; --wc-ink:#c0322b;
  --wc-g1:rgba(240,115,111,.42);--wc-g2:rgba(255,154,77,.30)}
.wc-card.t-ok{
  --wc-c1:#8cf5c4;--wc-c2:#39d3ff; --wc-ic1:#12a06b;--wc-ic2:#0a93c4; --wc-ink:#0f7f58;
  --wc-g1:rgba(22,184,119,.42);--wc-g2:rgba(57,211,255,.30)}

/* hover - the glow drifts inward on any card; interactive cards also lift */
.wc-card:hover::after{transform:translate(-16px,18px) scale(1.07);opacity:1}
.wc-card.wc-int{cursor:pointer}
.wc-card.wc-int:hover{transform:translateY(-4px);box-shadow:var(--wc-sh-h);
  border-color:color-mix(in srgb,var(--wc-ink) 32%, var(--wc-line))}

/* reveal */
.wc-card.wc-reveal{opacity:0;transform:translateY(22px)}
.wc-card.wc-reveal.wc-in{opacity:1;transform:none}

/* HEAD - duotone glass icon tile + mono eyebrow + Bricolage title */
.wc-head{display:flex;align-items:center;gap:13px;margin:0}
.wc-head.wc-head-stack{align-items:flex-start}
.wc-ic{flex:0 0 auto;width:46px;height:46px;border-radius:13px;display:grid;place-items:center;position:relative;
  color:var(--wc-icfg);background:linear-gradient(135deg,var(--wc-ic1),var(--wc-ic2));
  box-shadow:inset 0 1px 0 rgba(255,255,255,.45),0 8px 18px -8px var(--wc-ic2)}
.wc-ic::after{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;
  background:linear-gradient(160deg,rgba(255,255,255,.3),rgba(255,255,255,0) 55%)}
.wc-ic>svg{position:relative;z-index:1;width:21px;height:21px}
.wc-htext{display:flex;flex-direction:column;gap:4px;min-width:0}
.wc-eyebrow{font-family:"Figtree","Helvetica Neue",system-ui,sans-serif;font-size:11px;font-weight:600;
  letter-spacing:.08em;text-transform:uppercase;color:var(--wc-ink)}
.wc-title{font-family:"Bricolage Grotesque","Figtree",sans-serif;font-weight:600;
  font-size:clamp(19px,1.8vw,23px);letter-spacing:-.02em;line-height:1.16;margin:0;color:var(--wc-title)}

/* BODY */
.wc-body{color:var(--wc-mut);font-size:14.5px;line-height:1.6;margin:0}

/* POINTS - each tick is a small duotone chip with a white mark */
.wc-points{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px}
.wc-points li{display:flex;gap:10px;align-items:flex-start;font-size:14px;line-height:1.5;color:var(--wc-mut)}
.wc-points li>svg{flex:0 0 auto;width:18px;height:18px;margin-top:1px;border-radius:50%;padding:3px;color:#fff;
  background:linear-gradient(135deg,var(--wc-ic1),var(--wc-ic2));box-shadow:0 4px 10px -5px var(--wc-ic2)}

/* PROOF - the quiet mono "check log" (Option C), LIGHT surface */
.wc-proof{display:flex;align-items:center;flex-wrap:wrap;gap:6px;
  border-radius:12px;padding:11px 13px;position:relative;
  background:linear-gradient(180deg,#f4f8f7,#f8fbfa);
  border:1px solid var(--wc-line);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.9);
  font-family:"JetBrains Mono",ui-monospace,monospace;font-size:11.5px;color:var(--wc-mut);line-height:1.5}
/* shared chip vocabulary - both the new (wc-) and the legacy (cb-/dp-) names */
.wc-proof .wc-chip,.wc-proof .cb-chip,.wc-proof .dp-chip{font-weight:500;color:var(--wc-mut);
  border:1px solid var(--wc-line);background:#ffffff;border-radius:7px;padding:3px 7px;font-size:10.5px;white-space:nowrap}
.wc-proof .wc-arrow,.wc-proof .cb-arrow,.wc-proof .dp-arrow{color:var(--wc-dim);font-weight:500}
.wc-proof .wc-dim,.wc-proof .cb-dim{color:var(--wc-dim)}
.wc-proof b{color:var(--wc-ink);font-weight:600}
.wc-proof .wc-ok,.wc-proof .dp-ok{display:inline-flex;align-items:center;gap:4px;color:#0f7f58;
  background:#e3fbf0;border:1px solid rgba(15,127,88,.22);border-radius:7px;padding:3px 8px;font-size:10.5px;font-weight:600}
.wc-proof .wc-raw,.wc-proof .dp-raw{color:#c0322b;text-decoration:line-through;text-decoration-color:rgba(192,50,43,.5)}
.wc-proof .wc-tok,.wc-proof .dp-tok{color:#0a7fa8;font-weight:600}

/* MEDIA (top visual, e.g. inline SVG) */
.wc-media{margin:0;border-radius:12px;overflow:hidden;line-height:0}

/* LINK - accent ink, arrow drifts right on hover */
.wc-link{align-self:flex-start;display:inline-flex;align-items:center;gap:6px;background:none;border:none;
  padding:0;margin-top:auto;font-family:inherit;font-size:13.5px;font-weight:600;color:var(--wc-ink);cursor:pointer;
  text-decoration:none}
.wc-link>svg{transition:transform .3s var(--wc-ease)}
.wc-card:hover .wc-link>svg{transform:translateX(3px)}

@media(max-width:560px){ .wc-card{padding:18px;border-radius:18px} }

@media(prefers-reduced-motion:reduce){
  .wc-card{transition:none}
  .wc-card:hover::after{transform:none}
  .wc-card.wc-int:hover{transform:none}
  .wc-card.wc-reveal{opacity:1;transform:none}
  .wc-link>svg{transition:none}
}
`
