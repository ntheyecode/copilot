// The public contact form ("Talk to us"). One reader validates and shapes a
// submission; the route stores it in the superadmin Contacts inbox and sends
// the contact notification. Owner (2026-10-31): the form asks for what a sales
// or support team needs: job title, company, work email, phone, country and the
// kind of inquiry.
//
//   POST /api/work/contact
//     { name, email, company?, jobTitle?, phone?, country?, topic, subject?, message }
import { isCountryCode, countryNameEn } from './countries.js'

// The kinds of inquiry, in the order the form offers them (codes, never translated).
export const CONTACT_TOPICS = Object.freeze(['sales', 'technical', 'support', 'billing', 'partnership', 'security', 'press', 'other'])
const TOPIC_LABEL_EN = { sales: 'Sales and business', technical: 'Technical question', support: 'Customer support', billing: 'Billing and invoices', partnership: 'Partnership', security: 'Privacy and security', press: 'Press and media', other: 'Something else' }

const clip = (v, n) => String(v == null ? '' : v).trim().slice(0, n)
const fail = (status, error, field) => Object.assign(new Error(error), { status, field })

export function readContactForm(body) {
  const b = body || {}
  const f = {
    name: clip(b.name, 120), email: clip(b.email, 160), company: clip(b.company, 160), jobTitle: clip(b.jobTitle, 120),
    phone: clip(b.phone, 40), country: clip(b.country, 2).toUpperCase(), topic: clip(b.topic, 20).toLowerCase() || 'other',
    subject: clip(b.subject, 200), message: clip(b.message, 4000),
  }
  if (!f.name) throw fail(400, 'Please enter your name.', 'name')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email)) throw fail(400, 'Enter a valid email address.', 'email')
  if (!CONTACT_TOPICS.includes(f.topic)) throw fail(400, 'Choose what your message is about.', 'topic')
  if (f.phone && !/^\+?[\d\s().-]{6,40}$/.test(f.phone)) throw fail(400, 'Enter a phone number with digits only, for example +1 415 555 0100.', 'phone')
  if (f.country && !isCountryCode(f.country)) throw fail(400, 'Choose your country from the list.', 'country')
  if (f.message.length < 5) throw fail(400, 'Please add a little more detail to your message.', 'message')
  return f
}

// The details a person on our side needs, laid out above the message.
export function contactDetails(f) {
  return [
    `Inquiry: ${TOPIC_LABEL_EN[f.topic] || f.topic}`,
    f.company && `Company: ${f.company}`,
    f.jobTitle && `Title: ${f.jobTitle}`,
    f.phone && `Phone: ${f.phone}`,
    f.country && `Country: ${countryNameEn(f.country)} (${f.country})`,
  ].filter(Boolean).join('\n')
}

export function registerContactRoutes(app, { store, wrap, rateOk, notify }) {
  if (!app || !store || !wrap || !rateOk || !notify) throw new Error('registerContactRoutes: missing deps')
  app.post('/api/work/contact', wrap((req, res) => {
    let f
    try { f = readContactForm(req.body) } catch (e) { return res.status(e.status || 400).json({ error: e.message, field: e.field }) }
    const ip = String(req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim()
    if (!rateOk(ip)) return res.status(429).json({ error: 'Too many submissions just now. Please try again shortly.' })
    const subject = f.subject || `${TOPIC_LABEL_EN[f.topic]}${f.company ? `: ${f.company}` : ''}`
    const rec = store.addContactSubmission({ ...f, subject }, { ip })
    notify({ name: f.name, email: f.email, subject, message: `${contactDetails(f)}\n\n${f.message}`, submittedAt: rec.at, ip })
    res.json({ ok: true })
  }))
}
