// Overview: headline stat cards for the WorkCoPilot product.
import React, { useEffect, useState, useCallback } from 'react'
import { Users, Activity, CalendarClock, Clock, Cpu, Layers } from 'lucide-react'
import { workAdminApi } from '../workAdminApi.js'
import { Loading, ErrorBox } from './_shared.jsx'

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

  if (state.loading) return <Loading label="Loading overview" />
  if (state.error) return <ErrorBox error={state.error} onRetry={load} />

  const s = state.stats || {}
  const byTier = s.byTier || {}
  const aiFoot = s.platformReady
    ? 'Platform AI is on and a provider is configured'
    : s.platformAiAllowed
      ? 'Platform AI is on but no provider is configured'
      : 'Platform AI is off (users run their own key)'

  return (
    <div className="wka-cards">
      <Card icon={<Users size={14} />} label="WorkCoPilot users" value={s.totalUsers ?? 0}
        foot={`Basic ${byTier.basic || 0} - Advanced ${byTier.advanced || 0} - Premium ${byTier.premium || 0}`} />
      <Card icon={<Activity size={14} />} label="Active now" value={s.activeNow ?? 0} accent
        foot="Guiding in the last 5 minutes" />
      <Card icon={<CalendarClock size={14} />} label="Sessions today" value={s.sessionsToday ?? 0}
        foot="Started since the last reset" />
      <Card icon={<Layers size={14} />} label="Total sessions" value={s.totalSessions ?? 0}
        foot="All time, across users" />
      <Card icon={<Clock size={14} />} label="Purchased hours left" value={s.purchasedHoursOutstanding ?? 0}
        foot="Non-expiring balance across users" />
      <Card icon={<Cpu size={14} />} label="Platform AI"
        value={s.platformReady ? 'Ready' : (s.platformAiAllowed ? 'Not ready' : 'Off')}
        foot={aiFoot} />
    </div>
  )
}
