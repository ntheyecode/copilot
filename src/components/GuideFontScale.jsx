// GuideFontScale - the ONE source of truth for the reader-controlled text size
// used by the guidance reading surfaces (the in-console step view and the
// full-screen second-monitor guide). Microsoft Learn / Docs style: a compact,
// scannable default with a small A- / A / A+ control so a reader can step the
// size up for accessibility or down to fit more on screen.
//
// Both surfaces share ONE localStorage key, so the choice agrees across the
// console and the full-screen guide and survives reloads. Everything is wrapped
// in try/catch so blocked or private-mode storage never throws; it just falls
// back to the compact default. The scale is applied as a CSS multiplier
// (`--wc-fs` or an inline calc) on the guidance container so headings, body and
// code boxes scale together and cleanly.
import { useCallback, useEffect, useState } from 'react'

// ONE shared key for every guidance surface.
export const GUIDE_FS_KEY = 'wc-guide-fontscale'

// Compact default first, then two larger steps for accessibility (and one
// smaller for dense screens). The DEFAULT is the compact 1.0 - the new reduced
// base sizes are designed at this scale, so the default view is the compact one.
export const FS_STEPS = [0.9, 1, 1.15, 1.3]
export const FS_DEFAULT = 1

// Snap any stored/typed value to the nearest allowed step, so a stale or odd
// value can never produce a broken size.
export function clampScale(v) {
  const n = Number(v)
  if (!Number.isFinite(n)) return FS_DEFAULT
  let best = FS_STEPS[0]
  for (const s of FS_STEPS) { if (Math.abs(s - n) < Math.abs(best - n)) best = s }
  return best
}

export function readFontScale() {
  try { const v = localStorage.getItem(GUIDE_FS_KEY); if (v != null) return clampScale(v) } catch { /* ignore */ }
  return FS_DEFAULT
}
export function writeFontScale(v) {
  try { localStorage.setItem(GUIDE_FS_KEY, String(v)) } catch { /* ignore */ }
}

// The shared hook: current scale + step controls, kept in sync across windows
// (the console and the full-screen guide) via the same-origin 'storage' event.
export function useGuideFontScale() {
  const [scale, setScaleState] = useState(readFontScale)

  useEffect(() => {
    const onStorage = (e) => { if (!e || e.key === GUIDE_FS_KEY) setScaleState(readFontScale()) }
    try { window.addEventListener('storage', onStorage) } catch { /* ignore */ }
    return () => { try { window.removeEventListener('storage', onStorage) } catch { /* ignore */ } }
  }, [])

  const stepBy = useCallback((dir) => {
    setScaleState((s) => {
      const i = FS_STEPS.indexOf(clampScale(s))
      const next = FS_STEPS[Math.max(0, Math.min(FS_STEPS.length - 1, i + dir))]
      writeFontScale(next)
      return next
    })
  }, [])
  const dec = useCallback(() => stepBy(-1), [stepBy])
  const inc = useCallback(() => stepBy(1), [stepBy])
  const reset = useCallback(() => { setScaleState(FS_DEFAULT); writeFontScale(FS_DEFAULT) }, [])

  const idx = FS_STEPS.indexOf(clampScale(scale))
  return { scale, dec, inc, reset, atMin: idx <= 0, atMax: idx >= FS_STEPS.length - 1 }
}

// A small, accessible A- / A / A+ control. Theme-agnostic: the caller passes a
// `theme` with { border, text, muted, panel, accent } (plain colors OR CSS var
// strings), so it looks native on both the dark full-screen guide and the
// light/dark console. Real <button>s, so it is keyboard-accessible; no motion.
export default function GuideFontControl({ scale, dec, inc, reset, atMin, atMax, theme }) {
  const t = theme || {}
  const border = t.border || 'var(--border)'
  const text = t.text || 'var(--text)'
  const muted = t.muted || 'var(--text-muted)'
  const panel = t.panel || 'transparent'
  const accent = t.accent || 'var(--em)'
  const btn = (extra) => ({
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    minWidth: 26, height: 26, padding: '0 6px', border: 'none', borderRadius: 6,
    background: 'transparent', color: muted, cursor: 'pointer', font: 'inherit',
    fontWeight: 700, lineHeight: 1, ...extra,
  })
  return (
    <div
      role="group"
      aria-label="Text size"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 1, flex: '0 0 auto',
        border: `1px solid ${border}`, borderRadius: 8, padding: 2, background: panel,
      }}
    >
      <button type="button" onClick={dec} disabled={atMin} aria-label="Smaller text"
        title="Smaller text" style={btn({ fontSize: 11, opacity: atMin ? 0.4 : 1, cursor: atMin ? 'default' : 'pointer' })}>A<span aria-hidden style={{ fontSize: 9, marginLeft: 1 }}>-</span></button>
      <button type="button" onClick={reset} aria-label="Reset text size" title="Reset text size"
        style={btn({ fontSize: 13, color: Math.abs((scale || 1) - 1) < 0.001 ? accent : muted })}>A</button>
      <button type="button" onClick={inc} disabled={atMax} aria-label="Larger text"
        title="Larger text" style={btn({ fontSize: 15, color: text, opacity: atMax ? 0.4 : 1, cursor: atMax ? 'default' : 'pointer' })}>A<span aria-hidden style={{ fontSize: 11, marginLeft: 1 }}>+</span></button>
    </div>
  )
}
