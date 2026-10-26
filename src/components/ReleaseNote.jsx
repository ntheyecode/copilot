// ReleaseNote - a small, self-contained "new in this release" block shared by the
// marketing pages. Every string is localized (reads the rel.* catalog, 16
// languages); only icons and the group keys live here. Drop it on any page:
//   <ReleaseNote groups={['global','privacy','billing','enterprise']} withHeader />  // home
//   <ReleaseNote groups={['billing']} />                                             // pricing, etc.
//
// It ships its own scoped CSS (white-in-product, marketing palette: emerald/cyan,
// Figtree/Bricolage) so it looks the same on every page regardless of that page's
// own styles. Design-time quality gate: the card grid is auto-fit and collapses
// 4 -> 2 -> 1 columns with no overflow or clipping at wide or narrow widths; the
// check bullets wrap, and headings/eyebrows never clip. RTL via the document dir.
import React from 'react'
import { Globe2, ShieldCheck, CreditCard, Building2, Check } from 'lucide-react'
import { useT } from '../i18n/index.jsx'

const ICONS = { global: Globe2, privacy: ShieldCheck, billing: CreditCard, enterprise: Building2 }

export default function ReleaseNote({ groups = [], withHeader = false }) {
  const t = useT()
  const list = groups.filter((g) => ICONS[g])
  if (!list.length) return null
  const single = list.length === 1
  return (
    <section className={`rn${single ? ' rn-single' : ''}`} aria-label={t('rel.title')}>
      <style>{CSS}</style>
      <div className="rn-in">
        {withHeader && (
          <header className="rn-head">
            <h2>{t('rel.title')}</h2>
            <p>{t('rel.sub')}</p>
          </header>
        )}
        <div className="rn-grid">
          {list.map((g) => {
            const Ic = ICONS[g]
            const points = t(`rel.${g}.points`)
            return (
              <article className="rn-card" key={g}>
                <div className="rn-top">
                  <span className="rn-ic" aria-hidden="true"><Ic size={18} /></span>
                  <span className="rn-eyebrow">{t(`rel.${g}.eyebrow`)}</span>
                </div>
                <h3 className="rn-h">{t(`rel.${g}.h`)}</h3>
                <ul className="rn-pts">
                  {(Array.isArray(points) ? points : []).map((p, i) => (
                    <li key={i}><Check size={15} aria-hidden="true" /><span>{p}</span></li>
                  ))}
                </ul>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}

const CSS = `
.rn{--rn-ink:#161a2b;--rn-mut:#5c6484;--rn-line:#e6e8f1;--rn-panel:#ffffff;--rn-bg:#f3f5fb;--rn-em:#0e9f6e;--rn-em2:#0a84c2;--rn-fill:rgba(14,159,110,.08);
  font-family:"Figtree",-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;-webkit-font-smoothing:antialiased;color:var(--rn-ink)}
[data-theme='dark'] .rn{--rn-ink:#eef0f6;--rn-mut:#a3a9bd;--rn-line:rgba(255,255,255,.1);--rn-panel:#13141f;--rn-bg:#0a0b12;--rn-em:#8cf5c4;--rn-em2:#39d3ff;--rn-fill:rgba(140,245,196,.1)}
.rn *{box-sizing:border-box}
.rn-in{max-width:1160px;margin:0 auto;padding:36px 24px}
.rn-head{text-align:center;max-width:640px;margin:0 auto 22px}
.rn-head h2{font-family:"Bricolage Grotesque","Figtree",sans-serif;font-weight:800;font-size:28px;line-height:1.12;letter-spacing:-.02em;margin:0 0 8px;color:var(--rn-ink)}
.rn-head p{margin:0;font-size:15.5px;line-height:1.55;color:var(--rn-mut)}
.rn-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(248px,1fr));gap:16px;align-items:stretch}
.rn-single .rn-grid{grid-template-columns:minmax(0,1fr);max-width:720px;margin:0 auto}
.rn-card{min-width:0;background:var(--rn-panel);border:1px solid var(--rn-line);border-radius:16px;padding:20px 20px 18px;
  box-shadow:0 1px 2px rgba(10,13,22,.04),0 16px 34px -26px rgba(10,13,22,.3);display:flex;flex-direction:column;gap:12px}
.rn-top{display:flex;align-items:center;gap:10px;min-width:0}
.rn-ic{flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:10px;color:#fff;background:linear-gradient(135deg,var(--rn-em),var(--rn-em2))}
.rn-eyebrow{min-width:0;font-size:11.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--rn-em2);overflow-wrap:anywhere}
[data-theme='dark'] .rn-eyebrow{color:var(--rn-em)}
.rn-h{margin:0;font-family:"Bricolage Grotesque","Figtree",sans-serif;font-weight:700;font-size:18px;line-height:1.25;letter-spacing:-.01em;color:var(--rn-ink);overflow-wrap:anywhere}
.rn-pts{list-style:none;margin:2px 0 0;padding:0;display:flex;flex-direction:column;gap:9px}
.rn-pts li{display:flex;align-items:flex-start;gap:9px;font-size:13.5px;line-height:1.5;color:var(--rn-mut);min-width:0}
.rn-pts li>svg{flex:0 0 auto;margin-top:2px;color:var(--rn-em)}
.rn-pts li>span{min-width:0;overflow-wrap:anywhere}
[dir="rtl"] .rn-eyebrow{letter-spacing:0}
@media(max-width:640px){
  .rn-in{padding:28px 16px}
  .rn-head h2{font-size:23px}
  .rn-card{padding:18px 16px 16px}
}
`
