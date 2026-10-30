// ===========================================================================
// WorkCoPilot integration API state: composes the three store-side modules
// (company API keys, webhooks, launch links) from the store's primitives, so
// store.js adds one factory call + one re-export instead of three blocks.
// Never imports the store (no circular import); the store stays the single
// owner of db + persistence.
//
// ctx: { db, persist, persistSoon, httpErr, getUser, company(cid), companyUsers(cid),
//        masterKey() -> Buffer(32), seal(plain), open(sealed),
//        verifyMfa(user, token), hosted, mfaGloballyEnabled(),
//        audit({ userId, companyId, action, reason, detail }),
//        workflows: { getPublishedWorkflowForCompany, getWorkflowForCompany },
//        incidents: { getIncidentForCompany }, resolveHost?(host) }
// ===========================================================================
import { createApiKeys } from './api_keys.js'
import { createWebhooks } from './webhooks.js'
import { createLaunchLinks } from './launch_links.js'
import { makeMfaStepUp } from './mfa_step_up.js'
import { derivePepper } from './api_key_rules.js'

export function createIntegrationState(ctx) {
  let pepper = null
  const pepperOf = () => (pepper || (pepper = derivePepper(ctx.masterKey())))
  const keys = createApiKeys({
    db: ctx.db, persist: ctx.persist, persistSoon: ctx.persistSoon, httpErr: ctx.httpErr, getUser: ctx.getUser,
    company: ctx.company, pepper: pepperOf, audit: ctx.audit,
    stepUp: makeMfaStepUp({
      verifyMfa: ctx.verifyMfa, hosted: ctx.hosted, mfaGloballyEnabled: ctx.mfaGloballyEnabled,
      onFailure: (u, { locked }) => ctx.audit({ userId: u.id, companyId: u.companyId || null, action: locked ? 'step_up_locked' : 'step_up_failed', reason: locked ? 'step-up locked after repeated wrong authenticator codes' : 'wrong authenticator code at an API key step-up', detail: 'company API keys' }),
    }),
  })
  const hooks = createWebhooks({
    db: ctx.db, persist: ctx.persist, persistSoon: ctx.persistSoon, httpErr: ctx.httpErr, getUser: ctx.getUser,
    seal: ctx.seal, open: ctx.open, audit: ctx.audit, resolveHost: ctx.resolveHost,
    companyActive: (cid) => { const c = ctx.company(cid); return !!c && !c.disabled },
    lookup: {
      workflow: (cid, id) => ctx.workflows.getWorkflowForCompany(cid, id),
      incident: (cid, id) => ctx.incidents.getIncidentForCompany(cid, id),
    },
  })
  const links = createLaunchLinks({
    db: ctx.db, persist: ctx.persist, persistSoon: ctx.persistSoon, httpErr: ctx.httpErr, getUser: ctx.getUser, companyUsers: ctx.companyUsers,
    workflowFor: (cid, id) => ctx.workflows.getPublishedWorkflowForCompany(cid, id),
    keyActive: (keyId) => keys.isActive(keyId),
  })

  function purgeCompanyIntegrations(companyId) {
    keys.purgeCompanyApiKeys(companyId)
    hooks.purgeCompanyWebhooks(companyId)
    links.purgeCompanyLaunchLinks(companyId)
  }

  return {
    // API keys
    apiKeyStepUpRequired: keys.stepUpRequired, listApiKeys: keys.listApiKeys, createApiKey: keys.createApiKey,
    rotateApiKey: keys.rotateApiKey, revokeApiKey: keys.revokeApiKey, resolveApiKey: keys.resolveApiKey,
    recordApiKeyUse: keys.recordApiKeyUse, listApiKeyUsage: keys.listApiKeyUsage,
    // Webhooks
    listWebhooks: hooks.listWebhooks, createWebhook: hooks.createWebhook, updateWebhook: hooks.updateWebhook,
    rotateWebhookSecret: hooks.rotateWebhookSecret, deleteWebhook: hooks.deleteWebhook, testWebhook: hooks.testWebhook,
    listWebhookDeliveries: hooks.listWebhookDeliveries, retryWebhookDelivery: hooks.retryWebhookDelivery,
    enqueueWebhookEvent: hooks.enqueueStoreEvent, dueWebhookDeliveries: hooks.dueWebhookDeliveries,
    webhookDeliveryJob: hooks.webhookDeliveryJob, recordWebhookAttempt: hooks.recordWebhookAttempt,
    // Launch links
    createLaunchLink: links.createLaunchLink, redeemLaunchLink: links.redeemLaunchLink,
    purgeCompanyIntegrations,
  }
}

export default { createIntegrationState }
