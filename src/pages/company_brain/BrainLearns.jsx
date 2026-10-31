// "How it learns": the three sources of the Company Brain (your documents,
// your trainers' recorded workflows, the tasks your people finish), each with
// its proof chips, and the precedence note (a published workflow beats a
// learned pattern). Copy: companyBrainPage.learn.*; icons by position.
import { FileText, Hand, CheckCheck, Sparkles, Info, Check } from 'lucide-react'
import { useT } from '../../i18n/index.jsx'
import { HL } from './rich.jsx'

const SOURCE_META = [
  { icon: FileText, k: '01' },
  { icon: Hand, k: '02' },
  { icon: CheckCheck, k: '03' },
]

export default function BrainLearns() {
  const t = useT()
  const sources = t('companyBrainPage.learn.sources').map((s, i) => ({ ...SOURCE_META[i], ...s }))
  return (
    <section className="wcb-sec prime" id="learn">
      <div className="wcb-sec-head">
        <div className="wcb-eyebrow warm"><Sparkles size={14} aria-hidden="true" /> {t('companyBrainPage.learn.eyebrow')}</div>
        <h2>{t.rich('companyBrainPage.learn.h2', null, HL)}</h2>
        <p className="wcb-lead">{t('companyBrainPage.learn.lead')}</p>
      </div>
      <ol className="wcb-sources">
        {sources.map((s) => (
          <li key={s.k} className="wcb-source">
            <div className="wcb-source-top"><span className="wcb-source-ic"><s.icon size={19} aria-hidden="true" /></span><span className="wcb-source-k">{s.k}</span></div>
            <b>{s.t}</b>
            <p>{s.d}</p>
            <div className="wcb-chips">{s.chips.map((c) => <span key={c} className="wcb-chip"><Check size={12} aria-hidden="true" /> {c}</span>)}</div>
          </li>
        ))}
      </ol>
      <p className="wcb-note"><Info size={15} aria-hidden="true" /> {t('companyBrainPage.learn.note')}</p>
    </section>
  )
}
