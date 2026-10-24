// ---------------------------------------------------------------------------
// Refigoldmine - outbound email over SMTP (AWS SES).
//
// Written against the SMTP protocol directly rather than pulling in a mail
// library, for the same reason the rest of this server has almost no
// dependencies: one file, no native build step, and nothing to keep patched.
// SES speaks ordinary SMTP with STARTTLS on 587 or implicit TLS on 465, and
// AUTH LOGIN with the SMTP credentials SES issues (which are NOT the AWS access
// keys - a distinction that trips people up, so the UI says so). Those
// credentials are OPTIONAL: set them for SES or any relay that demands auth;
// leave them blank to relay through an IP-authenticated or loopback relay that
// issues none, and the AUTH step is skipped. A missing password never blocks a
// send before it starts - the relay's own reply is the authority on whether the
// message is accepted.
//
// Email is on the critical path for signing in now, so every failure has to
// come back as something an operator can act on: which stage failed and what
// the server said, never just "could not send".
// ---------------------------------------------------------------------------
import net from 'node:net'
import tls from 'node:tls'

function httpErr(status, message) { const e = new Error(message); e.status = status; return e }

// One SMTP conversation. Kept as a small state machine over a socket so the
// exact server reply can be reported when a step fails.
class SmtpSession {
  constructor(socket, { timeoutMs = 20000 } = {}) {
    this.socket = socket
    this.buffer = ''
    this.pending = null
    this.timeoutMs = timeoutMs
    socket.setEncoding('utf8')
    socket.on('data', (chunk) => this._onData(chunk))
  }

  _onData(chunk) {
    this.buffer += chunk
    // A reply is complete when a line starts with "NNN " (space, not hyphen).
    const lines = this.buffer.split(/\r?\n/)
    for (let i = 0; i < lines.length; i++) {
      if (/^\d{3} /.test(lines[i])) {
        const reply = lines.slice(0, i + 1).join('\n')
        this.buffer = lines.slice(i + 1).join('\n')
        const p = this.pending
        this.pending = null
        if (p) p.resolve({ code: Number(reply.slice(0, 3)), text: reply })
        return
      }
    }
  }

  read() {
    return new Promise((resolve, reject) => {
      this.pending = { resolve, reject }
      const t = setTimeout(() => {
        if (this.pending) { this.pending = null; reject(httpErr(504, 'The mail server did not reply in time.')) }
      }, this.timeoutMs)
      const done = (v) => { clearTimeout(t); resolve(v) }
      this.pending.resolve = done
    })
  }

  write(line) {
    this.socket.write(line + '\r\n')
  }

  // Send a command and require one of the accepted reply codes.
  async cmd(line, accept, stage) {
    if (line !== null) this.write(line)
    const r = await this.read()
    if (!accept.includes(r.code)) {
      throw httpErr(502, `${stage} failed (${r.code}): ${r.text.split('\n')[0]}`)
    }
    return r
  }
}

function connect({ host, port, secure }) {
  return new Promise((resolve, reject) => {
    const onError = (e) => reject(httpErr(502, `Could not reach ${host}:${port} - ${e.message}`))
    const socket = secure
      ? tls.connect({ host, port, servername: host }, () => resolve(socket))
      : net.connect({ host, port }, () => resolve(socket))
    socket.setTimeout(20000, () => {
      socket.destroy()
      reject(httpErr(504, `Timed out connecting to ${host}:${port}.`))
    })
    socket.once('error', onError)
  })
}

function upgradeTls(socket, host) {
  return new Promise((resolve, reject) => {
    const secure = tls.connect({ socket, servername: host }, () => resolve(secure))
    secure.once('error', (e) => reject(httpErr(502, `TLS handshake failed: ${e.message}`)))
  })
}

// A minimal RFC 5322 message. Subjects are ASCII here (they are our own
// strings), and the body is base64 so a long line or a stray CRLF cannot
// corrupt the message.
const b64wrap = (buf) => Buffer.from(buf).toString('base64').replace(/(.{76})/g, '$1\r\n')
const newBoundary = () => 'wcp_' + Math.random().toString(36).slice(2) + Date.now().toString(36)
const textPart = (text) => ['Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', b64wrap(Buffer.from(String(text || ''), 'utf8'))]
const htmlPart = (html) => ['Content-Type: text/html; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', b64wrap(Buffer.from(String(html || ''), 'utf8'))]

// The message BODY (no top headers): plain text, or multipart/alternative when
// an html part is present. Returned as { headerLines, bodyLines } so an
// attachment wrapper can nest it.
function bodyBlock({ text, html }) {
  if (!html) return { headerLines: ['Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64'], bodyLines: ['', b64wrap(Buffer.from(String(text || ''), 'utf8'))] }
  const b = newBoundary()
  return {
    headerLines: [`Content-Type: multipart/alternative; boundary="${b}"`],
    bodyLines: ['', `--${b}`, ...textPart(text), '', `--${b}`, ...htmlPart(html), '', `--${b}--`],
  }
}

function buildMessage({ from, fromName, to, subject, text, html, attachment }) {
  const fromHeader = fromName ? `${fromName} <${from}>` : from
  const head = [`From: ${fromHeader}`, `To: ${to}`, `Subject: ${subject}`, 'MIME-Version: 1.0', `Date: ${new Date().toUTCString()}`]
  const body = bodyBlock({ text, html })
  if (!attachment) {
    return [...head, ...body.headerLines, ...body.bodyLines].join('\r\n')
  }
  // multipart/mixed: the (text-or-alternative) body part + one attachment.
  const mix = newBoundary()
  const fname = String(attachment.filename || 'report.pdf').replace(/[^\w.\- ]/g, '_')
  return [
    ...head, `Content-Type: multipart/mixed; boundary="${mix}"`, '',
    `--${mix}`, ...body.headerLines, ...body.bodyLines, '',
    `--${mix}`, `Content-Type: ${attachment.contentType || 'application/octet-stream'}; name="${fname}"`, 'Content-Transfer-Encoding: base64', `Content-Disposition: attachment; filename="${fname}"`, '', b64wrap(attachment.content), '',
    `--${mix}--`, '',
  ].join('\r\n')
}

/**
 * Send one message.
 * @param {object} cfg  { host, port, username, password, fromEmail, fromName }
 */
export async function sendMail(cfg, { to, subject, text, html, attachment }) {
  const host = String(cfg.host || '').trim()
  const port = Number(cfg.port || 587)
  if (!host) throw httpErr(400, 'No SMTP endpoint is configured.')
  if (!cfg.fromEmail) throw httpErr(400, 'A verified "from" address is required.')
  if (!to) throw httpErr(400, 'No recipient.')

  // 465 is implicit TLS; 587 and 2587 start plain and upgrade with STARTTLS.
  const implicitTls = port === 465 || port === 2465
  let socket = await connect({ host, port, secure: implicitTls })
  let smtp = new SmtpSession(socket)

  try {
    await smtp.cmd(null, [220], 'Greeting')
    await smtp.cmd(`EHLO ${cfg.fromEmail.split('@')[1] || 'localhost'}`, [250], 'EHLO')

    if (!implicitTls) {
      // A relay on the loopback interface may legitimately have no TLS - a
      // local test sink, or a sidecar relay on the same machine. Credentials
      // never leave the box in that case, so plaintext is acceptable there and
      // ONLY there. For any remote host STARTTLS stays mandatory: silently
      // sending an SES password in the clear because a server declined to
      // upgrade would be exactly the wrong failure mode.
      const loopback = /^(127\.|::1$|localhost$)/i.test(host)
      let upgraded = false
      try {
        await smtp.cmd('STARTTLS', [220], 'STARTTLS')
        upgraded = true
      } catch (e) {
        if (!loopback) throw e
        console.warn(`[mailer] ${host} refused STARTTLS - continuing in plaintext because it is loopback`)
      }
      if (upgraded) {
        socket.removeAllListeners('data')
        socket = await upgradeTls(socket, host)
        smtp = new SmtpSession(socket)
        await smtp.cmd(`EHLO ${cfg.fromEmail.split('@')[1] || 'localhost'}`, [250], 'EHLO (after TLS)')
      }
    }

    // AUTH is optional. With both a username and password we authenticate (SES,
    // and any relay that requires it). With neither we skip AUTH and relay
    // unauthenticated - correct for an IP-authenticated or loopback relay that
    // issues no SMTP credentials. Half a credential (one set, not the other) is
    // a misconfiguration we do not guess at: we still skip AUTH and let the
    // relay's reply to MAIL FROM say so, rather than hard-blocking the send.
    if (cfg.username && cfg.password) {
      // AUTH LOGIN: username and password each base64, each its own line.
      await smtp.cmd('AUTH LOGIN', [334], 'AUTH')
      await smtp.cmd(Buffer.from(String(cfg.username)).toString('base64'), [334], 'Username')
      await smtp.cmd(Buffer.from(String(cfg.password)).toString('base64'), [235], 'Password')
    }

    await smtp.cmd(`MAIL FROM:<${cfg.fromEmail}>`, [250], 'MAIL FROM')
    await smtp.cmd(`RCPT TO:<${to}>`, [250, 251], 'RCPT TO')
    await smtp.cmd('DATA', [354], 'DATA')

    socket.write(buildMessage({
      from: cfg.fromEmail, fromName: cfg.fromName, to, subject, text, html, attachment,
    }) + '\r\n.\r\n')
    const sent = await smtp.read()
    if (sent.code !== 250) throw httpErr(502, `Message rejected (${sent.code}): ${sent.text.split('\n')[0]}`)

    try { smtp.write('QUIT') } catch { /* closing anyway */ }
    return { ok: true, messageId: (sent.text.match(/[\w-]{20,}/) || [])[0] || null }
  } finally {
    try { socket.destroy() } catch { /* already gone */ }
  }
}

// ---------------------------------------------------------------------------
// Message templates.
//
// One place, so every message signs off identically and a change of wording
// cannot be applied to the sign-in code and forgotten on the password reset.
// Deliberately plain text: these are transactional, they are read in two
// seconds on a phone, and a code buried in a styled layout is harder to find
// than one on its own line.
// ---------------------------------------------------------------------------
const SIGN_OFF = '\n\nThanks,\nSecurity Scanner Support Team'

export const TEMPLATES = {
  loginCode({ code, username, minutes = 10 }) {
    return {
      subject: `${code} is your sign-in code`,
      text:
        `Hello ${username || 'there'},\n\n` +
        `Your sign-in code is:\n\n    ${code}\n\n` +
        `It expires in ${minutes} minutes and can be used once.\n\n` +
        'If you did not try to sign in, you can ignore this message. Someone may ' +
        'have typed your address by mistake. Your password still works and nothing ' +
        'has changed on your account.' + SIGN_OFF,
    }
  },

  resetCode({ code, username, minutes = 10 }) {
    return {
      subject: `${code} is your password reset code`,
      text:
        `Hello ${username || 'there'},\n\n` +
        `Use this code to set a new password:\n\n    ${code}\n\n` +
        `It expires in ${minutes} minutes and can be used once.\n\n` +
        'If you did not ask to reset your password, ignore this message and your ' +
        'password stays as it is. No one can change it without this code.' + SIGN_OFF,
    }
  },

  emailChange({ code, username, minutes = 10 }) {
    return {
      subject: `${code} is your code to confirm this email`,
      text:
        `Hello ${username || 'there'},\n\n` +
        `Someone asked to use this address for the account "${username}". ` +
        `To confirm it, enter this code:\n\n    ${code}\n\n` +
        `It expires in ${minutes} minutes and can be used once. Your email is not ` +
        'changed until the code is entered.\n\n' +
        'If this was not you, ignore this message - nothing changes without the code.' + SIGN_OFF,
    }
  },

  passwordChange({ code, username, minutes = 10 }) {
    return {
      subject: `${code} is your code to change your password`,
      text:
        `Hello ${username || 'there'},\n\n` +
        `Use this code to set a new password:\n\n    ${code}\n\n` +
        `It expires in ${minutes} minutes and can be used once. Your password is not ` +
        'changed until the code is entered.\n\n' +
        'If you did not ask to change your password, ignore this message and it stays as it is.' + SIGN_OFF,
    }
  },

  accountLocked({ code, username, signInUrl, minutes = 10 }) {
    return {
      subject: 'Your account is locked - reset your password to unlock',
      text:
        `Hello ${username || 'there'},\n\n` +
        'Your account has been locked after too many incorrect password attempts. ' +
        'For your security, sign-in is blocked until you set a new password.\n\n' +
        `To unlock it, open ${signInUrl || 'the sign-in page'}, click "Forgot password", ` +
        `and use this code to set a new password:\n\n    ${code}\n\n` +
        `The code expires in ${minutes} minutes. Setting a new password unlocks your ` +
        'account immediately.\n\n' +
        'If this was not you, someone may have been trying to guess your password - ' +
        'resetting it is the safe thing to do.' + SIGN_OFF,
    }
  },

  welcome({ username, companyName, signInUrl }) {
    return {
      subject: 'Your Security Scanner account is ready',
      text:
        `Hello,\n\n` +
        `An account has been created for you${companyName ? ` under ${companyName}` : ''}.\n\n` +
        `    Username: ${username}\n` +
        `    Sign in:  ${signInUrl}\n\n` +
        'Your administrator will give you the password separately. When you sign ' +
        'in we email you a six digit code to confirm it is you.' + SIGN_OFF,
    }
  },

  test() {
    return {
      subject: 'Security Scanner test message',
      text:
        'This is a test message.\n\n' +
        'If you are reading this, outbound email is working and sign-in codes ' +
        `will reach their recipients.\n\nSent ${new Date().toUTCString()}.` + SIGN_OFF,
    }
  },
}

// SES rejects a "from" address that has not been verified, and that is by far
// the most common configuration mistake. Stated here so the UI can say it.
export const SES_HINT =
  'Use the SMTP credentials SES generates, not your AWS access key. The "from" ' +
  'address must be verified in SES, and while the account is in the sandbox the ' +
  'recipient must be verified too.'
