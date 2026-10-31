// The drop zone of "Add documents" (company console): drag documents in, or
// choose them. The accessible control is the real button (in the tab order,
// described by the type hint and the promise); the zone adds mouse
// conveniences (click anywhere, drag and drop) and carries no role, so no
// interactive element sits inside another. The picker is a real, visually
// hidden <input type=file multiple>, so assistive tech and automation reach
// it. Strings: companyBrain.add.*.
import { useId, useRef, useState } from 'react'
import { Upload, FolderOpen } from 'lucide-react'
import { useT } from '../../../../i18n/index.jsx'
import { ACCEPT } from './uploadModel.js'

export default function DocDropZone({ onFiles, disabled, describedBy }) {
  const t = useT()
  const uid = useId()
  const input = useRef(null)
  const [over, setOver] = useState(false)

  const pick = () => { if (!disabled && input.current) input.current.click() }
  const onChange = (e) => {
    const files = Array.from(e.target.files || [])
    e.target.value = ''   // the same file again must fire change again (a refresh)
    if (files.length && !disabled) onFiles(files)
  }
  const onDrop = (e) => {
    e.preventDefault(); setOver(false)
    if (disabled) return
    const files = Array.from((e.dataTransfer && e.dataTransfer.files) || [])
    if (files.length) onFiles(files)
  }
  const onDragOver = (e) => { e.preventDefault(); if (!disabled) setOver(true) }
  // Leaving onto one of the zone's own children is not leaving the zone.
  const onDragLeave = (e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOver(false) }

  const hintId = `${uid}-hint`
  return (
    <div className={`wka-brain-drop${over ? ' over' : ''}${disabled ? ' off' : ''}`} data-testid="brain-add-drop"
      onClick={pick} onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}>
      <span className="wka-brain-drop-ic" aria-hidden="true"><Upload size={20} /></span>
      <span className="wka-brain-drop-t">{over ? t('companyBrain.add.dropOver') : t('companyBrain.add.dropIdle')}</span>
      <span className="wka-brain-drop-s" id={hintId}>{t('companyBrain.add.types')} {t('companyBrain.add.dropSub')}</span>
      <button type="button" className="wka-btn primary" disabled={disabled} aria-describedby={describedBy ? `${hintId} ${describedBy}` : hintId}
        onClick={(e) => { e.stopPropagation(); pick() }}>
        <FolderOpen size={14} /> {t('companyBrain.add.choose')}
      </button>
      <input ref={input} type="file" accept={ACCEPT} multiple aria-label={t('companyBrain.add.inputAria')} onChange={onChange} disabled={disabled} tabIndex={-1}
        onClick={(e) => e.stopPropagation()} />
    </div>
  )
}
