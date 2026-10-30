// ===========================================================================
// AI usage ledger: what each company (or solo account) spent on AI per month,
// from the token / audio counts the providers reported (ai_usage.js). This is
// the record a Managed customer is billed "at actuals" from, so it says plainly
// how much of the month was ACTUAL (provider-reported) and how much was only
// ESTIMATED (the provider sent no usage block) or UNPRICED (a model missing from
// the price table). Superadmin-only: AI cost is never shown to product users.
//
// Monthly aggregates only (no per-call log), so it stays small: one record per
// holder per UTC month, with a by-model and a by-kind breakdown.
//
// Created with the store's context (never imports the store).
// ctx: { db, persistSoon, now? }
// ===========================================================================
import { summarizeUsage } from './ai_usage.js'

const MAX_MONTHS = 36   // per holder; older months are dropped

export function monthKey(d = new Date()) {
  const x = d instanceof Date ? d : new Date(d)
  return `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, '0')}`
}

export function createAiUsageLedger(ctx) {
  const now = ctx.now || (() => new Date())
  const book = () => { const d = ctx.db(); if (!d.aiUsage || typeof d.aiUsage !== 'object') d.aiUsage = {}; return d.aiUsage }
  const holderOf = ({ companyId, userId }) => (companyId ? `c:${companyId}` : (userId ? `u:${userId}` : 'platform'))

  // entries: reported usage entries for one or more calls; estimatedUsd: the
  // text-length estimate the caller made for calls whose provider sent no usage.
  // estimateKeySource: whose key the estimated part ran on (platform / company / user).
  function recordAiUsage({ companyId = null, userId = null, kind = 'other', entries = [], estimatedUsd = 0, estimateKeySource = 'unknown' } = {}) {
    if (!entries.length && !(estimatedUsd > 0)) return null
    const s = summarizeUsage(entries)
    const est = Math.max(0, Number(estimatedUsd) || 0)
    // A metered call with no reported usage at all is still a call: count it as estimated.
    if (!entries.length && est > 0) { s.calls = 1; s.estimatedCalls = 1 }
    const holder = holderOf({ companyId, userId })
    const month = monthKey(now())
    const byHolder = book()[holder] || (book()[holder] = {})
    const r = byHolder[month] || (byHolder[month] = {
      holder, companyId: companyId || null, month,
      calls: 0, actualCalls: 0, estimatedCalls: 0, unpricedCalls: 0,
      inTokens: 0, outTokens: 0, cachedTokens: 0, audioSeconds: 0,
      actualUsd: 0, estimatedUsd: 0, byModel: {}, byKind: {}, byKeySource: {},
    })
    if (!r.byKeySource) r.byKeySource = {}
    r.calls += s.calls; r.actualCalls += s.actualCalls; r.estimatedCalls += s.estimatedCalls; r.unpricedCalls += s.unpricedCalls
    r.inTokens += s.inTokens; r.outTokens += s.outTokens; r.cachedTokens += s.cachedTokens; r.audioSeconds += s.audioSeconds
    r.actualUsd += s.usd
    r.estimatedUsd += est
    for (const [ks, b] of Object.entries(s.byKeySource)) {
      const k = r.byKeySource[ks] || (r.byKeySource[ks] = { calls: 0, actualUsd: 0, estimatedUsd: 0 })
      k.calls += b.calls; k.actualUsd += b.usd
    }
    if (est > 0) {
      const k = r.byKeySource[estimateKeySource] || (r.byKeySource[estimateKeySource] = { calls: 0, actualUsd: 0, estimatedUsd: 0 })
      k.estimatedUsd += est
      if (!entries.length) k.calls += 1
    }
    for (const [k, m] of Object.entries(s.byModel)) {
      const t = r.byModel[k] || (r.byModel[k] = { provider: m.provider, model: m.model, calls: 0, inTokens: 0, outTokens: 0, audioSeconds: 0, usd: 0 })
      t.calls += m.calls; t.inTokens += m.inTokens; t.outTokens += m.outTokens; t.audioSeconds += m.audioSeconds; t.usd += m.usd
    }
    const kk = String(kind || 'other').slice(0, 40)
    const bk = r.byKind[kk] || (r.byKind[kk] = { calls: 0, usd: 0 })
    bk.calls += s.calls; bk.usd += s.usd + est
    const months = Object.keys(byHolder).sort()
    for (const old of months.slice(0, Math.max(0, months.length - MAX_MONTHS))) delete byHolder[old]
    ctx.persistSoon()
    return r
  }

  // billableUsd: only spend on OUR platform keys. A company or user on its own
  // keys already paid its provider; that spend is shown, never billed.
  const round = (r) => {
    const ks = r.byKeySource || {}
    const plat = ks.platform || { actualUsd: 0, estimatedUsd: 0 }
    return {
    ...r,
    billableUsd: Number((plat.actualUsd + plat.estimatedUsd).toFixed(6)),
    byKeySource: Object.fromEntries(Object.entries(ks).map(([k, v]) => [k, { calls: v.calls, actualUsd: Number(v.actualUsd.toFixed(6)), estimatedUsd: Number(v.estimatedUsd.toFixed(6)) }])),
    actualUsd: Number(r.actualUsd.toFixed(6)), estimatedUsd: Number(r.estimatedUsd.toFixed(6)),
    totalUsd: Number((r.actualUsd + r.estimatedUsd).toFixed(6)),
    actualShare: r.calls ? Number((r.actualCalls / r.calls).toFixed(4)) : null,
    byModel: Object.values(r.byModel).map((m) => ({ ...m, usd: Number(m.usd.toFixed(6)) })).sort((a, b) => b.usd - a.usd),
    }
  }

  // Superadmin: every holder's record for a month (default: this month), or one
  // company's months.
  function listAiUsage({ month = null, companyId = null } = {}) {
    const all = book()
    if (companyId) {
      const byHolder = all[`c:${companyId}`] || {}
      return Object.values(byHolder).sort((a, b) => b.month.localeCompare(a.month)).map(round)
    }
    const m = month || monthKey(now())
    return Object.values(all).map((byHolder) => byHolder[m]).filter(Boolean).map(round).sort((a, b) => b.totalUsd - a.totalUsd)
  }

  return { recordAiUsage, listAiUsage }
}

export default { createAiUsageLedger, monthKey }
