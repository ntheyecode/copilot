// English strings for the superadmin SMTP / Email settings page
// (src/pages/workadmin/sections/Email.jsx). One partial per i18n wave,
// deep-merged into the English base by src/i18n/index.jsx. Keys live under the
// `emailAdmin` namespace. SMTP/provider field names and enum values (starttls,
// tls, none) are never relocated here - only human-readable display text.
export default {
  emailAdmin: {
    checkingAccess: 'Checking access',
    gateLabel: 'SMTP settings',
    loading: 'Loading SMTP settings',

    // Security display labels (collapsed record view)
    sec: {
      starttls: 'STARTTLS (587)',
      tls: 'TLS / SSL (465)',
      none: 'None',
    },

    cred: {
      title: 'SMTP / SES credentials',
      desc: 'The outbound-email account used to deliver reports. For AWS SES, use the <b>SMTP credentials</b> SES issues (not your AWS access keys). The From address must be a verified SES identity.',
    },

    // Collapsed record view rows
    rec: {
      host: 'SMTP host',
      port: 'Port',
      username: 'Username',
      password: 'Password',
      passwordSet: '•••••••• (set)',
      passwordNotSet: 'not set',
      from: 'From',
      updated: 'Updated',
    },
    noneSaved: 'No SMTP settings saved yet.',
    clickEdit: 'Click Edit to configure.',

    // Edit form
    form: {
      host: 'SMTP host',
      hostPlaceholder: 'email-smtp.us-east-1.amazonaws.com',
      port: 'Port',
      portHint: '587 = STARTTLS, 465 = TLS',
      security: 'Security',
      secStarttls: 'STARTTLS (587)',
      secTls: 'TLS / SSL (465)',
      secNone: 'None (loopback relay only)',
      username: 'SMTP username',
      password: 'SMTP password',
      passwordKeepHint: '(set - leave blank to keep)',
      passwordPlaceholderSet: '••••••••',
      passwordPlaceholder: 'Enter SMTP password',
      fromEmail: 'From email',
      fromEmailPlaceholder: 'no-reply@admireveda.com',
      fromEmailHint: 'Must be a verified SES identity',
      fromName: 'From name',
    },
    save: 'Save',
    cancel: 'Cancel',

    // Send-a-test panel
    test: {
      title: 'Send a test email',
      desc: 'Uses the <b>saved</b> settings above. Save first, then send a test to confirm the credentials work end to end before relying on report delivery.',
      recipient: 'Recipient',
      recipientPlaceholder: 'defaults to the From address',
      send: 'Send test',
      sent: 'Test email sent to {to}. Check the inbox (and spam).',
      failed: 'Could not send the test email.',
    },
  },
}
