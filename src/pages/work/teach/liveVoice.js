// One live narration channel: a MediaStream's audio (the trainer's mic, or the
// call audio from a screen share) -> PCM blocks (pcmTap) -> utterances on the
// capture clock (audioChunker.createLiveChunker) -> the shared transcriber
// (transcribePipeline), tagged with who is speaking. Blocks that arrive while the
// recording is paused are dropped, and flush() is called on pause and stop so a
// paused gap never sits inside one utterance.
//
// startVoiceChannel({ stream, speaker, transcriber, nowMs, isRecording })
//   -> Promise<{ flush(), stop() }>
import { createPcmTap } from './pcmTap.js'
import { createLiveChunker } from './audioChunker.js'
import { blockStartMs } from './voiceModel.js'

export async function startVoiceChannel({ stream, speaker, transcriber, nowMs, isRecording }) {
  let chunker = null
  const tap = await createPcmTap(stream, (samples, rate) => {
    if (!isRecording()) return
    if (!chunker) chunker = createLiveChunker({ rate, onUtterance: (u) => { transcriber.enqueue(u, { speaker }) } })
    chunker.push(samples, blockStartMs(nowMs(), samples.length, rate))
  })
  return {
    flush() { if (chunker) chunker.flush() },
    stop() { if (chunker) chunker.flush(); tap.stop() },
  }
}

export default { startVoiceChannel }
