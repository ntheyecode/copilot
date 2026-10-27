// English strings for the shared 3-way "how this company runs AI" choice
// (src/pages/workadmin/sections/AiSourceChoice.jsx). Two voices for the SAME
// three options (the option registry is src/shared/ai_source_options.js):
//   operator = the superadmin console (talks about "the company" / "we")
//   company  = the company admin console (talks about "you" / "the WorkCoPilot team")
// Options 'client' and 'managed' both store aiSource 'company'; they differ only
// in who types the key. 'platform' stores aiSource 'platform' (no key needed).
export default {
  aiSource: {
    legend: 'AI setup',
    legendCompany: 'How your company runs AI',
    options: {
      operator: {
        client: {
          title: 'The client sets up their own AI keys',
          hint: 'Their company admin pastes their provider key in the company console. Usage bills to their provider account.',
          who: 'Key entered by the company admin',
        },
        managed: {
          title: 'We set up the company\'s own AI keys',
          hint: 'The WorkCoPilot team enters the company\'s provider key for them. Usage still bills to the company\'s provider account.',
          who: 'Key entered by the WorkCoPilot team',
        },
        platform: {
          title: 'Use the shared platform keys',
          hint: 'No company key needed. The company runs on the WorkCoPilot platform AI right away.',
          who: 'No key to enter',
        },
      },
      company: {
        client: {
          title: 'You set up your own AI keys',
          hint: 'Paste your provider key below. Usage bills to your own provider account.',
          who: 'Key entered by you',
        },
        managed: {
          title: 'The WorkCoPilot team sets up your own AI keys for you',
          hint: 'The team enters your provider key on your behalf. Usage still bills to your provider account.',
          who: 'Key entered by the WorkCoPilot team',
        },
        platform: {
          title: 'Shared platform keys',
          hint: 'No key needed from you. Your company runs on the WorkCoPilot platform AI.',
          who: 'No key to enter',
        },
      },
    },
    current: 'Current',
    teamOnly: 'Arranged by the WorkCoPilot team. Open a support ticket to switch.',
    state: {
      ready: 'AI is ready',
      readyKey: 'AI is ready on key {key}',
      needsKey: 'Ready once a key is saved',
      unselected: 'Pick one to make AI ready',
    },
  },
}
