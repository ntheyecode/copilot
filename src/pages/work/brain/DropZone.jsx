// The upload drop zone (drag a document in, or choose one) and the honest
// working state while it is learned. The accessible control is the real
// button (in the tab order, described by the zone's own hint and the promise);
// the zone itself only adds mouse conveniences (click anywhere, drag and
// drop) and never carries a role, so no interactive element sits inside a
// button. The picker is a real <input type=file> (visually hidden, labelled)
// so assistive tech and automation reach it. When the plan's document limit
// is reached the zone says so but stays open: the server still takes one of
// the learned documents again as a refresh. While learning, focus moves to
// the working panel (the zone unmounts); what is happening is announced by the
// page's live region. No percentage, since the server reports none.
// Strings: brainPage.drop.*, brainPage.working.*.
import { useEffect, useId, useRef, useState } from 'react'
import { Upload, Loader2, FileCheck } from 'lucide-react'
import { useT } from '../../../i18n/index.jsx'
import { ACCEPT } from './brainModel.js'

export default function DropZone({ onFile, working, disabled, full, describedBy }) {
  const t = useT()
  const uid = useId()
  const input = useRef(null)
  const panel = useRef(null)
  const [over, setOver] = useState(false)
  const blocked = !!working || !!disabled

  useEffect(() => { if (working && panel.current) panel.current.focus() }, [working])

  const pick = () => { if (!blocked && input.current) input.current.click() }
  const onChange = (e) => {
    const f = e.target.files && e.target.files[0]
    e.target.value = ''   // the same file again must fire change again (a refresh)
    if (f && !blocked) onFile(f)
  }
  const onDrop = (e) => {
    e.preventDefault(); setOver(false)
    if (blocked) return
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]
    if (f) onFile(f)
  }
  const onDragOver = (e) => { e.preventDefault(); if (!blocked) setOver(true) }

  if (working) {
    return (
      <div className="wd-brain-working" ref={panel} tabIndex={-1} data-testid="brain-working">
        <span className="wd-ic"><Loader2 size={18} className="wd-brain-spin" /></span>
        <div>
          <span className="wd-brain-working-t">{t('brainPage.working.title', { name: working.name })}</span>
          <ul className="wd-brain-phases">
            <li>{t('brainPage.working.reading')}</li>
            <li>{t('brainPage.working.masking')}</li>
            <li>{t('brainPage.working.learning')}</li>
          </ul>
          <span className="wd-brain-working-n">{t('brainPage.working.note')}</span>
        </div>
      </div>
    )
  }
  const hintId = `${uid}-hint`
  return (
    <div className={`wd-brain-drop${over ? ' over' : ''}${full ? ' full' : ''}`} data-testid="brain-drop"
      onClick={pick} onDrop={onDrop} onDragOver={onDragOver} onDragLeave={() => setOver(false)}>
      <span className={`wd-ic${full ? ' warm' : ''}`} aria-hidden="true">{full ? <FileCheck size={20} /> : <Upload size={20} />}</span>
      <span className="wd-brain-drop-t">{full ? t('brainPage.drop.full') : over ? t('brainPage.drop.over') : t('brainPage.drop.idle')}</span>
      <span className="wd-brain-drop-s" id={hintId}>{full ? t('brainPage.drop.fullSub') : t('brainPage.drop.idleSub')}</span>
      <button type="button" className="wd-cta" disabled={blocked} aria-describedby={describedBy ? `${hintId} ${describedBy}` : hintId}
        onClick={(e) => { e.stopPropagation(); pick() }}>
        <Upload size={15} /> {full ? t('brainPage.drop.refresh') : t('brainPage.drop.choose')}
      </button>
      <input ref={input} type="file" accept={ACCEPT} aria-label={t('brainPage.drop.inputAria')} onChange={onChange} disabled={blocked} tabIndex={-1} />
    </div>
  )
}
