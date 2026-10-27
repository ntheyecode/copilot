// Plan-heavy / watch-light is OUR model: the superadmin forces it on for premium
// users (company premium members + regular premium). Users have no control.
// Moved verbatim out of AiConfig.jsx (no behavior change).
import React, { useEffect, useState, useCallback } from 'react'
import { Lock, Eye } from 'lucide-react'
import { workAdminApi } from '../../workAdminApi.js'
import { Loading, ErrorBox, Spinning, isLockError } from '../_shared.jsx'
import { useT } from '../../../../i18n/index.jsx'

export default function WatchLightCard({ isSuperAdmin, onLocked }) {
  const t = useT()
  const [on, setOn] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try { const d = await workAdminApi.getWatchLight(); setOn(!!d.forceWatchLightPremium) }
    catch (e) { setError(e) } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  const toggle = async () => {
    if (!isSuperAdmin || saving) return
    const next = !on
    setSaving(true); setSaveError(null)
    try { const d = await workAdminApi.setWatchLight(next); setOn(!!d.forceWatchLightPremium) }
    catch (e) { if (isLockError(e) && onLocked) return onLocked(); setSaveError(e) } finally { setSaving(false) }
  }

  return (
    <div className="wka-panel">
      <h2><Eye size={15} style={{ verticalAlign: '-2px', marginRight: 6, color: 'var(--wka-cyan)' }} />{t('aiConfig.watchLightTitle')}</h2>
      <p className="desc">{t('aiConfig.watchLightDesc')}</p>
      {loading ? <Loading label={t('aiConfig.loading')} />
        : error ? <ErrorBox error={error} onRetry={load} />
        : (
          <>
            <div className={`wka-toggle${on ? ' on' : ''}${(!isSuperAdmin || saving) ? ' disabled' : ''}`} onClick={toggle} role="switch" aria-checked={on}>
              <span className="track"><span className="knob" /></span>
              <span style={{ fontWeight: 600 }}>{on ? t('aiConfig.watchOnLabel') : t('aiConfig.watchOffLabel')}</span>
              {saving ? <Spinning /> : null}
            </div>
            {saveError ? <div style={{ marginTop: 14 }}><ErrorBox error={saveError} /></div> : null}
            {!isSuperAdmin ? <div className="wka-note" style={{ marginTop: 14 }}><Lock size={14} /> {t('aiConfig.superadminChangeThis')}</div> : null}
          </>
        )}
    </div>
  )
}
