// Company console, Team table: one person's role cell (the primary role select
// plus the additive trainer grant). Extracted from WorkCompanyAdmin.jsx so the
// identity-provider state lives in one small module.
//
// When the company's identity provider sets this person's role or a grant
// through a SCIM group mapping (publicWorkUser.idpManaged, server/scim_roles.js),
// the managed control is locked and labelled "Managed by your identity
// provider"; the server refuses the same edit (409 IDP_MANAGED). Everything it
// does not manage stays editable. Options come from the role registry mirror.
import React from 'react'
import { Lock } from 'lucide-react'
import { useT } from '../../../i18n/index.jsx'
import { COMPANY_ROLE_OPTIONS, canGrantTrainer, hasTrainerGrant } from '../../../shared/work_roles_options.js'

export default function TeamRoleCell({ member: m, self, busy, onPatch }) {
  const t = useT()
  const managed = m.idpManaged || null
  const roleLocked = !!(managed && managed.role)
  const trainerLocked = !!(managed && (managed.grants || []).includes('trainer'))
  const role = m.companyRole || 'member'
  return (
    <div className="trc">
      <select className="wka-select" value={role} disabled={self || busy || roleLocked} aria-label={t('companyAdmin.team.role')}
        title={roleLocked ? t('companyAdmin.team.idpManagedHelp') : self ? t('companyAdmin.team.cannotChangeOwnRole') : ''}
        onChange={(e) => onPatch(m, { companyRole: e.target.value })}>
        {COMPANY_ROLE_OPTIONS.map((o) => <option key={o.id} value={o.id}>{t(o.labelKey)}</option>)}
      </select>
      {/* Additive trainer grant: author guided workflows. Only a member or
          project-manager role may hold it (canGrantTrainer), so the checkbox
          appears for those roles only; the server drops the grant automatically
          if the role changes to one that cannot hold it. */}
      {canGrantTrainer(role) && (
        <label className="wka-check" title={trainerLocked ? t('companyAdmin.team.idpManagedHelp') : t('companyAdmin.grants.trainerHelp')} style={{ marginTop: 6, fontSize: 12 }}>
          <input type="checkbox" disabled={busy || trainerLocked}
            checked={hasTrainerGrant(m.grants)}
            onChange={(e) => onPatch(m, { grants: e.target.checked ? ['trainer'] : [] })} />
          {t('companyAdmin.grants.trainer')}
        </label>
      )}
      {roleLocked || trainerLocked ? (
        <div className="trc-idp" data-testid="idp-managed" title={t('companyAdmin.team.idpManagedHelp')}><Lock size={11} aria-hidden /> <span>{t('companyAdmin.team.idpManaged')}</span></div>
      ) : null}
      <style>{TRC_CSS}</style>
    </div>
  )
}

const TRC_CSS = `
.trc{display:grid;gap:2px;min-width:0}
.trc-idp{display:inline-flex;align-items:center;gap:4px;margin-top:4px;font-size:11px;font-weight:600;color:var(--wka-muted);line-height:1.3}
.trc-idp svg{flex-shrink:0;color:var(--wka-accent)}
`
