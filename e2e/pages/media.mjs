// Real media for import tests, made in the browser itself: a WebM screen
// recording of a canvas "app" that moves through `screens` distinct screens,
// each held long enough for the importer to see it settle.
export async function makeScreenRecording(page, { screens = 4, holdMs = 3000 } = {}) {
  const b64 = await page.evaluate(async ({ screens, holdMs }) => {
    const c = document.createElement('canvas')
    c.width = 960; c.height = 540
    const g = c.getContext('2d')
    // Page-sized differences, like moving between real app screens (the importer
    // only drafts a step for a significant change that then holds still).
    const colors = ['#ffffff', '#1e293b', '#fef3c7', '#0f766e', '#f1f5f9', '#7c2d12']
    let n = 0
    const draw = () => {
      g.fillStyle = colors[n % colors.length]; g.fillRect(0, 0, c.width, c.height)
      g.fillStyle = n % 2 ? '#f8fafc' : '#123'; g.font = 'bold 40px sans-serif'; g.fillText(`Billing portal, screen ${n + 1}`, 40, 90)
      g.fillStyle = n % 2 ? '#f8fafc' : '#1f6feb'; g.fillRect(60 + (n % 3) * 280, 160, 300, 300)
      g.fillStyle = '#fff'; g.font = '28px sans-serif'; g.fillText(['Credit notes', 'New', 'Invoice 1042', 'Save'][n % 4], 80 + n * 150, 270)
    }
    draw()
    const stream = c.captureStream(15)
    const rec = new MediaRecorder(stream, { mimeType: 'video/webm' })
    const chunks = []
    rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data) }
    const keep = setInterval(draw, 100)
    rec.start(250)
    for (let i = 0; i < screens; i++) {
      await new Promise((r) => setTimeout(r, holdMs))
      n += 1; draw()
    }
    await new Promise((r) => { rec.onstop = r; rec.stop() })
    clearInterval(keep)
    const blob = new Blob(chunks, { type: 'video/webm' })
    const buf = new Uint8Array(await blob.arrayBuffer())
    let s = ''
    for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000))
    return btoa(s)
  }, { screens, holdMs })
  return Buffer.from(b64, 'base64')
}
