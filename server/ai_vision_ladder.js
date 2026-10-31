// ===========================================================================
// WorkCoPilot screen-reading model ladders (moved out of server/index.js).
//
// WorkCoPilot needs a VISION model (it reads the screen). Two regex ladders per
// provider, matched against the key's LIVE catalog:
//   WORK_VISION_PREF   cheapest dependable reader first, for the watch loop
//                      (it runs hundreds of times an hour);
//   WORK_VISION_STRONG strongest first, for the just-in-time backup / Deep switch.
// Every pick goes through ai_model_lifecycle.pickFromLadder, so a model past its
// shutdown date is never chosen even while a provider still lists it. The live
// catalog stays the authority for what the key can use.
//
// Ordering notes (prices from model-prices.js, checked 2026-10-31):
//   openai: gpt-6-luna $0.10 in, gpt-5.6-luna $0.20, then the 4o / 4.1 family
//           while it is still served (shutdown 2027-01-14), terra, then larger.
//   gemini: 3.1 Flash-Lite ($0.25, shutdown 2027-05-07) then 3.5 Flash-Lite
//           ($0.30, Google's pick for new projects), the -latest alias, then
//           3.6 / 3.8 Flash. 2.0 Flash (shut down 2026-06-01) is gone.
// ===========================================================================
import { listModels, findVisionModel } from './ai.js'
import { pickFromLadder } from './ai_model_lifecycle.js'

export const WORK_VISION_PREF = Object.freeze({
  gemini: [/^gemini-3\.1-flash-lite$/i, /^gemini-3\.5-flash-lite$/i, /gemini-3(\.\d)?-flash-lite(?!-preview|-image)/i, /flash-lite-latest/i, /^gemini-3\.6-flash$/i, /^gemini-3\.8-flash$/i, /flash-latest/i, /gemini-3(\.\d)?-flash(?!-lite|-image|-preview|-tts|-live)\b/i],
  openai: [/^gpt-6-luna$/i, /^gpt-5\.6-luna$/i, /gpt-4o-mini(?!-transcribe|-search|-audio|-tts|-realtime)/i, /4\.1-mini/i, /^gpt-5\.6-terra$/i, /gpt-4o(?!-mini|-transcribe|-audio|-search|-tts|-realtime)/i, /gpt-4\.1\b/i],
  groq: [/scout/i, /maverick/i, /llama.*vl/i, /vision/i],
  // OpenRouter: the cheapest verified screen-reader first (Qwen 3.7 Flash, reasoning
  // off), then other cheap Qwen vision models.
  openrouter: [/qwen3\.7-flash/i, /qwen3\.5-flash/i, /qwen3-vl-30b/i, /qwen.*vl.*instruct/i, /qwen.*flash/i],
})

export const WORK_VISION_STRONG = Object.freeze({
  gemini: [/gemini-3(\.\d)?-pro(?!-image)/i, /2\.5-pro/i, /pro-latest/i, /^gemini-3\.8-flash$/i, /^gemini-3\.6-flash$/i, /flash-latest/i, /gemini-3(\.\d)?-flash(?!-lite|-image|-preview|-tts|-live)\b/i],
  openai: [/^gpt-5\.6-sol$/i, /^gpt-5\.6-terra$/i, /gpt-4o(?!-mini|-transcribe|-audio|-search|-tts|-realtime)/i, /gpt-4\.1(?!-nano|-mini)/i, /^gpt-6-luna$/i, /^gpt-5\.6-luna$/i, /gpt-4o-mini(?!-transcribe|-search|-audio|-tts|-realtime)/i],
  groq: [/maverick/i, /scout/i, /llama.*vl/i, /vision/i],
  openrouter: [/qwen3-vl-235b/i, /qwen3\.8/i, /qwen.*vl.*instruct/i, /qwen3\.7-flash/i],
})

// Cheapest capable reader on this runtime's key, or the shared resolver's pick.
export async function pickWorkVision(rt) {
  try {
    const m = pickFromLadder(WORK_VISION_PREF[rt.providerId], await listModels(rt))
    if (m) return m
  } catch { /* fall through to the shared resolver */ }
  return await findVisionModel(rt).catch(() => null)
}

// Strongest reader on this runtime's key other than `avoid`, or null.
export async function pickWorkVisionStrong(rt, avoid) {
  try {
    return pickFromLadder(WORK_VISION_STRONG[rt.providerId], await listModels(rt), { avoid }) || null
  } catch { /* none */ }
  return null
}

export default { WORK_VISION_PREF, WORK_VISION_STRONG, pickWorkVision, pickWorkVisionStrong }
