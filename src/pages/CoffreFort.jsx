import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

// ── Ligne PDF ─────────────────────────────────────────────────

function PdfRow({ pdf, isAdmin, onDelete }) {
  async function open() {
    const { data } = supabase.storage.from('tickets').getPublicUrl(pdf.storage_path)
    try {
      const res = await fetch(data.publicUrl)
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.target = '_blank'
      a.rel = 'noopener noreferrer'
      a.click()
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000)
    } catch {
      window.open(data.publicUrl, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div className="flex items-center justify-between px-4 py-3.5">
      <button onClick={open} className="flex items-center gap-2 text-sm font-medium"
        style={{ color: 'var(--accent)' }}>
        <span>📄</span>
        <span>{pdf.label}</span>
      </button>
      {isAdmin && (
        <button onClick={() => onDelete(pdf)}
          className="text-xs w-6 h-6 flex items-center justify-center rounded-full"
          style={{ backgroundColor: 'rgba(220,38,38,0.08)', color: 'var(--trash)' }}>
          ✕
        </button>
      )}
    </div>
  )
}

// ── Formulaire d'upload ───────────────────────────────────────

function UploadForm({ trains, onUpload, onClose }) {
  const [legOrder, setLegOrder] = useState(0)
  const [label, setLabel] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef(null)

  const legOptions = [
    { value: 0, label: 'Document général' },
    ...trains.map(t => ({
      value: t.leg_order,
      label: `Leg ${t.leg_order} — ${t.from_station} → ${t.to_station}`,
    })),
  ]

  async function upload(file) {
    if (!file) return
    if (!label.trim()) { setError('Entre un label pour ce document.'); return }
    setError('')
    setUploading(true)
    const safe = label.trim().replace(/\s+/g, '_')
    const path = `leg_${legOrder}/${Date.now()}_${safe}.pdf`
    const { error: storageErr } = await supabase.storage
      .from('tickets')
      .upload(path, file, { contentType: 'application/pdf' })
    if (storageErr) {
      setError('Erreur upload. Vérifie les politiques Storage.')
      setUploading(false)
      return
    }
    const { error: dbErr } = await supabase.from('ticket_pdfs').insert({
      leg_order: legOrder,
      label: label.trim(),
      storage_path: path,
    })
    if (dbErr) {
      setError('Fichier envoyé mais erreur DB. Contacte admin.')
      setUploading(false)
      return
    }
    onUpload()
    setUploading(false)
  }

  const selectStyle = {
    padding: '8px 12px',
    fontSize: '0.875rem',
    width: '100%',
    borderRadius: '14px',
    border: '1.5px solid rgba(0,0,0,0.08)',
    background: 'rgba(0,0,0,0.04)',
    color: 'var(--text-primary)',
    fontFamily: 'inherit',
    outline: 'none',
  }

  return (
    <div className="card mx-4 mb-4 p-4 flex flex-col gap-3">
      <p className="text-sm font-semibold">Ajouter un document</p>
      <div>
        <p className="text-xs mb-1 font-medium" style={{ color: 'var(--text-secondary)' }}>Tronçon</p>
        <select value={legOrder} onChange={e => setLegOrder(Number(e.target.value))} style={selectStyle}>
          {legOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      <div>
        <p className="text-xs mb-1 font-medium" style={{ color: 'var(--text-secondary)' }}>Label</p>
        <input value={label} onChange={e => setLabel(e.target.value)}
          placeholder="Groupe, Marin, Assurance…"
          style={{ padding: '8px 12px', fontSize: '0.875rem' }} />
      </div>
      <input ref={fileRef} type="file" accept="application/pdf" className="hidden"
        onChange={e => upload(e.target.files?.[0])} />
      {error && <p className="text-xs" style={{ color: 'var(--trash)' }}>{error}</p>}
      <div className="flex gap-2">
        <button onClick={() => fileRef.current?.click()} disabled={uploading}
          className="btn-primary flex-1 text-sm">
          {uploading ? 'Envoi en cours…' : 'Choisir le PDF'}
        </button>
        <button onClick={onClose}
          className="text-sm px-4 py-2 rounded-xl"
          style={{ backgroundColor: 'rgba(0,0,0,0.05)', color: 'var(--text-secondary)' }}>
          Annuler
        </button>
      </div>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────

export default function CoffreFort() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'

  const [trains, setTrains] = useState([])
  const [pdfs, setPdfs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)

  async function fetchData() {
    const [trainsRes, pdfsRes] = await Promise.all([
      supabase.from('trains').select('leg_order, date, from_station, to_station').order('leg_order'),
      supabase.from('ticket_pdfs').select('*').order('created_at'),
    ])
    if (trainsRes.data) setTrains(trainsRes.data)
    if (pdfsRes.data) {
      setPdfs(pdfsRes.data)
      if (navigator.onLine) {
        pdfsRes.data.forEach(pdf => {
          const { data } = supabase.storage.from('tickets').getPublicUrl(pdf.storage_path)
          fetch(data.publicUrl, { mode: 'no-cors' }).catch(() => {})
        })
      }
    }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  async function deletePdf(pdf) {
    await supabase.storage.from('tickets').remove([pdf.storage_path])
    await supabase.from('ticket_pdfs').delete().eq('id', pdf.id)
    fetchData()
  }

  function formatDate(d) {
    return new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
  }

  // PDFs groupés
  const generalPdfs = pdfs.filter(p => p.leg_order === 0)
  const pdfsByLeg = trains
    .map(t => ({ train: t, docs: pdfs.filter(p => p.leg_order === t.leg_order) }))
    .filter(({ docs }) => docs.length > 0)

  const isEmpty = pdfsByLeg.length === 0 && generalPdfs.length === 0

  return (
    <div style={{ minHeight: '100dvh' }}>
      <div className="px-4 pt-6 pb-2 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Coffre-Fort</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Billets et documents du groupe
          </p>
        </div>
        {isAdmin && !showUpload && (
          <button onClick={() => setShowUpload(true)}
            className="text-sm font-semibold px-4 py-1.5 rounded-full shrink-0"
            style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>
            + Ajouter
          </button>
        )}
      </div>

      {isAdmin && showUpload && (
        <div className="mt-3">
          <UploadForm
            trains={trains}
            onUpload={() => { setShowUpload(false); fetchData() }}
            onClose={() => setShowUpload(false)}
          />
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
        </div>
      ) : (
        <div className="pb-6 mt-2">
          {isEmpty && (
            <div className="text-center py-16 px-8">
              <p className="text-5xl mb-3">📂</p>
              <p className="text-sm font-medium">Aucun document pour l'instant</p>
              {isAdmin && (
                <p className="text-xs mt-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Tape "+ Ajouter" pour uploader un billet ou un document.
                </p>
              )}
            </div>
          )}

          {/* Billets par tronçon */}
          {pdfsByLeg.map(({ train, docs }) => (
            <div key={train.leg_order} className="mb-3">
              <div className="px-4 pt-3 pb-1">
                <p className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--text-secondary)' }}>
                  {formatDate(train.date)} — {train.from_station} → {train.to_station}
                </p>
              </div>
              <div className="card mx-4">
                {docs.map((pdf, i) => (
                  <div key={pdf.id}>
                    {i > 0 && <div style={{ height: '1px', backgroundColor: 'rgba(0,0,0,0.06)' }} />}
                    <PdfRow pdf={pdf} isAdmin={isAdmin} onDelete={deletePdf} />
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Documents généraux */}
          {generalPdfs.length > 0 && (
            <div className="mb-3">
              <div className="px-4 pt-3 pb-1">
                <p className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--text-secondary)' }}>
                  Documents généraux
                </p>
              </div>
              <div className="card mx-4">
                {generalPdfs.map((pdf, i) => (
                  <div key={pdf.id}>
                    {i > 0 && <div style={{ height: '1px', backgroundColor: 'rgba(0,0,0,0.06)' }} />}
                    <PdfRow pdf={pdf} isAdmin={isAdmin} onDelete={deletePdf} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
