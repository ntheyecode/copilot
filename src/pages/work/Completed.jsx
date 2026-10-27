// Completed tasks (/work/completed): a child route of WorkAppLayout, rendered
// through the shell's <Outlet/> so the left rail + top bar persist. The body
// stays the single source in WorkTasks.jsx; `embedded` emits only the list.
import { CompletedTasks } from '../WorkTasks.jsx'
export default function Completed() { return <CompletedTasks embedded /> }
