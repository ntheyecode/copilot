// Superadmin, company card: "Single sign-on required". When on, password
// sign-in is refused for every account of the company (server/sign_in_rules.js)
// and people sign in only through the company's OIDC or SAML connection. The
// server refuses to turn it on without a live connection, so nobody is locked
// out; turning it on or off asks for a reason (audit trail).
import React, { useState } from 'react'
import { Lock } from 'lucide-react'
import { workAdminApi } from '../workAdminApi.js'
import { useT } from '../../../i18n/index.jsx'
import { Spinning, useReasonModal } from './_shared.jsx'

export default function SsoRequiredToggle({ company, onSaved }) {
  const t = useT()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [askReason, reasonModal] = useReasonModal()
  const on = !!company.ssoRequired
  const connected = !!((company.sso && company.sso.connected) || (company.saml && company.saml.connected))
  const toggle = async () => {
    const reason = await askReason({ title: on ? t('companiesAdmin.ssoRequired.offTitle') : t('companiesAdmin.ssoRequired.onTitle'), detail: on ? t('companiesAdmin.ssoRequired.offDetail') : t('companiesAdmin.ssoRequired.onDetail'), confirmLabel: on ? t('companiesAdmin.ssoRequired.turnOff') : t('companiesAdmin.ssoRequired.turnOn'), danger: !on })
    if (!reason) return
    setBusy(true); setErr('')
    try { await workAdminApi.setCompanySsoRequired(company.id, !on, reason); if (onSaved) onSaved() } catch (e) { setErr(e.message || '') } finally { setBusy(false) }
  }
  return (
    <div className="co-ssoreq" data-testid="sso-required-toggle">
      {reasonModal}
      <Lock size={15} />
      <div className="co-ssoreq-t">
        <b>{t('companiesAdmin.ssoRequired.title')}</b>
        <span>{connected ? t('companiesAdmin.ssoRequired.help') : t('companiesAdmin.ssoRequired.needConnection')}</span>
        {err ? <span className="co-ssoreq-err" role="alert">{err}</span> : null}
      </div>
      <button type="button" className={`co-toggle ${on ? 'on' : ''}`} disabled={busy || (!on && !connected)} onClick={toggle}>{busy ? <Spinning /> : null} {on ? t('companiesAdmin.on') : t('companiesAdmin.off')}</button>
      <style>{`.co-ssoreq{display:flex;align-items:center;gap:10px;margin-top:12px;padding:10px 12px;border:1px solid var(--wka-line);border-radius:12px;flex-wrap:wrap}.co-ssoreq>svg{color:var(--wka-accent);flex-shrink:0}.co-ssoreq-t{display:grid;gap:2px;flex:1;min-width:200px}.co-ssoreq-t span{font-size:12px;color:var(--wka-muted)}.co-ssoreq-t .co-ssoreq-err{color:var(--wka-red)}.co-ssoreq .co-toggle{flex-shrink:0;white-space:nowrap}`}</style>
    </div>
  )
}
