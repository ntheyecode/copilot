// "3 of 5 documents": how many documents the plan learns from, with the
// upgrade path once the limit is reached (only where personal plans are sold).
// Strings: brainPage.meter.*.
import { FileText, Sparkles } from 'lucide-react'
import { useT } from '../../../i18n/index.jsx'

export default function DocMeter({ meter, upgradeHref, canUpgrade }) {
  const t = useT()
  if (!meter || !meter.max) return null
  return (
    <div className="wd-brain-meter">
      <span className={`wd-brain-meter-n${meter.reached ? ' full' : ''}`} title={t('brainPage.meter.tip')}>
        <FileText size={13} aria-hidden="true" /> {t('brainPage.meter.docs', { used: meter.used, max: meter.max })}
      </span>
      {meter.reached && canUpgrade && upgradeHref && (
        <a className="wd-brain-meter-up" href={upgradeHref} aria-label={t('brainPage.meter.upgradeAria')}><Sparkles size={13} /> {t('brainPage.meter.upgrade')}</a>
      )}
    </div>
  )
}
