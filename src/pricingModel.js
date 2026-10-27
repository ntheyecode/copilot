// Pricing view model - the ONE place the public pages read the plan contract.
//
// GET /api/work/pricing (server/store.js getWorkPricing) is the single source
// of every plan number. Its shape:
//   plans        { lite, basic, advanced, premium }  USD per month
//   hour         { ... }                              extra hour, USD
//   hoursMonthly { ... }  guided hours INCLUDED per calendar month
//   hoursExpiry  { mode: 'forfeit' | 'carryforward', carryCapHours }
//   image, imageMinBulk, currency, annualReady
//
// Both the home page plan cards (WorkMarketing) and the pricing page
// (WorkPricing) consume THIS normalized object, so the value lines ("60 hours
// of expert guidance every month", "unused hours carry forward") are computed
// once, from the API, never typed into copy and never held as a second copy of
// the numbers (SUPREME RULE II). A field the API does not carry comes back null
// and the page simply omits that line: nothing is invented and nothing falls
// back to a hardcoded figure.
//
// There is NO per-day task cap any more (owner, 2026-10-27; server commit
// e8679cc retired it): hours are the one usage story, so nothing here reads or
// exposes a tasks figure and the pages have no tasks line to show.
export const PLAN_IDS = ['lite', 'basic', 'advanced', 'premium']

const num = (v) => {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}
const perPlan = (obj) => {
  const out = {}
  for (const id of PLAN_IDS) out[id] = num(obj && obj[id])
  return out
}

export function normalizePricing(api) {
  if (!api || typeof api !== 'object' || !api.plans) return null
  const exp = api.hoursExpiry && typeof api.hoursExpiry === 'object' ? api.hoursExpiry : {}
  const mode = exp.mode === 'carryforward' ? 'carryforward' : 'forfeit'
  const cap = mode === 'carryforward' ? num(exp.carryCapHours) : null
  return {
    currency: api.currency || 'USD',
    plans: perPlan(api.plans),
    hour: perPlan(api.hour),
    hoursMonthly: perPlan(api.hoursMonthly),
    expiry: { mode, carryCapHours: cap && cap > 0 ? cap : null },
    image: api.image && typeof api.image === 'object' ? api.image : {},
    imageMinBulk: num(api.imageMinBulk),
    annualReady: !!api.annualReady,
  }
}

// Format a USD amount the way the site always has: whole dollars plain, cents
// only when present ($69, $12.50).
export function money(n) {
  if (n == null) return '-'
  const v = Number(n)
  return `$${v % 1 ? v.toFixed(2) : v}`
}

// Whole numbers read plain, fractions to one decimal (1.5 hours).
export function hours(n) {
  if (n == null) return null
  const v = Number(n)
  return Number.isInteger(v) ? String(v) : String(Math.round(v * 10) / 10)
}

// What happens to unused plan hours, as one card line, worded for the expiry
// mode the API reports. null when the model is missing.
export function planExpiryLine(model, t) {
  if (!model) return null
  if (model.expiry.mode === 'carryforward') return model.expiry.carryCapHours ? t('pricing.carryCap', { cap: hours(model.expiry.carryCapHours) }) : t('pricing.carry')
  return t('pricing.expire')
}

// The value lines for one plan, in display order, from the normalized model
// and a translator. Each line is omitted when the API did not supply its
// number, so the card can never show an invented figure. With
// { heroHours: true } the hours line is left out because the card already
// shows the monthly hours as its hero (HoursBloom), never twice.
export function planValueLines(model, id, t, opts = {}) {
  if (!model) return []
  const lines = []
  const h = model.hoursMonthly[id]
  if (h == null) return lines
  if (!opts.heroHours) lines.push(t('pricing.hoursMonthly', { hours: hours(h) }))
  lines.push(planExpiryLine(model, t))
  return lines
}

// How full this plan's bloom is: its monthly hours as a share (0..1) of the
// LARGEST plan's monthly hours, read from the same model. The hero visual
// scales from this, so a bigger plan visibly reads as more generous and the
// relation follows a superadmin change automatically. null when the API did
// not carry hours (the visual then stays unlit rather than invent a size).
export function planHoursShare(model, id) {
  const r = planRange(model, 'hoursMonthly')
  const h = model && model.hoursMonthly ? model.hoursMonthly[id] : null
  if (!r || !r.hi || h == null) return null
  return Math.max(0, Math.min(1, h / r.hi))
}

// Annual billing: 20% off the monthly rate, shown as a per-month figure billed
// yearly. ONE definition for the home teaser and the pricing page (the two
// toggles can never disagree). The server applies the same discount at
// checkout; annualReady says whether the yearly Stripe prices exist yet.
export const ANNUAL_DISCOUNT = 0.2
export function annualMonthlyRate(p) {
  if (p == null) return null
  return Math.round(Number(p) * (1 - ANNUAL_DISCOUNT))
}
export function annualTotal(p) {
  const m = annualMonthlyRate(p)
  return m == null ? null : m * 12
}

// The one footnote under the cards, matching the expiry mode the API reports.
export function expiryFootnote(model, t) {
  if (!model) return ''
  if (model.expiry.mode === 'carryforward') {
    return model.expiry.carryCapHours ? t('pricing.footnoteCarryCap', { cap: hours(model.expiry.carryCapHours) }) : t('pricing.footnoteCarry')
  }
  return t('pricing.footnoteForfeit')
}

// The lowest and highest value of one per-plan group across the four plans
// (for the "30 to 180 hours a month" value band). null when the API did not
// carry that group, so the band omits the tile rather than invent a range.
export function planRange(model, group) {
  if (!model || !model[group]) return null
  const vals = PLAN_IDS.map((id) => model[group][id]).filter((v) => v != null)
  if (!vals.length) return null
  return { lo: Math.min(...vals), hi: Math.max(...vals) }
}

// LIST PRICES, used ONLY when /api/work/pricing cannot be reached, and always
// shown with a visible "showing list prices" label (pricing.listPrices). They
// mirror server/store.js WORK_PRICING_DEFAULT; the live API overrides them the
// moment it answers. Nothing on a page reads these while the API is reachable.
export const LIST_PRICE_FALLBACK = {
  currency: 'usd',
  plans: { lite: 69, basic: 99, advanced: 299, premium: 399 },
  hour: { lite: 25, basic: 20, advanced: 15, premium: 10 },
  hoursMonthly: { lite: 30, basic: 60, advanced: 120, premium: 180 },
  hoursExpiry: { mode: 'forfeit', carryCapHours: null },
  image: { lite: 3, basic: 2, advanced: 1, premium: 0.5 },
  imageMinBulk: 10,
  annualReady: false,
}
