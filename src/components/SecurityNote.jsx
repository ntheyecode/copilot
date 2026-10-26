import React from 'react'
import { ShieldCheck, ShieldAlert, AlertTriangle, PackageSearch } from 'lucide-react'

// SecurityNote - the in-app security check for a CODE result or composition.
// It renders ONLY when a `security` object is passed, which the server attaches
// to /result and /compose responses ONLY for code-related outputs (kind/format
// === 'code'). So this block appears for code work and nothing else.
//
// `security` shape (from server runSecurityGate -> security_gate.securityReview):
//   { codeIssues:[{title,fix,...}], vulnerable:[{name,version,latest,vulns:[{id,fixedIn}]}],
//     outdated:[...], checkedDeps:bool }
//
// Honesty (SUPREME RULE III): when checkedDeps is false we SAY the dependency
// database could not be reached, instead of implying the libraries were cleared.
//
// Nested inside a WorkCard, so it inherits the card's --wc-* tokens.
export default function SecurityNote({ security }) {
  if (!security) return null
  ensureAssets()
  const codeIssues = Array.isArray(security.codeIssues) ? security.codeIssues : []
  const vulnerable = Array.isArray(security.vulnerable) ? security.vulnerable : []
  const hasFindings = codeIssues.length > 0 || vulnerable.length > 0
  const Icon = hasFindings ? ShieldAlert : ShieldCheck

  return (
    <div className={'sn-wrap' + (hasFindings ? ' sn-flag' : '')}>
      <div className="sn-head">
        <Icon size={13} />
        <span>{hasFindings ? 'Security check: review before you use this' : 'Security check: no known issues'}</span>
      </div>

      {codeIssues.length > 0 ? (
        <ul className="sn-list">
          {codeIssues.slice(0, 6).map((c, i) => (
            <li key={'c' + i}>
              <AlertTriangle size={12} />
              <span><b>{c.title}.</b>{c.fix ? ' ' + c.fix : ''}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {vulnerable.length > 0 ? (
        <ul className="sn-list">
          {vulnerable.slice(0, 6).map((v, i) => {
            const vulns = Array.isArray(v.vulns) ? v.vulns : []
            const ids = vulns.slice(0, 3).map((x) => x.id).filter(Boolean).join(', ')
            const safe = v.latest || vulns.map((x) => x.fixedIn).filter(Boolean).sort().pop() || 'a patched version'
            const n = vulns.length || 1
            return (
              <li key={'v' + i}>
                <PackageSearch size={12} />
                <span><b>{v.name} {v.version}</b> has {n} known {n === 1 ? 'vulnerability' : 'vulnerabilities'}{ids ? ` (${ids}${vulns.length > 3 ? ', and more' : ''})` : ''}. Upgrade to {safe}{v.latest ? ' (latest)' : ' or later'}.</span>
              </li>
            )
          })}
        </ul>
      ) : null}

      {!hasFindings ? (
        <p className="sn-clean">No dangerous commands and no known-vulnerable libraries were found in this code.</p>
      ) : null}

      {security.checkedDeps === false ? (
        <p className="sn-note">The vulnerability database could not be reached, so library versions were not checked this time.</p>
      ) : null}
    </div>
  )
}

const STYLE_ID = 'securitynote-css'
function ensureAssets() {
  if (typeof document === 'undefined') return
  if (document.getElementById(STYLE_ID)) return
  const s = document.createElement('style')
  s.id = STYLE_ID
  s.textContent = SECURITYNOTE_CSS
  document.head.appendChild(s)
}

// Leans on the enclosing WorkCard's --wc-* tokens. A clean check reads calm; a
// flagged one is given an amber-ish emphasis via the ink token.
const SECURITYNOTE_CSS = `
.sn-wrap{display:flex;flex-direction:column;gap:8px;padding-top:13px;border-top:1px solid var(--wc-line)}
.sn-head{display:inline-flex;align-items:center;gap:6px;font-family:"Figtree","Helvetica Neue",system-ui,sans-serif;
  font-size:10.5px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:var(--wc-ink)}
.sn-wrap.sn-flag .sn-head{color:#b45309}
.sn-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:7px}
.sn-list li{display:flex;gap:8px;align-items:flex-start;font-size:13px;line-height:1.5;color:var(--wc-tx);
  background:color-mix(in srgb,var(--wc-ink) 7%,transparent);
  border:1px solid color-mix(in srgb,var(--wc-ink) 18%,transparent);border-radius:10px;padding:8px 11px;overflow-wrap:anywhere}
.sn-list li svg{color:#b45309;flex-shrink:0;margin-top:2px}
.sn-list li b{color:var(--wc-tx);font-weight:700}
.sn-clean{margin:0;font-size:12.5px;line-height:1.5;color:var(--wc-mut)}
.sn-note{margin:0;font-size:11.5px;line-height:1.45;color:var(--wc-dim);font-style:italic}
`
