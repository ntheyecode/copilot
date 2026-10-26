import React, { useEffect, useRef, useState } from 'react'
import { Hash, Table, Code2, FileText, Sparkles, Check, Copy, Download, AlertTriangle, ShieldCheck } from 'lucide-react'
import WorkCard from './WorkCard.jsx'
import SecurityNote from './SecurityNote.jsx'
import PolicyNote from './PolicyNote.jsx'

// ResultCard - renders the actual ANSWER WorkCoPilot returns (not guidance): a
// number, a table, a draft, a query, or an analysis. Built on the shared
// WorkCard primitive so it reads as the same design language as the rest of the
// site (Option C light card). LIGHT theme only.
//
// It consumes one `result` object from api.workResult:
//   { kind:'number'|'table'|'text'|'code'|'analysis', body, basis, verifyBy,
//     confidence (0-1), need (string|null), grounded (bool), caveat (string) }
//
// THE HONESTY CONTRACT is the point of this card, so it is always on screen:
//   - confidence as a labelled meter,
//   - "How I got it" (basis) and "Verify by" (verifyBy),
//   - the caveat as a visible note,
//   - and, when `need` is set OR `grounded` is false, the whole card drops to a
//     clear DRAFT / needs-input state (amber accent, caveat and need prominent)
//     so a soft answer is never shown as a trusted one.
// The result is handed to the person to copy or use. Nothing is auto-filled
// into their app - Copy and Download are the only actions.

// All result-specific bits inherit the card's own --wc-* tokens (set by WorkCard
// per tone), so an amber draft recolors the meter, ticks and callouts for free.
const STYLE_ID = 'resultcard-css'
function ensureAssets() {
  if (typeof document === 'undefined') return
  if (document.getElementById(STYLE_ID)) return
  const s = document.createElement('style')
  s.id = STYLE_ID
  s.textContent = RESULTCARD_CSS
  document.head.appendChild(s)
}

// A tiny, dependency-free GitHub-flavored-markdown table parser. Returns
// { header:[...], body:[[...], ...] } or null when the text is not a table, in
// which case the caller falls back to rendering it as prose.
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

const KIND_META = {
  number: { icon: Hash, label: 'The number' },
  table: { icon: Table, label: 'The table' },
  code: { icon: Code2, label: 'The code' },
  text: { icon: FileText, label: 'The answer' },
  analysis: { icon: Sparkles, label: 'The analysis' },
}

// A self-contained copy control, so the card owns its own clipboard feedback.
function CopyAction({ text, label = 'Copy' }) {
  const [done, setDone] = useState(false)
  const copy = async () => {
    try { await navigator.clipboard.writeText(text || ''); setDone(true); setTimeout(() => setDone(false), 1500) }
    catch { /* clipboard blocked */ }
  }
  return (
    <button type="button" className="rc-act" onClick={copy}>
      {done ? <Check size={13} /> : <Copy size={13} />} {done ? 'Copied' : label}
    </button>
  )
}

export default function ResultCard({ result, security = null, policy = null, className = '' }) {
  ensureAssets()
  if (!result) return null
  const { kind = 'text', body, basis, verifyBy, confidence, need, grounded, caveat } = result
  const meta = KIND_META[kind] || KIND_META.text
  const draft = !!(need && String(need).trim()) || grounded === false
  const pct = Math.max(0, Math.min(100, Math.round((Number(confidence) || 0) * 100)))
  // Confidence band only colors the LABEL wording; the meter fill uses the
  // card tone so a draft is unmistakably amber end to end.
  const band = draft ? 'Draft' : pct >= 75 ? 'High' : pct >= 50 ? 'Fair' : 'Low'
  const bodyStr = (body == null) ? '' : (typeof body === 'string' ? body : String(body))
  const tone = draft ? 'amber' : (kind === 'code' ? 'cyan' : undefined)

  const renderBody = () => {
    if (!bodyStr.trim()) return <p className="rc-prose rc-empty">No result text came back.</p>
    if (kind === 'number') return <div className="rc-number">{bodyStr}</div>
    if (kind === 'code') {
      return (
        <div className="rc-code">
          <pre><code>{bodyStr}</code></pre>
        </div>
      )
    }
    if (kind === 'table') {
      const t = parseMdTable(bodyStr)
      if (t) {
        return (
          <div className="rc-tablewrap">
            <table className="rc-table">
              <thead><tr>{t.header.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
              <tbody>{t.body.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
            </table>
          </div>
        )
      }
      return <p className="rc-prose">{bodyStr}</p>
    }
    // text / analysis - readable prose, line breaks preserved.
    return <p className="rc-prose">{bodyStr}</p>
  }

  const downloadBody = () => {
    if (kind === 'code') { downloadText(bodyStr, 'workcopilot-result.txt', 'text/plain'); return }
    if (kind === 'table') {
      const t = parseMdTable(bodyStr)
      if (t) { downloadText(csvFromTable(t), 'workcopilot-result.csv', 'text/csv'); return }
      downloadText(bodyStr, 'workcopilot-result.md', 'text/markdown')
    }
  }
  const canDownload = kind === 'code' || kind === 'table'

  return (
    <WorkCard theme="light" tone={tone} reveal={false} texture={false} className={'rc-card ' + className}>
      <WorkCard.Head
        icon={meta.icon}
        align="start"
        eyebrow={draft ? 'Draft, needs input' : 'Result'}
        title={draft ? 'A draft, not a confident answer' : meta.label}
      />

      {/* NEED - when the engine says what it is missing, that leads, so the
          person reads it before the draft body. */}
      {draft && need && String(need).trim() ? (
        <div className="rc-need">
          <AlertTriangle size={15} />
          <span><b>I need:</b> {String(need).trim()}</span>
        </div>
      ) : null}

      <div className="rc-bodywrap">{renderBody()}</div>

      {/* Actions - the result is handed over to copy or use, never auto-filled. */}
      <div className="rc-actions">
        <CopyAction text={bodyStr} label="Copy" />
        {canDownload && (
          <button type="button" className="rc-act" onClick={downloadBody}>
            <Download size={13} /> Download {kind === 'code' ? 'file' : 'CSV'}
          </button>
        )}
      </div>

      {/* THE HONESTY CONTRACT - always on screen under the body. */}
      <div className="rc-trust">
        <div className="rc-meterrow">
          <span className="rc-trust-k">{draft ? <AlertTriangle size={12} /> : <ShieldCheck size={12} />} Confidence</span>
          <span className="rc-meter" role="meter" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={'Confidence ' + pct + ' percent'}>
            <span className="rc-meter-fill" style={{ width: pct + '%' }} />
          </span>
          <span className="rc-meter-val">{pct}% <i>{band}</i></span>
        </div>

        {basis && String(basis).trim() ? (
          <div className="rc-fact">
            <span className="rc-trust-k">How I got it</span>
            <p>{String(basis).trim()}</p>
          </div>
        ) : null}

        {verifyBy && String(verifyBy).trim() ? (
          <div className="rc-fact">
            <span className="rc-trust-k">Verify by</span>
            <p>{String(verifyBy).trim()}</p>
          </div>
        ) : null}

        {caveat && String(caveat).trim() ? (
          <div className={'rc-caveat' + (draft ? ' strong' : '')}>
            <AlertTriangle size={14} />
            <span>{String(caveat).trim()}</span>
          </div>
        ) : null}
      </div>

      {/* Security check - present only for code results (server attaches it then). */}
      <SecurityNote security={security} />
      {/* Company-policy check - present when the company has armed guidance rules. */}
      <PolicyNote policy={policy} />
    </WorkCard>
  )
}

const RESULTCARD_CSS = `
/* ResultCard - leans entirely on the WorkCard --wc-* tokens it is nested in, so
   tone="amber" (draft) recolors every accent here at once. */
.rc-card{gap:13px}
.rc-bodywrap{min-width:0}

/* NUMBER - the value is the hero */
.rc-number{font-family:"Bricolage Grotesque","Instrument Sans",sans-serif;font-weight:700;
  font-size:clamp(30px,7vw,46px);line-height:1.08;letter-spacing:-.02em;color:var(--wc-tx);
  overflow-wrap:anywhere}

/* PROSE - readable, line breaks kept */
.rc-prose{margin:0;color:var(--wc-tx);font-size:14.5px;line-height:1.62;white-space:pre-wrap;overflow-wrap:anywhere}
.rc-prose.rc-empty{color:var(--wc-dim)}

/* CODE / QUERY - mono block, horizontal scroll, never breaks the layout */
.rc-code{border:1px solid var(--wc-line);border-radius:12px;overflow:hidden;
  background:linear-gradient(180deg,#f4f8f7,#f8fbfa)}
.rc-code pre{margin:0;padding:12px 13px;overflow-x:auto;max-width:100%}
.rc-code code{font-family:"JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  font-size:12.5px;line-height:1.6;color:var(--wc-tx);white-space:pre;display:block}

/* TABLE */
.rc-tablewrap{overflow-x:auto;max-width:100%;border:1px solid var(--wc-line);border-radius:12px}
.rc-table{border-collapse:collapse;width:100%;font-size:13px;line-height:1.5}
.rc-table th,.rc-table td{text-align:left;padding:8px 11px;border-bottom:1px solid var(--wc-line);
  border-right:1px solid var(--wc-line);color:var(--wc-tx);vertical-align:top;overflow-wrap:anywhere}
.rc-table th:last-child,.rc-table td:last-child{border-right:none}
.rc-table tbody tr:last-child td{border-bottom:none}
.rc-table thead th{background:color-mix(in srgb,var(--wc-ink) 9%,transparent);font-weight:700;
  color:var(--wc-ink);white-space:nowrap}
.rc-table tbody tr:nth-child(even) td{background:color-mix(in srgb,var(--wc-ink) 4%,transparent)}

/* NEED - the missing input leads a draft */
.rc-need{display:flex;gap:9px;align-items:flex-start;font-size:13.5px;line-height:1.5;color:var(--wc-tx);
  background:color-mix(in srgb,var(--wc-ink) 11%,transparent);
  border:1px solid color-mix(in srgb,var(--wc-ink) 30%,transparent);border-radius:11px;padding:10px 12px}
.rc-need svg{color:var(--wc-ink);flex-shrink:0;margin-top:2px}
.rc-need b{color:var(--wc-ink)}

/* ACTIONS */
.rc-actions{display:flex;flex-wrap:wrap;gap:8px}
.rc-act{display:inline-flex;align-items:center;gap:6px;font-family:inherit;font-size:12.5px;font-weight:600;
  color:var(--wc-ink);background:#fff;border:1px solid var(--wc-line);border-radius:9px;padding:7px 11px;
  cursor:pointer;transition:border-color .15s,background .15s,transform .08s}
.rc-act:hover{border-color:color-mix(in srgb,var(--wc-ink) 40%,var(--wc-line));
  background:color-mix(in srgb,var(--wc-ink) 6%,#fff)}
.rc-act:active{transform:translateY(.5px)}

/* HONESTY CONTRACT block */
.rc-trust{display:flex;flex-direction:column;gap:11px;padding-top:13px;border-top:1px solid var(--wc-line)}
.rc-trust-k{display:inline-flex;align-items:center;gap:5px;font-family:"JetBrains Mono",ui-monospace,monospace;
  font-size:10.5px;font-weight:500;letter-spacing:.1em;text-transform:uppercase;color:var(--wc-ink)}
.rc-meterrow{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.rc-meter{position:relative;flex:1;min-width:120px;height:7px;border-radius:999px;overflow:hidden;
  background:color-mix(in srgb,var(--wc-mut) 20%,transparent)}
.rc-meter-fill{position:absolute;left:0;top:0;bottom:0;border-radius:999px;
  background:linear-gradient(90deg,var(--wc-ic1),var(--wc-ic2));transition:width .5s cubic-bezier(.2,.7,.2,1)}
.rc-meter-val{font-size:12.5px;font-weight:700;color:var(--wc-tx);white-space:nowrap;font-variant-numeric:tabular-nums}
.rc-meter-val i{font-style:normal;font-weight:600;color:var(--wc-dim);font-size:11.5px;margin-left:3px}
.rc-fact{display:flex;flex-direction:column;gap:3px}
.rc-fact p{margin:0;font-size:13px;line-height:1.55;color:var(--wc-mut);overflow-wrap:anywhere}
.rc-caveat{display:flex;gap:8px;align-items:flex-start;font-size:12.5px;line-height:1.5;color:var(--wc-mut);
  background:color-mix(in srgb,var(--wc-ink) 6%,transparent);
  border:1px solid color-mix(in srgb,var(--wc-ink) 18%,transparent);border-radius:10px;padding:9px 11px}
.rc-caveat svg{color:var(--wc-ink);flex-shrink:0;margin-top:1px}
.rc-caveat.strong{background:color-mix(in srgb,var(--wc-ink) 12%,transparent);
  border-color:color-mix(in srgb,var(--wc-ink) 34%,transparent);color:var(--wc-tx);font-weight:500}

@media(max-width:420px){
  .rc-meter{min-width:90px}
  .rc-act{flex:1 1 auto;justify-content:center}
}
@media(prefers-reduced-motion:reduce){
  .rc-meter-fill{transition:none}
  .rc-act:active{transform:none}
}
`
