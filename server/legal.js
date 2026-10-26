// Single source of truth for the legal agreements a user must accept to use
// WorkCoPilot, and the version they accept. Clickwrap consent (an explicit "I
// agree", recorded with a version + timestamp + IP + user agent) is far more
// enforceable than an implied "by signing up you agree" line, so EVERY account -
// email signup, social login, company SSO, and admin-created users - must accept
// the CURRENT version before using the platform, and re-accept when it changes.
//
// SUPREME RULE II (single source of truth): the version and the document list
// live HERE only. The signup gate, the per-user acceptance record, the re-consent
// gate, and the client consent UI all read from this. To require everyone to
// re-accept after a material change to any agreement, bump LEGAL_VERSION.
//
// NOTE (not legal advice): this builds the strongest enforceable CONSENT MECHANISM
// (clickwrap + versioned audit trail). The ENFORCEABILITY in a given country also
// depends on the WORDING of the documents themselves, which should be reviewed by
// counsel. This file governs the gate, not the contents of the agreements.

// Bump this (an ISO date is fine) whenever any accepted agreement changes
// materially, so every user is prompted to re-accept before continuing.
export const LEGAL_VERSION = '2026-10-26'

// The agreements a user accepts at signup / first login. `business: true` ones
// (the DPA) are shown to company/business accounts; all others apply to everyone.
// `path` is the public route the client links to.
export const LEGAL_DOCS = [
  { key: 'terms', title: 'Terms of Service', path: '/workcopilot/terms' },
  { key: 'privacy', title: 'Privacy Policy', path: '/workcopilot/privacy' },
  { key: 'acceptable-use', title: 'Acceptable Use Policy', path: '/workcopilot/acceptable-use' },
  { key: 'cookie-policy', title: 'Cookie Policy', path: '/workcopilot/cookie-policy' },
  { key: 'disclaimer', title: 'Disclaimer', path: '/workcopilot/disclaimer' },
  { key: 'dpa', title: 'Data Processing Addendum', path: '/workcopilot/dpa', business: true },
]

// What the client needs to render the consent UI and know the version to send back.
export function legalManifest() {
  return { version: LEGAL_VERSION, docs: LEGAL_DOCS }
}
