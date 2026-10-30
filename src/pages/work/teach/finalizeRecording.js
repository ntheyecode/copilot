// Turn a stopped capture (live recording or imported video, narration already
// merged with transcribePipeline.withVoice) into editor rows. Shared by
// useDemoRecorder and useImportRecording so both paths mask and save exactly
// the same way:
//   alignCapture on the FULL in-memory capture (every step binds to the right
//   screen) -> keep only the frames the steps show (pruneToStepFrames) ->
//   finalizeCapture with an EXPLICIT scrub (redactFrame when the workflow's
//   masking or the company's data protection is on, else the identity) and the
//   frame upload -> bind the stored refs -> toWorkflowSteps with translated seeds.
// Throws coded errors (CAPTURE_*); an upload failure without a code is reported
// as CAPTURE_SAVE_FAILED. isOpen() false stops before the next frame is masked
// or sent (the wizard was closed or the run cancelled).
import { finalizeCapture } from './captureSession.js'
import { alignCapture, toWorkflowSteps } from './captureTimeline.js'
import { stepsToForm } from './workflowModel.js'
import {
  chooseScrub, keepFrameAsIs, pruneToStepFrames, frameRefMap, bindStepRefs, distinctFrameCount, captureSummary, warningLines,
} from './recordModel.js'

// deps: { mask, dlp, redact, upload, label(key, vars), isOpen(), onProgress({ stage, done, total, masking }), voiceLines }
// -> { steps: editorRows[], summary, warnings: [{ key, vars }], masking }
export async function finalizeRecording(capture, deps) {
  const { mask, dlp, redact, upload, label, isOpen = () => true, onProgress = () => {}, voiceLines = 0 } = deps
  const aligned = alignCapture(capture)
  const warnings = warningLines(aligned.warnings)
  const frames = distinctFrameCount(capture)
  if (!aligned.steps.length) return { steps: [], summary: captureSummary({ ...aligned, frameCount: frames }, voiceLines), warnings, masking: false }

  const pruned = pruneToStepFrames(capture, aligned)
  const total = distinctFrameCount(pruned)
  const scrubFn = chooseScrub({ mask, dlp }, redact)
  const masking = scrubFn !== keepFrameAsIs
  const stillOpen = () => { if (!isOpen()) throw Object.assign(new Error('closed'), { code: 'CAPTURE_CLOSED' }) }
  let masked = 0, saved = 0, stage = 'mask'
  onProgress({ stage: masking ? 'mask' : 'save', done: 0, total, masking })
  const scrub = async (f) => {
    stillOpen()
    const out = await scrubFn(f)
    if (masking) { masked += 1; onProgress({ stage: 'mask', done: masked, total, masking }) }
    return out
  }
  const send = async (dataUrl) => {
    stage = 'save'
    stillOpen()
    const r = await upload(dataUrl)
    saved += 1; onProgress({ stage: 'save', done: saved, total, masking })
    return r
  }
  let done
  stillOpen()
  try { done = await finalizeCapture(pruned, { scrub, upload: send }) } catch (e) {
    // finalizeCapture reports any scrub throw as REDACT_FAILED; a close is not one.
    if (!isOpen()) throw Object.assign(new Error('closed'), { code: 'CAPTURE_CLOSED' })
    if (e && e.code) throw e
    throw Object.assign(new Error('save failed'), { code: stage === 'save' ? 'CAPTURE_SAVE_FAILED' : 'UNKNOWN' })
  }
  const bound = bindStepRefs(aligned, frameRefMap(pruned.events, done.events))
  const steps = stepsToForm(toWorkflowSteps(bound, { label }))
  return { steps, summary: captureSummary({ ...bound, frameCount: frames }, voiceLines), warnings, masking }
}

export default { finalizeRecording }
