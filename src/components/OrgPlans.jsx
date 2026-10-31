// The ways an organization can run WorkCoPilot, as three cards: hosted by
// AdmireVeda, managed by AdmireVeda, and a private instance in the customer's
// own cloud with its own AI keys. Shown wherever personal plans are not sold
// (individual_plans off), on the home page.
//
// No prices (owner, 2026-10-31): admireveda.com publishes no rates; every card
// leads to the sales conversation. The rates live only in server/org_pricing.js
// for the superadmin's contracts and invoices.
import { ArrowRight, Building2, Cloud, Server, Check } from 'lucide-react'
import { useT } from '../i18n/index.jsx'
import { ORG_PLANS } from '../../server/org_pricing.js'

const ICON = { hosted: Building2, managed: Cloud, private: Server }
const POPULAR = 'hosted'

export default function OrgPlans({ compact = false }) {
  const t = useT()
  return (
    <div className={`orgp${compact ? ' compact' : ''}`}>
      <style>{CSS}</style>
      <div className="orgp-grid" role="list">
        {ORG_PLANS.map((p) => {
          const Ic = ICON[p.id] || Building2
          const c = t(`edition.orgPlans.${p.id}`) || {}
          const pop = p.id === POPULAR
          return (
            <article key={p.id} className={`orgp-card${pop ? ' pop' : ''}`} role="listitem" id={`orgp-${p.id}`} data-testid={`orgp-${p.id}`}>
              {pop && <div className="orgp-tag">{t('edition.orgPlans.popular')}</div>}
              <h3 className="orgp-name"><Ic size={17} aria-hidden="true" /> <span>{c.name}</span></h3>
              <p className="orgp-lead">{c.lead}</p>
              <ul>{[c.p1, c.p2, c.p3].filter(Boolean).map((x) => <li key={x}><Check size={15} aria-hidden="true" /><span>{x}</span></li>)}</ul>
              <a className={`orgp-btn${pop ? '' : ' alt'}`} href="/workcopilot/contact">{t('edition.orgPlans.cta')} <ArrowRight size={15} aria-hidden="true" /></a>
            </article>
          )
        })}
      </div>
    </div>
  )
}

// Scoped (orgp-), light and dark via [data-theme], and nothing that can wrap
// or overflow: cards stack to one column below 860px, names never clip.
const CSS = `
.orgp{--o-ink:#161a2b;--o-mut:#5c6484;--o-line:#e6e8f1;--o-panel:#fff;--o-em:#0e9f6e;--o-emf:rgba(16,162,113,.08);--o-cta:#f26a43;max-width:1080px;margin:0 auto;padding:0 16px}
[data-theme='dark'] .orgp{--o-ink:#eef0f6;--o-mut:#9aa0b4;--o-line:rgba(255,255,255,.1);--o-panel:#13141f;--o-em:#8cf5c4;--o-emf:rgba(140,245,196,.08)}
.orgp *{box-sizing:border-box}
.orgp.compact{margin-top:36px;padding:0}
.orgp-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}
.orgp-card{position:relative;background:var(--o-panel);border:1px solid var(--o-line);border-radius:18px;padding:24px 22px 22px;display:flex;flex-direction:column;min-width:0;color:var(--o-ink)}
.orgp-card.pop{border-color:var(--o-em);box-shadow:0 10px 30px -18px rgba(14,159,110,.55)}
.orgp-tag{position:absolute;top:-11px;left:22px;background:var(--o-em);color:#fff;font-size:11.5px;font-weight:700;padding:3px 10px;border-radius:999px;white-space:nowrap}
[data-theme='dark'] .orgp-tag{color:#0a0b12}
.orgp-name{display:flex;align-items:center;gap:8px;font-size:17px;font-weight:800;margin:4px 0 10px;min-width:0}
.orgp-name svg{flex-shrink:0;color:var(--o-em)}
.orgp-name span{min-width:0;overflow-wrap:anywhere}
.orgp-price{display:flex;flex-direction:column;gap:2px;margin:0 0 10px}
.orgp-amt{font-size:30px;font-weight:800;letter-spacing:-.02em;line-height:1.1;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
.orgp-per{font-size:13px;color:var(--o-mut)}
.orgp-flat{font-size:13.5px;font-weight:700;color:var(--o-em);margin:0 0 12px;padding:8px 10px;border-radius:10px;background:var(--o-emf)}
.orgp-bands{width:100%;border-collapse:collapse;margin:0 0 12px;font-size:13.5px}
.orgp-bands th{text-align:left;font-weight:500;color:var(--o-mut);padding:5px 0;border-top:1px solid var(--o-line)}
.orgp-bands td{text-align:right;font-weight:700;padding:5px 0;border-top:1px solid var(--o-line);font-variant-numeric:tabular-nums;white-space:nowrap}
.orgp-lead{color:var(--o-mut);font-size:14.5px;line-height:1.5;margin:0 0 14px}
.orgp-card ul{list-style:none;margin:0 0 18px;padding:0;display:grid;gap:8px;flex:1;align-content:start}
.orgp-card li{display:flex;gap:8px;align-items:flex-start;font-size:14px;line-height:1.45}
.orgp-card li svg{flex-shrink:0;margin-top:2px;color:var(--o-em)}
.orgp-card li span{min-width:0;overflow-wrap:anywhere}
.orgp-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:44px;border-radius:11px;background:var(--o-cta);color:#fff;font-weight:700;font-size:14.5px;text-decoration:none;white-space:nowrap;padding:0 16px}
.orgp-btn.alt{background:transparent;color:var(--o-ink);border:1px solid var(--o-line)}
.orgp-btn:hover{filter:brightness(1.05)}
.orgp-note{text-align:center;color:var(--o-mut);font-size:13.5px;margin:18px 0 0}
@media (max-width:860px){.orgp-grid{grid-template-columns:1fr}}
`
