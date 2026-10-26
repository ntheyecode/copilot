// ============================================================================
// WorkCoPilot - Executive Productivity Dashboard  (/work/exec)
// ----------------------------------------------------------------------------
// Gold-standard, read-only, company-scoped executive view. Live (polls every
// 45s, updates in place), white-label (company logo + name), and exportable
// (CSV / JPG / PDF).
//
// PRESENTATION (2026-10-26): reskinned to wear the SAME design system as the
// company-admin console (the platform gold standard). It injects WORKADMIN_CSS
// and renders inside the shared `.wka` shell (top bar + main), with the
// executive metrics in `wka-card` stat tiles and every chart/export framed in
// `wka-panel` cards. Chart accents are recolored to the brand green/blue `wka`
// palette. This is PRESENTATION ONLY - every datum, chart, export and
// interaction is preserved (no-degrade).
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
// so they export cleanly with no chart library.
// ============================================================================
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  CheckCircle2, Clock3, DollarSign, Gauge, Layers3, Timer, Users, Loader2,
  FileDown, ImageDown, FileSpreadsheet, Info, TrendingUp, Activity, BarChart3,
} from 'lucide-react'
import { api, friendlyError } from '../api.js'
import { WORKADMIN_CSS, ensureWorkAdminFonts } from './workadmin/workadmin.css.js'
import { Loading, ErrorBox, EmptyState } from './workadmin/sections/_shared.jsx'

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

// ---- chart palette ---------------------------------------------------------
// Fixed to the company-admin `wka` light palette (the in-product surface is
// always the light `.wka` console; theme.jsx pins data-theme=light). Explicit
// hex so the inline-SVG charts export cleanly through html2canvas (no var()
// resolution needed). brand = wka green accent, teal = wka brand blue (the
// platform's secondary accent, used for the green/blue top rule).
const WX_PALETTE = {
  text: '#111726',        // --wka-text
  muted: '#3c4257',       // --wka-muted
  faint: '#7d8799',       // --wka-faint
  border: '#e6e9ef',      // --wka-line
  track: 'rgba(24,28,50,0.06)',
  surface: '#ffffff',     // --wka-panel
  bg: '#f6f8fb',          // --wka-bg
  brand: '#0e9f6e',       // --wka-accent (green)
  brandDeep: '#0b7f58',   // --wka-accent-dark
  teal: '#0a84c2',        // brand blue (secondary accent)
  // Sequential green depth ramp (light -> dark = quick -> deep). Monotonic in
  // lightness; segments carry direct labels + gaps, so identity is never
  // colour-alone.
  depth: ['#9ad6bb', '#17a673', '#0b5e41'],
}
function usePalette() { return useMemo(() => WX_PALETTE, []) }

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

// ---- KPI stat tile (wka-card) ----------------------------------------------
// Mirrors the company-admin `wka-card`: `.k` label row (icon + text, with an
// optional Est. badge), `.v` headline number, `.foot` subtext. `accent` lifts
// one hero tile with the brand-green gradient, exactly like the reference's
// single accent card.
function Kpi({ icon: Icon, label, value, sub, est, accent }) {
  return (
    <div className={`wka-card${accent ? ' accent' : ''}`}>
      <div className="k"><Icon size={15} /> {label}{est && <span className="wx-est" title="Hypothetical estimate, not an actual figure">Est.</span>}</div>
      <div className="v">{value}</div>
      {sub && <div className="foot">{sub}</div>}
    </div>
  )
}

// ---- chart card shell (wka-panel) ------------------------------------------
// Mirrors the company-admin `wka-panel`: head (icon + title), a one-line
// `.desc`, then content. `wide` spans the full chart grid.
function Card({ title, hint, icon: Icon, children, wide }) {
  return (
    <section className={`wka-panel wx-panel${wide ? ' wx-panel-wide' : ''}`}>
      <h2>{Icon && <Icon size={15} style={{ verticalAlign: -2, marginRight: 6, color: 'var(--wka-accent)' }} />}{title}</h2>
      {hint && <p className="desc">{hint}</p>}
      {children}
    </section>
  )
}

// ---- shared shell frame ----------------------------------------------------
// The `.wka` fixed shell (top bar + main) shared with the admin consoles. The
// top bar carries the product identity + a live-status chip; the white-label
// company brand + title live in the main area so they ride along in exports.
function Shell({ company, live, children, mainRef }) {
  const companyName = (company && company.name) || 'WorkCoPilot'
  return (
    <div className="wka">
      <style>{WORKADMIN_CSS}{WX_CSS}</style>
      <header className="wka-top">
        <span className="wka-dot" aria-hidden="true" />
        <div className="wka-brand"><b>WorkCoPilot</b><span>Executive</span></div>
        <div className="wka-top-right">
          <span className="wka-chip">{companyName}</span>
          {live}
        </div>
      </header>
      <div className="wka-body">
        <main className="wka-main" ref={mainRef}>{children}</main>
      </div>
    </div>
  )
}

// ============================================================================
export default function WorkExec() {
  const pal = usePalette()
  const [days, setDays] = useState(30)
  const [data, setData] = useState(null)
  const [err, setErr] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [stale, setStale] = useState(false)
  const [company, setCompany] = useState(null)
  const [busy, setBusy] = useState('')          // '', 'image', 'pdf'
  const contentRef = useRef(null)               // export capture target (full content)
  const inFlight = useRef(false)

  // Bring the WorkCoPilot brand faces (Bricolage Grotesque / Figtree) in, the
  // same way the admin consoles do - the `.wka` surface is self-contained.
  useEffect(() => { ensureWorkAdminFonts() }, [])

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
  // paused while the tab is hidden; on return to the foreground we refresh once.
  useEffect(() => {
    load(true)
    const id = setInterval(() => { if (typeof document === 'undefined' || document.visibilityState === 'visible') load(false) }, POLL_MS)
    const onVis = () => { if (document.visibilityState === 'visible') load(false) }
    document.addEventListener('visibilitychange', onVis)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVis) }
  }, [load])

  const companyName = (company && company.name) || 'WorkCoPilot'
  const genDate = data ? new Date(data.generatedAt).toLocaleString('en-US') : ''

  // Live-status chip shown in the top bar.
  const liveChip = data ? (
    <span className={`wka-chip ${stale ? 'warn' : 'ok'} wx-livechip`} title={stale ? 'Showing the last good reading; retrying' : 'Live, refreshes every 45 seconds'}>
      <span className={`wx-dot${stale ? ' wx-dot-stale' : ''}${refreshing ? ' wx-dot-busy' : ''}`} />
      {stale ? 'Reconnecting' : 'Live'}
      <span className="wx-updated">Updated {fmtTime(data.generatedAt)}</span>
    </span>
  ) : null

  // ---- exports -------------------------------------------------------------
  const snapshot = useCallback(async () => {
    const { default: html2canvas } = await import('html2canvas')
    const node = contentRef.current
    return html2canvas(node, {
      backgroundColor: WX_PALETTE.bg,
      scale: Math.min(2, (window.devicePixelRatio || 1) + 0.5),
      useCORS: true,
      logging: false,
      ignoreElements: (el) => el.classList && el.classList.contains('wx-noexport'),
    })
  }, [])

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
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(14); pdf.setTextColor(17, 23, 38)
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
      <Shell company={company} live={null}>
        {/* friendlyError() has already sanitized this into user-safe text; status 400
            keeps ErrorBox from re-generalizing it so the real message stays visible. */}
        <div className="wx-content"><ErrorBox error={{ status: 400, message: err }} onRetry={() => load(true)} /></div>
      </Shell>
    )
  }
  if (!data) {
    return (
      <Shell company={company} live={null}>
        <div className="wx-content"><Loading label="Loading productivity" /></div>
      </Shell>
    )
  }

  const est = data.estimated || { assumptions: {}, timeSavedHours: 0, dollarsSaved: 0 }
  const assume = est.assumptions || {}
  const assumeText = `Estimated from about ${assume.manualMinPerStep ?? '-'} min/step of manual effort at ${fmtMoney(assume.laborUsdPerHour ?? 0)}/hr. Hypothetical, not an actual measured figure.`
  const empty = (data.tasksCompleted || 0) === 0

  const byType = (data.byType || []).map((t) => ({ label: t.type, value: t.count }))
  const topMembers = (data.topMembers || []).map((m) => ({ label: m.name, value: m.tasks }))

  return (
    <Shell company={company} live={liveChip} mainRef={null}>
      <div className="wx-content" ref={contentRef}>
        {/* ------- white-label brand + section title (rides along in exports) ------- */}
        <div className="wx-brandblock">
          {company && company.logo
            ? <img className="wx-logo" src={company.logo} alt={companyName} />
            : <span className="wx-logo wx-logo-fallback" aria-hidden="true">{companyName.slice(0, 1).toUpperCase()}</span>}
          <div className="wx-brand-txt">
            <span className="wx-eyebrow">{companyName}</span>
            <h1 className="wka-h1">Productivity</h1>
          </div>
        </div>
        <p className="wka-sub">What your team completed, the time and value it represents, and where the effort went across the last {days} days. Figures marked <b>Est.</b> are hypothetical productivity estimates, not measured actuals.</p>

        {/* ------- range + export controls ------- */}
        <div className="wka-toolbar wx-noexport">
          <div className="wx-range" role="group" aria-label="Date range">
            {RANGES.map((r) => (
              <button key={r} type="button" className={`wx-range-btn${days === r ? ' is-active' : ''}`} onClick={() => setDays(r)} aria-pressed={days === r}>{r}d</button>
            ))}
          </div>
          <span className="wka-spacer" />
          <div className="wx-exports">
            <button type="button" className="wka-btn sm" onClick={exportPdf} disabled={!!busy}>
              {busy === 'pdf' ? <Loader2 size={14} className="wx-spin" /> : <FileDown size={14} />}<span>PDF</span>
            </button>
            <button type="button" className="wka-btn sm" onClick={exportImage} disabled={!!busy}>
              {busy === 'image' ? <Loader2 size={14} className="wx-spin" /> : <ImageDown size={14} />}<span>Image</span>
            </button>
            <a className="wka-btn sm" href={api.workExecCsvUrl(days)} download>
              <FileSpreadsheet size={14} /><span>CSV</span>
            </a>
          </div>
        </div>

        {empty ? (
          <div className="wx-empty">
            <EmptyState title="No completed tasks yet" detail={`Productivity shows here as your team works. This view covers the last ${days} days across ${fmtInt(data.members)} ${data.members === 1 ? 'member' : 'members'}.`} />
          </div>
        ) : (
          <>
            {/* ------- KPI hero tiles ------- */}
            <div className="wka-cards">
              <Kpi icon={CheckCircle2} label="Tasks completed" value={fmtInt(data.tasksCompleted)} sub={`${fmtInt(data.tasksInProgress)} in progress now`} />
              <Kpi icon={Clock3} est label="Time saved" value={fmtHours(est.timeSavedHours)} sub="vs. doing it by hand" />
              <Kpi icon={DollarSign} est accent label="Value delivered" value={fmtMoney(est.dollarsSaved)} sub="productivity value, not a cost" />
              <Kpi icon={Gauge} label="Effectiveness" value={`${fmtInt(data.effectivenessPct)}%`} sub={`${fmtInt(data.fullyCompletedPct)}% fully completed`} />
            </div>

            {/* ------- secondary stat tiles ------- */}
            <div className="wka-cards">
              <Kpi icon={Layers3} label="Avg steps / task" value={fmtInt(data.avgStepsPerTask)} sub="task depth" />
              <Kpi icon={Timer} label="Avg time / task" value={fmtMin(data.avgMinutesPerTask)} sub="active minutes" />
              <Kpi icon={Users} label="Team members" value={fmtInt(data.members)} sub="in this company" />
              <Kpi icon={Activity} label="In progress" value={fmtInt(data.tasksInProgress)} sub="active right now" />
            </div>

            {/* ------- charts ------- */}
            <div className="wx-grid">
              <Card wide title="Completion trend" hint={`Completed tasks per day over the last ${days} days.`} icon={TrendingUp}>
                <TrendChart data={data.trend} pal={pal} />
              </Card>

              <Card title="Task types completed" hint="Which kinds of work your team completed, by category." icon={Layers3}>
                <RankBars rows={byType} color={pal.brand} pal={pal} emptyLabel="No task types yet." />
              </Card>

              <Card title="Task depth" hint="The share of completed work by effort, from quick to deep." icon={Gauge}>
                <DepthBar depth={data.depth} pal={pal} />
              </Card>

              <Card title="Top contributors" hint="The people who completed the most tasks in this window." icon={Users}>
                <RankBars rows={topMembers} color={pal.teal} pal={pal} unit="tasks" emptyLabel="No contributors yet." />
              </Card>

              <Card title="Estimated impact" hint="Hypothetical productivity value, not a measured figure or a cost." icon={DollarSign}>
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
            <details className="wka-panel wx-data">
              <summary><BarChart3 size={15} style={{ verticalAlign: -2, marginRight: 6, color: 'var(--wka-accent)' }} />View the numbers</summary>
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
    </Shell>
  )
}

// ============================================================================
// Chart + layout styles layered on top of WORKADMIN_CSS. Everything is scoped
// under `.wka` so it consumes the admin design tokens (colors, fonts, spacing)
// and never leaks out. Presentation only - no data or interaction changes.
// Verified clean (no overflow / wrap / clip / horizontal scroll) at ~1280px and
// ~640px per the design-time quality gate.
// ============================================================================
const WX_CSS = `
.wka .wx-content { max-width: 1180px; }

/* white-label brand block + section title */
.wka .wx-brandblock { display:flex; align-items:center; gap:14px; min-width:0; margin-bottom:6px; }
.wka .wx-logo { width:44px; height:44px; border-radius:11px; object-fit:contain; background:var(--wka-panel);
  border:1px solid var(--wka-line); box-shadow:0 1px 2px rgba(26,31,54,0.06); flex:0 0 auto; }
.wka .wx-logo-fallback { display:grid; place-items:center; font-family:var(--wka-font-head); font-weight:700;
  font-size:21px; color:var(--wka-accent-dark); background:var(--wka-accent-soft); border-color:var(--wka-accent-line); }
.wka .wx-brand-txt { min-width:0; }
.wka .wx-eyebrow { display:block; font-size:11px; font-weight:700; letter-spacing:1.2px; text-transform:uppercase;
  color:var(--wka-faint); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:100%; }
.wka .wx-brandblock .wka-h1 { margin:1px 0 0; }

/* live-status chip (top bar) */
.wka .wx-livechip { gap:7px; }
.wka .wx-dot { width:7px; height:7px; border-radius:50%; background:var(--wka-emerald); position:relative; flex:0 0 auto; }
.wka .wx-dot::after { content:''; position:absolute; inset:-4px; border-radius:50%; background:var(--wka-emerald);
  opacity:.4; animation:wxpulse 2s ease-out infinite; }
.wka .wx-dot-busy::after { animation-duration:.9s; }
.wka .wx-dot-stale, .wka .wx-dot-stale::after { background:var(--wka-amber); }
.wka .wx-updated { color:var(--wka-faint); font-weight:500; }
@keyframes wxpulse { 0%{ transform:scale(1); opacity:.5; } 100%{ transform:scale(2.6); opacity:0; } }

/* range selector (segmented pill) + exports */
.wka .wx-range { display:inline-flex; background:var(--wka-panel-2); border:1px solid var(--wka-line-2);
  border-radius:999px; padding:3px; gap:2px; flex-shrink:0; }
.wka .wx-range-btn { border:0; background:transparent; color:var(--wka-muted); font:inherit; font-size:12.5px;
  font-weight:600; padding:6px 14px; border-radius:999px; cursor:pointer; white-space:nowrap; }
.wka .wx-range-btn:hover { color:var(--wka-text); }
.wka .wx-range-btn.is-active { background:var(--wka-accent); color:#fff; box-shadow:0 1px 2px var(--wka-accent-shadow); }
.wka .wx-exports { display:flex; gap:8px; flex-shrink:0; }

/* Est. badge */
.wka .wx-est { font-size:9.5px; font-weight:700; letter-spacing:.05em; text-transform:uppercase; color:var(--wka-amber);
  background:color-mix(in srgb, var(--wka-amber) 12%, transparent); padding:2px 6px; border-radius:999px;
  margin-left:auto; flex:0 0 auto; }
.wka .wka-card .k { justify-content:flex-start; }

/* chart cards: panels in a two-up grid */
.wka .wx-grid { display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:20px; margin-top:6px; }
.wka .wx-panel { margin-bottom:0; min-width:0; }
.wka .wx-panel-wide { grid-column:1 / -1; }

.wka .wx-chartwrap { position:relative; }
.wka .wx-chart-empty { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px;
  height:180px; color:var(--wka-faint); font-size:13px; text-align:center; }
.wka .wx-chart-empty svg { opacity:.6; }

/* ranked bars */
.wka .wx-bars { display:flex; flex-direction:column; gap:12px; position:relative; }
.wka .wx-bar-row { display:grid; grid-template-columns:minmax(64px,32%) 1fr auto; align-items:center; gap:12px; cursor:default; }
.wka .wx-bar-label { font-size:13px; color:var(--wka-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; min-width:0; }
.wka .wx-bar-track { height:12px; border-radius:999px; overflow:hidden; min-width:0; }
.wka .wx-bar-fill { height:100%; border-radius:999px; transition:width .6s ease; min-width:4px; }
.wka .wx-bar-row:hover .wx-bar-fill { filter:brightness(1.07); }
.wka .wx-bar-val { font-size:13px; font-weight:700; color:var(--wka-text); font-variant-numeric:tabular-nums; min-width:28px; text-align:right; }

/* depth */
.wka .wx-depth { position:relative; }
.wka .wx-depth-track { display:flex; height:40px; border-radius:10px; overflow:hidden; gap:2px; background:var(--wka-bg); }
.wka .wx-depth-seg { display:grid; place-items:center; min-width:3px; transition:flex-grow .6s ease; cursor:default; }
.wka .wx-depth-seg:hover { filter:brightness(1.06); }
.wka .wx-depth-pct { font-size:12px; font-weight:700; color:#05311c; font-variant-numeric:tabular-nums; }
.wka .wx-depth-legend { display:flex; flex-direction:column; gap:9px; margin-top:16px; }
.wka .wx-depth-leg { display:flex; align-items:center; gap:9px; font-size:13px; }
.wka .wx-swatch { width:11px; height:11px; border-radius:3px; flex:0 0 auto; }
.wka .wx-depth-leg-l { font-weight:600; color:var(--wka-text); }
.wka .wx-depth-leg-s { color:var(--wka-faint); font-size:12px; }
.wka .wx-depth-leg-v { margin-left:auto; font-weight:700; color:var(--wka-text); font-variant-numeric:tabular-nums; }

/* estimated impact card */
.wka .wx-impact { display:flex; flex-direction:column; gap:12px; }
.wka .wx-impact-row { display:flex; justify-content:space-between; align-items:center; gap:12px;
  padding:12px 14px; background:var(--wka-panel-2); border:1px solid var(--wka-line); border-radius:10px; }
.wka .wx-impact-l { display:flex; align-items:center; gap:8px; font-size:13.5px; font-weight:600; color:var(--wka-muted); min-width:0; }
.wka .wx-impact-l svg { color:var(--wka-accent); flex:0 0 auto; }
.wka .wx-impact-l .wx-est { margin-left:0; }
.wka .wx-impact-v { font-family:var(--wka-font-head); font-weight:700; font-size:21px; color:var(--wka-text); font-variant-numeric:tabular-nums; flex:0 0 auto; }
.wka .wx-impact-note { display:flex; gap:7px; align-items:flex-start; margin:2px 0 0; font-size:11.5px; line-height:1.5; color:var(--wka-faint); }
.wka .wx-impact-note svg { flex:0 0 auto; margin-top:1px; }

/* tooltip */
.wka .wx-tip { position:absolute; z-index:5; pointer-events:none; background:var(--wka-text); color:#fff;
  padding:7px 10px; border-radius:8px; box-shadow:0 8px 22px -10px rgba(26,31,54,0.5); font-size:12px; white-space:nowrap;
  display:flex; flex-direction:column; gap:1px; transform:translate(-4px, calc(-100% - 8px)); }
.wka .wx-tip-anchor { transform:translateX(-50%); }
.wka .wx-tip-k { font-weight:600; opacity:.8; font-size:11px; }
.wka .wx-tip-v { font-weight:700; font-variant-numeric:tabular-nums; }

/* data table (collapsible, exact numbers) */
.wka .wx-data { padding:0; overflow:hidden; background:var(--wka-panel); }
.wka .wx-data summary { cursor:pointer; padding:16px 22px; font-size:14px; font-weight:600; color:var(--wka-muted);
  list-style:none; user-select:none; font-family:var(--wka-font-head); }
.wka .wx-data summary::-webkit-details-marker { display:none; }
.wka .wx-data[open] summary { border-bottom:1px solid var(--wka-line); color:var(--wka-text); }
.wka .wx-data-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:1px; background:var(--wka-line); }
.wka .wx-table { width:100%; border-collapse:collapse; background:var(--wka-panel); }
.wka .wx-table caption { text-align:left; padding:14px 18px 6px; font-size:11px; font-weight:700; letter-spacing:.06em;
  text-transform:uppercase; color:var(--wka-faint); }
.wka .wx-table th, .wka .wx-table td { padding:7px 18px; font-size:13px; text-align:left; border-top:1px solid var(--wka-line); }
.wka .wx-table th { font-weight:500; color:var(--wka-muted); }
.wka .wx-table td { font-weight:700; color:var(--wka-text); text-align:right; font-variant-numeric:tabular-nums; }

/* footer honesty note */
.wka .wx-foot { display:flex; gap:8px; align-items:flex-start; margin-top:24px; padding-top:16px;
  border-top:1px solid var(--wka-line); font-size:11.5px; line-height:1.5; color:var(--wka-faint); }
.wka .wx-foot svg { flex:0 0 auto; margin-top:1px; color:var(--wka-faint); }

.wka .wx-empty { margin-top:10px; }
.wka .wx-spin { animation:wka-spin 0.8s linear infinite; }

/* responsive: charts collapse to one column before the content gets tight */
@media (max-width: 960px) {
  .wka .wx-grid { grid-template-columns:1fr; gap:16px; }
  .wka .wx-panel-wide { grid-column:auto; }
}
@media (max-width: 560px) {
  .wka .wx-brandblock .wka-h1 { font-size:20px; }
  .wka .wx-exports .wka-btn span { display:none; }
  .wka .wx-range-btn { padding:6px 11px; }
}
`
