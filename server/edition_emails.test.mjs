// Emails per edition audience: an individuals-only edition never mails a person
// company or administrator wording by default, and the default edition keeps
// every template's wording exactly as before (pure: no app boot).
import test from 'node:test'
import assert from 'node:assert/strict'
import { EMAIL_DEFS, defaultsFor } from './email_templates.js'
import { INDIVIDUALS_BANNED } from '../scripts/edition_copy_scan.mjs'

// Sent only to company members, company admins or AdmireVeda staff (never to a
// person on an individuals-only edition, which has no companies and no leads
// routed to a company).
const NOT_INDIVIDUAL = new Set(['welcome_sso', 'welcome_set_password', 'lead_notify', 'export_password_set', 'ticket_staff_notify', 'owner_subscription_alert',
  'company_disabled', 'company_enabled', 'company_pool_threshold', 'company_hours_requested', 'user_ceiling_threshold', 'company_hours_decided'])
const isCompanyFlow = (k) => k.startsWith('work_') || k.startsWith('company_') || NOT_INDIVIDUAL.has(k)
// "The WorkCoPilot team" / "our team" is AdmireVeda signing its own mail, not a
// company feature; it is allowed. Anything else from the banned list is not.
const OWN_TEAM = /\b(The WorkCoPilot team|our team|the WorkCoPilot team|a member of the WorkCoPilot team)\b/gi

test('individuals: no template a person receives carries company or administrator wording', () => {
  const hits = []
  for (const [k, def] of Object.entries(EMAIL_DEFS)) {
    if (isCompanyFlow(k)) continue
    const d = defaultsFor(def, 'individuals')
    const text = [d.subject, d.preheader, d.heading, d.body, d.ctaLabel].filter(Boolean).join(' | ').replace(OWN_TEAM, '')
    const m = text.match(new RegExp(INDIVIDUALS_BANNED.source, 'i'))
    if (m) hits.push(`${k}: "${m[0]}"`)
  }
  assert.deepEqual(hits, [])
})

test('the default edition reads every template exactly as written (no audience)', () => {
  for (const def of Object.values(EMAIL_DEFS)) {
    const d = defaultsFor(def, null)
    assert.equal(d.body, def.defaultBody)
    assert.equal(d.subject, def.defaultSubject)
  }
  assert.match(defaultsFor(EMAIL_DEFS.purchase_receipt, null).body, /company name or tax ID/)
  assert.doesNotMatch(defaultsFor(EMAIL_DEFS.purchase_receipt, 'individuals').body, /company/)
  assert.doesNotMatch(defaultsFor(EMAIL_DEFS.account_disabled, 'individuals').body, /administrator/)
})
