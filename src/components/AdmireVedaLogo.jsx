// AdmireVeda brand mark. A layered upward chevron with a "guide dot" at the
// apex: insight pointing you to the next step. Gradient emerald -> cyan.
// `mark` renders just the symbol; the default renders mark + wordmark.
export function AVMark({ size = 30, id = 'av', glow = true }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" style={glow ? { filter: 'drop-shadow(0 0 10px rgba(140,245,196,.45))' } : undefined} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8cf5c4" />
          <stop offset="1" stopColor="#39d3ff" />
        </linearGradient>
      </defs>
      <path d="M5 30 L20 9 L35 30" stroke={`url(#${id})`} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 31 L20 20 L28 31" stroke={`url(#${id})`} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.38" />
      <circle cx="20" cy="8.5" r="3.4" fill={`url(#${id})`} />
    </svg>
  )
}

export default function AdmireVedaLogo({ size = 28, product = true, onDark = true, idSuffix = '' }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <AVMark size={size} id={`av${idSuffix}`} />
      <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontFamily: '"Bricolage Grotesque",sans-serif', fontWeight: 800, fontSize: size * 0.62, letterSpacing: '-.02em', color: onDark ? '#eef0f6' : '#0a0b10' }}>
          Admire<span style={{ color: '#8cf5c4' }}>Veda</span>
        </span>
        {product && (
          <span style={{ fontFamily: '"Figtree",sans-serif', fontWeight: 600, fontSize: size * 0.38, color: '#8cf5c4', letterSpacing: '.02em', border: '1px solid rgba(140,245,196,.35)', borderRadius: 999, padding: '2px 9px' }}>
            WorkCoPilot
          </span>
        )}
      </span>
    </span>
  )
}
