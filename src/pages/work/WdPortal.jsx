// Portal for modals opened from a PAGE inside the signed-in shell. `.wd-main`
// is `position:relative; z-index:2` (a stacking context), so a fixed overlay
// rendered inside a page paints BELOW the rail (z-index 31) however high its
// own z-index is: at narrow widths the rail covered the left of the dialog.
// Rendering into the `.wd` element itself escapes that context while keeping
// the white-dashboard tokens (--panel, --line, --em ...) that the overlay and
// dialog inherit from `.wd`. Falls back to document.body when no shell exists
// (a stray harness); the content still renders, never a blank.
import { createPortal } from 'react-dom'

export default function WdPortal({ children }) {
  if (typeof document === 'undefined') return children
  const host = document.querySelector('.wd') || document.body
  return createPortal(children, host)
}
