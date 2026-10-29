// ScrubRules - lets an INDIVIDUAL user (not in a company) add or remove their own
// data-protection rules on top of the built-in detectors, so the scrubber is
// customized to what THEY consider sensitive. Company members never see this
// (their company admin governs the policy); the parent decides whether to render
// it. It talks to the same /api/work/policy the admin consoles use, self-scoped.
// Every user-facing string comes from the scrubRules i18n namespace.
import React, { useEffect, useState, useCallback } from 'react'
import { ShieldCheck, Plus, Trash2, Loader2, Check } from 'lucide-react'
import { api } from '../api.js'
import { useT } from '../i18n/index.jsx'

export default function ScrubRules() {
  const t = useT()
  const [st, setSt] = useState({ loading: true, error: '', policy: null, saving: false, saved: false })
  const load = useCallback(() => {
    setSt((s) => ({ ...s, loading: true, error: '' }))
    api.workMyPolicy()
      .then((r) => setSt({ loading: false, error: '', policy: r.policy || {}, saving: false, saved: false }))
      .catch((e) => setSt({ loading: false, error: e.message || t('scrubRules.errors.load'), policy: null, saving: false, saved: false }))
  }, [t])
  useEffect(() => { load() }, [load])
  const patch = (p) => setSt((s) => ({ ...s, policy: { ...s.policy, ...p }, saved: false }))
  const save = async () => {
    const p = st.policy || {}
    setSt((s) => ({ ...s, saving: true, error: '' }))
    try {
      const r = await api.workSaveMyPolicy({
        customFields: (p.customFields || []).filter((f) => f && String(f.label || '').trim() && String(f.pattern || '').trim()),
        blockWords: p.blockWords || [],
        mode: p.mode || 'scrub',
        armed: true,  // saving your own rules turns them on
      })
      setSt((s) => ({ ...s, policy: r.policy, saving: false, saved: true }))
    } catch (e) { setSt((s) => ({ ...s, saving: false, error: e.message || t('scrubRules.errors.save') })) }
  }

  const card = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 18px' }
  const muted = { color: 'var(--text-dim)', fontSize: 13 }
  if (st.loading) return <div style={{ ...card }}><span style={muted}><Loader2 size={14} className="spin" /> {t('scrubRules.loading')}</span></div>
  if (!st.policy) return <div style={{ ...card }}><span style={{ color: 'var(--danger)' }}>{st.error || t('scrubRules.errors.unavailable')}</span> <button className="btn btn-outline btn-sm" onClick={load}>{t('scrubRules.retry')}</button></div>
  const p = st.policy
  const cf = p.customFields || []
  const setCf = (i, k, v) => { const n = [...cf]; n[i] = { ...n[i], [k]: v }; patch({ customFields: n }) }
  // The always-protected detector names: a translated ARRAY (lists translate as units).
  const builtinRaw = t('scrubRules.builtin')
  const builtin = Array.isArray(builtinRaw) ? builtinRaw : []

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <ShieldCheck size={16} style={{ color: 'var(--em, #12a06a)' }} />
        <b style={{ fontSize: 15 }}>{t('scrubRules.title')}</b>
      </div>
      <p style={muted}>{t.rich('scrubRules.lead')}</p>

      <div style={{ marginTop: 10 }}>
        <div style={{ ...muted, fontWeight: 600, marginBottom: 6 }}>{t('scrubRules.alwaysProtected')}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {builtin.map((b) => <span key={b} style={{ fontSize: 12, color: 'var(--text-dim)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 999, padding: '3px 10px' }}>{b}</span>)}
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <div style={{ ...muted, fontWeight: 600, marginBottom: 6 }}>{t('scrubRules.custom.title')}</div>
        {cf.length === 0 && <div style={{ ...muted, fontStyle: 'italic', marginBottom: 8 }}>{t('scrubRules.custom.empty')}</div>}
        {cf.map((f, i) => (
          <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
            <input className="input" style={{ flex: '1 1 150px', minWidth: 0 }} placeholder={t('scrubRules.custom.labelPlaceholder')} value={f.label || ''} onChange={(e) => setCf(i, 'label', e.target.value)} />
            <input className="input" style={{ flex: '1 1 150px', minWidth: 0 }} placeholder={t('scrubRules.custom.patternPlaceholder')} value={f.pattern || ''} onChange={(e) => setCf(i, 'pattern', e.target.value)} />
            <select className="input" style={{ flex: '0 0 120px' }} value={f.action || 'redact'} onChange={(e) => setCf(i, 'action', e.target.value)}>
              <option value="redact">{t('scrubRules.custom.redact')}</option>
              <option value="tokenize">{t('scrubRules.custom.tokenize')}</option>
              <option value="block">{t('scrubRules.custom.block')}</option>
            </select>
            <button className="btn btn-outline btn-sm" title={t('scrubRules.custom.remove')} onClick={() => patch({ customFields: cf.filter((_, k) => k !== i) })}><Trash2 size={14} /></button>
          </div>
        ))}
        <button className="btn btn-outline btn-sm" style={{ marginTop: 4 }} onClick={() => patch({ customFields: [...cf, { label: '', pattern: '', action: 'redact' }] })}><Plus size={14} /> {t('scrubRules.custom.add')}</button>
      </div>

      <div style={{ marginTop: 16 }}>
        <div style={{ ...muted, fontWeight: 600, marginBottom: 6 }}>{t('scrubRules.blockWords.title')} <span style={{ fontWeight: 400 }}>{t('scrubRules.blockWords.hint')}</span></div>
        <textarea className="input" rows={3} style={{ width: '100%', resize: 'vertical', fontFamily: 'inherit' }}
          placeholder={t('scrubRules.blockWords.placeholder')}
          value={(p.blockWords || []).join('\n')}
          onChange={(e) => patch({ blockWords: e.target.value.split('\n').map((x) => x.trim()).filter(Boolean) })} />
      </div>

      {st.error && <div style={{ color: 'var(--danger)', fontSize: 13, marginTop: 10 }}>{st.error}</div>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14 }}>
        <button className="btn btn-primary" onClick={save} disabled={st.saving}>{st.saving ? <><Loader2 size={14} className="spin" /> {t('scrubRules.saving')}</> : t('scrubRules.save')}</button>
        {st.saved && <span style={{ color: 'var(--em, #12a06a)', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 5 }}><Check size={14} /> {t('scrubRules.saved')}</span>}
      </div>
    </div>
  )
}
