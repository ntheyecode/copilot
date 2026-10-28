// English strings for the signed-in PROJECTS surface (src/pages/work/projects/*):
// the projects dashboard (/work/projects), the new-project flow and its outcomes
// (single task / refusal / upgrade-or-shorten / quality gate), the project view
// (/work/projects/:id: finish line, task map, pick-next, add-to-project) and the
// standalone-tasks area. One partial per i18n wave, deep-merged into the English
// base by src/i18n/index.jsx. Keys live under the `workProjects` namespace. A
// non-English locale that lacks a key falls back to this English.
//
// Honesty rules (owner): never a model or provider name; "it guides, you act";
// US spelling; no em-dash.
export default {
  workProjects: {
    // ---- Projects dashboard head ----
    page: {
      lead: 'A large goal, run as a map of tasks. WorkCoPilot guides each task on your screen, in order. You act.',
      new: 'New project',
      newShort: 'New',
    },

    // ---- Not entitled (regular plan): the clean upgrade prompt, never a dead end ----
    gate: {
      title: 'Large projects for Premium and company users',
      body: 'A project turns a goal that spans several workflows into a map of tasks with a finish line. Each task is guided on your screen in order, and what you learn in one task carries into the next.',
      upgrade: 'See Premium plans',
      company: 'Ask your administrator to grant Deep guidance to your team to run projects.',
      startTask: 'Start a single task instead',
    },

    // ---- The list ----
    list: {
      heading: 'Your projects',
      sub: 'Open one to see its finish line and task map.',
      customer: 'Customer',
      allCustomers: 'All customers',
      emptyTitle: 'No projects yet',
      emptyBody: 'Describe a goal that spans several workflows and WorkCoPilot maps it into tasks. A goal that is really one task is started as a task instead.',
      errTitle: 'Could not load your projects',
      errBody: 'This looks like a connection hiccup, not an empty list.',
      retry: 'Try again',
    },

    // ---- A project card ----
    card: {
      progress: '{done}/{total} done',
      tasks_one: '{n} task',
      tasks_other: '{n} tasks',
      next: 'Up next: <b>{title}</b>',
      allDone: 'Finish line reached',
      noTasks: 'No tasks planned yet',
      open: 'Open',
    },

    // ---- Project states ----
    state: {
      planning: 'Planned',
      active: 'In progress',
      done: 'Complete',
    },

    // ---- Task states (one visual per state) ----
    taskState: {
      pending: 'To do',
      active: 'In progress',
      done: 'Done',
      rerun: 'Rerun',
      locked: 'Waiting',
    },

    // ---- Standalone single tasks (not part of any project) ----
    standalone: {
      heading: 'Standalone tasks',
      sub: 'Single tasks that are not part of a project.',
      empty: 'No standalone tasks yet. A goal that is one workflow starts here as a task.',
      viewAll: 'View all',
      start: 'Start a task',
      more_one: '{n} more in My tasks',
      more_other: '{n} more in My tasks',
    },

    // ---- New project flow ----
    create: {
      eyebrow: 'New project',
      title: 'What should this project achieve?',
      customer: 'Customer',
      customerHelp: 'Who this project is for. Default is your own company.',
      customerDefault: 'Default (your company)',
      customerAdminNote: 'Your administrator manages the customer list.',
      name: 'Project name',
      namePh: 'e.g. Launch the customer service portal',
      goal: 'Goal',
      goalPh: 'Describe the outcome you want, in your own words. Include the systems involved and what done looks like.',
      goalHelp: 'WorkCoPilot maps the tasks in order with a finish line, then guides each one on your screen. You act, it guides.',
      optional: 'optional',
      required: 'required',
      submit: 'Plan the project',
      planning: 'Mapping the tasks',
      cancel: 'Cancel',
      close: 'Close',
      errEmpty: 'Say what the project should achieve.',
      errGeneric: 'Could not plan the project. Please try again.',
    },

    // ---- Create outcomes: every server answer has a real card ----
    outcome: {
      singleTitle: 'This is really one task',
      singleBody: 'The whole goal is one workflow, so it runs best as a single guided task. You can start it right now.',
      singleGoal: 'Task to start',
      singleStart: 'Start it as a task',
      edit: 'Edit the goal',
      refusalTitle: 'WorkCoPilot cannot plan this',
      upgradeTitle: 'Projects are a Premium feature',
      upgradeBody: 'This goal spans several tasks. Upgrade to Premium to run it as a guided project, or shorten it to one task you can start now.',
      upgradeCta: 'See Premium plans',
      upgradeCompany: 'Ask your administrator to grant Deep guidance to your team to run projects.',
      shortenTitle: 'Or shorten it to one task',
      shortenHelp: 'Keep the one piece of work you want to do first. It starts as a guided task right away.',
      shortenPh: 'One task you can start now',
      shortenCta: 'Start this task',
      qualityTitle: 'The plan needs another pass',
      qualityBody: 'The task map did not pass the quality check. Make the goal a little more specific and try again.',
      starting: 'Starting',
      startErr: 'Could not start the task. Please try again.',
    },

    // ---- Project view ----
    view: {
      back: 'All projects',
      finishLine: 'Finish line',
      checks: 'Done when',
      progress: '{done} of {total} tasks done',
      map: 'Task map',
      mapSub: 'In order. A task unlocks when the tasks it waits for are done.',
      learnings_one: '{n} learning carried forward',
      learnings_other: '{n} learnings carried forward',
      learningsTitle: 'Learnings so far',
      notFoundTitle: 'Project not found',
      notFoundBody: 'It may have been removed, or the link is from another account.',
      errTitle: 'Could not load this project',
      errBody: 'This looks like a connection hiccup. Your project is safe.',
      goal: 'Goal',
      noChecks: 'The finish line is reached when every task is done.',
    },

    // ---- A task card ----
    task: {
      n: 'Task {n}',
      doneState: 'Done when',
      waitsFor: 'Waits for',
      lockedTip: 'Locked until the tasks it waits for are done.',
      start: 'Start',
      continue: 'Continue',
      startAgain: 'Start again',
      open: 'Open',
      markDone: 'Mark done',
      pause: 'Pause',
      rerun: 'Rerun',
      more: 'More actions for {title}',
      expanding: 'Planning the steps',
      refusal: 'WorkCoPilot cannot guide this task as written. Edit the goal or ask for help.',
      errState: 'Could not update the task. Please try again.',
      errExpand: 'Could not start the task. Please try again.',
      outcome: 'Outcome',
      telemetry: {
        label: 'Readout',
        duration: '{time} guided',
        steps_one: '{n} step',
        steps_other: '{n} steps',
        deepened: 'Went deeper',
        backup: 'Backup path used',
        success: 'Confirmed',
        unverified: 'Not confirmed',
        rerun_one: 'Rerun {n} time',
        rerun_other: 'Rerun {n} times',
      },
    },

    // ---- Pick what to do next (shown once a task is done) ----
    next: {
      doneTitle: '{title} is done',
      doneSub: 'Nice work. Here is what to do next.',
      upNext: 'Up next',
      start: 'Start',
      orPick: 'Or pick another task that is ready now',
      allDoneTitle: 'Project complete',
      allDoneBody: 'Every task is done and the finish line is reached. Rerun any task to refresh its result.',
      blockedTitle: 'Nothing is ready to start',
      blockedBody: 'Every remaining task waits on a task that is in progress. Finish that one and the next unlocks.',
    },

    // ---- Add to this project (mid-journey injection) ----
    inject: {
      cta: 'Add to this project',
      title: 'Add to this project',
      help: 'Describe a new piece of work. WorkCoPilot checks whether a planned task already covers it, and places it where it belongs in the map.',
      ph: 'e.g. Set up single sign-on for the portal',
      blocks: 'Must be done before',
      blocksNone: 'No particular task',
      submit: 'Add',
      adding: 'Adding',
      cancel: 'Cancel',
      dupTitle: 'Already covered',
      dupBody: 'That is part of {title}, which is already planned, so nothing was added.',
      before: 'Added {title} before {other}.',
      after: 'Added {title} after {other}.',
      appended: 'Added {title} at the end of the map.',
      cycle: 'It could not go before the task you chose without a loop, so it was added at the end.',
      errEmpty: 'Say what to add.',
      errGeneric: 'Could not add that. Please try again.',
      dismiss: 'Dismiss',
    },

    // ---- Recommended practices (plan-time suggestion cards under the map) ----
    // Source labels are plain words; never a model or provider name.
    practices: {
      heading: 'Worth adding?',
      sub: 'Practices projects like this usually include. Add one to the map or dismiss it.',
      accept: 'Add to the map',
      acceptAria: 'Add {title} to the task map',
      adding: 'Adding',
      retry: 'Try again',
      dismissAria: 'Dismiss {title}',
      srcCatalog: 'A standard practice for this type of project',
      srcCompany: 'From your company\'s own practices',
      srcPlatform: 'Learned from projects like this one',
      srcGeneric: 'A recommended practice',
    },
  },
}
