// Home PRIVACY: three points + the masking visual on a lavender stage, and the
// link to the privacy page. Strings: indiv.home.privacy.*.
import { ArrowRight, Check } from 'lucide-react'
import MaskVisual from '../../visuals/MaskVisual.jsx'

export default function PrivacyBand({ t }) {
  const points = t('indiv.home.privacy.points') || []
  return (
    <section className="ln-sec tint" aria-labelledby="lnhm-priv">
      <style>{CSS}</style>
      <div className="ln-wrap ln-band flip">
        <div data-reveal>
          <div className="ln-eyebrow">{t('indiv.home.privacy.eyebrow')}</div>
          <h2 id="lnhm-priv">{t.rich('indiv.home.privacy.h2')}</h2>
          <ul className="lnhm-priv">
            {points.map((p) => <li key={p.t}><span className="ln-tick"><Check size={13} aria-hidden /></span><div><b>{p.t}</b><span>{p.d}</span></div></li>)}
          </ul>
          <a className="ln-btn link" href="/workcopilot/security">{t('indiv.home.privacy.cta')} <ArrowRight size={15} aria-hidden className="ln-arrow" /></a>
        </div>
        <div className="ln-band-visual" data-reveal><div className="ln-stage"><MaskVisual compact /></div></div>
      </div>
    </section>
  )
}

const CSS = `
.lnhm-priv{list-style:none;margin:26px 0 28px;padding:0;display:flex;flex-direction:column;gap:18px}
.lnhm-priv li{display:flex;gap:12px;align-items:flex-start}
.lnhm-priv b{display:block;font-size:17px;color:var(--ln-ink);font-family:var(--ln-display);letter-spacing:-.01em}
.lnhm-priv span:not(.ln-tick){display:block;font-size:15.5px;color:var(--ln-ink-2);margin-top:3px;line-height:1.55}
`
