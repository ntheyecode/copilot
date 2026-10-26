# WorkCoPilot - Feature Catalog

**2026-10-25 | COE Security LLC / AdmireVeda | WorkCoPilot (admireveda.com)**

This catalog lists the features built for WorkCoPilot, spanning internationalization, search visibility, privacy and legal compliance, the admin consoles, billing and finance, and the core product. Each entry records what the feature is, the problem it solved, the surface it ships on, and its status. All entries are Shipped unless noted otherwise.


| Feature | Category | What it is | What it solved | Surface | Status |
| --- | --- | --- | --- | --- | --- |
| Multilingual (16 languages) | i18n | The product and marketing site are available in 16 languages, including full Japanese, Chinese and Korean. | Non-English users understand the guidance; opens global markets. | Product + Site | Shipped |
| Location-based language auto-select | i18n | On first visit the language is chosen from the visitor's region using professional-language logic (e.g. India/US/UK -> English, Japan -> Japanese). | The right language appears automatically, respecting business-language norms, with no manual switching. | Site | Shipped |
| Script-aware heading rendering | i18n | Line-height/spacing fixes for Devanagari and CJK scripts. | Hindi/Chinese/Japanese/Korean headings are no longer clipped or cut off. | Site | Shipped |
| Location-aware SEO (hreflang + localized meta + multilingual sitemap + llms.txt) | SEO | Per-language URLs via ?lang, hreflang + x-default alternates, localized titles/descriptions, a 16-language sitemap, and an llms.txt. | Each language is discoverable and indexable by search engines and AI answer engines. | Site | Shipped |
| Cookie & privacy consent banner | Privacy/Legal | A GDPR/CCPA-style accept / reject / manage-preferences banner, localized, that gates non-essential cookies on-device until consent. | Lawful, user-controlled consent; privacy compliance for global visitors. | Site | Shipped |
| Global-standard legal pages | Privacy/Legal | Updated Privacy (GDPR/CCPA sections) plus new Cookie Policy, Subprocessors and Accessibility pages, all linked in the footer. | Meets global compliance expectations and transparency; nothing buried. | Site | Shipped |
| Admin console gold-standard UI | Admin | A consistent visual/UX system across every superadmin section (tables, toolbars, panels, states). | Removes the patchwork look; a coherent, professional admin experience. | Admin | Shipped |
| Company admin gold-standard UI | Admin | The same high-quality console treatment for company administrators. | Company admins get a first-class management experience. | Admin | Shipped |
| Subscribers tab | Admin/Billing | A single view of all paying subscribers with plan, status, MRR, lifetime value and activity. | Clear visibility into paying customers and their operations. | Admin | Shipped |
| Cancelled (churn) tab | Admin/Billing | A dedicated tab capturing cancelled/churned subscribers, with reason, date and lifetime revenue. | Churn visibility and retained-revenue tracking. | Admin | Shipped |
| Accounting dashboard | Billing | Revenue and MRR graphs (week/month/quarter/year), finance controls, manual-ledger CRUD, and cancellation controls. | Full finance operations inside the product, with charts and audit. | Admin | Shipped |
| Accounting role | Admin | A dedicated role that sees Finance, Subscribers and Cancelled only. | Delegate finance operations without granting full superadmin. | Admin | Shipped |
| Stripe end-to-end + transactional integrity | Billing | Verified Stripe lifecycle with persisted webhook replay-dedupe, correct status mapping, and exactly-once ledger recording. | Reliable, correct billing; no double-charges or double-grants on webhook replays. | Billing | Shipped |
| Owner subscription alerts | Billing | Email to the owners on every subscription event (new, plan change, cancellation, payment failure). | Owners are notified instantly of every subscription change. | Billing | Shipped |
| Self-serve upgrade / downgrade | Billing | Customers change plans themselves: upgrades apply immediately with prorated credit, downgrades take effect at the next renewal. | Customers manage their own plan; proration follows financial best practice. | Product + Billing | Shipped |
| Self-serve cancel + Customer Portal | Billing | Cancel anytime and update the payment method through the Stripe Customer Portal. | Self-service account management; less support load. | Product + Billing | Shipped |
| Monthly invoices in the dashboard | Billing | An invoice list in the user dashboard with hosted-invoice and PDF links. | Customers get their receipts and invoices on demand. | Product | Shipped |
| Finance timeseries + manual ledger CRUD | Billing | Revenue/MRR timeseries endpoints and manual adjustments with immutable posted amounts, void-with-audit, and Stripe-sourced protection. | Accountants can make adjustments safely with a full audit trail. | Admin | Shipped |
| Company screenshot-capture policy | Admin/Product | A company-admin toggle controlling whether reports/logs capture screenshots for that company's users. | Company-level control over screen-capture data egress. | Admin + Product | In progress (this release) |
| Single-session login | Product | One active signed-in location per user at a time. | Prevents credential sharing and concurrent logins. | Product | Shipped |
| Pre-task interactive coach + guide-window UX | Product | An interactive pre-task coach and refined live guide window (pinned header, analyzing state, reading strip, pause). | Better onboarding and clearer live guidance. | Product | Shipped |
| Reports: completed-only code, redacted screenshots, export formats | Product | Reports include only code for completed steps, 2-5 redacted screenshots, and PDF/text/.log export. | Accurate logs, privacy-preserving evidence, and portable records. | Product | Shipped |
