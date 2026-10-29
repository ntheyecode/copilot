# WorkCoPilot - User Guide

Version: 2026-10-28. Audience: everyone who uses WorkCoPilot - members, project managers, senior project managers, GRC, company admins, executives, and platform operators. US spelling.
Companion: [PRODUCT-DOCUMENTATION.md](PRODUCT-DOCUMENTATION.md) (what the product is and every feature) and the product presentation.

---

## 1. Getting started

### 1.1 Sign in
- **Web:** go to admireveda.com/work and sign in. **Desktop/Android:** open the app and sign in.
- **First sign-in sets up multi-factor authentication (MFA).** You scan a one-time code into an authenticator app; after that, every sign-in asks for the 6-digit code. (Your company admin can reset it if you lose your device.)
- **Company sign-in (SSO):** if your company connected its identity provider, use the company sign-in button. The public Google / Microsoft / Facebook buttons are separate social sign-in.

### 1.2 Pick your language
On first sign-in you choose your language. It drives both the app and the emails you receive, and you can change it any time from the language menu. Fourteen languages are fully translated, plus English (US) and British English.

### 1.3 Make it yours (theme and accessibility)
Open Preferences to set:
- **Theme:** Light, Dark, or Heavy. Your choice applies immediately and follows you across your devices.
- **Brand accent:** pick from the suggested, contrast-tested color combinations.
- **Accessibility:** larger text, reduced motion, high contrast, bigger tap targets, and a more readable font.

---

## 2. Run a guided task (the core flow)

This is what most people do most of the time.

1. **Start a task.** Click "Start a task" and say what you want to accomplish, in plain words. A short readiness coach helps you sharpen the goal before you begin. *(Worker-flow users do not start tasks - see 3.1 - they work from a queue.)*
2. **Bring context (optional).** Attach reference documents, paste in text, or pick a company **knowledge space** to ground the guidance. On desktop your files stay on your device; on the web they are scrubbed before processing.
3. **Review the plan.** You get a short, ordered plan - a few beats, not a wall of steps. The plan is locked to your goal.
4. **Answer any clarifying questions.** If your goal was ambiguous, WorkCoPilot asks first instead of guessing.
5. **Work the steps.** For each step it tells you what to do, then **watches your screen** to confirm you did it before moving on. Do the action yourself in your own app - WorkCoPilot never clicks or types for you.
6. **Ask whenever you want.** Use the Ask box to say "what am I looking at?" or "what do I do here?" - the answer is grounded in what is on your screen right now.
7. **Let it adapt.** If your screen is not what the step expected, it adjusts.
8. **Verify a step on your screen (optional).** Use "Verify on my screen" if you want it to confirm a step is really done.
9. **Finish.** When the task is complete you get:
   - an **outcome** summary (it reports honestly - "5 of 6 steps done" if a step was not reached, never an overclaim),
   - a **report** (PDF or text) with the confirmed steps, how-to detail, and scrubbed milestone screenshots,
   - an **audit log**, and
   - optionally a **compliance report** mapping the task to frameworks, with an authenticity seal you can verify.

**Good to know:** you can pause and resume; you can upload more context mid-task and it re-plans only if the path actually changed; and you can run several tasks in progress at once (open-task slots).

### 2.1 Second monitor and the floater
- Open the **full-screen guide** on your non-working monitor so the steps sit beside your work.
- The **floater / buddy** is a small always-visible card with the current step. Both follow your app theme preference.

---

## 3. By role - what your day looks like

### 3.1 Member
- **Independent flow:** start your own tasks (section 2) and see your history, completed tasks, and logs.
- **Worker flow:** you do not see "Start a task." Open **My queue** to see the tasks assigned to you, ordered so the next actionable one is first. Open one and it expands into steps just for you; run it like any guided task; finishing it reports back to your manager.
- **Mixed flow:** both of the above.

### 3.2 Project manager (PM)
From the **PM dashboard** ("Projects I manage"):
- **Create a project:** state the goal; WorkCoPilot plans the task map (through the same quality gate as any project).
- **Assign tasks** to people on worker/mixed flow; **reassign** a task to someone else at any time.
- **See status:** which tasks are done, in progress, or not started, and who is doing each.
- **Hold / resume** a project with a reason.
- **Templates:** open **Templates** to create a reusable procedure, assign it to many people at once, and watch the per-person **rollup**.
- **Productivity:** pull a productivity report for people assigned to projects you manage.

### 3.3 Senior project manager (Sr PM)
From the **Sr PM dashboard** ("Project managers"):
- See **which projects each PM manages**, with load bars by manager.
- **Start a task and assign a PM**; **reassign whole projects** from one PM to another ("Move").
- Pull productivity across the company.

### 3.4 GRC (governance, risk, compliance)
From the **GRC dashboard** ("Oversight", read-only):
- Company-wide **status** - completed, ongoing, held - with graphs.
- A **risk register** that flags tasks waiting longer than the SLA (default 5 days since assignment), ordered by severity, each with the age, task, project, manager, and reason.
- You can read projects and the activity log but cannot create, assign, or change work - oversight only.

### 3.5 Company admin
From the **Company admin console** (18 sections):
- **Team:** add people; set each person's **role** and **work flow**; set their plan; remove them; reset MFA; allocate minutes.
- **Company SSO:** connect your identity provider.
- **AI keys:** run on your own AI provider account, or use platform-managed keys.
- **Data governance:** author on-device scrub/DLP rules; pull member reports.
- **Company Brain & Knowledge spaces:** enable/disable the shared brain; create, rename, and remove named knowledge spaces; move learnings between them (removing a space returns its learnings to "ungrouped", nothing is lost).
- **Encryption & export, Alerts, SOC/SIEM, Sessions, Billing, Activity, Settings, Support, Help**, and **Enterprise deployment (MSI)** - download the per-machine installer for IT roll-out.

### 3.6 Executive
Open the **Executive dashboard** for a read-only view of effectiveness, tasks completed/in-progress, and hypothetical time and cost saved (never AI cost). Export to PDF/JPG/CSV. White-label branding is supported.

### 3.7 Superadmin (platform operator)
The superadmin console manages all tenants: companies, users, pricing, AI configuration (with visible model discovery and pinning), hero/content, finance, leads, and support. Model names and AI cost are visible only here.

---

## 4. Guidance Projects, practices, and the company brain

- **Projects (Depth-2):** for bigger work, organize as Customer > Project > Task > Step. The project map is drawn up front; each task's steps are generated when you reach it, grounded in what earlier tasks learned; you can inject a new task mid-project without breaking the plan.
- **Recommended practices:** on a project, WorkCoPilot suggests proven best practices for that kind of work. Click "Add to the map" to rope one in (it becomes a real task), or dismiss it. Suggestions get smarter over time from what your company actually accepts and completes.
- **Knowledge spaces:** when you start a task, you can scope the guidance to a knowledge space (for example "Security" or "Onboarding") so the advice draws on the right proven workflows.

---

## 5. Apps and deployment

- **Desktop (Windows):** signed installer. IT teams can deploy the **per-machine MSI** silently via GPO, SCCM, or Intune (the download is in the company admin console). On-device OCR reads images and diagrams locally, offline.
- **Android:** install the app from your provided link; it runs on any device.
- **Web:** admireveda.com/work, nothing to install.
- Because the guide UI is served from the web, you get UI improvements without reinstalling the app.

---

## 6. Privacy and trust (what to tell your security team)

- WorkCoPilot is **read-only** - it never clicks, types, or acts for you.
- Sensitive content in images is **read and masked on-device**; on the web it is scrubbed before processing.
- Sign-in requires **MFA**; stored secrets are **encrypted**; your data is **isolated** to your company.
- Reports carry an **authenticity seal** you can verify, and every destructive admin action is logged with who/what/when/why.
- WorkCoPilot does not generate documents or perform outward actions for you - it hands you a result or a prompt, and you take the action.

---

## 7. Troubleshooting and FAQ

- **"It is not reading my screen."** The occasional unreadable frame is normal; it recovers on the next read. If a share was declined, re-enable screen sharing.
- **"My plan looks wrong."** Use Ask to clarify, or add context and let it re-plan. The goal itself stays locked; re-planning is bounded.
- **"I am a worker and cannot start a task."** That is by design for the worker flow - open **My queue** for your assigned work, or ask your admin to set you to mixed flow.
- **"A step says I did not finish."** The report is honest: if a step was not reached it says "N of M done" rather than claiming all done.
- **"I lost my MFA device."** Ask your company admin to reset your MFA.
- **"I want the app in my language."** Change it in the language menu; 14 languages plus English and British English are available.
- **"Can I change the theme?"** Yes - Light, Dark, or Heavy in Preferences, applied live and remembered across your devices.

---

## 8. Quick reference - where things live

| I want to... | Go to |
|---|---|
| Start a guided task | Start a task (Dashboard) |
| See my assigned work (worker) | My queue |
| See my history / reports | Completed, Logs |
| Manage a project / assign tasks | PM dashboard |
| Roll out a procedure to many | Templates (create > assign > rollup) |
| See all PMs and move projects | Sr PM dashboard |
| Oversee status and risk | GRC dashboard |
| Add people, set roles/flows, SSO, AI keys | Company admin console |
| See effectiveness and savings | Executive dashboard |
| Change language / theme / accessibility | Preferences / language menu |
| Deploy to the company (MSI) | Company admin console > Enterprise deployment |
