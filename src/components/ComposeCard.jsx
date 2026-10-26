import React, { useState } from 'react'
import { Mail, FileText, ListTree, List, Table, Code2, StickyNote, PenLine, Check, Copy, Download, AlertTriangle, BookOpen } from 'lucide-react'
import WorkCard from './WorkCard.jsx'
import SecurityNote from './SecurityNote.jsx'
import PolicyNote from './PolicyNote.jsx'

// ComposeCard - renders a FINISHED document WorkCoPilot wrote (not guidance, not a
// one-line answer): a letter, report, resume section, contract clause, red-line
// notes, an outline, a table, or code, handed back ready to copy or download.
// Built on the shared WorkCard primitive so it reads as the same Option C light
// design language as ResultCard and the rest of the console. LIGHT theme only.
//
// It consumes one `compose` object from api.workCompose:
//   { title, format: 'email'|'document'|'outline'|'bullets'|'table'|'code'|'notes',
//     body, basis, caveat }
//   - body is the finished content. For 'table' it is GFM markdown; for 'code' it
//     is exact code; otherwise it is prose with real line breaks.
//   - basis is what it based the draft on / its assumptions (always shown).
//   - caveat is a one-line check note, shown only when non-empty.
//
// The document is handed to the person to copy or use. Nothing is auto-filled into
// their app - Copy and Download are the only actions (read-only, by design).

const STYLE_ID = 'composecard-css'
function ensureAssets() {
  if (typeof document === 'undefined') return
  if (document.getElementById(STYLE_ID)) return
  const s = document.createElement('style')
  s.id = STYLE_ID
  s.textContent = COMPOSECARD_CSS
  document.head.appendChild(s)
}

// A tiny, dependency-free GitHub-flavored-markdown table parser. Returns
// { header:[...], body:[[...], ...] } or null when the text is not a table, in
// which case the caller falls back to rendering it as prose. (Same approach as
// ResultCard; kept local so ComposeCard stands alone.)
function parseMdTable(md) {
  const lines = String(md || '').split('\n').map((l) => l.trim()).filter(Boolean)
  const rows = lines.filter((l) => l.includes('|'))
  if (rows.length < 1) return null
  const splitRow = (l) => {
    let s = l.trim()
    if (s.startsWith('|')) s = s.slice(1)
    if (s.endsWith('|')) s = s.slice(0, -1)
    return s.split('|').map((c) => c.trim())
  }
  const isSep = (cells) => cells.length > 0 && cells.every((c) => /^:?-{2,}:?$/.test(c.replace(/\s/g, '')))
  const header = splitRow(rows[0])
  let start = 1
  if (rows[1] && isSep(splitRow(rows[1]))) start = 2
  const bodyRows = rows.slice(start).map(splitRow).filter((r) => r.some((c) => c !== ''))
  if (!header.length || (!bodyRows.length && start === 1)) return null
  const width = header.length
  const body = bodyRows.map((r) => {
    const out = r.slice(0, width)
    while (out.length < width) out.push('')
    return out
  })
  return { header, body }
}

function csvFromTable(t) {
  const esc = (c) => {
    const v = String(c == null ? '' : c)
    return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v
  }
  return [t.header, ...t.body].map((r) => r.map(esc).join(',')).join('\r\n')
}

// Strip a single surrounding markdown code fence, if present, and read its
// language token so a code download gets a sensible extension. Returns
// { code, lang }. When there is no fence the body is used as-is.
const LANG_EXT = {
  js: 'js', javascript: 'js', jsx: 'jsx', ts: 'ts', typescript: 'ts', tsx: 'tsx',
  py: 'py', python: 'py', rb: 'rb', ruby: 'rb', go: 'go', rust: 'rs', rs: 'rs',
  java: 'java', kotlin: 'kt', kt: 'kt', swift: 'swift', c: 'c', h: 'h', cpp: 'cpp',
  'c++': 'cpp', cs: 'cs', csharp: 'cs', php: 'php', sh: 'sh', bash: 'sh', shell: 'sh',
  zsh: 'sh', ps1: 'ps1', powershell: 'ps1', sql: 'sql', html: 'html', css: 'css',
  scss: 'scss', json: 'json', yaml: 'yaml', yml: 'yaml', xml: 'xml', toml: 'toml',
  md: 'md', markdown: 'md', dockerfile: 'dockerfile', ini: 'ini',
}
function readCode(body) {
  const raw = (body == null) ? '' : String(body)
  const m = raw.match(/^```([^\n`]*)\n([\s\S]*?)\n?```\s*$/)
  if (m) {
    const lang = String(m[1] || '').trim().toLowerCase().split(/\s+/)[0]
    return { code: m[2], lang: lang || '' }
  }
  return { code: raw, lang: '' }
}

function downloadText(text, filename, type) {
  try {
    const blob = new Blob([text || ''], { type: type || 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename
    document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => { try { URL.revokeObjectURL(url) } catch {} }, 2000)
  } catch { /* download blocked; Copy still works */ }
}

// A readable, file-safe slug from the title so the download is named for what it
// is, not a generic blob name.
function slug(title) {
  const s = String(title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48)
  return s || 'workcopilot-document'
}

const FORMAT_META = {
  prompt: { icon: PenLine, label: 'Prompt for your AI', ext: 'txt' },
  code: { icon: Code2, label: 'Code', ext: 'txt' },
  outline: { icon: ListTree, label: 'Outline', ext: 'md' },
  bullets: { icon: List, label: 'Bullets', ext: 'md' },
  table: { icon: Table, label: 'Table', ext: 'csv' },
  notes: { icon: StickyNote, label: 'Notes', ext: 'md' },
  // legacy (older sessions may still carry these; the engine no longer writes them)
  email: { icon: Mail, label: 'Draft', ext: 'md' },
  document: { icon: FileText, label: 'Draft', ext: 'md' },
}

// A self-contained copy control, so the card owns its own clipboard feedback.
function CopyAction({ text, label = 'Copy' }) {
  const [done, setDone] = useState(false)
  const copy = async () => {
    try { await navigator.clipboard.writeText(text || ''); setDone(true); setTimeout(() => setDone(false), 1500) }
    catch { /* clipboard blocked */ }
  }
  return (
    <button type="button" className="cc-act" onClick={copy}>
      {done ? <Check size={13} /> : <Copy size={13} />} {done ? 'Copied' : label}
    </button>
  )
}

export default function ComposeCard({ compose, security = null, policy = null, className = '' }) {
  ensureAssets()
  if (!compose) return null
  const { title, format, body, basis, caveat } = compose
  const fmt = FORMAT_META[format] ? format : 'document'
  const meta = FORMAT_META[fmt]
  const bodyStr = (body == null) ? '' : (typeof body === 'string' ? body : String(body))
  // Code reads as its own cyan card (same as ResultCard); every writing format
  // stays on the default emerald accent so a document feels like finished work.
  const tone = fmt === 'code' ? 'cyan' : undefined
  const code = fmt === 'code' ? readCode(bodyStr) : null

  const renderBody = () => {
    if (!bodyStr.trim()) return <p className="cc-prose cc-empty">No document came back.</p>
    if (fmt === 'code') {
      return (
        <div className="cc-code">
          <pre><code>{code.code}</code></pre>
        </div>
      )
    }
    if (fmt === 'table') {
      const t = parseMdTable(bodyStr)
      if (t) {
        return (
          <div className="cc-tablewrap">
            <table className="cc-table">
              <thead><tr>{t.header.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
              <tbody>{t.body.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
            </table>
          </div>
        )
      }
      // Not a clean table; show the raw markdown as prose so nothing is lost.
      return <p className="cc-prose">{bodyStr}</p>
    }
    // email / document / outline / bullets / notes - readable prose, line breaks kept.
    return <p className="cc-prose">{bodyStr}</p>
  }

  // The content handed to Copy / Download is the finished document itself. For
  // code the surrounding fence (if any) is stripped so the file is clean.
  const outText = fmt === 'code' ? code.code : bodyStr
  const copyText = outText

  const downloadDoc = () => {
    const base = slug(title)
    if (fmt === 'table') {
      const t = parseMdTable(bodyStr)
      if (t) { downloadText(csvFromTable(t), base + '.csv', 'text/csv'); return }
      downloadText(bodyStr, base + '.md', 'text/markdown'); return
    }
    if (fmt === 'code') {
      const ext = (code.lang && LANG_EXT[code.lang]) || 'txt'
      downloadText(code.code, base + '.' + ext, 'text/plain'); return
    }
    downloadText(bodyStr, base + '.md', 'text/markdown')
  }
  const downloadLabel = fmt === 'table' ? 'Download CSV' : (fmt === 'code' ? 'Download file' : 'Download .md')

  return (
    <WorkCard theme="light" tone={tone} reveal={false} texture={false} className={'cc-card ' + className}>
      <WorkCard.Head
        icon={meta.icon}
        align="start"
        eyebrow={<span className="cc-eyebrow-in"><PenLine size={11} /> Written for you{' · '}{meta.label}</span>}
        title={title && String(title).trim() ? String(title).trim() : 'Your ' + meta.label.toLowerCase()}
      />

      <div className="cc-bodywrap">{renderBody()}</div>

      {/* Actions - the document is handed over to copy or use, never auto-filled. */}
      <div className="cc-actions">
        <CopyAction text={copyText} label="Copy all" />
        <button type="button" className="cc-act" onClick={downloadDoc}>
          <Download size={13} /> {downloadLabel}
        </button>
      </div>

      {/* WHAT I BASED IT ON + the one-line check note, always under the body. */}
      {(basis && String(basis).trim()) || (caveat && String(caveat).trim()) ? (
        <div className="cc-trust">
          {basis && String(basis).trim() ? (
            <div className="cc-fact">
              <span className="cc-trust-k"><BookOpen size={12} /> What I based it on</span>
              <p>{String(basis).trim()}</p>
            </div>
          ) : null}
          {caveat && String(caveat).trim() ? (
            <div className="cc-caveat">
              <AlertTriangle size={14} />
              <span>{String(caveat).trim()}</span>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Security check - present only for code compositions (server attaches it then). */}
      <SecurityNote security={security} />
      <PolicyNote policy={policy} />
    </WorkCard>
  )
}

const COMPOSECARD_CSS = `
/* ComposeCard - leans entirely on the WorkCard --wc-* tokens it is nested in, so
   tone="cyan" (code) recolors every accent here at once. LIGHT theme only. */
.cc-card{gap:13px}
.cc-bodywrap{min-width:0}
.cc-eyebrow-in{display:inline-flex;align-items:center;gap:5px}
.cc-eyebrow-in svg{flex-shrink:0}

/* PROSE - readable, line breaks kept (email / document / outline / bullets / notes) */
.cc-prose{margin:0;color:var(--wc-tx);font-size:14.5px;line-height:1.65;white-space:pre-wrap;overflow-wrap:anywhere}
.cc-prose.cc-empty{color:var(--wc-dim)}

/* CODE - mono block, horizontal scroll, never breaks the layout */
.cc-code{border:1px solid var(--wc-line);border-radius:12px;overflow:hidden;
  background:linear-gradient(180deg,#f4f8f7,#f8fbfa)}
.cc-code pre{margin:0;padding:12px 13px;overflow-x:auto;max-width:100%}
.cc-code code{font-family:"JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  font-size:12.5px;line-height:1.6;color:var(--wc-tx);white-space:pre;display:block}

/* TABLE */
.cc-tablewrap{overflow-x:auto;max-width:100%;border:1px solid var(--wc-line);border-radius:12px}
.cc-table{border-collapse:collapse;width:100%;font-size:13px;line-height:1.5}
.cc-table th,.cc-table td{text-align:left;padding:8px 11px;border-bottom:1px solid var(--wc-line);
  border-right:1px solid var(--wc-line);color:var(--wc-tx);vertical-align:top;overflow-wrap:anywhere}
.cc-table th:last-child,.cc-table td:last-child{border-right:none}
.cc-table tbody tr:last-child td{border-bottom:none}
.cc-table thead th{background:color-mix(in srgb,var(--wc-ink) 9%,transparent);font-weight:700;
  color:var(--wc-ink);white-space:nowrap}
.cc-table tbody tr:nth-child(even) td{background:color-mix(in srgb,var(--wc-ink) 4%,transparent)}

/* ACTIONS */
.cc-actions{display:flex;flex-wrap:wrap;gap:8px}
.cc-act{display:inline-flex;align-items:center;gap:6px;font-family:inherit;font-size:12.5px;font-weight:600;
  color:var(--wc-ink);background:#fff;border:1px solid var(--wc-line);border-radius:9px;padding:7px 11px;
  cursor:pointer;transition:border-color .15s,background .15s,transform .08s}
.cc-act:hover{border-color:color-mix(in srgb,var(--wc-ink) 40%,var(--wc-line));
  background:color-mix(in srgb,var(--wc-ink) 6%,#fff)}
.cc-act:active{transform:translateY(.5px)}

/* WHAT I BASED IT ON + caveat */
.cc-trust{display:flex;flex-direction:column;gap:11px;padding-top:13px;border-top:1px solid var(--wc-line)}
.cc-trust-k{display:inline-flex;align-items:center;gap:5px;font-family:"Figtree","Helvetica Neue",system-ui,sans-serif;
  font-size:10.5px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:var(--wc-ink)}
.cc-fact{display:flex;flex-direction:column;gap:3px}
.cc-fact p{margin:0;font-size:13px;line-height:1.55;color:var(--wc-mut);overflow-wrap:anywhere}
.cc-caveat{display:flex;gap:8px;align-items:flex-start;font-size:12.5px;line-height:1.5;color:var(--wc-mut);
  background:color-mix(in srgb,var(--wc-ink) 6%,transparent);
  border:1px solid color-mix(in srgb,var(--wc-ink) 18%,transparent);border-radius:10px;padding:9px 11px}
.cc-caveat svg{color:var(--wc-ink);flex-shrink:0;margin-top:1px}

@media(max-width:420px){
  .cc-act{flex:1 1 auto;justify-content:center}
}
@media(prefers-reduced-motion:reduce){
  .cc-act:active{transform:none}
}
`
