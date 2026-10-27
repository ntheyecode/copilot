// My tasks (/work/tasks): a child route of WorkAppLayout, rendered through the
// shell's <Outlet/> so the left rail + top bar persist. The list body, sessions
// hook and row helpers remain the single source in WorkTasks.jsx (SUPREME RULE
// II); `embedded` tells its sub-shell to emit only the list (no second header).
import WorkTasks from '../WorkTasks.jsx'
export default function MyTasks() { return <WorkTasks embedded /> }
