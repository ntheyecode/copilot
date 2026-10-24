// Email layer: every template renders cleanly, placeholders resolve, the CTA
// button uses the site's action color (orange, not green), and the dispatcher
// degrades gracefully when SMTP is not configured.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const R = (f) => 'file://' + path.join(here, f).replace(/\\/g, '/')
process.env.WORK_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'wc-emails-'))
process.env.PORT = '0'
const et = await import(R('email_templates.js'))
const emails = await import(R('emails.js'))

test('all email types render subject + html + text', () => {
  assert.ok(et.EMAIL_TYPES.length >= 11)
  for (const type of et.EMAIL_TYPES) {
    const d = et.EMAIL_DEFS[type]
    const m = et.renderEmail(type, d.sampleData || {})
    assert.ok(m.subject && m.subject.length > 0, `${type} has a subject`)
    assert.ok(m.html && m.html.includes('<'), `${type} has html`)
    assert.ok(m.text && m.text.length > 0, `${type} has text`)
    // No unresolved <Token> placeholders left in the output.
    assert.ok(!/[<][A-Z][A-Za-z_]*[>]/.test(m.text), `${type} text has no raw tokens`)
  }
})

test('placeholder substitution + overrides work', () => {
  const m = et.renderEmail('welcome_set_password', { name: 'Alex Morgan', setLink: 'https://x/set' }, { heading: 'Welcome <First_Name>' })
  assert.ok(m.html.includes('Welcome Alex'), 'override heading + <First_Name> resolved')
  assert.equal(et.substitute('Hi <First_Name>', { name: 'Alex Morgan' }).trim(), 'Hi Alex')
  assert.equal(et.substitute('<Unknown_Token> tail', {}).trim(), 'tail')  // unknown -> empty
})

test('CTA button uses the site action color (orange), not green', () => {
  const d = et.EMAIL_DEFS.welcome_set_password
  const m = et.renderEmail('welcome_set_password', d.sampleData)
  const btn = m.html.match(/class="btn"[^>]*background:(#[0-9a-fA-F]{6})/)
  assert.ok(btn, 'a CTA button is present')
  assert.equal(btn[1].toLowerCase(), '#f26a43', 'button is the warm orange action color')
})

test('unknown type returns a safe branded fallback, never throws', () => {
  const m = et.renderEmail('not_a_real_type', { name: 'Alex' })
  assert.ok(m && m.subject && m.html)
})

test('dispatcher skips gracefully when SMTP is not configured', async () => {
  const r = await emails.sendTemplate('lead_thank_you', 'alex@example.com', { name: 'Alex' })
  assert.equal(r.ok, false)
  assert.equal(r.skipped, 'smtp-not-configured')
})

test('dispatcher rejects an invalid recipient', async () => {
  const r = await emails.sendTemplate('lead_thank_you', 'not-an-email', { name: 'Alex' })
  assert.equal(r.ok, false)
  assert.equal(r.skipped, 'invalid-recipient')
})
