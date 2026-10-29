// The TASK OVERVIEW: the rich "what you'll be doing" paragraph every task
// carries (session.overview / task.overview, written at plan time in the
// user's language with **bold** / ==highlight== / *italics* markers). ONE
// renderer for every surface, so the markers always show as on-brand emphasis
// and never as literal characters (SUPREME II; parser: shared/overview_markup.js,
// styles: taskOverview.css.js). Props:
//   overview     the marked-up string; nothing renders when it is empty
//   clamp        0 = the full paragraph (the resume / open screens); N = a
//                dense-list preview clamped to N lines with a Show more /
//                Show less toggle that appears ONLY when the text is cut
//   projectName  optional: a nowrap tinted chip "Project: <name>" above the text
//   className    extra class on the block
// The paragraph is dir="auto", so Arabic (and any right-to-left overview)
// aligns and wraps correctly inside a left-to-right shell and vice versa.
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { FolderKanban, ChevronDown } from 'lucide-react'
import { useT } from '../../i18n/index.jsx'
import { parseOverview } from '../../shared/overview_markup.js'

export default function TaskOverview({ overview, clamp = 0, projectName = '', className = '' }) {
  const t = useT()
  const text = String(overview == null ? '' : overview)
  const tokens = useMemo(() => parseOverview(text), [text])
  const [open, setOpen] = useState(false)
  const [cut, setCut] = useState(false)
  const pRef = useRef(null)
  const lines = Number(clamp) > 0 ? Math.round(Number(clamp)) : 0
  const clamped = lines > 0 && !open

  // Is the clamped paragraph actually cut? Measured, not guessed (text size,
  // width and language all change it), and re-measured when the box resizes,
  // so Show more never shows for a two-line overview and never hides a cut one.
  useLayoutEffect(() => {
    if (!clamped) return undefined
    const el = pRef.current
    if (!el) return undefined
    const measure = () => setCut(el.scrollHeight > el.clientHeight + 1)
    measure()
    if (typeof ResizeObserver === 'undefined') return undefined
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [clamped, text])

  if (tokens.length === 0) return null
  const name = String(projectName || '').trim()
  const cls = ['wd-ovw', clamped ? 'is-clamped' : (lines > 0 ? 'is-expanded' : 'is-full'), className].filter(Boolean).join(' ')
  return (
    <div className={cls} data-open={open ? '1' : undefined}>
      {name && (
        <span className="wd-ovw-proj" title={t('taskOverview.projectChip', { name })}>
          <FolderKanban size={11} aria-hidden />
          <span className="wd-ovw-proj-t">{t('taskOverview.projectChip', { name })}</span>
        </span>
      )}
      <p ref={pRef} className="wd-ovw-p" dir="auto" style={clamped ? { WebkitLineClamp: lines } : undefined}>
        {tokens.map((tk, i) => (
          tk.type === 'bold' ? <strong key={i} className="wd-ovw-b">{tk.text}</strong>
            : tk.type === 'mark' ? <mark key={i} className="wd-ovw-m">{tk.text}</mark>
              : tk.type === 'em' ? <em key={i} className="wd-ovw-i">{tk.text}</em>
                : tk.text
        ))}
      </p>
      {lines > 0 && (cut || open) && (
        <button type="button" className="wd-ovw-more" aria-expanded={open} onClick={(e) => { e.stopPropagation(); setOpen((v) => !v) }}>
          {open ? t('taskOverview.showLess') : t('taskOverview.showMore')} <ChevronDown size={13} aria-hidden />
        </button>
      )}
    </div>
  )
}
