// AudioWorklet processor for the Teach recorder: forwards the first channel of
// each audio block to the page as Float32 samples, in ~100 ms batches so the
// main thread is not woken 375 times a second. Loaded as a same-origin module
// (Vite ?url), never inlined, so it fits the app's script-src policy.
class PcmTap extends AudioWorkletProcessor {
  constructor() {
    super()
    this.buf = []
    this.len = 0
    this.target = Math.round(sampleRate / 10)
  }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0]
    if (ch && ch.length) {
      this.buf.push(ch.slice(0))
      this.len += ch.length
      if (this.len >= this.target) {
        const out = new Float32Array(this.len)
        let o = 0
        for (const b of this.buf) { out.set(b, o); o += b.length }
        this.buf = []; this.len = 0
        this.port.postMessage(out, [out.buffer])
      }
    }
    return true
  }
}
registerProcessor('wcp-pcm-tap', PcmTap)
