// The ONE Standard / Deep guidance-depth control, shared by the superadmin company
// card (sets a company's ceiling) and the company console (assigns each pool a
// depth within that ceiling). Renders the depth registry
// (src/shared/guidance_depth_options.js) as a quiet two-option radio group:
//   Standard - single-task guidance (Lite / Basic / Advanced)
//   Deep     - Projects: a large goal planned as a map of tasks (Premium level)
// With `ceiling`, an option above it stays visible but locked and says so, so a
// company admin sees what exists and what to ask for (never a silent gap, RULE VIII).
// `value` may be null (nothing marked yet, e.g. the grant is not known to the UI).
//
// Layout: two cards side by side, stacking at narrow widths; titles and hints wrap,
// the pills never do; nothing may overflow at 640px (design gate, SUPREME XIV).
import React from 'react'
import { Check, Lock, ListChecks, Network } from 'lucide-react'
import { useT } from '../../../i18n/index.jsx'
import { WORK_DEPTHS, depthWithinCeiling } from '../../../shared/guidance_depth_options.js'

const ICON = { standard: ListChecks, deep: Network }

// value:     'standard' | 'deep' | null
// onChange:  (depthId) => void (not called for a locked option or the current one)
// ceiling:   optional; options above it are locked
// name:      radio group name (unique per instance on a page)
// busy:      disables input while a save is in flight
// compact:   tighter cards for a per-row use (the pool list)
// legend:    optional caption above the group (defaults to the shared legend)
export function DepthChoice({ value, onChange, ceiling = null, name = 'depth', busy = false, compact = false, legend, legendHidden = false }) {
  const t = useT()
  const legendText = legend || t('guidanceDepth.legend')
  return (
    <div className={`dc${compact ? ' compact' : ''}`}>
      <div className={`dc-legend${legendHidden ? ' sr' : ''}`} id={`${name}-legend`}>{legendText}</div>
      <div className="dc-grid" role="radiogroup" aria-labelledby={`${name}-legend`}>
        {WORK_DEPTHS.map((id) => {
          const Icon = ICON[id]
          const on = value === id
          const locked = ceiling != null && !depthWithinCeiling(id, ceiling)
          return (
            <label key={id} className={`dc-opt${on ? ' on' : ''}${locked ? ' locked' : ''}`}>
              <input type="radio" name={name} value={id} checked={on} disabled={busy || locked}
                onChange={() => { if (!on && !locked && onChange) onChange(id) }} />
              <span className="dc-ic"><Icon size={compact ? 14 : 16} aria-hidden="true" /></span>
              <span className="dc-body">
                <span className="dc-title">{t(`guidanceDepth.options.${id}.title`)}<span className="dc-tag">{t(`guidanceDepth.options.${id}.tag`)}</span></span>
                {compact ? null : <span className="dc-hint">{t(`guidanceDepth.options.${id}.hint`)}</span>}
              </span>
              {on ? <span className="dc-cur"><Check size={11} aria-hidden="true" /> {t('guidanceDepth.current')}</span>
                : locked ? <span className="dc-cur lock"><Lock size={11} aria-hidden="true" /> {t('guidanceDepth.aboveGrant')}</span> : null}
            </label>
          )
        })}
      </div>
    </div>
  )
}

// Injected by each host next to its own stylesheet (the hosts inline their CSS
// strings; this keeps the component self-contained, like AiSourceChoice).
export const DEPTH_CHOICE_CSS = `
.dc{min-width:0}
.dc-legend{font-size:11px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:var(--wka-faint);margin:0 0 8px}
.dc-legend.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);margin:0}
.dc-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;min-width:0}
.dc.compact .dc-grid{grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px}
.dc-opt{position:relative;display:flex;align-items:flex-start;gap:10px;min-width:0;padding:11px 12px 10px;border:1px solid var(--wka-line-2);border-radius:12px;background:var(--wka-panel);cursor:pointer;transition:border-color .15s,box-shadow .15s}
.dc.compact .dc-opt{padding:8px 10px;border-radius:10px;align-items:center}
.dc-opt:hover{border-color:var(--wka-accent)}
.dc-opt.on{border-color:var(--wka-accent);box-shadow:0 0 0 3px var(--wka-accent-soft)}
.dc-opt.locked{cursor:not-allowed;background:var(--wka-bg)}
.dc-opt.locked .dc-title,.dc-opt.locked .dc-hint,.dc-opt.locked .dc-tag{color:var(--wka-faint)}
.dc-opt.locked .dc-ic{color:var(--wka-faint)}
.dc-opt input{position:absolute;opacity:0;width:1px;height:1px;margin:0;pointer-events:none}
.dc-opt:has(input:focus-visible){outline:2px solid var(--wka-accent);outline-offset:2px}
.dc-ic{flex:none;width:28px;height:28px;border-radius:9px;display:inline-grid;place-items:center;color:var(--wka-accent);border:1px solid var(--wka-line-2);background:var(--wka-panel);margin-top:1px}
.dc.compact .dc-ic{width:24px;height:24px;border-radius:7px;margin-top:0}
.dc-opt.on .dc-ic{color:#fff;background:var(--wka-accent);border-color:var(--wka-accent)}
.dc-body{display:flex;flex-direction:column;gap:4px;min-width:0;flex:1 1 auto;padding-right:2px}
.dc-title{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:13px;font-weight:700;color:var(--wka-text);line-height:1.35}
.dc-tag{display:inline-flex;align-items:center;padding:1px 8px;border-radius:999px;font-size:10.5px;font-weight:700;letter-spacing:.2px;color:var(--wka-muted);border:1px solid var(--wka-line-2);background:var(--wka-bg-2);white-space:nowrap;flex:none}
.dc-hint{font-size:12px;color:var(--wka-muted);line-height:1.5;overflow-wrap:anywhere}
.dc-cur{position:absolute;top:-9px;right:10px;display:inline-flex;align-items:center;gap:4px;padding:1px 8px;border-radius:999px;font-size:10.5px;font-weight:800;letter-spacing:.3px;color:#fff;background:var(--wka-accent);white-space:nowrap}
.dc-cur.lock{color:var(--wka-muted);background:var(--wka-bg-2);border:1px solid var(--wka-line-2);font-weight:700}
`
