// Dashboard MONTH VIEW: guided time per day as thin columns, tasks started as a
// dot strip under them (one dot per task, so a count is never read off a second
// y-scale), one shared x axis across the last 31 days, with the month boundary
// marked so the plan's monthly hours have a visible period. Data comes from
// GET /api/work/usage/history?days=31 ({ days: [{ day, seconds, tasks }] },
// oldest first). Honest labels: time is counted only while WorkCoPilot is
// actively guiding; a day with nothing shows nothing.
//
// Interaction: hover or tap a day for its readout, or focus the plot and use the
// arrow keys (the readout is also announced); a table twin lists the active
// days so every value is reachable without a pointer. States: skeleton on first
// load, the previous render held at reduced opacity on a refresh, an honest
// empty frame, and a load error with Retry. Styles: monthGraph.css.js.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BarChart3, AlertTriangle, ChevronRight, Table2 } from 'lucide-react'
import { api } from '../../api.js'
import { useLocale } from '../../i18n/index.jsx'
import { fmtDuration } from './planModel.js'
import { MONTH_GRAPH_CSS } from './monthGraph.css.js'

const DAYS = 31
const PAD_L = 46, PAD_R = 8, PAD_T = 12
const BARS_H = 118, GAP_H = 12, AXIS_H = 24
const PIP = 9, DOT_R = 3.5, MAX_DOTS = 8
const STEPS = [15 * 60, 30 * 60, 3600, 2 * 3600, 4 * 3600, 8 * 3600, 16 * 3600]

const dayDate = (key) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(key || ''))
  return m ? new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12)) : null
}
function fmtDay(key, tag, opts) {
  const d = dayDate(key)
  if (!d) return String(key || '')
  try { return new Intl.DateTimeFormat(tag || undefined, { timeZone: 'UTC', ...opts }).format(d) } catch { return String(key) }
}
// A clean y scale: the smallest step that keeps the ticks at four or fewer.
function yScale(maxSec) {
  for (const step of STEPS) { const n = Math.ceil(maxSec / step); if (n <= 4) return { step, top: Math.max(step, n * step) } }
  const step = STEPS[STEPS.length - 1]
  return { step, top: Math.ceil(maxSec / step) * step }
}
// A column with a 4px rounded data-end and a square baseline.
function barPath(x, y, w, h) {
  const r = Math.min(4, w / 2, h)
  if (h <= 0) return ''
  return `M${x},${y + h} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + w - r},${y} Q${x + w},${y} ${x + w},${y + r} L${x + w},${y + h} Z`
}

export default function MonthGraph({ refreshKey }) {
  const { t, tag } = useLocale()
  const units = { h: t('workShell.plan.unitH'), min: t('workShell.plan.unitMin') }
  const [days, setDays] = useState(null)        // null until the first load lands
  const [status, setStatus] = useState('loading') // loading | ok | refresh | error
  const [active, setActive] = useState(null)
  const [table, setTable] = useState(false)
  const [width, setWidth] = useState(600)
  const wrapRef = useRef(null)
  const keyRef = useRef(refreshKey)

  const load = useCallback(() => {
    setStatus((s) => (s === 'ok' || s === 'refresh' ? 'refresh' : 'loading'))
    api.workUsageHistory(DAYS)
      .then((r) => {
        const list = Array.isArray(r && r.days) ? r.days : []
        setDays(list.slice(-DAYS).map((d) => ({ day: String((d && d.day) || ''), seconds: Math.max(0, Number((d && d.seconds) || 0)), tasks: Math.max(0, Math.round(Number((d && d.tasks) || 0))) })))
        setStatus('ok')
      })
      .catch(() => setStatus('error'))
  }, [])
  useEffect(() => { load() }, [load])
  // A later change of the refresh key (the shell re-read usage) re-reads the
  // history too, holding the previous render; the key's first arrival after a
  // mount is not a change in the data, so it is skipped.
  useEffect(() => {
    const prev = keyRef.current
    keyRef.current = refreshKey
    if (prev !== undefined && refreshKey !== prev) load()
  }, [load, refreshKey])

  // Measure the wrapper so labels stay real pixels at every width.
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return undefined
    const read = () => { const w = el.clientWidth; if (w > 0) setWidth(w) }
    read()
    if (typeof ResizeObserver === 'undefined') { window.addEventListener('resize', read); return () => window.removeEventListener('resize', read) }
    const ro = new ResizeObserver(read); ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const model = useMemo(() => {
    const list = days || []
    const maxSec = list.reduce((m, d) => Math.max(m, d.seconds), 0)
    const maxTasks = list.reduce((m, d) => Math.max(m, d.tasks), 0)
    const { step, top } = yScale(maxSec)
    const dotsH = Math.max(1, Math.min(MAX_DOTS, maxTasks)) * PIP + 4
    const dotsTop = PAD_T + BARS_H + GAP_H
    const axisY = dotsTop + dotsH
    const height = axisY + AXIS_H
    const sw = Math.max(4, (width - PAD_L - PAD_R) / DAYS)
    const bw = Math.max(3, Math.min(24, Math.floor(sw * 0.62)))
    const slotX = (i) => PAD_L + i * sw
    const totalSec = list.reduce((s, d) => s + d.seconds, 0)
    const totalTasks = list.reduce((s, d) => s + d.tasks, 0)
    let busiest = null
    for (const d of list) if (d.seconds > 0 && (!busiest || d.seconds > busiest.seconds)) busiest = d
    // x labels: first day, each month start (with a divider), the last day as "Today".
    const labels = []
    const minGap = Math.ceil(48 / sw)
    list.forEach((d, i) => {
      if (i === 0) labels.push({ i, text: fmtDay(d.day, tag, { month: 'short', day: 'numeric' }), anchor: 'start', rule: false })
      else if (/-01$/.test(d.day)) labels.push({ i, text: fmtDay(d.day, tag, { month: 'short', day: 'numeric' }), anchor: 'middle', rule: true })
    })
    if (list.length) labels.push({ i: list.length - 1, text: t('workDashboard.month.today'), anchor: 'end', rule: false })
    // Drop a label's text (never its rule) when it would collide with a neighbor.
    const placed = []
    for (const l of labels) {
      const prev = placed[placed.length - 1]
      if (prev && l.i - prev.i < minGap) { if (l.i === list.length - 1) { prev.text = ''; placed.push(l) } else placed.push({ ...l, text: '' }) } else placed.push({ ...l })
    }
    return { list, maxSec, maxTasks, step, top, dotsH, dotsTop, axisY, height, sw, bw, slotX, totalSec, totalTasks, busiest, labels: placed }
  }, [days, width, tag, t])

  const readout = (d) => ({
    date: fmtDay(d.day, tag, { weekday: 'short', month: 'short', day: 'numeric' }),
    time: fmtDuration(d.seconds, units),
    tasks: t.n('workDashboard.month.tasks', d.tasks, { n: d.tasks }),
  })
  const onKey = (e) => {
    const n = model.list.length
    if (!n) return
    let next = active
    if (e.key === 'ArrowRight') next = active == null ? n - 1 : Math.min(n - 1, active + 1)
    else if (e.key === 'ArrowLeft') next = active == null ? n - 1 : Math.max(0, active - 1)
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = n - 1
    else if (e.key === 'Escape') next = null
    else return
    e.preventDefault(); setActive(next)
  }

  const empty = status === 'ok' && model.list.length > 0 && model.totalSec === 0 && model.totalTasks === 0
  const activeDay = active != null ? model.list[active] : null
  const ar = activeDay ? readout(activeDay) : null
  const summaryAria = t('workDashboard.month.aria', { total: fmtDuration(model.totalSec, units), tasks: t.n('workDashboard.month.tasks', model.totalTasks, { n: model.totalTasks }) })
  const activeRows = model.list.filter((d) => d.seconds > 0 || d.tasks > 0)

  return (
    <section className="wd-mg" aria-label={t('workDashboard.month.heading')}>
      <style>{MONTH_GRAPH_CSS}</style>
      <div className="wd-mg-head">
        <span className="wd-ic alt"><BarChart3 size={16} /></span>
        <div className="wd-mg-head-txt">
          <h2>{t('workDashboard.month.heading')}</h2>
          <p>{t('workDashboard.month.sub')}</p>
        </div>
        <div className="wd-mg-legend" aria-hidden>
          <span><i className="bar" /> {t('workDashboard.month.legendTime')}</span>
          <span><i className="dot" /> {t('workDashboard.month.legendTasks')}</span>
        </div>
      </div>

      {status === 'loading' && days == null && <div className="wd-mg-skel" aria-hidden />}
      {status === 'error' && days == null && (
        <div className="wd-mg-err" role="alert">
          <AlertTriangle size={18} />
          <div style={{ flex: '1 1 200px', minWidth: 0 }}><b>{t('workDashboard.month.errTitle')}</b>{t('workDashboard.month.errBody')}</div>
          <button type="button" className="wd-mg-tbtn" onClick={load}>{t('workDashboard.month.retry')}</button>
        </div>
      )}
      {days != null && (
        <>
          <div ref={wrapRef} className={`wd-mg-plot${status === 'refresh' ? ' refresh' : ''}`} tabIndex={0} role="img" aria-label={summaryAria} aria-describedby="wd-mg-live"
            onKeyDown={onKey} onBlur={() => setActive(null)} onPointerLeave={() => setActive(null)}>
            <svg width={width} height={model.height} viewBox={`0 0 ${width} ${model.height}`}>
              {/* y grid + ticks (hours or minutes, clean steps) */}
              {Array.from({ length: Math.round(model.top / model.step) + 1 }, (_, k) => {
                const v = k * model.step
                const y = PAD_T + BARS_H - (v / model.top) * BARS_H
                const label = v === 0 ? '0' : (model.step >= 3600 ? t('workDashboard.month.axisH', { n: v / 3600 }) : t('workDashboard.month.axisMin', { n: Math.round(v / 60) }))
                return (
                  <g key={k}>
                    <line className={v === 0 ? 'base' : 'grid'} x1={PAD_L} x2={width - PAD_R} y1={y} y2={y} />
                    <text className="tick" x={PAD_L - 8} y={y + 4} textAnchor="end">{label}</text>
                  </g>
                )
              })}
              {/* month boundary rules */}
              {model.labels.filter((l) => l.rule).map((l) => (
                <line key={'r' + l.i} className="month" x1={model.slotX(l.i)} x2={model.slotX(l.i)} y1={PAD_T} y2={model.axisY} />
              ))}
              {/* columns */}
              {model.list.map((d, i) => {
                if (d.seconds <= 0) return null
                const h = Math.max(2, (d.seconds / model.top) * BARS_H)
                const x = model.slotX(i) + (model.sw - model.bw) / 2
                return <path key={d.day} className={`bar${active == null ? '' : (active === i ? ' on' : ' dim')}`} d={barPath(x, PAD_T + BARS_H - h, model.bw, h)} />
              })}
              {/* task dots: one per task, stacked from the strip's baseline */}
              {model.list.map((d, i) => {
                if (d.tasks <= 0) return null
                const cx = model.slotX(i) + model.sw / 2
                const n = Math.min(MAX_DOTS, d.tasks)
                return (
                  <g key={'t' + d.day} className={active == null || active === i ? '' : 'dim'}>
                    {Array.from({ length: n }, (_, j) => <circle key={j} className={`dot${active == null || active === i ? '' : ' dim'}`} cx={cx} cy={model.dotsTop + model.dotsH - 4 - j * PIP - DOT_R} r={DOT_R} />)}
                    {d.tasks > MAX_DOTS && <text className="more" x={cx} y={model.dotsTop - 2} textAnchor="middle">{d.tasks}</text>}
                  </g>
                )
              })}
              {/* x labels */}
              {model.labels.filter((l) => l.text).map((l) => {
                const x = l.anchor === 'start' ? model.slotX(l.i) : l.anchor === 'end' ? model.slotX(l.i) + model.sw : model.slotX(l.i)
                return <text key={'l' + l.i} className="xl" x={x} y={model.axisY + 16} textAnchor={l.anchor}>{l.text}</text>
              })}
              {/* hit targets: the whole slot, both panels */}
              {model.list.map((d, i) => (
                <rect key={'h' + d.day} className={`hit${active === i ? ' on' : ''}`} x={model.slotX(i)} y={PAD_T} width={model.sw} height={model.axisY - PAD_T}
                  onPointerEnter={() => setActive(i)} onClick={() => setActive((a) => (a === i ? null : i))} />
              ))}
            </svg>
            {ar && (() => {
              const cx = model.slotX(active) + model.sw / 2
              const side = cx < 90 ? ' left' : (cx > width - 90 ? ' right' : '')
              return (
                <div className={`wd-mg-tip${side}`} style={{ left: cx, top: PAD_T + 2 }} role="presentation" aria-hidden>
                  <span className="d">{ar.date}</span>
                  <span className="r"><i /> <b>{ar.time}</b></span>
                  <span className="r"><i className="dot" /> <b>{ar.tasks}</b></span>
                </div>
              )
            })()}
            {empty && <div className="wd-mg-empty"><span>{t('workDashboard.month.empty')}</span></div>}
          </div>
          <div id="wd-mg-live" className="wd-sr" aria-live="polite">{ar ? t('workDashboard.month.dayAria', { date: ar.date, time: ar.time, tasks: ar.tasks }) : ''}</div>

          <div className="wd-mg-foot">
            <span>{t('workDashboard.month.total', { time: fmtDuration(model.totalSec, units) })} &middot; {t.n('workDashboard.month.tasks', model.totalTasks, { n: model.totalTasks })}</span>
            {model.busiest && <span>{t('workDashboard.month.busiest', { date: fmtDay(model.busiest.day, tag, { month: 'short', day: 'numeric' }), time: fmtDuration(model.busiest.seconds, units) })}</span>}
            <span className="sp" />
            <button type="button" className="wd-mg-tbtn" aria-expanded={table} aria-controls="wd-mg-table" onClick={() => setTable((v) => !v)}><Table2 size={14} /> {table ? t('workDashboard.month.tableHide') : t('workDashboard.month.table')} <ChevronRight className="ch" size={13} /></button>
          </div>
          {table && (
            <div id="wd-mg-table">
              {activeRows.length === 0 ? <div className="wd-mg-tnote">{t('workDashboard.month.empty')}</div> : (
                <table className="wd-mg-table">
                  <thead><tr><th>{t('workDashboard.month.colDay')}</th><th className="n">{t('workDashboard.month.colTime')}</th><th className="n">{t('workDashboard.month.colTasks')}</th></tr></thead>
                  <tbody>
                    {activeRows.map((d) => (
                      <tr key={d.day}><td>{fmtDay(d.day, tag, { weekday: 'short', month: 'short', day: 'numeric' })}</td><td className="n">{fmtDuration(d.seconds, units)}</td><td className="n">{d.tasks}</td></tr>
                    ))}
                  </tbody>
                </table>
              )}
              {activeRows.length > 0 && activeRows.length < model.list.length && <div className="wd-mg-tnote">{t('workDashboard.month.tableNote')}</div>}
            </div>
          )}
        </>
      )}
    </section>
  )
}
