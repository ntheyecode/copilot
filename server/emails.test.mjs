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

// ---- Formatting best practice (owner: "nicely formatted and greatly presented") --
// Guards the CLASS of regression where template content drifts back into dense
// prose: every data-heavy email keeps its detail table, bodies stay scannable,
// and the body syntax (bullets, divider, code panel) keeps rendering.

test('body syntax: "- " bullets, "---" divider, lone **code** panel', () => {
  const html = et.bodyToHtml('Intro here.\n\n- First point\n- **Second** point\n\n**482913**')
  assert.ok(/&bull;/.test(html), 'bullet marker rendered')
  assert.ok(/<strong>Second<\/strong> point/.test(html), 'bold inside a bullet works')
  assert.ok(/class="code"[^>]*>482913</.test(html), 'a lone bold code renders as the code panel')
  assert.ok(!/<p[^>]*>- First/.test(html), 'bullet lines are not rendered as a paragraph')
  const split = et.splitBody('above\n---\nbelow')
  assert.deepEqual(split, { above: 'above', below: 'below' })
  assert.deepEqual(et.splitBody('no divider'), { above: 'no divider', below: '' })
})

test('fine print after the divider renders below the button, not above it', () => {
  const m = et.renderEmail('welcome_set_password', et.EMAIL_DEFS.welcome_set_password.sampleData)
  const btn = m.html.indexOf('class="btn"')
  const fallback = m.html.indexOf('If the button does not work')
  const rows = m.html.indexOf('class="details"')
  assert.ok(btn > 0 && fallback > 0 && rows > 0)
  assert.ok(rows < btn, 'detail rows sit above the button')
  assert.ok(fallback > btn, 'fallback link sits below the button')
  assert.ok(!m.text.includes('---'), 'the divider never leaks into the plain-text twin')
  assert.ok(m.text.indexOf('Set my password:') < m.text.indexOf('If the button does not work'), 'plain text keeps the same order')
})

test('data-heavy emails present their facts as detail rows, not prose', () => {
  const expectRows = {
    purchase_receipt: ['Item', 'Date', 'Reference', 'Total paid'],
    payment_success: ['Description', 'Date', 'Amount paid'],
    payment_failed: ['Description', 'Amount due'],
    subscription_update: ['Plan', 'Status', 'Next billing date'],
    subscription_changed: ['New plan', 'New price', 'Takes effect'],
    subscription_canceled: ['Plan', 'Access until'],
    owner_subscription_alert: ['Customer', 'Plan', 'Status', 'Amount', 'Reference'],
    ticket_received: ['Reference', 'Subject', 'Status'],
    ticket_reply: ['Reference', 'Subject'],
    ticket_staff_notify: ['Reference', 'Subject', 'From'],
    affiliate_approved: ['Sign-in name', 'Your commission'],
    welcome_set_password: ['Sign-in name', 'Link valid for'],
  }
  for (const [type, labels] of Object.entries(expectRows)) {
    const d = et.EMAIL_DEFS[type]
    assert.ok(d.showRows, `${type} shows rows`)
    const m = et.renderEmail(type, d.sampleData)
    assert.ok(m.html.includes('class="details"'), `${type} renders the detail table`)
    for (const l of labels) assert.ok(new RegExp(`class="dl"[^>]*>${l}<`).test(m.html), `${type} has a "${l}" row`)
  }
  // Row formatting options: cap + suffix.
  const t = et.renderEmail('ticket_received', et.EMAIL_DEFS.ticket_received.sampleData)
  assert.ok(/class="dv"[^>]*>Open</.test(t.html), 'status row is capitalized')
  const p = et.renderEmail('company_pool_threshold', et.EMAIL_DEFS.company_pool_threshold.sampleData)
  assert.ok(/class="dv"[^>]*>75%</.test(p.html), 'percent row carries its suffix')
})

test('every email has a real preheader and a scannable body', () => {
  for (const type of et.EMAIL_TYPES) {
    const d = et.EMAIL_DEFS[type]
    assert.ok(d.defaultPreheader && d.defaultPreheader.length >= 20, `${type} has an explicit preheader`)
    const m = et.renderEmail(type, d.sampleData || {})
    const pre = (m.html.match(/mso-hide:all;font-family:sans-serif;">([^&]*)/) || [])[1] || ''
    assert.ok(pre.length >= 20 && !/^hi\b/i.test(pre), `${type} preheader is not the greeting`)
    assert.ok(!/[–—]/.test(m.subject + m.html + m.text), `${type} has no em/en dash`)
    // Scannable: no paragraph in the rendered body runs longer than ~3 sentences.
    for (const para of m.html.match(/<p class="p"[^>]*>([\s\S]*?)<\/p>/g) || []) {
      const textOnly = para.replace(/<[^>]+>/g, '')
      const sentences = (textOnly.match(/[.!?](\s|$)/g) || []).length
      assert.ok(sentences <= 3, `${type} paragraph is a wall of text: "${textOnly.slice(0, 60)}..."`)
    }
  }
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
