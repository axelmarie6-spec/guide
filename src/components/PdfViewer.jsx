import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { getCachedPdf, setPdfCache } from '../lib/pdfCache'

export default function PdfViewer({ pdf, onClose, zIndex = 300 }) {
  const [blobUrl, setBlobUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let url = null
    async function load() {
      // Cache first — populated by background prefetch at app startup
      const cached = await getCachedPdf(pdf.storage_path)
      if (cached) {
        url = URL.createObjectURL(cached)
        setBlobUrl(url)
        setLoading(false)
        return
      }
      // Network fallback
      const { data, error: dlErr } = await supabase.storage.from('tickets').download(pdf.storage_path)
      if (dlErr || !data) { setError(true); setLoading(false); return }
      await setPdfCache(pdf.storage_path, data)
      url = URL.createObjectURL(data)
      setBlobUrl(url)
      setLoading(false)
    }
    load()
    return () => { if (url) URL.revokeObjectURL(url) }
  }, [pdf.storage_path])

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex,
      background: 'var(--bg-gradient)', display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: 'calc(14px + env(safe-area-inset-top)) 16px 14px', borderBottom: '1px solid rgba(0,0,0,0.08)', flexShrink: 0,
      }}>
        <span style={{
          fontWeight: 700, fontSize: '0.95rem', flex: 1, minWidth: 0,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{pdf.label}</span>

        {/* Lien plein écran — ouvre le visualiseur natif du navigateur (toutes les pages, zoom) */}
        {blobUrl && (
          <a
            href={blobUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              fontSize: '0.78rem', fontWeight: 600, padding: '7px 13px', borderRadius: '20px',
              background: 'rgba(74,144,217,0.10)', color: 'var(--sky)',
              border: '1px solid rgba(74,144,217,0.2)', textDecoration: 'none', flexShrink: 0,
            }}
          >
            Plein écran ↗
          </a>
        )}

        <button onClick={onClose} style={{
          fontSize: '0.82rem', fontWeight: 600, padding: '7px 14px', borderRadius: '20px',
          background: 'rgba(0,0,0,0.07)', border: 'none', cursor: 'pointer',
          fontFamily: 'inherit', color: 'var(--text-secondary)', flexShrink: 0,
        }}>Fermer</button>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{
            width: 26, height: 26, borderRadius: '50%',
            border: '2.5px solid var(--sky)', borderTopColor: 'transparent',
            animation: 'pdfSpin 0.7s linear infinite',
          }} />
          <style>{`@keyframes pdfSpin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Erreur */}
      {error && (
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '0 32px', textAlign: 'center', gap: 14,
        }}>
          <p style={{ fontSize: '3rem', margin: 0 }}>📵</p>
          <p style={{ fontWeight: 700, fontSize: '0.95rem', margin: 0 }}>Billet non disponible hors-ligne</p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
            Ouvre ce billet une fois connecté — il sera mis en cache.
          </p>
        </div>
      )}

      {/* PDF — iframe pour desktop, bouton plein écran pour mobile */}
      {blobUrl && (
        <iframe
          src={blobUrl}
          title={pdf.label}
          style={{ flex: 1, width: '100%', border: 'none', minHeight: 0 }}
        />
      )}
    </div>
  )
}
