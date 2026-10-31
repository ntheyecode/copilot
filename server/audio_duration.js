// ===========================================================================
// Audio length of a chunk we are about to send for transcription, read from the
// file itself. Used to bill per-minute transcription models (gpt-transcribe)
// whose response may carry no usage block: the minutes we sent are the minutes
// we pay for.
//
// WAV only (the Teach capture pipeline sends 16-bit PCM WAV): the RIFF header
// states the byte rate and the data length exactly. Any other container returns
// null, and the call is then booked as ESTIMATED by the usage ledger, never as a
// guessed duration.
// ===========================================================================

// Seconds of audio in a WAV buffer, or null when it is not a readable WAV.
export function wavDurationSeconds(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 44) return null
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE') return null
  let byteRate = 0
  let off = 12
  while (off + 8 <= buf.length) {
    const id = buf.toString('ascii', off, off + 4)
    const size = buf.readUInt32LE(off + 4)
    const body = off + 8
    if (id === 'fmt ' && body + 12 <= buf.length) byteRate = buf.readUInt32LE(body + 8)
    if (id === 'data') {
      if (!byteRate) return null
      // A streamed writer may leave the size unset (0 or 0xFFFFFFFF): use what is there.
      const avail = buf.length - body
      const len = size > 0 && size <= avail ? size : avail
      return Math.round((len / byteRate) * 1000) / 1000
    }
    off = body + size + (size % 2)   // chunks are word-aligned
  }
  return null
}

// Seconds of audio for a buffer of the given MIME type, or null when unknown.
export function audioDurationSeconds(buf, mime) {
  const m = String(mime || '').toLowerCase()
  if (m === 'audio/wav' || m === 'audio/x-wav' || m === 'audio/wave') return wavDurationSeconds(buf)
  return null
}

export default { wavDurationSeconds, audioDurationSeconds }
