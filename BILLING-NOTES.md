# WorkCoPilot billing (Stripe Checkout) - operator setup

This branch (`feat-billing`) adds Stripe Checkout subscriptions, free self
signup, and subscription gating for the service actions. The code is complete
and guarded, but two things must be done in the deploy environment before
billing goes live. Until then the app runs normally: signup and the dashboard
work, and the "use the service" actions show a clear "choose a plan" message
instead of crashing.

## 1. Install the Stripe package

The `stripe` dependency was added to `package.json`. Install it in the deploy
tree (it is loaded lazily, so a missing package never crashes the server, it
just means checkout returns a 503 until installed):

    npm install stripe

## 2. Set the environment variables

Add these to `.env` (or the service unit). None are required to boot; billing
simply stays off until the secret key and price ids are present.

    STRIPE_SECRET_KEY=sk_live_...          # or sk_test_... while testing
    STRIPE_WEBHOOK_SECRET=whsec_...        # from the webhook endpoint (step 3)
    STRIPE_PRICE_BASIC=price_...           # price id of the Basic monthly plan
    STRIPE_PRICE_ADVANCED=price_...        # price id of the Advanced monthly plan
    STRIPE_PRICE_PREMIUM=price_...         # price id of the Premium monthly plan

`WORK_PUBLIC_URL` (already in `.env.example`) sets the base for the Checkout
return URLs. When unset it defaults to `https://admireveda.com`, giving:

    success_url = https://admireveda.com/work?checkout=success
    cancel_url  = https://admireveda.com/#pricing

## 3. Stripe Dashboard setup

1. Products and prices: create three recurring (monthly) products, one per plan
   (Basic, Advanced, Premium). Copy each price id into the env vars above. Match
   the amounts to the pricing shown on the site (superadmin can edit the
   displayed pricing under the admin console; the amounts customers are actually
   charged are whatever these Stripe prices say, so keep them in sync).
2. Webhook endpoint: add an endpoint pointing at

       https://admireveda.com/api/work/stripe/webhook

   Subscribe it to at least these events:

       checkout.session.completed
       customer.subscription.updated
       customer.subscription.deleted

   Copy the endpoint's signing secret into `STRIPE_WEBHOOK_SECRET`.

The webhook is mounted on the raw request body (before the JSON parser) so the
signature verifies correctly. It is best effort and logged: a malformed or
unverified event is rejected without affecting anything else.

## How it behaves

- Free signup (`/api/work/signup`) still gives full dashboard access. Viewing,
  `/me` and signup are never gated.
- The service actions are gated: creating a session (`POST /api/work/sessions`)
  and the guidance calls (`/plan`, `/watch`, `/ask`, `/howto`). Without a live
  plan they return `402 { needsSubscription: true }`, and the dashboard shows a
  "Choose a plan to start" panel.
- A user is allowed to use the service when they belong to a company (the
  company pays; seats are respected only when a positive seat count is set) OR
  their personal subscription status is `trialing` or `active`.
- On returning from Checkout (`/work?checkout=success`) the dashboard refreshes
  so the new plan shows, then clears the query.

## Testing with Stripe test mode

Use `sk_test_...` keys, test price ids, and the Stripe CLI to forward webhooks:

    stripe listen --forward-to localhost:4444/api/work/stripe/webhook

Pay with Stripe's test card `4242 4242 4242 4242`, any future expiry and any
CVC. The subscription should flip to `active` and the gate should open.

---

# What this `feat-billing2` branch adds

The Checkout + gating above still works unchanged. This branch completes the
billing system: configure Stripe from the UI, invoices, self-serve manage and
cancel, superadmin refund and cancel, and the full automatic lifecycle.

`npm install stripe` is still required on the server to actually call Stripe.
Everything stays guarded: with no key or no package, every billing route returns
a clear 503 and the app runs normally without the paywall.

## 1. Configure Stripe from the admin console (no env edit needed)

The Stripe config now lives in the database (`db.billing`) and can be set
entirely from the admin console, so a fresh deploy needs no `.env` change.

- Open the WorkCoPilot admin console and pick the new **Billing** section
  (superadmin only).
- Paste the **secret key**, the **webhook signing secret**, and the three plan
  **price ids** (Basic, Advanced, Premium). An optional **publishable key** field
  is stored for any future in-page card form.
- The two secrets are **write-only**: once saved they are never shown back, and
  leaving a field blank keeps whatever is stored. Price ids are plain text and a
  blank value clears them.
- A **Billing on/off** toggle lets you pause store-held billing without deleting
  the keys. When off, the stored keys are ignored (any env vars still apply).
- The page shows configured / not-configured status for each field and a
  reminder of the webhook URL `https://admireveda.com/api/work/stripe/webhook`
  with a copy button.

Resolution order: **store first, environment variable fallback.** A value set in
the console takes priority; an operator who prefers env vars still works. The
subscription gate treats billing as "configured" when a usable secret key exists
from either source.

New endpoints: `GET /api/work/admin/billing` (returns booleans + ids only, never
a secret) and `POST /api/work/admin/billing` (superadmin; writes config).

## 2. Invoices (dashboard)

`GET /api/work/invoices` (signed-in user) lists the account's Stripe invoices
(`stripe.invoices.list` by customer): amount, status, date, plus the hosted
invoice URL and the invoice PDF link. The dashboard shows them in a **Billing**
panel with **View** and **PDF** links. No Stripe customer yet (never checked
out) returns an empty list, not an error.

Superadmin: `GET /api/work/admin/users/:id/invoices` views any user's invoices.

## 3. Self-serve manage and cancel (Stripe Customer Portal)

`POST /api/work/billing/portal` creates a Stripe Customer Portal session for the
signed-in user and returns `{ url }`. The dashboard **Manage billing** button
redirects there, where the user can update their card, change or cancel their
plan, and download invoices. The portal returns them to `/work`.

(Configure the portal once in the Stripe dashboard under Settings > Billing >
Customer portal: choose what customers may do, for example cancel and update
payment method.)

## 4. Superadmin refund and cancel

From the admin console **Users** section, each row has two billing actions
(superadmin only, each asks for confirmation first):

- **Refund last** - `POST /api/work/admin/users/:id/refund`. With no id in the
  body it refunds the account's most recent charge (`stripe.charges.list` then
  `stripe.refunds.create`). A `paymentIntentId` or `chargeId` in the body refunds
  that specific one instead.
- **Cancel sub** - `POST /api/work/admin/users/:id/cancel-subscription`. Cancels
  immediately (`stripe.subscriptions.cancel`) and sets the stored status to
  `canceled`. Pass `{ atPeriodEnd: true }` to instead set
  `cancel_at_period_end` so it runs to the end of the paid period.

Both return a clear 503 when Stripe is not configured.

## 5. Automatic blocks (full lifecycle)

The webhook now handles these events and `userCanUseService` (which allows only
`trialing` / `active` / `comp`, plus company members) does the blocking for free:

    checkout.session.completed        -> active / trialing   (service unlocks)
    customer.subscription.updated     -> mapped status        (active, trialing, past_due, canceled)
    invoice.payment_failed            -> past_due             (service blocks)
    customer.subscription.deleted     -> canceled             (service blocks)

Lifecycle: checkout -> active -> (failed renewal) past_due -> (fixed) active
again, or -> canceled on cancel / expiry -> blocked. Add `invoice.payment_failed`
to the webhook's event subscriptions in the Stripe dashboard (alongside the three
events listed in step 3 above) so past_due is applied automatically.
