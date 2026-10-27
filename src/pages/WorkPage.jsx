// RETIRED. This file was a single 6,305-line module that held the entire
// signed-in WorkCoPilot app (the session gate, the dashboard shell, the start
// card, the scope wizard, the help docs and the guiding console). It has been
// split into a shared shell + per-route pages under src/pages/work/:
//
//   work/WorkAppLayout.jsx   shell: gate + rail + top bar + plan pill + frame + context
//   work/WorkAppContext.jsx  the shared app context (useWorkApp)
//   work/Dashboard.jsx       the overview (index route)
//   work/StartTask.jsx       the start-a-task flow (/work/start)
//   work/Guiding.jsx         the guiding console (/work/session/:id)
//   work/Skills.jsx          the skills page (/work/skills)
//   work/Help.jsx            the how-to page (/work/help)
//   work/Support.jsx         the support page (/work/support)
//   work/MyTasks|Completed|Logs.jsx  the standalone sub-pages
//   work/lib.js              shared capture/parse utils + shell style objects
//   work/workApp.css.js      the white dashboard CSS (WD_CSS)
//
// App.jsx wires these routes directly. This re-export is kept for one release so
// any lingering import of ./pages/WorkPage still resolves to the signed-in app.
export { default } from './work/WorkAppLayout.jsx'
