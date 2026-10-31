// What it learned, grouped by source as compact expandable rows (collapsed by
// default: name, count, date; open to read each learning with its kind chip
// and a Forget control per learning and per source). "Your sessions" is its
// own row that explains how it fills up as tasks finish. Strings:
// brainPage.row.*, brainPage.sessions.*, brainPage.kind.*, brainPage.learning.*.
import { useState } from 'react'
import { ChevronRight, FileText, History, Info, Trash2, Loader2 } from 'lucide-react'
import { useT } from '../../../i18n/index.jsx'
import { kindOf } from './brainModel.js'

function fmtDate(iso, locale) {
  if (!iso) return ''
  try { return new Date(iso).toLocaleDateString(locale || undefined, { month: 'short', day: 'numeric', year: 'numeric' }) } catch { return '' }
}

// One learning: text, its kind as a small chip, and a two-step Forget
// (press, then confirm inline) so nothing is lost to a slip.
function LearningItem({ l, busy, onForget }) {
  const t = useT()
  const [asking, setAsking] = useState(false)
  const kind = kindOf(l)
  return (
    <li className="wd-brain-l" data-testid="brain-learning">
      <span className={`wd-brain-kind ${kind}`} title={t(`brainPage.kind.tip.${kind}`)}>{t(`brainPage.kind.${kind}`)}</span>
      <div><span className="wd-brain-ltext">{l.text}</span></div>
      {asking
        ? <span className="wd-brain-lconfirm" role="group" aria-label={t('brainPage.learning.confirm')}>
            <span>{t('brainPage.learning.confirm')}</span>
            <button type="button" className="yes" disabled={busy} onClick={async () => { const ok = await onForget(l.id); if (!ok) setAsking(false) }}>{busy ? <Loader2 size={13} className="wd-brain-spin" /> : null} {busy ? t('brainPage.learning.forgetting') : t('brainPage.learning.yes')}</button>
            <button type="button" disabled={busy} onClick={() => setAsking(false)} autoFocus>{t('brainPage.learning.keep')}</button>
          </span>
        : <button type="button" className="wd-brain-lforget" onClick={() => setAsking(true)} aria-label={t('brainPage.learning.forgetAria', { text: l.text })}><Trash2 size={13} /> {t('brainPage.learning.forget')}</button>}
    </li>
  )
}

function SourceRow({ row, open, onToggle, busyId, onForgetLearning, onForgetSource }) {
  const t = useT()
  const sessions = row.kind === 'sessions'
  const name = sessions ? t('brainPage.sessions.name') : row.name
  const n = row.learnings.length
  const count = t.n('brainPage.row.count', n)
  const date = fmtDate(row.learnedAt, t.locale)
  const bodyId = `wd-brain-row-${row.id}`
  return (
    <div className={`wd-brain-row${open ? ' open' : ''}`} data-testid="brain-source" data-kind={row.kind}>
      <button type="button" className="wd-brain-rowhead" onClick={onToggle} aria-expanded={open} aria-controls={open ? bodyId : undefined}
        aria-label={open ? t('brainPage.row.collapseAria', { name, count }) : t('brainPage.row.expandAria', { name, count })}>
        <span className={`wd-ic${sessions ? ' alt' : ''}`}>{sessions ? <History size={16} /> : <FileText size={16} />}</span>
        <span className="wd-brain-rowmain">
          <span className="wd-brain-rowname">{name}</span>
          <span className="wd-brain-rowmeta">
            {sessions ? <span>{t('brainPage.sessions.sub')}</span> : null}
            {date && n > 0 ? <span>{t('brainPage.row.learnedOn', { date })}</span> : null}
          </span>
        </span>
        <span className="wd-brain-rowcount">{count}</span>
        <ChevronRight size={16} className="wd-brain-chev" />
      </button>
      {open && (
        <div className="wd-brain-rowbody" id={bodyId}>
          {sessions && <p className="wd-brain-rowabout"><Info size={14} /><span>{t('brainPage.sessions.body')}</span></p>}
          {n === 0
            ? <p className="wd-brain-none">{sessions ? t('brainPage.sessions.empty') : t('brainPage.row.none')}</p>
            : <ul className="wd-brain-ls">{row.learnings.map((l) => <LearningItem key={l.id} l={l} busy={busyId === l.id} onForget={onForgetLearning} />)}</ul>}
          {n > 0 && !row.placeholder && (
            <div className="wd-brain-rowfoot">
              <button type="button" className="wd-brain-lforget" disabled={busyId === row.id} onClick={() => onForgetSource(row)}
                aria-label={sessions ? t('brainPage.row.forgetSessions') : t('brainPage.row.forgetSourceAria', { name })}>
                {busyId === row.id ? <Loader2 size={13} className="wd-brain-spin" /> : <Trash2 size={13} />} {sessions ? t('brainPage.row.forgetSessions') : t('brainPage.row.forgetSource')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function SourceRows({ rows, busyId, onForgetLearning, onForgetSource, initiallyOpen = null }) {
  const [openId, setOpenId] = useState(initiallyOpen)
  return (
    <div className="wd-brain-rows">
      {rows.map((r) => (
        <SourceRow key={r.id} row={r} open={openId === r.id} onToggle={() => setOpenId((v) => (v === r.id ? null : r.id))}
          busyId={busyId} onForgetLearning={onForgetLearning} onForgetSource={onForgetSource} />
      ))}
    </div>
  )
}
