// Platform AI PROVIDERS: the orchestrator for the AI page's provider state.
// Loads the provider list (with the CHAT primary + the VISION pick) and the
// live recommendation, and owns every mutation (key save/test/pool/remove,
// use-for-chat, use-for-vision, custom providers). Renders the Recommended-now
// panel on top and the per-provider cards under it; the pure UI lives in the
// sibling modules. Nothing here is silent (SUPREME RULE III): every call shows
// ok or the exact error on the card it concerns.
import React, { useEffect, useState, useCallback } from 'react'
import { Lock, KeyRound, RefreshCw, Eye } from 'lucide-react'
import { workAdminApi } from '../../workAdminApi.js'
import { Loading, ErrorBox, useReasonModal, isLockError } from '../_shared.jsx'
import { useT } from '../../../../i18n/index.jsx'
import RecommendedNow from './RecommendedNow.jsx'
import ProviderCard from './ProviderCard.jsx'
import CustomProviderForm from './CustomProviderForm.jsx'

export default function PlatformProviders({ isSuperAdmin, onLocked }) {
  const t = useT()
  const [state, setState] = useState({ loading: true, error: null, providers: [], activeProvider: null, visionProvider: null, visionModel: null })
  const [reco, setReco] = useState({ loading: true, refreshing: false, error: null, data: null })
  const [busy, setBusy] = useState({})        // providerId -> true while a call is in flight
  const [recoBusy, setRecoBusy] = useState(null)  // { group:'vision'|'chat', key:'reliable'|... } while a pick applies
  const [recoError, setRecoError] = useState(null)
  const [results, setResults] = useState({})  // providerId -> { ok, visionModel, hasVision } | { ok:false, error }
  // Removing a key / provider takes platform AI (partly) down, so each goes
  // through the shared reason-gated danger confirm (captured + logged).
  const [askReason, reasonModal] = useReasonModal()

  // ONE absorber for every response that carries the provider list, so the
  // chat primary and the vision pick can never drift from the cards (RULE II).
  const absorb = useCallback((d) => {
    if (!d || !d.providers) return
    setState((s) => ({
      ...s, providers: d.providers,
      activeProvider: 'activeProvider' in d ? (d.activeProvider || null) : s.activeProvider,
      visionProvider: 'visionProvider' in d ? (d.visionProvider || null) : s.visionProvider,
      visionModel: 'visionModel' in d ? (d.visionModel || null) : s.visionModel,
    }))
  }, [])

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }))
    try { const d = await workAdminApi.aiProviders(); setState({ loading: false, error: null, providers: d.providers || [], activeProvider: d.activeProvider || null, visionProvider: d.visionProvider || null, visionModel: d.visionModel || null }) }
    catch (error) { if (isLockError(error) && onLocked) return onLocked(); setState((s) => ({ ...s, loading: false, error })) }
  }, [onLocked])
  // The recommendation loads on EVERY open (cached daily server-side); Refresh
  // forces a live recompute against each key's catalog.
  const loadReco = useCallback(async (refresh) => {
    setReco((r) => refresh ? { ...r, refreshing: true, error: null } : { ...r, loading: true, error: null })
    try { const data = await workAdminApi.aiRecommendation(!!refresh); setReco({ loading: false, refreshing: false, error: null, data }) }
    catch (error) { setReco((r) => ({ ...r, loading: false, refreshing: false, error })) }
  }, [])
  useEffect(() => { load(); loadReco(false) }, [load, loadReco])

  const setProvBusy = (id, v) => setBusy((b) => ({ ...b, [id]: v }))
  const fail = (id, error) => { if (isLockError(error) && onLocked) { onLocked(); return true } if (error.data && error.data.providers) absorb(error.data); setResults((r) => ({ ...r, [id]: { ok: false, error: error.message } })); return false }

  const onSaveTest = async (id, body) => {
    if (!isSuperAdmin) return
    setProvBusy(id, true); setResults((r) => ({ ...r, [id]: null }))
    try { const d = await workAdminApi.setAiProvider(id, body); absorb(d); setResults((r) => ({ ...r, [id]: { ok: true, visionModel: d.visionModel, hasVision: d.hasVision } })); loadReco(false) }
    catch (error) { fail(id, error) } finally { setProvBusy(id, false) }
  }
  const onTest = async (id) => {
    if (!isSuperAdmin) return
    setProvBusy(id, true); setResults((r) => ({ ...r, [id]: null }))
    try { const d = await workAdminApi.testAiProvider(id); setResults((r) => ({ ...r, [id]: { ok: true, visionModel: d.visionModel, hasVision: d.hasVision } })) }
    catch (error) { fail(id, error) } finally { setProvBusy(id, false) }
  }
  // CHAT primary (planning + answers).
  const onActivate = async (id) => {
    if (!isSuperAdmin) return
    setProvBusy(id, true)
    try { const d = await workAdminApi.activateAiProvider(id); absorb(d) }
    catch (error) { fail(id, error) } finally { setProvBusy(id, false) }
  }
  // VISION (screen reading): provider + optional model; 'auto' clears the pick.
  const onUseVision = async (id, model) => {
    if (!isSuperAdmin) return
    setProvBusy(id, true)
    try { const d = await workAdminApi.setAiVision(id, model || undefined); absorb(d) }
    catch (error) { fail(id, error) } finally { setProvBusy(id, false) }
  }
  const onVisionAuto = async () => {
    if (!isSuperAdmin) return
    setRecoError(null)
    try { const d = await workAdminApi.setAiVision('auto'); absorb(d) }
    catch (error) { if (isLockError(error) && onLocked) return onLocked(); setRecoError(error) }
  }
  // One-click picks from the Recommended-now panel. Errors surface on the panel.
  const applyPick = async (group, key, fn) => {
    if (!isSuperAdmin) return
    setRecoBusy({ group, key }); setRecoError(null)
    try { absorb(await fn()) }
    catch (error) { if (isLockError(error) && onLocked) return onLocked(); setRecoError(error) }
    finally { setRecoBusy(null) }
  }
  const onRecoVision = (provider, model, key) => applyPick('vision', key, () => workAdminApi.setAiVision(provider, model))
  const onRecoChat = (provider, key) => applyPick('chat', key, () => workAdminApi.activateAiProvider(provider))

  const onClear = async (id) => {
    if (!isSuperAdmin) return
    const reason = await askReason({ title: t('aiConfig.clearKeysTitle'), detail: t('aiConfig.clearKeysDetail'), confirmLabel: t('aiConfig.clearKeysConfirm') })
    if (!reason || reason.length < 3) return
    setProvBusy(id, true); setResults((r) => ({ ...r, [id]: null }))
    try { const d = await workAdminApi.clearAiProvider(id, reason); absorb(d); load(); loadReco(false) }
    catch (error) { fail(id, error) } finally { setProvBusy(id, false) }
  }
  const onAddKey = async (id, key) => {
    if (!isSuperAdmin) return
    setProvBusy(id, true); setResults((r) => ({ ...r, [id]: null }))
    try { const d = await workAdminApi.addAiProviderKey(id, key); absorb(d); setResults((r) => ({ ...r, [id]: { ok: !!d.ok, error: d.error, visionModel: d.visionModel, hasVision: d.hasVision } })) }
    catch (error) { fail(id, error) } finally { setProvBusy(id, false) }
  }
  const onRemoveKey = async (id, index) => {
    if (!isSuperAdmin) return
    const reason = await askReason({ title: t('aiConfig.removeKeyTitle'), detail: t('aiConfig.removeKeyDetail'), confirmLabel: t('aiConfig.removeKeyConfirm') })
    if (!reason || reason.length < 3) return
    setProvBusy(id, true)
    try { const d = await workAdminApi.removeAiProviderKey(id, index, reason); absorb(d); load() }
    catch (error) { fail(id, error) } finally { setProvBusy(id, false) }
  }
  const onRemoveCustom = async (id) => {
    if (!isSuperAdmin) return
    const reason = await askReason({ title: t('aiConfig.removeCustomTitle'), detail: t('aiConfig.removeCustomDetail'), confirmLabel: t('aiConfig.removeCustomConfirm') })
    if (!reason || reason.length < 3) return
    setProvBusy(id, true)
    try { const d = await workAdminApi.removeCustomProvider(id, reason); absorb(d); load() }
    catch (error) { fail(id, error) } finally { setProvBusy(id, false) }
  }
  const onAddCustom = async (body) => {
    if (!isSuperAdmin) return { ok: false, error: t('aiConfig.superadminOnly') }
    try { const d = await workAdminApi.addCustomProvider(body); absorb(d); return { ok: d.ok !== false, error: d.error } }
    catch (error) { if (isLockError(error) && onLocked) { onLocked(); return { ok: false } } return { ok: false, error: error.message } }
  }

  const visionLabel = state.visionProvider ? ((state.providers.find((p) => p.id === state.visionProvider) || {}).label || state.visionProvider) : null

  return (
    <>
      <RecommendedNow reco={reco} providers={state.providers} activeProvider={state.activeProvider} visionProvider={state.visionProvider} visionModel={state.visionModel}
        isSuperAdmin={isSuperAdmin} onRefresh={() => loadReco(true)} onUseVision={onRecoVision} onUseChat={onRecoChat} busy={recoBusy} applyError={recoError} />

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
              {/* The vision pick in one line, with the way back to automatic. */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 14, fontSize: 12.5, color: 'var(--wka-muted)' }}>
                <Eye size={14} style={{ color: 'var(--wka-cyan)', flexShrink: 0 }} />
                <span style={{ minWidth: 0, wordBreak: 'break-word' }}>
                  {visionLabel
                    ? <>{t('aiConfig.visionLine.pinned')} <b style={{ color: 'var(--wka-text)' }}>{visionLabel}{state.visionModel ? ` · ${state.visionModel}` : ''}</b></>
                    : <>{t('aiConfig.visionLine.auto')}</>}
                </span>
                {visionLabel && isSuperAdmin ? <button type="button" className="wka-btn sm ghost" onClick={onVisionAuto}>{t('aiConfig.visionLine.backToAuto')}</button> : null}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 12 }}>
                {state.providers.map((p) => (
                  <ProviderCard key={p.id} p={p} isSuperAdmin={isSuperAdmin} busy={busy[p.id]} result={results[p.id]}
                    isVision={state.visionProvider === p.id} visionModel={state.visionProvider === p.id ? state.visionModel : null}
                    onSaveTest={onSaveTest} onTest={onTest} onActivate={onActivate} onUseVision={onUseVision} onClear={onClear}
                    onAddKey={onAddKey} onRemoveKey={onRemoveKey} onRemoveCustom={onRemoveCustom} />
                ))}
              </div>
              {isSuperAdmin ? <CustomProviderForm onAdd={onAddCustom} /> : null}
            </>
          )}
      </div>
    </>
  )
}
