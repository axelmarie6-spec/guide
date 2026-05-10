import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { CITY_SCHEDULE } from '../lib/travel'
import { useT } from '../context/ThemeContext'

const ANIM_CSS = `
@keyframes confetti-fly {
  0%   { transform: translate(0,0) rotate(0deg); opacity: 1; }
  75%  { opacity: 1; }
  100% { transform: translate(var(--tx),var(--ty)) rotate(var(--rot)); opacity: 0; }
}
@keyframes stamp-slam {
  0%   { transform: scale(2.4) rotate(-15deg); opacity: 0; }
  55%  { transform: scale(0.92) rotate(2deg); opacity: 1; }
  75%  { transform: scale(1.04) rotate(-0.5deg); }
  100% { transform: scale(1) rotate(0deg); opacity: 1; }
}
@keyframes stamp-out {
  0%   { opacity: 1; transform: scale(1); }
  100% { opacity: 0; transform: scale(0.75); }
}
@keyframes postcard-up {
  from { transform: translateY(110%); }
  to   { transform: translateY(0); }
}
@keyframes postcard-down {
  from { transform: translateY(0); }
  to   { transform: translateY(110%); }
}
`

let cssInjected = false
function injectCss() {
  if (cssInjected) return
  const el = document.createElement('style')
  el.textContent = ANIM_CSS
  document.head.appendChild(el)
  cssInjected = true
}

const CONFETTI_COLORS = [
  '#e8603a', '#e8a030', '#4a90d9', '#3baa7a',
  '#a78bfa', '#f472b6', '#facc15', '#34d399',
]

// ── Variant 1 : Confetti ───────────────────────────────────────
function ConfettiAnim({ onDone }) {
  const particles = useMemo(() => [...Array(64)].map((_, i) => ({
    id: i,
    left: 15 + Math.random() * 70,
    bottom: 30 + Math.random() * 20,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    delay: Math.random() * 0.55,
    dur: 1.4 + Math.random() * 1.3,
    w: 6 + Math.random() * 8,
    h: 4 + Math.random() * 5,
    tx: `${(Math.random() - 0.5) * 440}px`,
    ty: `${-(120 + Math.random() * 380)}px`,
    rot: `${Math.random() * 800 - 400}deg`,
  })), [])

  useEffect(() => {
    const t = setTimeout(onDone, 3600)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 200, overflow: 'hidden' }}>
      {particles.map(p => (
        <div key={p.id} style={{
          position: 'absolute',
          left: `${p.left}%`,
          bottom: `${p.bottom}%`,
          width: p.w, height: p.h,
          borderRadius: 2,
          background: p.color,
          '--tx': p.tx,
          '--ty': p.ty,
          '--rot': p.rot,
          animation: `confetti-fly ${p.dur}s cubic-bezier(0,0.55,0.35,1) ${p.delay}s both`,
          opacity: 0,
        }} />
      ))}
    </div>
  )
}

// ── Variant 2 : Tampon passeport ───────────────────────────────
function StampAnim({ city, onDone }) {
  const [phase, setPhase] = useState('in')
  const cityInfo = CITY_SCHEDULE.find(c => c.city === city) ?? CITY_SCHEDULE[0]
  const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('out'), 2400)
    const t2 = setTimeout(onDone, 3300)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [onDone])

  return (
    <div
      onClick={onDone}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        cursor: 'pointer',
      }}
    >
      <div style={{
        width: 230, height: 230, borderRadius: '50%',
        border: '7px double rgba(190,30,30,0.8)',
        outline: '2px solid rgba(190,30,30,0.2)',
        outlineOffset: 5,
        boxShadow: 'inset 0 0 0 3px rgba(190,30,30,0.15), 0 0 50px rgba(190,30,30,0.22)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'rgba(190,30,30,0.06)',
        animation: phase === 'in'
          ? 'stamp-slam 0.45s cubic-bezier(0.2,0,0.2,1.5) both'
          : 'stamp-out 0.65s ease-in both',
        color: 'rgba(190,30,30,0.88)',
        userSelect: 'none',
      }}>
        <div style={{ fontSize: '2.6rem', lineHeight: 1, marginBottom: 3 }}>{cityInfo.flag}</div>
        <div style={{ fontSize: '0.55rem', fontWeight: 800, letterSpacing: '0.25em', textTransform: 'uppercase', opacity: 0.65 }}>
          Arrivée
        </div>
        <div style={{
          fontSize: '1.45rem', fontWeight: 800, letterSpacing: '0.06em',
          textTransform: 'uppercase', textAlign: 'center', lineHeight: 1.1,
          marginTop: 2,
        }}>
          {cityInfo.label}
        </div>
        <div style={{ fontSize: '0.58rem', fontWeight: 600, letterSpacing: '0.14em', marginTop: 8, opacity: 0.55 }}>
          {today}
        </div>
        <div style={{ fontSize: '0.52rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 3, opacity: 0.4 }}>
          Europe Tour 2026
        </div>
      </div>
    </div>
  )
}

// ── Variant 3 : Carte postale ──────────────────────────────────
function PostcardAnim({ city, onDone }) {
  const [leaving, setLeaving] = useState(false)
  const cityInfo = CITY_SCHEDULE.find(c => c.city === city) ?? CITY_SCHEDULE[0]
  const dateStr = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' })

  useEffect(() => {
    const t1 = setTimeout(() => setLeaving(true), 3600)
    const t2 = setTimeout(onDone, 4500)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [onDone])

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      pointerEvents: 'none',
    }}>
      <div
        onClick={onDone}
        style={{
          width: 'calc(100% - 32px)', maxWidth: 420,
          marginBottom: 'calc(env(safe-area-inset-bottom, 0px) + 84px)',
          background: '#faf5ed',
          borderRadius: 20,
          boxShadow: '0 24px 64px rgba(0,0,0,0.38), 0 4px 14px rgba(0,0,0,0.14)',
          border: '1px solid rgba(184,168,136,0.35)',
          padding: '20px 20px 18px',
          animation: leaving
            ? 'postcard-down 0.65s cubic-bezier(0.4,0,1,1) both'
            : 'postcard-up 0.5s cubic-bezier(0.16,1,0.3,1) both',
          pointerEvents: 'auto', cursor: 'pointer',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          paddingBottom: 13, marginBottom: 13,
          borderBottom: '1px solid rgba(184,168,136,0.28)',
        }}>
          <span style={{ fontSize: '2.6rem', lineHeight: 1 }}>{cityInfo.flag}</span>
          <div>
            <div style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#9b8060', marginBottom: 2 }}>
              Bienvenue à
            </div>
            <div style={{ fontSize: '1.55rem', fontWeight: 800, color: '#271808', letterSpacing: '-0.01em' }}>
              {cityInfo.label}
            </div>
          </div>
          {/* Faux timbre */}
          <div style={{
            marginLeft: 'auto', flexShrink: 0,
            width: 54, height: 54, borderRadius: 8,
            border: '2px solid rgba(184,168,136,0.45)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: 'rgba(232,96,58,0.07)',
            gap: 2,
          }}>
            <span style={{ fontSize: '1.5rem' }}>🚄</span>
            <span style={{ fontSize: '0.45rem', fontWeight: 700, letterSpacing: '0.1em', color: '#b8a888', textTransform: 'uppercase' }}>Arrivée</span>
          </div>
        </div>

        {/* Corps */}
        <p style={{ margin: '0 0 13px', fontSize: '0.88rem', color: '#4a3218', lineHeight: 1.65 }}>
          Vous venez d'arriver !<br />
          <span style={{ fontSize: '0.76rem', color: '#9b8060' }}>Bonne découverte et profitez bien du séjour.</span>
        </p>

        {/* Footer */}
        <div style={{
          paddingTop: 11, borderTop: '1px solid rgba(184,168,136,0.22)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: '0.63rem', color: '#c4b090', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Europe Tour 2026
          </span>
          <span style={{ fontSize: '0.63rem', color: '#c4b090' }}>{dateStr}</span>
        </div>
      </div>
    </div>
  )
}

// ── Manager ────────────────────────────────────────────────────
export default function ArrivalAnimManager() {
  const [active, setActive] = useState(null) // null | { variant: 1|2|3, city: string }

  const trigger = useCallback((variant, city) => {
    injectCss()
    setActive({ variant, city: city ?? 'bruxelles' })
  }, [])

  const dismiss = useCallback(() => setActive(null), [])

  useEffect(() => {
    injectCss()
    window.__testArrival1 = (city) => trigger(1, city ?? 'berlin')
    window.__testArrival2 = (city) => trigger(2, city ?? 'berlin')
    window.__testArrival3 = (city) => trigger(3, city ?? 'berlin')
    return () => {
      delete window.__testArrival1
      delete window.__testArrival2
      delete window.__testArrival3
    }
  }, [trigger])

  // Real trigger: fire at train arrival_time if not already shown today
  useEffect(() => {
    let cancelled = false
    let timer = null

    async function schedule() {
      const today = new Date().toISOString().slice(0, 10)
      const shownKey = `arrival_anim_shown_${today}`
      if (localStorage.getItem(shownKey)) return

      const { data: trains } = await supabase
        .from('trains')
        .select('arrival_time, date')
        .eq('date', today)
        .not('arrival_time', 'is', null)
        .limit(1)

      if (cancelled || !trains?.length) return
      const [h, m] = trains[0].arrival_time.split(':').map(Number)
      const arrivalMs = new Date().setHours(h, m, 0, 0)
      const delay = arrivalMs - Date.now()

      // Find which city we arrive at today (city whose 'from' === today)
      const arrivingCity = CITY_SCHEDULE.find(c => c.from === today)?.city ?? 'bruxelles'

      const fire = () => {
        if (cancelled) return
        localStorage.setItem(shownKey, '1')
        trigger(1, arrivingCity)
      }

      if (delay <= 0) {
        fire()
      } else {
        timer = setTimeout(fire, delay)
      }
    }

    schedule()
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [trigger])

  if (!active) return null
  if (active.variant === 1) return <ConfettiAnim onDone={dismiss} />
  if (active.variant === 2) return <StampAnim city={active.city} onDone={dismiss} />
  if (active.variant === 3) return <PostcardAnim city={active.city} onDone={dismiss} />
  return null
}
