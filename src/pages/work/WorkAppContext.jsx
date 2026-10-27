// Shared context for the WorkCoPilot signed-in app. WorkAppLayout loads the
// identity, entitlement/usage, pricing, AI readiness and buddy preference ONCE
// and exposes them here, so every page (Dashboard, StartTask, Skills, Help,
// Support, Guiding) reads the same live values and the plan pill never drifts
// after navigation (restructure plan risk G2).
import { createContext, useContext } from 'react'

export const WorkAppContext = createContext(null)

export function useWorkApp() {
  const v = useContext(WorkAppContext)
  if (!v) throw new Error('useWorkApp must be used inside WorkAppLayout')
  return v
}
