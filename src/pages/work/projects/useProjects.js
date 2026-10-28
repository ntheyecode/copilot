// Data hooks for the Projects surface. The server is the entitlement authority:
// a non-deep user gets 403 { needsUpgrade } on the list, which the page renders
// as the Premium prompt (never a dead end), while a connection hiccup stays a
// retryable error (SUPREME VIII actionable state). Both hooks expose reload so
// a state change re-reads the one source of truth instead of patching a copy.
import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../../../api.js'

const isGate = (e) => !!(e && e.status === 403 && e.data && e.data.needsUpgrade)

export function useProjectsList(customerId) {
  const [projects, setProjects] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [err, setErr] = useState(false)
  const [gated, setGated] = useState(false)
  // Mount guard. Set true IN the effect (not only at init): StrictMode runs
  // mount -> cleanup -> mount in dev, and a cleanup-only flag would stay false
  // forever, silently dropping every result (the hook then never loads).
  const alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  const reload = useCallback(() => {
    setErr(false)
    return api.workProjects(customerId || '')
      .then((r) => { if (!alive.current) return; setProjects(Array.isArray(r && r.projects) ? r.projects : []); setGated(false) })
      .catch((e) => { if (!alive.current) return; if (isGate(e)) { setGated(true); setProjects([]) } else setErr(true) })
      .finally(() => { if (alive.current) setLoaded(true) })
  }, [customerId])
  useEffect(() => { reload() }, [reload])
  return { projects, loaded, err, gated, reload }
}

export function useProject(id) {
  const [data, setData] = useState(null)   // { project, next, available }
  const [loaded, setLoaded] = useState(false)
  const [err, setErr] = useState(null)     // 'gate' | 'notfound' | 'error' | null
  const alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  const reload = useCallback(() => {
    if (!id) return Promise.resolve()
    setErr(null)
    return api.workProject(id)
      .then((r) => { if (alive.current && r && r.project) setData({ project: r.project, next: r.next || null, available: Array.isArray(r.available) ? r.available : [] }) })
      .catch((e) => { if (!alive.current) return; setErr(isGate(e) ? 'gate' : (e && e.status === 404) ? 'notfound' : 'error') })
      .finally(() => { if (alive.current) setLoaded(true) })
  }, [id])
  useEffect(() => { reload() }, [reload])
  return { data, loaded, err, reload }
}

// The company's customer list for the picker. Only a company admin may read it
// (server rule); a member gets 403 and the picker degrades to Default alone with
// a note that the administrator manages the list. Individuals never call this.
export function useCustomers(enabled) {
  const [customers, setCustomers] = useState(null)   // null = not loaded
  const [denied, setDenied] = useState(false)
  useEffect(() => {
    if (!enabled) { setCustomers(null); return undefined }
    let alive = true
    api.workCompanyCustomers()
      .then((r) => { if (alive) { setCustomers(Array.isArray(r && r.customers) ? r.customers : []); setDenied(false) } })
      .catch((e) => { if (alive) { setCustomers([]); setDenied(!!(e && e.status === 403)) } })
    return () => { alive = false }
  }, [enabled])
  return { customers, denied }
}
