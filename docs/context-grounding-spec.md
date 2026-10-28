# Context grounding, cross-surface: bring your files, links and knowledge base into the plan

Status: design spec, 2026-10-27. Partly shipping now (the desktop-path removal); the rest is planned for the next wave. For review before building the remainder, like `guidance-projects-spec.md` and `recommended-practices-spec.md`. US spelling, read-only, nothing leaves until the person starts, no model or provider exposed.

## 1. Intent

Grounding a plan in the person's own material makes every step sharper. This is contextual awareness that has nothing to do with whether the person works in a browser or a desktop app, so both surfaces get it and both kinds of user benefit. Today the start flow already grounds on attached documents; this spec generalizes that into one optional step that also takes web links and the knowledge base, gives it to both surfaces with per-surface data handling, and removes a confusing field that was never real context.

## 2. What exists today (the start flow, `src/pages/work/StartTask.jsx`)

- Step 1 "Where you're working": SaaS, Desktop app, My own files, Something else, with small fields per choice.
- Step 2 "Documents or data" (`DocsAttach`): attach a spec, export or diagram (PDF, DOCX, TXT, MD). Desktop reads on-device; web uploads and scrubs. Gated to Advanced and Premium.

So the documents half is real for both surfaces. Missing: web links, an explicit knowledge-base pick, and the gating excludes Lite and Basic from any grounding.

## 3. The generalized step: "Bring anything that helps" (optional)

Replace the documents-only step with one optional step offering three context types, all feeding the same grounding path into the planner:

1. Files: specs, exports, diagrams (as today).
2. Web links: paste one or more reference URLs the planner should read.
3. Knowledge base: pick from the tenant brain (a space or specific documents) to scope what the planner draws on.

All optional; skipping plans from the goal and the screen, exactly as now.

## 4. Parity with per-surface data handling (the core requirement)

Same capability on both surfaces; the data path adapts to keep the desktop's on-device promise. This per-surface split is a feature, not a limitation.

| Context type | Desktop app user | Browser / web user |
|---|---|---|
| Files | Read on-device; only governed, scrubbed text is used to plan; nothing stored on our servers | Uploaded, extracted and scrubbed on the server, then used to plan |
| Web links | Fetched through the governed path, scrubbed, used to plan; the person is told plainly that a link is read | Same |
| Knowledge base | Picked from the tenant brain, which already lives server-side and is scrubbed through the one chokepoint | Same |

The planner consumes the same governed text at the end regardless of surface, which is why both users get the sharper, context-aware plan. The private brain is already searched first at plan time on the server (the brain-first rule), so the knowledge-base pick is about scoping to a chosen space or document, not about turning the brain on.

## 5. Ungating

The documents step is Advanced and Premium only today, which contradicts "both users should benefit". Offer a light grounded version to all tiers (a small number of files or links, brain search as it already runs), and keep the heavier allowances (more documents, larger knowledge-base scope, more links) as the paid lever. Grounding is core value; a hard lock protects less than it costs.

## 6. Web links: reconsidered, prefer paste-text over URL fetch

Original idea: let the person paste a URL and we fetch it. On honest review this is the weakest part of the feature and is NOT recommended as first drafted:

- Low value where it is most wanted. The links a person most wants to give (internal wiki, Confluence, SharePoint, a ticket) are auth-walled, so a server-side fetch gets a login page, not the content. The links we can fetch (public documentation) are already covered by the model and the brain.
- High risk. Fetching arbitrary user URLs server-side opens SSRF (internal addresses, cloud metadata endpoints), and the fetched page is untrusted text entering the planning prompt, a prompt-injection path. The llm_guard helps but does not remove this.
- High complexity. JS-rendered pages, paywalls, rate limits, large pages, and egress governance per tenant all have to be handled.

Recommendation: do NOT build URL fetch. Instead let the person PASTE reference text directly. Pasting sidesteps SSRF, auth-walls, JS-rendered pages and fetch-time injection, still runs through the scrub chokepoint, and delivers most of the value. If a fetched-link capability is ever wanted, gate it behind an allowlist and the tenant egress policy and treat the content as untrusted, but that is a later, optional, carefully-scoped addition, not part of the MVP.

## 7. Desktop-path removal (SHIPPING IN THIS CHANGE)

The Desktop-app choice in step 1 used to ask App name plus a "Link or path" field whose example was a data-file path (`C:\Reports\Q3.xlsx`). That was removed in this change because:

- it confused the app's identity (which desktop app) with a data-file path;
- it was never real context: `appPath` had no server or planner consumer, it was only folded into the goal text as "at {path}" and shown back on the summary;
- it implied filesystem access the read-only screen guide does not use and should not claim;
- it added friction to the most common case, naming the app.

App name is kept; the screen does the rest. If a specific file matters, it belongs in the context step (files) or the "My own files" choice, not the app-identity question. The SaaS URL field is kept, since a real web address maps onto an "open this URL" step. Dead locale keys (`fPath`, `fPathPh`, `sumDesktopPath`) are left in place and unreferenced; they fall back gracefully and are not worth touching across fourteen locales.

## 8. Mid-task parity

The same three context types should be addable after a task starts, on both surfaces, through the existing mid-session context path, so a person can feed in material they realize they need once guiding is underway. Same governance as section 4.

## 9. Flow length

The start flow is already eight steps. The move is to fold, not add: the generalized step replaces the documents step (same slot), and the desktop-path removal takes a field out. Net effect is the same or fewer steps with more capability and less confusion.

## 10. Next-wave sequencing

All of today's agreed work, ordered as one upcoming wave:

1. Now, in this change: the desktop-path removal (safe, no server dependency), plus these two specs for review (`recommended-practices-spec.md`, this one).
2. Next wave, phase 1: Context grounding MVP, the generalized step with files and links for both surfaces, ungated light version, links through the governed fetch-and-scrub path. Knowledge-base pick follows once the scoping UI is drawn.
3. Next wave, phase 2: Recommended Practices MVP (see `recommended-practices-spec.md` phase 1), which uses this grounded context and the brain as its suggestion sources. Context grounding is a sensible prerequisite, since a better-grounded plan makes better-targeted suggestions.
4. Later phases: mid-task context parity (section 8); the Recommended Practices roadmap phases 2 to 6 (mid-journey suggestions, single-task tips for all tiers, retrospective capture, platform-brain practices, per-org learned ranking).

This keeps a single forward plan: ground the plan well first, then suggest improvements on top of it.

## 11. Open decisions for the owner

1. How many files and links are allowed at the free light tier before the paid lever applies.
2. Whether the knowledge-base pick ships in phase 1 or follows once the scoping UI is designed.
3. Whether pasted links are fetched immediately at plan time or only on the person's explicit confirm per link.
4. Whether mid-task context (section 8) is phase 1 or a fast follow.

## 12. Honesty and privacy framing

Files on desktop stay on the device; the person is told so. A link is read only when provided, and that is stated. The knowledge base is the tenant's own governed material. Nothing in this feature changes the read-only posture or sends a frame or a document anywhere the tenant's egress policy does not allow.
