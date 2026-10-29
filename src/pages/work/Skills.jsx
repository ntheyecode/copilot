// Skills page (/work/skills). SkillsCard is moved verbatim from WorkPage.jsx
// (previously an inline dashboard card reached by a scroll-to anchor). It now
// has its own route; the rail "Skills" item navigates here.
// i18n: every visible string, placeholder, title and aria-label reads from the
// `skillsPage` namespace (src/i18n/locales/en/skillsPage.js).
import { useState, useEffect, useCallback } from 'react'
import { Blocks, ChevronRight, ShieldCheck, Sparkles, Loader2, Plus, AlertTriangle, Trash2 } from 'lucide-react'
import { api, friendlyError } from '../../api.js'
import { cleanForStore } from '../../scrub.js'
import { useWorkApp } from './WorkAppContext.jsx'
import { useT } from '../../i18n/index.jsx'

function SkillsCard({ user }) {
  const t = useT()
  const company = !!(user && user.companyId)
  const [open, setOpen] = useState(false)
  const [skills, setSkills] = useState(null)      // null = not loaded yet
  const [scope, setScope] = useState(company ? 'company' : 'global')
  const [title, setTitle] = useState(''); const [content, setContent] = useState(''); const [tags, setTags] = useState('')
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('')
  const load = useCallback(async () => {
    try { const r = await api.workSkills(); setSkills((r && r.skills) || []); if (r && r.scope) setScope(r.scope) }
    catch (e) { setErr(friendlyError(e, t('skillsPage.errors.load'))); setSkills([]) }
  }, [t])
  useEffect(() => { if (open && skills === null) load() }, [open, skills, load])
  const add = async (e) => {
    e && e.preventDefault()
    if (!title.trim()) { setErr(t('skillsPage.errors.needTitle')); return }
    if (content.trim().length < 20) { setErr(t('skillsPage.errors.needContent')); return }
    setBusy(true); setErr('')
    try {
      // Scrub on-device before upload (same engine as session text), so raw PII/
      // secrets never leave the device. cleanForStore redacts (no dead tokens) since
      // a stored skill is never rehydrated; the server scrubs again on write.
      const r = await api.workSkillAdd({ title: cleanForStore(title.trim()), content: cleanForStore(content.trim()), tags: tags.split(',').map((x) => x.trim()).filter(Boolean) })
      if (r && r.skill) { setSkills((s) => [r.skill, ...(s || [])]); if (r.skill.scope) setScope(r.skill.scope) }
      setTitle(''); setContent(''); setTags('')
    } catch (e2) { setErr(friendlyError(e2, t('skillsPage.errors.add'))) } finally { setBusy(false) }
  }
  const del = async (id) => {
    setErr('')
    try { await api.workSkillDelete(id); setSkills((s) => (s || []).filter((x) => x.id !== id)) }
    catch (e2) { setErr(friendlyError(e2, t('skillsPage.errors.remove'))) }
  }
  const n = skills ? skills.length : null
  const subtitle = n == null ? t('skillsPage.subtitle.notLoaded') : n === 0 ? t('skillsPage.subtitle.empty') : t.n('skillsPage.subtitle.count', n)
  return (
    <div className="wd-card wd-dp wd-skills">
      {/* The disclosure control carries an explicit accessible name (title +
          status) so it never reads as an unnamed button to assistive tech. */}
      <button type="button" className="wd-dp-btn" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-controls="wd-skills-body" aria-label={t('skillsPage.toggleAria', { subtitle })}>
        <span className="wd-ic alt"><Blocks size={16} /></span>
        <span className="wd-card-body">
          <span className="wd-card-t">{t('skillsPage.title')}</span>
          <span className="wd-card-c">{subtitle}</span>
        </span>
        <ChevronRight size={16} className={`wd-dp-chev${open ? ' open' : ''}`} />
      </button>
      {open && (
        <div className="wd-dp-body wd-sk" id="wd-skills-body">
          <p className="wd-sk-lead">{t('skillsPage.lead')}</p>
          {scope === 'company'
            ? <div className="wd-sk-note private"><ShieldCheck size={14} /><span>{t.rich('skillsPage.note.company')}</span></div>
            : <div className="wd-sk-note"><Sparkles size={14} /><span>{t.rich('skillsPage.note.global')}</span></div>}
          <form className="wd-sk-form" onSubmit={add} aria-busy={busy}>
            <input className="wd-sk-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('skillsPage.form.titlePlaceholder')} maxLength={120} aria-label={t('skillsPage.form.titleAria')} />
            <textarea className="wd-sk-ta" rows={5} value={content} onChange={(e) => setContent(e.target.value)} placeholder={t('skillsPage.form.contentPlaceholder')} aria-label={t('skillsPage.form.contentAria')} />
            <div className="wd-sk-row">
              <input className="wd-sk-input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder={t('skillsPage.form.tagsPlaceholder')} aria-label={t('skillsPage.form.tagsAria')} />
              <button type="submit" className="wd-cta wd-sk-add" disabled={busy}>{busy ? <Loader2 size={15} className="spin" /> : <Plus size={15} />} {t('skillsPage.form.add')}</button>
            </div>
            {err && <div className="wd-sk-err" role="alert"><AlertTriangle size={14} /> {err}</div>}
          </form>
          {skills === null ? <div className="wd-sk-empty"><Loader2 size={14} className="spin" /> {t('skillsPage.loading')}</div>
            : skills.length === 0 ? <div className="wd-sk-empty">{t('skillsPage.emptyList')}</div>
            : (
              <ul className="wd-sk-list">
                {skills.map((s) => (
                  <li key={s.id} className="wd-sk-item">
                    <span className="wd-sk-ic"><Blocks size={14} /></span>
                    <span className="wd-sk-body">
                      <b>{s.title}</b>
                      <span className="wd-sk-meta">
                        {(s.tags || []).map((tag) => <i key={tag} className="wd-sk-tag">{tag}</i>)}
                        {s.chars ? <span>{t('skillsPage.item.chars', { n: Number(s.chars).toLocaleString() })}</span> : null}
                        {s.at ? <span>{(() => { try { return new Date(s.at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) } catch { return '' } })()}</span> : null}
                      </span>
                    </span>
                    <button type="button" className="wd-sk-del" onClick={() => del(s.id)} title={t('skillsPage.item.removeTitle')} aria-label={t('skillsPage.item.removeAria', { title: s.title })}><Trash2 size={14} /></button>
                  </li>
                ))}
              </ul>
            )}
        </div>
      )}
    </div>
  )
}


// Route entry: the signed-in user's skills, inside the app shell.
export default function Skills() {
  const t = useT()
  const { user } = useWorkApp()
  return (
    <section aria-label={t('skillsPage.sectionAria')}>
      <SkillsCard user={user} />
    </section>
  )
}
