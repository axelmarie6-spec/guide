import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

const TRIP_START = new Date('2026-08-01T00:00:00')
const TRIP_DAYS = 22

// ── Helpers ───────────────────────────────────────────────────

function getDayInfo() {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const diffMs = now - TRIP_START
  const diff = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diff < 0) return { status: 'before', daysUntil: Math.abs(diff) }
  if (diff >= TRIP_DAYS) return { status: 'after' }
  return { status: 'during', day: diff + 1, daysLeft: TRIP_DAYS - diff }
}

function fmt(n, decimals = 2) {
  return Number(n).toFixed(decimals)
}

// ── Currency hook ─────────────────────────────────────────────

function useCurrencies() {
  const [rates, setRates] = useState(null)
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    fetch('https://api.frankfurter.app/latest?from=EUR&to=CZK,HUF,CHF')
      .then(r => r.json())
      .then(d => setRates(d.rates))
      .catch(() => setOffline(true))
  }, [])

  return { rates, offline }
}

// ── Train hook ────────────────────────────────────────────────

function useNextTrain() {
  const [train, setTrain] = useState(undefined)

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    supabase
      .from('trains')
      .select('*')
      .gte('date', today)
      .order('date', { ascending: true })
      .order('leg_order', { ascending: true })
      .limit(1)
      .single()
      .then(({ data }) => setTrain(data ?? null))
      .catch(() => setTrain(null))
  }, [])

  return train
}

// ── Cards ─────────────────────────────────────────────────────

function Card({ children, style }) {
  return (
    <div className="card" style={{ padding: '18px 20px', ...style }}>
      {children}
    </div>
  )
}

function CardLabel({ children }) {
  return (
    <p style={{
      fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.07em',
      textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 10,
    }}>{children}</p>
  )
}

function TrainCard({ train }) {
  if (train === undefined) {
    return (
      <Card>
        <CardLabel>Prochain train</CardLabel>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
          <div style={{
            width: 20, height: 20, borderRadius: '50%',
            border: '2px solid var(--sky)', borderTopColor: 'transparent',
            animation: 'spin 0.7s linear infinite',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </Card>
    )
  }

  if (!train) {
    return (
      <Card>
        <CardLabel>Prochain train</CardLabel>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Aucun trajet prévu</p>
      </Card>
    )
  }

  const dateStr = new Date(train.date + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  return (
    <Card style={{ background: 'linear-gradient(135deg, rgba(74,144,217,0.08) 0%, rgba(255,255,255,0.85) 60%)' }}>
      <CardLabel>Prochain train</CardLabel>
      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 10 }}>
        {dateStr}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 800, fontSize: '1.05rem', margin: 0, lineHeight: 1.2 }}>
            {train.from_station}
          </p>
          {train.departure_time && (
            <p style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--sky)', margin: '4px 0 0', lineHeight: 1 }}>
              {train.departure_time.slice(0, 5)}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 12px' }}>
          <svg viewBox="0 0 40 12" fill="none" style={{ width: 48 }}>
            <path d="M0 6 H34" stroke="var(--text-tertiary)" strokeWidth="1.5" />
            <path d="M30 2 L38 6 L30 10" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
        </div>

        <div style={{ flex: 1, textAlign: 'right' }}>
          <p style={{ fontWeight: 800, fontSize: '1.05rem', margin: 0, lineHeight: 1.2 }}>
            {train.to_station}
          </p>
          {train.arrival_time && (
            <p style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--sky)', margin: '4px 0 0', lineHeight: 1 }}>
              {train.arrival_time.slice(0, 5)}
            </p>
          )}
        </div>
      </div>
      {train.platform && (
        <p style={{
          marginTop: 12, fontSize: '0.75rem', fontWeight: 600,
          color: 'var(--sky)', backgroundColor: 'rgba(74,144,217,0.10)',
          display: 'inline-block', padding: '3px 10px', borderRadius: '20px',
        }}>Voie {train.platform}</p>
      )}
      {train.notes && (
        <p style={{ marginTop: 8, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          {train.notes}
        </p>
      )}
    </Card>
  )
}

function WeatherCard() {
  return (
    <Card style={{ background: 'linear-gradient(135deg, rgba(232,160,48,0.10) 0%, rgba(255,255,255,0.85) 60%)' }}>
      <CardLabel>Météo locale</CardLabel>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{ fontSize: '2.4rem', lineHeight: 1 }}>☀️</span>
        <div>
          <p style={{ fontWeight: 800, fontSize: '1.6rem', margin: 0, lineHeight: 1 }}>— °C</p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            Disponible bientôt
          </p>
        </div>
      </div>
    </Card>
  )
}

function CurrencyCard({ rates, offline }) {
  const pairs = [
    { code: 'CZK', flag: '🇨🇿', name: 'Couronne tchèque' },
    { code: 'HUF', flag: '🇭🇺', name: 'Forint hongrois' },
    { code: 'CHF', flag: '🇨🇭', name: 'Franc suisse' },
  ]

  return (
    <Card>
      <CardLabel>Devises · 1 EUR =</CardLabel>
      {offline && (
        <p style={{ fontSize: '0.72rem', color: 'var(--snooze)', marginBottom: 8 }}>
          Hors ligne — données non disponibles
        </p>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {pairs.map(({ code, flag, name }, i) => (
          <div key={code}>
            {i > 0 && <div style={{ height: '1px', backgroundColor: 'rgba(0,0,0,0.06)' }} />}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: '1.3rem' }}>{flag}</span>
                <div>
                  <p style={{ fontWeight: 600, fontSize: '0.875rem', margin: 0 }}>{code}</p>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: 0 }}>{name}</p>
                </div>
              </div>
              <p style={{ fontWeight: 700, fontSize: '1rem', color: rates ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                {rates ? fmt(rates[code], code === 'CHF' ? 4 : 0) : '—'}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

function TimelineCard() {
  return (
    <Card>
      <CardLabel>Activités du jour</CardLabel>
      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
        La timeline sera disponible pendant le voyage.
      </p>
    </Card>
  )
}

// ── Composant principal ───────────────────────────────────────

export default function AujourdHui() {
  const { profile } = useAuth()
  const dayInfo = getDayInfo()
  const { rates, offline } = useCurrencies()
  const train = useNextTrain()

  const firstName = profile?.first_name || profile?.pseudo || ''

  return (
    <div style={{ padding: '28px 16px 8px' }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
          Bonjour {firstName} 👋
        </h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: 6 }}>
          {dayInfo.status === 'before' && (
            <>J&#8209;{dayInfo.daysUntil} avant le grand départ</>
          )}
          {dayInfo.status === 'during' && (
            <>Jour {dayInfo.day} du voyage · {dayInfo.daysLeft} jour{dayInfo.daysLeft > 1 ? 's' : ''} restant{dayInfo.daysLeft > 1 ? 's' : ''}</>
          )}
          {dayInfo.status === 'after' && (
            <>Le voyage est terminé — quels souvenirs ! 🎉</>
          )}
        </p>
      </div>

      {/* Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <TrainCard train={train} />
        <WeatherCard />
        <CurrencyCard rates={rates} offline={offline} />
        {dayInfo.status === 'during' && <TimelineCard />}
      </div>

    </div>
  )
}
