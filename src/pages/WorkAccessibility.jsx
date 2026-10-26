// WorkCoPilot - Accessibility statement (public, plain-language).
// HONESTY CONTRACT (owner-enforced): states WCAG 2.1 AA as the TARGET we build
// toward and the measures actually in the product (focus rings, landmarks, one
// H1, reduced-motion support, AA contrast, keyboard operability). It does NOT
// claim a certification or a completed third-party audit. Legal copy stays
// English. Layout from the shared LegalPage.
import React from 'react'
import { Accessibility, Keyboard, Eye, MessageSquare, Lock, FileText, Gavel } from 'lucide-react'
import LegalPage, { Items, Placeholder, LEGAL_CONTACT, SUPPORT_CONTACT } from '../components/LegalPage.jsx'

const LAST_UPDATED = '2026-10-25'

const GLANCE = [
  { icon: Eye, tone: 'ok', eyebrow: 'Our target', title: 'WCAG 2.1 level AA', body: 'We build the public site and the product toward the WCAG 2.1 AA success criteria, and treat an accessibility defect as a bug to fix.' },
  { icon: Keyboard, tone: 'cyan', eyebrow: 'Built in', title: 'Keyboard and screen-reader friendly', body: 'Visible focus rings, one main landmark and a single H1 per page, labelled controls, and support for reduced-motion preferences.' },
  { icon: MessageSquare, tone: 'amber', eyebrow: 'Tell us', title: 'Report a barrier', body: 'If something is hard to use with assistive technology, write to us and we will help and fix it.' },
]

const SECTIONS = [
  {
    id: 'commitment',
    title: 'Our commitment',
    content: (
      <p>We want everyone to be able to use WorkCoPilot, including people who use a keyboard only, a screen reader, magnification, or other assistive technology. Accessibility is part of how we design and review the product, not an afterthought, and we treat a barrier as a defect to fix rather than a known limitation to leave in place.</p>
    ),
  },
  {
    id: 'standard',
    title: 'The standard we aim for',
    content: (
      <>
        <p>We build toward the <b>Web Content Accessibility Guidelines (WCAG) 2.1, level AA</b>. That is our target, which guides our design and our reviews. We do not claim a formal certification, and we have not published a third-party audit; where we are not yet fully conformant, we say so below and we work to close the gap.</p>
      </>
    ),
  },
  {
    id: 'measures',
    title: 'What is built in today',
    content: (
      <Items items={[
        ['Keyboard access', 'Interactive controls are reachable and operable with a keyboard, and we do not remove the focus outline. Every focusable control shows a visible focus ring.'],
        ['Structure for screen readers', 'Each page has one main landmark and a single H1, with headings in order, so assistive technology can navigate the structure. Decorative icons are hidden from the accessibility tree.'],
        ['Labels and names', 'Buttons, links, form fields and toggles have accessible names, and state (such as a switch being on or off) is exposed to assistive technology.'],
        ['Contrast', 'Text and essential UI are designed to meet AA contrast in both the light and dark themes.'],
        ['Motion', 'Animated and parallax effects respect the "reduce motion" setting in your operating system or browser.'],
        ['Resizing and reflow', 'Layouts reflow to narrow and zoomed viewports without a horizontal scrollbar, so you can enlarge text and still read the page.'],
      ]} />
    ),
  },
  {
    id: 'limitations',
    title: 'Known limitations',
    content: (
      <>
        <p>We are honest about where we are not yet fully conformant. Because the product guides you across other applications, some of what appears on your screen is produced by software we do not control, and its accessibility is outside our reach.</p>
        <Items items={[
          ['Third-party and embedded content', 'Apps you are guided through, and any embedded third-party content, follow their own accessibility, which we cannot guarantee.'],
          ['Ongoing work', <>Some older screens have not yet completed an accessibility review. The date of our most recent formal review is <Placeholder>to be confirmed</Placeholder>; we update this statement as areas are reviewed.</>],
        ]} />
      </>
    ),
  },
  {
    id: 'feedback',
    title: 'Feedback and help',
    content: (
      <>
        <p>If you hit an accessibility barrier, or need information in a different format, tell us. Please include the page, what you were trying to do, and the assistive technology and browser you use, so we can reproduce and fix it.</p>
        <Items items={[
          ['Accessibility feedback', <a key="l" href={'mailto:' + LEGAL_CONTACT}>{LEGAL_CONTACT}</a>],
          ['Product support', <a key="s" href={'mailto:' + SUPPORT_CONTACT}>{SUPPORT_CONTACT}</a>],
          ['What to expect', 'We acknowledge reports, work with you on a way to get the task done in the meantime, and prioritize a fix.'],
        ]} />
      </>
    ),
  },
]

export default function WorkAccessibility() {
  return (
    <LegalPage
      icon={Accessibility}
      eyebrow="Accessibility"
      title="Accessibility statement"
      intro="Our commitment to accessible software, the standard we build toward, what is built in today, where we are still working, and how to reach us."
      lastUpdated={LAST_UPDATED}
      tagline="Plain-language statement of what the product does today"
      seo={{
        title: 'Accessibility Statement - WorkCoPilot by AdmireVeda',
        description: 'How WorkCoPilot approaches accessibility: WCAG 2.1 AA as our target, keyboard and screen-reader support, visible focus, AA contrast, reduced-motion support and reflow, known limitations stated honestly, and how to report a barrier.',
        path: '/workcopilot/accessibility',
      }}
      glance={GLANCE}
      sections={SECTIONS}
      links={[
        { label: 'Privacy Policy', to: '/workcopilot/privacy', icon: Lock },
        { label: 'Terms of Service', to: '/workcopilot/terms', icon: Gavel },
        { label: 'Contact', href: 'mailto:' + LEGAL_CONTACT, icon: FileText },
      ]}
    />
  )
}
