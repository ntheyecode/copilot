// Tiny data visuals for the two admin consoles: a Meter (used-of-total bar with
// threshold tints), a StackedBar (shares of one whole, with a legend) and a
// BarList (ranked horizontal bars). Pure presentation, no fetching, only react.
// Every colour is a console token (--wka-*), so each dashboard's accent and the
// user's own accent choice flow through; nothing here hardcodes a literal.
//
// Design-time gate (SUPREME RULE XIV): every label has min-width:0 + ellipsis,
// bars are width:100% of their row, legends wrap, and nothing carries a fixed
// pixel width wider than a phone column. Numbers use tabular figures.
import React from 'react'

export const VIZ_CSS = `
.wkv-meter { display:block; min-width:0; }
.wkv-meter-row { display:flex; align-items:baseline; justify-content:space-between; gap:10px; margin-bottom:5px; min-width:0; }
.wkv-meter-row .l { font-size:12px; color:var(--wka-muted); min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.wkv-meter-row .r { font-size:12px; font-weight:600; color:var(--wka-text); font-variant-numeric:tabular-nums; white-space:nowrap; flex-shrink:0; }
.wkv-meter-bar { height:8px; border-radius:999px; background:var(--wka-line-2); overflow:hidden; }
.wkv-meter-bar.thin { height:5px; }
.wkv-meter-bar > span { display:block; height:100%; border-radius:999px; background:var(--wka-accent); transition:width .3s; }
.wkv-meter-bar > span.ok { background:var(--wka-emerald); }
.wkv-meter-bar > span.warn { background:var(--wka-amber); }
.wkv-meter-bar > span.hot { background:var(--wka-red); }
.wkv-stack { display:flex; height:12px; border-radius:999px; overflow:hidden; background:var(--wka-line-2); }
.wkv-stack > span { display:block; height:100%; min-width:0; }
.wkv-stack > span.s0 { background:var(--wka-accent); }
.wkv-stack > span.s1 { background:var(--wka-emerald); }
.wkv-stack > span.s2 { background:var(--wka-amber); }
.wkv-stack > span.s3 { background:var(--wka-accent-dark); }
.wkv-legend { display:flex; flex-wrap:wrap; gap:6px 16px; margin-top:8px; }
.wkv-legend > span { display:inline-flex; align-items:center; gap:6px; font-size:12px; color:var(--wka-muted); white-space:nowrap; }
.wkv-legend i { width:9px; height:9px; border-radius:50%; flex-shrink:0; }
.wkv-legend i.s0 { background:var(--wka-accent); }
.wkv-legend i.s1 { background:var(--wka-emerald); }
.wkv-legend i.s2 { background:var(--wka-amber); }
.wkv-legend i.s3 { background:var(--wka-accent-dark); }
.wkv-legend b { color:var(--wka-text); font-variant-numeric:tabular-nums; }
.wkv-list { display:flex; flex-direction:column; gap:7px; }
.wkv-item { display:grid; grid-template-columns:minmax(80px, 150px) 1fr auto; align-items:center; gap:10px; min-width:0; }
.wkv-item .l { font-size:12.5px; color:var(--wka-text); min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.wkv-item .l small { display:block; font-size:11px; color:var(--wka-faint); overflow:hidden; text-overflow:ellipsis; }
.wkv-item .v { font-size:12px; font-weight:600; color:var(--wka-muted); font-variant-numeric:tabular-nums; white-space:nowrap; text-align:right; }
@media (max-width: 640px) {
  .wkv-item { grid-template-columns:minmax(64px, 96px) 1fr auto; gap:8px; }
}
`

// Share of `max` consumed by `value`, 0..100, honest when max is 0 (no bar).
export function pctOf(value, max) {
  const v = Math.max(0, Number(value) || 0), m = Number(max) || 0
  return m > 0 ? Math.min(100, Math.round((v / m) * 100)) : 0
}

// One used-of-total bar. `tone` forces a colour; otherwise it is green below
// `warnAt`, amber up to `hotAt`, red beyond (pool and allowance semantics).
export function Meter({ value, max, warnAt = 75, hotAt = 90, label, right, thin = false, tone, ariaLabel }) {
  const pct = pctOf(value, max)
  const cls = tone || (pct >= hotAt ? 'hot' : pct >= warnAt ? 'warn' : 'ok')
  return (
    <div className="wkv-meter">
      {(label || right) ? (
        <div className="wkv-meter-row">
          <span className="l">{label}</span>
          <span className="r">{right}</span>
        </div>
      ) : null}
      <div className={`wkv-meter-bar${thin ? ' thin' : ''}`} role="meter" aria-label={ariaLabel || (typeof label === 'string' ? label : undefined)} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
        <span className={cls} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// Shares of one whole: segments [{ key, label, value }] in order; a legend with
// the counts follows. Zero-value segments keep their legend entry (honest).
export function StackedBar({ segments, ariaLabel }) {
  const total = segments.reduce((s, x) => s + (Math.max(0, Number(x.value) || 0)), 0)
  return (
    <div>
      <div className="wkv-stack" role="img" aria-label={ariaLabel}>
        {segments.map((s, i) => {
          const v = Math.max(0, Number(s.value) || 0)
          return <span key={s.key} className={`s${i % 4}`} style={{ width: total > 0 ? `${(v / total) * 100}%` : '0%' }} title={`${s.label}: ${v}`} />
        })}
      </div>
      <div className="wkv-legend">
        {segments.map((s, i) => <span key={s.key}><i className={`s${i % 4}`} aria-hidden="true" />{s.label} <b>{Math.max(0, Number(s.value) || 0)}</b></span>)}
      </div>
    </div>
  )
}

// Ranked horizontal bars: items [{ key, label, sub, value, max, valueLabel, tone }].
// `max` defaults to the largest value in the list, so the top item is full width.
export function BarList({ items, ariaLabel }) {
  const top = items.reduce((m, x) => Math.max(m, Number(x.max != null ? x.max : x.value) || 0), 0)
  return (
    <div className="wkv-list" role="list" aria-label={ariaLabel}>
      {items.map((it) => (
        <div key={it.key} className="wkv-item" role="listitem">
          <span className="l" title={it.label}>{it.label}{it.sub ? <small>{it.sub}</small> : null}</span>
          <Meter value={it.value} max={it.max != null ? it.max : top} thin tone={it.tone || 'accent'} ariaLabel={it.label} />
          <span className="v">{it.valueLabel}</span>
        </div>
      ))}
    </div>
  )
}
