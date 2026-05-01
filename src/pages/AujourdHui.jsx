import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { getCurrentCity, CITY_SCHEDULE } from '../lib/travel'
import HeaderAvatar from '../components/HeaderAvatar'
import { readCache, writeCache } from '../lib/dbCache'

const TRIP_START = new Date('2026-08-01T00:00:00')
const TRIP_DAYS = 22
const OWM_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY
const WEATHER_CACHE_KEY = 'weather_cache_v6'

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

const DURATION_DEFAULTS = {
  culture: 90, food: 75, nightlife: 120, nature: 90, shopping: 60, other: 60,
}

const CAT_TIMELINE = {
  culture:   { color: 'var(--sky)',             bg: 'rgba(74,144,217,0.10)',  label: 'Culture'  },
  food:      { color: 'var(--trash)',            bg: 'rgba(224,90,90,0.10)',   label: 'Resto'    },
  nightlife: { color: 'var(--sun)',              bg: 'rgba(232,160,48,0.10)',  label: 'Soirée'   },
  nature:    { color: 'var(--mint)',             bg: 'rgba(59,170,122,0.10)',  label: 'Nature'   },
  shopping:  { color: 'var(--text-secondary)',   bg: 'rgba(26,23,20,0.07)',   label: 'Shopping' },
}

function minToTime(min) {
  const h = Math.floor(min / 60)
  const m = min % 60
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`
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
      let owmUrl, fcUrl, omLat, omLon
      if (!gpsDenied && lat !== null) {
        owmUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OWM_KEY}&units=metric&lang=fr`
        fcUrl  = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${OWM_KEY}&units=metric&lang=fr&cnt=6`
        omLat = lat; omLon = lon
      } else {
        const city = getCurrentCity()
        const q = encodeURIComponent(city ? CITY_OWM_QUERY[city.city] : 'Brussels,BE')
        owmUrl = `https://api.openweathermap.org/data/2.5/weather?q=${q}&appid=${OWM_KEY}&units=metric&lang=fr`
        fcUrl  = `https://api.openweathermap.org/data/2.5/forecast?q=${q}&appid=${OWM_KEY}&units=metric&lang=fr&cnt=6`
        const coords = city ? CITY_COORDS[city.city] : CITY_COORDS.bruxelles
        omLat = coords.lat; omLon = coords.lon
      }
      // Open-Meteo: free, no key, returns true daily min/max for the calendar day in local tz
      const omUrl = `https://api.open-meteo.com/v1/forecast?latitude=${omLat}&longitude=${omLon}&daily=temperature_2m_min,temperature_2m_max&timezone=auto&forecast_days=1`
      try {
        const [wRes, omRes, fcRes] = await Promise.all([
          globalThis.fetch(owmUrl),
          globalThis.fetch(omUrl),
          globalThis.fetch(fcUrl),
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
        let forecast = []
        if (fcRes.ok) {
          const fd = await fcRes.json()
          forecast = (fd.list ?? []).slice(0, 6).map(slot => ({
            hour: new Date(slot.dt * 1000).getHours() + 'h',
            emoji: owmIconToEmoji(slot.weather[0]?.icon),
            temp: Math.round(slot.main.temp),
          }))
        }
        const w = {
          temp: Math.round(wd.main.temp),
          min,
          max,
          desc: wd.weather[0]?.description ?? '',
          icon: wd.weather[0]?.icon ?? '',
          city: wd.name,
          forecast,
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

function useTimeline(city) {
  const [items, setItems] = useState(null)

  const load = useCallback(async () => {
    if (!city) return
    try {
      const [actsRes, votesRes, profilesRes] = await Promise.all([
        supabase.from('activities').select('*').eq('city', city).eq('is_active', true),
        supabase.from('votes').select('activity_id, vote'),
        supabase.from('profiles').select('id').eq('banned', false),
      ])
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
      const validated = acts
        .filter(a => (matchCounts[a.id] || 0) >= threshold)
        .sort((a, b) => {
          if (a.plan_order != null && b.plan_order != null) return a.plan_order - b.plan_order
          if (a.plan_order != null) return -1
          if (b.plan_order != null) return 1
          return a.name.localeCompare(b.name)
        })
      setItems(validated)
    } catch (err) {
      console.error('[useTimeline]', err)
    }
  }, [city])

  useEffect(() => { load() }, [load])

  return { items, setItems }
}

// ── Shared shells ──────────────────────────────────────────────

function Card({ children, style, onClick }) {
  return (
    <div className="card" onClick={onClick}
      style={{ padding: '18px 20px', ...style, cursor: onClick ? 'pointer' : undefined }}>
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
      {weather?.forecast?.length > 0 && (
        <>
          <style>{`.fc-strip::-webkit-scrollbar{display:none}`}</style>
          <div className="fc-strip" style={{
            marginTop: 14, paddingTop: 14,
            borderTop: '1px solid rgba(0,0,0,0.06)',
            display: 'flex', gap: 8,
            overflowX: 'auto', scrollbarWidth: 'none',
            WebkitOverflowScrolling: 'touch',
          }}>
            {weather.forecast.map((slot, i) => (
              <div key={i} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 4, flexShrink: 0,
                background: 'rgba(232,160,48,0.09)',
                borderRadius: 12, padding: '8px 10px', minWidth: 48,
              }}>
                <p style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-tertiary)', margin: 0 }}>{slot.hour}</p>
                <span style={{ fontSize: '1.15rem', lineHeight: 1 }}>{slot.emoji}</span>
                <p style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0 }}>{slot.temp}°</p>
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  )
}

// ── TrainCard ──────────────────────────────────────────────────

function TrainCard({ train, onClick }) {
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
    <Card onClick={onClick} style={{ background: 'linear-gradient(135deg, rgba(74,144,217,0.08) 0%, rgba(255,255,255,0.85) 60%)' }}>
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

// ── TimelineCard ───────────────────────────────────────────────

function TimelineCard({ city, train, isPreview = false }) {
  const { profile } = useAuth()
  const { items, setItems } = useTimeline(city)
  const isAdmin = profile?.role === 'admin'

  const today = new Date().toISOString().split('T')[0]
  const [done, setDone] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem(`tl_done_${today}`)) ?? []) }
    catch { return new Set() }
  })

  function toggleDone(id) {
    setDone(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      localStorage.setItem(`tl_done_${today}`, JSON.stringify([...next]))
      return next
    })
  }

  async function moveItem(idx, dir) {
    const j = idx + dir
    if (!items || j < 0 || j >= items.length) return
    const a = items[idx], b = items[j]
    const oA = a.plan_order ?? idx
    const oB = b.plan_order ?? j
    setItems(items.map((it, i) => {
      if (i === idx) return { ...b, plan_order: oA }
      if (i === j)   return { ...a, plan_order: oB }
      return it
    }))
    await Promise.all([
      supabase.from('activities').update({ plan_order: oB }).eq('id', a.id),
      supabase.from('activities').update({ plan_order: oA }).eq('id', b.id),
    ])
  }

  if (!city) return null

  if (!items) return (
    <Card>
      <CardLabel>Programme du jour</CardLabel>
      <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
        <Spinner color="var(--mint)" />
      </div>
    </Card>
  )

  const isTrainToday = train?.date === today
  const trainDepMin = isTrainToday && train.departure_time
    ? parseInt(train.departure_time.slice(0, 2)) * 60 + parseInt(train.departure_time.slice(3, 5))
    : null

  let cursor = 9 * 60
  const scheduled = []
  for (const item of items) {
    const dur = item.duration_minutes ?? DURATION_DEFAULTS[item.category] ?? 90
    if (trainDepMin !== null && cursor + dur > trainDepMin - 30) break
    scheduled.push({ ...item, _startMin: cursor, _dur: dur })
    cursor += dur + 15
  }

  if (scheduled.length === 0) return null

  const doneCount = scheduled.filter(it => done.has(it.id)).length

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <p style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-tertiary)', margin: 0 }}>
            Programme du jour
          </p>
          {isPreview && (
            <span style={{
              fontSize: '0.6rem', fontWeight: 700, padding: '1px 6px', borderRadius: 20,
              background: 'rgba(232,160,48,0.12)', color: 'var(--sun)', letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}>preview</span>
          )}
        </div>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>
          {doneCount}/{scheduled.length}
        </span>
      </div>

      <div style={{ position: 'relative' }}>
        {/* Ligne verticale */}
        <div style={{
          position: 'absolute', left: 17, top: 6, bottom: 6,
          width: 1.5, background: 'rgba(26,23,20,0.07)', borderRadius: 1,
        }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {scheduled.map((item, idx) => {
            const isDone = done.has(item.id)
            const cat = CAT_TIMELINE[item.category] ?? { color: 'var(--text-secondary)', bg: 'rgba(26,23,20,0.07)', label: item.category }
            const isOutdoor = item.category === 'nature'

            return (
              <div key={item.id} style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                opacity: isDone ? 0.38 : 1, transition: 'opacity 0.2s',
              }}>
                {/* Dot cliquable */}
                <button onClick={() => toggleDone(item.id)} style={{
                  position: 'relative', zIndex: 1, flexShrink: 0,
                  width: 35, height: 35, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isDone ? 'rgba(26,23,20,0.08)' : 'white',
                  border: isDone ? '1.5px solid rgba(26,23,20,0.12)' : '1.5px solid rgba(26,23,20,0.10)',
                  boxShadow: isDone ? 'none' : '0 1px 4px rgba(26,23,20,0.07)',
                  cursor: 'pointer', padding: 0,
                }}>
                  {isDone
                    ? <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                        <path d="M3 8.5l3.5 3.5 6.5-7" stroke="var(--text-secondary)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    : <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-secondary)', lineHeight: 1 }}>
                        {minToTime(item._startMin)}
                      </span>
                  }
                </button>

                {/* Contenu */}
                <div style={{
                  flex: 1, background: 'rgba(26,23,20,0.02)', borderRadius: 14,
                  padding: '10px 12px', border: '1px solid rgba(26,23,20,0.06)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <p style={{
                      fontWeight: 700, fontSize: '0.875rem', margin: 0, flex: 1,
                      textDecoration: isDone ? 'line-through' : 'none',
                      color: 'var(--text-primary)',
                    }}>{item.name}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                      {isAdmin && idx > 0 && (
                        <button onClick={() => moveItem(idx, -1)} style={{
                          background: 'none', border: 'none', padding: '1px 3px', cursor: 'pointer',
                          color: 'var(--text-tertiary)', fontSize: '0.6rem', lineHeight: 1,
                        }}>▲</button>
                      )}
                      {isAdmin && idx < scheduled.length - 1 && (
                        <button onClick={() => moveItem(idx, 1)} style={{
                          background: 'none', border: 'none', padding: '1px 3px', cursor: 'pointer',
                          color: 'var(--text-tertiary)', fontSize: '0.6rem', lineHeight: 1,
                        }}>▼</button>
                      )}
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', fontWeight: 500, marginLeft: 2 }}>
                        ~{item._dur}min
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 5, marginTop: 7, flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: '0.65rem', fontWeight: 600, padding: '2px 7px',
                      borderRadius: 20, background: cat.bg, color: cat.color,
                    }}>{cat.label}</span>
                    <span style={{
                      fontSize: '0.65rem', fontWeight: 600, padding: '2px 7px', borderRadius: 20,
                      background: isOutdoor ? 'rgba(59,170,122,0.10)' : 'rgba(74,144,217,0.10)',
                      color: isOutdoor ? 'var(--mint)' : 'var(--sky)',
                    }}>{isOutdoor ? 'Extérieur' : 'Intérieur'}</span>
                    {item.price_eur != null && (
                      <span style={{
                        fontSize: '0.65rem', fontWeight: 600, padding: '2px 7px',
                        borderRadius: 20, background: 'rgba(26,23,20,0.05)', color: 'var(--text-secondary)',
                      }}>{item.price_eur === 0 ? 'Gratuit' : `${item.price_eur} €`}</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}

          {/* Item train si départ aujourd'hui */}
          {isTrainToday && train.departure_time && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{
                position: 'relative', zIndex: 1, flexShrink: 0,
                width: 35, height: 35, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(74,144,217,0.10)',
                border: '1.5px solid rgba(74,144,217,0.20)',
              }}>
                <span style={{ fontSize: '0.85rem', lineHeight: 1 }}>🚄</span>
              </div>
              <div style={{
                flex: 1, background: 'rgba(74,144,217,0.06)', borderRadius: 14,
                padding: '10px 12px', border: '1px solid rgba(74,144,217,0.14)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <p style={{ fontWeight: 700, fontSize: '0.875rem', margin: 0, color: 'var(--sky)' }}>
                    {train.from_station} → {train.to_station}
                  </p>
                  <span style={{ fontSize: '0.7rem', color: 'var(--sky)', fontWeight: 600 }}>
                    {train.departure_time.slice(0, 5)}
                  </span>
                </div>
                <p style={{ fontSize: '0.7rem', color: 'var(--sky)', margin: '3px 0 0', opacity: 0.65 }}>
                  Départ · Voie {train.platform ?? '—'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

// ── Composant principal ────────────────────────────────────────

export default function AujourdHui() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const dayInfo = getDayInfo()
  const currentCity = getCurrentCity()
  const gps = useGPS()
  const { rates, offline: ratesOffline } = useCurrencies()
  const train = useNextTrain()

  const firstName = profile?.first_name || profile?.pseudo || ''
  const currentCurrency = currentCity?.currency ?? 'EUR'
  const timelineCity = currentCity?.city ?? CITY_SCHEDULE[0]?.city

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

      {/* Cards : Météo · Train · Devises · Timeline */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <WeatherCard lat={gps.lat} lon={gps.lon} gpsLoading={gps.loading} gpsDenied={gps.denied} />
        <TrainCard train={train} onClick={train?.id ? () => navigate('/voyage', { state: { openTrainId: train.id } }) : undefined} />
        <CurrencyCard rates={rates} offline={ratesOffline} currentCurrency={currentCurrency} />
        <TimelineCard city={timelineCity} train={train} isPreview={!currentCity} />
      </div>

    </div>
  )
}
