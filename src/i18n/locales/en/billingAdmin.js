// English keys for src/pages/workadmin/sections/Billing.jsx (superadmin Stripe
// billing configuration). Auto-merged into the English catalog by
// src/i18n/index.jsx (import.meta.glob over locales/en/*.js). Namespace: billingAdmin.
export default {
  billingAdmin: {
    loading: 'Loading billing configuration',
    stepUpLabel: 'Saving billing keys',
    readOnlyNote: 'Only a superadmin can change the billing configuration. The current state is shown below.',

    // ---- plan names (ids are Stripe/plan field keys and stay as-is) ----
    plans: {
      lite: 'Lite',
      basic: 'Basic',
      advanced: 'Advanced',
      premium: 'Premium',
    },

    // ---- Stripe configuration panel ----
    config: {
      title: 'Stripe configuration',
      descEditing: 'Paste your Stripe keys and the three plan ids here. Each plan takes a price id (price_...) or a product id (prod_...), whichever you copy from Stripe. The secret key and webhook secret are write-only: once saved they are never shown again, and leaving them blank keeps the stored value. Values set here take priority over environment variables.',
      descSaved: 'Your Stripe keys and plan ids are saved. Secrets are never shown back. Use Test connection to confirm they work, or Edit to change them.',
    },

    // ---- payment mode (live / test) ----
    mode: {
      heading: 'Payment mode: {mode}',
      testLabel: 'TEST (no real charges)',
      liveLabel: 'LIVE (real charges)',
      liveButton: 'LIVE',
      testButton: 'TEST',
      testWord: 'test',
      liveWord: 'live',
      switchNote: 'Switching applies immediately. Checkout, the webhook and Test connection all use the <b>{mode}</b> keys. Each mode keeps its own keys + price ids; fill them in separately under Edit.',
    },

    // ---- saved summary (read-only record) ----
    summary: {
      secretKey: 'Secret key',
      webhookSecret: 'Webhook signing secret',
      litePlan: 'Lite plan',
      basicPlan: 'Basic plan',
      advancedPlan: 'Advanced plan',
      premiumPlan: 'Premium plan',
      annual: 'Annual billing (20% off)',
      publishableKey: 'Publishable key',
      billing: 'Billing',
      setHidden: 'Set, hidden',
      notSet: 'Not set',
      annualLive: 'Live, core annual ids set',
      annualNotSet: 'Not set up (annual picks route to sign-up)',
      notSetOptional: 'Not set (optional)',
      on: 'On',
      off: 'Off',
      testConnection: 'Test connection',
    },

    // ---- test connection result ----
    test: {
      okTitle: 'Connected to Stripe. Checkout is ready.',
      incompleteTitle: 'Connected, but something is incomplete.',
      account: 'Account: <b>{account}</b>',
      unknown: 'unknown',
      liveMode: 'LIVE mode',
      testMode: 'TEST mode',
      webhookSecret: 'Webhook secret {state}',
      set: 'set',
      missing: 'missing',
      notSet: 'not set',
      annualTitle: 'Annual (20% off)',
      annualReady: 'the core yearly prices valid, annual checkout live',
      annualNotReady: 'not fully set up, annual picks route to sign-up',
      planAnnual: '{name} annual:',
    },

    // ---- edit form ----
    form: {
      secretKey: 'Secret key',
      webhookSecret: 'Webhook signing secret',
      set: '(set)',
      notSet: '(not set)',
      secretKeySetPlaceholder: 'Set. Type a new key to replace it.',
      secretKeyPlaceholder: 'sk_live_... or sk_test_...',
      secretKeyHint: 'Server side only. Never leaves the server and is never shown back.',
      webhookSetPlaceholder: 'Set. Type a new secret to replace it.',
      webhookPlaceholder: 'whsec_...',
      webhookHint: 'From the webhook endpoint you create in Stripe (see below).',
      litePlanId: 'Lite plan price or product id',
      basicPlanId: 'Basic plan price or product id',
      advancedPlanId: 'Advanced plan price or product id',
      premiumPlanId: 'Premium plan price or product id',
      planIdPlaceholder: 'price_... or prod_...',
      annualDesc: 'Annual plan ids (optional, 20% off). Create a yearly recurring price (interval = year) for each plan in Stripe and paste its id here. Annual checkout goes live when the three core plans (Basic, Advanced, Premium) are set; Lite annual is optional; until then an annual pick on the site shows the discounted price and routes to sign-up.',
      litePlanAnnualId: 'Lite plan, annual price or product id',
      basicPlanAnnualId: 'Basic plan, annual price or product id',
      advancedPlanAnnualId: 'Advanced plan, annual price or product id',
      premiumPlanAnnualId: 'Premium plan, annual price or product id',
      annualIdPlaceholder: 'price_... (yearly)',
      publishableKey: 'Publishable key (optional)',
      publishableKeyPlaceholder: 'pk_live_... or pk_test_...',
      publishableKeyHint: 'Not required for Checkout. Stored for any future in-page card form.',
      billingOn: 'Billing on: the stored keys are used',
      billingOff: 'Billing off: the stored keys are ignored (env vars, if set, still apply)',
      save: 'Save configuration',
      cancel: 'Cancel',
    },

    // ---- webhook endpoint panel ----
    webhook: {
      title: 'Webhook endpoint',
      desc: 'In the Stripe dashboard, add a webhook endpoint pointing at the URL below and subscribe it to checkout.session.completed, customer.subscription.updated, customer.subscription.deleted and invoice.payment_failed. Then paste its signing secret above.',
      copied: 'Copied',
      copy: 'Copy',
    },

    // ---- live state panel ----
    state: {
      title: 'Live state',
      desc: 'Whether WorkCoPilot can take payments right now.',
      secretSet: 'Secret key is set',
      secretMissing: 'No secret key',
      storedInConsole: 'Stored in the console.',
      fromEnv: 'Provided by an environment variable.',
      secretAdd: 'Add a Stripe secret key so checkout can run.',
      webhookSet: 'Webhook secret is set',
      webhookMissing: 'No webhook secret',
      webhookAdd: 'Webhook events will be acknowledged but not processed until this is set.',
      pricesSet: 'All three plan price ids are set',
      pricesIncomplete: 'Plan price ids are incomplete',
      pricesMapped: 'Basic, Advanced and Premium are mapped.',
      pricesAdd: 'Set the Basic, Advanced and Premium price ids so each plan can be purchased.',
      ready: 'Billing is ready',
      notReady: 'Billing is not ready yet',
      readyDetail: 'Users can subscribe and the subscription gate is active.',
      notReadyDetail: 'Until a secret key and all three price ids are set (and billing is on), the service runs without the paywall.',
    },
  },
}
