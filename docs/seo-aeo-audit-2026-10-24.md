# WorkCoPilot - SEO / AEO audit (2026-10-24)

Audit of admireveda.com (WorkCoPilot) for search-engine and answer-engine
readiness, to plan submissions. Overall: **a strong foundation is already in
place.** The gaps are small and mostly about submission + a few additions.

## What is already good (keep)
- **Per-page meta**: index.html has title, a rich description, keywords, author,
  `robots: index,follow,max-image-preview:large,max-snippet:-1`, canonical. Inner
  pages set their own title/description/canonical via `src/useSeo.js`.
- **Social cards**: Open Graph + Twitter `summary_large_image`, og-image.png
  (1200x630) present.
- **Structured data (JSON-LD @graph)**: Organization + SoftwareApplication (with
  Lite/Basic/Advanced/Premium/Enterprise offers, prices now "on the pricing page"
  so they never drift) + **FAQPage** (4 Q&As). FAQPage + SoftwareApplication are
  exactly what answer engines (Google AI Overviews, ChatGPT, Perplexity) cite.
- **robots.txt**: allows the public site, disallows /api, /work, and the other app
  routes, and points to the sitemap.
- **sitemap.xml**: all public marketing + legal pages, with priorities.
- **Content is answer-friendly**: clear H1 per page, one H1 each, no image without
  alt, honest claims (tightened in the 2026-10-23 QA: no invented metrics,
  qualified redaction claims, pricing truth across pages).

## Fixed in this pass
- Added `/workcopilot/contact` and `/affiliate` to sitemap.xml (were missing).
  (Benchmark is intentionally NOT listed until it has a public run - an empty
  scoreboard should not be submitted.)

## Recommended before/for submission (prioritized)
1. **Submit to Google Search Console + Bing Webmaster Tools**: verify ownership
   (DNS TXT or the HTML meta/file), submit `https://admireveda.com/sitemap.xml`,
   and request indexing of the homepage + pricing + how-it-works + use-cases +
   fields + security + faq. This is the single highest-impact action.
2. **Validate structured data**: run the homepage through Google's Rich Results
   Test and schema.org validator; confirm Organization, SoftwareApplication and
   FAQPage parse with no errors (they should - JSON-LD is well-formed).
3. **AEO - add `HowTo` schema** to /workcopilot/how-it-works (the 3-step "how it
   works" is a natural HowTo), and **expand FAQPage** with more real questions
   (security/privacy, "does it ever click or type for me", "which fields",
   "data residency", "refund") - answer engines reward dense, direct Q&A.
3b. **AEO - add `/llms.txt`** (and keep content crawlable): a short plain-text
   summary of what WorkCoPilot is + key pages, for AI crawlers (emerging
   convention). Low effort, helps citation.
4. **Per-page uniqueness check**: confirm every sitemap URL sets a UNIQUE title +
   meta description via useSeo (Contact now does). Thin/duplicate titles hurt.
5. **theme-color** is `#070810` (dark) while the site renders light - set it to a
   light brand color for the mobile address-bar tint (cosmetic).
6. **OG image per page** (optional): a tailored og-image for pricing / security
   improves share CTR; the single default is fine to start.
7. **Performance / Core Web Vitals**: the main JS bundle is ~1.5MB (gzip ~400KB);
   consider route-level code-splitting later. Not blocking for indexing, but LCP
   on slow connections benefits.
8. **Backlinks + listings**: list WorkCoPilot on relevant directories (Product
   Hunt, AlternativeTo, SaaS directories) once ready - off-site signal for both
   SEO and AEO.

## AEO (answer-engine) summary
The site is well-positioned to be CITED by AI answer engines: factual,
specific, honest copy (post-QA), FAQPage + SoftwareApplication schema, clear
per-topic pages (security, fields, how-it-works, pricing). Biggest AEO wins are
#3/#3b above (HowTo schema, more FAQ, llms.txt) plus keeping claims honest
(done). Avoid marketing fluff and unbacked numbers (removed) - answer engines
down-rank and may refuse to cite pages with unverifiable claims.

## Submission checklist (for the owner)
- [ ] Google Search Console: add property, verify, submit sitemap, request index.
- [ ] Bing Webmaster Tools: same (also feeds ChatGPT search).
- [ ] Rich Results Test: validate Organization / SoftwareApplication / FAQPage.
- [ ] Add HowTo schema + expand FAQ + add /llms.txt (next content pass).
- [ ] Confirm unique title + description on every sitemap page.
- [ ] (Later) Product Hunt / directory listings for backlinks.
