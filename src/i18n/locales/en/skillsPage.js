// English strings for the in-app Skills page (src/pages/work/Skills.jsx), keyed
// under `skillsPage`. The deep-merged en partial pattern (see helpPage.js).
// Plural forms use the t.n convention: key_one / key_other with {n}.
export default {
  skillsPage: {
    sectionAria: 'Skills',
    title: 'Skills',
    toggleAria: 'Skills. {subtitle}',
    subtitle: {
      notLoaded: 'Teach it how you want work done',
      empty: 'Add a playbook, SOP or skill from any AI',
      count_one: '{n} skill guiding your plans',
      count_other: '{n} skills guiding your plans',
    },
    lead: 'Skills teach WorkCoPilot how you (or your org) want work done, so guidance aligns with your tools, standards and terminology. Paste a playbook, an SOP, or a skill exported from any AI.',
    note: {
      company: "<b>Private to your company.</b> These skills guide only your company's people. They are never used to train the platform, and your admin can download or re-upload them at any time.",
      global: '<b>Helps everyone.</b> Skills you add may be used in de-identified form to improve WorkCoPilot for all users; personal data is removed before it is stored. You agreed to this at sign-up. Company accounts are exempt.',
    },
    form: {
      titlePlaceholder: 'Title, for example: How we review pull requests',
      titleAria: 'Skill title',
      contentPlaceholder: "Paste a playbook, SOP, or a skill from any AI. Steps, rules, tools, naming, do's and don'ts. The more specific, the better the guidance.",
      contentAria: 'Skill content',
      tagsPlaceholder: 'Tags, comma separated (optional)',
      tagsAria: 'Tags',
      add: 'Add skill',
    },
    errors: {
      load: 'Could not load your skills.',
      needTitle: 'Give the skill a title.',
      needContent: 'Paste the playbook, SOP or skill itself (a few sentences at least).',
      add: 'Could not add that skill.',
      remove: 'Could not remove that skill.',
    },
    loading: 'Loading your skills…',
    emptyList: 'No skills yet. The first one you add starts shaping your plans right away.',
    item: {
      chars: '{n} chars',
      removeTitle: 'Remove this skill',
      removeAria: 'Remove {title}',
    },
  },
}
