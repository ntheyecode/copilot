// The upload queue behind "Add documents": files are added one after another
// (the server reads, masks and stores one document per request), each with
// its own phase and outcome, so the admin sees per-file truth and never a
// fake overall percentage. Pure orchestration: the rules (pre-flight, result
// sentences, error keys) are in uploadModel.js; the request is api.js.
//
// item = { id, name, size, file, phase: 'queued'|'reading'|'storing'|'done'|'failed',
//          result: server response | null, error: { key, locked, retry } | null }
import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../../../../api.js'
import { readFileAsBase64 } from '../../../work/brain/readFile.js'
import { preflight, errorOf } from './uploadModel.js'

let seq = 0
const nextId = () => `doc-${Date.now().toString(36)}-${++seq}`

export function useDocumentQueue({ onAdded } = {}) {
  const [items, setItems] = useState([])
  const running = useRef(false)
  const alive = useRef(false)
  const onAddedRef = useRef(onAdded)
  onAddedRef.current = onAdded

  const patch = useCallback((id, up) => {
    setItems((list) => list.map((it) => (it.id === id ? { ...it, ...up } : it)))
  }, [])

  // Process queued items one after another. Driven by the items list so a
  // file added while another is in flight waits its turn.
  const pump = useCallback(async (list) => {
    if (running.current) return
    const next = list.find((it) => it.phase === 'queued')
    if (!next) return
    running.current = true
    try {
      const pre = preflight(next.file)
      if (pre) { patch(next.id, { phase: 'failed', error: errorOf(pre) }); return }
      patch(next.id, { phase: 'reading' })
      let dataBase64
      try { dataBase64 = await readFileAsBase64(next.file) }
      catch (e) { patch(next.id, { phase: 'failed', error: errorOf(e) }); return }
      if (!alive.current) return
      patch(next.id, { phase: 'storing' })
      try {
        const r = await api.workBrainDocumentAdd({ name: next.file.name, mime: next.file.type || '', dataBase64 })
        if (!alive.current) return
        patch(next.id, { phase: 'done', result: r, error: null })
        if (onAddedRef.current) onAddedRef.current(r, next)
      } catch (e) {
        if (!alive.current) return
        patch(next.id, { phase: 'failed', error: errorOf(e) })
      }
    } finally { running.current = false }
  }, [patch])

  useEffect(() => {
    // StrictMode mounts twice: the flag is set in the effect body, never only
    // reset in cleanup, so the async pump always sees a live component.
    alive.current = true
    return () => { alive.current = false }
  }, [])

  useEffect(() => { pump(items) }, [items, pump])

  // Accept a FileList or an array of File; every file gets its own row.
  const add = useCallback((files) => {
    const list = Array.from(files || []).filter(Boolean)
    if (!list.length) return
    setItems((cur) => [...cur, ...list.map((f) => ({ id: nextId(), name: f.name, size: f.size, file: f, phase: 'queued', result: null, error: null }))])
  }, [])

  // Try a failed file again (its File object is still held).
  const retry = useCallback((id) => {
    setItems((cur) => cur.map((it) => (it.id === id && it.phase === 'failed' ? { ...it, phase: 'queued', error: null } : it)))
  }, [])

  const dismiss = useCallback((id) => {
    setItems((cur) => cur.filter((it) => it.id !== id || it.phase === 'reading' || it.phase === 'storing'))
  }, [])

  // Drop every finished row (done or failed); in-flight and queued rows stay.
  const clearFinished = useCallback(() => {
    setItems((cur) => cur.filter((it) => it.phase === 'queued' || it.phase === 'reading' || it.phase === 'storing'))
  }, [])

  const busy = items.some((it) => it.phase === 'reading' || it.phase === 'storing' || it.phase === 'queued')
  return { items, add, retry, dismiss, clearFinished, busy }
}
