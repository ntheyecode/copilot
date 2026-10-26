// English strings for the SupportTickets surface (user + admin ticket console).
// Values are byte-identical to the former hardcoded English. Non-English locales
// fall back to this until translated.
export default {
  supportTickets: {
    cat: {
      feature: 'Feature request',
      bug: 'Report a bug',
      billing: 'Billing issue',
      access: 'Access issue',
      other: 'Something else',
    },
    status: {
      open: 'Open',
      answered: 'Answered',
      closed: 'Closed',
    },
    head: {
      title: 'Help & Support',
      blurb: 'Request a feature, report a bug, or get help with billing or access. We respond here.',
      newTicket: 'New ticket',
    },
    filters: {
      all: 'All',
    },
    loading: 'Loading...',
    emptyAdmin: 'No tickets yet.',
    emptyUser: 'No tickets yet. Open one and we will get back to you.',
    back: 'Back',
    form: {
      title: 'Open a ticket',
      aboutLabel: 'What is it about?',
      subjectLabel: 'Subject',
      subjectPlaceholder: 'A short summary',
      detailsLabel: 'Details',
      detailsPlaceholder: 'What do you need? Steps to reproduce a bug, the feature you want, or the billing/access problem.',
      cancel: 'Cancel',
      submit: 'Submit ticket',
    },
    errors: {
      open: 'Could not open that ticket.',
      needSubject: 'Add a subject and a short description.',
      create: 'Could not create the ticket.',
      send: 'Could not send.',
      update: 'Could not update.',
    },
    thread: {
      fromOpened: 'From <b>{username}</b> · opened {date}',
      noMessages: 'No messages yet.',
      support: 'Support',
      you: 'You',
      replyPlaceholderAdmin: 'Write a reply to the user...',
      replyPlaceholderUser: 'Add a message...',
      send: 'Send',
      close: 'Mark resolved & close',
      reopen: 'Reopen',
      delete: 'Delete ticket',
    },
    del: {
      title: 'Delete ticket',
      message: 'Permanently delete this support ticket and its thread. This cannot be undone.',
      confirm: 'Delete ticket',
    },
  },
}
