// "What the screen should look like": a step's screenshot from the company
// workflow it came from (Wave 3 part B). A small thumbnail in the step card that
// opens to full size in place; a screenshot that cannot load says so calmly
// instead of showing a broken image. Frames are company-scoped and served
// same-origin with the session cookie (api.workflowFramePath). Renders nothing
// for a step without a screenshot, so ordinary sessions are unchanged. Mount it
// keyed by step and shot so each step starts closed, even two showing one frame.
import { useState } from 'react'
import { ImageOff, Maximize2, Minimize2 } from 'lucide-react'
import { api } from '../../api.js'
import { useT } from '../../i18n/index.jsx'
import { STEP_SHOT_CSS } from './stepShot.css.js'

export default function StepShot({ shot, id = 'gv-shot-full' }) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [broken, setBroken] = useState(false)
  if (!shot) return null
  const src = api.workflowFramePath(shot)
  return (
    <div className={`gv-shot${open ? ' open' : ''}`}>
      <style>{STEP_SHOT_CSS}</style>
      {broken ? (
        <div className="gv-shot-missing" role="note"><ImageOff size={14} aria-hidden="true" /><span>{t('stepCard.shot.missing')}</span></div>
      ) : (
        <>
          <button type="button" className="gv-shot-bar" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
            {!open && <img className="gv-shot-thumb" src={src} alt="" loading="lazy" onError={() => setBroken(true)} />}
            <span className="gv-shot-label">{t('stepCard.shot.label')}</span>
            <span className="gv-shot-toggle">{open ? <Minimize2 size={12} aria-hidden="true" /> : <Maximize2 size={12} aria-hidden="true" />}{open ? t('stepCard.shot.smaller') : t('stepCard.shot.larger')}</span>
          </button>
          {open && (
            <figure className="gv-shot-full" id={id}>
              <img src={src} alt={t('stepCard.shot.alt')} onError={() => setBroken(true)} />
              <figcaption>{t('stepCard.shot.caption')}</figcaption>
            </figure>
          )}
        </>
      )}
    </div>
  )
}
