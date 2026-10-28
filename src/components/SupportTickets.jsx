import { useEffect, useState, useCallback } from 'react'
import { api } from '../api.js'
import { workAdminApi } from '../pages/workadmin/workAdminApi.js'
import { ReasonModal } from '../pages/workadmin/sections/_shared.jsx'
import { Plus, ChevronLeft, Send, Loader2, CheckCircle2, RotateCcw, Trash2 } from 'lucide-react'
import { useT } from '../i18n/index.jsx'

// One ticket surface for BOTH sides (single source of truth):
//   mode="user"  -> my tickets, open a new one, reply in the thread
//   mode="admin" -> every ticket (superadmin), reply, set status
// A ticket: { id, username, category, subject, status, messages:[{from,by,text,at}] }

const fmt = (s) => { try { return new Date(s).toLocaleString() } catch { return '' } }

export default function SupportTickets({ mode = 'user' }) {
  const admin = mode === 'admin'
  const t = useT()
  // Display labels keyed by stored category/status codes (codes are NOT localized).
  const CAT_LABEL = { feature: t('supportTickets.cat.feature'), bug: t('supportTickets.cat.bug'), billing: t('supportTickets.cat.billing'), access: t('supportTickets.cat.access'), other: t('supportTickets.cat.other') }
  const STATUS_LABEL = { open: t('supportTickets.status.open'), answered: t('supportTickets.status.answered'), closed: t('supportTickets.status.closed') }
  const [list, setList] = useState(null)
  const [counts, setCounts] = useState(null)
  const [cats, setCats] = useState(['feature', 'bug', 'billing', 'access', 'other'])
  const [filter, setFilter] = useState('')
  const [view, setView] = useState('list')          // list | new | thread
  const [sel, setSel] = useState(null)
  const [form, setForm] = useState({ category: 'feature', subject: '', body: '' })
  const [reply, setReply] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [delOpen, setDelOpen] = useState(false)
  const [delBusy, setDelBusy] = useState(false)
  const [delErr, setDelErr] = useState(null)

  const load = useCallback(() => {
    if (admin) {
      api.workAdminTickets(filter ? { status: filter } : {}).then((r) => { setList(r.tickets || []); setCounts(r.counts || null); if (r.categories) setCats(r.categories) }).catch(() => setList([]))
    } else {
      api.workTickets().then((r) => setList(r.tickets || [])).catch(() => setList([]))
    }
  }, [admin, filter])
  useEffect(() => { load() }, [load])
  useEffect(() => { if (!admin) api.workTicketCategories().then((r) => r.categories && setCats(r.categories)).catch(() => {}) }, [admin])

  const open = async (id) => {
    setErr('')
    try { const t = await (admin ? api.workAdminTicketGet(id) : api.workTicketGet(id)); setSel(t); setView('thread') }
    catch { setErr(t('supportTickets.errors.open')) }
  }
  const create = async () => {
    if (busy) return
    if (!form.subject.trim() && !form.body.trim()) { setErr(t('supportTickets.errors.needSubject')); return }
    setBusy(true); setErr('')
    try { const t = await api.workTicketCreate(form); setForm({ category: 'feature', subject: '', body: '' }); await load(); setSel(t); setView('thread') }
    catch (e) { setErr(e.message || t('supportTickets.errors.create')) } finally { setBusy(false) }
  }
  const sendReply = async () => {
    const text = reply.trim(); if (!text || busy || !sel) return
    setBusy(true); setErr('')
    try {
      const t = admin ? await api.workAdminTicketReply(sel.id, text) : await api.workTicketReply(sel.id, text)
      setReply(''); setSel(t); load()
    } catch (e) { setErr(e.message || t('supportTickets.errors.send')) } finally { setBusy(false) }
  }
  const setStatus = async (status) => {
    if (!sel) return
    setBusy(true); setErr('')
    try { const t = await api.workAdminTicketStatus(sel.id, status); setSel(t); load() }
    catch (e) { setErr(e.message || t('supportTickets.errors.update')) } finally { setBusy(false) }
  }
  // Admin: permanently delete a ticket. Reason required + logged server-side.
  const deleteTicket = async (reason) => {
    if (!sel) return
    setDelBusy(true); setDelErr(null)
    try { await workAdminApi.deleteTicket(sel.id, reason); setDelOpen(false); setSel(null); setView('list'); load() }
    catch (e) { setDelErr(e) } finally { setDelBusy(false) }
  }

  return (
    <div className="st">
      <style>{CSS}</style>

      {view === 'list' && (
        <>
          {!admin && (
            <div className="st-head">
              <div>
                <h2>{t('supportTickets.head.title')}</h2>
                <p>{t('supportTickets.head.blurb')}</p>
              </div>
              <button className="st-btn primary" onClick={() => { setErr(''); setView('new') }}><Plus size={15} /> {t('supportTickets.head.newTicket')}</button>
            </div>
          )}

          {admin && (
            <div className="st-filters">
              {['', 'open', 'answered', 'closed'].map((s) => (
                <button key={s || 'all'} className={`st-chip ${filter === s ? 'on' : ''}`} onClick={() => setFilter(s)}>
                  {s ? STATUS_LABEL[s] : t('supportTickets.filters.all')}{counts && s && counts[s] != null ? ` (${counts[s]})` : ''}
                </button>
              ))}
            </div>
          )}

          {list == null ? <div className="st-empty">{t('supportTickets.loading')}</div>
            : list.length === 0 ? <div className="st-empty">{admin ? t('supportTickets.emptyAdmin') : t('supportTickets.emptyUser')}</div>
              : (
                <ul className="st-list">
                  {list.map((t) => (
                    <li key={t.id}>
                      <button className="st-row" onClick={() => open(t.id)}>
                        <span className={`st-tag c-${t.category}`}>{CAT_LABEL[t.category] || t.category}</span>
                        <span className="st-subj">{t.subject}</span>
                        {admin && <span className="st-who">{t.username}</span>}
                        <span className={`st-status s-${t.status}`}>{STATUS_LABEL[t.status] || t.status}</span>
                        <span className="st-when">{fmt(t.updatedAt)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
          {err && <div className="st-err">{err}</div>}
        </>
      )}

      {view === 'new' && !admin && (
        <div className="st-form">
          <button className="st-back" onClick={() => { setErr(''); setView('list') }}><ChevronLeft size={15} /> {t('supportTickets.back')}</button>
          <h2>{t('supportTickets.form.title')}</h2>
          <label className="st-label">{t('supportTickets.form.aboutLabel')}
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {cats.map((c) => <option key={c} value={c}>{CAT_LABEL[c] || c}</option>)}
            </select>
          </label>
          <label className="st-label">{t('supportTickets.form.subjectLabel')}
            <input value={form.subject} maxLength={160} placeholder={t('supportTickets.form.subjectPlaceholder')} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          </label>
          <label className="st-label">{t('supportTickets.form.detailsLabel')}
            <textarea rows={6} value={form.body} maxLength={8000} placeholder={t('supportTickets.form.detailsPlaceholder')} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          </label>
          {err && <div className="st-err">{err}</div>}
          <div className="st-actions">
            <button className="st-btn" onClick={() => setView('list')}>{t('supportTickets.form.cancel')}</button>
            <button className="st-btn primary" disabled={busy} onClick={create}>{busy ? <Loader2 size={15} className="spin" /> : t('supportTickets.form.submit')}</button>
          </div>
        </div>
      )}

      {view === 'thread' && sel && (
        <div className="st-thread">
          <button className="st-back" onClick={() => { setErr(''); setSel(null); setView('list'); load() }}><ChevronLeft size={15} /> {t('supportTickets.back')}</button>
          <div className="st-thead">
            <span className={`st-tag c-${sel.category}`}>{CAT_LABEL[sel.category] || sel.category}</span>
            <h2>{sel.subject}</h2>
            <span className={`st-status s-${sel.status}`}>{STATUS_LABEL[sel.status] || sel.status}</span>
          </div>
          {admin && <div className="st-sub">{t.rich('supportTickets.thread.fromOpened', { username: sel.username, date: fmt(sel.createdAt) })}</div>}

          <div className="st-msgs">
            {(sel.messages || []).length === 0 && <div className="st-empty">{t('supportTickets.thread.noMessages')}</div>}
            {(sel.messages || []).map((m, i) => (
              <div key={i} className={`st-msg ${m.from === 'admin' ? 'admin' : 'user'}`}>
                <div className="st-msg-by">{m.from === 'admin' ? t('supportTickets.thread.support') : (admin ? m.by : t('supportTickets.thread.you'))} &middot; <span>{fmt(m.at)}</span></div>
                <div className="st-msg-text">{m.text}</div>
              </div>
            ))}
          </div>

          {sel.status !== 'closed' && (
            <div className="st-reply">
              <textarea rows={3} value={reply} placeholder={admin ? t('supportTickets.thread.replyPlaceholderAdmin') : t('supportTickets.thread.replyPlaceholderUser')} onChange={(e) => setReply(e.target.value)} />
              <button className="st-btn primary" disabled={busy || !reply.trim()} onClick={sendReply}>{busy ? <Loader2 size={15} className="spin" /> : <><Send size={14} /> {t('supportTickets.thread.send')}</>}</button>
            </div>
          )}
          {admin && (
            <div className="st-admin-actions">
              {sel.status !== 'closed'
                ? <button className="st-btn" onClick={() => setStatus('closed')}><CheckCircle2 size={14} /> {t('supportTickets.thread.close')}</button>
                : <button className="st-btn" onClick={() => setStatus('open')}><RotateCcw size={14} /> {t('supportTickets.thread.reopen')}</button>}
              <button className="st-btn danger" onClick={() => { setDelErr(null); setDelOpen(true) }}><Trash2 size={14} /> {t('supportTickets.thread.delete')}</button>
            </div>
          )}
          {err && <div className="st-err">{err}</div>}
          {delOpen && (
            <ReasonModal
              title={t('supportTickets.del.title')}
              message={t('supportTickets.del.message')}
              confirmLabel={t('supportTickets.del.confirm')}
              busy={delBusy} error={delErr}
              onConfirm={deleteTicket}
              onCancel={() => { if (!delBusy) setDelOpen(false) }}
            />
          )}
        </div>
      )}
    </div>
  )
}

// Styles. The component mounts in two hosts: the signed-in app (/work/support,
// under .wd) and the superadmin console (under .wka). Every color, radius and
// shadow resolves through ONE chain at the root: the .wd design token first,
// then the admin console's token, then a last-resort literal, so the same
// markup is themed (Light / Dark / Heavy) wherever it mounts and no rule
// below carries a literal of its own. Card language: white hairline rows,
// tinted borderless chips (blue = information, amber = billing, violet =
// access, neutral = other; green = open), the one filled button on the
// brand's white-text-safe shade.
const CSS = `
.st{
  --st-panel:var(--panel,var(--wka-panel,#fff));--st-panel-2:var(--panel-3,var(--wka-panel-2,#f3f5f9));
  --st-line:var(--line-soft,var(--wka-line,#eef0f5));--st-line-2:var(--line,var(--wka-line-2,#e6e9f0));
  --st-tx:var(--tx,var(--wka-text,#1a1f33));--st-mut:var(--mut,var(--wka-muted,#5f6887));
  --st-solid:var(--em-solid,var(--wka-accent,#0c865c));--st-on-solid:var(--on-solid,#fff);--st-focus:var(--em,var(--wka-accent,#0e9f6e));--st-ring:var(--em-fill,var(--wka-accent-soft,rgba(14,159,110,.10)));
  --st-danger:var(--danger,var(--wka-red,#d93a4d));
  --st-green:var(--tint-green,var(--wka-accent-soft,rgba(14,159,110,.12)));--st-green-ink:var(--tint-green-ink,var(--wka-accent-ink,#0b825a));
  --st-blue:var(--tint-blue,rgba(10,111,179,.12));--st-blue-ink:var(--tint-blue-ink,#085b93);
  --st-amber:var(--tint-amber,#fdf4e7);--st-amber-ink:var(--tint-amber-ink,#9a4a07);
  --st-violet:var(--tint-violet,#f1edfc);--st-violet-ink:var(--tint-violet-ink,#5b3fc4);
  --st-neutral:var(--tint-neutral,#f1f3f8);--st-neutral-ink:var(--tint-neutral-ink,#454c6a);
  --st-r:var(--r,12px);--st-r-sm:var(--r-sm,10px);--st-pill:var(--r-pill,999px);--st-fs:var(--wc-fs,1);
  --st-display:var(--wd-display,"Bricolage Grotesque","Figtree",system-ui,sans-serif);
  max-width:860px;margin:0 auto;color:var(--st-tx)}
.st h2{font-family:var(--st-display);font-size:calc(18px*var(--st-fs));font-weight:700;letter-spacing:-.01em;margin:0 0 4px;color:var(--st-tx)}
.st-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px 16px;margin-bottom:18px;flex-wrap:wrap}
.st-head>div{min-width:0;flex:1 1 280px}
.st-head p{color:var(--st-mut);font-size:calc(13.5px*var(--st-fs));margin:0;max-width:60ch;line-height:1.5}
.st-btn{display:inline-flex;align-items:center;gap:7px;flex-shrink:0;white-space:nowrap;height:36px;background:var(--st-panel);border:1px solid var(--st-line-2);color:var(--st-tx);border-radius:var(--st-pill);padding:0 15px;font:inherit;font-size:calc(13.5px*var(--st-fs));font-weight:600;cursor:pointer;transition:background .15s,border-color .15s,color .15s}
.st-btn:hover:not(:disabled){background:var(--st-panel-2)}
.st-btn.primary{background:var(--st-solid);color:var(--st-on-solid);border-color:var(--st-solid)}
.st-btn.primary:hover:not(:disabled){filter:brightness(1.06);background:var(--st-solid)}
.st-btn.danger{color:var(--st-danger)}
.st-btn:disabled{opacity:.55;cursor:default}
.st-filters{display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap}
.st-chip{background:var(--st-panel);border:1px solid var(--st-line-2);color:var(--st-mut);border-radius:var(--st-pill);padding:6px 13px;font:inherit;font-size:calc(13px*var(--st-fs));font-weight:600;cursor:pointer;white-space:nowrap}
.st-chip.on{background:var(--st-green);color:var(--st-green-ink);border-color:transparent}
.st-list{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:8px}
.st-row{width:100%;display:flex;align-items:center;gap:12px;min-width:0;background:var(--st-panel);border:1px solid var(--st-line);border-radius:var(--st-r);padding:13px 15px;cursor:pointer;text-align:left;font:inherit;color:inherit;transition:border-color .15s}
.st-row:hover{border-color:var(--st-line-2)}
.st-subj{flex:1 1 160px;min-width:0;font-weight:600;color:var(--st-tx);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:calc(14px*var(--st-fs))}
.st-who{color:var(--st-mut);font-size:calc(13px*var(--st-fs));white-space:nowrap}
.st-when{color:var(--st-mut);font-size:calc(12px*var(--st-fs));white-space:nowrap;flex-shrink:0}
.st-tag,.st-status{display:inline-flex;align-items:center;height:22px;font-size:calc(11.5px*var(--st-fs));font-weight:600;padding:0 9px;border-radius:var(--st-pill);white-space:nowrap;flex-shrink:0;line-height:1}
.c-feature{background:var(--st-blue);color:var(--st-blue-ink)}
.c-bug{background:var(--st-amber);color:var(--st-amber-ink)}
.c-billing{background:var(--st-amber);color:var(--st-amber-ink)}
.c-access{background:var(--st-violet);color:var(--st-violet-ink)}
.c-other{background:var(--st-neutral);color:var(--st-neutral-ink)}
.s-open{background:var(--st-green);color:var(--st-green-ink)}
.s-answered{background:var(--st-blue);color:var(--st-blue-ink)}
.s-closed{background:var(--st-neutral);color:var(--st-neutral-ink)}
.st-empty{color:var(--st-mut);padding:26px 0;text-align:center;font-size:calc(14px*var(--st-fs))}
.st-err{color:var(--st-danger);font-size:calc(13px*var(--st-fs));margin-top:12px}
.st-back{display:inline-flex;align-items:center;gap:5px;background:none;border:none;color:var(--st-mut);font:inherit;font-size:calc(13px*var(--st-fs));font-weight:600;cursor:pointer;padding:0;margin-bottom:12px;white-space:nowrap}
.st-back:hover{color:var(--st-tx)}
.st-form,.st-thread{max-width:680px;margin:0 auto}
.st-label{display:flex;flex-direction:column;gap:6px;font-size:calc(13px*var(--st-fs));font-weight:600;color:var(--st-tx);margin-bottom:14px}
.st-label select,.st-label input,.st-label textarea,.st-reply textarea{background:var(--st-panel);border:1px solid var(--st-line-2);border-radius:var(--st-r-sm);padding:10px 12px;color:var(--st-tx);font:inherit;font-size:calc(14px*var(--st-fs));font-weight:400;outline:none;resize:vertical;min-width:0;max-width:100%}
.st-label select:focus,.st-label input:focus,.st-label textarea:focus,.st-reply textarea:focus{border-color:var(--st-focus);box-shadow:0 0 0 3px var(--st-ring)}
.st-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:6px;flex-wrap:wrap}
.st-thead{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:6px}
.st-thead h2{flex:1;min-width:200px;overflow-wrap:anywhere}
.st-sub{color:var(--st-mut);font-size:calc(13px*var(--st-fs));margin-bottom:14px}
.st-msgs{display:flex;flex-direction:column;gap:10px;margin:16px 0}
.st-msg{border:1px solid transparent;border-radius:var(--st-r);padding:11px 13px;max-width:85%;min-width:0}
.st-msg.user{align-self:flex-start;background:var(--st-neutral)}
.st-msg.admin{align-self:flex-end;background:var(--st-blue)}
.st-msg-by{font-size:calc(11.5px*var(--st-fs));color:var(--st-mut);font-weight:700;margin-bottom:4px}
.st-msg-by span{font-weight:400}
.st-msg-text{color:var(--st-tx);font-size:calc(14px*var(--st-fs));line-height:1.5;white-space:pre-wrap;word-break:break-word}
.st-reply{display:flex;gap:10px;align-items:flex-end;margin-top:8px;min-width:0}
.st-reply textarea{flex:1 1 auto;min-width:0}
.st-admin-actions{margin-top:12px;display:flex;gap:10px;flex-wrap:wrap}
.spin{animation:st-spin 1s linear infinite}@keyframes st-spin{to{transform:rotate(360deg)}}
@media(max-width:560px){.st-row{flex-wrap:wrap;gap:7px}.st-who{order:3}.st-reply{flex-direction:column;align-items:stretch}}
@media(prefers-reduced-motion:reduce){.st-btn,.st-row{transition:none}}
`
