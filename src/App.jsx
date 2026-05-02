import { useState, useEffect, lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { ProtectedRoute, AuthRoute, GuestRoute } from './components/ProtectedRoute'
import BottomBar from './components/BottomBar'
import OfflineBanner from './components/OfflineBanner'
import AujourdHui from './pages/AujourdHui'
import { useAuth } from './context/AuthContext'
import { prefetchAllPdfs } from './lib/pdfCache'
import TutorialOverlay from './components/TutorialOverlay'
import RouteAnimation, { ROUTE_INTRO_KEY } from './components/RouteAnimation'

const Explorer   = lazy(() => import('./pages/Explorer'))
const Voyage     = lazy(() => import('./pages/Voyage'))
const CoffreFort = lazy(() => import('./pages/CoffreFort'))
const Profil     = lazy(() => import('./pages/Profil'))
const Admin      = lazy(() => import('./pages/Admin'))
const Login      = lazy(() => import('./pages/Login'))
const Register   = lazy(() => import('./pages/Register'))
const Oracle     = lazy(() => import('./pages/Oracle'))

function AdminRoute({ children }) {
  const { profile, loading } = useAuth()
  if (loading) return null
  if (!profile || profile.role !== 'admin') return <Navigate to="/" replace />
  return children
}

function PageLoader() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
      <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2.5px solid var(--text-tertiary)', borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite' }} />
    </div>
  )
}

function WithNav({ children }) {
  const { pathname } = useLocation()
  const isOracle = pathname === '/oracle'
  return (
    <>
      <div key={pathname} className="page-flash" />
      {/* Oracle gère son propre padding bas (input bar fixe au-dessus de la BottomBar) */}
      <main className={`${isOracle ? 'pb-40' : 'pb-28'} max-w-lg mx-auto`}>
        <Suspense fallback={<PageLoader />}>{children}</Suspense>
      </main>
      <BottomBar />
    </>
  )
}

function BackgroundBlobs() {
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', top: '-20%', right: '-10%',
        width: '65vw', height: '65vw', maxWidth: 440,
        background: 'radial-gradient(circle, rgba(232,160,48,0.20) 0%, transparent 70%)',
        borderRadius: '50%', filter: 'blur(48px)',
      }} />
      <div style={{
        position: 'absolute', top: '35%', left: '-15%',
        width: '55vw', height: '55vw', maxWidth: 380,
        background: 'radial-gradient(circle, rgba(74,144,217,0.15) 0%, transparent 70%)',
        borderRadius: '50%', filter: 'blur(48px)',
      }} />
      <div style={{
        position: 'absolute', bottom: '-10%', right: '15%',
        width: '50vw', height: '50vw', maxWidth: 340,
        background: 'radial-gradient(circle, rgba(59,170,122,0.13) 0%, transparent 70%)',
        borderRadius: '50%', filter: 'blur(48px)',
      }} />
    </div>
  )
}

export default function App() {
  const { user } = useAuth()
  const [showRouteAnim, setShowRouteAnim] = useState(false)

  // Restore dark mode preference before first paint
  useEffect(() => {
    if (localStorage.getItem('theme') === 'dark') {
      document.documentElement.classList.add('dark')
    }
  }, [])

  useEffect(() => {
    if (user && !localStorage.getItem(ROUTE_INTRO_KEY)) {
      setShowRouteAnim(true)
    }
  }, [user])

  useEffect(() => {
    window.__resetRouteIntro = () => {
      localStorage.removeItem(ROUTE_INTRO_KEY)
      setShowRouteAnim(true)
    }
    return () => { delete window.__resetRouteIntro }
  }, [])

  useEffect(() => {
    if (user) prefetchAllPdfs()
  }, [user])

  return (
    <div style={{ minHeight: '100dvh', color: 'var(--text-primary)', position: 'relative' }}>
      {showRouteAnim && <RouteAnimation onDone={() => setShowRouteAnim(false)} />}
      <OfflineBanner />
      <BackgroundBlobs />
      <TutorialOverlay />
      <div style={{ position: 'relative' }}>
        <Routes>
          <Route path="/login"         element={<GuestRoute><Login /></GuestRoute>} />
          <Route path="/invite/:token" element={<GuestRoute><Register /></GuestRoute>} />

          <Route path="/profil" element={
            <AuthRoute><WithNav><Profil /></WithNav></AuthRoute>
          } />

          <Route path="/" element={
            <ProtectedRoute><WithNav><AujourdHui /></WithNav></ProtectedRoute>
          } />
          <Route path="/explorer" element={
            <ProtectedRoute><WithNav><Explorer /></WithNav></ProtectedRoute>
          } />
          <Route path="/voyage" element={
            <ProtectedRoute><WithNav><Voyage /></WithNav></ProtectedRoute>
          } />
          <Route path="/coffre-fort" element={
            <ProtectedRoute><WithNav><CoffreFort /></WithNav></ProtectedRoute>
          } />
          <Route path="/oracle" element={
            <ProtectedRoute><WithNav><Oracle /></WithNav></ProtectedRoute>
          } />
          <Route path="/admin" element={
            <AuthRoute><AdminRoute><WithNav><Admin /></WithNav></AdminRoute></AuthRoute>
          } />
        </Routes>
      </div>
    </div>
  )
}
