import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'

// ─── Lazy-loaded pages ────────────────────────────────────
const PublicPage    = lazy(() => import('./pages/PublicPage'))
const LoginPage     = lazy(() => import('./pages/LoginPage'))
const RegisterPage  = lazy(() => import('./pages/RegisterPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const MainPage      = lazy(() => import('./pages/MainPage'))

// ─── Full-page loading fallback ───────────────────────────
const PageLoader = () => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: 'var(--color-bg)',
  }}>
    <div style={{ textAlign: 'center' }}>
      <span className="spinner" style={{ width: '2rem', height: '2rem', color: 'var(--color-primary)' }} />
      <p style={{ marginTop: '1rem', color: 'var(--slate-500)', fontWeight: 500 }}>Жүктелуде…</p>
    </div>
  </div>
)

// ─── App ──────────────────────────────────────────────────
const App = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public routes */}
        <Route path="/"         element={<PublicPage />} />
        <Route path="/login"    element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/main" element={<MainPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

export default App