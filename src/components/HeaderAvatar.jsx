import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function HeaderAvatar({ style = {} }) {
  const { profile } = useAuth()
  const navigate = useNavigate()

  const first = profile?.first_name || profile?.pseudo || '?'
  const last = profile?.last_name || ''
  const initials = (`${first[0] || ''}${last[0] || ''}`).toUpperCase() || '?'

  return (
    <button
      onClick={() => navigate('/profil')}
      style={{
        width: 34, height: 34, borderRadius: '50%',
        background: 'var(--ink)',
        border: '2px solid rgba(255,255,255,0.82)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 700, fontSize: '0.62rem', color: 'var(--sand-50)',
        cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit',
        boxShadow: '0 2px 8px rgba(26,23,20,0.14)',
        letterSpacing: '0.01em',
        ...style,
      }}
    >
      {initials}
    </button>
  )
}
