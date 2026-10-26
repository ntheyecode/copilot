// English strings for the shared admin-console primitives (src/pages/workadmin/
// sections/_shared.jsx: Loading, ErrorBox, EmptyState, SavedTag, EditToggle,
// ReasonModal, StepUpGate, StepUpBanner, StepUpPrompt). Keyed under the `shared`
// namespace; the i18n loader deep-merges every en/*.js partial into the English
// base, so this file owns its own namespace and never collides with other i18n
// waves. Only each primitive's BUILT-IN DEFAULT copy lives here; text a caller
// passes as a prop is used unchanged and is not keyed.
export default {
  shared: {
    loading: 'Loading',
    errorGeneric: 'Something went wrong.',
    errorServer: 'WorkCoPilot had a problem. Please try again in a moment.',
    retry: 'Retry',
    emptyTitle: 'Nothing here yet',
    saved: 'Saved',
    edit: 'Edit',
    confirm: 'Confirm',
    delete: 'Delete',
    reasonPlaceholder: 'Reason (recorded in the audit trail)',
    reasonHint: 'A reason of at least 3 characters is required. It is kept in the audit trail.',
    cancel: 'Cancel',
    close: 'Close',
    stepUpPage: 'This page',
    locked: '{label} are locked',
    stepUpDesc: 'This is a critical page. Enter the 6-digit code from your authenticator to view and change it. It re-locks automatically after a few minutes of inactivity.',
    mfaEnrollFirst: 'Set up multi-factor authentication on your account first, then return here.',
    otpPlaceholder: '123456',
    verifyOpen: 'Verify & open',
    stepUpBannerLabel: 'Settings',
    mfaDisabled: 'MFA is disabled platform-wide - {label} are open.',
    verifiedCountdown: 'Verified with your authenticator - locks in {time}.',
    lockNow: 'Lock now',
    stepUpAction: 'This action',
    confirmItsYou: 'Confirm it’s you',
    stepUpActionDesc: '{label} needs a fresh authenticator code. Enter the 6-digit code from your app to continue.',
    verifyContinue: 'Verify & continue',
  },
}
