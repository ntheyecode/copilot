// AI config: the platform-AI setting for WorkCoPilot. Thin wiring only - the
// page gate (authenticator step-up), the platform toggle + live state, and the
// order of the panels. Each panel is its own module under ./aiconfig/
// (SUPREME RULE XV: this file was a 670-line monolith; it now only composes).
// Two facts are surfaced plainly and never silently (SUPREME RULE III):
//   1. Is platform AI allowed for WorkCoPilot users? (toggle, superadmin-only)
//   2. Is a platform provider actually configured and ready to answer?
// No API key value is ever shown. Which provider is PRIMARY FOR CHAT and which
// READS THE SCREEN (vision) is explicit on every card and in the Recommended-now
// panel on top (owner 2026-10-27).
import React, { useEffect, useState, useCallback } from 'react'
import { Lock, Shield, Cpu } from 'lucide-react'
import { workAdminApi } from '../workAdminApi.js'
// Step-up gate, banner, lock-error check and the live-state row all come from
// the shared primitives (SUPREME RULE II).
import { Loading, ErrorBox, Spinning, StateRow, StepUpGate, StepUpBanner, isLockError } from './_shared.jsx'
import { useT } from '../../../i18n/index.jsx'
import PlatformProviders from './aiconfig/PlatformProviders.jsx'
import WebSearchCard from './aiconfig/WebSearchCard.jsx'
import WatchLightCard from './aiconfig/WatchLightCard.jsx'

function AiConfigBody({ isSuperAdmin, stepUp, onLocked }) {
  const t = useT()
  const [state, setState] = useState({ loading: true, error: null, allowed: false, configured: false, ready: false })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const [toggle, ai] = await Promise.all([workAdminApi.getPlatformAi(), workAdminApi.aiState()])
      setState({ loading: false, error: null, allowed: !!toggle.platformAiAllowed, configured: !!ai.platformConfigured, ready: !!ai.platformReady })
    } catch (error) { setState((s) => ({ ...s, loading: false, error })) }
  }, [])
  useEffect(() => { load() }, [load])

  const toggle = async () => {
    if (!isSuperAdmin || saving) return
    const next = !state.allowed
    setSaving(true); setSaveError(null)
    try {
      await workAdminApi.setPlatformAi(next)
      const ai = await workAdminApi.aiState()
      setState((s) => ({ ...s, allowed: next, configured: !!ai.platformConfigured, ready: !!ai.platformReady }))
    } catch (error) { if (isLockError(error)) return onLocked(); setSaveError(error) }
    finally { setSaving(false) }
  }

  if (state.loading) return <Loading label={t('aiConfig.loadingConfig')} />
  if (state.error) return <ErrorBox error={state.error} onRetry={load} />

  return (
    <div>
      <StepUpBanner status={stepUp} onLocked={onLocked} lock={workAdminApi.lockAiConfig} label={t('aiConfig.aiSettingsLabel')} />

      <PlatformProviders isSuperAdmin={isSuperAdmin} onLocked={onLocked} />

      <div className="wka-panel">
        <h2><Cpu size={15} style={{ verticalAlign: '-2px', marginRight: 6, color: 'var(--wka-cyan)' }} />{t('aiConfig.platformAiTitle')}</h2>
        <p className="desc">{t('aiConfig.platformAiDesc')}</p>
        <div className={`wka-toggle${state.allowed ? ' on' : ''}${(!isSuperAdmin || saving) ? ' disabled' : ''}`} onClick={toggle} role="switch" aria-checked={state.allowed}>
          <span className="track"><span className="knob" /></span>
          <span style={{ fontWeight: 600 }}>{state.allowed ? t('aiConfig.platformOnLabel') : t('aiConfig.platformOffLabel')}</span>
          {saving ? <Spinning /> : null}
        </div>
        {saveError ? <div style={{ marginTop: 14 }}><ErrorBox error={saveError} /></div> : null}
      </div>

      <div className="wka-panel">
        <h2><Shield size={15} style={{ verticalAlign: '-2px', marginRight: 6, color: 'var(--wka-cyan)' }} />{t('aiConfig.liveStateTitle')}</h2>
        <p className="desc">{t('aiConfig.liveStateDesc')}</p>
        <StateRow ok={state.allowed} warn={false}
          label={state.allowed ? t('aiConfig.platformAllowed') : t('aiConfig.platformOff')}
          detail={state.allowed ? t('aiConfig.platformAllowedDetail') : t('aiConfig.platformOffDetail')} />
        <StateRow ok={state.configured} warn={false}
          label={state.configured ? t('aiConfig.providerConfigured') : t('aiConfig.providerNotConfigured')}
          detail={state.configured ? t('aiConfig.providerConfiguredDetail') : t('aiConfig.providerNotConfiguredDetail')} />
        <StateRow ok={state.ready} warn={state.allowed && !state.configured}
          label={state.ready ? t('aiConfig.ready') : t('aiConfig.notReady')}
          detail={state.ready ? t('aiConfig.readyDetail') : (state.allowed ? t('aiConfig.onNoProviderDetail') : t('aiConfig.offReadinessDetail'))} />
      </div>

      <WebSearchCard isSuperAdmin={isSuperAdmin} onLocked={onLocked} />
      <WatchLightCard isSuperAdmin={isSuperAdmin} onLocked={onLocked} />
    </div>
  )
}

// The page gate: nothing renders until an authenticator code opens the step-up
// window; every change is OTP-backed because mutations require that window too.
export default function AiConfig({ isSuperAdmin }) {
  const t = useT()
  const [gate, setGate] = useState({ loading: true, error: null, status: null })

  const loadGate = useCallback(async () => {
    setGate((g) => ({ ...g, loading: true, error: null }))
    try { const status = await workAdminApi.aiStepUp(); setGate({ loading: false, error: null, status }) }
    catch (error) { setGate({ loading: false, error, status: null }) }
  }, [])
  useEffect(() => { if (isSuperAdmin) loadGate() }, [isSuperAdmin, loadGate])

  // AI settings are a critical, superadmin-only page (owner 2026-10-23).
  if (!isSuperAdmin) return <div className="wka-note"><Lock size={14} /> {t('aiConfig.superadminPageOnly')}</div>
  if (gate.loading) return <Loading label={t('aiConfig.checkingLock')} />
  if (gate.error) return <ErrorBox error={gate.error} onRetry={loadGate} />
  if (!gate.status || !gate.status.active) return <StepUpGate status={gate.status || {}} verify={workAdminApi.verifyAiStepUp} onUnlock={(status) => setGate({ loading: false, error: null, status })} label={t('aiConfig.aiSettingsLabel')} />

  return <AiConfigBody isSuperAdmin={isSuperAdmin} stepUp={gate.status} onLocked={loadGate} />
}
