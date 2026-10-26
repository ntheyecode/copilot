// English strings for the superadmin Sessions section
// (src/pages/workadmin/sections/Sessions.jsx). One partial per i18n wave,
// deep-merged into the English base by src/i18n/index.jsx. Keys live under the
// `sessionsAdmin` namespace. Status/call-kind CODES and enum values are never
// localized here; only their display text is.
export default {
  sessionsAdmin: {
    // Loading labels
    loadingSession: 'Loading session',
    loadingSessions: 'Loading sessions',

    // Progress
    noSteps: 'No steps yet',
    progressStep: 'Step {current} of {total} - {done} done',
    noGoalSet: 'No goal set',

    // Status badges (display only; codes stay unchanged)
    statusLive: 'Live',
    statusEnded: 'Ended',
    statusPaused: 'Paused',
    statusActive: 'Active',

    // Detail modal stats: label + hint
    statCalls: 'Calls',
    statCallsHint: 'total AI calls',
    statPremium: 'Premium',
    statPremiumHint: 'top-tier model',
    statRoundRobins: 'Round-robins',
    statRoundRobinsHint: 'model switches',
    statRefinements: 'Refinements',
    statRefinementsHint: 're-plans',
    statMinsLeft: 'Mins left',
    statMinsLeftHint: 'today',
    estCost: 'Est. cost',

    // Detail modal body
    currentlyOn: 'Currently on:',
    callsByKind: 'Calls by kind',
    tierLabel: 'Tier:',
    company: '(company)',
    startedLabel: 'Started:',
    lastActivityLabel: 'Last activity:',
    idleSuffix: '(idle {n}s)',
    lastCallLabel: 'Last AI call:',
    endedLabel: 'Ended:',
    close: 'Close',

    // Toolbar
    searchPlaceholder: 'Search this page',
    refresh: 'Refresh',
    liveCount: '{n} live',
    windowSummary: '{total} in the last {days} days (older auto-delete)',

    // Empty state
    emptyTitle: 'No sessions',
    emptySearchDetail: 'Try a different search.',
    emptyDetail: 'No sessions in the last 7 days.',

    // Table headers
    colUser: 'User',
    colGoal: 'Goal',
    colProgress: 'Progress',
    colStarted: 'Started',
    colStatus: 'Status',
    estCostTitle: 'Estimated AI cost (list prices, chars/4 estimate)',

    // Row actions
    viewTitle: 'View detail',
    view: 'View',
    deleteRecordTitle: 'Delete record',

    // Pagination
    previous: 'Previous',
    pageOf: 'Page {page} of {total}',
    next: 'Next',

    // Delete modal
    deleteTitle: 'Delete session record',
    deleteMessage: 'Permanently delete {user}\'s session "{title}" and its evidence. This cannot be undone.',
    deleteConfirm: 'Delete session',
    untitled: 'Untitled',
  },
}
