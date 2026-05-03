import { createContext, useContext, useState, useEffect } from 'react'

export const LIGHT = {
  appBg: 'linear-gradient(160deg,#f5f1ea 0%,#ede8df 50%,#e8e2d8 100%)',
  iosBg: '#ede8e0', bodyBg: '#e8e3d9',
  glassBg: 'rgba(255,255,255,0.65)', glassBorder: 'rgba(255,255,255,0.75)',
  glassShadow: '0 2px 16px rgba(26,23,20,0.06), inset 0 1px 0 rgba(255,255,255,0.9)',
  navBg: 'rgba(250,249,247,0.75)', navBorder: 'rgba(255,255,255,0.6)',
  navShadow: '0 8px 32px rgba(26,23,20,0.12), inset 0 1px 0 rgba(255,255,255,0.8)',
  navActive: 'rgba(26,23,20,0.08)',
  p: '#1a1714', s: '#6b6560', t: '#b0aaa3',
  surf1: 'rgba(26,23,20,0.05)', surf2: 'rgba(26,23,20,0.09)', surf3: 'rgba(26,23,20,0.14)',
  divider: 'rgba(26,23,20,0.06)', cardBg: 'rgba(255,255,255,0.88)',
  cardBorder: 'rgba(26,23,20,0.07)', inputBg: 'rgba(255,255,255,0.55)',
  b1: '#fde68a', b2: '#93c5fd', b3: '#86efac',
  statusBar: 'dark', invertBtn: 'rgba(26,23,20,0.08)', sosOverlay: 'rgba(10,6,4,0.93)',
}

export const DARK = {
  appBg: 'linear-gradient(160deg,#0f0e0d 0%,#161412 50%,#1c1916 100%)',
  iosBg: '#0f0e0d', bodyBg: '#080706',
  glassBg: 'rgba(30,25,20,0.78)', glassBorder: 'rgba(255,255,255,0.08)',
  glassShadow: '0 2px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
  navBg: 'rgba(12,10,8,0.9)', navBorder: 'rgba(255,255,255,0.08)',
  navShadow: '0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
  navActive: 'rgba(255,255,255,0.10)',
  p: '#f0ece6', s: '#9a938c', t: '#4a4540',
  surf1: 'rgba(255,255,255,0.05)', surf2: 'rgba(255,255,255,0.09)', surf3: 'rgba(255,255,255,0.14)',
  divider: 'rgba(255,255,255,0.06)', cardBg: 'rgba(30,24,18,0.9)',
  cardBorder: 'rgba(255,255,255,0.07)', inputBg: 'rgba(255,255,255,0.06)',
  b1: '#78350f', b2: '#1e3a5f', b3: '#064e3b',
  statusBar: 'light', invertBtn: 'rgba(255,255,255,0.10)', sosOverlay: 'rgba(3,2,1,0.96)',
}

export const G = T => ({
  background: T.glassBg,
  backdropFilter: 'blur(20px) saturate(1.6)',
  WebkitBackdropFilter: 'blur(20px) saturate(1.6)',
  border: '1px solid ' + T.glassBorder,
  boxShadow: T.glassShadow,
})

const ThemeCtx = createContext({ dm: false, T: LIGHT, toggle: () => {} })

export const useT = () => useContext(ThemeCtx)

export function ThemeProvider({ children }) {
  const [dm, setDm] = useState(() => {
    try { return localStorage.getItem('th_dm') === '1' } catch { return false }
  })

  const toggle = () => setDm(d => {
    const next = !d
    try { localStorage.setItem('th_dm', next ? '1' : '0') } catch {}
    return next
  })

  useEffect(() => {
    const T = dm ? DARK : LIGHT
    document.body.style.background = T.bodyBg
    document.documentElement.classList.toggle('dark', dm)
  }, [dm])

  return (
    <ThemeCtx.Provider value={{ dm, T: dm ? DARK : LIGHT, toggle }}>
      {children}
    </ThemeCtx.Provider>
  )
}
