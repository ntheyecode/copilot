// Company console: Billing. AdmireVeda bills a company under contract and
// invoice, so this area shows (and never asks for a card):
//   * the contract: plan, users, the per-user rate from the one price registry
//     (server/org_pricing.js via the server), term and billing cycle;
//   * this month's guided-hours pool (the same card as the overview);
//   * the invoices AdmireVeda issued, each with its PDF.
// Where personal plans are also sold (the all-inclusive edition) the existing
// license statement stays below, unchanged.
import React, { useCallback, useEffect, useState } from 'react'
import { Download, FileText, Info, Receipt, ChevronDown, ChevronRight } from 'lucide-react'
import { api } from '../../../api.js'
import { useT } from '../../../i18n/index.jsx'
import { Loading, ErrorBox, EmptyState, RecRow } from './_shared.jsx'
import CompanyPoolCard from './CompanyPoolCard.jsx'
import { useEditionView } from '../../../edition/useCaps.js'

const money = (n, cur = 'usd') => { try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: String(cur || 'usd').toUpperCase() }).format(Number(n) || 0) } catch { return `$${(Number(n) || 0).toFixed(2)}` } }
const num = (n) => { try { return new Intl.NumberFormat().format(Number(n) || 0) } catch { return String(n) } }
const day = (s) => { if (!s) return '-'; try { return new Date(s + (String(s).length === 10 ? 'T00:00:00Z' : '')).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }) } catch { return s } }

export default function CompanyBilling({ onOpen }) {
  const t = useT()
  const ed = useEditionView()
  const [state, setState] = useState({ loading: true, error: null, data: null })
  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }))
    api.workCompanyBilling().then((data) => setState({ loading: false, error: null, data })).catch((error) => setState({ loading: false, error, data: null }))
  }, [])
  useEffect(() => { load() }, [load])
  if (state.loading) return <Loading label={t('companyAdmin.billing.loading')} />
  if (state.error) return <ErrorBox error={state.error} onRetry={load} />
  const { contract, invoices = [], openTotal = 0, overdueCount = 0 } = state.data || {}
  return (
    <div className="cb" data-testid="company-billing">
      <style>{CB_CSS}</style>
      <div className="wka-note"><Info size={14} /> <span style={{ minWidth: 0 }}>{t('companyBilling.note')}</span></div>

      <div className="wka-panel">
        <h2 className="cb-h"><FileText size={16} /> {t('companyBilling.contract.title')}</h2>
        {!contract ? <EmptyState title={t('companyBilling.contract.none')} detail={t('companyBilling.contract.noneDetail')} /> : (
          <>
            <div className="cb-plan">
              <div className="cb-plan-name">{t(`companyBilling.plans.${contract.plan}`)}</div>
              <div className="cb-plan-rate">{t('companyBilling.contract.rate', { rate: money(contract.perUserRate) })}{contract.plan === 'managed' ? ` ${t('companyBilling.contract.aiAtUsage')}` : ''}</div>
            </div>
            <div className="wka-record">
              <RecRow label={t('companyBilling.contract.users')} value={contract.billableUsers > contract.users ? t('companyBilling.contract.usersMin', { users: num(contract.users), billed: num(contract.billableUsers) }) : num(contract.users)} />
              <RecRow label={t('companyBilling.contract.monthly')} value={money(contract.monthlyAmount)} />
              <RecRow label={t('companyBilling.contract.term')} value={t('companyBilling.contract.termValue', { start: day(contract.startDate), end: day(contract.endDate), months: contract.termMonths })} />
              <RecRow label={t('companyBilling.contract.cycle')} value={t(`companyBilling.cycles.${contract.billingCycle}`)} />
              {contract.reference ? <RecRow label={t('companyBilling.contract.reference')} value={contract.reference} /> : null}
            </div>
          </>
        )}
      </div>

      <CompanyPoolCard onOpen={onOpen} />

      <div className="wka-panel">
        <div className="cb-head">
          <h2 className="cb-h"><Receipt size={16} /> {t('companyBilling.invoices.title')}</h2>
          {openTotal > 0 ? <span className={`cb-open${overdueCount ? ' late' : ''}`}>{overdueCount ? t('companyBilling.invoices.overdue', { n: overdueCount }) : t('companyBilling.invoices.open', { amount: money(openTotal) })}</span> : null}
        </div>
        {!invoices.length ? <EmptyState title={t('companyBilling.invoices.none')} detail={t('companyBilling.invoices.noneDetail')} /> : (
          <div className="cb-list" role="list">
            {invoices.map((inv) => (
              <div key={inv.id} className="cb-inv" role="listitem" data-testid="company-invoice">
                <div className="cb-inv-main">
                  <b className="wka-mono">{inv.number}</b>
                  <span className="cb-dim">{t('companyBilling.invoices.period', { start: day(inv.periodStart), end: day(inv.periodEnd) })}</span>
                  <span className="cb-dim">{t('companyBilling.invoices.due', { date: day(inv.dueDate) })}</span>
                </div>
                <div className="cb-inv-side">
                  <span className="cb-amt">{money(inv.total, inv.currency)}</span>
                  <span className={`cb-st ${inv.overdue ? 'late' : inv.status}`}>{inv.overdue ? t('companyBilling.status.overdue') : t(`companyBilling.status.${inv.status}`)}</span>
                  <a className="wka-btn sm" href={api.workCompanyInvoicePdfUrl(inv.id)} download><Download size={13} /> {t('companyBilling.invoices.pdf')}</a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {ed.individualPlans ? <LicenseStatement /> : null}
    </div>
  )
}

// The license statement (seat charges + recorded extras), unchanged, for the
// edition that also sells personal plans. Collapsed by default.
function LicenseStatement() {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [state, setState] = useState({ loading: false, error: null, bill: null })
  const load = useCallback(() => {
    setState({ loading: true, error: null, bill: null })
    api.workTeamBilling().then((bill) => setState({ loading: false, error: null, bill })).catch((error) => setState({ loading: false, error, bill: null }))
  }, [])
  useEffect(() => { if (open && !state.bill && !state.loading && !state.error) load() }, [open, state, load])
  const b = state.bill || {}
  const lines = [...(b.seatLines || []), ...(b.ledger || [])]
  return (
    <div className="wka-panel">
      <button type="button" className="cb-toggle" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}<h2 className="cb-h" style={{ margin: 0 }}>{t('companyBilling.statement')}</h2>
      </button>
      {open ? (state.loading ? <Loading label={t('companyAdmin.billing.loading')} /> : state.error ? <ErrorBox error={state.error} onRetry={load} /> : (
        <>
          <p className="desc">{t('companyAdmin.billing.note')}</p>
          {!lines.length ? <EmptyState title={t('companyAdmin.billing.noCharges')} detail={t('companyAdmin.billing.noChargesDetail')} /> : (
            <div className="wka-table-wrap">
              <table className="wka-table">
                <thead><tr><th>{t('companyAdmin.billing.thDescription')}</th><th style={{ textAlign: 'right' }}>{t('companyAdmin.billing.thQty')}</th><th style={{ textAlign: 'right' }}>{t('companyAdmin.billing.thUnit')}</th><th style={{ textAlign: 'right' }}>{t('companyAdmin.billing.thAmount')}</th></tr></thead>
                <tbody>{lines.map((l, i) => <tr key={l.id || i}><td>{l.description || l.type}</td><td style={{ textAlign: 'right' }}>{l.qty != null ? l.qty : ''}</td><td style={{ textAlign: 'right' }}>{l.unitAmount != null ? money(l.unitAmount) : ''}</td><td style={{ textAlign: 'right' }}>{money(l.amount)}</td></tr>)}</tbody>
                <tfoot><tr><td colSpan={3} style={{ textAlign: 'right', fontWeight: 700 }}>{t('companyAdmin.billing.total', { cur: String(b.currency || 'usd').toUpperCase() })}</td><td style={{ textAlign: 'right', fontWeight: 700 }}>{money(b.total)}</td></tr></tfoot>
              </table>
            </div>
          )}
        </>
      )) : null}
    </div>
  )
}

const CB_CSS = `
.cb-h{display:flex;align-items:center;gap:8px;margin:0 0 12px}
.cb-h svg{color:var(--wka-accent);flex-shrink:0}
.cb-head{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
.cb-plan{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;margin-bottom:10px}
.cb-plan-name{font-size:17px;font-weight:800}
.cb-plan-rate{color:var(--wka-accent);font-weight:700;font-size:14px}
.cb-open{font-size:12px;font-weight:700;border-radius:999px;padding:3px 10px;border:1px solid var(--wka-line-2);white-space:nowrap}
.cb-open.late{color:var(--wka-red);border-color:color-mix(in srgb, var(--wka-red) 45%, transparent)}
.cb-list{display:grid;gap:8px}
.cb-inv{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;border:1px solid var(--wka-line);border-radius:12px;padding:11px 13px;min-width:0}
.cb-inv-main{display:grid;gap:2px;min-width:0}
.cb-inv-side{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.cb-amt{font-weight:800;font-variant-numeric:tabular-nums;white-space:nowrap}
.cb-dim{color:var(--wka-muted);font-size:12.5px;overflow-wrap:anywhere}
.cb-st{font-size:11.5px;font-weight:700;border-radius:999px;padding:2px 9px;border:1px solid var(--wka-line-2);white-space:nowrap}
.cb-st.paid{color:var(--wka-emerald);border-color:color-mix(in srgb, var(--wka-emerald) 40%, transparent)}
.cb-st.issued{color:var(--wka-accent)}
.cb-st.void{color:var(--wka-faint);text-decoration:line-through}
.cb-st.late{color:var(--wka-red);border-color:color-mix(in srgb, var(--wka-red) 45%, transparent)}
.cb-toggle{display:flex;align-items:center;gap:8px;background:none;border:0;padding:0;font:inherit;color:var(--wka-text);cursor:pointer;width:100%;text-align:left}
.cb .wka-btn{white-space:nowrap}
`
