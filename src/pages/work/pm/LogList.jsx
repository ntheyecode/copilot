// The append-only control log as a table (GET /api/work/grc/log): when, what,
// by whom, which project, and the detail (task, from -> to, reason). Used by the
// GRC dashboard (whole company, project filter) and the PM project view (one
// project). Names resolve through the ONE people lookup (nameOf); ids never
// render raw when a name is known. Shows `limit` rows with a Show more step.
import { useState } from 'react'
import { useLocale } from '../../../i18n/index.jsx'
import { logKind, projectNameOf, taskTitleOf } from './pmModel.js'

function fmtWhen(iso, tag) {
  try { return new Intl.DateTimeFormat(tag || undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(iso)) } catch { return String(iso || '') }
}

export default function LogList({ log, projects, nameOf, showProject = true, pageSize = 25 }) {
  const { t, tag } = useLocale()
  const [shown, setShown] = useState(pageSize)
  const rows = Array.isArray(log) ? log.filter(Boolean) : []
  if (rows.length === 0) return <div className="wd-ep-task-d">{t('workPm.grc.logEmpty')}</div>
  const detail = (e) => {
    const k = logKind(e)
    const parts = []
    if (e.taskId) parts.push(taskTitleOf(projects, e.projectId, e.taskId))
    if (k === 'task_assigned' || k === 'project_created') { if (e.to || e.managerId) parts.push(t('workPm.grc.to', { to: nameOf(e.to || e.managerId) })) }
    else if (k === 'task_reassigned' || k === 'project_reassigned') parts.push(t('workPm.grc.fromTo', { from: e.from ? nameOf(e.from) : t('workPm.common.noOne'), to: nameOf(e.to) }))
    if (e.reason) parts.push(`"${e.reason}"`)
    return parts.filter(Boolean).join(' / ')
  }
  const visible = rows.slice(0, shown)
  return (
    <div>
      <div className="wd-ep-log-wrap">
        <table className="wd-ep-log">
          <thead><tr><th>{t('workPm.grc.th.when')}</th><th>{t('workPm.grc.th.what')}</th><th>{t('workPm.grc.th.by')}</th>{showProject && <th>{t('workPm.grc.th.project')}</th>}<th>{t('workPm.grc.th.detail')}</th></tr></thead>
          <tbody>
            {visible.map((e, i) => (
              <tr key={`${e.at}-${i}`}>
                <td className="when">{fmtWhen(e.at, tag)}</td>
                <td className="what">{t(`workPm.grc.kind.${logKind(e)}`)}</td>
                <td className="by">{nameOf(e.by)}</td>
                {showProject && <td>{projectNameOf(projects, e.projectId)}</td>}
                <td className="detail">{detail(e)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > shown && (
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span className="wd-ep-tile-s">{t.n('workPm.grc.more', rows.length - shown, { n: rows.length - shown })}</span>
          <button type="button" className="wd-pj-btn" onClick={() => setShown((n) => n + pageSize)}>{t('workPm.grc.showMore')}</button>
        </div>
      )}
    </div>
  )
}
