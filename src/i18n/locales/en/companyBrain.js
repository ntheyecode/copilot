// English strings for the Company Brain surface (company-admin knowledge-store
// inventory). Values are byte-identical to the former hardcoded English. Non-
// English locales fall back to this until translated.
export default {
  companyBrain: {
    heading: 'Company Brain',
    loading: 'Loading your Company Brain',

    // Status badges (mapped families; unmapped server statuses show verbatim).
    statusReady: 'Ready',
    statusInProgress: 'In progress',
    statusFailed: 'Failed',

    // Summary cards.
    documents: 'Documents',
    sourcesInBrain: 'Sources in your brain',
    chunks: 'Chunks',
    chunksFoot: 'Scrubbed passages stored',
    size: 'Size',
    sizeFoot: 'Encrypted for your company',

    privacyNote: 'Documents are scrubbed and prepared on each person\'s device before anything leaves it. Only the scrubbed passages reach WorkCoPilot, stored encrypted and private to your company. Nothing here is used to train the platform.',

    // Toolbar.
    searchPlaceholder: 'Search title, kind or status',
    refresh: 'Refresh',
    clearAll: 'Clear all',
    showing: 'Showing {shown} of {total}',

    // Empty states.
    emptyTitle: 'Your Company Brain is empty',
    emptyDetail: 'No documents yet - your team\'s documents are added privately from the desktop app, scrubbed on their device before anything leaves.',
    noMatchTitle: 'No matching documents',
    noMatchDetail: 'Try a different search.',

    // Table headers.
    colTitle: 'Title',
    colKind: 'Kind',
    colVersion: 'Version',
    colChunks: 'Chunks',
    colUpdated: 'Last updated',
    colStatus: 'Status',

    // Row.
    scrubPolicy: 'Scrub policy v{v}',
    removeTitle: 'Remove this document from the Company Brain',
    remove: 'Remove',

    // Toasts.
    all: 'all',
    clearedToast_one: 'Cleared {count} source from the Company Brain. Logged to the audit trail.',
    clearedToast_other: 'Cleared {count} sources from the Company Brain. Logged to the audit trail.',
    removedToast: 'Removed "{name}" from the Company Brain. Logged to the audit trail.',

    // Confirm modal.
    modalClearTitle: 'Clear the Company Brain',
    modalRemoveTitle: 'Remove document',
    clearAllMessage_one: 'Permanently remove all {count} source ({chunks} chunks) from your Company Brain. Guidance stops drawing on them right away. Documents can be added again from the desktop app. This cannot be undone.',
    clearAllMessage_other: 'Permanently remove all {count} sources ({chunks} chunks) from your Company Brain. Guidance stops drawing on them right away. Documents can be added again from the desktop app. This cannot be undone.',
    removeOneMessage_one: 'Permanently remove "{name}" ({chunks} chunk) from your Company Brain. It can be added again from the desktop app. This cannot be undone.',
    removeOneMessage_other: 'Permanently remove "{name}" ({chunks} chunks) from your Company Brain. It can be added again from the desktop app. This cannot be undone.',

  // Knowledge spaces: named collections of the company's learnings a person
  // can pick when starting a task ("Ground in"). Managed here by the admin.
  // (nested: the component reads companyBrain.kbSpaces.*)
  kbSpaces: {
    title: 'Knowledge spaces',
    desc: 'Group your company learnings into collections. When someone starts a task they can ground the plan in one space instead of everything. Ungrouped learnings are always part of "All knowledge".',
    loading: 'Loading knowledge spaces',
    namePh: 'New space, e.g. Finance close',
    add: 'Add space',
    adding: 'Adding',
    count_one: '{n} learning',
    count_other: '{n} learnings',
    rename: 'Rename',
    remove: 'Remove',
    save: 'Save',
    cancel: 'Cancel',
    renameAria: 'New name for {name}',
    emptyTitle: 'No spaces yet',
    emptyDetail: 'Add a space, then move learnings into it. Until then every task grounds in all company knowledge.',
    errName: 'Give the space a name.',
    errDuplicate: 'A space with that name already exists.',
    errSave: 'Could not save the space. Please try again.',
    removeTitle: 'Remove knowledge space',
    removeMessage_one: 'Remove "{name}"? Its {n} learning is kept and falls back to ungrouped (part of All knowledge). People can no longer pick this space when starting a task.',
    removeMessage_other: 'Remove "{name}"? Its {n} learnings are kept and fall back to ungrouped (part of All knowledge). People can no longer pick this space when starting a task.',
    removedToast: 'Removed "{name}". Its learnings are ungrouped now.',
    addedToast: 'Added "{name}".',
    renamedToast: 'Renamed to "{name}".',
  },
  },
}
