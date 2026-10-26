// WorkCoPilot - Cookie Policy (public, plain-language disclosure).
// HONESTY CONTRACT (owner-enforced): lists only the cookies/storage the product
// actually sets (audited). The ONLY cookies are the strictly-necessary sign-in
// cookie and a consent-gated referral cookie; everything else is first-party
// browser storage. No third-party advertising or cross-site tracking exists, so
// none is claimed. Legal copy stays English. Layout from the shared LegalPage.
import React from 'react'
import { Cookie, ShieldCheck, Sliders, Database, Gavel, Lock, FileText } from 'lucide-react'
import LegalPage, { Items, DataTable, LEGAL_CONTACT, SUPPORT_CONTACT } from '../components/LegalPage.jsx'
import { openPreferences } from '../consent.js'

const LAST_UPDATED = '2026-10-25'

const GLANCE = [
  { icon: ShieldCheck, tone: 'ok', eyebrow: 'What we set', title: 'One necessary cookie, by default', body: 'Only a strictly necessary sign-in cookie is set without your consent. A referral cookie is set only if you allow attribution.' },
  { icon: Sliders, tone: 'cyan', eyebrow: 'Your control', title: 'Change your choices anytime', body: 'Use "Cookie preferences" in the footer, or this page, to turn functional and attribution storage on or off whenever you like.' },
  { icon: Database, tone: 'amber', eyebrow: 'No tracking', title: 'No ad or cross-site tracking', body: 'We do not use advertising cookies, third-party trackers or cross-site profiling. Functional storage stays on your own device.' },
]

const TABLE_COLS = ['Name', 'Kind', 'Category', 'Purpose', 'Lifetime']
const TABLE_ROWS = [
  ['workcopilot.sid', 'Cookie', 'Strictly necessary', 'Keeps you signed in and the session working.', 'Session'],
  ['wc_consent', 'Cookie', 'Strictly necessary (consent record)', 'Remembers your cookie choices so we can honor them. Also read by the server to know whether attribution is allowed.', '~1 year'],
  ['affref', 'Cookie', 'Analytics and attribution', 'Credits a partner who referred you. Set only after you allow attribution.', 'Up to 180 days'],
  ['wc_consent_v1', 'Local storage', 'Strictly necessary (consent record)', 'The full record of your per-category choices on this device.', 'Until cleared'],
  ['wc_locale', 'Local storage', 'Functional', 'Remembers your chosen language.', 'Until cleared'],
  ['theme', 'Local storage', 'Functional', 'Remembers light or dark mode.', 'Until cleared'],
  ['Preference keys', 'Local storage', 'Functional', 'Remember small preferences such as guide font size, the on-screen buddy, widget open/closed state and which notices you have seen.', 'Until cleared'],
  ['Lead / coach keys', 'Local storage', 'Functional', 'Remember the "Validate it live" lead and anonymous id and coach flags so the widget does not re-prompt you.', 'Until cleared'],
  ['wc_pending_ref', 'Session storage', 'Held for attribution', 'Holds a referral code for this tab until you decide on attribution. Promoted to the affref cookie only if you allow it; otherwise discarded.', 'Until the tab closes'],
]

const SECTIONS = [
  {
    id: 'about',
    title: 'About cookies and storage',
    content: (
      <>
        <p>A cookie is a small file a site stores in your browser. "Local storage" and "session storage" are similar browser mechanisms for keeping small values on your own device. This page lists every cookie and storage key WorkCoPilot uses, what each is for, and how long it lasts.</p>
        <p>We group them into three categories: <b>strictly necessary</b> (always on, because sign-in and the site cannot work without them), <b>functional</b> (remember your preferences on this device), and <b>analytics and attribution</b> (credit a partner who referred you). Functional and attribution storage stay off until you allow them.</p>
      </>
    ),
  },
  {
    id: 'what',
    title: 'What we use',
    content: (
      <>
        <p>This is the complete list. If it changes, the "Last updated" date above changes with it.</p>
        <DataTable caption="Cookies and browser storage used by WorkCoPilot" columns={TABLE_COLS} rows={TABLE_ROWS} />
      </>
    ),
  },
  {
    id: 'categories',
    title: 'The three categories',
    content: (
      <Items items={[
        ['Strictly necessary', 'The sign-in cookie and the record of your consent choices. These are always on; without them you could not sign in or we could not remember your choices. Exempt from consent under GDPR and comparable laws.'],
        ['Functional', 'First-party browser storage that remembers preferences such as language, theme and small UI state. It stays on your device, is not shared, and is not used to profile you.'],
        ['Analytics and attribution', 'A single first-party referral cookie (affref) that credits a partner who sent you here. It is off until you allow it, carries only a short referral code, and is never used for advertising or cross-site tracking.'],
      ]} />
    ),
  },
  {
    id: 'manage',
    title: 'Managing your choices',
    content: (
      <>
        <Items items={[
          ['On this site', 'Use the button below or the "Cookie preferences" link in the footer to turn functional and attribution storage on or off at any time. Rejecting is as easy as accepting.'],
          ['In your browser', 'You can also clear or block cookies and site data in your browser settings. Blocking the strictly necessary cookie will stop you from staying signed in.'],
          ['Effect of declining', 'If you decline attribution, no referral cookie is set and any existing one is removed. If you decline functional storage, we do not persist those preferences on this device.'],
        ]} />
        <p><button type="button" className="wlx-btn" onClick={openPreferences}>Open cookie preferences</button></p>
      </>
    ),
  },
  {
    id: 'consent',
    title: 'Consent and referrals',
    content: (
      <p>When you arrive from a partner referral link, the referral code travels in the page address and is held only for the current browser tab until you decide. We set the referral cookie only after you allow attribution. This keeps referrals working for people who opt in, while setting no non-essential cookie for anyone who has not chosen. See the <a href="/workcopilot/privacy">Privacy Policy</a> for how referral data is handled.</p>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to this policy',
    content: (
      <p>If we add, remove or change a cookie or storage key, we update this page and the "Last updated" date. Where a change affects a non-essential category, we will ask for your consent again.</p>
    ),
  },
  {
    id: 'contact',
    title: 'Contact',
    content: (
      <Items items={[
        ['Privacy and legal questions', <a key="l" href={'mailto:' + LEGAL_CONTACT}>{LEGAL_CONTACT}</a>],
        ['Product support', <a key="s" href={'mailto:' + SUPPORT_CONTACT}>{SUPPORT_CONTACT}</a>],
      ]} />
    ),
  },
]

export default function WorkCookiePolicy() {
  return (
    <LegalPage
      icon={Cookie}
      eyebrow="Cookie Policy"
      title="Cookies and browser storage"
      intro="Exactly which cookies and browser storage WorkCoPilot uses, what each is for, how long it lasts, and how you control them."
      lastUpdated={LAST_UPDATED}
      tagline="Plain-language disclosure of what the product does today"
      seo={{
        title: 'Cookie Policy - WorkCoPilot by AdmireVeda',
        description: 'Every cookie and browser-storage key WorkCoPilot uses: one strictly necessary sign-in cookie, a consent record, a consent-gated referral cookie, and first-party functional storage. No advertising or cross-site tracking, and how to manage your choices.',
        path: '/workcopilot/cookie-policy',
      }}
      glance={GLANCE}
      sections={SECTIONS}
      links={[
        { label: 'Privacy Policy', to: '/workcopilot/privacy', icon: Lock },
        { label: 'Subprocessors', to: '/workcopilot/subprocessors', icon: Database },
        { label: 'Terms of Service', to: '/workcopilot/terms', icon: Gavel },
        { label: 'DPA', to: '/workcopilot/dpa', icon: FileText },
      ]}
    />
  )
}
