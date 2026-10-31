// A real product screenshot with numbered callouts layered ON TOP (never baked
// into the image), so the highlights stay crisp at any size and their text is
// translated like every other string. Each callout is an outlined region with a
// numbered pin, tied to a numbered key below the image:
//   - pins are buttons (keyboard-focusable, labelled "Callout n", described by
//     their key text), so a screen reader hears the same thing a sighted reader
//     sees; the image keeps its own meaningful alt text;
//   - hovering a pin or a key with a mouse, or focusing a pin, spotlights that
//     region (the rest of the screenshot dims); a click or tap on a pin pins the
//     spotlight and a second one releases it, Escape clears it. Touch never sets
//     the hover state, so a tap can never leave a spotlight stuck on.
// Geometry (image size + each region in image pixels) comes from
// shotGeometry.js, which is written by the same capture run as the image, so a
// highlight can never drift from its screenshot.
//
// Also exports HelpPath: the short numbered "how to" path shown above shots.
import { useId, useRef, useState } from 'react'
import { useT, renderRich } from '../../../i18n/index.jsx'
import { SHOT_GEOMETRY } from './shotGeometry.js'
import { pinPositions } from './pinLayout.js'

// Displayed width: never upscale a small capture, never wider than the text
// column, and keep tall captures to a readable height.
const MAX_W = 920, MAX_H = 900
export function shotWidth(g) { return Math.round(Math.min(g.w, MAX_W, (MAX_H * g.w) / g.h)) }

// Pin position: a corner of its region (pinLayout.js keeps pins apart), as a
// percentage of the image, clamped so a pin on an edge stays fully inside it.
const pct = (v, total) => `${((v / total) * 100).toFixed(3)}%`
const clampPos = (p) => `clamp(14px, ${p}, calc(100% - 14px))`

export default function AnnotatedShot({ name, alt, caption, marks = [] }) {
  const t = useT()
  const uid = useId()
  const [hover, setHover] = useState(null)
  const [pinned, setPinned] = useState(null)
  const g = SHOT_GEOMETRY[name]
  if (!g) return null
  // Only callouts whose region was captured (a mark the geometry lacks is skipped, never misplaced).
  const list = marks.filter((m) => m && g.marks[m.key])
  const on = pinned != null ? pinned : hover
  const keyId = (i) => `${uid}-k${i}`
  const box = (m) => g.marks[m.key]
  // A tap or click owns the spotlight: drop any hover it came with.
  const toggle = (i) => { setHover(null); setPinned((p) => (p === i ? null : i)) }
  // Hover only for a real mouse (touch emulates enter/leave and would stick).
  const hoverOn = (i) => (e) => { if (e.pointerType === 'mouse') setHover(i) }
  const hoverOff = (e) => { if (e.pointerType === 'mouse') setHover(null) }
  // Keyboard focus spotlights; the focus a click or tap gives a pin does not
  // (the click itself pins it). Flagged on pointerdown, read on the focus after.
  const byPointer = useRef(false)
  const onFocusPin = (i) => () => { if (!byPointer.current) setHover(i); byPointer.current = false }
  const onKey = (e) => { if (e.key === 'Escape') { setPinned(null); setHover(null) } }
  const active = on != null && list[on] ? box(list[on]) : null
  const pins = pinPositions(list.map(box), g.w)

  return (
    <figure className={`hs${active ? ' is-on' : ''}`} onKeyDown={onKey}>
      <div className="hs-wrap" style={{ maxWidth: shotWidth(g) }}>
        <div className="hs-stage">
          <img src={`/help/${name}.webp`} width={g.w} height={g.h} alt={alt} loading="lazy" decoding="async" />
          <svg className="hs-ov" viewBox={`0 0 ${g.w} ${g.h}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
            {active && (
              <path className="hs-dim" fillRule="evenodd"
                d={`M0 0H${g.w}V${g.h}H0Z M${active[0]} ${active[1]}h${active[2]}v${active[3]}h${-active[2]}Z`} />
            )}
            {list.map((m, i) => {
              const [x, y, w, h] = box(m)
              return (
                <g key={m.key}>
                  <rect className="hs-halo" x={x} y={y} width={w} height={h} rx="8" vectorEffect="non-scaling-stroke" />
                  <rect className={`hs-box${on === i ? ' on' : ''}`} x={x} y={y} width={w} height={h} rx="8" vectorEffect="non-scaling-stroke" />
                </g>
              )
            })}
          </svg>
          {list.map((m, i) => {
            const [x, y] = pins[i]
            return (
              <button key={m.key} type="button" className={`hs-pin${on === i ? ' on' : ''}`}
                style={{ left: clampPos(pct(x, g.w)), top: clampPos(pct(y, g.h)) }}
                aria-label={t('helpShared.callout', { n: i + 1 })} aria-describedby={keyId(i)} aria-pressed={pinned === i}
                onPointerEnter={hoverOn(i)} onPointerLeave={hoverOff}
                onPointerDown={() => { byPointer.current = true }}
                onFocus={onFocusPin(i)} onBlur={() => { byPointer.current = false; setHover(null) }}
                onClick={() => toggle(i)}>
                {i + 1}
              </button>
            )
          })}
        </div>
        {list.length > 0 && (
          <ol className="hs-keys" aria-label={t('helpShared.calloutsLabel')}>
            {list.map((m, i) => (
              <li key={m.key} id={keyId(i)} className={on === i ? 'on' : ''}
                onPointerEnter={hoverOn(i)} onPointerLeave={hoverOff}>
                <span className="hs-n" aria-hidden="true">{i + 1}</span>
                <span>{renderRich(m.text)}</span>
              </li>
            ))}
          </ol>
        )}
        {caption && <figcaption className="hs-cap">{caption}</figcaption>}
      </div>
    </figure>
  )
}

// The task as a short numbered path (one line per step, wraps to one column at
// phone width). Items are translated rich strings (inline <b> only).
export function HelpPath({ items }) {
  const t = useT()
  const list = Array.isArray(items) ? items : []
  if (!list.length) return null
  return (
    <ol className="hs-path" aria-label={t('helpShared.pathLabel')}>
      {list.map((s, i) => (
        <li key={i}><span className="hs-path-n" aria-hidden="true">{i + 1}</span><span>{renderRich(s)}</span></li>
      ))}
    </ol>
  )
}
