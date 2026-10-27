# Subscribe onboarding: create account, verify email, pay, welcome

Flow: pricing plan **Start** -> `/workcopilot/signup?plan=<id>&cycle=<monthly|annual>`
-> create account (Google / Microsoft / email + password) -> `/workcopilot/signup/verify`
(six-digit emailed code) -> `/workcopilot/signup/pay` (Stripe Checkout) -> server-side
confirm -> `/workcopilot/signup/welcome` -> Get Started (authenticator gate) -> `/work`.

The server state (`GET /api/work/onboarding/state`) decides which step renders; the URL only
mirrors it. A refresh, the back button, a closed browser or a provider redirect lands on the
right step and never re-runs a finished one.

## Where things live

| Concern | File |
|---|---|
| Routes `/api/work/onboarding/*`, social hooks, confirm | `server/onboarding.js` |
| Per-account record (`emailVerified`, `onboarding{plan,cycle,checkoutSessionId}`), codes | `server/onboarding_store.js` (factory wired in `server/store.js`) |
| Code policy (6 digits, 10 min, 5 attempts, 45 s cooldown, 6 per hour, salted hash) | `server/email_otp.js` |
| Shared Stripe pieces: checkout params, `applyCheckoutSession` (webhook + confirm) | `server/billing_checkout.js` |
| `createSubscriptionCheckout` (prices, annual rule, affiliate trial, promo codes) | `server/billing.js` |
| Social start/callback carrying `?flow=onboarding&plan=&cycle=` | `server/social.js` -> `resolveSocialAccount` / `finishSocialOnboarding` |
| Email template `verify_email` (admin-editable) | `server/email_templates.js` |
| Screens | `src/pages/onboarding/*` (host `OnboardingPage.jsx`) |
| Copy | `src/i18n/locales/en/onboarding.js` (namespace `onboarding`) |

## Identity rules (why the account lookups differ)

* `store.findUserByVerifiedLogin(email)` is the only lookup that may BIND a session, a social
  login or a payment to an account by email: exact username for a password login, a contact
  email only when `emailVerified === true`, an `ssoEmail` always (the IdP proved it).
* `store.findUserByLogin(email)` (broad, includes unverified addresses) answers "does any
  account use this address" (duplicate prevention) and routes mail to the account's own
  address (forgot password). It never selects an account for sign-in.
* A classic sign-up that merely typed an address is never linked to a social login and never
  shadowed; its owner signs in with the password or resets it. A consumed reset link marks the
  address verified (`POST /api/work/password/set`).
* A company SSO account (`ssoEmail`) signs in through its IdP only, on every path.

## Payment truth

* Access is granted only by `store.setSubscription`, reached through
  `applyCheckoutSession` from (a) the signed webhook `checkout.session.completed` and
  (b) `POST /api/work/onboarding/confirm`, which retrieves the Checkout Session from Stripe
  (`expand: subscription`), checks `client_reference_id` is this account, and requires
  `payment_status` paid / no_payment_required. The browser redirect is only a hint.
* Both are idempotent; the owner "new subscription" alert fires once (guarded on the prior
  status). The client polls confirm every 3 s for about a minute, then shows "being
  processed" with Check again.
* One payable Checkout Session per account: an open one is reused; a replaced one (plan
  changed) is expired at Stripe before a new one is created.
* An account with an active plan (or a company seat) is never sent to checkout
  (`409 alreadySubscribed`).

## Stripe dashboard / environment

No new Stripe settings. The existing webhook endpoint `<site>/api/work/stripe/webhook`
and the existing price ids (store first, then `STRIPE_PRICE_*` / `STRIPE_PRICE_*_ANNUAL`)
are reused. The new return URLs are built from `WORK_PUBLIC_URL`:

* success: `<WORK_PUBLIC_URL>/workcopilot/signup/pay?checkout=success&session_id={CHECKOUT_SESSION_ID}`
* cancel: `<WORK_PUBLIC_URL>/workcopilot/signup/pay?checkout=cancel`

Stripe test mode: use the store's `test` bundle (admin console) or a `sk_test_` key in env;
`4242 4242 4242 4242` for a successful card, `4000 0000 0000 0002` for a decline.

## Google / Microsoft

Same redirect URI as before (`WORK_SOCIAL_REDIRECT_URI`, else `<origin>/api/work/social/callback`);
nothing to change at the providers. The subscribe flow only adds query parameters to the
start URL.

## Email

Codes go through the existing SMTP configuration (`sendTemplate('verify_email', ...)`).
Local development without SMTP: set `WORK_EMAIL_SINK_FILE=<path>` and every templated email
is also appended there as JSON (ignored when `WORK_HOSTED=1` or `NODE_ENV=production`).

## Tests

```
node --test server/email_otp.test.mjs server/billing_checkout.test.mjs \
  server/onboarding_flow.test.mjs server/onboarding_checkout.test.mjs server/onboarding_mfa.test.mjs
```

`onboarding_flow` boots the real app (MFA off) and drives signup -> code from the sink ->
resume / change email / reset link; `onboarding_checkout` injects a fake Stripe client
(reuse, expire, foreign session, open / paid / incomplete, webhook replay);
`onboarding_mfa` runs the authenticator gate on entry and the social resolver rules.
