// Data for the Workflow issues inbox: the incident list for a state filter, the
// alerts that were unread when the page opened (shown once as "New since your
// last visit", then marked read), and the two writes (state change, adopt) with
// their failures mapped to i18n keys by incidentsModel.errorKey. Rendering lives
// in the page and its rows; this owns fetching and state only.
import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../../../api.js'
import { stateParam, replaceIncident, unreadAlerts, errorKey, shouldReload, cleanNote } from './incidentsModel.js'

export function useWorkflowIncidents({ enabled, filter }) {
  const [data, setData] = useState(null)          // { incidents, summary, canManage }
  const [loadErr, setLoadErr] = useState('')      // i18n key
  const [news, setNews] = useState(null)          // unread alerts at open, or null until known
  const seq = useRef(0)
  const alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])

  const load = useCallback(() => {
    if (!enabled) return Promise.resolve()
    const n = ++seq.current
    setLoadErr('')
    return api.workflowIncidents({ state: stateParam(filter) })
      .then((r) => {
        if (!alive.current || n !== seq.current) return
        // Tagged with its filter, so the page never shows one filter's rows
        // under another filter's button while a load is in flight.
        setData({ filter, incidents: (r && r.incidents) || [], summary: (r && r.summary) || {}, canManage: !!(r && r.canManage) })
      })
      .catch((e) => { if (alive.current && n === seq.current) setLoadErr(errorKey(e, 'load')) })
  }, [enabled, filter])

  useEffect(() => { load() }, [load])

  // Unread alerts are read ONCE per visit and kept on screen for this visit;
  // the inbox then counts as seen, so they are marked read on the server.
  useEffect(() => {
    if (!enabled) return undefined
    let live = true
    api.workflowAlerts(50)
      .then((r) => {
        if (!live) return
        const fresh = unreadAlerts(r && r.alerts)
        setNews(fresh)
        // Mark exactly the alerts shown, by id: one that lands after this read
        // stays unread and shows on the next visit instead of being lost.
        for (const a of fresh) api.workflowAlertsRead(a.id).catch(() => { /* the badge just stays until next visit */ })
      })
      .catch(() => { if (live) setNews([]) })
    return () => { live = false }
  }, [enabled])

  // Returns { ok: true, incident } or { ok: false, errKey }.
  const setState = useCallback(async (id, state, note) => {
    try {
      const r = await api.workflowIncidentSetState(id, state, cleanNote(note) || undefined)
      const inc = r && r.incident
      if (alive.current && inc) setData((d) => (d ? { ...d, incidents: replaceIncident(d.incidents, inc) } : d))
      load()   // the summary counts move with the state
      return { ok: true, incident: inc }
    } catch (e) {
      if (shouldReload(e)) load()
      return { ok: false, errKey: errorKey(e, 'state') }
    }
  }, [load])

  const adopt = useCallback(async (id) => {
    try {
      const r = await api.workflowIncidentAdopt(id)
      const inc = r && r.incident
      if (alive.current && inc) setData((d) => (d ? { ...d, incidents: replaceIncident(d.incidents, inc) } : d))
      load()
      return { ok: true, incident: inc, draftId: (r && r.workflow && r.workflow.id) || (inc && inc.draftId) || null }
    } catch (e) {
      if (shouldReload(e)) load()
      return { ok: false, errKey: errorKey(e, 'adopt') }
    }
  }, [load])

  return { data, loadErr, news, reload: load, setState, adopt }
}

export default useWorkflowIncidents
