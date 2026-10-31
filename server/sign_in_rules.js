// ---------------------------------------------------------------------------
// Which sign-in methods an ACCOUNT may use: the one rule, by account type.
// ---------------------------------------------------------------------------
// Pure (no store, no Express): every sign-in path asks here, so a new path
// cannot forget a rule (class fix, SUPREME RULE II).
//
//   Company accounts (any account in a company tenant), in EVERY edition:
//     * never social sign-in or social sign-up (Google, Microsoft, Facebook);
//     * a password plus an authenticator (TOTP), or the company's own single
//       sign-on (OIDC or SAML) when it is configured;
//     * only the company's single sign-on when AdmireVeda (the superadmin) has
//       set "single sign-on required" for that company.
//   Individuals keep social sign-in where the edition offers it (social_login),
//   which is the edition rule in edition.js socialLoginRefusal().
//
// A person whose email domain belongs to a company that signs in with single
// sign-on is that company's identity, so a first-time social sign-up with it
// is refused too (it would otherwise create a personal account beside the
// company's, outside the company's control).
// ---------------------------------------------------------------------------

export const COMPANY_SOCIAL_REFUSAL = 'Company accounts cannot use social sign-in. Sign in with your password and authenticator, or with your company (SSO).'
export const COMPANY_DOMAIN_SOCIAL_REFUSAL = 'This email belongs to a company that signs in with single sign-on. Use "Sign in with your company (SSO)".'
export const SSO_REQUIRED_REFUSAL = 'Your company requires single sign-on. Use "Sign in with your company (SSO)" and enter your company email domain.'

export function isCompanyAccount(user) {
  return !!(user && user.companyId)
}

// Social sign-in for an EXISTING account: null when allowed, else the message.
export function socialSignInRefusal(user) {
  if (isCompanyAccount(user) || (user && user.ssoEmail)) return COMPANY_SOCIAL_REFUSAL
  return null
}

// Social SIGN-UP of a new account for `email`: null when allowed, else the
// message. `companyForDomain(domain)` returns a company whose single sign-on
// claims that email domain, or null.
export function socialSignUpRefusal(email, companyForDomain) {
  const mail = String(email || '').trim().toLowerCase()
  const at = mail.lastIndexOf('@')
  if (at < 1) return null
  const domain = mail.slice(at + 1)
  if (domain && typeof companyForDomain === 'function' && companyForDomain(domain)) return COMPANY_DOMAIN_SOCIAL_REFUSAL
  return null
}

// Single sign-on (OIDC or SAML) for a resolved account: null when allowed,
// else the message. A turned-off account (by an administrator, or by the
// identity provider through SCIM) or a disabled company never signs in.
export function ssoAccountRefusal(user, company) {
  if (!user) return 'Single sign-on could not be completed.'
  if (user.disabled || user.scimDeletedAt) return 'This account has been turned off. Please contact your company administrator.'
  if (company && company.disabled) return 'This company account is disabled. Please contact your company administrator.'
  return null
}

// Password sign-in (the first step; the authenticator follows): null when
// allowed, else { status, body }. `company` is the account's company record
// (public shape is enough: it carries ssoRequired), or null.
export function passwordSignInRefusal(user, company) {
  if (!isCompanyAccount(user) || !company) return null
  if (company.ssoRequired) return { status: 403, body: { error: SSO_REQUIRED_REFUSAL, sso: true, ssoRequired: true } }
  return null
}
