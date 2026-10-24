// BuddyPicker - a compact row of the six buddy avatars plus a "Surprise" option
// that rotates among the pets. Tapping one saves the choice (localStorage, via
// AliveBuddy's helpers) and tells the parent, so the live buddy swaps at once.
// On-brand, theme-neutral (works on the dark buddy card and the console), and
// fully keyboard + screen-reader reachable.
import React from 'react'
import { Shuffle } from 'lucide-react'
import { CHARACTERS, writeBuddyPref, CHARACTER_LABELS as LABELS } from './AliveBuddy.jsx'

const ACCENT = '#8cf5c4'

// `pref` is the saved preference ('bot'..'man' or 'surprise'); `onPick(pref)`
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
              <img src={`/buddies/${p}.jpg`} alt="" draggable={false}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            )}
          </button>
        )
      })}
    </div>
  )
}
