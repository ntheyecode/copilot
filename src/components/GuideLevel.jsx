// GuideLevel - the mid-session GUIDANCE STRENGTH control: Easy / Medium /
// Technical / Executive. One small segmented control, placed quietly beside
// the text-size control, that switches the register the guide writes in from
// the next engine call on (plan, navigate, ask, how-to). The engine owns the
// re-phrasing; completed steps stay as they were.
//
// The choice is persisted PER SESSION (one localStorage key per session id),
// the same guarded pattern as the text-scale preference, and stays in sync
// across the console, the floater and the full-screen guide through the
// same-origin 'storage' event. Every read/write is wrapped so blocked or
// private-mode storage never throws; the default is Medium.
import { useCallback, useEffect, useState } from 'react'
import { useT } from '../i18n/index.jsx'

export const LEVELS = [
  { id: 'easy', label: 'Easy', title: 'Plain words, every click spelled out' },
  { id: 'medium', label: 'Medium', title: 'Clear steps with the key details' },
  { id: 'technical', label: 'Technical', title: 'Precise, with commands, paths and values' },
  { id: 'executive', label: 'Executive', title: 'Short, outcome-first, only what matters' },
]
export const LEVEL_DEFAULT = 'medium'
export const levelKey = (sessionId) => `wc-guide-level:${sessionId || 'default'}`

export function clampLevel(v) { return LEVELS.some((l) => l.id === v) ? v : LEVEL_DEFAULT }
export function readLevel(sessionId) {
  try { const v = localStorage.getItem(levelKey(sessionId)); if (v != null) return clampLevel(v) } catch { /* ignore */ }
  return LEVEL_DEFAULT
}
export function writeLevel(sessionId, v) {
  try { localStorage.setItem(levelKey(sessionId), clampLevel(v)) } catch { /* ignore */ }
}

// The shared hook: current level + setter, synced across windows.
export function useGuideLevel(sessionId) {
  const [level, setLevelState] = useState(() => readLevel(sessionId))
  useEffect(() => { setLevelState(readLevel(sessionId)) }, [sessionId])
  useEffect(() => {
    const onStorage = (e) => { if (!e || e.key === levelKey(sessionId)) setLevelState(readLevel(sessionId)) }
    try { window.addEventListener('storage', onStorage) } catch { /* ignore */ }
    return () => { try { window.removeEventListener('storage', onStorage) } catch { /* ignore */ } }
  }, [sessionId])
  const setLevel = useCallback((v) => { const c = clampLevel(v); writeLevel(sessionId, c); setLevelState(c) }, [sessionId])
  return { level, setLevel }
}

// The segmented control. A real radiogroup: Left/Right (and Up/Down) move the
// selection, Tab moves on, every option is a <button> with aria-checked. Theme
// is passed in (plain colors or CSS var strings) so it looks native on the
// light console, the dark floater and the bare PiP document alike. No motion.
export default function GuideLevelControl({ level, onChange, theme, compact = false }) {
  const t = useT()
  const th = theme || {}
  const border = th.border || 'var(--border)'
  const muted = th.muted || 'var(--text-muted)'
  const panel = th.panel || 'transparent'
  const accent = th.accent || 'var(--em)'
  const accentSoft = th.accentSoft || 'var(--em-soft, rgba(14,159,110,.12))'
  const cur = clampLevel(level)
  const onKey = (e) => {
    const i = LEVELS.findIndex((l) => l.id === cur)
    let n = i
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (i + 1) % LEVELS.length
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = (i - 1 + LEVELS.length) % LEVELS.length
    else if (e.key === 'Home') n = 0
    else if (e.key === 'End') n = LEVELS.length - 1
    else return
    e.preventDefault()
    onChange && onChange(LEVELS[n].id)
    try { e.currentTarget.querySelectorAll('button')[n].focus() } catch { /* ignore */ }
  }
  return (
    <div role="radiogroup" aria-label={t('guideLevel.groupAria')} onKeyDown={onKey}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 1, flex: '0 0 auto', maxWidth: '100%', border: `1px solid ${border}`, borderRadius: 8, padding: 2, background: panel }}>
      {LEVELS.map((l) => {
        const on = l.id === cur
        return (
          <button key={l.id} type="button" role="radio" aria-checked={on} tabIndex={on ? 0 : -1} title={l.title}
            onClick={() => onChange && onChange(l.id)}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: 26, minWidth: 0, padding: compact ? '0 7px' : '0 9px',
              border: 'none', borderRadius: 6, background: on ? accentSoft : 'transparent', color: on ? accent : muted,
              font: 'inherit', fontSize: compact ? 11 : 11.5, fontWeight: on ? 750 : 600, lineHeight: 1, cursor: 'pointer', whiteSpace: 'nowrap',
              boxShadow: on ? `0 0 0 1px ${accent} inset` : 'none', transition: 'background .12s, color .12s',
            }}
            onFocus={(e) => { e.currentTarget.style.outline = 'none'; e.currentTarget.style.boxShadow = `0 0 0 2px ${accent}` }}
            onBlur={(e) => { e.currentTarget.style.boxShadow = on ? `0 0 0 1px ${accent} inset` : 'none' }}
          >{compact && l.id === 'technical' ? 'Tech' : compact && l.id === 'executive' ? 'Exec' : l.label}</button>
        )
      })}
    </div>
  )
}
