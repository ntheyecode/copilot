// ===========================================================================
// The multipart fields for one OpenAI-compatible /audio/transcriptions call,
// per model family. Pure, so the request shape is unit-tested without a network.
//
//   whisper  (whisper-1, Groq whisper-large-*): response_format verbose_json for
//            segment timestamps, temperature 0, singular `language`.
//   gpt4o    (gpt-4o-transcribe, gpt-4o-mini-transcribe): json, temperature 0,
//            singular `language`. Shut down 2027-02-26 (ai_model_lifecycle.js).
//   languages (gpt-transcribe and any newer transcribe model): `languages` is an
//            ARRAY of ISO-639-1 codes that REPLACES `language` (OpenAI: "don't
//            send both"); verbose segments and timestamp_granularities are
//            whisper-only, and sampling parameters are not documented, so only
//            the default JSON response is requested. Multipart arrays use the
//            `name[]` field form OpenAI's own SDK sends.
// Source: https://developers.openai.com/api/docs/guides/speech-to-text (2026-10-31).
// ===========================================================================

export function transcribeFamily(model) {
  const m = String(model || '')
  if (/whisper/i.test(m)) return 'whisper'
  if (/^gpt-4o(-mini)?-transcribe/i.test(m)) return 'gpt4o'
  return 'languages'
}

// Whisper models return segment timestamps (verbose_json); the others only text.
export const wantsSegments = (model) => transcribeFamily(model) === 'whisper'

// [[name, value], ...] for everything except the file part.
export function transcribeFields(model, { language = null } = {}) {
  const fam = transcribeFamily(model)
  const lang = typeof language === 'string' && /^[a-z]{2}$/.test(language) ? language : null
  const out = [['model', String(model)]]
  if (fam === 'languages') {
    if (lang) out.push(['languages[]', lang])
    return out
  }
  out.push(['response_format', fam === 'whisper' ? 'verbose_json' : 'json'])
  out.push(['temperature', '0'])
  if (lang) out.push(['language', lang])
  return out
}

// The FormData for the call: the audio file first, then transcribeFields.
export function buildTranscribeForm(model, { audio, mime, filename, language = null } = {}) {
  const form = new FormData()
  form.append('file', new Blob([audio], { type: mime }), filename)
  for (const [k, v] of transcribeFields(model, { language })) form.append(k, v)
  return form
}

export default { transcribeFamily, wantsSegments, transcribeFields, buildTranscribeForm }
