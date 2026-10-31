// WHAT each annotated help entry shows (pure data, no JSX, so help_shots.test.mjs
// can check it): per surface, the screenshots in reading order and, per shot,
// the callouts in numbered order. `name` = public/help/<name>.webp and the key
// into shotGeometry.js; copy lives under dashboardsHelp.<k>.<id> (work Help) or
// helpCompany.<area>.shots.<id> (company console). show(v) (v = roleViewOf(user))
// limits a shot or a callout to the roles that can do that thing. A callout's
// `region` (default: its key) names the captured region it outlines, so a
// role-specific wording can outline the same control. `path(v)` picks the key of
// the how-to path for that role (default 'path').
const manageIncidents = (v) => v.canManageIncidents
// Adding an issue's step to a draft: the workflow's author or a company admin
// (server/workflow_incidents.js adoptable). Only people who can author at all
// (trainers, company admins) can ever be one of those.
const adoptIncidents = (v) => v.canManageIncidents && v.showTeach

export const WORKFLOWS_SPEC = {
  shots: [
    { id: 'list', name: 'dashboards/company-workflows', marks: [{ key: 'search' }, { key: 'details' }, { key: 'run' }] },
    { id: 'guide', name: 'dashboards/workflow-guide', marks: [{ key: 'plan' }, { key: 'shot' }, { key: 'source' }, { key: 'done' }] },
    { id: 'larger', name: 'dashboards/workflow-guide-larger', marks: [{ key: 'full' }] },
  ],
}

export const TEACH_SPEC = {
  shots: [
    { id: 'list', name: 'teach/studio-list', marks: [{ key: 'newWorkflow' }, { key: 'issues', show: (v) => v.showIncidents }, { key: 'states' }, { key: 'actions' }] },
    { id: 'wizard', name: 'teach/wizard-basics', marks: [{ key: 'stepper' }, { key: 'reflect' }, { key: 'required' }, { key: 'footer' }] },
    { id: 'scope', name: 'teach/wizard-scope', marks: [{ key: 'note' }, { key: 'ack' }, { key: 'mask' }] },
    { id: 'record', name: 'teach/record-setup', marks: [{ key: 'narrate' }, { key: 'call' }, { key: 'mask' }, { key: 'start' }] },
    { id: 'live', name: 'teach/recorder-live', marks: [{ key: 'time' }, { key: 'mark' }, { key: 'stop' }] },
    { id: 'import', name: 'teach/import', marks: [{ key: 'file' }, { key: 'lang' }, { key: 'start' }] },
    { id: 'review', name: 'teach/steps-review', marks: [{ key: 'read' }, { key: 'shot' }, { key: 'band' }, { key: 'use' }, { key: 'mark' }] },
  ],
}

// GRC and executives receive issues but do not act on them: they read the
// `watch` note instead of the action callouts and the "add this step" shot.
export const ISSUES_SPEC = {
  note: (v) => (manageIncidents(v) ? null : 'watch'),
  path: (v) => (manageIncidents(v) ? 'path' : 'pathWatch'),
  shots: [
    { id: 'badge', name: 'dashboards/workflow-issues-badge', marks: [{ key: 'badge' }] },
    { id: 'inbox', name: 'dashboards/workflow-issues', marks: [{ key: 'chips' }, { key: 'filters' }, { key: 'shot' }, { key: 'suggest' },
      { key: 'actions', show: adoptIncidents },
      { key: 'actionsPlain', region: 'actions', show: (v) => manageIncidents(v) && !adoptIncidents(v) }] },
    { id: 'adopt', name: 'dashboards/workflow-issues-adopt', show: adoptIncidents, marks: [] },
    { id: 'exec', name: 'dashboards/exec-issues', show: (v) => v.showExec, marks: [{ key: 'kinds' }, { key: 'review' }] },
  ],
}

// The Company Brain export is executive-only (the server enforces it).
export const EXEC_SPEC = {
  shots: [
    { id: 'drill', name: 'dashboards/exec-drilldowns', marks: [{ key: 'status' }, { key: 'table' }, { key: 'people' }] },
    { id: 'brain', name: 'dashboards/exec-brain', show: (v) => v.isExecutive, marks: [{ key: 'note' }, { key: 'key' }, { key: 'download' }] },
  ],
}

// Work Help entries: catalog key (dashboardsHelp.<k>) -> spec.
export const DASHBOARD_HELP_SPECS = { workflows: WORKFLOWS_SPEC, teach: TEACH_SPEC, issues: ISSUES_SPEC, exec: EXEC_SPEC }

// Company console Help areas: helpCompany.<area>.shots.<id>.
const m = (...keys) => keys.map((key) => ({ key }))
export const COMPANY_HELP_SHOTS = {
  trainer: [{ id: 'grant', name: 'company/trainer-grant', marks: m('role', 'trainer') }],
  developer: [
    { id: 'keys', name: 'company/api-keys', marks: m('create', 'row', 'acts') },
    { id: 'create', name: 'company/api-key-create', marks: m('scopes', 'expiry', 'ip') },
    { id: 'secret', name: 'company/api-key-show-once', marks: m('copy', 'done') },
    { id: 'hooks', name: 'company/webhooks', marks: m('events', 'acts', 'deliveries') },
  ],
}

// Visible shots of a spec for a role view, and their callouts as AnnotatedShot
// marks ({ key: region, text }). ONE mapper for both help surfaces. `base` is
// the copy prefix of a shot ('dashboardsHelp.teach' -> '<base>.<id>').
const visible = (x, v) => { try { return !x.show || !!x.show(v) } catch { return false } }
export function visibleShots(shots, v) { return shots.filter((s) => visible(s, v)) }
export function shotMarks(shot, v, t, base) {
  return shot.marks.filter((mk) => visible(mk, v)).map((mk) => ({ key: mk.region || mk.key, text: t(`${base}.${shot.id}.marks.${mk.key}`) }))
}
