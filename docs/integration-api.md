# WorkCoPilot Integration API (v1)

Lets a company's own apps work with WorkCoPilot: search the Company Brain, list
and read published workflows, send a named employee into a workflow, read
workflow incidents, and receive webhooks. The machine-readable contract is served
at `GET /api/v1/openapi.json` (OpenAPI 3.1, built from the route table, checked by
`server/api_v1_http.test.mjs` against the live router).

## Authentication

A company admin creates a key in the company console (API keys). Send it as
`Authorization: Bearer wcp_live_<id>_<secret>`. Keys are server-side secrets: never
put one in a browser or mobile app (the API sends no CORS headers). A key acts for
its company only, with exactly its scopes, and never as a person.

| Scope | Grants |
|---|---|
| `brain:query` | `POST /api/v1/brain/query` |
| `workflows:read` | `GET /api/v1/workflows`, `GET /api/v1/workflows/:id` (published only) |
| `workflows:run` | `POST /api/v1/workflows/:id/launch` |
| `incidents:read` | `GET /api/v1/incidents`, `GET /api/v1/incidents/:id` |
| `webhooks:manage` | `/api/v1/webhooks...` |

Errors are always `{ error, code }`. Auth codes: `MISSING_KEY`, `INVALID_KEY`,
`KEY_REVOKED`, `KEY_EXPIRED` (401); `INSUFFICIENT_SCOPE`, `IP_NOT_ALLOWED`,
`COMPANY_DISABLED` (403); `RATE_LIMITED` (429, with `Retry-After`). The per-key
limit defaults to 120 requests a minute (`WORK_API_RATE_PER_MIN`); failed key
attempts are limited to 30 a minute per client IP.

## Launch links

`POST /api/v1/workflows/:id/launch { employee: { id | email }, ttlSec? }` returns
`{ url, expiresAt }`. The link is single use, lives 10 minutes by default (60 to
3600 seconds), and is bound to the company, the workflow and that one employee.
The token is in the URL fragment, so it never reaches server logs. The employee
signs in as themselves; anyone else signed in is refused and the link stays
unused. The run starts through the normal workflow start route, with every usage
gate (seat, hours, legal consent) applied. The public origin comes from
`WORK_PUBLIC_URL` (`server/public_url.js`).

## Webhooks

Register an endpoint (console or `POST /api/v1/webhooks`) for
`workflow.published` and/or `workflow.incident.created`; `ping` is sent on demand.
Events are derived from the store's existing event emitter
(`server/webhook_events.js` maps each public event to its store event). Payloads
carry ids, the workflow title and the incident kind only, never a person.

- **Signature:** `X-WorkCoPilot-Signature: t=<unix>,v1=<hex HMAC-SHA256(secret, "<t>.<raw body>")>`.
  Reject a `t` more than 5 minutes from now (replay window). Also sent:
  `X-WorkCoPilot-Event`, `X-WorkCoPilot-Delivery` (dedupe on it: delivery is at
  least once). Reference verifier: `verifySignature` in `server/webhook_rules.js`.
- **Retries:** 7 attempts over about 9 hours with jittered backoff, then the
  delivery is dead-lettered and kept for a manual retry. After 5 dead-lettered
  deliveries in a row the endpoint is turned off with a stated reason.
- **SSRF guard:** https only, a public domain name (no IP literal, no internal
  name), port 443 or 8443, no credentials in the URL. The name is resolved at
  registration and again at connect time through `egress_guard.js`; any private or
  reserved answer is refused, so a DNS rebind cannot reach an internal address.
  Redirects are never followed; response bodies are discarded.
- Signing secrets are sealed with the platform KEK at rest and shown once.

## Modules

| Module | Job |
|---|---|
| `api_scopes.js` / `webhook_events.js` | the two closed registries |
| `api_key_rules.js` | pure key format, hash, validation, IP allowlist |
| `api_keys.js` | key create / rotate / revoke / resolve / usage audit |
| `api_key_auth.js` | `requireApiKey(scope)` middleware |
| `api_rate_limit.js` | per-key token bucket |
| `mfa_step_up.js` | shared step-up policy (also used by `export_key.js`) |
| `launch_links.js` | single-use employee launch links |
| `webhooks.js` / `webhook_rules.js` | endpoint + delivery state; signing and retry rules |
| `webhook_transport.js` / `webhook_worker.js` | one guarded HTTPS attempt; the delivery loop |
| `egress_guard.js` | the one SSRF rule set (also used by web learning) |
| `routes_v1.js` / `openapi_v1.js` / `api_v1_shapes.js` | v1 routes, the OpenAPI doc, public shapes |
| `api_admin_routes.js` | console routes for keys, webhooks, launch redeem |
| `integration_store.js` | composes the state modules for store.js |

## Limits and abuse controls

- Per key 120 requests a minute, per company 600 across all keys
  (`WORK_API_COMPANY_RATE_PER_MIN`), failed key attempts 30 a minute per client
  network (IPv4 address or IPv6 /64). A valid key is never refused because of
  failed attempts from its neighbors (no shared-NAT lockout).
- `/api/v1` bodies are capped at 64 KB; a brain query at 2,000 characters.
- MFA step-up: 5 wrong authenticator codes in 15 minutes lock step-up actions
  (export passphrase and API keys share one counter per account), audited.
- At most 1,000 unused launch links per company; a revoked key's links stop working.
- Webhooks: at most 400 deliveries waiting per company (a full queue counts and
  audits the dropped event, never silently), 500 kept per company, one attempt
  per endpoint at a time, at most 2 in flight per company, 5 second connect
  timeout, 10 second total. DNS goes through c-ares with a 3 second timeout, so a
  slow nameserver cannot starve the server's thread pool. A disabled company gets
  no deliveries.

## Known limits (first cut)

- The rate limiters are per process; a multi-node deployment needs a shared store.
  The webhook worker runs in the API process.
- The IP allowlist trusts `req.ip`. Hosted deployments set `trust proxy` to one
  hop (nginx). If the Node port is reachable directly, or a CDN sits in front of
  nginx, the allowlist sees the wrong address: bind Node to 127.0.0.1 and set the
  proxy trust to the real proxy chain before relying on allowlists.
- The HMAC pepper derives from the platform KEK. It protects a leaked database
  only when the KEK comes from `WORK_ENC_KEY` (not the key file beside the db), and
  rotating the KEK invalidates every API key (they must be reissued).
- TOTP codes can be reused within their 30 second window (login MFA behaves the
  same); per-counter replay protection is a platform-wide follow-up.
- A webhook endpoint URL is returned in full to admins and `webhooks:manage` keys;
  URLs with secrets in the path (some chat webhooks) are visible to them.
