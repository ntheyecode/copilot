// "How it is used": six cards on what the brain changes in the guidance
// (grounded in your apps, the source is named, sharper with use, knowledge
// spaces, honest when empty or locked, read-only as always).
// Copy: companyBrainPage.use.*; icons and tones by position.
import { AppWindow, Quote, TrendingUp, FolderKanban, MessageSquareOff, Hand } from 'lucide-react'
import { useT } from '../../i18n/index.jsx'
import { HL } from './rich.jsx'

const CARD_META = [
  { icon: AppWindow },
  { icon: Quote, tone: 'cyan' },
  { icon: TrendingUp },
  { icon: FolderKanban, tone: 'cyan' },
  { icon: MessageSquareOff, tone: 'amber' },
  { icon: Hand },
]

export default function BrainUsed() {
  const t = useT()
  return (
    <section className="wcb-sec" id="use">
      <div className="wcb-sec-head">
        <div className="wcb-eyebrow"><AppWindow size={14} aria-hidden="true" /> {t('companyBrainPage.use.eyebrow')}</div>
        <h2>{t.rich('companyBrainPage.use.h2', null, HL)}</h2>
        <p className="wcb-lead">{t('companyBrainPage.use.lead')}</p>
      </div>
      <div className="wcb-grid">
        {t('companyBrainPage.use.cards').map((c, i) => {
          const m = CARD_META[i] || CARD_META[0]
          return (
            <div key={c.t} className={`wcb-feat${m.tone ? ` ${m.tone}` : ''}`}>
              <span className="wcb-ic"><m.icon size={18} aria-hidden="true" /></span>
              <b>{c.t}</b>
              <p>{c.d}</p>
            </div>
          )
        })}
      </div>
    </section>
  )
}
