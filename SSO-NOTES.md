# WorkCoPilot single sign-on (OIDC) - operator setup

WorkCoPilot supports company single sign-on with Google, Microsoft (Entra) and
Okta using one standards-based flow (OpenID Connect, Authorization Code with
PKCE). A company admin or superadmin enters the provider details once, and
company members then sign in with their work identity.

Real identity-provider credentials (client id and client secret) are entered at
runtime by the company admin, so full end-to-end testing needs those values from
the provider. The flow below is what the operator configures.

## 1. Redirect URI (the one value every provider needs)

Register this exact redirect URI with every provider:

    https://admireveda.com/api/work/sso/callback

The server builds this URL in `callbackUrl(req)` (server/sso.js). It can be
overridden with environment variables if the public origin ever changes:

- `WORK_SSO_REDIRECT_URI` - the full callback URL, wins outright.
- `WORK_PUBLIC_ORIGIN` - e.g. `https://admireveda.com`; the callback path is
  appended. Falls back to deriving the origin from the request for local dev.

The redirect URI registered at the provider must match exactly, or the provider
will refuse the sign-in.

## 2. Per-provider setup

Create an OIDC "web application" credential with each provider. Use the redirect
URI above. Then in the WorkCoPilot admin console (Companies -> open a company ->
Single sign-on) enter the Provider, Issuer, Client ID, Client secret and the
company Email domain.

### Google
- Console: https://console.cloud.google.com/apis/credentials
- Create an "OAuth client ID" of type "Web application".
- Authorized redirect URI: the URI from step 1.
- Issuer to enter in WorkCoPilot: `https://accounts.google.com`

### Microsoft (Entra ID)
- Portal: Azure -> App registrations -> New registration.
- Redirect URI (type Web): the URI from step 1.
- Create a client secret under "Certificates & secrets".
- Issuer to enter in WorkCoPilot (put your tenant id in the path):
  `https://login.microsoftonline.com/<TENANT_ID>/v2.0`

### Okta
- Admin -> Applications -> Create App Integration -> OIDC, Web Application.
- Sign-in redirect URI: the URI from step 1.
- Grant type: Authorization Code.
- Issuer to enter in WorkCoPilot: your org issuer, e.g.
  `https://<your-org>.okta.com` (or a custom authorization-server issuer such as
  `https://<your-org>.okta.com/oauth2/<auth-server-id>`).

## 3. How a user signs in

1. On the WorkCoPilot sign-in page the user clicks
   "Sign in with your company (SSO)" and enters their company email domain
   (for example `acme.com`).
2. The server resolves that domain to the company and redirects the browser to
   the company's identity provider.
3. After the user authenticates, the provider returns to the callback. The
   server verifies the token, finds or creates the user as a company member, and
   signs them in to `/work`.

## 4. Provisioning and seats

- A member is created automatically on first SSO sign-in. The username is the
  email local part (deduped if already taken); the email is stored as the stable
  key so the same person maps to the same account next time.
- SSO users have no usable password: they can only sign in through their
  provider.
- If the company has a seat limit set (Seats > 0), sign-in is blocked once all
  seats are used, with a clear message to contact the administrator. Seats = 0
  means unlimited.

## 5. Security notes

- Authorization Code + PKCE (S256). State and the PKCE verifier are held in the
  session and checked on callback.
- The id_token is verified: issuer, audience, expiry and nonce are always
  checked. The RS256 signature is verified against the provider's published JWKS
  when reachable; a signature mismatch always rejects the sign-in, while an
  unreachable JWKS degrades to the claim checks rather than locking everyone out.
- The client secret is stored server-side only. The admin APIs and the company
  objects sent to the browser never include it (it is write-only in the UI:
  leave the secret field blank when updating to keep the stored one).

## 6. What cannot be tested here

Without real provider client credentials the full browser round trip cannot be
exercised in this worktree. The store helpers, the authorize-URL builder, PKCE,
and the id_token claim checks are covered by an in-memory smoke test during
development. End-to-end verification needs a real Google/Microsoft/Okta app and
the production redirect URI registered with it.
