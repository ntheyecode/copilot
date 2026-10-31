import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth.jsx'

// ONE rule for every signed-in console: a visitor who is not signed in (never
// was, signed out, session expired, or removed from their company) goes to the
// sign-in page. Before, each standalone console re-checked /me on its own and
// several showed a misleading "this is not for you" gate instead (the Teach
// studio told a signed-out trainer to ask for the trainer grant).
// Gate: src/theme/product_scope.test.mjs; E2E: e2e/specs/auth.spec.mjs.
export default function RequireSignIn() {
  const { user, ready } = useAuth()
  const loc = useLocation()
  if (ready && !user) return <Navigate to="/workcopilot" replace state={{ from: loc.pathname }} />
  return <Outlet />
}
