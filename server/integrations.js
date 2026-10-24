// ---------------------------------------------------------------------------
// WorkCoPilot - SOC / SIEM alert relay (outbound integrations).
// ---------------------------------------------------------------------------
// A company admin connects their threat-management stack; when a company member
// triggers an alert (e.g. PII/PHI entered and redacted), it is relayed to every
// enabled destination automatically. Outbound only, best-effort, never blocks
// the request. We NEVER send actual sensitive values - only the category names +
// counts and the actor/context (the alert itself carries no values).
//
// One connector framework. Most destinations are "HTTP POST JSON with an auth
// header", parameterised per type; Syslog (CEF) and Microsoft Sentinel (signed
// Data Collector API) have dedicated transports.
//
// Secrets (tokens/keys/passwords) live in the company config, encrypted at rest
// (store side), and are never returned to the client (write-only). No em dashes.
// ---------------------------------------------------------------------------
import crypto from 'node:crypto'
import dgram from 'node:dgram'
import net from 'node:net'

// The connector catalog. `fields` drive the admin UI; `secret:true` fields are
// write-only and never echoed back. `build` returns an HTTP request, OR a
// connector sets transport:'syslog'. Kept data-driven so adding one is one entry.
export const CONNECTORS = [
  { id: 'webhook', label: 'Generic Webhook (JSON)', group: 'Generic',
    fields: [{ key: 'url', label: 'POST URL', placeholder: 'https://...' }],
    build: (c, p) => ({ url: c.url, headers: {}, body: JSON.stringify(p) }) },

  { id: 'slack', label: 'Slack (Incoming Webhook)', group: 'Chat',
    fields: [{ key: 'url', label: 'Slack webhook URL', placeholder: 'https://hooks.slack.com/services/...' }],
    build: (c, p) => ({ url: c.url, headers: {}, body: JSON.stringify({ text: `:rotating_light: *${p.title}*\n${p.summary}\n_${p.timestamp}_` }) }) },

  { id: 'teams', label: 'Microsoft Teams (Incoming Webhook)', group: 'Chat',
    fields: [{ key: 'url', label: 'Teams webhook URL', placeholder: 'https://outlook.office.com/webhook/...' }],
    build: (c, p) => ({ url: c.url, headers: {}, body: JSON.stringify({
      '@type': 'MessageCard', '@context': 'http://schema.org/extensions', themeColor: 'E0A000', summary: p.title,
      sections: [{ activityTitle: p.title, text: p.summary, facts: [
        { name: 'User', value: `${p.user}${p.email ? ' (' + p.email + ')' : ''}` }, { name: 'Action', value: p.action },
        { name: 'Categories', value: p.categories || '-' }, { name: 'When', value: p.timestamp }] }],
    }) }) },

  { id: 'splunk_hec', label: 'Splunk (HTTP Event Collector)', group: 'SIEM',
    fields: [{ key: 'url', label: 'HEC endpoint', placeholder: 'https://<host>:8088/services/collector' }, { key: 'token', label: 'HEC token', secret: true }],
    build: (c, p) => ({ url: c.url, headers: { Authorization: `Splunk ${c.token}` }, body: JSON.stringify({ sourcetype: 'workcopilot:alert', event: p }) }) },

  { id: 'sumologic', label: 'Sumo Logic (HTTP Source)', group: 'SIEM',
    fields: [{ key: 'url', label: 'HTTP Source URL', placeholder: 'https://endpoint<n>.collection.sumologic.com/receiver/v1/http/...' }],
    build: (c, p) => ({ url: c.url, headers: {}, body: JSON.stringify(p) }) },

  { id: 'datadog', label: 'Datadog (Logs Intake)', group: 'Observability',
    fields: [{ key: 'apiKey', label: 'API key', secret: true }, { key: 'site', label: 'Site (optional)', placeholder: 'datadoghq.com (or eu, us3...)' }],
    build: (c, p) => ({ url: `https://http-intake.logs.${c.site || 'datadoghq.com'}/api/v2/logs`, headers: { 'DD-API-KEY': c.apiKey }, body: JSON.stringify([{ ddsource: 'workcopilot', service: 'workcopilot', ddtags: `type:${p.type}`, message: JSON.stringify(p) }]) }) },

  { id: 'elastic', label: 'Elastic (index API)', group: 'SIEM',
    fields: [{ key: 'url', label: 'Index/datastream URL', placeholder: 'https://<es>/workcopilot-alerts/_doc' }, { key: 'apiKey', label: 'API key', secret: true }],
    build: (c, p) => ({ url: c.url, headers: { Authorization: `ApiKey ${c.apiKey}` }, body: JSON.stringify({ '@timestamp': p.timestamp, event: { kind: 'alert', category: 'intrusion_detection', action: p.type }, message: p.summary, workcopilot: p }) }) },

  { id: 'pagerduty', label: 'PagerDuty (Events API v2)', group: 'SOAR / On-call',
    fields: [{ key: 'routingKey', label: 'Integration (routing) key', secret: true }],
    build: (c, p) => ({ url: 'https://events.pagerduty.com/v2/enqueue', headers: {}, body: JSON.stringify({
      routing_key: c.routingKey, event_action: 'trigger', payload: { summary: p.summary, severity: p.severity || 'warning', source: 'WorkCoPilot', custom_details: p } }) }) },

  { id: 'opsgenie', label: 'Opsgenie (Alerts API)', group: 'SOAR / On-call',
    fields: [{ key: 'apiKey', label: 'API key', secret: true }, { key: 'region', label: 'Region (optional)', placeholder: 'us (default) or eu' }],
    build: (c, p) => ({ url: `https://api.${c.region === 'eu' ? 'eu.' : ''}opsgenie.com/v2/alerts`, headers: { Authorization: `GenieKey ${c.apiKey}` }, body: JSON.stringify({ message: p.title, description: p.summary, details: { user: p.user, email: p.email, action: p.action, categories: p.categories, session: p.session, when: p.timestamp } }) }) },

  { id: 'servicenow', label: 'ServiceNow (Security Incident / Table API)', group: 'SOAR / ITSM',
    fields: [{ key: 'instanceUrl', label: 'Instance URL', placeholder: 'https://<instance>.service-now.com' }, { key: 'table', label: 'Table', placeholder: 'sn_si_incident (or incident)' }, { key: 'username', label: 'Username' }, { key: 'password', label: 'Password', secret: true }],
    build: (c, p) => ({ url: `${String(c.instanceUrl).replace(/\/+$/, '')}/api/now/table/${c.table || 'sn_si_incident'}`, headers: { Authorization: 'Basic ' + Buffer.from(`${c.username}:${c.password}`).toString('base64') }, body: JSON.stringify({ short_description: p.title, description: p.summary + `\n\nUser: ${p.user} ${p.email || ''}\nAction: ${p.action}\nCategories: ${p.categories}\nWhen: ${p.timestamp}` }) }) },

  { id: 'chronicle', label: 'Google Chronicle (Ingestion webhook)', group: 'SIEM',
    fields: [{ key: 'url', label: 'Ingestion/feed URL', placeholder: 'https://...' }, { key: 'apiKey', label: 'API key (optional)', secret: true }],
    build: (c, p) => ({ url: c.url, headers: c.apiKey ? { 'X-API-KEY': c.apiKey } : {}, body: JSON.stringify(p) }) },

  { id: 'sentinel', label: 'Microsoft Sentinel (Log Analytics Data Collector)', group: 'SIEM',
    fields: [{ key: 'workspaceId', label: 'Workspace ID' }, { key: 'sharedKey', label: 'Primary key', secret: true }, { key: 'logType', label: 'Log type (optional)', placeholder: 'WorkCoPilotAlert' }],
    special: 'sentinel' },

  { id: 'qradar', label: 'IBM QRadar (Syslog CEF)', group: 'SIEM',
    fields: [{ key: 'host', label: 'Collector host' }, { key: 'port', label: 'Port', placeholder: '514' }, { key: 'protocol', label: 'Protocol', placeholder: 'tcp or udp' }],
    special: 'syslog' },

  { id: 'syslog', label: 'Syslog (CEF) - any SIEM', group: 'SIEM',
    fields: [{ key: 'host', label: 'Host' }, { key: 'port', label: 'Port', placeholder: '514' }, { key: 'protocol', label: 'Protocol', placeholder: 'udp or tcp' }],
    special: 'syslog' },
]

export function connectorById(id) { return CONNECTORS.find((c) => c.id === id) || null }
// Catalog for the UI: id, label, group, and the field spec with secrets flagged
// (so the client knows which to render as write-only password inputs).
export function connectorCatalog() {
  return CONNECTORS.map((c) => ({ id: c.id, label: c.label, group: c.group, fields: c.fields }))
}

// Normalize an alert record into a vendor-neutral payload. NEVER carries values -
// only category names/counts and the actor/context.
export function normalizeAlert(alert = {}, companyName = '') {
  const who = alert.displayName || alert.username || 'A user'
  const cats = alert.categories || ''
  const title = 'WorkCoPilot: sensitive data entered and redacted'
  const summary = `${who}${alert.email ? ` (${alert.email})` : ''} entered sensitive data${cats ? ` (${cats})` : ''}${alert.sessionTitle ? ` in "${alert.sessionTitle}"` : ''}${alert.call ? ` via ${alert.call}` : ''} - redacted on the device before submission.`
  return {
    product: 'WorkCoPilot', type: alert.type || 'pii_redacted', severity: 'medium',
    title, summary,
    user: who, email: alert.email || '', role: alert.companyRole || '',
    company: companyName || '', companyId: alert.companyId || '',
    action: alert.call || '', session: alert.sessionTitle || '', sessionId: alert.sessionId || '',
    categories: cats, redactedCount: Number(alert.redactedTotal) || 0,
    timestamp: alert.at || new Date().toISOString(),
  }
}

// CEF line (ArcSight/QRadar). Escapes per the CEF spec.
function toCEF(p) {
  const esc = (s) => String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/\|/g, '\\|')
  const escx = (s) => String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/=/g, '\\=').replace(/\n/g, ' ')
  const ext = [`suser=${escx(p.user)}`, `duser=${escx(p.email)}`, `cs1Label=categories`, `cs1=${escx(p.categories)}`, `cs2Label=action`, `cs2=${escx(p.action)}`, `cs3Label=session`, `cs3=${escx(p.session)}`, `cnt=${p.redactedCount}`, `rt=${escx(p.timestamp)}`].join(' ')
  return `CEF:0|AdmireVeda|WorkCoPilot|1.0|${esc(p.type)}|${esc(p.title)}|5|${ext}`
}

function syslogLine(p) {
  // RFC3164-ish priority (local0.warning = 16*8+4 = 132), host + CEF message.
  const host = 'workcopilot'
  const ts = new Date().toUTCString()
  return `<132>${ts} ${host} ${toCEF(p)}`
}

async function sendSyslog(cfg, p) {
  const host = String(cfg.host || '').trim()
  const port = Number(cfg.port) || 514
  const proto = String(cfg.protocol || 'udp').toLowerCase()
  const line = syslogLine(p)
  if (!host) throw new Error('No syslog host configured.')
  if (proto === 'tcp') {
    await new Promise((resolve, reject) => {
      const sock = net.connect({ host, port, timeout: 8000 }, () => { sock.write(line + '\n', () => sock.end()) })
      sock.on('close', resolve); sock.on('timeout', () => { sock.destroy(); reject(new Error('syslog tcp timeout')) }); sock.on('error', reject)
    })
  } else {
    await new Promise((resolve, reject) => {
      const sock = dgram.createSocket('udp4')
      const buf = Buffer.from(line)
      sock.send(buf, 0, buf.length, port, host, (err) => { try { sock.close() } catch { /* ignore */ } err ? reject(err) : resolve() })
    })
  }
}

async function sendSentinel(cfg, p) {
  const workspaceId = String(cfg.workspaceId || '').trim()
  const sharedKey = String(cfg.sharedKey || '').trim()
  const logType = String(cfg.logType || 'WorkCoPilotAlert').replace(/[^A-Za-z0-9_]/g, '') || 'WorkCoPilotAlert'
  if (!workspaceId || !sharedKey) throw new Error('Workspace ID and primary key are required.')
  const body = JSON.stringify([p])
  const date = new Date().toUTCString()
  const stringToSign = `POST\n${Buffer.byteLength(body)}\napplication/json\nx-ms-date:${date}\n/api/logs`
  const sig = crypto.createHmac('sha256', Buffer.from(sharedKey, 'base64')).update(stringToSign, 'utf8').digest('base64')
  const auth = `SharedKey ${workspaceId}:${sig}`
  const res = await fetch(`https://${workspaceId}.ods.opinsights.azure.com/api/logs?api-version=2016-04-01`, {
    method: 'POST', headers: { 'content-type': 'application/json', Authorization: auth, 'Log-Type': logType, 'x-ms-date': date, 'time-generated-field': 'timestamp' }, body,
  })
  if (!res.ok) throw new Error(`Sentinel rejected (${res.status})`)
}

// Send one normalized payload to one configured destination. Returns {ok} or
// throws. Has an 8s ceiling so a slow endpoint never hangs the caller.
export async function sendTo(integration, payload) {
  const def = connectorById(integration.type)
  if (!def) throw new Error('Unknown integration type.')
  const cfg = integration.config || {}
  if (def.special === 'syslog') { await sendSyslog(cfg, payload); return { ok: true } }
  if (def.special === 'sentinel') { await sendSentinel(cfg, payload); return { ok: true } }
  const req = def.build(cfg, payload)
  if (!req || !req.url) throw new Error('This integration is missing its URL.')
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 8000)
  try {
    const res = await fetch(req.url, { method: 'POST', headers: { 'content-type': 'application/json', ...(req.headers || {}) }, body: req.body, signal: ctrl.signal })
    if (!res.ok) throw new Error(`${def.label} rejected (${res.status})`)
    return { ok: true }
  } finally { clearTimeout(t) }
}

// Relay a company alert to all ENABLED integrations for that company. Fire and
// forget: best-effort, never throws to the caller, each destination independent.
// `store` is injected to avoid a circular import; `getCompany` resolves the name.
export function makeRelay(store) {
  return function relayCompanyAlert(companyId, alert) {
    try {
      if (!companyId) return
      const list = store.listCompanyIntegrations ? store.listCompanyIntegrations(companyId, { withSecrets: true }) : []
      const enabled = (list || []).filter((i) => i && i.enabled)
      if (!enabled.length) return
      let companyName = ''
      try { const c = store.getCompany && store.getCompany(companyId); companyName = (c && c.name) || '' } catch { /* ignore */ }
      const payload = normalizeAlert(alert, companyName)
      for (const integ of enabled) {
        sendTo(integ, payload)
          .then(() => { try { store.markIntegrationRelay && store.markIntegrationRelay(companyId, integ.id, true) } catch { /* ignore */ } })
          .catch((e) => { try { store.markIntegrationRelay && store.markIntegrationRelay(companyId, integ.id, false, (e && e.message) || 'send failed') } catch { /* ignore */ } })
      }
    } catch { /* relay is best-effort */ }
  }
}

export default { CONNECTORS, connectorById, connectorCatalog, normalizeAlert, sendTo, makeRelay }
