// Executive dashboard drill-downs: a Projects view (status roll-up + the biggest
// projects with per-project completion) and a Performers view (top people on
// BOTH axes: by tasks and by projects). Read-only, company-scoped, no AI model
// or cost anywhere (the overview payload carries none; none is added). Pure
// presentation driven by api.workExecOverview(days). Small + single purpose.
import React from 'react'
import { FolderKanban, Users, Trophy, CheckCircle2, Loader2, PauseCircle } from 'lucide-react'
import { useT } from '../../i18n/index.jsx'
import { EmptyState } from '../workadmin/sections/_shared.jsx'

const nf = new Intl.NumberFormat('en-US')
const fmtInt = (n) => nf.format(Math.round(Number(n) || 0))
const clampPct = (n) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)))

// A horizontal completion meter (label-free; the number sits beside it).
function Prog({ pct }) {
  const v = clampPct(pct)
  return (
    <div className="xd-prog">
      <div className="xd-prog-track"><div className="xd-prog-fill" style={{ width: `${Math.max(3, v)}%` }} /></div>
      <span className="xd-prog-v">{v}%</span>
    </div>
  )
}

export function ProjectsDrilldown({ projects }) {
  const t = useT()
  const p = projects || {}
  const status = p.status || { done: 0, ongoing: 0, held: 0 }
  const top = Array.isArray(p.topByTasks) ? p.topByTasks : []
  return (
    <section className="wka-panel" style={{ marginTop: 20 }}>
      <h2><FolderKanban size={15} style={{ verticalAlign: -2, marginRight: 6, color: 'var(--wka-accent)' }} />{t('execPage.projects.title')}</h2>
      <p className="desc">{t('execPage.projects.hint', { total: fmtInt(p.total) })}</p>
      <div className="xd-status">
        <div className="xd-stat"><div className="n">{fmtInt(status.ongoing)}</div><div className="l"><span className="dot" style={{ background: 'var(--wka-accent)' }} /><Loader2 size={13} /> {t('execPage.projects.ongoing')}</div></div>
        <div className="xd-stat"><div className="n">{fmtInt(status.done)}</div><div className="l"><span className="dot" style={{ background: 'var(--wka-emerald)' }} /><CheckCircle2 size={13} /> {t('execPage.projects.done')}</div></div>
        <div className="xd-stat"><div className="n">{fmtInt(status.held)}</div><div className="l"><span className="dot" style={{ background: 'var(--wka-amber)' }} /><PauseCircle size={13} /> {t('execPage.projects.held')}</div></div>
      </div>
      {top.length === 0 ? (
        <EmptyState title={t('execPage.projects.emptyTitle')} detail={t('execPage.projects.emptyDetail')} />
      ) : (
        <div className="xd-scroll">
          <table className="xd-table">
            <thead>
              <tr>
                <th>{t('execPage.projects.thProject')}</th>
                <th>{t('execPage.projects.thManager')}</th>
                <th className="num">{t('execPage.projects.thTasks')}</th>
                <th className="num">{t('execPage.projects.thDone')}</th>
                <th className="num">{t('execPage.projects.thPeople')}</th>
                <th style={{ minWidth: 130 }}>{t('execPage.projects.thCompletion')}</th>
              </tr>
            </thead>
            <tbody>
              {top.map((r) => (
                <tr key={r.id}>
                  <td><div className="xd-name" title={r.name}>{r.name || t('execPage.projects.untitled')}</div></td>
                  <td><span className="xd-sub">{r.managerName || t('execPage.projects.noManager')}</span></td>
                  <td className="num">{fmtInt(r.taskCount)}</td>
                  <td className="num">{fmtInt(r.doneCount)}</td>
                  <td className="num">{fmtInt(r.assigneeCount)}</td>
                  <td><Prog pct={r.completionPct} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export function PerformersDrilldown({ performers }) {
  const t = useT()
  const pf = performers || {}
  const byTasks = Array.isArray(pf.byTasks) ? pf.byTasks : []
  const byProjects = Array.isArray(pf.byProjects) ? pf.byProjects : []
  return (
    <section className="wka-panel" style={{ marginTop: 20 }}>
      <h2><Trophy size={15} style={{ verticalAlign: -2, marginRight: 6, color: 'var(--wka-accent)' }} />{t('execPage.performers.title')}</h2>
      <p className="desc">{t('execPage.performers.hint')}</p>
      <div className="xd-two">
        {/* By tasks */}
        <div>
          <h2 style={{ fontSize: 13.5 }}><CheckCircle2 size={14} style={{ verticalAlign: -2, marginRight: 6, color: 'var(--wka-accent)' }} />{t('execPage.performers.byTasks')}</h2>
          {byTasks.length === 0 ? (
            <EmptyState title={t('execPage.performers.emptyTitle')} detail={t('execPage.performers.emptyDetail')} />
          ) : (
            <table className="xd-table">
              <thead><tr><th style={{ width: 34 }}>#</th><th>{t('execPage.performers.thPerson')}</th><th className="num">{t('execPage.performers.thTasks')}</th></tr></thead>
              <tbody>
                {byTasks.map((r, i) => (
                  <tr key={r.id || i}><td className="xd-sub">{i + 1}</td><td><div className="xd-name" title={r.name}>{r.name}</div></td><td className="num">{fmtInt(r.tasks)}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {/* By projects */}
        <div>
          <h2 style={{ fontSize: 13.5 }}><Users size={14} style={{ verticalAlign: -2, marginRight: 6, color: 'var(--wka-accent)' }} />{t('execPage.performers.byProjects')}</h2>
          {byProjects.length === 0 ? (
            <EmptyState title={t('execPage.performers.emptyTitle')} detail={t('execPage.performers.emptyDetailProjects')} />
          ) : (
            <div className="xd-scroll">
              <table className="xd-table">
                <thead><tr><th>{t('execPage.performers.thPerson')}</th><th className="num">{t('execPage.performers.thProjects')}</th><th className="num">{t('execPage.performers.thManages')}</th><th className="num">{t('execPage.performers.thAssigned')}</th><th className="num">{t('execPage.performers.thDone')}</th></tr></thead>
                <tbody>
                  {byProjects.map((r, i) => (
                    <tr key={r.id || i}>
                      <td><div className="xd-name" title={r.name}>{r.name}</div></td>
                      <td className="num">{fmtInt(r.projects)}</td>
                      <td className="num">{fmtInt(r.manages)}</td>
                      <td className="num">{fmtInt(r.tasksAssigned)}</td>
                      <td className="num">{fmtInt(r.tasksDone)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
