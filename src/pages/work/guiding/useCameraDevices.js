// The cameras this browser can see, for the Setup tab's picker. Labels only
// appear once the camera permission is granted, so the list is re-read when a
// capture starts (the `revision` input) and whenever a device is plugged or
// unplugged (`devicechange`). Never throws: a browser without the API reads
// 'unsupported', a failed read 'none'.
import { useCallback, useEffect, useState } from 'react'

export function useCameraDevices({ enabled = true, revision = 0 } = {}) {
  const [cameras, setCameras] = useState([])
  const [state, setState] = useState('idle')   // idle | loading | ok | none | unsupported

  const refresh = useCallback(async () => {
    const md = typeof navigator !== 'undefined' ? navigator.mediaDevices : null
    if (!md || typeof md.enumerateDevices !== 'function') { setCameras([]); setState('unsupported'); return [] }
    setState('loading')
    try {
      const list = (await md.enumerateDevices()).filter((d) => d && d.kind === 'videoinput')
      const out = list.map((d) => ({ id: d.deviceId || '', label: d.label || '' }))
      setCameras(out); setState(out.length ? 'ok' : 'none')
      return out
    } catch {
      setCameras([]); setState('none')
      return []
    }
  }, [])

  useEffect(() => {
    if (!enabled) return undefined
    refresh()
    const md = typeof navigator !== 'undefined' ? navigator.mediaDevices : null
    if (!md || typeof md.addEventListener !== 'function') return undefined
    md.addEventListener('devicechange', refresh)
    return () => { try { md.removeEventListener('devicechange', refresh) } catch { /* ignore */ } }
  }, [enabled, revision, refresh])

  return { cameras, state, refresh }
}
