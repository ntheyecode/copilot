// A company member who opens /work/brain: their workplace keeps its own
// brain (the server answers 403 COMPANY_ACCOUNT here), so the page says where
// documents go instead and offers the way back. Strings: brainPage.company.*.
import { Link } from 'react-router-dom'
import { Building2, ArrowLeft } from 'lucide-react'
import { useT } from '../../../i18n/index.jsx'

export default function CompanyNotice() {
  const t = useT()
  return (
    <div className="wd-brain-company" role="status" data-testid="brain-company">
      <span className="wd-ic neutral"><Building2 size={17} /></span>
      <div>
        <span className="wd-brain-company-t">{t('brainPage.company.title')}</span>
        <p>{t('brainPage.company.body')}</p>
        <Link to="/work"><ArrowLeft size={14} /> {t('brainPage.company.back')}</Link>
      </div>
    </div>
  )
}
