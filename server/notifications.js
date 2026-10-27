// Generic in-app notification inbox (one list per recipient: a work-user id, or a
// named inbox such as the superadmin's). Pure persistence helpers over the
// store's db; no business rules live here. Created with the store's context so
// this module never imports the store (no circular import), and the store stays
// the single owner of `db` and persistence (SUPREME RULE II).
//
//   const inbox = createInbox({ db: () => db, persistSoon, id })
//   inbox.add('u123', { type: 'hours_decided', title: '...', body: '...' })
//   inbox.list('u123', { limit: 50 })  ->  newest first, at most `limit`
//   inbox.unreadCount('u123')
//   inbox.markRead('u123', idOrAll)    ->  { unread }
const MAX_PER_RECIPIENT = 200

export function createInbox({ db, persistSoon, id }) {
  const listOf = (recipient) => {
    const d = db()
    return (d.notifications && d.notifications[recipient]) || []
  }
  function add(recipient, n) {
    const d = db()
    if (!d.notifications) d.notifications = {}
    const list = d.notifications[recipient] || (d.notifications[recipient] = [])
    list.unshift({ id: 'ntf' + id(), at: new Date().toISOString(), read: false, ...n })
    if (list.length > MAX_PER_RECIPIENT) list.length = MAX_PER_RECIPIENT
  }
  function list(recipient, { limit = 50 } = {}) {
    return listOf(recipient).slice(0, Math.max(1, Math.min(MAX_PER_RECIPIENT, limit)))
  }
  function unreadCount(recipient) {
    return listOf(recipient).filter((x) => !x.read).length
  }
  function markRead(recipient, idOrAll = '*') {
    const items = listOf(recipient)
    if (idOrAll === '*' || idOrAll == null) { for (const x of items) x.read = true }
    else { const x = items.find((y) => y.id === idOrAll); if (x) x.read = true }
    persistSoon()
    return { unread: unreadCount(recipient) }
  }
  return { add, list, unreadCount, markRead }
}
