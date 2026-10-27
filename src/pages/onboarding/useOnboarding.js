// The onboarding state as the server reports it (GET /api/work/onboarding/state)
// is the single source of which step to render. Every mutation returns the fresh
// state too, so screens call `apply(newState)` instead of guessing.
import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../../api.js'

export default function useOnboarding(intent) {
  const [state, setState] = useState(null)
  const [error, setError] = useState('')
  const inflight = useRef(false)

  const refresh = useCallback(async (extraIntent) => {
    if (inflight.current) return null
    inflight.current = true
    const it = extraIntent || intent || {}
    try {
      const r = await api.onboardingState(it.plan || '', it.cycle && it.cycle !== 'monthly' ? it.cycle : '')
      setState(r); setError('')
      return r
    } catch (e) {
      setError((e && e.message) || 'offline')
      return null
    } finally { inflight.current = false }
  }, [intent && intent.plan, intent && intent.cycle])   // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { refresh() }, [refresh])

  // Screens hand back the state a mutation returned (same shape as GET state).
  const apply = useCallback((r) => { if (r && r.step) setState((prev) => ({ ...(prev || {}), ...r })) }, [])

  return { state, error, refresh, apply }
}
