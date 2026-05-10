import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { CITY_SCHEDULE } from '../lib/travel'

// ── Full-screen arrival screen ─────────────────────────────────
function ArrivalScreen({ city, onDone }) {
  const cityInfo = CITY_SCHEDULE.find(c => c.city === city) ?? CITY_SCHEDULE[0]

  const from  = new Date(cityInfo.from)
  const to    = new Date(cityInfo.to)
  const nights = Math.round((to - from) / 86400000)
  const toStr  = to.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: '#0f0d0b',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '0 24px',
    }}>
      <style>{`
        @keyframes aa-fade {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes aa-up {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes aa-pop {
          0%   { transform: scale(0) rotate(-18deg); opacity: 0; }
          60%  { transform: scale(1.18) rotate(4deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes aa-line {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }
        @keyframes aa-glow {
          0%, 100% { opacity: 0.45; }
          50%      { opacity: 0.9; }
        }
        @keyframes aa-ring {
          0%   { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(3); opacity: 0; }
        }
      `}</style>

      {/* Ambient glow */}
      <div style={{
        position: 'absolute', top: '38%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 340, height: 340, borderRadius: '50%',
        background: 'rgba(232,160,48,0.07)',
        filter: 'blur(64px)',
        animation: 'aa-glow 3.5s ease-in-out 0.6s infinite',
        pointerEvents: 'none',
      }} />

      {/* Badge */}
      <p style={{
        fontSize: '0.65rem', fontWeight: 800,
        letterSpacing: '0.24em', textTransform: 'uppercase',
        color: 'rgba(232,160,48,0.65)', margin: '0 0 22px',
        animation: 'aa-up 0.55s ease 0.2s both',
      }}>
        Arrivée
      </p>

      {/* Flag + pulse rings */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
        <div style={{
          position: 'absolute',
          width: 80, height: 80, borderRadius: '50%',
          border: '2px solid rgba(232,160,48,0.3)',
          animation: 'aa-ring 2s ease-out 1.4s infinite',
        }} />
        <div style={{
          position: 'absolute',
          width: 80, height: 80, borderRadius: '50%',
          border: '2px solid rgba(232,160,48,0.2)',
          animation: 'aa-ring 2s ease-out 1.9s infinite',
        }} />
        <div style={{
          fontSize: '5.5rem', lineHeight: 1,
          animation: 'aa-pop 0.52s cubic-bezier(0.34,1.56,0.64,1) 0.55s both',
        }}>
          {cityInfo.flag}
        </div>
      </div>

      {/* City name */}
      <h1 style={{
        fontSize: '2.9rem', fontWeight: 800,
        color: 'rgba(255,255,255,0.93)',
        margin: 0, letterSpacing: '-0.03em', textAlign: 'center',
        animation: 'aa-up 0.55s ease 0.85s both',
      }}>
        {cityInfo.label}
      </h1>

      {/* Amber line */}
      <div style={{
        width: 72, height: 2, borderRadius: 1,
        background: 'rgba(232,160,48,0.55)',
        margin: '20px 0 0',
        transformOrigin: 'left center',
        animation: 'aa-line 0.45s ease 1.2s both',
      }} />

      {/* Stay info */}
      <p style={{
        fontSize: '0.88rem', color: 'rgba(255,255,255,0.38)',
        margin: '14px 0 0', letterSpacing: '0.02em',
        animation: 'aa-up 0.5s ease 1.45s both',
      }}>
        {nights} nuit{nights > 1 ? 's' : ''} · jusqu'au {toStr}
      </p>

      {/* CTA */}
      <button
        onClick={onDone}
        style={{
          marginTop: 40,
          padding: '13px 36px', borderRadius: '24px',
          background: 'rgba(232,160,48,0.14)',
          border: '1.5px solid rgba(232,160,48,0.45)',
          color: 'rgba(232,160,48,0.95)',
          fontSize: '1rem', fontWeight: 700, cursor: 'pointer',
          fontFamily: 'inherit', letterSpacing: '0.01em',
          animation: 'aa-up 0.6s ease 2s both',
        }}
      >
        C'est parti →
      </button>

      {/* Skip */}
      <button
        onClick={onDone}
        style={{
          position: 'absolute', top: 20, right: 20,
          padding: '7px 16px', borderRadius: '14px',
          background: 'rgba(255,255,255,0.07)', border: 'none',
          color: 'rgba(255,255,255,0.32)', fontSize: '0.78rem',
          cursor: 'pointer', fontFamily: 'inherit',
          animation: 'aa-fade 0.5s ease 0.5s both',
        }}
      >
        Passer
      </button>
    </div>
  )
}

// ── Manager ────────────────────────────────────────────────────
export default function ArrivalAnimManager() {
  const [activeCity, setActiveCity] = useState(null)

  const trigger = useCallback((city) => {
    setActiveCity(city ?? 'bruxelles')
  }, [])

  const dismiss = useCallback(() => setActiveCity(null), [])

  // Test hooks for admin panel
  useEffect(() => {
    window.__testArrival = (city) => trigger(city ?? 'berlin')
    return () => { delete window.__testArrival }
  }, [trigger])

  // Real trigger: fires at train arrival_time, once per day
  useEffect(() => {
    let cancelled = false
    let timer = null

    async function schedule() {
      const today = new Date().toISOString().slice(0, 10)
      const shownKey = `arrival_anim_shown_${today}`
      if (localStorage.getItem(shownKey)) return

      const { data: trains } = await supabase
        .from('trains')
        .select('arrival_time')
        .eq('date', today)
        .not('arrival_time', 'is', null)
        .limit(1)

      if (cancelled || !trains?.length) return

      const [h, m] = trains[0].arrival_time.split(':').map(Number)
      const arrivalMs = new Date().setHours(h, m, 0, 0)
      const delay = arrivalMs - Date.now()

      // City whose 'from' date is today = the city we're arriving in
      const arrivingCity = CITY_SCHEDULE.find(c => c.from === today)?.city ?? 'bruxelles'

      const fire = () => {
        if (cancelled) return
        localStorage.setItem(shownKey, '1')
        trigger(arrivingCity)
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

  if (!activeCity) return null
  return <ArrivalScreen city={activeCity} onDone={dismiss} />
}
