// Role-aware how-to help for EVERY dashboard (src/pages/work/Help.jsx mounts it).
// One entry per surface: a line on what it is for, then numbered how-tos for
// the key actions, each illustrated with a real screenshot captured from the
// product (public/help/dashboards/*.webp, 1280px wide, lazy). Entries are
// gated by the viewer's role view (src/shared/work_roles_options.js roleViewOf),
// so a person only reads help for surfaces they can open. Existing surfaces
// (dashboard, start, projects, guiding, reports) reuse the shots under
// public/help/user/. Same voice as the rest of the guide: US spelling, no
// model or provider names, "it guides, you act".
import { Inbox, Briefcase, Users, ShieldCheck, UserCog, LayoutDashboard, Play, FolderKanban, Compass, FileText } from 'lucide-react'

// One screenshot with its caption (the figure recipe the guide already uses).
function Shot({ src, alt, caption, width = 1280, height }) {
  return (
    <figure className="wd-hf-fig">
      <img className="wd-hf-img" src={src} width={width} height={height} loading="lazy" decoding="async" alt={alt} />
      {caption && <figcaption className="wd-figcap">{caption}</figcaption>}
    </figure>
  )
}

// The catalog: id (section anchor), nav label, who sees it (a predicate on the
// role view), icon, and the body. Order = reading order on the page.
export const DASHBOARD_HELP = [
  {
    id: 'dash-home', t: 'Your dashboard', icon: LayoutDashboard, show: () => true,
    body: () => (<>
      <p>The dashboard is your home: your plan at a glance (hours this month, top-ups or your company pool, open tasks), the one thing to do next, and where you left off.</p>
      <Shot src="/help/dashboards/dashboard.webp" height={1150} alt="The dashboard: the workspace strip, the greeting, the My queue section with assigned tasks, the Start a task card and the plan meters." caption="The dashboard. Assigned work (My queue) comes first when a project manager can assign to you; the orange Start a task card is your own work." />
      <h3 className="sub">How to</h3>
      <ol className="wd-steps">
        <li><b>Read your plan.</b> The three tiles show hours left this month, any top-up or company pool, and your open task slots. The time chip at the top turns amber before you run low.</li>
        <li><b>Pick up where you left off.</b> Under <b>Resume where you left off</b>, press <b>Resume</b> on a task to reopen its guiding view at the step you were on.</li>
        <li><b>Add time.</b> Press <b>Add time</b> at the top to buy top-up hours (individuals) or ask your administrator (company users).</li>
      </ol>
    </>),
  },
  {
    id: 'dash-start', t: 'Start a task', icon: Play, show: (v) => v.canStart,
    body: () => (<>
      <p>Start a task turns a goal in your own words into guided steps on your screen. One stepper: where you work, documents, your goal, what it understood, depth, a few questions, then Begin guiding.</p>
      <Shot src="/help/user/start-task.png" width={912} height={584} alt="The Start a task box: a plan name, the goal, and the Start guiding me button." caption="Describe the outcome you want. Paste a ticket, a requirement or an error message as the goal." />
      <h3 className="sub">How to start a task</h3>
      <ol className="wd-steps">
        <li>Press <b>Start a task</b> in the rail (or the orange card on the dashboard).</li>
        <li>Say where you are working (a website, a desktop app, your own files), attach documents if you have them, and write the goal.</li>
        <li>Check <b>What I understood</b>, choose quick or detailed, answer the few questions, then press <b>Begin guiding</b>. Allow screen sharing of your whole screen so it can guide you in any app.</li>
      </ol>
    </>),
  },
  {
    id: 'dash-projects', t: 'Projects', icon: FolderKanban, show: (v) => v.canStart,
    body: () => (<>
      <p>A project is a large goal run as a map of tasks with a finish line. WorkCoPilot plans the map up front, guides each task on your screen in order, and carries what you learn in one task into the next.</p>
      <Shot src="/help/dashboards/projects.webp" height={900} alt="The Projects page: project cards with state, progress and what is up next, and the New project button." caption="Your projects. Each card shows its state, progress and the task that is up next." />
      <h3 className="sub">How to create a project with the planner</h3>
      <ol className="wd-steps">
        <li>Open <b>Projects</b> and press <b>New project</b>.</li>
        <li>Give it a name (optional) and describe the outcome, the systems involved and what done looks like. Press <b>Plan the project</b>.</li>
        <li>WorkCoPilot maps the tasks in order with a finish line and checks the plan. If the goal is really one workflow it says so and offers to start it as a single task instead.</li>
        <li>Open the project, press <b>Start</b> on the first task. A task unlocks when the tasks it waits for are done; <b>Add to this project</b> places new work where it belongs in the map.</li>
      </ol>
    </>),
  },
  {
    id: 'dash-guide', t: 'The guiding view', icon: Compass, show: () => true,
    body: () => (<>
      <p>The guiding view is where a task runs: one step at a time, rewritten for exactly what is on your screen, with the exact command or code copy-ready. It reads, you act; it never clicks or types for you.</p>
      <Shot src="/help/user/do-this-now.png" width={670} height={613} alt="The Now, do this card: the current step, the terminal command with Copy, and how to do it." caption="Now, do this: the current step with its exact command. Finished steps tick off as it sees them done." />
      <h3 className="sub">How to work through a task</h3>
      <ol className="wd-steps">
        <li>Follow <b>Now, do this</b>. When your screen changes, the next step appears on its own; a wrong move is called out and corrected.</li>
        <li>Stuck? Press <b>Ask</b> for a direct answer about what is on screen, <b>Deep pass</b> for a closer look at a hard step, or <b>Re-plan</b> to rebuild the steps from what is on screen now.</li>
        <li>Open <b>Tools</b> for Answer, Write and Compute, the full plan, text size and theme. <b>Float on top</b> keeps the guide over your work.</li>
        <li>Press <b>Pause</b> to freeze the clock while you step away; <b>Resume</b> when you are back. Mark the last step done to finish.</li>
      </ol>
    </>),
  },
  {
    id: 'dash-reports', t: 'Reports', icon: FileText, show: () => true,
    body: () => (<>
      <p>Every finished task becomes a clean record: what was achieved, every confirmed step with its exact commands, warnings, and your questions and answers, with scrubbed milestone screenshots as evidence.</p>
      <Shot src="/help/user/answer.png" width={684} height={968} alt="The Answer card: the result, a confidence meter, how it got there, how to verify it, and policy flags." caption="The Answer card in a task. The report collects the confirmed steps and outcomes of the whole task." />
      <h3 className="sub">How to get a report</h3>
      <ol className="wd-steps">
        <li>Open the task from <b>Completed tasks</b> or <b>Session logs</b>.</li>
        <li>Press <b>Download</b> and choose the <b>PDF report</b>, the plain <b>text report</b>, or the full <b>audit log</b>; <b>Print</b> gives a paper copy.</li>
        <li>Commands and code appear only for steps you actually completed, and every screenshot was redacted on your device before capture.</li>
      </ol>
    </>),
  },
  {
    id: 'dash-queue', t: 'My queue', icon: Inbox, show: (v) => v.showQueue,
    body: (v) => (<>
      <p>My queue lists the tasks a project manager assigned to you, in order: in progress first, then to do. {v.isWorker ? 'Your account does assigned tasks only, so there is no Start a task; the queue is your home.' : 'You can also start your own tasks; assigned work simply comes first.'}</p>
      <Shot src="/help/dashboards/queue.webp" height={620} alt="My queue: each assigned task with its project, state chip, when it was assigned, and a Start or Continue button." caption="My queue. Each row names the project, the state and when it was assigned. A task waiting more than five days shows a Waiting chip." />
      <h3 className="sub">How to run an assigned task</h3>
      <ol className="wd-steps">
        <li>Open <b>My queue</b> (or the queue section at the top of your dashboard).</li>
        <li>Press <b>Start</b> on a task. WorkCoPilot plans its steps just in time, grounded in what the project already learned, and opens the guiding view.</li>
        <li>Follow the steps on your screen as in any task. The project manager sees the task move to <b>In progress</b>, then <b>Completed</b> when you finish it.</li>
        <li>Press <b>Continue</b> to reopen a task you already started. <b>Show completed</b> lists what you finished.</li>
      </ol>
    </>),
  },
  {
    id: 'dash-pm', t: 'Projects I manage', icon: Briefcase, show: (v) => v.showPm,
    body: () => (<>
      <p>Projects I manage is the project manager's dashboard: every project you manage with its state (ongoing, on hold, complete), progress, and how much of it is assigned.</p>
      <Shot src="/help/dashboards/pm-dashboard.webp" height={880} alt="Projects I manage: status filters and project cards with progress, assigned, in progress and unassigned counts." caption="Projects I manage. Filter by status; each card shows progress and the assignment picture." />
      <h3 className="sub">How to create a project with the planner</h3>
      <ol className="wd-steps">
        <li>Press <b>New project</b>. Give it a name (optional) and describe the outcome, the systems involved and what done looks like.</li>
        <li>Press <b>Plan the project</b>. WorkCoPilot maps the tasks in order with a finish line and checks the plan; a goal that is really one task is sent back for a broader goal.</li>
        <li>The project opens with every task unassigned. Assign each task to a person (next section).</li>
      </ol>
      <Shot src="/help/dashboards/pm-new-project.webp" height={900} alt="The New project dialog: project name, the goal, and Plan the project." caption="New project: the goal is all the planner needs." />
    </>),
  },
  {
    id: 'dash-pm-project', t: 'A managed project', icon: Briefcase, show: (v) => v.showPm,
    body: () => (<>
      <p>A managed project shows the task map with each task's state and assignee, the counts (not started, in progress, completed), the project's activity log, and the manager's actions.</p>
      <Shot src="/help/dashboards/pm-project.webp" height={1250} alt="A managed project: status and manager chips, Hold project, the four count tiles, the task filters, and task rows with the assignee and the assign control." caption="A managed project. Each task row shows who is doing it and when it was assigned; the control on the right assigns or moves it." />
      <h3 className="sub">How to assign a task to a person</h3>
      <ol className="wd-steps">
        <li>Find the task in the map (filter by <b>Not started</b> to see unassigned work; the chip <b>2 unassigned</b> on the counts tile tells you how many).</li>
        <li>Pick the person in the row's <b>Pick a person</b> list. Only people on a worker or mixed flow are offered.</li>
        <li>Press <b>Assign</b>. The task appears in that person's queue right away, and the assignment is written to the control log with who and when.</li>
      </ol>
      <h3 className="sub">How to move a task from one person to another</h3>
      <ol className="wd-steps">
        <li>On a task that already has an assignee, pick the new person and press <b>Move</b>.</li>
        <li>The task keeps its progress and its guided session; it leaves the old person's queue and lands in the new one. The log records from whom to whom.</li>
      </ol>
      <h3 className="sub">How to hold and resume a project</h3>
      <ol className="wd-steps">
        <li>Press <b>Hold project</b>, write the reason (required) and confirm. The project is flagged On hold on every dashboard and in the risk register; people keep their tasks.</li>
        <li>Press <b>Resume project</b> when it can continue. Both actions are recorded.</li>
      </ol>
      <Shot src="/help/dashboards/pm-hold.webp" height={900} alt="The Hold project dialog with a required reason." caption="Hold project: a reason is required and kept in the control log." />
      <h3 className="sub">How to read a person's productivity</h3>
      <ol className="wd-steps">
        <li>Click an assignee's name on any task row.</li>
        <li>The panel shows their counts across every task assigned to them (assigned, not started, in progress, completed), guided time spent, and what they are working on right now.</li>
      </ol>
      <Shot src="/help/dashboards/pm-person.webp" height={900} alt="The productivity panel for one person: four count tiles, guided time, and the task they are working on." caption="Productivity for one person, from the tasks assigned to them." />
    </>),
  },
  {
    id: 'dash-srpm', t: 'Project managers', icon: Users, show: (v) => v.showSrPm,
    body: () => (<>
      <p>Project managers is the senior project manager's roll-up: every project manager, the projects they manage and how each is doing, the load per manager, and the people who can be assigned work.</p>
      <Shot src="/help/dashboards/srpm.webp" height={1200} alt="Project managers: status tiles, load per project manager bars, projects grouped by manager with a Move action, and the people list." caption="Project managers. Projects are grouped by the manager who owns them; Move hands one to another manager." />
      <h3 className="sub">How to move a whole project to another project manager</h3>
      <ol className="wd-steps">
        <li>Press <b>Move</b> on the project card (or <b>Move to another manager</b> inside the project).</li>
        <li>Pick the new project manager, write the reason (required) and press <b>Move project</b>.</li>
        <li>Only the managing project manager changes. Every task keeps its assignee and progress; the hand-over is in the control log.</li>
      </ol>
      <Shot src="/help/dashboards/srpm-move.webp" height={900} alt="The Move project dialog: the project, the new project manager list and a required reason." caption="Move project: pick the new manager, give the reason." />
      <h3 className="sub">How to start a project and hand it to a manager</h3>
      <ol className="wd-steps">
        <li>Press <b>New project</b>, describe the goal, and choose who manages it under <b>Managed by</b>.</li>
        <li>Press <b>Plan the project</b>. The project lands in that manager's Projects I manage, ready to assign.</li>
        <li>Open <b>Productivity</b> next to a manager or a person to see their counts and time.</li>
      </ol>
    </>),
  },
  {
    id: 'dash-grc', t: 'Oversight', icon: ShieldCheck, show: (v) => v.showGrc,
    body: (v) => (<>
      <p>Oversight is the read-only view of every project in the company: status, load per project manager, the computed risk register, and the full control log. {v.readOnly ? 'Your role sees everything and changes nothing; project managers act.' : ''}</p>
      <Shot src="/help/dashboards/grc.webp" height={1150} alt="Oversight: status tiles, the status share bar, load per project manager, and the risk register." caption="Oversight. The graphs read from the same data the project managers work in." />
      <h3 className="sub">How to read the risk register</h3>
      <p>Risks are computed from the data, never entered by hand, and sorted so the oldest waits come first. Each row names the project, the task, the manager and the suggested action.</p>
      <ul>
        <li><b>Waiting too long</b>: a task assigned more than five days ago that has not been started. Ask the manager to check in with the assignee or move the task.</li>
        <li><b>Ready, nobody assigned</b>: a task whose dependencies are done but nobody has it. Ask the manager to assign it.</li>
        <li><b>Project on hold</b>: a project a manager held, with the reason. Ask whether it can resume.</li>
      </ul>
      <Shot src="/help/dashboards/grc-risks.webp" width={1080} height={600} alt="The risk register: Waiting too long rows with the age in days, a Ready nobody assigned row, and a Project on hold row, each with a suggested action and an Open link." caption="The risk register. Open goes to the project; the project manager takes the action." />
      <h3 className="sub">How to read the control log</h3>
      <ol className="wd-steps">
        <li>Scroll to <b>Control log</b>. Every project created, task assigned or moved, project handed over, held or resumed is a row with when, what, by whom and the detail (from whom to whom, the reason).</li>
        <li>Filter by project with the <b>Project</b> list; <b>Show more</b> reveals older rows. The log is append-only.</li>
      </ol>
    </>),
  },
  {
    id: 'dash-admin', t: 'Flows and roles', icon: UserCog, show: (v) => v.isCompanyAdmin,
    body: () => (<>
      <p>In the company console, Team, you set two things per person: their <b>work flow</b> (how guided tasks reach them) and their <b>role</b> (what they manage). Changes take effect right away.</p>
      <Shot src="/help/dashboards/admin-team.webp" height={1250} alt="The company console Team page: the Add a person form with Role and Work flow selects, and the people table with a Role and a Flow select per row." caption="Team. Role and Work flow at create, and inline per person." />
      <h3 className="sub">How to set a person's flow and role</h3>
      <ol className="wd-steps">
        <li>Open the company console and press <b>Team</b>.</li>
        <li>For a new person press <b>Add person</b> and choose the <b>Role</b> and the <b>Work flow</b> before you add them. For an existing person, change the <b>Role</b> or <b>Flow</b> select in their row.</li>
        <li>Flows: <b>Independent</b> starts their own tasks and is never assigned to; <b>Worker</b> only does tasks a project manager assigns (no Start a task); <b>Mixed</b> does both.</li>
        <li>Roles: <b>Project manager</b> creates projects and assigns tasks; <b>Senior project manager</b> oversees every manager and can move projects between them; <b>GRC</b> has read-only oversight of all projects.</li>
      </ol>
    </>),
  },
]

// The entries the viewer may read, in order.
export function dashboardHelpFor(roleView) {
  const v = roleView || {}
  return DASHBOARD_HELP.filter((s) => { try { return !!s.show(v) } catch { return false } })
}

export default function DashboardsHelp({ roleView }) {
  const v = roleView || {}
  return (<>
    {dashboardHelpFor(v).map((s) => (
      <section key={s.id} id={'help-' + s.id}>
        <h2>{s.t}</h2>
        {s.body(v)}
      </section>
    ))}
  </>)
}
