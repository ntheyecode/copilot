// The THREE ways a company's AI can be set up. ONE registry (SUPREME RULE II):
// the superadmin create form, the superadmin company card and the company
// console all render from this list, so a fourth option, or a renamed one,
// lands here once and nowhere else.
//
// Two of the options share the STORED aiSource 'company' and differ only in WHO
// types the key: the company admin in their own console ('client') or the
// WorkCoPilot team on their behalf ('managed'). Once a key exists the stored
// key's `owner` tells them apart ('company' = the company admin typed it,
// 'corporate' = the WorkCoPilot team typed it). Before a key exists the two
// look identical in the store, so the operator's pick is kept by the caller for
// the session and passed in as `pending`.
//
// Pure: no React, no fetch. Unit-tested in server/ai_source_options.test.mjs.
export const AI_SETUP_OPTIONS = Object.freeze([
  Object.freeze({ id: 'client', aiSource: 'company', keyOwner: 'company' }),
  Object.freeze({ id: 'managed', aiSource: 'company', keyOwner: 'corporate' }),
  Object.freeze({ id: 'platform', aiSource: 'platform', keyOwner: null }),
])
export const AI_SETUP_IDS = AI_SETUP_OPTIONS.map((o) => o.id)
export const isAiSetupId = (id) => AI_SETUP_IDS.includes(id)

// The stored aiSource a given option maps to ('company' | 'platform'), or null
// for an unknown / empty pick (the server treats null as "not selected").
export function aiSourceFor(optionId) {
  const o = AI_SETUP_OPTIONS.find((x) => x.id === optionId)
  return o ? o.aiSource : null
}

// Which option a company is currently on, from the public company payload
// (aiSource + companyAi.owner). `pending` is the operator's pick for the
// no-key-yet case (see the header). Returns an option id or null (not chosen).
export function aiSetupOf(company, pending) {
  const pend = isAiSetupId(pending) ? pending : null
  if (!company) return pend
  if (company.aiSource === 'platform') return 'platform'
  if (company.aiSource === 'company') {
    const owner = company.companyAi && company.companyAi.owner
    if (owner === 'corporate') return 'managed'
    if (owner === 'company') return 'client'
    // 'company' chosen, no key yet: both company options are possible. Honor the
    // operator's pick for this session; the company admin's console defaults to
    // 'client' because adding their own key is the action open to them.
    return (pend === 'client' || pend === 'managed') ? pend : 'client'
  }
  return pend
}

// Readiness for a (company, option) pair, derived the same way the server does
// (publicCompany.aiReady), so a freshly picked option shows the right state
// before the reload lands: 'ready' | 'needs_key' | 'unselected'.
export function aiReadiness(company, optionId) {
  if (optionId === 'platform') return 'ready'
  if (optionId === 'client' || optionId === 'managed') {
    const hasKey = !!(company && (company.hasCompanyAi || (company.companyAi && company.companyAi.keyMasked)))
    return hasKey ? 'ready' : 'needs_key'
  }
  return 'unselected'
}
