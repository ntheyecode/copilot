# WorkCoPilot - Professions & Disciplines Covered

Last updated: 2026-10-23.

WorkCoPilot guides work across **56 professional disciplines**, spanning
engineering, security, data, finance, operations, healthcare, the trades of
business, and the creative and communication fields. Guidance for each is
grounded in that field's canonical methodology, so the steps read like an expert
in that profession wrote them - not generic advice.

## Where this lives in the product

- **Single source of truth:** `server/method_anchors.js` - one `{key, re, text}`
  entry per discipline. The matcher is most-specific-first; the matched
  discipline's methodology anchor is injected into planning, Ask, Research and
  How-to. Adding a discipline is one entry.
- Capability audit: `docs/workcopilot-profession-capability-audit.md`.
- The executive dashboard also buckets completed work into coarse task TYPES
  (Software & development, Data & databases, Cloud & infrastructure, Security &
  compliance, Finance & accounting, Documents & writing, Marketing & growth,
  Other) for the productivity view - a lighter grouping than the 56 below.

## The 56 disciplines, by family

**Software & engineering (13)**
developer · frontend & accessibility · mobile development · game development ·
embedded / firmware · database · SDET · QA · DevOps · SRE · network engineering ·
sysadmin / IT ops · blockchain development

**Security & resilience (9)**
penetration testing · network pentest · mobile pentest · API security ·
cloud security · DevSecOps · threat modeling · incident response ·
compliance & GRC

**Data, AI & math (6)**
data engineering · data analytics · MLOps · applied math · research & science ·
quant / FP&A

**Product, project & design (5)**
product management · project management · agile / scrum · business analysis ·
UX design

**OT, IoT & physical systems (4)**
OT / ICS · IoT · robotics · aviation operations

**Finance & legal (4)**
accounting & finance · financial audit · tax · legal & contracts

**Business operations (6)**
sales · HR & recruiting · customer support · procurement & vendor ·
supply chain & operations · leadership

**Healthcare (1)**
healthcare / clinical

**Content, marketing & communication (7)**
marketing & growth · content & copywriting · SEO · social media · video & media ·
technical writing · translation & localization

**Education (1)**
teaching & instructional design

## How guidance stays expert-grade

Every plan a user runs is matched to the closest discipline and grounded in that
field's methodology, so a pentest plan follows recon -> auth -> exploit ->
escalate, a tax plan follows the right filing method, an incident-response plan
follows detect -> contain -> eradicate -> recover, and so on. When no specific
discipline matches, guidance falls back to a sound general method rather than
guessing.

This catalog is part of what WorkCoPilot sells: one tool that is credible in any
professional's hands, not a generic assistant. Keep it in sync with
`server/method_anchors.js` whenever a discipline is added or renamed.
