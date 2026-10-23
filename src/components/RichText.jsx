import React from 'react'

// Render WorkCoPilot guidance text with light, SAFE inline formatting so the
// model's markdown shows as real emphasis instead of literal characters:
//   **bold**      -> bold + accent color (a key action or term to notice)
//   `code`        -> inline monospace chip (a command, path, value to type)
//   ==highlight== -> a highlighted phrase
// Everything else is plain text; newlines become line breaks. It never renders
// raw HTML, only these three span types, so it is safe for model output.
// Used by the guiding console and the floating panel (one source of truth).
const TOKEN = /(\*{2,}[^*]+?\*{2,}|`[^`]+?`|==[^=]+?==)/g

export default function RichText({ text, accent = 'var(--em, #12a06a)' }) {
  const s = String(text == null ? '' : text)
  if (!s) return null
  const out = []
  s.split(/(\n)/).forEach((line, li) => {
    if (line === '\n') { out.push(<br key={'br' + li} />); return }
    line.split(TOKEN).forEach((p, i) => {
      if (!p) return
      const key = li + '-' + i
      if (/^\*{2,}[\s\S]+\*{2,}$/.test(p)) {
        out.push(<strong key={key} style={{ fontWeight: 700, color: accent }}>{p.replace(/^\*+|\*+$/g, '')}</strong>)
      } else if (p.length > 1 && p.startsWith('`') && p.endsWith('`')) {
        out.push(<code key={key} style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: '0.9em', background: 'rgba(127,127,127,.16)', borderRadius: 5, padding: '1px 5px', wordBreak: 'break-word' }}>{p.slice(1, -1)}</code>)
      } else if (/^==[\s\S]+==$/.test(p)) {
        out.push(<mark key={key} style={{ background: 'rgba(255,205,70,.34)', color: 'inherit', borderRadius: 3, padding: '0 3px' }}>{p.replace(/^=+|=+$/g, '')}</mark>)
      } else {
        out.push(<React.Fragment key={key}>{p}</React.Fragment>)
      }
    })
  })
  return <>{out}</>
}
