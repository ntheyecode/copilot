# WorkCoPilot - Production Stripe setup

This matches the billing code exactly (server/billing.js + Admin > Billing). Do
it all with **Test mode OFF** (the toggle in the top-right of the Stripe
Dashboard) so everything is created in your **live** account.

## What the app needs from Stripe

| Thing | How many | Where it goes |
|---|---|---|
| Secret key (`sk_live_...`) | 1 | Admin > Billing > Secret key |
| Webhook signing secret (`whsec_...`) | 1 | Admin > Billing > Webhook signing secret |
| Publishable key (`pk_live_...`) | 1 (optional) | Admin > Billing > Publishable key |
| Monthly plan prices | 3 (Basic/Advanced/Premium) | Admin > Billing > Basic/Advanced/Premium |
| Annual plan prices | 3 (Basic/Advanced/Premium) | Admin > Billing > the three Annual fields |
| Additional hours | 0 Stripe products | priced from Admin > Pricing (dynamic, see below) |
| Additional images | 0 Stripe products | priced from Admin > Pricing (dynamic, see below) |

## Step 1 - Get your secret key
Stripe Dashboard > Developers > API keys. Copy the **Secret key** (`sk_live_...`).
The **Publishable key** (`pk_live_...`) is optional - checkout is a server-side
redirect, so the app does not need it client-side, but you can paste it too.

## Step 2 - Create the plan products and prices (6 prices)
Create **3 Products**, each with **two recurring prices** (one monthly, one
yearly). For each price, open it and copy its **Price ID** (`price_...`).

> The amounts must equal what you charge users. The plan amounts users see come
> from **Admin > Pricing**, so set each Stripe price to the same number. Annual =
> your 20%-off yearly amount.

1. **Product: WorkCoPilot Basic**
   - Add price > Recurring > **Monthly** > amount = Basic monthly (from Admin > Pricing) -> copy id -> this is **Basic**
   - Add price > Recurring > **Yearly** > amount = Basic yearly (monthly x 12 x 0.8) -> copy id -> this is **Basic (annual)**
2. **Product: WorkCoPilot Advanced** - same, monthly + yearly -> **Advanced** / **Advanced (annual)**
3. **Product: WorkCoPilot Premium** - same, monthly + yearly -> **Premium** / **Premium (annual)**

You now have **6 Price IDs**.

## Step 3 - Create the webhook
Stripe Dashboard > Developers > Webhooks > **Add endpoint**.
- **Endpoint URL:** `https://admireveda.com/api/work/stripe/webhook`
- **Events to send** (select these):
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`
  - `invoice.paid` (recommended - used for payment-success receipts)
- Add endpoint, then copy the **Signing secret** (`whsec_...`).

## Step 4 - Enter everything in Admin > Billing
- Secret key: `sk_live_...`
- Webhook signing secret: `whsec_...`
- Publishable key: `pk_live_...` (optional)
- Basic / Advanced / Premium = the 3 **monthly** price ids
- The three Annual fields = the 3 **yearly** price ids
- **Save**, then click **Test connection** - it validates the key and all 6
  prices against Stripe live and shows each price's amount + interval.

## Step 5 - Additional hours and images
**No Stripe products needed.** These are charged **dynamically** at the per-hour
and per-image rates set in **Admin > Pricing**, as a one-time Stripe charge, and
credited to the account automatically. You manage those prices in one place
(Admin > Pricing); Stripe just processes the amount. (Purchase receipts are
emailed automatically once SMTP is configured.)

## Notes
- Keep Stripe plan amounts in sync with **Admin > Pricing** - that is what users
  see at checkout time, and Test connection will flag a mismatch in interval.
- Secrets are **write-only** in Admin > Billing: they are never shown back;
  leaving a field blank keeps the stored value.
- Annual checkout only goes live once **all three** annual price ids are set;
  until then, annual picks route to sign-up (no broken checkout).
- The success URL is `/work?checkout=success`; cancel returns to the pricing
  section. These are handled for you.
