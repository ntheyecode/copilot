// The signed-in person's unread workflow-alert count, for the calm badge on the
// "Workflow issues" entry points (shell rail, Teach studio). Polls while the tab
// is visible, refreshes on return to the foreground, and stops for good on a 403
// (the person does not receive workflow incidents; the entry is hidden anyway).
// A network failure keeps the last known count: a badge never flickers to zero.
import { useEffect, useState } from 'react'
import { api } from '../../../api.js'

const POLL_MS = 60000

export function useWorkflowAlertsUnread(enabled) {
  const [unread, setUnread] = useState(0)
  useEffect(() => {
    if (!enabled) { setUnread(0); return undefined }
    let alive = true
    let stopped = false
    const load = () => {
      if (stopped || (typeof document !== 'undefined' && document.visibilityState === 'hidden')) return
      api.workflowAlerts(1)
        .then((r) => { if (alive) setUnread(Math.max(0, Number(r && r.unread) || 0)) })
        .catch((e) => { if (e && e.status === 403) stopped = true })
    }
    load()
    const id = setInterval(load, POLL_MS)
    const onVis = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', onVis)
    return () => { alive = false; clearInterval(id); document.removeEventListener('visibilitychange', onVis) }
  }, [enabled])
  return unread
}

export default useWorkflowAlertsUnread
