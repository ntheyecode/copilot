// Route-level edition gate: render `children` when the edition has what the
// surface needs (src/edition/surfaces.js), otherwise `fallback` (by default a
// redirect home). The server refuses the matching API routes on its own
// (server/edition_route_gates.js); this only keeps the SPA from showing a
// surface the edition does not have.
import { Navigate } from 'react-router-dom'
import { useEditionView } from './useCaps.js'
import { shows } from './surfaces.js'

export default function EditionRoute({ needs, fallback, to = '/', children }) {
  const ed = useEditionView()
  if (shows(ed, needs)) return children
  return fallback !== undefined ? fallback : <Navigate to={to} replace />
}
