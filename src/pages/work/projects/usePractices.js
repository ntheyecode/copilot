// Recommended Practices (plan-time): the client side of the shipped server MVP.
// Once a Depth-2 project's map has loaded, POST /api/work/projects/:id/practices
// returns grounded suggestions ({ id, source, disciplineKey, kind, title,
// rationale, proposed:{ taskDescriptor } }). Accept ropes one into the map
// through the server (which dedupes and places it); dismiss is client-side and
// remembered for the browser session. Entitlement is the server's call: a 403
// needsUpgrade (or any failure) yields NO cards, never an error, because the
// suggestions are an aside to the plan, not part of it (owner: cards never block
// the plan). Pure state + I/O here; PracticeCards.jsx only renders.
import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../../../api.js'

export const PRACTICE_MAX_CARDS = 3
const KEY = (projectId) => `wc.practices.dismissed.${projectId}`

function readDismissed(projectId) {
  try { const v = JSON.parse(sessionStorage.getItem(KEY(projectId)) || '[]'); return Array.isArray(v) ? v.map(String) : [] } catch { return [] }
}
function writeDismissed(projectId, ids) {
  try { sessionStorage.setItem(KEY(projectId), JSON.stringify(ids)) } catch { /* storage may be unavailable; the in-memory list still applies */ }
}

// Plain-words source label key (never a model or provider name): the server's
// `source` is a closed set, mapped here once. Unknown sources read as generic.
export function sourceLabelKey(source) {
  if (source === 'company_brain') return 'workProjects.practices.srcCompany'
  if (source === 'platform') return 'workProjects.practices.srcPlatform'
  if (source === 'discipline_catalog') return 'workProjects.practices.srcCatalog'
  return 'workProjects.practices.srcGeneric'
}

// `ready` = the project map has loaded (the hook does nothing before that).
// `onAccepted(result)` runs after a successful accept, with the server's inject
// result, so the view can refresh its one source of truth and show the notice.
export function usePractices(projectId, ready, onAccepted) {
  const [all, setAll] = useState([])
  const [dismissed, setDismissed] = useState(() => (projectId ? readDismissed(projectId) : []))
  const [busyId, setBusyId] = useState(null)
  const [failedId, setFailedId] = useState(null)
  const alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  useEffect(() => { setDismissed(projectId ? readDismissed(projectId) : []) }, [projectId])

  const fetchSuggestions = useCallback(() => {
    if (!projectId) return Promise.resolve()
    return api.workProjectPractices(projectId)
      .then((r) => { if (alive.current) setAll(Array.isArray(r && r.suggestions) ? r.suggestions.filter((s) => s && s.id) : []) })
      // 403 needsUpgrade, 404, a network blip: no cards. Nothing is surfaced.
      .catch(() => { if (alive.current) setAll([]) })
  }, [projectId])
  useEffect(() => { if (ready) fetchSuggestions() }, [ready, fetchSuggestions])

  const dismiss = useCallback((sid) => {
    setDismissed((d) => { const next = d.includes(sid) ? d : [...d, sid]; writeDismissed(projectId, next); return next })
  }, [projectId])

  const accept = useCallback(async (sid) => {
    if (busyId) return
    setBusyId(sid); setFailedId(null)
    try {
      const out = await api.workAcceptPractice(projectId, sid)
      if (!alive.current) return
      // The accepted one leaves the list at once; the map is re-read by the
      // caller, then the suggestions are re-derived so a now-covered practice
      // does not come back.
      setAll((l) => l.filter((s) => s.id !== sid))
      if (onAccepted) await onAccepted(out)
      fetchSuggestions()
    } catch {
      // Keep the card; mark it so the view can show a quiet retry state.
      if (alive.current) setFailedId(sid)
    } finally { if (alive.current) setBusyId(null) }
  }, [projectId, busyId, onAccepted, fetchSuggestions])

  const visible = all.filter((s) => !dismissed.includes(String(s.id))).slice(0, PRACTICE_MAX_CARDS)
  return { suggestions: visible, accept, dismiss, busyId, failedId }
}
