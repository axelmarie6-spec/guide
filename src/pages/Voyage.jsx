import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { EMERGENCY, CITY_SCHEDULE, getCurrentCity, getStationMapUrl } from '../lib/travel'
import { useAuth } from '../context/AuthContext'

// ── UI ────────────────────────────────────────────────────────

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
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={styles[color] ?? styles.accent}>
      {children}
    </span>
  )
}

// ── Trains ────────────────────────────────────────────────────

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

function TrainCard({ train, isAdmin, onSaved, pdfs = [] }) {
  const [editing, setEditing] = useState(false)
  const [depQ, setDepQ] = useState(train.platform_dep || '')
  const [arrQ, setArrQ] = useState(train.platform_arr || '')
  const [saving, setSaving] = useState(false)

  const [showUpload, setShowUpload] = useState(false)
  const [uploadLabel, setUploadLabel] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileRef = useRef(null)

  const isCritical = train.notes?.includes('⚠️')
  const stationMapUrl = getStationMapUrl(train.from_station)
  const myPdfs = pdfs.filter(p => p.leg_order === train.leg_order)

  async function save() {
    setSaving(true)
    await supabase.from('trains')
      .update({ platform_dep: depQ || null, platform_arr: arrQ || null })
      .eq('id', train.id)
    onSaved()
    setEditing(false)
    setSaving(false)
  }

  async function uploadPdf(file) {
    if (!file) return
    if (!uploadLabel.trim()) { setUploadError('Entre un label.'); return }
    setUploadError('')
    setUploading(true)
    const safe = uploadLabel.trim().replace(/\s+/g, '_')
    const path = `leg_${train.leg_order}/${Date.now()}_${safe}.pdf`
    const { error: storageErr } = await supabase.storage
      .from('tickets').upload(path, file, { contentType: 'application/pdf' })
    if (storageErr) { setUploadError('Erreur upload.'); setUploading(false); return }
    await supabase.from('ticket_pdfs').insert({
      leg_order: train.leg_order, label: uploadLabel.trim(), storage_path: path,
    })
    setShowUpload(false)
    setUploadLabel('')
    onSaved()
    setUploading(false)
  }

  function openPdf(pdf) {
    const { data } = supabase.storage.from('tickets').getPublicUrl(pdf.storage_path)
    window.open(data.publicUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="card mx-4 mb-3">
      {/* Ligne principale */}
      <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-snug">{train.from_station}</p>
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
          <p className="text-lg font-bold tabular-nums">{train.departure_time?.slice(0, 5) || '?'}</p>
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

      {train.notes && !isCritical && (
        <div className="px-4 pb-3">
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{train.notes}</p>
        </div>
      )}

      {/* Billets */}
      <div className="border-t" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
        <div className="px-4 pt-3 pb-1 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: 'var(--text-secondary)' }}>Billets</p>
          {isAdmin && !showUpload && (
            <button onClick={() => setShowUpload(true)}
              className="text-xs font-semibold px-3 py-1 rounded-full"
              style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>
              + Ajouter
            </button>
          )}
        </div>

        {myPdfs.length === 0 && !showUpload && (
          <p className="px-4 pb-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
            {isAdmin ? 'Aucun billet — tape + Ajouter.' : 'Billets à venir.'}
          </p>
        )}

        {myPdfs.length > 0 && (
          <div className="px-4 pb-3 flex flex-col gap-2">
            {myPdfs.map(pdf => (
              <button key={pdf.id} onClick={() => openPdf(pdf)}
                className="flex items-center gap-2 text-sm font-medium w-fit"
                style={{ color: 'var(--accent)' }}>
                <span>📄</span>
                <span>{pdf.label}</span>
              </button>
            ))}
          </div>
        )}

        {isAdmin && showUpload && (
          <div className="px-4 pb-3 flex flex-col gap-2">
            <input
              value={uploadLabel}
              onChange={e => setUploadLabel(e.target.value)}
              placeholder="Label : Groupe, Marin…"
              style={{ padding: '8px 12px', fontSize: '0.875rem' }}
            />
            <input ref={fileRef} type="file" accept="application/pdf" className="hidden"
              onChange={e => uploadPdf(e.target.files?.[0])} />
            {uploadError && <p className="text-xs" style={{ color: 'var(--trash)' }}>{uploadError}</p>}
            <div className="flex gap-2">
              <button onClick={() => fileRef.current?.click()} disabled={uploading}
                className="btn-primary text-sm py-2 flex-1">
                {uploading ? 'Envoi…' : 'Choisir le PDF'}
              </button>
              <button onClick={() => { setShowUpload(false); setUploadLabel(''); setUploadError('') }}
                className="text-sm px-3 py-2 rounded-xl"
                style={{ backgroundColor: 'rgba(0,0,0,0.05)', color: 'var(--text-secondary)' }}>
                ✕
              </button>
            </div>
          </div>
        )}
      </div>

      {stationMapUrl && (
        <div className="border-t px-4 py-2.5 flex items-center justify-between"
          style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{train.from_station}</span>
          <a href={stationMapUrl} target="_blank" rel="noopener noreferrer"
            className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>
            Plan de gare ↗
          </a>
        </div>
      )}
    </div>
  )
}

// ── Hébergements ──────────────────────────────────────────────

function AirbnbSection({ airbnbs, isAdmin, onSaved }) {
  const [open, setOpen] = useState(null)
  const [editingCity, setEditingCity] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)

  function startEdit(city, data) {
    setEditForm({
      address:       data?.address       || '',
      entry_code:    data?.entry_code    || '',
      checkin_time:  data?.checkin_time  || '',
      checkout_time: data?.checkout_time || '',
      instructions:  data?.instructions  || '',
    })
    setEditingCity(city)
  }

  function setField(field, value) { setEditForm(f => ({ ...f, [field]: value })) }

  async function saveEdit() {
    setSaving(true)
    await supabase.from('airbnbs').update({
      address:       editForm.address.trim()       || null,
      entry_code:    editForm.entry_code.trim()    || null,
      checkin_time:  editForm.checkin_time.trim()  || null,
      checkout_time: editForm.checkout_time.trim() || null,
      instructions:  editForm.instructions.trim()  || null,
    }).eq('city', editingCity)
    setEditingCity(null)
    onSaved()
    setSaving(false)
  }

  return (
    <div>
      {CITY_SCHEDULE.map(({ city, label, flag }) => {
        const data = airbnbs.find(a => a.city === city)
        const hasData = !!data?.address
        const isOpen = open === city
        const isEditing = editingCity === city

        return (
          <div key={city} className="mx-4 mb-2">
            <button onClick={() => setOpen(isOpen ? null : city)} className="w-full text-left">
              <div className="card px-4 py-3.5 flex items-center justify-between">
                <span className="text-sm font-medium">{flag} {label}</span>
                <span className="text-xs" style={{ color: hasData ? 'var(--text-secondary)' : 'var(--snooze)' }}>
                  {hasData ? 'Voir détails ›' : 'À compléter'}
                </span>
              </div>
            </button>

            {isOpen && !isEditing && hasData && (
              <div className="card mt-1.5">
                {data.address     && <InfoRow label="Adresse"    value={data.address} />}
                {data.entry_code  && <InfoRow label="Code entrée" value={data.entry_code} mono />}
                {data.checkin_time  && <InfoRow label="Check-in"  value={data.checkin_time} />}
                {data.checkout_time && <InfoRow label="Check-out" value={data.checkout_time} />}
                {data.instructions && (
                  <div className="px-4 pb-4 pt-1">
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {data.instructions}
                    </p>
                  </div>
                )}
                {isAdmin && (
                  <div className="px-4 pb-3">
                    <button onClick={() => startEdit(city, data)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-full"
                      style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>
                      Modifier
                    </button>
                  </div>
                )}
              </div>
            )}

            {isOpen && !isEditing && !hasData && !isAdmin && (
              <div className="card mt-1.5 px-4 py-3">
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  Infos à venir — l'admin va les ajouter bientôt.
                </p>
              </div>
            )}

            {isOpen && !isEditing && !hasData && isAdmin && (
              <div className="card mt-1.5 px-4 py-3">
                <button onClick={() => startEdit(city, data)}
                  className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>
                  + Ajouter les infos de l'hébergement
                </button>
              </div>
            )}

            {isOpen && isEditing && (
              <div className="card mt-1.5 p-4 flex flex-col gap-3">
                <div>
                  <p className="text-xs mb-1 font-medium" style={{ color: 'var(--text-secondary)' }}>Adresse</p>
                  <input value={editForm.address} onChange={e => setField('address', e.target.value)}
                    placeholder="123 Rue de la Paix…" style={{ padding: '8px 12px', fontSize: '0.875rem' }} />
                </div>
                <div>
                  <p className="text-xs mb-1 font-medium" style={{ color: 'var(--text-secondary)' }}>Code d'entrée</p>
                  <input value={editForm.entry_code} onChange={e => setField('entry_code', e.target.value)}
                    placeholder="ex : 1234A#" style={{ padding: '8px 12px', fontSize: '0.875rem' }} />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <p className="text-xs mb-1 font-medium" style={{ color: 'var(--text-secondary)' }}>Check-in</p>
                    <input value={editForm.checkin_time} onChange={e => setField('checkin_time', e.target.value)}
                      placeholder="15h00" style={{ padding: '8px 12px', fontSize: '0.875rem' }} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs mb-1 font-medium" style={{ color: 'var(--text-secondary)' }}>Check-out</p>
                    <input value={editForm.checkout_time} onChange={e => setField('checkout_time', e.target.value)}
                      placeholder="11h00" style={{ padding: '8px 12px', fontSize: '0.875rem' }} />
                  </div>
                </div>
                <div>
                  <p className="text-xs mb-1 font-medium" style={{ color: 'var(--text-secondary)' }}>Instructions</p>
                  <textarea value={editForm.instructions} onChange={e => setField('instructions', e.target.value)}
                    placeholder="Sonner à l'interphone B, clé dans la boîte…"
                    rows={3} style={{ padding: '8px 12px', fontSize: '0.875rem', resize: 'vertical' }} />
                </div>
                <div className="flex gap-2">
                  <button onClick={saveEdit} disabled={saving} className="btn-primary flex-1 text-sm">
                    {saving ? 'Sauvegarde…' : 'Sauvegarder'}
                  </button>
                  <button onClick={() => setEditingCity(null)}
                    className="text-sm px-4 py-2 rounded-xl"
                    style={{ backgroundColor: 'rgba(0,0,0,0.05)', color: 'var(--text-secondary)' }}>
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Urgences ──────────────────────────────────────────────────

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
                  {isActive && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: 'var(--match)' }} />}
                  <span className="text-sm font-medium">{data.country}</span>
                  {isActive && <Badge color="success">Maintenant</Badge>}
                </div>
                <span className="text-sm font-bold font-mono" style={{ color: 'var(--trash)' }}>{data.general}</span>
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
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{data.embassyAddress}</p>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────

const TABS = [
  { key: 'trains',   label: 'Trains' },
  { key: 'airbnbs',  label: 'Hébergements' },
  { key: 'urgences', label: 'Urgences' },
]

export default function Voyage() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const currentCity = getCurrentCity()

  const [tab, setTab] = useState('trains')
  const [trains, setTrains] = useState([])
  const [airbnbs, setAirbnbs] = useState([])
  const [pdfs, setPdfs] = useState([])
  const [loading, setLoading] = useState(true)

  async function fetchData() {
    const [trainsRes, airbnbsRes, pdfsRes] = await Promise.all([
      supabase.from('trains').select('*').order('leg_order'),
      supabase.from('airbnbs').select('*'),
      supabase.from('ticket_pdfs').select('*').order('created_at'),
    ])
    if (trainsRes.data) setTrains(trainsRes.data)
    if (airbnbsRes.data) setAirbnbs(airbnbsRes.data)
    if (pdfsRes.data) setPdfs(pdfsRes.data)
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const trainsByDate = trains.reduce((acc, t) => {
    if (!acc[t.date]) acc[t.date] = []
    acc[t.date].push(t)
    return acc
  }, {})

  function formatDate(d) {
    return new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long'
    })
  }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1) }

  return (
    <div style={{ minHeight: '100dvh', backgroundColor: 'var(--bg-base)' }}>
      <div className="px-4 pt-6 pb-2">
        <h1 className="text-2xl font-semibold">Voyage</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          Trains, hébergements et urgences
        </p>
      </div>

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
          {tab === 'trains' && Object.entries(trainsByDate).map(([date, legs]) => (
            <div key={date}>
              <SectionHeader
                title={cap(formatDate(date))}
                subtitle={`${cap(legs[0].city_from)} → ${cap(legs[legs.length - 1].city_to)}`}
              />
              {legs.map(train => (
                <TrainCard key={train.id} train={train} isAdmin={isAdmin} onSaved={fetchData} pdfs={pdfs} />
              ))}
            </div>
          ))}

          {tab === 'airbnbs' && (
            <>
              <SectionHeader title="Hébergements" subtitle="Tap sur une ville pour les détails" />
              <AirbnbSection airbnbs={airbnbs} isAdmin={isAdmin} onSaved={fetchData} />
            </>
          )}

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
