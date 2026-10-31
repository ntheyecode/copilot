// The commercial terms every surface computes from, in ONE place (pure data):
// the server (store.js MRR, the subscriber-health summary) and the SPA
// (src/pricingModel.js, which imports this file the way it imports the edition
// registry) read the same number, so a price shown on the site, a plan change
// and an MRR figure can never disagree. The server applies the same discount
// at checkout through the annual Stripe prices the operator configures.

// Annual billing: 20% off the monthly rate, shown as a per-month figure billed
// yearly; MRR of an annual subscriber = monthly * 12 * (1 - discount) / 12.
export const ANNUAL_DISCOUNT = 0.2
