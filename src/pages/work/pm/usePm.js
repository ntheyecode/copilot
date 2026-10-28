// Data hooks for the enterprise project-management pages. One small loader
// (useLoad) with the StrictMode-safe mount guard, and thin hooks over the
// src/api.js calls. Every hook exposes reload so a mutation re-reads the one
// source of truth instead of patching a local copy. Permission failures (403)
// are kept distinct from connection errors so the page can render an honest
// "not part of your role" instead of a retry loop (SUPREME VIII).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../../../api.js'
import { peopleIndex, nameFor } from './pmModel.js'

export function useLoad(fn, deps, { enabled = true } = {}) {
  const [data, setData] = useState(null)
  const [loaded, setLoaded] = useState(false)
  const [err, setErr] = useState(null)   // null | 'denied' | 'notfound' | 'error'
  const alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fn, deps)
  const reload = useCallback(() => {
    if (!enabled) { setLoaded(true); return Promise.resolve() }
    setErr(null)
    return run()
      .then((r) => { if (alive.current) setData(r) })
      .catch((e) => { if (!alive.current) return; setErr(e && e.status === 403 ? 'denied' : e && e.status === 404 ? 'notfound' : 'error') })
      .finally(() => { if (alive.current) setLoaded(true) })
  }, [run, enabled])
  useEffect(() => { reload() }, [reload])
  return { data, loaded, err, reload }
}

export function usePmProjects(managerId) {
  const r = useLoad(() => api.workPmProjects(managerId || ''), [managerId])
  return { ...r, projects: Array.isArray(r.data && r.data.projects) ? r.data.projects : [] }
}
export function usePmProject(id) {
  const r = useLoad(() => api.workPmProject(id), [id], { enabled: !!id })
  return { ...r, project: (r.data && r.data.project) || null }
}
export function useAssigned(includeDone) {
  const r = useLoad(() => api.workMyAssigned(includeDone), [includeDone])
  return { ...r, assigned: Array.isArray(r.data && r.data.assigned) ? r.data.assigned : [] }
}
export function useGrcStats(enabled = true) {
  const r = useLoad(() => api.workGrcStats(), [], { enabled })
  return { ...r, stats: (r.data && r.data.stats) || null }
}
export function useGrcRisks(enabled = true) {
  const r = useLoad(() => api.workGrcRisks(), [], { enabled })
  return { ...r, risks: Array.isArray(r.data && r.data.risks) ? r.data.risks : [] }
}
export function useGrcLog(projectId, limit, enabled = true) {
  const r = useLoad(() => api.workGrcLog(projectId || '', limit || 0), [projectId, limit], { enabled })
  return { ...r, log: Array.isArray(r.data && r.data.log) ? r.data.log : [] }
}
export function useProductivity(uid) {
  const r = useLoad(() => api.workPmProductivity(uid), [uid], { enabled: !!uid })
  return { ...r, productivity: (r.data && r.data.productivity) || null }
}

// The company people directory. Readable by a company admin; a PM / Sr PM / GRC
// gets 403 (denied) and the index falls back to the ids seen in the data, so
// every surface still labels and picks people, by id. `nameOf` is the ONE lookup.
export function usePeople({ me, projects, stats, log, fallback } = {}) {
  const r = useLoad(() => api.workCompanyUsers(), [])
  const users = Array.isArray(r.data && r.data.users) ? r.data.users : []
  const denied = r.err === 'denied'
  const index = useMemo(() => peopleIndex(users, { projects, stats, log, me }), [users, projects, stats, log, me])
  const nameOf = useCallback((id) => nameFor(index, id, fallback), [index, fallback])
  const people = useMemo(() => [...index.values()], [index])
  return { people, index, nameOf, denied, loaded: r.loaded, reload: r.reload }
}
