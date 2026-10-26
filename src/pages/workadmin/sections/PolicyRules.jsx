// Shared editor for a company's ENFORCED GUIDANCE RULES (SUPREME RULE II: one
// component, used by both the superadmin Governance tab and the company-admin
// Governance section). The admin pastes/uploads their written security policy,
// clicks Extract to turn it into forbid/require rules, reviews/edits them, then the
// parent's Save persists them on the policy (guidanceRules + policyDocs). The guide
// gate then flags any generated step that breaks a rule, citing the policy.
//
// Controlled: `rules` + `docs` come from the parent policy; every edit calls
// onChange({ guidanceRules, policyDocs }). `extract` is injected so this works with
// either api wrapper. Renders clean at wide and narrow widths (stacked cards, no
// horizontal scroll) per SUPREME RULE XIV.
import React, { useState, useCallback } from 'react'
import { ScrollText, Plus, Trash2, AlertTriangle, Sparkles, Upload, Ban, CheckCircle2 } from 'lucide-react'
import { Spinning } from './_shared.jsx'

const KINDS = ['forbid', 'require']
const SEVERITIES = ['critical', 'high', 'medium', 'low']
const SEV_COLOR = { critical: 'var(--wka-rose, #e11d48)', high: 'var(--wka-amber, #d97706)', medium: 'var(--wka-cyan, #0891b2)', low: 'var(--wka-faint, #64748b)' }
const MAX_DOC_CHARS = 200000

export default function PolicyRules({ rules = [], docs = [], onChange, readOnly = false, extract, armed = false }) {
  const [text, setText] = useState('')
  const [docName, setDocName] = useState('')
  const [extracting, setExtracting] = useState(false)
  const [note, setNote] = useState(null)
  const [err, setErr] = useState(null)

  const emit = useCallback((nextRules, nextDocs) => {
    onChange && onChange({ guidanceRules: nextRules, policyDocs: nextDocs !== undefined ? nextDocs : docs })
  }, [onChange, docs])

  const patchRule = (i, patch) => { const next = rules.map((r, k) => (k === i ? { ...r, ...patch } : r)); emit(next) }
  const removeRule = (i) => emit(rules.filter((_, k) => k !== i))
  const addRule = () => emit([...rules, { id: `m${Date.now().toString(36)}`, kind: 'forbid', title: '', pattern: '', context: '', severity: 'high', doc: '', section: '', rationale: '', guidance: '', enabled: true }])

  const onFile = (e) => {
    const f = e.target.files && e.target.files[0]; if (!f) return
    if (f.size > 5 * 1024 * 1024) { setErr(new Error('That file is larger than 5 MB. Paste the relevant sections instead.')); return }
    const reader = new FileReader()
    reader.onload = () => { setText(String(reader.result || '').slice(0, MAX_DOC_CHARS)); if (!docName) setDocName(f.name.replace(/\.[^.]+$/, '').slice(0, 120)) }
    reader.onerror = () => setErr(new Error('Could not read that file.'))
    reader.readAsText(f)
    e.target.value = ''
  }

  const runExtract = async () => {
    if (readOnly || extracting || !extract) return
    const body = text.trim()
    if (body.replace(/\s+/g, '').length < 40) { setErr(new Error('Paste or upload the policy text first (at least a short paragraph).')); return }
    setExtracting(true); setErr(null); setNote(null)
    try {
      const r = await extract({ text: body, docName: docName.trim() })
      const got = Array.isArray(r.rules) ? r.rules : []
      // Merge with existing, skipping exact duplicate (kind+pattern) rules.
      const key = (x) => `${x.kind}|${String(x.pattern || '').toLowerCase()}`
      const have = new Set(rules.map(key))
      const added = got.filter((x) => !have.has(key(x)))
      const nextRules = [...rules, ...added]
      const nextDocs = [...docs, { name: (docName.trim() || 'Policy document'), addedAt: Date.now(), ruleCount: added.length, chars: body.length }]
      emit(nextRules, nextDocs)
      setNote({ source: r.source, msg: `${added.length} rule${added.length === 1 ? '' : 's'} added${got.length - added.length > 0 ? ` (${got.length - added.length} duplicate${got.length - added.length === 1 ? '' : 's'} skipped)` : ''}. ${r.note || ''}` })
      setText('')
    } catch (e) { setErr(e) } finally { setExtracting(false) }
  }

  const forbidN = rules.filter((r) => r.kind !== 'require').length
  const requireN = rules.filter((r) => r.kind === 'require').length

  return (
    <div className="wka-panel">
      <h2 style={{ margin: 0 }}><ScrollText size={15} style={{ verticalAlign: -2, marginRight: 6, color: 'var(--wka-cyan)' }} />Security practice rules</h2>
      <p className="desc">
        Load your written security policy and WorkCoPilot turns it into rules it enforces <b>while guiding</b> — flagging any step that uses a <b>prohibited</b> practice or is missing a <b>required</b> one, and citing your policy by name. This governs <i>how the guidance is written</i>, on top of the data-handling rules above.
      </p>

      {/* --- Ingest a policy document --- */}
      {!readOnly && (
        <div style={{ border: '1px solid var(--wka-line, #e2e8f0)', borderRadius: 12, padding: 14, marginBottom: 16 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end', marginBottom: 10 }}>
            <div className="wka-field" style={{ flex: '1 1 220px', minWidth: 0, margin: 0 }}>
              <label>Policy document name</label>
              <input className="wka-input" style={{ width: '100%' }} value={docName} maxLength={120}
                onChange={(e) => setDocName(e.target.value)} placeholder="e.g. Acme InfoSec Policy v3" />
            </div>
            <label className="wka-btn sm" style={{ cursor: 'pointer', flexShrink: 0 }} title="Load a .txt / .md / .json policy file">
              <Upload size={13} /> Upload file
              <input type="file" accept=".txt,.md,.markdown,.json,.csv,.log,text/*" style={{ display: 'none' }} onChange={onFile} />
            </label>
          </div>
          <textarea className="wka-input" style={{ width: '100%', minHeight: 120, resize: 'vertical' }}
            value={text} onChange={(e) => setText(e.target.value.slice(0, MAX_DOC_CHARS))}
            placeholder={'Paste your security policy here. For example:\n\n“Secrets must never be stored in plaintext; use the approved vault.”\n“FTP must not be used — use SFTP.”\n“Production access requires MFA.”'} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginTop: 10 }}>
            <button type="button" className="wka-btn primary" disabled={extracting || !text.trim()} onClick={runExtract}>
              {extracting ? <Spinning /> : <Sparkles size={14} />} Extract rules
            </button>
            <span style={{ fontSize: 12, color: 'var(--wka-faint)' }}>The document text is used only to extract rules — it is not stored.</span>
          </div>
          {note && (
            <div style={{ marginTop: 10, fontSize: 12.5, color: 'var(--wka-muted)', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <CheckCircle2 size={14} style={{ flexShrink: 0, marginTop: 1, color: 'var(--wka-emerald, #059669)' }} />
              <span>{note.msg}{note.source === 'heuristic' ? ' (derived without AI — review carefully.)' : ''}</span>
            </div>
          )}
          {err && <div style={{ marginTop: 10, fontSize: 12.5, color: 'var(--wka-rose, #e11d48)', display: 'flex', gap: 8 }}><AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} /> {String(err.message || err)}</div>}
        </div>
      )}

      {/* --- Rule summary + review --- */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>{rules.length} rule{rules.length === 1 ? '' : 's'}</span>
        <span style={{ fontSize: 12, color: 'var(--wka-faint)' }}>·</span>
        <span style={{ fontSize: 12.5, color: SEV_COLOR.high, display: 'inline-flex', gap: 4, alignItems: 'center' }}><Ban size={12} /> {forbidN} forbid</span>
        <span style={{ fontSize: 12.5, color: 'var(--wka-cyan)', display: 'inline-flex', gap: 4, alignItems: 'center' }}><CheckCircle2 size={12} /> {requireN} require</span>
        {armed && rules.length > 0 && <span style={{ fontSize: 11.5, color: 'var(--wka-emerald, #059669)', fontWeight: 600 }}>Enforced on every call</span>}
      </div>

      {rules.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--wka-faint)', padding: '10px 0' }}>No rules yet. Extract them from your policy above{readOnly ? '.' : ', or add one by hand.'}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rules.map((r, i) => {
            const isReq = r.kind === 'require'
            const off = r.enabled === false
            return (
              <div key={r.id || i} style={{ border: '1px solid var(--wka-line, #e2e8f0)', borderLeft: `3px solid ${SEV_COLOR[r.severity] || SEV_COLOR.low}`, borderRadius: 10, padding: 12, opacity: off ? 0.55 : 1 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                  <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center', fontSize: 12.5, flexShrink: 0 }} title="Enforce this rule">
                    <input type="checkbox" checked={!off} disabled={readOnly} onChange={(e) => patchRule(i, { enabled: e.target.checked })} /> On
                  </label>
                  <select className="wka-select" style={{ flexShrink: 0 }} value={isReq ? 'require' : 'forbid'} disabled={readOnly} onChange={(e) => patchRule(i, { kind: e.target.value })}>
                    {KINDS.map((k) => <option key={k} value={k}>{k === 'forbid' ? 'Forbid' : 'Require'}</option>)}
                  </select>
                  <select className="wka-select" style={{ flexShrink: 0 }} value={r.severity || 'high'} disabled={readOnly} onChange={(e) => patchRule(i, { severity: e.target.value })}>
                    {SEVERITIES.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
                  </select>
                  <input className="wka-input" style={{ flex: '1 1 200px', minWidth: 0 }} value={r.title || ''} maxLength={120} disabled={readOnly}
                    placeholder="Short label (e.g. No plaintext secrets)" onChange={(e) => patchRule(i, { title: e.target.value })} />
                  {!readOnly && <button type="button" className="wka-btn sm ghost" style={{ flexShrink: 0 }} title="Remove rule" onClick={() => removeRule(i)}><Trash2 size={13} /></button>}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: isReq ? 'repeat(auto-fit, minmax(220px, 1fr))' : '1fr', gap: 8, marginBottom: 8 }}>
                  <div className="wka-field" style={{ margin: 0 }}>
                    <label>{isReq ? 'Required practice (must appear)' : 'Prohibited practice (must not appear)'}</label>
                    <input className="wka-input" style={{ width: '100%' }} value={r.pattern || ''} maxLength={400} disabled={readOnly}
                      placeholder={isReq ? 'mfa, multi-factor, 2fa' : 'ftp, plaintext password, 0.0.0.0/0'} onChange={(e) => patchRule(i, { pattern: e.target.value })} />
                  </div>
                  {isReq && (
                    <div className="wka-field" style={{ margin: 0 }}>
                      <label>When relevant (trigger)</label>
                      <input className="wka-input" style={{ width: '100%' }} value={r.context || ''} maxLength={400} disabled={readOnly}
                        placeholder="production, deploy, login" onChange={(e) => patchRule(i, { context: e.target.value })} />
                    </div>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 }}>
                  <div className="wka-field" style={{ margin: 0 }}>
                    <label>Cited document</label>
                    <input className="wka-input" style={{ width: '100%' }} value={r.doc || ''} maxLength={160} disabled={readOnly}
                      placeholder="Acme InfoSec Policy" onChange={(e) => patchRule(i, { doc: e.target.value })} />
                  </div>
                  <div className="wka-field" style={{ margin: 0 }}>
                    <label>Section</label>
                    <input className="wka-input" style={{ width: '100%' }} value={r.section || ''} maxLength={160} disabled={readOnly}
                      placeholder="§4.2 Secrets" onChange={(e) => patchRule(i, { section: e.target.value })} />
                  </div>
                  <div className="wka-field" style={{ margin: 0, gridColumn: '1 / -1' }}>
                    <label>Compliant alternative to recommend</label>
                    <input className="wka-input" style={{ width: '100%' }} value={r.guidance || ''} maxLength={400} disabled={readOnly}
                      placeholder="Use the approved vault instead of config files." onChange={(e) => patchRule(i, { guidance: e.target.value })} />
                  </div>
                </div>
                {isReq && !String(r.context || '').trim() && (
                  <div style={{ marginTop: 8, fontSize: 11.5, color: 'var(--wka-amber, #d97706)', display: 'flex', gap: 6 }}>
                    <AlertTriangle size={12} style={{ flexShrink: 0, marginTop: 1 }} /> Add a trigger so this requirement is only checked on relevant steps.
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {!readOnly && (
        <button type="button" className="wka-btn sm" style={{ marginTop: 12 }} onClick={addRule}><Plus size={13} /> Add rule by hand</button>
      )}

      {docs.length > 0 && (
        <div style={{ marginTop: 14, fontSize: 12, color: 'var(--wka-faint)' }}>
          From: {docs.map((d, i) => <span key={i}>{i > 0 ? ', ' : ''}{d.name}{d.ruleCount ? ` (${d.ruleCount})` : ''}</span>)}
        </div>
      )}
    </div>
  )
}
