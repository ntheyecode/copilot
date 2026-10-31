// Which work session an AI model switch belongs to, for the switch recorder
// (index.js makeOnSwitch: the superadmin incident + the session's own "switched
// model" note). Only a /api/work/sessions/:id route names a session. Every other
// route's :id is something else (a project, a workflow), and treating it as a
// session id filed incidents against the wrong record. One rule, one place, so a
// new route cannot reintroduce that by naming its parameter `id`.
export function sessionIdForSwitch(req) {
  const url = String((req && (req.originalUrl || req.url)) || '')
  const id = req && req.params && req.params.id
  return id && /^\/api\/work\/sessions\/[^/?#]+/.test(url) ? String(id) : null
}

export default { sessionIdForSwitch }
