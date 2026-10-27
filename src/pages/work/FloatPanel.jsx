// FloatPanel: the floating overlay shown in the Document Picture-in-Picture
// window (or the pop-out). It mirrors the console's live state (steps, the
// current step, what the watcher sees, the focused answer) and lets the user
// ask and tick steps off without leaving the app they are working in. Styles
// are inline or come from the shared GUIDE_CSS the console injects into the
// PiP document, because that document carries none of the app's CSS. Moved
// out of Guiding.jsx as its own module (small files, one job each).
import { useEffect, useRef, useState, useMemo } from 'react'
import { Loader2, Check, X, Plus, Eye, Square, Play, AlertTriangle, Menu as MenuIcon, Sun, Moon, ScanLine, Zap, Globe, ChevronRight, ChevronLeft, ArrowRight, Paperclip } from 'lucide-react'
import RichText from '../../components/RichText.jsx'
import GuideFontControl from '../../components/GuideFontScale.jsx'
import GuideLevelControl from '../../components/GuideLevel.jsx'
import { stepWindow, progressText } from '../../shared/step_window.js'
import { usageTimeLeft } from './usageCopy.js'
import { makeConfetti, confettiNodes } from './confetti.jsx'
import { gvVars } from './guideView.css.js'
import FadeSwap from './FadeSwap.jsx'
import ReadingStrip, { readingIsProminent } from './ReadingStrip.jsx'
import StepCard from './StepCard.jsx'
import AskFocus from './AskFocus.jsx'
import GoalLine from './GoalLine.jsx'
import { askFocused } from './askFlow.js'

export default // The floating overlay shown in the Document Picture-in-Picture window. It
// mirrors the console's live state (steps, the current step, what the watcher
// sees, flags, the latest answer) and lets the user ask and tick steps off
// without leaving the app they are working in. Styles are inline because the
// PiP window is a separate document with none of the app's CSS.
function FloatPanel({ steps, watching, observation, guidance, flags, ask, onContinue, onDismissOffer, level, onLevel, busy, analyzing, err, done, ended = false, celebrate = false, floatQ, setFloatQ, goal, title, fontScale, theme = 'dark', onToggleTheme, usage, paused, onPause, onDeep, onResearch, onAsk, onAnalyze, onAddContext, onStep, onNav, onWatch, onEnd, onClose, onStartAnother }) {
  const floatFileRef = useRef(null)   // hidden file input for mid-task attachments in the float
  const current = steps.find((s) => s.status === 'current')
  // Completed = every step done, or the session was ended. Drives the floater's
  // task-complete celebration + "Start another task" (mirrors the in-software
  // done view). An ended session never shows the live "now" card.
  const complete = done || ended
  // Dim the panel to cut glare over your work. The browser will not let a web
  // Picture-in-Picture window be see-through to the app behind it, so this
  // fades the panel itself; for true see-through + click-behind use the app.
  const DIM_LEVELS = [1, 0.85, 0.65, 0.45]
  const [dim, setDim] = useState(1)
  const cycleDim = () => setDim((d) => DIM_LEVELS[(DIM_LEVELS.indexOf(d) + 1) % DIM_LEVELS.length] || 1)
  // The full roadmap is tucked away by default so the current step and the
  // latest answer own the panel. A compact chip expands it on demand.
  const [stepsOpen, setStepsOpen] = useState(false)

  const light = theme === 'light'
  // Color-coded by meaning (one source of truth with the console + full guide):
  //   accent (EMERALD) = the current step / the one live action - the brightest
  //   thing on the panel and the primary button; cyan = calm context the watcher
  //   can see (observation); warn (AMBER) = a warning that must interrupt; good =
  //   the done check. Brand emerald #8cf5c4 / cyan #39d3ff / amber #f5c86b for
  //   dark; darkened equivalents for contrast on the white light panel.
  //   Everything here is inline because the PiP document carries none of the
  //   app's CSS.
  const c = light
    ? { canvas: '#f3f5f9', panel: '#ffffff', panel2: '#f5f7fb', border: '#e2e6ed', borderStrong: '#c6cdd8', text: '#171a21', muted: '#58606e', faint: '#8b93a1',
        accent: '#0e9f6e', accentHi: '#12b47e', onAccent: '#ffffff', accentSoft: 'rgba(14,159,110,.10)', accentRing: 'rgba(14,159,110,.30)', accentGlow: 'rgba(14,159,110,.20)',
        cyan: '#0a84c2', cyanSoft: 'rgba(10,132,194,.10)', cyanRing: 'rgba(10,132,194,.28)',
        good: '#107c41', goodSoft: 'rgba(16,124,65,.12)', warn: '#b86e00', warnSoft: 'rgba(245,200,107,.16)', warnRing: 'rgba(184,110,0,.30)', danger: '#c42b1c',
        link: '#0067c0',
        inputBg: '#ffffff', track: '#e6eaf0', shadow: '0 1px 2px rgba(16,24,40,.05), 0 8px 24px -14px rgba(16,24,40,.25)', heroShadow: '0 2px 4px rgba(14,159,110,.06), 0 14px 32px -16px rgba(14,159,110,.32)' }
    : { canvas: '#0a0d12', panel: '#141a24', panel2: '#1b2130', border: '#28303f', borderStrong: '#3b4455', text: '#eef3f6', muted: '#9aa6ad', faint: '#6c7780',
        accent: '#8cf5c4', accentHi: '#8cf5c4', onAccent: '#052a1d', accentSoft: 'rgba(140,245,196,.14)', accentRing: 'rgba(140,245,196,.34)', accentGlow: 'rgba(140,245,196,.22)',
        cyan: '#39d3ff', cyanSoft: 'rgba(57,211,255,.13)', cyanRing: 'rgba(57,211,255,.32)',
        good: '#54b97b', goodSoft: 'rgba(84,185,123,.16)', warn: '#f5c86b', warnSoft: 'rgba(245,200,107,.14)', warnRing: 'rgba(245,200,107,.34)', danger: '#ff7a6b',
        link: '#6cb6ff',
        inputBg: '#0a0d12', track: '#28303f', shadow: '0 1px 2px rgba(0,0,0,.3), 0 10px 28px -14px rgba(0,0,0,.7)', heroShadow: '0 2px 4px rgba(0,0,0,.3), 0 16px 36px -16px rgba(140,245,196,.3)' }

  // Confetti for the completed-state flourish. Concrete hex (the PiP document
  // has no app CSS vars); on-brand greens with two soft accents. Computed once.
  const floatConfetti = useMemo(() => makeConfetti(12, [c.good, c.accent, '#f5b64b', '#5aa9ff']), [light])   // eslint-disable-line

  // Figtree for body (loaded into the PiP document head when the float opens),
  // Bricolage Grotesque for display headings - the same pairing as the app.
  // Both degrade to a clean system stack if the webfont is blocked.
  const FONT = '"Figtree",-apple-system,BlinkMacSystemFont,"Segoe UI Variable Text","Segoe UI","Inter",system-ui,sans-serif'
  const DISPLAY = '"Bricolage Grotesque",' + FONT
  // Microsoft-Learn / Docs reading scale. fs(px) multiplies a GUIDANCE text size
  // by --fp-fs (the reader's A- / A / A+ choice, shared with the console + full
  // guide through the one wc-guide-fontscale key). Chrome (header, buttons,
  // eyebrows, badges) stays a stable size so the panel never blows up. The vars
  // are set here inline AND on the PiP document root by the console, so the
  // body default and every sized element agree.
  const fsScale = (fontScale && Number.isFinite(fontScale.scale)) ? fontScale.scale : 1
  const fs = (px) => `calc(${px}px * var(--fp-fs, 1))`
  // FIXED header + footer: the panel is a full-height flex column that does not
  // itself scroll (overflow hidden); the header and the Ask footer are pinned
  // (flexShrink 0) and only the middle region scrolls.
  const wrap = { '--fp-fs': fsScale, '--wc-fs': fsScale, padding: '10px 12px 12px', display: 'flex', flexDirection: 'column', gap: 9, height: '100vh', overflow: 'hidden', opacity: dim, color: c.text, background: c.canvas, fontFamily: FONT, fontSize: fs(13.5), lineHeight: 1.5, fontFeatureSettings: '"tnum" 1, "cv11" 1', WebkitFontSmoothing: 'antialiased' }
  const card = { background: c.panel, border: `1px solid ${c.border}`, borderRadius: 12, padding: 12, boxShadow: c.shadow }
  // Blue inline hyperlink for "Open <host>" (MS-docs style), NOT a button.
  const link = { display: 'inline-flex', alignItems: 'center', gap: 5, color: c.link, fontSize: fs(13), fontWeight: 600, textDecoration: 'none', overflowWrap: 'anywhere' }
  // One small-button family: icon (header), ghost (secondary), primary (the one action).
  const iconBtn = { background: 'transparent', color: c.muted, border: '1px solid transparent', borderRadius: 8, width: 28, height: 28, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background .15s, color .15s' }
  const ghost = { background: c.panel2, color: c.text, border: `1px solid ${c.border}`, borderRadius: 9, height: 32, padding: '0 11px', fontSize: 12.5, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', transition: 'background .15s, border-color .15s, color .15s' }
  const primary = { background: `linear-gradient(135deg, ${c.accentHi}, ${c.accent})`, color: c.onAccent, border: '1px solid transparent', borderRadius: 9, height: 32, padding: '0 13px', fontSize: 12.5, fontWeight: 650, display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', boxShadow: `0 1px 2px rgba(0,0,0,.12), 0 0 0 1px ${c.accentRing} inset` }
  const navBtn = { background: 'transparent', color: c.muted, border: '1px solid transparent', borderRadius: 8, height: 28, padding: '0 8px', fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3, whiteSpace: 'nowrap' }
  const eyebrow = { fontSize: 10, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase' }
  // The current-step / answer left bar reads emerald -> cyan (the color-coded
  // "now" accent). Flags override this to amber below.
  const accentBar = { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: `linear-gradient(180deg, ${c.accent}, ${c.cyan})` }

  const timeLeft = usage ? usageTimeLeft(usage) : ''
  // #1 ONE calm status chip: Guiding when live, Paused otherwise. The watching
  // state is implied by this chip, not by a separate "Live / Not watching" label.
  const liveFP = watching && !paused
  const status = liveFP
    ? { label: 'Guiding', color: c.accent, soft: c.accentSoft }
    : { label: 'Paused', color: c.warn, soft: c.warnSoft }
  const doneN = steps.filter((s) => s.status === 'done').length
  // MAXIMIZED float: when the PiP / pop-out window is wide, use the space - a
  // left plan mini-map rail beside a centered reading column instead of one
  // stretched strip. Measured on the panel root (its own window), so it works
  // in the separate PiP document. Narrow = the single column as before.
  const rootRef = useRef(null)
  const [wide, setWide] = useState(false)
  useEffect(() => {
    const el = rootRef.current
    if (!el || typeof ResizeObserver === 'undefined') return undefined
    const ro = new ResizeObserver((es) => { const w = es[0] && es[0].contentRect ? es[0].contentRect.width : 0; setWide(w >= 900) })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  // "Step confirmed" pop on the now-card when the done count rises (presentational).
  const [fpConfirm, setFpConfirm] = useState(0)
  const prevDoneN = useRef(doneN)
  useEffect(() => {
    if (doneN > prevDoneN.current) { setFpConfirm(doneN); const t = setTimeout(() => setFpConfirm(0), 1800); prevDoneN.current = doneN; return () => clearTimeout(t) }
    prevDoneN.current = doneN
    return undefined
  }, [doneN])

  return (
    <div style={wrap} ref={rootRef}>
      {/* FIXED HEADER: brand, ONE status chip, minutes, icon controls, under a hairline */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 3, minWidth: 0, paddingBottom: 10, borderBottom: `1px solid ${c.border}` }}>
        <span style={{ width: 25, height: 25, borderRadius: 9, flexShrink: 0, display: 'grid', placeItems: 'center', background: `linear-gradient(135deg, ${c.accentHi}, ${c.accent})`, boxShadow: `0 0 0 1px ${c.accentRing} inset, 0 2px 6px -2px ${c.accentRing}` }}>
          <Eye size={13} color="#fff" strokeWidth={2.4} />
        </span>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 7, paddingLeft: 6 }}>
          <strong style={{ fontFamily: DISPLAY, fontSize: 14.5, fontWeight: 700, letterSpacing: '-.015em', whiteSpace: 'nowrap' }}>WorkCoPilot</strong>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 20, fontSize: 10, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: status.color, background: status.soft, borderRadius: 999, padding: '0 8px', whiteSpace: 'nowrap' }}>
            <span className={watching && !paused ? 'fp-pulse' : undefined} style={{ width: 6, height: 6, borderRadius: '50%', background: status.color }} />
            {status.label}
          </span>
          {usage && <span style={{ fontSize: 11, fontWeight: 600, color: usage.exhausted ? c.danger : c.faint, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontVariantNumeric: 'tabular-nums' }}>{timeLeft}</span>}
        </div>
        {/* Pause/Resume now lives in the prominent control below (#2); the header
            stays a clean row of secondary icons so the status cluster is calm. */}
        <button className="fp-btn" style={iconBtn} onClick={onDeep} disabled={busy} title="Deep pass: take a closer look at this one frame and weave it back into the steps, then carry on at normal speed."><Zap size={15} /></button>
        <button className="fp-btn" style={iconBtn} onClick={onToggleTheme} title={light ? 'Switch to dark' : 'Switch to light'}>{light ? <Moon size={15} /> : <Sun size={15} />}</button>
        <button className="fp-btn" style={{ ...iconBtn, width: 'auto', padding: '0 7px', gap: 4, fontSize: 11, fontWeight: 700, letterSpacing: '.02em', fontVariantNumeric: 'tabular-nums', color: dim < 1 ? c.accent : c.muted, background: dim < 1 ? c.accentSoft : 'transparent' }} onClick={cycleDim} title="Dim the panel to cut glare (for true see-through, use the desktop app)">{Math.round(dim * 100)}%</button>
        <button className="fp-btn" style={iconBtn} onClick={onClose} title="Close the floating window"><X size={16} /></button>
      </div>

      {/* PINNED: Pause/Resume + the live reading/analyzing line stay above the
          scroll so the control and "what the screen is reading" are always in
          view (owner request; matched to the console). */}
      <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 7, padding: '2px 0 0' }}>
        <div style={{ display: 'flex', gap: 7 }}>
          {paused
            ? <button className="fp-btn fp-pulse" style={{ ...primary, flex: 1, justifyContent: 'center', height: 40, fontSize: 13.5 }} onClick={onPause}><Play size={15} /> Resume</button>
            : watching
              ? <button className="fp-btn" style={{ ...ghost, flex: 1, justifyContent: 'center', height: 40, fontSize: 13, color: c.warn, borderColor: c.warnRing, background: c.warnSoft }} onClick={onPause}><Square size={13} /> Pause</button>
              : <button className="fp-btn" style={{ ...primary, flex: 1, justifyContent: 'center', height: 40, fontSize: 13.5 }} onClick={onWatch}><Eye size={15} /> Watch my screen</button>}
          {/* End is now always visible in the floater (owner: End button was not
              reachable here) - ends the task and builds the summary, same as the
              console's End. Close (X, top-right) only pops the steps back. */}
          <button className="fp-btn" style={{ ...ghost, flexShrink: 0, justifyContent: 'center', height: 40, padding: '0 15px', fontSize: 13, fontWeight: 650, color: c.danger, borderColor: c.border }} onClick={onEnd} title="End this task and build a summary">End</button>
        </div>
        {!watching && !paused && <div style={{ fontSize: fs(12), color: c.faint, textAlign: 'center', lineHeight: 1.45, padding: '0 6px' }}>Share your whole screen so the steps update as you work.</div>}
      </div>

      {/* SCROLL REGION: everything between the fixed header and the fixed Ask
          footer scrolls here; the header and footer stay pinned. When WIDE, a
          plan mini-map rail sits on the left and the column is centered/boxed. */}
      <div style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', overflowX: 'hidden', display: wide ? 'grid' : 'flex', gridTemplateColumns: wide ? '220px minmax(0,1fr)' : undefined, flexDirection: 'column', gap: wide ? 16 : 9, alignItems: wide ? 'start' : undefined }}>
      {wide && steps.length > 0 && (
        <aside style={{ position: 'sticky', top: 0, display: 'flex', flexDirection: 'column', gap: 8, ...card, padding: 10 }} aria-label="Plan">
          <span style={{ ...eyebrow, fontSize: 9.5, letterSpacing: '.1em', color: c.faint, display: 'flex', alignItems: 'center', gap: 6, padding: '2px 2px 4px' }}>Plan <span style={{ marginLeft: 'auto', letterSpacing: 0, textTransform: 'none', fontWeight: 600, color: c.muted }}>{progressText(steps)}</span></span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: '48vh', overflowY: 'auto' }}>
            {steps.map((s, i) => { const isDone = s.status === 'done', isNow = s.status === 'current'; return (
              <button key={i} className="fp-btn" onClick={() => onStep(i, 'current')} title={String(s.text || '')} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', width: '100%', textAlign: 'left', padding: '6px 7px', borderRadius: 8, border: `1px solid ${isNow ? c.accentRing : 'transparent'}`, background: isNow ? c.accentSoft : 'transparent', color: isNow ? c.text : isDone ? c.faint : c.muted, fontFamily: FONT, fontSize: fs(12), lineHeight: 1.4, fontWeight: isNow ? 650 : 500 }}>
                <span style={{ flexShrink: 0, width: 18, height: 18, borderRadius: 6, display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: isDone ? c.good : isNow ? c.onAccent : c.faint, background: isNow ? c.accent : isDone ? c.goodSoft : 'transparent', border: `1.5px solid ${isNow ? c.accent : isDone ? 'transparent' : c.border}` }}>{isDone ? <Check size={11} strokeWidth={2.5} /> : i + 1}</span>
                <span className="fp-clamp" style={{ flex: 1, minWidth: 0, textDecoration: isDone ? 'line-through' : 'none', overflowWrap: 'anywhere' }}>{s.text}</span>
              </button>
            ) })}
          </div>
          <button className="fp-btn" style={{ ...ghost, justifyContent: 'center', height: 32 }} onClick={() => setStepsOpen(true)} title="View the full plan"><MenuIcon size={14} /> Full plan</button>
        </aside>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9, width: '100%', maxWidth: wide ? 680 : undefined, margin: wide ? '0 auto' : undefined, ...(wide ? { background: c.panel, border: `1px solid ${c.border}`, borderRadius: 16, padding: 14, boxShadow: c.shadow } : {}) }}>
      {/* Pause/Resume and the live reading/analyzing line are now PINNED above the
          scroll (see the block after the header), so they never scroll away. */}

      {/* Read bar: the shared A- / A / A+ text-size control and the guidance
          strength (Easy / Medium / Technical / Executive), quiet, in one row.
          Both write the shared keys, so the console and full guide follow. */}
      {steps.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 8, padding: '0 2px' }}>
          {onLevel && <GuideLevelControl level={level} onChange={onLevel} compact theme={{ border: c.border, muted: c.muted, panel: c.panel, accent: c.accent, accentSoft: c.accentSoft }} />}
          {fontScale && (
            <GuideFontControl scale={fontScale.scale} dec={fontScale.dec} inc={fontScale.inc} reset={fontScale.reset} atMin={fontScale.atMin} atMax={fontScale.atMax}
              theme={{ border: c.border, text: c.text, muted: c.muted, panel: c.panel, accent: c.accent }} />
          )}
        </div>
      )}

      {/* ONE SCREEN AT A TIME, the same guide view as the console (shared
          modules + GUIDE_CSS injected into this document; the palette rides in
          as --gv-* vars): the goal as one quiet line, then the step card, or
          the stuck check-in, or the focused answer, with a fade between. */}
      <div className="gv" style={gvVars(c)}>
        {steps.length > 0 && <GoalLine title={title} goal={goal} />}
        {(() => {
          const focused = askFocused(ask)
          const idx = current ? steps.indexOf(current) : -1
          const flagText = flags.length ? String(flags[0].text || '') : ''
          const prominent = readingIsProminent({ offTrack: false, flag: flagText, observation })
          const reading = <ReadingStrip watching={watching} analyzing={analyzing} offTrack={false} observation={observation} flag={flagText} />
          const next = stepWindow(steps).slice(1, 2)
          const view = focused && !complete ? 'ask:' + ask.phase : complete ? 'complete' : current ? 'step:' + idx : 'empty'
          return (
            <FadeSwap k={view}>
              {focused && !complete ? (
                <AskFocus ask={ask} steps={steps} stepText={current ? current.text : ''} busy={busy} onAsk={(q) => onAsk(q, 'stuck')} onDismiss={onDismissOffer} onContinue={onContinue} />
              ) : complete ? (
          /* TASK COMPLETE: the floater's celebration + "Start another task". A
             one-shot confetti flourish (clipped to this card, honours reduced
             motion), a success burst, and a button that drops back into the
             new-task flow in the main window. */
          <div style={{ position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 11, padding: '22px 16px 20px', background: c.panel, border: `1px solid ${c.border}`, borderRadius: 14, boxShadow: c.shadow }}>
            {celebrate && <div className="fp-confetti" aria-hidden="true">{confettiNodes(floatConfetti)}</div>}
            <span style={{ position: 'relative', width: 46, height: 46, borderRadius: '50%', display: 'grid', placeItems: 'center', background: c.goodSoft, color: c.good, flexShrink: 0 }}>
              {celebrate && <span className="fp-cele-ring" style={{ position: 'absolute', inset: -5, borderRadius: '50%', border: `2px solid ${c.good}`, opacity: 0.45 }} aria-hidden="true" />}
              <Check size={24} strokeWidth={2.6} style={{ position: 'relative', zIndex: 1 }} />
            </span>
            <div style={{ fontFamily: DISPLAY, fontSize: fs(17), fontWeight: 800, letterSpacing: '-.01em', color: c.text, lineHeight: 1.2 }}>Task complete</div>
            <div style={{ fontSize: fs(12.5), lineHeight: 1.5, color: c.muted, maxWidth: 320 }}>{doneN ? `All ${doneN} step${doneN === 1 ? '' : 's'} done.` : 'Nicely done.'} Your report is ready in the main window.</div>
            {onStartAnother && <button className="fp-btn" style={{ ...primary, height: 38, padding: '0 18px', fontSize: 13, fontWeight: 700 }} onClick={onStartAnother} title="Start a new task"><Plus size={15} strokeWidth={2.6} /> Start another task</button>}
          </div>
              ) : current ? (
                <>
                  {prominent && reading}
                  <StepCard step={current} index={idx} total={steps.length} guidance={guidance} confirmN={fpConfirm} busy={busy}
                    hint={paused
                      ? <span className="gv-step-hint">Paused. Resume to keep this live.</span>
                      : !watching && <span className="gv-step-hint">Watch my screen to keep this live</span>}
                    onDone={() => onStep(idx, 'done')} />
                  {!prominent && reading}
                  {steps.length > 1 && onNav && (
                    <div className="gv-nav">
                      <button type="button" className="gv-nav-btn" disabled={idx <= 0} onClick={() => onNav(-1)} title="Go to the previous step"><ChevronLeft size={15} /> Prev</button>
                      <div className="gv-nav-mid">
                        <span className="gv-nav-count">Step {idx + 1} of {steps.length}</span>
                        <div className="gv-nav-track"><div className="gv-nav-fill" style={{ width: `${((idx + 1) / steps.length) * 100}%` }} /></div>
                      </div>
                      <button type="button" className="gv-nav-btn" disabled={idx >= steps.length - 1 || current.status !== 'done'} onClick={() => onNav(1)} title={current.status !== 'done' ? 'Finish this step first. It advances on its own when done.' : 'Go to the next step'}>Next <ChevronRight size={15} /></button>
                    </div>
                  )}
                  {next.map(({ step: s, index: n }) => (
                    <div key={n} className="gv-next" title={String(s.text || '')}>
                      <span className="gv-k">Next</span>
                      <span className="gv-next-n">{n + 1}</span>
                      <span className="gv-next-t"><RichText text={s.text} accent="var(--gv-muted)" chips={false} /></span>
                    </div>
                  ))}
                </>
              ) : (
          <div style={{ ...card, color: c.muted, fontSize: fs(13), textAlign: 'center', padding: '18px 14px', borderStyle: 'dashed', boxShadow: 'none', lineHeight: 1.5 }}>Plan your steps in the main window, then they appear here.</div>
              )}
            </FadeSwap>
          )
        })()}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {/* VIEW FULL PLAN: the complete plan, tucked into a compact chip so it
            never eats the panel. Tap to reveal every step with its done /
            current marker; each row jumps or marks done. This is the full plan
            the window above summarizes. */}
        {steps.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: stepsOpen ? 7 : 0 }}>
            <button className="fp-btn" onClick={() => setStepsOpen((o) => !o)}
              style={{ ...ghost, width: '100%', justifyContent: 'space-between', height: 36, background: stepsOpen ? c.panel2 : 'transparent', borderColor: stepsOpen ? c.border : 'transparent', color: c.muted }}
              title={stepsOpen ? 'Hide the full plan' : 'View the full plan'}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <MenuIcon size={14} style={{ color: c.faint, flexShrink: 0 }} />
                <span style={{ ...eyebrow, fontSize: 10.5, letterSpacing: '.08em', color: c.faint }}>View full plan</span>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: c.text, fontVariantNumeric: 'tabular-nums' }}>{doneN} of {steps.length} done</span>
              </span>
              <ChevronRight size={16} style={{ color: c.faint, flexShrink: 0, transition: 'transform .18s cubic-bezier(.4,0,.2,1)', transform: stepsOpen ? 'rotate(90deg)' : 'none' }} />
            </button>
            {stepsOpen && (
              <div className="fp-rise" style={{ maxHeight: 248, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, paddingRight: 2 }}>
                {steps.map((s, i) => {
                  const isDone = s.status === 'done', isNow = s.status === 'current'
                  const isPending = !isDone && !isNow
                  return (
                    <div key={i} style={{ position: 'relative', display: 'flex', gap: 10, alignItems: 'flex-start', padding: '9px 11px 9px 13px', borderRadius: 11, overflow: 'hidden',
                      background: isDone ? c.panel2 : c.panel, border: `1px solid ${isNow ? 'transparent' : c.border}`, boxShadow: isNow ? c.shadow : 'none', opacity: isPending ? 0.62 : 1, transition: 'opacity .16s, box-shadow .16s' }}>
                      {isNow && <span style={{ ...accentBar, width: 3 }} />}
                      <button className="fp-btn" style={{ flexShrink: 0, width: 22, height: 22, borderRadius: 7, display: 'grid', placeItems: 'center', padding: 0, marginTop: 1,
                        border: `1.5px solid ${isDone ? 'transparent' : isNow ? c.accent : c.borderStrong}`, background: isDone ? c.goodSoft : 'transparent', color: isDone ? c.good : isNow ? c.accent : c.faint }}
                        onClick={() => onStep(i, isDone ? 'current' : 'done')} title={isDone ? 'Mark not done' : 'Mark done'}>{isDone ? <Check size={14} strokeWidth={2.5} /> : <span style={{ fontSize: 10.5, fontWeight: 700, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{i + 1}</span>}</button>
                      {isNow
                        ? <span style={{ flex: 1, minWidth: 0, fontSize: fs(13), lineHeight: 1.45, color: c.text, fontWeight: 650, overflowWrap: 'anywhere' }}><RichText text={s.text} accent={c.accent} /></span>
                        : <button onClick={() => onStep(i, 'current')} title="Jump to this step" style={{ flex: 1, minWidth: 0, textAlign: 'left', background: 'transparent', border: 'none', padding: 0, fontFamily: FONT, fontSize: fs(13), lineHeight: 1.45, color: isDone ? c.faint : c.muted, fontWeight: 500, textDecoration: isDone ? 'line-through' : 'none', overflowWrap: 'anywhere' }}><RichText text={s.text} accent={c.accent} /></button>}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

      </div>
      </div>
      </div>

      {/* FIXED FOOTER: the Ask row is pinned to the bottom, always reachable
          without scrolling (the step content above scrolls independently). */}
      <div style={{ ...card, padding: 11, flexShrink: 0, marginTop: 0 }}>
        {onAddContext && <input ref={floatFileRef} type="file" accept="image/*,.txt,.md,.markdown,.csv,.tsv,.json,.log,.yml,.yaml,.xml,.html,.htm" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files && e.target.files[0]; if (f) onAddContext(f); e.target.value = '' }} />}
        <input
          style={{ width: '100%', height: 40, background: c.inputBg, color: c.text, border: `1px solid ${c.borderStrong}`, borderRadius: 11, padding: '0 13px', outline: 'none', fontSize: 13.5, fontFamily: FONT, boxShadow: light ? '0 1px 2px rgba(16,24,40,.04) inset' : 'none' }}
          placeholder="Ask, say what to analyze, or attach a screenshot or document" value={floatQ}
          onChange={(e) => setFloatQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && floatQ.trim()) onAsk(floatQ.trim()) }}
          onPaste={(e) => { if (!onAddContext) return; const items = e.clipboardData && e.clipboardData.items; if (!items) return; for (const it of items) { if (it.type && it.type.startsWith('image/')) { const f = it.getAsFile(); if (f) { e.preventDefault(); onAddContext(f); return } } } }}
        />
        <div style={{ display: 'flex', gap: 6, marginTop: 9 }}>
          <button className="fp-btn" style={{ ...primary, flex: 1.25, minWidth: 0, padding: '0 10px', justifyContent: 'center' }} disabled={busy || !floatQ.trim()} onClick={() => floatQ.trim() && onAsk(floatQ.trim())}>{busy ? <Loader2 size={13} className="spin" /> : <><ArrowRight size={14} style={{ flexShrink: 0 }} /> Ask</>}</button>
          {onAddContext && <button className="fp-btn" style={{ ...ghost, flex: '0 0 auto', minWidth: 0, padding: '0 10px', justifyContent: 'center' }} disabled={busy} onClick={() => floatFileRef.current && floatFileRef.current.click()} title="Attach a screenshot, photo, or document. It is considered and your steps update if needed." aria-label="Attach a screenshot or document"><Paperclip size={14} style={{ flexShrink: 0 }} /></button>}
          <button className="fp-btn" style={{ ...ghost, flex: 1, minWidth: 0, padding: '0 9px', justifyContent: 'center' }} disabled={busy} onClick={() => onAnalyze(floatQ.trim())} title="Screenshot now and analyze. Type a focus above, or leave blank for a full read."><ScanLine size={14} style={{ flexShrink: 0 }} /> Analyze</button>
          <button className="fp-btn" style={{ ...ghost, flex: 1, minWidth: 0, padding: '0 9px', justifyContent: 'center' }} disabled={busy} onClick={onResearch} title="Look up the latest on the web, then answer (only when you tap it)."><Globe size={14} style={{ flexShrink: 0 }} /> Research</button>
        </div>
        {err && <div style={{ marginTop: 9, display: 'flex', gap: 7, alignItems: 'flex-start', fontSize: 12, color: c.danger, lineHeight: 1.45 }}><AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 2 }} /> <span style={{ overflowWrap: 'anywhere' }}>{err}</span></div>}
      </div>
    </div>
  )
}
