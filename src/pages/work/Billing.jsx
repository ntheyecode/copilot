// /work/billing: a personal account's plan, payment method and invoices, as a
// page of its own inside the shell (the rail's Billing item, and where the
// payment-failed email sends people). The alert strip states the one thing
// that needs action; the panel below is the same WorkBilling the dashboard
// shows. A company member is covered by their company and is sent home.
import { Navigate } from 'react-router-dom'
import { useWorkApp } from './WorkAppContext.jsx'
import { useT } from '../../i18n/index.jsx'
import WorkBilling from '../../components/WorkBilling.jsx'
import BillingAlert from '../../components/billing/BillingAlert.jsx'

export default function Billing() {
  const t = useT()
  const { user, pricing, invoices, billingOn, subscription, reload, showBilling, isCompanyMember } = useWorkApp()
  if (isCompanyMember || (user && user.companyId)) return <Navigate to="/work" replace />
  return (
    <section className="wd-billing-page" aria-labelledby="wd-billing-h">
      <style>{CSS}</style>
      <header className="wd-billing-head">
        <h1 id="wd-billing-h">{t('billingWidget.page.title')}</h1>
        <p>{t('billingWidget.page.sub')}</p>
      </header>
      <BillingAlert subscription={subscription} onReload={reload} />
      {showBilling || billingOn
        ? <WorkBilling user={user} subscription={subscription} pricing={pricing} invoices={invoices} billingConfigured={billingOn} onReload={reload} />
        : <p className="wd-billing-none">{t('billingWidget.noPlanYet')}</p>}
    </section>
  )
}

const CSS = `
.wd-billing-page{max-width:980px}
.wd-billing-head h1{margin:0;font-family:"Bricolage Grotesque",var(--wd-display,system-ui),sans-serif;font-size:28px;letter-spacing:-.02em;color:var(--tx)}
.wd-billing-head p{margin:6px 0 0;color:var(--mut);font-size:15px}
.wd-billing-none{margin-top:18px;color:var(--mut)}
`
