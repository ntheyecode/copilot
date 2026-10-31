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
    chunks: 'Passages',
    chunksFoot: 'Masked passages stored',
    size: 'Size',
    sizeFoot: 'Encrypted for your company',

    privacyNote: 'Every document you add here is read once, masked under your company\'s data policy, and kept only as passages, encrypted and private to your company. The file itself is never stored, and nothing here is used to train the platform.',

    // Toolbar.
    searchPlaceholder: 'Search title, kind or status',
    refresh: 'Refresh',
    clearAll: 'Clear all',
    showing: 'Showing {shown} of {total}',

    // Empty states.
    emptyTitle: 'Your Company Brain is empty',
    emptyDetail: 'No documents yet. Add your SOPs, playbooks and policies above; guidance starts drawing on them right away.',
    noMatchTitle: 'No matching documents',
    noMatchDetail: 'Try a different search.',

    // Table headers.
    colTitle: 'Title',
    colKind: 'Kind',
    colChunks: 'Passages',
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
    clearAllMessage_one: 'Permanently remove all {count} source ({chunks} passages) from your Company Brain. Guidance stops drawing on them right away. You can add documents again here at any time. This cannot be undone.',
    clearAllMessage_other: 'Permanently remove all {count} sources ({chunks} passages) from your Company Brain. Guidance stops drawing on them right away. You can add documents again here at any time. This cannot be undone.',
    removeOneMessage_one: 'Permanently remove "{name}" ({chunks} passage) from your Company Brain. You can add it again here at any time. This cannot be undone.',
    removeOneMessage_other: 'Permanently remove "{name}" ({chunks} passages) from your Company Brain. You can add it again here at any time. This cannot be undone.',

  // Add documents (companybrain/AddDocuments.jsx): the company admin adds the
  // company's own documents here; per-file phase and outcome, every error
  // actionable. No model or provider is ever named.
  add: {
    title: 'Add documents',
    desc: 'Your SOPs, playbooks, runbooks and policies become the first thing guidance draws on for your people.',
    promiseTitle: 'What happens to a document you add',
    promise: 'We read it, mask private details under your company policy, and keep only the passages. The file itself is never stored.',
    types: 'PDF, Word (.docx), text (.txt) or Markdown (.md), up to 10 MB each.',
    dropIdle: 'Drop documents here',
    dropOver: 'Release to add them',
    dropSub: 'Several at once is fine; they are added one after another.',
    choose: 'Choose documents',
    inputAria: 'Choose documents to add to the Company Brain',
    queueLabel: 'Documents being added',
    clearFinished: 'Clear finished',
    retry: 'Try again',
    dismiss: 'Remove from this list',
    dismissAria: 'Remove {name} from this list',
    status: {
      queued: 'Waiting',
      reading: 'Reading',
      storing: 'Masking and storing',
      done: 'Added',
      failed: 'Not added',
    },
    phase: {
      reading: 'Reading the file',
      masking: 'Masking private details',
      storing: 'Storing the passages',
    },
    result: {
      added_one: 'Added: {n} passage from {name}',
      added_other: 'Added: {n} passages from {name}',
      unchanged_one: 'Already up to date: {name} had nothing new.',
      unchanged_other: 'Already up to date: {name} had nothing new.',
      replaced_one: 'Replaced the earlier version.',
      replaced_other: 'Replaced the earlier version.',
      masked_one: '{n} private detail was masked.',
      masked_other: '{n} private details were masked.',
      notKept_one: 'The file itself was not stored.',
      notKept_other: 'The file itself was not stored.',
    },
    keywordsNote: 'This server finds passages by the words they contain, not by their meaning, so guidance matches the wording your documents use. Write them the way your people search.',
    locked: {
      title: 'Your Company Brain is locked',
      body: 'Unlock it with your passphrase under Encryption & export, then come back here to add documents.',
      open: 'Open Encryption & export',
      check: 'Check again',
    },
    errors: {
      type: 'Not a supported file type. Add a PDF, Word (.docx), text (.txt) or Markdown (.md) file.',
      size: 'Too large. The limit is 10 MB per file.',
      read: 'The file could not be read in your browser. Pick it again.',
      noText: 'No text could be read from it. It may be empty, image-only or password protected. Save it as a text PDF or a .docx and add it again.',
      locked: 'Your Company Brain is locked. Unlock it under Encryption & export, then add this file again.',
      rate: 'That is a lot of documents for one hour. Wait a little, then add the rest.',
      forbidden: 'Only a company admin can add documents.',
      server: 'It could not be added right now. Try again in a moment.',
    },
  },

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
