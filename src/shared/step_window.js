// ---------------------------------------------------------------------------
// WorkCoPilot rolling step window - SINGLE SOURCE of the "show 5 steps" math.
// ---------------------------------------------------------------------------
// Consumed by ALL THREE guide surfaces so they stay identical:
//   - the full-screen guide roadmap rail  (src/pages/WorkFullGuide.jsx)
//   - the console step list                (src/pages/WorkPage.jsx)
//   - the floating PiP roadmap / "next up" (src/pages/WorkPage.jsx FloatPanel)
// Plain data only, no imports, so a Node script and the Vite client can each
// import it. No em dashes; American English.
//
// The window is a calm, rolling slice of the plan: the CURRENT step plus the
// next upcoming steps, up to WINDOW_SIZE total, with COMPLETED (done) steps
// hidden. As the current step is marked done it drops off, the next step
// becomes current, and the next-further step slides in at the bottom.
// ---------------------------------------------------------------------------

export const WINDOW_SIZE = 5

// The index of the current (active) step: the one whose status is 'current',
// otherwise the first step not yet 'done'. Returns -1 when there are no steps,
// or when every step is done (nothing is current).
export function currentStepIndex(steps) {
  if (!Array.isArray(steps) || steps.length === 0) return -1
  const ci = steps.findIndex((s) => s && s.status === 'current')
  if (ci >= 0) return ci
  return steps.findIndex((s) => s && s.status !== 'done') // -1 when all done
}

// The rolling window: the current step + the next not-done steps in order, up
// to `size` total, with done steps skipped. Each entry keeps the step's
// ORIGINAL array index so numbering (i + 1) and handlers (onStep(i, ...)) stay
// correct. Returns [] when there is no current step (all done, or no steps).
//   -> [{ step, index }, ...]
export function stepWindow(steps, size = WINDOW_SIZE) {
  if (!Array.isArray(steps) || steps.length === 0) return []
  const ci = currentStepIndex(steps)
  if (ci < 0) return []
  const out = []
  for (let i = ci; i < steps.length && out.length < size; i++) {
    const s = steps[i]
    if (!s || s.status === 'done') continue // completed steps never enter the window
    out.push({ step: s, index: i })
  }
  return out
}

// Counts for the quiet progress line near the window.
//   total        - every step on the plan
//   done         - how many are marked done
//   currentNumber- the 1-based number of the current step (total when all done)
//   allDone      - true when every step is done
//   hasMore      - true when the plan has steps beyond the visible window
export function stepProgress(steps, size = WINDOW_SIZE) {
  const total = Array.isArray(steps) ? steps.length : 0
  const done = total ? steps.filter((s) => s && s.status === 'done').length : 0
  const ci = currentStepIndex(steps)
  const allDone = total > 0 && ci < 0
  const currentNumber = ci >= 0 ? ci + 1 : total
  const win = stepWindow(steps, size)
  const lastShown = win.length ? win[win.length - 1].index : (ci >= 0 ? ci : total - 1)
  const hasMore = total > 0 && lastShown < total - 1
  return { total, done, currentNumber, allDone, hasMore }
}

// The progress sentence itself, in plain words (no em dashes). Examples:
//   "Step 7 of 20 · 6 done"   (middle dot separator, house style)
//   "All 20 steps done"
// `t` is the i18n translator, passed in as a parameter so this module stays pure
// (no React import): callers (console, floater, full guide) each hand it their
// own useT() result. The number logic stays here; only the words come from t.
export function progressText(steps, t, size = WINDOW_SIZE) {
  const { total, done, currentNumber, allDone } = stepProgress(steps, size)
  if (total === 0) return ''
  if (allDone) return t('usage.allStepsDone', { total })
  return t('usage.stepProgress', { current: currentNumber, total, done })
}

// A compact status marker for the full-plan list: 'done' | 'current' | 'upcoming'.
export function planMarker(step, index, steps) {
  if (step && step.status === 'done') return 'done'
  const ci = currentStepIndex(steps)
  if (index === ci) return 'current'
  return 'upcoming'
}
