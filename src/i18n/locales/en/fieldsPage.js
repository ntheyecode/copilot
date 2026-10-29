// English strings for the "Work we guide" page (src/pages/WorkFields.jsx), keyed
// under the `fieldsPage` namespace. en.js already carries fieldsPage.vignettes* /
// showcase* (the real-screen vignette strip shared with the home page); this
// partial adds the rest of the page and deep-merges beside those keys (one
// namespace, two files, no duplicate key).
//
// STRUCTURE CONTRACT (the page depends on it):
// - families.<id> holds one group of work: `title`, `d` (one-line body) and
//   `items`, the ARRAY of field names shown as tags. WorkFields.jsx derives the
//   field COUNTS (FIELD_TOTAL, the "{n} fields" eyebrow) and the group anchors
//   (#security-and-resilience, from the English title) from THIS file, so a
//   translation keeps the item count and the page numbers never drift
//   (SUPREME RULE II: single source of truth). Icons and layout stay in code.
// HONESTY (owner rule): the DOING groups WorkCoPilot is strong in, never
// "every field"; document-analysis professions are intentionally left off.
export default {
  fieldsPage: {
    eyebrow: 'Work we guide',
    h1: 'Find your work. We guide it <em>step by step.</em>',
    lead: 'WorkCoPilot walks you through doing real tasks in the tools you already use, one step at a time. These are the groups of work it is strong in.',
    note: 'Our strength is doing and finishing tasks on screen. Long-document review and deep analysis are not what it is for.',
    startBtn: 'Start guiding me',
    useCasesBtn: 'See the use cases',
    jumpsAria: 'Jump to a group of work',
    gridAria: 'Groups of work and the fields in each',
    // Card eyebrow: plural forms, {n} = number of fields in the group
    fieldCount_one: '{n} field',
    fieldCount_other: '{n} fields',
    // aria-label of a group's tag list, {family} = the group title
    tagsAria: '{family} fields',
    ctaH2: 'Your work is probably in here.',
    ctaP: 'Pick it on screen and WorkCoPilot takes you through it, one step at a time.',
    pricingBtn: 'See pricing',

    families: {
      software: {
        title: 'Software & engineering',
        d: 'Ship code, set up the stack, keep it running.',
        items: [
          'Developer', 'Frontend & accessibility', 'Mobile development', 'Game development', 'Embedded / firmware',
          'Database', 'SDET', 'QA', 'DevOps', 'SRE', 'Network engineering', 'Sysadmin / IT ops', 'Blockchain development',
          'Backend & API development', 'Full-stack web development', 'Software architecture', 'Cloud architecture',
          'Platform engineering', 'Release management', 'ERP & CRM administration', 'Low-code & RPA automation',
        ],
      },
      security: {
        title: 'Security & resilience',
        d: 'Test it, break in, contain it, respond.',
        items: [
          'Penetration testing', 'Network pentest', 'Mobile pentest', 'API security', 'Cloud security', 'DevSecOps',
          'Incident response', 'Application security', 'Security operations (SOC)', 'Vulnerability management',
          'Identity & access management', 'Digital forensics', 'Malware triage', 'Red team operations',
        ],
      },
      data: {
        title: 'Data, AI & ML',
        d: 'Build the pipeline, train the model, read the dashboard.',
        items: [
          'Data engineering', 'Data analytics', 'MLOps', 'Data science', 'Machine learning engineering',
          'AI & prompt engineering', 'Analytics engineering', 'Business intelligence', 'Geospatial & GIS',
        ],
      },
      product: {
        title: 'Product, project & design',
        d: 'Plan the work, run the board, design the screens.',
        items: [
          'Product management', 'Project management', 'Agile / scrum', 'UX design', 'Program management',
          'Technical program management', 'PMO & portfolio management', 'Change management',
          'User research', 'UI & visual design', 'Design systems', 'Product analytics',
        ],
      },
      physical: {
        title: 'OT, IoT & physical systems',
        d: 'Where the software meets the machine.',
        items: [
          'OT / ICS', 'IoT', 'Robotics', 'Aviation operations',
          'Mechanical engineering', 'Electrical engineering', 'Civil & structural engineering', 'Construction management',
          'CAD & BIM design', 'Manufacturing & quality engineering', 'Energy & utilities operations',
          'Facilities & building systems', 'Environmental health & safety',
        ],
      },
      finance: {
        title: 'Finance & accounting',
        d: 'Books, payroll, invoices and filings, in your own tools.',
        items: [
          'Bookkeeping & accounting', 'Invoicing & billing', 'Accounts payable & receivable', 'Payroll',
          'Tax filing & returns', 'Treasury & cash management', 'Banking operations', 'Expense & reconciliation',
          'Insurance claims processing',
        ],
      },
      operations: {
        title: 'Business operations',
        d: 'The daily work that keeps a company moving.',
        items: [
          'Sales', 'HR & recruiting', 'Customer support', 'Procurement & vendor', 'Supply chain & operations',
          'Account management', 'Customer success', 'Sales operations & RevOps', 'Office & executive administration',
          'Event planning', 'Real estate & property management', 'Retail & store operations',
          'Hospitality & restaurant management', 'Logistics & transportation', 'Government & public administration',
        ],
      },
      marketing: {
        title: 'Content & marketing',
        d: 'Make it, publish it, reach the right people.',
        items: [
          'Marketing & growth', 'Content & copywriting', 'SEO', 'Social media', 'Video & media',
          'Translation & localization', 'Graphic & brand design', 'Email & lifecycle marketing',
          'Paid media & advertising', 'Product marketing', 'Audio & podcast production',
        ],
      },
      healthcare: {
        title: 'Healthcare',
        d: 'Charting, coding and care workflows, step by step.',
        items: [
          'Physician practice', 'Registered nursing', 'Nurse practitioner', 'Pharmacy', 'Physical & occupational therapy',
          'Radiology & imaging', 'Medical laboratory science', 'Medical coding & billing', 'Clinical research coordination',
          'Health information management', 'Dental hygiene & practice', 'Paramedic & EMS', 'Dietetics & nutrition',
          'Behavioral health & counseling', 'Public health',
        ],
      },
      education: {
        title: 'Education',
        d: 'Set up the class, the records, and the lessons.',
        items: [
          'K-12 teaching', 'University teaching & lecturing', 'School administration', 'Academic advising',
          'Registrar & student records', 'Special education', 'Librarian & information science',
          'Admissions & enrollment', 'E-learning development', 'Corporate training & L&D', 'Early childhood education',
          'Language teaching (ESL)', 'School counseling',
        ],
      },
    },
  },
}
