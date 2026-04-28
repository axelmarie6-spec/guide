import { Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute, AuthRoute, GuestRoute } from './components/ProtectedRoute'
import BottomBar from './components/BottomBar'
import AujourdHui from './pages/AujourdHui'
import Explorer from './pages/Explorer'
import Voyage from './pages/Voyage'
import CoffreFort from './pages/CoffreFort'
import Profil from './pages/Profil'
import Admin from './pages/Admin'
import Login from './pages/Login'
import Register from './pages/Register'
import { useAuth } from './context/AuthContext'

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

export default function App() {
  return (
    <div className="min-h-screen" style={{ color: 'var(--text-primary)' }}>
      <Routes>
        <Route path="/login"          element={<GuestRoute><Login /></GuestRoute>} />
        <Route path="/invite/:token"  element={<GuestRoute><Register /></GuestRoute>} />

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
  )
}
