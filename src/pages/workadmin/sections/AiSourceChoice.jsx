// The 3-way "how this company runs AI" choice, shared by the superadmin create
// form, the superadmin company card and the company admin console. Renders the
// ONE option registry (src/shared/ai_source_options.js) as a quiet radio group:
//   1. client   - the company admin enters their own key   (aiSource 'company')
//   2. managed  - the WorkCoPilot team enters it for them   (aiSource 'company')
//   3. platform - shared platform keys, nothing to enter    (aiSource 'platform')
// The current pick is marked, options the viewer may not switch (company admins
// cannot move themselves onto platform keys; that is the operator's call) stay
// visible but locked with a one-line reason, and the readiness line underneath
// says plainly whether AI is usable right now (never a silent gap, RULE VIII).
//
// Layout: a responsive grid that stacks at narrow widths; nothing in it may
// overflow at 640px (titles wrap, the chips do not).
import React from 'react'
import { Check, KeyRound, UserCog, Cloud, Lock } from 'lucide-react'
import { useT } from '../../../i18n/index.jsx'
import { AI_SETUP_OPTIONS, aiReadiness } from '../../../shared/ai_source_options.js'

const ICON = { client: KeyRound, managed: UserCog, platform: Cloud }

// value:       current option id (or '' / null = none chosen yet)
// onChange:    (optionId) => void  (not called for locked options)
// voice:       'operator' (superadmin wording) | 'company' (company admin wording)
// company:     public company payload, for the readiness line (optional)
// lockedIds:   option ids shown but not switchable by this viewer
// name:        radio group name (unique per instance on a page)
// busy:        disables input while a patch is in flight
export function AiSourceChoice({ value, onChange, voice = 'operator', company = null, lockedIds = [], name = 'ai-setup', busy = false, legend }) {
  const t = useT()
  const readiness = aiReadiness(company, value)
  const key = company && company.companyAi && company.companyAi.keyMasked
  const stateText = readiness === 'ready'
    ? (value === 'platform' || !key ? t('aiSource.state.ready') : t('aiSource.state.readyKey', { key }))
    : readiness === 'needs_key' ? t('aiSource.state.needsKey') : t('aiSource.state.unselected')
  return (
    <div className="asc">
      <div className="asc-legend" id={`${name}-legend`}>{legend || (voice === 'company' ? t('aiSource.legendCompany') : t('aiSource.legend'))}</div>
      <div className="asc-grid" role="radiogroup" aria-labelledby={`${name}-legend`}>
        {AI_SETUP_OPTIONS.map((o, i) => {
          const Icon = ICON[o.id]
          const on = value === o.id
          const locked = lockedIds.includes(o.id) && !on
          return (
            <label key={o.id} className={`asc-opt${on ? ' on' : ''}${locked ? ' locked' : ''}`}>
              <input type="radio" name={name} value={o.id} checked={on} disabled={busy || locked} onChange={() => { if (!on && !locked) onChange && onChange(o.id) }} />
              <span className="asc-n">{i + 1}</span>
              <span className="asc-body">
                <span className="asc-title"><Icon size={14} aria-hidden="true" /> {t(`aiSource.options.${voice}.${o.id}.title`)}</span>
                <span className="asc-hint">{t(`aiSource.options.${voice}.${o.id}.hint`)}</span>
                <span className="asc-who">{locked ? <><Lock size={11} aria-hidden="true" /> {t('aiSource.teamOnly')}</> : t(`aiSource.options.${voice}.${o.id}.who`)}</span>
              </span>
              {on ? <span className="asc-cur"><Check size={11} aria-hidden="true" /> {t('aiSource.current')}</span> : null}
            </label>
          )
        })}
      </div>
      <div className={`asc-state ${readiness}`} role="status">{readiness === 'ready' ? <Check size={13} aria-hidden="true" /> : null}{stateText}</div>
    </div>
  )
}

// Injected by each host next to its own stylesheet (the hosts already inline
// their CSS strings; this keeps the component self-contained).
export const AI_SOURCE_CHOICE_CSS = `
.asc{min-width:0}
.asc-legend{font-size:11px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:var(--wka-faint);margin:0 0 8px}
.asc-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px;min-width:0}
.asc-opt{position:relative;display:flex;align-items:flex-start;gap:10px;min-width:0;padding:11px 12px 10px;border:1px solid var(--wka-line-2);border-radius:12px;background:var(--wka-panel);cursor:pointer;transition:border-color .15s,box-shadow .15s}
.asc-opt:hover{border-color:var(--wka-accent)}
.asc-opt.on{border-color:var(--wka-accent);box-shadow:0 0 0 3px var(--wka-accent-soft)}
.asc-opt.locked{cursor:not-allowed;background:var(--wka-bg)}
.asc-opt.locked .asc-title,.asc-opt.locked .asc-hint{color:var(--wka-faint)}
.asc-opt input{position:absolute;opacity:0;width:1px;height:1px;margin:0;pointer-events:none}
.asc-opt:has(input:focus-visible){outline:2px solid var(--wka-accent);outline-offset:2px}
.asc-n{flex:none;width:22px;height:22px;border-radius:999px;display:inline-grid;place-items:center;font-size:11.5px;font-weight:800;color:var(--wka-muted);border:1px solid var(--wka-line-2);background:var(--wka-panel);margin-top:1px}
.asc-opt.on .asc-n{color:#fff;background:var(--wka-accent);border-color:var(--wka-accent)}
.asc-body{display:flex;flex-direction:column;gap:4px;min-width:0;flex:1 1 auto;padding-right:2px}
.asc-title{display:flex;align-items:center;gap:6px;font-size:13px;font-weight:700;color:var(--wka-text);line-height:1.35;overflow-wrap:anywhere}
.asc-title svg{flex:none;color:var(--wka-accent)}
.asc-hint{font-size:12px;color:var(--wka-muted);line-height:1.5;overflow-wrap:anywhere}
.asc-who{display:inline-flex;align-items:center;gap:5px;font-size:11.5px;color:var(--wka-faint);line-height:1.4;overflow-wrap:anywhere}
.asc-cur{position:absolute;top:-9px;right:10px;display:inline-flex;align-items:center;gap:4px;padding:1px 8px;border-radius:999px;font-size:10.5px;font-weight:800;letter-spacing:.3px;color:#fff;background:var(--wka-accent);white-space:nowrap}
.asc-state{display:inline-flex;align-items:center;gap:6px;margin-top:10px;padding:4px 10px;border-radius:999px;font-size:12px;font-weight:600;border:1px solid var(--wka-line-2);color:var(--wka-muted);max-width:100%;overflow-wrap:anywhere}
.asc-state.ready{color:var(--wka-emerald);border-color:color-mix(in srgb, var(--wka-emerald) 40%, transparent);background:color-mix(in srgb, var(--wka-emerald) 8%, transparent)}
.asc-state.needs_key{color:var(--wka-amber);border-color:color-mix(in srgb, var(--wka-amber) 40%, transparent);background:color-mix(in srgb, var(--wka-amber) 8%, transparent)}
`
