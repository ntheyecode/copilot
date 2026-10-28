// Company console: Guidance depth. Shows the ceiling the WorkCoPilot team granted
// this company (read-only here) and lets the company admin assign each POOL of
// people (the allocation groups from the team roster, plus the default pool) a
// depth up to that grant:
//   Standard - single-task guidance (Lite / Basic / Advanced)
//   Deep     - Projects: a large goal planned as a map of tasks (Premium level)
// Ceiling-aware: under a Standard grant, Deep stays visible but locked with the one
// action that resolves it (ask the team). The server clamps too; if it ever returns
// less than asked, the row says so instead of pretending (RULE III / VIII).
// Pools are derived from the roster the console already loads (GET company/users),
// never from a second hand-kept list (SUPREME II).
import React, { useEffect, useState, useCallback } from 'react'
import { Network, Lock, LifeBuoy, Check, Users as UsersIcon } from 'lucide-react'
import { api } from '../../../api.js'
import { useT } from '../../../i18n/index.jsx'
import { Loading, ErrorBox, RecRow } from './_shared.jsx'
import { DepthChoice } from './DepthChoice.jsx'
import { poolsFromRoster } from '../../../shared/alloc_groups.js'
import { normalizeDepth, effectivePoolDepth } from '../../../shared/guidance_depth_options.js'

export default function GuidanceDepth({ onOpen }) {
  const t = useT()
  const [state, setState] = useState({ loading: true, error: null, ceiling: 'standard', pools: {}, roster: [] })
  const [busy, setBusy] = useState('')        // pool id with a save in flight
  const [rowErr, setRowErr] = useState({})    // pool id -> error
  const [rowNote, setRowNote] = useState({})  // pool id -> 'saved' | 'clamped'

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const [d, r] = await Promise.all([api.workCompanyGuidanceDepth(), api.workCompanyUsers()])
      setState({ loading: false, error: null, ceiling: normalizeDepth(d && d.ceiling), pools: (d && d.pools) || {}, roster: (r && r.users) || [] })
    } catch (error) { setState((s) => ({ ...s, loading: false, error })) }
  }, [])
  useEffect(() => { load() }, [load])

  const assign = async (poolId, depth) => {
    if (busy) return
    setBusy(poolId); setRowErr((e) => ({ ...e, [poolId]: null })); setRowNote((n) => ({ ...n, [poolId]: null }))
    try {
      const r = await api.workCompanySetPoolDepth(poolId, depth)
      const saved = normalizeDepth(r && r.depth)
      setState((s) => ({ ...s, pools: { ...s.pools, [poolId]: saved } }))
      setRowNote((n) => ({ ...n, [poolId]: saved === depth ? 'saved' : 'clamped' }))
    } catch (error) { setRowErr((e) => ({ ...e, [poolId]: error })) } finally { setBusy('') }
  }

  if (state.loading) return <Loading label={t('companyAdmin.depth.loading')} />
  if (state.error) return <ErrorBox error={state.error} onRetry={load} />
  const { ceiling, pools, roster } = state
  const standardOnly = ceiling === 'standard'
  const depthName = (d) => t(`guidanceDepth.options.${d}.title`)
  const poolLabel = (id) => (t.has(`companyAdmin.usage.groups.${id}`) ? t(`companyAdmin.usage.groups.${id}`) : id)

  return (
    <div>
      <style>{GD_CSS}</style>
      <div className="wka-panel">
        <h2><Lock size={15} style={{ verticalAlign: -2, marginRight: 6, color: 'var(--wka-accent)' }} />{t('companyAdmin.depth.grantTitle')}</h2>
        <p className="desc">{t('companyAdmin.depth.grantDesc')}</p>
        <div className="wka-record">
          <RecRow label={t('companyAdmin.depth.grantLabel')} value={
            <span className={`gd-grant ${ceiling}`}><Network size={13} aria-hidden="true" /> {depthName(ceiling)} <span className="gd-grant-tag">{t(`guidanceDepth.options.${ceiling}.tag`)}</span></span>
          } />
        </div>
        <p className="desc" style={{ margin: '10px 0 0' }}>{t(`guidanceDepth.options.${ceiling}.hint`)}</p>
        {standardOnly ? (
          <div className="wka-note gd-raise" style={{ color: 'var(--wka-amber)', marginTop: 12, marginBottom: 0 }}>
            <Lock size={14} /> <span>{t('companyAdmin.depth.raiseGrant')}</span>
            {onOpen ? <button type="button" className="wka-btn sm ghost" onClick={() => onOpen('tickets')}><LifeBuoy size={13} /> {t('companyAdmin.depth.askTeam')}</button> : null}
          </div>
        ) : null}
      </div>

      <div className="wka-panel">
        <h2><UsersIcon size={15} style={{ verticalAlign: -2, marginRight: 6, color: 'var(--wka-accent)' }} />{t('companyAdmin.depth.poolsTitle')}</h2>
        <p className="desc">{t('companyAdmin.depth.poolsDesc')}</p>
        <div className="gd-pools">
          {poolsFromRoster(roster).map((p) => {
            const assigned = pools[p.id]
            const effective = effectivePoolDepth(assigned, ceiling)
            const note = rowNote[p.id]
            return (
              <div key={p.id} className="gd-pool">
                <div className="gd-pool-h">
                  <span className="gd-pool-n">{poolLabel(p.id)}</span>
                  <span className="wka-chip">{t.n('companyAdmin.depth.people', p.count)}</span>
                  <span className="gd-pool-s">
                    {assigned == null ? <span className="gd-dim">{t('companyAdmin.depth.inherits')}</span> : null}
                    {note === 'saved' ? <span className="wka-saved"><Check size={13} /> {t('companyAdmin.usage.saved')}</span> : null}
                    {note === 'clamped' ? <span className="gd-clamp">{t('companyAdmin.depth.clamped', { depth: depthName(effective) })}</span> : null}
                  </span>
                </div>
                <DepthChoice compact legendHidden name={`pool-${p.id}`} value={effective} ceiling={ceiling} busy={busy === p.id} onChange={(d) => assign(p.id, d)} />
                {rowErr[p.id] ? <div style={{ marginTop: 8 }}><ErrorBox error={rowErr[p.id]} /></div> : null}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const GD_CSS = `
.gd-grant{display:inline-flex;align-items:center;gap:6px;flex-wrap:wrap;font-weight:700;color:var(--wka-text)}
.gd-grant svg{color:var(--wka-accent);flex:none}
.gd-grant.deep svg{color:var(--wka-emerald)}
.gd-grant-tag{display:inline-flex;align-items:center;padding:1px 8px;border-radius:999px;font-size:10.5px;font-weight:700;color:var(--wka-muted);border:1px solid var(--wka-line-2);background:var(--wka-bg-2);white-space:nowrap;flex:none}
.gd-raise{flex-wrap:wrap}
.gd-raise>span{flex:1 1 220px;min-width:0}
.gd-raise .wka-btn{flex:none;white-space:nowrap}
.gd-pools{display:flex;flex-direction:column;gap:12px}
.gd-pool{padding:12px 14px;border:1px solid var(--wka-line);border-radius:12px;background:var(--wka-bg-2);min-width:0}
.gd-pool-h{display:flex;align-items:center;gap:8px 10px;flex-wrap:wrap;margin-bottom:10px;min-width:0}
.gd-pool-n{font-size:14px;font-weight:700;color:var(--wka-text)}
.gd-pool-h .wka-chip{white-space:nowrap;flex:none}
.gd-pool-s{margin-left:auto;display:inline-flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:12px;min-width:0}
.gd-dim{color:var(--wka-faint)}
.gd-clamp{color:var(--wka-amber);font-weight:600;overflow-wrap:anywhere}
@media(max-width:720px){.gd-pool-s{margin-left:0;width:100%}}
`
