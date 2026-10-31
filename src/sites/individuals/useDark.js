// Is the individuals site rendering its dark theme right now? The same rule
// the stylesheet applies (site.css.js): an explicit data-theme="dark" on the
// document, or the system preference when nothing pinned light. Used where a
// child cannot read the tokens, like the brand lockup's inline colors.
import { useEffect, useState } from 'react'

function readDark() {
  if (typeof document === 'undefined') return false
  const pinned = document.documentElement.getAttribute('data-theme')
  if (pinned === 'dark') return true
  if (pinned === 'light') {
    // The public document carries data-theme="light" by default (the product
    // shell owns that attribute), so the system preference still decides.
  }
  try { return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) } catch { return false }
}

export function useDark() {
  const [dark, setDark] = useState(readDark)
  useEffect(() => {
    let mq = null
    try { mq = window.matchMedia('(prefers-color-scheme: dark)') } catch { mq = null }
    const update = () => setDark(readDark())
    update()
    if (mq && mq.addEventListener) mq.addEventListener('change', update)
    const mo = typeof MutationObserver !== 'undefined' ? new MutationObserver(update) : null
    if (mo) mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => { if (mq && mq.removeEventListener) mq.removeEventListener('change', update); if (mo) mo.disconnect() }
  }, [])
  return dark
}
