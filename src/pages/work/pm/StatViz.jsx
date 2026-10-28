// Tiny data visuals for the enterprise dashboards: StatTiles (one number per
// tinted tile), a StackedBar (shares of one whole with a legend, 2px surface
// gaps between fills) and a BarList (ranked horizontal bars). Pure presentation,
// no fetching, inline HTML (no chart dependency). Every color is a .wd token:
// done = primary brand, ongoing = secondary, held = amber warning. Text wears
// text tokens, never a series color; identity is carried by the legend swatch
// and the label, never color alone (dataviz rules). Styles: ep.css.js.
import { useT } from '../../../i18n/index.jsx'
import { pctOf } from './pmModel.js'

// tiles: [{ key, label, value, sub?, tone: 'green'|'blue'|'amber'|'' }]
export function StatTiles({ tiles, ariaLabel }) {
  return (
    <div className="wd-ep-tiles" role="group" aria-label={ariaLabel}>
      {tiles.map((x) => (
        <div key={x.key} className={`wd-ep-tile${x.tone ? ' ' + x.tone : ''}`}>
          <span className="wd-ep-tile-v">{x.value}</span>
          <span className="wd-ep-tile-l">{x.label}</span>
          {x.sub ? <span className="wd-ep-tile-s">{x.sub}</span> : null}
        </div>
      ))}
    </div>
  )
}

// segments: [{ key: 'done'|'ongoing'|'held', label, value }]. A zero-total whole
// shows an honest empty track plus the legend with zeros.
export function StackedBar({ segments, ariaLabel }) {
  const total = segments.reduce((s, x) => s + (Number(x.value) || 0), 0)
  const text = segments.map((x) => `${x.label} ${x.value}`).join(', ')
  return (
    <div>
      <div className="wd-ep-stack" role="img" aria-label={ariaLabel ? `${ariaLabel}: ${text}` : text}>
        {total > 0 && segments.filter((x) => Number(x.value) > 0).map((x) => <i key={x.key} className={x.key} style={{ width: `${pctOf(x.value, total)}%` }} />)}
      </div>
      <div className="wd-ep-legend" aria-hidden>
        {segments.map((x) => <span key={x.key}><i className={x.key} /> {x.label} <b>{x.value}</b>{total > 0 ? <> ({pctOf(x.value, total)}%)</> : null}</span>)}
      </div>
    </div>
  )
}

// items: [{ id, label, sub?, value, right }]; bars scale to the largest value.
export function BarList({ items, ariaLabel, emptyLabel }) {
  const t = useT()
  const max = items.reduce((m, x) => Math.max(m, Number(x.value) || 0), 0)
  if (!items.length) return <div className="wd-ep-tile-s">{emptyLabel || t('workPm.grc.logEmpty')}</div>
  return (
    <div className="wd-ep-bars" role="list" aria-label={ariaLabel}>
      {items.map((x) => (
        <div key={x.id} className="wd-ep-bar" role="listitem">
          <span className="wd-ep-bar-l" title={x.label}>{x.label}{x.sub ? <small>{x.sub}</small> : null}</span>
          <span className="wd-ep-bar-track" aria-hidden><i className="wd-ep-bar-fill" style={{ width: `${pctOf(x.value, max)}%` }} /></span>
          <span className="wd-ep-bar-v">{x.right != null ? x.right : x.value}</span>
        </div>
      ))}
    </div>
  )
}
