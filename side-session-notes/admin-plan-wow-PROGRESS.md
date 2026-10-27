# feat-admin-plan-wow: progress (2026-10-27, Opus, no agents, low budget)

Branch: feat-admin-plan-wow (worktree D:\RadarOps\wt-admin). `git merge main` done (dfdeb10), conflict-free.

## Review of the WIP (3f1ae18): verified OK
- t.has exists (src/i18n/index.jsx:243); every new key referenced by the components exists in the en partials.
- APIs exist: workAdminApi.companyPool, api.workTeamPool; server admin users payload carries usedSeconds + freeLeftSeconds (server/work-admin.js:203-204); routes /api/work/admin/companies/:id/pool + /api/work/team/pool exist.
- All --wka-* tokens used by sections/_viz.jsx exist in workadmin.css.js.
- No em-dashes, no AI-tell words in the added lines.
- Earlier agent verified pricing save round-trips (200, record reflects values).

## Gate bug found + fixed (class fix, single source of truth)
scripts/check-locale-parity.mjs loaded en.js ALONE and never merged the en/*.js partials the runtime merges, so every partial namespace was invisible: 33k false "extra" lines, and a brand-new namespace (companyPlan) reported "OK" while missing from all 14 locales. Fix: new src/i18n/deep_merge_en.js (one deepMergeEn) imported by BOTH src/i18n/index.jsx (inline copy removed, behaviour identical) and the gate, which now merges every partial. Whole-catalog mode is now meaningful too.

## TRUE i18n debt for this branch (14 full locales: ar de es fr hi id it ja ko pt-BR ru tr vi zh)
Full list: side-session-notes/admin-plan-wow-i18n-gaps.txt (regenerate: node scripts/check-locale-parity.mjs <ns>).
- companyPlan: NEW namespace, 15 keys (pool.*, seats.meterAria, usedTodayCeiling, usage.ofLimit/ofPool). Locale files have no companyPlan block: add it as a new top-level key.
- pricingAdmin: 20 missing keys (record.monthEnd*, record.glance*, record.perMonthShort, edit.monthlyHours.*, edit.monthEnd.*) + 8 RETIRED keys to DELETE from every locale (edit.dailyHours.title/desc/hint, record.bonusTasks, record.bonusTasksValue_one/_other, edit.extraHour.bonusLabel/bonusHint).
- companiesAdmin: 12 missing (consumption.* 11 incl. group.admin/supervisor/member, people.ceilingHint).
- overviewAdmin: 2 missing (byTierTitle, byTierDesc) + 1 retired (usersFoot) to delete.
- usersAdmin: 3 missing (columns.usedToday, columns.planLeft, planLeftTitle) + 1 retired (columns.freeLeft) to delete.
- CHANGED-MEANING English (keys exist, parity cannot see; re-translate): helpSuper.overview.shot.alt, helpSuper.companies.expand.d, helpSuper.users.hours.d, helpSuper.users.shot.alt, helpSuper.pricing.lead, helpSuper.pricing.perTier.d, helpSuper.pricing.save.d, helpSuper.pricing.shot.alt; helpCompany.overview.cards.d, helpCompany.overview.shot.alt; superAdmin nav pricing.sub; companiesAdmin.enterprise noPool; pricingAdmin.record.desc, record.tierSummary, edit.monthly.desc, edit.dailyTasks.title/desc, edit.extraHour.desc, edit.noDailyTaskCap, edit.invalid; en.js companyAdmin.overview.aiSetKeys, companyAdmin.overview.peopleUsageHelp, companyAdmin.team.planHelp (confirm exact paths with grep).
Translation rule: native, professional, brand voice, no em-dashes, US-English source; tier codes never localized.

## Still to do on this branch (in order)
1. Translate the debt above into all 14 locales (atomic per locale: edit, `node --check`-style import test, commit each).
2. Fix: sections/CompanyPoolCard.jsx swallows a fetch ERROR silently (returns null) - distinguish "no pool set" (honest null) from "request failed" (ErrorBox + retry), per no-silent-fallback.
3. Gates: node scripts/check-jsx-imports.mjs; check-locale-integrity; check-locale-parity for each ns above; npm run build; npm run build:harden; check-public-assets; npm test (531 on main).
4. Render-verify at 1280 + 640, EN + DE, via admin-wow preview (--mode localapi) against api-seeded (seed recipe in HANDOFF-CONTINUE.md): superadmin Overview/Companies/Users/Pricing; company admin Overview/Usage & limits. Rule XIV: zero overflow/clipping.
5. Refresh in-app help screenshots (mandatory last step): public/help/super/overview.png, companies.png, users.png, pricing.png; public/help/company/overview.png (sizes in HelpSuper.jsx/HelpCompany.jsx `shots`).
6. Merge to main (no push), then feat-app-plan-wow, then feat-site-wow; publish all together.

## Translation tool (2026-10-27)
scripts/i18n-apply-patch.mjs <locale> <patch.json> [--dry] applies {set, delete} key patches to ONE locale file textually (EN sibling order, missing parents created, comments kept), re-imports to verify and ROLLS BACK on any mismatch. One patch per locale (keys listed above); dry-run first; commit each locale right after it verifies.

Tool update: inline one-line objects (`k: { a: 1, b: 2 },`) are supported for set/delete (help steps + section subtitles use them).

## STATUS 2026-10-27 (later): translations DONE, gates green
- All 14 locales applied with the tool and committed one per locale (de 9183bd4 ... zh 8079636). Patches kept in side-session-notes/i18n-patches/admin-plan-wow/.
- Gates on the branch: check-jsx-imports PASS (110 files), locale-integrity OK, parity(widgets) OK, build clean, check-public-assets PASS, npm test 531/531, build:harden ran.
- Whole-catalog parity (now truthful after the gate fix) = 265 missing + 467 extra across the 14 locales: PRE-EXISTING debt in other namespaces (home.* gaps owned by feat-site-wow, plus dead keys), NOT this branch; every namespace this branch touched is clean for every locale.
- Remaining here: (a) CompanyPoolCard silent-error fix, (b) render-verify 1280/640 EN+DE via admin-wow + api-seeded, (c) refresh help screenshots (super overview/companies/users/pricing, company overview), (d) merge to main (no push).
