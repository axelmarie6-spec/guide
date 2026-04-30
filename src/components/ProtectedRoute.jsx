import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-base)' }}>
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
    </div>
  )
}

function BannedScreen() {
  const { signOut } = useAuth()
  return (
    <div style={{
      minHeight: '100dvh', background: '#080808',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '0 32px', textAlign: 'center',
    }}>
      <div style={{ fontSize: '2.8rem', marginBottom: 20 }}>🚫</div>
      <h1 style={{ color: 'white', fontWeight: 800, fontSize: '1.4rem', margin: '0 0 10px', letterSpacing: '-0.02em' }}>
        Accès révoqué
      </h1>
      <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: '0.875rem', margin: '0 0 36px', lineHeight: 1.6, maxWidth: 280 }}>
        Ton accès à l'app a été désactivé par un administrateur.
      </p>
      <button onClick={signOut} style={{
        padding: '12px 28px', borderRadius: '14px',
        background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)',
        color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', fontWeight: 600,
        cursor: 'pointer', fontFamily: 'inherit',
      }}>
        Se déconnecter
      </button>
    </div>
  )
}

// Requiert auth + profil complet (onglets principaux)
export function ProtectedRoute({ children }) {
  const { user, profile, loading, isProfileComplete } = useAuth()
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/login" replace />
  if (profile?.banned) return <BannedScreen />
  if (!isProfileComplete) return <Navigate to="/profil" replace />
  return children
}

// Requiert uniquement auth (page Profil elle-même)
export function AuthRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/login" replace />
  return children
}

// Redirige vers '/' si déjà connecté (pages login/register)
export function GuestRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />
  if (user) return <Navigate to="/" replace />
  return children
}
