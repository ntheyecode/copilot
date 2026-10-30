// Modal focus for the inbox's small dialogs (adopt confirm, screenshot view):
// focus moves in ONCE on open, Tab stays inside, Escape closes (unless a save is
// in flight), and focus returns to whatever opened the dialog. The close handler
// is read through a ref, so a parent re-render (the minute tick, a reload) never
// re-runs this and never pulls focus back.
import { useEffect, useRef } from 'react'

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function useDialogFocus(boxRef, { onClose, busy = false, initialRef = null } = {}) {
  const closeRef = useRef(onClose)
  const busyRef = useRef(busy)
  closeRef.current = onClose
  busyRef.current = busy

  useEffect(() => {
    const opener = document.activeElement
    const box = boxRef.current
    const first = (initialRef && initialRef.current) || (box && box.querySelector(FOCUSABLE))
    if (first) first.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') { if (!busyRef.current && closeRef.current) closeRef.current(); return }
      if (e.key !== 'Tab' || !boxRef.current) return
      const items = [...boxRef.current.querySelectorAll(FOCUSABLE)]
      if (!items.length) { e.preventDefault(); return }
      const a = items[0], z = items[items.length - 1]
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus() }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus() }
      else if (!boxRef.current.contains(document.activeElement)) { e.preventDefault(); a.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      if (opener && typeof opener.focus === 'function' && document.contains(opener)) opener.focus()
    }
  }, [boxRef, initialRef])
}

export default useDialogFocus
