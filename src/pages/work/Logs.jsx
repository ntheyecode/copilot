// Session logs (/work/logs): a child route of WorkAppLayout, rendered through
// the shell's <Outlet/> so the left rail + top bar persist. The body stays the
// single source in WorkLogs.jsx; `embedded` emits only the list.
import WorkLogs from '../WorkLogs.jsx'
export default function Logs() { return <WorkLogs embedded /> }
