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
    orgPlans: {
      popular: 'Most chosen',
      cta: 'Talk to us',
      note: 'Every plan includes data protection on each device, company policy and audit logs. Prices are quoted for your company.',
      hosted: {
        name: 'Hosted for your company',
        price: 'Priced per person by company size',
        lead: 'Your company on our hosted service, ready the day you sign.',
        p1: 'Company console, single sign-on and company policy you arm and lock',
        p2: 'A guided-hours pool your company administrator shares out',
        p3: 'Company Brain and teach workflows, private to your company',
      },
      managed: {
        name: 'Managed private cloud',
        price: 'Quoted on request',
        lead: 'A dedicated installation we run for you in your own cloud.',
        p1: 'Your data stays on your own cloud database',
        p2: 'We operate and update it for you',
        p3: 'Our AI, billed at the usage you run',
      },
      onprem: {
        name: 'On-premises',
        price: 'Available on request',
        lead: 'Installed on your own servers, under your own control.',
        p1: 'Runs on your own AI provider keys',
        p2: 'Activated by a license on the installation',
        p3: 'Your own database and your own network',
      },
    },
    validate: {
      talk: 'Talk to us about your team',
      plans: 'See plans for organizations',
    },
    app: {
      noPlanTitle: 'This account has no plan yet',
      noPlanBody: 'Personal plans are not sold here. Your access comes from your company: ask your company administrator to add you.',
      noPlanTalk: 'Talk to us',
    },
    login: {
      orgOnly: 'New to WorkCoPilot? It is for organizations. <a>Talk to us</a>.',
    },
  },
}
