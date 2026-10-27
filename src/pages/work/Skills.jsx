// Skills page (/work/skills). SkillsCard is moved verbatim from WorkPage.jsx
// (previously an inline dashboard card reached by a scroll-to anchor). It now
// has its own route; the rail "Skills" item navigates here.
import { useState, useEffect, useCallback } from 'react'
import { Blocks, ChevronRight, ShieldCheck, Sparkles, Loader2, Plus, AlertTriangle, Trash2 } from 'lucide-react'
import { api, friendlyError } from '../../api.js'
import { cleanForStore } from '../../scrub.js'
import { useWorkApp } from './WorkAppContext.jsx'

function SkillsCard({ user }) {
  const company = !!(user && user.companyId)
  const [open, setOpen] = useState(false)
  const [skills, setSkills] = useState(null)      // null = not loaded yet
  const [scope, setScope] = useState(company ? 'company' : 'global')
  const [title, setTitle] = useState(''); const [content, setContent] = useState(''); const [tags, setTags] = useState('')
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('')
  const load = useCallback(async () => {
    try { const r = await api.workSkills(); setSkills((r && r.skills) || []); if (r && r.scope) setScope(r.scope) }
    catch (e) { setErr(friendlyError(e, 'Could not load your skills.')); setSkills([]) }
  }, [])
  useEffect(() => { if (open && skills === null) load() }, [open, skills, load])
  const add = async (e) => {
    e && e.preventDefault()
    if (!title.trim()) { setErr('Give the skill a title.'); return }
    if (content.trim().length < 20) { setErr('Paste the playbook, SOP or skill itself (a few sentences at least).'); return }
    setBusy(true); setErr('')
    try {
      // Scrub on-device before upload (same engine as session text), so raw PII/
      // secrets never leave the device. cleanForStore redacts (no dead tokens) since
      // a stored skill is never rehydrated; the server scrubs again on write.
      const r = await api.workSkillAdd({ title: cleanForStore(title.trim()), content: cleanForStore(content.trim()), tags: tags.split(',').map((t) => t.trim()).filter(Boolean) })
      if (r && r.skill) { setSkills((s) => [r.skill, ...(s || [])]); if (r.skill.scope) setScope(r.skill.scope) }
      setTitle(''); setContent(''); setTags('')
    } catch (e2) { setErr(friendlyError(e2, 'Could not add that skill.')) } finally { setBusy(false) }
  }
  const del = async (id) => {
    setErr('')
    try { await api.workSkillDelete(id); setSkills((s) => (s || []).filter((x) => x.id !== id)) }
    catch (e2) { setErr(friendlyError(e2, 'Could not remove that skill.')) }
  }
  const n = skills ? skills.length : null
  return (
    <div className="wd-card wd-dp wd-skills">
      <button type="button" className="wd-dp-btn" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span className="wd-ic alt"><Blocks size={16} /></span>
        <span className="wd-card-body">
          <span className="wd-card-t">Skills</span>
          <span className="wd-card-c">{n == null ? 'Teach it how you want work done' : n === 0 ? 'Add a playbook, SOP or skill from any AI' : `${n} ${n === 1 ? 'skill' : 'skills'} guiding your plans`}</span>
        </span>
        <ChevronRight size={16} className={`wd-dp-chev${open ? ' open' : ''}`} />
      </button>
      {open && (
        <div className="wd-dp-body wd-sk">
          <p className="wd-sk-lead">Skills teach WorkCoPilot how you (or your org) want work done, so guidance aligns with your tools, standards and terminology. Paste a playbook, an SOP, or a skill exported from any AI.</p>
          {scope === 'company'
            ? <div className="wd-sk-note private"><ShieldCheck size={14} /><span><b>Private to your company.</b> These skills guide only your company's people. They are never used to train the platform, and your admin can download or re-upload them at any time.</span></div>
            : <div className="wd-sk-note"><Sparkles size={14} /><span><b>Helps everyone.</b> Skills you add may be used in de-identified form to improve WorkCoPilot for all users; personal data is removed before it is stored. You agreed to this at sign-up. Company accounts are exempt.</span></div>}
          <form className="wd-sk-form" onSubmit={add} aria-busy={busy}>
            <input className="wd-sk-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title, for example: How we review pull requests" maxLength={120} aria-label="Skill title" />
            <textarea className="wd-sk-ta" rows={5} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Paste a playbook, SOP, or a skill from any AI. Steps, rules, tools, naming, do's and don'ts. The more specific, the better the guidance." aria-label="Skill content" />
            <div className="wd-sk-row">
              <input className="wd-sk-input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Tags, comma separated (optional)" aria-label="Tags" />
              <button type="submit" className="wd-cta wd-sk-add" disabled={busy}>{busy ? <Loader2 size={15} className="spin" /> : <Plus size={15} />} Add skill</button>
            </div>
            {err && <div className="wd-sk-err" role="alert"><AlertTriangle size={14} /> {err}</div>}
          </form>
          {skills === null ? <div className="wd-sk-empty"><Loader2 size={14} className="spin" /> Loading your skills…</div>
            : skills.length === 0 ? <div className="wd-sk-empty">No skills yet. The first one you add starts shaping your plans right away.</div>
            : (
              <ul className="wd-sk-list">
                {skills.map((s) => (
                  <li key={s.id} className="wd-sk-item">
                    <span className="wd-sk-ic"><Blocks size={14} /></span>
                    <span className="wd-sk-body">
                      <b>{s.title}</b>
                      <span className="wd-sk-meta">
                        {(s.tags || []).map((t) => <i key={t} className="wd-sk-tag">{t}</i>)}
                        {s.chars ? <span>{Number(s.chars).toLocaleString()} chars</span> : null}
                        {s.at ? <span>{(() => { try { return new Date(s.at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) } catch { return '' } })()}</span> : null}
                      </span>
                    </span>
                    <button type="button" className="wd-sk-del" onClick={() => del(s.id)} title="Remove this skill" aria-label={`Remove ${s.title}`}><Trash2 size={14} /></button>
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
  const { user } = useWorkApp()
  return (
    <section aria-label="Skills">
      <SkillsCard user={user} />
    </section>
  )
}
