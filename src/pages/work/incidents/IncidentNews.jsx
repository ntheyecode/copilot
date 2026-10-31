// "New since your last visit": the workflow alerts that were unread when the
// inbox opened, each worded in the reader's language from its structured
// fields (incidentsModel.alertTitle), never from server text. Shown for this
// visit only; the hook marks them read on the server.
import React from 'react'
import { BellDot } from 'lucide-react'
import { useLocale } from '../../../i18n/index.jsx'
import { alertTitle, relTime } from './incidentsModel.js'

const SHOWN = 5

export default function IncidentNews({ alerts, nowMs, onShow }) {
  const { t, tag } = useLocale()
  if (!Array.isArray(alerts) || alerts.length === 0) return null
  const shown = alerts.slice(0, SHOWN)
  const more = alerts.length - shown.length
  return (
    <section className="wfi-news" aria-labelledby="wfi-news-h">
      <h2 id="wfi-news-h"><BellDot size={16} /> {t('wfIssues.news.title')}</h2>
      <ul>
        {shown.map((a) => {
          const { key, vars, untitled } = alertTitle(a)
          const text = t(key, { ...vars, workflow: untitled ? t('wfIssues.row.untitled') : vars.workflow })
          return (
            <li key={a.id}>
              <span className="wfi-news-t" dir="auto" title={text}>{text}</span>
              <span className="wfi-news-when">{relTime(a.at, nowMs, tag)}</span>
              {a.incidentId && <button type="button" className="wka-btn sm ghost" onClick={() => onShow(a.incidentId)}>{t('wfIssues.news.open')}</button>}
            </li>
          )
        })}
      </ul>
      {more > 0 && <div className="wfi-news-more">{t.n('wfIssues.news.more', more, { n: more })}</div>}
    </section>
  )
}
