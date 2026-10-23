// ScrubRules - lets an INDIVIDUAL user (not in a company) add or remove their own
// data-protection rules on top of the built-in detectors, so the scrubber is
// customized to what THEY consider sensitive. Company members never see this
// (their company admin governs the policy); the parent decides whether to render
// it. It talks to the same /api/work/policy the admin consoles use, self-scoped.
import React, { useEffect, useState, useCallback } from 'react'
import { ShieldCheck, Plus, Trash2, Loader2, Check } from 'lucide-react'
import { api } from '../api.js'

const BUILTIN = ['Emails', 'Phone numbers', 'Card numbers', 'SSNs', 'IBANs', 'API keys & tokens', 'IP addresses', 'Private hosts']

export default function ScrubRules() {
  const [st, setSt] = useState({ loading: true, error: '', policy: null, saving: false, saved: false })
  const load = useCallback(() => {
    setSt((s) => ({ ...s, loading: true, error: '' }))
    api.workMyPolicy()
      .then((r) => setSt({ loading: false, error: '', policy: r.policy || {}, saving: false, saved: false }))
      .catch((e) => setSt({ loading: false, error: e.message || 'Could not load your rules', policy: null, saving: false, saved: false }))
  }, [])
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
    } catch (e) { setSt((s) => ({ ...s, saving: false, error: e.message || 'Could not save' })) }
  }

  const card = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 18px' }
  const muted = { color: 'var(--text-dim)', fontSize: 13 }
  if (st.loading) return <div style={{ ...card }}><span style={muted}><Loader2 size={14} className="spin" /> Loading your data protection rules…</span></div>
  if (!st.policy) return <div style={{ ...card }}><span style={{ color: 'var(--danger)' }}>{st.error || 'Unavailable'}</span> <button className="btn btn-outline btn-sm" onClick={load}>Retry</button></div>
  const p = st.policy
  const cf = p.customFields || []
  const setCf = (i, k, v) => { const n = [...cf]; n[i] = { ...n[i], [k]: v }; patch({ customFields: n }) }

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <ShieldCheck size={16} style={{ color: 'var(--em, #12a06a)' }} />
        <b style={{ fontSize: 15 }}>Your data protection rules</b>
      </div>
      <p style={muted}>These run <b>on your device</b>, before anything is sent. Add your own sensitive terms or patterns on top of what is always protected.</p>

      <div style={{ marginTop: 10 }}>
        <div style={{ ...muted, fontWeight: 600, marginBottom: 6 }}>Always protected</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {BUILTIN.map((b) => <span key={b} style={{ fontSize: 12, color: 'var(--text-dim)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 999, padding: '3px 10px' }}>{b}</span>)}
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <div style={{ ...muted, fontWeight: 600, marginBottom: 6 }}>Your custom rules</div>
        {cf.length === 0 && <div style={{ ...muted, fontStyle: 'italic', marginBottom: 8 }}>None yet. Add a term (like a project code name) or a /regex/.</div>}
        {cf.map((f, i) => (
          <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
            <input className="input" style={{ flex: '1 1 150px', minWidth: 0 }} placeholder="Label (e.g. Project Orion)" value={f.label || ''} onChange={(e) => setCf(i, 'label', e.target.value)} />
            <input className="input" style={{ flex: '1 1 150px', minWidth: 0 }} placeholder="Match: a word/phrase or /regex/" value={f.pattern || ''} onChange={(e) => setCf(i, 'pattern', e.target.value)} />
            <select className="input" style={{ flex: '0 0 120px' }} value={f.action || 'redact'} onChange={(e) => setCf(i, 'action', e.target.value)}>
              <option value="redact">Redact</option>
              <option value="tokenize">Tokenize</option>
              <option value="block">Block</option>
            </select>
            <button className="btn btn-outline btn-sm" title="Remove" onClick={() => patch({ customFields: cf.filter((_, k) => k !== i) })}><Trash2 size={14} /></button>
          </div>
        ))}
        <button className="btn btn-outline btn-sm" style={{ marginTop: 4 }} onClick={() => patch({ customFields: [...cf, { label: '', pattern: '', action: 'redact' }] })}><Plus size={14} /> Add a rule</button>
      </div>

      <div style={{ marginTop: 16 }}>
        <div style={{ ...muted, fontWeight: 600, marginBottom: 6 }}>Block words <span style={{ fontWeight: 400 }}>(one per line — always removed, never sent)</span></div>
        <textarea className="input" rows={3} style={{ width: '100%', resize: 'vertical', fontFamily: 'inherit' }}
          placeholder={'Acme Confidential\nProject Orion'}
          value={(p.blockWords || []).join('\n')}
          onChange={(e) => patch({ blockWords: e.target.value.split('\n').map((x) => x.trim()).filter(Boolean) })} />
      </div>

      {st.error && <div style={{ color: 'var(--danger)', fontSize: 13, marginTop: 10 }}>{st.error}</div>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14 }}>
        <button className="btn btn-primary" onClick={save} disabled={st.saving}>{st.saving ? <><Loader2 size={14} className="spin" /> Saving</> : 'Save my rules'}</button>
        {st.saved && <span style={{ color: 'var(--em, #12a06a)', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 5 }}><Check size={14} /> Saved — on across your sessions</span>}
      </div>
    </div>
  )
}
