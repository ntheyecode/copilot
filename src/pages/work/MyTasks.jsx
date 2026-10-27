// My tasks (/work/tasks). Re-homes the existing WorkTasks surface under the
// work/ page namespace. The list body, sessions hook and row helpers remain the
// single source in WorkTasks.jsx (SUPREME RULE II); this page renders them
// unchanged so behavior is identical. It keeps its own white sub-shell for now;
// folding it into the unified rail shell is a later (redesign) step.
export { default } from '../WorkTasks.jsx'
