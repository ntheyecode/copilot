import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { copyText } from './CopyChip.jsx'
import { useT } from '../i18n/index.jsx'

// ONE-TAP COPY CHIP for an inline literal value inside guidance text: a TXT
// record, a host name, a command fragment, a value to type. RichText renders
// every `code` span through this chip (keys and URLs excepted), so a value the
// user must act on is never shown without a way to copy it.
//
// Inline-styled on purpose: the floating panel lives in a separate
// Picture-in-Picture document that carries none of the app CSS, so the chip
// must look right with no stylesheet at all. It is a real <button>, so it is
// keyboard-reachable and announces "Copy" / "Copied" to assistive tech.
const MONO = '"JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,Consolas,monospace'

export default function ValueChip({ value }) {
  const t = useT()
  const [done, setDone] = useState(false)
  const text = String(value == null ? '' : value)
  if (!text) return null
  const onCopy = async (e) => {
    if (await copyText(text, e)) { setDone(true); setTimeout(() => setDone(false), 1400) }
  }
  const tint = done ? 'var(--gv-good, #107c41)' : 'var(--gv-accent, #0e9f6e)'
  return (
    <button
      type="button"
      onClick={onCopy}
      className="gv-chip"
      title={done ? t('widgets.copy.copied') : t('widgets.copy.copyAria')}
      aria-label={`${text}. ${done ? t('widgets.copy.copiedAria') : t('widgets.copy.copyAria')}`}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.35em', maxWidth: '100%', verticalAlign: 'baseline',
        margin: '0 0.08em', padding: '0.08em 0.45em 0.08em 0.5em', borderRadius: 6,
        border: `1px solid ${done ? 'rgba(16,124,65,.45)' : 'var(--gv-chip-line, rgba(14,159,110,.32))'}`,
        background: done ? 'rgba(16,124,65,.10)' : 'var(--gv-chip-fill, rgba(14,159,110,.08))',
        color: 'inherit', font: 'inherit', fontFamily: MONO, fontSize: '0.9em', fontWeight: 600, lineHeight: 1.35,
        cursor: 'pointer', textAlign: 'left', whiteSpace: 'normal', overflowWrap: 'anywhere',
        transition: 'background .15s, border-color .15s',
      }}
    >
      <span style={{ minWidth: 0 }}>{text}</span>
      <span aria-hidden="true" style={{ display: 'inline-flex', flexShrink: 0, color: tint, opacity: done ? 1 : 0.8 }}>
        {done ? <Check size={11} strokeWidth={3} /> : <Copy size={11} strokeWidth={2.4} />}
      </span>
    </button>
  )
}
