// BuddyPicker - a compact row of the buddy cast (the bot, the dino mascot, the
// illustrated people and the pets) plus a "Surprise" option that rotates among
// the pets. Each swatch is the live AliveBuddy face rendered small and still
// (no per-thumb animation loop), so what you pick is exactly what you get.
// Tapping one saves the choice (localStorage, via AliveBuddy's helpers) and tells
// the parent, so the live buddy swaps at once. No image assets. On-brand for a
// LIGHT context - reads cleanly on the white dashboard card AND on the (now
// white/boxless) floating buddy - and fully keyboard + screen-reader reachable.
import React from 'react'
import { Shuffle } from 'lucide-react'
import AliveBuddy, { CHARACTERS, writeBuddyPref, CHARACTER_LABELS as LABELS } from './AliveBuddy.jsx'
import { useT } from '../i18n/index.jsx'

// Product green (the #0e9f6e family used across the light surfaces), NOT the old
// neon emerald of the dark buddy. SWATCH = white chip with a soft hairline; the
// SELECTED state is a clear green ring so it reads on white.
const GREEN = '#0e9f6e'
const GREEN_RING = 'rgba(14,159,110,0.30)'
const SWATCH_BG = '#ffffff'
const HAIRLINE = 'rgba(16,24,40,0.14)'
const ICON_OFF = '#6b7280'

// `pref` is the saved preference (a character key or 'surprise'); `onPick(pref)`
// receives the new preference. `size` sizes each swatch.
export default function BuddyPicker({ pref = 'bot', onPick, size = 34 }) {
  const t = useT()
  const pick = (p) => { writeBuddyPref(p); try { onPick && onPick(p) } catch { /* ignore */ } }
  const s = size
  const options = [...CHARACTERS, 'surprise']
  return (
    <div role="radiogroup" aria-label={t('buddyPicker.groupAria')} style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
      {options.map((p) => {
        const on = pref === p
        const isSurprise = p === 'surprise'
        const label = isSurprise ? 'Surprise (a random pet)' : LABELS[p] || p
        return (
          <button
            key={p}
            type="button"
            role="radio"
            aria-checked={on}
            title={label}
            aria-label={label}
            onClick={() => pick(p)}
            style={{
              position: 'relative', width: s, height: s, padding: 0, flex: '0 0 auto',
              borderRadius: '50%', cursor: 'pointer', overflow: 'hidden',
              background: SWATCH_BG,
              border: `${on ? 2 : 1.5}px solid ${on ? GREEN : HAIRLINE}`,
              boxShadow: on ? `0 0 0 3px ${GREEN_RING}` : '0 1px 2px rgba(16,24,40,0.06)',
              transition: 'border-color 0.15s, box-shadow 0.15s, transform 0.12s',
              display: 'grid', placeItems: 'center',
            }}
            onMouseDown={(e) => e.preventDefault()}
          >
            {isSurprise ? (
              <Shuffle size={Math.round(s * 0.46)} color={on ? GREEN : ICON_OFF} />
            ) : (
              <AliveBuddy character={p} state={on ? 'answering' : 'idle'} size={s - 4} motion={false} interactive={false} title={label} />
            )}
          </button>
        )
      })}
    </div>
  )
}
