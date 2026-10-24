// Homepage hero editor (superadmin). The marketing page rotates through these
// headline + subtext pairs. Each pair:
//   h  - the headline line
//   s  - the subtext under it
//   em - an optional word/phrase INSIDE h to render in the brand gradient
// The marketing page keeps a built-in fallback, so an empty set here restores
// the shipped default rather than leaving the hero blank. Only a superadmin can
// edit; other admins see the current copy read-only (never a silent lockout).
//
// UX: when custom copy is already saved the editor COLLAPSES to a read-only
// preview of the saved hero(s) with an Edit button; editing reopens the card
// editor plus Save / Reset / Cancel. First-time setup (still on the built-in
// default) opens in the editor so it is not hidden. Cancel reverts to the last-
// saved copy.
import React, { useEffect, useState, useCallback } from 'react'
import { Megaphone, Plus, Trash2, ArrowUp, ArrowDown, Save, RotateCcw, Lock, Sparkles, X } from 'lucide-react'
import { workAdminApi } from '../workAdminApi.js'
import { Loading, ErrorBox, Spinning, SavedTag, EditToggle } from './_shared.jsx'

const MAX_PAIRS = 12
const H_MAX = 140
const S_MAX = 320
const EM_MAX = 80

// Render a headline with its `em` substring wrapped in the brand gradient, so
// the superadmin sees exactly what the hero will emphasize. Case-insensitive,
// first match only; if em isn't found, the line shows plain (honest preview).
function HeroPreview({ h, em }) {
  const head = String(h || '')
  const needle = String(em || '').trim()
  if (!needle) return <span>{head || <em style={{ opacity: 0.5 }}>empty headline</em>}</span>
  const i = head.toLowerCase().indexOf(needle.toLowerCase())
  if (i < 0) return <span>{head}</span>
  return (
    <span>
      {head.slice(0, i)}
      <span style={{ background: 'linear-gradient(90deg, var(--wka-cyan), var(--wka-emerald))', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>{head.slice(i, i + needle.length)}</span>
      {head.slice(i + needle.length)}
    </span>
  )
}

export default function Hero({ isSuperAdmin }) {
  const [state, setState] = useState({ loading: true, error: null })
  const [pairs, setPairs] = useState([])
  const [baseline, setBaseline] = useState([])   // last-saved pairs, for Cancel
  const [custom, setCustom] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [saved, setSaved] = useState(false)
  const [dirty, setDirty] = useState(false)

  const norm = (list) => (list || []).map((p) => ({ h: p.h || '', s: p.s || '', em: p.em || '' }))

  const load = useCallback(async () => {
    setState({ loading: true, error: null })
    try {
      const d = await workAdminApi.getHero()
      const ps = norm(d.pairs)
      setPairs(ps); setBaseline(ps)
      setCustom(!!d.custom)
      setEditing(isSuperAdmin && !d.custom)   // superadmin + default (not yet set) -> open the editor; others start on the record
      setDirty(false)
      setState({ loading: false, error: null })
    } catch (error) { setState({ loading: false, error }) }
  }, [isSuperAdmin])
  useEffect(() => { load() }, [load])

  const mutate = (fn) => { setPairs((prev) => { const next = fn(prev.map((p) => ({ ...p }))); return next }); setDirty(true); setSaved(false) }
  const setField = (i, k, v) => mutate((p) => { if (p[i]) p[i][k] = v; return p })
  const addPair = () => mutate((p) => (p.length >= MAX_PAIRS ? p : [...p, { h: '', s: '', em: '' }]))
  const removePair = (i) => mutate((p) => p.filter((_, idx) => idx !== i))
  const move = (i, dir) => mutate((p) => {
    const j = i + dir
    if (j < 0 || j >= p.length) return p
    const t = p[i]; p[i] = p[j]; p[j] = t
    return p
  })

  // Only complete pairs (headline + subtext both present) are sent; blanks are
  // dropped so a half-filled card can't ship an empty hero line.
  const ready = pairs.map((p) => ({ h: (p.h || '').trim(), s: (p.s || '').trim(), em: (p.em || '').trim() })).filter((p) => p.h && p.s)

  const save = async () => {
    if (!isSuperAdmin || saving) return
    setSaving(true); setSaveError(null); setSaved(false)
    try {
      const d = await workAdminApi.setHero(ready)
      const ps = norm(d.pairs)
      setPairs(ps); setBaseline(ps)
      setCustom(!!d.custom)
      setDirty(false); setEditing(false)   // collapse to the preview record
      setSaved(true); setTimeout(() => setSaved(false), 2400)
    } catch (error) { setSaveError(error) } finally { setSaving(false) }
  }

  const resetDefault = async () => {
    if (!isSuperAdmin || saving) return
    setSaving(true); setSaveError(null); setSaved(false)
    try {
      const d = await workAdminApi.setHero([])   // empty => restore built-in default
      const ps = norm(d.pairs)
      setPairs(ps); setBaseline(ps)
      setCustom(!!d.custom)
      setDirty(false); setEditing(false)
      setSaved(true); setTimeout(() => setSaved(false), 2400)
    } catch (error) { setSaveError(error) } finally { setSaving(false) }
  }

  const cancel = () => { setPairs(baseline); setDirty(false); setSaveError(null); setSaved(false); setEditing(false) }

  if (state.loading) return <div className="wka-panel"><Loading label="Loading hero copy" /></div>
  if (state.error) return <div className="wka-panel"><ErrorBox error={state.error} onRetry={load} /></div>

  // ---- Collapsed preview record ----
  if (!editing) {
    return (
      <div className="wka-panel">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <h2 style={{ margin: 0 }}><Megaphone size={15} style={{ verticalAlign: '-2px', marginRight: 6, color: 'var(--wka-cyan)' }} />Homepage hero</h2>
          <EditToggle editing={editing} disabled={!isSuperAdmin} onEdit={() => { setPairs(baseline); setDirty(false); setEditing(true); setSaveError(null) }} />
        </div>
        <p className="desc">
          The headline + subtext the homepage rotates through. {custom ? 'Showing your custom copy.' : 'Showing the built-in default - edit and save to make it yours.'} {isSuperAdmin ? 'Click Edit to change the copy.' : ''}
        </p>
        {!isSuperAdmin ? (
          <div className="wka-note" style={{ margin: '6px 0 12px' }}><Lock size={14} /> Only a superadmin can edit the hero. The current copy is shown below.</div>
        ) : null}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {pairs.length === 0 ? (
            <div className="wka-note">No hero lines saved; the marketing page shows its built-in default.</div>
          ) : pairs.map((p, i) => (
            <div key={i} style={{ border: '1px solid var(--wka-line)', borderRadius: 12, padding: '12px 14px', background: 'var(--wka-panel-2)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--wka-faint)', marginBottom: 6 }}>Line {i + 1}</div>
              <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.25, color: 'var(--wka-text)' }}><HeroPreview h={p.h} em={p.em} /></div>
              {p.s ? <div style={{ fontSize: 13, color: 'var(--wka-muted)', marginTop: 5, lineHeight: 1.5 }}>{p.s}</div> : null}
            </div>
          ))}
        </div>
        <SavedTag show={saved} />
      </div>
    )
  }

  // ---- Edit view ----
  return (
    <div className="wka-panel">
      <h2><Megaphone size={15} style={{ verticalAlign: '-2px', marginRight: 6, color: 'var(--wka-cyan)' }} />Homepage hero</h2>
      <p className="desc">
        The headline + subtext the homepage rotates through, one every few seconds. The <strong>emphasis</strong> word
        is a word or phrase inside the headline rendered in the brand gradient. {custom
          ? 'Showing your custom copy.'
          : 'Showing the built-in default - edit and save to make it yours.'}
      </p>

      {!isSuperAdmin ? (
        <div className="wka-note" style={{ margin: '6px 0 16px' }}><Lock size={14} /> Only a superadmin can edit the hero. The current copy is shown below.</div>
      ) : null}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {pairs.map((p, i) => (
          <div key={i} style={{ border: '1px solid var(--wka-line)', borderRadius: 12, padding: '14px 16px', background: 'var(--wka-panel-2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--wka-muted)' }}>Line {i + 1}</div>
              {isSuperAdmin ? (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button type="button" className="wka-btn sm ghost" disabled={i === 0} onClick={() => move(i, -1)} title="Move up"><ArrowUp size={13} /></button>
                  <button type="button" className="wka-btn sm ghost" disabled={i === pairs.length - 1} onClick={() => move(i, 1)} title="Move down"><ArrowDown size={13} /></button>
                  <button type="button" className="wka-btn sm ghost" onClick={() => removePair(i)} title="Remove line"><Trash2 size={13} /></button>
                </div>
              ) : null}
            </div>

            <div className="wka-field" style={{ marginBottom: 10 }}>
              <label>Headline</label>
              <input className="wka-input" value={p.h} maxLength={H_MAX} placeholder="e.g. Get anything done right, the first time."
                readOnly={!isSuperAdmin} onChange={(e) => setField(i, 'h', e.target.value)} />
            </div>

            <div className="wka-field" style={{ marginBottom: 10, maxWidth: 360 }}>
              <label>Emphasis word <span style={{ color: 'var(--wka-faint)', fontWeight: 400 }}>(a word or phrase inside the headline)</span></label>
              <input className="wka-input" value={p.em} maxLength={EM_MAX} placeholder="e.g. anything"
                readOnly={!isSuperAdmin} onChange={(e) => setField(i, 'em', e.target.value)} />
            </div>

            <div className="wka-field" style={{ marginBottom: 12 }}>
              <label>Subtext</label>
              <textarea className="wka-input" rows={2} value={p.s} maxLength={S_MAX} placeholder="One or two sentences under the headline."
                readOnly={!isSuperAdmin} onChange={(e) => setField(i, 's', e.target.value)} style={{ resize: 'vertical', fontFamily: 'inherit' }} />
            </div>

            <div style={{ borderTop: '1px dashed var(--wka-line)', paddingTop: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--wka-faint)', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}><Sparkles size={12} /> Preview</div>
              <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.25, color: 'var(--wka-text)' }}><HeroPreview h={p.h} em={p.em} /></div>
              {p.s ? <div style={{ fontSize: 13, color: 'var(--wka-muted)', marginTop: 5, lineHeight: 1.5 }}>{p.s}</div> : null}
            </div>
          </div>
        ))}
      </div>

      {isSuperAdmin ? (
        <>
          <div style={{ marginTop: 14 }}>
            <button type="button" className="wka-btn" disabled={pairs.length >= MAX_PAIRS} onClick={addPair}><Plus size={14} /> Add line</button>
            {pairs.length >= MAX_PAIRS ? <span style={{ marginLeft: 10, fontSize: 12, color: 'var(--wka-faint)' }}>Maximum {MAX_PAIRS} lines.</span> : null}
          </div>

          {saveError ? <div style={{ marginTop: 14 }}><ErrorBox error={saveError} /></div> : null}

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--wka-line)' }}>
            <button type="button" className="wka-btn primary" disabled={saving || !dirty || !ready.length} onClick={save}>{saving ? <Spinning /> : <Save size={14} />} Save hero</button>
            <button type="button" className="wka-btn ghost" disabled={saving} onClick={cancel}><X size={14} /> Cancel</button>
            <button type="button" className="wka-btn ghost" disabled={saving} onClick={resetDefault} title="Replace with the built-in default copy"><RotateCcw size={13} /> Reset to default</button>
            <SavedTag show={saved} />
            {dirty && !saving ? <span style={{ fontSize: 12, color: 'var(--wka-amber)' }}>Unsaved changes</span> : null}
            {!ready.length ? <span style={{ fontSize: 12, color: 'var(--wka-faint)' }}>Add at least one line with a headline and subtext.</span> : null}
          </div>
        </>
      ) : (
        <div style={{ marginTop: 16 }}>
          <button type="button" className="wka-btn ghost" onClick={cancel}><X size={14} /> Close</button>
        </div>
      )}
    </div>
  )
}
