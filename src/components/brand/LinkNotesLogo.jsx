// LinkNotes brand mark and wordmark (the individuals product).
//
// The mark ("Stepline"): a violet tile with one white route that rises, dips
// once (the wrong turn the guide catches) and lands on a lime goal dot. The
// product story in a single stroke; a solid tile so it still reads at 16px.
// Source of truth for the static files in public/brand/linknotes/ (logo.svg,
// mark.svg, favicon.svg and the PNG icons rendered from them): change the
// geometry here and re-render those (scripts/brand-render-linknotes.mjs).
//
//   <LinkNotesLogo size={28} />                 mark + wordmark, on a light surface
//   <LinkNotesLogo size={28} onDark />          on a dark surface
//   <LinkNotesLogo size={32} variant="mark" />  the tile alone (app shells, avatars)
//
// Colors are the brand constants below, not page tokens, so the lockup looks
// the same in the site, the signed-in shell and an email. No resemblance to
// the AdmireVeda chevron: different geometry, container and palette.
import { useId } from 'react'
import { BRANDS } from '../../../server/brand.js'

export const LN_VIOLET = '#5b3df5'
export const LN_VIOLET_DEEP = '#4a2fe0'
export const LN_VIOLET_LIGHT = '#6a4cff'
export const LN_LIME = '#c9f23a'
export const LN_INK = '#14122b'
// The wordmark, as brand tokens (never translated): "Link" in ink, "Notes" in the accent.
export const LN_WORDMARK = Object.freeze(['Link', 'Notes'])

// The mark's inner drawing on a 40x40 grid, shared by the React mark and the
// static SVG renderer (same path, same stroke, same dot).
export const LN_MARK = Object.freeze({
  box: 40, radius: 11,
  route: 'M9 28.5 L17.5 19.5 L23 24.5 L31 13',
  routeWidth: 4.6,
  dot: { cx: 31, cy: 13, r: 4.2, ring: 1.2 },
})

export function LinkNotesMark({ size = 28, id, className }) {
  const auto = useId()
  const gid = `lnm-${id || auto.replace(/[^a-zA-Z0-9]/g, '')}`
  const m = LN_MARK
  return (
    <svg width={size} height={size} viewBox={`0 0 ${m.box} ${m.box}`} className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={LN_VIOLET_LIGHT} />
          <stop offset="1" stopColor={LN_VIOLET_DEEP} />
        </linearGradient>
      </defs>
      <rect width={m.box} height={m.box} rx={m.radius} fill={`url(#${gid})`} />
      <path d={m.route} fill="none" stroke="#fff" strokeWidth={m.routeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={m.dot.cx} cy={m.dot.cy} r={m.dot.r} fill={LN_LIME} stroke={LN_INK} strokeWidth={m.dot.ring} />
    </svg>
  )
}

// `product`: also show the product the brand sells (MyTaskPilot by LinkNotes),
// as a small label after the wordmark, the way AdmireVeda shows WorkCoPilot.
// The name comes from the brand registry (server/brand.js), never a literal.
export default function LinkNotesLogo({ size = 28, variant = 'full', onDark = false, idSuffix = '', className, product = false }) {
  if (variant === 'mark') return <LinkNotesMark size={size} id={idSuffix} className={className} />
  const ink = onDark ? '#ffffff' : LN_INK
  const accent = onDark ? LN_LIME : LN_VIOLET
  return (
    <span className={className} style={{ display: 'inline-flex', alignItems: 'center', gap: Math.round(size * 0.36), lineHeight: 1, whiteSpace: 'nowrap' }}>
      <LinkNotesMark size={size} id={idSuffix} />
      <span style={{ fontFamily: '"Inter Variable","Inter",system-ui,sans-serif', fontWeight: 800, fontSize: Math.round(size * 0.82), letterSpacing: '-.035em', color: ink, whiteSpace: 'nowrap' }}>
        {LN_WORDMARK[0]}<span style={{ color: accent }}>{LN_WORDMARK[1]}</span>
      </span>
      {product && (
        <span className="ln-logo-product" style={{ flexShrink: 0, fontFamily: '"Inter Variable","Inter",system-ui,sans-serif', fontWeight: 700, fontSize: Math.max(11, Math.round(size * 0.4)), color: accent, border: `1px solid ${onDark ? 'rgba(201,242,58,.45)' : 'rgba(91,61,245,.35)'}`, background: onDark ? 'transparent' : 'rgba(91,61,245,.07)', borderRadius: 999, padding: '2px 9px', whiteSpace: 'nowrap' }}>
          {BRANDS.linknotes.product}
        </span>
      )}
    </span>
  )
}
