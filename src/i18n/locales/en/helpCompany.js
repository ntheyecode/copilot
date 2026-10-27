// English strings for the company-admin Help page (src/pages/workadmin/sections/
// HelpCompany.jsx). Keyed under the `helpCompany` namespace; the i18n loader
// deep-merges every en/*.js partial into the English base, so this file owns its
// own namespace and never collides with the other i18n waves.
export default {
  helpCompany: {
    flow: {
      signin: 'Sign in',
      overview: 'Confirm authorization',
      team: 'Add your people',
      ai: 'Choose your AI',
      governance: 'Set governance',
      billing: 'Check billing',
    },
    panel: {
      title: 'The admin flow',
      lead: 'Six steps from first sign-in to a company that is set up. Click a step to jump to it.',
    },
    signin: {
      title: 'Sign in',
      lead: 'Your company admin account opens this console. Members land in the guide instead.',
      steps: {
        emailSso: { t: 'Email & SSO tab', d: 'On the sign-in page, pick the Email & SSO tab.' },
        account: { t: 'Your admin account', d: 'Username and password, then the code if MFA is on.' },
        console: { t: 'Company console', d: 'You arrive here. Members see their own dashboard.' },
      },
      shot: {
        alt: 'The WorkCoPilot sign-in page with the Social and Email & SSO tabs.',
        caption: 'Sign-in page. Admins use the Email & SSO tab.',
      },
    },
    overview: {
      open: 'Overview',
      title: 'Overview',
      lead: 'Your company at a glance, and the two things to do once.',
      steps: {
        cards: { t: 'Read the cards', d: 'Licenses and admin seats with their meters, the minute pool, guided sessions, and your hours pool for the month.' },
        authorize: { t: 'Confirm authorization', d: 'One click. It records who affirmed and when.' },
        retention: { t: 'Set data retention', d: 'Edit, choose the days, Save retention. 0 keeps everything.' },
        backup: { t: 'Back up the knowledge base', d: 'Download a JSON snapshot any time. Restore it later.' },
      },
      shot: {
        alt: 'Company admin Overview: license cards with seat meters, the hours pool for the month, the authorization confirmation, data retention and the knowledge base.',
        caption: 'Overview with the authorization card, retention and knowledge base.',
      },
    },
    team: {
      open: 'Team',
      title: 'Team',
      lead: 'Add people, set their role and plan, and give them minutes.',
      steps: {
        add: { t: 'Add person', d: 'By work email (SSO) or username and password. They get a set-password link.' },
        roleplan: { t: 'Role and plan', d: 'Member, Executive or Company admin. Change either inline, any time.' },
        minutes: { t: 'Give minutes', d: 'The clock icon moves minutes from the company pool to one person.' },
        managed: { t: 'Managed roster', d: 'When WorkCoPilot manages your licenses, adding or removing people goes through Support.' },
      },
      shot: {
        alt: 'Team: the People table with role and plan selectors, usage today, extra minutes and 2FA status.',
        caption: 'People, with role and plan editable in place.',
      },
    },
    ai: {
      open: 'AI keys',
      title: 'AI keys',
      lead: 'Run on the platform AI, or on your own provider account.',
      steps: {
        current: { t: 'Current AI', d: 'Platform AI by default. Nothing to set up.' },
        ownKeys: { t: 'Use your own keys', d: 'Pick the provider, paste the API key, Use my keys. Usage bills to your account.' },
        webLearning: { t: 'Live web learning', d: 'Optional Tavily key so web research runs on your own key.' },
      },
      shot: {
        alt: 'AI keys: the Current AI card, the Use your own keys form and the Live web learning key.',
        caption: 'Current AI, your own keys, and the web learning key.',
      },
    },
    governance: {
      open: 'Data governance',
      title: 'Data governance',
      lead: 'What may leave a device, and the security practices every plan must follow.',
      steps: {
        edit: { t: 'Edit', d: 'Opens the saved policy. Pick frameworks to seed defaults.' },
        categories: { t: 'Categories and words', d: 'Per category: send, mask, withhold or tokenize. Add words that never leave.' },
        rules: { t: 'Security practice rules', d: 'Paste or upload your written policy, Extract rules, review each one. Add rules by hand too.' },
        arm: { t: 'Arm and save', d: 'Tick Armed, Save policy. Rules apply on every call and cite your policy by name.' },
      },
      shots: {
        saved: {
          alt: 'The saved data governance policy record with its status, mode, frameworks, rule counts and version.',
          caption: '1. The saved policy. Edit to change it.',
        },
        edit: {
          alt: 'The policy in Edit mode: compliance frameworks and what leaves the device by category.',
          caption: '2. Frameworks and per-category actions.',
        },
        rules: {
          alt: 'Security practice rules: paste a policy, Extract rules, and the extracted forbid and require rules with their citations.',
          caption: '3. Security practice rules, each citing your policy.',
        },
        save: {
          alt: 'Mode and status: the handling mode, the Armed checkbox and Save policy.',
          caption: '4. Mode, Armed, Save policy.',
        },
      },
    },
    billing: {
      open: 'Billing',
      title: 'Billing',
      lead: 'Your statement, line by line.',
      steps: {
        plan: { t: 'Plan charges', d: 'Computed from the licenses you hold.' },
        extras: { t: 'Extras', d: 'Items the WorkCoPilot team recorded on your account.' },
        change: { t: 'Change anything', d: 'Open a Support ticket to add licenses or change plans.' },
      },
      shot: {
        alt: 'Billing: the statement for the company with its charge lines.',
        caption: 'The statement.',
      },
    },
    alerts: {
      open: 'Alerts',
      title: 'Security alerts',
      lead: 'When sensitive data is redacted on a device, you hear about it. Never the values.',
      steps: {
        see: { t: 'What you see', d: 'Who, where, and what kind of data was redacted.' },
        relay: { t: 'Relay it', d: 'SOC / SIEM sends the same metadata to your own tools.' },
      },
      shot: {
        alt: 'Security alerts list for the company.',
        caption: 'Alerts, newest first.',
      },
    },
  },
}
