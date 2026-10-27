import { ExternalLink } from 'lucide-react'
import CopyChip from './CopyChip.jsx'
import { useT } from '../i18n/index.jsx'
import { linkHost, hrefForUrl } from '../shared/links.js'

// The blocks a guided step carries, rendered ONE way everywhere (SUPREME RULE
// II): the guiding console and its floating panel (Guiding.jsx) and the public
// "try it on your task, live" widget (LiveValidate.jsx) all draw a step's link,
// terminal command and code through this file. Moved verbatim from Guiding.jsx
// (where they were private helpers) so the widget could not grow a third,
// slightly different renderer; the floater's look and behaviour are unchanged.
// Labels come from the catalog (widgets.blocks.* / widgets.copy.*), so the
// public widget is translated and the console reads the same in English.
const MONO = '"JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace'
const dot = (bg) => ({ width: 9, height: 9, borderRadius: '50%', background: bg, display: 'inline-block', flexShrink: 0 })

// One consistent treatment for every command/code/link a step carries: a real
// clickable link-out (new tab) when it is a full/clickable URL, or a Copy
// button for the command/target when it is not. The class names (.wc-open,
// .wc-copyrow, .wc-copybtn) are styled by each host's own scoped CSS.
export function StepLink({ url }) {
  const t = useT()
  const s = String(url || '').trim()
  if (!s) return null
  const href = hrefForUrl(s)
  if (href) {
    return <div><a className="wc-open" href={href} target="_blank" rel="noopener noreferrer">{t('widgets.blocks.open', { host: linkHost(href) })}<ExternalLink size={13} /></a></div>
  }
  return (
    <div className="wc-copyrow">
      <span className="wc-copyrow-t" title={s}>{s}</span>
      <CopyChip text={s} className="wc-copybtn" title={t('widgets.blocks.copyThis')} />
    </div>
  )
}
// The EXACT terminal commands for a step, copy-paste ready - styled as a terminal.
export function CmdBlock({ lines }) {
  const t = useT()
  const text = (lines || []).join('\n')
  return (
    <div style={{ marginTop: 9, borderRadius: 10, overflow: 'hidden', border: '1px solid #27324a', boxShadow: '0 1px 3px rgba(0,0,0,0.25)', direction: 'ltr', textAlign: 'left' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#0c1222', padding: '6px 9px' }}>
        <span style={{ display: 'inline-flex', gap: 5 }}><span style={dot('#ff5f57')} /><span style={dot('#febc2e')} /><span style={dot('#28c840')} /></span>
        <span style={{ fontSize: 10.5, color: '#8ea3c0', flex: 1, minWidth: 0, letterSpacing: 0.6, fontWeight: 600, textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t('widgets.blocks.terminal')}</span>
        <CopyChip text={text} variant="pill" />
      </div>
      <pre style={{ margin: 0, padding: '10px 11px', background: '#0c1222', color: '#d6e9d6', fontSize: 'calc(12.5px * var(--wc-fs, 1))', lineHeight: 1.6, fontFamily: MONO, overflowX: 'auto', whiteSpace: 'pre' }}>
        {(lines || []).map((l, i) => <div key={i}><span style={{ color: '#58c974' }}>$ </span>{l}</div>)}
      </pre>
    </div>
  )
}
// The EXACT file content for a step, copy-paste ready, labelled with its path.
export function CodeBlock({ file, content }) {
  const t = useT()
  const ext = (file && file.includes('.')) ? file.split('.').pop() : ''
  return (
    <div style={{ marginTop: 9, borderRadius: 10, overflow: 'hidden', border: '1px solid #2a2a3c', boxShadow: '0 1px 3px rgba(0,0,0,0.25)', direction: 'ltr', textAlign: 'left' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#15151f', padding: '6px 9px' }}>
        <span style={dot('#8b7cff')} />
        <span style={{ fontSize: 11.5, color: '#c7cbd8', flex: 1, minWidth: 0, fontFamily: MONO, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file || t('widgets.blocks.code')}</span>
        {ext && <span style={{ fontSize: 9.5, color: '#9a9ab0', background: 'rgba(255,255,255,0.09)', borderRadius: 5, padding: '1px 6px', textTransform: 'uppercase', letterSpacing: 0.5, flexShrink: 0 }}>{ext}</span>}
        <CopyChip text={content} variant="pill" />
      </div>
      <pre style={{ margin: 0, padding: '10px 11px', background: '#15151f', color: '#e6e6f2', fontSize: 'calc(12.5px * var(--wc-fs, 1))', lineHeight: 1.55, fontFamily: MONO, overflowX: 'auto', whiteSpace: 'pre' }}>{content}</pre>
    </div>
  )
}
