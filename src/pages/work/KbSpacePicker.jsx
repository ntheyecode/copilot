// Knowledge-space picker for the Start wizard's context step: "Ground in: All
// knowledge | <space> ...". Reads GET /api/work/kb-spaces once; when the
// company has no spaces, the call fails, or the person has no company, it
// renders NOTHING (never an error, never a blocker: grounding in everything is
// the default and always works). The chosen space id is lifted to the wizard
// (`value` / `onChange`) and travels to the /plan body as `space` through the
// same per-session hand-off the on-device documents use (StartTask.begin ->
// Guiding.plan). Pure presentation + one read; styles: wizard.css.js
// (.wd-wz-space*), tokens only.
import { useEffect, useState } from 'react'
import { Library, Check } from 'lucide-react'
import { api } from '../../api.js'
import { useT } from '../../i18n/index.jsx'

// Module-level memo so the list is fetched once per page load even when the
// wizard re-mounts the step (StrictMode double-mount, step back/forward).
let cache = null
export function resetKbSpacesCache() { cache = null }

export function normalizeSpaces(r) {
  const list = Array.isArray(r && r.spaces) ? r.spaces : []
  return list
    .filter((s) => s && s.id != null && String(s.name || '').trim())
    .map((s) => ({ id: String(s.id), name: String(s.name).trim(), count: Number.isFinite(Number(s.count)) ? Number(s.count) : null }))
}

export default function KbSpacePicker({ value, onChange }) {
  const t = useT()
  const [spaces, setSpaces] = useState(cache || [])
  useEffect(() => {
    if (cache) { setSpaces(cache); return undefined }
    let on = true
    api.workKbSpaces()
      .then((r) => { const list = normalizeSpaces(r); cache = list; if (on) setSpaces(list) })
      .catch(() => { cache = []; if (on) setSpaces([]) })   // quiet: no spaces, no picker
    return () => { on = false }
  }, [])
  if (!spaces.length) return null
  // A remembered choice whose space no longer exists falls back to all.
  const current = spaces.some((s) => s.id === value) ? value : ''
  const pick = (id) => { if (onChange) onChange(id) }
  return (
    <div className="wd-wz-space" role="group" aria-label={t('workStart.spaceAria')}>
      <span className="wd-wz-space-lead"><Library size={14} /> {t('workStart.spaceLead')} <span className="wd-wz-space-sub">{t('workStart.spaceSub')}</span></span>
      <div className="wd-wz-space-opts">
        <button type="button" className={`wd-wz-space-opt${current === '' ? ' on' : ''}`} aria-pressed={current === ''} onClick={() => pick('')}>
          {current === '' && <Check size={12} />}<span className="nm">{t('workStart.spaceAll')}</span>
        </button>
        {spaces.map((s) => (
          <button key={s.id} type="button" className={`wd-wz-space-opt${current === s.id ? ' on' : ''}`} aria-pressed={current === s.id} onClick={() => pick(s.id)} title={s.count != null ? t.n('workStart.spaceCount', s.count, { n: s.count }) : s.name}>
            {current === s.id && <Check size={12} />}<span className="nm">{s.name}</span>{s.count != null && <b>{s.count}</b>}
          </button>
        ))}
      </div>
    </div>
  )
}

// The one-line summary for the reflection / review rows.
export function spaceSummary(t, spaces, id) {
  const s = (spaces || []).find((x) => x.id === id)
  return s ? t('workStart.spaceSummaryOne', { name: s.name }) : t('workStart.spaceSummaryAll')
}
export function cachedSpaces() { return cache || [] }
