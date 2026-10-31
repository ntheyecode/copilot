import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { useT } from '../../i18n/index.jsx'
import { destructiveReasonOf } from '../../../server/destructive_rules.js'

// Gate a destructive step's command/code behind a deliberate acknowledge, so the
// person reads the impact before they can copy or run it (risk: acting without
// understanding impact). A no-op wrapper when the step is not destructive.
// The server sends a reason CODE (server/destructive_rules.js); the sentence is
// the reader's language (destructiveGate.reason.<code>), and the flagged part of
// the command is shown as code, untranslated. Older sessions that stored only
// the English phrase are mapped to their code by destructiveReasonOf.
export default function DestructiveGate({ step, children }) {
  const t = useT()
  const [shown, setShown] = useState(false)
  const reason = destructiveReasonOf(step)
  if (!reason) return <>{children}</>
  const match = reason.params && reason.params.match
  return (
    <div style={{ marginTop: 9, border: '1px solid rgba(255,159,67,0.5)', borderRadius: 10, overflow: 'hidden' }}>
      <div data-destructive-code={reason.code} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: 'rgba(255,159,67,0.12)', padding: '9px 11px', fontSize: 12.5, color: '#ffb35c', lineHeight: 1.5 }}>
        <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
        <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
          <b>{t('destructiveGate.label')}</b> {t(`destructiveGate.reason.${reason.code}`)} {t('destructiveGate.check')}
          {match ? <> <span>{t('destructiveGate.flagged')}</span> <code dir="ltr" style={{ fontSize: 11.5 }}>{match}</code></> : null}
        </span>
      </div>
      {shown
        ? <div style={{ padding: '0 9px 9px' }}>{children}</div>
        : <div style={{ padding: '10px 11px' }}>
            <button className="btn btn-sm" onClick={() => setShown(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: '#ffb35c', background: 'rgba(255,159,67,0.14)', border: '1px solid rgba(255,159,67,0.5)' }}>
              <AlertTriangle size={13} /> {t('destructiveGate.reveal')}
            </button>
          </div>}
    </div>
  )
}
