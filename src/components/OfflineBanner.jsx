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
      top: 'env(safe-area-inset-top)',
      left: 0, right: 0,
      zIndex: 9999,
      background: 'rgba(26,23,20,0.88)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      color: 'white',
      textAlign: 'center',
      padding: '10px 16px',
      fontSize: '0.78rem',
      fontWeight: 600,
      letterSpacing: '0.01em',
    }}>
      📵 Hors ligne — données en cache
    </div>
  )
}
