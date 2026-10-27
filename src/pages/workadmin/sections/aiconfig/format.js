// Pure helpers shared by the AI-config modules (no React, no fetch): relative
// time for the recommendation stamp, a price label, and the token-only tints
// the "in use" card and the Recommended-now panel share. ONE place, so the
// panel and the provider cards can never drift to different greens.

export function relTime(at, t) {
  if (!at) return ''
  const ts = new Date(at).getTime()
  if (isNaN(ts)) return ''
  const s = Math.round(Math.max(0, Date.now() - ts) / 1000)
  if (s < 45) return t('aiConfig.time.justNow')
  const m = Math.round(s / 60)
  if (m < 60) return t('aiConfig.time.minAgo', { n: m })
  const h = Math.round(m / 60)
  if (h < 24) return t('aiConfig.time.hoursAgo', { n: h })
  return t('aiConfig.time.daysAgo', { n: Math.round(h / 24) })
}

// "$0.13 /Mtok" or '' when the catalog has no price for the model.
export function priceLabel(m) {
  if (!m || m.usdPerMtok == null || !isFinite(Number(m.usdPerMtok))) return ''
  return `$${Number(m.usdPerMtok).toFixed(2)} /Mtok`
}

// Emerald = CHAT primary, cyan = VISION. Both from the console tokens.
export const EMERALD_LINE = 'color-mix(in srgb, var(--wka-emerald) 55%, transparent)'
export const EMERALD_WASH = 'color-mix(in srgb, var(--wka-emerald) 9%, transparent)'
export const EMERALD_RING = 'color-mix(in srgb, var(--wka-emerald) 8%, transparent)'
export const CYAN_LINE = 'color-mix(in srgb, var(--wka-cyan) 55%, transparent)'
export const CYAN_WASH = 'color-mix(in srgb, var(--wka-cyan) 9%, transparent)'

// Small role pill ("Primary for chat" / "Reads the screen"). Never wraps.
export function pillStyle(color) {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10.5, fontWeight: 700,
    color, border: `1px solid color-mix(in srgb, ${color} 40%, transparent)`,
    background: `color-mix(in srgb, ${color} 8%, transparent)`,
    borderRadius: 999, padding: '3px 9px', whiteSpace: 'nowrap', flexShrink: 0,
  }
}

export const EYEBROW = { fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--wka-faint)' }
