import { useEffect, useState, useCallback } from 'react'
import { api } from '../api.js'
import { Plus, ChevronLeft, Send, Loader2, CheckCircle2, RotateCcw } from 'lucide-react'

// One ticket surface for BOTH sides (single source of truth):
//   mode="user"  -> my tickets, open a new one, reply in the thread
//   mode="admin" -> every ticket (superadmin), reply, set status
// A ticket: { id, username, category, subject, status, messages:[{from,by,text,at}] }

const CAT_LABEL = { feature: 'Feature request', bug: 'Report a bug', billing: 'Billing issue', access: 'Access issue', other: 'Something else' }
const STATUS_LABEL = { open: 'Open', answered: 'Answered', closed: 'Closed' }
const fmt = (s) => { try { return new Date(s).toLocaleString() } catch { return '' } }

export default function SupportTickets({ mode = 'user' }) {
  const admin = mode === 'admin'
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
    catch { setErr('Could not open that ticket.') }
  }
  const create = async () => {
    if (busy) return
    if (!form.subject.trim() && !form.body.trim()) { setErr('Add a subject and a short description.'); return }
    setBusy(true); setErr('')
    try { const t = await api.workTicketCreate(form); setForm({ category: 'feature', subject: '', body: '' }); await load(); setSel(t); setView('thread') }
    catch (e) { setErr(e.message || 'Could not create the ticket.') } finally { setBusy(false) }
  }
  const sendReply = async () => {
    const text = reply.trim(); if (!text || busy || !sel) return
    setBusy(true); setErr('')
    try {
      const t = admin ? await api.workAdminTicketReply(sel.id, text) : await api.workTicketReply(sel.id, text)
      setReply(''); setSel(t); load()
    } catch (e) { setErr(e.message || 'Could not send.') } finally { setBusy(false) }
  }
  const setStatus = async (status) => {
    if (!sel) return
    setBusy(true); setErr('')
    try { const t = await api.workAdminTicketStatus(sel.id, status); setSel(t); load() }
    catch (e) { setErr(e.message || 'Could not update.') } finally { setBusy(false) }
  }

  return (
    <div className="st">
      <style>{CSS}</style>

      {view === 'list' && (
        <>
          {!admin && (
            <div className="st-head">
              <div>
                <h2>Help &amp; Support</h2>
                <p>Request a feature, report a bug, or get help with billing or access. We respond here.</p>
              </div>
              <button className="st-btn primary" onClick={() => { setErr(''); setView('new') }}><Plus size={15} /> New ticket</button>
            </div>
          )}

          {admin && (
            <div className="st-filters">
              {['', 'open', 'answered', 'closed'].map((s) => (
                <button key={s || 'all'} className={`st-chip ${filter === s ? 'on' : ''}`} onClick={() => setFilter(s)}>
                  {s ? STATUS_LABEL[s] : 'All'}{counts && s && counts[s] != null ? ` (${counts[s]})` : ''}
                </button>
              ))}
            </div>
          )}

          {list == null ? <div className="st-empty">Loading...</div>
            : list.length === 0 ? <div className="st-empty">{admin ? 'No tickets yet.' : 'No tickets yet. Open one and we will get back to you.'}</div>
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
          <button className="st-back" onClick={() => { setErr(''); setView('list') }}><ChevronLeft size={15} /> Back</button>
          <h2>Open a ticket</h2>
          <label className="st-label">What is it about?
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {cats.map((c) => <option key={c} value={c}>{CAT_LABEL[c] || c}</option>)}
            </select>
          </label>
          <label className="st-label">Subject
            <input value={form.subject} maxLength={160} placeholder="A short summary" onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          </label>
          <label className="st-label">Details
            <textarea rows={6} value={form.body} maxLength={8000} placeholder="What do you need? Steps to reproduce a bug, the feature you want, or the billing/access problem." onChange={(e) => setForm({ ...form, body: e.target.value })} />
          </label>
          {err && <div className="st-err">{err}</div>}
          <div className="st-actions">
            <button className="st-btn" onClick={() => setView('list')}>Cancel</button>
            <button className="st-btn primary" disabled={busy} onClick={create}>{busy ? <Loader2 size={15} className="spin" /> : 'Submit ticket'}</button>
          </div>
        </div>
      )}

      {view === 'thread' && sel && (
        <div className="st-thread">
          <button className="st-back" onClick={() => { setErr(''); setSel(null); setView('list'); load() }}><ChevronLeft size={15} /> Back</button>
          <div className="st-thead">
            <span className={`st-tag c-${sel.category}`}>{CAT_LABEL[sel.category] || sel.category}</span>
            <h2>{sel.subject}</h2>
            <span className={`st-status s-${sel.status}`}>{STATUS_LABEL[sel.status] || sel.status}</span>
          </div>
          {admin && <div className="st-sub">From <b>{sel.username}</b> &middot; opened {fmt(sel.createdAt)}</div>}

          <div className="st-msgs">
            {(sel.messages || []).length === 0 && <div className="st-empty">No messages yet.</div>}
            {(sel.messages || []).map((m, i) => (
              <div key={i} className={`st-msg ${m.from === 'admin' ? 'admin' : 'user'}`}>
                <div className="st-msg-by">{m.from === 'admin' ? 'Support' : (admin ? m.by : 'You')} &middot; <span>{fmt(m.at)}</span></div>
                <div className="st-msg-text">{m.text}</div>
              </div>
            ))}
          </div>

          {sel.status !== 'closed' && (
            <div className="st-reply">
              <textarea rows={3} value={reply} placeholder={admin ? 'Write a reply to the user...' : 'Add a message...'} onChange={(e) => setReply(e.target.value)} />
              <button className="st-btn primary" disabled={busy || !reply.trim()} onClick={sendReply}>{busy ? <Loader2 size={15} className="spin" /> : <><Send size={14} /> Send</>}</button>
            </div>
          )}
          {admin && (
            <div className="st-admin-actions">
              {sel.status !== 'closed'
                ? <button className="st-btn" onClick={() => setStatus('closed')}><CheckCircle2 size={14} /> Mark resolved & close</button>
                : <button className="st-btn" onClick={() => setStatus('open')}><RotateCcw size={14} /> Reopen</button>}
            </div>
          )}
          {err && <div className="st-err">{err}</div>}
        </div>
      )}
    </div>
  )
}

const CSS = `
.st{max-width:860px;margin:0 auto}
.st h2{font-size:20px;margin:0 0 4px}
.st-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:18px}
.st-head p{color:var(--text-dim,#667);font-size:14px;margin:0;max-width:60ch}
.st-btn{display:inline-flex;align-items:center;gap:7px;background:var(--panel,#fff);border:1px solid var(--line,#e3e6ee);color:var(--text,#141726);border-radius:10px;padding:9px 15px;font:inherit;font-size:14px;font-weight:600;cursor:pointer}
.st-btn:hover{border-color:var(--text-dim,#99a)}
.st-btn.primary{background:linear-gradient(135deg,#0a9d66,#0a86cf);color:#fff;border:none}
.st-btn:disabled{opacity:.55;cursor:default}
.st-filters{display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap}
.st-chip{background:var(--panel,#fff);border:1px solid var(--line,#e3e6ee);color:var(--text-dim,#667);border-radius:999px;padding:6px 13px;font:inherit;font-size:13px;cursor:pointer}
.st-chip.on{background:var(--text,#141726);color:var(--ink,#fff);border-color:var(--text,#141726)}
.st-list{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:8px}
.st-row{width:100%;display:flex;align-items:center;gap:12px;background:var(--panel,#fff);border:1px solid var(--line,#e3e6ee);border-radius:12px;padding:13px 15px;cursor:pointer;text-align:left;font:inherit}
.st-row:hover{border-color:var(--text-dim,#99a)}
.st-subj{flex:1;font-weight:600;color:var(--text,#141726);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.st-who{color:var(--text-dim,#667);font-size:13px}
.st-when{color:var(--text-dim,#667);font-size:12px;white-space:nowrap}
.st-tag{font-size:11px;font-weight:700;padding:3px 9px;border-radius:999px;white-space:nowrap}
.c-feature{background:rgba(10,134,207,.14);color:#0a6aa8}
.c-bug{background:rgba(255,99,99,.14);color:#c0392b}
.c-billing{background:rgba(255,179,92,.18);color:#9a6400}
.c-access{background:rgba(155,120,255,.16);color:#6b46c1}
.c-other{background:rgba(120,130,150,.15);color:#596074}
.st-status{font-size:11px;font-weight:700;padding:3px 9px;border-radius:999px;white-space:nowrap}
.s-open{background:rgba(10,157,102,.15);color:#06603f}
.s-answered{background:rgba(10,134,207,.14);color:#0a6aa8}
.s-closed{background:rgba(120,130,150,.15);color:#596074}
.st-empty{color:var(--text-dim,#667);padding:26px 0;text-align:center;font-size:14px}
.st-err{color:#c0392b;font-size:13px;margin-top:12px}
.st-back{display:inline-flex;align-items:center;gap:5px;background:none;border:none;color:var(--text-dim,#667);font:inherit;font-size:13px;cursor:pointer;padding:0;margin-bottom:12px}
.st-back:hover{color:var(--text,#141726)}
.st-form,.st-thread{max-width:680px;margin:0 auto}
.st-label{display:flex;flex-direction:column;gap:6px;font-size:13px;font-weight:600;color:var(--text,#141726);margin-bottom:14px}
.st-label select,.st-label input,.st-label textarea,.st-reply textarea{background:var(--panel,#fff);border:1px solid var(--line,#e3e6ee);border-radius:10px;padding:10px 12px;color:var(--text,#141726);font:inherit;font-size:14px;font-weight:400;outline:none;resize:vertical}
.st-label select:focus,.st-label input:focus,.st-label textarea:focus,.st-reply textarea:focus{border-color:#0a86cf}
.st-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:6px}
.st-thead{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:6px}
.st-thead h2{flex:1;min-width:200px}
.st-sub{color:var(--text-dim,#667);font-size:13px;margin-bottom:14px}
.st-msgs{display:flex;flex-direction:column;gap:10px;margin:16px 0}
.st-msg{border:1px solid var(--line,#e3e6ee);border-radius:12px;padding:11px 13px;max-width:85%}
.st-msg.user{align-self:flex-start;background:var(--panel,#fff)}
.st-msg.admin{align-self:flex-end;background:linear-gradient(180deg,rgba(10,134,207,.08),transparent);border-color:rgba(10,134,207,.3)}
.st-msg-by{font-size:11px;color:var(--text-dim,#667);font-weight:700;margin-bottom:4px}
.st-msg-by span{font-weight:400}
.st-msg-text{color:var(--text,#141726);font-size:14px;line-height:1.5;white-space:pre-wrap;word-break:break-word}
.st-reply{display:flex;gap:10px;align-items:flex-end;margin-top:8px}
.st-reply textarea{flex:1}
.st-admin-actions{margin-top:12px;display:flex;gap:10px}
.spin{animation:st-spin 1s linear infinite}@keyframes st-spin{to{transform:rotate(360deg)}}
@media(max-width:560px){.st-row{flex-wrap:wrap;gap:7px}.st-who{order:3}.st-reply{flex-direction:column;align-items:stretch}}
`
