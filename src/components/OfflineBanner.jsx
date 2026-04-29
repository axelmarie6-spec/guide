import { useState, useEffect } from 'react'

export default function OfflineBanner() {
  const [online, setOnline] = useState(navigator.onLine)

  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  if (online) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: 'calc(16px + 62px + 10px)',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 9999,
      background: 'rgba(26,23,20,0.88)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      color: 'white',
      padding: '7px 16px',
      borderRadius: '20px',
      fontSize: '0.75rem',
      fontWeight: 600,
      whiteSpace: 'nowrap',
      pointerEvents: 'none',
    }}>
      📵 Hors ligne
    </div>
  )
}
