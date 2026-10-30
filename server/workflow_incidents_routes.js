// Wave 3 part C routes: workflow incidents and workflow alerts for the people who
// keep workflows right. Thin: access rules live in workflow_incidents.js (and
// work_roles.js); the inbox in notifications.js.
export function registerWorkflowIncidentRoutes(app, { store, requireWorkAuth, wrap }) {
  // ?state=active|open|acknowledged|resolved|dismissed  ?workflow=<id or group id>
  app.get('/api/work/workflow-incidents', requireWorkAuth, wrap((req, res) => {
    const q = req.query || {}
    res.json(store.listWorkflowIncidents(req.workUser.id, { state: q.state || null, workflowId: q.workflow || null, limit: Number(q.limit) || 200 }))
  }))
  app.patch('/api/work/workflow-incidents/:id', requireWorkAuth, wrap((req, res) => {
    const b = req.body || {}
    res.json({ incident: store.setWorkflowIncidentState(req.workUser.id, req.params.id, { state: b.state, note: b.note }) })
  }))
  // The screen the guide saw, served only to incident recipients of that company.
  app.get('/api/work/workflow-incidents/:id/frame', requireWorkAuth, wrap((req, res) => {
    const f = store.readWorkflowIncidentFrame(req.workUser.id, req.params.id)
    res.setHeader('Content-Type', f.mime)
    res.setHeader('Cache-Control', 'private, max-age=300')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.send(f.buffer)
  }))
  // Autolearn, decided by a person: put the untrained step into a new draft.
  app.post('/api/work/workflow-incidents/:id/adopt', requireWorkAuth, wrap((req, res) => {
    res.json(store.adoptWorkflowIncidentStep(req.workUser.id, req.params.id))
  }))

  // The signed-in person's workflow alerts (one per new incident), kept apart
  // from billing and usage alerts. Structured fields; the client words them.
  app.get('/api/work/workflow-incidents-alerts', requireWorkAuth, wrap((req, res) => {
    res.json({ alerts: store.listWorkflowAlerts(req.workUser.id, { limit: Number((req.query || {}).limit) || 50 }), unread: store.unreadWorkflowAlerts(req.workUser.id) })
  }))
  app.post('/api/work/workflow-incidents-alerts/read', requireWorkAuth, wrap((req, res) => {
    res.json(store.markWorkflowAlertsRead(req.workUser.id, (req.body || {}).id || '*'))
  }))
}

export default { registerWorkflowIncidentRoutes }
