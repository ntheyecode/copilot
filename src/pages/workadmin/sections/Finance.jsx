// Finance (superadmin + accounting role): all transactions, a period summary
// that "speaks" (week / month / quarter / year with deltas, MRR, a 12-month
// revenue chart, by-plan), and refunds. Bound to /api/work/admin/finance/*.
import React, { useEffect, useState, useCallback } from 'react'
import { TrendingUp, TrendingDown, RefreshCw, RotateCcw, DollarSign, Activity, CreditCard, Loader2 } from 'lucide-react'
import { workAdminApi } from '../workAdminApi.js'
import { Loading, ErrorBox, Spinning, ReasonModal } from './_shared.jsx'

const money = (n, cur = 'usd') => { try { return new Intl.NumberFormat('en-US', { style: 'currency', currency: (cur || 'usd').toUpperCase() }).format(Number(n) || 0) } catch { return `$${(Number(n) || 0).toFixed(2)}` } }
const pct = (cur, prev) => { if (!prev) return cur > 0 ? 100 : 0; return Math.round(((cur - prev) / Math.abs(prev)) * 100) }
const KIND_LABEL = { subscription: 'Subscription', hours: 'Extra hours', images: 'Image credits', refund: 'Refund', payment: 'Payment', invoice: 'Invoice' }

export default function Finance({ isSuperAdmin }) {
  const [state, setState] = useState({ loading: true, error: null })
  const [sum, setSum] = useState(null)
  const [txns, setTxns] = useState([])
  const [refunding, setRefunding] = useState('')
  const [msg, setMsg] = useState(null)
  const [refundTx, setRefundTx] = useState(null)   // transaction pending refund (reason modal)
  const [refundErr, setRefundErr] = useState(null)

  const load = useCallback(async () => {
    setState({ loading: true, error: null })
    try {
      const [s, t] = await Promise.all([workAdminApi.financeSummary(), workAdminApi.financeTransactions('limit=500')])
      setSum(s); setTxns(t.transactions || []); setState({ loading: false, error: null })
    } catch (error) { setState({ loading: false, error }) }
  }, [])
  useEffect(() => { load() }, [load])

  // Refunds move real money, so they go through the shared ReasonModal (owner
  // standing rule: capture a reason + log it). The reason is passed to the API.
  const confirmRefund = async (reason) => {
    const tx = refundTx
    setRefunding(tx.id); setMsg(null); setRefundErr(null)
    try {
      const r = await workAdminApi.financeRefund(tx.id, undefined, reason)
      setRefundTx(null)
      setMsg({ ok: true, text: `Refunded ${money(r.refund.amount, r.refund.currency)}.` }); await load()
    } catch (e) { setRefundErr(e) }
    finally { setRefunding('') }
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

      {/* 12-month revenue chart */}
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

      {/* Transactions */}
      <div className="wka-panel">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <h2 style={{ margin: 0 }}><CreditCard size={15} style={{ verticalAlign: -2, marginRight: 6 }} />All transactions</h2>
          <span style={{ fontSize: 12, color: 'var(--wka-faint)' }}>{txns.length} shown</span>
        </div>
        {msg && <div className="wka-note" style={{ marginTop: 10, color: msg.ok ? 'var(--wka-emerald)' : 'var(--wka-amber)' }}>{msg.text}</div>}
        {txns.length === 0 ? (
          <p style={{ color: 'var(--wka-muted)', fontSize: 13.5, marginTop: 10 }}>No transactions yet. They appear here as payments and refunds flow through Stripe.</p>
        ) : (
          <div className="wka-table-wrap" style={{ marginTop: 10 }}>
            <table className="wka-table">
              <thead><tr><th>Date</th><th>Who</th><th>Type</th><th>Amount</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {txns.map((t) => (
                  <tr key={t.id}>
                    <td style={{ whiteSpace: 'nowrap', color: 'var(--wka-faint)', fontSize: 12.5 }}>{new Date(t.at).toLocaleDateString()}</td>
                    <td>{t.username || '-'}</td>
                    <td><span className={`fin-chip ${t.kind === 'refund' ? 'rf' : ''}`}>{KIND_LABEL[t.kind] || t.kind}</span>{t.plan ? <span style={{ fontSize: 11, color: 'var(--wka-faint)', marginLeft: 6 }}>{t.plan}</span> : null}</td>
                    <td style={{ fontWeight: 600, color: t.kind === 'refund' ? 'var(--wka-amber)' : 'var(--wka-text)' }}>{t.kind === 'refund' ? '-' : ''}{money(t.amount, t.currency)}</td>
                    <td style={{ fontSize: 12.5, color: 'var(--wka-faint)' }}>{t.status}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{t.kind !== 'refund' && t.stripeId ? (
                      <button className="wka-btn sm ghost" disabled={refunding === t.id} onClick={() => { setRefundErr(null); setRefundTx(t) }}>{refunding === t.id ? <Loader2 size={13} className="spin" /> : <RotateCcw size={13} />} Refund</button>
                    ) : null}</td>
                  </tr>
                ))}
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
      <style>{CSS}</style>
    </div>
  )
}

// Palette is token-only (SUPREME RULE IX unified style + SUPREME RULE II single
// source): the cards, bars and chips adopt the dashboard accent (blue in the
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
@media(max-width:900px){.fin-grid{grid-template-columns:1fr 1fr}}
@media(max-width:560px){.fin-grid{grid-template-columns:1fr}}
`
