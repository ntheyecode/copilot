// One platform-AI provider card. Says PLAINLY which job the provider has:
// "Primary for chat" (planning + answers) and/or "Reads the screen" (vision),
// with SEPARATE controls for each - "Use for chat" and "Use for vision", the
// latter with a dropdown of this provider's live models so the admin picks WHICH
// model reads the screen (sent as body.model). Key add / test / pool / remove
// controls are unchanged. The raw key is never shown (masked tail only).
import React, { useState, useEffect } from 'react'
import { CheckCircle2, XCircle, KeyRound, Eye, MessageSquareText } from 'lucide-react'
import { Spinning } from '../_shared.jsx'
import { useT } from '../../../../i18n/index.jsx'
import { EMERALD_LINE, EMERALD_WASH, EMERALD_RING, CYAN_LINE, CYAN_WASH, pillStyle, EYEBROW } from './format.js'

const ROW = { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', minWidth: 0 }
const ROLE_LABEL = { display: 'inline-flex', alignItems: 'center', gap: 5, width: 62, flexShrink: 0, fontSize: 11.5, fontWeight: 650, whiteSpace: 'nowrap' }

export default function ProviderCard({ p, isVision, visionModel, isSuperAdmin, busy, result, onSaveTest, onTest, onActivate, onUseVision, onClear, onAddKey, onRemoveKey, onRemoveCustom }) {
  const t = useT()
  const [key, setKey] = useState('')
  const [model, setModel] = useState(p.chatModel || '')
  // The vision dropdown starts on what reads the screen today (when this
  // provider does), otherwise on "provider default".
  const [vModel, setVModel] = useState(isVision ? (visionModel || '') : '')
  // Follow the live pick (a one-click apply from Recommended-now changes it).
  useEffect(() => { setVModel(isVision ? (visionModel || '') : '') }, [isVision, visionModel])
  const working = !!busy
  const keys = p.keysMasked && p.keysMasked.length ? p.keysMasked : (p.keyMasked ? [p.keyMasked] : [])
  const models = Array.isArray(p.chatModels) ? p.chatModels : []
  const visionCurrent = isVision && (vModel || '') === (visionModel || '')
  const line = p.active ? EMERALD_LINE : (isVision ? CYAN_LINE : 'var(--wka-line)')
  const wash = p.active ? EMERALD_WASH : (isVision ? CYAN_WASH : null)

  return (
    <div style={{
      position: 'relative', display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0,
      padding: '16px 16px 14px', borderRadius: 12, border: `1px solid ${line}`,
      background: wash ? `linear-gradient(160deg, ${wash}, var(--wka-panel-2) 60%)` : 'var(--wka-panel-2)',
      boxShadow: p.active ? `0 0 0 3px ${EMERALD_RING}` : 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0, flex: '1 1 160px' }}>
          <div style={{ fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.label}</span>
            {p.custom ? <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.05em', color: 'var(--wka-accent)', border: '1px solid var(--wka-accent)', borderRadius: 999, padding: '1px 6px', flexShrink: 0 }}>{t('aiConfig.customBadge')}</span> : null}
          </div>
          <div style={{ fontSize: 12, color: 'var(--wka-muted)', lineHeight: 1.4, marginTop: 2 }}>{p.blurb}</div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {p.active ? <span style={pillStyle('var(--wka-emerald)')}><MessageSquareText size={11} /> {t('aiConfig.role.primaryChat')}</span> : null}
          {isVision ? <span style={pillStyle('var(--wka-cyan)')}><Eye size={11} /> {t('aiConfig.role.readsScreen')}</span> : null}
          {!p.active && !isVision ? (
            <span style={pillStyle(p.configured ? 'var(--wka-muted)' : 'var(--wka-faint)')}>{p.configured ? <KeyRound size={11} /> : null}{p.configured ? t('aiConfig.state.configured') : t('aiConfig.state.notSet')}</span>
          ) : null}
        </div>
      </div>

      {p.configured ? (
        <div style={{ fontSize: 12, color: 'var(--wka-muted)' }}>
          <div style={{ ...EYEBROW, marginBottom: 4 }}>{keys.length > 1 ? t('aiConfig.keysPool', { n: keys.length }) : t('aiConfig.keyOne')}</div>
          {keys.map((km, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
              <code className="wka-mono">{km}</code>
              {isSuperAdmin && onRemoveKey ? <button type="button" className="wka-btn sm ghost" disabled={working} onClick={() => onRemoveKey(p.id, i)} title={t('aiConfig.removeThisKey')} style={{ color: 'var(--wka-red)', padding: '0 7px', lineHeight: 1.6 }}>×</button> : null}
            </div>
          ))}
        </div>
      ) : null}

      {/* ROLES: what this provider does today, and the two separate switches. */}
      {p.configured ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--wka-line)', background: 'var(--wka-panel)' }}>
          <div style={ROW}>
            <span style={{ ...ROLE_LABEL, color: 'var(--wka-emerald)' }}><MessageSquareText size={13} /> {t('aiConfig.role.chat')}</span>
            {p.active
              ? <span style={{ fontSize: 12, color: 'var(--wka-muted)', minWidth: 0, wordBreak: 'break-word' }}>{t('aiConfig.role.chatNow', { model: p.chatModel || t('aiConfig.reco.providerDefault') })}</span>
              : isSuperAdmin ? <button type="button" className="wka-btn sm" disabled={working} onClick={() => onActivate(p.id)}>{t('aiConfig.role.useForChat')}</button>
                : <span style={{ fontSize: 12, color: 'var(--wka-faint)' }}>{t('aiConfig.role.notChat')}</span>}
          </div>
          <div style={ROW}>
            <span style={{ ...ROLE_LABEL, color: 'var(--wka-cyan)' }}><Eye size={13} /> {t('aiConfig.role.vision')}</span>
            {isSuperAdmin ? (
              // Select + status share one flexible group, so when a narrow card
              // wraps, the status lands under the select, not under the label.
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', flex: '1 1 160px', minWidth: 0 }}>
                <select className="wka-select" value={vModel} onChange={(e) => setVModel(e.target.value)} disabled={working} aria-label={t('aiConfig.role.visionModel')} style={{ flex: '1 1 140px', minWidth: 0, maxWidth: '100%' }}>
                  <option value="">{t('aiConfig.reco.providerDefault')}</option>
                  {models.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
                {visionCurrent
                  ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, fontWeight: 650, color: 'var(--wka-cyan)', whiteSpace: 'nowrap', flexShrink: 0 }}><CheckCircle2 size={13} /> {t('aiConfig.role.visionNow')}</span>
                  : <button type="button" className="wka-btn sm" disabled={working} onClick={() => onUseVision(p.id, vModel || null)}>{isVision ? t('aiConfig.role.switchVisionModel') : t('aiConfig.role.useForVision')}</button>}
              </div>
            ) : <span style={{ fontSize: 12, color: isVision ? 'var(--wka-muted)' : 'var(--wka-faint)', minWidth: 0, wordBreak: 'break-word' }}>{isVision ? (visionModel || t('aiConfig.reco.providerDefault')) : t('aiConfig.role.notVision')}</span>}
          </div>
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
          {models.length ? (
            <div className="wka-field" style={{ margin: 0 }}>
              <label style={{ fontSize: 11 }}>{t('aiConfig.chatModelOptional')}</label>
              <select className="wka-select" value={model} onChange={(e) => setModel(e.target.value)} disabled={working} style={{ maxWidth: '100%' }}>
                <option value="">{t('aiConfig.autoDefault')}</option>
                {models.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          ) : null}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 2 }}>
            <button type="button" className="wka-btn primary sm" disabled={working || !key.trim()} onClick={() => { onSaveTest(p.id, { apiKey: key.trim(), chatModel: model || undefined }); setKey('') }} title={p.configured ? t('aiConfig.replacePoolTitle') : t('aiConfig.saveTestTitle')}>
              {working ? <Spinning /> : <KeyRound size={13} />} {t('aiConfig.saveTest')}
            </button>
            {p.configured && onAddKey ? <button type="button" className="wka-btn sm" disabled={working || !key.trim()} onClick={() => { onAddKey(p.id, key.trim()); setKey('') }} title={t('aiConfig.addToPoolTitle')}>{t('aiConfig.addToPool')}</button> : null}
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
