// "Where screen sharing is not an option": the camera-reading section of the
// organization home page (operations, OT and industrial teams). The camera
// reads the panel or machine screen, the guide gives the exact next step and
// catches a wrong turn, frames are masked on the device, the company
// administrator turns it on, and it is read-only. Benefit-first lines, one
// visual (CameraPanelVisual), no wall of text. Copy: home.camera.* (the
// section renders only where companies exist, so the individuals edition
// never reads it). Its own module, mounted by src/pages/WorkMarketing.jsx.
import { Camera, ScanEye, ListChecks, AlertTriangle, ShieldCheck, Lock, ArrowRight } from 'lucide-react'
import CameraPanelVisual from './CameraPanelVisual.jsx'
import { CONTACT_PATH } from '../../edition/surfaces.js'
import { useT } from '../../i18n/index.jsx'

const POINT_ICONS = [ScanEye, ListChecks, AlertTriangle, ShieldCheck]

export default function CameraReadSection({ className = '' }) {
  const t = useT()
  const points = t('home.camera.points') || []
  return (
    <section className={`wcr ${className}`.trim()} id="camera" aria-labelledby="wcr-h">
      <style>{CSS}</style>
      <div className="wcr-wrap">
        <div className="wcr-grid">
          <div className="wcr-copy" data-reveal>
            <div className="wcr-eyebrow"><Camera size={14} aria-hidden="true" /> {t('home.camera.eyebrow')}</div>
            <h2 id="wcr-h">{t.rich('home.camera.h2')}</h2>
            <p className="wcr-sub">{t('home.camera.sub')}</p>
            <ul className="wcr-points">
              {points.map((p, i) => { const Ic = POINT_ICONS[i] || ScanEye; return (
                <li key={p.t}><span className={`wcr-ic${i === 2 ? ' warn' : ''}`} aria-hidden="true"><Ic size={17} /></span><div><b>{p.t}</b><p>{p.d}</p></div></li>
              ) })}
            </ul>
            <p className="wcr-admin"><Lock size={14} aria-hidden="true" /> {t('home.camera.admin')}</p>
            <a className="wcr-cta" href={CONTACT_PATH}>{t('home.camera.cta')} <ArrowRight size={15} aria-hidden="true" /></a>
          </div>
          <div className="wcr-visual" data-reveal><CameraPanelVisual /></div>
        </div>
      </div>
    </section>
  )
}

const CSS = `
.wcr{border-top:1px solid var(--line,#e2e7f0)}
.wcr-wrap{max-width:1160px;margin:0 auto;padding:0 24px;position:relative;z-index:3}
.wcr-grid{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,.95fr);gap:40px 56px;align-items:center}
.wcr-copy{min-width:0}
.wcr-eyebrow{display:inline-flex;align-items:center;gap:7px;font-size:12.5px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--em,#0e9f6e);margin-bottom:14px;max-width:100%}
.wcr-eyebrow svg{flex:none}
.wcr h2{font-family:"Bricolage Grotesque",sans-serif;font-weight:800;font-size:clamp(28px,4.2vw,44px);letter-spacing:-.025em;line-height:1.06;margin:0 0 14px;color:var(--ink-brand,var(--tx,#0c1222));text-wrap:balance}
.wcr h2 em{font-style:normal;background:linear-gradient(120deg,var(--em,#0e9f6e),var(--em2,#0a84c2));-webkit-background-clip:text;background-clip:text;color:transparent}
/* .wcr-prefixed selectors are doubled with the root so the host page's own
   element rules (.wm p{margin:0}) never win on specificity */
.wcr .wcr-sub{margin:0 0 22px;color:var(--mut,#3f4a5c);font-size:16.5px;line-height:1.55;max-width:56ch}
.wcr-points{list-style:none;margin:0 0 20px;padding:0;display:grid;gap:14px}
.wcr-points li{display:flex;gap:12px;align-items:flex-start;min-width:0}
.wcr-points li>div{min-width:0}
.wcr-points b{display:block;font-size:15.5px;font-weight:700;color:var(--tx,#0c1222);line-height:1.3}
.wcr .wcr-points p{margin:3px 0 0;font-size:14.5px;line-height:1.5;color:var(--mut,#3f4a5c)}
.wcr-ic{display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:11px;flex:none;color:#07784f;background:rgba(10,157,102,.1);border:1px solid rgba(10,157,102,.22);margin-top:1px}
.wcr-ic.warn{color:#8a4b00;background:rgba(255,154,77,.14);border-color:rgba(255,154,77,.4)}
.wcr .wcr-admin{display:flex;align-items:flex-start;gap:8px;margin:0 0 20px;font-size:13.5px;line-height:1.45;color:var(--mut,#3f4a5c)}
.wcr-admin svg{color:var(--em,#0e9f6e);flex:none;margin-top:3px}
.wcr-cta{display:inline-flex;align-items:center;justify-content:center;gap:8px;background:#fff;color:var(--ink-brand,#062a22);border:1px solid var(--line,#e2e7f0);border-radius:12px;padding:12px 18px;font-weight:700;font-size:15px;white-space:nowrap;box-shadow:0 1px 2px rgba(6,42,34,.05);transition:transform .15s,border-color .15s,color .15s;max-width:100%}
.wcr-cta:hover{border-color:var(--em2,#0a84c2);color:var(--em2,#0a84c2);transform:translateY(-2px)}
.wcr-cta svg{flex:none}
[dir="rtl"] .wcr-cta svg{transform:scaleX(-1)}
.wcr-visual{min-width:0}
@media(max-width:900px){.wcr-grid{grid-template-columns:1fr;gap:30px}.wcr-visual{order:2}}
@media(max-width:560px){.wcr-cta{width:100%}}
@media(prefers-reduced-motion:reduce){.wcr-cta{transition:none}}
`
