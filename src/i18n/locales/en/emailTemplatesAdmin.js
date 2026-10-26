// English strings for the superadmin Email Templates surface
// (src/pages/workadmin/sections/EmailTemplates.jsx). One partial per i18n wave,
// deep-merged into the English base by src/i18n/index.jsx. Keys live under the
// `emailTemplatesAdmin` namespace. Only the console's own UI chrome lives here;
// the editable email template content (subject/heading/body/CTA), template ids,
// and placeholder tokens are operator DATA and stay in the component untouched.
export default {
  emailTemplatesAdmin: {
    loading: 'Loading email templates',
    title: 'Email templates',
    desc: 'Every email WorkCoPilot sends. Edit the wording with <code><Placeholder></code> tokens, preview it live, then save. Reset returns a template to its built-in default. The branded layout (header, footer, buttons) stays consistent automatically.',
    edited: 'edited',
    selectTemplate: 'Select a template.',

    // Email category headings, keyed by the category code
    category: {
      account: 'Account',
      security: 'Security',
      billing: 'Billing',
      forms: 'Forms',
      notifications: 'Notifications',
      support: 'Support',
    },

    // Editor
    resetConfirm: 'Reset this email to its built-in default? Your custom wording will be removed.',
    subject: 'Subject',
    heading: 'Heading',
    body: 'Body',
    bodyHint: '(blank line = new paragraph)',
    buttonLabel: 'Button label',
    buttonLabelHint: '(leave blank for no button)',
    placeholders: 'Placeholders',
    clickToInsert: 'click to insert',
    placeholderSample: ' (e.g. {sample})',
    save: 'Save',
    refreshPreview: 'Refresh preview',
    resetToDefault: 'Reset to default',
    livePreview: 'Live preview',
    withSampleData: 'with sample data',
    previewTitle: 'Email preview',
    renderingPreview: 'Rendering preview...',

    // Notification recipients card
    loadingNotifications: 'Loading notifications',
    notifyTitle: 'Notification recipients',
    notifyDesc: 'Where Contact Us messages and new "Validate it live" leads are emailed, and whether the person who submits gets a thank-you.',
    contactGoesTo: 'Contact Us goes to',
    newLeadsGoTo: 'New leads go to',
    thankYouToSubmitter: 'Thank-you to submitter',
    on: 'On',
    off: 'Off',
    contactRecipient: 'Contact Us recipient',
    newLeadRecipient: 'New-lead recipient',
    thankYouCheckbox: 'Send a thank-you email to people who submit the Contact and lead forms',
    cancel: 'Cancel',
  },
}
