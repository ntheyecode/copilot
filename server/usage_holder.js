// ===========================================================================
// Who an AI call's spend belongs to, for the AI usage ledger: ONE answer for
// every way a request can be authenticated, so a new auth path cannot leave its
// AI spend unbooked (the ledger's holder is { companyId, userId }).
//
//   signed-in person          -> their company (or their solo account)
//   superadmin viewing a customer (impersonating) -> the platform, kind 'support'
//   company API key (/api/v1, req.apiPrincipal) -> the key's company, kind 'api',
//                                with the key id recorded (never a person)
//   nobody                    -> the platform
//
// The API key branch exists because api_key_auth.js deliberately sets only
// req.apiPrincipal (never req.workUser): before this module the holder read
// req.workUser alone, so any metered call reached through /api/v1 was booked to
// no company at all.
// ===========================================================================

export function usageHolderOf(req) {
  if (!req) return { companyId: null, userId: null, kind: null, apiKeyId: null }
  if (req.impersonating) return { companyId: null, userId: null, kind: 'support', apiKeyId: null }
  const u = req.workUser
  if (u) return { companyId: u.companyId || null, userId: u.id || null, kind: null, apiKeyId: null }
  const p = req.apiPrincipal
  if (p && p.kind === 'api_key' && p.companyId) return { companyId: p.companyId, userId: null, kind: 'api', apiKeyId: p.keyId || null }
  return { companyId: null, userId: null, kind: null, apiKeyId: null }
}

export default { usageHolderOf }
