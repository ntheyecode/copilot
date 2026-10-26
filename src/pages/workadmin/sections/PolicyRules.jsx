// Shared editor for a company's ENFORCED GUIDANCE RULES (SUPREME RULE II: one
// component, used by both the superadmin Governance tab and the company-admin
// Governance section). The admin pastes/uploads their written security policy,
// clicks Extract to turn it into forbid/require rules, reviews/edits them, then the
// parent's Save persists them on the policy (guidanceRules + policyDocs). The guide
// gate then flags any generated step that breaks a rule, citing the policy.
//
// Controlled: `rules` + `docs` come from the parent policy; every edit calls
// onChange({ guidanceRules, policyDocs }). `extract` is injected so this works with
// either api wrapper.
//
// PRESENTATION (2026-10-26): each rule renders as a COLLAPSED compact row by default
// (toggle · kind · severity · title · citation · remove · chevron), expanding on
// click to reveal the full editable fields — the same scannable pattern the
// company-admin saved-settings cards use. Nothing is removed; every control, field
// and validation from the old all-open card is preserved, just hidden until the row
// is expanded. Rows collapse gracefully at ~640px (the citation drops to a second
// muted line) with no horizontal scroll, per SUPREME RULE XIV (design-time quality
// gate). A newly hand-added blank rule opens expanded since it needs input.
import React, { useState, useCallback } from 'react'
import { ScrollText, Plus, Trash2, AlertTriangle, Sparkles, Upload, Ban, CheckCircle2, ChevronDown, ChevronRight } from 'lucide-react'
import { Spinning } from './_shared.jsx'
import { useT } from '../../../i18n/index.jsx'

const KINDS = ['forbid', 'require']
const SEVERITIES = ['critical', 'high', 'medium', 'low']
// Console tokens only (the previous --wka-rose fallback was not a defined token).
const SEV_COLOR = { critical: 'var(--wka-red)', high: 'var(--wka-amber)', medium: 'var(--wka-cyan)', low: 'var(--wka-faint)' }
const MAX_DOC_CHARS = 200000

// Stable per-row key for both React keys AND the expand/collapse set. Extracted
// rules carry an id; hand-added rules get one too (see addRule). Index is only a
// last-resort fallback for a legacy rule with no id.
const keyOf = (r, i) => (r && r.id) || `idx-${i}`

export default function PolicyRules({ rules = [], docs = [], onChange, readOnly = false, extract, armed = false }) {
  const t = useT()
  const [text, setText] = useState('')
  const [docName, setDocName] = useState('')
  const [extracting, setExtracting] = useState(false)
  const [note, setNote] = useState(null)
  const [err, setErr] = useState(null)
  const [open, setOpen] = useState(() => new Set())   // row keys currently expanded (default: all collapsed)

  const emit = useCallback((nextRules, nextDocs) => {
    onChange && onChange({ guidanceRules: nextRules, policyDocs: nextDocs !== undefined ? nextDocs : docs })
  }, [onChange, docs])

  const toggle = (k) => setOpen((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n })
  const allKeys = rules.map((r, i) => keyOf(r, i))
  const allOpen = rules.length > 0 && allKeys.every((k) => open.has(k))
  const expandAll = () => setOpen(new Set(allKeys))
  const collapseAll = () => setOpen(new Set())

  const patchRule = (i, patch) => { const next = rules.map((r, k) => (k === i ? { ...r, ...patch } : r)); emit(next) }
  const removeRule = (i) => { const k = keyOf(rules[i], i); emit(rules.filter((_, j) => j !== i)); setOpen((s) => { const n = new Set(s); n.delete(k); return n }) }
  const addRule = () => {
    const id = `m${Date.now().toString(36)}`
    emit([...rules, { id, kind: 'forbid', title: '', pattern: '', context: '', severity: 'high', doc: '', section: '', rationale: '', guidance: '', enabled: true }])
    setOpen((s) => new Set(s).add(id))   // a brand-new blank rule opens expanded — it needs input
  }

  const onFile = (e) => {
    const f = e.target.files && e.target.files[0]; if (!f) return
    if (f.size > 5 * 1024 * 1024) { setErr(new Error(t('policyRules.fileTooLarge'))); return }
    const reader = new FileReader()
    reader.onload = () => { setText(String(reader.result || '').slice(0, MAX_DOC_CHARS)); if (!docName) setDocName(f.name.replace(/\.[^.]+$/, '').slice(0, 120)) }
    reader.onerror = () => setErr(new Error(t('policyRules.couldNotRead')))
    reader.readAsText(f)
    e.target.value = ''
  }

  const runExtract = async () => {
    if (readOnly || extracting || !extract) return
    const body = text.trim()
    if (body.replace(/\s+/g, '').length < 40) { setErr(new Error(t('policyRules.pastePolicyFirst'))); return }
    setExtracting(true); setErr(null); setNote(null)
    try {
      const r = await extract({ text: body, docName: docName.trim() })
      const got = Array.isArray(r.rules) ? r.rules : []
      // Merge with existing, skipping exact duplicate (kind+pattern) rules.
      const key = (x) => `${x.kind}|${String(x.pattern || '').toLowerCase()}`
      const have = new Set(rules.map(key))
      const added = got.filter((x) => !have.has(key(x)))
      const nextRules = [...rules, ...added]
      const nextDocs = [...docs, { name: (docName.trim() || t('policyRules.defaultDocName')), addedAt: Date.now(), ruleCount: added.length, chars: body.length }]
      emit(nextRules, nextDocs)
      // Extracted rows join the list COLLAPSED — the operator sees a tidy list of N
      // rows and clicks the ones they want to review/edit (open set is left as-is).
      const dup = got.length - added.length
      setNote({ source: r.source, msg: `${t.n('policyRules.rulesAdded', added.length, { n: added.length })}${dup > 0 ? t.n('policyRules.duplicatesSkipped', dup, { n: dup }) : ''}. ${r.note || ''}` })
      setText('')
    } catch (e) { setErr(e) } finally { setExtracting(false) }
  }

  const forbidN = rules.filter((r) => r.kind !== 'require').length
  const requireN = rules.filter((r) => r.kind === 'require').length

  return (
    <div className="wka-panel">
      <h2 style={{ margin: 0 }}><ScrollText size={15} style={{ verticalAlign: -2, marginRight: 6, color: 'var(--wka-cyan)' }} />{t('policyRules.heading')}</h2>
      <p className="desc">
        {t.rich('policyRules.desc')}
      </p>

      {/* --- Ingest a policy document --- */}
      {!readOnly && (
        <div style={{ border: '1px solid var(--wka-line, #e2e8f0)', borderRadius: 12, padding: 14, marginBottom: 16 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end', marginBottom: 10 }}>
            <div className="wka-field" style={{ flex: '1 1 220px', minWidth: 0, margin: 0 }}>
              <label>{t('policyRules.docNameLabel')}</label>
              <input className="wka-input" style={{ width: '100%' }} value={docName} maxLength={120}
                onChange={(e) => setDocName(e.target.value)} placeholder={t('policyRules.docNamePlaceholder')} />
            </div>
            <label className="wka-btn sm" style={{ cursor: 'pointer', flexShrink: 0 }} title={t('policyRules.uploadTitle')}>
              <Upload size={13} /> {t('policyRules.uploadFile')}
              <input type="file" accept=".txt,.md,.markdown,.json,.csv,.log,text/*" style={{ display: 'none' }} onChange={onFile} />
            </label>
          </div>
          <textarea className="wka-input" style={{ width: '100%', minHeight: 120, resize: 'vertical' }}
            value={text} onChange={(e) => setText(e.target.value.slice(0, MAX_DOC_CHARS))}
            placeholder={t('policyRules.textPlaceholder')} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginTop: 10 }}>
            <button type="button" className="wka-btn primary" disabled={extracting || !text.trim()} onClick={runExtract}>
              {extracting ? <Spinning /> : <Sparkles size={14} />} {t('policyRules.extractRules')}
            </button>
            <span style={{ fontSize: 12, color: 'var(--wka-faint)' }}>{t('policyRules.notStored')}</span>
          </div>
          {note && (
            <div style={{ marginTop: 10, fontSize: 12.5, color: 'var(--wka-muted)', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <CheckCircle2 size={14} style={{ flexShrink: 0, marginTop: 1, color: 'var(--wka-emerald, #059669)' }} />
              <span>{note.msg}{note.source === 'heuristic' ? t('policyRules.derivedWithoutAI') : ''}</span>
            </div>
          )}
          {err && <div style={{ marginTop: 10, fontSize: 12.5, color: 'var(--wka-red)', display: 'flex', gap: 8 }}><AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} /> {String(err.message || err)}</div>}
        </div>
      )}

      {/* --- Rule summary + review --- */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>{t.n('policyRules.ruleCount', rules.length, { n: rules.length })}</span>
        <span style={{ fontSize: 12, color: 'var(--wka-faint)' }}>·</span>
        <span style={{ fontSize: 12.5, color: SEV_COLOR.high, display: 'inline-flex', gap: 4, alignItems: 'center' }}><Ban size={12} /> {t('policyRules.forbidCount', { n: forbidN })}</span>
        <span style={{ fontSize: 12.5, color: 'var(--wka-cyan)', display: 'inline-flex', gap: 4, alignItems: 'center' }}><CheckCircle2 size={12} /> {t('policyRules.requireCount', { n: requireN })}</span>
        {armed && rules.length > 0 && <span style={{ fontSize: 11.5, color: 'var(--wka-emerald, #059669)', fontWeight: 600 }}>{t('policyRules.enforcedOnEveryCall')}</span>}
        <span className="wka-spacer" />
        {rules.length > 1 && (
          <button type="button" className="wka-btn sm ghost" style={{ flexShrink: 0 }} onClick={allOpen ? collapseAll : expandAll}>
            {allOpen ? <><ChevronRight size={13} /> {t('policyRules.collapseAll')}</> : <><ChevronDown size={13} /> {t('policyRules.expandAll')}</>}
          </button>
        )}
      </div>

      {rules.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--wka-faint)', padding: '10px 0' }}>{readOnly ? t('policyRules.noRulesReadOnly') : t('policyRules.noRulesEditable')}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rules.map((r, i) => {
            const isReq = r.kind === 'require'
            const off = r.enabled === false
            const k = keyOf(r, i)
            const isOpen = open.has(k)
            const sev = SEV_COLOR[r.severity] || SEV_COLOR.low
            const cite = [r.doc, r.section].map((x) => String(x || '').trim()).filter(Boolean).join(' ')
            const needsTrigger = isReq && !String(r.context || '').trim()
            return (
              <div key={k} className={`wka-rule${off ? ' off' : ''}${isOpen ? ' open' : ''}`} style={{ borderLeftColor: sev }}>
                {/* --- Collapsed compact row (always visible) --- */}
                <div className="wka-rule-head" role="button" tabIndex={0} aria-expanded={isOpen}
                  onClick={() => toggle(k)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(k) } }}>
                  <input type="checkbox" className="wka-rule-toggle" checked={!off} disabled={readOnly}
                    title={t('policyRules.enforceThisRule')} aria-label={t('policyRules.enforceThisRule')}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => patchRule(i, { enabled: e.target.checked })} />
                  <span className={`wka-rule-kind ${isReq ? 'req' : 'forbid'}`}>
                    {isReq ? <CheckCircle2 size={12} /> : <Ban size={12} />}{isReq ? t('policyRules.kindRequire') : t('policyRules.kindForbid')}
                  </span>
                  <span className="wka-rule-sev" style={{ background: sev }} title={t('policyRules.severityTitle', { label: t('policyRules.sev.' + (r.severity || 'low')) })} />
                  <span className="wka-rule-title">{String(r.title || '').trim() || <span style={{ color: 'var(--wka-faint)', fontStyle: 'italic', fontWeight: 400 }}>{t('policyRules.untitledRule')}</span>}</span>
                  {needsTrigger && <AlertTriangle size={13} className="wka-rule-warn" style={{ color: 'var(--wka-amber)', flexShrink: 0 }} aria-label={t('policyRules.needsTrigger')} />}
                  {cite && <span className="wka-rule-cite">{t('policyRules.perCite', { cite })}</span>}
                  {!readOnly && <button type="button" className="wka-btn sm ghost wka-rule-x" title={t('policyRules.removeRule')} aria-label={t('policyRules.removeRule')} onClick={(e) => { e.stopPropagation(); removeRule(i) }}><Trash2 size={13} /></button>}
                  <span className="wka-rule-chev" aria-hidden="true">{isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</span>
                </div>

                {/* --- Expanded editable fields (the full set from the old card) --- */}
                {isOpen && (
                  <div className="wka-rule-body">
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                      <select className="wka-select" style={{ flexShrink: 0 }} value={isReq ? 'require' : 'forbid'} disabled={readOnly} onChange={(e) => patchRule(i, { kind: e.target.value })}>
                        {KINDS.map((kk) => <option key={kk} value={kk}>{kk === 'forbid' ? t('policyRules.kindForbid') : t('policyRules.kindRequire')}</option>)}
                      </select>
                      <select className="wka-select" style={{ flexShrink: 0 }} value={r.severity || 'high'} disabled={readOnly} onChange={(e) => patchRule(i, { severity: e.target.value })}>
                        {SEVERITIES.map((s) => <option key={s} value={s}>{t('policyRules.sev.' + s)}</option>)}
                      </select>
                      <input className="wka-input" style={{ flex: '1 1 200px', minWidth: 0 }} value={r.title || ''} maxLength={120} disabled={readOnly}
                        placeholder={t('policyRules.titlePlaceholder')} onChange={(e) => patchRule(i, { title: e.target.value })} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: isReq ? 'repeat(auto-fit, minmax(220px, 1fr))' : '1fr', gap: 8, marginBottom: 8 }}>
                      <div className="wka-field" style={{ margin: 0 }}>
                        <label>{isReq ? t('policyRules.requiredPractice') : t('policyRules.prohibitedPractice')}</label>
                        <input className="wka-input" style={{ width: '100%' }} value={r.pattern || ''} maxLength={400} disabled={readOnly}
                          placeholder={isReq ? t('policyRules.requiredPatternPlaceholder') : t('policyRules.prohibitedPatternPlaceholder')} onChange={(e) => patchRule(i, { pattern: e.target.value })} />
                      </div>
                      {isReq && (
                        <div className="wka-field" style={{ margin: 0 }}>
                          <label>{t('policyRules.whenRelevant')}</label>
                          <input className="wka-input" style={{ width: '100%' }} value={r.context || ''} maxLength={400} disabled={readOnly}
                            placeholder={t('policyRules.contextPlaceholder')} onChange={(e) => patchRule(i, { context: e.target.value })} />
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 }}>
                      <div className="wka-field" style={{ margin: 0 }}>
                        <label>{t('policyRules.citedDocument')}</label>
                        <input className="wka-input" style={{ width: '100%' }} value={r.doc || ''} maxLength={160} disabled={readOnly}
                          placeholder={t('policyRules.citedDocPlaceholder')} onChange={(e) => patchRule(i, { doc: e.target.value })} />
                      </div>
                      <div className="wka-field" style={{ margin: 0 }}>
                        <label>{t('policyRules.section')}</label>
                        <input className="wka-input" style={{ width: '100%' }} value={r.section || ''} maxLength={160} disabled={readOnly}
                          placeholder={t('policyRules.sectionPlaceholder')} onChange={(e) => patchRule(i, { section: e.target.value })} />
                      </div>
                      <div className="wka-field" style={{ margin: 0, gridColumn: '1 / -1' }}>
                        <label>{t('policyRules.compliantAlternative')}</label>
                        <input className="wka-input" style={{ width: '100%' }} value={r.guidance || ''} maxLength={400} disabled={readOnly}
                          placeholder={t('policyRules.guidancePlaceholder')} onChange={(e) => patchRule(i, { guidance: e.target.value })} />
                      </div>
                    </div>
                    {needsTrigger && (
                      <div style={{ marginTop: 8, fontSize: 11.5, color: 'var(--wka-amber, #d97706)', display: 'flex', gap: 6 }}>
                        <AlertTriangle size={12} style={{ flexShrink: 0, marginTop: 1 }} /> {t('policyRules.addTriggerHint')}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {!readOnly && (
        <button type="button" className="wka-btn sm" style={{ marginTop: 12 }} onClick={addRule}><Plus size={13} /> {t('policyRules.addRuleByHand')}</button>
      )}

      {docs.length > 0 && (
        <div style={{ marginTop: 14, fontSize: 12, color: 'var(--wka-faint)' }}>
          {t('policyRules.fromLabel')} {docs.map((d, i) => <span key={i}>{i > 0 ? ', ' : ''}{d.name}{d.ruleCount ? ` (${d.ruleCount})` : ''}</span>)}
        </div>
      )}
    </div>
  )
}
