// Shared HELP primitives for the two admin consoles (company admin + superadmin):
// a clickable step strip for the main flow, and an "area" panel = heading, a few
// short numbered steps, and the real screenshot(s) of that screen. Screenshots are
// static assets under /help/<role>/ (public/, copied into dist, allowlisted by
// scripts/check-public-assets.mjs). Everything is scoped under .wkh-* and uses only
// the console's own --wka-* tokens, so it follows each console's accent.
//
// Design-time gate (SUPREME RULE XIV): images are width:100%/height:auto with a
// max width, the step strip wraps, headings never clip, and at phone width the
// steps and shots stack in one column - no horizontal scroll at 640.
import React from 'react'
import { ChevronRight, ExternalLink } from 'lucide-react'

export const HELP_CSS = `
.wkh-flow { display:flex; flex-wrap:wrap; align-items:center; gap:8px 4px; margin:2px 0 0; }
.wkh-flow-step { display:inline-flex; align-items:center; gap:8px; padding:6px 12px 6px 6px; border-radius:999px; border:1px solid var(--wka-line); background:var(--wka-panel); font:inherit; font-size:13px; font-weight:600; color:var(--wka-text); cursor:pointer; white-space:nowrap; flex-shrink:0; }
.wkh-flow-step:hover { border-color:var(--wka-accent); color:var(--wka-accent-dark); }
.wkh-flow-step:focus-visible { outline:2px solid var(--wka-accent); outline-offset:2px; }
.wkh-flow-n { width:22px; height:22px; border-radius:50%; display:inline-grid; place-items:center; background:var(--wka-accent-soft); color:var(--wka-accent-ink); font-size:12px; font-weight:800; flex-shrink:0; }
.wkh-flow-arrow { color:var(--wka-faint); flex-shrink:0; display:inline-flex; }
.wkh-area { scroll-margin-top:12px; }
.wkh-head { display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:4px; }
.wkh-head h2 { margin:0; display:inline-flex; align-items:center; gap:8px; min-width:0; }
.wkh-head h2 svg { color:var(--wka-accent); flex-shrink:0; }
.wkh-head .wkh-open { margin-left:auto; }
.wkh-lead { color:var(--wka-muted); font-size:13px; margin:0; max-width:78ch; }
.wkh-steps { list-style:none; margin:14px 0 0; padding:0; display:grid; grid-template-columns:repeat(auto-fit, minmax(230px, 1fr)); gap:12px 18px; counter-reset:wkh; }
.wkh-steps li { position:relative; padding-left:34px; font-size:13px; color:var(--wka-muted); line-height:1.5; min-width:0; }
.wkh-steps li b { display:block; color:var(--wka-text); font-weight:650; }
.wkh-steps li::before { counter-increment:wkh; content:counter(wkh); position:absolute; left:0; top:0; width:24px; height:24px; border-radius:50%; display:grid; place-items:center; background:var(--wka-accent-soft); color:var(--wka-accent-ink); border:1px solid var(--wka-accent-line); font-size:12px; font-weight:800; }
.wkh-shots { display:grid; grid-template-columns:1fr; gap:14px; margin-top:16px; }
.wkh-shots.two { grid-template-columns:repeat(auto-fit, minmax(400px, 1fr)); }
.wkh-shot { margin:0; min-width:0; }
.wkh-shot img { display:block; width:100%; max-width:920px; height:auto; border:1px solid var(--wka-line); border-radius:12px; background:var(--wka-panel); box-shadow:0 1px 2px rgba(26,31,54,0.05), 0 10px 28px -18px rgba(26,31,54,0.22); }
.wkh-shot.narrow img { max-width:560px; }
.wkh-shot figcaption { margin-top:7px; font-size:12px; color:var(--wka-faint); line-height:1.45; }
.wkh-note { margin-top:14px; }
@media (max-width: 640px) {
  .wkh-steps { grid-template-columns:1fr; }
  .wkh-shots.two { grid-template-columns:1fr; }
  .wkh-head .wkh-open { margin-left:0; }
}
`

// The main flow as a strip of numbered pills. Each pill scrolls to its area.
export function HelpFlow({ steps }) {
  const jump = (id) => { const el = document.getElementById('wkh-' + id); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }) }
  return (
    <div className="wkh-flow" role="list" aria-label="The main flow">
      {steps.map((s, i) => (
        <React.Fragment key={s.id}>
          <button type="button" className="wkh-flow-step" role="listitem" onClick={() => jump(s.id)}>
            <span className="wkh-flow-n" aria-hidden="true">{i + 1}</span>{s.label}
          </button>
          {i < steps.length - 1 ? <span className="wkh-flow-arrow" aria-hidden="true"><ChevronRight size={15} /></span> : null}
        </React.Fragment>
      ))}
    </div>
  )
}

// One help area: heading, lead, a few numbered steps, screenshot(s), and an
// optional "Open" button that switches the console to that section.
export function HelpArea({ id, icon: Icon, title, lead, steps = [], shots = [], open, onOpen, children }) {
  return (
    <section id={'wkh-' + id} className="wka-panel wkh-area" aria-labelledby={'wkh-h-' + id}>
      <div className="wkh-head">
        <h2 id={'wkh-h-' + id}>{Icon ? <Icon size={15} /> : null}{title}</h2>
        {open && onOpen ? <button type="button" className="wka-btn sm ghost wkh-open" onClick={() => onOpen(open.id)}><ExternalLink size={13} /> Open {open.label}</button> : null}
      </div>
      {lead ? <p className="wkh-lead">{lead}</p> : null}
      {steps.length ? (
        <ol className="wkh-steps">
          {steps.map((s, i) => <li key={i}><b>{s.t}</b>{s.d}</li>)}
        </ol>
      ) : null}
      {shots.length ? (
        <div className={`wkh-shots${shots.length > 1 ? ' two' : ''}`}>
          {shots.map((s) => (
            <figure key={s.src} className={`wkh-shot${s.narrow ? ' narrow' : ''}`}>
              <img src={s.src} alt={s.alt} width={s.w} height={s.h} loading="lazy" decoding="async" />
              {s.caption ? <figcaption>{s.caption}</figcaption> : null}
            </figure>
          ))}
        </div>
      ) : null}
      {children}
    </section>
  )
}
