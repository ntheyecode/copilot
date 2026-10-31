// English strings for the per-dashboard how-to help (src/pages/work/help/
// DashboardsHelp.jsx), one block per surface, keyed under `dashboardsHelp`.
// Each block: the nav/section title, the lead paragraph, the screenshot alt +
// caption (image paths stay in the JSX), the how-to heading(s) and the numbered
// steps as arrays (lists translate as units; inline <b> is rendered by
// renderRich). US spelling, no model or provider names, "it guides, you act".
export default {
  dashboardsHelp: {
    home: {
      title: 'Your dashboard',
      lead: 'The dashboard is your home: your plan at a glance (hours this month, top-ups or your company pool, open tasks), the one thing to do next, and where you left off.',
      shot: {
        alt: 'The dashboard: the workspace strip, the greeting, the My queue section with assigned tasks, the Start a task card and the plan meters.',
        caption: 'The dashboard. Assigned work (My queue) comes first when a project manager can assign to you; the orange Start a task card is your own work.',
      },
      howTo: 'How to',
      steps: [
        '<b>Read your plan.</b> The three tiles show hours left this month, any top-up or company pool, and your open task slots. The time chip at the top turns amber before you run low.',
        '<b>Pick up where you left off.</b> Under <b>Resume where you left off</b>, press <b>Resume</b> on a task to reopen its guiding view at the step you were on.',
        '<b>Add time.</b> Press <b>Add time</b> at the top to buy top-up hours (individuals) or ask your administrator (company users).',
      ],
    },
    start: {
      title: 'Start a task',
      lead: 'Start a task turns a goal in your own words into guided steps on your screen. One stepper: where you work, documents, your goal, what it understood, depth, a few questions, then Begin guiding.',
      shot: {
        alt: 'The Start a task box: a plan name, the goal, and the Start guiding me button.',
        caption: 'Describe the outcome you want. Paste a ticket, a requirement or an error message as the goal.',
      },
      howTo: 'How to start a task',
      steps: [
        'Press <b>Start a task</b> in the rail (or the orange card on the dashboard).',
        'Say where you are working (a website, a desktop app, your own files), attach documents if you have them, and write the goal.',
        'Check <b>What I understood</b>, choose quick or detailed, answer the few questions, then press <b>Begin guiding</b>. Allow screen sharing of your whole screen so it can guide you in any app.',
      ],
    },
    projects: {
      title: 'Projects',
      lead: 'A project is a large goal run as a map of tasks with a finish line. WorkCoPilot plans the map up front, guides each task on your screen in order, and carries what you learn in one task into the next.',
      shot: {
        alt: 'The Projects page: project cards with state, progress and what is up next, and the New project button.',
        caption: 'Your projects. Each card shows its state, progress and the task that is up next.',
      },
      howTo: 'How to create a project with the planner',
      steps: [
        'Open <b>Projects</b> and press <b>New project</b>.',
        'Give it a name (optional) and describe the outcome, the systems involved and what done looks like. Press <b>Plan the project</b>.',
        'WorkCoPilot maps the tasks in order with a finish line and checks the plan. If the goal is really one workflow it says so and offers to start it as a single task instead.',
        'Open the project, press <b>Start</b> on the first task. A task unlocks when the tasks it waits for are done; <b>Add to this project</b> places new work where it belongs in the map.',
      ],
    },
    guide: {
      title: 'The guiding view',
      lead: 'The guiding view is where a task runs: one step at a time, rewritten for exactly what is on your screen, with the exact command or code copy-ready. It reads, you act; it never clicks or types for you.',
      shot: {
        alt: 'The Now, do this card: the current step, the terminal command with Copy, and how to do it.',
        caption: 'Now, do this: the current step with its exact command. Finished steps tick off as it sees them done.',
      },
      howTo: 'How to work through a task',
      steps: [
        'Follow <b>Now, do this</b>. When your screen changes, the next step appears on its own; a wrong move is called out and corrected.',
        'Stuck? Press <b>Ask</b> for a direct answer about what is on screen, <b>Deep pass</b> for a closer look at a hard step, or <b>Re-plan</b> to rebuild the steps from what is on screen now.',
        'Open <b>Tools</b> for Answer, Write and Compute, the full plan, text size and theme. <b>Float on top</b> keeps the guide over your work.',
        'Press <b>Pause</b> to freeze the clock while you step away; <b>Resume</b> when you are back. Mark the last step done to finish.',
      ],
    },
    reports: {
      title: 'Reports',
      lead: 'Every finished task becomes a clean record: what was achieved, every confirmed step with its exact commands, warnings, and your questions and answers, with scrubbed milestone screenshots as evidence.',
      shot: {
        alt: 'The Answer card: the result, a confidence meter, how it got there, how to verify it, and policy flags.',
        caption: 'The Answer card in a task. The report collects the confirmed steps and outcomes of the whole task.',
      },
      howTo: 'How to get a report',
      steps: [
        'Open the task from <b>Completed tasks</b> or <b>Session logs</b>.',
        'Press <b>Download</b> and choose the <b>PDF report</b>, the plain <b>text report</b>, or the full <b>audit log</b>; <b>Print</b> gives a paper copy.',
        'Commands and code appear only for steps you actually completed, and every screenshot was redacted on your device before capture.',
      ],
    },
    queue: {
      title: 'My queue',
      lead: 'My queue lists the tasks a project manager assigned to you, in order: in progress first, then to do.',
      leadWorker: 'Your account does assigned tasks only, so there is no Start a task; the queue is your home.',
      leadMixed: 'You can also start your own tasks; assigned work simply comes first.',
      shot: {
        alt: 'My queue: each assigned task with its project, state chip, when it was assigned, and a Start or Continue button.',
        caption: 'My queue. Each row names the project, the state and when it was assigned. A task waiting more than five days shows a Waiting chip.',
      },
      howTo: 'How to run an assigned task',
      steps: [
        'Open <b>My queue</b> (or the queue section at the top of your dashboard).',
        'Press <b>Start</b> on a task. WorkCoPilot plans its steps just in time, grounded in what the project already learned, and opens the guiding view.',
        'Follow the steps on your screen as in any task. The project manager sees the task move to <b>In progress</b>, then <b>Completed</b> when you finish it.',
        'Press <b>Continue</b> to reopen a task you already started. <b>Show completed</b> lists what you finished.',
      ],
    },
    pm: {
      title: 'Projects I manage',
      lead: "Projects I manage is the project manager's dashboard: every project you manage with its state (ongoing, on hold, complete), progress, and how much of it is assigned.",
      shot: {
        alt: 'Projects I manage: status filters and project cards with progress, assigned, in progress and unassigned counts.',
        caption: 'Projects I manage. Filter by status; each card shows progress and the assignment picture.',
      },
      howTo: 'How to create a project with the planner',
      steps: [
        'Press <b>New project</b>. Give it a name (optional) and describe the outcome, the systems involved and what done looks like.',
        'Press <b>Plan the project</b>. WorkCoPilot maps the tasks in order with a finish line and checks the plan; a goal that is really one task is sent back for a broader goal.',
        'The project opens with every task unassigned. Assign each task to a person (next section).',
      ],
      shotNew: {
        alt: 'The New project dialog: project name, the goal, and Plan the project.',
        caption: 'New project: the goal is all the planner needs.',
      },
    },
    pmProject: {
      title: 'A managed project',
      lead: "A managed project shows the task map with each task's state and assignee, the counts (not started, in progress, completed), the project's activity log, and the manager's actions.",
      shot: {
        alt: 'A managed project: status and manager chips, Hold project, the four count tiles, the task filters, and task rows with the assignee and the assign control.',
        caption: 'A managed project. Each task row shows who is doing it and when it was assigned; the control on the right assigns or moves it.',
      },
      assign: {
        h: 'How to assign a task to a person',
        steps: [
          'Find the task in the map (filter by <b>Not started</b> to see unassigned work; the chip <b>2 unassigned</b> on the counts tile tells you how many).',
          "Pick the person in the row's <b>Pick a person</b> list. Only people on a worker or mixed flow are offered.",
          "Press <b>Assign</b>. The task appears in that person's queue right away, and the assignment is written to the control log with who and when.",
        ],
      },
      move: {
        h: 'How to move a task from one person to another',
        steps: [
          'On a task that already has an assignee, pick the new person and press <b>Move</b>.',
          "The task keeps its progress and its guided session; it leaves the old person's queue and lands in the new one. The log records from whom to whom.",
        ],
      },
      hold: {
        h: 'How to hold and resume a project',
        steps: [
          'Press <b>Hold project</b>, write the reason (required) and confirm. The project is flagged On hold on every dashboard and in the risk register; people keep their tasks.',
          'Press <b>Resume project</b> when it can continue. Both actions are recorded.',
        ],
      },
      shotHold: {
        alt: 'The Hold project dialog with a required reason.',
        caption: 'Hold project: a reason is required and kept in the control log.',
      },
      productivity: {
        h: "How to read a person's productivity",
        steps: [
          "Click an assignee's name on any task row.",
          'The panel shows their counts across every task assigned to them (assigned, not started, in progress, completed), guided time spent, and what they are working on right now.',
        ],
      },
      shotPerson: {
        alt: 'The productivity panel for one person: four count tiles, guided time, and the task they are working on.',
        caption: 'Productivity for one person, from the tasks assigned to them.',
      },
    },
    srpm: {
      title: 'Project managers',
      lead: "Project managers is the senior project manager's roll-up: every project manager, the projects they manage and how each is doing, the load per manager, and the people who can be assigned work.",
      shot: {
        alt: 'Project managers: status tiles, load per project manager bars, projects grouped by manager with a Move action, and the people list.',
        caption: 'Project managers. Projects are grouped by the manager who owns them; Move hands one to another manager.',
      },
      move: {
        h: 'How to move a whole project to another project manager',
        steps: [
          'Press <b>Move</b> on the project card (or <b>Move to another manager</b> inside the project).',
          'Pick the new project manager, write the reason (required) and press <b>Move project</b>.',
          'Only the managing project manager changes. Every task keeps its assignee and progress; the hand-over is in the control log.',
        ],
      },
      shotMove: {
        alt: 'The Move project dialog: the project, the new project manager list and a required reason.',
        caption: 'Move project: pick the new manager, give the reason.',
      },
      start: {
        h: 'How to start a project and hand it to a manager',
        steps: [
          'Press <b>New project</b>, describe the goal, and choose who manages it under <b>Managed by</b>.',
          "Press <b>Plan the project</b>. The project lands in that manager's Projects I manage, ready to assign.",
          'Open <b>Productivity</b> next to a manager or a person to see their counts and time.',
        ],
      },
    },
    grc: {
      title: 'Oversight',
      lead: 'Oversight is the read-only view of every project in the company: status, load per project manager, the computed risk register, and the full control log.',
      leadReadOnly: 'Your role sees everything and changes nothing; project managers act.',
      shot: {
        alt: 'Oversight: status tiles, the status share bar, load per project manager, and the risk register.',
        caption: 'Oversight. The graphs read from the same data the project managers work in.',
      },
      risks: {
        h: 'How to read the risk register',
        lead: 'Risks are computed from the data, never entered by hand, and sorted so the oldest waits come first. Each row names the project, the task, the manager and the suggested action.',
        items: [
          '<b>Waiting too long</b>: a task assigned more than five days ago that has not been started. Ask the manager to check in with the assignee or move the task.',
          '<b>Ready, nobody assigned</b>: a task whose dependencies are done but nobody has it. Ask the manager to assign it.',
          '<b>Project on hold</b>: a project a manager held, with the reason. Ask whether it can resume.',
        ],
      },
      shotRisks: {
        alt: 'The risk register: Waiting too long rows with the age in days, a Ready nobody assigned row, and a Project on hold row, each with a suggested action and an Open link.',
        caption: 'The risk register. Open goes to the project; the project manager takes the action.',
      },
      log: {
        h: 'How to read the control log',
        steps: [
          'Scroll to <b>Control log</b>. Every project created, task assigned or moved, project handed over, held or resumed is a row with when, what, by whom and the detail (from whom to whom, the reason).',
          'Filter by project with the <b>Project</b> list; <b>Show more</b> reveals older rows. The log is append-only.',
        ],
      },
    },
    // Company workflows (help/entries/workflowsHelp.jsx): every company member.
    // Annotated shots: each <id> has h, alt, caption and marks.<key> (one rich
    // line per numbered callout, read in the order the entry lists them).
    workflows: {
      title: 'Company workflows',
      lead: 'Do a task the way your team agreed, guided on your own screen one step at a time. Your trainers keep each workflow current, so you always follow the latest version.',
      path: [
        'On your dashboard, find it under <b>Company workflows</b>. Search or pick a category when the list is long.',
        'Open a row to see where it starts and what to have ready.',
        'Press <b>Run</b>, share your screen, and follow each step.',
      ],
      list: {
        h: 'Find the workflow you need',
        alt: 'The Company workflows section of the dashboard: a search box, a category filter, workflow rows with product, category, steps and time, and one row opened with where it starts, what to have ready, who maintains it and the Run button.',
        caption: 'Every workflow your trainers published, ready to run.',
        marks: {
          search: '<b>Search and filter.</b> Find a workflow by name, or narrow the list to one category.',
          details: '<b>Know before you start.</b> Where it starts, what to have ready and who maintains it.',
          run: '<b>Run.</b> Starts a guided task from this workflow, with every step already planned.',
        },
      },
      guide: {
        h: 'Follow each step, with the screen to expect',
        alt: 'The guiding view running the Issue a customer refund workflow: the plan on the left, the current step with its done check, the What the screen should look like thumbnail, the Company workflow tag and the Mark done button.',
        caption: 'A workflow run follows the steps your trainer recorded, in their order.',
        marks: {
          plan: '<b>The whole plan.</b> Every step of the workflow, and where you are now.',
          shot: '<b>What the screen should look like.</b> Your trainer\'s screenshot of this step, so you can check you are in the right place.',
          source: '<b>Company workflow.</b> The workflow and version you are following.',
          done: '<b>Mark done.</b> Move on when the step is finished, or press Verify on my screen to check it first.',
        },
      },
      larger: {
        h: 'Compare your screen with the trainer\'s',
        alt: 'The step screenshot opened at full size inside the step card.',
        caption: 'Press Show larger on any step that has a screenshot.',
        marks: {
          full: '<b>The full screenshot.</b> Compare it with your screen before you act.',
        },
      },
    },
    // Teach studio (help/entries/teachHelp.jsx): trainers and company admins.
    teach: {
      title: 'Teach studio',
      lead: 'Show a task once and everyone in your company can follow it on their own screen. Record or write the steps, check them, publish, and keep them current as your apps change.',
      path: [
        'Press <b>New workflow</b> and fill in the four essentials.',
        'Add the steps: record a demonstration, import a recording, or write them.',
        'Check each step against its screenshot and keep the suggestions you agree with.',
        '<b>Publish</b>. Later, <b>Revise</b> to update it or <b>Retire</b> to stop offering it.',
      ],
      list: {
        h: 'All your workflows in one list',
        alt: 'The Teach studio: the New workflow button, Workflow issues, the workflows with their version and state, and one published workflow opened with its details, its steps and the Revise, Retire and Delete actions.',
        caption: 'Open any row to see its details and steps, and act on it.',
        marks: {
          newWorkflow: '<b>New workflow.</b> Opens the guided wizard.',
          issues: '<b>Workflow issues.</b> Moments when a run did not match the screen. The number counts new ones.',
          states: '<b>Draft, Published or Retired.</b> Only a published workflow reaches your team.',
          actions: '<b>Revise, Retire, Delete.</b> Revise starts a new draft version. The live one keeps running until you publish the new one.',
        },
      },
      wizard: {
        h: 'Five short steps, essentials first',
        alt: 'The new workflow wizard on Basics: the five steps across the top, the line confirming what you are teaching, the required fields and the Save draft and Publish buttons.',
        caption: 'Save a draft at any point and come back to it later.',
        marks: {
          stepper: '<b>Five steps.</b> Basics, Details, Scope and privacy, Steps and Review. Go back to any of them.',
          reflect: '<b>A quick check.</b> Confirms the product and the task you are teaching.',
          required: '<b>Four essentials.</b> Product, title, owner and where to start. Everything else is optional.',
          footer: '<b>Save draft or Publish.</b> Publish turns on once the essentials, at least one step and the scope note are in place.',
        },
      },
      scope: {
        h: 'No surprises about who sees it',
        alt: 'The Scope and privacy step: who the workflow is shared with, what it stores, the confirmation checkbox and the masking option.',
        caption: 'Publishing waits until you confirm the scope note.',
        marks: {
          note: '<b>Who sees it.</b> Everyone in your company, once it is published.',
          ack: '<b>Confirm once.</b> Tick this before you publish.',
          mask: '<b>Mask sensitive text.</b> Done on your device, before any recorded screenshot is saved. Always on while your company\'s data protection is on.',
        },
      },
      record: {
        h: 'Record a live demonstration',
        alt: 'The Record a demonstration setup: narrate with the microphone and the narration language, capture the call audio with its consent checkbox, the masking note and the Share screen and start button.',
        caption: 'WorkCoPilot sees your screen, not your clicks. Press Mark step whenever a new step should begin.',
        marks: {
          narrate: '<b>Narrate.</b> What you say becomes the text of each step. No audio is kept.',
          call: '<b>Call audio.</b> For a meeting you are recording. Start stays off until you confirm everyone on the call knows.',
          mask: '<b>Masked first.</b> Sensitive text is masked before any screenshot is saved.',
          start: '<b>Share screen and start.</b> Share only the window of the app you are teaching.',
        },
      },
      live: {
        h: 'While you record',
        alt: 'The live recording bar: the Recording badge and timer, the screens and step breaks so far, Mark step, Pause, Stop and review, and Discard.',
        caption: 'Nothing is saved until you stop. Discard throws the recording away.',
        marks: {
          time: '<b>Time and progress.</b> How long you have recorded, and how many screens and step breaks it has.',
          mark: '<b>Mark step.</b> Starts a new step right here.',
          stop: '<b>Stop and review.</b> Your steps load into the editor, ready to check.',
        },
      },
      import: {
        h: 'Or import a recording you already have',
        alt: 'Import a recording with a video chosen: the file name and length, the language spoken and the Build steps from this video button.',
        caption: 'A Teams or Zoom video works. The video is read on your device and is not uploaded: only the screenshots your steps use and short clips of speech leave it.',
        marks: {
          file: '<b>Your video.</b> Its name and length, read on this device.',
          lang: '<b>Language spoken.</b> So what is said becomes step text in the right language.',
          start: '<b>Build steps from this video.</b> Drafts a step each time the screen settles on something new.',
        },
      },
      review: {
        h: 'Check each step against its screenshot',
        alt: 'The Steps editor of a recorded draft: the Check each step against its screenshot card, one step opened with its screenshot and a suggestion marked Probably right with Read again and Use suggestion, and another step marked Suggestion.',
        caption: 'Suggestions sit beside your own text. Your steps change only when you choose Use suggestion.',
        marks: {
          read: '<b>Read steps.</b> Reads each step that has a screenshot, one at a time, while you keep editing.',
          shot: '<b>The step\'s screenshot.</b> What a teammate should see at this step.',
          band: '<b>How clear it looked.</b> Looks clear, Probably right, or Not sure, check it.',
          use: '<b>Use suggestion or Read again.</b> You decide, one step at a time.',
          mark: '<b>Suggestion waiting.</b> Shows on every step that has one to check.',
        },
      },
    },
    // Workflow issues (help/entries/issuesHelp.jsx): trainers, PMs, Sr PMs, GRC,
    // company admins and executives. `watch` is the note GRC and executives
    // read (they follow, others act); the action callouts show to those who act.
    issues: {
      title: 'Workflow issues',
      lead: 'See every moment a published workflow did not match a teammate\'s screen. Fix the workflow once and everyone who runs it gets the fix. Each issue is about the workflow, never about a person\'s work.',
      path: [
        'Open <b>Workflow issues</b> from the menu or the Teach studio. The number counts new issues.',
        'Filter by state or workflow, then open an issue.',
        '<b>Acknowledge</b> it, update the workflow, then <b>Resolve</b> it. Or <b>Dismiss</b> it if nothing needs to change.',
      ],
      // GRC and executives follow issues read-only, so their path has no actions.
      pathWatch: [
        'Open <b>Workflow issues</b> from the menu. The number counts new issues.',
        'Filter by state or workflow, then open an issue to see what happened.',
        'Follow it through: the people who keep the workflow current acknowledge it, fix the workflow and resolve it.',
      ],
      badge: {
        h: 'New issues find you',
        alt: 'The menu with Workflow issues and its count of new issues.',
        caption: 'The count shows issues that are new since your last visit.',
        marks: {
          badge: '<b>Workflow issues.</b> Opens the inbox. The number counts what is new.',
        },
      },
      inbox: {
        h: 'See what happened and act on it',
        alt: 'Workflow issues: the summary chips, the state filter, and one issue opened with what the guide noticed, the screen it saw, the suggested step, who ran into it and the actions.',
        caption: 'Repeats of the same step and kind add to one issue, so the list stays short.',
        marks: {
          chips: '<b>At a glance.</b> Open and acknowledged issues, and active issues by kind.',
          filters: '<b>Filter.</b> Active, Resolved, Dismissed or All, and one workflow at a time.',
          shot: '<b>The screen the guide saw.</b> Open it larger to see exactly what changed.',
          suggest: '<b>Suggested step.</b> The step a teammate needed that the workflow does not have yet.',
          actions: '<b>Act on it.</b> Add the step to a draft, Acknowledge, Resolve or Dismiss, with a note to say why.',
          // For people who act on issues but cannot add a step (only the workflow's author or a company admin can).
          actionsPlain: '<b>Act on it.</b> Acknowledge, Resolve or Dismiss, with a note to say why.',
        },
      },
      adopt: {
        h: 'Add a missing step to the workflow',
        alt: 'The confirmation to add the suggested step to a draft of the workflow.',
        caption: 'Nothing changes for your team until someone publishes the draft.',
      },
      exec: {
        h: 'On the executive dashboard',
        alt: 'The Workflow issues card on the executive dashboard: active issues counted by kind and the Review workflow issues button.',
        caption: 'See where workflows need attention without opening every issue.',
        marks: {
          kinds: '<b>Active issues by kind.</b> Screen changed, error on screen, could not continue, step not in workflow, step skipped.',
          review: '<b>Review workflow issues.</b> Opens the full inbox.',
        },
      },
      watch: 'GRC and executives follow every issue read-only. Executives also see the active issues by kind on the executive dashboard.',
    },
    // Executive dashboard (help/entries/execHelp.jsx): executives and company
    // admins; the Company Brain export part shows to executives only.
    exec: {
      title: 'Executive dashboard',
      lead: 'See where every project stands and who is moving work forward, without asking anyone for a status report.',
      path: [
        'Open <b>Executive dashboard</b> at the bottom of the menu.',
        'Pick 7, 30 or 90 days, then read the projects and people views.',
        'Export a PDF, an image or a CSV when you need to share it.',
      ],
      drill: {
        h: 'Projects and people at a glance',
        alt: 'The executive dashboard drill-downs: project status tiles, the biggest projects with manager, tasks, people and a completion bar, and the top performers by tasks completed and by projects.',
        caption: 'Read-only, and it covers your whole company.',
        marks: {
          status: '<b>Project status.</b> How many projects are ongoing, done or on hold.',
          table: '<b>Biggest projects.</b> Manager, tasks, people and how complete each one is.',
          people: '<b>Top performers, two ways.</b> By guided tasks completed, and by the projects they work on or manage.',
        },
      },
      brain: {
        h: 'Download the Company Brain (executives only)',
        alt: 'The Company Brain panel: the encryption note, the message that your export passphrase is set with View passphrase and Replace passphrase, and Download Company Brain.',
        caption: 'On the hosted service, viewing or replacing the passphrase asks for your authenticator code.',
        marks: {
          note: '<b>Encrypted with your passphrase.</b> Without it the file cannot be opened, so keep it safe.',
          key: '<b>View or replace it.</b> Set it once, then view or change it whenever you need to.',
          download: '<b>Download Company Brain.</b> One encrypted .wcpx file of your company\'s knowledge store.',
        },
      },
    },
    // Your brain (help/entries/brainHelp.jsx): personal accounts only. The
    // product is never named: the page speaks of "your guide".
    brain: {
      title: 'Your brain',
      lead: 'Teach your guide with your own documents. It learns from each one, masks private details first, then deletes the file. You keep only what it learned, and every task you start reads from it.',
      path: [
        'Open <b>Your brain</b> in the menu.',
        'Drop in a document about how you work, or press <b>Choose a document</b>: a PDF, a Word document, a text file or a Markdown file, up to 10 MB.',
        'Read what it learned. Open any row to see each learning, and press <b>Forget</b> on anything you do not want kept.',
        'Start a task as usual. The guidance now follows what you taught it.',
      ],
      page: {
        h: 'Teach it with a document',
        alt: 'The Your brain page: the promise that the file is deleted after learning, the drop zone with the Choose a document button, the 1 of 3 documents meter, the line Learned 2 things from How I work.txt, and the list of sources.',
        caption: 'The file is read, private details are masked, and only the learnings stay. The same document again refreshes them instead of adding a copy.',
        marks: {
          promise: '<b>The promise.</b> What happens to a document, stated before you upload one.',
          drop: '<b>Drop zone.</b> Drag a document in, or choose one. PDF, Word, text or Markdown, up to 10 MB.',
          meter: '<b>Documents on your plan.</b> How many it learns from. Forget one to make room, or move to a bigger plan.',
          result: '<b>What just happened.</b> How many things it learned, how many private details were masked, and that the file is gone.',
          rows: '<b>By source.</b> One row per document, plus Your sessions, which fills up as you finish tasks.',
        },
      },
      learned: {
        h: 'Read, keep or forget each learning',
        alt: 'A source row opened: each learning with its kind chip (Fact, How-to, Preference, Term or Watch out), a Forget button on every learning, Forget this document at the bottom of the row, and Forget everything above the list.',
        caption: 'Each learning is one short note it will use. Forget one, a whole document, or everything.',
        marks: {
          kind: '<b>Kind.</b> Fact, How-to, Preference, Term or Watch out. Hover one to see what it means.',
          forget: '<b>Forget one.</b> Press Forget, then confirm. It is gone at once.',
          forgetSource: '<b>Forget a document.</b> Removes everything that document taught. A learning another document also taught stays.',
          forgetAll: '<b>Forget everything.</b> Clears your whole brain after a confirm you have to acknowledge.',
        },
      },
    },
    admin: {
      title: 'Flows and roles',
      lead: 'In the company console, Team, you set two things per person: their <b>work flow</b> (how guided tasks reach them) and their <b>role</b> (what they manage). Changes take effect right away.',
      shot: {
        alt: 'The company console Team page: the Add a person form with Role and Work flow selects, and the people table with a Role and a Flow select per row.',
        caption: 'Team. Role and Work flow at create, and inline per person.',
      },
      howTo: "How to set a person's flow and role",
      steps: [
        'Open the company console and press <b>Team</b>.',
        'For a new person press <b>Add person</b> and choose the <b>Role</b> and the <b>Work flow</b> before you add them. For an existing person, change the <b>Role</b> or <b>Flow</b> select in their row.',
        'Flows: <b>Independent</b> starts their own tasks and is never assigned to; <b>Worker</b> only does tasks a project manager assigns (no Start a task); <b>Mixed</b> does both.',
        'Roles: <b>Project manager</b> creates projects and assigns tasks; <b>Senior project manager</b> oversees every manager and can move projects between them; <b>GRC</b> has read-only oversight of all projects.',
      ],
    },
  },
}
