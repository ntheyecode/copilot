// English keys for src/pages/workadmin/sections/Claims.jsx (superadmin business-
// claims traceability view). Auto-merged into the English catalog by
// src/i18n/index.jsx (import.meta.glob over locales/en/*.js). Namespace: claimsAdmin.
export default {
  claimsAdmin: {
    loadingClaims: 'Loading claims',
    checkingAccess: 'Checking access',
    stepUpLabel: 'Business claims',
    desc: 'Every concrete claim the public website makes, mapped to the file and code block that backs it. Status: substantiated (code proves it), partial (true with caveats), or unbacked (no code found - an honesty risk). The downloaded report carries a SHA-256 + signature authenticity seal.',

    // ---- status display labels (status codes stay as-is) ----
    status: {
      substantiated: 'Substantiated',
      partial: 'Partial',
      unbacked: 'Unbacked',
    },

    // ---- toolbar ----
    searchPlaceholder: 'Search claim, page or category',
    filterAll: 'All',
    refresh: 'Refresh',
    downloadReport: 'Download signed report',

    // ---- empty state ----
    empty: {
      title: 'No claims',
      detail: 'Try a different search or filter.',
    },

    // ---- table ----
    columns: {
      claim: 'Claim',
      where: 'Where',
      status: 'Status',
      backedBy: 'Backed by',
    },
    risk: 'Risk: {risk}',
    noEvidence: 'no code evidence',

    // ---- attestation footer ----
    authenticity: 'Authenticity: {alg} seal, hash {hash}..., issued {issuedAt}. The downloaded report is signed in full.',
  },
}
