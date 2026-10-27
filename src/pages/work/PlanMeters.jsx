// Dashboard PLAN METERS: "Your plan at a glance". Three tiles that read the
// shared derivation (planModel.planView, passed by the shell as `plan`):
//
//   1. Hours this month   a ring of the included hours still left, used / included,
//                         the localized renewal date, carry-forward only when the
//                         superadmin policy says so (admins: "Guidance on";
//                         pool-based company members: today's allowance or the
//                         shared company pool)
//   2. Top-up hours       bought on top of the plan, never expire, Buy hours
//                         (company members instead see their admin-set allowance)
//   3. Open tasks         one pip per at-once task slot, "1 of 4 open", room left
//                         or "finish or pick one up"; nothing resets, hours are
//                         the only usage limit (a company member with an
//                         admin-set task ceiling sees started / cap and its reset)
//
// and ONE state banner under them with the action that resolves it (buy hours,
// upgrade, wait for the renewal, ask your administrator). No banked credits, no
// trade control: those mechanics are retired. Styles: planMeters.css.js (the
// ring + pips come from planPill.css.js, injected by the shell's PlanPill).
import { Link } from 'react-router-dom'
import { Clock, Check, Zap, Info, AlertTriangle, CheckCircle2, Plus, Sparkles, Building2, ListChecks } from 'lucide-react'
import { useT } from '../../i18n/index.jsx'
import { fmtDuration, fmtHours, share } from './planModel.js'
import { HoursRing, TaskPips, MAX_PIPS, hoursTone, taskSlotCopy } from './PlanPill.jsx'
import { PLAN_METERS_CSS } from './planMeters.css.js'

function Tip({ id, text, label }) {
  return (
    <span className="wd-pm-info-wrap">
      <button type="button" className="wd-pm-info" aria-label={label} aria-describedby={id}><Info size={13} /></button>
      <span className="wd-pm-tip" role="tooltip" id={id}>{text}</span>
    </span>
  )
}

export default function PlanMeters({ plan, renewLabel, companyName, canBuy, canUpgrade, upgradeHref, onBuyHours }) {
  const t = useT()
  const units = { h: t('workShell.plan.unitH'), min: t('workShell.plan.unitMin') }
  const info = t('workDashboard.meters.info')
  const windowWord = (w) => t(w === 'week' ? 'workShell.plan.windowWeek' : w === 'month' ? 'workShell.plan.windowMonth' : 'workShell.plan.windowDay')

  const head = (
    <div className="wd-pm-head">
      <h2>{t('workDashboard.meters.heading')}</h2>
      <p>{t('workDashboard.meters.sub')}</p>
    </div>
  )

  if (!plan) {
    return (
      <section className="wd-pm" aria-label={t('workDashboard.meters.heading')}>
        <style>{PLAN_METERS_CSS}</style>
        {head}
        <div className="wd-pm-grid" aria-hidden>
          {[0, 1, 2].map((i) => <div key={i} className="wd-pm-tile"><div className="wd-pm-skel-top" /><div className="wd-pm-skel-v" /><div className="wd-pm-skel-s" /></div>)}
        </div>
      </section>
    )
  }

  const tone = hoursTone(plan)
  const tasks = plan.tasks
  const timeLeft = fmtDuration(plan.remainingSeconds, units)

  // ---- Tile 1: hours this month (or the admin / company variants) ----------
  let hoursTile
  if (plan.isAdmin) {
    hoursTile = (
      <div className="wd-pm-tile">
        <div className="wd-pm-top"><span className="wd-pm-ic"><Clock size={15} /></span><span className="wd-pm-label">{t('workDashboard.meters.hours.label')}</span><Tip id="wd-pm-tip-hours" label={info} text={t('workDashboard.meters.tipAdmin')} /></div>
        <div className="wd-pm-body"><div className="wd-pm-main"><div className="wd-pm-value">{t('workDashboard.meters.on')}</div><div className="wd-pm-sub"><CheckCircle2 size={13} />{t('workDashboard.meters.onSub')}</div></div></div>
      </div>
    )
  } else if (plan.hasPlan) {
    const pct = share(plan.left, Math.max(plan.included, plan.left))
    hoursTile = (
      <div className={`wd-pm-tile ${tone === 'ok' ? '' : tone}`}>
        <div className="wd-pm-top"><span className={`wd-pm-ic${tone === 'ok' ? '' : ' warm'}`}><Clock size={15} /></span><span className="wd-pm-label">{t('workDashboard.meters.hours.label')}</span>
          <Tip id="wd-pm-tip-hours" label={info} text={plan.carryForward ? t('workDashboard.meters.hours.tipCarry', { included: fmtHours(plan.included, units), date: renewLabel }) : t('workDashboard.meters.hours.tip', { included: fmtHours(plan.included, units), date: renewLabel })} /></div>
        <div className="wd-pm-body">
          <HoursRing pct={pct} tone={tone} size={56} stroke={6} />
          <div className="wd-pm-main">
            <div className="wd-pm-value">{fmtDuration(plan.left, units, true)}<small>{t('workDashboard.meters.hours.left')}</small></div>
            <div className="wd-pm-sub">{t('workDashboard.meters.hours.usedOf', { used: fmtDuration(plan.used, units), included: fmtHours(plan.included, units) })}</div>
            <div className="wd-pm-sub">{t('workDashboard.meters.hours.renews', { date: renewLabel })}{plan.carryForward ? ` · ${t('workDashboard.meters.hours.carry')}` : ''}</div>
            {plan.carriedExtra > 0 && <div className="wd-pm-sub">{t('workDashboard.meters.hours.carried', { time: fmtDuration(plan.carriedExtra, units) })}</div>}
          </div>
        </div>
      </div>
    )
  } else if (plan.dailySeconds != null) {
    // Pool-based company member whose admin set a DAY ceiling (company policy;
    // individuals never have a per-day hours allowance, dailySeconds is null).
    const pct = 1 - share(plan.usedToday, plan.dailySeconds)
    hoursTile = (
      <div className={`wd-pm-tile ${tone === 'ok' ? '' : tone}`}>
        <div className="wd-pm-top"><span className={`wd-pm-ic${tone === 'ok' ? '' : ' warm'}`}><Clock size={15} /></span><span className="wd-pm-label">{t('workDashboard.meters.allowance.label')}</span><Tip id="wd-pm-tip-hours" label={info} text={t('workDashboard.meters.allowance.tip')} /></div>
        <div className="wd-pm-body">
          <HoursRing pct={pct} tone={tone} size={56} stroke={6} />
          <div className="wd-pm-main">
            <div className="wd-pm-value">{fmtDuration(Math.max(0, plan.dailySeconds - plan.usedToday), units, true)}<small>{t('workDashboard.meters.hours.left')}</small></div>
            <div className="wd-pm-sub">{t('workDashboard.meters.allowance.usedOf', { used: fmtDuration(plan.usedToday, units), limit: fmtHours(plan.dailySeconds, units), window: windowWord('day') })}</div>
            <div className="wd-pm-sub">{t('workDashboard.meters.allowance.resets', { reset: plan.resetLabel })}</div>
          </div>
        </div>
      </div>
    )
  } else {
    // Pool-based company member with no day ceiling: the shared pool is the meter.
    const pct = plan.pool ? share(plan.pool.remainingSeconds, plan.pool.monthlySeconds) : (plan.exhausted ? 0 : 1)
    hoursTile = (
      <div className={`wd-pm-tile ${tone === 'ok' ? '' : tone}`}>
        <div className="wd-pm-top"><span className={`wd-pm-ic${tone === 'ok' ? '' : ' warm'}`}><Building2 size={15} /></span><span className="wd-pm-label">{t('workDashboard.meters.pool.label')}</span><Tip id="wd-pm-tip-hours" label={info} text={t('workDashboard.meters.pool.tip')} /></div>
        <div className="wd-pm-body">
          <HoursRing pct={pct} tone={tone} size={56} stroke={6} />
          <div className="wd-pm-main">
            <div className="wd-pm-value">{timeLeft}<small>{t('workDashboard.meters.hours.left')}</small></div>
            {plan.pool && <div className="wd-pm-sub">{t('workDashboard.meters.pool.leftOf', { left: fmtDuration(plan.pool.remainingSeconds, units), monthly: fmtHours(plan.pool.monthlySeconds, units) })}</div>}
            <div className="wd-pm-sub">{t('workDashboard.meters.pool.resets', { reset: plan.resetLabel })}</div>
          </div>
        </div>
      </div>
    )
  }

  // ---- Tile 2: top-up hours (individuals) or the admin-set allowance / pool ----
  let secondTile
  if (!plan.isCompany) {
    secondTile = (
      <div className="wd-pm-tile">
        <div className="wd-pm-top"><span className="wd-pm-ic"><Zap size={15} /></span><span className="wd-pm-label">{t('workDashboard.meters.topup.label')}</span><Tip id="wd-pm-tip-topup" label={info} text={t('workDashboard.meters.topup.tip')} /></div>
        <div className="wd-pm-body"><div className="wd-pm-main">
          <div className="wd-pm-value">{plan.topupSeconds > 0 ? fmtDuration(plan.topupSeconds, units, true) : t('workDashboard.meters.topup.none')}</div>
          <div className="wd-pm-sub">{t('workDashboard.meters.topup.never')}</div>
        </div></div>
        {canBuy && !plan.isAdmin && <button type="button" className="wd-pm-act" onClick={onBuyHours}><Plus size={13} /> {t('workDashboard.meters.topup.buy')}</button>}
      </div>
    )
  } else if (plan.allowance) {
    const a = plan.allowance
    const aTone = a.remaining <= 0 ? 'out' : (a.remaining <= 15 * 60 ? 'low' : 'ok')
    secondTile = (
      <div className={`wd-pm-tile ${aTone === 'ok' ? '' : aTone}`}>
        <div className="wd-pm-top"><span className={`wd-pm-ic${aTone === 'ok' ? ' alt' : ' warm'}`}><Building2 size={15} /></span><span className="wd-pm-label">{t('workDashboard.meters.allowance.label')}</span><Tip id="wd-pm-tip-allow" label={info} text={t('workDashboard.meters.allowance.tip')} /></div>
        <div className="wd-pm-body">
          <HoursRing pct={share(a.remaining, a.limit)} tone={aTone} size={56} stroke={6} />
          <div className="wd-pm-main">
            <div className="wd-pm-value">{fmtDuration(a.remaining, units, true)}<small>{t('workDashboard.meters.hours.left')}</small></div>
            <div className="wd-pm-sub">{t('workDashboard.meters.allowance.usedOf', { used: fmtDuration(a.used, units), limit: fmtHours(a.limit, units), window: windowWord(a.window) })}</div>
            <div className="wd-pm-sub">{t('workDashboard.meters.allowance.resets', { reset: a.resetLabel })}</div>
          </div>
        </div>
      </div>
    )
  } else if (!plan.hasPlan && plan.dailySeconds == null) {
    // Pool-based company member with no ceiling: the hours tile already shows
    // the shared pool, so this tile reads today's own usage instead of
    // repeating the pool.
    secondTile = (
      <div className="wd-pm-tile">
        <div className="wd-pm-top"><span className="wd-pm-ic alt"><Clock size={15} /></span><span className="wd-pm-label">{t('workDashboard.meters.today.label')}</span><Tip id="wd-pm-tip-today" label={info} text={t('workDashboard.meters.today.tip')} /></div>
        <div className="wd-pm-body"><div className="wd-pm-main">
          <div className="wd-pm-value">{fmtDuration(plan.usedToday, units, true)}</div>
          <div className="wd-pm-sub">{t('workDashboard.meters.today.sub')}</div>
        </div></div>
      </div>
    )
  } else {
    // Seat-based company member with no ceiling: the shared company hours they
    // draw from after their plan hours (shown even when zero, honestly).
    secondTile = (
      <div className="wd-pm-tile">
        <div className="wd-pm-top"><span className="wd-pm-ic alt"><Building2 size={15} /></span><span className="wd-pm-label">{t('workDashboard.meters.pool.label')}</span><Tip id="wd-pm-tip-pool" label={info} text={t('workDashboard.meters.pool.tip')} /></div>
        <div className="wd-pm-body"><div className="wd-pm-main">
          <div className="wd-pm-value">{fmtDuration(plan.pool ? plan.pool.remainingSeconds : plan.companyPoolSeconds, units, true)}<small>{t('workDashboard.meters.hours.left')}</small></div>
          <div className="wd-pm-sub">{plan.pool ? t('workDashboard.meters.pool.leftOf', { left: fmtDuration(plan.pool.remainingSeconds, units), monthly: fmtHours(plan.pool.monthlySeconds, units) }) : t('workDashboard.meters.pool.shared')}</div>
        </div></div>
      </div>
    )
  }

  // ---- Tile 3: task slots (open tasks, or a company ceiling) -----------------
  // mode 'open' (individuals): "1 of 4 open", pips = slots in use, room left or
  // "finish or pick one up"; no reset copy, a slot frees when a task is done.
  // mode 'limit' (company ceiling): started of cap and when it resets.
  const openMode = !!(tasks && tasks.mode === 'open')
  const slot = taskSlotCopy(t, tasks, plan.tasksFull, 'workShell.plan')
  const tasksTip = !tasks || tasks.unlimited ? t('workDashboard.meters.tasks.tipUnlimited')
    : openMode ? t('workDashboard.meters.tasks.tipOpen', { max: tasks.max }) : t('workDashboard.meters.tasks.tipLimit', { reset: tasks.resetLabel })
  const tasksTile = (
    <div className={`wd-pm-tile${plan.tasksFull ? ' low' : ''}`}>
      <div className="wd-pm-top"><span className={`wd-pm-ic${plan.tasksFull ? ' warm' : ' alt'}`}><Check size={15} /></span><span className="wd-pm-label">{openMode ? t('workDashboard.meters.tasks.labelOpen') : t('workDashboard.meters.tasks.label')}</span>
        <Tip id="wd-pm-tip-tasks" label={info} text={tasksTip} /></div>
      <div className="wd-pm-body"><div className="wd-pm-main">
        {!tasks || tasks.unlimited ? (
          <>
            <div className="wd-pm-value">{t('workDashboard.meters.tasks.unlimited')}</div>
            <div className="wd-pm-sub wrap">{t('workDashboard.meters.tasks.unlimitedSub')}</div>
          </>
        ) : (
          <>
            <div className="wd-pm-value">{tasks.used}<small>/ {tasks.max != null ? tasks.max : '-'}</small></div>
            <div className="wd-pm-pipsrow">
              {tasks.max != null && tasks.max <= MAX_PIPS && <TaskPips used={tasks.used} max={tasks.max} label={slot.aria} size="lg" />}
              <span className="wd-pm-sub" style={{ marginTop: 0 }}>{openMode ? t('workDashboard.meters.tasks.openOf', { open: tasks.used, max: tasks.max }) : t('workDashboard.meters.tasks.usedOf', { used: tasks.used, cap: tasks.max != null ? tasks.max : '-' })}</span>
            </div>
            <div className={`wd-pm-sub${plan.tasksFull ? ' warm' : ''}`}>{slot.note}</div>
          </>
        )}
      </div></div>
    </div>
  )

  // ---- The one state banner ---------------------------------------------
  const banner = (() => {
    const s = plan.state
    if (s === 'ok') return null
    if (s === 'pool') return { out: true, text: t('workDashboard.meters.state.pool') }
    if (s === 'ceiling') return { out: true, text: t('workDashboard.meters.state.ceiling', { company: companyName || t('workDashboard.plan.yourCompany') }) }
    if (s === 'exhausted') return { out: true, text: plan.isCompany ? t('workDashboard.meters.state.exhaustedCompany', { date: renewLabel }) : t('workDashboard.meters.state.exhausted', { date: renewLabel }), buy: true, upgrade: true }
    if (s === 'low') return { out: false, text: plan.isCompany ? t('workDashboard.meters.state.lowCompany', { time: timeLeft }) : t('workDashboard.meters.state.low', { time: timeLeft }), buy: true }
    if (s === 'tasksFull') {
      return openMode
        ? { out: false, text: t('workDashboard.meters.state.tasksFull', { max: tasks.max }), tasks: true }
        : { out: false, text: t('workDashboard.meters.state.tasksLimit', { cap: tasks ? tasks.max : 0, reset: tasks ? tasks.resetLabel : '' }) }
    }
    return null
  })()
  const bannerActs = banner && ((banner.buy && canBuy) || (banner.upgrade && canUpgrade) || banner.tasks)

  return (
    <section className="wd-pm" aria-label={t('workDashboard.meters.heading')}>
      <style>{PLAN_METERS_CSS}</style>
      {head}
      <div className="wd-pm-grid">{hoursTile}{secondTile}{tasksTile}</div>
      {banner && (
        <div className={`wd-pm-state${banner.out ? ' out' : ''}`} role="status">
          <div className="wd-pm-state-t"><AlertTriangle size={15} /> <span>{banner.text}</span></div>
          {bannerActs && (
            <div className="wd-pm-state-acts">
              {banner.buy && canBuy && <button type="button" className="wd-pm-state-act" onClick={onBuyHours}><Plus size={13} /> {t('workDashboard.meters.state.buy')}</button>}
              {banner.upgrade && canUpgrade && <a className="wd-pm-state-act ghost" href={upgradeHref || '/workcopilot/pricing'}><Sparkles size={13} /> {t('workDashboard.meters.state.upgrade')}</a>}
              {banner.tasks && <Link className="wd-pm-state-act ghost" to="/work/tasks"><ListChecks size={13} /> {t('workDashboard.meters.state.tasks')}</Link>}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
