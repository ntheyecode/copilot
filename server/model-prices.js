// model-prices.js — public LIST prices for commonly used LLM chat/vision models.
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
//   - gemini-2.0-flash: still widely offered; Google has announced a shutdown
//     of 2.0 Flash on the API around mid-2026 — re-verify before relying on it.
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

export const MODEL_PRICES = {
  // ---- OpenAI (USD per 1M tokens) ----
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

  // ---- Anthropic Claude (USD per 1M tokens) — current generation ----
  "claude-haiku-5-5":  { input: 0.10, output: 0.50,  label: "Anthropic Claude Haiku 5.5" },   // <=100K prompt; >100K is $0.50/$2.50
  "claude-sonnet-5-5": { input: 2.00, output: 10.00, label: "Anthropic Claude Sonnet 5.5" },
  "claude-opus-5-5":   { input: 4.00, output: 20.00, label: "Anthropic Claude Opus 5.5" },

  // ---- Groq-hosted open models (USD per 1M tokens) ----
  "llama-3.3-70b-versatile":                  { input: 0.59,  output: 0.79, label: "Groq Llama 3.3 70B Versatile" },
  "meta-llama/llama-4-scout-17b-16e-instruct":    { input: 0.11,  output: 0.34, label: "Groq Llama 4 Scout" },
  "meta-llama/llama-4-maverick-17b-128e-instruct": { input: 0.20, output: 0.60, label: "Groq Llama 4 Maverick" },
  "openai/gpt-oss-20b":                       { input: 0.075, output: 0.30, label: "Groq GPT-OSS 20B" },
};

export const PRICES_UPDATED = "2026-10-21";
