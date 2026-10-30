// A small always-on-top window for the recorder controls (Document
// Picture-in-Picture, current Chromium browsers). While the trainer works in the
// app being taught, Mark step, Pause and the timer stay in reach without
// switching back to this tab. The page's style sheets and theme attributes are
// copied in so the controls look the same. Where the API is missing the
// controls simply stay in the page; so do they when the browser refuses the
// window (`failed`, so the UI stops offering it). usePopout() -> { win, supported, failed, open, close }
import { useCallback, useEffect, useRef, useState } from 'react'

export function popoutSupported() {
  return typeof window !== 'undefined' && !!window.documentPictureInPicture && typeof window.documentPictureInPicture.requestWindow === 'function'
}

function copyLook(from, to) {
  for (const sheet of Array.from(from.styleSheets)) {
    try {
      const css = Array.from(sheet.cssRules).map((r) => r.cssText).join('\n')
      const el = to.createElement('style'); el.textContent = css; to.head.appendChild(el)
    } catch {
      if (sheet.href) { const l = to.createElement('link'); l.rel = 'stylesheet'; l.href = sheet.href; to.head.appendChild(l) }
    }
  }
  for (const a of Array.from(from.documentElement.attributes)) {
    if (a.name === 'lang' || a.name === 'dir' || a.name.startsWith('data-')) to.documentElement.setAttribute(a.name, a.value)
  }
  to.body.style.margin = '0'
}

export function usePopout() {
  const [win, setWin] = useState(null)
  const [failed, setFailed] = useState(false)
  const ref = useRef(null)
  const supported = popoutSupported()

  const close = useCallback(() => {
    const w = ref.current
    ref.current = null
    setWin(null)
    if (w) { try { w.close() } catch { /* already closed */ } }
  }, [])

  const open = useCallback(async ({ width = 380, height = 168, title = '' } = {}) => {
    if (!popoutSupported() || ref.current) return ref.current
    try {
      const w = await window.documentPictureInPicture.requestWindow({ width, height })
      copyLook(document, w.document)
      if (title) w.document.title = title
      w.addEventListener('pagehide', () => { if (ref.current === w) { ref.current = null; setWin(null) } })
      ref.current = w
      setWin(w)
      return w
    } catch { setFailed(true); return null }
  }, [])

  useEffect(() => () => close(), [close])
  return { win, supported, failed, open, close }
}

export default usePopout
