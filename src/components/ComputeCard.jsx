import React, { useState } from 'react'
import { Hash, Table, Calculator, Check, Copy, Download, ShieldCheck, ListChecks } from 'lucide-react'
import WorkCard from './WorkCard.jsx'

// ComputeCard - renders the RESULT of an on-device data computation (a number or a
// table) that was run locally with runSpec() on the full rows of a CSV / Excel
// file the person attached. Built on the shared WorkCard primitive so it reads as
// the same Option C light design language as ResultCard and ComposeCard. LIGHT
// theme only.
//
// THE PRIVACY CONTRACT is the point of this feature, so the card states it plainly:
// the file was read on the device and the rows never left it. Only the column
// schema + row count were sent to plan the computation; the plan was re-checked
// and then run here, locally, on the full rows.
//
// It consumes:
//   result      - the runSpec() output:
//                   table  -> { output:'table', columns:[...], rows:[{...}], rowCount, truncated }
//                   number -> { output:'number', value, rowCount }
//   explanation - the server's plain-English note on what the plan does (basis)
//   caveat      - an optional one-line check note (shown only when non-empty)
//   spec        - the validated computation spec, rendered to plain-English steps
//                 so the basis is fully reproducible without re-sending anything.
//
// The result is handed to the person to copy or download. Nothing is auto-filled
// into their app - Copy and Download are the only actions (read-only, by design).

const STYLE_ID = 'computecard-css'
function ensureAssets() {
  if (typeof document === 'undefined') return
  if (document.getElementById(STYLE_ID)) return
  const s = document.createElement('style')
  s.id = STYLE_ID
  s.textContent = COMPUTECARD_CSS
  document.head.appendChild(s)
}

// ---- plain-English rendering of the spec (the reproducible basis) ----------
// Purely local: turns the validated DSL into readable steps so the person can
// see exactly what ran, without anything leaving the device.
const CMP_WORD = {
  eq: 'is', ne: 'is not', gt: 'is greater than', gte: 'is at least',
  lt: 'is less than', lte: 'is at most', contains: 'contains', in: 'is one of',
}
const FN_WORD = {
  sum: 'total', avg: 'average', min: 'minimum', max: 'maximum',
  count: 'count', countDistinct: 'distinct count',
}
function clauseText(w) {
  if (!w) return ''
  const val = Array.isArray(w.value) ? w.value.join(', ') : String(w.value == null ? '' : w.value)
  return `${w.col} ${CMP_WORD[w.cmp] || w.cmp} ${val}`.trim()
}
function aggText(a) {
  if (!a) return ''
  const fn = FN_WORD[a.fn] || a.fn
  if (a.fn === 'count') return `count of rows${a.as ? ` as "${a.as}"` : ''}`
  return `${fn} of ${a.col}${a.as ? ` as "${a.as}"` : ''}`
}
function describeSpecPlain(spec) {
  const out = []
  for (const st of ((spec && spec.steps) || [])) {
    if (!st) continue
    if (st.op === 'filter') {
      const parts = (st.where || []).map(clauseText).filter(Boolean)
      out.push(`Keep only rows where ${parts.join(' and ')}.`)
    } else if (st.op === 'derive') {
      out.push(`Add a column "${st.as}" computed as ${st.expr}.`)
    } else if (st.op === 'select') {
      out.push(`Keep the columns: ${(st.cols || []).join(', ')}.`)
    } else if (st.op === 'group') {
      const by = (st.by || []).join(', ')
      const aggs = (st.agg || []).map(aggText).filter(Boolean).join(', ')
      out.push(`Group by ${by || 'the whole table'}, then take the ${aggs}.`)
    } else if (st.op === 'sort') {
      out.push(`Sort by ${st.by} (${st.dir === 'desc' ? 'high to low' : 'low to high'}).`)
    } else if (st.op === 'limit') {
      out.push(`Take the first ${st.n} ${st.n === 1 ? 'row' : 'rows'}.`)
    }
  }
  if (spec && spec.output === 'number') {
    const v = spec.value || {}
    out.push(v.fn === 'count'
      ? 'Return the count of rows.'
      : `Return the ${FN_WORD[v.fn] || v.fn} of ${v.col}.`)
  } else {
    out.push('Return the resulting table.')
  }
  return out
}

// Format a numeric result readably (thousands separators, sane decimals) while
// keeping the raw value for copy / download. Strings pass through unchanged.
function fmtNum(v) {
  if (v == null || v === '') return '-'
  if (typeof v === 'number' && Number.isFinite(v)) {
    const r = Math.round(v * 1e6) / 1e6
    return r.toLocaleString(undefined, { maximumFractionDigits: 6 })
  }
  return String(v)
}
function cell(v) { return v == null ? '' : String(v) }

function csvEsc(c) {
  const v = cell(c)
  return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v
}
function csvFromResult(result) {
  if (!result) return ''
  if (result.output === 'number') {
    return ['value', csvEsc(result.value)].join('\r\n')
  }
  const cols = result.columns || []
  const head = cols.map(csvEsc).join(',')
  const body = (result.rows || []).map((r) => cols.map((c) => csvEsc(r[c])).join(',')).join('\r\n')
  return body ? head + '\r\n' + body : head
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
function slug(name) {
  const s = String(name || '').toLowerCase().replace(/\.[a-z0-9]+$/i, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48)
  return s ? s + '-computed' : 'workcopilot-computed'
}

// A self-contained copy control, so the card owns its own clipboard feedback.
function CopyAction({ text, label = 'Copy' }) {
  const [done, setDone] = useState(false)
  const copy = async () => {
    try { await navigator.clipboard.writeText(text || ''); setDone(true); setTimeout(() => setDone(false), 1500) }
    catch { /* clipboard blocked */ }
  }
  return (
    <button type="button" className="cm-act" onClick={copy}>
      {done ? <Check size={13} /> : <Copy size={13} />} {done ? 'Copied' : label}
    </button>
  )
}

export default function ComputeCard({ result, explanation, caveat, spec, fileName, className = '' }) {
  ensureAssets()
  if (!result) return null
  const isNumber = result.output === 'number'
  const steps = describeSpecPlain(spec)
  const csv = csvFromResult(result)
  const copyText = isNumber ? cell(result.value) : csv
  const base = slug(fileName)

  const renderBody = () => {
    if (isNumber) {
      return <div className="cm-number">{fmtNum(result.value)}</div>
    }
    const cols = result.columns || []
    const rows = result.rows || []
    if (!cols.length || !rows.length) {
      return <p className="cm-empty">No rows matched, so the table is empty.</p>
    }
    return (
      <div className="cm-tablewrap">
        <table className="cm-table">
          <thead><tr>{cols.map((h, i) => <th key={i}>{cell(h)}</th>)}</tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>{cols.map((c, j) => <td key={j}>{cell(r[c])}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <WorkCard theme="light" reveal={false} texture={false} className={'cm-card ' + className}>
      <WorkCard.Head
        icon={isNumber ? Hash : Table}
        align="start"
        eyebrow={<span className="cm-eyebrow-in"><Calculator size={11} /> Computed on your device{isNumber ? ' · Number' : ' · Table'}</span>}
        title={isNumber ? 'The number' : 'The table'}
      />

      <div className="cm-bodywrap">{renderBody()}</div>

      {!isNumber && result.truncated ? (
        <div className="cm-trunc">
          Showing the first {(result.rows || []).length.toLocaleString()} of {Number(result.rowCount || 0).toLocaleString()} result rows. Download the CSV for the full set.
        </div>
      ) : null}

      {/* Actions - the result is handed over to copy or download, never auto-filled. */}
      <div className="cm-actions">
        <CopyAction text={copyText} label={isNumber ? 'Copy' : 'Copy as CSV'} />
        <button type="button" className="cm-act" onClick={() => downloadText(csv, base + '.csv', 'text/csv')}>
          <Download size={13} /> Download CSV
        </button>
      </div>

      {/* HOW IT WAS COMPUTED - the reproducible basis: the plain note plus the
          plain-English spec steps, then the caveat, then the privacy line. */}
      <div className="cm-trust">
        <span className="cm-trust-k"><ListChecks size={12} /> How it was computed</span>
        {explanation && String(explanation).trim() ? (
          <p className="cm-basis">{String(explanation).trim()}</p>
        ) : null}
        {steps.length ? (
          <ol className="cm-steps">
            {steps.map((s, i) => <li key={i}>{s}</li>)}
          </ol>
        ) : null}
        <p className="cm-count">
          Run across {Number(result.rowCount || 0).toLocaleString()} {Number(result.rowCount) === 1 ? 'row' : 'rows'} on your device.
        </p>

        {caveat && String(caveat).trim() ? (
          <div className="cm-caveat">
            <span>{String(caveat).trim()}</span>
          </div>
        ) : null}

        <div className="cm-privacy">
          <ShieldCheck size={14} />
          <span>Run on your device. Your data never left it.</span>
        </div>
      </div>
    </WorkCard>
  )
}

const COMPUTECARD_CSS = `
/* ComputeCard - leans entirely on the WorkCard --wc-* tokens it is nested in, so
   it reads as the same Option C light card as ResultCard / ComposeCard. The
   default emerald accent reads as "computed, trusted, local". LIGHT theme only. */
.cm-card{gap:13px}
.cm-bodywrap{min-width:0}
.cm-eyebrow-in{display:inline-flex;align-items:center;gap:5px}
.cm-eyebrow-in svg{flex-shrink:0}

/* NUMBER - the value is the hero */
.cm-number{font-family:"Bricolage Grotesque","Instrument Sans",sans-serif;font-weight:700;
  font-size:clamp(30px,7vw,46px);line-height:1.08;letter-spacing:-.02em;color:var(--wc-tx);
  overflow-wrap:anywhere;font-variant-numeric:tabular-nums}
.cm-empty{margin:0;color:var(--wc-dim);font-size:14px;line-height:1.55}

/* TABLE - horizontal scroll inside the card, never breaks the page layout */
.cm-tablewrap{overflow-x:auto;max-width:100%;border:1px solid var(--wc-line);border-radius:12px;
  -webkit-overflow-scrolling:touch}
.cm-table{border-collapse:collapse;width:100%;font-size:13px;line-height:1.5}
.cm-table th,.cm-table td{text-align:left;padding:8px 11px;border-bottom:1px solid var(--wc-line);
  border-right:1px solid var(--wc-line);color:var(--wc-tx);vertical-align:top;white-space:nowrap}
.cm-table td{font-variant-numeric:tabular-nums}
.cm-table th:last-child,.cm-table td:last-child{border-right:none}
.cm-table tbody tr:last-child td{border-bottom:none}
.cm-table thead th{position:sticky;top:0;background:color-mix(in srgb,var(--wc-ink) 9%,#fff);font-weight:700;
  color:var(--wc-ink)}
.cm-table tbody tr:nth-child(even) td{background:color-mix(in srgb,var(--wc-ink) 4%,transparent)}

.cm-trunc{font-size:12px;line-height:1.5;color:var(--wc-dim);
  background:color-mix(in srgb,var(--wc-ink) 5%,transparent);
  border:1px solid var(--wc-line);border-radius:9px;padding:7px 10px}

/* ACTIONS */
.cm-actions{display:flex;flex-wrap:wrap;gap:8px}
.cm-act{display:inline-flex;align-items:center;gap:6px;font-family:inherit;font-size:12.5px;font-weight:600;
  color:var(--wc-ink);background:#fff;border:1px solid var(--wc-line);border-radius:9px;padding:7px 11px;
  cursor:pointer;transition:border-color .15s,background .15s,transform .08s}
.cm-act:hover{border-color:color-mix(in srgb,var(--wc-ink) 40%,var(--wc-line));
  background:color-mix(in srgb,var(--wc-ink) 6%,#fff)}
.cm-act:active{transform:translateY(.5px)}

/* HOW IT WAS COMPUTED - the reproducible basis */
.cm-trust{display:flex;flex-direction:column;gap:9px;padding-top:13px;border-top:1px solid var(--wc-line)}
.cm-trust-k{display:inline-flex;align-items:center;gap:5px;font-family:"Figtree","Helvetica Neue",system-ui,sans-serif;
  font-size:10.5px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:var(--wc-ink)}
.cm-basis{margin:0;font-size:13px;line-height:1.55;color:var(--wc-mut);overflow-wrap:anywhere}
.cm-steps{margin:0;padding-left:20px;display:flex;flex-direction:column;gap:5px}
.cm-steps li{font-size:13px;line-height:1.5;color:var(--wc-mut);overflow-wrap:anywhere}
.cm-steps li::marker{color:var(--wc-ink);font-weight:700}
.cm-count{margin:0;font-size:12px;line-height:1.5;color:var(--wc-dim);font-variant-numeric:tabular-nums}
.cm-caveat{display:flex;gap:8px;align-items:flex-start;font-size:12.5px;line-height:1.5;color:var(--wc-mut);
  background:color-mix(in srgb,var(--wc-ink) 6%,transparent);
  border:1px solid color-mix(in srgb,var(--wc-ink) 18%,transparent);border-radius:10px;padding:9px 11px}
.cm-privacy{display:flex;gap:8px;align-items:center;font-size:12.5px;line-height:1.45;font-weight:600;color:var(--wc-ink);
  background:color-mix(in srgb,var(--wc-ink) 8%,transparent);
  border:1px solid color-mix(in srgb,var(--wc-ink) 22%,transparent);border-radius:10px;padding:9px 11px}
.cm-privacy svg{flex-shrink:0}

@media(max-width:420px){
  .cm-act{flex:1 1 auto;justify-content:center}
}
@media(prefers-reduced-motion:reduce){
  .cm-act:active{transform:none}
}
`
