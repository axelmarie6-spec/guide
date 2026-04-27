import { Routes, Route } from 'react-router-dom'
import { ProtectedRoute, AuthRoute, GuestRoute } from './components/ProtectedRoute'
import BottomBar from './components/BottomBar'
import AujourdHui from './pages/AujourdHui'
import Explorer from './pages/Explorer'
import CoffreFort from './pages/CoffreFort'
import Profil from './pages/Profil'
import Login from './pages/Login'
import Register from './pages/Register'

function WithNav({ children }) {
  return (
    <>
      {/* pb-28 = 112px pour laisser place à la pill flottante (64px) + 16px bottom + marge */}
      <main className="pb-28 max-w-lg mx-auto">{children}</main>
      <BottomBar />
    </>
  )
}

export default function App() {
  return (
    <div className="min-h-screen" style={{ color: 'var(--text-primary)' }}>
      <Routes>
        {/* Pages publiques — redirigent vers / si déjà connecté */}
        <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
        <Route path="/invite/:token" element={<GuestRoute><Register /></GuestRoute>} />

        {/* Profil : auth requise, profil incomplet accepté (c'est ici qu'on le complète) */}
        <Route path="/profil" element={
          <AuthRoute>
            <WithNav><Profil /></WithNav>
          </AuthRoute>
        } />

        {/* Onglets principaux : auth + profil complet obligatoire */}
        <Route path="/" element={<ProtectedRoute><WithNav><AujourdHui /></WithNav></ProtectedRoute>} />
        <Route path="/explorer" element={<ProtectedRoute><WithNav><Explorer /></WithNav></ProtectedRoute>} />
        <Route path="/coffre-fort" element={<ProtectedRoute><WithNav><CoffreFort /></WithNav></ProtectedRoute>} />
      </Routes>
    </div>
  )
}
