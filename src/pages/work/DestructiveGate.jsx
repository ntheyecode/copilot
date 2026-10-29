import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { useT } from '../../i18n/index.jsx'

// Gate a destructive step's command/code behind a deliberate acknowledge, so the
// person reads the impact before they can copy or run it (risk: acting without
// understanding impact). A no-op wrapper when `why` is falsy. Moved verbatim
// out of Guiding.jsx so the shared StepCard can use it in every guiding host.
export default function DestructiveGate({ why, children }) {
  const t = useT()
  const [shown, setShown] = useState(false)
  if (!why) return <>{children}</>
  return (
    <div style={{ marginTop: 9, border: '1px solid rgba(255,159,67,0.5)', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: 'rgba(255,159,67,0.12)', padding: '9px 11px', fontSize: 12.5, color: '#ffb35c', lineHeight: 1.5 }}>
        <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
        <span><b>{t('destructiveGate.label')}</b> This {why}. Read it carefully before you run it.</span>
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
