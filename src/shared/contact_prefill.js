// Hand-off from the live widget to the contact form (corporate site: the widget
// ends in "talk to sales", never in plans). The visitor already gave their
// name, email and task in the widget, so the form opens filled in. Carried in
// sessionStorage, read once and removed: personal data never goes in a URL.
const KEY = 'wc_contact_prefill_v1'
const clip = (s, n) => String(s || '').trim().slice(0, n)

export function contactPrefillFrom({ lead = null, task = '' } = {}) {
  const name = clip([lead && lead.first, lead && lead.last].filter(Boolean).join(' '), 120)
  const t = clip(task, 4000)
  return { name, email: clip(lead && lead.email, 200), subject: clip(t.split('\n')[0], 120), message: t }
}

export function setContactPrefill(fields, store = globalThis.sessionStorage) {
  try { store.setItem(KEY, JSON.stringify(fields)) } catch { /* storage blocked: the form opens empty */ }
}

// Read once, then remove, so a later visit to the form starts clean.
export function takeContactPrefill(store = globalThis.sessionStorage) {
  try {
    const raw = store.getItem(KEY)
    store.removeItem(KEY)
    const v = raw ? JSON.parse(raw) : null
    if (!v || typeof v !== 'object') return null
    return { name: clip(v.name, 120), email: clip(v.email, 200), subject: clip(v.subject, 120), message: clip(v.message, 4000) }
  } catch { return null }
}
