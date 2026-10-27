// English strings for the superadmin Overview section
// (src/pages/workadmin/sections/Overview.jsx). One partial per i18n wave,
// deep-merged into the English base by src/i18n/index.jsx. Keys live under the
// `overviewAdmin` namespace. Metric keys and tier CODES are never localized
// here; only their display text is.
export default {
  overviewAdmin: {
    loading: 'Loading overview',

    // Stat tiles: label + foot
    users: 'WorkCoPilot users',
    activeNow: 'Active now',
    activeNowFoot: 'Guiding in the last 5 minutes',
    sessionsToday: 'Sessions today',
    sessionsTodayFoot: 'Started since the last reset',
    totalSessions: 'Total sessions',
    totalSessionsFoot: 'All time, across users',
    purchasedHours: 'Purchased hours left',
    purchasedHoursFoot: 'Non-expiring balance across users',

    // Platform AI tile
    platformAi: 'Platform AI',
    aiReady: 'Ready',
    aiNotReady: 'Not ready',
    aiOff: 'Off',
    aiFootReady: 'Platform AI is on and a provider is configured',
    aiFootNoProvider: 'Platform AI is on but no provider is configured',
    aiFootOff: 'Platform AI is off (users run their own key)',

    // Users-by-tier graph (shares of all users, from the overview counts)
    byTierTitle: 'Users by tier',
    byTierDesc: 'How the {total} WorkCoPilot users split across tiers right now.',
  },
}
