// The chosen plan + billing cycle, kept across the whole subscribe flow.
// Source order: the URL (?plan=&cycle=) wins, then the copy saved in
// localStorage (survives the Google/Microsoft redirect and a closed browser).
// The server also stores the intent on the account the moment it knows who you
// are, so this is only the pre-account carrier. Pure helpers, no React.
export const PLAN_IDS = ['lite', 'basic', 'advanced', 'premium']
const KEY = 'wc_onboarding_intent'

export const cleanPlan = (p) => { const v = String(p || '').trim().toLowerCase(); return PLAN_IDS.includes(v) ? v : '' }
export const cleanCycle = (c) => (String(c || '').trim().toLowerCase() === 'annual' ? 'annual' : 'monthly')

export function readStoredIntent() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const o = JSON.parse(raw)
    return { plan: cleanPlan(o.plan), cycle: cleanCycle(o.cycle) }
  } catch { return null }
}
export function saveIntent({ plan, cycle } = {}) {
  try { localStorage.setItem(KEY, JSON.stringify({ plan: cleanPlan(plan), cycle: cleanCycle(cycle), at: Date.now() })) } catch { /* private mode: the URL + server copy still carry it */ }
}
export function clearIntent() {
  try { localStorage.removeItem(KEY) } catch { /* ignore */ }
}
// Resolve the intent for this page load from the search params + storage.
export function resolveIntent(sp) {
  const urlPlan = cleanPlan(sp.get('plan'))
  const urlCycle = sp.get('cycle') ? cleanCycle(sp.get('cycle')) : ''
  if (urlPlan || urlCycle) {
    const stored = readStoredIntent() || {}
    const intent = { plan: urlPlan || stored.plan || '', cycle: urlCycle || stored.cycle || 'monthly' }
    saveIntent(intent)
    return intent
  }
  const stored = readStoredIntent()
  return stored ? { plan: stored.plan, cycle: stored.cycle } : { plan: '', cycle: 'monthly' }
}
// The query string that carries an intent to another page (login, pricing).
export function intentQuery(intent, extra = {}) {
  const q = new URLSearchParams()
  if (intent && intent.plan) q.set('plan', intent.plan)
  if (intent && intent.cycle && intent.cycle !== 'monthly') q.set('cycle', intent.cycle)
  for (const [k, v] of Object.entries(extra)) if (v) q.set(k, v)
  const s = q.toString()
  return s ? `?${s}` : ''
}
// Price lines shared by the summary and the picker (same math the marketing
// page uses: annual = 20% off the monthly rate, shown per month, billed yearly).
export const money = (n) => `$${Number(n) % 1 ? Number(n).toFixed(2) : Number(n).toLocaleString('en-US')}`
export function priceLine(t, pricing, plan, cycle) {
  const list = pricing && pricing.plans && pricing.plans[plan] != null ? Number(pricing.plans[plan]) : null
  if (list == null) return cycle === 'annual' ? t('onboarding.plan.billedAnnually') : t('onboarding.plan.billedMonthly')
  if (cycle === 'annual') { const m = Math.round(list * 0.8); return t('onboarding.plan.perMonthAnnual', { price: money(m), total: money(m * 12) }) }
  return t('onboarding.plan.perMonth', { price: money(list) })
}
