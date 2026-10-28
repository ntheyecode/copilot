// Superadmin: the guidance-depth CEILING for one company - "what this company is
// granted". Standard (single-task guidance) or Deep (Projects). The company admin
// then assigns each pool a depth up to this grant in their own console.
//
// Honesty note (RULE III / VIII): the company detail payload does not yet report
// the stored grant, so nothing is marked until the operator sets it here; the
// saved value comes back from the POST and is shown as the current grant. If the
// payload ever carries `guidanceDepth`, it is picked up as the initial value (no
// parallel guess from the plan, which could contradict an earlier explicit grant).
import React, { useEffect, useState } from 'react'
import { Network, Check, AlertTriangle } from 'lucide-react'
import { workAdminApi } from '../workAdminApi.js'
import { useT } from '../../../i18n/index.jsx'
import { Spinning } from './_shared.jsx'
import { DepthChoice } from './DepthChoice.jsx'
import { WORK_DEPTHS } from '../../../shared/guidance_depth_options.js'

export default function CompanyDepthPanel({ company, onSaved }) {
  const t = useT()
  const known = company && WORK_DEPTHS.includes(company.guidanceDepth) ? company.guidanceDepth : null
  const [depth, setDepth] = useState(known)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [ok, setOk] = useState(false)
  // A different company card re-seeds from its own payload (atomic reset, RULE II).
  useEffect(() => { setDepth(known); setMsg(''); setOk(false) /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [company && company.id])

  const choose = async (id) => {
    if (busy) return
    setBusy(true); setMsg(''); setOk(false)
    try {
      const r = await workAdminApi.setCompanyGuidanceDepth(company.id, id)
      setDepth(WORK_DEPTHS.includes(r && r.guidanceDepth) ? r.guidanceDepth : id)
      setOk(true)
      onSaved && onSaved()
    } catch (e) { setMsg(e.message || t('companiesAdmin.depth.saveFailed')) } finally { setBusy(false) }
  }

  return (
    <div className="co-block">
      <div className="co-block-t"><Network size={14} /> {t('companiesAdmin.depth.title')} <span className="co-dim">&middot; {t('companiesAdmin.depth.titleSub')}</span></div>
      <div className="co-dim" style={{ marginBottom: 10 }}>{t('companiesAdmin.depth.desc')}</div>
      <DepthChoice name={`co-depth-${company.id}`} value={depth} onChange={choose} busy={busy} legendHidden />
      {msg ? <div className="co-msg" style={{ marginTop: 10, marginBottom: 0 }}>{msg}</div> : null}
      <div className="co-inline-wrap" style={{ marginTop: 10 }}>
        {busy ? <Spinning /> : null}
        {depth
          ? <span className="co-inline" style={{ color: 'var(--wka-emerald)', fontWeight: 600 }}><Check size={13} /> {t('companiesAdmin.depth.granted', { depth: t(`guidanceDepth.options.${depth}.title`) })}</span>
          : <span className="co-amber" style={{ alignItems: 'flex-start' }}><AlertTriangle size={13} style={{ flex: 'none', marginTop: 2 }} /> <span>{t('companiesAdmin.depth.unknown')}</span></span>}
        {ok ? <span className="wka-saved"><Check size={14} /> {t('companiesAdmin.saved')}</span> : null}
      </div>
    </div>
  )
}
