# WorkCoPilot AI Egress Audit

What leaves the device to an AI provider (and to a few other third parties), what
the scrubber actually removes, and the residual gaps. Read-only audit. No code was
changed. This is an honest engineering trace, not a compliance attestation.

Date: 2026-10-25
Scope traced: `server/index.js` (plan / scope / watch / ask / result / deliverables
/ coverage handlers and the egress helpers), `server/work.js` (prompt assembly),
`server/work-scrub.js` (the DLP engine), `src/scrub.js` (client text DLP),
`src/frame_scrub.js` (on-device screenshot redaction), `src/pages/WorkPage.jsx`
(frame capture and send), `src/auth.jsx` (how the client learns the scrub state),
`server/brain_retrieve.js` + `server/store.js` (brain grounding and policy state).

---

## 0. Correction to a common assumption about the default

The brief carried the assumption "scrub is off by default unless a policy is armed."
That is no longer true in the code, and the report is written against what the code
does.

There are TWO independent controls, with DIFFERENT defaults:

- Legacy on/off text scrub (`scrubSensitive`, the regex PII/secret stripper):
  ON by default. `server/store.js:825 workUserScrubOn()` returns `u.scrub !== false`,
  i.e. on unless the user (or a superadmin) explicitly turned it off; a company
  default of on forces it on and cannot be overridden off. The comment at
  store.js:826 records the owner change: "Redaction is ON by DEFAULT (owner
  2026-10-24)." `/api/work/me` returns this effective value (store.js:496) and the
  client mirrors it into its own DLP switch (`src/auth.jsx:21 setScrubEnabled`).

- Armed governance policy (`scrubWithPolicy`: block words, per-category
  tokenize/withhold, operator custom fields): OFF by default.
  `server/store.js:911 getEffectiveWorkPolicy()` returns the company's (or the solo
  user's) policy only when `policy.armed` is true, else `null`.

So, by default today: identifier/PII/secret stripping IS applied to outbound text
and screenshots; the richer governance policy (block words, tokenization,
custom-field redaction) is NOT applied until someone arms it. A user who explicitly
turns scrub off disables BOTH the text scrub and the on-device screenshot
redaction (see section 2, item "Screen frame").

---

## 1. What is sent to the AI, per item

"Scrubbed by" below means the chokepoint that runs before the text enters the
prompt. `scrubText` in the plan/result handlers = policy-aware: it runs
`scrubWithPolicy` when a policy is armed, else `scrubSensitive` when the legacy
scrub is on, else it passes the text through unchanged (index.js:1734, 2081).
`govScrub` (index.js:311) is the same logic used by `scrubForAi`.

| Item sent to the AI | Scrubbed? | When | Residual exposure |
|---|---|---|---|
| Goal (the task text) | Yes, `scrubText` | Policy if armed, else legacy scrub (ON by default); raw only if the user turned scrub off | The substance/intent of the work always goes (scrub removes identifiers, not meaning). Also missed: personal names, unlabelled account/ID numbers, non-US PII shapes, novel secret formats (see section 3). |
| Scope / wizard answers (folded into the plan) | Yes on `/plan` via `scrubText` (index.js:1740) | Only when `pol \|\| scrubOn`. On the separate `/scope` endpoint it is scrubbed by `scrubSensitive` ONLY (index.js:1881), which ignores an armed policy's block words / custom fields | Same substance exposure as the goal; on `/scope` an armed policy's custom rules do not apply |
| Reference documents (`docsText` ephemeral on desktop, or stored docs on web) | Yes, `scrubText` (index.js:1778, 2084) | Policy if armed, else legacy scrub; raw if scrub off | The document's content/IP goes by design (it is injected as grounding). Scrub only removes identifiers inside it. 6k-8k char cap. |
| Research notes (Tavily web search) | The SCRUBBED goal is the query (index.js:1750, `workResearchNotes(safeGoal,...)`); returned snippets are scrubbed before the prompt (webGround at 1763) | Whenever platform/search key present | The scrubbed goal text egresses to a THIRD party (api.tavily.com), not just the AI provider. Still carries the work's substance. |
| Web learning (pages the goal/scope link to) | Fetched server-side; the page text is scrubbed into grounding (index.js:1763, 1781) | When the goal or scope contains a public URL | `fetchUrlsForLearning` (index.js:745) fetches the user-named URLs from our server with a `WorkCoPilotBot/1.0` user agent, revealing to those sites that the page is being read. SSRF-guarded to public http(s) only (index.js:698). |
| Brain chunks (company's own documents) | Yes, `scrubText` wrapping the hits (index.js:1812) | Company users only; chunks must clear the relevance floor (brain_retrieve MIN_SCORE 0.35) | The company's own knowledge/IP is sent to the provider BY DESIGN. Each chunk carries its source title. De-identified, not non-sensitive. |
| Skills / playbooks | Yes, `scrubText` (index.js:1802); also scrubbed on write (store.js) | Policy if armed, else legacy scrub | Method/standard/terminology substance goes by design. Double-scrub is defense in depth. |
| Learnings (cross-session KB) | Yes, `scrubText` (index.js:1801); also scrubbed on write (store.js:1240 `scrubStoredText`) | Policy if armed, else legacy scrub | Generalized facts about the user's tools; substance goes by design |
| Screen frame / vision (plan, watch, ask, result, deliverables) | Redacted ON-DEVICE only, by OCR line-masking (`src/frame_scrub.js redactFrame`) | Only when `isDlpActive()` is true, i.e. scrub on OR policy armed (WorkPage.jsx:29, 3814). ON by default today, but the RAW frame is sent if the user turned scrub off. The SERVER never scrubs frames. | The weakest link. See section 2. Even when on: OCR is imperfect on downscaled frames; only lines the DLP detectors flag are masked (names, faces, charts, diagrams, unlabelled data stay visible); OCR failure falls back to a downscale, or in non-strict mode to the original frame. |
| Question (`/ask`) | Yes, `scrubSensitive` ONLY (index.js:2043) | When legacy scrub on | On `/ask` an armed policy's block words / custom fields / tokenize mode are NOT applied to the question (uses the legacy stripper, not `scrubText`). Raw if scrub off. |
| Question + pasted data (`/result`) | Yes, policy-aware `scrubText` (index.js:2081-2084) | Policy if armed, else legacy scrub | Substance of the ask and of any pasted data goes by design |
| System prompt (`store.getSystemPrompt()`) + method anchors | n/a (not user data) | Always | Product instructions, not customer data |
| Model / provider identity | n/a | Chosen per call by `resolveWorkRuntime` (index.js:566): company key, else platform, else the user's own key, across Gemini / OpenAI / Groq / OpenRouter / Moonshot | See section 3, provider/jurisdiction |
| Public coverage question (`/api/work/coverage`) | NO | Public marketing widget; sent to the platform model UNSCRUBBED (index.js:2496) and logged with the AI answer to the leads grid (index.js:2487) | A visitor who pastes sensitive text into the public box sends it raw to the platform AI and it is stored. Capped at 1200 chars, IP rate-limited. |

Not sent to the AI (privacy-positive, worth recording):

- Compute-over-data: the CSV/XLSX rows are parsed in the browser and only the schema
  (column names + types + row count) is sent; the raw rows never leave the device
  (index.js:2111 comment, `src/pages/WorkPage.jsx` on-device parsing). The model
  returns a computation spec that runs locally.
- Commands and code blocks in a plan/result are never run through the text scrubber
  (work.js:574) - deliberately, so syntax is not corrupted. These are MODEL OUTPUT
  handed back to the user, not user input egressing, so this is not an egress gap,
  but it does mean a command the model emits is returned verbatim.
- A server-side audit row (`appendWorkAudit`) stores the scrubbed "sent" substance
  for operator transparency. That is retained storage, not provider egress, but it
  is a copy of the (scrubbed) goal/question that lives in our store.

---

## 2. Vision / screenshots: the weakest link, in detail

1. On-device only. All screenshot redaction happens in the browser/app
   (`redactFrame`, frame_scrub.js). The server does no image redaction at all; the
   watch-handler audit line even states the frame is scrubbed "on the device before
   sending" and only when scrub is on (index.js:1995-1997).

2. Gated on the DLP switch. `prepFrame` and the context-image path only call
   `redactFrame` when `isDlpActive()` (WorkPage.jsx:29, 3814). `isDlpActive()` is
   `!!govPolicy || enabled` (scrub.js:24). It is ON by default now, but if the user
   turns scrub off, the FULL-RESOLUTION raw frame is sent to the provider with no
   redaction.

3. OCR is best-effort, by its own admission. `redactFrame` loads Tesseract from a
   CDN, OCRs the frame, and blacks out whole lines whose recognized text trips the
   DLP detectors. The file's own header says this is "a strong backstop, not a
   mathematical guarantee" (frame_scrub.js:8). Consequences:
   - It only masks what the TEXT detectors catch. A face, a signature, a chart, a
     network diagram, a handwritten note, a logo, or any sensitive content that is
     not detector-matching text stays visible.
   - It masks nothing the detectors do not recognize - the same regex blind spots as
     the text scrubber (names, unlabelled IDs, novel secrets).
   - OCR on a downscaled watch frame misses text; a missed line is not masked.
   - If OCR cannot load at all, strict mode returns a 0.45x downscale (small text
     "not legible", not guaranteed unreadable) and non-strict returns the ORIGINAL
     frame (frame_scrub.js:89-101).

4. The CDN dependency itself is an egress of a kind: the Tesseract engine and
   language data load from `cdn.jsdelivr.net` and `tessdata.projectnaptha.com`
   (frame_scrub.js:17-19) at the time a protected session starts.

---

## 3. Honest findings

1. De-identified is not non-sensitive. The scrubber strips identifiers (emails,
   phones, SSNs, cards, IBANs, secrets, private hosts, labelled PII/PHI). It does
   NOT remove the substance or IP of the work: the goal, the reference documents,
   the company brain chunks, the skills/playbooks, and the research grounding all
   carry the actual content of what the customer is doing, and that goes to the AI
   provider by design. A competitor's provider could learn "this company is doing X
   with method Y from document Z," even with every identifier masked.

2. The legacy scrub is ON by default, but the governance policy is OFF by default,
   and a user can turn the scrub fully OFF. With scrub off there is no text
   redaction AND no screenshot redaction - raw text and raw full-resolution frames
   go to the provider. The richer controls (block words, per-category tokenize or
   withhold, operator custom fields) do nothing until a company or solo user arms a
   policy, which nothing forces them to do.

3. Vision/screenshots are the weakest link. Image redaction is on-device,
   OCR-based, imperfect, and only as good as the text detectors; raw frames are sent
   whenever DLP is off; and the server never re-checks a frame. See section 2.

4. The regex scrubber misses novel and unlabelled shapes. It has no personal-name
   detection, no company-name or project-codename detection (unless added as policy
   block words), catches an account/ID number only when it is labelled or digit-led,
   catches addresses/postcodes only when labelled, and recognizes only the specific
   secret token formats in its `RULES` table (Stripe/AWS/GitHub/Slack/Google/
   OpenAI-Anthropic/xAI/JWT shapes). A new provider's key format, a bespoke internal
   token, a non-US national ID, or an unlabelled MRN-style string can pass through.
   It is regex-grade best-effort and both the module header and this audit treat it
   that way.

5. Policy coverage is uneven across handlers. `/plan` and `/result` use the
   policy-aware `scrubText`; but `/ask` scrubs the question with the legacy
   `scrubSensitive` only (index.js:2043), and `/scope` and `/deliverables` scrub the
   goal with `scrubSensitive` only (index.js:1881, 1905). On those three paths an
   armed policy's block words, custom fields, and tokenize mode are not applied.

6. Egress is not only to the AI provider. The scrubbed goal is also sent to Tavily
   (api.tavily.com) for research, user-named URLs are fetched from our server, and
   the vision CDN is contacted. The public `/coverage` widget sends the visitor's
   raw question to the platform AI and stores it.

7. No per-tenant provider or jurisdiction gating on the platform path. When a
   company runs on its own key, data stays on that key (good, and
   `resolveWorkRuntime` fails closed if the company pinned its own key but it is
   missing, index.js:572). But on the platform path the runtime is chosen across
   whatever providers are configured, with no control that keeps a privacy-tier or
   on-prem-preference customer off a given provider or out of a given jurisdiction.

---

## 4. Recommendations, prioritized

P1 - highest impact

1. Never send a raw frame. Decouple screenshot redaction from the on/off scrub
   switch so a frame is ALWAYS redacted (or downscaled/withheld) before send, even
   when text scrub is off, and have the SERVER reject or downscale any frame it
   cannot confirm was on-device redacted (e.g. a client-set "redacted" flag plus a
   server-side size/entropy sanity check). Today a user toggling scrub off sends
   full-resolution screens in the clear.

2. Make the governance policy, not just the legacy scrub, the default for COMPANY
   tenants. A company with `scrub` on gets identifier stripping; it does not get
   block words, custom fields, or tokenize mode unless it arms a policy. Ship a
   sensible armed default policy for company tenants (or auto-arm from the
   compliance preset they pick) so the stronger controls are on without an explicit
   step.

P2

3. Per-tenant egress / no-send and provider-jurisdiction gating. Add a tenant
   setting that (a) can forbid specific item classes from egress entirely (e.g. "do
   not send reference documents" or "do not send brain chunks to a third-party
   provider") and (b) restricts which providers/regions a tenant's data may be
   routed to on the platform path, failing closed when no allowed provider is
   available rather than silently routing elsewhere.

4. Strengthen on-device frame redaction. Treat OCR failure as withhold-the-frame (or
   send a blank/aggressively downscaled placeholder) rather than returning the
   original; add non-text redaction options (known-sensitive regions, blur the whole
   frame outside a user-chosen area); and surface to the user, per session, that
   screenshot redaction is best-effort OCR.

5. Close the per-handler policy gaps. Route `/ask`, `/scope`, and `/deliverables`
   through the same policy-aware `scrubText`/`govScrub` chokepoint as `/plan` and
   `/result`, so an armed policy applies everywhere.

P3

6. Reduce substance egress where possible. Offer a mode that sends less grounding
   (e.g. omit full reference-document text and brain chunks for the most sensitive
   tenants, or summarize/redact them further before send), and document clearly that
   even scrubbed, the work's substance reaches the provider.

7. Scrub the public coverage question, or clearly warn on that widget, and cap what
   is stored. It currently sends the raw visitor question to the platform AI and
   logs it.

8. Broaden the detector set behind a policy: add name detection, non-US ID shapes,
   and an operator-extensible secret-format list, acknowledging regex limits rather
   than relying on the fixed `RULES` table.

---

## 5. Evidence index (file:line)

- Default scrub ON: `server/store.js:825-833` (`workUserScrubOn`, `u.scrub !== false`).
- Policy OFF unless armed: `server/store.js:911-918` (`getEffectiveWorkPolicy`).
- Policy-aware chokepoint: `server/index.js:1734`, `:2081`, `:311 govScrub`, `:316 scrubForAi`.
- Plan egress assembly: `server/index.js:1735-1832` (goal, scope, reason, research,
  web, docs, learnings, skills, brain, frame).
- Research to Tavily: `server/index.js:663-690` (`workResearchNotes`).
- Server-side URL fetch: `server/index.js:698-783` (`fetchUrlsForLearning`, SSRF guard at 698).
- Brain retrieval + scrub: `server/index.js:1808-1822`, `server/brain_retrieve.js:1-49`.
- Prompt body: `server/work.js:534-614` (`workPlanUser`, `workPlan`; commands/code not scrubbed at 574).
- Per-handler scrub differences: `/ask` legacy-only `server/index.js:2043`;
  `/scope` legacy-only `:1881`; `/deliverables` legacy-only `:1905`.
- Public coverage unscrubbed + logged: `server/index.js:2487`, `:2496`.
- Text scrubber internals: `server/work-scrub.js:52-216` (`RULES`, `scrubSensitive`,
  `scrubWithPolicy`), header limits `:1-27`.
- Client DLP switch wiring: `src/auth.jsx:21-22`; `src/scrub.js:16-51`,
  `isDlpActive` `:24`.
- On-device frame redaction: `src/frame_scrub.js:54-102`; gated send
  `src/pages/WorkPage.jsx:29`, `:3814`.
