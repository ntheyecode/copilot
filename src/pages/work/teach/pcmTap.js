// Raw audio from a live MediaStream (the trainer's microphone, or the call audio
// that came with a screen share) as Float32 PCM blocks, for the utterance
// chunker. Uses an AudioWorklet (pcmWorklet.js, same-origin) and falls back to a
// ScriptProcessorNode where worklets are unavailable. The audio never plays out
// (no destination output is audible) and nothing is recorded here: blocks go
// straight to the chunker, which keeps only speech.
//
// createPcmTap(stream, onBlock) -> Promise<{ rate, stop() }>
// onBlock(samples: Float32Array, rate)
import workletUrl from './pcmWorklet.js?url&no-inline'   // a real same-origin file, never a data: URL (script-src 'self')

export async function createPcmTap(stream, onBlock) {
  const Ctx = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)
  if (!Ctx) throw Object.assign(new Error('No audio support.'), { code: 'AUDIO_UNSUPPORTED' })
  const ctx = new Ctx()
  try { if (ctx.state === 'suspended') await ctx.resume() } catch { /* resumes on next gesture */ }
  let src
  try { src = ctx.createMediaStreamSource(stream) } catch (e) { ctx.close().catch(() => {}); throw e }
  const mute = ctx.createGain()
  mute.gain.value = 0                      // keeps the graph pulling without playing anything
  mute.connect(ctx.destination)
  let node = null, stopped = false
  try {
    await ctx.audioWorklet.addModule(workletUrl)
    node = new AudioWorkletNode(ctx, 'wcp-pcm-tap')
    node.port.onmessage = (e) => { if (!stopped) onBlock(e.data, ctx.sampleRate) }
  } catch {
    node = ctx.createScriptProcessor(4096, 1, 1)
    node.onaudioprocess = (e) => { if (!stopped) onBlock(Float32Array.from(e.inputBuffer.getChannelData(0)), ctx.sampleRate) }
  }
  src.connect(node)
  node.connect(mute)
  return {
    rate: ctx.sampleRate,
    stop() {
      if (stopped) return
      stopped = true
      try { src.disconnect(); node.disconnect(); mute.disconnect() } catch { /* already disconnected */ }
      try { if (node.port) node.port.onmessage = null } catch { /* ignore */ }
      ctx.close().catch(() => {})
    },
  }
}

export default { createPcmTap }
