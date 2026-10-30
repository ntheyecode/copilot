// The screen the guide saw when it raised an incident: a thumbnail that opens a
// larger view, a calm note when the image cannot be shown (removed with a
// deleted session, or no longer reachable), and a plain flag when sensitive
// text on it was not masked. Rendered only when the incident has a frame.
import React, { useRef, useState } from 'react'
import { ImageOff, Maximize2, X, EyeOff } from 'lucide-react'
import { api } from '../../../api.js'
import { useT } from '../../../i18n/index.jsx'
import { useDialogFocus } from './useDialogFocus.js'

// The larger view: a modal (focus in, Tab kept inside, Escape closes, focus back
// on the thumbnail).
function Lightbox({ src, onClose, onBroken }) {
  const t = useT()
  const boxRef = useRef(null)
  useDialogFocus(boxRef, { onClose })
  return (
    <div ref={boxRef} className="wfi-lightbox" role="dialog" aria-modal="true" aria-label={t('wfIssues.detail.shot')}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <img src={src} alt={t('wfIssues.detail.shotAlt')} onError={onBroken} />
      <button type="button" className="wka-btn sm" onClick={onClose}><X size={14} /> {t('wfIssues.detail.shotClose')}</button>
    </div>
  )
}

export default function IncidentShot({ incidentId, masked }) {
  const t = useT()
  const [broken, setBroken] = useState(false)
  const [big, setBig] = useState(false)
  const src = api.workflowIncidentFramePath(incidentId)

  return (
    <div>
      {broken ? (
        <div className="wfi-shot-broken" role="note"><ImageOff size={16} /> <span>{t('wfIssues.detail.shotBroken')}</span></div>
      ) : (
        <button type="button" className="wfi-shot" onClick={() => setBig(true)} aria-label={t('wfIssues.detail.shotOpen')} title={t('wfIssues.detail.shotOpen')}>
          <img src={src} alt={t('wfIssues.detail.shotAlt')} loading="lazy" decoding="async" onError={() => setBroken(true)} />
          <span className="wfi-shot-zoom" aria-hidden="true"><Maximize2 size={14} /></span>
        </button>
      )}
      {!masked && !broken && (
        <p className="wfi-flag"><EyeOff size={14} /> <span>{t('wfIssues.detail.unmasked')}</span></p>
      )}
      {big && !broken && <Lightbox src={src} onClose={() => setBig(false)} onBroken={() => { setBroken(true); setBig(false) }} />}
    </div>
  )
}
