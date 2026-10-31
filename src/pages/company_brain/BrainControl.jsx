// "Control and privacy": eight cards, each resting on shipped code
// (company-scoped sealed store, AES-256-GCM at rest, admin curation with a
// logged reason, private brain passphrase with timed re-lock, on-device
// masking under the company policy, executive download with an authenticator
// step-up on the hosted service, read-only API-key scope, locked means
// nothing is served). Copy: companyBrainPage.control.*; icons by position.
import { Building2, Lock, ListChecks, KeyRound, EyeOff, Download, Plug, ShieldAlert } from 'lucide-react'
import { useT } from '../../i18n/index.jsx'
import { HL } from './rich.jsx'

const ITEM_META = [
  { icon: Building2 },
  { icon: Lock, tone: 'cyan' },
  { icon: ListChecks },
  { icon: KeyRound, tone: 'cyan' },
  { icon: EyeOff, tone: 'amber' },
  { icon: Download },
  { icon: Plug, tone: 'cyan' },
  { icon: ShieldAlert, tone: 'amber' },
]

export default function BrainControl() {
  const t = useT()
  return (
    <section className="wcb-sec" id="control">
      <div className="wcb-sec-head">
        <div className="wcb-eyebrow"><Lock size={14} aria-hidden="true" /> {t('companyBrainPage.control.eyebrow')}</div>
        <h2>{t.rich('companyBrainPage.control.h2', null, HL)}</h2>
        <p className="wcb-lead">{t('companyBrainPage.control.lead')}</p>
      </div>
      <div className="wcb-grid four">
        {t('companyBrainPage.control.items').map((c, i) => {
          const m = ITEM_META[i] || ITEM_META[0]
          return (
            <div key={c.t} className={`wcb-feat${m.tone ? ` ${m.tone}` : ''}`}>
              <span className="wcb-ic"><m.icon size={18} aria-hidden="true" /></span>
              <b>{c.t}</b>
              <p>{c.d}</p>
            </div>
          )
        })}
      </div>
    </section>
  )
}
