// Live plan numbers for the individuals site, through the ONE view model the
// whole product reads (src/pricingModel.js): loading -> live, or the labelled
// list-price fallback when /api/work/pricing cannot be reached (never silent).
import { useCallback, useEffect, useMemo, useState } from 'react'
import { normalizePricing, LIST_PRICE_FALLBACK } from '../../pricingModel.js'

export function usePricing() {
  const [raw, setRaw] = useState(null)
  const [state, setState] = useState('loading')   // loading | live | fallback
  const load = useCallback(() => {
    setState('loading')
    fetch('/api/work/pricing')
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json() })
      .then((j) => { setRaw(j); setState('live') })
      .catch(() => { setRaw(LIST_PRICE_FALLBACK); setState('fallback') })
  }, [])
  useEffect(() => { load() }, [load])
  const model = useMemo(() => normalizePricing(raw), [raw])
  return { model, state, loading: state === 'loading', fallback: state === 'fallback', reload: load }
}
