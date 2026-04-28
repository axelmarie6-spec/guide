import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AdminPopup from './AdminPopup'

export default function HeaderAvatar({ style = {} }) {
  const { profile, initials } = useAuth()
  const navigate = useNavigate()
  const isAdmin = profile?.role === 'admin'
  const [popupOpen, setPopupOpen] = useState(false)

  function handleClick() {
    if (isAdmin) setPopupOpen(true)
    else navigate('/profil')
  }

  return (
    <>
      <button
        onClick={handleClick}
        style={{
          width: 38, height: 38, borderRadius: '50%',
          background: 'var(--ink)',
          border: '2px solid rgba(255,255,255,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: '0.68rem', color: 'var(--sand-50)',
          cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit',
          boxShadow: '0 2px 8px rgba(26,23,20,0.14)',
          letterSpacing: '0.01em',
          ...style,
        }}
      >
        {initials}
      </button>

      {popupOpen && <AdminPopup onClose={() => setPopupOpen(false)} />}
    </>
  )
}
