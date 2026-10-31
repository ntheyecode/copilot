// The individuals site footer: the brand line, three link groups (explore,
// your account, legal) and the help column. The legal pages are the SHARED
// ones (owner decision: kept as they are), so their labels come from the
// shared footer.* keys and the links point at the existing routes; nothing
// company-only (Enterprise, DPA) is linked here. Rendered by SiteFooter on
// every public page when the edition has `individual_site`.
import { ArrowUpRight, Mail } from 'lucide-react'
import AdmireVedaLogo from '../../components/AdmireVedaLogo.jsx'
import { SUPPORT_CONTACT } from '../../components/LegalPage.jsx'
import { useT } from '../../i18n/index.jsx'
import { openPreferences } from '../../consent.js'
import { INDIV_LINKS, SIGN_IN, START } from './IndivHeader.jsx'

const LEGAL = [
  ['footer.privacy', '/workcopilot/privacy'], ['footer.terms', '/workcopilot/terms'], ['footer.refund', '/workcopilot/refund'],
  ['footer.aup', '/workcopilot/acceptable-use'], ['footer.cookiePolicy', '/workcopilot/cookie-policy'], ['footer.subprocessors', '/workcopilot/subprocessors'],
  ['footer.disclaimer', '/workcopilot/disclaimer'], ['footer.accessibility', '/workcopilot/accessibility'],
]

export default function IndivFooter() {
  const t = useT()
  return (
    <footer className="ivf" aria-label={t('indiv.footer.aria')}>
      <style>{CSS}</style>
      <div className="ivf-in">
        <div className="ivf-brand">
          <a href="/" aria-label={t('indiv.nav.home')}><AdmireVedaLogo size={26} idSuffix="ivf" onDark /></a>
          <p>{t('indiv.footer.tag')}</p>
          <div className="ivf-ctas">
            <a className="ivf-btn" href={START}>{t('indiv.nav.start')} <ArrowUpRight size={14} aria-hidden="true" className="iv-arrow" /></a>
            <a className="ivf-btn alt" href={SIGN_IN}>{t('indiv.nav.signIn')}</a>
          </div>
        </div>
        <nav className="ivf-group" aria-label={t('indiv.footer.explore')}>
          <div className="ivf-k">{t('indiv.footer.explore')}</div>
          <ul>
            {INDIV_LINKS.map((l) => <li key={l.href}><a href={l.href}>{t('indiv.nav.' + l.key)}</a></li>)}
            <li><a href="/demo">{t('indiv.footer.demo')}</a></li>
            <li><a href="/workcopilot/fields">{t('indiv.footer.fields')}</a></li>
          </ul>
        </nav>
        <nav className="ivf-group" aria-label={t('indiv.footer.legal')}>
          <div className="ivf-k">{t('indiv.footer.legal')}</div>
          <ul>{LEGAL.map(([k, href]) => <li key={href}><a href={href}>{t(k)}</a></li>)}</ul>
        </nav>
        <div className="ivf-group" aria-label={t('indiv.footer.help')}>
          <div className="ivf-k">{t('indiv.footer.help')}</div>
          <ul>
            <li><a href="/workcopilot/contact">{t('indiv.footer.contact')}</a></li>
            <li><a href={'mailto:' + SUPPORT_CONTACT} dir="ltr"><Mail size={12} aria-hidden="true" /> {SUPPORT_CONTACT}</a></li>
            <li><a href="/workcopilot/faq">{t('indiv.nav.faq')}</a></li>
          </ul>
          <p className="ivf-note">{t('indiv.footer.note')}</p>
        </div>
      </div>
      <div className="ivf-bottom">
        <span>&copy; {new Date().getFullYear()} AdmireVeda. {t('indiv.footer.made')}</span>
        <button type="button" className="ivf-cookie" onClick={openPreferences}>{t('indiv.footer.cookiePrefs')}</button>
      </div>
    </footer>
  )
}

const CSS = `
.ivf{--f-bg:#0f131c;--f-tx:#eef0f6;--f-mut:#a7aec0;--f-line:rgba(255,255,255,.1);--f-mint:#8cf5c4;--f-sky:#39d3ff;
  position:relative;margin-top:auto;background:radial-gradient(900px 260px at 50% -40px,rgba(14,159,110,.18),transparent 70%),var(--f-bg);color:var(--f-tx);font-family:var(--iv-body,"Figtree",system-ui,sans-serif);text-align:start}
.ivf::before{content:"";position:absolute;left:0;right:0;top:0;height:3px;background:linear-gradient(90deg,#0e9f6e 0%,#0a84c2 55%,#f26a43 100%)}
.ivf *{box-sizing:border-box}
.ivf a{color:inherit;text-decoration:none}
.ivf-in{max-width:1160px;margin:0 auto;padding:48px 24px 26px;display:grid;grid-template-columns:minmax(0,1.6fr) repeat(3,minmax(0,1fr));gap:28px}
.ivf-brand{display:flex;flex-direction:column;gap:14px;align-items:flex-start;min-width:0}
.ivf-brand p{margin:0;font-size:14px;line-height:1.55;color:var(--f-mut);max-width:38ch}
.ivf-ctas{display:flex;gap:8px;flex-wrap:wrap}
.ivf-btn{display:inline-flex;align-items:center;gap:6px;height:38px;padding:0 15px;border-radius:11px;font-size:13.5px;font-weight:800;background:linear-gradient(135deg,#ffb561,#ff7a59);color:#241206;white-space:nowrap}
.ivf-btn.alt{background:rgba(255,255,255,.05);color:var(--f-tx);border:1px solid rgba(255,255,255,.16)}
.ivf-k{font-family:var(--iv-display,"Bricolage Grotesque",sans-serif);font-size:12px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--f-mint);margin-bottom:12px}
.ivf-group ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
.ivf-group a{display:inline-flex;align-items:center;gap:6px;font-size:13.5px;color:var(--f-mut);transition:color .15s;overflow-wrap:anywhere}
.ivf-group a:hover{color:var(--f-tx)}
.ivf-group a[href^="mailto:"]{overflow-wrap:normal}
.ivf-note{margin:14px 0 0;font-size:12.5px;line-height:1.5;color:var(--f-mut)}
.ivf a:focus-visible,.ivf button:focus-visible{outline:3px solid var(--f-sky);outline-offset:3px;border-radius:6px}
.ivf-bottom{max-width:1160px;margin:0 auto;padding:16px 24px 28px;border-top:1px solid var(--f-line);display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;font-size:12.5px;color:var(--f-mut)}
.ivf-cookie{flex-shrink:0;white-space:nowrap;background:none;border:0;padding:0;font:inherit;font-size:12.5px;font-weight:600;color:var(--f-sky);cursor:pointer}
.ivf-cookie:hover{text-decoration:underline}
@media (max-width:980px){.ivf-in{grid-template-columns:1fr 1fr 1fr}.ivf-brand{grid-column:1 / -1}}
@media (max-width:640px){.ivf-in{grid-template-columns:1fr 1fr;gap:22px;padding:34px 16px 20px}.ivf-group:last-child{grid-column:1 / -1}.ivf-bottom{flex-direction:column;align-items:flex-start;gap:6px;padding:14px 16px 24px}}
`
