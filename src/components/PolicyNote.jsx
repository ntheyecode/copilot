import React from 'react'
import { BadgeCheck, ShieldAlert, Ban, CircleAlert } from 'lucide-react'

// PolicyNote - the in-app COMPANY-POLICY check for generated guidance. Renders only
// when a `policy` object is passed, which the server attaches to /plan, /result and
// /compose responses when the company has an ARMED policy carrying guidance rules.
//
// `policy` shape (from server runPolicyGate -> policy_rules.enforceRules):
//   { findings:[{kind:'forbid'|'require', title, severity, doc, section, guidance, sample}],
//     counts:{forbid,require,critical,...}, rulesChecked:number }
//
// Each finding CITES the company's own policy (doc + section), so the person sees
// exactly which rule applies and the compliant alternative. Honesty (SUPREME RULE
// III): when nothing fired we still say the guidance WAS checked against N rules,
// never implying no policy exists.
//
// Nested inside a WorkCard, so it inherits the card's --wc-* tokens.
export default function PolicyNote({ policy }) {
  if (!policy || !Array.isArray(policy.findings)) return null
  ensureAssets()
  const findings = policy.findings
  const has = findings.length > 0
  const Icon = has ? ShieldAlert : BadgeCheck
  const n = Number(policy.rulesChecked) || 0

  return (
    <div className={'pn-wrap' + (has ? ' pn-flag' : '')}>
      <div className="pn-head">
        <Icon size={13} />
        <span>{has ? 'Company policy: review before you use this' : `Company policy: clear (checked against ${n} ${n === 1 ? 'rule' : 'rules'})`}</span>
      </div>

      {has ? (
        <ul className="pn-list">
          {findings.slice(0, 8).map((f, i) => {
            const cite = f.doc ? `${f.doc}${f.section ? `, ${f.section}` : ''}` : ''
            return (
              <li key={i}>
                {f.kind === 'forbid' ? <Ban size={12} /> : <CircleAlert size={12} />}
                <span>
                  <b>{f.kind === 'forbid' ? 'Prohibited' : 'Required'}: {f.title || (f.kind === 'forbid' ? 'a prohibited practice' : 'a required practice')}.</b>
                  {f.guidance ? ' ' + f.guidance : ''}
                  {cite ? <span className="pn-cite"> (per {cite})</span> : null}
                </span>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="pn-clean">This guidance was checked against your company security policy and nothing was flagged.</p>
      )}
    </div>
  )
}

const STYLE_ID = 'policynote-css'
function ensureAssets() {
  if (typeof document === 'undefined') return
  if (document.getElementById(STYLE_ID)) return
  const s = document.createElement('style')
  s.id = STYLE_ID
  s.textContent = POLICYNOTE_CSS
  document.head.appendChild(s)
}

const POLICYNOTE_CSS = `
.pn-wrap{display:flex;flex-direction:column;gap:8px;padding-top:13px;border-top:1px solid var(--wc-line)}
.pn-head{display:inline-flex;align-items:center;gap:6px;font-family:"Figtree","Helvetica Neue",system-ui,sans-serif;
  font-size:10.5px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:var(--wc-ink)}
.pn-wrap.pn-flag .pn-head{color:#b45309}
.pn-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:7px}
.pn-list li{display:flex;gap:8px;align-items:flex-start;font-size:13px;line-height:1.5;color:var(--wc-tx);
  background:color-mix(in srgb,var(--wc-ink) 7%,transparent);
  border:1px solid color-mix(in srgb,var(--wc-ink) 18%,transparent);border-radius:10px;padding:8px 11px;overflow-wrap:anywhere}
.pn-list li svg{color:#b45309;flex-shrink:0;margin-top:2px}
.pn-list li b{color:var(--wc-tx);font-weight:700}
.pn-cite{color:var(--wc-dim);font-style:italic}
.pn-clean{margin:0;font-size:12.5px;line-height:1.5;color:var(--wc-mut)}
`
