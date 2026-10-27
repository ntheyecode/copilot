// The top-bar PLAN PILL and its popover: this month's included hours as a ring,
// today's tasks as pips, and (open) the full detail with the one actionable
// state. Reads the shared derivation (planModel.planView) through the props the
// shell passes, so it can never disagree with the dashboard meters. Replaces the
// old minutes / tasks / banked-credits pill and the trade control (retired with
// the monthly plan model). Styles live in planPill.css.js.
import { useState } from 'react'
import { Clock, Check, ChevronRight, Plus, Sparkles, AlertTriangle, Building2, Zap } from 'lucide-react'
import { useT } from '../../i18n/index.jsx'
import { fmtDuration, fmtHours, share, LOW_SECONDS } from './planModel.js'
import { PLAN_PILL_CSS } from './planPill.css.js'

// Small SVG ring. `pct` is the share LEFT (1 = untouched). tone: ok | low | out.
export function HoursRing({ pct, size = 16, stroke = 3, tone = 'ok', className = '' }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const p = Math.max(0, Math.min(1, Number(pct) || 0))
  return (
    <svg className={`wd-ring ${tone}${className ? ' ' + className : ''}`} width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" focusable="false">
      <circle className="wd-ring-track" cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} />
      <circle className="wd-ring-fill" cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - p)} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
    </svg>
  )
}

// One dot per task in today's cap, filled once used. Past 12 the number alone
// is clearer than a row of dots, so the caller falls back to text.
export const MAX_PIPS = 12
export function TaskPips({ used, cap, label, size = 'sm' }) {
  if (cap == null || cap > MAX_PIPS) return null
  const n = Math.max(0, Math.floor(cap))
  const full = n > 0 && used >= n
  return (
    <span className={`wd-pips${size === 'lg' ? ' lg' : ''}${full ? ' full' : ''}`} role="img" aria-label={label}>
      {Array.from({ length: n }, (_, i) => <i key={i} className={i < used ? 'on' : ''} />)}
    </span>
  )
}

// The tone of the hours meter. A company member whose admin-set allowance is
// spent (state 'ceiling') still has plan hours: that ring stays on its own
// tone and the allowance meter is the one that reads "out".
export function hoursTone(plan) {
  if (plan.state === 'ceiling' && plan.hasPlan) return plan.left <= 0 ? 'out' : (plan.left <= LOW_SECONDS ? 'low' : 'ok')
  if (plan.exhausted || plan.state === 'pool' || plan.state === 'ceiling') return 'out'
  return plan.low ? 'low' : 'ok'
}

export default function PlanPill({ plan, planName, renewLabel, companyName, canBuy, canUpgrade, upgradeHref, onBuyHours }) {
  const t = useT()
  const [open, setOpen] = useState(false)
  if (!plan) return null
  const units = { h: t('workShell.plan.unitH'), min: t('workShell.plan.unitMin') }
  const tasks = plan.tasks
  const tone = hoursTone(plan)
  // The ring shows this month's included hours when the person has a plan; a
  // pool-based company member sees their day ceiling or the shared pool instead.
  const ringPct = plan.hasPlan ? share(plan.left, Math.max(plan.included, plan.left))
    : plan.dailySeconds != null ? 1 - share(plan.usedToday, plan.dailySeconds)
      : plan.pool ? share(plan.pool.remainingSeconds, plan.pool.monthlySeconds) : (plan.exhausted ? 0 : 1)
  const timeLeft = fmtDuration(plan.remainingSeconds, units)
  const tasksAria = !tasks ? '' : tasks.unlimited ? t('workShell.plan.tasksUnlimitedAria')
    : t('workShell.plan.tasksLeftAria', { remaining: tasks.remaining != null ? tasks.remaining : 0, cap: tasks.cap != null ? tasks.cap : 0 })
  const tasksFace = !tasks ? '-' : tasks.unlimited ? '∞' : `${tasks.remaining != null ? tasks.remaining : '-'}/${tasks.cap != null ? tasks.cap : '-'}`
  const windowWord = (w) => t(w === 'week' ? 'workShell.plan.windowWeek' : w === 'month' ? 'workShell.plan.windowMonth' : 'workShell.plan.windowDay')

  // The one state note + its action.
  const note = (() => {
    const s = plan.state
    if (s === 'ok') return null
    if (s === 'pool') return { out: true, text: t('workShell.plan.statePool') }
    if (s === 'ceiling') return { out: true, text: t('workShell.plan.stateCeiling', { company: companyName || t('workDashboard.plan.yourCompany') }) }
    if (s === 'exhausted') return { out: true, text: plan.isCompany ? t('workShell.plan.stateExhaustedCompany', { date: renewLabel }) : t('workShell.plan.stateExhausted', { date: renewLabel }), buy: true, upgrade: true }
    if (s === 'low') return { out: false, text: plan.isCompany ? t('workShell.plan.stateLowCompany', { time: timeLeft }) : t('workShell.plan.stateLow', { time: timeLeft }), buy: true }
    if (s === 'taskCap') return { out: false, text: t('workShell.plan.stateTaskCap', { cap: tasks ? tasks.cap : 0, reset: tasks ? tasks.resetLabel : '' }), upgrade: true }
    return null
  })()

  return (
    <div className="wd-planpill-wrap">
      <style>{PLAN_PILL_CSS}</style>
      <button type="button" className={`wd-planpill${open ? ' on' : ''}`} aria-haspopup="dialog" aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        title={t('workShell.plan.name', { plan: planName })}
        aria-label={t('workShell.plan.open', { plan: planName, time: timeLeft, tasks: tasksAria })}>
        <span className="wd-pp-s hours"><HoursRing pct={ringPct} tone={tone} /></span>
        <span className="wd-pp-sep" aria-hidden />
        <span className="wd-pp-s tasks"><TaskPips used={tasks ? tasks.usedToday : 0} cap={tasks && !tasks.unlimited ? tasks.cap : null} label={tasksAria} /> <b>{tasksFace}</b></span>
        <ChevronRight className="wd-pp-ca" size={13} aria-hidden />
      </button>
      {open && (
        <>
          <button type="button" className="wd-planpop-back" aria-label={t('workShell.plan.close')} onClick={() => setOpen(false)} />
          <div className="wd-planpop" role="dialog" aria-label={t('workShell.plan.dialog')}>
            <div className="wd-planpop-head">
              <span className="wd-planpop-name" title={t('workShell.plan.name', { plan: planName })}>{t('workShell.plan.name', { plan: planName })}</span>
              <span className="wd-planpop-tag"><span className="wd-plan-dot" aria-hidden /> {t('workShell.plan.active')}</span>
            </div>

            {/* This month's included hours (anyone on a plan: individuals + seat-based company members) */}
            {plan.hasPlan && (
              <div className="wd-planpop-stat">
                <div className="r"><span className="k"><Clock size={13} /> {t('workShell.plan.hoursTitle')}</span><span className="v">{fmtDuration(plan.left, units, true)} <small>/ {fmtHours(plan.included, units)}</small></span></div>
                <div className={`wd-planpop-bar ${tone}`}><i style={{ width: `${Math.round(ringPct * 100)}%` }} /></div>
                <div className="h">{t('workShell.plan.usedOf', { used: fmtDuration(plan.used, units), included: fmtHours(plan.included, units) })} &middot; {t('workShell.plan.renews', { date: renewLabel })}</div>
                {plan.carryForward && <div className="h">{plan.carryCapHours != null ? t('workShell.plan.carryCap', { hours: fmtHours(plan.carryCapHours * 3600, units) }) : t('workShell.plan.carry')}</div>}
                {plan.carriedExtra > 0 && <div className="h">{t('workShell.plan.carried', { time: fmtDuration(plan.carriedExtra, units) })}</div>}
              </div>
            )}
            {/* A pool-based company member: their day ceiling, else the shared pool */}
            {!plan.hasPlan && plan.dailySeconds != null && (
              <div className="wd-planpop-stat">
                <div className="r"><span className="k"><Clock size={13} /> {t('workShell.plan.allowance')}</span><span className="v">{fmtDuration(Math.max(0, plan.dailySeconds - plan.usedToday), units, true)} <small>/ {fmtHours(plan.dailySeconds, units)}</small></span></div>
                <div className={`wd-planpop-bar ${tone}`}><i style={{ width: `${Math.round(ringPct * 100)}%` }} /></div>
                <div className="h">{t('workShell.plan.allowanceUsed', { used: fmtDuration(plan.usedToday, units), limit: fmtHours(plan.dailySeconds, units), window: windowWord('day') })} &middot; {t('workShell.plan.tasksReset', { reset: plan.resetLabel })}</div>
              </div>
            )}
            {!plan.hasPlan && plan.dailySeconds == null && plan.pool && (
              <div className="wd-planpop-stat">
                <div className="r"><span className="k"><Building2 size={13} /> {t('workShell.plan.companyPool')}</span><span className="v">{fmtDuration(plan.pool.remainingSeconds, units, true)} <small>/ {fmtHours(plan.pool.monthlySeconds, units)}</small></span></div>
                <div className={`wd-planpop-bar ${tone}`}><i style={{ width: `${Math.round(ringPct * 100)}%` }} /></div>
                <div className="h">{t('workShell.plan.companyPoolNote')}</div>
              </div>
            )}
            {/* Top-up hours (the person's own, never expire) */}
            {!plan.isCompany && (
              <div className="wd-planpop-stat">
                <div className="r"><span className="k"><Zap size={13} /> {t('workShell.plan.topup')}</span><span className="v">{fmtDuration(plan.topupSeconds, units, true)}</span></div>
                <div className="h">{t('workShell.plan.topupNote')}</div>
              </div>
            )}
            {/* A seat-based company member: the admin-set allowance, if any */}
            {plan.allowance && (
              <div className="wd-planpop-stat">
                <div className="r"><span className="k"><Building2 size={13} /> {t('workShell.plan.allowance')}</span><span className="v">{fmtDuration(plan.allowance.remaining, units, true)} <small>/ {fmtHours(plan.allowance.limit, units)}</small></span></div>
                <div className="h">{t('workShell.plan.allowanceUsed', { used: fmtDuration(plan.allowance.used, units), limit: fmtHours(plan.allowance.limit, units), window: windowWord(plan.allowance.window) })}</div>
              </div>
            )}
            {/* Today's tasks */}
            {tasks && (
              <div className="wd-planpop-stat">
                <div className="r"><span className="k"><Check size={13} /> {t('workShell.plan.tasksTitle')}</span><span className="v">{tasks.unlimited ? t('workShell.plan.tasksUnlimited') : <>{tasks.usedToday} <small>/ {tasks.cap != null ? tasks.cap : '-'}</small></>}</span></div>
                {!tasks.unlimited && (
                  <div className="wd-planpop-pips">
                    <TaskPips used={tasks.usedToday} cap={tasks.cap} label={tasksAria} size="lg" />
                    <span className={`h${plan.taskCap ? ' warm' : ''}`} style={{ marginTop: 0 }}>{plan.taskCap ? t('workShell.plan.tasksOpen', { reset: tasks.resetLabel }) : t('workShell.plan.tasksReset', { reset: tasks.resetLabel })}</span>
                  </div>
                )}
              </div>
            )}

            {note && (
              <div className={`wd-planpop-note${note.out ? ' out' : ''}`} role="status">
                <div className="t"><AlertTriangle size={14} /> <span>{note.text}</span></div>
                {((note.buy && canBuy) || (note.upgrade && canUpgrade)) && (
                  <div className="wd-planpop-acts">
                    {note.buy && canBuy && <button type="button" className="wd-planpop-act" onClick={() => { setOpen(false); onBuyHours && onBuyHours() }}><Plus size={13} /> {t('workShell.plan.actBuy')}</button>}
                    {note.upgrade && canUpgrade && <a className="wd-planpop-act ghost" href={upgradeHref || '/workcopilot/pricing'}><Sparkles size={13} /> {t('workShell.plan.actUpgrade')}</a>}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
