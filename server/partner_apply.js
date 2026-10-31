// "Partner with AdmireVeda": the public partner application (corporate site).
// An application lands in the SAME inbox as the contact form (superadmin
// Contacts + the contact notification email), with the partner details laid
// out in the message, so there is one inbox and one notification path.
//
//   POST /api/work/partners/apply
//     { name, email, company, website?, type, regions?, industries?, teamSize?, note? }
export const PARTNER_TYPES = Object.freeze(['reseller', 'implementation', 'referral', 'technology'])
const clip = (v, n) => String(v == null ? '' : v).trim().slice(0, n)
const fail = (status, error) => Object.assign(new Error(error), { status })

// Pure: validate and shape one application (throws a person-facing error).
export function readPartnerApplication(body) {
  const b = body || {}
  const app = {
    name: clip(b.name, 120), email: clip(b.email, 200), company: clip(b.company, 160), website: clip(b.website, 200),
    type: clip(b.type, 40).toLowerCase(), regions: clip(b.regions, 300), industries: clip(b.industries, 300),
    teamSize: clip(b.teamSize, 40), note: clip(b.note, 3000),
  }
  if (!app.name || !app.email || !app.company) throw fail(400, 'Your name, work email and company are required.')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(app.email)) throw fail(400, 'Enter a valid email address.')
  if (!PARTNER_TYPES.includes(app.type)) throw fail(400, 'Choose how you would like to partner with us.')
  if (app.website && !/^(https?:\/\/)?[\w.-]+\.[a-z]{2,}(\/\S*)?$/i.test(app.website)) throw fail(400, 'Enter your company website, for example example.com.')
  return app
}

export function partnerMessage(a) {
  return [
    `Partner application (${a.type})`,
    `Company: ${a.company}`,
    a.website && `Website: ${a.website}`,
    a.regions && `Regions: ${a.regions}`,
    a.industries && `Industries: ${a.industries}`,
    a.teamSize && `Team size: ${a.teamSize}`,
    a.note && `\n${a.note}`,
  ].filter(Boolean).join('\n')
}

export function registerPartnerRoutes(app, { store, wrap, rateOk, notify, companiesOn }) {
  if (!app || !store || !wrap || !rateOk || !notify || !companiesOn) throw new Error('registerPartnerRoutes: missing deps')
  app.post('/api/work/partners/apply', wrap((req, res) => {
    // The partner program is for the organizations site (resellers and
    // implementers sell to companies); individuals have the affiliate program.
    if (!companiesOn()) return res.status(403).json({ error: 'The partner program is not offered here.', companiesDisabled: true })
    let a
    try { a = readPartnerApplication(req.body) } catch (e) { return res.status(e.status || 400).json({ error: e.message }) }
    const ip = String(req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim()
    if (!rateOk(ip)) return res.status(429).json({ error: 'Too many submissions just now. Please try again shortly.' })
    const subject = `Partner application: ${a.company}`
    const message = partnerMessage(a)
    const rec = store.addContactSubmission({ name: a.name, email: a.email, subject, message, company: a.company, topic: 'partnership' }, { ip })
    notify({ name: a.name, email: a.email, subject, message, submittedAt: rec.at, ip })
    res.json({ ok: true })
  }))
}
