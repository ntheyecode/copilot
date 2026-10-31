// ===========================================================================
// Curated model rate card (moved out of server/ai.js, behavior unchanged apart
// from the 2026-10-31 model refresh): approximate published INPUT list price
// ($/million tokens), a coarse quality tier (1-5) and whether the model can see
// screens. Matched against the LIVE catalog (most-specific pattern first), so a
// recommendation is always a model the key can use; ai.listModels has already
// removed anything the lifecycle registry says is shut down. Prices are for
// guidance only (billing uses model-prices.js / ai_call_prices.js). Keep patterns
// specific-first.
// ===========================================================================

export const RATECARD = {
  gemini: [
    { re: /3\.1-flash-lite/i, usd: 0.25, q: 3, vision: true },
    { re: /flash-lite/i, usd: 0.30, q: 3, vision: true },
    { re: /2\.0-flash(?!-lite)/i, usd: 0.10, q: 3, vision: true },
    { re: /3\.[6-9]-flash(?!-lite)/i, usd: 0.75, q: 4, vision: true },
    { re: /3(\.\d)?-flash(?!-lite)/i, usd: 0.30, q: 4, vision: true },
    { re: /flash-latest/i, usd: 0.30, q: 4, vision: true },
    { re: /1\.5-flash/i, usd: 0.08, q: 3, vision: true },
    { re: /3(\.\d)?-pro|2\.5-pro|pro-latest/i, usd: 2.50, q: 5, vision: true },
  ],
  openai: [
    // Current family (text + image input). Source: developers.openai.com/api/docs/pricing, 2026-10-31.
    { re: /^gpt-6-luna/i, usd: 0.10, q: 4, vision: true },
    { re: /^gpt-5\.6-luna/i, usd: 0.20, q: 3, vision: true },
    { re: /^gpt-5\.6-terra/i, usd: 2.00, q: 4, vision: true },
    { re: /^gpt-5\.6(-sol)?$/i, usd: 4.00, q: 5, vision: true },
    // Older family, served until its shutdown date (the registry drops it after).
    { re: /gpt-4o-mini/i, usd: 0.15, q: 3, vision: true },
    { re: /4\.1-nano/i, usd: 0.10, q: 3, vision: true },
    { re: /4\.1-mini/i, usd: 0.40, q: 4, vision: true },
    { re: /o4-mini/i, usd: 1.10, q: 4, vision: true },
    { re: /gpt-4o(?!-mini)/i, usd: 2.50, q: 5, vision: true },
    { re: /gpt-4\.1(?!-nano|-mini)/i, usd: 2.00, q: 5, vision: true },
  ],
  groq: [
    { re: /gpt-oss-20b/i, usd: 0.10, q: 3, vision: false },
    { re: /gpt-oss-120b/i, usd: 0.25, q: 4, vision: false },
    { re: /scout/i, usd: 0.11, q: 3, vision: true },
    { re: /maverick/i, usd: 0.20, q: 4, vision: true },
    { re: /llama.*vl|vision/i, usd: 0.20, q: 3, vision: true },
  ],
  // OpenRouter and Moonshot reach cheap screen-reading models. Prices approximate
  // (guidance only, providers change them); most-specific first.
  openrouter: [
    { re: /qwen.*vl/i, usd: 0.20, q: 4, vision: true },
    { re: /qwen3?\.?\d?.*flash|qwen.*flash/i, usd: 0.05, q: 3, vision: true },
    { re: /qwen/i, usd: 0.12, q: 3, vision: true },
    { re: /gemini.*flash/i, usd: 0.10, q: 3, vision: true },
    { re: /llava|pixtral/i, usd: 0.20, q: 3, vision: true },
    { re: /deepseek/i, usd: 0.14, q: 4, vision: false },
  ],
  moonshot: [
    { re: /kimi.*vl|kimi.*thinking|kimi-?k2\.\d|k2\.\d/i, usd: 0.60, q: 4, vision: true },
    { re: /kimi|moonshot/i, usd: 0.60, q: 4, vision: false },
  ],
}
// Rough speed tier from the model name: fast = flash/lite/nano/mini/luna/haiku/
// 8b/scout/instant/turbo. 2 = fast, 1 = normal. For the "fastest" recommendation.
const FAST_HINT = /flash|lite|nano|mini|luna|haiku|instant|turbo|\b8b\b|scout|-fast\b/i
const speedOf = (model) => (FAST_HINT.test(String(model)) ? 2 : 1)
// Last-resort name hint for a model not in any ratecard row (new/unlisted). The
// ratecard is the authority; this only decides a model the ratecard has never
// seen. Kept broad but conservative.
const VISION_HINT = /vision|scout|maverick|gpt-4o|gpt-4\.1|gpt-5|gpt-6|o4|gemini|llava|pixtral|qwen.*(vl|flash|omni)/i
export function rateFor(providerId, model) {
  for (const row of (RATECARD[providerId] || [])) if (row.re.test(String(model))) return { ...row, speed: speedOf(model) }
  return { usd: null, q: 2, vision: VISION_HINT.test(String(model)), speed: speedOf(model) } // unknown model: conservative
}
// ONE source of truth for "can this model read a screen": the curated ratecard's
// vision flag (matched most-specific-first), with VISION_HINT only as the
// unlisted-model fallback inside rateFor (SUPREME II).
export function isVisionModel(providerId, model) {
  if (!model) return false
  return !!rateFor(providerId, model).vision
}

// Where our model ranking comes from, so the "best model plans your work" claim
// is sourced and dated, not asserted. Keep RANK_META.updated current when the
// quality tiers above are revised.
export const RANK_META = { source: 'community AI leaderboards (LMArena, Artificial Analysis)', updated: '2026-10-31' }
// A model's standing: tier + whether it is in our TOP tier (the "top-ranked"
// badge is shown only for 'top'). Honest: this is our tracked ranking, dated.
export function modelRank(providerId, model) {
  const r = rateFor(providerId, model)
  const tier = r.q >= 5 ? 'top' : r.q >= 4 ? 'strong' : 'standard'
  return { quality: r.q, tier, topRanked: r.q >= 5, vision: !!r.vision, source: RANK_META.source, updated: RANK_META.updated }
}
// Is this model a TOP-tier ("premium") model? Model-only check across every
// provider's ratecard (the per-session telemetry knows the model used but not
// always the provider). A match with quality >= 5 is premium.
export function isPremiumModel(model) {
  const m = String(model || '')
  if (!m) return false
  for (const rows of Object.values(RATECARD)) {
    for (const row of rows) if (row.re.test(m)) return row.q >= 5
  }
  return false
}

export default { RATECARD, rateFor, isVisionModel, RANK_META, modelRank, isPremiumModel }
