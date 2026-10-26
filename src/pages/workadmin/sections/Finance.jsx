// Finance / accounting dashboard (superadmin + accounting role). Bound to
// /api/work/admin/finance/*. The gold-standard finance surface:
//   - "Revenue at a glance" narrative + week/month/quarter/year period cards
//     (unchanged, never degraded).
//   - Revenue + MRR timeseries chart by week/month/quarter/year, hand-rolled
//     inline SVG (no chart dependency): net-revenue bars + an MRR line on a
//     second axis, legend, axis labels, per-bucket hover detail, a granularity
//     switcher. Scales to its container (viewBox + width:100%), clean at wide
//     and narrow widths.
//   - The existing "Net revenue, last 12 months" mini chart (kept).
//   - A paid-users / subscriptions overview (reuses the subscribers endpoint)
//     with a cancel-subscription control.
//   - All transactions with refunds, PLUS full CRUD on MANUAL ledger entries
//     (create an adjustment, edit its note, void it). Every money / destructive
//     action is routed through the ONE shared ReasonModal (owner standing rule:
//     capture a reason + log who/what/when/why).
//
// Coded DEFENSIVELY (owner rules: never silently fail, graceful degradation):
// the timeseries + subscribers endpoints are built by the server agent and may
// 404/501 until wired - each degrades to a calm "not available yet" note in its
// own block while the rest of the dashboard keeps working. Every field may be null.
import React, { useEffect, useState, useCallback } from 'react'
import { TrendingUp, TrendingDown, RefreshCw, RotateCcw, DollarSign, Activity, CreditCard, Loader2, BarChart3, Plus, Pencil, Trash2, Ban, Users, Check, X } from 'lucide-react'
import { workAdminApi } from '../workAdminApi.js'
import { Loading, ErrorBox, EmptyState, Spinning, ReasonModal, useReasonModal, TierBadge } from './_shared.jsx'

const money = (n, cur = 'usd') => { try { return new Intl.NumberFormat('en-US', { style: 'currency', currency: (cur || 'usd').toUpperCase() }).format(Number(n) || 0) } catch { return `$${(Number(n) || 0).toFixed(2)}` } }
const pct = (cur, prev) => { if (!prev) return cur > 0 ? 100 : 0; return Math.round(((cur - prev) / Math.abs(prev)) * 100) }
// Compact axis/label money ($1.2k, $3.4M) so axis ticks never overrun the gutter.
const compact = (n) => { const v = Number(n) || 0, a = Math.abs(v), sign = v < 0 ? '-' : ''; if (a >= 1e6) return `${sign}$${(a / 1e6).toFixed(1)}M`; if (a >= 1e3) return `${sign}$${(a / 1e3).toFixed(1)}k`; return `${sign}$${Math.round(a)}` }
const KIND_LABEL = { subscription: 'Subscription', hours: 'Extra hours', images: 'Image credits', refund: 'Refund', payment: 'Payment', invoice: 'Invoice', adjustment: 'Adjustment' }
const CURRENCIES = ['usd', 'eur', 'gbp', 'cad', 'aud', 'inr']
const GRANULARITIES = [['week', 'Weekly'], ['month', 'Monthly'], ['quarter', 'Quarterly'], ['year', 'Yearly']]

// ------------------------------------------------------------------ chart ----
// Hand-rolled inline-SVG combo chart: net-revenue bars (left axis) + MRR line
// (right axis). No external dependency. Draws in a fixed viewBox coordinate
// space and is rendered at width:100%, so it scales to its container without
// clipping or horizontal scroll at any width.
function TimeseriesChart({ series }) {
  const VBW = 840, VBH = 300, padL = 54, padR = 56, padT = 18, padB = 46
  const plotW = VBW - padL - padR, plotH = VBH - padT - padB
  const n = series.length
  if (!n) {
    return <div className="wka-note" style={{ marginTop: 6 }}>No data in this range yet.</div>
  }
  const nets = series.map((s) => Number(s.netUsd != null ? s.netUsd : s.revenueUsd) || 0)
  const mrrs = series.map((s) => Number(s.mrrUsd) || 0)
  const hi = Math.max(1, ...nets, 0)
  const lo = Math.min(0, ...nets)
  const mrrHi = Math.max(1, ...mrrs)
  const band = plotW / n
  const barW = Math.min(34, Math.max(4, band * 0.55))
  const xc = (i) => padL + band * i + band / 2
  const yL = (v) => padT + plotH * (hi - v) / (hi - lo)
  const yR = (v) => padT + plotH * (1 - v / mrrHi)
  const baseY = yL(0)
  const GRID = 4
  const gridYs = Array.from({ length: GRID + 1 }, (_, k) => padT + (plotH * k) / GRID)
  // Thin x-axis labels so they never collide: aim for <= ~12 labels. The last
  // bucket always gets a label; a regular-step label too close to it is dropped
  // so the two never overlap (e.g. W51 next to W52).
  const step = Math.max(1, Math.ceil(n / 12))
  const showX = (i) => (i === n - 1) || (i % step === 0 && (n - 1 - i) >= Math.ceil(step * 0.6))
  const showValueLabels = n <= 13
  const linePts = series.map((s, i) => (s.mrrUsd == null ? null : `${xc(i).toFixed(1)},${yR(Number(s.mrrUsd) || 0).toFixed(1)}`))
  const linePath = linePts.reduce((acc, p) => {
    if (p == null) return acc
    return acc === '' ? `M${p}` : `${acc} L${p}`
  }, '')

  return (
    <div>
      <div className="fin-legend">
        <span className="it"><span className="dot bar" /> Net revenue</span>
        <span className="it"><span className="dot line" /> MRR</span>
      </div>
      <svg className="fin-svg" viewBox={`0 0 ${VBW} ${VBH}`} role="img"
        aria-label={`Net revenue and MRR across ${n} periods`} preserveAspectRatio="xMidYMid meet">
        {/* gridlines + left (net) axis labels + right (MRR) axis labels */}
        {gridYs.map((gy, k) => {
          const leftVal = hi - ((hi - lo) * k) / GRID
          const rightVal = mrrHi * (1 - k / GRID)
          return (
            <g key={k}>
              <line x1={padL} y1={gy} x2={padL + plotW} y2={gy} stroke="var(--wka-line)" strokeWidth="1" />
              <text x={padL - 7} y={gy + 3.5} textAnchor="end" fontSize="10.5" fill="var(--wka-faint)">{compact(leftVal)}</text>
              <text x={padL + plotW + 7} y={gy + 3.5} textAnchor="start" fontSize="10.5" fill="var(--wka-emerald)">{compact(rightVal)}</text>
            </g>
          )
        })}
        {/* zero baseline (only when there are negative nets) */}
        {lo < 0 ? <line x1={padL} y1={baseY} x2={padL + plotW} y2={baseY} stroke="var(--wka-line-2)" strokeWidth="1" /> : null}
        {/* bars */}
        {series.map((s, i) => {
          const v = Number(s.netUsd != null ? s.netUsd : s.revenueUsd) || 0
          const y = yL(v)
          const top = Math.min(y, baseY), h = Math.max(1, Math.abs(y - baseY))
          const x = xc(i) - barW / 2
          return (
            <g key={`b${i}`}>
              <rect className="fin-svg-bar" x={x.toFixed(1)} y={top.toFixed(1)} width={barW.toFixed(1)} height={h.toFixed(1)} rx="3" fill="var(--wka-accent)">
                <title>{`${s.label || s.bucket}
Revenue: ${money(s.revenueUsd, 'usd')}
Refunds: ${money(s.refundsUsd, 'usd')}
Net: ${money(s.netUsd != null ? s.netUsd : v, 'usd')}
MRR: ${s.mrrUsd == null ? '-' : money(s.mrrUsd, 'usd')}
New subs: ${s.newSubs == null ? '-' : s.newSubs} · Cancellations: ${s.cancellations == null ? '-' : s.cancellations}`}</title>
              </rect>
              {showValueLabels ? <text x={xc(i).toFixed(1)} y={(top - 5).toFixed(1)} textAnchor="middle" fontSize="9.5" fill="var(--wka-muted)">{compact(v)}</text> : null}
            </g>
          )
        })}
        {/* MRR line + points */}
        {linePath ? <path d={linePath} fill="none" stroke="var(--wka-emerald)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" /> : null}
        {series.map((s, i) => (s.mrrUsd == null ? null : (
          <circle key={`p${i}`} cx={xc(i).toFixed(1)} cy={yR(Number(s.mrrUsd) || 0).toFixed(1)} r="2.6" fill="var(--wka-emerald)">
            <title>{`${s.label || s.bucket} MRR: ${money(s.mrrUsd, 'usd')}`}</title>
          </circle>
        )))}
        {/* x-axis labels (thinned) */}
        {series.map((s, i) => (showX(i) ? (
          <text key={`x${i}`} x={xc(i).toFixed(1)} y={VBH - padB + 16} textAnchor="middle" fontSize="10" fill="var(--wka-faint)">{s.label || s.bucket}</text>
        ) : null))}
      </svg>
    </div>
  )
}

// Self-contained timeseries panel: owns the granularity switch + its own fetch,
// degrades gracefully if the endpoint is not wired.
function RevenueTimeseries() {
  const [granularity, setGranularity] = useState('month')
  const [st, setSt] = useState({ loading: true, error: null, unavailable: false, series: [] })

  const load = useCallback(async (g) => {
    setSt((s) => ({ ...s, loading: true, error: null }))
    try {
      const data = await workAdminApi.financeTimeseries(g)
      setSt({ loading: false, error: null, unavailable: false, series: Array.isArray(data && data.series) ? data.series : [] })
    } catch (error) {
      if (error && (error.status === 404 || error.status === 501)) setSt({ loading: false, error: null, unavailable: true, series: [] })
      else setSt({ loading: false, error, unavailable: false, series: [] })
    }
  }, [])
  useEffect(() => { load(granularity) }, [load, granularity])

  return (
    <div className="wka-panel">
      <div className="fin-tsc-head">
        <h2 style={{ margin: 0 }}><BarChart3 size={15} style={{ verticalAlign: -2, marginRight: 6 }} />Revenue and MRR over time</h2>
        <div className="fin-seg" role="group" aria-label="Chart granularity">
          {GRANULARITIES.map(([g, label]) => (
            <button key={g} type="button" className={`wka-btn sm${granularity === g ? ' primary' : ' ghost'}`}
              aria-pressed={granularity === g} onClick={() => setGranularity(g)}>{label}</button>
          ))}
        </div>
      </div>
      {st.loading ? <Loading label="Loading chart" />
        : st.error ? <ErrorBox error={st.error} onRetry={() => load(granularity)} />
          : st.unavailable ? (
            <div className="wka-note" style={{ marginTop: 6 }}>
              The revenue timeseries is not available on this server yet. The period cards and transactions below are live; this chart fills in once the endpoint is wired.
            </div>
          ) : <TimeseriesChart series={st.series} />}
    </div>
  )
}

// ---------------------------------------------------- subscriptions overview --
function SubscriptionsOverview({ onCancel }) {
  const [st, setSt] = useState({ loading: true, error: null, unavailable: false, subscribers: [], totals: null })
  const load = useCallback(async () => {
    setSt((s) => ({ ...s, loading: true, error: null }))
    try {
      const data = await workAdminApi.subscribers()
      setSt({ loading: false, error: null, unavailable: false, subscribers: Array.isArray(data && data.subscribers) ? data.subscribers : [], totals: (data && data.totals) || null })
    } catch (error) {
      if (error && (error.status === 404 || error.status === 501)) setSt({ loading: false, error: null, unavailable: true, subscribers: [], totals: null })
      else setSt({ loading: false, error, unavailable: false, subscribers: [], totals: null })
    }
  }, [])
  useEffect(() => { load() }, [load])

  const subs = st.subscribers
  const t = st.totals || {}
  const count = t.count != null ? t.count : subs.length
  const activeCount = t.activeCount != null ? t.activeCount : subs.filter((s) => s.status === 'active' || s.status === 'trialing').length
  const mrr = t.mrrUsd != null ? t.mrrUsd : subs.reduce((a, s) => a + (Number(s.mrrUsd) || 0), 0)
  // Cancellable = has a live subscription (active / trialing / past_due) and is not comped.
  const CANCELLABLE = new Set(['active', 'trialing', 'past_due'])
  const live = subs.filter((s) => CANCELLABLE.has(s.status) && !s.free).slice(0, 50)

  return (
    <div className="wka-panel">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0 }}><Users size={15} style={{ verticalAlign: -2, marginRight: 6 }} />Paid users and subscriptions</h2>
        <button type="button" className="wka-btn sm ghost" onClick={load}><RefreshCw size={13} /> Refresh</button>
      </div>
      {st.loading ? <Loading label="Loading subscriptions" />
        : st.error ? <ErrorBox error={st.error} onRetry={load} />
          : st.unavailable ? (
            <div className="wka-note" style={{ marginTop: 6 }}>The subscribers endpoint is not wired on this server yet. The paid-user overview fills in once it is live.</div>
          ) : (
            <div>
              <div className="fin-mini-tiles">
                <div className="fin-mini"><div className="l">Paying</div><div className="n wka-mono">{count}</div></div>
                <div className="fin-mini"><div className="l">Active / trialing</div><div className="n wka-mono">{activeCount}</div></div>
                <div className="fin-mini"><div className="l">MRR</div><div className="n wka-mono">{money(mrr, 'usd')}</div></div>
              </div>
              {live.length === 0 ? (
                <p style={{ color: 'var(--wka-muted)', fontSize: 13.5, marginTop: 12 }}>No live subscriptions to manage right now.</p>
              ) : (
                <div className="wka-table-wrap" style={{ marginTop: 12 }}>
                  <table className="wka-table" style={{ minWidth: 640 }}>
                    <thead><tr><th>User</th><th>Plan</th><th>Status</th><th>Cycle</th><th>MRR</th><th></th></tr></thead>
                    <tbody>
                      {live.map((s) => (
                        <tr key={s.id != null ? s.id : `${s.username}-${s.email}`}>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            <div style={{ fontWeight: 600 }}>{s.username || '-'}</div>
                            {s.email ? <div style={{ fontSize: 11, color: 'var(--wka-faint)' }}>{s.email}</div> : null}
                          </td>
                          <td>{s.plan ? <TierBadge tier={s.plan} /> : <span style={{ color: 'var(--wka-faint)' }}>-</span>}</td>
                          <td><span className={`wka-badge ${s.status === 'past_due' ? 'past_due' : s.status === 'trialing' ? 'trialing' : 'active'}`}>{s.status === 'past_due' ? 'Past due' : s.status === 'trialing' ? 'Trialing' : 'Active'}</span></td>
                          <td style={{ whiteSpace: 'nowrap' }}>{s.cycle ? (String(s.cycle).toLowerCase().startsWith('year') || String(s.cycle).toLowerCase().startsWith('annual') ? 'Annual' : 'Monthly') : '-'}</td>
                          <td className="wka-mono" style={{ whiteSpace: 'nowrap' }}>{s.mrrUsd == null ? '-' : money(s.mrrUsd, 'usd')}</td>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            {s.id != null ? (
                              <button type="button" className="wka-btn sm ghost" title="Cancel this subscription now"
                                onClick={() => onCancel(s, load)}><Ban size={13} /> Cancel sub</button>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {subs.length > live.length ? <div style={{ fontSize: 11.5, color: 'var(--wka-faint)', marginTop: 8 }}>Showing {live.length} live subscriptions. See the Subscribers tab for the full list.</div> : null}
                </div>
              )}
            </div>
          )}
    </div>
  )
}

const EMPTY_CREATE = { amount: '', currency: 'usd', description: '' }

export default function Finance({ isSuperAdmin }) {
  const [state, setState] = useState({ loading: true, error: null })
  const [sum, setSum] = useState(null)
  const [txns, setTxns] = useState([])
  const [refunding, setRefunding] = useState('')
  const [msg, setMsg] = useState(null)
  const [refundTx, setRefundTx] = useState(null)   // transaction pending refund (reason modal)
  const [refundErr, setRefundErr] = useState(null)
  // Manual ledger CRUD
  const [showCreate, setShowCreate] = useState(false)
  const [create, setCreate] = useState(EMPTY_CREATE)
  const [creating, setCreating] = useState(false)
  const [createMsg, setCreateMsg] = useState(null)
  const [editNoteId, setEditNoteId] = useState(null)
  const [editNoteVal, setEditNoteVal] = useState('')
  const [rowBusy, setRowBusy] = useState('')
  // One shared reason gate for the new money / destructive actions (create, void,
  // cancel-subscription). Refund keeps its own existing ReasonModal below.
  const [askReason, reasonNode] = useReasonModal()

  const load = useCallback(async () => {
    setState({ loading: true, error: null })
    try {
      const [s, t] = await Promise.all([workAdminApi.financeSummary(), workAdminApi.financeTransactions('limit=500')])
      setSum(s); setTxns(t.transactions || []); setState({ loading: false, error: null })
    } catch (error) { setState({ loading: false, error }) }
  }, [])
  useEffect(() => { load() }, [load])

  const flash = (ok, text) => { setMsg({ ok, text }); setTimeout(() => setMsg(null), 4500) }

  // Refunds move real money, so they go through the shared ReasonModal (owner
  // standing rule: capture a reason + log it). The reason is passed to the API.
  const confirmRefund = async (reason) => {
    const tx = refundTx
    setRefunding(tx.id); setRefundErr(null)
    try {
      const r = await workAdminApi.financeRefund(tx.id, undefined, reason)
      setRefundTx(null)
      flash(true, `Refunded ${money(r.refund.amount, r.refund.currency)}.`); await load()
    } catch (e) { setRefundErr(e) }
    finally { setRefunding('') }
  }

  // Create a manual adjustment. The amount is real money, so the submit opens the
  // shared ReasonModal to capture the audit reason before the write.
  const submitCreate = async (e) => {
    e && e.preventDefault()
    const amount = Number(create.amount)
    if (!isFinite(amount) || amount === 0) { setCreateMsg({ kind: 'err', text: 'Enter a non-zero amount (use a negative amount for a debit).' }); return }
    if ((create.description || '').trim().length < 2) { setCreateMsg({ kind: 'err', text: 'Add a short description for this entry.' }); return }
    const reason = await askReason({
      title: 'Record a manual ledger entry',
      detail: `Add a manual ${money(amount, create.currency)} adjustment to the ledger. This is recorded against the books and logged.`,
      confirmLabel: 'Record entry', danger: false, placeholder: 'Reason (recorded in the audit trail)',
    })
    if (!reason) return
    setCreating(true); setCreateMsg(null)
    try {
      await workAdminApi.createTransaction({ kind: 'adjustment', amount, currency: create.currency, description: create.description.trim(), reason })
      setCreate(EMPTY_CREATE); setShowCreate(false)
      flash(true, `Recorded ${money(amount, create.currency)} adjustment.`); await load()
    } catch (err) {
      setCreateMsg({ kind: 'err', text: err.message || 'Could not record the entry.' })
    } finally { setCreating(false) }
  }

  // Edit the note of a manual entry (not an amount) - low-risk, inline save.
  const saveNote = async (tx) => {
    setRowBusy(tx.id)
    try {
      await workAdminApi.updateTransaction(tx.id, { description: editNoteVal.trim() })
      setTxns((list) => list.map((x) => x.id === tx.id ? { ...x, description: editNoteVal.trim() } : x))
      setEditNoteId(null); setEditNoteVal(''); flash(true, 'Note updated.')
    } catch (err) { flash(false, err.message || 'Could not update the note.') }
    finally { setRowBusy('') }
  }

  // Void (delete) a manual entry - destructive, so it goes through the reason gate.
  const voidEntry = async (tx) => {
    const reason = await askReason({
      title: `Void ${money(tx.amount, tx.currency)} entry`,
      detail: `Remove this manual ledger entry (${KIND_LABEL[tx.kind] || tx.kind}). This cannot be undone.`,
      confirmLabel: 'Void entry', danger: true,
    })
    if (!reason) return
    setRowBusy(tx.id)
    try {
      await workAdminApi.deleteTransaction(tx.id, reason)
      setTxns((list) => list.filter((x) => x.id !== tx.id)); flash(true, 'Entry voided.'); await load()
    } catch (err) { flash(false, err.message || 'Could not void the entry.') }
    finally { setRowBusy('') }
  }

  // Cancel a subscription from the overview block (existing admin endpoint).
  const cancelSubscription = async (sub, reload) => {
    const reason = await askReason({
      title: `Cancel subscription for ${sub.username || 'this account'}`,
      detail: 'End this subscription now. Their access stops immediately.',
      confirmLabel: 'Cancel subscription', danger: true,
    })
    if (!reason) return
    try {
      await workAdminApi.cancelUserSubscription(sub.id, false, reason)
      flash(true, `Subscription canceled for ${sub.username || 'account'}.`)
      if (reload) await reload()
      await load()
    } catch (err) { flash(false, err.message || 'Could not cancel the subscription.') }
  }

  if (state.loading) return <Loading label="Loading finance" />
  if (state.error) return <ErrorBox error={state.error} onRetry={load} />
  if (!sum) return null
  const cur = sum.currency

  // The narrative line - the dashboard "speaking".
  const m = sum.month, mDelta = pct(m.current.net, m.previous.net)
  const narrative = `This month you have earned ${money(m.current.net, cur)} net${m.previous.net ? ` (${mDelta >= 0 ? 'up' : 'down'} ${Math.abs(mDelta)}% vs last month)` : ''}. Estimated recurring revenue is ${money(sum.mrr, cur)} across ${sum.activeSubs} active plan${sum.activeSubs === 1 ? '' : 's'}. ${sum.year.current.refunds ? `${money(sum.year.current.refunds, cur)} refunded year to date.` : 'No refunds year to date.'}`

  const maxNet = Math.max(1, ...sum.series.map((s) => Math.max(s.net, 0)))

  return (
    <div>
      <div className="wka-panel">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0 }}><DollarSign size={16} style={{ verticalAlign: -3 }} /> Revenue at a glance</h2>
          <button className="wka-btn sm ghost" onClick={load}><RefreshCw size={13} /> Refresh</button>
        </div>
        <p style={{ color: 'var(--wka-muted)', fontSize: 14, lineHeight: 1.55, margin: '8px 0 4px' }}>{narrative}</p>
      </div>

      {/* Period cards */}
      <div className="fin-grid">
        {[['This week', sum.week], ['This month', sum.month], ['This quarter', sum.quarter], ['This year', sum.year]].map(([label, p]) => {
          const d = pct(p.current.net, p.previous.net)
          return (
            <div className="fin-card" key={label}>
              <div className="fin-k">{label}</div>
              <div className="fin-v">{money(p.current.net, cur)}</div>
              <div className={`fin-delta ${d >= 0 ? 'up' : 'down'}`}>{d >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />} {Math.abs(d)}% <span>vs previous</span></div>
              <div className="fin-sub">{money(p.current.gross, cur)} gross{p.current.refunds ? ` · ${money(p.current.refunds, cur)} refunded` : ''} · {p.current.count} payment{p.current.count === 1 ? '' : 's'}</div>
            </div>
          )
        })}
      </div>

      {/* Revenue + MRR timeseries (week/month/quarter/year, inline SVG) */}
      <RevenueTimeseries />

      {/* 12-month revenue chart (kept) */}
      <div className="wka-panel">
        <h2><Activity size={15} style={{ verticalAlign: -2, marginRight: 6 }} />Net revenue, last 12 months</h2>
        <div className="fin-chart" role="img" aria-label="Monthly net revenue, last 12 months">
          {sum.series.map((s) => (
            <div className="fin-bar-wrap" key={s.month} title={`${s.month}: ${money(s.net, cur)} net`}>
              <div className="fin-bar" style={{ height: `${Math.max(2, Math.round((Math.max(s.net, 0) / maxNet) * 100))}%` }} />
              <div className="fin-bar-lab">{s.month.slice(5)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Paid users / subscriptions overview */}
      <SubscriptionsOverview onCancel={cancelSubscription} />

      {/* Transactions + manual ledger CRUD */}
      <div className="wka-panel">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0 }}><CreditCard size={15} style={{ verticalAlign: -2, marginRight: 6 }} />All transactions</h2>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, color: 'var(--wka-faint)' }}>{txns.length} shown</span>
            <button type="button" className="wka-btn sm primary" onClick={() => { setShowCreate((v) => !v); setCreateMsg(null) }}>
              <Plus size={13} /> Manual entry
            </button>
          </div>
        </div>

        {showCreate && (
          <form className="fin-create" onSubmit={submitCreate}>
            <div className="fin-create-grid">
              <div className="wka-field">
                <label>Amount <span style={{ fontWeight: 400, color: 'var(--wka-faint)' }}>(negative for a debit)</span></label>
                <input className="wka-input" type="number" step="0.01" value={create.amount}
                  onChange={(e) => setCreate((f) => ({ ...f, amount: e.target.value }))} placeholder="e.g. 49.00" />
              </div>
              <div className="wka-field">
                <label>Currency</label>
                <select className="wka-select" value={create.currency} onChange={(e) => setCreate((f) => ({ ...f, currency: e.target.value }))}>
                  {CURRENCIES.map((c) => <option key={c} value={c}>{c.toUpperCase()}</option>)}
                </select>
              </div>
              <div className="wka-field">
                <label>Kind</label>
                <input className="wka-input" value="Adjustment" disabled readOnly />
              </div>
              <div className="wka-field fin-create-desc">
                <label>Description</label>
                <input className="wka-input" value={create.description}
                  onChange={(e) => setCreate((f) => ({ ...f, description: e.target.value }))} placeholder="What this adjustment is for" />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
              <button type="submit" className="wka-btn primary" disabled={creating}>{creating ? <Spinning /> : <Plus size={14} />} Record entry</button>
              <button type="button" className="wka-btn ghost" onClick={() => { setShowCreate(false); setCreate(EMPTY_CREATE); setCreateMsg(null) }}>Cancel</button>
              {createMsg ? <span style={{ fontSize: 13, color: createMsg.kind === 'ok' ? 'var(--wka-emerald)' : 'var(--wka-red)' }}>{createMsg.text}</span> : null}
            </div>
          </form>
        )}

        {msg && <div className="wka-note" style={{ marginTop: 10, color: msg.ok ? 'var(--wka-emerald)' : 'var(--wka-red)' }}>{msg.text}</div>}
        {txns.length === 0 ? (
          <p style={{ color: 'var(--wka-muted)', fontSize: 13.5, marginTop: 10 }}>No transactions yet. They appear here as payments and refunds flow through Stripe, and whenever you record a manual entry.</p>
        ) : (
          <div className="wka-table-wrap" style={{ marginTop: 10 }}>
            <table className="wka-table" style={{ minWidth: 760 }}>
              <thead><tr><th>Date</th><th>Who</th><th>Type &amp; note</th><th>Amount</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {txns.map((t) => {
                  const isManual = t.kind === 'adjustment'
                  const editing = editNoteId === t.id
                  return (
                    <tr key={t.id}>
                      <td style={{ whiteSpace: 'nowrap', color: 'var(--wka-faint)', fontSize: 12.5 }}>{t.at ? new Date(t.at).toLocaleDateString() : '-'}</td>
                      <td>{t.username || '-'}</td>
                      <td style={{ maxWidth: 320 }}>
                        <span className={`fin-chip ${t.kind === 'refund' ? 'rf' : isManual ? 'adj' : ''}`}>{KIND_LABEL[t.kind] || t.kind}</span>
                        {t.plan ? <span style={{ fontSize: 11, color: 'var(--wka-faint)', marginLeft: 6 }}>{t.plan}</span> : null}
                        {editing ? (
                          <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', marginTop: 6, flexWrap: 'wrap' }}>
                            <input className="wka-input" style={{ padding: '6px 8px', minWidth: 160 }} value={editNoteVal} autoFocus
                              onChange={(e) => setEditNoteVal(e.target.value)} placeholder="Note" />
                            <button type="button" className="wka-btn sm primary" disabled={rowBusy === t.id} onClick={() => saveNote(t)}>{rowBusy === t.id ? <Spinning /> : <Check size={13} />} Save</button>
                            <button type="button" className="wka-btn sm ghost" onClick={() => { setEditNoteId(null); setEditNoteVal('') }}><X size={13} /></button>
                          </span>
                        ) : (
                          t.description ? <div style={{ fontSize: 11.5, color: 'var(--wka-muted)', marginTop: 3 }}>{t.description}</div> : null
                        )}
                      </td>
                      <td style={{ fontWeight: 600, whiteSpace: 'nowrap', color: (t.kind === 'refund' || Number(t.amount) < 0) ? 'var(--wka-amber)' : 'var(--wka-text)' }}>{t.kind === 'refund' ? '-' : ''}{money(t.amount, t.currency)}</td>
                      <td style={{ fontSize: 12.5, color: 'var(--wka-faint)' }}>{t.status || (isManual ? 'manual' : '-')}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {isManual ? (
                          !editing ? (
                            <span style={{ display: 'inline-flex', gap: 6 }}>
                              <button type="button" className="wka-btn sm ghost" disabled={rowBusy === t.id} title="Edit the note" onClick={() => { setEditNoteId(t.id); setEditNoteVal(t.description || '') }}><Pencil size={13} /> Note</button>
                              <button type="button" className="wka-btn sm ghost" disabled={rowBusy === t.id} title="Void this manual entry" onClick={() => voidEntry(t)} style={{ color: 'var(--wka-red)' }}>{rowBusy === t.id ? <Loader2 size={13} className="spin" /> : <Trash2 size={13} />} Void</button>
                            </span>
                          ) : null
                        ) : (t.kind !== 'refund' && t.stripeId ? (
                          <button className="wka-btn sm ghost" disabled={refunding === t.id} onClick={() => { setRefundErr(null); setRefundTx(t) }}>{refunding === t.id ? <Loader2 size={13} className="spin" /> : <RotateCcw size={13} />} Refund</button>
                        ) : null)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {refundTx ? (
        <ReasonModal
          title={`Refund ${money(refundTx.amount, refundTx.currency)}`}
          message={`Refund ${money(refundTx.amount, refundTx.currency)} to ${refundTx.username || 'this account'}. This moves real money and cannot be undone.`}
          confirmLabel="Refund"
          busy={refunding === refundTx.id} error={refundErr}
          onConfirm={confirmRefund}
          onCancel={() => { if (refunding !== refundTx.id) setRefundTx(null) }}
        />
      ) : null}
      {reasonNode}
      <style>{CSS}</style>
    </div>
  )
}

// Palette is token-only (SUPREME RULE IX unified style + SUPREME RULE II single
// source): cards, bars, chart and chips adopt the dashboard accent (blue in the
// superadmin console) and the shared emerald/amber/red, so Finance reads as one
// system with the other sections rather than its own green.
const CSS = `
.fin-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:16px}
.fin-card{background:var(--wka-panel);border:1px solid var(--wka-line);border-radius:14px;padding:16px 16px 14px;box-shadow:0 1px 2px rgba(26,31,54,0.05),0 8px 22px -14px rgba(26,31,54,0.16)}
.fin-k{font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--wka-muted)}
.fin-v{font-size:26px;font-weight:800;letter-spacing:-.02em;margin:6px 0 4px;color:var(--wka-text)}
.fin-delta{display:inline-flex;align-items:center;gap:4px;font-size:12.5px;font-weight:700}
.fin-delta.up{color:var(--wka-emerald)}.fin-delta.down{color:var(--wka-red)}
.fin-delta span{color:var(--wka-faint);font-weight:400}
.fin-sub{font-size:11.5px;color:var(--wka-faint);margin-top:7px;line-height:1.4}
.fin-chart{display:flex;align-items:flex-end;gap:8px;height:180px;margin-top:14px;padding-top:8px}
.fin-bar-wrap{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%}
.fin-bar{width:100%;max-width:38px;background:linear-gradient(180deg,var(--wka-accent),var(--wka-accent-dark));border-radius:5px 5px 0 0;min-height:2px;transition:height .3s}
.fin-bar-lab{font-size:10px;color:var(--wka-faint);margin-top:6px}
.fin-chip{display:inline-block;font-size:11.5px;font-weight:600;padding:2px 8px;border-radius:7px;background:var(--wka-accent-soft);color:var(--wka-accent-dark)}
.fin-chip.rf{background:color-mix(in srgb, var(--wka-amber) 12%, transparent);color:var(--wka-amber)}
.fin-chip.adj{background:color-mix(in srgb, var(--wka-emerald) 12%, transparent);color:var(--wka-emerald)}
/* Timeseries chart */
.fin-tsc-head{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:12px}
.fin-seg{display:inline-flex;gap:6px;flex-wrap:wrap}
.fin-legend{display:flex;gap:16px;flex-wrap:wrap;margin:2px 0 8px;font-size:12px;color:var(--wka-muted)}
.fin-legend .it{display:inline-flex;align-items:center;gap:6px}
.fin-legend .dot{width:12px;height:12px;border-radius:3px;display:inline-block}
.fin-legend .dot.bar{background:var(--wka-accent)}
.fin-legend .dot.line{background:var(--wka-emerald);border-radius:50%}
.fin-svg{display:block;width:100%;height:auto;max-width:100%}
.fin-svg-bar{transition:opacity .15s}
.fin-svg-bar:hover{opacity:.78;cursor:default}
/* Subscriptions overview mini tiles */
.fin-mini-tiles{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:12px}
.fin-mini{background:var(--wka-panel-2);border:1px solid var(--wka-line);border-radius:12px;padding:12px 14px}
.fin-mini .l{font-size:11px;font-weight:700;letter-spacing:.03em;text-transform:uppercase;color:var(--wka-muted)}
.fin-mini .n{font-size:20px;font-weight:800;margin-top:4px;color:var(--wka-text)}
/* Manual entry form */
.fin-create{border:1px solid var(--wka-line);background:var(--wka-panel-2);border-radius:12px;padding:16px;margin:12px 0 4px}
.fin-create-grid{display:grid;grid-template-columns:140px 110px 130px 1fr;gap:12px;margin-bottom:12px}
.fin-create-desc{min-width:0}
@media(max-width:900px){.fin-grid{grid-template-columns:1fr 1fr}.fin-create-grid{grid-template-columns:1fr 1fr}}
@media(max-width:560px){.fin-grid{grid-template-columns:1fr}.fin-mini-tiles{grid-template-columns:1fr}.fin-create-grid{grid-template-columns:1fr}}
`
