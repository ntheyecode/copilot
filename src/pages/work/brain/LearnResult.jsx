// The result moment after a document was learned ("Learned 7 things from How
// I work.docx", "refreshed" when the same document came again, "N private
// details were masked", the long-document note) and the error banner, every
// line actionable. Strings: brainPage.result.*, brainPage.errors.*.
import { Sparkles, AlertTriangle, X } from 'lucide-react'
import { useT } from '../../../i18n/index.jsx'
import { resultLines } from './brainModel.js'

// The result as sentences, in order (the banner shows them; the page's live
// region announces them).
export function resultSentences(t, result) {
  const lines = resultLines(result)
  if (!lines.length) return []
  return [...lines.map((l) => (l.key === 'truncated' ? t('brainPage.result.truncated') : t.n(`brainPage.result.${l.key}`, l.n, l.vars))), t('brainPage.result.deleted')]
}

export function ResultBanner({ result, onDismiss }) {
  const t = useT()
  const sentences = resultSentences(t, result)
  if (!sentences.length) return null
  return (
    <div className="wd-brain-result" data-testid="brain-result">
      <Sparkles size={18} />
      <div>
        {sentences.map((s, i) => <span key={i} className={`wd-brain-result-l${i === 0 ? ' first' : ''}`}>{s}</span>)}
      </div>
      <button type="button" className="wd-brain-x" onClick={onDismiss} aria-label={t('brainPage.result.dismiss')}><X size={15} /></button>
    </div>
  )
}

// `err` = { key, upgrade, max, name } from useBrain. The cap line carries the
// upgrade link where personal plans are sold.
export function ErrorBanner({ err, upgradeHref, canUpgrade, onDismiss, onRetry }) {
  const t = useT()
  if (!err) return null
  const vars = { max: err.max || 0, name: err.name || '' }
  return (
    <div className="wd-brain-err" role="alert" data-testid="brain-error">
      <AlertTriangle size={18} />
      <div>
        {t(`brainPage.errors.${err.key}`, vars)}
        {err.upgrade && canUpgrade && upgradeHref && <> <a href={upgradeHref}>{t('brainPage.errors.capUpgrade')}</a></>}
        {onRetry && <> <button type="button" className="wd-brain-link" onClick={onRetry}>{t('brainPage.errors.retry')}</button></>}
      </div>
      {onDismiss && <button type="button" className="wd-brain-x" onClick={onDismiss} aria-label={t('brainPage.result.dismiss')}><X size={15} /></button>}
    </div>
  )
}
