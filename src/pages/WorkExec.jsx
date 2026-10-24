// ============================================================================
// WorkCoPilot - Executive Productivity Dashboard  (/work/exec)
// ----------------------------------------------------------------------------
// Gold-standard, read-only, company-scoped executive view. Live (polls every
// 45s, updates in place), white-label (company logo + name), and exportable
// (CSV / JPG / PDF).
//
// HONESTY / BUSINESS RULES (mandatory - do not relax):
//   * "Time saved" and "Value delivered ($)" are HYPOTHETICAL estimates. They
//     are always labelled "Est." and the assumptions (manual min/step at $/hr)
//     are shown. They are NEVER presented as actuals.
//   * The "$" here is the CUSTOMER'S productivity VALUE - never our AI cost.
//   * NO AI model name and NO AI/token cost appears anywhere on this page. The
//     payload carries none; none is added here.
//   * US English spelling. No em-dashes.
//
// All data comes from api.workExecProductivity(days); branding from
// api.workMyCompany(); CSV from api.workExecCsvUrl(days). Charts are inline SVG
// so they theme (light/dark) and export cleanly with no chart library.
// ============================================================================
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  CheckCircle2, Clock3, DollarSign, Gauge, Layers3, Timer, Users, Loader2,
  FileDown, ImageDown, FileSpreadsheet, Info, TrendingUp, Activity,
} from 'lucide-react'
import { api, friendlyError } from '../api.js'

const RANGES = [7, 30, 90]
const POLL_MS = 45000

// ---- small formatters ------------------------------------------------------
const nf = new Intl.NumberFormat('en-US')
const fmtInt = (n) => nf.format(Math.round(Number(n) || 0))
const fmtMoney = (n) => '$' + nf.format(Math.round(Number(n) || 0))
const fmtHours = (n) => {
  const v = Number(n) || 0
  return (Math.abs(v) >= 100 ? fmtInt(v) : v.toFixed(1)) + ' h'
}
const fmtMin = (n) => (Number(n) || 0).toFixed(1) + ' min'
const fmtTime = (iso) => { try { return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) } catch { return '' } }
const fmtDay = (d) => { try { return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) } catch { return d } }
const stamp = () => {
  const d = new Date(); const p = (x) => String(x).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`
}

// ---- resolve theme + chart colors from the app's CSS tokens ----------------
// Reading the computed tokens (rather than hard-coding) keeps the charts in
// lockstep with the app's light/dark themes AND exports the real colors (we
// pass explicit hex into the SVG so html2canvas never has to resolve var()).
function readToken(name, fallback) {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
    return v || fallback
  } catch { return fallback }
}
function useTheme() {
  const get = () => (typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'dark')
  const [dark, setDark] = useState(get)
  useEffect(() => {
    const el = document.documentElement
    const mo = new MutationObserver(() => setDark(get()))
    mo.observe(el, { attributes: true, attributeFilter: ['data-theme'] })
    return () => mo.disconnect()
  }, [])
  return dark
}
function usePalette(dark) {
  return useMemo(() => ({
    text: readToken('--text', dark ? '#e8eaf6' : '#1b2033'),
    muted: readToken('--text-muted', dark ? '#a1a7c9' : '#6b7191'),
    faint: readToken('--text-faint', dark ? '#6f76a0' : '#9aa0bd'),
    border: readToken('--border', dark ? '#262a45' : '#e7e9f2'),
    track: dark ? 'rgba(255,255,255,0.06)' : 'rgba(24,28,50,0.05)',
    surface: readToken('--surface', dark ? '#171a2e' : '#ffffff'),
    bg: readToken('--bg', dark ? '#0e1020' : '#f4f5fb'),
    brand: readToken('--brand-500', '#52a331'),
    brandDeep: readToken('--brand-700', '#3a7021'),
    teal: readToken('--accent-500', '#12b3a6'),
    // Sequential depth ramp (light -> dark = quick -> deep). Monotonic in
    // lightness; segments carry direct labels + gaps, so identity is never
    // colour-alone.
    depth: dark ? ['#9fd37e', '#57ab34', '#2f6b1c'] : ['#a7d98a', '#52a331', '#2f6b1c'],
  }), [dark])
}

// ---- container measurement (crisp SVG text at the real pixel width) --------
function useMeasure() {
  const ref = useRef(null)
  const [w, setW] = useState(680)
  useEffect(() => {
    if (!ref.current || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver((ents) => {
      const cw = ents[0]?.contentRect?.width
      if (cw && cw > 0) setW(Math.round(cw))
    })
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])
  return [ref, w]
}

// ---- shared tooltip --------------------------------------------------------
function Tip({ tip }) {
  if (!tip) return null
  return (
    <div className="wx-tip" style={{ left: tip.x, top: tip.y }} role="status">
      <span className="wx-tip-k">{tip.label}</span>
      <span className="wx-tip-v">{tip.value}</span>
    </div>
  )
}

// ---- Trend: area + line with crosshair hover -------------------------------
function TrendChart({ data, pal }) {
  const [ref, w] = useMeasure()
  const [hover, setHover] = useState(null)
  const H = 260, padL = 36, padR = 16, padT = 16, padB = 28
  const pts = Array.isArray(data) ? data : []
  const maxY = Math.max(1, ...pts.map((p) => p.count))
  const innerW = Math.max(10, w - padL - padR)
  const innerH = H - padT - padB
  const x = (i) => padL + (pts.length <= 1 ? innerW / 2 : (i / (pts.length - 1)) * innerW)
  const y = (v) => padT + innerH - (v / maxY) * innerH
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.count).toFixed(1)}`).join(' ')
  const area = pts.length ? `${line} L${x(pts.length - 1).toFixed(1)},${padT + innerH} L${x(0).toFixed(1)},${padT + innerH} Z` : ''
  const ticks = 4
  const gl = Array.from({ length: ticks + 1 }, (_, i) => Math.round((maxY / ticks) * i))
  const uid = useMemo(() => 'tr' + Math.random().toString(36).slice(2, 8), [])

  const onMove = (e) => {
    if (!pts.length) return
    const rect = e.currentTarget.getBoundingClientRect()
    const px = (e.clientX - rect.left) * (w / rect.width)
    let best = 0, bd = Infinity
    for (let i = 0; i < pts.length; i++) { const d = Math.abs(x(i) - px); if (d < bd) { bd = d; best = i } }
    setHover(best)
  }

  if (!pts.length) return <ChartEmpty label="No completed tasks in this window yet." />
  return (
    <div className="wx-chartwrap" ref={ref} onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${w} ${H}`} width="100%" height={H} role="img" aria-label="Completion trend" style={{ display: 'block' }}>
        <defs>
          <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={pal.brand} stopOpacity="0.30" />
            <stop offset="100%" stopColor={pal.brand} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {gl.map((g, i) => {
          const gy = y(g)
          return (
            <g key={i}>
              <line x1={padL} y1={gy} x2={w - padR} y2={gy} stroke={pal.border} strokeWidth="1" strokeDasharray={i === 0 ? '0' : '3 5'} opacity={i === 0 ? 0.9 : 0.6} />
              <text x={padL - 8} y={gy + 3.5} textAnchor="end" fontSize="10.5" fill={pal.faint}>{fmtInt(g)}</text>
            </g>
          )
        })}
        {area && <path d={area} fill={`url(#${uid})`} />}
        {area && <path d={line} fill="none" stroke={pal.brand} strokeWidth="2.25" strokeLinejoin="round" strokeLinecap="round" />}
        {pts.length <= 60 && pts.map((p, i) => (
          <circle key={i} cx={x(i)} cy={y(p.count)} r={hover === i ? 4.5 : 2.6} fill={pal.surface} stroke={pal.brand} strokeWidth="2" />
        ))}
        {hover != null && (
          <line x1={x(hover)} y1={padT} x2={x(hover)} y2={padT + innerH} stroke={pal.brand} strokeWidth="1" strokeDasharray="3 4" opacity="0.7" />
        )}
        {pts.map((p, i) => {
          const showLabel = pts.length <= 8 || i === 0 || i === pts.length - 1 || i === Math.floor(pts.length / 2)
          if (!showLabel) return null
          return <text key={i} x={x(i)} y={H - 9} textAnchor={i === 0 ? 'start' : i === pts.length - 1 ? 'end' : 'middle'} fontSize="10.5" fill={pal.faint}>{fmtDay(p.date)}</text>
        })}
        {/* capture layer */}
        <rect x={padL} y={padT} width={innerW} height={innerH} fill="transparent" onMouseMove={onMove} />
      </svg>
      {hover != null && pts[hover] && (
        <div className="wx-tip wx-tip-anchor" style={{ left: `${(x(hover) / w) * 100}%`, top: 8 }}>
          <span className="wx-tip-k">{fmtDay(pts[hover].date)}</span>
          <span className="wx-tip-v">{fmtInt(pts[hover].count)} completed</span>
        </div>
      )}
    </div>
  )
}

// ---- horizontal ranked bars (task types / contributors) --------------------
function RankBars({ rows, color, pal, unit = 'tasks', emptyLabel }) {
  const [tip, setTip] = useState(null)
  const list = Array.isArray(rows) ? rows : []
  const max = Math.max(1, ...list.map((r) => r.value))
  if (!list.length) return <ChartEmpty label={emptyLabel || 'Nothing to show yet.'} />
  return (
    <div className="wx-bars" onMouseLeave={() => setTip(null)}>
      {list.map((r, i) => {
        const pct = (r.value / max) * 100
        return (
          <div
            key={i}
            className="wx-bar-row"
            onMouseMove={(e) => { const host = e.currentTarget.closest('.wx-bars'); if (!host) return; const b = host.getBoundingClientRect(); setTip({ x: e.clientX - b.left + 12, y: e.clientY - b.top - 6, label: r.label, value: `${fmtInt(r.value)} ${unit}` }) }}
          >
            <div className="wx-bar-label" title={r.label}>{r.label}</div>
            <div className="wx-bar-track" style={{ background: pal.track }}>
              <div className="wx-bar-fill" style={{ width: `${Math.max(2, pct)}%`, background: color }} />
            </div>
            <div className="wx-bar-val">{fmtInt(r.value)}</div>
          </div>
        )
      })}
      <Tip tip={tip} />
    </div>
  )
}

// ---- depth: one stacked bar, sequential ramp, direct labels ----------------
function DepthBar({ depth, pal }) {
  const [tip, setTip] = useState(null)
  const segs = [
    { key: 'quick', label: 'Quick', sub: '1 to 3 steps', value: depth?.quick || 0, color: pal.depth[0] },
    { key: 'standard', label: 'Standard', sub: '4 to 7 steps', value: depth?.standard || 0, color: pal.depth[1] },
    { key: 'deep', label: 'Deep', sub: '8+ steps', value: depth?.deep || 0, color: pal.depth[2] },
  ]
  const total = segs.reduce((a, s) => a + s.value, 0)
  if (!total) return <ChartEmpty label="No completed tasks to profile yet." />
  return (
    <div className="wx-depth" onMouseLeave={() => setTip(null)}>
      <div className="wx-depth-track">
        {segs.filter((s) => s.value > 0).map((s) => (
          <div
            key={s.key}
            className="wx-depth-seg"
            style={{ flexGrow: s.value, background: s.color }}
            onMouseMove={(e) => { const b = e.currentTarget.closest('.wx-depth').getBoundingClientRect(); setTip({ x: e.clientX - b.left + 12, y: e.clientY - b.top - 6, label: `${s.label} (${s.sub})`, value: `${fmtInt(s.value)} tasks, ${Math.round((s.value / total) * 100)}%` }) }}
          >
            {(s.value / total) > 0.12 && <span className="wx-depth-pct">{Math.round((s.value / total) * 100)}%</span>}
          </div>
        ))}
      </div>
      <div className="wx-depth-legend">
        {segs.map((s) => (
          <div key={s.key} className="wx-depth-leg">
            <span className="wx-swatch" style={{ background: s.color }} />
            <span className="wx-depth-leg-l">{s.label}</span>
            <span className="wx-depth-leg-s">{s.sub}</span>
            <span className="wx-depth-leg-v">{fmtInt(s.value)}</span>
          </div>
        ))}
      </div>
      <Tip tip={tip} />
    </div>
  )
}

function ChartEmpty({ label }) {
  return <div className="wx-chart-empty"><Activity size={18} /><span>{label}</span></div>
}

// ---- KPI tile --------------------------------------------------------------
function Kpi({ icon: Icon, label, value, sub, tone, est, big }) {
  return (
    <div className={`wx-kpi${big ? ' wx-kpi-big' : ''}`} data-tone={tone || 'default'}>
      <div className="wx-kpi-top">
        <span className="wx-kpi-ico"><Icon size={big ? 18 : 16} /></span>
        <span className="wx-kpi-label">{label}</span>
        {est && <span className="wx-est" title="Hypothetical estimate, not an actual figure">Est.</span>}
      </div>
      <div className="wx-kpi-num">{value}</div>
      {sub && <div className="wx-kpi-sub">{sub}</div>}
    </div>
  )
}

// ---- card shell ------------------------------------------------------------
function Card({ title, hint, icon: Icon, children, wide }) {
  return (
    <section className={`wx-card${wide ? ' wx-card-wide' : ''}`}>
      <header className="wx-card-h">
        <div className="wx-card-title">{Icon && <Icon size={15} />}<span>{title}</span></div>
        {hint && <span className="wx-card-hint">{hint}</span>}
      </header>
      {children}
    </section>
  )
}

// ============================================================================
export default function WorkExec() {
  const dark = useTheme()
  const pal = usePalette(dark)
  const [days, setDays] = useState(30)
  const [data, setData] = useState(null)
  const [err, setErr] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [stale, setStale] = useState(false)
  const [company, setCompany] = useState(null)
  const [busy, setBusy] = useState('')          // '', 'image', 'pdf'
  const rootRef = useRef(null)
  const inFlight = useRef(false)

  // branding (best effort; page works without it)
  useEffect(() => {
    let alive = true
    api.workMyCompany().then((c) => { if (alive) setCompany(c || null) }).catch(() => {})
    return () => { alive = false }
  }, [])

  const load = useCallback(async (spin) => {
    if (inFlight.current) return
    inFlight.current = true
    if (spin) setRefreshing(true)
    try {
      const r = await api.workExecProductivity(days)
      setData(r); setErr(''); setStale(false)
    } catch (e) {
      // Keep the last good data on a transient poll failure; only hard-error
      // when we have nothing to show.
      setData((prev) => { if (!prev) setErr(friendlyError(e, 'Could not load productivity.')); else setStale(true); return prev })
    } finally {
      inFlight.current = false
      setRefreshing(false)
    }
  }, [days])

  // Live: fetch on range change, then poll in place every 45s. The poll is
  // paused while the tab is hidden (no point spending a request + a re-render on
  // a background tab); on return to the foreground we refresh once immediately.
  useEffect(() => {
    load(true)
    const id = setInterval(() => { if (typeof document === 'undefined' || document.visibilityState === 'visible') load(false) }, POLL_MS)
    const onVis = () => { if (document.visibilityState === 'visible') load(false) }
    document.addEventListener('visibilitychange', onVis)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVis) }
  }, [load])

  const companyName = (company && company.name) || 'WorkCoPilot'
  const genDate = data ? new Date(data.generatedAt).toLocaleString('en-US') : ''

  // ---- exports -------------------------------------------------------------
  const snapshot = useCallback(async () => {
    const { default: html2canvas } = await import('html2canvas')
    const node = rootRef.current
    const bg = readToken('--bg', dark ? '#0e1020' : '#f4f5fb')
    return html2canvas(node, {
      backgroundColor: bg,
      scale: Math.min(2, (window.devicePixelRatio || 1) + 0.5),
      useCORS: true,
      logging: false,
      ignoreElements: (el) => el.classList && el.classList.contains('wx-noexport'),
    })
  }, [dark])

  const triggerDownload = (url, filename) => {
    const a = document.createElement('a')
    a.href = url; a.download = filename
    document.body.appendChild(a); a.click(); a.remove()
  }

  const exportImage = useCallback(async () => {
    if (busy) return
    setBusy('image')
    try {
      const canvas = await snapshot()
      triggerDownload(canvas.toDataURL('image/jpeg', 0.95), `workcopilot-productivity-${days}d-${stamp()}.jpg`)
    } catch (e) { /* non-fatal; the page stays usable */ console.warn('Image export failed', e) }
    finally { setBusy('') }
  }, [busy, snapshot, days])

  const exportPdf = useCallback(async () => {
    if (busy) return
    setBusy('pdf')
    try {
      const [{ default: jsPDF }, canvas] = await Promise.all([import('jspdf'), snapshot()])
      const img = canvas.toDataURL('image/jpeg', 0.95)
      const pdf = new jsPDF('p', 'pt', 'a4')
      const pw = pdf.internal.pageSize.getWidth()
      const ph = pdf.internal.pageSize.getHeight()
      const margin = 28
      const top = 56
      const imgW = pw - margin * 2
      const imgH = canvas.height * (imgW / canvas.width)
      // page-1 header
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(14); pdf.setTextColor(27, 32, 51)
      pdf.text(`${companyName} - Productivity`, margin, 30)
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9); pdf.setTextColor(120, 120, 140)
      pdf.text(`Last ${days} days  |  Generated ${genDate}`, margin, 44)
      // place the (possibly tall) capture, paginating down the image
      let heightLeft = imgH
      let position = top
      pdf.addImage(img, 'JPEG', margin, position, imgW, imgH)
      heightLeft -= (ph - position)
      while (heightLeft > 0) {
        pdf.addPage()
        position = -(imgH - heightLeft)
        pdf.addImage(img, 'JPEG', margin, position, imgW, imgH)
        heightLeft -= ph
      }
      pdf.save(`workcopilot-productivity-${days}d-${stamp()}.pdf`)
    } catch (e) { console.warn('PDF export failed', e) }
    finally { setBusy('') }
  }, [busy, snapshot, days, companyName, genDate])

  // ---- states --------------------------------------------------------------
  if (err && !data) {
    return (
      <div className="wx-root"><Style />
        <div className="wx-state">
          <Info size={22} />
          <p>{err}</p>
          <button className="wx-btn" onClick={() => load(true)}>Try again</button>
        </div>
      </div>
    )
  }
  if (!data) {
    return (
      <div className="wx-root"><Style />
        <div className="wx-state"><Loader2 size={22} className="wx-spin" /><p>Loading productivity...</p></div>
      </div>
    )
  }

  const est = data.estimated || { assumptions: {}, timeSavedHours: 0, dollarsSaved: 0 }
  const assume = est.assumptions || {}
  const assumeText = `Estimated from about ${assume.manualMinPerStep ?? '-'} min/step of manual effort at ${fmtMoney(assume.laborUsdPerHour ?? 0)}/hr. Hypothetical, not an actual measured figure.`
  const empty = (data.tasksCompleted || 0) === 0

  const byType = (data.byType || []).map((t) => ({ label: t.type, value: t.count }))
  const topMembers = (data.topMembers || []).map((m) => ({ label: m.name, value: m.tasks }))

  return (
    <div className="wx-root" ref={rootRef}>
      <Style />

      {/* ------- white-label header ------- */}
      <header className="wx-head">
        <div className="wx-brand">
          {company && company.logo
            ? <img className="wx-logo" src={company.logo} alt={companyName} />
            : <span className="wx-logo wx-logo-fallback" aria-hidden="true">{companyName.slice(0, 1).toUpperCase()}</span>}
          <div className="wx-brand-txt">
            <span className="wx-brand-name">{companyName}</span>
            <h1 className="wx-title">Productivity</h1>
          </div>
        </div>

        <div className="wx-head-right">
          <div className="wx-live" title={stale ? 'Showing the last good reading; retrying' : 'Live, refreshes every 45 seconds'}>
            <span className={`wx-dot${stale ? ' wx-dot-stale' : ''}${refreshing ? ' wx-dot-busy' : ''}`} />
            <span className="wx-live-txt">{stale ? 'Reconnecting' : 'Live'}</span>
            <span className="wx-updated">Updated {fmtTime(data.generatedAt)}</span>
          </div>

          <div className="wx-range wx-noexport" role="group" aria-label="Date range">
            {RANGES.map((r) => (
              <button key={r} className={`wx-range-btn${days === r ? ' is-active' : ''}`} onClick={() => setDays(r)} aria-pressed={days === r}>{r}d</button>
            ))}
          </div>

          <div className="wx-exports wx-noexport">
            <button className="wx-btn" onClick={exportPdf} disabled={!!busy}>
              {busy === 'pdf' ? <Loader2 size={15} className="wx-spin" /> : <FileDown size={15} />}<span>PDF</span>
            </button>
            <button className="wx-btn" onClick={exportImage} disabled={!!busy}>
              {busy === 'image' ? <Loader2 size={15} className="wx-spin" /> : <ImageDown size={15} />}<span>Image</span>
            </button>
            <a className="wx-btn" href={api.workExecCsvUrl(days)} download>
              <FileSpreadsheet size={15} /><span>CSV</span>
            </a>
          </div>
        </div>
      </header>

      {empty ? (
        <div className="wx-state wx-state-empty">
          <TrendingUp size={24} />
          <p className="wx-empty-title">No completed tasks yet</p>
          <p className="wx-empty-sub">Productivity shows here as your team works. This view covers the last {days} days across {fmtInt(data.members)} {data.members === 1 ? 'member' : 'members'}.</p>
        </div>
      ) : (
        <>
          {/* ------- KPI hero row ------- */}
          <div className="wx-kpis">
            <Kpi big icon={CheckCircle2} tone="brand" label="Tasks completed" value={fmtInt(data.tasksCompleted)} sub={`${fmtInt(data.tasksInProgress)} in progress now`} />
            <Kpi big icon={Clock3} tone="brand" est label="Time saved" value={fmtHours(est.timeSavedHours)} sub="vs. doing it by hand" />
            <Kpi big icon={DollarSign} tone="teal" est label="Value delivered" value={fmtMoney(est.dollarsSaved)} sub="productivity value, not a cost" />
            <Kpi big icon={Gauge} tone="brand" label="Effectiveness" value={`${fmtInt(data.effectivenessPct)}%`} sub={`${fmtInt(data.fullyCompletedPct)}% fully completed`} />

            <Kpi icon={Layers3} label="Avg steps / task" value={fmtInt(data.avgStepsPerTask)} sub="task depth" />
            <Kpi icon={Timer} label="Avg time / task" value={fmtMin(data.avgMinutesPerTask)} sub="active minutes" />
            <Kpi icon={Users} label="Team members" value={fmtInt(data.members)} sub="in this company" />
            <Kpi icon={Activity} label="In progress" value={fmtInt(data.tasksInProgress)} sub="active right now" />
          </div>

          {/* ------- charts ------- */}
          <div className="wx-grid">
            <Card wide title="Completion trend" hint={`Last ${days} days`} icon={TrendingUp}>
              <TrendChart data={data.trend} pal={pal} />
            </Card>

            <Card title="Task types completed" hint="by category" icon={Layers3}>
              <RankBars rows={byType} color={pal.brand} pal={pal} emptyLabel="No task types yet." />
            </Card>

            <Card title="Task depth" hint="share of work by effort" icon={Gauge}>
              <DepthBar depth={data.depth} pal={pal} />
            </Card>

            <Card title="Top contributors" hint="tasks completed" icon={Users}>
              <RankBars rows={topMembers} color={pal.teal} pal={pal} emptyLabel="No contributors yet." />
            </Card>

            <Card title="Estimated impact" hint="hypothetical" icon={DollarSign}>
              <div className="wx-impact">
                <div className="wx-impact-row">
                  <span className="wx-impact-l"><Clock3 size={15} /> Time saved <span className="wx-est">Est.</span></span>
                  <span className="wx-impact-v">{fmtHours(est.timeSavedHours)}</span>
                </div>
                <div className="wx-impact-row">
                  <span className="wx-impact-l"><DollarSign size={15} /> Value delivered <span className="wx-est">Est.</span></span>
                  <span className="wx-impact-v">{fmtMoney(est.dollarsSaved)}</span>
                </div>
                <p className="wx-impact-note"><Info size={13} /> {assumeText}</p>
              </div>
            </Card>
          </div>

          {/* ------- accessible data table (also the honest, exact numbers) ------- */}
          <details className="wx-data">
            <summary>View the numbers</summary>
            <div className="wx-data-grid">
              <table className="wx-table">
                <caption>Summary, last {days} days</caption>
                <tbody>
                  <tr><th>Members</th><td>{fmtInt(data.members)}</td></tr>
                  <tr><th>Tasks completed</th><td>{fmtInt(data.tasksCompleted)}</td></tr>
                  <tr><th>Tasks in progress</th><td>{fmtInt(data.tasksInProgress)}</td></tr>
                  <tr><th>Avg steps / task</th><td>{fmtInt(data.avgStepsPerTask)}</td></tr>
                  <tr><th>Avg time / task</th><td>{fmtMin(data.avgMinutesPerTask)}</td></tr>
                  <tr><th>Effectiveness</th><td>{fmtInt(data.effectivenessPct)}%</td></tr>
                  <tr><th>Fully completed</th><td>{fmtInt(data.fullyCompletedPct)}%</td></tr>
                  <tr><th>Time saved (est.)</th><td>{fmtHours(est.timeSavedHours)}</td></tr>
                  <tr><th>Value delivered (est.)</th><td>{fmtMoney(est.dollarsSaved)}</td></tr>
                </tbody>
              </table>
              <table className="wx-table">
                <caption>Task types</caption>
                <tbody>{byType.length ? byType.map((t, i) => <tr key={i}><th>{t.label}</th><td>{fmtInt(t.value)}</td></tr>) : <tr><td colSpan={2}>No data</td></tr>}</tbody>
              </table>
              <table className="wx-table">
                <caption>Top contributors</caption>
                <tbody>{topMembers.length ? topMembers.map((m, i) => <tr key={i}><th>{m.label}</th><td>{fmtInt(m.value)}</td></tr>) : <tr><td colSpan={2}>No data</td></tr>}</tbody>
              </table>
            </div>
          </details>
        </>
      )}

      <footer className="wx-foot">
        <Info size={13} />
        <span>Time saved and value delivered are hypothetical estimates for your own productivity, {assumeText.charAt(0).toLowerCase() + assumeText.slice(1)}</span>
      </footer>
    </div>
  )
}

// ============================================================================
// Scoped styles. Uses the app's global design tokens (light + dark) and adds a
// refined display face for the headline numbers. Everything is responsive down
// to phone width.
// ============================================================================
function Style() {
  return (
    <style>{`
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&display=swap');
.wx-root{
  --wx-display: 'Fraunces', 'Iowan Old Style', Georgia, 'Times New Roman', serif;
  --wx-sans: var(--font-sans, 'Inter', system-ui, sans-serif);
  padding: var(--sp-6, 24px) var(--sp-6, 24px) 72px;
  max-width: 1320px; margin: 0 auto;
  font-family: var(--wx-sans);
  color: var(--text); background: var(--bg);
  min-height: 100%;
}
.wx-root *{ box-sizing: border-box; }

/* header */
.wx-head{ display:flex; justify-content:space-between; align-items:flex-end; gap:20px; flex-wrap:wrap;
  padding-bottom:18px; margin-bottom:22px; border-bottom:1px solid var(--border); }
.wx-brand{ display:flex; align-items:center; gap:14px; min-width:0; }
.wx-logo{ width:46px; height:46px; border-radius:12px; object-fit:contain; background:var(--surface);
  border:1px solid var(--border); box-shadow:var(--shadow-sm); flex:0 0 auto; }
.wx-logo-fallback{ display:grid; place-items:center; font-family:var(--wx-display); font-weight:700;
  font-size:22px; color:var(--brand-600); background:var(--brand-soft); border-color:transparent; }
.wx-brand-txt{ min-width:0; }
.wx-brand-name{ display:block; font-size:12.5px; font-weight:600; letter-spacing:.09em; text-transform:uppercase;
  color:var(--text-muted); }
.wx-title{ margin:1px 0 0; font-family:var(--wx-display); font-weight:600; font-size:32px; line-height:1.05;
  letter-spacing:-.015em; color:var(--text); }
.wx-head-right{ display:flex; align-items:center; gap:14px; flex-wrap:wrap; }

.wx-live{ display:flex; align-items:center; gap:8px; font-size:12.5px; color:var(--text-muted); }
.wx-dot{ width:8px; height:8px; border-radius:50%; background:var(--success); position:relative; }
.wx-dot::after{ content:''; position:absolute; inset:-4px; border-radius:50%; background:var(--success);
  opacity:.4; animation:wxpulse 2s ease-out infinite; }
.wx-dot-busy::after{ animation-duration:.9s; }
.wx-dot-stale{ background:var(--warning); } .wx-dot-stale::after{ background:var(--warning); }
.wx-live-txt{ font-weight:600; color:var(--text); }
.wx-updated{ color:var(--text-faint); }
@keyframes wxpulse{ 0%{ transform:scale(1); opacity:.5;} 100%{ transform:scale(2.6); opacity:0;} }

.wx-range{ display:inline-flex; background:var(--surface-2); border:1px solid var(--border); border-radius:var(--r-full);
  padding:3px; gap:2px; }
.wx-range-btn{ border:0; background:transparent; color:var(--text-muted); font:inherit; font-size:13px; font-weight:600;
  padding:6px 13px; border-radius:var(--r-full); cursor:pointer; transition:all var(--dur) var(--ease); }
.wx-range-btn:hover{ color:var(--text); }
.wx-range-btn.is-active{ background:var(--surface); color:var(--brand-600); box-shadow:var(--shadow-sm); }
[data-theme='dark'] .wx-range-btn.is-active{ color:#9fd37e; }

.wx-exports{ display:flex; gap:8px; }
.wx-btn{ display:inline-flex; align-items:center; gap:7px; font:inherit; font-size:13px; font-weight:600;
  color:var(--text); background:var(--surface); border:1px solid var(--border); border-radius:var(--r-sm);
  padding:8px 13px; cursor:pointer; text-decoration:none; transition:all var(--dur) var(--ease); white-space:nowrap; }
.wx-btn:hover{ border-color:var(--border-strong); box-shadow:var(--shadow-sm); transform:translateY(-1px); }
.wx-btn:disabled{ opacity:.55; cursor:default; transform:none; }

/* kpis */
.wx-kpis{ display:grid; grid-template-columns:repeat(4, 1fr); gap:14px; margin-bottom:16px; }
.wx-kpi{ background:var(--surface); border:1px solid var(--border); border-radius:var(--r-lg);
  padding:16px 18px; box-shadow:var(--shadow-sm); position:relative; overflow:hidden;
  animation:wxrise .5s var(--ease) both; }
.wx-kpi-big{ padding:20px; }
.wx-kpi-big::before{ content:''; position:absolute; inset:0 0 auto 0; height:3px;
  background:linear-gradient(90deg, var(--brand-500), transparent); opacity:.9; }
.wx-kpi-big[data-tone='teal']::before{ background:linear-gradient(90deg, var(--accent-500), transparent); }
.wx-kpi-top{ display:flex; align-items:center; gap:8px; margin-bottom:10px; }
.wx-kpi-ico{ display:grid; place-items:center; width:28px; height:28px; border-radius:8px;
  background:var(--brand-soft); color:var(--brand-600); flex:0 0 auto; }
.wx-kpi[data-tone='teal'] .wx-kpi-ico{ background:var(--accent-soft); color:var(--accent-500); }
[data-theme='dark'] .wx-kpi-ico{ color:#9fd37e; }
.wx-kpi-label{ font-size:12.5px; font-weight:600; color:var(--text-muted); letter-spacing:.01em; }
.wx-kpi-num{ font-family:var(--wx-display); font-weight:600; letter-spacing:-.02em; color:var(--text);
  font-size:26px; line-height:1; font-variant-numeric:tabular-nums; }
.wx-kpi-big .wx-kpi-num{ font-size:38px; }
.wx-kpi-sub{ margin-top:7px; font-size:12px; color:var(--text-faint); }
.wx-est{ font-size:10px; font-weight:700; letter-spacing:.05em; text-transform:uppercase; color:var(--warning);
  background:var(--warning-soft); padding:2px 6px; border-radius:var(--r-full); margin-left:auto; }

/* chart grid */
.wx-grid{ display:grid; grid-template-columns:repeat(2, 1fr); gap:14px; }
.wx-card{ background:var(--surface); border:1px solid var(--border); border-radius:var(--r-lg);
  padding:18px; box-shadow:var(--shadow-sm); animation:wxrise .55s var(--ease) both; min-width:0; }
.wx-card-wide{ grid-column:1 / -1; }
.wx-card-h{ display:flex; justify-content:space-between; align-items:baseline; gap:10px; margin-bottom:14px; }
.wx-card-title{ display:flex; align-items:center; gap:8px; font-family:var(--wx-display); font-weight:600;
  font-size:16.5px; letter-spacing:-.01em; color:var(--text); }
.wx-card-title svg{ color:var(--brand-500); }
.wx-card-hint{ font-size:11.5px; font-weight:600; letter-spacing:.06em; text-transform:uppercase; color:var(--text-faint); }

.wx-chartwrap{ position:relative; }
.wx-chart-empty{ display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px;
  height:180px; color:var(--text-faint); font-size:13px; text-align:center; }
.wx-chart-empty svg{ opacity:.6; }

/* ranked bars */
.wx-bars{ display:flex; flex-direction:column; gap:12px; position:relative; }
.wx-bar-row{ display:grid; grid-template-columns:minmax(70px,34%) 1fr auto; align-items:center; gap:12px; cursor:default; }
.wx-bar-label{ font-size:13px; color:var(--text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.wx-bar-track{ height:12px; border-radius:var(--r-full); overflow:hidden; }
.wx-bar-fill{ height:100%; border-radius:var(--r-full); transition:width .6s var(--ease); min-width:4px; }
.wx-bar-row:hover .wx-bar-fill{ filter:brightness(1.07); }
.wx-bar-val{ font-size:13px; font-weight:700; color:var(--text); font-variant-numeric:tabular-nums; min-width:28px; text-align:right; }

/* depth */
.wx-depth{ position:relative; }
.wx-depth-track{ display:flex; height:40px; border-radius:var(--r-md); overflow:hidden; gap:2px; background:var(--bg); }
.wx-depth-seg{ display:grid; place-items:center; min-width:3px; transition:flex-grow .6s var(--ease); cursor:default; }
.wx-depth-seg:hover{ filter:brightness(1.06); }
.wx-depth-pct{ font-size:12px; font-weight:700; color:#0d1a06; font-variant-numeric:tabular-nums; }
.wx-depth-legend{ display:flex; flex-direction:column; gap:9px; margin-top:16px; }
.wx-depth-leg{ display:flex; align-items:center; gap:9px; font-size:13px; }
.wx-swatch{ width:11px; height:11px; border-radius:3px; flex:0 0 auto; }
.wx-depth-leg-l{ font-weight:600; color:var(--text); }
.wx-depth-leg-s{ color:var(--text-faint); font-size:12px; }
.wx-depth-leg-v{ margin-left:auto; font-weight:700; color:var(--text); font-variant-numeric:tabular-nums; }

/* estimated impact card */
.wx-impact{ display:flex; flex-direction:column; gap:12px; }
.wx-impact-row{ display:flex; justify-content:space-between; align-items:center;
  padding:12px 14px; background:var(--surface-2); border-radius:var(--r-md); }
.wx-impact-l{ display:flex; align-items:center; gap:8px; font-size:13.5px; font-weight:600; color:var(--text-muted); }
.wx-impact-l svg{ color:var(--brand-500); }
.wx-impact-v{ font-family:var(--wx-display); font-weight:600; font-size:22px; color:var(--text); font-variant-numeric:tabular-nums; }
.wx-impact-note{ display:flex; gap:7px; align-items:flex-start; margin:2px 0 0; font-size:11.5px; line-height:1.5;
  color:var(--text-faint); }
.wx-impact-note svg{ flex:0 0 auto; margin-top:1px; }

/* tooltip */
.wx-tip{ position:absolute; z-index:5; pointer-events:none; background:var(--text); color:var(--bg);
  padding:7px 10px; border-radius:var(--r-sm); box-shadow:var(--shadow-md); font-size:12px; white-space:nowrap;
  display:flex; flex-direction:column; gap:1px; transform:translate(-4px, calc(-100% - 8px)); }
.wx-tip-anchor{ transform:translateX(-50%); }
.wx-tip-k{ font-weight:600; opacity:.8; font-size:11px; }
.wx-tip-v{ font-weight:700; font-variant-numeric:tabular-nums; }

/* data table */
.wx-data{ margin-top:18px; border:1px solid var(--border); border-radius:var(--r-lg); background:var(--surface);
  box-shadow:var(--shadow-sm); overflow:hidden; }
.wx-data summary{ cursor:pointer; padding:14px 18px; font-size:13.5px; font-weight:600; color:var(--text-muted);
  list-style:none; user-select:none; }
.wx-data summary::-webkit-details-marker{ display:none; }
.wx-data summary::before{ content:'+ '; color:var(--brand-500); font-weight:700; }
.wx-data[open] summary::before{ content:'- '; }
.wx-data[open] summary{ border-bottom:1px solid var(--border); color:var(--text); }
.wx-data-grid{ display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:1px; background:var(--border); }
.wx-table{ width:100%; border-collapse:collapse; background:var(--surface); }
.wx-table caption{ text-align:left; padding:12px 16px 6px; font-size:11.5px; font-weight:700; letter-spacing:.06em;
  text-transform:uppercase; color:var(--text-faint); }
.wx-table th,.wx-table td{ padding:7px 16px; font-size:13px; text-align:left; border-top:1px solid var(--border); }
.wx-table th{ font-weight:500; color:var(--text-muted); }
.wx-table td{ font-weight:700; color:var(--text); text-align:right; font-variant-numeric:tabular-nums; }

/* footer honesty note */
.wx-foot{ display:flex; gap:8px; align-items:flex-start; margin-top:22px; padding-top:16px;
  border-top:1px solid var(--border); font-size:11.5px; line-height:1.5; color:var(--text-faint); }
.wx-foot svg{ flex:0 0 auto; margin-top:1px; }

/* states */
.wx-state{ display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px;
  min-height:300px; color:var(--text-muted); text-align:center; padding:40px; }
.wx-state svg{ color:var(--brand-500); }
.wx-state-empty{ background:var(--surface); border:1px dashed var(--border-strong); border-radius:var(--r-lg); }
.wx-empty-title{ font-family:var(--wx-display); font-size:20px; font-weight:600; color:var(--text); margin:0; }
.wx-empty-sub{ max-width:440px; margin:0; color:var(--text-faint); font-size:13.5px; line-height:1.5; }

.wx-spin{ animation:wxspin 1s linear infinite; }
@keyframes wxspin{ to{ transform:rotate(360deg); } }
@keyframes wxrise{ from{ opacity:0; transform:translateY(8px); } to{ opacity:1; transform:none; } }
.wx-kpi:nth-child(2){ animation-delay:.04s; } .wx-kpi:nth-child(3){ animation-delay:.08s; }
.wx-kpi:nth-child(4){ animation-delay:.12s; } .wx-kpi:nth-child(5){ animation-delay:.16s; }
.wx-kpi:nth-child(6){ animation-delay:.2s; } .wx-kpi:nth-child(7){ animation-delay:.24s; }
.wx-kpi:nth-child(8){ animation-delay:.28s; }

/* responsive */
@media (max-width: 960px){
  .wx-kpis{ grid-template-columns:repeat(2, 1fr); }
  .wx-grid{ grid-template-columns:1fr; }
  .wx-card-wide{ grid-column:auto; }
}
@media (max-width: 560px){
  .wx-root{ padding:16px 16px 60px; }
  .wx-head{ align-items:flex-start; }
  .wx-head-right{ width:100%; justify-content:space-between; }
  .wx-title{ font-size:26px; }
  .wx-kpi-big .wx-kpi-num{ font-size:30px; }
  .wx-exports{ flex:1; }
  .wx-btn span{ display:none; }
  .wx-btn{ padding:9px 11px; }
}
@media (prefers-reduced-motion: reduce){
  .wx-kpi,.wx-card{ animation:none; }
  .wx-dot::after{ animation:none; }
  .wx-bar-fill,.wx-depth-seg{ transition:none; }
}
    `}</style>
  )
}
