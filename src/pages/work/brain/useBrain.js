// State and actions for the "Your brain" page: load what it learned, learn
// from one document, forget one learning / one source / everything. The API
// (server/personal_brain_routes.js) returns the whole view after every change,
// so the page never guesses: `data` is always what the server holds. Errors
// become message keys through brainModel.errorKey; the page translates them.
import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../../../api.js'
import { checkFile, errorKey, fileErrorKey } from './brainModel.js'
import { readFileAsBase64 } from './readFile.js'

export function useBrain({ enabled = true } = {}) {
  const [data, setData] = useState(null)        // null = not loaded yet
  const [loadErr, setLoadErr] = useState(null)  // { key }
  const [working, setWorking] = useState(null)  // { name } while a document is learned
  const [result, setResult] = useState(null)    // the last learn response
  const [err, setErr] = useState(null)          // { key, upgrade, max, name }
  const [busyId, setBusyId] = useState(null)    // id of the learning / source being forgotten
  const alive = useRef(false)

  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])

  const load = useCallback(async () => {
    setLoadErr(null)
    // A failed load leaves `data` null: the page shows the error with a retry,
    // never an empty "nothing learned yet" it cannot vouch for.
    try { const r = await api.meBrain(); if (alive.current) setData(r) }
    catch (e) { if (alive.current) setLoadErr(errorKey(e)) }
  }, [])
  useEffect(() => { if (enabled) load() }, [enabled, load])

  const learn = useCallback(async (file) => {
    const name = String((file && file.name) || '')
    setErr(null); setResult(null)
    const check = checkFile(file)
    if (!check.ok) { setErr({ key: fileErrorKey(check.reason), upgrade: false, name }); return false }
    setWorking({ name })
    try {
      const dataBase64 = await readFileAsBase64(file)
      const r = await api.meBrainLearn({ name, mime: file.type || '', dataBase64 })
      if (!alive.current) return true
      setData((d) => ({ ...(d || {}), sources: r.sources, learnings: r.learnings }))
      setResult(r)
      return true
    } catch (e) {
      if (alive.current) setErr({ ...errorKey(e), name })
      return false
    } finally { if (alive.current) setWorking(null) }
  }, [])

  // One call shape for the three forget actions: the server answers with the
  // new view; a 404 means it was already gone, so the view is reloaded.
  const run = useCallback(async (id, call) => {
    setErr(null); setBusyId(id)
    try {
      const r = await call()
      if (alive.current) setData((d) => ({ ...(d || {}), sources: r.sources, learnings: r.learnings }))
      return true
    } catch (e) {
      if (!alive.current) return false
      if (e && e.status === 404) { setErr({ key: 'gone', upgrade: false }); load() } else setErr({ key: 'forget', upgrade: false })
      return false
    } finally { if (alive.current) setBusyId(null) }
  }, [load])
  const forgetLearning = useCallback((id) => run(id, () => api.meBrainForgetLearning(id)), [run])
  const forgetSource = useCallback((id) => run(id, () => api.meBrainForgetSource(id)), [run])
  const clear = useCallback(() => run('all', () => api.meBrainClear()), [run])

  const dismissResult = useCallback(() => setResult(null), [])
  const dismissErr = useCallback(() => setErr(null), [])

  return { data, loadErr, working, result, err, busyId, load, learn, forgetLearning, forgetSource, clear, dismissResult, dismissErr }
}
