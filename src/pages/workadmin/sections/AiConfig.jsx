// AI config: the platform-AI setting for WorkCoPilot. Two facts, surfaced
// plainly and never silently (SUPREME RULE III):
//   1. Is platform AI allowed for WorkCoPilot users? (toggle, superadmin-only)
//   2. Is a platform provider actually configured and ready to answer?
// No API key value and no provider/model name is ever shown.
import React, { useEffect, useState, useCallback } from 'react'
import { Lock, CheckCircle2, XCircle, AlertTriangle, Shield, Globe, Sparkles, RefreshCw, Eye, KeyRound, DollarSign, Award } from 'lucide-react'
import { workAdminApi } from '../workAdminApi.js'
import { fmtDateTime } from '../workadmin.css.js'
import { Loading, ErrorBox, Spinning, SavedTag, EmptyState } from './_shared.jsx'

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

// Relative time ("3 min ago") for the recommendation's computed-at stamp.
function relTime(at) {
  if (!at) return ''
  const t = new Date(at).getTime()
  if (isNaN(t)) return ''
  const diff = Math.max(0, Date.now() - t)
  const s = Math.round(diff / 1000)
  if (s < 45) return 'just now'
  const m = Math.round(s / 60)
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.round(h / 24)
  return `${d}d ago`
}

function priceLabel(m) {
  if (!m || m.usdPerMtok == null || !isFinite(Number(m.usdPerMtok))) return ''
  return `$${Number(m.usdPerMtok).toFixed(2)} /Mtok`
}

const VIS_TAG = {
  display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10.5, fontWeight: 700,
  color: 'var(--wka-emerald)', border: '1px solid rgba(10,157,102,0.4)', background: 'rgba(10,157,102,0.08)',
  borderRadius: 999, padding: '2px 7px',
}

// One "overall" pick tile (cheapest / cheapest-with-vision / best).
function Pick({ title, icon, pick }) {
  return (
    <div style={{ flex: '1 1 200px', minWidth: 0, border: '1px solid var(--wka-line)', borderRadius: 10, padding: '14px 16px', background: 'var(--wka-panel-2)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'var(--wka-muted)', fontWeight: 600 }}>{icon}{title}</div>
      {pick ? (
        <div style={{ marginTop: 9 }}>
          <div style={{ fontSize: 12, color: 'var(--wka-faint)' }}>{pick.label || pick.provider}</div>
          <div style={{ fontWeight: 650, fontSize: 14, wordBreak: 'break-word' }}>{pick.model}</div>
          <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {priceLabel(pick) ? <span className="wka-mono" style={{ fontSize: 12, color: 'var(--wka-muted)' }}>{priceLabel(pick)}</span> : null}
            {pick.vision ? <span style={VIS_TAG}><Eye size={11} /> vision</span> : null}
          </div>
        </div>
      ) : <div style={{ marginTop: 9, fontSize: 12.5, color: 'var(--wka-faint)' }}>No pick available.</div>}
    </div>
  )
}

// One provider's compact summary line in the recommendation list.
function ProviderRow({ p }) {
  return (
    <div style={{ display: 'flex', gap: 12, padding: '9px 0', borderBottom: '1px solid var(--wka-line)', flexWrap: 'wrap', alignItems: 'baseline' }}>
      <div style={{ fontWeight: 600, minWidth: 130 }}>{p.label || p.provider} <span style={{ color: 'var(--wka-faint)', fontWeight: 400, fontSize: 12 }}>· {p.count} model{p.count === 1 ? '' : 's'}</span></div>
      <div style={{ fontSize: 12, color: 'var(--wka-muted)', flex: 1, minWidth: 180 }}>
        {p.cheapest ? <span>Cheapest: <b>{p.cheapest.model}</b> {priceLabel(p.cheapest)}{p.cheapest.vision ? ' (vision)' : ''}</span> : <span style={{ color: 'var(--wka-faint)' }}>No priced model</span>}
        {p.best ? <span style={{ display: 'block' }}>Best: <b>{p.best.model}</b>{p.best.quality ? ` (quality ${p.best.quality}/5)` : ''}{p.best.vision ? ' (vision)' : ''}</span> : null}
      </div>
    </div>
  )
}

// Curated, researched catalog of cost-effective models (researched 2026-10-23).
// Static reference data only: it never touches the provider/key flow below it.
const COST_MODELS = [
  { id: 'qwen-3.7-flash', model: 'Qwen 3.7 Flash', provider: 'OpenRouter', priceIn: '$0.03', priceOut: '$0.13', priceNote: 'images free', perHour: '~$0.01-0.03', speed: '~4-5s', note: 'Cheapest. Reads screens accurately (verified). Reasoning auto-disabled.', recommended: true },
  { id: 'deepseek-v4-flash', model: 'DeepSeek V4 Flash', provider: 'OpenRouter', priceIn: '$0.14', priceOut: '$0.28', perHour: '~$0.03-0.05', speed: '~3-5s', note: 'Cheap; can be weaker on dense documents.' },
  { id: 'gemini-3.1-flash-lite', model: 'Gemini 3.1 Flash-Lite', provider: 'Google Gemini', priceIn: '$0.25', priceOut: '$1.50', perHour: '~$0.05-0.08', speed: '~1-2s', note: 'Fast and reliable, direct from Google. Good failover.' },
  { id: 'gemini-3.5-flash-lite', model: 'Gemini 3.5 Flash-Lite (latest)', provider: 'Google Gemini', priceIn: '$0.30', priceOut: '$2.50', perHour: '~$0.07-0.10', speed: '~1-2s', note: 'Newest Gemini Flash-Lite.' },
  { id: 'gpt-4o-mini', model: 'gpt-4o-mini', provider: 'OpenAI', avoid: true, note: 'Bills images at a very high token rate (~25k tokens/image) - NOT cost-effective for screen reading.' },
]

const CM_LABEL = { fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--wka-faint)' }

function CostModelCard({ m }) {
  const rec = !!m.recommended
  const avoid = !!m.avoid
  return (
    <div style={{
      position: 'relative', display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0,
      padding: '16px 16px 14px', borderRadius: 12,
      border: rec ? '1px solid rgba(10,157,102,0.55)' : '1px solid var(--wka-line)',
      background: rec ? 'linear-gradient(160deg, rgba(10,157,102,0.09), var(--wka-panel-2) 60%)' : 'var(--wka-panel-2)',
      boxShadow: rec ? '0 0 0 3px rgba(10,157,102,0.08)' : 'none',
      opacity: avoid ? 0.62 : 1,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, color: 'var(--wka-faint)' }}>{m.provider}</div>
          <div style={{ fontWeight: 700, fontSize: 15, wordBreak: 'break-word', textDecoration: avoid ? 'line-through' : 'none', textDecorationColor: 'var(--wka-faint)' }}>{m.model}</div>
        </div>
        {rec ? <span style={{ ...VIS_TAG, fontSize: 10.5, padding: '3px 9px' }}><Award size={11} /> Recommended - cheapest</span> : null}
        {avoid ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10.5, fontWeight: 700, color: 'var(--wka-red)', border: '1px solid rgba(255,138,138,0.4)', borderRadius: 999, padding: '3px 9px' }}><XCircle size={11} /> Avoid for vision</span> : null}
      </div>

      {avoid ? null : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <div style={CM_LABEL}>Per 1M tokens</div>
            <div className="wka-mono" style={{ marginTop: 3, fontWeight: 650, fontSize: 13.5 }}>{m.priceIn} <span style={{ color: 'var(--wka-faint)', fontWeight: 400 }}>in</span> / {m.priceOut} <span style={{ color: 'var(--wka-faint)', fontWeight: 400 }}>out</span></div>
            {m.priceNote ? <div style={{ fontSize: 11, color: 'var(--wka-faint)', marginTop: 1 }}>({m.priceNote})</div> : null}
          </div>
          <div>
            <div style={CM_LABEL}>Est. per active hour</div>
            <div className="wka-mono" style={{ marginTop: 3, fontWeight: 700, fontSize: 15, color: rec ? 'var(--wka-emerald)' : 'inherit' }}>{m.perHour}</div>
          </div>
          <div>
            <div style={CM_LABEL}>Speed</div>
            <div className="wka-mono" style={{ marginTop: 3, fontWeight: 600, fontSize: 13.5 }}>{m.speed}</div>
          </div>
        </div>
      )}

      <div style={{ fontSize: 12.5, lineHeight: 1.45, color: avoid ? 'var(--wka-muted)' : 'var(--wka-muted)', borderTop: '1px solid var(--wka-line)', paddingTop: 10, marginTop: 'auto' }}>{m.note}</div>
    </div>
  )
}

// Research panel: cheapest-first comparison. Sits above the provider/key form.
function CostEffectiveModels() {
  return (
    <div className="wka-panel">
      <h2><DollarSign size={15} style={{ verticalAlign: '-2px', marginRight: 6, color: 'var(--wka-emerald)' }} />Cost-effective models (researched 2026-10-23)</h2>
      <p className="desc">Pick a provider below and paste its key to use it. Qwen and DeepSeek are reached with a single OpenRouter key.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 270px), 1fr))', gap: 12 }}>
        {COST_MODELS.map((m) => <CostModelCard key={m.id} m={m} />)}
      </div>
      <div style={{ marginTop: 14, fontSize: 11.5, color: 'var(--wka-faint)', lineHeight: 1.5 }}>
        Estimates assume an active hour of screen-guidance. WorkCoPilot picks the cheapest capable model automatically and keeps a stronger model as failover. Research is refreshed periodically.
      </div>
    </div>
  )
}

// (a) Platform web-search key (Tavily). Grounds live steps in current web
// sources. Read is admin; write is superadmin-only (gate mirrors the toggle).
function WebSearchCard({ isSuperAdmin }) {
  const [state, setState] = useState({ loading: true, error: null, data: null })
  const [apiKey, setApiKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [saved, setSaved] = useState(false)

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
    setSaving(true); setSaveError(null); setSaved(false)
    try {
      const data = await workAdminApi.setWebSearch(key, 'tavily')
      setState({ loading: false, error: null, data }); setApiKey('')
      setSaved(true); setTimeout(() => setSaved(false), 2200)
    } catch (error) { setSaveError(error) } finally { setSaving(false) }
  }

  const d = state.data || {}
  return (
    <div className="wka-panel">
      <h2><Globe size={15} style={{ verticalAlign: '-2px', marginRight: 6, color: 'var(--wka-cyan)' }} />Web search (live web learning)</h2>
      <p className="desc">This key grounds live steps in the latest web sources, so guidance reflects what changed on the web recently.</p>
      {state.loading ? <Loading label="Loading web search" />
        : state.error ? <ErrorBox error={state.error} onRetry={load} />
        : (
          <>
            {d.configured
              ? <StateRow ok label={`Web search is configured${d.provider ? ` (${d.provider})` : ''}`} detail={<>Key <code className="wka-mono">{d.keyMasked}</code>{d.setAt ? ` · set ${fmtDateTime(d.setAt)}` : ''}</>} />
              : <StateRow ok={false} warn label="No platform web-search key set" detail={d.envFallback ? 'A server env key is in use as a fallback.' : 'Live web learning stays off until a key is set.'} />}
            {isSuperAdmin ? (
              <>
                <div className="wka-field" style={{ maxWidth: 420, margin: '14px 0 12px' }}>
                  <label>Tavily API key</label>
                  <input className="wka-input" type="password" autoComplete="new-password" value={apiKey} placeholder="paste the platform Tavily key" onChange={(e) => setApiKey(e.target.value)} />
                </div>
                {saveError ? <div style={{ marginBottom: 12 }}><ErrorBox error={saveError} /></div> : null}
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  {d.configured ? <button type="button" className="wka-btn" disabled={saving} onClick={() => save(true)}>Clear key</button> : null}
                  <button type="button" className="wka-btn primary" disabled={saving || !apiKey.trim()} onClick={() => save(false)}>{saving ? <Spinning /> : <KeyRound size={14} />} Save key</button>
                  <SavedTag show={saved} />
                </div>
              </>
            ) : <div className="wka-note" style={{ marginTop: 14 }}><Lock size={14} /> Only a superadmin can change the web-search key.</div>}
          </>
        )}
    </div>
  )
}

// Plan-heavy / watch-light is OUR model: the superadmin forces it on for premium
// users (company premium members + regular premium). Users have no control.
function WatchLightCard({ isSuperAdmin }) {
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
    catch (e) { setSaveError(e) } finally { setSaving(false) }
  }

  return (
    <div className="wka-panel">
      <h2><Eye size={15} style={{ verticalAlign: '-2px', marginRight: 6, color: 'var(--wka-cyan)' }} />Plan-heavy, watch-light (premium)</h2>
      <p className="desc">Our model, not a user setting. When on, premium users (company premium members and regular premium users) get a rich one-shot plan and check their screen on demand, instead of continuous watching. Users and companies do not control this.</p>
      {loading ? <Loading label="Loading" />
        : error ? <ErrorBox error={error} onRetry={load} />
        : (
          <>
            <div className={`wka-toggle${on ? ' on' : ''}${(!isSuperAdmin || saving) ? ' disabled' : ''}`} onClick={toggle} role="switch" aria-checked={on}>
              <span className="track"><span className="knob" /></span>
              <span style={{ fontWeight: 600 }}>{on ? 'On - premium users plan heavy and check on demand' : 'Off - premium users get continuous watching'}</span>
              {saving ? <Spinning /> : null}
            </div>
            {saveError ? <div style={{ marginTop: 14 }}><ErrorBox error={saveError} /></div> : null}
            {!isSuperAdmin ? <div className="wka-note" style={{ marginTop: 14 }}><Lock size={14} /> Only a superadmin can change this.</div> : null}
          </>
        )}
    </div>
  )
}

// (b) Best + cheapest model guidance across configured providers. Refresh forces
// a live recompute. Any overall pick can be null (shown as "No pick available").
function RecommendedModels() {
  const [state, setState] = useState({ loading: true, error: null, data: null })
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (refresh) => {
    if (refresh) setRefreshing(true); else setState((s) => ({ ...s, loading: true, error: null }))
    try { const data = await workAdminApi.aiRecommendation(!!refresh); setState({ loading: false, error: null, data }) }
    catch (error) { setState((s) => ({ ...s, loading: false, error })) }
    finally { setRefreshing(false) }
  }, [])
  useEffect(() => { load(false) }, [load])

  const d = state.data || {}
  const providers = d.providers || []
  const overall = d.overall || {}
  return (
    <div className="wka-panel">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 4 }}>
        <h2 style={{ margin: 0 }}><Sparkles size={15} style={{ verticalAlign: '-2px', marginRight: 6, color: 'var(--wka-accent)' }} />Recommended models today</h2>
        <button type="button" className="wka-btn sm ghost" disabled={refreshing || state.loading} onClick={() => load(true)}>{refreshing ? <Spinning /> : <RefreshCw size={13} />} Refresh</button>
      </div>
      <p className="desc">The best and cheapest picks across your configured providers, to choose a model to run on.</p>
      {state.loading ? <Loading label="Loading recommendation" />
        : state.error ? <ErrorBox error={state.error} onRetry={() => load(false)} />
        : providers.length === 0 ? <EmptyState title="No models to compare yet" detail={d.note || 'Configure a provider in AI Settings to see recommendations.'} />
        : (
          <>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Pick title="Cheapest" icon={<DollarSign size={14} style={{ color: 'var(--wka-emerald)' }} />} pick={overall.cheapest} />
              <Pick title="Cheapest that can see the screen" icon={<Eye size={14} style={{ color: 'var(--wka-cyan)' }} />} pick={overall.cheapestVision} />
              <Pick title="Best" icon={<Award size={14} style={{ color: 'var(--wka-amber)' }} />} pick={overall.best} />
            </div>
            <div style={{ marginTop: 16 }}>
              {providers.map((p) => <ProviderRow key={p.provider} p={p} />)}
            </div>
            <div style={{ marginTop: 14, fontSize: 11.5, color: 'var(--wka-faint)' }}>
              {d.note ? <div>{d.note}</div> : null}
              {d.at ? <div style={{ marginTop: 4 }}>Updated {relTime(d.at)}</div> : null}
            </div>
          </>
        )}
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

      <CostEffectiveModels />

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

      <WebSearchCard isSuperAdmin={isSuperAdmin} />
      <WatchLightCard isSuperAdmin={isSuperAdmin} />
      <RecommendedModels />
    </div>
  )
}
