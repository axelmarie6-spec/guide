import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AdminPopup from './AdminPopup'

const TABS = [
  {
    path: '/',
    label: 'Auj.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-[22px] h-[22px]">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M2.25 12l8.954-8.955a1.5 1.5 0 012.092 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
  },
  {
    path: '/explorer',
    label: 'Explorer',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-[22px] h-[22px]">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
      </svg>
    ),
  },
  {
    path: '/voyage',
    label: 'Voyage',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-[22px] h-[22px]">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
      </svg>
    ),
  },
  {
    path: '/coffre-fort',
    label: 'Coffre',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-[22px] h-[22px]">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
  },
]


export default function BottomBar() {
  const { profile, initials, displayName } = useAuth()
  const navigate = useNavigate()
  const isAdmin = profile?.role === 'admin'
  const [adminOpen, setAdminOpen] = useState(false)

  function handleAvatar() {
    if (isAdmin) setAdminOpen(true)
    else navigate('/profil')
  }

  return (
    <>
      {adminOpen && <AdminPopup onClose={() => setAdminOpen(false)} />}

      <nav style={{
        position: 'fixed', bottom: '16px', left: '50%', transform: 'translateX(-50%)',
        width: 'calc(100% - 32px)', maxWidth: '480px',
        background: 'var(--glass-bar)',
        backdropFilter: 'blur(32px) saturate(180%)',
        WebkitBackdropFilter: 'blur(32px) saturate(180%)',
        borderRadius: '26px',
        border: '1px solid rgba(255,255,255,0.9)',
        boxShadow: '0 1px 0 rgba(255,255,255,1) inset, 0 8px 32px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.06)',
        display: 'flex',
        padding: '6px',
        zIndex: 50,
      }}>
        {TABS.map(({ path, label, icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            style={({ isActive }) => ({
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', flex: 1, padding: '8px 2px', gap: '3px',
              fontSize: '9px', fontWeight: isActive ? 600 : 400,
              fontFamily: 'inherit',
              color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
              borderRadius: '20px',
              background: isActive ? 'var(--accent-light)' : 'transparent',
              transition: 'all 0.18s', textDecoration: 'none',
            })}
          >
            {icon}
            <span>{label}</span>
          </NavLink>
        ))}

        <button onClick={handleAvatar} style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', flex: 1, padding: '8px 2px', gap: '4px',
          background: 'transparent', border: 'none', cursor: 'pointer',
          fontFamily: 'inherit',
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: 'var(--ink)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--sand-50)', fontWeight: 700, fontSize: '0.65rem',
            letterSpacing: '-0.01em',
          }}>{initials}</div>
          <span style={{ fontSize: '9px', color: 'var(--text-secondary)', fontWeight: 400 }}>
            {isAdmin ? 'Admin' : 'Moi'}
          </span>
        </button>
      </nav>
    </>
  )
}
