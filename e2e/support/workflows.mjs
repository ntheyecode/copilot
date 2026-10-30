// Workflow setup helpers over the real API (the same calls the Teach studio
// makes): upload step screenshots, create, publish. Used by the scenarios that
// start from "a trainer already published a workflow".
import zlib from 'node:zlib'

// A real PNG (solid colour with a darker band), built without a browser.
export function pngDataUrl([r, g, b] = [30, 111, 235], w = 64, h = 40) {
  const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0 })
  const crc = (buf) => { let c = 0xffffffff; for (const x of buf) c = crcTable[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0 }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
    const td = Buffer.concat([Buffer.from(type), data])
    const c = Buffer.alloc(4); c.writeUInt32BE(crc(td))
    return Buffer.concat([len, td, c])
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0
  const rows = []
  for (let y = 0; y < h; y++) {
    const row = Buffer.alloc(1 + w * 3)
    const dark = y > h / 2 ? 0.6 : 1
    for (let x = 0; x < w; x++) { row[1 + x * 3] = r * dark; row[2 + x * 3] = g * dark; row[3 + x * 3] = b * dark }
    rows.push(row)
  }
  const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(Buffer.concat(rows))), chunk('IEND', Buffer.alloc(0))])
  return `data:image/png;base64,${png.toString('base64')}`
}

export const WF_META = Object.freeze({ productName: 'Billing portal', title: 'Raise a credit note', owner: 'Finance operations', launchTarget: 'https://billing.example.com/credit-notes', category: 'Finance' })

export async function uploadFrame(api, color) {
  const r = await api.post('/api/work/workflows/frames', { dataUrl: pngDataUrl(color) })
  if (r.status !== 200) throw new Error(`frame upload ${r.status} ${JSON.stringify(r.data)}`)
  return r.data.ref
}

// Create (and by default publish) a workflow as `api` (a trainer or admin).
export async function makeWorkflow(api, { title = WF_META.title, steps = 3, shots = true, publish = true } = {}) {
  const list = []
  for (let i = 0; i < steps; i++) {
    const step = { instruction: `Step ${i + 1}: ${['Open the Credit notes tab and choose New.', 'Pick invoice 1042.', 'Enter the reason and click Save.'][i % 3]}`, target: ['New', 'Invoice 1042', 'Save'][i % 3], doneWhen: 'The next screen shows.' }
    if (shots && i < 3) step.shot = await uploadFrame(api, [40 + i * 60, 120, 200 - i * 50])
    list.push(step)
  }
  const c = await api.post('/api/work/workflows', { meta: { ...WF_META, title }, steps: list })
  if (c.status !== 200) throw new Error(`create workflow ${c.status} ${JSON.stringify(c.data)}`)
  let wf = c.data.workflow
  if (publish) {
    const p = await api.post(`/api/work/workflows/${wf.id}/publish`)
    if (p.status !== 200) throw new Error(`publish ${p.status} ${JSON.stringify(p.data)}`)
    wf = p.data.workflow
  }
  return wf
}
