// The Company Brain section of the organization home page: three benefit
// points, the one flow visual (BrainFlowArt, shared with the full page) and a
// link to /workcopilot/company-brain. Benefit-first lines, no wall of text.
// Copy: companyBrainPage.home.* (the section renders only where companies
// exist, so the individuals edition never reads it). Its own module, mounted
// by src/pages/WorkMarketing.jsx with one line.
import { BrainCircuit, BookOpenCheck, TrendingUp, Lock, ArrowRight } from 'lucide-react'
import BrainFlowArt from './BrainFlowArt.jsx'
import { useT } from '../../i18n/index.jsx'

export const COMPANY_BRAIN_PATH = '/workcopilot/company-brain'
const POINT_ICONS = [BookOpenCheck, TrendingUp, Lock]

export default function CompanyBrainSection({ className = '' }) {
  const t = useT()
  const points = t('companyBrainPage.home.points') || []
  return (
    <section className={`wcb-home ${className}`.trim()} id="company-brain" aria-labelledby="wcb-home-h">
      <style>{CSS}</style>
      <div className="wcb-home-wrap">
        <div className="wcb-home-grid">
          <div className="wcb-home-copy" data-reveal>
            <div className="wcb-home-eyebrow"><BrainCircuit size={14} aria-hidden="true" /> {t('companyBrainPage.home.eyebrow')}</div>
            <h2 id="wcb-home-h">{t.rich('companyBrainPage.home.h2')}</h2>
            <p className="wcb-home-sub">{t('companyBrainPage.home.sub')}</p>
            <ul className="wcb-home-points">
              {points.map((p, i) => { const Ic = POINT_ICONS[i] || BookOpenCheck; return (
                <li key={p.t}><span className="wcb-home-ic" aria-hidden="true"><Ic size={17} /></span><div><b>{p.t}</b><p>{p.d}</p></div></li>
              ) })}
            </ul>
            <a className="wcb-home-cta" href={COMPANY_BRAIN_PATH}>{t('companyBrainPage.home.cta')} <ArrowRight size={15} aria-hidden="true" /></a>
          </div>
          <div className="wcb-home-visual" data-reveal><BrainFlowArt /></div>
        </div>
      </div>
    </section>
  )
}

const CSS = `
/* The art reads the enterprise-page token names; map them onto the home
   page's own light tokens here so the one SVG renders identically on both. */
.wcb-home{border-top:1px solid var(--line,#e2e7f0);
  --cyan:var(--em2,#0a84c2);--em-fill:rgba(14,159,110,.08);--em-line:rgba(14,159,110,.30);--line-2:#d3d7e5;
  --amber:#b7791f;--amber-line:rgba(183,121,31,.34);--cta:#f26a43}
.wcb-home-wrap{max-width:1160px;margin:0 auto;padding:0 24px;position:relative;z-index:3}
.wcb-home-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:40px 56px;align-items:center}
.wcb-home-copy{min-width:0}
.wcb-home-eyebrow{display:inline-flex;align-items:center;gap:7px;font-size:12.5px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--em,#0e9f6e);margin-bottom:14px;max-width:100%}
.wcb-home-eyebrow svg{flex:none}
.wcb-home h2{font-family:"Bricolage Grotesque",sans-serif;font-weight:800;font-size:clamp(28px,4.2vw,44px);letter-spacing:-.025em;line-height:1.06;margin:0 0 14px;color:var(--ink-brand,var(--tx,#0c1222));text-wrap:balance}
.wcb-home h2 em{font-style:normal;background:linear-gradient(120deg,var(--em,#0e9f6e),var(--em2,#0a84c2));-webkit-background-clip:text;background-clip:text;color:transparent}
/* doubled with the root so the host page's element rules (.wm p{margin:0}) never win */
.wcb-home .wcb-home-sub{margin:0 0 22px;color:var(--mut,#3f4a5c);font-size:16.5px;line-height:1.55;max-width:56ch}
.wcb-home-points{list-style:none;margin:0 0 22px;padding:0;display:grid;gap:14px}
.wcb-home-points li{display:flex;gap:12px;align-items:flex-start;min-width:0}
.wcb-home-points li>div{min-width:0}
.wcb-home-points b{display:block;font-size:15.5px;font-weight:700;color:var(--tx,#0c1222);line-height:1.3}
.wcb-home .wcb-home-points p{margin:3px 0 0;font-size:14.5px;line-height:1.5;color:var(--mut,#3f4a5c)}
.wcb-home-ic{display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:11px;flex:none;color:#07784f;background:rgba(10,157,102,.1);border:1px solid rgba(10,157,102,.22);margin-top:1px}
.wcb-home-cta{display:inline-flex;align-items:center;justify-content:center;gap:8px;background:#fff;color:var(--ink-brand,#062a22);border:1px solid var(--line,#e2e7f0);border-radius:12px;padding:12px 18px;font-weight:700;font-size:15px;white-space:nowrap;box-shadow:0 1px 2px rgba(6,42,34,.05);transition:transform .15s,border-color .15s,color .15s;max-width:100%}
.wcb-home-cta:hover{border-color:var(--em2,#0a84c2);color:var(--em2,#0a84c2);transform:translateY(-2px)}
.wcb-home-cta svg{flex:none}
[dir="rtl"] .wcb-home-cta svg{transform:scaleX(-1)}
.wcb-home-visual{min-width:0}
.wcb-home-visual .cbf{display:block;width:100%;height:auto;filter:drop-shadow(0 18px 30px rgba(26,31,54,.14))}
@media(max-width:900px){.wcb-home-grid{grid-template-columns:1fr;gap:30px}.wcb-home-visual{order:2;max-width:560px}}
@media(max-width:560px){.wcb-home-cta{width:100%;white-space:normal;text-align:center}}
@media(prefers-reduced-motion:reduce){.wcb-home-cta{transition:none}}
`
