// ---------------------------------------------------------------------------
// WorkCoPilot - editable transactional email system.
//
// Two halves, deliberately separated:
//
//   1. THE ENVELOPE (fixed, designed once): renderLayout() produces the branded
//      HTML chrome - header band with the wordmark, white card, H1, body,
//      bulletproof CTA button, optional label/value rows, footer with
//      AdmireVeda / COE Security LLC and the year. Table layout, inline CSS,
//      VML button for Outlook, light-first with dark-mode rules layered on.
//      Admins do not edit this; it is what keeps every email looking like the
//      same product.
//
//   2. THE CONTENT (editable from the superadmin dashboard): EMAIL_DEFS holds,
//      per email type, the default subject / heading / body / CTA label plus
//      the placeholder catalog and realistic sample data. The backend stores
//      overrides for those four fields; renderEmail() merges overrides over
//      defaults, substitutes <Tokens> from the send-time data, and hands the
//      result to the envelope. Nothing customer-facing is hardcoded in a way
//      an admin cannot change.
//
// Body text is plain text with three small conveniences (documented in
// BODY_SYNTAX_HELP so the admin UI can show them):
//   - a blank line starts a new paragraph; a single newline is a line break
//   - **like this** renders bold
//   - a line starting with "> " renders as a highlighted note (used for the
//     "if you did not request this" security lines)
//   - a line made only of a label and tokens that all resolve empty is
//     dropped, so "Workspace: <Company>" vanishes when there is no company
// Bare http(s) URLs in the body become links, which is how the "if the button
// does not work" fallback link works without any HTML in the editor.
//
// No dependencies. US English. No em-dashes anywhere (hyphens only). Never
// throws: unknown types, missing fields and renderer errors all degrade to a
// usable branded message rather than aborting a send.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Brand constants. Change them here and every email follows.
// ---------------------------------------------------------------------------
export const BRAND = Object.freeze({
  product: 'WorkCoPilot',
  company: 'AdmireVeda / COE Security LLC',
  companyShort: 'AdmireVeda',
  site: 'https://admireveda.com',
  appUrl: 'https://admireveda.com/work',
  billingUrl: 'https://admireveda.com/work/billing',
  howItWorksUrl: 'https://admireveda.com/how-it-works',
  supportEmail: 'support@admireveda.com',
})

const C = {
  green: '#0a9d66',
  deep: '#2f6f3e',
  accent: '#ff9a4d',
  // Primary CTA color - matches the website's action buttons (.wm-cta warm
  // gradient ff9a4d -> f26a43). Green is the brand/identity color (header,
  // links); orange is the action color, so email buttons are orange too.
  cta: '#f26a43',
  ctaHover: '#d9552f',
  ink: '#111827',
  muted: '#6b7280',
  surface: '#f6f8fa',
  border: '#e5e7eb',
  white: '#ffffff',
  noteBg: '#f6f8fa',
  noteBar: '#0a9d66',
  noteFg: '#374151',
}

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace"

export const BODY_SYNTAX_HELP =
  'Plain text. A blank line starts a new paragraph. Wrap words in **double asterisks** for bold. ' +
  'Start a line with "> " for a highlighted note. Web links are clickable automatically. ' +
  'Use the placeholders listed for this email, e.g. <First_Name>; a line that is only a label ' +
  'and an empty placeholder (such as "Workspace: <Company>") is left out when the value is missing.'

// ---------------------------------------------------------------------------
// Small utilities
// ---------------------------------------------------------------------------
function esc(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function str(v, fallback = '') {
  if (v == null) return fallback
  const s = String(v).trim()
  return s || fallback
}

// Attribute-safe URL: only http(s) and mailto survive.
function safeUrl(u, fallback = '') {
  const s = str(u)
  if (/^(https?:\/\/|mailto:)/i.test(s)) return s
  return fallback
}

function firstName(name, fallback = 'there') {
  const s = str(name)
  if (!s) return fallback
  return s.split(/\s+/)[0]
}

// Money: amount in major units (12.5 => $12.50). Currency is a 3-letter code
// in any case. Falls back to "12.50 XYZ" if Intl rejects the code.
export function formatMoney(amount, currency = 'usd') {
  if (amount == null || amount === '') return ''
  const n = Number(amount)
  if (!Number.isFinite(n)) return String(amount)
  const cur = str(currency, 'usd').toUpperCase().slice(0, 3)
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: cur }).format(n)
  } catch {
    return `${n.toFixed(2)} ${cur}`
  }
}

// Dates: accepts a Date, an ISO string, epoch millis, or a free-form label.
// Returns "October 23, 2026" for anything parseable and the original text
// otherwise, so a caller who already formatted the date is not fought.
export function formatDate(value, { withTime = false } = {}) {
  if (value == null || value === '') return ''
  let d
  if (value instanceof Date) d = value
  else if (typeof value === 'number') d = new Date(value)
  else if (/^\d{10,}$/.test(String(value).trim())) d = new Date(Number(value))
  else if (/^\d{4}-\d{2}-\d{2}$/.test(String(value).trim())) {
    // A date-only string is a calendar day, not an instant. Pin it to noon
    // UTC so no timezone (ours or the formatter's) can roll it to the day
    // before - "2026-10-23" must always print as October 23.
    const [y, m, day] = String(value).trim().split('-').map(Number)
    d = new Date(Date.UTC(y, m - 1, day, 12))
  }
  else d = new Date(String(value))
  if (Number.isNaN(d.getTime())) return String(value)
  try {
    const opts = { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/New_York' }
    if (withTime) Object.assign(opts, { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })
    return new Intl.DateTimeFormat('en-US', opts).format(d)
  } catch {
    return d.toISOString().slice(0, 10)
  }
}

function wrapText(s, width = 76) {
  const out = []
  for (const para of String(s).split('\n')) {
    let line = ''
    for (const word of para.split(/\s+/).filter(Boolean)) {
      if ((line + ' ' + word).trim().length > width && line) { out.push(line); line = word }
      else line = (line ? line + ' ' : '') + word
    }
    out.push(line)
  }
  return out.join('\n')
}

// Tidy a substituted one-liner (subject / heading): collapse spaces left by
// empty tokens and drop a dangling separator such as "Receipt - ".
function tidyLine(s) {
  return String(s)
    .replace(/\(\s*\)/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/\s*[-:|]\s*$/g, '')
    .trim()
}

// ---------------------------------------------------------------------------
// Placeholder substitution
//
// Tokens look like <First_Name>. Matching is case-insensitive and ignores
// underscores, so <first_name>, <FirstName> and <First_Name> are the same
// token. Resolution order: derived tokens (formatted money, dates, first
// name, brand constants), then the raw data keys (so <Set_Link> reaches
// data.setLink and <setLink> does too). Unmatched tokens become "".
// ---------------------------------------------------------------------------
const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '')

// Derived tokens: things that need formatting or come from the brand.
const DERIVED = {
  firstname: (d) => str(d.firstName) || firstName(d.name),
  name: (d) => str(d.name, 'there'),
  amount: (d) => formatMoney(d.amount, d.currency),
  currency: (d) => str(d.currency, 'usd').toUpperCase(),
  date: (d) => formatDate(d.date),
  submittedat: (d) => formatDate(d.submittedAt, { withTime: true }),
  changedat: (d) => formatDate(d.changedAt, { withTime: true }),
  nextbillingdate: (d) => formatDate(d.nextBillingDate),
  status: (d) => str(d.status).replace(/_/g, ' '),
  product: () => BRAND.product,
  companyname: () => BRAND.companyShort,
  legalentity: () => BRAND.company,
  supportemail: () => BRAND.supportEmail,
  appurl: (d) => safeUrl(d.appUrl, BRAND.appUrl),
  billingurl: (d) => safeUrl(d.billingUrl, BRAND.billingUrl),
  siteurl: () => BRAND.site,
  howitworksurl: () => BRAND.howItWorksUrl,
  year: () => String(new Date().getFullYear()),
}

function resolveToken(rawName, data) {
  const key = norm(rawName)
  if (!key) return ''
  if (DERIVED[key]) {
    try { return str(DERIVED[key](data)) } catch { return '' }
  }
  for (const k of Object.keys(data)) {
    if (norm(k) === key) {
      const v = data[k]
      if (v == null) return ''
      if (v instanceof Date) return formatDate(v)
      if (typeof v === 'object') return ''
      return String(v)
    }
  }
  return ''
}

const TOKEN_RE = /<([A-Za-z][A-Za-z0-9_ ]*)>/g

export function substitute(input, data) {
  const d = (data && typeof data === 'object') ? data : {}
  const src = input == null ? '' : String(input)
  // Line-aware so that a label-only line whose tokens all resolve empty can
  // be dropped instead of leaving "Workspace:" hanging in the email.
  const lines = src.split('\n')
  const out = []
  for (const line of lines) {
    let sawToken = false
    let anyValue = false
    let replaced = line.replace(TOKEN_RE, (_, name) => {
      sawToken = true
      const v = resolveToken(name, d).replace(/\r\n?/g, '\n')
      if (v !== '') anyValue = true
      return v
    })
    // A multi-line value (a contact message) dropped into a "> " note line
    // must keep the note going: prefix its continuation lines too, so blank
    // lines inside the value do not end the note block.
    if (/^>\s?/.test(line) && replaced.includes('\n')) {
      replaced = replaced.split('\n').map((l, i) => (i === 0 ? l : '> ' + l)).join('\n')
    }
    if (sawToken && !anyValue) {
      const rest = replaced.replace(/\*\*/g, '').trim()
      if (rest === '' || /^[^.!?]*:$/.test(rest)) continue
    }
    out.push(replaced)
  }
  return out.join('\n')
}

// ---------------------------------------------------------------------------
// HTML building blocks. Everything is a table; everything carries inline
// styles; class names exist only so the dark-mode block can target them.
// ---------------------------------------------------------------------------
function paragraphHtml(inner, extra = '') {
  return `<p class="p" style="margin:0 0 16px 0;font-family:${FONT};font-size:16px;line-height:26px;color:${C.ink};${extra}">${inner}</p>`
}

function headingHtml(text) {
  if (!str(text)) return ''
  return `<h1 class="h1" style="margin:0 0 18px 0;font-family:${FONT};font-size:26px;line-height:34px;font-weight:700;letter-spacing:-0.2px;color:${C.ink};">${esc(text)}</h1>`
}

function eyebrowHtml(text, color = C.green) {
  if (!str(text)) return ''
  return `<p class="eyebrow" style="margin:0 0 10px 0;font-family:${FONT};font-size:12px;line-height:16px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:${color};">${esc(text)}</p>`
}

// Bulletproof button: VML roundrect for Outlook on Windows, a padded <a> for
// everyone else. The whole shape is clickable in both.
function buttonHtml(label, url, color = C.cta) {
  const href = esc(url)
  const text = esc(label)
  return `
<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin:8px 0 24px 0;">
  <tr>
    <td align="center" style="border-radius:8px;background:${color};">
      <!--[if mso]>
      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${href}" style="height:48px;v-text-anchor:middle;width:260px;" arcsize="17%" strokecolor="${color}" fillcolor="${color}">
        <w:anchorlock/>
        <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">${text}</center>
      </v:roundrect>
      <![endif]-->
      <!--[if !mso]><!-- -->
      <a href="${href}" target="_blank" class="btn" style="display:inline-block;padding:14px 32px;font-family:${FONT};font-size:16px;line-height:20px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px;background:${color};mso-hide:all;">${text}</a>
      <!--<![endif]-->
    </td>
  </tr>
</table>`
}

// Label / value rows. rows: [{ label, value, strong?, mono?, href? }]
function rowsHtml(rows) {
  const items = (Array.isArray(rows) ? rows : []).filter((r) => r && str(r.label) && str(r.value))
  if (!items.length) return ''
  const tr = items.map((r, i) => {
    const last = i === items.length - 1
    const border = last ? '0' : `1px solid ${C.border}`
    let val = esc(r.value)
    if (r.mono) val = `<span style="font-family:${MONO};font-size:13px;">${val}</span>`
    const href = safeUrl(r.href) || (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(r.value)) ? `mailto:${String(r.value).trim()}` : '')
    if (href) val = `<a href="${esc(href)}" style="color:${C.green};text-decoration:underline;">${val}</a>`
    const strong = r.strong ? 'font-weight:700;' : ''
    const size = r.strong ? 'font-size:17px;line-height:24px;' : 'font-size:15px;line-height:22px;'
    return `
    <tr>
      <td class="dl" style="padding:12px 16px;border-bottom:${border};font-family:${FONT};font-size:13px;line-height:20px;color:${C.muted};vertical-align:top;width:38%;">${esc(r.label)}</td>
      <td class="dv" style="padding:12px 16px;border-bottom:${border};font-family:${FONT};${size}color:${C.ink};vertical-align:top;${strong}word-break:break-word;">${val}</td>
    </tr>`
  }).join('')
  return `
<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" class="details" style="margin:4px 0 24px 0;border:1px solid ${C.border};border-radius:10px;border-collapse:separate;background:${C.white};">
  ${tr}
</table>`
}

// Highlighted note with a colored left bar.
function noteHtml(inner) {
  return `
<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="margin:0 0 24px 0;">
  <tr>
    <td class="note" style="padding:14px 18px;border-left:4px solid ${C.noteBar};border-radius:0 8px 8px 0;background:${C.noteBg};font-family:${FONT};font-size:14px;line-height:22px;color:${C.noteFg};">${inner}</td>
  </tr>
</table>`
}

// Inline formatting for one paragraph of plain text: escape, **bold**,
// auto-link URLs and email addresses, newline -> <br>.
function inlineHtml(text) {
  let s = esc(text)
  s = s.replace(/\*\*([^*\n][^*]*?)\*\*/g, '<strong>$1</strong>')
  s = s.replace(/(https?:\/\/[^\s<>"']+[^\s<>"'.,;:!?)])/g, (m) => `<a href="${m}" style="color:${C.green};text-decoration:underline;word-break:break-all;">${m}</a>`)
  s = s.replace(/(^|[\s(])([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})(?=$|[\s),.;:!?])/g, (m, pre, addr) => `${pre}<a href="mailto:${addr}" style="color:${C.green};text-decoration:underline;">${addr}</a>`)
  return s.replace(/\n/g, '<br>')
}

// Body text -> HTML blocks. Blank line separates paragraphs; "> " prefix
// marks a note; everything else is a paragraph.
export function bodyToHtml(bodyText) {
  const blocks = String(bodyText == null ? '' : bodyText).replace(/\r\n?/g, '\n').split(/\n\s*\n/)
  const out = []
  for (const raw of blocks) {
    const block = raw.replace(/^\n+|\n+$/g, '')
    if (!block.trim()) continue
    const lines = block.split('\n')
    if (lines.every((l) => /^>\s?/.test(l))) {
      out.push(noteHtml(inlineHtml(lines.map((l) => l.replace(/^>\s?/, '')).join('\n'))))
    } else {
      out.push(paragraphHtml(inlineHtml(block)))
    }
  }
  // The last paragraph should not push the CTA away; trim its bottom margin.
  if (out.length && out[out.length - 1].startsWith('<p ')) {
    out[out.length - 1] = out[out.length - 1].replace('margin:0 0 16px 0;', 'margin:0 0 20px 0;')
  }
  return out.join('')
}

function bodyToText(bodyText) {
  return String(bodyText == null ? '' : bodyText)
    .replace(/\r\n?/g, '\n')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .split('\n').map((l) => l.replace(/^>\s?/, '')).join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// ---------------------------------------------------------------------------
// The envelope: renderLayout()
//
//   preheader   hidden preview text (inbox snippet)
//   heading     H1 text
//   bodyHtml    already-rendered HTML for the body (see bodyToHtml)
//   cta         { label, url, color? } or null
//   rows        [{ label, value, strong?, mono?, href? }] or null
//   footerNote  optional extra line in the footer (e.g. why they got this)
//   eyebrow     optional small kicker above the H1
//   badge       optional pill in the header (e.g. "Internal")
// ---------------------------------------------------------------------------
export function renderLayout({ preheader, heading, bodyHtml, cta, rows, footerNote, eyebrow, badge, eyebrowColor } = {}) {
  const year = new Date().getFullYear()
  const title = str(heading, BRAND.product)
  const pre = str(preheader, title)
  const ctaHtml = (cta && str(cta.label) && safeUrl(cta.url))
    ? buttonHtml(cta.label, safeUrl(cta.url), cta.color || C.cta)
    : ''
  const badgeHtml = str(badge)
    ? `<td align="right" style="font-family:${FONT};font-size:11px;line-height:16px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#d7f2e5;"><span style="display:inline-block;padding:3px 10px;border:1px solid #8fd5b5;border-radius:999px;">${esc(badge)}</span></td>`
    : ''
  const footNote = str(footerNote)
    ? `<p class="foot" style="margin:0 0 10px 0;font-family:${FONT};font-size:12px;line-height:18px;color:${C.muted};">${esc(footerNote)}</p>`
    : ''

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="en">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${esc(title)}</title>
<!--[if mso]>
<xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml>
<style>table,td,div,p,a{font-family:Arial,sans-serif !important;}</style>
<![endif]-->
<style>
  html,body{margin:0 !important;padding:0 !important;height:100% !important;width:100% !important;}
  *{-ms-text-size-adjust:100%;-webkit-text-size-adjust:100%;}
  table,td{mso-table-lspace:0pt !important;mso-table-rspace:0pt !important;border-spacing:0 !important;}
  img{-ms-interpolation-mode:bicubic;border:0;outline:none;text-decoration:none;}
  a{color:${C.green};}
  a[x-apple-data-detectors]{color:inherit !important;text-decoration:none !important;}
  u + #body a{color:inherit;text-decoration:none;}
  #MessageViewBody a{color:inherit;text-decoration:none;}
  .btn:hover{background:${C.ctaHover} !important;}
  @media screen and (max-width:620px){
    .container{width:100% !important;max-width:100% !important;}
    .card{padding:28px 22px !important;}
    .header{padding:20px 22px !important;}
    .footer{padding:22px 22px !important;}
    .h1{font-size:23px !important;line-height:30px !important;}
    .dl{width:34% !important;}
  }
  @media (prefers-color-scheme: dark){
    body,.bg{background:#0f1419 !important;}
    .card,.details{background:#1b2129 !important;border-color:#2b3440 !important;}
    .h1,.p,.dv{color:#f3f4f6 !important;}
    .dl,.foot{color:#9aa4b2 !important;}
    .dl,.dv{border-color:#2b3440 !important;}
    .note{background:#141a21 !important;color:#d1d5db !important;}
    .foot a{color:#9aa4b2 !important;}
  }
  [data-ogsc] .card,[data-ogsc] .details{background:#1b2129 !important;}
  [data-ogsc] .h1,[data-ogsc] .p,[data-ogsc] .dv{color:#f3f4f6 !important;}
</style>
</head>
<body id="body" style="margin:0;padding:0;background:${C.surface};" bgcolor="${C.surface}">
<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;font-family:sans-serif;">${esc(pre.slice(0, 160))}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" class="bg" style="background:${C.surface};" bgcolor="${C.surface}">
  <tr>
    <td align="center" style="padding:32px 12px;">
      <!--[if mso]><table role="presentation" width="600" border="0" cellpadding="0" cellspacing="0" align="center"><tr><td><![endif]-->
      <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" class="container" style="width:100%;max-width:600px;margin:0 auto;">

        <!-- Header band -->
        <tr>
          <td class="header" style="padding:22px 36px;border-radius:14px 14px 0 0;background:${C.green};background-image:linear-gradient(100deg,${C.green} 0%,${C.deep} 100%);" bgcolor="${C.green}">
            <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
              <tr>
                <td style="vertical-align:middle;">
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="vertical-align:middle;padding-right:10px;">
                        <table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr>
                          <td align="center" style="width:28px;height:28px;border-radius:8px;background:#ffffff;font-family:${FONT};font-size:15px;line-height:28px;font-weight:800;color:${C.green};mso-line-height-rule:exactly;">W</td>
                        </tr></table>
                      </td>
                      <td style="vertical-align:middle;font-family:${FONT};font-size:20px;line-height:28px;font-weight:700;letter-spacing:-0.2px;color:#ffffff;">${BRAND.product}</td>
                    </tr>
                  </table>
                </td>
                ${badgeHtml}
              </tr>
            </table>
          </td>
        </tr>

        <!-- Card -->
        <tr>
          <td class="card" style="padding:40px 36px 32px 36px;background:${C.white};border:1px solid ${C.border};border-top:0;border-radius:0 0 14px 14px;" bgcolor="${C.white}">
            ${eyebrowHtml(eyebrow, eyebrowColor)}
            ${headingHtml(heading)}
            ${bodyHtml || ''}
            ${rowsHtml(rows)}
            ${ctaHtml}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td class="footer" style="padding:26px 36px 8px 36px;">
            ${footNote}
            <p class="foot" style="margin:0 0 6px 0;font-family:${FONT};font-size:12px;line-height:18px;color:${C.muted};">
              ${BRAND.product} is a product of <strong style="color:${C.muted};">${esc(BRAND.company)}</strong>
            </p>
            <p class="foot" style="margin:0 0 6px 0;font-family:${FONT};font-size:12px;line-height:18px;color:${C.muted};">
              Questions? Reply to this email or write to <a href="mailto:${BRAND.supportEmail}" style="color:${C.muted};text-decoration:underline;">${BRAND.supportEmail}</a>
            </p>
            <p class="foot" style="margin:0;font-family:${FONT};font-size:12px;line-height:18px;color:${C.muted};">
              <a href="${BRAND.site}" style="color:${C.muted};text-decoration:underline;">admireveda.com</a> &nbsp;&middot;&nbsp; &copy; ${year} ${esc(BRAND.companyShort)}. All rights reserved.
            </p>
          </td>
        </tr>
      </table>
      <!--[if mso]></td></tr></table><![endif]-->
    </td>
  </tr>
</table>
</body>
</html>`
}

// Plain-text twin of the envelope.
function renderTextLayout({ heading, bodyText, cta, rows, footerNote }) {
  const year = new Date().getFullYear()
  const parts = []
  if (str(heading)) parts.push(heading, '')
  if (str(bodyText)) parts.push(bodyText, '')
  const items = (Array.isArray(rows) ? rows : []).filter((r) => r && str(r.label) && str(r.value))
  if (items.length) {
    for (const r of items) parts.push(`${r.label}: ${r.value}`)
    parts.push('')
  }
  if (cta && str(cta.label) && safeUrl(cta.url)) parts.push(`${cta.label}: ${safeUrl(cta.url)}`, '')
  parts.push('--')
  if (str(footerNote)) parts.push(footerNote)
  parts.push(
    `${BRAND.product} is a product of ${BRAND.company}`,
    `Questions? Reply to this email or write to ${BRAND.supportEmail}`,
    `${BRAND.site}  |  (c) ${year} ${BRAND.companyShort}. All rights reserved.`,
  )
  return wrapText(`${BRAND.product}\n${'='.repeat(BRAND.product.length)}\n\n${parts.join('\n')}`)
}

// ---------------------------------------------------------------------------
// Placeholder catalog
// ---------------------------------------------------------------------------
const P = (token, desc, sample) => ({ token, desc, sample })

// Available in every email.
const GLOBAL_PLACEHOLDERS = [
  P('<First_Name>', 'Recipient first name (first word of their name)', 'Alex'),
  P('<Name>', 'Recipient full name', 'Alex Morgan'),
  P('<Product>', 'Product name', 'WorkCoPilot'),
  P('<Support_Email>', 'Support address', BRAND.supportEmail),
  P('<App_Url>', 'Link to the WorkCoPilot app', BRAND.appUrl),
  P('<Site_Url>', 'Link to the website', BRAND.site),
  P('<How_It_Works_Url>', 'Link to the How it works page', BRAND.howItWorksUrl),
  P('<Year>', 'Current year', String(new Date().getFullYear())),
]

// Row recipes used when the caller passes flat data without a rows array.
// fmt: 'money' | 'date' | 'datetime' | undefined. Only rows with a value show.
const R = (label, key, opts = {}) => ({ label, key, ...opts })

// ---------------------------------------------------------------------------
// EMAIL_DEFS - the editable content, with defaults an admin starts from.
// ---------------------------------------------------------------------------
const DEFS = {
  welcome_set_password: {
    label: 'Welcome - set your password',
    category: 'account',
    description: 'Sent when an admin creates an account; invites the person to choose a password.',
    eyebrow: 'Welcome',
    defaultSubject: 'Your WorkCoPilot account is ready',
    defaultHeading: 'Set your password to get started',
    defaultBody:
`Hi <First_Name>,

An account has been created for you on WorkCoPilot. Choose a password and you are in. From then on, WorkCoPilot can watch your screen as you work and guide you one clear step at a time. It never takes control.

Sign-in name: **<Username>**
Workspace: <Company>
Link valid for: <Expires_Label>

> If you did not expect this invitation, you can safely ignore this email. Nothing changes on your account until the link is used.

If the button does not work, copy and paste this link into your browser:
<Set_Link>

Welcome aboard,
The WorkCoPilot team`,
    defaultCtaLabel: 'Set my password',
    ctaUrlToken: 'setLink',
    placeholders: [
      P('<Username>', 'Sign-in name for the new account', 'alex.morgan'),
      P('<Set_Link>', 'One-time link to set the password', 'https://admireveda.com/work/set-password?token=SAMPLE'),
      P('<Expires_Label>', 'How long the link is valid', '24 hours'),
      P('<Company>', 'Company or workspace the account belongs to', 'Northwind Logistics'),
    ],
    defaults: { expiresLabel: '24 hours' },
    sampleData: {
      name: 'Alex Morgan',
      username: 'alex.morgan',
      setLink: 'https://admireveda.com/work/set-password?token=SAMPLE',
      expiresLabel: '24 hours',
      company: 'Northwind Logistics',
    },
    showRows: false,
  },

  welcome_sso: {
    label: 'Welcome - single sign-on',
    category: 'account',
    description: 'Sent when an admin adds an account at a company that uses single sign-on (no password to set).',
    eyebrow: 'Welcome',
    defaultSubject: 'Your WorkCoPilot account is ready',
    defaultHeading: 'You are all set',
    defaultBody:
`Hi <First_Name>,

An account has been created for you on WorkCoPilot. Your company uses single sign-on, so there is no password to set. Just sign in with your <Company> account and WorkCoPilot is ready to guide you through your work, one clear step at a time. It never takes control.

Sign-in email: **<Email>**
Workspace: <Company>

> If you did not expect this, you can safely ignore this email.

Welcome aboard,
The WorkCoPilot team`,
    defaultCtaLabel: 'Open WorkCoPilot',
    ctaUrlToken: 'appUrl',
    placeholders: [
      P('<Email>', 'The single sign-on email for the account', 'alex.morgan@northwind.com'),
      P('<Company>', 'Company or workspace the account belongs to', 'Northwind Logistics'),
    ],
    sampleData: {
      name: 'Alex Morgan',
      email: 'alex.morgan@northwind.com',
      company: 'Northwind Logistics',
    },
    showRows: false,
  },

  welcome: {
    label: 'Welcome - new sign-up',
    category: 'account',
    description: 'Sent when someone signs up for an account themselves (they already chose a password).',
    eyebrow: 'Welcome',
    defaultSubject: 'Welcome to WorkCoPilot',
    defaultHeading: 'Welcome aboard, <First_Name>',
    defaultBody:
`Hi <First_Name>,

Your WorkCoPilot account is ready. From here, WorkCoPilot can watch your screen as you work and guide you one clear step at a time, with the exact commands, code and links for whatever you are doing. It never takes control.

Open WorkCoPilot whenever you are ready and tell it what you want to get done.

Glad to have you,
The WorkCoPilot team`,
    defaultCtaLabel: 'Open WorkCoPilot',
    ctaUrlToken: 'appUrl',
    placeholders: [],
    sampleData: { name: 'Alex Morgan' },
    showRows: false,
  },

  reset_password: {
    label: 'Password reset',
    category: 'security',
    description: 'Sent when someone asks to reset their password.',
    eyebrow: 'Password reset',
    defaultSubject: 'Reset your WorkCoPilot password',
    defaultHeading: 'Choose a new password',
    defaultBody:
`Hi <First_Name>,

We received a request to reset the password on your WorkCoPilot account. Use the button below to choose a new one.

> This link expires in <Expires_Label> and can be used once. If you did not request a password reset, you can safely ignore this email. Your current password keeps working until you set a new one.

If the button does not work, copy and paste this link into your browser:
<Reset_Link>`,
    defaultCtaLabel: 'Reset my password',
    ctaUrlToken: 'resetLink',
    placeholders: [
      P('<Reset_Link>', 'One-time link to reset the password', 'https://admireveda.com/work/reset-password?token=SAMPLE'),
      P('<Expires_Label>', 'How long the link is valid', '1 hour'),
    ],
    defaults: { expiresLabel: '1 hour' },
    sampleData: {
      name: 'Alex Morgan',
      resetLink: 'https://admireveda.com/work/reset-password?token=SAMPLE',
      expiresLabel: '1 hour',
    },
    showRows: false,
  },

  password_changed: {
    label: 'Password changed',
    category: 'security',
    description: 'Confirmation sent after a password is changed, so the owner notices if it was not them.',
    eyebrow: 'Security notice',
    defaultSubject: 'Your WorkCoPilot password was changed',
    defaultHeading: 'Your password was changed',
    defaultBody:
`Hi <First_Name>,

The password on your WorkCoPilot account was changed on <Changed_At>. If you made this change, no further action is needed.

> **Did not do this?** Reset your password right away and write to <Support_Email> so we can secure your account.

Thanks for keeping your account secure.`,
    defaultCtaLabel: 'Open WorkCoPilot',
    ctaUrlToken: 'appUrl',
    placeholders: [
      P('<Changed_At>', 'When the change happened', 'October 23, 2026 at 2:14 PM EDT'),
    ],
    sampleData: {
      name: 'Alex Morgan',
      changedAt: '2026-10-23T18:14:00Z',
    },
    showRows: false,
  },

  contact_notify: {
    label: 'Contact form - staff notification',
    category: 'notifications',
    description: 'Internal alert to staff when someone submits the Contact Us form.',
    eyebrow: 'Contact form',
    badge: 'Internal',
    defaultSubject: 'New contact: <Name> - <Subject>',
    defaultHeading: 'New message from <Name>',
    defaultBody:
`Someone used the Contact Us form on admireveda.com. Their details are below, and the button opens a reply addressed to them.

> **Message**
> <Message>`,
    defaultCtaLabel: 'Reply to <First_Name>',
    ctaUrlToken: 'replyUrl',
    placeholders: [
      P('<Email>', 'Sender email address', 'alex.morgan@northwind.example'),
      P('<Subject>', 'Subject they entered', 'Pricing for a 40-seat team'),
      P('<Message>', 'Their message', 'We are evaluating screen-aware guidance tools...'),
      P('<Submitted_At>', 'When the form was submitted', 'October 23, 2026 at 9:41 AM EDT'),
      P('<Ip>', 'IP address of the submission', '203.0.113.42'),
    ],
    rowFields: [
      R('Name', 'name', { strong: true }),
      R('Email', 'email'),
      R('Subject', 'subject'),
      R('Submitted', 'submittedAt', { fmt: 'datetime' }),
      R('IP address', 'ip', { mono: true }),
    ],
    sampleData: {
      name: 'Alex Morgan',
      email: 'alex.morgan@northwind.example',
      subject: 'Pricing for a 40-seat team',
      message: 'We are evaluating screen-aware guidance tools for our dispatch team.\n\nCould you share pricing for about 40 seats and whether SSO is included?',
      submittedAt: '2026-10-23T13:41:00Z',
      ip: '203.0.113.42',
    },
    showRows: true,
  },

  contact_thank_you: {
    label: 'Contact form - thank you',
    category: 'forms',
    description: 'Sent to the person who submitted the Contact Us form.',
    eyebrow: 'Thanks for reaching out',
    defaultSubject: 'We received your message',
    defaultHeading: 'We have your message',
    defaultBody:
`Hi <First_Name>,

Thanks for getting in touch with WorkCoPilot. A real person on our team reads every message, and you will hear back from us within one business day.

In the meantime, our How it works page covers the most common questions about what WorkCoPilot does on your screen, and what it never does: <How_It_Works_Url>

Warm regards,
The WorkCoPilot team`,
    defaultCtaLabel: 'Visit WorkCoPilot',
    ctaUrlToken: 'siteUrl',
    placeholders: [],
    sampleData: { name: 'Alex Morgan' },
    showRows: false,
  },

  lead_notify: {
    label: 'Validate-it-live lead - staff notification',
    category: 'notifications',
    description: 'Internal alert when a website visitor runs a live validation and leaves their details.',
    eyebrow: 'Validate it live',
    badge: 'Internal',
    defaultSubject: 'New lead: <Name> (<Company>)',
    defaultHeading: 'New lead: <Name>',
    defaultBody:
`A visitor ran a live validation on the website and left their details. Fresh leads convert best within the hour.

**Phone:** <Phone>

> **Their question**
> <Question>`,
    defaultCtaLabel: 'Follow up with <First_Name>',
    ctaUrlToken: 'replyUrl',
    placeholders: [
      P('<Email>', 'Lead email address', 'alex.morgan@northwind.example'),
      P('<Phone>', 'Phone number they entered', '+1 (415) 555-0172'),
      P('<Company>', 'Company they entered', 'Northwind Logistics'),
      P('<Question>', 'The question they validated live', 'How do I bulk-reassign open tickets in Zendesk?'),
      P('<Verdict>', 'Verdict the widget showed them', 'Covered - 6 steps'),
      P('<Plan>', 'Plan they showed interest in', 'Advanced'),
      P('<Submitted_At>', 'When the lead came in', 'October 23, 2026 at 9:41 AM EDT'),
    ],
    rowFields: [
      R('Name', 'name', { strong: true }),
      R('Email', 'email'),
      R('Company', 'company'),
      R('Plan interest', 'plan'),
      R('Verdict shown', 'verdict'),
      R('Submitted', 'submittedAt', { fmt: 'datetime' }),
    ],
    sampleData: {
      name: 'Alex Morgan',
      email: 'alex.morgan@northwind.example',
      company: 'Northwind Logistics',
      question: 'How do I bulk-reassign open tickets in Zendesk without losing the SLA timers?',
      verdict: 'Covered - 6 steps',
      plan: 'Advanced',
      submittedAt: '2026-10-23T13:41:00Z',
    },
    showRows: true,
  },

  lead_thank_you: {
    label: 'Validate-it-live lead - thank you',
    category: 'forms',
    description: 'Sent to a website visitor after they run a live validation and leave their details.',
    eyebrow: 'Thanks for trying it',
    defaultSubject: 'Thanks for trying WorkCoPilot live',
    defaultHeading: 'You saw it work. Here is what comes next.',
    defaultBody:
`Hi <First_Name>,

Thanks for putting WorkCoPilot to the test on our website. That live answer is a small taste of what it does at your desk: it watches your screen, understands the task in front of you, and guides you one clear step at a time. It never takes control, and what it sees stays protected.

Someone from our team will reach out shortly to answer your questions and, if it is a fit, set you up with a trial. If you would rather not wait, reply to this email and tell us what you are working on.

Talk soon,
The WorkCoPilot team`,
    defaultCtaLabel: 'See how it works',
    ctaUrlToken: 'howItWorksUrl',
    placeholders: [
      P('<Company>', 'Company they entered', 'Northwind Logistics'),
      P('<Question>', 'The question they validated live', 'How do I bulk-reassign open tickets in Zendesk?'),
    ],
    sampleData: { name: 'Alex Morgan', company: 'Northwind Logistics', question: 'How do I bulk-reassign open tickets in Zendesk?' },
    showRows: false,
  },

  purchase_receipt: {
    label: 'Purchase receipt',
    category: 'billing',
    description: 'Receipt for a one-off purchase of hours or image credits.',
    eyebrow: 'Receipt',
    defaultSubject: 'Your WorkCoPilot receipt - <Amount>',
    defaultHeading: 'Thanks for your purchase',
    defaultBody:
`Hi <First_Name>,

Your purchase is complete and already available in your account. The details are below; keep this email for your records.

Need an invoice with a company name or tax ID on it? Reply to this email with the details and we will send one.`,
    defaultCtaLabel: 'Open WorkCoPilot',
    ctaUrlToken: 'appUrl',
    placeholders: [
      P('<Item>', 'What was purchased', '10 additional hours'),
      P('<Amount>', 'Total paid, formatted with currency', '$89.00'),
      P('<Date>', 'Purchase date', 'October 23, 2026'),
      P('<Reference>', 'Payment reference', 'pi_3Q8vL2SAMPLE'),
    ],
    rowFields: [
      R('Item', 'item'),
      R('Date', 'date', { fmt: 'date' }),
      R('Reference', 'reference', { mono: true }),
      R('Total paid', 'amount', { fmt: 'money', strong: true }),
    ],
    sampleData: {
      name: 'Alex Morgan',
      item: '10 additional hours',
      amount: 89,
      currency: 'usd',
      date: '2026-10-23',
      reference: 'pi_3Q8vL2SAMPLE',
    },
    showRows: true,
  },

  payment_success: {
    label: 'Payment received',
    category: 'billing',
    description: 'Sent when a subscription or one-off payment succeeds.',
    eyebrow: 'Payment received',
    defaultSubject: 'Payment received - <Amount>',
    defaultHeading: 'Thank you, your payment went through',
    defaultBody:
`Hi <First_Name>,

We have received your payment. Your WorkCoPilot service continues without interruption, and the details are below for your records.

Thanks for being a WorkCoPilot customer.`,
    defaultCtaLabel: 'View invoice',
    ctaUrlToken: 'invoiceUrl',
    placeholders: [
      P('<Description>', 'What the payment was for', 'WorkCoPilot Advanced - monthly'),
      P('<Amount>', 'Amount paid, formatted with currency', '$149.00'),
      P('<Date>', 'Payment date', 'October 23, 2026'),
      P('<Invoice_Url>', 'Link to the hosted invoice', 'https://admireveda.com/work/billing/invoice/SAMPLE'),
    ],
    rowFields: [
      R('Description', 'description'),
      R('Date', 'date', { fmt: 'date' }),
      R('Reference', 'reference', { mono: true }),
      R('Amount paid', 'amount', { fmt: 'money', strong: true }),
    ],
    sampleData: {
      name: 'Alex Morgan',
      description: 'WorkCoPilot Advanced - monthly',
      amount: 149,
      currency: 'usd',
      date: '2026-10-23',
      invoiceUrl: 'https://admireveda.com/work/billing/invoice/SAMPLE',
    },
    showRows: true,
  },

  payment_failed: {
    label: 'Payment failed',
    category: 'billing',
    description: 'Sent when a charge is declined; asks the customer to update their payment method.',
    eyebrow: 'Payment issue',
    eyebrowColor: C.accent,
    ctaColor: C.deep,
    defaultSubject: 'Action needed: your WorkCoPilot payment did not go through',
    defaultHeading: 'We could not process your payment',
    defaultBody:
`Hi <First_Name>,

Your most recent payment for **<Description>** did not go through. This usually comes down to an expired card, a spending limit, or a bank check that needs a quick confirmation.

> **Reason from the processor:** <Reason>

Update your payment method and we will retry right away. Your access stays on while you sort it out.

If you believe this is a mistake, reply to this email and we will look into it together.`,
    defaultCtaLabel: 'Update payment method',
    ctaUrlToken: 'retryUrl',
    placeholders: [
      P('<Description>', 'What the payment was for', 'WorkCoPilot Advanced - monthly'),
      P('<Reason>', 'Decline reason from the processor', 'Your card was declined.'),
      P('<Amount>', 'Amount attempted, formatted with currency', '$149.00'),
      P('<Retry_Url>', 'Link to update the payment method', BRAND.billingUrl),
    ],
    rowFields: [
      R('Description', 'description'),
      R('Amount due', 'amount', { fmt: 'money', strong: true }),
    ],
    defaults: { reason: 'The card issuer declined the charge.', retryUrl: BRAND.billingUrl },
    sampleData: {
      name: 'Alex Morgan',
      description: 'WorkCoPilot Advanced - monthly',
      reason: 'Your card was declined. Please contact your bank or try a different card.',
      amount: 149,
      currency: 'usd',
      retryUrl: BRAND.billingUrl,
    },
    showRows: true,
  },

  subscription_update: {
    label: 'Subscription update',
    category: 'billing',
    description: 'Sent when a subscription is created, renewed, canceled or falls past due.',
    eyebrow: 'Subscription',
    defaultSubject: 'Your WorkCoPilot subscription: <Status>',
    defaultHeading: 'Your subscription was updated',
    defaultBody:
`Hi <First_Name>,

Here is the latest on your WorkCoPilot subscription.

Plan: **<Plan>**
Status: **<Status>**
Next billing date: <Next_Billing_Date>

> If the status says **past due**, update your payment method to keep your access without interruption. If it says **canceled**, you keep access until the end of the current period and you can come back any time; your settings and history will be waiting.

Questions about your plan? Just reply to this email.`,
    defaultCtaLabel: 'Manage subscription',
    ctaUrlToken: 'billingUrl',
    placeholders: [
      P('<Status>', 'Subscription status (created, renewed, canceled, past due)', 'renewed'),
      P('<Plan>', 'Plan name', 'Advanced'),
      P('<Next_Billing_Date>', 'Next billing date', 'November 23, 2026'),
    ],
    sampleData: {
      name: 'Alex Morgan',
      status: 'renewed',
      plan: 'Advanced',
      nextBillingDate: '2026-11-23',
    },
    showRows: false,
  },

  affiliate_application_received: {
    label: 'Affiliate - application received',
    category: 'account',
    description: 'Sent to someone right after they apply to the affiliate program.',
    eyebrow: 'Affiliate program',
    defaultSubject: 'We received your affiliate application',
    defaultHeading: 'Thanks for applying',
    defaultBody:
`Hi <First_Name>,

Thank you for applying to the WorkCoPilot affiliate program. We have received your application and our team is reviewing it.

We review every application personally to keep the program high quality, so this takes a little time. You will get another email from us the moment a decision is made. If you are approved, that email will include a link to set your password and open your affiliate dashboard.

Thanks for wanting to partner with us,
The WorkCoPilot team`,
    defaultCtaLabel: null,
    ctaUrlToken: null,
    placeholders: [],
    sampleData: { name: 'Jordan Lee' },
    showRows: false,
  },

  affiliate_approved: {
    label: 'Affiliate - approved',
    category: 'account',
    description: 'Sent when an affiliate is approved; invites them to set a password and open their dashboard.',
    eyebrow: 'Affiliate program',
    defaultSubject: 'You are approved - welcome to the WorkCoPilot affiliate program',
    defaultHeading: 'You are in. Set your password to start.',
    defaultBody:
`Hi <First_Name>,

Great news - your application to the WorkCoPilot affiliate program has been approved.

Set your password below to open your affiliate dashboard, where you will find your unique referral link, your live stats, and your payout setup. You earn <Rate>% of each person's first payment when they sign up through your link, and the people you refer get a free month when they choose annual billing.

Sign-in name: **<Username>**
Link valid for: <Expires_Label>

If the button does not work, copy and paste this link into your browser:
<Set_Link>

Welcome aboard,
The WorkCoPilot team`,
    defaultCtaLabel: 'Set my password',
    ctaUrlToken: 'setLink',
    placeholders: [
      P('<Username>', 'Sign-in name for the affiliate account', 'jordan.lee'),
      P('<Set_Link>', 'One-time link to set the password', 'https://admireveda.com/work/set-password?token=SAMPLE'),
      P('<Expires_Label>', 'How long the link is valid', '24 hours'),
      P('<Rate>', 'The affiliate commission rate (percent)', '30'),
    ],
    defaults: { expiresLabel: '24 hours' },
    sampleData: {
      name: 'Jordan Lee',
      username: 'jordan.lee',
      setLink: 'https://admireveda.com/work/set-password?token=SAMPLE',
      expiresLabel: '24 hours',
      rate: '30',
    },
    showRows: false,
  },

  export_password_set: {
    label: 'Data export password set',
    category: 'security',
    description: 'Sent to authorized recipients when a company admin sets the data-export password. Carries the password ONLY, never the archive file or a download link.',
    eyebrow: 'Data export',
    defaultSubject: 'Your WorkCoPilot data-export password',
    defaultHeading: 'A data-export password was set',
    defaultBody:
`Hi <First_Name>,

A company administrator set the password that protects the WorkCoPilot encrypted data export for <Company>. You are listed as a recipient who is authorized to receive it.

Export password: **<Password>**

> Keep this password safe. It is the ONLY way to open an encrypted export archive (.wcpx file). WorkCoPilot does not store it and cannot recover it if it is lost. This email contains the password only, never the export file itself and never a download link.

If you did not expect this, contact your administrator so the password can be reset.`,
    defaultCtaLabel: null,
    ctaUrlToken: null,
    placeholders: [
      P('<Password>', 'The data-export password (sent once, to authorized recipients only)', 'correct-horse-battery-staple'),
      P('<Company>', 'Company the export belongs to', 'Northwind Logistics'),
    ],
    sampleData: {
      name: 'Alex Morgan',
      company: 'Northwind Logistics',
      password: 'correct-horse-battery-staple',
    },
    showRows: false,
  },
}

// Finish the defs: attach global placeholders, freeze.
for (const [type, def] of Object.entries(DEFS)) {
  def.type = type
  def.placeholders = [...(def.placeholders || []), ...GLOBAL_PLACEHOLDERS]
  def.showRows = !!def.showRows
  if (def.defaultCtaLabel === undefined) def.defaultCtaLabel = null
  if (def.ctaUrlToken === undefined) def.ctaUrlToken = null
}

export const EMAIL_DEFS = Object.freeze(DEFS)
export const EMAIL_TYPES = Object.freeze(Object.keys(EMAIL_DEFS))

// ---------------------------------------------------------------------------
// Data enrichment: derived values every template can rely on. Does not
// overwrite anything the caller supplied.
// ---------------------------------------------------------------------------
function enrich(def, data) {
  const d = { ...(def.defaults || {}), ...data }
  if (!str(d.firstName)) d.firstName = firstName(d.name)
  if (!safeUrl(d.appUrl)) d.appUrl = BRAND.appUrl
  if (!safeUrl(d.siteUrl)) d.siteUrl = BRAND.site
  if (!safeUrl(d.billingUrl)) d.billingUrl = BRAND.billingUrl
  if (!safeUrl(d.howItWorksUrl)) d.howItWorksUrl = BRAND.howItWorksUrl
  if (!safeUrl(d.replyUrl) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str(d.email))) {
    const subj = str(d.subject) ? `Re: ${str(d.subject)}` : 'Your WorkCoPilot question'
    d.replyUrl = `mailto:${str(d.email)}?subject=${encodeURIComponent(subj)}`
  }
  if (!str(d.changedAt) && def.type === 'password_changed') d.changedAt = new Date().toISOString()
  if (!str(d.submittedAt) && def.rowFields && def.rowFields.some((r) => r.key === 'submittedAt')) d.submittedAt = new Date().toISOString()
  if (!str(d.date) && def.rowFields && def.rowFields.some((r) => r.key === 'date')) d.date = new Date().toISOString()
  return d
}

// Rows: the caller's data.rows wins; otherwise build them from the recipe.
function buildRows(def, d) {
  if (Array.isArray(d.rows)) {
    return d.rows.map((r) => (r && typeof r === 'object') ? { ...r, label: str(r.label), value: str(r.value) } : null).filter(Boolean)
  }
  return (def.rowFields || []).map((f) => {
    let v = d[f.key]
    if (f.fmt === 'money') v = formatMoney(v, d.currency)
    else if (f.fmt === 'date') v = formatDate(v)
    else if (f.fmt === 'datetime') v = formatDate(v, { withTime: true })
    else v = (v == null || typeof v === 'object') ? '' : String(v)
    return { label: f.label, value: str(v), strong: !!f.strong, mono: !!f.mono }
  })
}

// Preheader: first body paragraph that is not the greeting, trimmed.
function derivePreheader(bodyText, fallback) {
  const paras = bodyToText(bodyText).split(/\n\s*\n/).map((p) => p.replace(/\n/g, ' ').trim()).filter(Boolean)
  const pick = paras.find((p) => !/^(hi|hello|hey|dear)\b/i.test(p) && p.length > 20) || paras[0] || fallback || ''
  return pick.length > 150 ? pick.slice(0, 147).replace(/\s+\S*$/, '') + '...' : pick
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------
export function renderEmail(type, data = {}, overrides = {}) {
  const key = str(type).toLowerCase()
  const def = EMAIL_DEFS[key] || GENERIC_DEF
  const o = (overrides && typeof overrides === 'object') ? overrides : {}
  let d
  try { d = enrich(def, (data && typeof data === 'object') ? data : {}) } catch { d = { ...(data || {}) } }
  if (def === GENERIC_DEF && key) d.typeLabel = key

  const pick = (ov, dflt) => (ov != null && String(ov).trim() !== '' ? String(ov) : (dflt == null ? '' : String(dflt)))

  let subject, heading, bodyText, cta, rows, html, text
  try {
    subject = tidyLine(substitute(pick(o.subject, def.defaultSubject), d).replace(/[\r\n]+/g, ' ')) || `A note from ${BRAND.product}`
    heading = tidyLine(substitute(pick(o.heading, def.defaultHeading), d))
    bodyText = substitute(pick(o.body, def.defaultBody), d)

    const ctaLabel = tidyLine(substitute(pick(o.ctaLabel, def.defaultCtaLabel), d))
    const ctaUrl = def.ctaUrlToken ? safeUrl(d[def.ctaUrlToken]) : ''
    cta = (ctaLabel && ctaUrl) ? { label: ctaLabel, url: ctaUrl, color: def.ctaColor || C.cta } : null

    rows = def.showRows ? buildRows(def, d) : null
  } catch (err) {
    try { console.error(`[email_templates] "${key}" content failed: ${err && err.message}`) } catch { /* no console */ }
    subject = subject || `A note from ${BRAND.product}`
    heading = heading || subject
    bodyText = bodyText || `Hi ${firstName(d && d.name)},\n\nThis is a notification from ${BRAND.product}.`
    cta = cta || null
    rows = null
  }

  const preheader = derivePreheader(bodyText, heading)
  const bodyPlain = bodyToText(bodyText)

  try {
    html = renderLayout({
      preheader,
      heading,
      bodyHtml: bodyToHtml(bodyText),
      cta,
      rows,
      eyebrow: def.eyebrow,
      eyebrowColor: def.eyebrowColor,
      badge: def.badge,
    })
  } catch (err) {
    try { console.error(`[email_templates] "${key}" layout failed: ${err && err.message}`) } catch { /* no console */ }
    html = `<!DOCTYPE html><html><body style="font-family:${FONT};color:${C.ink};padding:24px;"><h1>${esc(heading || subject)}</h1><p style="white-space:pre-wrap;">${esc(bodyPlain)}</p>${cta ? `<p><a href="${esc(cta.url)}">${esc(cta.label)}</a></p>` : ''}</body></html>`
  }

  try {
    text = renderTextLayout({ heading, bodyText: bodyPlain, cta, rows })
  } catch {
    text = `${heading || subject}\n\n${bodyPlain}`
  }

  return { subject, html, text }
}

// Used for unknown types so a misrouted call still produces a branded email.
const GENERIC_DEF = Object.freeze({
  type: 'generic',
  label: 'Notification',
  category: 'notifications',
  description: 'Fallback for an unrecognized email type.',
  eyebrow: 'Notification',
  defaultSubject: '<Title>',
  defaultHeading: '<Title>',
  defaultBody: 'Hi <First_Name>,\n\n<Message>',
  defaultCtaLabel: 'Open WorkCoPilot',
  ctaUrlToken: 'appUrl',
  placeholders: GLOBAL_PLACEHOLDERS,
  defaults: { title: `A note from ${BRAND.product}`, message: `This is a notification from ${BRAND.product}.` },
  sampleData: { name: 'Alex Morgan' },
  showRows: false,
})

export default renderEmail
