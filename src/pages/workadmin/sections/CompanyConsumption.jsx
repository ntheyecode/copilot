// One company's live enterprise pool and who is consuming it this month, for the
// superadmin Companies page (inside the Enterprise panel). Reads the existing
// GET /api/work/admin/companies/:id/pool dashboard (pool + per-member monthly
// consumption + ceilings) and renders it as the pool stats, a used-of-pool meter
// and a ranked bar list per member. No new endpoint, no invented numbers; a
// member with a monthly hour ceiling shows their bar against that ceiling.
import React, { useEffect, useState, useCallback } from 'react'
import { RefreshCw } from 'lucide-react'
import { workAdminApi } from '../workAdminApi.js'
import { Loading, ErrorBox, EmptyState, Spinning } from './_shared.jsx'
import { Meter, BarList, VIZ_CSS } from './_viz.jsx'
import { useT } from '../../../i18n/index.jsx'

const fmtH = (secs) => { const h = (Number(secs) || 0) / 3600; return h >= 10 || h % 1 === 0 ? `${Math.round(h)}h` : `${h.toFixed(1)}h` }

export default function CompanyConsumption({ companyId, notifyPct, refreshKey }) {
  const t = useT()
  const [state, setState] = useState({ loading: true, error: null, data: null })
  const [refreshing, setRefreshing] = useState(false)
  const load = useCallback(async (soft) => {
    if (soft) setRefreshing(true); else setState((s) => ({ ...s, loading: true, error: null }))
    try { const d = await workAdminApi.companyPool(companyId); setState({ loading: false, error: null, data: d }) }
    catch (error) { if (!soft) setState({ loading: false, error, data: null }) }
    finally { setRefreshing(false) }
  }, [companyId])
  useEffect(() => { load(false) }, [load, refreshKey])

  if (state.loading) return <Loading label={t('companiesAdmin.consumption.loading')} />
  if (state.error) return <ErrorBox error={state.error} onRetry={() => load(false)} />
  const d = state.data || {}
  const pool = d.pool || {}
  const hasPool = (pool.monthlySeconds || 0) > 0
  const members = (d.byUser || []).filter((u) => (u.consumedSeconds && u.consumedSeconds.month) > 0)
  const items = members.map((u) => {
    const limit = u.hours && u.hours.month && u.hours.month.limit != null ? u.hours.month.limit : null
    const used = u.consumedSeconds.month
    return {
      key: u.id,
      label: u.displayName || u.username,
      sub: t(`companiesAdmin.consumption.group.${u.group || 'member'}`),
      value: used,
      max: limit != null ? limit : undefined,
      valueLabel: limit != null ? t('companiesAdmin.consumption.ofCeiling', { used: fmtH(used), limit: fmtH(limit) }) : fmtH(used),
      tone: limit != null ? undefined : 'accent',
    }
  })
  return (
    <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--wka-line)' }}>
      <style>{VIZ_CSS}</style>
      <div className="co-block-t" style={{ justifyContent: 'space-between' }}>
        <span>{t('companiesAdmin.consumption.title')}</span>
        <button type="button" className="wka-btn sm ghost" onClick={() => load(true)} disabled={refreshing}>{refreshing ? <Spinning /> : <RefreshCw size={12} />} {t('companiesAdmin.consumption.refresh')}</button>
      </div>
      {hasPool ? (
        <>
          <Meter value={pool.usedSeconds || 0} max={pool.monthlySeconds} warnAt={notifyPct || 75}
            label={t('companiesAdmin.consumption.poolLine', { used: fmtH(pool.usedSeconds || 0), monthly: fmtH(pool.monthlySeconds), reset: d.resetLabel || '' })}
            right={t('companiesAdmin.consumption.pctUsed', { pct: pool.usedPct || 0 })} />
          <div style={{ height: 12 }} />
        </>
      ) : null}
      {items.length === 0
        ? <EmptyState title={t('companiesAdmin.consumption.emptyTitle')} detail={t('companiesAdmin.consumption.emptyDetail')} />
        : <BarList items={items} ariaLabel={t('companiesAdmin.consumption.title')} />}
    </div>
  )
}
