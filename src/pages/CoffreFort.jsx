import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { EMERGENCY, CITY_SCHEDULE, getCurrentCity } from '../lib/travel'
import { useAuth } from '../context/AuthContext'

// ── Composants UI ─────────────────────────────────────────────

function SectionHeader({ title, subtitle }) {
  return (
    <div className="px-4 pt-5 pb-2">
      <h2 className="text-base font-semibold">{title}</h2>
      {subtitle && <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{subtitle}</p>}
    </div>
  )
}

function InfoRow({ label, value, mono }) {
  return (
    <div className="flex items-center justify-between px-4 py-3.5">
      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <span className={`text-sm font-medium text-right max-w-[200px] ${mono ? 'font-mono tracking-wide' : ''}`}
        style={{ color: 'var(--text-primary)' }}>
        {value || '—'}
      </span>
    </div>
  )
}

function Badge({ children, color }) {
  const styles = {
    warning: { backgroundColor: 'rgba(217,119,6,0.12)', color: 'var(--snooze)' },
    danger:  { backgroundColor: 'rgba(220,38,38,0.10)', color: 'var(--trash)' },
    success: { backgroundColor: 'rgba(22,163,74,0.10)',  color: 'var(--match)' },
    accent:  { backgroundColor: 'var(--accent-light)',   color: 'var(--accent)' },
  }
  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
      style={styles[color] ?? styles.accent}>
      {children}
    </span>
  )
}

// ── Section Trains ────────────────────────────────────────────

function QuaiDisplay({ label, value }) {
  return (
    <div className="text-center min-w-[52px]">
      <p className="text-xs mb-0.5" style={{ color: 'var(--text-secondary)' }}>{label}</p>
      <span className="text-xl font-bold tabular-nums"
        style={{ color: value ? 'var(--accent)' : 'rgba(0,0,0,0.15)' }}>
        {value || '—'}
      </span>
    </div>
  )
}

function TrainCard({ train, isAdmin, onSaved }) {
  const [editing, setEditing] = useState(false)
  const [depQ, setDepQ] = useState(train.platform_dep || '')
  const [arrQ, setArrQ] = useState(train.platform_arr || '')
  const [saving, setSaving] = useState(false)

  const isCritical = train.notes?.includes('⚠️')

  async function save() {
    setSaving(true)
    await supabase.from('trains')
      .update({ platform_dep: depQ || null, platform_arr: arrQ || null })
      .eq('id', train.id)
    onSaved()
    setEditing(false)
    setSaving(false)
  }

  return (
    <div className="card mx-4 mb-3">
      {/* Ligne principale */}
      <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-snug">
            {train.from_station}
          </p>
          <p className="text-sm font-semibold leading-snug" style={{ color: 'var(--text-secondary)' }}>
            → {train.to_station}
          </p>
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {train.train_number && <Badge color="accent">{train.train_number}</Badge>}
            {train.is_connection && <Badge color="warning">Correspondance</Badge>}
            {isCritical && <Badge color="danger">⚠️ 16 min</Badge>}
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-lg font-bold tabular-nums">{train.departure_time?.slice(0, 5)}</p>
          <p className="text-sm tabular-nums" style={{ color: 'var(--text-secondary)' }}>
            → {train.arrival_time?.slice(0, 5) || '?'}
          </p>
        </div>
      </div>

      {/* Quais */}
      <div className="border-t flex items-center justify-between px-4 py-3 gap-3"
        style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
        {editing ? (
          <>
            <div className="flex gap-3 flex-1">
              <div className="flex-1">
                <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Quai départ</p>
                <input value={depQ} onChange={e => setDepQ(e.target.value)}
                  placeholder="ex : 4A" style={{ padding: '8px 12px', fontSize: '0.875rem' }} />
              </div>
              <div className="flex-1">
                <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Quai arrivée</p>
                <input value={arrQ} onChange={e => setArrQ(e.target.value)}
                  placeholder="ex : 7" style={{ padding: '8px 12px', fontSize: '0.875rem' }} />
              </div>
            </div>
            <div className="flex flex-col gap-1 pt-4 shrink-0">
              <button onClick={save} disabled={saving}
                className="text-xs font-bold px-3 py-2 rounded-xl"
                style={{ backgroundColor: 'var(--accent)', color: 'white' }}>
                {saving ? '…' : 'OK'}
              </button>
              <button onClick={() => setEditing(false)}
                className="text-xs px-3 py-2 rounded-xl"
                style={{ backgroundColor: 'rgba(0,0,0,0.05)', color: 'var(--text-secondary)' }}>
                ✕
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex gap-5">
              <QuaiDisplay label="Quai départ" value={train.platform_dep} />
              <QuaiDisplay label="Quai arrivée" value={train.platform_arr} />
            </div>
            {isAdmin && (
              <button onClick={() => setEditing(true)}
                className="text-xs font-semibold px-3 py-1.5 rounded-full shrink-0"
                style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>
                Modifier quais
              </button>
            )}
          </>
        )}
      </div>

      {/* Note texte (hors alertes ⚠️ déjà affichées en badge) */}
      {train.notes && !isCritical && (
        <div className="px-4 pb-3">
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{train.notes}</p>
        </div>
      )}
    </div>
  )
}

// ── Section Hébergements ──────────────────────────────────────

function AirbnbSection({ airbnbs }) {
  const [open, setOpen] = useState(null)

  return (
    <div>
      {CITY_SCHEDULE.map(({ city, label, flag }) => {
        const data = airbnbs.find(a => a.city === city)
        const hasData = data?.address
        return (
          <div key={city} className="mx-4 mb-2">
            <button onClick={() => setOpen(open === city ? null : city)} className="w-full text-left">
              <div className="card px-4 py-3.5 flex items-center justify-between">
                <span className="text-sm font-medium">{flag} {label}</span>
                <span className="text-xs" style={{ color: hasData ? 'var(--text-secondary)' : 'var(--snooze)' }}>
                  {hasData ? 'Voir détails ›' : 'À compléter'}
                </span>
              </div>
            </button>

            {open === city && data && (
              <div className="card mt-1.5">
                {data.address     && <InfoRow label="Adresse"     value={data.address} />}
                {data.entry_code  && <InfoRow label="Code entrée"  value={data.entry_code} mono />}
                {data.checkin_time  && <InfoRow label="Check-in"   value={data.checkin_time} />}
                {data.checkout_time && <InfoRow label="Check-out"  value={data.checkout_time} />}
                {data.instructions && (
                  <div className="px-4 pb-4 pt-1">
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {data.instructions}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Section Urgences ──────────────────────────────────────────

function EmergencySection({ currentCity }) {
  const [open, setOpen] = useState(currentCity?.city ?? null)

  return (
    <div>
      {Object.entries(EMERGENCY).map(([key, data]) => {
        const isActive = key === currentCity?.city
        return (
          <div key={key} className="mx-4 mb-2">
            <button onClick={() => setOpen(open === key ? null : key)} className="w-full text-left">
              <div className="card px-4 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isActive && (
                    <span className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: 'var(--match)' }} />
                  )}
                  <span className="text-sm font-medium">{data.country}</span>
                  {isActive && <Badge color="success">Maintenant</Badge>}
                </div>
                <span className="text-sm font-bold font-mono" style={{ color: 'var(--trash)' }}>
                  {data.general}
                </span>
              </div>
            </button>

            {open === key && (
              <div className="card mt-1.5">
                <InfoRow label="Urgences (général)" value={data.general} mono />
                <InfoRow label="Police"              value={data.police}  mono />
                <InfoRow label="SAMU / Ambulance"    value={data.samu}    mono />
                <InfoRow label="Pompiers"            value={data.pompiers} mono />
                <InfoRow label="Ambassade France"    value={data.embassy}  mono />
                <div className="px-4 pb-3 pt-0.5">
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {data.embassyAddress}
                  </p>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────

const TABS = [
  { key: 'trains',   label: 'Trains' },
  { key: 'airbnbs',  label: 'Hébergements' },
  { key: 'urgences', label: 'Urgences' },
]

export default function CoffreFort() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const currentCity = getCurrentCity()

  const [tab, setTab] = useState('trains')
  const [trains, setTrains] = useState([])
  const [airbnbs, setAirbnbs] = useState([])
  const [loading, setLoading] = useState(true)

  async function fetchData() {
    const [trainsRes, airbnbsRes] = await Promise.all([
      supabase.from('trains').select('*').order('leg_order'),
      supabase.from('airbnbs').select('*'),
    ])
    if (trainsRes.data) setTrains(trainsRes.data)
    if (airbnbsRes.data) setAirbnbs(airbnbsRes.data)
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const trainsByDate = trains.reduce((acc, t) => {
    if (!acc[t.date]) acc[t.date] = []
    acc[t.date].push(t)
    return acc
  }, {})

  function formatDate(dateStr) {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long'
    })
  }

  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1)
  }

  return (
    <div style={{ minHeight: '100dvh', backgroundColor: 'var(--bg-base)' }}>
      {/* Header */}
      <div className="px-4 pt-6 pb-2">
        <h1 className="text-2xl font-semibold">Coffre-Fort</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          Tout ce qu'il faut pour avancer
        </p>
      </div>

      {/* Onglets internes */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all"
            style={{
              backgroundColor: tab === t.key ? 'var(--accent)' : 'rgba(0,0,0,0.06)',
              color: tab === t.key ? 'white' : 'var(--text-secondary)',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
        </div>
      ) : (
        <div className="pb-6">
          {/* ── Trains ── */}
          {tab === 'trains' && Object.entries(trainsByDate).map(([date, legs]) => (
            <div key={date}>
              <SectionHeader
                title={capitalize(formatDate(date))}
                subtitle={`${capitalize(legs[0].city_from)} → ${capitalize(legs[legs.length - 1].city_to)}`}
              />
              {legs.map(train => (
                <TrainCard key={train.id} train={train} isAdmin={isAdmin} onSaved={fetchData} />
              ))}
            </div>
          ))}

          {/* ── Hébergements ── */}
          {tab === 'airbnbs' && (
            <>
              <SectionHeader title="Hébergements" subtitle="Tap sur une ville pour les détails" />
              <AirbnbSection airbnbs={airbnbs} />
            </>
          )}

          {/* ── Urgences ── */}
          {tab === 'urgences' && (
            <>
              <SectionHeader title="Urgences" subtitle="Tap pour développer un pays" />
              <EmergencySection currentCity={currentCity} />
            </>
          )}
        </div>
      )}
    </div>
  )
}
