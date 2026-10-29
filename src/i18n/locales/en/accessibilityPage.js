// English strings for the public Accessibility statement (src/pages/WorkAccessibility.jsx).
// Keyed under the `accessibilityPage` namespace; the i18n loader deep-merges
// every en/*.js partial into the English base, so this file owns its namespace.
// LEGAL COPY: extracted verbatim from the page (honesty contract, owner-enforced).
// Never reworded here; a change of substance is a change to the statement itself.
// Inline tags render via t.rich() / Items: <ph> is a clearly-marked fill-in-later
// placeholder (never an invented date); <b> renders bold. Lists (items[],
// glance[]) translate as units.
export default {
  accessibilityPage: {
    seo: {
      title: 'Accessibility Statement - WorkCoPilot by AdmireVeda',
      description: 'How WorkCoPilot approaches accessibility: WCAG 2.1 AA as our target, keyboard and screen-reader support, visible focus, AA contrast, reduced-motion support and reflow, known limitations stated honestly, and how to report a barrier.',
    },
    hero: {
      eyebrow: 'Accessibility',
      title: 'Accessibility statement',
      intro: 'Our commitment to accessible software, the standard we build toward, what is built in today, where we are still working, and how to reach us.',
      tagline: 'Plain-language statement of what the product does today',
    },
    // Order matches the icon/tone list in the page (Eye, Keyboard, MessageSquare).
    glance: [
      { eyebrow: 'Our target', title: 'WCAG 2.1 level AA', body: 'We build the public site and the product toward the WCAG 2.1 AA success criteria, and treat an accessibility defect as a bug to fix.' },
      { eyebrow: 'Built in', title: 'Keyboard and screen-reader friendly', body: 'Visible focus rings, one main landmark and a single H1 per page, labelled controls, and support for reduced-motion preferences.' },
      { eyebrow: 'Tell us', title: 'Report a barrier', body: 'If something is hard to use with assistive technology, write to us and we will help and fix it.' },
    ],
    sections: {
      commitment: 'Our commitment',
      standard: 'The standard we aim for',
      measures: 'What is built in today',
      limitations: 'Known limitations',
      feedback: 'Feedback and help',
    },
    commitment: {
      p1: 'We want everyone to be able to use WorkCoPilot, including people who use a keyboard only, a screen reader, magnification, or other assistive technology. Accessibility is part of how we design and review the product, not an afterthought, and we treat a barrier as a defect to fix rather than a known limitation to leave in place.',
    },
    standard: {
      p1: 'We build toward the <b>Web Content Accessibility Guidelines (WCAG) 2.1, level AA</b>. That is our target, which guides our design and our reviews. We do not claim a formal certification, and we have not published a third-party audit; where we are not yet fully conformant, we say so below and we work to close the gap.',
    },
    measures: {
      items: [
        { name: 'Keyboard access', how: 'Interactive controls are reachable and operable with a keyboard, and we do not remove the focus outline. Every focusable control shows a visible focus ring.' },
        { name: 'Structure for screen readers', how: 'Each page has one main landmark and a single H1, with headings in order, so assistive technology can navigate the structure. Decorative icons are hidden from the accessibility tree.' },
        { name: 'Labels and names', how: 'Buttons, links, form fields and toggles have accessible names, and state (such as a switch being on or off) is exposed to assistive technology.' },
        { name: 'Contrast', how: 'Text and essential UI are designed to meet AA contrast in both the light and dark themes.' },
        { name: 'Motion', how: 'Animated and parallax effects respect the "reduce motion" setting in your operating system or browser.' },
        { name: 'Resizing and reflow', how: 'Layouts reflow to narrow and zoomed viewports without a horizontal scrollbar, so you can enlarge text and still read the page.' },
      ],
    },
    limitations: {
      p1: 'We are honest about where we are not yet fully conformant. Because the product guides you across other applications, some of what appears on your screen is produced by software we do not control, and its accessibility is outside our reach.',
      items: [
        { name: 'Third-party and embedded content', how: 'Apps you are guided through, and any embedded third-party content, follow their own accessibility, which we cannot guarantee.' },
        { name: 'Ongoing work', how: 'Some older screens have not yet completed an accessibility review. The date of our most recent formal review is <ph>to be confirmed</ph>; we update this statement as areas are reviewed.' },
      ],
    },
    feedback: {
      p1: 'If you hit an accessibility barrier, or need information in a different format, tell us. Please include the page, what you were trying to do, and the assistive technology and browser you use, so we can reproduce and fix it.',
      accessibility: 'Accessibility feedback',
      support: 'Product support',
      expect: { name: 'What to expect', how: 'We acknowledge reports, work with you on a way to get the task done in the meantime, and prioritize a fix.' },
    },
    links: {
      privacy: 'Privacy Policy',
      terms: 'Terms of Service',
      contact: 'Contact',
    },
  },
}
