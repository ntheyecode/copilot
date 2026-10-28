// Not entitled to projects (regular plan / company pool without Deep): the
// clean "Large projects for Premium and company users" prompt with the one
// action that resolves it (See Premium plans for an individual who can upgrade,
// "ask your administrator" for a company member) and the single-task path, so
// this moment is never a dead end (spec sec 8).
import { Link } from 'react-router-dom'
import { Sparkles, ArrowRight, Play } from 'lucide-react'
import { useT } from '../../../i18n/index.jsx'

export default function ProjectsGate({ canUpgrade, upgradeHref, isCompanyMember }) {
  const t = useT()
  return (
    <div className="wd-card tint-green wd-pj-gate" role="status">
      <span className="wd-ic"><Sparkles size={18} /></span>
      <div className="wd-pj-gate-body">
        <h3>{t('workProjects.gate.title')}</h3>
        <p>{t('workProjects.gate.body')}</p>
        {isCompanyMember && !canUpgrade && <p className="gap">{t('workProjects.gate.company')}</p>}
        <div className="wd-pj-gate-acts">
          {canUpgrade && <a className="wd-pj-btn primary" href={upgradeHref || '/workcopilot/pricing'}><Sparkles size={14} /> {t('workProjects.gate.upgrade')}</a>}
          <Link className="wd-pj-btn" to="/work/start"><Play size={14} /> {t('workProjects.gate.startTask')} <ArrowRight size={13} /></Link>
        </div>
      </div>
    </div>
  )
}
