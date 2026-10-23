// WorkBuddy - the small, movable, always-on-top "buddy" overlay.
//
// It is loaded in its own frameless Electron window (workcopilot/main.js) at
// /work/buddy when the main WorkCoPilot console is minimized or hidden. The
// guidance engine runs in the MAIN console renderer and posts results to the
// server; this buddy is a thin, read-only view that polls the server and shows
// the current step, the exact next move, progress, and remaining time, with
// three controls: Open full, Hide, Pause/Resume.
//
// A friendly robot mascot reacts to state (thinking while it reads the screen,
// bright and smiling while guiding, eyes closed with a "z" when paused), so the
// buddy feels like a companion, not a status box. Open full expands back to the
// main window.
//
// Auth is cookie-session and this page is served from the same origin + the
// same Electron partition as the console, so relative /api/work/* fetches are
// already authenticated (no token handling here).
//
// The window background is transparent; the card gives itself a rounded dark
// surface so it floats. The header is a CSS drag region (-webkit-app-region) so
// the user can move the window; buttons and the mascot opt out so they stay
// clickable and never start a drag.
import React, { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react'
import { Clock, Pause, Play, X, Maximize2, Loader2, Sparkles, Type, Smile } from 'lucide-react'
import AliveBuddy, { readBuddyPref, resolveCharacter } from '../components/AliveBuddy.jsx'
import BuddyPicker from '../components/BuddyPicker.jsx'

const ACCENT = '#8cf5c4'   // emerald
const CYAN = '#39d3ff'     // cyan
const AMBER = '#f5c86b'    // paused / warn
const BG = '#0b0b0f'       // near-black
const POLL_MS = 2500       // live cadence
const POLL_PAUSED_MS = 6000 // back off when guidance is frozen

// mm:ss (or h:mm:ss past an hour). Calm "0:00" at/under zero.
function fmtTime(secs) {
  const s = Math.max(0, Math.round(Number(secs) || 0))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  return `${m}:${String(sec).padStart(2, '0')}`
}

async function getJSON(url, opts) {
  const r = await fetch(url, { credentials: 'include', headers: { Accept: 'application/json' }, ...(opts || {}) })
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return r.json()
}

export default function WorkBuddy() {
  const [session, setSession] = useState(null)   // active session or null
  const [usage, setUsage] = useState(null)        // usage snapshot or null
  const [status, setStatus] = useState('loading') // loading | ok | empty | error
  const [busy, setBusy] = useState(false)          // pause/resume in flight
  const idRef = useRef(null)                        // cached active session id
  const timerRef = useRef(null)
  const aliveRef = useRef(true)

  const paused = !!(session && session.paused)

  // --- buddy preferences (persisted, each read/write guarded) ---------------
  // character: which avatar ('bot'..'man' or 'surprise'); the preference is
  // saved, the rendered character is resolved from it (surprise -> a pet).
  // motionOff: freeze all buddy animation. textOnly: hide the avatar and show a
  // slim instruction-only card. showPicker: reveal the "change buddy" row.
  const readBool = (k) => { try { return localStorage.getItem(k) === '1' } catch { return false } }
  const writeBool = (k, v) => { try { localStorage.setItem(k, v ? '1' : '0') } catch { /* ignore */ } }
  const [charPref, setCharPref] = useState(() => readBuddyPref())
  const [motionOff, setMotionOff] = useState(() => readBool('wc.buddy.motion'))
  const [textOnly, setTextOnly] = useState(() => readBool('wc.buddy.textOnly'))
  const [showPicker, setShowPicker] = useState(false)
  // Resolve 'surprise' once per mount so the pet does not reshuffle every render.
  const character = React.useMemo(() => resolveCharacter(charPref), [charPref])

  const toggleMotion = useCallback(() => setMotionOff((v) => { const n = !v; writeBool('wc.buddy.motion', n); return n }), [])
  const toggleTextOnly = useCallback(() => setTextOnly((v) => { const n = !v; writeBool('wc.buddy.textOnly', n); return n }), [])

  // One poll cycle: discover the active session if unknown, then refresh it and
  // the usage meter. Degrades to the empty / error state without throwing.
  const tick = useCallback(async () => {
    try {
      let id = idRef.current
      if (!id) {
        const a = await getJSON('/api/work/active')
        const s = a && a.session
        if (s && s.id) { id = s.id; idRef.current = id; if (aliveRef.current) setSession(s) }
      }
      if (id) {
        let s = null
        try {
          const r = await getJSON(`/api/work/sessions/${encodeURIComponent(id)}`)
          s = r && r.session
        } catch { /* session may have been finalized/removed */ }
        // Drop a session that ended or vanished so the next tick rediscovers one.
        if (!s || s.status !== 'active') { idRef.current = null; s = null }
        if (aliveRef.current) setSession(s)
      }
      try {
        const u = await getJSON('/api/work/usage')
        if (aliveRef.current) setUsage(u)
      } catch { /* keep last usage */ }

      if (aliveRef.current) setStatus(idRef.current ? 'ok' : 'empty')
    } catch (e) {
      // 401 is "not signed in", not "server down": say so, and keep the pause
      // control out of reach until a session exists. Any other failure keeps the
      // last good view and only reports an error if nothing was ever shown.
      const signedOut = /HTTP 401/.test((e && e.message) || '')
      if (signedOut) idRef.current = null
      if (aliveRef.current) setStatus((s) => (signedOut ? 'signin' : (s === 'loading' ? 'error' : s)))
    }
  }, [])

  useEffect(() => {
    aliveRef.current = true
    let stopped = false
    const loop = async () => {
      if (stopped) return
      await tick()
      if (stopped) return
      const next = (session && session.paused) ? POLL_PAUSED_MS : POLL_MS
      timerRef.current = setTimeout(loop, next)
    }
    loop()
    return () => {
      stopped = true
      aliveRef.current = false
      if (timerRef.current) clearTimeout(timerRef.current)
    }
    // Re-arm cadence when the paused flag flips; tick itself is stable.
  }, [tick, paused])

  const togglePause = useCallback(async () => {
    const id = idRef.current
    if (!id || busy) return
    const want = !paused
    setBusy(true)
    // Optimistic reflect so the control feels instant.
    setSession((s) => (s ? { ...s, paused: want } : s))
    try {
      const r = await getJSON(`/api/work/sessions/${encodeURIComponent(id)}/pause`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ paused: want }),
      })
      if (r && r.session && aliveRef.current) setSession(r.session)
    } catch {
      // Fall back to the shell no-op path (never throws) and revert the guess.
      try { window.workDesktop?.pause?.() } catch { /* ignore */ }
      if (aliveRef.current) setSession((s) => (s ? { ...s, paused: !want } : s))
    } finally {
      if (aliveRef.current) setBusy(false)
    }
  }, [paused, busy])

  const openMain = useCallback(() => { try { window.workDesktop?.openMain?.() } catch { /* ignore */ } }, [])
  const hideBuddy = useCallback(() => { try { window.workDesktop?.hideBuddy?.() } catch { /* ignore */ } }, [])

  // --- derived display values ----------------------------------------------
  const steps = (session && Array.isArray(session.steps)) ? session.steps : []
  const total = steps.length
  const curIdx = session ? (Number.isFinite(session.currentStep) ? session.currentStep : 0) : 0
  const allDone = total > 0 && curIdx >= total
  const stepTitle = allDone
    ? 'All steps done'
    : (steps[curIdx] && (steps[curIdx].text || steps[curIdx].title)) || (session && session.goal) || 'Getting ready'
  const nextMove = allDone
    ? 'You are all set. Open the full window to finish up.'
    : (session && session.guidance) || (steps[curIdx] && (steps[curIdx].text || steps[curIdx].title)) || 'Watching your screen for the next move'
  const progressLabel = total > 0 ? (allDone ? `${total} of ${total}` : `Step ${Math.min(curIdx + 1, total)} of ${total}`) : null
  const progressPct = total > 0 ? Math.round((Math.min(curIdx, total) / total) * 100) : 0
  const remaining = usage ? usage.remainingSeconds : null
  const exhausted = !!(usage && usage.exhausted)
  const flag = (session && session.flag) || ''
  const hasGuidance = !!((session && session.guidance) || (steps[curIdx] && (steps[curIdx].text || steps[curIdx].title)))

  // A brief "new step" pop when the current step advances (not on first load).
  const [pulse, setPulse] = useState(false)
  const lastStepRef = useRef(curIdx)
  useEffect(() => {
    const prev = lastStepRef.current
    lastStepRef.current = curIdx
    if (status === 'ok' && !allDone && Number.isFinite(curIdx) && curIdx > prev) {
      setPulse(true)
      const t = setTimeout(() => { if (aliveRef.current) setPulse(false) }, 900)
      return () => clearTimeout(t)
    }
    return undefined
  }, [curIdx, status, allDone])

  // Buddy mood from the live session, in AliveBuddy's vocabulary:
  //  thinking  = ok but still reading (no guidance yet) / loading
  //  answering = ok with current guidance or a step to do
  //  done      = every step confirmed
  //  newstep   = a step just advanced (brief)
  //  alert     = something flagged, or the server is unreachable
  //  idle      = nothing active, signed out, or session paused
  const aliveState = status === 'loading' ? 'thinking'
    : status === 'error' ? 'alert'
    : (status === 'empty' || status === 'signin') ? 'idle'
    : paused ? 'idle'
    : allDone ? 'done'
    : flag ? 'alert'
    : pulse ? 'newstep'
    : hasGuidance ? 'answering'
    : 'thinking'

  // Calm one-liners for the non-active states, shown in the bubble.
  const calmMsg = status === 'loading' ? 'Waking up and connecting'
    : status === 'error' ? 'Cannot reach the server. Retrying.'
    : status === 'signin' ? 'Sign in to WorkCoPilot in the main window and your steps show up here.'
    : status === 'empty' ? 'No active task yet. Open WorkCoPilot to start one.'
    : ''

  const S = styles

  // Grow the OS window to fit the instruction so nothing is clipped. The card
  // lays out at its natural height (min 180, the compact size); we measure it and
  // ask the shell to make the window that tall (capped + anchored to the corner in
  // main.js). In the browser (no desktop bridge) this is a harmless no-op and the
  // card just sizes to the viewport. Re-report on every content change and on any
  // async reflow (font load, text wrap) via a ResizeObserver.
  const cardRef = useRef(null)
  const lastHRef = useRef(0)
  const reportHeight = useCallback(() => {
    try {
      const el = cardRef.current
      if (!el || !(window.workDesktop && window.workDesktop.setBuddyHeight)) return
      const h = Math.ceil(el.getBoundingClientRect().height)
      if (h && Math.abs(h - lastHRef.current) >= 2) { lastHRef.current = h; window.workDesktop.setBuddyHeight(h) }
    } catch { /* ignore */ }
  }, [])
  useLayoutEffect(() => { reportHeight() }, [reportHeight, status, stepTitle, nextMove, progressLabel, paused, calmMsg, allDone, textOnly, showPicker])
  useEffect(() => {
    const el = cardRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => reportHeight())
    ro.observe(el)
    return () => ro.disconnect()
  }, [reportHeight])

  return (
    <div style={S.root}>
      <div style={S.card} ref={cardRef}>
        {/* Draggable header */}
        <div style={S.header}>
          <div style={S.brand}>
            <span style={S.dot(paused ? AMBER : ACCENT)} />
            <span style={S.brandText}>WorkCoPilot</span>
            {paused && <span style={S.pausedTag}>Paused</span>}
          </div>
          <div style={S.headerBtns}>
            <button
              title={showPicker ? 'Close buddy picker' : 'Change buddy'}
              aria-label="Change buddy" aria-pressed={showPicker}
              style={{ ...S.iconBtn, ...(showPicker ? S.iconBtnOn : null) }}
              onClick={() => setShowPicker((v) => !v)}
            >
              <Smile size={14} />
            </button>
            <button
              title={textOnly ? 'Show the buddy' : 'Text only'}
              aria-label="Text only" aria-pressed={textOnly}
              style={{ ...S.iconBtn, ...(textOnly ? S.iconBtnOn : null) }}
              onClick={toggleTextOnly}
            >
              <Type size={13} />
            </button>
            <button
              title={motionOff ? 'Resume buddy motion' : 'Freeze buddy motion'}
              aria-label="Freeze buddy motion" aria-pressed={motionOff}
              style={{ ...S.iconBtn, opacity: motionOff ? 0.5 : 1 }}
              onClick={toggleMotion}
            >
              <Sparkles size={13} />
            </button>
            <span style={S.btnSep} />
            <button title="Open full window" aria-label="Open full window" style={S.iconBtn} onClick={openMain}>
              <Maximize2 size={14} />
            </button>
            <button title="Hide buddy" aria-label="Hide buddy" style={S.iconBtn} onClick={hideBuddy}>
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Change-buddy picker (revealed by the smile toggle) */}
        {showPicker && (
          <div style={S.pickerWrap}>
            <span style={S.pickerLabel}>Pick your buddy</span>
            <BuddyPicker pref={charPref} size={30} onPick={(p) => { setCharPref(p); }} />
          </div>
        )}

        {/* Body: alive buddy + speech bubble (avatar hidden in text-only mode) */}
        <div style={S.body}>
          {!textOnly && (
            <div style={{ WebkitAppRegion: 'no-drag', flex: '0 0 auto', alignSelf: 'flex-start', marginTop: 1 }}>
              <AliveBuddy character={character} state={aliveState} size={58} motion={!motionOff} interactive />
            </div>
          )}
          <div style={S.bubble}>
            {!textOnly && <span style={S.tail} />}
            {status === 'ok' && session ? (
              <>
                <div style={S.stepLabel} title={stepTitle}>
                  {status === 'ok' && !allDone && <Loader2 size={11} style={{ ...S.spin, opacity: paused ? 0.3 : 0.8, marginRight: 5 }} />}
                  {stepTitle}
                </div>
                <div style={S.moveText}>{nextMove}</div>
                <div style={S.metaRow}>
                  {progressLabel && (
                    <span style={S.progWrap}>
                      <span style={S.progTrack}><span style={{ ...S.progFill, width: `${progressPct}%` }} /></span>
                      <span style={S.progLabel}>{progressLabel}</span>
                    </span>
                  )}
                  <span style={S.metaTime}>
                    <Clock size={11} style={{ marginRight: 4, opacity: 0.8 }} />
                    {remaining == null ? '--' : (exhausted ? 'No time left' : fmtTime(remaining))}
                  </span>
                </div>
              </>
            ) : (
              <div key={calmMsg} style={S.calm}>
                {status === 'loading' && <Loader2 size={13} style={{ ...S.spin, marginRight: 6 }} />}
                <span>{calmMsg}</span>
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div style={S.controls}>
          <button style={{ ...S.ctrlBtn, ...S.ctrlPrimary }} onClick={openMain}>
            <Maximize2 size={13} /> Open full
          </button>
          <button style={S.ctrlBtn} onClick={hideBuddy}>
            <X size={13} /> Hide
          </button>
          <button
            style={{ ...S.ctrlBtn, opacity: (idRef.current && !busy) ? 1 : 0.5 }}
            onClick={togglePause}
            disabled={!idRef.current || busy}
          >
            {paused ? <Play size={13} /> : <Pause size={13} />} {paused ? 'Resume' : 'Pause'}
          </button>
        </div>
      </div>
    </div>
  )
}

const styles = {
  root: {
    width: '100%',
    minHeight: '100vh',
    margin: 0,
    background: 'transparent',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    justifyContent: 'flex-start',
    fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
    WebkitUserSelect: 'none',
    userSelect: 'none',
    overflow: 'hidden',
  },
  // The card lays out at its NATURAL height (min 180 = the compact size). The
  // window is grown to match (main.js), so a long instruction is shown in full
  // instead of being clipped. It never stretches to a stale, taller window.
  card: {
    boxSizing: 'border-box',
    width: '100%',
    minHeight: 180,
    display: 'flex',
    flexDirection: 'column',
    background: 'radial-gradient(120% 90% at 0% 0%, #121820 0%, ' + BG + ' 60%)',
    border: '1px solid rgba(140,245,196,0.2)',
    borderRadius: 16,
    boxShadow: '0 12px 34px rgba(0,0,0,0.6)',
    color: '#e9eef2',
    overflow: 'hidden',
  },
  header: {
    WebkitAppRegion: 'drag',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '7px 10px',
    cursor: 'move',
    background: 'linear-gradient(180deg, rgba(57,211,255,0.09), rgba(57,211,255,0))',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  brand: { display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 },
  dot: (c) => ({ width: 8, height: 8, borderRadius: '50%', background: c, boxShadow: `0 0 8px ${c}`, flex: '0 0 auto' }),
  brandText: { fontSize: 12, fontWeight: 600, letterSpacing: 0.2, color: '#cfe9df' },
  pausedTag: { fontSize: 10, color: AMBER, border: `1px solid rgba(245,200,107,0.4)`, borderRadius: 6, padding: '0 5px', marginLeft: 2 },
  headerBtns: { WebkitAppRegion: 'no-drag', display: 'flex', gap: 4 },
  iconBtn: {
    WebkitAppRegion: 'no-drag',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 24, height: 22, padding: 0,
    background: 'rgba(255,255,255,0.04)', color: '#aeb8bf',
    border: '1px solid rgba(255,255,255,0.06)', borderRadius: 7, cursor: 'pointer',
  },
  iconBtnOn: { color: ACCENT, background: 'rgba(140,245,196,0.14)', borderColor: 'rgba(140,245,196,0.4)' },
  btnSep: { width: 1, height: 16, background: 'rgba(255,255,255,0.1)', margin: '0 2px', flex: '0 0 auto' },
  pickerWrap: {
    WebkitAppRegion: 'no-drag',
    display: 'flex', flexDirection: 'column', gap: 7,
    padding: '9px 11px', borderBottom: '1px solid rgba(255,255,255,0.05)',
    background: 'rgba(57,211,255,0.04)',
  },
  pickerLabel: { fontSize: 10, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', color: '#9aa6ad' },
  body: { flex: 1, padding: '9px 11px 9px 9px', display: 'flex', alignItems: 'flex-start', gap: 8, minHeight: 0 },
  bubble: {
    position: 'relative', flex: 1, minWidth: 0,
    display: 'flex', flexDirection: 'column', gap: 5, justifyContent: 'flex-start',
    background: 'rgba(255,255,255,0.045)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12, padding: '9px 11px',
  },
  tail: {
    position: 'absolute', left: -5, top: 24, width: 10, height: 10,
    background: 'rgba(255,255,255,0.045)',
    borderLeft: '1px solid rgba(255,255,255,0.08)',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    transform: 'rotate(45deg)',
  },
  spin: { animation: 'wb-spin 1s linear infinite' },
  stepLabel: {
    display: 'flex', alignItems: 'flex-start',
    fontSize: 10.5, fontWeight: 700, letterSpacing: 0.3, textTransform: 'uppercase',
    color: CYAN, opacity: 0.9, lineHeight: 1.3,
  },
  // The exact next move, shown IN FULL and refreshed in place (no clamp, no
  // remount animation) so it stays in one fixed spot. Very long guidance scrolls
  // inside the bubble once the window hits its height cap.
  moveText: {
    fontSize: 13, fontWeight: 600, color: '#f1f6f3', lineHeight: 1.35,
    whiteSpace: 'normal', overflowWrap: 'anywhere',
    maxHeight: 230, overflowY: 'auto',
  },
  metaRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 1 },
  progWrap: { display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 },
  progTrack: { width: 48, height: 4, borderRadius: 3, background: 'rgba(255,255,255,0.12)', overflow: 'hidden', flex: '0 0 auto' },
  progFill: { display: 'block', height: '100%', borderRadius: 3, background: `linear-gradient(90deg, ${ACCENT}, ${CYAN})`, transition: 'width 0.4s ease' },
  progLabel: { fontSize: 10.5, fontWeight: 600, color: '#9aa6ad', whiteSpace: 'nowrap' },
  metaTime: { display: 'inline-flex', alignItems: 'center', fontSize: 11, color: '#9aa6ad', fontVariantNumeric: 'tabular-nums', flex: '0 0 auto' },
  calm: { display: 'flex', alignItems: 'center', fontSize: 12.5, color: '#aab4bb', lineHeight: 1.35, animation: 'wb-msg 0.28s ease-out' },
  controls: {
    display: 'flex', gap: 6, padding: '8px 10px',
    borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.015)',
  },
  ctrlBtn: {
    WebkitAppRegion: 'no-drag',
    flex: 1,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
    fontSize: 11.5, fontWeight: 600, color: '#d6dee3',
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 8, padding: '6px 4px', cursor: 'pointer', whiteSpace: 'nowrap',
  },
  ctrlPrimary: {
    color: BG, background: ACCENT, border: '1px solid ' + ACCENT, fontWeight: 700,
  },
}

// Keyframes (scoped, injected once).
if (typeof document !== 'undefined' && !document.getElementById('wb-kf')) {
  const el = document.createElement('style')
  el.id = 'wb-kf'
  el.textContent = [
    '@keyframes wb-spin{to{transform:rotate(360deg)}}',
    '@keyframes wb-msg{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}',
  ].join('')
  document.head.appendChild(el)
}
