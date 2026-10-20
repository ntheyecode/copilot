// AI config: the platform-AI setting for WorkCoPilot. Two facts, surfaced
// plainly and never silently (SUPREME RULE III):
//   1. Is platform AI allowed for WorkCoPilot users? (toggle, superadmin-only)
//   2. Is a platform provider actually configured and ready to answer?
// No API key value and no provider/model name is ever shown.
import React, { useEffect, useState, useCallback } from 'react'
import { Lock, CheckCircle2, XCircle, AlertTriangle, Shield } from 'lucide-react'
import { workAdminApi } from '../workAdminApi.js'
import { Loading, ErrorBox, Spinning } from './_shared.jsx'

function StateRow({ ok, warn, label, detail }) {
  const Icon = ok ? CheckCircle2 : (warn ? AlertTriangle : XCircle)
  const color = ok ? 'var(--wka-emerald)' : (warn ? 'var(--wka-amber)' : 'var(--wka-red)')
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 0', borderBottom: '1px solid var(--wka-line)' }}>
      <Icon size={18} style={{ color, flexShrink: 0, marginTop: 1 }} />
      <div>
        <div style={{ fontWeight: 600 }}>{label}</div>
        <div style={{ color: 'var(--wka-muted)', fontSize: 12 }}>{detail}</div>
      </div>
    </div>
  )
}

export default function AiConfig({ isSuperAdmin }) {
  const [state, setState] = useState({ loading: true, error: null, allowed: false, configured: false, ready: false })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const [toggle, ai] = await Promise.all([workAdminApi.getPlatformAi(), workAdminApi.aiState()])
      setState({
        loading: false, error: null,
        allowed: !!toggle.platformAiAllowed,
        configured: !!ai.platformConfigured,
        ready: !!ai.platformReady,
      })
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
    } catch (error) { setSaveError(error) }
    finally { setSaving(false) }
  }

  if (state.loading) return <Loading label="Loading AI configuration" />
  if (state.error) return <ErrorBox error={state.error} onRetry={load} />

  return (
    <div>
      {!isSuperAdmin ? <div className="wka-note"><Lock size={14} /> Only a superadmin can change the platform AI setting. The current state is shown below.</div> : null}

      <div className="wka-panel">
        <h2>Platform AI for WorkCoPilot</h2>
        <p className="desc">When on, WorkCoPilot users run on the platform provider managed in AI Settings. When off, each user adds and tests their own key before the app unlocks.</p>
        <div className={`wka-toggle${state.allowed ? ' on' : ''}${(!isSuperAdmin || saving) ? ' disabled' : ''}`} onClick={toggle} role="switch" aria-checked={state.allowed}>
          <span className="track"><span className="knob" /></span>
          <span style={{ fontWeight: 600 }}>{state.allowed ? 'On - users share the platform provider' : 'Off - users bring their own key'}</span>
          {saving ? <Spinning /> : null}
        </div>
        {saveError ? <div style={{ marginTop: 14 }}><ErrorBox error={saveError} /></div> : null}
      </div>

      <div className="wka-panel">
        <h2><Shield size={15} style={{ verticalAlign: '-2px', marginRight: 6, color: 'var(--wka-cyan)' }} />Live state</h2>
        <p className="desc">What users relying on platform AI will actually experience right now.</p>
        <StateRow ok={state.allowed} warn={false}
          label={state.allowed ? 'Platform AI is allowed' : 'Platform AI is off'}
          detail={state.allowed ? 'WorkCoPilot users may use the shared provider.' : 'Each user must configure and test their own key.'} />
        <StateRow ok={state.configured} warn={false}
          label={state.configured ? 'A platform provider is configured' : 'No platform provider is configured'}
          detail={state.configured ? 'A provider key is set in AI Settings.' : 'Set a provider in AI Settings so shared users can be served.'} />
        <StateRow ok={state.ready} warn={state.allowed && !state.configured}
          label={state.ready ? 'Ready to answer' : 'Not ready to answer'}
          detail={state.ready
            ? 'Platform AI is on and a provider is set.'
            : (state.allowed ? 'Platform AI is on but no provider is set, so shared users cannot be served.' : 'Platform AI is off; readiness depends on each user\'s own key.')} />
      </div>
    </div>
  )
}
