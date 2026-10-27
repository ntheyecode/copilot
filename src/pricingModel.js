// Pricing view model - the ONE place the public pages read the plan contract.
//
// GET /api/work/pricing (server/store.js getWorkPricing) is the single source
// of every plan number. Its shape:
//   plans        { lite, basic, advanced, premium }  USD per month
//   hour         { ... }                              extra hour, USD
//   hoursMonthly { ... }  guided hours INCLUDED per calendar month
//   tasks        { ... }  guided tasks per DAY
//   hoursExpiry  { mode: 'forfeit' | 'carryforward', carryCapHours }
//   image, imageMinBulk, currency, annualReady
//
// Both the home page plan cards (WorkMarketing) and the pricing page
// (WorkPricing) consume THIS normalized object, so the value lines ("60 hours
// of expert guidance every month", "4 guided tasks a day", "unused hours carry
// forward") are computed once, from the API, never typed into copy and never
// held as a second copy of the numbers (SUPREME RULE II). A field the API does
// not carry comes back null and the page simply omits that line: nothing is
// invented and nothing falls back to a hardcoded figure.
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
    tasksDaily: perPlan(api.tasks),
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

// The value lines for one plan, in display order, from the normalized model
// and a translator. Each line is omitted when the API did not supply its
// number, so the card can never show an invented figure.
export function planValueLines(model, id, t) {
  if (!model) return []
  const lines = []
  const h = model.hoursMonthly[id]
  const d = model.tasksDaily[id]
  if (h != null) lines.push(t('pricing.hoursMonthly', { hours: hours(h) }))
  if (d != null) lines.push(t.n('pricing.tasksDay', d))
  if (h != null) {
    if (model.expiry.mode === 'carryforward') lines.push(model.expiry.carryCapHours ? t('pricing.carryCap', { cap: hours(model.expiry.carryCapHours) }) : t('pricing.carry'))
    else lines.push(t('pricing.expire'))
  }
  return lines
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
  tasks: { lite: 4, basic: 4, advanced: 6, premium: 8 },
  hoursMonthly: { lite: 30, basic: 60, advanced: 120, premium: 180 },
  hoursExpiry: { mode: 'forfeit', carryCapHours: null },
  image: { lite: 3, basic: 2, advanced: 1, premium: 0.5 },
  imageMinBulk: 10,
  annualReady: false,
}
