// WorkBuddy - a modern, free-floating desktop MASCOT (the "latest BonziBuddy"
// feel): a living animated character floating on the desktop with NO box/panel,
// and the guidance shown in a soft CLOUD / speech bubble ON TOP of the mascot.
//
// It is loaded in its own frameless, transparent, always-on-top Electron window
// (workcopilot/main.js) at /work/buddy when the main WorkCoPilot console is
// minimized or hidden. The guidance engine runs in the MAIN console renderer and
// posts results to the server; this buddy is a thin, read-only view that polls the
// server and shows the current step, the exact next move, progress and remaining
// time inside the cloud.
//
// There is NO surrounding card: the page background is transparent, and only the
// mascot + the cloud + a controls row that fades in on hover are painted. Every
// other pixel is empty and - via per-region click-through wired in main.js /
// preload.js (work:buddy-interactive) - passes mouse events straight through to
// the app the user is working in. The window ignores the mouse by default; the
// page turns that off on mouseenter of any interactive element and back on when
// the cursor returns to the transparent area.
//
// The cloud is a CSS drag region (-webkit-app-region: drag) so the user can grab
// it to move the whole buddy; buttons, the picker and the mascot opt out so they
// stay clickable and never start a drag. The window anchors to its bottom-left and
// grows UPWARD (setBuddyHeight), so the mascot stays pinned to the bottom while the
// cloud expands up to fit a long instruction.
//
// Auth is cookie-session and this page is served from the same origin + the same
// Electron partition as the console, so relative /api/work/* fetches are already
// authenticated (no token handling here).
import React, { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react'
import { Clock, Pause, Play, X, Maximize2, Loader2, Sparkles, Type, Smile, Check, Minus, BookOpen } from 'lucide-react'
import AliveBuddy, { readBuddyPref, resolveCharacter } from '../components/AliveBuddy.jsx'
import BuddyPicker from '../components/BuddyPicker.jsx'
import RichText, { plainText } from '../components/RichText.jsx'

const ACCENT = '#1f9d6b'   // emerald ink (on white cloud)
const AMBER = '#b7791f'    // paused / warn ink (on white cloud)
const POLL_MS = 2500       // live cadence
const POLL_PAUSED_MS = 6000 // back off when guidance is frozen

const FONT_BODY = '"Figtree", "Segoe UI", system-ui, -apple-system, Roboto, Helvetica, Arial, sans-serif'
const FONT_HEAD = '"Bricolage Grotesque", "Figtree", "Segoe UI", system-ui, sans-serif'

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
  // The session this buddy was showing has ENDED (it finalized, or vanished):
  // show a calm completed cloud, then hand over to the main console. The buddy
  // is a thin read-only overlay and never turns into the dashboard.
  const [completed, setCompleted] = useState(false)
  const hadSessionRef = useRef(false)

  // --- buddy preferences (persisted, each read/write guarded) ---------------
  // character: which avatar; the preference is saved, the rendered character is
  // resolved from it (surprise -> a pet). motionOff: freeze all buddy animation.
  // textOnly: hide the mascot and show just the cloud. showPicker: reveal the
  // "change buddy" row.
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
        if (!s || s.status !== 'active') {
          idRef.current = null; s = null
          if (hadSessionRef.current && aliveRef.current) setCompleted(true)
        } else hadSessionRef.current = true
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
  // On completion: a beat to read "Session completed", then the main console
  // comes forward in plan mode (its 'show' / 'focus' hides this buddy).
  useEffect(() => {
    if (!completed) return undefined
    const t = setTimeout(() => { openMain() }, 1600)
    return () => clearTimeout(t)
  }, [completed, openMain])
  const openGuide = useCallback(() => { try { window.workDesktop?.openFullGuide?.() } catch { /* ignore */ } }, [])
  // HIDDEN = truly gone: the page renders NOTHING (zero desktop footprint). The
  // shell hides the window and pauses + saves guidance in the main window (its
  // IPC); when it shows the window again, focus/visibility restores the view.
  const [hidden, setHidden] = useState(false)
  const hideBuddy = useCallback(() => { setHidden(true); try { window.workDesktop?.hideBuddy?.() } catch { /* ignore */ } }, [])
  // KILL = fully close the buddy for the session (shell IPC `killBuddy`; reopens
  // from the console or on relaunch). Older shells without it fall back to hide.
  const killBuddy = useCallback(() => { setHidden(true); try { const d = window.workDesktop; (d?.killBuddy || d?.hideBuddy)?.() } catch { /* ignore */ } }, [])
  useEffect(() => {
    const show = () => { if (document.visibilityState === 'visible') setHidden(false) }
    window.addEventListener('focus', show); document.addEventListener('visibilitychange', show)
    try { window.workDesktop?.onBuddyShown?.(() => setHidden(false)) } catch { /* ignore */ }
    return () => { window.removeEventListener('focus', show); document.removeEventListener('visibilitychange', show) }
  }, [])

  // --- per-region click-through (desktop-pet) -------------------------------
  // The buddy window ignores the mouse by default (main.js) so the empty area
  // passes clicks to the app behind. When the cursor enters the visible content
  // (mascot + cloud + controls - all inside one wrapper), we tell the shell to
  // capture clicks; when it leaves back to the transparent area, we release it.
  // In a plain browser window.workDesktop is absent, so these are harmless no-ops.
  const [hovered, setHovered] = useState(false)
  const setInteractive = useCallback((on) => {
    try { window.workDesktop?.buddyInteractive?.(on) } catch { /* ignore */ }
  }, [])
  const onEnter = useCallback(() => { setHovered(true); setInteractive(true) }, [setInteractive])
  const onLeave = useCallback(() => { setHovered(false); setInteractive(false) }, [setInteractive])
  // Release the hold on unmount so a closing buddy never leaves the window stuck
  // capturing the mouse.
  useEffect(() => () => setInteractive(false), [setInteractive])

  // --- derived display values ----------------------------------------------
  const steps = (session && Array.isArray(session.steps)) ? session.steps : []
  const total = steps.length
  const curIdx = session ? (Number.isFinite(session.currentStep) ? session.currentStep : 0) : 0
  const allDone = total > 0 && curIdx >= total
  const stepTitle = allDone
    ? 'All steps done'
    : plainText((steps[curIdx] && (steps[curIdx].text || steps[curIdx].title)) || (session && session.goal) || 'Getting ready')
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

  // Buddy mood from the live session, in AliveBuddy's vocabulary.
  const aliveState = status === 'loading' ? 'thinking'
    : status === 'error' ? 'alert'
    : (status === 'empty' || status === 'signin') ? 'idle'
    : paused ? 'idle'
    : allDone ? 'done'
    : flag ? 'alert'
    : pulse ? 'newstep'
    : hasGuidance ? 'answering'
    : 'thinking'

  // Calm one-liners for the non-active states, shown in the cloud.
  const calmMsg = completed ? 'Session completed. Your summary is ready in the main window.'
    : status === 'loading' ? 'Waking up and connecting'
    : status === 'error' ? 'Cannot reach the server. Retrying.'
    : status === 'signin' ? 'Sign in to WorkCoPilot in the main window and your steps show up here.'
    : status === 'empty' ? 'No active task yet. Open WorkCoPilot to start one.'
    : ''

  const S = styles
  const controlsVisible = hovered || showPicker

  // Grow the OS window to fit the content so nothing is clipped. We measure the
  // visible wrapper (cloud + mascot + the control strip) and ask the shell to make
  // the window that tall; it anchors the bottom-left and grows upward (main.js) so
  // the mascot stays pinned to the bottom. In the browser (no desktop bridge) this
  // is a harmless no-op and the content just sizes to the viewport. Re-report on
  // every content change and on any async reflow (font load, text wrap).
  const wrapRef = useRef(null)
  const lastHRef = useRef(0)
  const reportHeight = useCallback(() => {
    try {
      const el = wrapRef.current
      if (!el || !(window.workDesktop && window.workDesktop.setBuddyHeight)) return
      // + a little slack for the soft cloud shadow so it is never clipped.
      const h = Math.ceil(el.getBoundingClientRect().height) + 14
      if (h && Math.abs(h - lastHRef.current) >= 2) { lastHRef.current = h; window.workDesktop.setBuddyHeight(h) }
    } catch { /* ignore */ }
  }, [])
  useLayoutEffect(() => { reportHeight() }, [reportHeight, status, stepTitle, nextMove, progressLabel, paused, calmMsg, allDone, textOnly, showPicker])
  useEffect(() => {
    const el = wrapRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => reportHeight())
    ro.observe(el)
    return () => ro.disconnect()
  }, [reportHeight])

  // Hidden: render nothing at all - no mascot, no cloud, no footprint.
  if (hidden) return null

  const iconBtn = (extra) => ({ ...S.iconBtn, ...(extra || null) })

  return (
    <div style={S.root}>
      {/* The ONLY painted thing: the mascot + cloud + hover controls. Entering it
          captures the mouse (click-through off); leaving it releases to the app. */}
      <div style={S.wrap} ref={wrapRef} onMouseEnter={onEnter} onMouseLeave={onLeave}>

        {/* Hover control strip (always in layout so it never clips; fades on hover).
            Icon-only, light, nowrap + flex-shrink:0 so it never wraps. */}
        <div style={{ ...S.controls, opacity: controlsVisible ? 1 : 0, transform: controlsVisible ? 'translateY(0)' : 'translateY(4px)', pointerEvents: controlsVisible ? 'auto' : 'none' }}>
          {showPicker && (
            <div style={S.pickerPanel}>
              <span style={S.pickerLabel}>Pick your buddy</span>
              <BuddyPicker pref={charPref} size={30} onPick={(p) => { setCharPref(p) }} />
            </div>
          )}
          <div style={S.controlsRow}>
            <button title={showPicker ? 'Close buddy picker' : 'Change buddy'} aria-label="Change buddy" aria-pressed={showPicker} style={iconBtn(showPicker ? S.iconBtnOn : null)} onClick={() => setShowPicker((v) => !v)}><Smile size={14} /></button>
            <button title={textOnly ? 'Show the buddy' : 'Text only'} aria-label="Text only" aria-pressed={textOnly} style={iconBtn(textOnly ? S.iconBtnOn : null)} onClick={toggleTextOnly}><Type size={13} /></button>
            <button title={motionOff ? 'Resume buddy motion' : 'Freeze buddy motion'} aria-label="Freeze buddy motion" aria-pressed={motionOff} style={iconBtn(motionOff ? null : S.iconBtnOn)} onClick={toggleMotion}><Sparkles size={13} /></button>
            <span style={S.sep} />
            <button title={paused ? 'Resume guidance' : 'Pause guidance'} aria-label={paused ? 'Resume guidance' : 'Pause guidance'} style={{ ...iconBtn(paused ? S.iconBtnOn : null), opacity: (idRef.current && !busy) ? 1 : 0.45 }} onClick={togglePause} disabled={!idRef.current || busy}>{paused ? <Play size={13} /> : <Pause size={13} />}</button>
            <button title="Open full guide" aria-label="Open full guide" style={iconBtn()} onClick={openGuide}><BookOpen size={13} /></button>
            <button title="Open full window" aria-label="Open full window" style={iconBtn()} onClick={openMain}><Maximize2 size={13} /></button>
            <button title="Hide buddy (pauses and saves your progress)" aria-label="Hide buddy" style={iconBtn()} onClick={hideBuddy}><Minus size={14} /></button>
            <button title="Close buddy" aria-label="Close buddy" style={iconBtn(S.iconBtnKill)} onClick={killBuddy}><X size={14} /></button>
          </div>
        </div>

        {/* The CLOUD: a soft white, rounded, lobed speech bubble with a gentle
            shadow and a tail pointing DOWN to the mascot. It is the drag handle. */}
        <div style={S.cloudWrap}>
          {/* lobes: white puffs peeking over the top + sides form the cloud silhouette */}
          <span aria-hidden style={{ ...S.lobe, width: 52, height: 52, top: -16, left: '14%' }} />
          <span aria-hidden style={{ ...S.lobe, width: 72, height: 72, top: -30, left: '38%' }} />
          <span aria-hidden style={{ ...S.lobe, width: 48, height: 48, top: -14, right: '16%' }} />
          <span aria-hidden style={{ ...S.lobe, width: 30, height: 30, top: 18, left: -12 }} />
          <span aria-hidden style={{ ...S.lobe, width: 30, height: 30, top: 18, right: -12 }} />

          <div style={S.cloudBody}>
            {status === 'ok' && session && !completed ? (
              <>
                <div style={S.stepLabel} title={stepTitle}>
                  {!allDone && <Loader2 size={11} style={{ ...S.spin, opacity: paused ? 0.3 : 0.8, marginRight: 5, flex: '0 0 auto' }} />}
                  <span style={S.stepLabelText}>{stepTitle}</span>
                </div>
                {/* The next move is THE thing to read: it flashes emerald for a beat
                    when a step advances, and a confirm check pops beside the label. */}
                <div style={S.moveText} className={pulse ? 'wb-flash' : undefined}><RichText text={nextMove} accent={ACCENT} /></div>
                {pulse && <span className="wb-confirm" role="status"><Check size={11} strokeWidth={3} /> Step confirmed</span>}
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
                {completed
                  ? <Check size={14} style={{ color: ACCENT, marginRight: 6, flex: '0 0 auto' }} />
                  : status === 'loading' && <Loader2 size={13} style={{ ...S.spin, marginRight: 6, flex: '0 0 auto' }} />}
                <span>{calmMsg}</span>
                {completed && <button type="button" onClick={openMain} style={{ ...S.iconBtn, width: 'auto', padding: '0 9px', marginLeft: 8, color: ACCENT, background: 'rgba(31,157,107,0.12)', fontSize: 11.5, fontWeight: 700, whiteSpace: 'nowrap' }}>Open WorkCoPilot</button>}
              </div>
            )}
          </div>

          {/* a soft cloud tail: two shrinking white puffs descending toward the mascot */}
          {!textOnly && (
            <div style={S.tailWrap} aria-hidden>
              <span style={{ ...S.tailPuff, width: 16, height: 16 }} />
              <span style={{ ...S.tailPuff, width: 9, height: 9, marginTop: 2 }} />
            </div>
          )}
        </div>

        {/* The MASCOT: floating free at the bottom, no plate behind it. */}
        {!textOnly && (
          <div style={S.mascot}>
            <AliveBuddy character={character} state={aliveState} size={104} motion={!motionOff} interactive />
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  // Full transparent canvas. Content is pinned to the BOTTOM and centered so the
  // mascot sits at the bottom of the window and the cloud grows upward above it.
  root: {
    width: '100%',
    minHeight: '100vh',
    margin: 0,
    background: 'transparent',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-end',
    fontFamily: FONT_BODY,
    WebkitUserSelect: 'none',
    userSelect: 'none',
    overflow: 'hidden',
  },
  // The visible content column. No background, no border, no card. This single
  // wrapper is the click-through hot-zone (mouseenter/leave toggles capture).
  wrap: {
    position: 'relative',
    width: '100%',
    boxSizing: 'border-box',
    padding: '8px 14px 2px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
  },
  // Hover controls: a subtle floating row above the cloud. Fades in; never wraps.
  controls: {
    WebkitAppRegion: 'no-drag',
    position: 'relative',
    zIndex: 5,                 // sit above the cloud's top lobes so nothing clips it
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,          // clear the cloud's tallest top lobe
    transition: 'opacity .18s ease, transform .18s ease',
  },
  controlsRow: {
    display: 'flex',
    flexWrap: 'nowrap',
    alignItems: 'center',
    gap: 4,
    padding: '4px 6px',
    borderRadius: 999,
    background: 'rgba(255,255,255,0.92)',
    boxShadow: '0 6px 18px -8px rgba(20,28,45,0.45), 0 0 0 1px rgba(20,28,45,0.06)',
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
    maxWidth: '100%',
  },
  iconBtn: {
    WebkitAppRegion: 'no-drag',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 26, height: 24, padding: 0, flex: '0 0 auto',
    background: 'transparent', color: '#4a5568',
    border: '1px solid transparent', borderRadius: 8, cursor: 'pointer',
    transition: 'background .12s, color .12s, border-color .12s',
  },
  iconBtnOn: { color: ACCENT, background: 'rgba(31,157,107,0.12)', borderColor: 'rgba(31,157,107,0.3)' },
  iconBtnKill: { color: '#e05a52' },
  sep: { width: 1, height: 15, background: 'rgba(20,28,45,0.12)', margin: '0 2px', flex: '0 0 auto' },
  pickerPanel: {
    WebkitAppRegion: 'no-drag',
    display: 'flex', flexDirection: 'column', gap: 7, alignItems: 'center',
    padding: '9px 12px', borderRadius: 14,
    background: 'rgba(255,255,255,0.95)',
    boxShadow: '0 10px 26px -12px rgba(20,28,45,0.5), 0 0 0 1px rgba(20,28,45,0.06)',
  },
  pickerLabel: { fontSize: 10, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', color: '#6b7280' },

  // The cloud: all-white silhouette (body + lobe puffs + tail) under ONE soft
  // drop-shadow so it reads as a single fluffy cloud. It is the drag handle.
  cloudWrap: {
    WebkitAppRegion: 'drag',
    position: 'relative',
    width: '100%',
    maxWidth: 420,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    filter: 'drop-shadow(0 10px 20px rgba(20,28,45,0.18)) drop-shadow(0 2px 5px rgba(20,28,45,0.12))',
  },
  lobe: {
    position: 'absolute',
    borderRadius: '50%',
    background: '#ffffff',
    zIndex: 0,
  },
  cloudBody: {
    position: 'relative',
    zIndex: 1,
    width: '100%',
    boxSizing: 'border-box',
    background: '#ffffff',
    color: '#161a2b',
    borderRadius: 22,
    padding: '13px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
  },
  tailWrap: {
    position: 'relative', zIndex: 1,
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    marginTop: -2,
  },
  tailPuff: { borderRadius: '50%', background: '#ffffff', display: 'block' },

  spin: { animation: 'wb-spin 1s linear infinite' },
  stepLabel: {
    display: 'flex', alignItems: 'center',
    fontFamily: FONT_HEAD,
    fontSize: 10.5, fontWeight: 700, letterSpacing: 0.3, textTransform: 'uppercase',
    color: '#0a84c2', lineHeight: 1.3, minWidth: 0,
  },
  stepLabelText: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 },
  // The exact next move, shown IN FULL and refreshed in place. Long guidance
  // scrolls inside the cloud once the window hits its height cap.
  moveText: {
    fontSize: 14.5, fontWeight: 600, color: '#161a2b', lineHeight: 1.4,
    whiteSpace: 'normal', overflowWrap: 'anywhere',
    maxHeight: 340, overflowY: 'auto',
  },
  metaRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 1 },
  progWrap: { display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 },
  progTrack: { width: 48, height: 4, borderRadius: 3, background: 'rgba(20,30,70,0.12)', overflow: 'hidden', flex: '0 0 auto' },
  progFill: { display: 'block', height: '100%', borderRadius: 3, background: 'linear-gradient(90deg, #0e9f6e, #0a84c2)', transition: 'width 0.4s ease' },
  progLabel: { fontSize: 10.5, fontWeight: 600, color: '#5c6484', whiteSpace: 'nowrap' },
  metaTime: { display: 'inline-flex', alignItems: 'center', fontSize: 11, color: '#5c6484', fontVariantNumeric: 'tabular-nums', flex: '0 0 auto' },
  calm: { display: 'flex', alignItems: 'center', fontSize: 12.5, color: '#2b3250', lineHeight: 1.38, animation: 'wb-msg 0.28s ease-out' },

  // The mascot floats free - no plate, no ring box. Slight negative margin tucks
  // it just under the cloud tail.
  mascot: { WebkitAppRegion: 'no-drag', flex: '0 0 auto', marginTop: 2, display: 'grid', placeItems: 'center' },
}

// Keyframes (scoped, injected once).
if (typeof document !== 'undefined' && !document.getElementById('wb-kf')) {
  const el = document.createElement('style')
  el.id = 'wb-kf'
  el.textContent = [
    '@keyframes wb-spin{to{transform:rotate(360deg)}}',
    '@keyframes wb-msg{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}',
    // the magic: a brief emerald flash on the new move + a confirm check that pops
    '.wb-flash{animation:wb-flash .9s ease-out both;border-radius:8px}',
    '@keyframes wb-flash{0%{background:rgba(31,157,107,.22);box-shadow:0 0 0 6px rgba(31,157,107,.18)}100%{background:transparent;box-shadow:0 0 0 0 rgba(31,157,107,0)}}',
    '.wb-confirm{display:inline-flex;align-items:center;gap:5px;height:20px;padding:0 8px;border-radius:999px;font-size:9.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#1f9d6b;background:rgba(31,157,107,.12);box-shadow:0 0 0 1px rgba(31,157,107,.35) inset;animation:wb-pop .5s cubic-bezier(.3,1.4,.5,1) both}',
    '@keyframes wb-pop{0%{opacity:0;transform:scale(.6)}60%{opacity:1;transform:scale(1.08)}100%{transform:scale(1)}}',
    '@media(prefers-reduced-motion:reduce){.wb-flash{animation:none;box-shadow:0 0 0 2px rgba(31,157,107,.35)}.wb-confirm{animation:none}}',
  ].join('')
  document.head.appendChild(el)
}
