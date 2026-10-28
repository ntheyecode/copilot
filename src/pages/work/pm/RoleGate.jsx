// UX gate for an enterprise page: when the signed-in user's role (ONE
// derivation, roleViewOf in src/shared/work_roles_options.js) does not include
// this surface, render a calm "not part of your role" card with the way back
// instead of a blank page or a server error. The server enforces the real
// permission on every route; this only decides what the UI shows.
import { Link } from 'react-router-dom'
import { ShieldCheck, ArrowRight } from 'lucide-react'
import { useT } from '../../../i18n/index.jsx'

export default function RoleGate({ allowed, children }) {
  const t = useT()
  if (allowed) return children
  return (
    <div className="wd-card wd-pj-gate" role="status">
      <span className="wd-ic neutral"><ShieldCheck size={18} /></span>
      <div className="wd-pj-gate-body">
        <h3>{t('workPm.common.notPermittedTitle')}</h3>
        <p>{t('workPm.common.notPermittedBody')}</p>
        <div className="wd-pj-gate-acts">
          <Link className="wd-pj-btn" to="/work">{t('workPm.common.backHome')} <ArrowRight size={13} /></Link>
        </div>
      </div>
    </div>
  )
}

// Shared load-error card (connection hiccup, with Retry) and the denied card
// for data the server refused (403), so every page answers the same way.
export function LoadError({ title, denied, onRetry }) {
  const t = useT()
  return (
    <div className="wd-empty" role="alert">
      <span className="ic"><ShieldCheck size={18} /></span>
      <div><b>{title}</b><p>{denied ? t('workPm.common.notPermittedBody') : <>{t('workPm.common.loadErr')} <button type="button" className="wd-link" style={{ background: 'none', border: 0, padding: 0, font: 'inherit', cursor: 'pointer' }} onClick={onRetry}>{t('workPm.common.retry')}</button></>}</p></div>
    </div>
  )
}
