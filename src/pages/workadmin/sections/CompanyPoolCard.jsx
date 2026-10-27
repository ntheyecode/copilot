// The company admin's "hours pool this month" card for the Overview: the live
// enterprise pool as a meter with its month-end rule, and the one action that
// fits the state (open Usage & limits, request hours, or ask AdmireVeda when
// no pool is set). Reads the existing GET /api/work/team/pool; nothing here is
// estimated. Companies without an enterprise pool render the honest "not set"
// state instead of an empty meter.
import React, { useEffect, useState, useCallback } from 'react'
import { Gauge, Hourglass, LifeBuoy, ArrowRight } from 'lucide-react'
import { api } from '../../../api.js'
import { useT } from '../../../i18n/index.jsx'
import { Meter, VIZ_CSS } from './_viz.jsx'

const fmtH = (secs) => { const h = (Number(secs) || 0) / 3600; return h >= 10 || h % 1 === 0 ? `${Math.round(h)}h` : `${h.toFixed(1)}h` }

export default function CompanyPoolCard({ onOpen }) {
  const t = useT()
  const [data, setData] = useState(undefined)   // undefined = loading, null = unavailable
  const load = useCallback(() => { api.workTeamPool().then((d) => setData(d || null)).catch(() => setData(null)) }, [])
  useEffect(() => { load() }, [load])
  if (data === undefined || data === null) return null   // no pool dashboard: the minute-pool card still tells the story
  const pool = data.pool || {}
  const policy = data.policy || {}
  const hasPool = (pool.monthlySeconds || 0) > 0
  const go = (id) => { if (onOpen) onOpen(id) }
  return (
    <div className="wka-panel">
      <style>{VIZ_CSS}</style>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0 }}><Gauge size={15} style={{ verticalAlign: -2, marginRight: 6, color: 'var(--wka-accent)' }} />{t('companyPlan.pool.title')}</h2>
        {data.pendingRequests > 0 ? <span className="wka-chip warn">{t.n('companyPlan.pool.pending', data.pendingRequests)}</span> : null}
      </div>
      {hasPool ? (
        <>
          <p className="desc">{t('companyPlan.pool.line', { remaining: fmtH(pool.remainingSeconds), monthly: fmtH(pool.monthlySeconds), reset: data.resetLabel || '' })}</p>
          <Meter value={pool.usedSeconds || 0} max={pool.monthlySeconds} warnAt={policy.notifyPct || 75}
            label={t(pool.monthEnd === 'carryforward' ? 'companyPlan.pool.carryforward' : 'companyPlan.pool.forfeit')}
            right={t('companyPlan.pool.pctUsed', { pct: pool.usedPct || 0 })} />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
            <button type="button" className="wka-btn sm" onClick={() => go('usage')}><ArrowRight size={13} /> {t('companyPlan.pool.openUsage')}</button>
            {policy.requestsEnabled ? <button type="button" className="wka-btn sm ghost" onClick={() => go('usage')}><Hourglass size={13} /> {t('companyPlan.pool.requestHours')}</button> : null}
          </div>
        </>
      ) : (
        <>
          <p className="desc">{t('companyPlan.pool.none')}</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="wka-btn sm" onClick={() => go('tickets')}><LifeBuoy size={13} /> {t('companyPlan.pool.askSupport')}</button>
            <button type="button" className="wka-btn sm ghost" onClick={() => go('usage')}><ArrowRight size={13} /> {t('companyPlan.pool.openUsage')}</button>
          </div>
        </>
      )}
    </div>
  )
}
