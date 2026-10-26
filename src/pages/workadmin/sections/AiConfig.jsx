// AI config: the platform-AI setting for WorkCoPilot. Two facts, surfaced
// plainly and never silently (SUPREME RULE III):
//   1. Is platform AI allowed for WorkCoPilot users? (toggle, superadmin-only)
//   2. Is a platform provider actually configured and ready to answer?
// No API key value and no provider/model name is ever shown.
import React, { useEffect, useState, useCallback } from 'react'
import { Lock, CheckCircle2, XCircle, Shield, Globe, Sparkles, RefreshCw, Eye, KeyRound, DollarSign, Award, Plus, Cpu } from 'lucide-react'
import { workAdminApi } from '../workAdminApi.js'
import { fmtDateTime } from '../workadmin.css.js'
// Step-up gate, banner, lock-error check and the live-state row all come from
// the shared primitives (SUPREME RULE II): this file used to carry private copies
// of each, which is how the AI page drifted visually from SMTP / Claims.
import { Loading, ErrorBox, Spinning, SavedTag, EmptyState, useReasonModal, StateRow, StepUpGate, StepUpBanner, isLockError } from './_shared.jsx'
import { useT } from '../../../i18n/index.jsx'

// Token-only tints for the "active / recommended" card treatment (no rgba
// literals - the console accent + emerald tokens are the single source).
const EMERALD_LINE = 'color-mix(in srgb, var(--wka-emerald) 55%, transparent)'
const EMERALD_WASH = 'color-mix(in srgb, var(--wka-emerald) 9%, transparent)'
const EMERALD_RING = 'color-mix(in srgb, var(--wka-emerald) 8%, transparent)'

// Relative time ("3 min ago") for the recommendation's computed-at stamp.
function relTime(at, t) {
  if (!at) return ''
  const ts = new Date(at).getTime()
  if (isNaN(ts)) return ''
  const diff = Math.max(0, Date.now() - ts)
  const s = Math.round(diff / 1000)
  if (s < 45) return t('aiConfig.time.justNow')
  const m = Math.round(s / 60)
  if (m < 60) return t('aiConfig.time.minAgo', { n: m })
  const h = Math.round(m / 60)
  if (h < 24) return t('aiConfig.time.hoursAgo', { n: h })
  const d = Math.round(h / 24)
  return t('aiConfig.time.daysAgo', { n: d })
}

function priceLabel(m) {
  if (!m || m.usdPerMtok == null || !isFinite(Number(m.usdPerMtok))) return ''
  return `$${Number(m.usdPerMtok).toFixed(2)} /Mtok`
}

const VIS_TAG = {
  display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10.5, fontWeight: 700,
  color: 'var(--wka-emerald)', border: '1px solid color-mix(in srgb, var(--wka-emerald) 40%, transparent)', background: EMERALD_RING,
  borderRadius: 999, padding: '2px 7px', whiteSpace: 'nowrap',
}

// One "overall" pick tile (cheapest / cheapest-with-vision / best).
function Pick({ title, icon, pick }) {
  const t = useT()
  return (
    <div style={{ flex: '1 1 200px', minWidth: 0, border: '1px solid var(--wka-line)', borderRadius: 10, padding: '14px 16px', background: 'var(--wka-panel-2)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'var(--wka-muted)', fontWeight: 600 }}>{icon}{title}</div>
      {pick ? (
        <div style={{ marginTop: 9 }}>
          <div style={{ fontSize: 12, color: 'var(--wka-faint)' }}>{pick.label || pick.provider}</div>
          <div style={{ fontWeight: 650, fontSize: 14, wordBreak: 'break-word' }}>{pick.model}</div>
          <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {priceLabel(pick) ? <span className="wka-mono" style={{ fontSize: 12, color: 'var(--wka-muted)' }}>{priceLabel(pick)}</span> : null}
            {pick.vision ? <span style={VIS_TAG}><Eye size={11} /> {t('aiConfig.vision')}</span> : null}
          </div>
        </div>
      ) : <div style={{ marginTop: 9, fontSize: 12.5, color: 'var(--wka-faint)' }}>{t('aiConfig.noPick')}</div>}
    </div>
  )
}

// One provider's compact summary line in the recommendation list.
function ProviderRow({ p }) {
  const t = useT()
  return (
    <div style={{ display: 'flex', gap: 12, padding: '9px 0', borderBottom: '1px solid var(--wka-line)', flexWrap: 'wrap', alignItems: 'baseline' }}>
      <div style={{ fontWeight: 600, minWidth: 130 }}>{p.label || p.provider} <span style={{ color: 'var(--wka-faint)', fontWeight: 400, fontSize: 12 }}>· {t.n('aiConfig.modelCount', p.count)}</span></div>
      <div style={{ fontSize: 12, color: 'var(--wka-muted)', flex: 1, minWidth: 180 }}>
        {p.cheapest ? <span>{t('aiConfig.cheapestLabel')} <b>{p.cheapest.model}</b> {priceLabel(p.cheapest)}{p.cheapest.vision ? ` ${t('aiConfig.visionParen')}` : ''}</span> : <span style={{ color: 'var(--wka-faint)' }}>{t('aiConfig.noPricedModel')}</span>}
        {p.best ? <span style={{ display: 'block' }}>{t('aiConfig.bestLabel')} <b>{p.best.model}</b>{p.best.quality ? ` ${t('aiConfig.qualitySuffix', { q: p.best.quality })}` : ''}{p.best.vision ? ` ${t('aiConfig.visionParen')}` : ''}</span> : null}
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
  const t = useT()
  const rec = !!m.recommended
  const avoid = !!m.avoid
  const ck = m.id.replace(/\./g, '_')
  return (
    <div style={{
      position: 'relative', display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0,
      padding: '16px 16px 14px', borderRadius: 12,
      border: rec ? `1px solid ${EMERALD_LINE}` : '1px solid var(--wka-line)',
      background: rec ? `linear-gradient(160deg, ${EMERALD_WASH}, var(--wka-panel-2) 60%)` : 'var(--wka-panel-2)',
      boxShadow: rec ? `0 0 0 3px ${EMERALD_RING}` : 'none',
      opacity: avoid ? 0.62 : 1,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, color: 'var(--wka-faint)' }}>{m.provider}</div>
          <div style={{ fontWeight: 700, fontSize: 15, wordBreak: 'break-word', textDecoration: avoid ? 'line-through' : 'none', textDecorationColor: 'var(--wka-faint)' }}>{m.model}</div>
        </div>
        {rec ? <span style={{ ...VIS_TAG, fontSize: 10.5, padding: '3px 9px' }}><Award size={11} /> {t('aiConfig.recommendedCheapest')}</span> : null}
        {avoid ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10.5, fontWeight: 700, color: 'var(--wka-red)', border: '1px solid color-mix(in srgb, var(--wka-red) 40%, transparent)', borderRadius: 999, padding: '3px 9px', whiteSpace: 'nowrap' }}><XCircle size={11} /> {t('aiConfig.avoidForVision')}</span> : null}
      </div>

      {avoid ? null : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <div style={CM_LABEL}>{t('aiConfig.per1M')}</div>
            <div className="wka-mono" style={{ marginTop: 3, fontWeight: 650, fontSize: 13.5 }}>{m.priceIn} <span style={{ color: 'var(--wka-faint)', fontWeight: 400 }}>{t('aiConfig.in')}</span> / {m.priceOut} <span style={{ color: 'var(--wka-faint)', fontWeight: 400 }}>{t('aiConfig.out')}</span></div>
            {m.priceNote ? <div style={{ fontSize: 11, color: 'var(--wka-faint)', marginTop: 1 }}>({t(`aiConfig.cost.${ck}.priceNote`)})</div> : null}
          </div>
          <div>
            <div style={CM_LABEL}>{t('aiConfig.estPerHour')}</div>
            <div className="wka-mono" style={{ marginTop: 3, fontWeight: 700, fontSize: 15, color: rec ? 'var(--wka-emerald)' : 'inherit' }}>{m.perHour}</div>
          </div>
          <div>
            <div style={CM_LABEL}>{t('aiConfig.speed')}</div>
            <div className="wka-mono" style={{ marginTop: 3, fontWeight: 600, fontSize: 13.5 }}>{m.speed}</div>
          </div>
        </div>
      )}

      <div style={{ fontSize: 12.5, lineHeight: 1.45, color: avoid ? 'var(--wka-muted)' : 'var(--wka-muted)', borderTop: '1px solid var(--wka-line)', paddingTop: 10, marginTop: 'auto' }}>{t(`aiConfig.cost.${ck}.note`)}</div>
    </div>
  )
}

// Research panel: cheapest-first comparison. Sits above the provider/key form.
function CostEffectiveModels() {
  const t = useT()
  return (
    <div className="wka-panel">
      <h2><DollarSign size={15} style={{ verticalAlign: '-2px', marginRight: 6, color: 'var(--wka-emerald)' }} />{t('aiConfig.costTitle')}</h2>
      <p className="desc">{t('aiConfig.costDesc')}</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 270px), 1fr))', gap: 12 }}>
        {COST_MODELS.map((m) => <CostModelCard key={m.id} m={m} />)}
      </div>
      <div style={{ marginTop: 14, fontSize: 11.5, color: 'var(--wka-faint)', lineHeight: 1.5 }}>
        {t('aiConfig.costFootnote')}
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
  const t = useT()
  const [key, setKey] = useState('')
  const [model, setModel] = useState(p.chatModel || '')
  const working = !!busy
  const keys = p.keysMasked && p.keysMasked.length ? p.keysMasked : (p.keyMasked ? [p.keyMasked] : [])
  const stateLabel = p.active ? t('aiConfig.state.primaryLive') : (p.configured ? t('aiConfig.state.configured') : t('aiConfig.state.notSet'))
  const stateColor = p.active ? 'var(--wka-emerald)' : (p.configured ? 'var(--wka-cyan)' : 'var(--wka-faint)')
  return (
    <div style={{
      position: 'relative', display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0,
      padding: '16px 16px 14px', borderRadius: 12,
      border: p.active ? `1px solid ${EMERALD_LINE}` : '1px solid var(--wka-line)',
      background: p.active ? `linear-gradient(160deg, ${EMERALD_WASH}, var(--wka-panel-2) 60%)` : 'var(--wka-panel-2)',
      boxShadow: p.active ? `0 0 0 3px ${EMERALD_RING}` : 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 7 }}>{p.label}{p.custom ? <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.05em', color: 'var(--wka-accent)', border: '1px solid var(--wka-accent)', borderRadius: 999, padding: '1px 6px' }}>{t('aiConfig.customBadge')}</span> : null}</div>
          <div style={{ fontSize: 12, color: 'var(--wka-muted)', lineHeight: 1.4, marginTop: 2 }}>{p.blurb}</div>
        </div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10.5, fontWeight: 700, color: stateColor, border: `1px solid ${stateColor}`, borderRadius: 999, padding: '3px 9px', whiteSpace: 'nowrap' }}>
          {p.active ? <CheckCircle2 size={11} /> : (p.configured ? <KeyRound size={11} /> : null)}{stateLabel}
        </span>
      </div>

      {p.configured ? (
        <div style={{ fontSize: 12, color: 'var(--wka-muted)' }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--wka-faint)', marginBottom: 4 }}>
            {keys.length > 1 ? t('aiConfig.keysPool', { n: keys.length }) : t('aiConfig.keyOne')}
          </div>
          {keys.map((km, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
              <code className="wka-mono">{km}</code>
              {isSuperAdmin && onRemoveKey ? <button type="button" className="wka-btn sm ghost" disabled={working} onClick={() => onRemoveKey(p.id, i)} title={t('aiConfig.removeThisKey')} style={{ color: 'var(--wka-red)', padding: '0 7px', lineHeight: 1.6 }}>×</button> : null}
            </div>
          ))}
          {p.chatModel ? <div style={{ marginTop: 2 }}>{t('aiConfig.modelLabel')} <code className="wka-mono">{p.chatModel}</code></div> : null}
        </div>
      ) : null}

      {result ? (
        result.ok
          ? <div style={{ fontSize: 12, color: 'var(--wka-emerald)', display: 'flex', alignItems: 'center', gap: 6 }}><CheckCircle2 size={14} /> {t('aiConfig.testedOk')}{result.hasVision ? ` ${t('aiConfig.readsScreens', { model: result.visionModel })}` : ` ${t('aiConfig.noVisionFound')}`}</div>
          : <div style={{ fontSize: 12, color: 'var(--wka-red)', display: 'flex', alignItems: 'flex-start', gap: 6 }}><XCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} /> {result.error}</div>
      ) : null}

      {isSuperAdmin ? (
        <>
          <div className="wka-field" style={{ margin: 0 }}>
            <label style={{ fontSize: 11 }}>{p.configured ? t('aiConfig.addReplaceKey') : t('aiConfig.apiKey')}</label>
            <input className="wka-input" type="password" autoComplete="new-password" value={key} placeholder={p.keyHint || t('aiConfig.pasteKey')} onChange={(e) => setKey(e.target.value)} disabled={working} />
          </div>
          {p.chatModels && p.chatModels.length ? (
            <div className="wka-field" style={{ margin: 0 }}>
              <label style={{ fontSize: 11 }}>{t('aiConfig.chatModelOptional')}</label>
              <select className="wka-select" value={model} onChange={(e) => setModel(e.target.value)} disabled={working}>
                <option value="">{t('aiConfig.autoDefault')}</option>
                {p.chatModels.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          ) : null}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 2 }}>
            <button type="button" className="wka-btn primary sm" disabled={working || !key.trim()} onClick={() => { onSaveTest(p.id, { apiKey: key.trim(), chatModel: model || undefined }); setKey('') }} title={p.configured ? t('aiConfig.replacePoolTitle') : t('aiConfig.saveTestTitle')}>
              {working ? <Spinning /> : <KeyRound size={13} />} {t('aiConfig.saveTest')}
            </button>
            {p.configured && onAddKey ? <button type="button" className="wka-btn sm" disabled={working || !key.trim()} onClick={() => { onAddKey(p.id, key.trim()); setKey('') }} title={t('aiConfig.addToPoolTitle')}>{t('aiConfig.addToPool')}</button> : null}
            {p.configured && !p.active ? <button type="button" className="wka-btn sm" disabled={working} onClick={() => onActivate(p.id)}>{t('aiConfig.makePrimary')}</button> : null}
            {p.configured ? <button type="button" className="wka-btn sm ghost" disabled={working} onClick={() => onTest(p.id)}>{t('aiConfig.reTest')}</button> : null}
            {p.configured && !p.custom ? <button type="button" className="wka-btn sm ghost" disabled={working} onClick={() => onClear(p.id)} style={{ color: 'var(--wka-red)' }}>{t('aiConfig.clearAll')}</button> : null}
            {p.custom && onRemoveCustom ? <button type="button" className="wka-btn sm ghost" disabled={working} onClick={() => onRemoveCustom(p.id)} style={{ color: 'var(--wka-red)' }}>{t('aiConfig.removeProvider')}</button> : null}
          </div>
          {p.keysUrl ? <a href={p.keysUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: 'var(--wka-faint)' }}>{t('aiConfig.whereToGetKey', { label: p.label })}</a> : null}
        </>
      ) : null}
    </div>
  )
}

function PlatformProviders({ isSuperAdmin, onLocked }) {
  const t = useT()
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
    const reason = await askReason({ title: t('aiConfig.clearKeysTitle'), detail: t('aiConfig.clearKeysDetail'), confirmLabel: t('aiConfig.clearKeysConfirm') })
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
    const reason = await askReason({ title: t('aiConfig.removeKeyTitle'), detail: t('aiConfig.removeKeyDetail'), confirmLabel: t('aiConfig.removeKeyConfirm') })
    if (!reason || reason.length < 3) return
    setProvBusy(id, true)
    try { const d = await workAdminApi.removeAiProviderKey(id, index, reason); absorb(id, d) }
    catch (error) { if (isLockError(error) && onLocked) return onLocked(); setResults((r) => ({ ...r, [id]: { ok: false, error: error.message } })) }
    finally { setProvBusy(id, false) }
  }
  const onRemoveCustom = async (id) => {
    if (!isSuperAdmin) return
    const reason = await askReason({ title: t('aiConfig.removeCustomTitle'), detail: t('aiConfig.removeCustomDetail'), confirmLabel: t('aiConfig.removeCustomConfirm') })
    if (!reason || reason.length < 3) return
    setProvBusy(id, true)
    try { const d = await workAdminApi.removeCustomProvider(id, reason); absorb(id, d) }
    catch (error) { if (isLockError(error) && onLocked) return onLocked(); setResults((r) => ({ ...r, [id]: { ok: false, error: error.message } })) }
    finally { setProvBusy(id, false) }
  }
  const onAddCustom = async (body) => {
    if (!isSuperAdmin) return { ok: false, error: t('aiConfig.superadminOnly') }
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
        <h2 style={{ margin: 0 }}><KeyRound size={15} style={{ verticalAlign: '-2px', marginRight: 6, color: 'var(--wka-accent)' }} />{t('aiConfig.providersTitle')}</h2>
        <button type="button" className="wka-btn sm ghost" disabled={state.loading} onClick={load}><RefreshCw size={13} /> {t('aiConfig.refresh')}</button>
      </div>
      <p className="desc">{t.rich('aiConfig.providersDesc')}</p>
      {state.loading ? <Loading label={t('aiConfig.loadingProviders')} />
        : state.error ? <ErrorBox error={state.error} onRetry={load} />
        : (
          <>
            {!isSuperAdmin ? <div className="wka-note" style={{ marginBottom: 14 }}><Lock size={14} /> {t('aiConfig.superadminSetKeys')}</div> : null}
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
  const t = useT()
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
    else setErr(r.error || t('aiConfig.couldNotAdd'))
    setBusy(false)
  }
  if (!open) return (
    <div style={{ marginTop: 14 }}>
      <button type="button" className="wka-btn sm" onClick={() => setOpen(true)}><Plus size={13} /> {t('aiConfig.addCustomProvider')}</button>
    </div>
  )
  return (
    <div style={{ marginTop: 14, padding: 16, borderRadius: 12, border: '1px dashed var(--wka-line)', background: 'var(--wka-panel-2)' }}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{t('aiConfig.addCustomProvider')}</div>
      <p className="desc" style={{ marginTop: 0 }}>{t('aiConfig.customDesc')}</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="wka-field" style={{ margin: 0 }}><label style={{ fontSize: 11 }}>{t('aiConfig.idLabel')}</label><input className="wka-input" value={f.id} placeholder={t('aiConfig.idPlaceholder')} onChange={set('id')} disabled={busy} /></div>
        <div className="wka-field" style={{ margin: 0 }}><label style={{ fontSize: 11 }}>{t('aiConfig.labelLabel')}</label><input className="wka-input" value={f.label} placeholder={t('aiConfig.labelPlaceholder')} onChange={set('label')} disabled={busy} /></div>
        <div className="wka-field" style={{ margin: 0, gridColumn: '1 / -1' }}><label style={{ fontSize: 11 }}>{t('aiConfig.baseUrlLabel')}</label><input className="wka-input wka-mono" value={f.base} placeholder="https://api.together.xyz/v1" onChange={set('base')} disabled={busy} /></div>
        <div className="wka-field" style={{ margin: 0, gridColumn: '1 / -1' }}><label style={{ fontSize: 11 }}>{t('aiConfig.modelIdsLabel')}</label><input className="wka-input wka-mono" value={f.chatModels} placeholder="meta-llama/Llama-3.3-70B-Instruct-Turbo" onChange={set('chatModels')} disabled={busy} /></div>
        <div className="wka-field" style={{ margin: 0, gridColumn: '1 / -1' }}><label style={{ fontSize: 11 }}>{t('aiConfig.apiKey')}</label><input className="wka-input" type="password" autoComplete="new-password" value={f.apiKey} placeholder={t('aiConfig.pasteKey')} onChange={set('apiKey')} disabled={busy} /></div>
      </div>
      {err ? <div style={{ marginTop: 10, fontSize: 12, color: 'var(--wka-red)', display: 'flex', gap: 6 }}><XCircle size={14} /> {err}</div> : null}
      {ok ? <div style={{ marginTop: 10, fontSize: 12, color: 'var(--wka-emerald)', display: 'flex', gap: 6 }}><CheckCircle2 size={14} /> {t('aiConfig.addedTested')}</div> : null}
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button type="button" className="wka-btn primary sm" disabled={busy || !f.id.trim() || !f.base.trim() || !f.chatModels.trim()} onClick={submit}>{busy ? <Spinning /> : <Plus size={13} />} {t('aiConfig.addTest')}</button>
        <button type="button" className="wka-btn sm ghost" disabled={busy} onClick={() => { setOpen(false); setErr(null) }}>{t('aiConfig.cancel')}</button>
      </div>
    </div>
  )
}

// (a) Platform web-search key (Tavily). Grounds live steps in current web
// sources. Read is admin; write is superadmin-only (gate mirrors the toggle).
function WebSearchCard({ isSuperAdmin, onLocked }) {
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

// Plan-heavy / watch-light is OUR model: the superadmin forces it on for premium
// users (company premium members + regular premium). Users have no control.
function WatchLightCard({ isSuperAdmin, onLocked }) {
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

// (b) Best + cheapest model guidance across configured providers. Refresh forces
// a live recompute. Any overall pick can be null (shown as "No pick available").
function RecommendedModels() {
  const t = useT()
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
        <h2 style={{ margin: 0 }}><Sparkles size={15} style={{ verticalAlign: '-2px', marginRight: 6, color: 'var(--wka-accent)' }} />{t('aiConfig.recommendedTitle')}</h2>
        <button type="button" className="wka-btn sm ghost" disabled={refreshing || state.loading} onClick={() => load(true)}>{refreshing ? <Spinning /> : <RefreshCw size={13} />} {t('aiConfig.refresh')}</button>
      </div>
      <p className="desc">{t('aiConfig.recommendedDesc')}</p>
      {state.loading ? <Loading label={t('aiConfig.loadingRecommendation')} />
        : state.error ? <ErrorBox error={state.error} onRetry={() => load(false)} />
        : providers.length === 0 ? <EmptyState title={t('aiConfig.noModelsTitle')} detail={d.note || t('aiConfig.configureProviderHint')} />
        : (
          <>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Pick title={t('aiConfig.pickCheapest')} icon={<DollarSign size={14} style={{ color: 'var(--wka-emerald)' }} />} pick={overall.cheapest} />
              <Pick title={t('aiConfig.pickCheapestVision')} icon={<Eye size={14} style={{ color: 'var(--wka-cyan)' }} />} pick={overall.cheapestVision} />
              <Pick title={t('aiConfig.pickBest')} icon={<Award size={14} style={{ color: 'var(--wka-amber)' }} />} pick={overall.best} />
            </div>
            <div style={{ marginTop: 16 }}>
              {providers.map((p) => <ProviderRow key={p.provider} p={p} />)}
            </div>
            <div style={{ marginTop: 14, fontSize: 11.5, color: 'var(--wka-faint)' }}>
              {d.note ? <div>{d.note}</div> : null}
              {d.at ? <div style={{ marginTop: 4 }}>{t('aiConfig.updated')} {relTime(d.at, t)}</div> : null}
            </div>
          </>
        )}
    </div>
  )
}

function AiConfigBody({ isSuperAdmin, stepUp, onLocked }) {
  const t = useT()
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

  if (state.loading) return <Loading label={t('aiConfig.loadingConfig')} />
  if (state.error) return <ErrorBox error={state.error} onRetry={load} />

  return (
    <div>
      <StepUpBanner status={stepUp} onLocked={onLocked} lock={workAdminApi.lockAiConfig} label={t('aiConfig.aiSettingsLabel')} />

      <PlatformProviders isSuperAdmin={isSuperAdmin} onLocked={onLocked} />

      <CostEffectiveModels />

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
          detail={state.ready
            ? t('aiConfig.readyDetail')
            : (state.allowed ? t('aiConfig.onNoProviderDetail') : t('aiConfig.offReadinessDetail'))} />
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
