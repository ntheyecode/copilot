// React hook for the wizard's "Read steps" pass (Wave 3). It WIRES the tested
// pure helpers (stepReadingModel.js, stepReadRun.js) to the read route:
//   save the draft (the wizard's persist, which hydrates server step ids) ->
//   rowsToRead -> ONE step at a time through api.workflowReadStep (never in
//   parallel: progress stays honest and a long workflow is never one burst) ->
//   applyStepReading with the reading the server stored for that step.
// Stop ends the pass after the step being read; that step's answer still lands
// (the server has already stored it). A global failure (no key, an AI that
// cannot see images, no permission, unavailable) ends the pass with one banner;
// a step failure is a note on that row and the pass moves on. Nothing here
// changes the trainer's own fields: suggestions are accepted per row.
import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../../../api.js'
import { applyStepReading, rowsToRead } from './stepReadingModel.js'
import { readErrorKind, readingFromWorkflow } from './stepReadRun.js'

// phase: 'idle' | 'saving' | 'reading'
const IDLE = { phase: 'idle', done: 0, total: 0, currentId: null, stopping: false }

// save(): persist the draft -> { id, rows } (rows carry server ids) or null.
// setRows(fn): the wizard's functional row setter.
export function useStepReader({ save, setRows }) {
  const [run, setRun] = useState(IDLE)
  const [notes, setNotes] = useState({})            // stepId -> { kind, shot }
  const [globalKind, setGlobalKind] = useState(null)
  const [last, setLast] = useState(null)            // { read, total, stopped } of the last pass
  const stopRef = useRef(false)
  const alive = useRef(true)
  // Set the flag in the body too: StrictMode runs this cleanup once on mount in
  // development, and a cleanup-only effect would leave it false for good.
  useEffect(() => {
    alive.current = true
    return () => { alive.current = false; stopRef.current = true }
  }, [])

  const setNote = (id, value) => setNotes((n) => {
    const next = { ...n }
    if (value) next[id] = value; else delete next[id]
    return next
  })

  // pick(rows) -> the saved rows to read, in order.
  const start = useCallback(async (pick) => {
    stopRef.current = false
    setGlobalKind(null); setLast(null)
    setRun({ ...IDLE, phase: 'saving' })
    const saved = await save()
    if (!alive.current) return
    if (!saved || !saved.id) { setRun(IDLE); return }
    const queue = pick(saved.rows)
    const total = queue.length
    let read = 0, stopped = false
    for (let i = 0; i < total; i++) {
      if (stopRef.current) { stopped = true; break }
      const row = queue[i]
      setRun((r) => ({ ...r, phase: 'reading', done: i, total, currentId: row.id }))
      try {
        const res = await api.workflowReadStep(saved.id, row.id)
        if (!alive.current) return
        const reading = readingFromWorkflow(res && res.workflow, row.id)
        if (reading) {
          setRows((rows) => applyStepReading(rows, row.id, reading))
          setNote(row.id, null)
          read++
        } else {
          setNote(row.id, { kind: 'unreadable', shot: row.shot })
        }
      } catch (e) {
        if (!alive.current) return
        const k = readErrorKind(e)
        if (k.scope === 'global') { setGlobalKind(k.kind); break }
        setNote(row.id, { kind: k.kind, shot: row.shot })
      }
    }
    if (!alive.current) return
    setRun(IDLE)
    setLast({ read, total, stopped })
  }, [save, setRows])

  // Every saved step with a screenshot that has no suggestion yet (force: all of them).
  const readAll = useCallback((force = false) => start((rows) => rowsToRead(rows, { force })), [start])
  // One step again, by its client row key (its server id may come with this save).
  const readOne = useCallback((rowKey) => start((rows) => rowsToRead(rows.filter((r) => r._k === rowKey), { force: true })), [start])
  const stop = useCallback(() => { stopRef.current = true; setRun((r) => (r.phase === 'idle' ? r : { ...r, stopping: true })) }, [])
  const dismissGlobal = useCallback(() => setGlobalKind(null), [])

  return {
    ...run,
    active: run.phase !== 'idle',
    notes, globalKind, last,
    readAll, readOne, stop, dismissGlobal,
    used: !!last || Object.keys(notes).length > 0,
  }
}
