// English strings for the public Contact Us page (src/pages/WorkContact.jsx).
// Keyed under the `contactPage` namespace; the i18n loader deep-merges every
// en/*.js partial into the English base, so this file owns its namespace.
// The page's <title>/description keep using the shared seo.contact.* keys in en.js.
// Interpolations: {name} = the sender's first name, {email} = the address they
// typed (rendered bold via t.rich). Placeholders are example values a locale may
// localize (a local-looking name); the mailbox domain is illustrative only.
export default {
  contactPage: {
    eyebrow: 'Contact us',
    h1: 'Talk to us.',
    lead: 'Questions about WorkCoPilot, a demo for your team, security or compliance, or anything else. Send a note and we will get back to you.',
    errors: {
      required: 'Please add your name, email and a message.',
      sendFailed: 'Could not send your message. Please try again.',
    },
    form: {
      nameLabel: 'Your name',
      namePlaceholder: 'Alex Morgan',
      emailLabel: 'Email',
      emailPlaceholder: 'you@company.com',
      subjectLabel: 'Subject',
      optional: '(optional)',
      subjectPlaceholder: 'How can we help?',
      messageLabel: 'Message',
      messagePlaceholder: 'Tell us a bit about what you are looking for.',
      send: 'Send message',
      note: 'For enterprise, security or compliance questions, mention it above and the right team will reply.',
    },
    done: {
      // {name} falls back to `thereFallback` when the sender typed no first name.
      thanks: 'Thank you, {name}.',
      thereFallback: 'there',
      body: 'Your message is on its way to our team, and a confirmation is heading to <b>{email}</b>. We will be in touch shortly.',
      backHome: 'Back to home',
    },
  },
}
