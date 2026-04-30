import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { CITY_SCHEDULE, getStationMapUrl } from '../lib/travel'
import { useAuth } from '../context/AuthContext'
import HeaderAvatar from '../components/HeaderAvatar'
import PdfViewer from '../components/PdfViewer'
import { readCache, writeCache } from '../lib/dbCache'

// ── Constants ─────────────────────────────────────────────────

const CITY_COLORS = {
  bruxelles: '#e8a030', amsterdam: '#e05a5a', berlin: '#6b6560',
  prague: '#4a90d9',   budapest: '#a78bfa',  vienne: '#3baa7a', geneve: '#e05a5a',
}

const MEMBER_COLORS = ['#6b6560', '#4a90d9', '#3baa7a', '#e8a030', '#a78bfa']

const glass = {
  background: 'rgba(255,255,255,0.68)',
  backdropFilter: 'blur(20px) saturate(1.6)',
  WebkitBackdropFilter: 'blur(20px) saturate(1.6)',
  border: '1px solid rgba(255,255,255,0.82)',
  boxShadow: '0 2px 16px rgba(26,23,20,0.06), inset 0 1px 0 rgba(255,255,255,0.9)',
}

// ── Helpers ───────────────────────────────────────────────────

function getTrainStatuses(trains) {
  const today = new Date().toISOString().slice(0, 10)
  const upcoming = trains.filter(t => t.date >= today).sort((a, b) => a.date.localeCompare(b.date))
  const nextDate = upcoming[0]?.date ?? null
  return trains.map(t => ({
    ...t,
    status: t.date < today ? 'past' : t.date === nextDate ? 'next' : 'upcoming',
  }))
}

function getCityStatuses() {
  const today = new Date().toISOString().slice(0, 10)
  let foundNext = false
  return CITY_SCHEDULE.map(c => {
    if (c.to < today) return { ...c, color: CITY_COLORS[c.city], status: 'past' }
    if (c.from <= today && today <= c.to) return { ...c, color: CITY_COLORS[c.city], status: 'active' }
    if (!foundNext) { foundNext = true; return { ...c, color: CITY_COLORS[c.city], status: 'next' } }
    return { ...c, color: CITY_COLORS[c.city], status: 'upcoming' }
  })
}

function fmtDate(d) {
  return new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
}

function fmtTime(t) { return t?.slice(0, 5) || '?' }

// ── CopyChip ──────────────────────────────────────────────────

function CopyChip({ label, value, last }) {
  const [copied, setCopied] = useState(false)
  const border = last ? {} : { borderBottom: '1px solid rgba(26,23,20,0.05)' }

  if (!value) return (
    <div style={{ padding: '11px 0', ...border }}>
      <p style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', fontWeight: 500, margin: '0 0 2px' }}>{label}</p>
      <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', fontStyle: 'italic', margin: 0 }}>À confirmer</p>
    </div>
  )

  return (
    <button onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1800) }}
      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 0', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', ...border }}>
      <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
        <p style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', fontWeight: 500, margin: '0 0 2px' }}>{label}</p>
        <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</p>
      </div>
      <span style={{
        fontSize: '0.7rem', fontWeight: 700, padding: '4px 10px', borderRadius: '20px', flexShrink: 0,
        background: copied ? 'rgba(59,170,122,0.15)' : 'rgba(26,23,20,0.07)',
        color: copied ? 'var(--mint)' : 'var(--text-secondary)',
        transition: 'all 0.2s',
      }}>{copied ? '✓ Copié' : 'Copier'}</span>
    </button>
  )
}

// ── Route Strip ───────────────────────────────────────────────

function RouteStrip({ cities }) {
  const done = cities.filter(c => c.status === 'past').length
  const active = cities.findIndex(c => c.status === 'active')
  const progress = (done + (active >= 0 ? 0.5 : 0)) / cities.length

  return (
    <div style={{ ...glass, borderRadius: '20px', padding: '16px 18px', marginBottom: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <p style={{ fontWeight: 700, fontSize: '0.875rem', margin: 0 }}>22 jours · 7 étapes</p>
        <p style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', margin: 0 }}>Août 2026</p>
      </div>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Background line */}
        <div style={{ position: 'absolute', left: 12, right: 12, top: '50%', transform: 'translateY(-50%)', height: 2, background: 'rgba(26,23,20,0.09)', borderRadius: 2 }} />
        {/* Progress line */}
        <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', height: 2, background: 'var(--ink)', borderRadius: 2, width: `calc(${progress * 100}% - 24px)`, transition: 'width 0.6s ease' }} />
        {cities.map(c => (
          <div key={c.city} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, position: 'relative', zIndex: 1 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: c.status === 'past' ? 'var(--ink)' : c.status === 'active' ? c.color : 'rgba(255,255,255,0.9)',
              border: `2px solid ${c.status === 'past' ? 'var(--ink)' : c.status === 'active' ? c.color : 'rgba(26,23,20,0.12)'}`,
              fontSize: '0.6rem',
            }}>
              {c.status === 'past'
                ? <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 6.5l2.5 2.5 5.5-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                : <span style={{ fontSize: 9 }}>{c.flag}</span>}
            </div>
            <p style={{ fontSize: '0.55rem', fontWeight: 600, margin: 0, color: c.status === 'active' ? c.color : c.status === 'past' ? 'var(--text-tertiary)' : 'var(--text-secondary)' }}>
              {c.label.slice(0, 4)}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Train Detail Sheet ────────────────────────────────────────

function TrainDetailSheet({ train, pdfs, isAdmin, onClose, onSaved }) {
  const myPdfs = pdfs.filter(p => p.leg_order === train.leg_order)
  const stationMapUrl = getStationMapUrl(train.from_station)

  const [viewerPdf, setViewerPdf] = useState(null)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    date: train.date || '',
    from_station: train.from_station || '',
    to_station: train.to_station || '',
    departure_time: fmtTime(train.departure_time),
    arrival_time: fmtTime(train.arrival_time),
    train_number: train.train_number || '',
    platform_dep: train.platform_dep || '',
    platform_arr: train.platform_arr || '',
    is_connection: train.is_connection || false,
    notes: train.notes || '',
  })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [showUpload, setShowUpload] = useState(false)
  const [uploadLabel, setUploadLabel] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileRef = useRef(null)

  async function saveTrainEdit() {
    setSaving(true)
    setSaveError('')
    const { error } = await supabase.from('trains').update({
      date: editForm.date || null,
      from_station: editForm.from_station.trim() || null,
      to_station: editForm.to_station.trim() || null,
      departure_time: editForm.departure_time || null,
      arrival_time: editForm.arrival_time || null,
      train_number: editForm.train_number.trim() || null,
      platform_dep: editForm.platform_dep.trim() || null,
      platform_arr: editForm.platform_arr.trim() || null,
      is_connection: editForm.is_connection,
      notes: editForm.notes.trim() || null,
    }).eq('id', train.id)
    if (error) { setSaveError('Erreur lors de la sauvegarde.'); setSaving(false); return }
    setEditing(false)
    onSaved()
    setSaving(false)
  }

  async function uploadPdf(file) {
    if (!file) return
    if (!uploadLabel.trim()) { setUploadError('Entre un label.'); return }
    setUploadError('')
    setUploading(true)
    const path = `leg_${train.leg_order}/${Date.now()}_${uploadLabel.trim().replace(/\s+/g, '_')}.pdf`
    const { error: se } = await supabase.storage.from('tickets').upload(path, file, { contentType: 'application/pdf' })
    if (se) { setUploadError('Erreur upload.'); setUploading(false); return }
    await supabase.from('ticket_pdfs').insert({ leg_order: train.leg_order, label: uploadLabel.trim(), storage_path: path })
    setShowUpload(false)
    setUploadLabel('')
    onSaved()
    setUploading(false)
  }

  const accentColor = train.status === 'next' ? 'var(--sky)' : 'var(--text-primary)'

  return (
    <>
      {viewerPdf && <PdfViewer pdf={viewerPdf} onClose={() => setViewerPdf(null)} zIndex={500} />}

      <div style={{ position: 'fixed', inset: 0, zIndex: 400, display: 'flex', flexDirection: 'column', background: 'var(--bg-gradient)' }}>
        {/* Ambient blob */}
        <div style={{ position: 'absolute', top: -40, right: -20, width: '55vw', height: '55vw', maxWidth: 320, borderRadius: '50%', background: `radial-gradient(circle, rgba(74,144,217,0.20) 0%, transparent 70%)`, filter: 'blur(40px)', pointerEvents: 'none' }} />

        {/* Header */}
        <div style={{ padding: 'calc(20px + env(safe-area-inset-top)) 20px 16px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0, position: 'relative', zIndex: 1 }}>
          <div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', fontWeight: 500, margin: '0 0 4px' }}>
              {fmtDate(train.date)}{train.train_number ? ` · ${train.train_number}` : ''}
            </p>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 3px', letterSpacing: '-0.02em' }}>{train.from_station}</h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0 }}>→ {train.to_station}</p>
          </div>
          <button onClick={onClose} style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(26,23,20,0.08)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 4 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="var(--text-primary)" strokeWidth="2.5" strokeLinecap="round" /></svg>
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 24px', display: 'flex', flexDirection: 'column', gap: 12, position: 'relative', zIndex: 1 }}>

          {/* Main card: times */}
          <div style={{ ...glass, borderRadius: '22px', padding: '22px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '2.6rem', fontWeight: 800, lineHeight: 1, margin: 0, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>{fmtTime(train.departure_time)}</p>
                <p style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', margin: '6px 0 0' }}>
                  {train.from_station?.split(' ')[0]}
                </p>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '0 14px' }}>
                <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--sky)', flexShrink: 0 }} />
                  <div style={{ flex: 1, height: 1.5, background: 'rgba(26,23,20,0.12)', borderRadius: 2 }} />
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="var(--text-tertiary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </div>
                {train.is_connection && (
                  <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', background: 'rgba(232,160,48,0.15)', color: 'var(--snooze)' }}>Correspondance</span>
                )}
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '2.6rem', fontWeight: 800, lineHeight: 1, margin: 0, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>{fmtTime(train.arrival_time)}</p>
                <p style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', margin: '6px 0 0' }}>
                  {train.to_station?.split(' ')[0]}
                </p>
              </div>
            </div>

            {/* Info grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {[
                { icon: '🚉', label: 'Voie départ', val: train.platform_dep || '—' },
                { icon: '🏁', label: 'Voie arrivée', val: train.platform_arr || '—' },
                { icon: '🗓️', label: 'Date', val: fmtDate(train.date) },
              ].map(({ icon, label, val }) => (
                <div key={label} style={{ background: 'rgba(26,23,20,0.04)', borderRadius: '14px', padding: '10px 8px', textAlign: 'center' }}>
                  <p style={{ fontSize: '1rem', margin: '0 0 4px' }}>{icon}</p>
                  <p style={{ fontSize: '0.62rem', color: 'var(--text-tertiary)', margin: '0 0 2px', fontWeight: 500 }}>{label}</p>
                  <p style={{ fontSize: '0.8rem', fontWeight: 700, margin: 0 }}>{val}</p>
                </div>
              ))}
            </div>

            {/* Admin full edit */}
            {isAdmin && !editing && (
              <button onClick={() => setEditing(true)} style={{ marginTop: 12, fontSize: '0.75rem', fontWeight: 700, padding: '6px 14px', borderRadius: '20px', background: 'var(--accent-light)', color: 'var(--accent)', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                Modifier le train
              </button>
            )}
            {isAdmin && editing && (
              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Date</p>
                    <input type="date" value={editForm.date} onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))} />
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', paddingBottom: 10 }}>
                    <input type="checkbox" checked={editForm.is_connection} onChange={e => setEditForm(f => ({ ...f, is_connection: e.target.checked }))} />
                    Correspond.
                  </label>
                </div>
                <div>
                  <p style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Gare de départ</p>
                  <input value={editForm.from_station} onChange={e => setEditForm(f => ({ ...f, from_station: e.target.value }))} placeholder="Bruxelles-Midi" />
                </div>
                <div>
                  <p style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Gare d'arrivée</p>
                  <input value={editForm.to_station} onChange={e => setEditForm(f => ({ ...f, to_station: e.target.value }))} placeholder="Amsterdam Centraal" />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Départ</p>
                    <input type="time" value={editForm.departure_time} onChange={e => setEditForm(f => ({ ...f, departure_time: e.target.value }))} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Arrivée</p>
                    <input type="time" value={editForm.arrival_time} onChange={e => setEditForm(f => ({ ...f, arrival_time: e.target.value }))} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>N° train</p>
                    <input value={editForm.train_number} onChange={e => setEditForm(f => ({ ...f, train_number: e.target.value }))} placeholder="IC112" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Voie dép.</p>
                    <input value={editForm.platform_dep} onChange={e => setEditForm(f => ({ ...f, platform_dep: e.target.value }))} placeholder="4A" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Voie arr.</p>
                    <input value={editForm.platform_arr} onChange={e => setEditForm(f => ({ ...f, platform_arr: e.target.value }))} placeholder="7" />
                  </div>
                </div>
                <div>
                  <p style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Notes</p>
                  <textarea value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} placeholder="Infos utiles…" rows={2} style={{ resize: 'vertical' }} />
                </div>
                {saveError && <p style={{ fontSize: '0.8rem', color: 'var(--trash)', margin: 0 }}>{saveError}</p>}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={saveTrainEdit} disabled={saving} className="btn-primary" style={{ flex: 1 }}>{saving ? 'Sauvegarde…' : 'Sauvegarder'}</button>
                  <button onClick={() => { setEditing(false); setSaveError('') }} className="btn-secondary" style={{ flex: 'none', width: 'auto', padding: '0 20px' }}>✕</button>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          {train.notes && (
            <div style={{ ...glass, borderRadius: '18px', padding: '14px 18px' }}>
              <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 6px' }}>Notes</p>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>{train.notes}</p>
            </div>
          )}

          {/* Billets */}
          <div style={{ ...glass, borderRadius: '18px', padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: myPdfs.length > 0 || showUpload ? 12 : 0 }}>
              <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0 }}>Billets</p>
              {isAdmin && !showUpload && (
                <button onClick={() => setShowUpload(true)} style={{ fontSize: '0.72rem', fontWeight: 700, padding: '4px 12px', borderRadius: '20px', background: 'var(--accent-light)', color: 'var(--accent)', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>+ Ajouter</button>
              )}
            </div>

            {myPdfs.length === 0 && !showUpload && (
              <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', margin: 0, padding: '4px 0' }}>Billets à venir</p>
            )}

            {myPdfs.map((pdf, i) => (
              <button key={pdf.id} onClick={() => setViewerPdf(pdf)} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: '14px',
                background: i === 0 ? 'var(--ink)' : 'rgba(26,23,20,0.05)',
                border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', marginBottom: 6,
                boxShadow: i === 0 ? '0 4px 12px rgba(26,23,20,0.18)' : 'none',
              }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke={i === 0 ? 'white' : 'var(--text-primary)'} strokeWidth="2" />
                  <polyline points="14,2 14,8 20,8" stroke={i === 0 ? 'white' : 'var(--text-primary)'} strokeWidth="2" strokeLinecap="round" />
                </svg>
                <span style={{ flex: 1, fontWeight: 700, fontSize: '0.875rem', color: i === 0 ? 'white' : 'var(--text-primary)' }}>{pdf.label}</span>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke={i === 0 ? 'rgba(255,255,255,0.5)' : 'var(--text-tertiary)'} strokeWidth="2" strokeLinecap="round" /></svg>
              </button>
            ))}

            {showUpload && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
                <input value={uploadLabel} onChange={e => setUploadLabel(e.target.value)} placeholder="Label : Groupe, Marin…" />
                {uploadError && <p style={{ fontSize: '0.8rem', color: 'var(--trash)', margin: 0 }}>{uploadError}</p>}
                <input ref={fileRef} type="file" accept="application/pdf" style={{ display: 'none' }} onChange={e => uploadPdf(e.target.files?.[0])} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => fileRef.current?.click()} disabled={uploading} className="btn-primary" style={{ flex: 1 }}>{uploading ? 'Envoi…' : 'Choisir le PDF'}</button>
                  <button onClick={() => { setShowUpload(false); setUploadLabel(''); setUploadError('') }} className="btn-secondary" style={{ flex: 'none', width: 'auto', padding: '0 16px' }}>✕</button>
                </div>
              </div>
            )}
          </div>

          {/* Plan de gare */}
          {stationMapUrl && (
            <a href={stationMapUrl} target="_blank" rel="noopener noreferrer" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              ...glass, borderRadius: '16px', padding: '14px 18px', textDecoration: 'none',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: '1.1rem' }}>🗺️</span>
                <div>
                  <p style={{ fontSize: '0.82rem', fontWeight: 700, margin: 0 }}>Plan de gare</p>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', margin: '2px 0 0' }}>{train.from_station}</p>
                </div>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" /></svg>
            </a>
          )}
        </div>
      </div>
    </>
  )
}

// ── Train Card ────────────────────────────────────────────────

function TrainCard({ train, onClick }) {
  if (train.status === 'past') {
    return (
      <button onClick={onClick} style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
        <div style={{ background: 'rgba(255,255,255,0.28)', border: '1px solid rgba(26,23,20,0.07)', borderRadius: '18px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', margin: 0 }}>
                {fmtDate(train.date)}{train.train_number ? ` · ${train.train_number}` : ''}
              </p>
              <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', background: 'rgba(26,23,20,0.05)', color: 'var(--text-tertiary)' }}>Effectué</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <p style={{ fontWeight: 700, fontSize: '1.1rem', textDecoration: 'line-through', color: 'var(--text-tertiary)', margin: 0 }}>{fmtTime(train.departure_time)}</p>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>{train.from_station?.split(' ')[0]}</span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" /></svg>
              <p style={{ fontWeight: 700, fontSize: '1.1rem', textDecoration: 'line-through', color: 'var(--text-tertiary)', margin: 0 }}>{fmtTime(train.arrival_time)}</p>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>{train.to_station?.split(' ')[0]}</span>
            </div>
          </div>
        </div>
      </button>
    )
  }

  if (train.status === 'next') {
    const color = 'var(--sky)'
    return (
      <button onClick={onClick} style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
        <div style={{
          background: 'linear-gradient(135deg, rgba(74,144,217,0.12) 0%, rgba(255,255,255,0.80) 100%)',
          backdropFilter: 'blur(20px) saturate(1.6)', WebkitBackdropFilter: 'blur(20px) saturate(1.6)',
          border: '1.5px solid rgba(74,144,217,0.35)', borderRadius: '22px', padding: '18px',
          boxShadow: '0 6px 28px rgba(74,144,217,0.18)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--sky)' }} />
              <p style={{ fontWeight: 700, fontSize: '0.72rem', margin: 0 }}>Prochain train · {fmtDate(train.date)}</p>
            </div>
            {train.train_number && (
              <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', background: 'rgba(74,144,217,0.15)', color: 'var(--sky)' }}>{train.train_number}</span>
            )}
            {train.is_connection && (
              <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', background: 'rgba(232,160,48,0.15)', color: 'var(--snooze)' }}>Correspondance</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <div>
              <p style={{ fontSize: '2.2rem', fontWeight: 800, lineHeight: 1, margin: 0, letterSpacing: '-0.03em' }}>{fmtTime(train.departure_time)}</p>
              <p style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', margin: '6px 0 0' }}>{train.from_station?.split(' ')[0]}</p>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--sky)', flexShrink: 0 }} />
                <div style={{ flex: 1, height: 1.5, background: 'rgba(74,144,217,0.25)', borderRadius: 2 }} />
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="var(--sky)" strokeWidth="2.5" strokeLinecap="round" /></svg>
              </div>
              {train.platform_dep && <p style={{ fontSize: '0.62rem', color: 'var(--text-tertiary)', margin: 0 }}>Voie {train.platform_dep}</p>}
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '2.2rem', fontWeight: 800, lineHeight: 1, margin: 0, letterSpacing: '-0.03em' }}>{fmtTime(train.arrival_time)}</p>
              <p style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', margin: '6px 0 0' }}>{train.to_station?.split(' ')[0]}</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(26,23,20,0.04)', borderRadius: '14px' }}>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: 0 }}>
              {train.from_station} → {train.to_station}
            </p>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" /></svg>
          </div>
        </div>
      </button>
    )
  }

  // Upcoming
  return (
    <button onClick={onClick} style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
      <div style={{ ...glass, borderRadius: '18px', padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', margin: 0 }}>
            {fmtDate(train.date)}{train.train_number ? ` · ${train.train_number}` : ''}
          </p>
          <div style={{ display: 'flex', gap: 4 }}>
            {train.is_connection && <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', background: 'rgba(232,160,48,0.12)', color: 'var(--snooze)' }}>Correspondance</span>}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontWeight: 800, fontSize: '1.4rem', lineHeight: 1, margin: 0, letterSpacing: '-0.02em' }}>{fmtTime(train.departure_time)}</p>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: '5px 0 0' }}>{train.from_station?.split(' ')[0]}</p>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 3 }}>
              <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(26,23,20,0.2)', flexShrink: 0 }} />
              <div style={{ flex: 1, height: 1, background: 'rgba(26,23,20,0.12)' }} />
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="var(--text-tertiary)" strokeWidth="2.5" strokeLinecap="round" /></svg>
            </div>
            {train.platform_dep && <p style={{ fontSize: '0.58rem', color: 'var(--text-tertiary)', margin: 0 }}>Voie {train.platform_dep}</p>}
          </div>
          <div style={{ textAlign: 'right', minWidth: 0 }}>
            <p style={{ fontWeight: 800, fontSize: '1.4rem', lineHeight: 1, margin: 0, letterSpacing: '-0.02em' }}>{fmtTime(train.arrival_time)}</p>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: '5px 0 0' }}>{train.to_station?.split(' ')[0]}</p>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}><path d="M9 18l6-6-6-6" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" /></svg>
        </div>
      </div>
    </button>
  )
}

// ── Hotel Detail Sheet ────────────────────────────────────────

function HotelDetailSheet({ city, airbnb, isAdmin, onClose, onSaved }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    address: airbnb?.address || '', entry_code: airbnb?.entry_code || '',
    checkin_time: airbnb?.checkin_time || '', checkout_time: airbnb?.checkout_time || '',
    wifi_name: airbnb?.wifi_name || '', wifi_password: airbnb?.wifi_password || '',
    instructions: airbnb?.instructions || '',
  })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  function set(field, value) { setForm(f => ({ ...f, [field]: value })) }

  async function save() {
    setSaving(true)
    setSaveError('')
    const { error } = await supabase.from('airbnbs').update({
      address: form.address.trim() || null,
      entry_code: form.entry_code.trim() || null,
      checkin_time: form.checkin_time.trim() || null,
      checkout_time: form.checkout_time.trim() || null,
      wifi_name: form.wifi_name.trim() || null,
      wifi_password: form.wifi_password.trim() || null,
      instructions: form.instructions.trim() || null,
    }).eq('city', city.city)
    if (error) { setSaveError('Erreur lors de la sauvegarde.'); setSaving(false); return }
    setEditing(false)
    onSaved()
    setSaving(false)
  }

  const wifiStr = airbnb?.wifi_name
    ? airbnb.wifi_password ? `${airbnb.wifi_name} · ${airbnb.wifi_password}` : airbnb.wifi_name
    : null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 400, display: 'flex', flexDirection: 'column', background: 'var(--bg-gradient)' }}>
      {/* Ambient blob */}
      <div style={{ position: 'absolute', top: -30, right: -20, width: '50vw', height: '50vw', maxWidth: 300, borderRadius: '50%', background: `radial-gradient(circle, ${city.color}30 0%, transparent 70%)`, filter: 'blur(40px)', pointerEvents: 'none' }} />

      {/* Header */}
      <div style={{ padding: 'calc(20px + env(safe-area-inset-top)) 20px 16px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0, position: 'relative', zIndex: 1 }}>
        <div>
          <p style={{ fontSize: '2.5rem', margin: '0 0 6px', lineHeight: 1 }}>{city.flag}</p>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0 0 3px', letterSpacing: '-0.02em' }}>{city.label}</h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
            {city.from} → {city.to} · {Math.round((new Date(city.to) - new Date(city.from)) / 86400000)} nuits
          </p>
        </div>
        <button onClick={onClose} style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(26,23,20,0.08)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 6 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="var(--text-primary)" strokeWidth="2.5" strokeLinecap="round" /></svg>
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 24px', display: 'flex', flexDirection: 'column', gap: 12, position: 'relative', zIndex: 1 }}>

        {!editing ? (
          <>
            {/* Airbnb card */}
            <div style={{ ...glass, borderRadius: '22px', padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 34, height: 34, borderRadius: '11px', background: 'rgba(232,160,48,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>🏠</div>
                  <p style={{ fontWeight: 700, fontSize: '0.9rem', margin: 0 }}>Hébergement</p>
                </div>
                {city.status === 'active' && (
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '4px 10px', borderRadius: '20px', background: 'rgba(59,170,122,0.12)', color: 'var(--mint)' }}>Actuel</span>
                )}
              </div>

              <CopyChip label="Adresse" value={airbnb?.address} />
              <CopyChip label="Code boîte à clés" value={airbnb?.entry_code} />
              <CopyChip label="Wi-Fi" value={wifiStr} last />

              {(airbnb?.checkin_time || airbnb?.checkout_time) && (
                <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                  <div style={{ flex: 1, background: 'rgba(232,160,48,0.08)', borderRadius: '14px', padding: '12px', textAlign: 'center' }}>
                    <p style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', margin: '0 0 4px' }}>Check-in</p>
                    <p style={{ fontWeight: 800, fontSize: '1.3rem', margin: 0 }}>{airbnb?.checkin_time || '—'}</p>
                  </div>
                  <div style={{ flex: 1, background: 'rgba(232,160,48,0.08)', borderRadius: '14px', padding: '12px', textAlign: 'center' }}>
                    <p style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', margin: '0 0 4px' }}>Check-out</p>
                    <p style={{ fontWeight: 800, fontSize: '1.3rem', margin: 0 }}>{airbnb?.checkout_time || '—'}</p>
                  </div>
                </div>
              )}

              {airbnb?.instructions && (
                <div style={{ marginTop: 14, background: 'rgba(26,23,20,0.04)', borderRadius: '14px', padding: '12px 14px' }}>
                  <p style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-tertiary)', margin: '0 0 6px' }}>Notes propriétaire</p>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{airbnb.instructions}</p>
                </div>
              )}

              {!airbnb?.address && (
                <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', margin: 0 }}>Infos à venir.</p>
              )}
            </div>

            <button onClick={() => setEditing(true)} style={{ padding: '14px', borderRadius: '16px', background: 'var(--accent-light)', color: 'var(--accent)', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.875rem', fontFamily: 'inherit' }}>
              Modifier les infos
            </button>
          </>
        ) : (
          /* Edit form */
          <div style={{ ...glass, borderRadius: '22px', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ fontWeight: 700, fontSize: '0.9rem', margin: 0 }}>Modifier l'hébergement</p>
            {[
              { field: 'address', label: 'Adresse', placeholder: '123 Rue…' },
              { field: 'entry_code', label: 'Code entrée', placeholder: '#1234' },
              { field: 'checkin_time', label: 'Check-in', placeholder: '15:00' },
              { field: 'checkout_time', label: 'Check-out', placeholder: '11:00' },
              { field: 'wifi_name', label: 'Nom Wi-Fi', placeholder: 'MyWifi_5G' },
              { field: 'wifi_password', label: 'Mot de passe Wi-Fi', placeholder: 'MonMotDePasse' },
            ].map(({ field, label, placeholder }) => (
              <div key={field}>
                <p style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>{label}</p>
                <input value={form[field]} onChange={e => set(field, e.target.value)} placeholder={placeholder} />
              </div>
            ))}
            <div>
              <p style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>Instructions</p>
              <textarea value={form.instructions} onChange={e => set('instructions', e.target.value)} placeholder="Sonner à l'interphone B…" rows={3} style={{ resize: 'vertical' }} />
            </div>
            {saveError && <p style={{ fontSize: '0.8rem', color: 'var(--trash)', margin: 0 }}>{saveError}</p>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={save} disabled={saving} className="btn-primary" style={{ flex: 1 }}>{saving ? 'Sauvegarde…' : 'Sauvegarder'}</button>
              <button onClick={() => setEditing(false)} className="btn-secondary" style={{ flex: 'none', width: 'auto', padding: '0 20px' }}>Annuler</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Hotel Card ────────────────────────────────────────────────

function HotelCard({ city, airbnb, onClick }) {
  const hasData = !!airbnb?.address

  if (city.status === 'past') {
    return (
      <button onClick={onClick} style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
        <div style={{ background: 'rgba(255,255,255,0.28)', border: '1px solid rgba(26,23,20,0.07)', borderRadius: '18px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: '12px', background: 'rgba(26,23,20,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', filter: 'grayscale(0.7)', flexShrink: 0 }}>{city.flag}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-tertiary)', textDecoration: 'line-through', margin: 0 }}>{city.label}</p>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', margin: '2px 0 0' }}>{city.from} → {city.to}</p>
          </div>
          <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M1.5 6.5l2.5 2.5 6.5-6" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
        </div>
      </button>
    )
  }

  if (city.status === 'active') {
    return (
      <button onClick={onClick} style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
        <div style={{
          background: `linear-gradient(135deg, ${city.color}18 0%, rgba(255,255,255,0.82) 100%)`,
          backdropFilter: 'blur(20px) saturate(1.6)', WebkitBackdropFilter: 'blur(20px) saturate(1.6)',
          border: `1.5px solid ${city.color}35`, borderRadius: '22px', padding: '18px',
          boxShadow: `0 6px 28px ${city.color}18`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: city.color }} />
              <p style={{ fontWeight: 700, fontSize: '0.72rem', margin: 0 }}>Hébergement actuel · {city.from} – {city.to}</p>
            </div>
            <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', background: `${city.color}20`, color: city.color }}>
              {Math.round((new Date(city.to) - new Date(city.from)) / 86400000)} nuits
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: '2.6rem', lineHeight: 1, flexShrink: 0 }}>{city.flag}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 800, fontSize: '1.5rem', margin: 0, letterSpacing: '-0.02em' }}>{city.label}</p>
              {airbnb?.address && <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: '4px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{airbnb.address}</p>}
              {airbnb?.entry_code && <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: '2px 0 0' }}>Code : <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{airbnb.entry_code}</span></p>}
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}><path d="M9 18l6-6-6-6" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" /></svg>
          </div>
        </div>
      </button>
    )
  }

  if (city.status === 'next') {
    return (
      <button onClick={onClick} style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
        <div style={{ ...glass, borderRadius: '18px', padding: '14px 16px', border: `1.5px solid ${city.color}30`, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{ width: 48, height: 48, borderRadius: '16px', background: `${city.color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>{city.flag}</div>
            <div style={{ position: 'absolute', top: -4, right: -4, width: 14, height: 14, borderRadius: '50%', background: city.color, border: '2px solid white' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
              <p style={{ fontWeight: 700, fontSize: '0.95rem', margin: 0 }}>{city.label}</p>
              <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '2px 7px', borderRadius: '20px', background: `${city.color}18`, color: city.color }}>Prochain</span>
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: 0 }}>{city.from} → {city.to}</p>
            {airbnb?.address && <p style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{airbnb.address}</p>}
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}><path d="M9 18l6-6-6-6" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" /></svg>
        </div>
      </button>
    )
  }

  // Upcoming
  return (
    <button onClick={onClick} style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
      <div style={{ ...glass, borderRadius: '18px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 48, height: 48, borderRadius: '16px', background: `${city.color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>{city.flag}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 700, fontSize: '0.95rem', margin: '0 0 3px' }}>{city.label}</p>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: 0 }}>{city.from} → {city.to}</p>
          {!hasData && <p style={{ fontSize: '0.68rem', color: 'var(--snooze)', margin: '2px 0 0' }}>Infos à confirmer</p>}
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}><path d="M9 18l6-6-6-6" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" /></svg>
      </div>
    </button>
  )
}

// ── Page principale ───────────────────────────────────────────

export default function Voyage() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'

  const [tab, setTab] = useState('trains')
  const [trains, setTrains] = useState(() => readCache('voyage_trains_v1') ?? [])
  const [airbnbs, setAirbnbs] = useState(() => readCache('voyage_airbnbs_v1') ?? [])
  const [pdfs, setPdfs] = useState(() => readCache('voyage_pdfs_v1') ?? [])
  const [members, setMembers] = useState(() => readCache('voyage_members_v1') ?? [])
  const [loading, setLoading] = useState(() => !readCache('voyage_trains_v1'))

  const [openTrain, setOpenTrain] = useState(null)
  const [openCity, setOpenCity] = useState(null)

  async function fetchData() {
    const [trainsRes, airbnbsRes, pdfsRes, membersRes] = await Promise.all([
      supabase.from('trains').select('*').order('leg_order'),
      supabase.from('airbnbs').select('*'),
      supabase.from('ticket_pdfs').select('*').order('created_at'),
      supabase.from('profiles').select('id, first_name, last_name, pseudo').eq('banned', false).order('created_at'),
    ])
    if (trainsRes.data) { setTrains(trainsRes.data); writeCache('voyage_trains_v1', trainsRes.data) }
    if (airbnbsRes.data) { setAirbnbs(airbnbsRes.data); writeCache('voyage_airbnbs_v1', airbnbsRes.data) }
    if (pdfsRes.data) { setPdfs(pdfsRes.data); writeCache('voyage_pdfs_v1', pdfsRes.data) }
    if (membersRes.data) { setMembers(membersRes.data); writeCache('voyage_members_v1', membersRes.data) }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const trainList = getTrainStatuses(trains)
  const cityList = getCityStatuses()

  const selectedTrain = openTrain !== null ? trainList.find(t => t.id === openTrain) : null
  const selectedCity = openCity !== null ? cityList.find(c => c.city === openCity) : null
  const selectedAirbnb = openCity !== null ? airbnbs.find(a => a.city === openCity) : null

  return (
    <>
      <div style={{ minHeight: '100dvh', paddingBottom: 24 }}>

        {/* Header */}
        <div style={{ padding: '24px 20px 16px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', fontWeight: 500, margin: '0 0 3px' }}>
              22 jours · 7 villes · {members.length || 5} membres
            </p>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>Mon Voyage</h1>
          </div>
          {/* Stacked member avatars + my avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <div style={{ display: 'flex' }}>
              {members.slice(0, 5).map((m, i) => (
                <div key={m.id} style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: MEMBER_COLORS[i % MEMBER_COLORS.length],
                  border: '2px solid var(--sand-50)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: '0.6rem', color: 'white',
                  marginLeft: i === 0 ? 0 : -8, zIndex: 5 - i,
                }}>
                  {`${(m.first_name || m.pseudo || '?')[0]}${(m.last_name || '')[0] || ''}`.toUpperCase()}
                </div>
              ))}
            </div>
            <HeaderAvatar />
          </div>
        </div>

        {/* Tab switcher */}
        <div style={{ padding: '0 16px 14px' }}>
          <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: '18px', background: 'rgba(26,23,20,0.07)', border: '1px solid rgba(255,255,255,0.5)' }}>
            {[{ id: 'trains', label: '🚄 Trains' }, { id: 'hebergements', label: '🏠 Hébergements' }].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                flex: 1, padding: '11px 0', borderRadius: '14px', fontSize: '0.875rem', fontWeight: 700,
                background: tab === t.id ? 'rgba(255,255,255,0.78)' : 'transparent',
                color: tab === t.id ? 'var(--text-primary)' : 'var(--text-tertiary)',
                boxShadow: tab === t.id ? '0 1px 8px rgba(26,23,20,0.09)' : 'none',
                border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}>{t.label}</button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
            <div style={{ width: 26, height: 26, borderRadius: '50%', border: '2.5px solid var(--sky)', borderTopColor: 'transparent', animation: 'vSpin 0.7s linear infinite' }} />
            <style>{`@keyframes vSpin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : (
          <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <RouteStrip cities={cityList} />

            {tab === 'trains' && trainList.map(train => (
              <TrainCard key={train.id} train={train} onClick={() => setOpenTrain(train.id)} />
            ))}

            {tab === 'hebergements' && cityList.map(city => (
              <HotelCard
                key={city.city}
                city={city}
                airbnb={airbnbs.find(a => a.city === city.city)}
                onClick={() => setOpenCity(city.city)}
              />
            ))}
          </div>
        )}
      </div>

      {selectedTrain && (
        <TrainDetailSheet
          train={selectedTrain}
          pdfs={pdfs}
          isAdmin={isAdmin}
          onClose={() => setOpenTrain(null)}
          onSaved={() => { fetchData() }}
        />
      )}

      {selectedCity && (
        <HotelDetailSheet
          city={selectedCity}
          airbnb={selectedAirbnb}
          isAdmin={isAdmin}
          onClose={() => setOpenCity(null)}
          onSaved={() => { fetchData() }}
        />
      )}
    </>
  )
}
