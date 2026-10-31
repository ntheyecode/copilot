// Where each persona lands after signing in, and the heading that proves it.
// Mirrors the product rule in src/pages/WorkLogin.jsx (admins to their consoles,
// everyone else to the /work dashboard; executives reach /work/exec from the rail).
export const LANDING = Object.freeze({
  superadmin: { path: /\/work\/admin$/, heading: /Overview/ },
  admin: { path: /\/work\/company$/, heading: /Overview/ },
  exec: { path: /\/work$/, heading: /^Hello/ },
  pm: { path: /\/work$/, heading: /^Hello/ },
  srpm: { path: /\/work$/, heading: /^Hello/ },
  grc: { path: /\/work$/, heading: /^Hello/ },
  member: { path: /\/work$/, heading: /^Hello/ },
  worker: { path: /\/work$/, heading: /^Hello/ },
  trainer: { path: /\/work$/, heading: /^Hello/ },
  solo: { path: /\/work$/, heading: /^Hello/ },
})

export const SUPERADMIN = Object.freeze({ username: 'admin', password: 'E2e-Admin-Pass-123!' })

// What each company persona must (and must not) find on the rail.
export const RAIL = Object.freeze({
  member: { has: ['Dashboard', 'Start a task', 'My queue'], not: ['Teach a workflow', 'Projects I manage', 'Oversight', 'Workflow issues'] },
  worker: { has: ['Dashboard', 'My queue'], not: ['Start a task', 'Teach a workflow'] },
  trainer: { has: ['Teach a workflow', 'Workflow issues'], not: ['Projects I manage', 'Oversight'] },
  pm: { has: ['Projects I manage', 'Workflow issues'], not: ['Project managers', 'Teach a workflow'] },
  srpm: { has: ['Projects I manage', 'Project managers', 'Oversight'], not: ['Teach a workflow'] },
  grc: { has: ['Oversight', 'Workflow issues'], not: ['Projects I manage', 'Teach a workflow'] },
  exec: { has: ['Workflow issues', 'Executive dashboard'], not: ['Teach a workflow', 'Projects I manage'] },
})
