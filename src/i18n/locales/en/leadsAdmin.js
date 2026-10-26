// English keys for src/pages/workadmin/sections/Leads.jsx (superadmin leads view:
// the public "Validate it live" captures across marketing + sign-in). Auto-merged
// into the English catalog by src/i18n/index.jsx (import.meta.glob over
// locales/en/*.js). Namespace: leadsAdmin.
export default {
  leadsAdmin: {
    loadingLeads: 'Loading leads',

    // ---- source display labels (source codes stay as-is; other codes are
    // capitalized at the call site) ----
    source: {
      marketing: 'Demo page',
      login: 'Sign-in',
    },

    // ---- CSV export column headers ----
    csv: {
      firstName: 'First name',
      lastName: 'Last name',
      email: 'Email',
      phone: 'Phone',
      company: 'Company',
      source: 'Source',
      scenario: 'Scenario',
      captured: 'Captured',
    },

    // ---- toolbar ----
    searchPlaceholder: 'Search name, email, company or scenario',
    refresh: 'Refresh',
    exportCsv: 'Export CSV',
    clearAll: 'Clear all',
    showing: 'Showing {shown} of {total}',
    showingLatest: 'Showing {shown} of {total} (latest {latest})',

    // ---- empty state ----
    empty: {
      title: 'No leads yet',
      detailSearch: 'Try a different search.',
      detailNone: 'When visitors run a live validation, their details appear here.',
    },

    // ---- table ----
    columns: {
      name: 'Name',
      email: 'Email',
      phone: 'Phone',
      company: 'Company',
      from: 'From',
      validated: 'Validated (what they searched)',
      captured: 'Captured',
    },
    noneYet: 'None yet',
    hideSearches: 'Hide searches',
    showSearches: 'Show all searches and answers',
    deleteLead: 'Delete lead',

    // ---- confirm modals ----
    modal: {
      clearAllTitle: 'Clear all leads',
      clearAllMessage: 'Permanently delete all {n} lead records. This cannot be undone.',
      deleteMessage: 'Permanently delete the lead for {who}. This cannot be undone.',
      thisVisitor: 'this visitor',
    },
  },
}
