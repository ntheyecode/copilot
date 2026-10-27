// English strings for the superadmin "Social sign-in" page
// (src/pages/workadmin/sections/SocialSignIn.jsx): the PLATFORM Google /
// Microsoft / Facebook OAuth apps behind the public sign-in buttons. Deep-merged
// into the English base by src/i18n/index.jsx. Provider ids, URLs and API field
// names stay in code; only display text lives here.
export default {
  socialSignIn: {
    superadminOnly: 'Social sign-in apps are superadmin-only.',
    loading: 'Loading social sign-in',
    stepUpLabel: 'Saving a social sign-in app',

    title: 'Social sign-in (platform apps)',
    desc: 'The Google, Microsoft and Facebook apps behind the <b>Sign in with</b> buttons on the public sign-in page. These are <b>platform-level</b>: one app per provider, used by every customer and every company. They are not per-company settings. Secrets are stored server-side and never shown again.',
    callbackLabel: 'Redirect URL to register at each provider',
    callbackHint: 'Add this exact URL as an authorized redirect (callback) URI in each provider\'s app. Sign-in with that provider stays off until its client ID and secret are saved here.',
    copy: 'Copy',
    copied: 'Copied',

    appsTitle: 'Provider apps',
    appsDesc: 'Paste the client ID and client secret from each provider\'s developer console. Save applies at once; the public sign-in page shows the button as soon as an app is configured.',

    state: {
      configured: 'Configured',
      notSet: 'Not set',
    },
    clientIdLabel: 'Client ID',
    replaceClientId: 'Replace client ID',
    clientSecretLabel: 'Client secret',
    secretSetOnly: '(set-only, never shown)',
    pasteSecret: 'paste the client secret',
    tenantLabel: 'Tenant',
    tenantOptional: 'Tenant (optional)',
    tenantHint: 'Leave empty for any Microsoft account (common). Enter a tenant id to restrict sign-in to one organization.',
    setAt: 'Set {date}',
    save: 'Save',
    clear: 'Clear',
    confirmClear: 'Yes, clear this app',
    cancel: 'Cancel',

    providers: {
      google: {
        label: 'Google',
        blurb: 'OAuth 2.0 client of type Web application, from Google Cloud Console.',
        idHint: 'xxxx.apps.googleusercontent.com',
        where: 'Where to create the Google OAuth client',
      },
      microsoft: {
        label: 'Microsoft',
        blurb: 'App registration in Microsoft Entra ID (Azure), platform Web, any account type.',
        idHint: 'Application (client) ID',
        where: 'Where to register the Microsoft app',
      },
      facebook: {
        label: 'Facebook',
        blurb: 'Facebook Login product on a Meta for Developers app, in Live mode.',
        idHint: 'App ID',
        where: 'Where to create the Facebook app',
      },
    },
  },
}
