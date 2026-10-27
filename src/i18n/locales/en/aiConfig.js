// English strings for the superadmin AI configuration page
// (src/pages/workadmin/sections/AiConfig.jsx). One partial per i18n wave,
// deep-merged into the English base by src/i18n/index.jsx. Keys live under the
// `aiConfig` namespace. Provider/model IDs, enum values and API field names are
// never relocated here - only human-readable display text.
export default {
  aiConfig: {
    // Relative time (recommendation computed-at stamp)
    time: {
      justNow: 'just now',
      minAgo: '{n} min ago',
      hoursAgo: '{n}h ago',
      daysAgo: '{n}d ago',
    },

    // "Recommended now" panel (top of the page): VISION vs CHAT, three picks
    // each, drawn from every configured key's live catalog.
    reco: {
      title: 'Recommended now',
      desc: 'Which model to pick, from the live catalog behind each saved key. Vision reads the screen; chat plans and answers. One click applies a pick.',
      visionTitle: 'Vision',
      visionSub: 'Screen reading',
      chatTitle: 'Chat',
      chatSub: 'Planning and answers',
      reliable: 'Reliable',
      cheapest: 'Cheapest',
      fastest: 'Fastest',
      now: 'Now:',
      automatic: 'Automatic (built-in order)',
      noneYet: 'No provider yet',
      providerDefault: 'provider default',
      use: 'Use this',
      inUse: 'In use',
      noPick: 'No pick available.',
      chatApplyNote: 'A chat pick makes that provider the chat primary; the model it answers with is the chat model pinned on its card, or the provider default.',
    },

    // Provider card roles (chat vs vision) and the vision summary line
    role: {
      primaryChat: 'Primary for chat',
      readsScreen: 'Reads the screen',
      chat: 'Chat',
      vision: 'Vision',
      chatNow: 'Primary. Answers with {model}.',
      notChat: 'Not the chat primary.',
      notVision: 'Not reading the screen.',
      useForChat: 'Use for chat',
      useForVision: 'Use for vision',
      switchVisionModel: 'Switch model',
      visionNow: 'Reading the screen',
      visionModel: 'Model that reads the screen',
    },
    visionLine: {
      pinned: 'Screen reading is pinned to',
      auto: 'Screen reading is automatic: the built-in preference order picks the vision model. Pin a provider and model on a card, or use a pick above.',
      backToAuto: 'Back to automatic',
    },

    // Provider card
    state: {
      configured: 'Configured',
      notSet: 'Not set',
    },
    customBadge: 'CUSTOM',
    keyOne: 'Key',
    keysPool: 'Keys · {n} in pool (load spreads round-robin)',
    testedOk: 'Tested OK',
    readsScreens: '· reads screens ({model})',
    noVisionFound: '· no vision model found',
    addReplaceKey: 'Add or replace a key',
    apiKey: 'API key',
    pasteKey: 'paste the key',
    chatModelOptional: 'Chat model (optional)',
    autoDefault: 'Auto (provider default)',
    saveTest: 'Save & test',
    replacePoolTitle: 'Replace the pool with this one key, then test',
    saveTestTitle: 'Save and test this key',
    addToPool: '+ Add to pool',
    addToPoolTitle: 'Add this key to the pool (load spreads across keys)',
    reTest: 'Re-test',
    clearAll: 'Clear all',
    removeProvider: 'Remove provider',
    removeThisKey: 'Remove this key',
    whereToGetKey: 'Where to get a {label} key ↗',

    // Platform providers panel
    providersTitle: 'AI providers & keys',
    refresh: 'Refresh',
    providersDesc: 'Every AI WorkCoPilot can run on. Paste a key, test it, make one primary. Add <b>several keys to a provider</b> and load spreads across them round-robin, so bursts from many users are not rate-limited. One OpenRouter key reaches Qwen and DeepSeek. Keys are stored securely and never shown again.',
    loadingProviders: 'Loading providers',
    superadminSetKeys: 'Only a superadmin can set provider keys. Current state is shown below.',

    // Clear / remove confirmation modals
    clearKeysTitle: 'Clear all keys for this provider?',
    clearKeysDetail: 'This removes every key in the pool. If it is the active provider, the platform hands off to another configured one - otherwise shared users cannot be served until a key is set again.',
    clearKeysConfirm: 'Clear all keys',
    removeKeyTitle: 'Remove this key from the pool?',
    removeKeyDetail: 'Load stops spreading to this key. If it is the only key, the provider is no longer configured.',
    removeKeyConfirm: 'Remove key',
    removeCustomTitle: 'Remove this custom provider?',
    removeCustomDetail: 'The provider and its key are removed, and its base URL leaves the egress allowlist.',
    removeCustomConfirm: 'Remove provider',
    superadminOnly: 'Superadmin only.',

    // Custom provider form
    couldNotAdd: 'Could not add that provider.',
    addCustomProvider: 'Add a custom provider',
    customDesc: 'Any OpenAI-compatible endpoint. The base must be a public https URL - it is added to the egress allowlist after validation.',
    idLabel: 'Id (slug)',
    idPlaceholder: 'e.g. together',
    labelLabel: 'Label',
    labelPlaceholder: 'e.g. Together AI',
    baseUrlLabel: 'Base URL (https)',
    modelIdsLabel: 'Model ids (comma-separated)',
    addedTested: 'Added and tested.',
    addTest: 'Add & test',
    cancel: 'Cancel',

    // Web search card
    clearWebKeyTitle: 'Clear the platform web-search key?',
    clearWebKeyDetail: 'Live web learning turns off (unless a server env key is set as a fallback) until a key is set again.',
    clearWebKeyConfirm: 'Clear key',
    webSearchTitle: 'Web search (live web learning)',
    webSearchDesc: 'This key grounds live steps in the latest web sources, so guidance reflects what changed on the web recently.',
    loadingWebSearch: 'Loading web search',
    webSearchConfigured: 'Web search is configured',
    keyLabel: 'Key',
    setSuffix: '· set {date}',
    noWebKey: 'No platform web-search key set',
    envFallback: 'A server env key is in use as a fallback.',
    webOffUntilKey: 'Live web learning stays off until a key is set.',
    tavilyApiKey: 'Tavily API key',
    pasteTavilyKey: 'paste the platform Tavily key',
    clearKey: 'Clear key',
    saveKey: 'Save key',
    superadminWebKey: 'Only a superadmin can change the web-search key.',

    // Watch-light card
    watchLightTitle: 'Plan-heavy, watch-light (premium)',
    watchLightDesc: 'Our model, not a user setting. When on, premium users (company premium members and regular premium users) get a rich one-shot plan and check their screen on demand, instead of continuous watching. Users and companies do not control this.',
    loading: 'Loading',
    watchOnLabel: 'On - premium users plan heavy and check on demand',
    watchOffLabel: 'Off - premium users get continuous watching',
    superadminChangeThis: 'Only a superadmin can change this.',

    // Recommendation loading / empty states (shared by Recommended now)
    loadingRecommendation: 'Loading recommendation',
    noModelsTitle: 'No models to compare yet',
    configureProviderHint: 'Configure a provider in AI Settings to see recommendations.',
    updated: 'Updated',

    // Body: platform toggle + live state
    loadingConfig: 'Loading AI configuration',
    aiSettingsLabel: 'AI settings',
    platformAiTitle: 'Platform AI for WorkCoPilot',
    platformAiDesc: 'When on, WorkCoPilot users run on the platform provider managed in AI Settings. When off, each user adds and tests their own key before the app unlocks.',
    platformOnLabel: 'On - users share the platform provider',
    platformOffLabel: 'Off - users bring their own key',
    liveStateTitle: 'Live state',
    liveStateDesc: 'What users relying on platform AI will actually experience right now.',
    platformAllowed: 'Platform AI is allowed',
    platformOff: 'Platform AI is off',
    platformAllowedDetail: 'WorkCoPilot users may use the shared provider.',
    platformOffDetail: 'Each user must configure and test their own key.',
    providerConfigured: 'A platform provider is configured',
    providerNotConfigured: 'No platform provider is configured',
    providerConfiguredDetail: 'A provider key is set in AI Settings.',
    providerNotConfiguredDetail: 'Set a provider in AI Settings so shared users can be served.',
    ready: 'Ready to answer',
    notReady: 'Not ready to answer',
    readyDetail: 'Platform AI is on and a provider is set.',
    onNoProviderDetail: 'Platform AI is on but no provider is set, so shared users cannot be served.',
    offReadinessDetail: 'Platform AI is off; readiness depends on each user\'s own key.',

    // Page gate
    superadminPageOnly: 'AI settings are superadmin-only and protected by an authenticator code.',
    checkingLock: 'Checking AI settings lock',
  },
}
