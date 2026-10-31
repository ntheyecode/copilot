// "How it works": the flow diagram (BrainFlowArt, shared with the home-page
// section) beside the four stages (gather, mask, seal, guide).
// Copy: companyBrainPage.how.*
import { Workflow } from 'lucide-react'
import BrainFlowArt from '../../components/company_brain/BrainFlowArt.jsx'
import { useT } from '../../i18n/index.jsx'

export default function BrainHow() {
  const t = useT()
  return (
    <section className="wcb-sec" id="how">
      <div className="wcb-sec-head">
        <div className="wcb-eyebrow"><Workflow size={14} aria-hidden="true" /> {t('companyBrainPage.how.eyebrow')}</div>
        <h2>{t('companyBrainPage.how.h2')}</h2>
        <p className="wcb-lead">{t('companyBrainPage.how.lead')}</p>
      </div>
      <div className="wcb-how-in">
        <div className="wcb-how-art"><BrainFlowArt /></div>
        <ol className="wcb-stages">
          {t('companyBrainPage.how.steps').map((s, i) => (
            <li key={s.t} className="wcb-stage">
              <span className="wcb-stage-n" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
              <div><b>{s.t}</b><p>{s.d}</p></div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
