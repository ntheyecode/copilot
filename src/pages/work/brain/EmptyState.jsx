// Nothing learned yet: teaches what to upload (how you work, your tools, your
// conventions, checklists) and what to leave out. Strings: brainPage.empty.*.
import { Lightbulb, FileText, AlertTriangle } from 'lucide-react'
import { useT, renderRich } from '../../../i18n/index.jsx'

export default function EmptyState() {
  const t = useT()
  const ideas = t('brainPage.empty.ideas')
  return (
    <div className="wd-brain-empty" data-testid="brain-empty">
      <span className="wd-ic ai"><Lightbulb size={17} /></span>
      <div>
        <span className="wd-brain-empty-t">{t('brainPage.empty.title')}</span>
        <span className="wd-brain-empty-l">{t('brainPage.empty.lead')}</span>
        <ul className="wd-brain-ideas">
          {(Array.isArray(ideas) ? ideas : []).map((s, i) => <li key={i}><FileText size={15} /><span>{renderRich(s)}</span></li>)}
        </ul>
        <p className="wd-brain-empty-s"><AlertTriangle size={14} /><span>{t('brainPage.empty.skip')}</span></p>
      </div>
    </div>
  )
}
