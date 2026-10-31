// Wave 3 step reading, editor side: pure helpers that join what the server
// returns (step ids, the step reader's suggestions) back into the editor rows
// without ever replacing what the trainer typed. Used by the wizard's review
// step; no React, unit-tested.
//
// A reading is { controlLabel, controlKind, doneWhen, confidence, shot, ... }.
// It is bound to the screenshot it was read from: it only lands on a row that
// still shows that screenshot.

const hasText = (r) => String((r && r.instruction) || '').trim() !== ''

// After a save, give each saved row the id the server assigned. The payload
// skipped rows with no instruction, so the server's steps line up with the rows
// that have one, in order. A row whose screenshot no longer matches keeps its own
// id (it was edited meanwhile and is matched on the next save). The saved
// step's reading is authoritative: a save drops a reading whose next screen
// changed, and the row must drop it too instead of keeping its stale copy.
export function hydrateStepIds(rows, savedSteps) {
  const saved = Array.isArray(savedSteps) ? savedSteps : []
  let k = 0
  return (Array.isArray(rows) ? rows : []).map((row) => {
    if (!hasText(row)) return row
    const s = saved[k++]
    if (!s || String(s.shot || '') !== String(row.shot || '')) return row
    return { ...row, id: String(s.id || row.id || ''), reading: s.reading && typeof s.reading === 'object' ? s.reading : null }
  })
}

// A save while the trainer keeps typing: the server's steps line up with the rows
// that were SENT (snapshot, hydrated with hydrateStepIds), not with the rows as
// they are when the answer arrives. Carry each sent row's id and reading onto the
// latest row with the same client key, still only while its screenshot matches.
export function hydrateByKey(latestRows, sentHydrated) {
  const byKey = new Map()
  for (const r of (Array.isArray(sentHydrated) ? sentHydrated : [])) if (r && r._k && r.id) byKey.set(r._k, r)
  return (Array.isArray(latestRows) ? latestRows : []).map((row) => {
    const s = row && byKey.get(row._k)
    if (!s || String(s.shot || '') !== String(row.shot || '')) return row
    return { ...row, id: s.id, reading: s.reading || null }
  })
}

// Does a row's reading still describe it? The same rule the server's
// carryReadings applies on save: read from the screenshot the row shows, and,
// when it was read with the next screen, that next screen is still the next
// row's. A reorder or removal otherwise offers a "done when" for a screen that
// no longer follows.
export function readingHolds(row, next) {
  const r = row && row.reading
  if (!r || !row.shot || r.shot !== row.shot) return false
  return !r.afterShot || r.afterShot === ((next && next.shot) || null)
}

// Put one fresh reading on the row with that id, only while it shows the same
// screenshot the reading came from.
export function applyStepReading(rows, stepId, reading) {
  if (!stepId || !reading) return rows
  return (Array.isArray(rows) ? rows : []).map((row) =>
    row.id === stepId && row.shot && row.shot === reading.shot ? { ...row, reading } : row)
}

// The trainer's explicit "use this": copy the suggestion into the fields. Only on
// that click; fields the reading has nothing for are left as typed.
export function acceptReading(row) {
  const r = row && row.reading
  if (!r) return row
  return {
    ...row,
    target: r.controlLabel ? r.controlLabel : row.target,
    doneWhen: r.doneWhen ? r.doneWhen : row.doneWhen,
  }
}

// Rows the reader can work on: saved (have an id), have a screenshot, and have
// no reading that still holds (or force = read again).
export function rowsToRead(rows, { force = false } = {}) {
  const list = Array.isArray(rows) ? rows : []
  return list.filter((row, i) =>
    row.id && row.shot && hasText(row) && (force || !readingHolds(row, list[i + 1])))
}

// How sure the reader was, as a band the UI words and colors: high >= 0.8,
// medium >= 0.5, else low. A reading with no control label has no label band.
export function confidenceBand(reading) {
  if (!reading || !reading.controlLabel) return 'none'
  const c = Number(reading.confidence) || 0
  return c >= 0.8 ? 'high' : c >= 0.5 ? 'medium' : 'low'
}

// Does the suggestion differ from what the row already says? (Hide "Use" when not.)
export function readingDiffers(row) {
  const r = row && row.reading
  if (!r) return false
  const same = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase()
  return (!!r.controlLabel && !same(r.controlLabel, row.target)) || (!!r.doneWhen && !same(r.doneWhen, row.doneWhen))
}
