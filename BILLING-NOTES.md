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
