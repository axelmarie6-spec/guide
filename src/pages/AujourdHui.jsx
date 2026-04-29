import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { getCurrentCity } from '../lib/travel'
import HeaderAvatar from '../components/HeaderAvatar'
import { readCache, writeCache } from '../lib/dbCache'

const TRIP_START = new Date('2026-08-01T00:00:00')
const TRIP_DAYS = 22
const OWM_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY
const WEATHER_CACHE_KEY = 'weather_cache_v5'

// OWM city query fallback (GPS denied)
const CITY_OWM_QUERY = {
  bruxelles: 'Brussels,BE',
  amsterdam: 'Amsterdam,NL',
  berlin: 'Berlin,DE',
  prague: 'Prague,CZ',
  budapest: 'Budapest,HU',
  vienne: 'Vienna,AT',
  geneve: 'Geneva,CH',
}

// Open-Meteo coords fallback (GPS denied) — used for daily min/max
const CITY_COORDS = {
  bruxelles: { lat: 50.85, lon: 4.35 },
  amsterdam: { lat: 52.37, lon: 4.90 },
  berlin:    { lat: 52.52, lon: 13.40 },
  prague:    { lat: 50.08, lon: 14.44 },
  budapest:  { lat: 47.50, lon: 19.04 },
  vienne:    { lat: 48.21, lon: 16.37 },
  geneve:    { lat: 46.20, lon: 6.15 },
}

function owmIconToEmoji(icon = '') {
  const id = icon.slice(0, 2)
  return { '01': '☀️', '02': '🌤️', '03': '☁️', '04': '☁️', '09': '🌧️', '10': '🌦️', '11': '⛈️', '13': '❄️', '50': '🌫️' }[id] ?? '🌡️'
}

// ── getDayInfo ─────────────────────────────────────────────────

function getDayInfo() {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const diff = Math.floor((now - TRIP_START) / 86400000)
  if (diff < 0) return { status: 'before', daysUntil: Math.abs(diff) }
  if (diff >= TRIP_DAYS) return { status: 'after' }
  return { status: 'during', day: diff + 1, daysLeft: TRIP_DAYS - diff }
}

// ── Hooks ──────────────────────────────────────────────────────

function useGPS() {
  const [state, setState] = useState({ lat: null, lon: null, loading: true, denied: false })

  useEffect(() => {
    if (!navigator.geolocation) {
      setState({ lat: null, lon: null, loading: false, denied: true })
      return
    }
    navigator.geolocation.getCurrentPosition(
      pos => setState({ lat: pos.coords.latitude, lon: pos.coords.longitude, loading: false, denied: false }),
      () => setState({ lat: null, lon: null, loading: false, denied: true }),
      { timeout: 8000, maximumAge: 5 * 60 * 1000 }
    )
  }, [])

  return state
}

function useWeather({ lat, lon, gpsLoading, gpsDenied }) {
  const [weather, setWeather] = useState(() => {
    try { return JSON.parse(localStorage.getItem(WEATHER_CACHE_KEY)) } catch { return null }
  })
  const [fetching, setFetching] = useState(true)
  const [apiError, setApiError] = useState(null) // null | 401 | 'network'

  useEffect(() => {
    if (gpsLoading) return
    if (!OWM_KEY) { setFetching(false); return }

    async function load() {
      let owmUrl, omLat, omLon
      if (!gpsDenied && lat !== null) {
        owmUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OWM_KEY}&units=metric&lang=fr`
        omLat = lat; omLon = lon
      } else {
        const city = getCurrentCity()
        const q = encodeURIComponent(city ? CITY_OWM_QUERY[city.city] : 'Brussels,BE')
        owmUrl = `https://api.openweathermap.org/data/2.5/weather?q=${q}&appid=${OWM_KEY}&units=metric&lang=fr`
        const coords = city ? CITY_COORDS[city.city] : CITY_COORDS.bruxelles
        omLat = coords.lat; omLon = coords.lon
      }
      // Open-Meteo: free, no key, returns true daily min/max for the calendar day in local tz
      const omUrl = `https://api.open-meteo.com/v1/forecast?latitude=${omLat}&longitude=${omLon}&daily=temperature_2m_min,temperature_2m_max&timezone=auto&forecast_days=1`
      try {
        const [wRes, omRes] = await Promise.all([
          globalThis.fetch(owmUrl),
          globalThis.fetch(omUrl),
        ])
        if (wRes.status === 401) { setApiError(401); setFetching(false); return }
        if (!wRes.ok) throw new Error('owm')
        const wd = await wRes.json()
        let min = Math.round(wd.main.temp)
        let max = min
        if (omRes.ok) {
          const od = await omRes.json()
          if (od.daily?.temperature_2m_min?.[0] != null) {
            min = Math.round(od.daily.temperature_2m_min[0])
            max = Math.round(od.daily.temperature_2m_max[0])
          }
        }
        const w = {
          temp: Math.round(wd.main.temp),
          min,
          max,
          desc: wd.weather[0]?.description ?? '',
          icon: wd.weather[0]?.icon ?? '',
          city: wd.name,
          ts: Date.now(),
        }
        setWeather(w)
        localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(w))
        setApiError(null)
      } catch {
        setApiError('network')
      } finally {
        setFetching(false)
      }
    }
    load()
  }, [lat, lon, gpsLoading, gpsDenied])

  const loading = fetching && !weather
  const offline = apiError === 'network' && !!weather
  return { weather, loading, offline, apiError }
}

function useCurrencies() {
  const [rates, setRates] = useState(null)
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('https://open.er-api.com/v6/latest/EUR')
        if (!res.ok) throw new Error()
        const d = await res.json()
        if (d.result !== 'success') throw new Error()
        setRates({ CZK: d.rates.CZK, HUF: d.rates.HUF, CHF: d.rates.CHF })
      } catch {
        // fallback Frankfurter
        try {
          const res = await fetch('https://api.frankfurter.app/latest?from=EUR&to=CZK,HUF,CHF')
          if (!res.ok) throw new Error()
          const d = await res.json()
          setRates(d.rates)
        } catch {
          setOffline(true)
        }
      }
    }
    load()
  }, [])

  return { rates, offline }
}

function useNextTrain() {
  const cached = readCache('today_train_v1')
  const [train, setTrain] = useState(cached !== null ? cached.value : undefined)

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    supabase
      .from('trains').select('*')
      .gte('date', today)
      .order('date', { ascending: true })
      .order('leg_order', { ascending: true })
      .limit(1).single()
      .then(({ data }) => {
        setTrain(data ?? null)
        writeCache('today_train_v1', { value: data ?? null })
      })
      .catch(() => { if (train === undefined) setTrain(null) })
  }, [])

  return train
}

function useActivities(city) {
  const [validated, setValidated] = useState(null)

  useEffect(() => {
    if (!city) return
    let isMounted = true

    async function load() {
      try {
        const [actsRes, votesRes, profilesRes] = await Promise.all([
          supabase.from('activities').select('*').eq('city', city).eq('is_active', true),
          supabase.from('votes').select('activity_id, vote'),
          supabase.from('profiles').select('id'),
        ])
        if (!isMounted) return
        if (actsRes.error) { console.error('[AujourdHui] activities fetch:', actsRes.error); return }
        const acts = actsRes.data ?? []
        const votes = votesRes.data ?? []
        const groupSize = profilesRes.data?.length ?? 5
        const threshold = Math.ceil(groupSize / 2)
        const actIds = new Set(acts.map(a => a.id))

        const matchCounts = {}
        votes.forEach(v => {
          if (actIds.has(v.activity_id) && v.vote === 'match')
            matchCounts[v.activity_id] = (matchCounts[v.activity_id] || 0) + 1
        })

        setValidated(
          acts
            .map(a => ({ ...a, _matchCount: matchCounts[a.id] || 0 }))
            .filter(a => a._matchCount >= threshold)
            .sort((a, b) => b._matchCount - a._matchCount)
        )
      } catch (err) {
        if (isMounted) console.error('[AujourdHui] useActivities unexpected:', err)
      }
    }

    load()
    return () => { isMounted = false }
  }, [city])

  return validated
}

// ── Shared shells ──────────────────────────────────────────────

function Card({ children, style }) {
  return <div className="card" style={{ padding: '18px 20px', ...style }}>{children}</div>
}

function CardLabel({ children }) {
  return (
    <p style={{
      fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.07em',
      textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 10,
    }}>{children}</p>
  )
}

function Spinner({ color = 'var(--sky)' }) {
  return (
    <>
      <div style={{
        width: 20, height: 20, borderRadius: '50%',
        border: `2px solid ${color}`, borderTopColor: 'transparent',
        animation: 'ahSpin 0.7s linear infinite',
      }} />
      <style>{`@keyframes ahSpin { to { transform: rotate(360deg); } }`}</style>
    </>
  )
}

// ── WeatherCard ────────────────────────────────────────────────

function WeatherCard({ lat, lon, gpsLoading, gpsDenied }) {
  const { weather, loading, offline, apiError } = useWeather({ lat, lon, gpsLoading, gpsDenied })

  const bg = 'linear-gradient(135deg, rgba(232,160,48,0.10) 0%, rgba(255,255,255,0.85) 60%)'

  if (!OWM_KEY) return (
    <Card style={{ background: bg }}>
      <CardLabel>Météo locale</CardLabel>
      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Clé API non configurée</p>
    </Card>
  )

  if (loading) return (
    <Card style={{ background: bg }}>
      <CardLabel>Météo locale</CardLabel>
      <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
        <Spinner color="var(--sun)" />
      </div>
    </Card>
  )

  if (apiError === 401) return (
    <Card style={{ background: bg }}>
      <CardLabel>Météo locale</CardLabel>
      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
        Clé API en cours d'activation — réessaie dans quelques minutes ⏳
      </p>
    </Card>
  )

  return (
    <Card style={{ background: bg }}>
      <CardLabel>
        Météo · {weather?.city ?? '—'}{offline ? ' · cache' : ''}
      </CardLabel>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{ fontSize: '2.6rem', lineHeight: 1 }}>{owmIconToEmoji(weather?.icon)}</span>
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 800, fontSize: '2rem', margin: 0, lineHeight: 1 }}>
            {weather?.temp ?? '—'}°
          </p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '4px 0 0', textTransform: 'capitalize' }}>
            {weather?.desc ?? '—'}
          </p>
        </div>
        {weather && (
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <p style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0 }}>↑ {weather.max}°</p>
            <p style={{ fontSize: '0.9rem', fontWeight: 500, margin: '4px 0 0', color: 'var(--text-secondary)' }}>↓ {weather.min}°</p>
          </div>
        )}
      </div>
    </Card>
  )
}

// ── TrainCard ──────────────────────────────────────────────────

function TrainCard({ train }) {
  if (train === undefined) return (
    <Card>
      <CardLabel>Prochain train</CardLabel>
      <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
        <Spinner color="var(--sky)" />
      </div>
    </Card>
  )

  if (!train) return (
    <Card>
      <CardLabel>Prochain train</CardLabel>
      <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Aucun trajet prévu</p>
    </Card>
  )

  const dateStr = new Date(train.date + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  return (
    <Card style={{ background: 'linear-gradient(135deg, rgba(74,144,217,0.08) 0%, rgba(255,255,255,0.85) 60%)' }}>
      <CardLabel>Prochain train</CardLabel>
      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 10 }}>{dateStr}</p>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 800, fontSize: '1.05rem', margin: 0, lineHeight: 1.2 }}>{train.from_station}</p>
          {train.departure_time && (
            <p style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--sky)', margin: '4px 0 0', lineHeight: 1 }}>
              {train.departure_time.slice(0, 5)}
            </p>
          )}
        </div>
        <div style={{ padding: '0 12px' }}>
          <svg viewBox="0 0 40 12" fill="none" style={{ width: 48 }}>
            <path d="M0 6H34" stroke="var(--text-tertiary)" strokeWidth="1.5" />
            <path d="M30 2L38 6L30 10" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
        </div>
        <div style={{ flex: 1, textAlign: 'right' }}>
          <p style={{ fontWeight: 800, fontSize: '1.05rem', margin: 0, lineHeight: 1.2 }}>{train.to_station}</p>
          {train.arrival_time && (
            <p style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--sky)', margin: '4px 0 0', lineHeight: 1 }}>
              {train.arrival_time.slice(0, 5)}
            </p>
          )}
        </div>
      </div>
      {train.platform && (
        <p style={{
          marginTop: 12, fontSize: '0.75rem', fontWeight: 600, color: 'var(--sky)',
          background: 'rgba(74,144,217,0.10)', display: 'inline-block',
          padding: '3px 10px', borderRadius: '20px',
        }}>Voie {train.platform}</p>
      )}
      {train.notes && (
        <p style={{ marginTop: 8, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{train.notes}</p>
      )}
    </Card>
  )
}

// ── CurrencyCard ───────────────────────────────────────────────

const PAIRS = [
  { code: 'CZK', flag: '🇨🇿', name: 'Couronne tchèque', decimals: 0 },
  { code: 'HUF', flag: '🇭🇺', name: 'Forint hongrois',  decimals: 0 },
  { code: 'CHF', flag: '🇨🇭', name: 'Franc suisse',     decimals: 4 },
]

function CurrencyCard({ rates, offline, currentCurrency }) {
  const defaultCurr = ['CZK', 'HUF', 'CHF'].includes(currentCurrency) ? currentCurrency : 'CZK'
  const [convCurr, setConvCurr] = useState(defaultCurr)
  const [convAmount, setConvAmount] = useState('')

  const rate = rates?.[convCurr]
  const result = rate && convAmount !== '' ? (parseFloat(convAmount) / rate).toFixed(2) : null

  return (
    <Card>
      <CardLabel>Devises · 1 EUR =</CardLabel>
      {offline && (
        <p style={{ fontSize: '0.72rem', color: 'var(--snooze)', marginBottom: 8 }}>
          Hors ligne — données non disponibles
        </p>
      )}

      {PAIRS.map(({ code, flag, name, decimals }, i) => (
        <div key={code}>
          {i > 0 && <div style={{ height: '1px', background: 'rgba(0,0,0,0.06)' }} />}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: '1.3rem' }}>{flag}</span>
              <div>
                <p style={{ fontWeight: 600, fontSize: '0.875rem', margin: 0 }}>{code}</p>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: 0 }}>{name}</p>
              </div>
            </div>
            <p style={{ fontWeight: 700, fontSize: '1rem', color: rates ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
              {rates ? Number(rates[code]).toFixed(decimals) : '—'}
            </p>
          </div>
        </div>
      ))}

      {/* Convertisseur */}
      <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
        <p style={{
          fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.07em',
          textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 10,
        }}>Convertisseur</p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="number"
            inputMode="decimal"
            placeholder="0"
            value={convAmount}
            onChange={e => setConvAmount(e.target.value)}
            style={{ flex: 1, minWidth: 0 }}
          />
          <select
            value={convCurr}
            onChange={e => setConvCurr(e.target.value)}
            style={{
              padding: '12px 10px', borderRadius: '14px', fontSize: '0.85rem', fontWeight: 700,
              border: '1.5px solid rgba(26,23,20,0.10)', background: 'rgba(26,23,20,0.04)',
              color: 'var(--text-primary)', fontFamily: 'inherit', cursor: 'pointer', flexShrink: 0,
            }}
          >
            {PAIRS.map(p => <option key={p.code} value={p.code}>{p.code}</option>)}
          </select>
          <div style={{
            padding: '12px 14px', borderRadius: '14px', flexShrink: 0,
            background: result ? 'rgba(59,170,122,0.10)' : 'rgba(26,23,20,0.04)',
            fontWeight: 700, fontSize: '0.95rem',
            color: result ? 'var(--mint)' : 'var(--text-tertiary)',
            minWidth: 72, textAlign: 'center',
          }}>
            {result !== null ? `${result} €` : '— €'}
          </div>
        </div>
      </div>
    </Card>
  )
}

// ── ActivitiesCard ─────────────────────────────────────────────

const CAT_EMOJI = { culture: '🏛️', food: '🍽️', nightlife: '🎉', nature: '🌿', shopping: '🛍️' }

function ActivitiesCard({ currentCity, dayInfo }) {
  const validated = useActivities(currentCity?.city)

  if (dayInfo.status === 'before') return (
    <Card>
      <CardLabel>Activités</CardLabel>
      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
        Aucun vote pour l'instant — rdv dans {dayInfo.daysUntil} jour{dayInfo.daysUntil > 1 ? 's' : ''} avant le départ 🗓️
      </p>
    </Card>
  )

  if (dayInfo.status === 'after') return null

  if (!currentCity) return (
    <Card>
      <CardLabel>Activités</CardLabel>
      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Ville non reconnue</p>
    </Card>
  )

  if (validated === null) return (
    <Card>
      <CardLabel>À faire · {currentCity.label}</CardLabel>
      <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
        <Spinner color="var(--mint)" />
      </div>
    </Card>
  )

  return (
    <Card>
      <CardLabel>À faire · {currentCity.flag} {currentCity.label}</CardLabel>
      {validated.length === 0 ? (
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Aucune activité validée pour {currentCity.label} pour l'instant.
        </p>
      ) : (
        validated.map((act, i) => (
          <div key={act.id}>
            {i > 0 && <div style={{ height: '1px', background: 'rgba(26,23,20,0.05)' }} />}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0' }}>
              <div style={{
                width: 36, height: 36, borderRadius: '12px', flexShrink: 0,
                background: 'rgba(59,170,122,0.10)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem',
              }}>
                {CAT_EMOJI[act.category] ?? '✨'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 700, fontSize: '0.875rem', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {act.name}
                </p>
                {act.price_eur !== null && act.price_eur !== undefined && (
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', margin: '2px 0 0' }}>
                    {act.price_eur === 0 ? 'Gratuit' : `${act.price_eur} €`}
                  </p>
                )}
              </div>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--mint)', flexShrink: 0 }}>
                {act._matchCount} ✓
              </span>
            </div>
          </div>
        ))
      )}
    </Card>
  )
}

// ── Composant principal ────────────────────────────────────────

export default function AujourdHui() {
  const { profile } = useAuth()
  const dayInfo = getDayInfo()
  const currentCity = getCurrentCity()
  const gps = useGPS()
  const { rates, offline: ratesOffline } = useCurrencies()
  const train = useNextTrain()

  const firstName = profile?.first_name || profile?.pseudo || ''
  const currentCurrency = currentCity?.currency ?? 'EUR'

  return (
    <div style={{ padding: '28px 16px 100px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
            Bonjour {firstName} 👋
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: 6 }}>
            {dayInfo.status === 'before' && <>J&#8209;{dayInfo.daysUntil} avant le grand départ</>}
            {dayInfo.status === 'during' && (
              <>Jour {dayInfo.day}{currentCity ? ` · ${currentCity.flag} ${currentCity.label}` : ''} · {dayInfo.daysLeft} jour{dayInfo.daysLeft > 1 ? 's' : ''} restant{dayInfo.daysLeft > 1 ? 's' : ''}</>
            )}
            {dayInfo.status === 'after' && <>Le voyage est terminé — quels souvenirs ! 🎉</>}
          </p>
        </div>
        <HeaderAvatar />
      </div>

      {/* Cards : Météo · Train · Devises · Activités */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <WeatherCard lat={gps.lat} lon={gps.lon} gpsLoading={gps.loading} gpsDenied={gps.denied} />
        <TrainCard train={train} />
        <CurrencyCard rates={rates} offline={ratesOffline} currentCurrency={currentCurrency} />
        <ActivitiesCard currentCity={currentCity} dayInfo={dayInfo} />
      </div>

    </div>
  )
}
