import { useEffect, useState } from 'react'
import { Monitor, Camera, Check, ScanLine, ListChecks, CheckCircle2, Clock, Eye, Compass } from 'lucide-react'
import RichText from '../../../components/RichText.jsx'
import { useT } from '../../../i18n/index.jsx'

// The PLANNING state: what the person sees from the moment their screen is
// shared until the first step card. It mounts only once the plan request is
// actually in flight (never while the share prompt is open), so nothing here
// runs ahead of reality.
//
// Everything on it is REAL state handed in by the console, never a timer
// pretending to be progress:
//   goal / title   the person's own goal, shown back to them
//   source         'screen' | 'camera': what is being read
//   frameSent      null while the first look is still being taken, then true
//                  when a frame of that source went with the plan request
//   ready + steps  the plan has landed: the skeleton fills with the real steps
//                  for a short beat (PLAN_LANDING_MS) before the step view
// The one request is not observable in stages, so the copy says what the
// product does with the screen (reads it, works out the steps, prepares a check
// for each) and what the person gets, without a percentage or a fake tick
// list. A long wait gets an honest note after SLOW_HINT_MS; the console's own
// planSlow timeout stays the hard stop.
export const SLOW_HINT_MS = 12000
export const PLAN_LANDING_MS = 900
const SKELETON_ROWS = 3
const SHOWN_STEPS = 3

export function prefersReducedMotion() {
  try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) } catch { return false }
}
// How long the console holds the ready state before swapping to the step view
// (nothing to hold under reduced motion: the swap is instant, no animation).
export function planLandingMs() { return prefersReducedMotion() ? 0 : PLAN_LANDING_MS }

export default function PlanningLoader({ goal, title, source = 'screen', frameSent = null, ready = false, steps = [] }) {
  const t = useT()
  const [slow, setSlow] = useState(false)
  useEffect(() => { const id = setTimeout(() => setSlow(true), SLOW_HINT_MS); return () => clearTimeout(id) }, [])

  const g = String(goal || '').trim()
  const ti = String(title || '').trim()
  const goalLine = g || ((ti && !/^Session \d/.test(ti)) ? ti : '')
  const camera = source === 'camera'
  const readLine = frameSent == null
    ? t('guideConsole.planning.readWait')
    : !frameSent
      ? t('guideConsole.planning.readNone')
      : camera ? t('guideConsole.planning.readCamera') : t('guideConsole.planning.readScreen')
  const list = Array.isArray(steps) ? steps : []
  const shown = ready ? list.slice(0, SHOWN_STEPS) : []
  const more = ready ? Math.max(0, list.length - shown.length) : 0

  return (
    <div className={`wc-plan${ready ? ' ready' : ''}`} role="status" aria-live="polite" aria-busy={ready ? 'false' : 'true'}>
      <div className="wc-plan-head">
        {ready ? <span className="wc-plan-ok"><Check size={13} strokeWidth={3} aria-hidden="true" /></span> : <span className="wc-plan-dot" aria-hidden="true" />}
        <span className="wc-plan-t">{ready ? t('guideConsole.planning.ready') : t('guideConsole.planning.title')}</span>
        {ready && list.length > 0 && <span className="wc-plan-n">{t.n('guideConsole.planning.readyCount', list.length)}</span>}
      </div>

      <div className="wc-plan-grid">
        <div className="wc-plan-left">
          {/* the stylised screen being read: decorative, the caption below says it */}
          <div className="wc-plan-screen" aria-hidden="true">
            <div className="wc-plan-bar"><i /><i /><i /><b /></div>
            <div className="wc-plan-body">
              <div className="wc-plan-nav"><i /><i /><i /><i /></div>
              <div className="wc-plan-page"><i className="h" /><i className="w2" /><i className="w3" /><i className="w4" /><i className="btn" /></div>
            </div>
            {!ready && <div className="wc-plan-sweep" />}
            <span className="wc-plan-src">{ready ? <Check size={14} strokeWidth={3} /> : camera ? <Camera size={14} /> : <Monitor size={14} />}</span>
          </div>
          <div className="wc-plan-read"><ScanLine size={14} aria-hidden="true" /><span>{readLine}</span></div>
        </div>

        <div className="wc-plan-side">
          {goalLine && (
            <div className="wc-plan-goal">
              <span className="wc-plan-k">{t('guideConsole.planning.goalK')}</span>
              <div className="wc-plan-goal-t" title={goalLine}>{goalLine}</div>
            </div>
          )}
          <ol className="wc-plan-skel" aria-label={t('guideConsole.planning.stepsAria')}>
            {ready
              ? shown.map((s, i) => (
                <li key={i} className="wc-plan-row" style={{ animationDelay: `${i * 70}ms` }}>
                  <span className="wc-plan-row-n">{i + 1}</span>
                  <span className="wc-plan-row-t"><RichText text={String(s.text || '')} accent="var(--brand-600)" chips={false} /></span>
                </li>
              ))
              : Array.from({ length: SKELETON_ROWS }, (_, i) => (
                <li key={i} className="wc-plan-row" aria-hidden="true">
                  <span className="wc-plan-row-n">{i + 1}</span>
                  <span className={`wc-plan-row-bar s${i + 1}`} />
                </li>
              ))}
            {more > 0 && <li className="wc-plan-more">{t.n('guideConsole.planning.more', more)}</li>}
          </ol>
          {!ready && <div className="wc-plan-write"><ListChecks size={14} aria-hidden="true" /><span>{t('guideConsole.planning.writing')}</span></div>}
        </div>
      </div>

      <div className="wc-plan-promise">
        <span className="wc-plan-k">{t('guideConsole.planning.promiseK')}</span>
        <ul>
          <li><Eye size={14} aria-hidden="true" /><span>{t('guideConsole.planning.promise1')}</span></li>
          <li><CheckCircle2 size={14} aria-hidden="true" /><span>{t('guideConsole.planning.promise2')}</span></li>
          <li><Compass size={14} aria-hidden="true" /><span>{t('guideConsole.planning.promise3')}</span></li>
        </ul>
      </div>

      {slow && !ready && (
        <div className="wc-plan-slow"><Clock size={14} aria-hidden="true" /><span>{t('guideConsole.planning.slow')}</span></div>
      )}
    </div>
  )
}
