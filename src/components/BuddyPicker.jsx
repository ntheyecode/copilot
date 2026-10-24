// BuddyPicker - a compact row of the buddy cast (the bot, the dino mascot, the
// illustrated people and the pets) plus a "Surprise" option that rotates among
// the pets. Each swatch is the live AliveBuddy face rendered small and still
// (no per-thumb animation loop), so what you pick is exactly what you get.
// Tapping one saves the choice (localStorage, via AliveBuddy's helpers) and tells
// the parent, so the live buddy swaps at once. No image assets. On-brand,
// theme-neutral (works on the dark buddy card and the console), and fully
// keyboard + screen-reader reachable.
import React from 'react'
import { Shuffle } from 'lucide-react'
import AliveBuddy, { CHARACTERS, writeBuddyPref, CHARACTER_LABELS as LABELS } from './AliveBuddy.jsx'

const ACCENT = '#8cf5c4'

// `pref` is the saved preference (a character key or 'surprise'); `onPick(pref)`
// receives the new preference. `size` sizes each swatch.
export default function BuddyPicker({ pref = 'bot', onPick, size = 34 }) {
  const pick = (p) => { writeBuddyPref(p); try { onPick && onPick(p) } catch { /* ignore */ } }
  const s = size
  const options = [...CHARACTERS, 'surprise']
  return (
    <div role="radiogroup" aria-label="Choose your buddy" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
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
              background: '#0a0d12',
              border: `2px solid ${on ? ACCENT : 'rgba(255,255,255,0.14)'}`,
              boxShadow: on ? `0 0 0 2px rgba(140,245,196,0.25), 0 0 10px rgba(140,245,196,0.4)` : 'none',
              transition: 'border-color 0.15s, box-shadow 0.15s, transform 0.12s',
              display: 'grid', placeItems: 'center',
            }}
            onMouseDown={(e) => e.preventDefault()}
          >
            {isSurprise ? (
              <Shuffle size={Math.round(s * 0.46)} color={on ? ACCENT : '#aeb8bf'} />
            ) : (
              <AliveBuddy character={p} state={on ? 'answering' : 'idle'} size={s - 4} motion={false} interactive={false} title={label} />
            )}
          </button>
        )
      })}
    </div>
  )
}
