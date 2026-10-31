// Opens a workflow draft in the wizard from a `?draft=<id>` link (the Workflow
// issues inbox links here after a suggested step was added to a draft). Once the
// list has loaded, the record is taken from it, or fetched when it is not there;
// the parameter is then removed so a reload does not reopen the wizard. A draft
// that cannot be opened (deleted, published since, not yours) leaves the list
// as it is and calls onGone, so the studio can say so instead of doing nothing.
import { useEffect, useRef } from 'react'
import { api } from '../../../api.js'

export function useDraftDeepLink(workflows, openForEdit, onGone) {
  const goneRef = useRef(onGone)
  goneRef.current = onGone
  const gone = () => { if (goneRef.current) goneRef.current() }
  const done = useRef(false)
  useEffect(() => {
    if (done.current || workflows == null || typeof window === 'undefined') return
    const url = new URL(window.location.href)
    const id = url.searchParams.get('draft')
    if (!id) return
    done.current = true
    url.searchParams.delete('draft')
    window.history.replaceState(window.history.state, '', url.pathname + (url.search || '') + url.hash)
    const hit = workflows.find((w) => w && String(w.id) === String(id))
    if (hit) { if (hit.state === 'draft') openForEdit(hit); else gone(); return }
    api.workflowGet(id)
      .then((r) => { const w = (r && r.workflow) || r; if (w && w.id && w.state === 'draft') openForEdit(w); else gone() })
      .catch(() => gone())
  }, [workflows, openForEdit])
}

export default useDraftDeepLink
