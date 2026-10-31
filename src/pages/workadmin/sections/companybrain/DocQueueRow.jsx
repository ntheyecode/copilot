// One file in the "Add documents" queue: its name, the phase it is in
// (waiting, reading the file, masking and storing), then its outcome as plain
// sentences ("Added: 14 passages from Change Playbook.docx", "Replaced the
// earlier version", "3 private details were masked", "Already up to date") or
// one actionable error line (a locked brain points at the unlock control).
// Compact: one line of name + state, the sentences under it. Strings:
// companyBrain.add.*.
import { Loader2, CheckCircle2, AlertTriangle, Clock, X, RotateCcw, Lock } from 'lucide-react'
import { useT } from '../../../../i18n/index.jsx'
import { resultLines } from './uploadModel.js'
import { fmtBytes } from './fmtBytes.js'

// Phase -> its label key (literal keys, so the keys-exist gate sees them).
const PHASE_LABEL = {
  queued: 'companyBrain.add.status.queued',
  reading: 'companyBrain.add.status.reading',
  storing: 'companyBrain.add.status.storing',
  done: 'companyBrain.add.status.done',
  failed: 'companyBrain.add.status.failed',
}
const ERROR_LABEL = {
  type: 'companyBrain.add.errors.type',
  size: 'companyBrain.add.errors.size',
  read: 'companyBrain.add.errors.read',
  noText: 'companyBrain.add.errors.noText',
  locked: 'companyBrain.add.errors.locked',
  rate: 'companyBrain.add.errors.rate',
  forbidden: 'companyBrain.add.errors.forbidden',
  server: 'companyBrain.add.errors.server',
}

// The sentences of a finished row, in order (the row shows them; the live
// region announces the first).
export function rowSentences(t, item) {
  if (item.phase === 'done') return resultLines(item.result, item.name).map((l) => t.n(`companyBrain.add.result.${l.key}`, l.n, l.vars))
  if (item.phase === 'failed') return [t(ERROR_LABEL[item.error && item.error.key] || ERROR_LABEL.server)]
  return []
}

export default function DocQueueRow({ item, onRetry, onDismiss, onOpenUnlock }) {
  const t = useT()
  const busy = item.phase === 'reading' || item.phase === 'storing'
  const icon = item.phase === 'done' ? <CheckCircle2 size={15} />
    : item.phase === 'failed' ? (item.error && item.error.locked ? <Lock size={15} /> : <AlertTriangle size={15} />)
    : busy ? <Loader2 size={15} className="wka-brain-spin" /> : <Clock size={15} />
  const sentences = rowSentences(t, item)
  return (
    <li className={`wka-brain-qrow ${item.phase}`} data-testid="brain-add-row" data-phase={item.phase}>
      <span className="wka-brain-qic" aria-hidden="true">{icon}</span>
      <div className="wka-brain-qbody">
        <div className="wka-brain-qhead">
          <span className="wka-brain-qname" title={item.name}>{item.name}</span>
          <span className="wka-brain-qsize">{fmtBytes(item.size)}</span>
          <span className={`wka-badge wka-brain-qstate${item.phase === 'done' ? ' active' : item.phase === 'failed' ? ' exhausted' : busy ? ' paused' : ''}`}>{t(PHASE_LABEL[item.phase])}</span>
        </div>
        {busy ? (
          <div className="wka-brain-qphases" aria-hidden="true">
            <span className={item.phase === 'reading' ? 'on' : 'past'}>{t('companyBrain.add.phase.reading')}</span>
            <span className={item.phase === 'storing' ? 'on' : ''}>{t('companyBrain.add.phase.masking')}</span>
            <span className={item.phase === 'storing' ? 'on' : ''}>{t('companyBrain.add.phase.storing')}</span>
          </div>
        ) : null}
        {sentences.length ? (
          <div className="wka-brain-qlines" data-testid="brain-add-result">
            {sentences.map((s, i) => <span key={i} className={i === 0 ? 'first' : ''}>{s}</span>)}
          </div>
        ) : null}
        {item.phase === 'failed' ? (
          <div className="wka-brain-qacts">
            {item.error && item.error.locked && onOpenUnlock ? (
              <button type="button" className="wka-btn sm" onClick={onOpenUnlock}><Lock size={12} /> {t('companyBrain.add.locked.open')}</button>
            ) : null}
            {item.error && item.error.retry ? (
              <button type="button" className="wka-btn sm ghost" onClick={() => onRetry(item.id)}><RotateCcw size={12} /> {t('companyBrain.add.retry')}</button>
            ) : null}
          </div>
        ) : null}
      </div>
      {!busy ? (
        <button type="button" className="wka-btn sm ghost wka-brain-qx" onClick={() => onDismiss(item.id)} aria-label={t('companyBrain.add.dismissAria', { name: item.name })} title={t('companyBrain.add.dismiss')}><X size={13} /></button>
      ) : null}
    </li>
  )
}
