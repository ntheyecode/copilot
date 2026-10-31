// "For admins and executives": what leaders can see (the inventory, who
// recorded what, the productivity picture, the audit trail), never a
// colleague's raw session. Copy: companyBrainPage.leaders.*; icons by position.
import { BarChart3, Database, Users, History } from 'lucide-react'
import { useT } from '../../i18n/index.jsx'

const ICONS = [Database, Users, BarChart3, History]

export default function BrainLeaders() {
  const t = useT()
  return (
    <section className="wcb-sec" id="leaders">
      <div className="wcb-sec-head">
        <div className="wcb-eyebrow"><BarChart3 size={14} aria-hidden="true" /> {t('companyBrainPage.leaders.eyebrow')}</div>
        <h2>{t('companyBrainPage.leaders.h2')}</h2>
        <p className="wcb-lead">{t('companyBrainPage.leaders.lead')}</p>
      </div>
      <div className="wcb-grid four">
        {t('companyBrainPage.leaders.items').map((c, i) => {
          const Icon = ICONS[i] || Database
          return (
            <div key={c.t} className="wcb-feat">
              <span className="wcb-ic"><Icon size={18} aria-hidden="true" /></span>
              <b>{c.t}</b>
              <p>{c.d}</p>
            </div>
          )
        })}
      </div>
    </section>
  )
}
