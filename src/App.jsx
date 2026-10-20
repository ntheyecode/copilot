import { Routes, Route, Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import WorkMarketing from './pages/WorkMarketing.jsx'
import WorkDemo from './pages/WorkDemo.jsx'
import WorkLogin from './pages/WorkLogin.jsx'
import WorkUseCases from './pages/WorkUseCases.jsx'
import WorkPage from './pages/WorkPage.jsx'
import WorkBuddy from './pages/WorkBuddy.jsx'
import WorkAdmin from './pages/workadmin/WorkAdmin.jsx'
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
  const admin = user.role === 'admin' || user.role === 'superadmin'
  return <Navigate to={admin ? '/work/admin' : '/work'} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      {/* Public scripted demo (no login, no AI, all canned). */}
      <Route path="/demo" element={<WorkDemo />} />
      {/* The product's own branded sign-in page. */}
      <Route path="/workcopilot" element={<WorkLogin />} />
      <Route path="/workcopilot/login" element={<WorkLogin />} />
      <Route path="/workcopilot/use-cases" element={<WorkUseCases />} />
      {/* The app itself. WorkPage self-gates on the session the server reports. */}
      <Route path="/work" element={<WorkPage />} />
      {/* Chrome-free buddy window the desktop shell loads (workcopilot/main.js). */}
      <Route path="/work/buddy" element={<WorkBuddy />} />
      {/* Separate admin console (own module + /api/work/admin/*). Self-gates on admin. */}
      <Route path="/work/admin" element={<WorkAdmin />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
