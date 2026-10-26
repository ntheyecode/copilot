import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import WorkMarketing from './pages/WorkMarketing.jsx'
import WorkDemo from './pages/WorkDemo.jsx'
import WorkLogin from './pages/WorkLogin.jsx'
import WorkUseCases from './pages/WorkUseCases.jsx'
import WorkSecurity from './pages/WorkSecurity.jsx'
import WorkEnterprise from './pages/WorkEnterprise.jsx'
import WorkPrivacy from './pages/WorkPrivacy.jsx'
import WorkDisclaimer from './pages/WorkDisclaimer.jsx'
import WorkTerms from './pages/WorkTerms.jsx'
import WorkAcceptableUse from './pages/WorkAcceptableUse.jsx'
import WorkDPA from './pages/WorkDPA.jsx'
import WorkRefund from './pages/WorkRefund.jsx'
import WorkBenchmark from './pages/WorkBenchmark.jsx'
import WorkCapabilities from './pages/WorkCapabilities.jsx'
import WorkFields from './pages/WorkFields.jsx'
import WorkPricing from './pages/WorkPricing.jsx'
import WorkFaq from './pages/WorkFaq.jsx'
import WorkContact from './pages/WorkContact.jsx'
import AffiliatePage from './pages/AffiliatePage.jsx'
import WorkSetPassword from './pages/WorkSetPassword.jsx'
// Signed-in app + admin consoles are code-split: public marketing/SEO visitors
// never download them, which keeps the initial bundle (and LCP) small.
const WorkPage = lazy(() => import('./pages/WorkPage.jsx'))
const WorkBuddy = lazy(() => import('./pages/WorkBuddy.jsx'))
const WorkFullGuide = lazy(() => import('./pages/WorkFullGuide.jsx'))
const WorkAdmin = lazy(() => import('./pages/workadmin/WorkAdmin.jsx'))
const WorkCompanyAdmin = lazy(() => import('./pages/workadmin/WorkCompanyAdmin.jsx'))
const WorkExec = lazy(() => import('./pages/WorkExec.jsx'))
// Standalone white sub-pages of the dashboard (same tokens, own routes).
const WorkTasks = lazy(() => import('./pages/WorkTasks.jsx'))
const CompletedTasks = lazy(() => import('./pages/WorkTasks.jsx').then((m) => ({ default: m.CompletedTasks })))
const WorkLogs = lazy(() => import('./pages/WorkLogs.jsx'))
import { useAuth } from './auth.jsx'

// main.jsx already wraps ThemeProvider + AuthProvider + BrowserRouter, so App
// only declares the WorkCoPilot routes. Nothing here re-wraps those providers.
function Splash() {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg)' }}>
      <Loader2 size={26} className="spin" style={{ color: 'var(--brand-500)' }} />
    </div>
  )
}

// admireveda.com shows the WorkCoPilot marketing page to visitors; signed-in
// users go straight to their surface. Admins land on the admin console.
function RootRedirect() {
  const { user, ready } = useAuth()
  if (!ready) return <Splash />
  if (!user) return <WorkMarketing />
  const admin = ['admin', 'superadmin', 'accounting', 'affiliate_admin'].includes(user.role)
  // A company admin lands on their own company console; platform/console admins on
  // the admin console (which shows only their allowed sections); everyone else the app.
  const companyAdmin = !admin && user.companyRole === 'company_admin'
  return <Navigate to={admin ? '/work/admin' : companyAdmin ? '/work/company' : '/work'} replace />
}

export default function App() {
  return (
    <Suspense fallback={<Splash />}>
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      {/* Public scripted demo (no login, no AI, all canned). */}
      <Route path="/demo" element={<WorkDemo />} />
      {/* The product's own branded sign-in page. */}
      <Route path="/workcopilot" element={<WorkLogin />} />
      <Route path="/workcopilot/login" element={<WorkLogin />} />
      <Route path="/workcopilot/use-cases" element={<WorkUseCases />} />
      <Route path="/workcopilot/security" element={<WorkSecurity />} />
      {/* Enterprise features: the full list, linked from the main page + nav. */}
      <Route path="/workcopilot/enterprise" element={<WorkEnterprise />} />
      <Route path="/enterprise" element={<WorkEnterprise />} />
      {/* Public legal pages (plain-language disclosures, same light design as /security). */}
      <Route path="/workcopilot/privacy" element={<WorkPrivacy />} />
      <Route path="/workcopilot/disclaimer" element={<WorkDisclaimer />} />
      <Route path="/workcopilot/terms" element={<WorkTerms />} />
      <Route path="/workcopilot/acceptable-use" element={<WorkAcceptableUse />} />
      <Route path="/workcopilot/dpa" element={<WorkDPA />} />
      <Route path="/workcopilot/refund" element={<WorkRefund />} />
      <Route path="/workcopilot/benchmark" element={<WorkBenchmark />} />
      <Route path="/workcopilot/how-it-works" element={<WorkCapabilities />} />
      {/* Content moved off the short main page (owner rule), linked from its footer. */}
      <Route path="/workcopilot/fields" element={<WorkFields />} />
      <Route path="/workcopilot/pricing" element={<WorkPricing />} />
      {/* Public FAQ (AEO-optimized, with FAQPage structured data), linked from the footer. */}
      <Route path="/workcopilot/faq" element={<WorkFaq />} />
      <Route path="/workcopilot/contact" element={<WorkContact />} />
      <Route path="/affliate" element={<AffiliatePage />} />
      <Route path="/affiliate" element={<AffiliatePage />} />
      <Route path="/work/set-password" element={<WorkSetPassword />} />
      {/* The app itself. WorkPage self-gates on the session the server reports. */}
      <Route path="/work" element={<WorkPage />} />
      {/* Completed tasks + session logs: standalone pages in the dashboard's white style. */}
      <Route path="/work/tasks" element={<WorkTasks />} />
      <Route path="/work/completed" element={<CompletedTasks />} />
      <Route path="/work/logs" element={<WorkLogs />} />
      {/* Chrome-free buddy window the desktop shell loads (workcopilot/main.js). */}
      <Route path="/work/buddy" element={<WorkBuddy />} />
      {/* Full-screen guidance for a second monitor (read-only; drive from /work). */}
      <Route path="/work/guide" element={<WorkFullGuide />} />
      {/* Separate admin console (own module + /api/work/admin/*). Self-gates on admin. */}
      <Route path="/work/admin" element={<WorkAdmin />} />
      {/* Company-admin console (own-company scope, /api/work/* + /api/work/team/*). Self-gates on company_admin. */}
      <Route path="/work/company" element={<WorkCompanyAdmin />} />
      <Route path="/work/exec" element={<WorkExec />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
  )
}
