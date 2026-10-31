// Where this server serves no public website (capability `public_site` off: a
// customer's own install), the marketing routes send the visitor to sign-in.
// The list of those routes is the server's (server/public_site_paths.js), so
// the SPA and the server refuse the same pages; the server also redirects them
// before any JavaScript runs (server/public_site_gate.js).
import { Navigate, useLocation } from 'react-router-dom'
import { useEditionView } from './useCaps.js'
import { SIGN_IN_PATH, isMarketingPage } from '../../server/public_site_paths.js'

export default function PublicSiteGate({ children }) {
  const ed = useEditionView()
  const { pathname } = useLocation()
  if (!ed.publicSite && isMarketingPage(pathname)) return <Navigate to={SIGN_IN_PATH} replace />
  return children
}
