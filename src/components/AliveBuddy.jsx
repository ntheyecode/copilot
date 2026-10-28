// AliveBuddy - a small, genuinely ALIVE, fully responding character avatar for
// the WorkCoPilot buddy and full-screen guide. Every character is an ANIMATED,
// EXPRESSIVE inline-SVG face on one shared rig (no photos, no image assets): it
// breathes, blinks, glances around and follows the cursor, and reacts to the
// live session state with a clear expression - looking up while thinking, a
// talking mouth and speaking ring while delivering a step, closed happy eyes +
// a burst on done, worried brows + a flat mouth on alert. Pure React + CSS
// driven by one requestAnimationFrame loop, cheap enough for an always-on
// overlay.
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

// The cast (owner-locked): BOY, GIRL, DOG, CAT - four friendly, dignified
// mascots with IDENTICAL rendering (one face rig, same expressions, same
// animation). The bot is a last-resort fallback only (unknown character key);
// it is not offered in the picker. All are drawn inline; no /buddies/*.jpg.
// Generated artwork can be dropped in per character via ART_URL below.
const CHARACTERS = ['boy', 'girl', 'dog', 'cat']
const PETS = ['dog', 'cat']
// Saved preferences from the earlier casts resolve to the nearest mascot.
const LEGACY = { bot: 'dog', dino: 'dog', woman: 'girl', maya: 'girl', sami: 'girl', ria: 'girl', man: 'boy', mateo: 'boy', fox: 'dog' }
// Drop-in hook for generated mascot art: set e.g. { boy: '/buddies/boy.png' }
// and that image becomes the face layer (still breathing, with the state rings,
// reaction FX and speech bubble). Empty = the animated SVG rig renders.
const ART_URL = {}
// Friendly display names for each character key. Single source (SUPREME RULE II):
// BuddyPicker imports this instead of keeping its own copy, and AliveBuddy uses it
// for the accessible label + the missing-asset fallback so neither ever shows the
// internal key (e.g. "woman" / "man" instead of "Nova" / "Leo").
const CHARACTER_LABELS = { boy: 'Boy', girl: 'Girl', dog: 'Dog', cat: 'Cat', bot: 'Bot' }

// Per-state look: the glow color, its strength, and which state-motion class to
// apply on the motion layer. One-shot motions (jump/pop/shake) carry a flag so
// we can retrigger them with a key bump when the state is (re)entered.
// ONE face rig for every character (the non-bias rule): identical eyes, brows,
// mouth, blink, talk and look system. A character only sets its LOOK - head
// shape/skin or plate color, hair, an accessory, or species features for pets.
// Expressions per state live in FACE, in one place.
const LOOK = {
  bot:  { kind: 'bot' },
  boy:  { kind: 'human', skin: '#e3b08c', hair: '#3b2a24', hairStyle: 'short' },
  girl: { kind: 'human', skin: '#d9a37a', hair: '#2b1d16', hairStyle: 'long', clip: true },
  dog:  { kind: 'pet', skin: '#c99a63', ear: 'floppy', snout: '#f3e3c9', nose: '#2a1b12' },
  cat:  { kind: 'pet', skin: '#8f8f98', ear: 'point',  snout: '#e9e6ee', nose: '#d98a9a' },
}
const FACE = {
  idle:      { mouth: 'M38 66 Q50 75 62 66', brow: 0,  eyes: 'open',  talk: false, cheeks: false },
  thinking:  { mouth: 'M45 67 Q50 71 55 67 Q50 63 45 67', brow: -4, eyes: 'up',    talk: false, cheeks: false },
  answering: { mouth: 'M37 64 Q50 82 63 64 Z', brow: 0,  eyes: 'open',  talk: true,  cheeks: false },
  newstep:   { mouth: 'M36 63 Q50 84 64 63 Z', brow: -6, eyes: 'wide',  talk: true,  cheeks: true },
  done:      { mouth: 'M34 62 Q50 86 66 62 Z', brow: -6, eyes: 'happy', talk: false, cheeks: true },
  alert:     { mouth: 'M40 71 Q50 65 60 71', brow: 10, eyes: 'open',  talk: false, cheeks: false },
}
function AvatarFace({ char, state, animate, glow }) {
  const f = FACE[state] || FACE.idle
  const look = LOOK[char] || LOOK.bot
  const eyeY = f.eyes === 'up' ? 46 : 48
  const pupilDy = f.eyes === 'up' ? -2.5 : 0
  const pupilR = f.eyes === 'wide' ? 4.6 : 4
  const isBot = look.kind === 'bot', isPet = look.kind === 'pet'
  const ink = isBot ? glow : '#1a1210'          // feature stroke: glow on the bot, warm ink on faces
  const waves = state === 'idle' || state === 'answering' || state === 'done'
  const art = ART_URL[char]
  const uid = `ab-${char}`
  return (
    <svg className={`ab-face${animate ? ' ab-anim' : ''} ab-${state}`} viewBox="0 0 100 100" width="100%" height="100%" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id={`${uid}-head`} cx="50%" cy="38%" r="70%">
          <stop offset="0" stopColor={isBot ? '#1b2434' : lighten(look.skin, 0.12)} /><stop offset="1" stopColor={isBot ? '#0a0d12' : look.skin} />
        </radialGradient>
        <linearGradient id={`${uid}-visor`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={withAlpha(glow, 0.22)} /><stop offset="1" stopColor={withAlpha(glow, 0.04)} /></linearGradient>
      </defs>
      {/* generated artwork, when provided: the face layer (rings/FX/bubble/breathing still apply) */}
      {art && <image href={art} x="2" y="2" width="96" height="96" preserveAspectRatio="xMidYMid slice" clipPath={`circle(48px at 50px 50px)`} />}
      {/* pet ears sit behind the head */}
      {!art && isPet && look.ear === 'point' && <g fill={look.skin}><path d="M18 40 L26 8 L44 30 Z" /><path d="M82 40 L74 8 L56 30 Z" /><path d="M24 36 L28 16 L40 30 Z" fill={look.snout} opacity=".7" /><path d="M76 36 L72 16 L60 30 Z" fill={look.snout} opacity=".7" /></g>}
      {!art && isPet && look.ear === 'floppy' && <g fill={darken(look.skin, 0.18)}><ellipse cx="16" cy="48" rx="11" ry="20" transform="rotate(12 16 48)" /><ellipse cx="84" cy="48" rx="11" ry="20" transform="rotate(-12 84 48)" /></g>}
      {/* long hair behind the head */}
      {!art && !isBot && !isPet && look.hairStyle === 'long' && <path d="M12 60 Q10 18 50 12 Q90 18 88 60 L88 92 Q50 100 12 92 Z" fill={look.hair} />}
      {/* head */}
      {!art && <circle cx="50" cy="52" r="46" fill={`url(#${uid}-head)`} />}
      {!art && isPet && <ellipse cx="50" cy="66" rx="18" ry="13" fill={look.snout} />}
      {/* hair in front */}
      {!art && !isBot && !isPet && look.hairStyle === 'short' && <path d="M6 48 Q10 8 50 8 Q90 8 94 48 Q86 30 50 28 Q14 30 6 48 Z" fill={look.hair} />}
      {!art && !isBot && !isPet && look.hairStyle === 'long' && <path d="M8 50 Q12 10 50 8 Q88 10 92 50 Q82 26 50 26 Q18 26 8 50 Z" fill={look.hair} />}
      {!art && look.clip && <g fill={glow}><circle cx="74" cy="30" r="3.4" /><circle cx="80" cy="36" r="2.4" /></g>}
      {/* bot plate + antenna (fallback character only) */}
      {!art && isBot && <rect x="18" y="30" width="64" height="44" rx="20" fill={`url(#${uid}-visor)`} stroke={withAlpha(glow, 0.35)} strokeWidth="1.2" />}
      {!art && isBot && <line x1="50" y1="6" x2="50" y2="14" stroke={withAlpha(glow, 0.6)} strokeWidth="2.2" strokeLinecap="round" />}
      {!art && isBot && <circle className="ab-antenna" cx="50" cy="5" r="3.2" fill={glow} />}
      {/* brows (rotate inward on alert, lift on surprise) */}
      <g className="ab-brows" style={{ transition: 'transform .35s ease' }}>
        <line x1="29" y1={38 + (f.brow > 0 ? 0 : f.brow * 0.3)} x2="44" y2={38 + (f.brow > 0 ? -3 : f.brow * 0.3)} stroke={isBot ? glow : look.hair || ink} strokeWidth="2.4" strokeLinecap="round" transform={`rotate(${f.brow} 36.5 38)`} />
        <line x1="56" y1={38 + (f.brow > 0 ? -3 : f.brow * 0.3)} x2="71" y2={38 + (f.brow > 0 ? 0 : f.brow * 0.3)} stroke={isBot ? glow : look.hair || ink} strokeWidth="2.4" strokeLinecap="round" transform={`rotate(${-f.brow} 63.5 38)`} />
      </g>
      {/* eyes */}
      {art ? null : f.eyes === 'happy' ? (
        <g stroke={isBot ? glow : ink} strokeWidth="3" strokeLinecap="round" fill="none">
          <path d="M30 50 Q38 41 46 50" /><path d="M54 50 Q62 41 70 50" />
        </g>
      ) : (
        <g className="ab-eyes">
          <g className="ab-lid">
            <ellipse cx="38" cy={eyeY} rx="8.5" ry={f.eyes === 'wide' ? 9 : 7.5} fill="#f4fbf7" />
            <ellipse cx="62" cy={eyeY} rx="8.5" ry={f.eyes === 'wide' ? 9 : 7.5} fill="#f4fbf7" />
          </g>
          <g className="ab-pupils" style={{ transform: `translate(calc(var(--lx,0) * 3.2px), calc(var(--ly,0) * 2.6px + ${pupilDy}px))`, transition: 'transform .18s ease-out' }}>
            <circle cx="38" cy={eyeY} r={pupilR} fill="#0a0d12" /><circle cx="62" cy={eyeY} r={pupilR} fill="#0a0d12" />
            <circle cx="39.6" cy={eyeY - 1.6} r="1.3" fill="#fff" /><circle cx="63.6" cy={eyeY - 1.6} r="1.3" fill="#fff" />
          </g>
        </g>
      )}
      {/* cheeks on joy; pet nose, cat whiskers, dog tongue */}
      {!art && f.cheeks && <g fill={isBot ? withAlpha(glow, 0.35) : 'rgba(230,110,120,.35)'}><circle cx="28" cy="60" r="4" /><circle cx="72" cy="60" r="4" /></g>}
      {!art && isPet && <ellipse cx="50" cy="61" rx="4.2" ry="3" fill={look.nose} />}
      {!art && char === 'cat' && <g stroke={ink} strokeWidth="1.2" opacity=".55" strokeLinecap="round"><path d="M14 60 L34 63" /><path d="M14 68 L34 66" /><path d="M86 60 L66 63" /><path d="M86 68 L66 66" /></g>}
      {!art && char === 'dog' && (state === 'idle' || state === 'done') && <path d="M46 74 Q50 84 54 74 Z" fill="#e07a86" />}
      {/* a friendly wave: every few seconds in idle, continuously while speaking and on done */}
      {!art && waves && <g className="ab-hand" style={{ transformOrigin: '86px 92px' }}><circle cx="86" cy="86" r="7" fill={isBot ? '#1b2434' : look.skin} stroke={isBot ? withAlpha(glow, 0.6) : darken(look.skin, 0.25)} strokeWidth="1.4" /><g stroke={isBot ? withAlpha(glow, 0.6) : darken(look.skin, 0.25)} strokeWidth="1.4" strokeLinecap="round"><line x1="82" y1="80" x2="81" y2="75" /><line x1="86" y1="79" x2="86" y2="73.5" /><line x1="90" y1="80" x2="91.5" y2="75" /></g></g>}
      {/* mouth: filled when open (talking), stroked when a line */}
      {!art && <g className={f.talk ? 'ab-mouth ab-talk' : 'ab-mouth'} style={{ transformOrigin: '50px 66px' }}>
        <path d={f.mouth} fill={f.mouth.endsWith('Z') ? (isBot ? '#0a0d12' : '#4a1f22') : 'none'} stroke={isBot ? glow : ink} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'd .3s ease' }} />
        {f.mouth.endsWith('Z') && <path d={f.mouth} fill={isBot ? withAlpha(glow, 0.22) : '#e07a86'} transform="translate(0 6) scale(1 .45)" style={{ transformOrigin: '50px 66px' }} />}
      </g>}
    </svg>
  )
}
// Small color helpers for the drawn faces (hex in, hex out; input returned on a miss).
function mix(hex, to, t) {
  try {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim()); if (!m) return hex
    const n = parseInt(m[1], 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
    const c = (v) => Math.round(v + (to - v) * t).toString(16).padStart(2, '0')
    return `#${c(r)}${c(g)}${c(b)}`
  } catch { return hex }
}
const lighten = (hex, t) => mix(hex, 255, t)
const darken = (hex, t) => mix(hex, 0, t)

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
  const char = CHARACTERS.includes(character) ? character : (LEGACY[character] || 'bot')
  const charName = CHARACTER_LABELS[char] || char
  const st = STATES[state] || STATES.idle

  const wrapRef = useRef(null)   // perspective + pointer surface
  const tiltRef = useRef(null)   // rAF writes transform here (tilt + bob)
  const rafRef = useRef(0)
  const targetRef = useRef({ rx: 0, ry: 0 })
  const curRef = useRef({ rx: 0, ry: 0 })
  const t0Ref = useRef(0)

  const [reduced, setReduced] = useState(prefersReducedMotion())
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
        const breathe = 1 + Math.sin(t * 1.9) * 0.012      // a visible breath, never frozen
        el.style.transform = `translateY(${bob.toFixed(2)}px) scale(${breathe.toFixed(4)}) rotateX(${cur.rx.toFixed(2)}deg) rotateY(${cur.ry.toFixed(2)}deg)`
        // Pupil look: follow the pointer (tilt target) plus a slow idle glance so
        // the eyes wander gently when nobody is pointing. Read by AvatarFace via vars.
        const w = wrapRef.current
        if (w) {
          const gx = Math.sin(t * 0.55) * 0.35, gy = Math.cos(t * 0.41) * 0.22
          w.style.setProperty('--lx', (Math.max(-1, Math.min(1, cur.ry / 15 + gx))).toFixed(3))
          w.style.setProperty('--ly', (Math.max(-1, Math.min(1, -cur.rx / 15 + gy))).toFixed(3))
        }
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
      ? [0, 1, 2, 3, 4, 5, 6, 7].map((i) => ({ a: (i / 8) * Math.PI * 2 + 0.3, d: 0.52 + (i % 3) * 0.14 }))
      : []
  ), [state, animate, shot]) // eslint-disable-line react-hooks/exhaustive-deps
  // State ring around the portrait: speaking (rotating emerald conic) while
  // answering/newstep, a slow cyan dashed ring while thinking, an amber pulse on
  // alert, and a one-shot emerald burst on done. Static shapes under reduced motion.
  const ring = state === 'answering' || state === 'newstep' ? 'talk' : state === 'thinking' ? 'think' : state === 'alert' ? 'alert' : state === 'done' ? 'done' : ''

  const px = Math.max(24, Math.round(size))
  const badgeSize = Math.max(16, Math.round(px * 0.26))

  return (
    <div
      ref={wrapRef}
      role="img"
      aria-label={title || `WorkCoPilot buddy (${charName})`}
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
      {/* state ring: the "responding" cue around the portrait. Two layers on
          purpose: the OUTER ring box never transforms (its alert pulse and done
          burst are box-shadow halos: ink overflow, which never reaches layout),
          and the INNER layer is the only thing that spins (talk / think). A
          spinning square's bounding box grows up to ~1.4x, and without a clip
          it leaked into every ancestor's scrollable overflow (a host column
          measured 40px wider than it was, enough to grow a scrollbar); the
          outer box clips it, and the square's corners are transparent anyway.
          Its own font-size makes the em halos scale with the portrait. */}
      {ring && (
        <span key={ring + shot} aria-hidden className={`ab-ring ab-ring-${ring}${animate ? ' ab-anim' : ''}`} style={{
          position: 'absolute', inset: '-7%', borderRadius: '50%', overflow: 'clip', fontSize: px, pointerEvents: 'none',
          ['--rg']: st.glow, ['--rg-soft']: withAlpha(st.glow, 0.0),
        }}>
          <span className="ab-ring-spin" />
        </span>
      )}

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
            <AvatarFace char={char} state={state} animate={animate} glow={st.glow} />
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

export { CHARACTERS, PETS, CHARACTER_LABELS }

const CHAR_KEY = 'wc.buddy.character'

// The saved buddy preference: one of the cast, or the literal 'surprise'. A
// preference from an earlier cast resolves to the nearest mascot. Defaults to
// 'dog' (a neutral default). Never throws (private mode / blocked storage).
export function readBuddyPref() {
  try {
    const v = localStorage.getItem(CHAR_KEY)
    if (v === 'surprise' || CHARACTERS.includes(v)) return v
    if (v && LEGACY[v]) return LEGACY[v]
  } catch { /* ignore */ }
  return 'dog'
}
export function writeBuddyPref(pref) {
  try { if (pref === 'surprise' || CHARACTERS.includes(pref)) localStorage.setItem(CHAR_KEY, pref) } catch { /* ignore */ }
}
// Turn a preference into the character to actually render ('surprise' -> a pet;
// an unknown key -> the nearest mascot, or the bot as the last resort).
export function resolveCharacter(pref) {
  if (pref === 'surprise') return surprisePet()
  if (CHARACTERS.includes(pref)) return pref
  return LEGACY[pref] || 'bot'
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
    // expressive face: blink, talk, antenna pulse (loops only when .ab-anim)
    '.ab-face .ab-lid{transform-origin:50px 48px}',
    '.ab-face.ab-anim .ab-lid{animation:ab-blink 4.6s ease-in-out infinite}',
    '.ab-face.ab-anim.ab-thinking .ab-lid{animation-duration:3.1s}',
    '@keyframes ab-blink{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.08)}}',
    '.ab-face.ab-anim .ab-talk{animation:ab-talk .42s ease-in-out infinite}',
    '@keyframes ab-talk{0%,100%{transform:scaleY(1)}50%{transform:scaleY(.55)}}',
    '.ab-face.ab-anim .ab-antenna{animation:ab-antenna 1.8s ease-in-out infinite}',
    '.ab-face.ab-anim.ab-alert .ab-antenna{animation-duration:.6s}',
    '@keyframes ab-antenna{0%,100%{opacity:.55}50%{opacity:1}}',
    // the wave: a short friendly wave that repeats every ~6s (continuous while speaking / on done)
    '.ab-face.ab-anim .ab-hand{animation:ab-wave 6s ease-in-out infinite}',
    '.ab-face.ab-anim.ab-answering .ab-hand,.ab-face.ab-anim.ab-done .ab-hand{animation:ab-wave-fast 1.1s ease-in-out infinite}',
    '@keyframes ab-wave{0%,70%,100%{transform:rotate(0)}76%{transform:rotate(-22deg)}82%{transform:rotate(16deg)}88%{transform:rotate(-16deg)}94%{transform:rotate(8deg)}}',
    '@keyframes ab-wave-fast{0%,100%{transform:rotate(-18deg)}50%{transform:rotate(16deg)}}',
    // state rings around the portrait (photo + bot alike). The outer .ab-ring
    // box never transforms (pulse / burst are box-shadow halos in em of the
    // portrait); only .ab-ring-spin rotates, clipped by the outer box, so the
    // spinning square never widens the layout.
    '.ab-ring-spin{position:absolute;inset:1px;border-radius:50%}',
    '.ab-ring-talk .ab-ring-spin{background:conic-gradient(from 0deg,var(--rg) 0 18%,transparent 18% 32%,var(--rg) 32% 50%,transparent 50% 64%,var(--rg) 64% 82%,transparent 82%);-webkit-mask:radial-gradient(farthest-side,transparent calc(100% - 3px),#000 calc(100% - 2.5px));mask:radial-gradient(farthest-side,transparent calc(100% - 3px),#000 calc(100% - 2.5px));opacity:.85}',
    '.ab-ring-talk.ab-anim .ab-ring-spin{animation:ab-spin 2.4s linear infinite}',
    '.ab-ring-think .ab-ring-spin{border:2px dashed var(--rg);opacity:.6}',
    '.ab-ring-think.ab-anim .ab-ring-spin{animation:ab-spin 9s linear infinite}',
    '.ab-ring-alert{border:2px solid var(--rg);opacity:.85}',
    '.ab-ring-alert.ab-anim{animation:ab-ring-pulse 1s ease-in-out infinite}',
    '.ab-ring-done{border:3px solid var(--rg);opacity:0}',
    '.ab-ring-done.ab-anim{animation:ab-burst .9s cubic-bezier(.2,.8,.2,1) 1}',
    '@keyframes ab-spin{to{transform:rotate(360deg)}}',
    '@keyframes ab-ring-pulse{0%,100%{box-shadow:0 0 0 0 var(--rg-soft);opacity:.85}50%{box-shadow:0 0 0 .05em var(--rg);opacity:.5}}',
    '@keyframes ab-burst{0%{box-shadow:0 0 0 0 var(--rg);opacity:.9}100%{box-shadow:0 0 0 .3em var(--rg);opacity:0}}',
    '@media(prefers-reduced-motion:reduce){.ab-face .ab-lid,.ab-face .ab-talk,.ab-face .ab-antenna,.ab-face .ab-hand,.ab-ring,.ab-ring-spin{animation:none!important}.ab-ring-done{opacity:.6}}',
  ].join('')
  document.head.appendChild(el)
}
