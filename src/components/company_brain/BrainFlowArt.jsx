// The ONE Company Brain flow diagram, drawn once and used by the home-page
// section (src/components/company_brain/CompanyBrainSection.jsx) and the
// "how it works" section of /workcopilot/company-brain. Original inline SVG:
// three sources (documents, recorded workflows, finished tasks) pass a masking
// gate on the device, land in the sealed per-company brain, and surface as a
// cited step on a person's screen; a dashed loop returns clean finishes to the
// brain. Every label is catalog copy (companyBrainPage.how.art.*) and every
// color is a CSS token of the host (--em / --cyan / --cta / --panel / --line
// / --tx / --mut), so it reads on the light pages and under data-theme=dark.
import { useT } from '../../i18n/index.jsx'


export default function BrainFlowArt({ className = '' }) {
  const t = useT()
  const a = (k) => t(`companyBrainPage.how.art.${k}`)
  const sources = [
    { y: 34, label: a('docs') },
    { y: 112, label: a('workflows') },
    { y: 190, label: a('finished') },
  ]
  return (
    <svg className={`cbf ${className}`.trim()} viewBox="0 0 560 300" fill="none" role="img" aria-label={a('aria')} focusable="false">
      <defs>
        <linearGradient id="cbfBar" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="var(--em)" /><stop offset="1" stopColor="var(--cyan)" /></linearGradient>
        <linearGradient id="cbfGlow" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="var(--em)" stopOpacity=".18" /><stop offset="1" stopColor="var(--cyan)" stopOpacity=".10" /></linearGradient>
        <marker id="cbfHead" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--cyan)" /></marker>
        <marker id="cbfHeadEm" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--em)" /></marker>
      </defs>
      <ellipse cx="300" cy="150" rx="250" ry="120" fill="url(#cbfGlow)" />

      {/* SOURCES: three cards */}
      {sources.map((s, i) => (
        <g key={s.label} transform={`translate(12 ${s.y})`}>
          <rect x="0" y="0" width="128" height="58" rx="12" fill="var(--panel)" stroke="var(--line)" />
          <rect x="0" y="0" width="128" height="3" rx="1.5" fill="url(#cbfBar)" />
          {i === 0 && (<g><rect x="14" y="16" width="30" height="7" rx="3.5" fill="var(--em)" opacity=".8" /><rect x="14" y="28" width="92" height="5" rx="2.5" fill="var(--line)" /><rect x="14" y="38" width="66" height="5" rx="2.5" fill="var(--line)" /></g>)}
          {i === 1 && (<g><circle cx="20" cy="22" r="6" fill="var(--cta)" opacity=".85" /><rect x="32" y="18" width="60" height="7" rx="3.5" fill="var(--line)" /><circle cx="20" cy="38" r="6" fill="var(--em)" opacity=".8" /><rect x="32" y="34" width="44" height="7" rx="3.5" fill="var(--line)" /></g>)}
          {i === 2 && (<g>
            <circle cx="20" cy="22" r="6" fill="var(--em)" /><path d="M17 22.2l2 2 4-4.4" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <rect x="32" y="18" width="56" height="7" rx="3.5" fill="var(--line)" />
            <circle cx="20" cy="38" r="6" fill="var(--em)" /><path d="M17 38.2l2 2 4-4.4" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <rect x="32" y="34" width="40" height="7" rx="3.5" fill="var(--line)" />
          </g>)}
          <text x="14" y="52" fontFamily="JetBrains Mono, ui-monospace, monospace" fontSize="7" fontWeight="700" fill="var(--mut)" letterSpacing=".08em">{s.label.toUpperCase()}</text>
        </g>
      ))}
      {/* sources -> mask gate */}
      <path d="M142 63c24 0 34 60 54 78" stroke="var(--cyan)" strokeWidth="1.5" strokeDasharray="3.5 4.5" strokeLinecap="round" markerEnd="url(#cbfHead)" />
      <path d="M142 141h54" stroke="var(--cyan)" strokeWidth="1.5" strokeDasharray="3.5 4.5" strokeLinecap="round" markerEnd="url(#cbfHead)" />
      <path d="M142 219c24 0 34 -60 54 -78" stroke="var(--cyan)" strokeWidth="1.5" strokeDasharray="3.5 4.5" strokeLinecap="round" markerEnd="url(#cbfHead)" />

      {/* MASK GATE on the device: a bar with a redacted strip */}
      <g transform="translate(206 110)">
        <rect x="0" y="0" width="86" height="62" rx="12" fill="var(--panel)" stroke="var(--amber-line)" />
        <rect x="0" y="0" width="86" height="3" rx="1.5" fill="var(--amber)" />
        <rect x="12" y="16" width="42" height="6" rx="3" fill="var(--line)" />
        <rect x="12" y="27" width="62" height="8" rx="3" fill="var(--tx)" opacity=".85" />
        <rect x="12" y="40" width="36" height="6" rx="3" fill="var(--line)" />
        <text x="43" y="56" textAnchor="middle" fontFamily="JetBrains Mono, ui-monospace, monospace" fontSize="6.4" fontWeight="700" fill="var(--amber)" letterSpacing=".06em">{a('masked').toUpperCase()}</text>
      </g>
      <path d="M294 141h30" stroke="var(--em)" strokeWidth="2" strokeLinecap="round" markerEnd="url(#cbfHeadEm)" />

      {/* THE SEALED BRAIN: shield + lock, keyed to one company */}
      <g transform="translate(330 92)">
        <rect x="0" y="0" width="100" height="100" rx="18" fill="var(--panel)" stroke="var(--em-line)" strokeWidth="1.4" />
        <rect x="0" y="0" width="100" height="3" rx="1.5" fill="url(#cbfBar)" />
        <path d="M50 16 L72 24 V45 C72 60 61 70 50 76 C39 70 28 60 28 45 V24 Z" fill="var(--em-fill)" stroke="var(--em)" strokeWidth="1.6" />
        <rect x="43" y="43" width="14" height="12" rx="3" fill="var(--em)" />
        <path d="M45.5 43v-4a4.5 4.5 0 0 1 9 0v4" stroke="var(--em)" strokeWidth="2" strokeLinecap="round" fill="none" />
        <text x="50" y="92" textAnchor="middle" fontFamily="JetBrains Mono, ui-monospace, monospace" fontSize="6.6" fontWeight="700" fill="var(--em)" letterSpacing=".08em">{a('brain').toUpperCase()}</text>
      </g>
      <path d="M432 141h30" stroke="var(--em)" strokeWidth="2" strokeLinecap="round" markerEnd="url(#cbfHeadEm)" />

      {/* THE SCREEN: a cited step */}
      <g transform="translate(466 70)">
        <rect x="0" y="0" width="82" height="146" rx="14" fill="var(--panel)" stroke="var(--line)" />
        <rect x="0" y="0" width="82" height="3" rx="1.5" fill="url(#cbfBar)" />
        <path d="M0 22h82" stroke="var(--line)" />
        <circle cx="11" cy="11" r="2.4" fill="var(--line)" /><circle cx="19" cy="11" r="2.4" fill="var(--line)" /><circle cx="27" cy="11" r="2.4" fill="var(--line)" />
        <circle cx="15" cy="40" r="6" fill="var(--em)" /><path d="M12 40.2l2 2 4-4.4" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <rect x="27" y="37" width="40" height="6" rx="3" fill="var(--line)" />
        <rect x="7" y="56" width="68" height="40" rx="9" fill="var(--em-fill)" stroke="var(--em-line)" />
        <rect x="7" y="56" width="3" height="40" rx="1.5" fill="url(#cbfBar)" />
        <circle cx="19" cy="68" r="5" fill="var(--panel)" stroke="var(--em)" strokeWidth="1.8" /><circle cx="19" cy="68" r="1.9" fill="var(--em)" />
        <rect x="28" y="65" width="40" height="6" rx="3" fill="var(--tx)" opacity=".5" />
        <rect x="16" y="78" width="52" height="5" rx="2.5" fill="var(--cyan)" opacity=".75" />
        <rect x="16" y="86" width="36" height="5" rx="2.5" fill="var(--cyan)" opacity=".45" />
        <circle cx="15" cy="112" r="6" stroke="var(--line-2)" strokeDasharray="2.5 2.5" fill="none" /><rect x="27" y="109" width="34" height="6" rx="3" fill="var(--line)" />
        <text x="41" y="136" textAnchor="middle" fontFamily="JetBrains Mono, ui-monospace, monospace" fontSize="6.2" fontWeight="700" fill="var(--mut)" letterSpacing=".06em">{a('step').toUpperCase()}</text>
      </g>

      {/* THE LOOP: clean finishes flow back to the brain */}
      <path d="M506 222c-20 40 -110 56 -200 36 -40 -9 -70 -26 -80 -40" stroke="var(--em)" strokeWidth="1.8" strokeDasharray="4 5" strokeLinecap="round" markerEnd="url(#cbfHeadEm)" />
      <text x="330" y="288" textAnchor="middle" fontFamily="Figtree, system-ui, sans-serif" fontSize="9" fontWeight="700" fill="var(--em)">{a('loop')}</text>
      <path d="M176 262l2.2 5.8 5.8 2.2-5.8 2.2-2.2 5.8-2.2-5.8-5.8-2.2 5.8-2.2z" fill="var(--cyan)" opacity=".55" />
      <path d="M540 32l1.8 4.8 4.8 1.8-4.8 1.8-1.8 4.8-1.8-4.8-4.8-1.8 4.8-1.8z" fill="var(--cta)" opacity=".7" />
    </svg>
  )
}
