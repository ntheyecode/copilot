// /work/queue: the full Worker queue (a child route of WorkAppLayout). Shown in
// the rail to anyone who can receive assignments (worker or mixed flow). A toggle
// includes completed tasks (GET /api/work/my/assigned?done=1).
import { useState } from 'react'
import { Inbox, Info } from 'lucide-react'
import { useT } from '../../../i18n/index.jsx'
import { useWorkApp } from '../WorkAppContext.jsx'
import { PJ_CSS } from '../projects/projects.css.js'
import { EP_CSS } from './ep.css.js'
import WorkerQueue from './WorkerQueue.jsx'

export default function QueuePage() {
  const t = useT()
  const { roleView } = useWorkApp()
  const [done, setDone] = useState(false)
  return (
    <div className="wd-ep">
      <style>{PJ_CSS}{EP_CSS}</style>
      <div className="wd-sec">
        <span className="wd-ic alt"><Inbox size={17} /></span>
        <div>
          <h2>{t('workPm.queue.heading')}</h2>
          <p>{t('workPm.queue.sub')}</p>
        </div>
        <button type="button" className={`wd-ep-filter wd-ep-head-act${done ? ' on' : ''}`} onClick={() => setDone((v) => !v)} aria-pressed={done}>{done ? t('workPm.queue.hideDone') : t('workPm.queue.showDone')}</button>
      </div>
      {roleView.isWorker && <div className="wd-ep-note"><Info size={14} /> <span>{t('workPm.queue.workerNote')}</span></div>}
      <WorkerQueue includeDone={done} canStart={roleView.canStart} />
    </div>
  )
}
