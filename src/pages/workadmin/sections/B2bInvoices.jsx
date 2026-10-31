// Superadmin: Invoices. AdmireVeda records each company's contract and issues
// its invoices here (no card payment anywhere). Prices come from the one
// registry (server/org_pricing.js), so the suggested line always matches the
// public pricing; every amount is recomputed by the server.
//   1. pick a company
//   2. record or update its contract
//   3. draft an invoice (prefilled from the contract), then issue it, and
//      mark it paid when the payment arrives (or void it)
// Shown only where company tenants exist (server/admin_sections.js).
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Building2, Download, FileText, Plus, Receipt, Save, Trash2, Wand2 } from 'lucide-react'
import { workAdminApi } from '../workAdminApi.js'
import { useT } from '../../../i18n/index.jsx'
import { Loading, ErrorBox, EmptyState, Spinning, SavedTag } from './_shared.jsx'
import { ORG_PLAN_IDS, MIN_USERS, perUserRate, monthlyAmount, billableUsers } from '../../../../server/org_pricing.js'

const CYCLES = ['monthly', 'quarterly', 'annual']
const money = (n) => { try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(Number(n) || 0) } catch { return `$${(Number(n) || 0).toFixed(2)}` } }
const today = () => new Date().toISOString().slice(0, 10)
const monthStart = () => { const d = new Date(); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString().slice(0, 10) }
const monthEnd = () => { const d = new Date(); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).toISOString().slice(0, 10) }
const months = (a, b) => { const x = Date.parse(a + 'T00:00:00Z'), y = Date.parse(b + 'T00:00:00Z'); if (!(y >= x)) return 1; return Math.max(1, Math.round((Math.round((y - x) / 86400000) + 1) / 30.4375)) }

export default function B2bInvoices() {
  const t = useT()
  const [companies, setCompanies] = useState({ loading: true, error: null, list: [] })
  const [cid, setCid] = useState('')
  const loadCompanies = useCallback(() => {
    setCompanies((s) => ({ ...s, loading: true, error: null }))
    workAdminApi.companies().then((d) => { const list = (d && (d.companies || d)) || []; setCompanies({ loading: false, error: null, list: Array.isArray(list) ? list : [] }) }).catch((error) => setCompanies({ loading: false, error, list: [] }))
  }, [])
  useEffect(() => { loadCompanies() }, [loadCompanies])
  useEffect(() => { if (!cid && companies.list.length) setCid(companies.list[0].id) }, [companies.list, cid])
  if (companies.loading) return <Loading label={t('b2bInvoices.loading')} />
  if (companies.error) return <ErrorBox error={companies.error} onRetry={loadCompanies} />
  return (
    <div className="b2b" data-testid="b2b-invoices">
      <style>{B2B_CSS}</style>
      <div className="wka-note"><Receipt size={14} /> <span style={{ minWidth: 0 }}>{t('b2bInvoices.intro')}</span></div>
      {!companies.list.length ? <EmptyState title={t('b2bInvoices.noCompanies')} /> : (
        <>
          <div className="wka-panel b2b-pick">
            <label htmlFor="b2b-company"><Building2 size={15} /> {t('b2bInvoices.company')}</label>
            <select id="b2b-company" className="wka-select" value={cid} onChange={(e) => setCid(e.target.value)}>
              {companies.list.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {cid ? <CompanyLedger key={cid} companyId={cid} /> : null}
        </>
      )}
    </div>
  )
}

function CompanyLedger({ companyId }) {
  const t = useT()
  const [state, setState] = useState({ loading: true, error: null, data: null })
  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: !s.data, error: null }))
    workAdminApi.b2bCompany(companyId).then((data) => setState({ loading: false, error: null, data })).catch((error) => setState({ loading: false, error, data: null }))
  }, [companyId])
  useEffect(() => { load() }, [load])
  if (state.loading) return <Loading label={t('b2bInvoices.loading')} />
  if (state.error) return <ErrorBox error={state.error} onRetry={load} />
  const { contract, invoices } = state.data
  return (
    <>
      <ContractForm companyId={companyId} contract={contract} onSaved={load} />
      <NewInvoice companyId={companyId} contract={contract} onCreated={load} />
      <InvoiceList companyId={companyId} invoices={invoices} onChanged={load} />
    </>
  )
}

function ContractForm({ companyId, contract, onSaved }) {
  const t = useT()
  const [f, setF] = useState(() => ({ plan: (contract && contract.plan) || 'hosted', users: String((contract && contract.users) || MIN_USERS), startDate: (contract && contract.startDate) || monthStart(), termMonths: String((contract && contract.termMonths) || 12), billingCycle: (contract && contract.billingCycle) || 'monthly', reference: (contract && contract.reference) || '', notes: (contract && contract.notes) || '' }))
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [saved, setSaved] = useState(false)
  const rate = perUserRate(f.plan, Number(f.users))
  const monthly = monthlyAmount(f.plan, Number(f.users))
  const save = async () => {
    setBusy(true); setErr(null)
    try { await workAdminApi.b2bSetContract(companyId, { ...f, users: Number(f.users), termMonths: Number(f.termMonths) }); setSaved(true); setTimeout(() => setSaved(false), 2500); onSaved() }
    catch (e) { setErr(e) } finally { setBusy(false) }
  }
  return (
    <div className="wka-panel">
      <h2 className="b2b-h"><FileText size={16} /> {t('b2bInvoices.contract')}</h2>
      <div className="wka-formgrid">
        <div className="wka-field"><label htmlFor="b2b-plan">{t('b2bInvoices.plan')}</label>
          <select id="b2b-plan" className="wka-select" value={f.plan} onChange={(e) => setF({ ...f, plan: e.target.value })}>{ORG_PLAN_IDS.map((p) => <option key={p} value={p}>{t(`companyBilling.plans.${p}`)}</option>)}</select>
        </div>
        <div className="wka-field"><label htmlFor="b2b-users">{t('b2bInvoices.users')}</label><input id="b2b-users" className="wka-input" inputMode="numeric" value={f.users} onChange={(e) => setF({ ...f, users: e.target.value.replace(/[^0-9]/g, '') })} /></div>
        <div className="wka-field"><label htmlFor="b2b-start">{t('b2bInvoices.start')}</label><input id="b2b-start" className="wka-input" type="date" value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value })} /></div>
        <div className="wka-field"><label htmlFor="b2b-term">{t('b2bInvoices.termMonths')}</label><input id="b2b-term" className="wka-input" inputMode="numeric" value={f.termMonths} onChange={(e) => setF({ ...f, termMonths: e.target.value.replace(/[^0-9]/g, '') })} /></div>
        <div className="wka-field"><label htmlFor="b2b-cycle">{t('b2bInvoices.cycle')}</label>
          <select id="b2b-cycle" className="wka-select" value={f.billingCycle} onChange={(e) => setF({ ...f, billingCycle: e.target.value })}>{CYCLES.map((c) => <option key={c} value={c}>{t(`companyBilling.cycles.${c}`)}</option>)}</select>
        </div>
        <div className="wka-field"><label htmlFor="b2b-ref">{t('b2bInvoices.reference')}</label><input id="b2b-ref" className="wka-input" value={f.reference} onChange={(e) => setF({ ...f, reference: e.target.value })} /></div>
      </div>
      <div className="b2b-calc" data-testid="b2b-calc">{rate == null ? null : t('b2bInvoices.calc', { users: new Intl.NumberFormat().format(billableUsers(Number(f.users))), rate: money(rate), monthly: money(monthly) })}{f.plan === 'managed' ? ` ${t('companyBilling.contract.aiAtUsage')}` : ''}</div>
      <div className="b2b-actions">
        <button type="button" className="wka-btn primary" disabled={busy} onClick={save}>{busy ? <Spinning /> : <Save size={14} />} {t('b2bInvoices.saveContract')}</button>
        <SavedTag show={saved} />
      </div>
      {err ? <div style={{ marginTop: 10 }}><ErrorBox error={err} /></div> : null}
    </div>
  )
}

const blankLine = () => ({ description: '', qty: '1', unitAmount: '' })

function NewInvoice({ companyId, contract, onCreated }) {
  const t = useT()
  const [f, setF] = useState({ periodStart: monthStart(), periodEnd: monthEnd(), issueDate: today(), dueDate: '', notes: '' })
  const [lines, setLines] = useState([blankLine()])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const total = useMemo(() => lines.reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.unitAmount) || 0), 0), [lines])
  const fill = () => {
    if (!contract) return
    const m = months(f.periodStart, f.periodEnd)
    setLines([{ description: t('b2bInvoices.suggested', { plan: t(`companyBilling.plans.${contract.plan}`), users: contract.billableUsers, months: m }), qty: String(contract.billableUsers * m), unitAmount: String(contract.perUserRate) }])
  }
  const setLine = (i, patch) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)))
  const create = async () => {
    setBusy(true); setErr(null)
    try {
      await workAdminApi.b2bCreateInvoice(companyId, { ...f, lines: lines.map((l) => ({ description: l.description, qty: Number(l.qty), unitAmount: Number(l.unitAmount) })) })
      setLines([blankLine()]); onCreated()
    } catch (e) { setErr(e) } finally { setBusy(false) }
  }
  return (
    <div className="wka-panel">
      <h2 className="b2b-h"><Plus size={16} /> {t('b2bInvoices.newInvoice')}</h2>
      <div className="wka-formgrid">
        <div className="wka-field"><label htmlFor="inv-ps">{t('b2bInvoices.periodStart')}</label><input id="inv-ps" className="wka-input" type="date" value={f.periodStart} onChange={(e) => setF({ ...f, periodStart: e.target.value })} /></div>
        <div className="wka-field"><label htmlFor="inv-pe">{t('b2bInvoices.periodEnd')}</label><input id="inv-pe" className="wka-input" type="date" value={f.periodEnd} onChange={(e) => setF({ ...f, periodEnd: e.target.value })} /></div>
        <div className="wka-field"><label htmlFor="inv-id">{t('b2bInvoices.issueDate')}</label><input id="inv-id" className="wka-input" type="date" value={f.issueDate} onChange={(e) => setF({ ...f, issueDate: e.target.value })} /></div>
        <div className="wka-field"><label htmlFor="inv-dd">{t('b2bInvoices.dueDate')}</label><input id="inv-dd" className="wka-input" type="date" value={f.dueDate} onChange={(e) => setF({ ...f, dueDate: e.target.value })} /></div>
      </div>
      <div className="b2b-lines">
        {lines.map((l, i) => (
          <div key={i} className="b2b-line">
            <input className="wka-input b2b-desc" aria-label={t('b2bInvoices.lineDesc')} placeholder={t('b2bInvoices.lineDesc')} value={l.description} onChange={(e) => setLine(i, { description: e.target.value })} />
            <input className="wka-input b2b-num" aria-label={t('b2bInvoices.lineQty')} placeholder={t('b2bInvoices.lineQty')} inputMode="decimal" value={l.qty} onChange={(e) => setLine(i, { qty: e.target.value })} />
            <input className="wka-input b2b-num" aria-label={t('b2bInvoices.lineUnit')} placeholder={t('b2bInvoices.lineUnit')} inputMode="decimal" value={l.unitAmount} onChange={(e) => setLine(i, { unitAmount: e.target.value })} />
            <button type="button" className="wka-btn sm ghost" disabled={lines.length === 1} onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))} aria-label={t('b2bInvoices.removeLine')}><Trash2 size={13} /></button>
          </div>
        ))}
      </div>
      <div className="b2b-actions">
        <button type="button" className="wka-btn sm" onClick={() => setLines((ls) => [...ls, blankLine()])}><Plus size={13} /> {t('b2bInvoices.addLine')}</button>
        <button type="button" className="wka-btn sm" disabled={!contract} onClick={fill}><Wand2 size={13} /> {t('b2bInvoices.fillFromContract')}</button>
        <span className="b2b-total">{t('b2bInvoices.total', { amount: money(total) })}</span>
      </div>
      <div className="wka-field sso-wide"><label htmlFor="inv-notes">{t('b2bInvoices.notes')}</label><input id="inv-notes" className="wka-input" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
      <div className="b2b-actions">
        <button type="button" className="wka-btn primary" disabled={busy} onClick={create} data-testid="b2b-create">{busy ? <Spinning /> : <Save size={14} />} {t('b2bInvoices.saveDraft')}</button>
      </div>
      {err ? <div style={{ marginTop: 10 }}><ErrorBox error={err} /></div> : null}
    </div>
  )
}

function InvoiceList({ companyId, invoices, onChanged }) {
  const t = useT()
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState('')
  const move = async (inv, status) => {
    setBusy(inv.id); setErr(null)
    try { await workAdminApi.b2bSetInvoiceStatus(companyId, inv.id, status); onChanged() } catch (e) { setErr(e) } finally { setBusy('') }
  }
  return (
    <div className="wka-panel">
      <h2 className="b2b-h"><Receipt size={16} /> {t('b2bInvoices.invoices')}</h2>
      {!invoices.length ? <EmptyState title={t('b2bInvoices.none')} /> : (
        <div className="b2b-list">
          {invoices.map((inv) => (
            <div key={inv.id} className="b2b-inv" data-testid="b2b-invoice">
              <div className="b2b-inv-main">
                <b className="wka-mono">{inv.number}</b>
                <span className="b2b-dim">{t('companyBilling.invoices.period', { start: inv.periodStart, end: inv.periodEnd })}</span>
              </div>
              <div className="b2b-inv-side">
                <span className="b2b-amt">{money(inv.total)}</span>
                <span className={`b2b-st ${inv.status}`}>{t(`companyBilling.status.${inv.status}`)}</span>
                {inv.status === 'draft' ? <button type="button" className="wka-btn sm primary" disabled={busy === inv.id} onClick={() => move(inv, 'issued')}>{t('b2bInvoices.issue')}</button> : null}
                {inv.status === 'issued' ? <button type="button" className="wka-btn sm primary" disabled={busy === inv.id} onClick={() => move(inv, 'paid')}>{t('b2bInvoices.markPaid')}</button> : null}
                {inv.status === 'draft' || inv.status === 'issued' ? <button type="button" className="wka-btn sm ghost" disabled={busy === inv.id} onClick={() => move(inv, 'void')}>{t('b2bInvoices.void')}</button> : null}
                <a className="wka-btn sm" href={workAdminApi.b2bInvoicePdfUrl(companyId, inv.id)} download><Download size={13} /> {t('companyBilling.invoices.pdf')}</a>
              </div>
            </div>
          ))}
        </div>
      )}
      {err ? <div style={{ marginTop: 10 }}><ErrorBox error={err} /></div> : null}
    </div>
  )
}

const B2B_CSS = `
.b2b-h{display:flex;align-items:center;gap:8px;margin:0 0 12px}
.b2b-h svg{color:var(--wka-accent);flex-shrink:0}
.b2b-pick{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.b2b-pick label{display:flex;align-items:center;gap:6px;font-weight:700;white-space:nowrap}
.b2b-pick .wka-select{flex:1;min-width:200px;max-width:420px}
.b2b-calc{font-size:13px;color:var(--wka-accent);font-weight:700;margin:2px 0 4px;overflow-wrap:anywhere}
.b2b-actions{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:12px}
.b2b-lines{display:grid;gap:8px;margin-top:4px}
.b2b-line{display:grid;grid-template-columns:minmax(0,1fr) 110px 120px auto;gap:8px;align-items:center}
.b2b-total{margin-left:auto;font-weight:800;font-variant-numeric:tabular-nums;white-space:nowrap}
.b2b .sso-wide{display:grid;gap:6px;margin-top:12px}
.b2b-list{display:grid;gap:8px}
.b2b-inv{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;border:1px solid var(--wka-line);border-radius:12px;padding:10px 12px;min-width:0}
.b2b-inv-main{display:grid;gap:2px;min-width:0}
.b2b-inv-side{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.b2b-amt{font-weight:800;font-variant-numeric:tabular-nums;white-space:nowrap}
.b2b-dim{color:var(--wka-muted);font-size:12.5px}
.b2b-st{font-size:11.5px;font-weight:700;border-radius:999px;padding:2px 9px;border:1px solid var(--wka-line-2);white-space:nowrap}
.b2b-st.paid{color:var(--wka-emerald)}
.b2b-st.issued{color:var(--wka-accent)}
.b2b-st.void{color:var(--wka-faint);text-decoration:line-through}
.b2b .wka-btn{white-space:nowrap}
@media (max-width:720px){.b2b-line{grid-template-columns:1fr 1fr auto}.b2b-line .b2b-desc{grid-column:1/-1}.b2b-total{margin-left:0}}
`
