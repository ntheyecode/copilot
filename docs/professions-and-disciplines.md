# WorkCoPilot - Professions & Disciplines Covered

Last updated: 2026-10-23 (roster expanded from 56 to 156 fields).

WorkCoPilot guides work across **156 professional fields** in 10 families,
spanning engineering, security, data, finance, operations, healthcare,
education, the trades of business, and the creative and communication fields.
Guidance for each is grounded in that field's canonical methodology, so the
steps read like an expert in that profession wrote them - not generic advice.

## Where this lives in the product

- **Renderer roster (single source of truth for the public page and counts):**
  `FIELD_FAMILIES` in `src/pages/WorkFields.jsx`. `FIELD_TOTAL` is computed from
  it, so the marketing page, the FAQ and the prerender script never drift.
- **Methodology grounding:** `server/method_anchors.js` - one `{key, re, text}`
  entry per discipline or tight group of disciplines (138 anchors). The matcher
  is most-specific-first (first regex that matches wins); the matched anchor is
  injected into planning, Ask, Research and How-to. Several fields share one
  anchor (for example registered nursing, nurse practitioner and physician
  practice share the clinical-care anchor). Adding a discipline is one entry.
- Capability audit: `docs/workcopilot-profession-capability-audit.md`.
- The executive dashboard also buckets completed work into coarse task TYPES
  (Software & development, Data & databases, Cloud & infrastructure, Security &
  compliance, Finance & accounting, Documents & writing, Marketing & growth,
  Other) for the productivity view - a lighter grouping than the 156 below.

## The 156 fields, by family

**Software & engineering (21)**
developer · frontend & accessibility · mobile development · game development ·
embedded / firmware · database · SDET · QA · DevOps · SRE · network engineering ·
sysadmin / IT ops · blockchain development · backend & API development ·
full-stack web development · software architecture · cloud architecture ·
platform engineering · release management · ERP & CRM administration ·
low-code & RPA automation

**Security & resilience (17)**
penetration testing · network pentest · mobile pentest · API security ·
cloud security · DevSecOps · threat modeling · incident response ·
compliance & GRC · application security · security operations (SOC) ·
vulnerability management · identity & access management · digital forensics ·
privacy & data protection · security architecture · business continuity &
disaster recovery

**Data, AI & math (14)**
data engineering · data analytics · MLOps · applied math · research & science ·
quant / FP&A · data science · machine learning engineering · AI & prompt
engineering · analytics engineering · business intelligence · data governance ·
statistics & biostatistics · geospatial & GIS analysis

**Product, project & design (13)**
product management · project management · agile / scrum · business analysis ·
UX design · program management · technical program management · PMO &
portfolio management · change management · user research · UI & visual design ·
design systems · product analytics

**OT, IoT & physical systems (13)**
OT / ICS · IoT · robotics · aviation operations · mechanical engineering ·
electrical engineering · civil & structural engineering · construction
management · CAD & BIM design · manufacturing & quality engineering · energy &
utilities operations · facilities & building systems · environmental health &
safety

**Finance & legal (13)**
accounting & finance · financial audit · tax · legal & contracts · accounts
payable & receivable · payroll · treasury & cash management · cost & management
accounting · credit & risk analysis · banking operations & AML · insurance
underwriting & claims · paralegal & legal research · intellectual property

**Business operations (17)**
sales · HR & recruiting · customer support · procurement & vendor · supply chain
& operations · leadership · account management · customer success · sales
operations & RevOps · office & executive administration · event planning · real
estate & property management · retail & store operations · hospitality &
restaurant management · logistics & transportation · nonprofit & fundraising ·
government & public administration

**Content, marketing & communication (17)**
marketing & growth · content & copywriting · SEO · social media · video & media ·
technical writing · translation & localization · graphic & brand design · brand
strategy · public relations & communications · journalism & editing · email &
lifecycle marketing · paid media & advertising · product marketing · market
research · audio & podcast production · grant & proposal writing

**Healthcare (16)**
healthcare / clinical · physician practice · registered nursing · nurse
practitioner · pharmacy · physical & occupational therapy · radiology & imaging ·
medical laboratory science · medical coding & billing · clinical research
coordination · health information management · dental hygiene & practice ·
paramedic & EMS · dietetics & nutrition · behavioral health & counseling ·
public health

**Education (15)**
teaching & instructional design · K-12 teaching · university teaching &
lecturing · school administration · academic advising · registrar & student
records · curriculum development · special education · librarian & information
science · admissions & enrollment · e-learning development · corporate training
& L&D · early childhood education · language teaching (ESL) · school counseling

## How the new fields are grounded

Each family has at least one methodology anchor, and the larger families have
several, grouped sensibly. Healthcare anchors are workflow and documentation
support only (no diagnosis or treatment guidance); legal, tax, real estate and
EHS anchors are process support and defer to a licensed professional.

| Family | Anchors added (key) |
|---|---|
| Software | software_architecture, backend_api_development, platform_engineering, cloud_architecture, release_management, erp_crm_administration, low_code_rpa |
| Security | appsec, security_architecture, vuln_management, iam, privacy_data_protection, soc_operations, digital_forensics, bcp_dr |
| Data, AI & math | prompt_engineering, data_governance, statistics_biostat, geospatial_gis |
| Product & design | program_portfolio_management, change_management, user_research |
| Physical systems | civil_structural_construction, mechanical_engineering, electrical_engineering, energy_utilities, facilities_building_systems, manufacturing_quality, ehs_safety |
| Finance & legal | payroll, accounts_payable_receivable, treasury_cash, cost_management_accounting, credit_risk, banking_aml, insurance_underwriting_claims, paralegal_legal_research, intellectual_property |
| Business ops | account_management_cs, revenue_operations, public_sector, nonprofit_fundraising, event_planning, office_executive_admin, retail_operations, hospitality_restaurant, logistics_transportation, real_estate_property |
| Content & comms | brand_strategy, graphic_brand_design, public_relations, journalism_editing, email_lifecycle_marketing, paid_media, product_marketing, market_research |
| Healthcare | medical_coding_billing, behavioral_health, pharmacy, medical_laboratory, radiology_imaging, clinical_research, paramedic_ems, dental_practice, dietetics_nutrition, public_health, health_information_management, therapy_rehab, nursing_clinical_care (the existing healthcare_clinical stays as the general fallback) |
| Education | elearning_development, corporate_training_ld, early_childhood, language_teaching, school_counseling, special_education, admissions_enrollment, academic_advising_registrar, school_administration, higher_ed_instruction, curriculum_development, k12_classroom, librarian_information_science |

Fields without a dedicated anchor map to the closest existing one (for example
data science and machine learning engineering to the MLOps anchor, full-stack web
development to the frontend and backend anchors, warehouse work to supply chain,
podcast production to video & media).

Ordering rule: the new domain-specialty anchors use deliberately tight keyword
sets and sit ahead of the broad engineering anchors (so "curriculum development"
is not swallowed by the generic `developer` match); the physical-engineering and
software specialties sit just before `developer`; security specialties sit next
to their general security neighbors. A regression sweep of every alternation in
the original 56 anchors confirmed no previously-routed phrase changed except the
intended refinements (medical coding, usability testing and user research, paid
search).

## How guidance stays expert-grade

Every plan a user runs is matched to the closest discipline and grounded in that
field's methodology, so a pentest plan follows recon -> auth -> exploit ->
escalate, a tax plan follows the right filing method, an incident-response plan
follows detect -> contain -> eradicate -> recover, and so on. When no specific
discipline matches, guidance falls back to a sound general method rather than
guessing.

This catalog is part of what WorkCoPilot sells: one tool that is credible in any
professional's hands, not a generic assistant. Keep it in sync with
`FIELD_FAMILIES` in `src/pages/WorkFields.jsx` and `server/method_anchors.js`
whenever a discipline is added or renamed.
