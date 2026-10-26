// English strings for the superadmin incidents / AI-failover view
// (src/pages/workadmin/sections/Incidents.jsx). One partial per i18n wave,
// deep-merged into the English base by src/i18n/index.jsx. Keys live under the
// `incidentsAdmin` namespace. Incident/provider CODES, enum values (kind:
// ai_error / system_error / ai_failover / ai_exhausted) and model/provider
// identifiers are never relocated here - only human-readable display text.
export default {
  incidentsAdmin: {
    // Loading state
    loading: 'Loading incidents',

    // Kind badge display labels, resolved at the call site from the `kind` enum
    // code. The codes themselves (ai_error, system_error, ...) are not localized.
    kind: {
      ai_error: 'AI provider',
      system_error: 'System',
      ai_failover: 'AI switched',
      ai_exhausted: 'AI exhausted',
    },

    // Header note explaining what this view is
    note: 'The real causes behind the generic "system is busy" message users see. Users never see this detail. "AI switched" rows are automatic recoveries (a retired or rate-limited model was swapped for a working one, so the user kept going) - watch for them piling up on one provider. "AI exhausted" and "AI provider" rows mean a request failed; the reference code points at the fix (billing, keys or model).',

    // Toolbar
    searchPlaceholder: 'Search message, user, company or route',
    refresh: 'Refresh',
    clearAll: 'Clear all',
    showing: 'Showing {shown} of {total}',
    latestSuffix: ' (latest {n})',

    // Empty state
    emptyTitle: 'No incidents',
    emptyDetailSearch: 'Try a different search.',
    emptyDetail: 'Nothing has failed. When an AI provider or the system errors, the real cause appears here while the user sees only "system busy".',

    // Table column headers
    colWhen: 'When',
    colType: 'Type',
    colStatus: 'Status',
    colUser: 'User',
    colCompany: 'Company',
    colWhere: 'Where',
    colCause: 'Real cause',

    // Provider / model sub-line (the provider and model codes are not localized)
    providerLabel: 'provider: {provider}',
    modelLabel: 'model: {model}',

    // Row action
    deleteTitle: 'Delete incident',

    // Confirmation modal
    modal: {
      clearAllTitle: 'Clear all incidents',
      deleteTitle: 'Delete incident',
      clearAllMsg: 'Permanently delete all {n} incident records. This cannot be undone.',
      deleteMsg: 'Permanently delete this incident record. This cannot be undone.',
      clearAllConfirm: 'Clear all',
      deleteConfirm: 'Delete incident',
    },
  },
}
