// English strings for the set / reset password page (src/pages/WorkSetPassword.jsx),
// keyed under the `setPasswordPage` namespace. Reached from the emailed one-time
// link for both "welcome, set your password" and "forgot password".
// Interpolations: {name} = the account's username (rendered bold via t.rich).
// WorkCoPilot and AdmireVeda are never translated.
export default {
  setPasswordPage: {
    byBrand: 'by AdmireVeda',
    errors: {
      missingToken: 'This link is missing its token.',
      invalid: 'This link is invalid or has expired.',
      tooShort: 'Choose a password of at least 6 characters.',
      mismatch: 'The two passwords do not match.',
      setFailed: 'Could not set your password. The link may have expired.',
    },
    checking: 'Checking your link...',
    done: {
      title: 'Password set',
      body: 'Your password is ready. Sign in to get started.',
      signIn: 'Sign in',
    },
    expired: {
      title: 'Link expired',
      goToSignIn: 'Go to sign in',
    },
    form: {
      title: 'Set your password',
      forUser: 'for <b>{name}</b>',
      chooseBody: 'Choose a password to finish setting up your account.',
      newLabel: 'New password',
      newPlaceholder: 'At least 6 characters',
      hide: 'Hide',
      show: 'Show',
      confirmLabel: 'Confirm password',
      confirmPlaceholder: 'Re-enter it',
      submit: 'Set password',
      secure: 'Your password is encrypted and stored securely. We never see it in plain text.',
    },
    foot: 'Enterprise-grade security · AdmireVeda WorkCoPilot',
  },
}
