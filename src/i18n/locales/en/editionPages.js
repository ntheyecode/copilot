// English strings for the edition-only surfaces (namespace `edition`): the
// pages and blocks an edition renders INSTEAD of a surface it does not have.
//   signupClosed  /workcopilot/signup where personal sign-up is off
//   orgPlans      the organization plans (pricing + home) where personal plans are not sold
//   validate      the live check's next step where personal plans are not sold
//   app           the dashboard notice for an account with no plan to buy
//   login         the sign-in page line where personal sign-up is off
// Wording that only REPLACES existing copy per audience lives in the overlays
// (src/i18n/overlays/<audience>/), not here. All values are single strings
// (the i18n patch tools work line by line).
export default {
  edition: {
    signupClosed: {
      metaTitle: 'WorkCoPilot is for organizations - AdmireVeda',
      h1: 'WorkCoPilot is for organizations',
      p: 'Personal sign-up is not available here. To bring WorkCoPilot to your company, talk to us and we will set up your team.',
      member: 'Already with a company that uses WorkCoPilot? Sign in with your company account, or ask your company administrator for access.',
      talk: 'Talk to us',
      signIn: 'Sign in',
    },
    // Prices come from server/org_pricing.js (numbers formatted per locale);
    // these strings are the words around them.
    orgPlans: {
      popular: 'Most chosen',
      cta: 'Talk to us',
      from: 'From {price}',
      perUser: 'per user per month',
      band: '{min} to {max} users',
      bandOpen: '{min} users and more',
      bandsAria: '{name}: price per user by company size',
      aiAtUsage: 'Plus AI billed at actual usage',
      note: 'Prices in US dollars, for at least {min} users. Your company size sets the rate for every user. Invoiced under contract.',
      hosted: {
        name: 'Hosted by AdmireVeda',
        lead: 'Your company on our hosted service, with our AI included, ready the day you sign.',
        p1: 'Company console, single sign-on (SAML or OpenID Connect) and SCIM provisioning',
        p2: 'A guided-hours pool your company administrator shares out',
        p3: 'Company Brain and teach workflows, private to your company',
      },
      managed: {
        name: 'Managed by AdmireVeda',
        lead: 'We run WorkCoPilot for you on our cloud, connected to your own database.',
        p1: 'Your data stays in your own database',
        p2: 'We operate and update it for you',
        p3: 'AI routed by us to the best-rate model, billed at the usage you run',
      },
      private: {
        name: 'Private instance',
        lead: 'WorkCoPilot in your own cloud, running on your own AI provider keys.',
        p1: 'Your cloud, your network and your database',
        p2: 'Your own AI keys: you pay your provider directly',
        p3: 'The same company console, single sign-on and policy controls',
      },
    },
    validate: {
      talk: 'Talk to us about your team',
      plans: 'See plans for organizations',
    },
    app: {
      noPlanTitle: 'This account has no plan yet',
      noPlanBody: 'Your access comes from your company: ask your company administrator to add you.',
      noPlanTalk: 'Talk to us',
    },
    login: {
      orgOnly: 'New to WorkCoPilot? It is for organizations. <a>Talk to us</a>.',
    },
  },
}
