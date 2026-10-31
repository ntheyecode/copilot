// ===========================================================================
// WorkCoPilot workflow LAUNCH LINKS: how a customer app sends a named employee
// into a published workflow without ever acting as that employee.
//
// A key with `workflows:run` asks for a link for (workflow, employee). The link
// is a convenience door, never a credential:
//   - short-lived (10 minutes by default), single-use, bound to the company,
//     the workflow AND the one employee it was made for;
//   - the token sits in the URL FRAGMENT (`/work/launch#<token>`), which browsers
//     never send to a server, so it stays out of access logs and Referer headers;
//   - only a SHA-256 of the token is stored (256-bit random token: a fast hash is
//     the right primitive; nothing to brute force);
//   - redeeming needs the employee's OWN signed-in session. A different signed-in
//     person is refused (and the link is not consumed), so a forwarded link is
//     useless to anyone else. The run itself then goes through the normal
//     /api/work/workflows/:id/start route with all of its usage gates.
//
// ctx: { db, persist, persistSoon, httpErr, getUser, companyUsers(companyId),
//        workflowFor(companyId, workflowId) -> published workflow or null,
//        keyActive?(keyId) -> bool, persistSoon?, clock? }
// ===========================================================================
import crypto from 'node:crypto'

export const DEFAULT_TTL_SEC = 600
export const MAX_TTL_SEC = 3600
export const MAX_OUTSTANDING_PER_COMPANY = 1000   // unused, unexpired links a company may hold at once
const KEEP_AFTER_EXPIRY_MS = 24 * 3600 * 1000

const sha = (t) => crypto.createHash('sha256').update(String(t)).digest('base64url')

export function createLaunchLinks(ctx) {
  const { persist, httpErr, getUser } = ctx
  const persistSoon = ctx.persistSoon || persist
  const clock = ctx.clock || Date.now
  const db = () => { const d = ctx.db(); if (!Array.isArray(d.launchLinks)) d.launchLinks = []; return d }
  const err = (status, message, code) => { const e = httpErr(status, message); e.code = code; return e }

  function sweep() {
    const t = clock()
    const d = db()
    const before = d.launchLinks.length
    d.launchLinks = d.launchLinks.filter((x) => Date.parse(x.expiresAt) + KEEP_AFTER_EXPIRY_MS > t)
    return before !== d.launchLinks.length
  }

  // employee: { id } or { email } (email matched case-insensitively against the
  // account's email or sign-in name, inside THIS company only).
  function findEmployee(companyId, employee) {
    const e = employee && typeof employee === 'object' ? employee : {}
    const id = e.id != null ? String(e.id).trim() : ''
    const email = e.email != null ? String(e.email).trim().toLowerCase() : ''
    if (!id && !email) throw err(400, 'Name the employee with `employee.id` or `employee.email`.', 'BAD_EMPLOYEE')
    const users = ctx.companyUsers(companyId) || []
    const u = id ? users.find((x) => String(x.id) === id)
      : users.find((x) => [x.email, x.username].some((v) => v && String(v).trim().toLowerCase() === email))
    // Same answer whether the person does not exist or belongs to another company.
    if (!u || String(u.companyId) !== String(companyId)) throw err(404, 'No employee with that id or email in your company.', 'EMPLOYEE_NOT_FOUND')
    if (u.disabled) throw err(409, 'That employee account is disabled.', 'EMPLOYEE_DISABLED')
    return u
  }

  function createLaunchLink(companyId, { workflowId, employee, ttlSec, keyId = null } = {}) {
    const w = ctx.workflowFor(companyId, String(workflowId || ''))
    if (!w) throw err(404, 'No published workflow with that id in your company.', 'NOT_FOUND')
    const u = findEmployee(companyId, employee)
    const ttl = ttlSec == null || ttlSec === '' ? DEFAULT_TTL_SEC : Number(ttlSec)
    if (!Number.isInteger(ttl) || ttl < 60 || ttl > MAX_TTL_SEC) throw err(400, `Choose ttlSec between 60 and ${MAX_TTL_SEC} seconds.`, 'BAD_TTL')
    const token = crypto.randomBytes(32).toString('base64url')
    const t = clock()
    const rec = {
      id: 'lnk_' + crypto.randomBytes(9).toString('hex'), hash: sha(token), companyId, workflowId: w.id, userId: u.id,
      keyId, createdAt: new Date(t).toISOString(), expiresAt: new Date(t + ttl * 1000).toISOString(), usedAt: null,
    }
    sweep()
    const outstanding = db().launchLinks.filter((x) => String(x.companyId) === String(companyId) && !x.usedAt && Date.parse(x.expiresAt) > t).length
    if (outstanding >= MAX_OUTSTANDING_PER_COMPANY) throw err(429, `Your company has ${MAX_OUTSTANDING_PER_COMPANY} unused launch links. Wait for some to be used or expire.`, 'LIMIT_REACHED')
    db().launchLinks.push(rec)
    persistSoon()   // a lost link (crash within a second) is just asked for again
    return { token, launchId: rec.id, expiresAt: rec.expiresAt, employeeId: u.id, workflowId: w.id }
  }

  // Redeem for the SIGNED-IN user. Order matters: an unknown token, a used one and
  // an expired one are told apart only after the token matched a record.
  function redeemLaunchLink(userId, token) {
    const raw = String(token || '').trim()
    if (!/^[A-Za-z0-9_-]{43}$/.test(raw)) throw err(404, 'This launch link is not valid.', 'LAUNCH_INVALID')
    const h = sha(raw)
    const rec = db().launchLinks.find((x) => x.hash === h)
    if (!rec) throw err(404, 'This launch link is not valid.', 'LAUNCH_INVALID')
    if (rec.usedAt) throw err(410, 'This launch link was already used. Ask your app for a fresh one.', 'LAUNCH_USED')
    if (Date.parse(rec.expiresAt) <= clock()) throw err(410, 'This launch link has expired. Ask your app for a fresh one.', 'LAUNCH_EXPIRED')
    const me = getUser(userId)
    if (!me || String(me.id) !== String(rec.userId) || String(me.companyId) !== String(rec.companyId)) {
      throw err(403, 'This link was made for another person. Sign in as that person to open it.', 'LAUNCH_WRONG_USER')
    }
    // A link made by a key that has since been revoked or expired stops working too.
    if (rec.keyId && typeof ctx.keyActive === 'function' && !ctx.keyActive(rec.keyId)) {
      throw err(410, 'The app that made this link no longer has access. Ask it for a fresh link.', 'LAUNCH_EXPIRED')
    }
    const w = ctx.workflowFor(rec.companyId, rec.workflowId)
    if (!w) throw err(409, 'That workflow is no longer published.', 'WORKFLOW_NOT_PUBLISHED')
    rec.usedAt = new Date(clock()).toISOString()
    persist()
    return { workflowId: w.id, title: (w.meta && w.meta.title) || '' }
  }

  function purgeCompanyLaunchLinks(companyId) {
    const d = db()
    d.launchLinks = d.launchLinks.filter((x) => String(x.companyId) !== String(companyId))
  }

  return { createLaunchLink, redeemLaunchLink, purgeCompanyLaunchLinks }
}

export default { createLaunchLinks, DEFAULT_TTL_SEC, MAX_TTL_SEC, MAX_OUTSTANDING_PER_COMPANY }
