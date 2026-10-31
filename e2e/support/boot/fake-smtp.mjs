// Local SMTP server for E2E. The product's own mailer (server/mailer.js) talks
// to it over a real socket: greeting, EHLO, STARTTLS refused (loopback relays
// may run without TLS, which the mailer allows ONLY for loopback), MAIL FROM,
// RCPT TO, DATA, QUIT. Every accepted message is kept with its headers and its
// decoded text part, so a test reads the invite or reset link the way a person
// reads the email.
import net from 'node:net'

const decodeParts = (raw) => {
  const texts = []
  const re = /Content-Type: text\/(plain|html); charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n([A-Za-z0-9+/=\r\n]+)/g
  let m
  while ((m = re.exec(raw))) texts.push({ type: m[1], body: Buffer.from(m[2].replace(/\r\n/g, ''), 'base64').toString('utf8') })
  return texts
}
const header = (raw, name) => {
  const m = new RegExp(`^${name}: (.*)$`, 'mi').exec(raw.split('\r\n\r\n')[0] || '')
  return m ? m[1].trim() : ''
}

export function startFakeSmtp() {
  const messages = []
  const sockets = new Set()
  const srv = net.createServer((sock) => {
    sockets.add(sock)
    sock.on('close', () => sockets.delete(sock))
    sock.setEncoding('utf8')
    let buf = ''
    let inData = false
    let env = { from: '', to: [] }
    const say = (line) => { try { sock.write(line + '\r\n') } catch { /* closed */ } }
    say('220 e2e-smtp.local ESMTP ready')
    sock.on('data', (chunk) => {
      buf += chunk
      for (;;) {
        if (inData) {
          const end = buf.indexOf('\r\n.\r\n')
          if (end < 0) return
          const raw = buf.slice(0, end)
          buf = buf.slice(end + 5)
          inData = false
          const parts = decodeParts(raw)
          const text = (parts.find((p) => p.type === 'plain') || parts[0] || { body: '' }).body
          messages.push({ from: env.from, to: env.to.slice(), subject: header(raw, 'Subject'), toHeader: header(raw, 'To'), text, html: (parts.find((p) => p.type === 'html') || { body: '' }).body, raw, at: Date.now() })
          env = { from: '', to: [] }
          say('250 OK queued as e2emessage0000000000000000' + messages.length)
          continue
        }
        const i = buf.indexOf('\r\n')
        if (i < 0) return
        const line = buf.slice(0, i)
        buf = buf.slice(i + 2)
        const verb = line.slice(0, 4).toUpperCase()
        if (verb === 'EHLO' || verb === 'HELO') say('250 e2e-smtp.local')
        else if (verb === 'STAR') say('502 STARTTLS not offered by this test relay')
        else if (verb === 'AUTH') say('235 Authentication succeeded')
        else if (verb === 'MAIL') { env.from = (/<([^>]*)>/.exec(line) || [])[1] || ''; say('250 OK') }
        else if (verb === 'RCPT') { env.to.push((/<([^>]*)>/.exec(line) || [])[1] || ''); say('250 OK') }
        else if (verb === 'DATA') { inData = true; say('354 End data with <CR><LF>.<CR><LF>') }
        else if (verb === 'QUIT') { say('221 Bye'); sock.end() }
        else if (verb === 'RSET' || verb === 'NOOP') say('250 OK')
        else say('500 Unknown command')
      }
    })
    sock.on('error', () => { /* client went away */ })
  })
  return new Promise((resolve) => {
    srv.listen(0, '127.0.0.1', () => resolve({
      port: srv.address().port,
      messages: () => messages.map(({ raw, ...m }) => ({ ...m })),
      clear: () => { messages.length = 0 },
      close: () => new Promise((r) => { for (const s of sockets) s.destroy(); srv.close(r) }),
    }))
  })
}
