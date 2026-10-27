// "Recommended now": the one panel that answers "which model should I pick?"
// Two groups, clearly separated - VISION (screen reading) and CHAT (planning +
// answers) - each with a Reliable / Cheapest / Fastest pick drawn from every
// configured key's LIVE catalog (GET ai-recommendation). One click applies a
// pick: vision picks pin that provider + model as the screen reader (/vision);
// chat picks make that provider the chat primary (/activate). Owner 2026-10-27:
// "that screen doesn't tell me which one is vision and which one is chat."
import React from 'react'
import { Sparkles, Eye, MessageSquareText, RefreshCw, Check, ShieldCheck, DollarSign, Zap } from 'lucide-react'
import { Loading, ErrorBox, Spinning, EmptyState } from '../_shared.jsx'
import { useT } from '../../../../i18n/index.jsx'
import { relTime, priceLabel, EYEBROW, CYAN_LINE, EMERALD_LINE } from './format.js'

const KINDS = [
  { key: 'reliable', icon: ShieldCheck, color: 'var(--wka-emerald)' },
  { key: 'cheapest', icon: DollarSign, color: 'var(--wka-accent-dark)' },
  { key: 'fastest', icon: Zap, color: 'var(--wka-amber)' },
]

// One pick row: kind label | bold model + provider + price | apply button.
// The model id is the only thing allowed to wrap (long OpenRouter ids); the
// label and the button never do, so nothing overflows at 640.
function PickRow({ kind, pick, inUse, busy, canApply, onApply }) {
  const t = useT()
  const Icon = kind.icon
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderTop: '1px solid var(--wka-line)', minWidth: 0 }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, width: 84, flexShrink: 0, fontSize: 11.5, fontWeight: 650, color: kind.color, whiteSpace: 'nowrap' }}>
        <Icon size={13} /> {t(`aiConfig.reco.${kind.key}`)}
      </span>
      {pick ? (
        <>
          <div style={{ flex: '1 1 auto', minWidth: 0 }}>
            <div style={{ fontWeight: 750, fontSize: 13.5, lineHeight: 1.3, wordBreak: 'break-word' }}>{pick.model}</div>
            <div style={{ fontSize: 11.5, color: 'var(--wka-muted)', marginTop: 1, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span>{pick.label || pick.provider}</span>
              {priceLabel(pick) ? <span className="wka-mono" style={{ color: 'var(--wka-faint)' }}>{priceLabel(pick)}</span> : null}
            </div>
          </div>
          {inUse
            ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, fontWeight: 650, color: 'var(--wka-emerald)', whiteSpace: 'nowrap', flexShrink: 0 }}><Check size={13} /> {t('aiConfig.reco.inUse')}</span>
            : canApply ? <button type="button" className="wka-btn sm" disabled={busy} onClick={onApply}>{busy ? <Spinning /> : null} {t('aiConfig.reco.use')}</button> : null}
        </>
      ) : <div style={{ flex: 1, fontSize: 12, color: 'var(--wka-faint)' }}>{t('aiConfig.reco.noPick')}</div>}
    </div>
  )
}

// One group (VISION or CHAT): eyebrow, what is in use now, the three picks.
function Group({ icon, color, line, title, sub, now, picks, inUse, busyKey, canApply, onApply }) {
  const t = useT()
  return (
    <div style={{ minWidth: 0, border: `1px solid ${line}`, borderRadius: 12, padding: '14px 16px 6px', background: 'var(--wka-panel)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <span style={{ display: 'inline-grid', placeItems: 'center', width: 26, height: 26, borderRadius: 8, color, background: `color-mix(in srgb, ${color} 10%, transparent)`, flexShrink: 0 }}>{icon}</span>
        <div style={{ minWidth: 0 }}>
          <div style={{ ...EYEBROW, color }}>{title}</div>
          <div style={{ fontSize: 12, color: 'var(--wka-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</div>
        </div>
      </div>
      <div style={{ margin: '10px 0 6px', fontSize: 12, color: 'var(--wka-muted)', minWidth: 0, wordBreak: 'break-word' }}>
        {t('aiConfig.reco.now')} <b style={{ color: 'var(--wka-text)' }}>{now}</b>
      </div>
      {KINDS.map((k) => (
        <PickRow key={k.key} kind={k} pick={picks ? picks[k.key] : null} inUse={!!(picks && picks[k.key] && inUse(picks[k.key]))}
          busy={busyKey === k.key} canApply={canApply} onApply={() => onApply(picks[k.key], k.key)} />
      ))}
    </div>
  )
}

export default function RecommendedNow({ reco, providers, activeProvider, visionProvider, visionModel, isSuperAdmin, onRefresh, onUseVision, onUseChat, busy, applyError }) {
  const t = useT()
  const d = reco.data || {}
  const byId = (id) => providers.find((p) => p.id === id) || null
  const label = (id) => { const p = byId(id); return p ? p.label : (id || '') }
  const chatNow = activeProvider
    ? `${label(activeProvider)} · ${(byId(activeProvider) || {}).chatModel || t('aiConfig.reco.providerDefault')}`
    : t('aiConfig.reco.noneYet')
  const visionNow = visionProvider
    ? `${label(visionProvider)} · ${visionModel || t('aiConfig.reco.providerDefault')}`
    : t('aiConfig.reco.automatic')
  const visionInUse = (pick) => pick.provider === visionProvider && !!visionModel && pick.model === visionModel
  const chatInUse = (pick) => pick.provider === activeProvider && (byId(activeProvider) || {}).chatModel === pick.model
  const hasPicks = !!(d.vision || d.chat)

  return (
    <div className="wka-panel" style={{ border: '1px solid var(--wka-accent-line)', boxShadow: '0 0 0 3px var(--wka-accent-soft), 0 12px 30px -18px rgba(26,31,54,0.17)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 4 }}>
        <h2 style={{ margin: 0, fontSize: 17, display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
          <Sparkles size={17} style={{ color: 'var(--wka-accent)', flexShrink: 0 }} />
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t('aiConfig.reco.title')}</span>
        </h2>
        <button type="button" className="wka-btn sm ghost" disabled={reco.refreshing || reco.loading} onClick={onRefresh}>{reco.refreshing ? <Spinning /> : <RefreshCw size={13} />} {t('aiConfig.refresh')}</button>
      </div>
      <p className="desc">{t('aiConfig.reco.desc')}</p>

      {reco.loading ? <Loading label={t('aiConfig.loadingRecommendation')} />
        : reco.error ? <ErrorBox error={reco.error} onRetry={onRefresh} />
        : !hasPicks ? <EmptyState title={t('aiConfig.noModelsTitle')} detail={d.note || t('aiConfig.configureProviderHint')} />
        : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: 12 }}>
              <Group icon={<Eye size={14} />} color="var(--wka-cyan)" line={CYAN_LINE}
                title={t('aiConfig.reco.visionTitle')} sub={t('aiConfig.reco.visionSub')} now={visionNow}
                picks={d.vision} inUse={visionInUse} busyKey={busy && busy.group === 'vision' ? busy.key : null}
                canApply={isSuperAdmin} onApply={(pick, key) => onUseVision(pick.provider, pick.model, key)} />
              <Group icon={<MessageSquareText size={14} />} color="var(--wka-emerald)" line={EMERALD_LINE}
                title={t('aiConfig.reco.chatTitle')} sub={t('aiConfig.reco.chatSub')} now={chatNow}
                picks={d.chat} inUse={chatInUse} busyKey={busy && busy.group === 'chat' ? busy.key : null}
                canApply={isSuperAdmin} onApply={(pick, key) => onUseChat(pick.provider, key)} />
            </div>
            {applyError ? <div style={{ marginTop: 12 }}><ErrorBox error={applyError} /></div> : null}
            <div style={{ marginTop: 12, fontSize: 11.5, color: 'var(--wka-faint)', lineHeight: 1.5 }}>
              <div>{t('aiConfig.reco.chatApplyNote')}</div>
              {d.note ? <div style={{ marginTop: 4 }}>{d.note}</div> : null}
              {d.at ? <div style={{ marginTop: 4 }}>{t('aiConfig.updated')} {relTime(d.at, t)}</div> : null}
            </div>
          </>
        )}
    </div>
  )
}
