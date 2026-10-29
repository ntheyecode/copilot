// English strings for the public Cookie Policy page (src/pages/WorkCookiePolicy.jsx).
// Keyed under the `cookiePolicyPage` namespace; the i18n loader deep-merges
// every en/*.js partial into the English base, so this file owns its namespace.
// LEGAL COPY: extracted verbatim from the page (honesty contract, owner-enforced).
// Never reworded here; a change of substance is a change to the policy itself.
// Inline tags render via t.rich() with the page's own hrefs: <a> is a link; <b>
// renders bold. Lists (items[], glance[]) and the table (columns[], rows[])
// translate as units; row order is fixed. In table.rows the `name` cell is
// present only where it is an English label; cookie / storage KEY NAMES
// (workcopilot.sid, wc_consent, affref, ...) are code identifiers supplied by
// the page and never translated.
export default {
  cookiePolicyPage: {
    seo: {
      title: 'Cookie Policy - WorkCoPilot by AdmireVeda',
      description: 'Every cookie and browser-storage key WorkCoPilot uses: one strictly necessary sign-in cookie, a consent record, a consent-gated referral cookie, and first-party functional storage. No advertising or cross-site tracking, and how to manage your choices.',
    },
    hero: {
      eyebrow: 'Cookie Policy',
      title: 'Cookies and browser storage',
      intro: 'Exactly which cookies and browser storage WorkCoPilot uses, what each is for, how long it lasts, and how you control them.',
      tagline: 'Plain-language disclosure of what the product does today',
    },
    // Order matches the icon/tone list in the page (ShieldCheck, Sliders, Database).
    glance: [
      { eyebrow: 'What we set', title: 'One necessary cookie, by default', body: 'Only a strictly necessary sign-in cookie is set without your consent. A referral cookie is set only if you allow attribution.' },
      { eyebrow: 'Your control', title: 'Change your choices anytime', body: 'Use "Cookie preferences" in the footer, or this page, to turn functional and attribution storage on or off whenever you like.' },
      { eyebrow: 'No tracking', title: 'No ad or cross-site tracking', body: 'We do not use advertising cookies, third-party trackers or cross-site profiling. Functional storage stays on your own device.' },
    ],
    sections: {
      about: 'About cookies and storage',
      what: 'What we use',
      categories: 'The three categories',
      manage: 'Managing your choices',
      consent: 'Consent and referrals',
      changes: 'Changes to this policy',
      contact: 'Contact',
    },
    table: {
      caption: 'Cookies and browser storage used by WorkCoPilot',
      columns: ['Name', 'Kind', 'Category', 'Purpose', 'Lifetime'],
      rows: [
        { kind: 'Cookie', category: 'Strictly necessary', purpose: 'Keeps you signed in and the session working.', lifetime: 'Session' },
        { kind: 'Cookie', category: 'Strictly necessary (consent record)', purpose: 'Remembers your cookie choices so we can honor them. Also read by the server to know whether attribution is allowed.', lifetime: '~1 year' },
        { kind: 'Cookie', category: 'Analytics and attribution', purpose: 'Credits a partner who referred you. Set only after you allow attribution.', lifetime: 'Up to 180 days' },
        { kind: 'Local storage', category: 'Strictly necessary (consent record)', purpose: 'The full record of your per-category choices on this device.', lifetime: 'Until cleared' },
        { kind: 'Local storage', category: 'Functional', purpose: 'Remembers your chosen language.', lifetime: 'Until cleared' },
        { kind: 'Local storage', category: 'Functional', purpose: 'Remembers light or dark mode.', lifetime: 'Until cleared' },
        { name: 'Preference keys', kind: 'Local storage', category: 'Functional', purpose: 'Remember small preferences such as guide font size, the on-screen buddy, widget open/closed state and which notices you have seen.', lifetime: 'Until cleared' },
        { name: 'Lead / coach keys', kind: 'Local storage', category: 'Functional', purpose: 'Remember the "Validate it live" lead and anonymous id and coach flags so the widget does not re-prompt you.', lifetime: 'Until cleared' },
        { kind: 'Session storage', category: 'Held for attribution', purpose: 'Holds a referral code for this tab until you decide on attribution. Promoted to the affref cookie only if you allow it; otherwise discarded.', lifetime: 'Until the tab closes' },
      ],
    },
    about: {
      p1: 'A cookie is a small file a site stores in your browser. "Local storage" and "session storage" are similar browser mechanisms for keeping small values on your own device. This page lists every cookie and storage key WorkCoPilot uses, what each is for, and how long it lasts.',
      p2: 'We group them into three categories: <b>strictly necessary</b> (always on, because sign-in and the site cannot work without them), <b>functional</b> (remember your preferences on this device), and <b>analytics and attribution</b> (credit a partner who referred you). Functional and attribution storage stay off until you allow them.',
    },
    what: {
      p1: 'This is the complete list. If it changes, the "Last updated" date above changes with it.',
    },
    categories: {
      items: [
        { name: 'Strictly necessary', how: 'The sign-in cookie and the record of your consent choices. These are always on; without them you could not sign in or we could not remember your choices. Exempt from consent under GDPR and comparable laws.' },
        { name: 'Functional', how: 'First-party browser storage that remembers preferences such as language, theme and small UI state. It stays on your device, is not shared, and is not used to profile you.' },
        { name: 'Analytics and attribution', how: 'A single first-party referral cookie (affref) that credits a partner who sent you here. It is off until you allow it, carries only a short referral code, and is never used for advertising or cross-site tracking.' },
      ],
    },
    manage: {
      items: [
        { name: 'On this site', how: 'Use the button below or the "Cookie preferences" link in the footer to turn functional and attribution storage on or off at any time. Rejecting is as easy as accepting.' },
        { name: 'In your browser', how: 'You can also clear or block cookies and site data in your browser settings. Blocking the strictly necessary cookie will stop you from staying signed in.' },
        { name: 'Effect of declining', how: 'If you decline attribution, no referral cookie is set and any existing one is removed. If you decline functional storage, we do not persist those preferences on this device.' },
      ],
      button: 'Open cookie preferences',
    },
    consent: {
      p1: 'When you arrive from a partner referral link, the referral code travels in the page address and is held only for the current browser tab until you decide. We set the referral cookie only after you allow attribution. This keeps referrals working for people who opt in, while setting no non-essential cookie for anyone who has not chosen. See the <a>Privacy Policy</a> for how referral data is handled.',
    },
    changes: {
      p1: 'If we add, remove or change a cookie or storage key, we update this page and the "Last updated" date. Where a change affects a non-essential category, we will ask for your consent again.',
    },
    contact: {
      legal: 'Privacy and legal questions',
      support: 'Product support',
    },
    links: {
      privacy: 'Privacy Policy',
      subprocessors: 'Subprocessors',
      terms: 'Terms of Service',
      dpa: 'DPA',
    },
  },
}
