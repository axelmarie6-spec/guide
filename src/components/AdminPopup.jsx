import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useT } from '../context/ThemeContext'

export default function AdminPopup({ onClose }) {
  const { initials, displayName } = useAuth()
  const navigate = useNavigate()
  const { dm } = useT()

  function go(path) {
    onClose()
    navigate(path)
  }

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, zIndex: 200,
        backgroundColor: 'rgba(26,23,20,0.38)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
      }} />
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 500, zIndex: 201,
        background: dm ? 'rgba(20,18,16,0.97)' : 'rgba(250,249,247,0.97)',
        backdropFilter: 'blur(40px) saturate(180%)',
        WebkitBackdropFilter: 'blur(40px) saturate(180%)',
        borderRadius: '28px 28px 0 0',
        border: dm ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(255,255,255,0.85)',
        borderBottom: 'none',
        boxShadow: dm ? '0 -4px 32px rgba(0,0,0,0.40)' : '0 -4px 32px rgba(26,23,20,0.10)',
        padding: '16px 20px',
        paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: dm ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.14)', margin: '0 auto 20px' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            background: 'var(--ink)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--sand-50)', fontWeight: 700, fontSize: '1.05rem',
            letterSpacing: '-0.01em', flexShrink: 0,
          }}>{initials}</div>
          <div>
            <p style={{ fontWeight: 700, fontSize: '1.05rem', margin: 0 }}>{displayName}</p>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: '2px 0 0' }}>Administrateur</p>
          </div>
        </div>

        <p style={{
          fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em',
          textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 8,
        }}>Administration</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
          {[
            { label: '👥 Utilisateurs', tab: 'users' },
            { label: '🗂️ Activités', tab: 'activities' },
            { label: '🗳️ Votes', tab: 'votes' },
          ].map(({ label, tab }) => (
            <button key={tab} onClick={() => go(`/admin?tab=${tab}`)} style={{
              width: '100%', textAlign: 'left', padding: '13px 16px', borderRadius: '16px',
              background: 'rgba(26,23,20,0.04)', border: 'none', cursor: 'pointer',
              fontSize: '0.925rem', fontWeight: 500, color: 'var(--text-primary)',
              fontFamily: 'inherit',
            }}>{label}</button>
          ))}
        </div>

        <div style={{ height: '1px', backgroundColor: dm ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)', margin: '4px 0 12px' }} />

        <button onClick={() => go('/profil')} style={{
          width: '100%', textAlign: 'left', padding: '13px 16px', borderRadius: '16px',
          background: 'rgba(26,23,20,0.04)', border: 'none', cursor: 'pointer',
          fontSize: '0.925rem', fontWeight: 500, color: 'var(--text-primary)',
          fontFamily: 'inherit',
        }}>👤 Mon profil</button>
      </div>
    </>
  )
}
