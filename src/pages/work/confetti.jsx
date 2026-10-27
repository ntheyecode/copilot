// Confetti for the task-complete flourish, shared by the console's celebration
// and the floating panel (moved verbatim out of Guiding.jsx).
// Pure-CSS confetti pieces for the task-complete flourish (no npm dependency).
// Deterministic per call (computed once via useMemo at the call site). Colors
// default to the on-brand palette; the floater passes concrete hex values
// because the Picture-in-Picture document carries none of the app's CSS vars.
export const CONFETTI_COLORS = ['var(--brand-600, #0b8259)', 'var(--success, #16a34a)', '#f5b64b', '#5aa9ff', 'var(--brand-400, #34d399)']
export function makeConfetti(n = 14, colors = CONFETTI_COLORS) {
  const a = []
  for (let i = 0; i < n; i++) {
    const rect = i % 3 !== 0
    a.push({
      left: Math.round((i / n) * 100 + (Math.random() * 8 - 4)),
      bg: colors[i % colors.length],
      x: Math.round(Math.random() * 120 - 60),
      fall: Math.round(180 + Math.random() * 130),
      rot: Math.round((360 + Math.random() * 440)) * (i % 2 ? 1 : -1),
      dur: (2.0 + Math.random() * 1.1).toFixed(2),
      delay: (Math.random() * 0.5).toFixed(2),
      w: rect ? 7 : 8,
      h: rect ? 11 : 8,
      round: rect ? 2 : 50,
    })
  }
  return a
}
// One confetti piece as an inline-styled <i>. className is 'wc-confetti' (main
// document) or 'fp-confetti' (the float document); both define @keyframes.
export function confettiNodes(pieces) {
  return pieces.map((p, i) => (
    <i key={i} style={{ left: p.left + '%', width: p.w, height: p.h, borderRadius: p.round, background: p.bg, '--x': p.x + 'px', '--fall': p.fall + 'px', '--rot': p.rot + 'deg', '--d': p.dur + 's', '--delay': p.delay + 's' }} />
  ))
}

