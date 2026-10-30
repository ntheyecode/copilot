// Load the published workflows this company member can run
// (api.workflowsList('published'), company-scoped and visibility-checked on the
// server) as display rows. `hidden` is true when the person has no company in
// scope (403), so the dashboard shows no section rather than an error.
import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../../../api.js'
import { workflowRow } from './runWorkflowModel.js'

export function useCompanyWorkflows(enabled = true) {
  const [rows, setRows] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [err, setErr] = useState(false)
  const [hidden, setHidden] = useState(false)
  const alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])

  const reload = useCallback(async () => {
    if (!enabled) return
    setErr(false); setLoaded(false)          // a retry shows loading, never a false empty state
    try {
      const r = await api.workflowsList('published')
      if (!alive.current) return
      const list = (r && Array.isArray(r.workflows) ? r.workflows : []).filter((w) => w && w.state === 'published')
      setRows(list.map(workflowRow).filter((x) => x.id && x.steps > 0))
      setHidden(false)
    } catch (e) {
      if (!alive.current) return
      if (e && e.status === 403) setHidden(true)
      else setErr(true)
    }
    if (alive.current) setLoaded(true)
  }, [enabled])
  useEffect(() => { reload() }, [reload])

  return { rows, loaded, err, hidden, reload }
}
