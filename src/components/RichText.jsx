import React from 'react'
import { ExternalLink } from 'lucide-react'
import CopyChip from './CopyChip.jsx'
import ValueChip from './ValueChip.jsx'

// Render WorkCoPilot guidance text with light, SAFE inline formatting so the
// model's markdown shows as real emphasis instead of literal characters:
//   **bold**      -> a KEY TERM: the control / button / field / literal value
//                    the user must act on. Bold, brand-colored and softly
//                    highlighted so the eye lands on exactly what to do.
//   `code`        -> a literal value (a command, path, record, value to type)
//                    as a ONE-TAP COPY chip (ValueChip), so no value is ever
//                    shown without a way to copy it.
//   ==highlight== -> a highlighted phrase
// Everything else is plain text; newlines become line breaks. It never renders
// raw HTML, only these span types, so it is safe for model output.
// Used by the guiding console, the floating panel and the public "try it live"
// widget (one source of truth). Three opt-in extras, off by default so the
// console renders exactly as before:
//   links    - a bare http(s) URL in plain text becomes a real link that opens
//              in a new tab (rel="noopener noreferrer"), shown without the scheme.
//   keys     - a `code` span that is a keyboard shortcut (`Ctrl+Shift+V`,
//              `Enter`, `Cmd+K`) renders as key chips instead of a code chip.
//   copyOver - legacy: with chips=false, a `code` span at least this many
//              characters long gets a Copy chip after it. 0 = off.
//   chips    - (default true) every `code` span is a one-tap copy chip. Pass
//              false to get the plain monospace span (dense lists, titles).
const TOKEN = /(\*{2,}[^*]+?\*{2,}|`[^`]+?`|==[^=]+?==)/g
const URL_RE = /(https?:\/\/[^\s<>"'()]+)/g
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
// A key name a shortcut may be made of. A lone single character is NOT a key
// (`a` is a value), a lone named key (`Enter`, `F5`) is.
const KEY_RE = /^(ctrl|control|cmd|command|⌘|alt|option|opt|shift|⇧|win|windows|meta|super|fn|enter|return|esc|escape|tab|space|spacebar|backspace|delete|del|insert|ins|home|end|pgup|pgdn|page ?up|page ?down|up|down|left|right|arrow ?(up|down|left|right)|caps ?lock|print ?screen|f[1-9]|f1[0-2])$/i
const isKeyCombo = (s) => {
  const parts = s.split(/\s*\+\s*/)
  if (parts.length === 1) return KEY_RE.test(parts[0])
  return parts.every((p) => KEY_RE.test(p) || /^[a-z0-9]$/i.test(p) || /^[\[\]\\;',./`\-=]$/.test(p))
}
// A code span that is just a URL (`https://calendar.google.com`) is a link too.
const hrefOf = (code) => /^https?:\/\/\S+$/i.test(code.trim())
const kbdStyle = { display: 'inline-block', fontFamily: MONO, fontSize: '0.82em', fontWeight: 700, lineHeight: 1.3, padding: '1px 6px', borderRadius: 5, border: '1px solid rgba(127,127,127,.45)', borderBottomWidth: 2, background: 'rgba(127,127,127,.14)', whiteSpace: 'nowrap' }

// Split a plain segment into text and links (links=true). Trailing sentence
// punctuation stays outside the link so "see https://x.y." links x.y, not "x.y.".
function withLinks(seg, key, accent) {
  const out = []
  seg.split(URL_RE).forEach((p, i) => {
    if (!p) return
    const k = key + '-u' + i
    if (!/^https?:\/\//i.test(p)) { out.push(<React.Fragment key={k}>{p}</React.Fragment>); return }
    const m = p.match(/[.,;:!?)]+$/)
    const href = m ? p.slice(0, -m[0].length) : p
    const tail = m ? m[0] : ''
    const label = href.replace(/^https?:\/\//i, '').replace(/\/$/, '')
    out.push(
      <a key={k} href={href} target="_blank" rel="noopener noreferrer" style={{ color: accent, fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 3, overflowWrap: 'anywhere' }}>
        {label}<ExternalLink size={11} style={{ display: 'inline', verticalAlign: '-1px', marginInlineStart: 3 }} aria-hidden="true" />
      </a>,
    )
    if (tail) out.push(<React.Fragment key={k + 't'}>{tail}</React.Fragment>)
  })
  return out
}

// The key-term treatment. color-mix keeps the soft highlight in the accent's
// own hue in both themes and for any user-picked accent; the plain-color
// fallback covers an engine without color-mix (the highlight is then absent,
// the bold + color still carry the emphasis).
const keyStyle = (accent) => ({
  fontWeight: 750, color: accent, borderRadius: 4, padding: '0 0.22em', margin: '0 -0.04em',
  background: `color-mix(in srgb, ${accent} 13%, transparent)`,
  boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone',
})

export default function RichText({ text, accent = 'var(--em, #12a06a)', links = false, keys = false, copyOver = 0, chips = true }) {
  const s = String(text == null ? '' : text)
  if (!s) return null
  const out = []
  s.split(/(\n)/).forEach((line, li) => {
    if (line === '\n') { out.push(<br key={'br' + li} />); return }
    line.split(TOKEN).forEach((p, i) => {
      if (!p) return
      const key = li + '-' + i
      if (/^\*{2,}[\s\S]+\*{2,}$/.test(p)) {
        out.push(<strong key={key} className="gv-key" style={keyStyle(accent)}>{p.replace(/^\*+|\*+$/g, '')}</strong>)
      } else if (p.length > 1 && p.startsWith('`') && p.endsWith('`')) {
        const code = p.slice(1, -1)
        if (keys && isKeyCombo(code)) {
          const parts = code.split(/\s*\+\s*/)
          out.push(<span key={key} style={{ whiteSpace: 'nowrap' }}>{parts.map((k, j) => <React.Fragment key={j}>{j > 0 && <span aria-hidden="true" style={{ margin: '0 2px', opacity: 0.7 }}>+</span>}<kbd style={kbdStyle}>{k}</kbd></React.Fragment>)}</span>)
        } else if (links && hrefOf(code)) {
          out.push(...withLinks(code, key, accent))
        } else if (chips) {
          out.push(<ValueChip key={key} value={code} />)
        } else {
          out.push(<code key={key} style={{ fontFamily: MONO, fontSize: '0.9em', background: 'rgba(127,127,127,.16)', borderRadius: 5, padding: '1px 5px', wordBreak: 'break-word' }}>{code}</code>)
          if (copyOver > 0 && code.length >= copyOver) out.push(<React.Fragment key={key + 'c'}> <CopyChip text={code} /></React.Fragment>)
        }
      } else if (/^==[\s\S]+==$/.test(p)) {
        out.push(<mark key={key} style={{ background: 'rgba(255,205,70,.34)', color: 'inherit', borderRadius: 3, padding: '0 3px' }}>{p.replace(/^=+|=+$/g, '')}</mark>)
      } else if (links) {
        out.push(...withLinks(p, key, accent))
      } else {
        out.push(<React.Fragment key={key}>{p}</React.Fragment>)
      }
    })
  })
  return <>{out}</>
}
