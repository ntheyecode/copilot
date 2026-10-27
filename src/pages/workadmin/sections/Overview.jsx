// Overview: headline stat cards for the WorkCoPilot product, plus the one graph
// the overview endpoint already carries the data for: how users split by tier.
import React, { useEffect, useState, useCallback } from 'react'
import { Users, Activity, CalendarClock, Clock, Cpu, Layers } from 'lucide-react'
import { workAdminApi } from '../workAdminApi.js'
import { useT } from '../../../i18n/index.jsx'
import { Loading, ErrorBox } from './_shared.jsx'
import { StackedBar, VIZ_CSS } from './_viz.jsx'

// Tier order as the product ladders it; any extra tier key the server reports
// is appended so a count is never silently dropped.
const TIER_ORDER = ['lite', 'basic', 'advanced', 'premium']

function Card({ icon, label, value, foot, accent }) {
  return (
    <div className={`wka-card${accent ? ' accent' : ''}`}>
      <div className="k">{icon} {label}</div>
      <div className="v wka-mono">{value}</div>
      {foot ? <div className="foot">{foot}</div> : null}
    </div>
  )
}

export default function Overview({ onViewer }) {
  const t = useT()
  const [state, setState] = useState({ loading: true, error: null, stats: null })

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const data = await workAdminApi.overview()
      if (onViewer && data.viewer) onViewer(data.viewer)
      setState({ loading: false, error: null, stats: data.stats })
    } catch (error) {
      setState({ loading: false, error, stats: null })
    }
  }, [onViewer])

  useEffect(() => { load() }, [load])

  if (state.loading) return <Loading label={t('overviewAdmin.loading')} />
  if (state.error) return <ErrorBox error={state.error} onRetry={load} />

  const s = state.stats || {}
  const byTier = s.byTier || {}
  const tiers = [...TIER_ORDER.filter((k) => byTier[k] != null), ...Object.keys(byTier).filter((k) => !TIER_ORDER.includes(k))]
  const tierLabel = (k) => (t.has(`pricingAdmin.tiers.${k}`) ? t(`pricingAdmin.tiers.${k}`) : k)
  const usersFoot = tiers.map((k) => `${tierLabel(k)} ${byTier[k] || 0}`).join('  ·  ')
  const aiFoot = s.platformReady
    ? t('overviewAdmin.aiFootReady')
    : s.platformAiAllowed
      ? t('overviewAdmin.aiFootNoProvider')
      : t('overviewAdmin.aiFootOff')

  return (
    <div>
      <style>{VIZ_CSS}</style>
      <div className="wka-cards">
        <Card icon={<Users size={14} />} label={t('overviewAdmin.users')} value={s.totalUsers ?? 0} foot={usersFoot} />
        <Card icon={<Activity size={14} />} label={t('overviewAdmin.activeNow')} value={s.activeNow ?? 0} accent
          foot={t('overviewAdmin.activeNowFoot')} />
        <Card icon={<CalendarClock size={14} />} label={t('overviewAdmin.sessionsToday')} value={s.sessionsToday ?? 0}
          foot={t('overviewAdmin.sessionsTodayFoot')} />
        <Card icon={<Layers size={14} />} label={t('overviewAdmin.totalSessions')} value={s.totalSessions ?? 0}
          foot={t('overviewAdmin.totalSessionsFoot')} />
        <Card icon={<Clock size={14} />} label={t('overviewAdmin.purchasedHours')} value={s.purchasedHoursOutstanding ?? 0}
          foot={t('overviewAdmin.purchasedHoursFoot')} />
        <Card icon={<Cpu size={14} />} label={t('overviewAdmin.platformAi')}
          value={s.platformReady ? t('overviewAdmin.aiReady') : (s.platformAiAllowed ? t('overviewAdmin.aiNotReady') : t('overviewAdmin.aiOff'))}
          foot={aiFoot} />
      </div>

      <div className="wka-panel">
        <h2>{t('overviewAdmin.byTierTitle')}</h2>
        <p className="desc">{t('overviewAdmin.byTierDesc', { total: s.totalUsers ?? 0 })}</p>
        <StackedBar ariaLabel={t('overviewAdmin.byTierTitle')} segments={tiers.map((k) => ({ key: k, label: tierLabel(k), value: byTier[k] || 0 }))} />
      </div>
    </div>
  )
}
