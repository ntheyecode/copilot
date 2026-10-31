// Locale leak detection, the same way a native reader would notice it:
// render a screen in English and in another locale, then compare what is on
// screen. A phrase that appears identically in both is English left behind
// (unless it is user data or a brand), and a dotted lowercase token is a raw
// i18n key that never resolved.

// Every visible text node, plus placeholders and aria-labels, normalized.
export async function visibleTexts(page) {
  return page.evaluate(() => {
    const out = new Set()
    const visible = (el) => {
      if (!el) return false
      const st = getComputedStyle(el)
      if (st.visibility === 'hidden' || st.display === 'none' || Number(st.opacity) === 0) return false
      const r = el.getBoundingClientRect()
      return r.width > 0 && r.height > 0
    }
    // Join each element's own text nodes, so JSX like `Step {n} of {total}`
    // (three text nodes) is read as the one phrase a person sees.
    const seen = new Set()
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      const el = n.parentElement
      if (!el || seen.has(el) || ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(el.tagName) || !visible(el)) continue
      seen.add(el)
      const own = [...el.childNodes].filter((c) => c.nodeType === 3).map((c) => c.nodeValue).join('')
      const t = own.replace(/\s+/g, ' ').trim()
      if (t) out.add(t)
    }
    for (const el of document.querySelectorAll('[placeholder],[aria-label],[title]')) {
      if (!visible(el)) continue
      for (const a of ['placeholder', 'aria-label', 'title']) { const v = (el.getAttribute(a) || '').replace(/\s+/g, ' ').trim(); if (v) out.add(v) }
    }
    return [...out]
  })
}

const BRANDS = /^(Company Brain|WorkCoPilot by AdmireVeda|SOC \/ SIEM|WorkCoPilot|AdmireVeda|OpenAPI|SSO|SIEM|SOC|MFA|2FA|PDF|CSV|API|URL|OK|IP|AI|GRC|PM|Sr PM|v\d+|https?:\/\/\S+)$/i
const DOMAIN_OR_MAIL = /(@|\b[\w-]+\.(com|net|org|io|dev|example)\b)/i

// A phrase worth flagging: at least two words and six letters of Latin text.
function isPhrase(s) {
  const words = s.match(/[A-Za-z]{2,}/g) || []
  return words.length >= 2 && words.join('').length >= 6
}

export function englishLeaks(enTexts, localeTexts, { data = [] } = {}) {
  const en = new Set(enTexts)
  const lowerData = data.map((d) => String(d).toLowerCase()).filter(Boolean)
  return localeTexts.filter((t) => en.has(t) && isPhrase(t) && !BRANDS.test(t) && !DOMAIN_OR_MAIL.test(t)
    && !lowerData.some((d) => t.toLowerCase().includes(d) || d.includes(t.toLowerCase())))
}

const RAW_KEY = /\b[a-z][a-zA-Z0-9]*(?:\.[a-zA-Z0-9_]+){2,}\b/
export function rawKeys(texts) {
  return texts.filter((t) => RAW_KEY.test(t) && !DOMAIN_OR_MAIL.test(t) && !/\d+\.\d+\.\d+/.test(t))
}
