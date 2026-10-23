// AliveBuddy - a small, "alive" character avatar for the WorkCoPilot buddy and
// full-screen guide. It is a round 3D-rendered portrait that breathes, tilts
// toward the cursor ("it looks at me"), and reacts to the live session state
// with a short motion and a colored glow. It is pure React + CSS transforms
// driven by one requestAnimationFrame loop, so it is cheap enough to run in an
// always-on overlay (no video, no canvas, no timers per frame beyond the rAF).
//
// Props:
//   character   'bot' | 'dog' | 'cat' | 'fox' | 'woman' | 'man'   (default 'bot')
//   state       'idle' | 'thinking' | 'answering' | 'done' | 'newstep' | 'alert'
//   size        px, the rendered diameter                         (default 96)
//   interactive mouse-follow tilt on/off                          (default true)
//   motion      master animation switch; false freezes everything (default true)
//   title       optional accessible label / tooltip
//
// Behaviors:
//   idle      gentle vertical breathe/bob
//   thinking  slow sway + cyan glow
//   answering subtle nod + emerald glow
//   done      one happy jump + bright emerald glow + check badge + sparkle burst
//   newstep   quick scale pop + cyan glow
//   alert     brief shake + amber glow + warning-triangle badge
// prefers-reduced-motion (or motion=false) disables the loops + tilt and shows
// the static avatar with its glow. Everything is guarded so it never throws.
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Check, AlertTriangle } from 'lucide-react'

const ACCENT = '#8cf5c4'   // emerald
const CYAN = '#39d3ff'     // cyan
const AMBER = '#f5c86b'    // alert

// Characters: a neutral robot (the default, so no person is centered), a
// representative set of ADULT human avatars - the audience is 18-45 (mostly
// 25-37) - spanning gender, skin tone, ethnicity and age with equal dignity and
// identical rendering, plus friendly pets. Keys map to /buddies/<key>.jpg.
const CHARACTERS = ['bot', 'woman', 'man', 'maya', 'mateo', 'sami', 'ria', 'dog', 'cat', 'fox']
const PETS = ['dog', 'cat', 'fox']

// Per-state look: the glow color, its strength, and which state-motion class to
// apply on the motion layer. One-shot motions (jump/pop/shake) carry a flag so
// we can retrigger them with a key bump when the state is (re)entered.
const STATES = {
  idle: { glow: ACCENT, blur: 7, spread: 0.28, anim: '', once: false },
  thinking: { glow: CYAN, blur: 12, spread: 0.6, anim: 'ab-sway', once: false },
  answering: { glow: ACCENT, blur: 12, spread: 0.62, anim: 'ab-nod', once: false },
  done: { glow: ACCENT, blur: 18, spread: 0.95, anim: 'ab-jump', once: true },
  newstep: { glow: CYAN, blur: 14, spread: 0.8, anim: 'ab-pop', once: true },
  alert: { glow: AMBER, blur: 13, spread: 0.85, anim: 'ab-shake', once: true },
}

function prefersReducedMotion() {
  try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) } catch { return false }
}

export default function AliveBuddy({
  character = 'bot',
  state = 'idle',
  size = 96,
  interactive = true,
  motion = true,
  title,
}) {
  const char = CHARACTERS.includes(character) ? character : 'bot'
  const st = STATES[state] || STATES.idle

  const wrapRef = useRef(null)   // perspective + pointer surface
  const tiltRef = useRef(null)   // rAF writes transform here (tilt + bob)
  const rafRef = useRef(0)
  const targetRef = useRef({ rx: 0, ry: 0 })
  const curRef = useRef({ rx: 0, ry: 0 })
  const t0Ref = useRef(0)

  const [reduced, setReduced] = useState(prefersReducedMotion())
  const [imgOk, setImgOk] = useState(true)
  // Bump a key every time a ONE-SHOT motion state is (re)entered so the CSS
  // animation replays and the sparkle burst fires again.
  const [shot, setShot] = useState(0)
  const prevStateRef = useRef(state)

  const animate = motion && !reduced

  useEffect(() => {
    const entered = prevStateRef.current !== state
    prevStateRef.current = state
    if (entered && st.once) setShot((n) => n + 1)
  }, [state, st.once])

  // Track the OS reduced-motion preference live.
  useEffect(() => {
    let mq
    try { mq = window.matchMedia('(prefers-reduced-motion: reduce)') } catch { return undefined }
    if (!mq) return undefined
    const on = () => setReduced(!!mq.matches)
    try { mq.addEventListener('change', on) } catch { try { mq.addListener(on) } catch { /* ignore */ } }
    return () => { try { mq.removeEventListener('change', on) } catch { try { mq.removeListener(on) } catch { /* ignore */ } } }
  }, [])

  // The one rAF loop: ease the tilt toward the pointer target and add a gentle
  // sine bob, writing a single transform string. Stops entirely when animation
  // is off (and resets the element so the static avatar sits centered).
  useEffect(() => {
    const el = tiltRef.current
    if (!el) return undefined
    if (!animate) {
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = 0 }
      try { el.style.transform = 'none' } catch { /* ignore */ }
      curRef.current = { rx: 0, ry: 0 }
      targetRef.current = { rx: 0, ry: 0 }
      return undefined
    }
    t0Ref.current = (typeof performance !== 'undefined' ? performance.now() : Date.now())
    const tick = (now) => {
      try {
        const cur = curRef.current
        const tgt = targetRef.current
        cur.rx += (tgt.rx - cur.rx) * 0.12
        cur.ry += (tgt.ry - cur.ry) * 0.12
        const t = ((now || 0) - t0Ref.current) / 1000
        const bob = Math.sin(t * 1.9) * (size * 0.016)   // scales with size
        el.style.transform = `translateY(${bob.toFixed(2)}px) rotateX(${cur.rx.toFixed(2)}deg) rotateY(${cur.ry.toFixed(2)}deg)`
      } catch { /* ignore a transient DOM error */ }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = 0 } }
  }, [animate, size])

  // Pointer-follow: only when interactive AND animating. Maps the cursor's
  // position within the avatar box to a clamped tilt; recenters on leave.
  useEffect(() => {
    const el = wrapRef.current
    if (!el || !interactive || !animate) return undefined
    const MAX = 15
    const onMove = (e) => {
      try {
        const r = el.getBoundingClientRect()
        if (!r.width || !r.height) return
        const px = (e.clientX - r.left) / r.width - 0.5
        const py = (e.clientY - r.top) / r.height - 0.5
        targetRef.current = {
          rx: Math.max(-MAX, Math.min(MAX, -py * 2 * MAX)),
          ry: Math.max(-MAX, Math.min(MAX, px * 2 * MAX)),
        }
      } catch { /* ignore */ }
    }
    const onLeave = () => { targetRef.current = { rx: 0, ry: 0 } }
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerleave', onLeave)
    return () => { el.removeEventListener('pointermove', onMove); el.removeEventListener('pointerleave', onLeave) }
  }, [interactive, animate])

  const glow = `drop-shadow(0 0 ${st.blur}px ${withAlpha(st.glow, st.spread)}) drop-shadow(0 3px 6px rgba(0,0,0,0.45))`
  const motionAnim = animate && st.anim
    ? `${st.anim} ${st.once ? '0.85s cubic-bezier(.3,1.3,.5,1) 1' : st.anim === 'ab-sway' ? '4.6s ease-in-out infinite' : '2.9s ease-in-out infinite'}`
    : 'none'

  const sparkles = useMemo(() => (
    state === 'done' && animate
      ? [0, 1, 2, 3, 4].map((i) => ({ a: (i / 5) * Math.PI * 2 + 0.4, d: 0.5 + (i % 3) * 0.12 }))
      : []
  ), [state, animate, shot]) // eslint-disable-line react-hooks/exhaustive-deps

  const px = Math.max(24, Math.round(size))
  const badgeSize = Math.max(16, Math.round(px * 0.26))

  return (
    <div
      ref={wrapRef}
      role="img"
      aria-label={title || `WorkCoPilot buddy (${char})`}
      title={title}
      style={{
        position: 'relative',
        width: px,
        height: px,
        flex: '0 0 auto',
        perspective: `${Math.round(px * 6)}px`,
        WebkitAppRegion: 'no-drag',
        userSelect: 'none',
        pointerEvents: interactive ? 'auto' : 'none',
      }}
    >
      {/* soft ground glow behind the portrait so it reads as lit, not pasted */}
      <span aria-hidden style={{
        position: 'absolute', inset: '8%', borderRadius: '50%',
        background: `radial-gradient(circle at 50% 40%, ${withAlpha(st.glow, 0.22)}, transparent 70%)`,
        filter: 'blur(6px)', transition: 'background 0.4s ease', pointerEvents: 'none',
      }} />

      {/* tilt + bob layer (rAF) */}
      <div ref={tiltRef} style={{ width: '100%', height: '100%', transformStyle: 'preserve-3d', willChange: 'transform' }}>
        {/* state-motion layer (CSS), keyed so one-shots replay on re-entry */}
        <div key={shot} style={{ width: '100%', height: '100%', animation: motionAnim }}>
          <div style={{
            width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden',
            background: '#0a0d12',
            boxShadow: `inset 0 0 0 1px ${withAlpha(st.glow, 0.5)}, inset 0 ${Math.round(px * 0.14)}px ${Math.round(px * 0.2)}px rgba(0,0,0,0.35)`,
            filter: glow, transition: 'filter 0.4s ease, box-shadow 0.4s ease',
          }}>
            {imgOk ? (
              <img
                src={`/buddies/${char}.jpg`}
                alt=""
                draggable={false}
                onError={() => setImgOk(false)}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            ) : (
              // Fallback if the asset is missing: a lit initial so the buddy still renders.
              <span style={{
                display: 'grid', placeItems: 'center', width: '100%', height: '100%',
                color: st.glow, fontWeight: 800, fontSize: px * 0.4,
                fontFamily: '"Bricolage Grotesque", system-ui, sans-serif',
              }}>{char.charAt(0).toUpperCase()}</span>
            )}
          </div>
        </div>
      </div>

      {/* status badges (done / alert) */}
      {state === 'done' && (
        <span aria-hidden style={{ ...badgeBase(badgeSize, px), background: ACCENT, color: '#06281c', boxShadow: `0 0 10px ${withAlpha(ACCENT, 0.8)}` }}>
          <Check size={Math.round(badgeSize * 0.62)} strokeWidth={3} />
        </span>
      )}
      {state === 'alert' && (
        <span aria-hidden style={{ ...badgeBase(badgeSize, px), background: AMBER, color: '#3a2a00', boxShadow: `0 0 10px ${withAlpha(AMBER, 0.8)}` }}>
          <AlertTriangle size={Math.round(badgeSize * 0.58)} strokeWidth={2.5} />
        </span>
      )}

      {/* sparkle burst on done */}
      {sparkles.length > 0 && (
        <span key={shot} aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          {sparkles.map((s, i) => (
            <span key={i} style={{
              position: 'absolute', left: '50%', top: '42%',
              width: Math.max(3, Math.round(px * 0.05)), height: Math.max(3, Math.round(px * 0.05)),
              borderRadius: '50%', background: ACCENT,
              boxShadow: `0 0 6px ${withAlpha(ACCENT, 0.9)}`,
              // CSS vars feed the keyframe so each spark flies a different way.
              ['--dx']: `${Math.cos(s.a) * px * s.d}px`,
              ['--dy']: `${Math.sin(s.a) * px * s.d}px`,
              animation: 'ab-spark 0.8s ease-out forwards',
              animationDelay: `${(i % 3) * 0.04}s`,
            }} />
          ))}
        </span>
      )}
    </div>
  )
}

// Pick a "surprise" pet, fresh per browser session (sessionStorage), so the
// surprise stays stable within a sitting but changes next time.
export function surprisePet() {
  try {
    const k = 'wc.buddy.surprise'
    let v = sessionStorage.getItem(k)
    if (!v || !PETS.includes(v)) { v = PETS[Math.floor(Math.random() * PETS.length)]; sessionStorage.setItem(k, v) }
    return v
  } catch { return PETS[Math.floor(Math.random() * PETS.length)] }
}

export { CHARACTERS, PETS }

const CHAR_KEY = 'wc.buddy.character'

// The saved buddy preference: one of the six names, or the literal 'surprise'.
// Defaults to 'bot'. Never throws (private mode / blocked storage).
export function readBuddyPref() {
  try { const v = localStorage.getItem(CHAR_KEY); if (v === 'surprise' || CHARACTERS.includes(v)) return v } catch { /* ignore */ }
  return 'bot'
}
export function writeBuddyPref(pref) {
  try { if (pref === 'surprise' || CHARACTERS.includes(pref)) localStorage.setItem(CHAR_KEY, pref) } catch { /* ignore */ }
}
// Turn a preference into the character to actually render ('surprise' -> a pet).
export function resolveCharacter(pref) {
  if (pref === 'surprise') return surprisePet()
  return CHARACTERS.includes(pref) ? pref : 'bot'
}

function badgeBase(s, px) {
  return {
    position: 'absolute', right: Math.round(px * 0.02), bottom: Math.round(px * 0.02),
    width: s, height: s, borderRadius: '50%', display: 'grid', placeItems: 'center',
    border: '2px solid #0a0d12',
  }
}

// #rrggbb + alpha -> rgba(). Falls back to the input on any parse miss.
function withAlpha(hex, a) {
  try {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim())
    if (!m) return hex
    const n = parseInt(m[1], 16)
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
  } catch { return hex }
}

// Keyframes, injected once.
if (typeof document !== 'undefined' && !document.getElementById('ab-kf')) {
  const el = document.createElement('style')
  el.id = 'ab-kf'
  el.textContent = [
    '@keyframes ab-sway{0%,100%{transform:rotate(-3deg)}50%{transform:rotate(3deg)}}',
    '@keyframes ab-nod{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(3%) rotate(1.2deg)}}',
    '@keyframes ab-jump{0%{transform:translateY(0) scale(1)}30%{transform:translateY(-16%) scale(1.06)}55%{transform:translateY(2%) scale(0.97)}75%{transform:translateY(-5%) scale(1.02)}100%{transform:translateY(0) scale(1)}}',
    '@keyframes ab-pop{0%{transform:scale(1)}40%{transform:scale(1.12)}70%{transform:scale(0.98)}100%{transform:scale(1)}}',
    '@keyframes ab-shake{0%,100%{transform:translateX(0)}15%{transform:translateX(-7%)}30%{transform:translateX(6%)}45%{transform:translateX(-5%)}60%{transform:translateX(4%)}75%{transform:translateX(-2%)}}',
    '@keyframes ab-spark{0%{opacity:0;transform:translate(-50%,-50%) scale(0.4)}25%{opacity:1}100%{opacity:0;transform:translate(calc(-50% + var(--dx)),calc(-50% + var(--dy))) scale(1)}}',
  ].join('')
  document.head.appendChild(el)
}
