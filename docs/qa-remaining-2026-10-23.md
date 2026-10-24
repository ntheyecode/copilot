# WorkCoPilot QA - remaining findings (2026-10-23)

From the 3-agent QA sweep (marketing site, dashboards/product, logic+claims).
Brand decision by owner: **keep green/blue emphasis + orange CTA** - so every
"retoken to orange" finding is INTENTIONALLY NOT ACTIONED.

## FIXED this round
- Enterprise section rebuilt to the site pattern (centered header + card grid,
  green/blue palette); honesty (SSO via OIDC not SAML, DPA + contact, on-prem on
  request; dropped SLA/self-hosted/SAML claims).
- Lite card grammar ("1 hour / 1 task"); tier daily hours now read live from
  price.dailyHours.
- Affiliate landing redesigned to the site system + real hero image; contrast +
  whitespace fixed; rate renders.
- Affiliate commission VOID-ON-REFUND (revenue leak + unbacked claim) - done.
- Business-claims traceability: superadmin MFA-gated Claims console + signed
  Markdown export; docs/business-claims-audit.json (34 claims).
- Banner ServiceNow/Salesforce demos; diff copy buttons + accurate badges.
- Propagation (earlier): dailyHours live; disable blocks service unconditionally.

## HIGH - still to do
- **Pricing truth across pages** (drift): add Lite to /workcopilot/pricing +
  matrix (5 cols); derive hours/tasks/overage from /api/work/pricing in
  WorkPricing, WorkFaq, index.html JSON-LD; fix wrong offline fallbacks
  (WorkPricing 199/399/499, WorkFaq 99/299/399 -> store defaults). Today homepage
  shows "up to 2 tasks" (live) while pricing page says "up to 4"; overage shows
  both "$10/hr flat" and the correct per-tier $25/20/15/10 on the same page.
- **Plan price display vs Stripe charge split**: pricing.plans (shown) is not what
  Stripe charges (Price IDs). Validate at save-time that each Stripe price == the
  displayed plan price, or drive checkout from price_data. (store.js:2549 vs
  billing.js:419/68)
- **Roadmap/diagram gate is client-side only**: Lite/Basic can get roadmap data via
  a direct API call (work.js plan path). Gate server-side via store.tierAllows -
  BUT carefully: Lite still needs the step list for guidance; only the full
  roadmap/diagram view is the paid feature. Analyze before gating (SUPREME RULE VI).
- **WorkPage.jsx buyCredits** (dashboard): calls undefined setErr -> ReferenceError
  on checkout failure; also window.prompt + Number||0 can send 0 to Stripe. Add a
  proper quantity/price modal + error state.
- **Refund / cancel-subscription without a reason**: Users.jsx:156,170 and
  Finance.jsx:30 use window.confirm only; the standing destructive-logging rule
  wants a reason via the shared ReasonModal. Also AiConfig key wipes + company AI
  key removal are one-click no-confirm.
- **Plain admin sees superadmin data**: WorkAdmin shows Sessions (cost, premium/
  round-robin counts), Incidents (provider/model), AI config, Finance to a plain
  `admin`. Filter visibleSections to superadmin for ai/finance/incidents and hide
  cost/model columns (business rule: model + cost = superadmin only).
- **Homepage unbacked metrics** (+70% faster / -50% outsourcing): invented numbers;
  owner's own "no invented metrics" rule. Make qualitative OR provide a measured
  source. (100% read-only / documented are true properties - keep or reword.)
- **On-device redaction claims** stated unconditionally but gated by isDlpActive();
  qualify "when data protection is on". Browser doc upload extracts text
  server-side (desktop app keeps it local) - add the "(desktop app)" qualifier.

## MED - to do
- Three ReasonModal copies (_shared + Companies + WorkCompanyAdmin) and 6+ hardcoded
  tier lists -> consolidate (SUPREME RULE II). Friendly-error mapper so raw
  err.message / model names never reach end users (systemic across WorkPage,
  WorkExec, LiveValidate, AffiliatePage, _shared ErrorBox).
- Homepage mobile nav missing (<900px no burger); swap wm-nav for SiteHeader.
- Image daily cap (5) + TIER_FEATURES {roadmaps,diagrams,documents} hardcoded ->
  move to pricing/config (same class as dailyHours); work-docs ALLOWED_TIERS ->
  store.tierAllows. MFA step-up missing on payouts + secret writes.
- Roadmap entitlement story inconsistent across 3 pages (Lite). Company admin
  applyPreset can't deselect a framework (mirror Governance toggle). Metering
  fail-open should log an incident.
- Contact page: labels without htmlFor/id/autocomplete; no useSeo; uses a custom
  header not SiteHeader. Sign-up has no Terms/Privacy consent line.
- Use cases footer uses wrong legal entity ("AdmireVeda" vs "COE Security LLC ...").
- Demo card truncation (nowrap ellipsis) clips long how-steps; .wm-demo-stage
  overflows its fixed 120px.

## LOW - cleanup
- Many mailto: "Support" -> /workcopilot/contact; shared footer with legal links;
  one body font site-wide; Benchmark unlinked until it has data; validate-live FAB
  overlaps CTAs; WorkExec RankBars tooltip offset; various undefined CSS vars
  (--wka-border, --chip, .wka-record, .spin); stale comments/copy ("mail servers
  configured", "v1.0.5", "genius pair", "no retention timer yet").

## NEXT (owner-queued)
- SEO / AEO audit for submissions (the final step after QA + fixes).
