import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { EMERGENCY, CITY_SCHEDULE } from '../lib/travel'
import HeaderAvatar from '../components/HeaderAvatar'
import PdfViewer from '../components/PdfViewer'
import { readCache, writeCache } from '../lib/dbCache'

const MEMBER_COLORS = ['#6b6560', '#4a90d9', '#3baa7a', '#e8a030', '#a78bfa']

const glass = {
  background: 'rgba(255,255,255,0.72)',
  backdropFilter: 'blur(20px) saturate(1.6)',
  WebkitBackdropFilter: 'blur(20px) saturate(1.6)',
  border: '1px solid rgba(255,255,255,0.85)',
  boxShadow: '0 2px 16px rgba(26,23,20,0.06), inset 0 1px 0 rgba(255,255,255,0.9)',
}

// ── Collapsible section ────────────────────────────────────────

function Section({ title, icon, badge, accent, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ ...glass, borderRadius: '22px', overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 14,
          padding: '18px 20px', textAlign: 'left',
          background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        <div style={{
          width: 42, height: 42, borderRadius: '14px', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.15rem',
          background: accent ? `${accent}18` : 'rgba(26,23,20,0.06)',
        }}>{icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 700, fontSize: '0.9rem', margin: 0 }}>{title}</p>
          {badge && <p style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', margin: '3px 0 0' }}>{badge}</p>}
        </div>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s', flexShrink: 0 }}>
          <path d="M6 9l6 6 6-6" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && <div style={{ padding: '0 20px 20px' }}>{children}</div>}
    </div>
  )
}

// ── Upload sheet (admin) ───────────────────────────────────────

function UploadSheet({ trains, onUpload, onClose }) {
  const [legOrder, setLegOrder] = useState(0)
  const [label, setLabel] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef(null)

  const legOptions = [
    { value: 0, label: 'Document général' },
    ...trains.map(t => ({ value: t.leg_order, label: `${t.from_station} → ${t.to_station}` })),
  ]

  async function upload(file) {
    if (!file) return
    if (!label.trim()) { setError('Entre un label.'); return }
    setError('')
    setUploading(true)
    const path = `leg_${legOrder}/${Date.now()}_${label.trim().replace(/\s+/g, '_')}.pdf`
    const { error: se } = await supabase.storage.from('tickets').upload(path, file, { contentType: 'application/pdf' })
    if (se) { setError('Erreur upload Storage.'); setUploading(false); return }
    await supabase.from('ticket_pdfs').insert({ leg_order: legOrder, label: label.trim(), storage_path: path })
    onUpload()
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 250, background: 'rgba(26,23,20,0.4)', backdropFilter: 'blur(4px)' }} />
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 500, zIndex: 251,
        background: 'rgba(250,249,247,0.97)',
        backdropFilter: 'blur(40px)',
        borderRadius: '28px 28px 0 0',
        border: '1px solid rgba(255,255,255,0.85)',
        padding: '20px 20px',
        paddingBottom: 'calc(20px + env(safe-area-inset-bottom, 0px))',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.14)', margin: '0 auto 20px' }} />
        <p style={{ fontWeight: 700, fontSize: '1rem', margin: '0 0 16px' }}>Ajouter un document</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>Tronçon</p>
            <select value={legOrder} onChange={e => setLegOrder(Number(e.target.value))} style={{
              width: '100%', padding: '12px 14px', borderRadius: '14px', fontSize: '0.9rem',
              border: '1.5px solid rgba(26,23,20,0.10)', background: 'rgba(26,23,20,0.04)',
              color: 'var(--text-primary)', fontFamily: 'inherit', outline: 'none',
            }}>
              {legOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>Label</p>
            <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Groupe, Marin, Assurance…" />
          </div>
          {error && <p style={{ fontSize: '0.8rem', color: 'var(--trash)', margin: 0 }}>{error}</p>}
          <input ref={fileRef} type="file" accept="application/pdf" style={{ display: 'none' }}
            onChange={e => upload(e.target.files?.[0])} />
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => fileRef.current?.click()} disabled={uploading} className="btn-primary" style={{ flex: 1 }}>
              {uploading ? 'Envoi…' : 'Choisir le PDF'}
            </button>
            <button onClick={onClose} className="btn-secondary" style={{ flex: 'none', width: 'auto', padding: '0 20px' }}>
              Annuler
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── SOS Modal ─────────────────────────────────────────────────

function SOSModal({ members, onClose }) {
  const [selected, setSelected] = useState(0)
  const [reveal, setReveal] = useState({})

  const m = members[selected]

  function toggleReveal(key) { setReveal(r => ({ ...r, [key]: !r[key] })) }
  function mask(val) { return val ? '•'.repeat(Math.min(val.length, 14)) : '—' }

  const today = new Date().toISOString().slice(0, 10)
  const currentCity = CITY_SCHEDULE.find(c => today >= c.from && today <= c.to)
  const em = currentCity ? EMERGENCY[currentCity.city] : EMERGENCY.bruxelles

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 400,
      display: 'flex', flexDirection: 'column',
      background: 'rgba(14,8,8,0.93)', backdropFilter: 'blur(14px)',
    }}>
      {/* Header */}
      <div style={{ padding: '20px 20px 12px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#e05a5a' }} />
            <p style={{ color: '#e05a5a', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>
              Urgence groupe
            </p>
          </div>
          <h2 style={{ color: 'white', fontWeight: 800, fontSize: '1.6rem', lineHeight: 1.1, margin: 0 }}>Fiches d'urgence</h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem', marginTop: 5, marginBottom: 0 }}>
            Données en cache · Disponibles hors ligne
          </p>
        </div>
        <button onClick={onClose} style={{
          width: 38, height: 38, borderRadius: '50%', flexShrink: 0, marginTop: 4,
          background: 'rgba(255,255,255,0.12)', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Member selector */}
      {members.length > 0 && (
        <div style={{ display: 'flex', gap: 14, padding: '4px 20px 16px', overflowX: 'auto', scrollbarWidth: 'none', flexShrink: 0 }}>
          {members.map((mem, i) => (
            <button key={mem.id} onClick={() => { setSelected(i); setReveal({}) }}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
                flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer',
                opacity: selected === i ? 1 : 0.38, transition: 'opacity 0.18s',
              }}>
              <div style={{
                width: 50, height: 50, borderRadius: '50%', fontWeight: 800, fontSize: '0.9rem', color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: `${MEMBER_COLORS[i % MEMBER_COLORS.length]}cc`,
                border: selected === i ? '2.5px solid white' : '2.5px solid transparent',
                transition: 'border-color 0.18s', lineHeight: 1,
              }}>
                {`${(mem.first_name || mem.pseudo || '?')[0]}${(mem.last_name || '')[0] || ''}`.toUpperCase()}
              </div>
              <span style={{ color: 'white', fontSize: '0.68rem', fontWeight: 600 }}>
                {mem.first_name || mem.pseudo}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Fiche scrollable */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 24px' }}>
        {m && (
          <div style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.13)', borderRadius: '24px', padding: '20px', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
              <div style={{
                width: 54, height: 54, borderRadius: '50%', flexShrink: 0,
                background: `${MEMBER_COLORS[selected % MEMBER_COLORS.length]}bb`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: '1rem', color: 'white',
              }}>
                {`${(m.first_name || m.pseudo || '?')[0]}${(m.last_name || '')[0] || ''}`.toUpperCase()}
              </div>
              <div>
                <p style={{ color: 'white', fontWeight: 700, fontSize: '1.05rem', margin: 0 }}>
                  {[m.first_name, m.last_name].filter(Boolean).join(' ') || m.pseudo}
                </p>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem', margin: '4px 0 0' }}>
                  {m.role === 'admin' ? 'Administrateur' : 'Membre'}
                </p>
              </div>
            </div>

            {[
              { key: 'contact', icon: '📞', label: "Contact d'urgence", val: [m.emergency_name, m.emergency_phone].filter(Boolean).join(' · '), sensitive: false },
              { key: 'allergies', icon: '🚫', label: 'Allergies', val: m.allergies || 'Aucune', sensitive: false },
              { key: 'ceam', icon: '🏥', label: 'N° CEAM', val: m.ceam_number, sensitive: true },
              { key: 'passport', icon: '🪪', label: 'Passeport / CNI', val: m.passport_number, sensitive: true },
            ].map(({ key, icon, label, val, sensitive }) => (
              <div key={key} style={{ padding: '13px 0', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <p style={{ color: 'rgba(255,255,255,0.42)', fontSize: '0.7rem', fontWeight: 600, marginBottom: 7, marginTop: 0 }}>
                  {icon} {label}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <p style={{ color: 'white', fontWeight: 600, fontSize: '0.875rem', flex: 1, margin: 0 }}>
                    {!val ? '—' : sensitive && !reveal[key] ? mask(val) : val}
                  </p>
                  {sensitive && val && (
                    <button onClick={() => toggleReveal(key)} style={{
                      flexShrink: 0, padding: '4px 12px', borderRadius: '20px',
                      fontSize: '0.7rem', fontWeight: 600,
                      background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)',
                      border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                    }}>{reveal[key] ? 'Masquer' : 'Afficher'}</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Emergency numbers strip */}
        {em && (
          <div style={{ background: 'rgba(224,90,90,0.15)', border: '1px solid rgba(224,90,90,0.28)', borderRadius: '20px', padding: '18px' }}>
            <p style={{ color: 'white', fontWeight: 700, fontSize: '0.7rem', letterSpacing: '0.07em', textTransform: 'uppercase', margin: '0 0 14px' }}>
              Numéros d'urgence · {em.country}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {[['🚨', 'Urgences', em.general], ['🚓', 'Police', em.police], ['🚑', 'SAMU', em.samu]].map(([ic, lb, num]) => (
                <div key={lb} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                  padding: '12px 6px', borderRadius: '16px', background: 'rgba(255,255,255,0.07)',
                }}>
                  <span style={{ fontSize: '1.3rem' }}>{ic}</span>
                  <p style={{ color: 'rgba(255,255,255,0.48)', fontSize: '0.62rem', margin: 0 }}>{lb}</p>
                  <p style={{ color: 'white', fontWeight: 800, fontSize: '1.15rem', lineHeight: 1, margin: 0 }}>{num}</p>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: '0.68rem', margin: '0 0 5px' }}>🇫🇷 Ambassade française · {em.country}</p>
              <p style={{ color: 'white', fontWeight: 600, fontSize: '0.875rem', margin: 0 }}>{em.embassy}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────

export default function CoffreFort() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'

  const [trains, setTrains] = useState(() => readCache('coffre_trains_v1') ?? [])
  const [pdfs, setPdfs] = useState(() => readCache('coffre_pdfs_v1') ?? [])
  const [members, setMembers] = useState(() => readCache('coffre_members_v1') ?? [])
  const [loading, setLoading] = useState(() => !readCache('coffre_pdfs_v1'))
  const [sosOpen, setSosOpen] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [openPdf, setOpenPdf] = useState(null)

  async function fetchData() {
    const [trainsRes, pdfsRes, membersRes] = await Promise.all([
      supabase.from('trains')
        .select('leg_order, date, from_station, to_station, departure_time, arrival_time')
        .order('leg_order'),
      supabase.from('ticket_pdfs').select('*').order('created_at'),
      supabase.from('profiles')
        .select('id, first_name, last_name, pseudo, role, emergency_name, emergency_phone, allergies, ceam_number, passport_number')
        .order('created_at'),
    ])
    if (trainsRes.error) console.error('[CoffreFort] trains fetch:', trainsRes.error)
    if (pdfsRes.error) console.error('[CoffreFort] pdfs fetch:', pdfsRes.error)
    if (membersRes.error) console.error('[CoffreFort] members fetch:', membersRes.error)
    if (trainsRes.data) { setTrains(trainsRes.data); writeCache('coffre_trains_v1', trainsRes.data) }
    if (pdfsRes.data) { setPdfs(pdfsRes.data); writeCache('coffre_pdfs_v1', pdfsRes.data) }
    if (membersRes.data) { setMembers(membersRes.data); writeCache('coffre_members_v1', membersRes.data) }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  function fmt(d) {
    return new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  }

  const pdfsByLeg = Object.fromEntries(trains.map(t => [t.leg_order, pdfs.filter(p => p.leg_order === t.leg_order)]))
  const generalPdfs = pdfs.filter(p => p.leg_order === 0)
  const totalPdfs = pdfs.length

  async function deletePdf(pdf) {
    await supabase.storage.from('tickets').remove([pdf.storage_path])
    await supabase.from('ticket_pdfs').delete().eq('id', pdf.id)
    fetchData()
  }

  return (
    <>
      <div style={{ minHeight: '100dvh', paddingBottom: 24 }}>

        {/* Header */}
        <div style={{ padding: '24px 20px 14px' }}>
          {/* Row 1: title + avatar */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
            <div>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', fontWeight: 500, margin: '0 0 3px' }}>
                Documents hors-ligne
              </p>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>Coffre-Fort</h1>
            </div>
            <HeaderAvatar />
          </div>
          {/* Row 2: offline badge + add button */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: '20px',
              background: 'rgba(59,170,122,0.12)', border: '1px solid rgba(59,170,122,0.25)',
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--mint)' }} />
              <p style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--mint)', margin: 0 }}>Offline OK</p>
            </div>
            <button onClick={() => setShowUpload(true)} style={{
              padding: '7px 14px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 700,
              background: 'var(--accent-light)', color: 'var(--accent)',
              border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            }}>+ Ajouter</button>
          </div>
        </div>

        {/* SOS Button */}
        <div style={{ padding: '0 16px 16px' }}>
          <button onClick={() => setSosOpen(true)} style={{
            width: '100%', padding: '18px 20px', borderRadius: '22px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
            background: 'linear-gradient(135deg, #e05a5a 0%, #c0392b 100%)',
            color: 'white', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            fontWeight: 700, fontSize: '1rem', letterSpacing: '-0.01em',
            boxShadow: '0 4px 20px rgba(224,90,90,0.38)',
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7v10l10 5 10-5V7L12 2z" stroke="white" strokeWidth="2" strokeLinejoin="round" />
              <line x1="12" y1="10" x2="12" y2="14" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="12" cy="17" r="1" fill="white" />
            </svg>
            Fiches d'urgence groupe
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ marginLeft: 'auto' }}>
              <path d="M9 18l6-6-6-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
            <div style={{ width: 26, height: 26, borderRadius: '50%', border: '2.5px solid var(--sky)', borderTopColor: 'transparent', animation: 'cfSpin 0.7s linear infinite' }} />
            <style>{`@keyframes cfSpin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '0 16px' }}>

            {/* Billets de train */}
            <Section
              title="Billets de train" icon="🚄"
              badge={`${trains.length} trajet${trains.length > 1 ? 's' : ''} · ${totalPdfs} PDF${totalPdfs !== 1 ? 's' : ''} disponible${totalPdfs !== 1 ? 's' : ''}`}
              accent="#4a90d9" defaultOpen
            >
              {trains.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textAlign: 'center', padding: '12px 0 4px' }}>
                  Aucun trajet renseigné
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {trains.map((t, i) => {
                    const docs = pdfsByLeg[t.leg_order] || []
                    return (
                      <div key={t.leg_order}>
                        {i > 0 && <div style={{ height: '1px', background: 'rgba(26,23,20,0.05)' }} />}
                        <div style={{ padding: '14px 0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{
                              width: 34, height: 34, borderRadius: '11px', flexShrink: 0,
                              background: 'rgba(74,144,217,0.10)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontWeight: 800, fontSize: '0.78rem', color: 'var(--sky)',
                            }}>{i + 1}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontWeight: 700, fontSize: '0.875rem', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {t.from_station} → {t.to_station}
                              </p>
                              <p style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', margin: '3px 0 0' }}>
                                {fmt(t.date)}
                                {t.departure_time ? ` · ${t.departure_time.slice(0, 5)}–${t.arrival_time?.slice(0, 5) || '?'}` : ''}
                              </p>
                            </div>
                            {docs.length > 0 ? (
                              <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '4px 10px', borderRadius: '20px', flexShrink: 0, background: 'rgba(59,170,122,0.12)', color: 'var(--mint)' }}>
                                PDF ✓
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.68rem', fontWeight: 500, padding: '4px 10px', borderRadius: '20px', flexShrink: 0, background: 'rgba(26,23,20,0.06)', color: 'var(--text-tertiary)' }}>
                                À venir
                              </span>
                            )}
                          </div>

                          {docs.length > 0 && (
                            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
                              {docs.map(pdf => (
                                <div key={pdf.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <button onClick={() => setOpenPdf(pdf)} style={{
                                    flex: 1, display: 'flex', alignItems: 'center', gap: 8,
                                    padding: '10px 14px', borderRadius: '14px',
                                    background: 'rgba(74,144,217,0.08)', border: 'none', cursor: 'pointer',
                                    fontFamily: 'inherit', textAlign: 'left',
                                  }}>
                                    <span style={{ fontSize: '0.95rem' }}>📄</span>
                                    <span style={{ flex: 1, fontWeight: 700, fontSize: '0.82rem', color: 'var(--sky)' }}>{pdf.label}</span>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                      <path d="M9 18l6-6-6-6" stroke="var(--sky)" strokeWidth="2" strokeLinecap="round" />
                                    </svg>
                                  </button>
                                  {isAdmin && (
                                    <button onClick={() => deletePdf(pdf)} style={{
                                      width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                                      background: 'rgba(224,90,90,0.10)', border: 'none', cursor: 'pointer',
                                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      color: 'var(--trash)', fontSize: '0.75rem',
                                    }}>✕</button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}

                  {generalPdfs.length > 0 && (
                    <>
                      <div style={{ height: '1px', background: 'rgba(26,23,20,0.07)', margin: '4px 0' }} />
                      <p style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-tertiary)', padding: '10px 0 8px', margin: 0 }}>
                        Documents généraux
                      </p>
                      {generalPdfs.map(pdf => (
                        <div key={pdf.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <button onClick={() => setOpenPdf(pdf)} style={{
                            flex: 1, display: 'flex', alignItems: 'center', gap: 8,
                            padding: '10px 14px', borderRadius: '14px',
                            background: 'rgba(26,23,20,0.04)', border: 'none', cursor: 'pointer',
                            fontFamily: 'inherit', textAlign: 'left',
                          }}>
                            <span style={{ fontSize: '0.95rem' }}>📄</span>
                            <span style={{ flex: 1, fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-primary)' }}>{pdf.label}</span>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                              <path d="M9 18l6-6-6-6" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                          </button>
                          {isAdmin && (
                            <button onClick={() => deletePdf(pdf)} style={{
                              width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                              background: 'rgba(224,90,90,0.10)', border: 'none', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: 'var(--trash)', fontSize: '0.75rem',
                            }}>✕</button>
                          )}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </Section>

            {/* Numéros d'urgence */}
            <Section
              title="Numéros d'urgence" icon="🆘"
              badge={`${Object.keys(EMERGENCY).length} pays · Ambassades incluses`}
              accent="#e05a5a"
            >
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {Object.values(EMERGENCY).map((e, i, arr) => (
                  <div key={e.country}>
                    {i > 0 && <div style={{ height: '1px', background: 'rgba(26,23,20,0.05)' }} />}
                    <div style={{ padding: '14px 0' }}>
                      <p style={{ fontWeight: 700, fontSize: '0.875rem', margin: '0 0 10px' }}>{e.country}</p>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {[['🚨', e.general, 'Urgences'], ['🚓', e.police, 'Police'], ['🚑', e.samu, 'SAMU']].map(([ic, num, lbl]) => (
                          <div key={lbl} style={{
                            display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: '12px',
                            background: 'rgba(26,23,20,0.05)',
                          }}>
                            <span style={{ fontSize: '0.78rem' }}>{ic}</span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{lbl}</span>
                            <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>{num}</span>
                          </div>
                        ))}
                      </div>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', margin: '8px 0 0' }}>
                        🇫🇷 Ambassade · {e.embassy}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Section>

          </div>
        )}
      </div>

      {sosOpen    && <SOSModal members={members} onClose={() => setSosOpen(false)} />}
      {showUpload && <UploadSheet trains={trains} onUpload={() => { setShowUpload(false); fetchData() }} onClose={() => setShowUpload(false)} />}
      {openPdf    && <PdfViewer pdf={openPdf} onClose={() => setOpenPdf(null)} />}
    </>
  )
}
