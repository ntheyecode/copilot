// AI config: the platform-AI setting for WorkCoPilot. Two facts, surfaced
// plainly and never silently (SUPREME RULE III):
//   1. Is platform AI allowed for WorkCoPilot users? (toggle, superadmin-only)
//   2. Is a platform provider actually configured and ready to answer?
// No API key value and no provider/model name is ever shown.
import React, { useEffect, useState, useCallback } from 'react'
import { Lock, CheckCircle2, XCircle, AlertTriangle, Shield, Globe, Sparkles, RefreshCw, Eye, KeyRound, DollarSign, Award, Plus } from 'lucide-react'
import { workAdminApi } from '../workAdminApi.js'
import { fmtDateTime } from '../workadmin.css.js'
import { Loading, ErrorBox, Spinning, SavedTag, EmptyState, useReasonModal } from './_shared.jsx'

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

// Platform AI PROVIDERS: every AI WorkCoPilot can run on, each with its configured
// state, a key field, a one-click Save & Test, and Make-primary. The raw key is
// never shown (only a masked tail). Superadmin writes; others see state read-only.
// Nothing here is silent (SUPREME RULE III): a test shows ok + the vision model it
// found, or the exact error; the active provider is always marked.
function ProviderCard({ p, isSuperAdmin, busy, onSaveTest, onTest, onActivate, onClear, onAddKey, onRemoveKey, onRemoveCustom, result }) {
  const [key, setKey] = useState('')
  const [model, setModel] = useState(p.chatModel || '')
  const working = !!busy
  const keys = p.keysMasked && p.keysMasked.length ? p.keysMasked : (p.keyMasked ? [p.keyMasked] : [])
  const stateLabel = p.active ? 'Primary - live' : (p.configured ? 'Configured' : 'Not set')
  const stateColor = p.active ? 'var(--wka-emerald)' : (p.configured ? 'var(--wka-cyan)' : 'var(--wka-faint)')
  return (
    <div style={{
      position: 'relative', display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0,
      padding: '16px 16px 14px', borderRadius: 12,
      border: p.active ? '1px solid rgba(10,157,102,0.55)' : '1px solid var(--wka-line)',
      background: p.active ? 'linear-gradient(160deg, rgba(10,157,102,0.09), var(--wka-panel-2) 60%)' : 'var(--wka-panel-2)',
      boxShadow: p.active ? '0 0 0 3px rgba(10,157,102,0.08)' : 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 7 }}>{p.label}{p.custom ? <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.05em', color: 'var(--wka-accent)', border: '1px solid var(--wka-accent)', borderRadius: 999, padding: '1px 6px' }}>CUSTOM</span> : null}</div>
          <div style={{ fontSize: 12, color: 'var(--wka-muted)', lineHeight: 1.4, marginTop: 2 }}>{p.blurb}</div>
        </div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10.5, fontWeight: 700, color: stateColor, border: `1px solid ${stateColor}`, borderRadius: 999, padding: '3px 9px', whiteSpace: 'nowrap' }}>
          {p.active ? <CheckCircle2 size={11} /> : (p.configured ? <KeyRound size={11} /> : null)}{stateLabel}
        </span>
      </div>

      {p.configured ? (
        <div style={{ fontSize: 12, color: 'var(--wka-muted)' }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--wka-faint)', marginBottom: 4 }}>
            Key{keys.length > 1 ? `s · ${keys.length} in pool (load spreads round-robin)` : ''}
          </div>
          {keys.map((km, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
              <code className="wka-mono">{km}</code>
              {isSuperAdmin && onRemoveKey ? <button type="button" className="wka-btn sm ghost" disabled={working} onClick={() => onRemoveKey(p.id, i)} title="Remove this key" style={{ color: 'var(--wka-red)', padding: '0 7px', lineHeight: 1.6 }}>×</button> : null}
            </div>
          ))}
          {p.chatModel ? <div style={{ marginTop: 2 }}>model <code className="wka-mono">{p.chatModel}</code></div> : null}
        </div>
      ) : null}

      {result ? (
        result.ok
          ? <div style={{ fontSize: 12, color: 'var(--wka-emerald)', display: 'flex', alignItems: 'center', gap: 6 }}><CheckCircle2 size={14} /> Tested OK{result.hasVision ? ` · reads screens (${result.visionModel})` : ' · no vision model found'}</div>
          : <div style={{ fontSize: 12, color: 'var(--wka-red)', display: 'flex', alignItems: 'flex-start', gap: 6 }}><XCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} /> {result.error}</div>
      ) : null}

      {isSuperAdmin ? (
        <>
          <div className="wka-field" style={{ margin: 0 }}>
            <label style={{ fontSize: 11 }}>{p.configured ? 'Add or replace a key' : 'API key'}</label>
            <input className="wka-input" type="password" autoComplete="new-password" value={key} placeholder={p.keyHint || 'paste the key'} onChange={(e) => setKey(e.target.value)} disabled={working} />
          </div>
          {p.chatModels && p.chatModels.length ? (
            <div className="wka-field" style={{ margin: 0 }}>
              <label style={{ fontSize: 11 }}>Chat model (optional)</label>
              <select className="wka-input" value={model} onChange={(e) => setModel(e.target.value)} disabled={working}>
                <option value="">Auto (provider default)</option>
                {p.chatModels.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          ) : null}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 2 }}>
            <button type="button" className="wka-btn primary sm" disabled={working || !key.trim()} onClick={() => { onSaveTest(p.id, { apiKey: key.trim(), chatModel: model || undefined }); setKey('') }} title={p.configured ? 'Replace the pool with this one key, then test' : 'Save and test this key'}>
              {working ? <Spinning /> : <KeyRound size={13} />} Save &amp; test
            </button>
            {p.configured && onAddKey ? <button type="button" className="wka-btn sm" disabled={working || !key.trim()} onClick={() => { onAddKey(p.id, key.trim()); setKey('') }} title="Add this key to the pool (load spreads across keys)">+ Add to pool</button> : null}
            {p.configured && !p.active ? <button type="button" className="wka-btn sm" disabled={working} onClick={() => onActivate(p.id)}>Make primary</button> : null}
            {p.configured ? <button type="button" className="wka-btn sm ghost" disabled={working} onClick={() => onTest(p.id)}>Re-test</button> : null}
            {p.configured && !p.custom ? <button type="button" className="wka-btn sm ghost" disabled={working} onClick={() => onClear(p.id)} style={{ color: 'var(--wka-red)' }}>Clear all</button> : null}
            {p.custom && onRemoveCustom ? <button type="button" className="wka-btn sm ghost" disabled={working} onClick={() => onRemoveCustom(p.id)} style={{ color: 'var(--wka-red)' }}>Remove provider</button> : null}
          </div>
          {p.keysUrl ? <a href={p.keysUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: 'var(--wka-faint)' }}>Where to get a {p.label} key ↗</a> : null}
        </>
      ) : null}
    </div>
  )
}

function PlatformProviders({ isSuperAdmin, onLocked }) {
  const [state, setState] = useState({ loading: true, error: null, providers: [], activeProvider: null })
  const [busy, setBusy] = useState({})        // providerId -> true while a call is in flight
  const [results, setResults] = useState({})  // providerId -> { ok, visionModel, hasVision } | { ok:false, error }
  // Removing a key / provider takes platform AI (partly) down, so each goes
  // through the shared reason-gated danger confirm (captured + logged).
  const [askReason, reasonModal] = useReasonModal()

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }))
    try { const d = await workAdminApi.aiProviders(); setState({ loading: false, error: null, providers: d.providers || [], activeProvider: d.activeProvider || null }) }
    catch (error) { if (isLockError(error) && onLocked) return onLocked(); setState((s) => ({ ...s, loading: false, error })) }
  }, [onLocked])
  useEffect(() => { load() }, [load])

  const setProvBusy = (id, v) => setBusy((b) => ({ ...b, [id]: v }))
  const absorb = (id, d) => {
    if (d.providers) setState((s) => ({ ...s, providers: d.providers, activeProvider: d.activeProvider || s.activeProvider }))
  }

  const onSaveTest = async (id, body) => {
    if (!isSuperAdmin) return
    setProvBusy(id, true); setResults((r) => ({ ...r, [id]: null }))
    try {
      const d = await workAdminApi.setAiProvider(id, body)
      absorb(id, d)
      setResults((r) => ({ ...r, [id]: { ok: true, visionModel: d.visionModel, hasVision: d.hasVision } }))
    } catch (error) {
      if (isLockError(error) && onLocked) return onLocked()
      if (error.data && error.data.providers) absorb(id, error.data)
      setResults((r) => ({ ...r, [id]: { ok: false, error: error.message } }))
    } finally { setProvBusy(id, false) }
  }
  const onTest = async (id) => {
    if (!isSuperAdmin) return
    setProvBusy(id, true); setResults((r) => ({ ...r, [id]: null }))
    try { const d = await workAdminApi.testAiProvider(id); setResults((r) => ({ ...r, [id]: { ok: true, visionModel: d.visionModel, hasVision: d.hasVision } })) }
    catch (error) { if (isLockError(error) && onLocked) return onLocked(); setResults((r) => ({ ...r, [id]: { ok: false, error: error.message } })) }
    finally { setProvBusy(id, false) }
  }
  const onActivate = async (id) => {
    if (!isSuperAdmin) return
    setProvBusy(id, true)
    try { const d = await workAdminApi.activateAiProvider(id); absorb(id, d) }
    catch (error) { if (isLockError(error) && onLocked) return onLocked(); setResults((r) => ({ ...r, [id]: { ok: false, error: error.message } })) }
    finally { setProvBusy(id, false) }
  }
  const onClear = async (id) => {
    if (!isSuperAdmin) return
    const reason = await askReason({ title: 'Clear all keys for this provider?', detail: 'This removes every key in the pool. If it is the active provider, the platform hands off to another configured one - otherwise shared users cannot be served until a key is set again.', confirmLabel: 'Clear all keys' })
    if (!reason || reason.length < 3) return
    setProvBusy(id, true); setResults((r) => ({ ...r, [id]: null }))
    try { const d = await workAdminApi.clearAiProvider(id, reason); absorb(id, d) }
    catch (error) { if (isLockError(error) && onLocked) return onLocked(); setResults((r) => ({ ...r, [id]: { ok: false, error: error.message } })) }
    finally { setProvBusy(id, false) }
  }
  const onAddKey = async (id, key) => {
    if (!isSuperAdmin) return
    setProvBusy(id, true); setResults((r) => ({ ...r, [id]: null }))
    try {
      const d = await workAdminApi.addAiProviderKey(id, key)
      absorb(id, d)
      setResults((r) => ({ ...r, [id]: { ok: !!d.ok, error: d.error, visionModel: d.visionModel, hasVision: d.hasVision } }))
    } catch (error) { if (isLockError(error) && onLocked) return onLocked(); if (error.data && error.data.providers) absorb(id, error.data); setResults((r) => ({ ...r, [id]: { ok: false, error: error.message } })) }
    finally { setProvBusy(id, false) }
  }
  const onRemoveKey = async (id, index) => {
    if (!isSuperAdmin) return
    const reason = await askReason({ title: 'Remove this key from the pool?', detail: 'Load stops spreading to this key. If it is the only key, the provider is no longer configured.', confirmLabel: 'Remove key' })
    if (!reason || reason.length < 3) return
    setProvBusy(id, true)
    try { const d = await workAdminApi.removeAiProviderKey(id, index, reason); absorb(id, d) }
    catch (error) { if (isLockError(error) && onLocked) return onLocked(); setResults((r) => ({ ...r, [id]: { ok: false, error: error.message } })) }
    finally { setProvBusy(id, false) }
  }
  const onRemoveCustom = async (id) => {
    if (!isSuperAdmin) return
    const reason = await askReason({ title: 'Remove this custom provider?', detail: 'The provider and its key are removed, and its base URL leaves the egress allowlist.', confirmLabel: 'Remove provider' })
    if (!reason || reason.length < 3) return
    setProvBusy(id, true)
    try { const d = await workAdminApi.removeCustomProvider(id, reason); absorb(id, d) }
    catch (error) { if (isLockError(error) && onLocked) return onLocked(); setResults((r) => ({ ...r, [id]: { ok: false, error: error.message } })) }
    finally { setProvBusy(id, false) }
  }
  const onAddCustom = async (body) => {
    if (!isSuperAdmin) return { ok: false, error: 'Superadmin only.' }
    try {
      const d = await workAdminApi.addCustomProvider(body)
      absorb('custom', d)
      return { ok: d.ok !== false, error: d.error }
    } catch (error) { if (isLockError(error) && onLocked) { onLocked(); return { ok: false } } return { ok: false, error: error.message } }
  }

  return (
    <div className="wka-panel">
      {reasonModal}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 4 }}>
        <h2 style={{ margin: 0 }}><KeyRound size={15} style={{ verticalAlign: '-2px', marginRight: 6, color: 'var(--wka-accent)' }} />AI providers &amp; keys</h2>
        <button type="button" className="wka-btn sm ghost" disabled={state.loading} onClick={load}><RefreshCw size={13} /> Refresh</button>
      </div>
      <p className="desc">Every AI WorkCoPilot can run on. Paste a key, test it, make one primary. Add <b>several keys to a provider</b> and load spreads across them round-robin, so bursts from many users are not rate-limited. One OpenRouter key reaches Qwen and DeepSeek. Keys are stored securely and never shown again.</p>
      {state.loading ? <Loading label="Loading providers" />
        : state.error ? <ErrorBox error={state.error} onRetry={load} />
        : (
          <>
            {!isSuperAdmin ? <div className="wka-note" style={{ marginBottom: 14 }}><Lock size={14} /> Only a superadmin can set provider keys. Current state is shown below.</div> : null}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 12 }}>
              {state.providers.map((p) => (
                <ProviderCard key={p.id} p={p} isSuperAdmin={isSuperAdmin} busy={busy[p.id]} result={results[p.id]}
                  onSaveTest={onSaveTest} onTest={onTest} onActivate={onActivate} onClear={onClear}
                  onAddKey={onAddKey} onRemoveKey={onRemoveKey} onRemoveCustom={onRemoveCustom} />
              ))}
            </div>
            {isSuperAdmin ? <CustomProviderForm onAdd={onAddCustom} /> : null}
          </>
        )}
    </div>
  )
}

// Add any OpenAI-compatible endpoint (base URL + key). The server validates the
// base as a public https host and adds it to the egress allowlist. For when a new
// cost-effective provider appears that is not built in yet.
function CustomProviderForm({ onAdd }) {
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({ id: '', label: '', base: '', chatModels: '', apiKey: '' })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [ok, setOk] = useState(false)
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }))
  const submit = async () => {
    if (busy) return
    setBusy(true); setErr(null); setOk(false)
    const r = await onAdd({ id: f.id, label: f.label, base: f.base, chatModels: f.chatModels, apiKey: f.apiKey })
    if (r.ok) { setOk(true); setF({ id: '', label: '', base: '', chatModels: '', apiKey: '' }); setTimeout(() => { setOk(false); setOpen(false) }, 1600) }
    else setErr(r.error || 'Could not add that provider.')
    setBusy(false)
  }
  if (!open) return (
    <div style={{ marginTop: 14 }}>
      <button type="button" className="wka-btn sm" onClick={() => setOpen(true)}><Plus size={13} /> Add a custom provider</button>
    </div>
  )
  return (
    <div style={{ marginTop: 14, padding: 16, borderRadius: 12, border: '1px dashed var(--wka-line)', background: 'var(--wka-panel-2)' }}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Add a custom provider</div>
      <p className="desc" style={{ marginTop: 0 }}>Any OpenAI-compatible endpoint. The base must be a public https URL - it is added to the egress allowlist after validation.</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="wka-field" style={{ margin: 0 }}><label style={{ fontSize: 11 }}>Id (slug)</label><input className="wka-input" value={f.id} placeholder="e.g. together" onChange={set('id')} disabled={busy} /></div>
        <div className="wka-field" style={{ margin: 0 }}><label style={{ fontSize: 11 }}>Label</label><input className="wka-input" value={f.label} placeholder="e.g. Together AI" onChange={set('label')} disabled={busy} /></div>
        <div className="wka-field" style={{ margin: 0, gridColumn: '1 / -1' }}><label style={{ fontSize: 11 }}>Base URL (https)</label><input className="wka-input wka-mono" value={f.base} placeholder="https://api.together.xyz/v1" onChange={set('base')} disabled={busy} /></div>
        <div className="wka-field" style={{ margin: 0, gridColumn: '1 / -1' }}><label style={{ fontSize: 11 }}>Model ids (comma-separated)</label><input className="wka-input wka-mono" value={f.chatModels} placeholder="meta-llama/Llama-3.3-70B-Instruct-Turbo" onChange={set('chatModels')} disabled={busy} /></div>
        <div className="wka-field" style={{ margin: 0, gridColumn: '1 / -1' }}><label style={{ fontSize: 11 }}>API key</label><input className="wka-input" type="password" autoComplete="new-password" value={f.apiKey} placeholder="paste the key" onChange={set('apiKey')} disabled={busy} /></div>
      </div>
      {err ? <div style={{ marginTop: 10, fontSize: 12, color: 'var(--wka-red)', display: 'flex', gap: 6 }}><XCircle size={14} /> {err}</div> : null}
      {ok ? <div style={{ marginTop: 10, fontSize: 12, color: 'var(--wka-emerald)', display: 'flex', gap: 6 }}><CheckCircle2 size={14} /> Added and tested.</div> : null}
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button type="button" className="wka-btn primary sm" disabled={busy || !f.id.trim() || !f.base.trim() || !f.chatModels.trim()} onClick={submit}>{busy ? <Spinning /> : <Plus size={13} />} Add &amp; test</button>
        <button type="button" className="wka-btn sm ghost" disabled={busy} onClick={() => { setOpen(false); setErr(null) }}>Cancel</button>
      </div>
    </div>
  )
}

// (a) Platform web-search key (Tavily). Grounds live steps in current web
// sources. Read is admin; write is superadmin-only (gate mirrors the toggle).
function WebSearchCard({ isSuperAdmin, onLocked }) {
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
      reason = await askReason({ title: 'Clear the platform web-search key?', detail: 'Live web learning turns off (unless a server env key is set as a fallback) until a key is set again.', confirmLabel: 'Clear key' })
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
function WatchLightCard({ isSuperAdmin, onLocked }) {
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
      <p className="desc">The best and cheapest picks across your configured providers, to choose a model to run on. Researched automatically against each provider's live catalog - refreshed daily, or on demand with Refresh.</p>
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

// A mutation hit while the authenticator window had lapsed server-side.
function isLockError(e) { return !!(e && e.status === 403 && e.data && e.data.locked) }

// The OTP lock that stands in front of the whole page until a code is verified.
function OtpGate({ status, onUnlock }) {
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const needsEnroll = status && !status.mfaEnrolled && !status.breakGlass
  const submit = async (e) => {
    if (e) e.preventDefault()
    if (busy || !code.trim()) return
    setBusy(true); setError(null)
    try { const st = await workAdminApi.verifyAiStepUp(code.trim()); setCode(''); onUnlock(st) }
    catch (err) { setError(err) } finally { setBusy(false) }
  }
  return (
    <div className="wka-panel" style={{ maxWidth: 460, margin: '8px auto', textAlign: 'center' }}>
      <div style={{ width: 52, height: 52, borderRadius: 14, margin: '4px auto 14px', display: 'grid', placeItems: 'center', background: 'rgba(10,157,102,0.1)', border: '1px solid rgba(10,157,102,0.3)' }}>
        <Lock size={22} style={{ color: 'var(--wka-emerald)' }} />
      </div>
      <h2 style={{ justifyContent: 'center' }}>AI settings are locked</h2>
      <p className="desc" style={{ textAlign: 'center' }}>This is a critical page. Enter the 6-digit code from your authenticator to view and change AI configuration. It re-locks automatically after a few minutes of inactivity.</p>
      {needsEnroll ? (
        <div className="wka-note" style={{ marginTop: 10, justifyContent: 'center' }}><AlertTriangle size={14} /> Set up multi-factor authentication on your account first, then return here.</div>
      ) : (
        <form onSubmit={submit} style={{ marginTop: 8 }}>
          <input className="wka-input wka-mono" inputMode="numeric" autoComplete="one-time-code" maxLength={8} placeholder="123456" value={code}
            onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))} autoFocus
            style={{ maxWidth: 200, margin: '0 auto', textAlign: 'center', letterSpacing: '0.4em', fontSize: 20 }} />
          {error ? <div style={{ margin: '12px 0' }}><ErrorBox error={error} /></div> : null}
          <div style={{ marginTop: 14 }}>
            <button type="submit" className="wka-btn primary" disabled={busy || !code.trim()}>{busy ? <Spinning /> : <Shield size={14} />} Verify &amp; open</button>
          </div>
        </form>
      )}
    </div>
  )
}

// Thin banner above the unlocked page: live countdown to auto-lock + lock-now.
function StepUpBanner({ status, onLocked }) {
  const [left, setLeft] = useState(() => Math.max(0, (status.until || 0) - Date.now()))
  useEffect(() => {
    if (status.breakGlass) return
    const t = setInterval(() => {
      const ms = Math.max(0, (status.until || 0) - Date.now())
      setLeft(ms)
      if (ms <= 0) { clearInterval(t); onLocked() }
    }, 1000)
    return () => clearInterval(t)
  }, [status.until, status.breakGlass, onLocked])
  const lockNow = async () => { try { await workAdminApi.lockAiConfig() } catch { /* lock locally regardless */ } onLocked() }
  const mm = Math.floor(left / 60000), ss = Math.floor((left % 60000) / 1000)
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap',
      padding: '9px 14px', marginBottom: 14, borderRadius: 10, border: '1px solid rgba(10,157,102,0.35)', background: 'rgba(10,157,102,0.07)' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 600, color: 'var(--wka-emerald)' }}>
        <CheckCircle2 size={15} />
        {status.breakGlass
          ? 'MFA is disabled platform-wide - AI settings are open.'
          : `Verified with your authenticator - locks in ${mm}:${String(ss).padStart(2, '0')}.`}
      </span>
      {!status.breakGlass ? <button type="button" className="wka-btn sm ghost" onClick={lockNow}><Lock size={13} /> Lock now</button> : null}
    </div>
  )
}

function AiConfigBody({ isSuperAdmin, stepUp, onLocked }) {
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
    } catch (error) { if (isLockError(error)) return onLocked(); setSaveError(error) }
    finally { setSaving(false) }
  }

  if (state.loading) return <Loading label="Loading AI configuration" />
  if (state.error) return <ErrorBox error={state.error} onRetry={load} />

  return (
    <div>
      <StepUpBanner status={stepUp} onLocked={onLocked} />

      <PlatformProviders isSuperAdmin={isSuperAdmin} onLocked={onLocked} />

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

      <WebSearchCard isSuperAdmin={isSuperAdmin} onLocked={onLocked} />
      <WatchLightCard isSuperAdmin={isSuperAdmin} onLocked={onLocked} />
      <RecommendedModels />
    </div>
  )
}

// The page gate: nothing renders until an authenticator code opens the step-up
// window; every change is OTP-backed because mutations require that window too.
export default function AiConfig({ isSuperAdmin }) {
  const [gate, setGate] = useState({ loading: true, error: null, status: null })

  const loadGate = useCallback(async () => {
    setGate((g) => ({ ...g, loading: true, error: null }))
    try { const status = await workAdminApi.aiStepUp(); setGate({ loading: false, error: null, status }) }
    catch (error) { setGate({ loading: false, error, status: null }) }
  }, [])
  useEffect(() => { if (isSuperAdmin) loadGate() }, [isSuperAdmin, loadGate])

  // AI settings are a critical, superadmin-only page (owner 2026-10-23).
  if (!isSuperAdmin) return <div className="wka-note"><Lock size={14} /> AI settings are superadmin-only and protected by an authenticator code.</div>
  if (gate.loading) return <Loading label="Checking AI settings lock" />
  if (gate.error) return <ErrorBox error={gate.error} onRetry={loadGate} />
  if (!gate.status || !gate.status.active) return <OtpGate status={gate.status || {}} onUnlock={(status) => setGate({ loading: false, error: null, status })} />

  return <AiConfigBody isSuperAdmin={isSuperAdmin} stepUp={gate.status} onLocked={loadGate} />
}
