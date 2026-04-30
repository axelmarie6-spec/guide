import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute, AuthRoute, GuestRoute } from './components/ProtectedRoute'
import BottomBar from './components/BottomBar'
import OfflineBanner from './components/OfflineBanner'
import AujourdHui from './pages/AujourdHui'
import Explorer from './pages/Explorer'
import Voyage from './pages/Voyage'
import CoffreFort from './pages/CoffreFort'
import Profil from './pages/Profil'
import Admin from './pages/Admin'
import Login from './pages/Login'
import Register from './pages/Register'
import { useAuth } from './context/AuthContext'
import { prefetchAllPdfs } from './lib/pdfCache'
import TutorialOverlay from './components/TutorialOverlay'

function AdminRoute({ children }) {
  const { profile, loading } = useAuth()
  if (loading) return null
  if (!profile || profile.role !== 'admin') return <Navigate to="/" replace />
  return children
}

function WithNav({ children }) {
  return (
    <>
      <main className="pb-28 max-w-lg mx-auto">{children}</main>
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

  useEffect(() => {
    if (user) prefetchAllPdfs()
  }, [user])

  return (
    <div style={{ minHeight: '100dvh', color: 'var(--text-primary)', position: 'relative' }}>
      <OfflineBanner />
      <BackgroundBlobs />
      <TutorialOverlay />
      <div style={{ position: 'relative', zIndex: 1 }}>
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
          <Route path="/admin" element={
            <AuthRoute><AdminRoute><WithNav><Admin /></WithNav></AdminRoute></AuthRoute>
          } />
        </Routes>
      </div>
    </div>
  )
}
