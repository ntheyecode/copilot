// ===========================================================================
// Per-model request parameters for OpenAI-compatible chat / vision calls.
//
// OpenAI's current chat models (gpt-6-luna, the gpt-5.6 family) are reasoning
// models: they default to MEDIUM reasoning effort, which multiplies output
// tokens (cost and latency) for WorkCoPilot's short structured answers. Their
// model pages list reasoning effort 'none' as supported, so we ask for 'none'.
// Sampling parameters are not documented for these models, so `temperature` is
// left out for them (omitting it is always accepted; sending an unsupported one
// is a 400). Which models take effort 'none' is read from the lifecycle registry
// (entry.reasoning), the single place that records model facts.
//
// Other OpenAI reasoning families (o-series, any other gpt-5 / gpt-6 id) get no
// temperature and no effort override. Every non-OpenAI provider (Groq,
// OpenRouter, Moonshot, custom) keeps the long-standing temperature 0.3.
// ===========================================================================
import { lifecycleEntry } from './ai_model_lifecycle.js'

export const DEFAULT_TEMPERATURE = 0.3
const OPENAI_REASONING_FAMILY = /^(o\d|gpt-5|gpt-6)/i

// Extra body fields for one chat/vision call: { temperature } or
// { reasoning_effort } or {}.
export function chatParamsFor(providerId, model) {
  if (providerId !== 'openai') return { temperature: DEFAULT_TEMPERATURE }
  const id = String(model || '')
  const e = lifecycleEntry(id, { provider: 'openai' })
  if (e && e.reasoning && e.reasoning.effortNone) return { reasoning_effort: 'none' }
  if (OPENAI_REASONING_FAMILY.test(id)) return {}
  return { temperature: DEFAULT_TEMPERATURE }
}

export default { DEFAULT_TEMPERATURE, chatParamsFor }
