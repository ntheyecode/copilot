// model-prices.js: public LIST prices for commonly used LLM chat/vision models.
//
// Pure DATA module (no logic, no imports). Prices are USD per 1,000,000 tokens,
// input and output quoted separately. Used to show an estimated per-session
// cost to operators. These are standard on-demand list rates (not batch, cached,
// priority, or context-caching tiers). Where a provider charges a higher rate
// above a context-length threshold, the base/short-context rate is used and the
// threshold is noted inline.
//
// Prices change. Verify against the official pricing pages before relying on
// these for billing. Sources gathered on the date in PRICES_UPDATED below:
//   - OpenAI:    https://developers.openai.com/api/docs/pricing  (was platform.openai.com/docs/pricing)
//   - Google:    https://ai.google.dev/gemini-api/docs/pricing
//   - Anthropic: https://claude.com/pricing  (was anthropic.com/pricing)
//   - Groq:      https://groq.com/pricing
//
// Notes on specific entries:
//   - OpenAI gpt-4.1 / gpt-4.1-mini / o4-mini: confirmed on the official OpenAI
//     pricing page (standard tier, short-context input).
//   - gemini-2.5-pro: $1.25/$10 is the standard rate for prompts <=200K input
//     tokens; prompts >200K are billed $2.50/$15.
//   - gemini-2.5-flash: $0.30 input is text/image/video; audio input is $1.00.
//   - gemini-2.0-flash: shut down on 2026-06-01 (server/ai_model_lifecycle.js);
//     kept at its last rate so older ledger rows still price.
//   - gemini-1.5-flash / gemini-1.5-pro: these are the last-published standard
//     list rates (base tier, prompts <=128K tokens). The 1.5 family is no longer
//     shown on the current official Gemini pricing page (deprecated/legacy), so
//     these are historical-but-stable rates, not freshly confirmed on the page.
//   - Anthropic: the current Haiku/Sonnet/Opus are the 5.5 generation
//     (claude-haiku-5-5 / claude-sonnet-5-5 / claude-opus-5-5). Haiku 5.5
//     $0.10/$0.50 is for prompts <=100K tokens; prompts >100K are $0.50/$2.50.
//   - Groq llama-4 models are keyed by their canonical Groq API ids
//     (meta-llama/llama-4-scout-17b-16e-instruct, ...-maverick-17b-128e-instruct).
//   - Groq openai/gpt-oss-20b: $0.075/$0.30 is the most commonly listed current
//     rate across trackers; some list $0.10/$0.50. Re-verify on groq.com/pricing.

import { priceAt } from './ai_call_prices.js'

export const MODEL_PRICES = {
  // ---- OpenAI (USD per 1M tokens) ----
  // Current family, standard tier, prompts <=272K input tokens (above that OpenAI
  // bills 2x input and 1.5x output for the whole request). Reasoning tokens are
  // billed as output; our calls ask for reasoning effort "none" (ai_model_params.js).
  // Source: https://developers.openai.com/api/docs/pricing (checked 2026-10-31)
  "gpt-6-luna":      { input: 0.10, output: 0.50,  label: "OpenAI GPT-6 Luna" },
  "gpt-5.6-luna":    { input: 0.20, output: 1.20,  label: "OpenAI GPT-5.6 Luna" },
  "gpt-5.6-terra":   { input: 2.00, output: 12.00, label: "OpenAI GPT-5.6 Terra" },
  "gpt-5.6-sol":     { input: 4.00, output: 20.00, label: "OpenAI GPT-5.6 Sol" },
  "gpt-5.6":         { input: 4.00, output: 20.00, label: "OpenAI GPT-5.6 (routes to Sol)" },
  // Older family, served until 2027-01-14 (o4-mini was shut down 2026-10-23);
  // kept so ledger rows booked before the switch still price.
  "gpt-4o":          { input: 2.50, output: 10.00, label: "OpenAI GPT-4o" },
  "gpt-4o-mini":     { input: 0.15, output: 0.60,  label: "OpenAI GPT-4o mini" },
  "gpt-4.1":         { input: 2.00, output: 8.00,  label: "OpenAI GPT-4.1" },
  "gpt-4.1-mini":    { input: 0.40, output: 1.60,  label: "OpenAI GPT-4.1 mini" },
  "o4-mini":         { input: 1.10, output: 4.40,  label: "OpenAI o4-mini" },

  // ---- Google Gemini (USD per 1M tokens) ----
  "gemini-1.5-flash": { input: 0.075, output: 0.30, label: "Google Gemini 1.5 Flash" },   // last-published base-tier (<=128K); legacy
  "gemini-1.5-pro":   { input: 1.25,  output: 5.00, label: "Google Gemini 1.5 Pro" },      // last-published base-tier (<=128K); legacy
  "gemini-2.0-flash": { input: 0.10,  output: 0.40, label: "Google Gemini 2.0 Flash" },
  "gemini-2.5-flash": { input: 0.30,  output: 2.50, label: "Google Gemini 2.5 Flash" },    // $0.30 input = text/image/video; audio $1.00
  "gemini-2.5-pro":   { input: 1.25,  output: 10.00, label: "Google Gemini 2.5 Pro" },     // <=200K prompt; >200K is $2.50/$15
  "gemini-2.5-flash-lite": { input: 0.10, output: 0.40, label: "Google Gemini 2.5 Flash-Lite" }, // cheapest; retired ~Oct 2026 for new keys
  // Gemini 3.x (2026). "latest" aliases resolve to the current GA model; keep them
  // priced so metering never silently reports $0 for the model the watch loop uses.
  "gemini-flash-lite-latest": { input: 0.30, output: 2.50, label: "Google Gemini Flash-Lite (latest)" }, // currently resolves to 3.5 flash-lite
  "gemini-flash-latest":      { input: 0.50, output: 3.00, label: "Google Gemini Flash (latest)" },
  "gemini-3.1-flash-lite":    { input: 0.25, output: 1.50, label: "Google Gemini 3.1 Flash-Lite" },
  "gemini-3.5-flash-lite":    { input: 0.30, output: 2.50, label: "Google Gemini 3.5 Flash-Lite" },
  "gemini-3.5-flash":         { input: 0.50, output: 3.00, label: "Google Gemini 3.5 Flash" },
  // Gemini 3.6 / 3.8 Flash: the page announces the 2027-01-01 doubling; priceAt()
  // picks the rate in force on the day of the call.
  // Source: https://ai.google.dev/gemini-api/docs/pricing (checked 2026-10-31)
  "gemini-3.6-flash": { periods: [{ from: null, input: 0.75, output: 3.75 }, { from: "2027-01-01", input: 1.50, output: 7.50 }], label: "Google Gemini 3.6 Flash" },
  "gemini-3.8-flash": { periods: [{ from: null, input: 0.75, output: 3.75 }, { from: "2027-01-01", input: 1.50, output: 7.50 }], label: "Google Gemini 3.8 Flash" },
  // OpenRouter (cheapest screen-readers; images billed in input). Keyed by the
  // provider/model slug so metering prices them directly.
  "qwen/qwen3.7-flash":              { input: 0.03, output: 0.13, label: "Qwen 3.7 Flash (OpenRouter)" },
  "qwen/qwen3.5-flash-02-23":        { input: 0.065, output: 0.26, label: "Qwen 3.5 Flash (OpenRouter)" },
  "qwen/qwen3-vl-30b-a3b-instruct":  { input: 0.15, output: 0.60, label: "Qwen3-VL 30B (OpenRouter)" },
  "qwen/qwen3-vl-235b-a22b-instruct": { input: 0.21, output: 1.90, label: "Qwen3-VL 235B (OpenRouter)" },
  "deepseek/deepseek-chat":          { input: 0.14, output: 0.28, label: "DeepSeek Chat (OpenRouter)" },

  // ---- Moonshot AI / Kimi (USD per 1M tokens) ----
  // Approximate published international (api.moonshot.ai) list prices; metering
  // is an operator-transparency ESTIMATE only (unknown model -> 0, never a
  // crash). RE-VERIFY against the current Moonshot pricing page, and note the
  // China region (api.moonshot.cn) is priced separately.
  "kimi-k2-0905-preview": { input: 0.60, output: 2.50, label: "Moonshot Kimi K2" },
  "kimi-latest":          { input: 0.60, output: 2.50, label: "Moonshot Kimi (latest)" },
  "moonshot-v1-128k":     { input: 2.00, output: 2.00, label: "Moonshot v1 128k" },
  "moonshot-v1-8k":       { input: 0.20, output: 2.00, label: "Moonshot v1 8k" },

  // ---- Anthropic Claude (USD per 1M tokens), current generation ----
  "claude-haiku-5-5":  { input: 0.10, output: 0.50,  label: "Anthropic Claude Haiku 5.5" },   // <=100K prompt; >100K is $0.50/$2.50
  "claude-sonnet-5-5": { input: 2.00, output: 10.00, label: "Anthropic Claude Sonnet 5.5" },
  "claude-opus-5-5":   { input: 4.00, output: 20.00, label: "Anthropic Claude Opus 5.5" },

  // ---- Groq-hosted open models (USD per 1M tokens) ----
  "llama-3.3-70b-versatile":                  { input: 0.59,  output: 0.79, label: "Groq Llama 3.3 70B Versatile" },
  "meta-llama/llama-4-scout-17b-16e-instruct":    { input: 0.11,  output: 0.34, label: "Groq Llama 4 Scout" },
  "meta-llama/llama-4-maverick-17b-128e-instruct": { input: 0.20, output: 0.60, label: "Groq Llama 4 Maverick" },
  "openai/gpt-oss-20b":                       { input: 0.075, output: 0.30, label: "Groq GPT-OSS 20B" },
};

export const PRICES_UPDATED = "2026-10-31";

// The { input, output } rate for a model id (provider prefix ignored) in force
// at `at`, or null when unpriced. Entries with dated `periods` resolve through
// the one shared priceAt (ai_call_prices.js).
export function textPriceOf(modelId, at = Date.now()) {
  const key = String(modelId || '')
  return priceAt(MODEL_PRICES[key] || MODEL_PRICES[key.split('/').pop()] || null, at)
}

// Approx input tokens charged per screen image sent to a vision model. Images are
// the bulk of a watch-loop call's cost, so leaving them out of the estimate (as
// before) under-reports the real spend. This is a deliberately conservative
// average for a downscaled (~1024px) UI frame across the cheap vision models we
// use; it is an ESTIMATE for the operator dashboard, not billing-grade, and the
// true per-image token count varies by provider (gpt-4o-mini bills images far
// higher than Gemini flash, for example).
const IMAGE_TOKENS_EST = 1200

// Estimate a call's cost in USD from character counts (~4 chars per token) plus
// any images sent. Operator-transparency ESTIMATE, not billing-grade. Unknown
// model -> 0.
export function estimateCostUsd(modelId, inChars = 0, outChars = 0, images = 0) {
  const p = textPriceOf(modelId)
  if (!p) return 0
  const inTok = Math.max(0, Number(inChars) || 0) / 4 + Math.max(0, Number(images) || 0) * IMAGE_TOKENS_EST
  const outTok = Math.max(0, Number(outChars) || 0) / 4
  return (inTok / 1e6) * (p.input || 0) + (outTok / 1e6) * (p.output || 0)
}
