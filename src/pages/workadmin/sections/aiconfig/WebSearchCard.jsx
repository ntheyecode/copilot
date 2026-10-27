// Platform web-search key (Tavily). Grounds live steps in current web sources.
// Read is admin; write is superadmin-only (gate mirrors the toggle). Moved
// verbatim out of AiConfig.jsx (no behavior change).
import React, { useEffect, useState, useCallback } from 'react'
import { Lock, Globe, KeyRound } from 'lucide-react'
import { workAdminApi } from '../../workAdminApi.js'
import { fmtDateTime } from '../../workadmin.css.js'
import { Loading, ErrorBox, Spinning, SavedTag, useReasonModal, StateRow, isLockError } from '../_shared.jsx'
import { useT } from '../../../../i18n/index.jsx'

export default function WebSearchCard({ isSuperAdmin, onLocked }) {
  const t = useT()
  const [state, setState] = useState({ loading: true, error: null, data: null })
  const [apiKey, setApiKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [saved, setSaved] = useState(false)
  const [askReason, reasonModal] = useReasonModal()

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }))
    try { const data = await workAdminApi.getWebSearch(); setState({ loading: false, error: null, data }) }
    catch (error) { setState((s) => ({ ...s, loading: false, error })) }
  }, [])
  useEffect(() => { load() }, [load])

  const save = async (clear) => {
    if (!isSuperAdmin || saving) return
    const key = clear ? '' : apiKey.trim()
    if (!clear && !key) return
    // Clearing the web-search key takes live web learning down, so capture a
    // reason (logged) first.
    let reason
    if (clear) {
      reason = await askReason({ title: t('aiConfig.clearWebKeyTitle'), detail: t('aiConfig.clearWebKeyDetail'), confirmLabel: t('aiConfig.clearWebKeyConfirm') })
      if (!reason || reason.length < 3) return
    }
    setSaving(true); setSaveError(null); setSaved(false)
    try {
      const data = await workAdminApi.setWebSearch(key, 'tavily', reason)
      setState({ loading: false, error: null, data }); setApiKey('')
      setSaved(true); setTimeout(() => setSaved(false), 2200)
    } catch (error) { if (isLockError(error) && onLocked) return onLocked(); setSaveError(error) } finally { setSaving(false) }
  }

  const d = state.data || {}
  return (
    <div className="wka-panel">
      {reasonModal}
      <h2><Globe size={15} style={{ verticalAlign: '-2px', marginRight: 6, color: 'var(--wka-cyan)' }} />{t('aiConfig.webSearchTitle')}</h2>
      <p className="desc">{t('aiConfig.webSearchDesc')}</p>
      {state.loading ? <Loading label={t('aiConfig.loadingWebSearch')} />
        : state.error ? <ErrorBox error={state.error} onRetry={load} />
        : (
          <>
            {d.configured
              ? <StateRow ok label={`${t('aiConfig.webSearchConfigured')}${d.provider ? ` (${d.provider})` : ''}`} detail={<>{t('aiConfig.keyLabel')} <code className="wka-mono">{d.keyMasked}</code>{d.setAt ? ` ${t('aiConfig.setSuffix', { date: fmtDateTime(d.setAt) })}` : ''}</>} />
              : <StateRow ok={false} warn label={t('aiConfig.noWebKey')} detail={d.envFallback ? t('aiConfig.envFallback') : t('aiConfig.webOffUntilKey')} />}
            {isSuperAdmin ? (
              <>
                <div className="wka-field" style={{ maxWidth: 420, margin: '14px 0 12px' }}>
                  <label>{t('aiConfig.tavilyApiKey')}</label>
                  <input className="wka-input" type="password" autoComplete="new-password" value={apiKey} placeholder={t('aiConfig.pasteTavilyKey')} onChange={(e) => setApiKey(e.target.value)} />
                </div>
                {saveError ? <div style={{ marginBottom: 12 }}><ErrorBox error={saveError} /></div> : null}
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  {d.configured ? <button type="button" className="wka-btn" disabled={saving} onClick={() => save(true)}>{t('aiConfig.clearKey')}</button> : null}
                  <button type="button" className="wka-btn primary" disabled={saving || !apiKey.trim()} onClick={() => save(false)}>{saving ? <Spinning /> : <KeyRound size={14} />} {t('aiConfig.saveKey')}</button>
                  <SavedTag show={saved} />
                </div>
              </>
            ) : <div className="wka-note" style={{ marginTop: 14 }}><Lock size={14} /> {t('aiConfig.superadminWebKey')}</div>}
          </>
        )}
    </div>
  )
}
