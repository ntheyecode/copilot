// The "Workflow issues" entry in the work shell's rail (Manage section), with a
// calm unread badge. A plain anchor: the inbox is a standalone `.wka` console
// with its own route, like the Teach studio. In the collapsed rail the count
// becomes a small dot on the icon; the label keeps the full count for screen
// readers. Shown only when roleViewOf(user).showIncidents (the caller gates).
import React from 'react'
import { Signpost } from 'lucide-react'
import { useT } from '../../../i18n/index.jsx'
import { useWorkflowAlertsUnread } from './useWorkflowAlertsUnread.js'
import { INBOX_PATH } from './incidentsModel.js'

const NAV_CSS = `
.wd-nav .wfi-navb{margin-left:auto;flex:0 0 auto;min-width:20px;height:20px;padding:0 6px;border-radius:999px;display:inline-grid;place-items:center;
  font-size:11px;font-weight:700;line-height:1;white-space:nowrap;font-variant-numeric:tabular-nums;background:var(--em-fill);color:var(--em-deep)}
.wd-nav .wfi-navi{position:relative;display:inline-grid;flex:0 0 18px}
.wd-nav .wfi-navdot{display:none;position:absolute;top:-3px;right:-4px;width:8px;height:8px;border-radius:50%;background:var(--em);box-shadow:0 0 0 2px var(--panel,#fff)}
.wd-rail.collapsed .wd-nav .wfi-navb{display:none}
.wd-rail.collapsed .wd-nav .wfi-navdot{display:block}
@media (max-width:900px){.wd-rail .wd-nav .wfi-navb{display:none}.wd-rail .wd-nav .wfi-navdot{display:block}}
`

export default function IncidentsNavItem({ enabled }) {
  const t = useT()
  const unread = useWorkflowAlertsUnread(enabled)
  if (!enabled) return null
  const label = t('wfIssues.nav.label')
  const full = unread > 0 ? `${label}. ${t.n('wfIssues.nav.unread', unread, { n: unread })}` : label
  return (
    <a className="wd-nav" href={INBOX_PATH} title={unread > 0 ? full : t('wfIssues.nav.tip')} aria-label={full}>
      <style>{NAV_CSS}</style>
      <span className="wfi-navi" aria-hidden="true"><Signpost size={18} />{unread > 0 && <span className="wfi-navdot" />}</span>
      <span className="wd-nav-t">{label}</span>
      {unread > 0 && <span className="wfi-navb" aria-hidden="true">{unread > 99 ? '99+' : unread}</span>}
    </a>
  )
}
