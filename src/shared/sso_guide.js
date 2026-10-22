// ---------------------------------------------------------------------------
// WorkCoPilot SSO setup guide - SINGLE SOURCE of the step-by-step content.
// ---------------------------------------------------------------------------
// Consumed by BOTH the in-app help (src/pages/workadmin/WorkCompanyAdmin.jsx)
// AND the downloadable PDFs (scripts/gen-sso-guides.mjs). Edit the steps here
// once and both surfaces stay in sync. Plain data only, no imports, so a Node
// script and the Vite client can each import it. No em dashes; American English.
// ---------------------------------------------------------------------------

export const SSO_CALLBACK_PATH = '/api/work/sso/callback'
// Used by the PDFs (which have no browser origin). The in-app help uses the
// live window.location.origin instead, so the admin always sees the real host.
export const SSO_PUBLIC_ORIGIN = 'https://admireveda.com'
export const SSO_CALLBACK_URL = SSO_PUBLIC_ORIGIN + SSO_CALLBACK_PATH

// How the whole thing works, in plain words.
export const SSO_OVERVIEW = [
  'WorkCoPilot single sign-on lets your people sign in with the work identity they already have (Google, Microsoft or Okta) instead of a separate WorkCoPilot password.',
  'It uses OpenID Connect (the standard behind "Sign in with..."). You register WorkCoPilot once inside your identity provider, paste four values into WorkCoPilot, and you are done.',
  'You do NOT create accounts for your people in WorkCoPilot. The first time someone signs in through your provider, their WorkCoPilot account is created automatically as a member. This is called just-in-time provisioning.',
]

// Who does what. This is the part most people get wrong, so it is explicit.
export const SSO_ROLES = {
  title: 'Who creates users, and who assigns roles',
  points: [
    ['You do not pre-create SSO users', 'The first successful sign-in creates the person automatically as a member. Their email is the stable key, so the same person always maps to the same account.'],
    ['Access is controlled in your identity provider', 'Who is allowed to use WorkCoPilot at all is decided where you register the app (Google, Microsoft or Okta) by assigning users or groups to it. Remove someone there and they can no longer sign in. WorkCoPilot trusts your provider to say who is who.'],
    ['Roles inside WorkCoPilot are member or company admin', 'Everyone starts as a member. After a person has signed in once, you promote trusted people to company admin on the Team tab. Company admins can manage SSO, people, AI keys, governance and billing.'],
    ['Plan tier is set per person on the Team tab', 'After they appear in the roster you can set each person to the plan tier you want.'],
    ['Seats are enforced', 'If you set a seat limit, sign-in is blocked once every seat is used, with a message telling the person to contact their administrator. A seat limit of 0 means unlimited.'],
    ['SSO accounts have no WorkCoPilot password', 'They always sign in through your provider. There is nothing for them to forget or reset here.'],
  ],
}

// What the end user does. Short and the same for every provider.
export const SSO_USER_SIGNIN = {
  title: 'How your people sign in',
  steps: [
    'On the WorkCoPilot sign-in page they click "Sign in with your company (SSO)".',
    'They enter your company email domain, for example acme.com.',
    'They are sent to your identity provider and sign in there with their work account.',
    'They land in WorkCoPilot. The first time, their member account is created automatically.',
  ],
}

// The one value every provider needs.
export const SSO_REDIRECT_NOTE = [
  'Every provider asks for a redirect URI (sometimes called a callback or reply URL). This is where the provider sends the browser back after sign-in. It must match exactly, or the provider refuses the sign-in.',
  'Register this exact redirect URI with your provider:',
]

export const SSO_PROVIDERS = [
  {
    id: 'google',
    name: 'Google',
    issuer: 'https://accounts.google.com',
    issuerNote: 'Enter this exact issuer in WorkCoPilot. It is the same for every Google and Google Workspace organization.',
    console: 'https://console.cloud.google.com/apis/credentials',
    steps: [
      ['Open the Google Cloud Console', 'Sign in at console.cloud.google.com with an account that can manage your organization. Select an existing project or create one named WorkCoPilot.'],
      ['Configure the OAuth consent screen', 'Go to APIs and Services, then OAuth consent screen. Choose Internal so only your Workspace users can use it, fill in the app name and a support email, and save.'],
      ['Create an OAuth client ID', 'Go to APIs and Services, then Credentials. Click Create credentials, then OAuth client ID. For Application type choose Web application and name it WorkCoPilot.'],
      ['Add the redirect URI', 'Under Authorized redirect URIs add the WorkCoPilot callback URL exactly as shown above, then click Create.'],
      ['Copy the client ID and secret', 'Google shows your Client ID and Client secret. Copy both now.'],
      ['Enter the values in WorkCoPilot', 'In Company, then Single sign-on: set Provider to Google, Issuer to https://accounts.google.com, paste the Client ID and Client secret, set Email domain to your Workspace domain (for example acme.com), and save.'],
    ],
    scenario: {
      title: 'Scenario: a new hire joins acme.com',
      body: 'Your IT team adds the new person to Google Workspace as they normally would. There is nothing to do in WorkCoPilot. The first time the new hire clicks Sign in with your company and enters acme.com, Google authenticates them and WorkCoPilot creates their member account automatically. If you want them to be a company admin, promote them on the Team tab after that first sign-in.',
    },
  },
  {
    id: 'microsoft',
    name: 'Microsoft (Entra ID)',
    issuer: 'https://login.microsoftonline.com/<TENANT_ID>/v2.0',
    issuerNote: 'Replace <TENANT_ID> with your Directory (tenant) ID from the app Overview page. The /v2.0 on the end is required.',
    console: 'https://entra.microsoft.com',
    steps: [
      ['Open the Microsoft Entra admin center', 'Sign in at entra.microsoft.com (or the Azure portal) as an admin who can register applications.'],
      ['Register a new application', 'Go to App registrations, then New registration. Name it WorkCoPilot. For supported account types choose Accounts in this organizational directory only (single tenant).'],
      ['Add the redirect URI', 'Under Redirect URI choose platform Web and enter the WorkCoPilot callback URL exactly as shown above. Click Register.'],
      ['Copy the client and tenant IDs', 'On the Overview page copy the Application (client) ID and the Directory (tenant) ID.'],
      ['Create a client secret', 'Go to Certificates and secrets, then New client secret. Add a description and an expiry, create it, and copy the secret VALUE immediately. It is shown only once.'],
      ['Choose who can sign in', 'Go to Enterprise applications, open WorkCoPilot, then Properties and set Assignment required to Yes. Under Users and groups, assign the people or groups allowed to use WorkCoPilot.'],
      ['Enter the values in WorkCoPilot', 'In Company, then Single sign-on: set Provider to Microsoft, Issuer to https://login.microsoftonline.com/<TENANT_ID>/v2.0 with your tenant id, paste the Client ID and Client secret, set Email domain, and save.'],
    ],
    scenario: {
      title: 'Scenario: only the Sales group should get WorkCoPilot',
      body: 'In Enterprise applications, set Assignment required to Yes and assign only the Sales group under Users and groups. Everyone outside Sales is refused by Microsoft before they ever reach WorkCoPilot. When someone moves out of Sales and you remove them from the group, their access stops at the next sign-in. No change is needed inside WorkCoPilot.',
    },
  },
  {
    id: 'okta',
    name: 'Okta',
    issuer: 'https://<your-org>.okta.com',
    issuerNote: 'Use your Okta org URL, for example https://acme.okta.com. If you use a custom authorization server, use https://<your-org>.okta.com/oauth2/<auth-server-id> (Security, then API, then Authorization Servers shows the exact Issuer).',
    console: 'https://login.okta.com',
    steps: [
      ['Open the Okta Admin Console', 'Sign in to your Okta org as an administrator.'],
      ['Create an app integration', 'Go to Applications, then Applications, then Create App Integration. Choose OIDC - OpenID Connect and application type Web Application. Click Next.'],
      ['Name it and set the grant type', 'Name the app WorkCoPilot. Make sure the Authorization Code grant type is selected.'],
      ['Add the redirect URI', 'Under Sign-in redirect URIs add the WorkCoPilot callback URL exactly as shown above. A sign-out redirect is optional.'],
      ['Choose who can use it', 'Under Assignments choose who can sign in: a specific group or everyone in your org. Save.'],
      ['Copy the client ID and secret', 'On the app General tab copy the Client ID and Client secret.'],
      ['Enter the values in WorkCoPilot', 'In Company, then Single sign-on: set Provider to Okta, Issuer to your org issuer (for example https://acme.okta.com), paste the Client ID and Client secret, set Email domain, and save.'],
    ],
    scenario: {
      title: 'Scenario: give access to one department only',
      body: 'Create an Okta group for the people who should have WorkCoPilot and assign only that group to the app under Assignments. Add or remove people from the group to grant or revoke access. Note that WorkCoPilot routes sign-ins by the email domain a person types on the login page, so everyone should sign in with your main company domain.',
    },
  },
]

// Common problems and the fix. Shared across providers.
export const SSO_TROUBLESHOOTING = {
  title: 'If sign-in does not work',
  points: [
    ['Redirect URI mismatch', 'The provider says the redirect URI does not match. Make sure the URI registered at the provider is exactly the callback URL above, including https and no trailing slash.'],
    ['Wrong issuer', 'WorkCoPilot cannot read the provider settings. Check the Issuer is a full https URL. For Microsoft it must include your tenant id and end in /v2.0.'],
    ['No email shared', 'The provider did not share an email address. Make sure the email and profile scopes are allowed (they are requested by default) and that the account has an email.'],
    ['Person is not assigned', 'The provider refuses the sign-in. In Microsoft or Okta, confirm the person (or their group) is assigned to the WorkCoPilot app.'],
    ['All seats used', 'Sign-in is blocked because every seat is taken. Raise the seat limit, or set it to 0 for unlimited.'],
    ['Secret changed or expired', 'If you rotated the client secret at the provider, paste the new secret in WorkCoPilot and save. Leaving the secret field blank keeps the stored one.'],
  ],
}
