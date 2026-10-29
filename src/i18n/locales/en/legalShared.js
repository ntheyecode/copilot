// English strings for the shared legal-page chrome (src/components/LegalPage.jsx):
// the hero meta line, the template notice, the ownership line, the hidden glance
// heading, the table-of-contents title and the related-pages buttons that every
// page built on LegalPage (Terms, DPA, Acceptable Use, Subprocessors, Refund,
// Accessibility, Cookie Policy) shares. Keyed under the `legalShared` namespace;
// the i18n loader deep-merges every en/*.js partial into the English base.
// This module is the ONE source for these strings (the former OWNERSHIP_LINE /
// TEMPLATE_NOTICE constants in LegalPage.jsx were deleted, not duplicated).
// Interpolation: {entity} = the legal entity (AdmireVeda), a constant in the
// page, never translated. The brand name WorkCoPilot stays as-is in copy.
export default {
  legalShared: {
    lastUpdated: 'Last updated',
    templateLabel: 'Template.',
    templateNotice: 'This is a template provided for transparency and is being finalized with legal counsel; it is not yet a binding agreement.',
    ownership: 'WorkCoPilot, a product of {entity}.',
    glanceH2: 'At a glance',
    tocTitle: 'On this page',
    relatedPages: 'Related pages',
    contact: 'Contact',
    back: 'Back to WorkCoPilot',
  },
}
