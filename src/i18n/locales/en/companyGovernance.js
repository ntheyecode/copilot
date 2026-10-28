// English strings for the guidance-depth entitlement + customers surfaces:
//   guidanceDepth.*          the shared Standard / Deep control (both consoles)
//   companiesAdmin.depth.*   superadmin company card: what the company is granted
//   companyAdmin.depth.*     company console: the grant + depth by pool
//   companyAdmin.customers.* company console: who the work is for
//   companyAdmin.nav/sections.{depth,customers}  the two new console sections
// Deep-merged into the English base (src/i18n/index.jsx); other locales fall back
// to English until translated. Never names a model or provider. US spelling.
export default {
  guidanceDepth: {
    legend: 'Guidance depth',
    options: {
      standard: { title: 'Standard', hint: 'Single-task guidance: one goal, guided one task at a time.', tag: 'Lite, Basic, Advanced' },
      deep: { title: 'Deep', hint: 'Projects: a large goal planned as a map of tasks, each guided in turn.', tag: 'Premium level' },
    },
    current: 'Current',
    aboveGrant: 'Above the grant',
  },
  companiesAdmin: {
    depth: {
      title: 'Guidance depth',
      titleSub: 'what this company is granted',
      desc: 'The ceiling for this company. Their admin assigns each pool a depth up to this grant, never above it.',
      unknown: 'The current grant is not reported by the company detail yet. Choose Standard or Deep to set it; the saved value is confirmed back here.',
      granted: 'Granted: {depth}',
      saveFailed: 'Could not save the guidance depth.',
    },
  },
  companyAdmin: {
    nav: {
      depth: 'Guidance depth',
      customers: 'Customers',
    },
    sections: {
      depth: { title: 'Guidance depth', sub: 'The depth the WorkCoPilot team granted your company, and how you assign it to each pool of people.' },
      customers: { title: 'Customers', sub: 'Who the work is for. Your people tag each project to one of these; Default is used when working for your own company.' },
    },
    depth: {
      loading: 'Loading guidance depth',
      grantTitle: 'Your grant',
      grantDesc: 'Set by the WorkCoPilot team. It is the highest depth any of your pools can run at.',
      grantLabel: 'Granted depth',
      raiseGrant: 'Deep is above your grant. Ask the WorkCoPilot team to raise it.',
      askTeam: 'Ask the team',
      poolsTitle: 'Depth by pool',
      poolsDesc: 'Each pool runs at the depth you set here, up to your grant. A pool you have not set inherits the grant.',
      people_one: '{n} person',
      people_other: '{n} people',
      inherits: 'Inherits the grant',
      clamped: 'Kept at {depth}: the grant does not allow more.',
      saveFailed: 'Could not save the pool depth.',
    },
    customers: {
      loading: 'Loading customers',
      listTitle: 'Your customers',
      listDesc: 'Active customers your people can tag work to. Archiving keeps past work intact and hides the customer from new projects.',
      addTitle: 'Add a customer',
      namePlaceholder: 'Customer name',
      add: 'Add customer',
      nameRequired: 'Enter a customer name.',
      systemChip: 'Default',
      systemHint: 'Always available and cannot be renamed or archived.',
      rename: 'Rename',
      save: 'Save',
      archive: 'Archive',
      confirmArchive: 'Archive {name}?',
      confirmArchiveDetail: 'New projects can no longer pick this customer. Work already tagged to it keeps its tag.',
      confirm: 'Yes, archive',
      added: 'Added {name}.',
      renamed: 'Renamed to {name}.',
      archived: 'Archived {name}.',
      emptyTitle: 'Only Default so far',
      emptyDetail: 'Add the clients your people work for; projects can then be tagged to them.',
    },
  },
}
