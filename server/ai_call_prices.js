// ===========================================================================
// List prices for the AI calls that are NOT billed at the chat/vision text rate:
// transcription (per audio minute, or per 1M tokens for token-billed speech
// models) and image generation (per 1M tokens, image output).
//
// Pure data plus one pure resolver. ai_usage.js prices usage entries from here;
// the chat/vision text rates live in model-prices.js. Superadmin-only data: these
// prices and the model ids never reach a product user (the AI usage ledger is a
// superadmin view).
//
// Every entry names the official page it was read from and the date it was
// checked (SOURCES below, `src` on each entry); a test fails on an entry without
// both. A model missing here is UNPRICED: counted and flagged in the ledger,
// never priced at a guessed or wrong rate.
//
// Prices that the provider has already announced will change carry dated
// periods ({ from: 'YYYY-MM-DD', ... }); priceAt() picks the one in force when
// the call was made.
// ===========================================================================

export const SOURCES = Object.freeze({
  openai: Object.freeze({ url: 'https://developers.openai.com/api/docs/pricing', checked: '2026-10-30' }),
  openaiDeprecations: Object.freeze({ url: 'https://developers.openai.com/api/docs/deprecations', checked: '2026-10-30' }),
  gemini: Object.freeze({ url: 'https://ai.google.dev/gemini-api/docs/pricing', checked: '2026-10-30' }),
  groq: Object.freeze({ url: 'https://console.groq.com/docs/speech-to-text', checked: '2026-10-30' }),
  groqDeprecations: Object.freeze({ url: 'https://console.groq.com/docs/deprecations', checked: '2026-10-30' }),
})
const S = SOURCES

// ---- Audio (transcription) list prices, USD per audio minute ----------------
// Used when the provider reports the audio length it processed.
export const AUDIO_PRICES_PER_MIN = Object.freeze({
  // Groq: $0.04 per audio hour; billed at least 10 s per request (see AUDIO_MIN_SECONDS).
  // Source: https://console.groq.com/docs/speech-to-text (checked 2026-10-30)
  'whisper-large-v3-turbo': { perMin: 0.04 / 60, src: S.groq },
  // Groq: $0.111 per audio hour. Source: https://console.groq.com/docs/speech-to-text (checked 2026-10-30)
  'whisper-large-v3': { perMin: 0.111 / 60, src: S.groq },
  // Groq shut this model down on 2025-08-23 (no longer listed); kept at its last
  // official rate ($0.02 per audio hour) so old ledger rows still price.
  // Source: https://console.groq.com/docs/deprecations (checked 2026-10-30)
  'distil-whisper-large-v3-en': { perMin: 0.02 / 60, src: S.groqDeprecations },
  // OpenAI "Whisper": $0.006 / minute (removed from the API 2027-02-26).
  // Source: https://developers.openai.com/api/docs/pricing (checked 2026-10-30)
  'whisper-1': { perMin: 0.006, src: S.openai },
  // OpenAI estimated cost $0.006 / minute (removed 2027-02-26).
  // Source: https://developers.openai.com/api/docs/pricing (checked 2026-10-30)
  'gpt-4o-transcribe': { perMin: 0.006, src: S.openai },
  // OpenAI estimated cost $0.003 / minute (removed 2027-02-26).
  // Source: https://developers.openai.com/api/docs/pricing (checked 2026-10-30)
  'gpt-4o-mini-transcribe': { perMin: 0.003, src: S.openai },
  // OpenAI's replacement for the models above: $0.0045 / minute (no token rates published).
  // Source: https://developers.openai.com/api/docs/pricing (checked 2026-10-30)
  'gpt-transcribe': { perMin: 0.0045, src: S.openai },
})
// Minimum billed seconds per request, by provider. Groq: 10 s.
// Source: https://console.groq.com/docs/speech-to-text (checked 2026-10-30)
export const AUDIO_MIN_SECONDS = Object.freeze({ groq: 10 })

// ---- Token-billed calls, USD per 1M tokens ----------------------------------
//   transcribe: speech models billed by tokens (audio input rate, text output).
//   image:      image generation (input = prompt, output = image tokens).
export const CALL_TOKEN_PRICES = Object.freeze({
  transcribe: Object.freeze({
    // OpenAI audio input $2.50 / text output $10.00 (removed 2027-02-26).
    // Source: https://developers.openai.com/api/docs/pricing (checked 2026-10-30)
    'gpt-4o-transcribe': { input: 2.50, output: 10.00, src: S.openai },
    // OpenAI audio input $1.25 / text output $5.00 (removed 2027-02-26).
    // Source: https://developers.openai.com/api/docs/pricing (checked 2026-10-30)
    'gpt-4o-mini-transcribe': { input: 1.25, output: 5.00, src: S.openai },
    // Gemini (the Gemini transcription path uses the key's chat Flash model):
    // audio input / output rates, paid tier, standard.
    // Source: https://ai.google.dev/gemini-api/docs/pricing (checked 2026-10-30)
    'gemini-2.5-flash': { input: 1.00, output: 2.50, src: S.gemini },
    // Source: https://ai.google.dev/gemini-api/docs/pricing (checked 2026-10-30)
    'gemini-2.5-flash-lite': { input: 0.30, output: 0.40, src: S.gemini },
    // Source: https://ai.google.dev/gemini-api/docs/pricing (checked 2026-10-30)
    'gemini-3.1-flash-lite': { input: 0.50, output: 1.50, src: S.gemini },
    // One rate for text, image, video and audio input.
    // Source: https://ai.google.dev/gemini-api/docs/pricing (checked 2026-10-30)
    'gemini-3.5-flash-lite': { input: 0.30, output: 2.50, src: S.gemini },
    // Source: https://ai.google.dev/gemini-api/docs/pricing (checked 2026-10-30)
    'gemini-3-flash-preview': { input: 1.00, output: 3.00, src: S.gemini },
    // No separate audio rate; the page announces the 2027-01-01 increase.
    // Source: https://ai.google.dev/gemini-api/docs/pricing (checked 2026-10-30)
    'gemini-3.6-flash': { periods: [{ from: null, input: 0.75, output: 3.75 }, { from: '2027-01-01', input: 1.50, output: 7.50 }], src: S.gemini },
    // Source: https://ai.google.dev/gemini-api/docs/pricing (checked 2026-10-30)
    'gemini-3.8-flash': { periods: [{ from: null, input: 0.75, output: 3.75 }, { from: '2027-01-01', input: 1.50, output: 7.50 }], src: S.gemini },
    // Google's dedicated transcription model: audio input $2.00 / text output $12.00.
    // Source: https://ai.google.dev/gemini-api/docs/pricing (checked 2026-10-30)
    'gemini-3.5-transcribe': { input: 2.00, output: 12.00, src: S.gemini },
  }),
  image: Object.freeze({
    // OpenAI shut gpt-image-1 down on 2026-10-23 and no longer lists it; kept at
    // its last official rate (text input $5.00, image output $40.00) because the
    // code still names it (server/work-images.js).
    // Source: https://developers.openai.com/api/docs/deprecations (checked 2026-10-30)
    'gpt-image-1': { input: 5.00, output: 40.00, src: S.openaiDeprecations },
    // Text input $2.00, image output $8.00 (shutdown 2026-12-01).
    // Source: https://developers.openai.com/api/docs/pricing (checked 2026-10-30)
    'gpt-image-1-mini': { input: 2.00, output: 8.00, src: S.openai },
    // Text input $5.00, image output $32.00 (shutdown 2026-12-01).
    // Source: https://developers.openai.com/api/docs/pricing (checked 2026-10-30)
    'gpt-image-1.5': { input: 5.00, output: 32.00, src: S.openai },
    // Text input $5.00, image output $30.00.
    // Source: https://developers.openai.com/api/docs/pricing (checked 2026-10-30)
    'gpt-image-2': { input: 5.00, output: 30.00, src: S.openai },
    // Input $0.30; output $0.039 per image, which is $30.00 per 1M image tokens at
    // 1,290 tokens per image (shutdown 2027-03-15).
    // Source: https://ai.google.dev/gemini-api/docs/pricing (checked 2026-10-30)
    'gemini-2.5-flash-image': { input: 0.30, output: 30.00, src: S.gemini },
    // Input $0.25, image output $30.00.
    // Source: https://ai.google.dev/gemini-api/docs/pricing (checked 2026-10-30)
    'gemini-3.1-flash-lite-image': { input: 0.25, output: 30.00, src: S.gemini },
    // Input $0.50, image output $60.00.
    // Source: https://ai.google.dev/gemini-api/docs/pricing (checked 2026-10-30)
    'gemini-3.1-flash-image': { input: 0.50, output: 60.00, src: S.gemini },
  }),
})

// The { input, output } in force at `at` (ms or Date), or the entry itself when
// it has no dated periods. Null for a missing entry.
export function priceAt(entry, at = Date.now()) {
  if (!entry) return null
  if (!Array.isArray(entry.periods)) return entry
  const day = new Date(Number.isFinite(Number(at)) ? Number(at) : Date.now()).toISOString().slice(0, 10)
  let pick = null
  for (const p of entry.periods) if (!p.from || p.from <= day) pick = p
  return pick
}

// USD per audio minute for a model id (provider prefixes like "openai/" are
// ignored), or null when unpriced.
export function audioPerMinute(model) {
  const e = AUDIO_PRICES_PER_MIN[String(model || '').split('/').pop()]
  return e ? e.perMin : null
}

export default { SOURCES, AUDIO_PRICES_PER_MIN, AUDIO_MIN_SECONDS, CALL_TOKEN_PRICES, priceAt, audioPerMinute }
