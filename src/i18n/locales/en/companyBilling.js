// Company console: Billing (src/pages/workadmin/sections/CompanyBilling.jsx) and
// the plan, cycle and status labels the superadmin Invoices section shares.
// AdmireVeda bills companies under contract and invoice; no card is ever taken.
// All values are single strings (the patch tools work line by line).
export default {
  companyBilling: {
    note: 'AdmireVeda invoices your company under your contract. No card is needed. Questions about an invoice: open a support ticket.',
    plans: {
      hosted: 'Hosted by AdmireVeda',
      managed: 'Managed by AdmireVeda',
      private: 'Private instance',
    },
    cycles: {
      monthly: 'Monthly',
      quarterly: 'Quarterly',
      annual: 'Annual',
    },
    status: {
      draft: 'Draft',
      issued: 'Due',
      paid: 'Paid',
      void: 'Void',
      overdue: 'Overdue',
    },
    contract: {
      title: 'Your contract',
      none: 'No contract on file yet',
      noneDetail: 'AdmireVeda records your contract here once it is signed.',
      rate: '{rate} per user per month',
      aiAtUsage: 'plus AI at actual usage',
      users: 'Users',
      usersMin: '{users} (billed for the minimum of {billed})',
      monthly: 'Monthly amount',
      term: 'Term',
      termValue: '{start} to {end} ({months} months)',
      cycle: 'Invoiced',
      reference: 'Reference',
    },
    invoices: {
      title: 'Invoices',
      none: 'No invoices yet',
      noneDetail: 'Invoices from AdmireVeda appear here as soon as they are issued.',
      period: '{start} to {end}',
      due: 'Due {date}',
      pdf: 'PDF',
      open: 'Open: {amount}',
      overdue: 'Overdue: {n}',
    },
    statement: 'License statement',
  },
}
