import React, { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, Check, Pause, Play, RotateCcw, ScanEye } from 'lucide-react'
import { useT } from '../i18n/index.jsx'
import { shouldRevealAtOnce } from '../reveal.js'

// GuideConsole - the ONE animated "guide console" demonstration for the whole
// public site (home, sign-in, how-it-works, use-cases, fields, enterprise,
// demo). It plays what the product actually does, in order, on a sample task:
//
//   watching -> I can see -> DO THIS NOW (one exact step, and where) ->
//   the person drifts (wrong menu / wrong field) -> NOT THAT: corrected ->
//   STEP CONFIRMED -> ... -> TASK COMPLETE, CONFIRMED
//
// Three things a chat box never does, shown rather than claimed: it corrects
// you, it hand-holds you one step at a time, and it sees the task through to a
// confirmed finish. The frame is a dark "device screen" card (the same visual
// language as the home LiveDemo), with a stylized app window inside it: the
// person's screen, with the exact control to act on highlighted, a cursor that
// moves, and the wrong control flashing amber when they drift.
//
// DATA: a scenario object (already translated: pages read it from the locale
// catalog, guide.scenarios.<id>) with { tag, app, goal, nav[], steps[], complete }.
// Each step: { see, do, where, target, wrong, tab, done } plus, for the one step
// that goes wrong, { drift, correct }. Labels come from guide.* in the catalog.
//
// MOTION: a beat list (see -> do -> [drift -> correct] -> done per step, then
// complete) walked by one timer. Hovering or focusing the console holds the
// current beat so a reader is never raced; a hidden tab holds it too. Under
// prefers-reduced-motion nothing auto-plays: the console opens on the
// correction beat (the most important frame) and the Next button steps
// through by hand. Nothing here ever plays sound.
//
// LAYOUT STABILITY: every region has a reserved height, so the card keeps one
// size across every beat and nothing under it moves (QA rule from the home
// hero). `compact` shrinks the frame for an aside or a card slot.

const STYLE_ID = 'guideconsole-css'
function ensureStyle() {
  if (typeof document === 'undefined') return
  if (!document.getElementById(STYLE_ID)) {
    const s = document.createElement('style')
    s.id = STYLE_ID; s.textContent = CSS
    document.head.appendChild(s)
  }
}

// Beat timing (ms). A correction lingers longest: it is the point of the demo.
const MS = { see: 1000, do: 2700, drift: 1500, correct: 2900, done: 1300, complete: 5200 }

export function buildBeats(steps) {
  const beats = []
  steps.forEach((s, i) => {
    beats.push({ i, phase: 'see' })
    beats.push({ i, phase: 'do' })
    if (s.correct) { beats.push({ i, phase: 'drift' }); beats.push({ i, phase: 'correct' }) }
    beats.push({ i, phase: 'done' })
  })
  beats.push({ i: Math.max(0, steps.length - 1), phase: 'complete' })
  return beats
}

function prefersReducedMotion() {
  try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) } catch { return false }
}

export default function GuideConsole({ scenario, autoplay = true, loop = true, compact = false, note, className = '' }) {
  ensureStyle()
  const t = useT()
  const steps = (scenario && scenario.steps) || []
  const beats = useMemo(() => buildBeats(steps), [steps])
  // Reduced motion (or a crawler): no timers at all; open on the correction.
  const [manual] = useState(() => (typeof window === 'undefined' ? true : prefersReducedMotion() || shouldRevealAtOnce()))
  const firstCorrect = Math.max(0, beats.findIndex((b) => b.phase === 'correct'))
  const [b, setB] = useState(() => (manual ? firstCorrect : 0))
  const [paused, setPaused] = useState(!autoplay)
  const [held, setHeld] = useState(false)         // hover / focus hold
  const [ended, setEnded] = useState(false)       // !loop: stay on complete
  const [fixes, setFixes] = useState(0)           // corrections shown so far (for the summary)
  const beat = beats[Math.min(b, beats.length - 1)] || { i: 0, phase: 'see' }
  const s = steps[beat.i] || steps[0] || {}
  const phase = beat.phase
  const tot = steps.length
  const fixesTotal = steps.filter((x) => x.correct).length

  const advance = () => {
    setB((cur) => {
      const next = cur + 1
      if (next >= beats.length) {
        if (!loop) { setEnded(true); return cur }
        setFixes(0)
        return 0
      }
      return next
    })
  }
  const replay = () => { setEnded(false); setFixes(0); setB(0); setPaused(false) }

  // Count the corrections as they play (the complete frame says "1 wrong turn caught").
  useEffect(() => { if (phase === 'correct') setFixes((n) => Math.min(fixesTotal, n + 1)) }, [b]) // eslint-disable-line

  // The one clock. Held (hover/focus), paused, a hidden tab, manual mode or a
  // finished non-looping run: no timer is scheduled at all.
  useEffect(() => {
    if (manual || paused || held || ended) return undefined
    if (typeof document !== 'undefined' && document.hidden) return undefined
    const id = setTimeout(advance, MS[phase] || 1500)
    return () => clearTimeout(id)
  }, [b, paused, held, ended, manual]) // eslint-disable-line
  // A tab coming back from the background resumes on the same beat.
  const [, bump] = useState(0)
  useEffect(() => {
    const onVis = () => bump((n) => n + 1)
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  // Screen state derived from the beat.
  const targetState = phase === 'done' || phase === 'complete' ? 'ok' : phase === 'do' || phase === 'correct' ? 'hot' : 'idle'
  const wrongState = phase === 'drift' ? 'bad' : phase === 'correct' ? 'was' : 'idle'
  const cursorAt = phase === 'drift' ? 'wrong' : phase === 'see' ? 'rest' : 'target'
  const navActive = Math.min(Math.max(Number(s.tab) || 0, 0), Math.max(0, ((scenario && scenario.nav) || []).length - 1))
  const stepNo = t('guide.stepOf', { n: beat.i + 1, total: tot })
  const isComplete = phase === 'complete'

  return (
    <div
      className={`gc${compact ? ' gc-compact' : ''}${isComplete ? ' gc-done' : ''} ${className}`}
      role="group"
      aria-label={t('guide.region', { goal: scenario.goal })}
      aria-live="off"
      onPointerEnter={() => setHeld(true)} onPointerLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setHeld(false) }}
    >
      <div className="gc-head">
        <span className="gc-dots" aria-hidden="true"><i /><i /><i /></span>
        <b>WorkCoPilot</b>
        {!isComplete && <span className="gc-live" title={t('guide.watchingTitle')}><i aria-hidden="true" />{t('guide.watching')}</span>}
        <span className="gc-tag">{scenario.tag}</span>
        {!manual && (
          <button type="button" className="gc-ctl-btn" onClick={() => setPaused((p) => !p)} aria-label={paused ? t('guide.play') : t('guide.pause')} aria-pressed={paused}>
            {paused ? <Play size={12} aria-hidden="true" /> : <Pause size={12} aria-hidden="true" />}
          </button>
        )}
      </div>

      <div className="gc-goal"><span className="gc-k">{t('guide.goal')}</span> {scenario.goal}</div>

      {/* The person's screen: the app WorkCoPilot is watching. Decorative; the
          guide panel below carries the meaning in text. */}
      <div className="gc-scr" aria-hidden="true">
        <div className="gc-scr-bar"><i /><i /><i /><span>{scenario.app}</span></div>
        <div className="gc-scr-body">
          <div className="gc-scr-nav">
            {(scenario.nav || []).map((n, k) => <span key={k} className={k === navActive ? 'on' : undefined}>{n}</span>)}
          </div>
          <div className="gc-scr-main">
            <span className="gc-row w80" /><span className="gc-row w55" /><span className="gc-row w65" />
            <span className={`gc-ctl wrong ${wrongState}`}>{wrongState === 'bad' && <AlertTriangle size={10} />}{s.wrong}</span>
            <span className={`gc-ctl target ${targetState}`}>{targetState === 'ok' && <Check size={10} strokeWidth={3} />}{s.target}<i className="gc-ring" /></span>
            {phase === 'correct' && <span className="gc-here">{t('guide.here')}</span>}
            <span className={`gc-cursor at-${cursorAt}`} />
            {isComplete && <span className="gc-scr-complete"><Check size={22} strokeWidth={3} /></span>}
          </div>
        </div>
      </div>

      <div className="gc-prog" aria-hidden="true">
        {steps.map((_, k) => (
          <i key={k} className={k < beat.i || isComplete ? 'done' : k === beat.i ? (phase === 'drift' || phase === 'correct' ? 'warn' : 'now') : ''} />
        ))}
      </div>

      {/* The guide panel: ONE beat at a time, the way the product talks. */}
      <div className="gc-guide">
        {phase === 'see' && (
          <div className="gc-beat gc-see" key={`see${beat.i}`}>
            <div className="gc-lbl cy"><ScanEye size={12} aria-hidden="true" /> {t('guide.see')}</div>
            <div className="gc-txt">{s.see}</div>
          </div>
        )}
        {phase === 'do' && (
          <div className="gc-beat gc-do" key={`do${beat.i}`}>
            <div className="gc-lbl em">{t('guide.doNow')} <span className="gc-no">{stepNo}</span></div>
            <div className="gc-txt strong">{s.do}</div>
            <div className="gc-where"><span>{t('guide.where')}</span> {s.where}</div>
          </div>
        )}
        {phase === 'drift' && (
          <div className="gc-beat gc-drift" key={`dr${beat.i}`}>
            <div className="gc-lbl am"><AlertTriangle size={12} aria-hidden="true" /> {t('guide.holdOn')} <span className="gc-no">{stepNo}</span></div>
            <div className="gc-txt">{s.drift}</div>
          </div>
        )}
        {phase === 'correct' && (
          <div className="gc-beat gc-correct" key={`co${beat.i}`}>
            <div className="gc-lbl am"><AlertTriangle size={12} aria-hidden="true" /> {t('guide.notThat')} <span className="gc-no">{stepNo}</span></div>
            <div className="gc-txt strong">{s.correct}</div>
            <div className="gc-where"><span>{t('guide.where')}</span> {s.where}</div>
          </div>
        )}
        {phase === 'done' && (
          <div className="gc-beat gc-donebeat" key={`dn${beat.i}`}>
            <div className="gc-lbl ok"><Check size={12} strokeWidth={3} aria-hidden="true" /> {t('guide.confirmed')} <span className="gc-no">{stepNo}</span></div>
            <div className="gc-txt">{s.done}</div>
          </div>
        )}
        {isComplete && (
          <div className="gc-beat gc-complete" key="complete">
            <div className="gc-lbl ok"><Check size={12} strokeWidth={3} aria-hidden="true" /> {t('guide.complete')}</div>
            <div className="gc-txt strong">{scenario.complete}</div>
            <div className="gc-sum">
              <span>{t.n('guide.sumSteps', tot)}</span>
              <span>{fixesTotal ? t.n('guide.sumFixes', fixesTotal) : t('guide.sumNoFix')}</span>
            </div>
          </div>
        )}
      </div>

      <div className="gc-foot">
        <span className="gc-ro">{note || t('guide.readOnly')}</span>
        <span className="gc-actions">
          {manual && !isComplete && <button type="button" className="gc-btn" onClick={advance}>{t('guide.next')}</button>}
          {(isComplete || ended) && <button type="button" className="gc-btn" onClick={replay}><RotateCcw size={12} aria-hidden="true" /> {t('guide.replay')}</button>}
        </span>
      </div>

      {/* Static, screen-reader-only list of the whole session, so the content
          is readable without waiting for the animation. */}
      <ol className="gc-sr">
        {steps.map((st, k) => <li key={k}>{st.do}{st.correct ? ` ${st.correct}` : ''} {st.done}</li>)}
        <li>{scenario.complete}</li>
      </ol>
    </div>
  )
}

const CSS = `
.gc{--gc-tx:#eef1f8;--gc-mut:#9aa6ba;--gc-line:rgba(255,255,255,.11);--gc-em:#8cf5c4;--gc-cy:#5bd0ff;--gc-am:#ffb35c;--gc-bad:#ff7a59;
  position:relative;display:flex;flex-direction:column;gap:9px;width:100%;min-width:0;max-width:100%;box-sizing:border-box;
  background:linear-gradient(180deg,#141924,#0b0f1c);border:1px solid var(--gc-line);border-radius:20px;padding:14px 15px 12px;
  color:var(--gc-tx);font-family:"Figtree",system-ui,sans-serif;font-size:14px;line-height:1.45;text-align:start;
  box-shadow:0 40px 90px -40px rgba(5,10,30,.75),inset 0 1px 0 rgba(255,255,255,.05);overflow:hidden}
.gc *{box-sizing:border-box;min-width:0}
.gc::before{content:'';position:absolute;left:0;right:0;top:0;height:2px;background:linear-gradient(90deg,var(--gc-em),var(--gc-cy))}
.gc-head{display:flex;align-items:center;gap:7px;font-size:13px;padding:0 2px 10px;border-bottom:1px solid var(--gc-line)}
.gc-head b{font-family:"Bricolage Grotesque","Figtree",sans-serif;margin-inline-start:4px;white-space:nowrap}
.gc-dots{display:inline-flex;gap:5px}.gc-dots i{width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,.16)}
.gc-dots i:first-child{background:#ff5f57}.gc-dots i:nth-child(2){background:#febc2e}.gc-dots i:last-child{background:#28c840}
.gc-live{display:inline-flex;align-items:center;gap:5px;font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;font-weight:800;color:var(--gc-em);white-space:nowrap}
.gc-live i{width:7px;height:7px;border-radius:50%;background:var(--gc-em);box-shadow:0 0 8px var(--gc-em);animation:gc-pulse 1.4s ease-in-out infinite}
@keyframes gc-pulse{0%,100%{opacity:1}50%{opacity:.35}}
.gc-tag{margin-inline-start:auto;font-size:10.5px;color:var(--gc-em);border:1px solid rgba(140,245,196,.3);border-radius:999px;padding:2px 9px;white-space:nowrap;flex-shrink:0}
.gc-ctl-btn{display:inline-grid;place-items:center;width:24px;height:24px;flex-shrink:0;border-radius:7px;border:1px solid var(--gc-line);background:rgba(255,255,255,.04);color:var(--gc-mut);cursor:pointer;padding:0}
.gc-ctl-btn:hover{color:var(--gc-tx);border-color:rgba(255,255,255,.25)}
.gc button:focus-visible{outline:2px solid var(--gc-cy);outline-offset:2px}
.gc-goal{font-size:14px;line-height:1.4;background:rgba(255,255,255,.03);border:1px solid var(--gc-line);border-radius:11px;padding:8px 11px;min-height:50px;overflow-wrap:anywhere}
.gc-k{font-size:10px;letter-spacing:.14em;color:var(--gc-mut);font-weight:800;margin-inline-end:7px}

/* the watched screen */
.gc-scr{border:1px solid var(--gc-line);border-radius:12px;overflow:hidden;background:#0a0f18}
.gc-scr-bar{display:flex;align-items:center;gap:5px;padding:6px 10px;background:#0c1220;border-bottom:1px solid rgba(255,255,255,.05)}
.gc-scr-bar i{width:6px;height:6px;border-radius:50%;background:#2a3550}
.gc-scr-bar span{margin-inline-start:7px;font-size:10.5px;color:#8ea3c0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gc-scr-body{display:grid;grid-template-columns:92px minmax(0,1fr);height:148px}
.gc-scr-nav{display:flex;flex-direction:column;gap:4px;padding:10px 8px;border-inline-end:1px solid rgba(255,255,255,.05);background:#0b1018}
.gc-scr-nav span{font-size:10.5px;color:#7f8fab;padding:5px 8px;border-radius:7px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;transition:background .3s,color .3s}
.gc-scr-nav span.on{background:rgba(91,208,255,.14);color:#cfe6f6;font-weight:600}
.gc-scr-main{position:relative;padding:14px 14px;display:flex;flex-direction:column;gap:9px}
.gc-row{height:7px;border-radius:4px;background:rgba(255,255,255,.07)}
.gc-row.w80{width:80%}.gc-row.w55{width:55%}.gc-row.w65{width:65%}
.gc-ctl{position:absolute;display:inline-flex;align-items:center;gap:4px;padding:6px 11px;border-radius:9px;font-size:11.5px;font-weight:700;white-space:nowrap;max-width:62%;overflow:hidden;text-overflow:ellipsis;transition:background .35s,color .35s,box-shadow .35s,border-color .35s;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);color:#aab6cc}
.gc-ctl.target{inset-inline-end:14px;top:40px}
.gc-ctl.wrong{inset-inline-start:14px;bottom:14px}
.gc-ctl.target.hot{color:#06201a;background:linear-gradient(135deg,var(--gc-em),var(--gc-cy));border-color:transparent}
.gc-ctl.target.ok{color:#06201a;background:var(--gc-em);border-color:transparent}
.gc-ctl.wrong.bad{color:#2a0f06;background:linear-gradient(135deg,var(--gc-am),var(--gc-bad));border-color:transparent;animation:gc-shake .5s ease-in-out 1}
.gc-ctl.wrong.was{color:var(--gc-am);border-color:rgba(255,179,92,.5);background:rgba(255,179,92,.08);text-decoration:line-through}
@keyframes gc-shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-3px)}75%{transform:translateX(3px)}}
.gc-ring{position:absolute;inset:-5px;border-radius:12px;border:2px solid var(--gc-em);opacity:0;pointer-events:none}
.gc-ctl.target.hot .gc-ring{animation:gc-ring 1.4s ease-out infinite}
@keyframes gc-ring{0%{transform:scale(1);opacity:.9}100%{transform:scale(1.35);opacity:0}}
.gc-here{position:absolute;inset-inline-end:14px;top:76px;font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#2a0f06;background:var(--gc-am);border-radius:6px;padding:2px 7px;animation:gc-fade .3s ease-out both}
.gc-here::before{content:'';position:absolute;top:-5px;inset-inline-end:14px;border:5px solid transparent;border-top:0;border-bottom-color:var(--gc-am)}
/* The cursor moves between three spots (rest, the right control, the wrong
   control) on left/top percentages, so the move animates and mirrors in RTL. */
.gc-cursor{position:absolute;width:0;height:0;border-left:8px solid #fff;border-top:5px solid transparent;border-bottom:10px solid transparent;transform:rotate(-40deg);filter:drop-shadow(0 1px 2px rgba(0,0,0,.6));transition:left .6s cubic-bezier(.2,.7,.2,1),top .6s cubic-bezier(.2,.7,.2,1);z-index:2}
.gc-cursor.at-rest{left:48%;top:62%}
.gc-cursor.at-target{left:76%;top:40%}
.gc-cursor.at-wrong{left:30%;top:78%}
[dir="rtl"] .gc-cursor{transform:rotate(-40deg) scaleX(-1)}
[dir="rtl"] .gc-cursor.at-target{left:16%}
[dir="rtl"] .gc-cursor.at-wrong{left:62%}
.gc-scr-complete{position:absolute;inset:0;display:grid;place-items:center;background:rgba(10,15,24,.78);color:#06201a;animation:gc-fade .3s ease-out both}
.gc-scr-complete svg{width:46px;height:46px;padding:11px;border-radius:50%;background:var(--gc-em);box-shadow:0 0 0 0 rgba(140,245,196,.5);animation:gc-burst 1.1s ease-out 1}
@keyframes gc-burst{0%{box-shadow:0 0 0 0 rgba(140,245,196,.6)}100%{box-shadow:0 0 0 26px rgba(140,245,196,0)}}

.gc-prog{display:flex;gap:5px}
.gc-prog i{height:3px;flex:1;border-radius:2px;background:rgba(255,255,255,.1);transition:background .3s}
.gc-prog i.done{background:var(--gc-em)}
.gc-prog i.now{background:linear-gradient(90deg,var(--gc-em),var(--gc-cy))}
.gc-prog i.warn{background:linear-gradient(90deg,var(--gc-am),var(--gc-bad))}

/* the guide panel: reserved height so the card never changes size */
.gc-guide{min-height:118px;display:flex;flex-direction:column}
.gc-beat{border-radius:13px;padding:11px 13px;animation:gc-beat-in .42s cubic-bezier(.2,.8,.2,1) both;border:1px solid var(--gc-line);background:rgba(255,255,255,.02)}
.gc-see{border-color:rgba(91,208,255,.3);background:rgba(91,208,255,.07)}
.gc-do{border-color:rgba(140,245,196,.35);background:rgba(140,245,196,.07)}
.gc-drift,.gc-correct{border-color:rgba(255,179,92,.45);background:rgba(255,140,90,.09)}
.gc-correct{animation:gc-beat-in .42s cubic-bezier(.2,.8,.2,1) both,gc-pop 1.6s ease-out .18s both}
.gc-donebeat,.gc-complete{border-color:rgba(140,245,196,.4);background:rgba(140,245,196,.09)}
@keyframes gc-beat-in{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:none}}
@keyframes gc-pop{0%{box-shadow:0 0 0 0 rgba(255,154,77,0)}26%{box-shadow:0 0 0 4px rgba(255,154,77,.24),0 12px 30px -12px rgba(255,154,77,.55)}100%{box-shadow:0 0 0 0 rgba(255,154,77,0)}}
@keyframes gc-fade{from{opacity:0}to{opacity:1}}
.gc-lbl{display:flex;align-items:center;gap:6px;font-size:10px;letter-spacing:.14em;text-transform:uppercase;font-weight:800;margin-bottom:6px}
.gc-lbl.cy{color:var(--gc-cy)}.gc-lbl.em{color:var(--gc-em)}.gc-lbl.am{color:var(--gc-am)}.gc-lbl.ok{color:var(--gc-em)}
.gc-no{margin-inline-start:auto;font-size:10px;letter-spacing:.06em;color:var(--gc-mut);font-weight:600;text-transform:none;white-space:nowrap}
.gc-txt{font-size:13.5px;line-height:1.45;color:var(--gc-tx);overflow-wrap:anywhere}
.gc-txt.strong{font-weight:600;font-size:14px}
.gc-where{margin-top:6px;font-size:12.5px;color:var(--gc-mut);line-height:1.4;overflow-wrap:anywhere}
.gc-where span{font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;font-weight:800;color:var(--gc-cy);margin-inline-end:6px}
.gc-sum{display:flex;flex-wrap:wrap;gap:6px;margin-top:9px}
.gc-sum span{font-size:11px;font-weight:700;color:#06201a;background:var(--gc-em);border-radius:999px;padding:3px 9px;white-space:nowrap}
.gc-foot{display:flex;align-items:center;justify-content:space-between;gap:10px;padding-top:2px;min-height:26px}
.gc-ro{font-size:11.5px;color:var(--gc-mut);line-height:1.35}
.gc-actions{display:inline-flex;gap:6px;flex-shrink:0}
.gc-btn{display:inline-flex;align-items:center;gap:5px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.16);color:var(--gc-tx);border-radius:9px;padding:6px 12px;font:inherit;font-size:12.5px;font-weight:600;cursor:pointer;white-space:nowrap}
.gc-btn:hover{background:rgba(255,255,255,.14)}
.gc-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}

/* compact: an aside or a card slot */
.gc-compact{padding:12px 13px 10px;gap:8px;font-size:13px;border-radius:16px}
.gc-compact .gc-scr-body{height:132px;grid-template-columns:84px minmax(0,1fr)}
.gc-compact .gc-guide{min-height:108px}
.gc-compact .gc-goal{min-height:44px;font-size:13px}
@media(max-width:420px){.gc-scr-body{grid-template-columns:78px minmax(0,1fr)}.gc-ctl{max-width:58%;font-size:11px;padding:5px 9px}}
@media(prefers-reduced-motion:reduce){
  .gc-live i,.gc-ctl.target.hot .gc-ring,.gc-ctl.wrong.bad,.gc-scr-complete svg{animation:none}
  .gc-beat,.gc-correct,.gc-here,.gc-scr-complete{animation:none}
  .gc-cursor,.gc-ctl,.gc-prog i,.gc-scr-nav span{transition:none}
}
`
