import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import HeaderAvatar from '../components/HeaderAvatar'

const CATEGORY_META = {
  culture:   { label: 'Culture',     emoji: '🏛️', color: '#4a90d9', bg: 'rgba(74,144,217,0.12)'  },
  nature:    { label: 'Nature',      emoji: '🌿', color: '#3baa7a', bg: 'rgba(59,170,122,0.12)'  },
  food:      { label: 'Resto & Bar', emoji: '🍽️', color: '#e05a5a', bg: 'rgba(224,90,90,0.12)'  },
  nightlife: { label: 'Soirée',      emoji: '🎶', color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
  shopping:  { label: 'Shopping',    emoji: '🛍️', color: '#e8a030', bg: 'rgba(232,160,48,0.12)'  },
  sport:     { label: 'Sport',       emoji: '⚡',  color: '#6b6560', bg: 'rgba(107,101,96,0.12)'  },
  other:     { label: 'Autre',       emoji: '✨', color: '#b0aaa3', bg: 'rgba(176,170,163,0.12)' },
}

const CUSTOM_KEY = '__custom__'

const CITY_ORDER = ['bruxelles','amsterdam','berlin','prague','budapest','vienne','geneve']
const CITY_LABELS = {
  bruxelles: '🇧🇪 Bruxelles', amsterdam: '🇳🇱 Amsterdam', berlin: '🇩🇪 Berlin',
  prague: '🇨🇿 Prague', budapest: '🇭🇺 Budapest', vienne: '🇦🇹 Vienne', geneve: '🇨🇭 Genève',
}
const CITY_NIGHTS = {
  bruxelles: 2, amsterdam: 3, berlin: 4,
  prague: 3, budapest: 4, vienne: 3, geneve: 3,
}

const CAT_PILLS = [
  { id: 'all', label: 'Tout' },
  { id: 'culture', label: 'Culture' },
  { id: 'food', label: 'Restos' },
  { id: 'nightlife', label: 'Soirée' },
  { id: 'nature', label: 'Nature' },
  { id: 'shopping', label: 'Shopping' },
]

function getCategoryMeta(cat) {
  return CATEGORY_META[cat] ?? { label: cat, emoji: '✨', color: '#b0aaa3', bg: 'rgba(176,170,163,0.12)' }
}

const glass = {
  background: 'rgba(255,255,255,0.68)',
  backdropFilter: 'blur(20px) saturate(1.6)',
  WebkitBackdropFilter: 'blur(20px) saturate(1.6)',
  border: '1px solid rgba(255,255,255,0.82)',
  boxShadow: '0 2px 16px rgba(26,23,20,0.06), inset 0 1px 0 rgba(255,255,255,0.9)',
}

// ── Swipe hook ─────────────────────────────────────────────────

function useSwipe({ onLeft, onRight, onDown, disabled }) {
  const ref = useRef(null)
  const start = useRef(null)
  const current = useRef({ x: 0, y: 0 })

  const handleTouchStart = useCallback(e => {
    if (disabled) return
    const t = e.touches[0]
    start.current = { x: t.clientX, y: t.clientY }
    current.current = { x: t.clientX, y: t.clientY }
  }, [disabled])

  const handleTouchMove = useCallback(e => {
    if (!start.current || disabled) return
    const t = e.touches[0]
    current.current = { x: t.clientX, y: t.clientY }
    const dx = t.clientX - start.current.x
    const dy = t.clientY - start.current.y
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
      const el = ref.current
      if (el) {
        el.style.transform = `translateX(${dx}px) translateY(${Math.max(dy, 0) * 0.3}px) rotate(${dx * 0.08}deg)`
        el.style.transition = 'none'
        const tint = el.querySelector('[data-tint]')
        if (tint) {
          if (dx > 40)       tint.style.background = 'rgba(59,170,122,0.22)'
          else if (dx < -40) tint.style.background = 'rgba(224,90,90,0.22)'
          else if (dy > 40)  tint.style.background = 'rgba(232,160,48,0.22)'
          else               tint.style.background = 'transparent'
        }
      }
    }
  }, [disabled])

  const handleTouchEnd = useCallback(() => {
    if (!start.current || disabled) return
    const dx = current.current.x - start.current.x
    const dy = current.current.y - start.current.y
    const el = ref.current
    if (el) {
      el.style.transition = 'transform 0.3s ease'
      el.style.transform = ''
      const tint = el.querySelector('[data-tint]')
      if (tint) tint.style.background = 'transparent'
    }
    const THRESHOLD = 80
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > THRESHOLD) onRight?.()
      else if (dx < -THRESHOLD) onLeft?.()
    } else if (dy > THRESHOLD) {
      onDown?.()
    }
    start.current = null
  }, [disabled, onLeft, onRight, onDown])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.addEventListener('touchstart', handleTouchStart, { passive: true })
    el.addEventListener('touchmove', handleTouchMove, { passive: true })
    el.addEventListener('touchend', handleTouchEnd)
    return () => {
      el.removeEventListener('touchstart', handleTouchStart)
      el.removeEventListener('touchmove', handleTouchMove)
      el.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd])

  return ref
}

// ── ActivityCard ───────────────────────────────────────────────

function ActivityCard({ activity, onMatch, onSnooze, onTrash, matchCount, trashCount }) {
  const [trashConfirm, setTrashConfirm] = useState(false)
  const meta = getCategoryMeta(activity.category)

  const swipeRef = useSwipe({
    onRight: onMatch,
    onDown: onSnooze,
    onLeft: () => setTrashConfirm(true),
    disabled: trashConfirm,
  })

  return (
    <div ref={swipeRef} style={{ touchAction: 'pan-y', userSelect: 'none', height: '100%', position: 'relative' }}>
      <div style={{
        height: '100%', borderRadius: 28, overflow: 'hidden', display: 'flex', flexDirection: 'column',
        background: 'rgba(255,255,255,0.82)',
        backdropFilter: 'blur(24px) saturate(1.8)',
        WebkitBackdropFilter: 'blur(24px) saturate(1.8)',
        border: '1px solid rgba(255,255,255,0.90)',
        boxShadow: '0 8px 40px rgba(26,23,20,0.12), inset 0 1px 0 rgba(255,255,255,0.95)',
      }}>
        {/* Illustration area */}
        <div style={{
          position: 'relative', height: '52%', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
          background: activity.photo_url
            ? `url(${activity.photo_url}) center/cover`
            : `linear-gradient(135deg, ${meta.color}22 0%, ${meta.color}08 100%)`,
        }}>
          {!activity.photo_url && (
            <>
              <div style={{
                position: 'absolute', width: 160, height: 160, borderRadius: '50%', opacity: 0.28,
                background: meta.color, filter: 'blur(40px)', top: -20, right: -20, pointerEvents: 'none',
              }} />
              <div style={{
                position: 'absolute', width: 120, height: 120, borderRadius: '50%', opacity: 0.14,
                background: meta.color, filter: 'blur(30px)', bottom: -10, left: -10, pointerEvents: 'none',
              }} />
              <div style={{
                position: 'relative', zIndex: 2,
                width: 80, height: 80, borderRadius: 24, fontSize: '3rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: `${meta.color}18`,
              }}>
                {meta.emoji}
              </div>
            </>
          )}

          {/* Category badge */}
          <div style={{
            position: 'absolute', top: 12, left: 12, zIndex: 5,
            padding: '5px 12px', borderRadius: 9999,
            fontSize: '0.70rem', fontWeight: 700, letterSpacing: '0.01em',
            background: activity.photo_url ? 'rgba(0,0,0,0.42)' : meta.bg,
            color: activity.photo_url ? 'white' : meta.color,
            backdropFilter: 'blur(8px)',
          }}>
            {meta.emoji} {meta.label !== 'Autre' ? meta.label : activity.category}
          </div>

          {/* Price */}
          {activity.price_eur !== null && activity.price_eur !== undefined && (
            <div style={{
              position: 'absolute', top: 12, right: 12, zIndex: 5,
              padding: '5px 10px', borderRadius: 9999,
              fontSize: '0.70rem', fontWeight: 600,
              background: 'rgba(255,255,255,0.82)', color: '#1a1714',
              backdropFilter: 'blur(8px)',
            }}>
              {activity.price_eur === 0 ? 'Gratuit' : `${activity.price_eur} €`}
            </div>
          )}

          {/* Swipe tint */}
          <div data-tint style={{
            position: 'absolute', inset: 0, zIndex: 10,
            pointerEvents: 'none', transition: 'background 0.1s',
          }} />
        </div>

        {/* Info */}
        <div style={{ flex: 1, padding: '16px 20px 14px', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0 }}>
          <div style={{ flex: 1, minHeight: 0 }}>
            <h3 style={{ fontSize: '1.18rem', fontWeight: 800, color: '#1a1714', lineHeight: 1.25, margin: 0 }}>
              {activity.name}
            </h3>
            {activity.description && (
              <p style={{
                color: '#6b6560', fontSize: '0.82rem', margin: '5px 0 0', lineHeight: 1.5,
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
              }}>
                {activity.description}
              </p>
            )}
          </div>
          <div style={{
            paddingTop: 10, borderTop: '1px solid rgba(26,23,20,0.07)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <p style={{ fontSize: '0.70rem', color: '#b0aaa3', margin: 0 }}>← Trash · ↓ Snooze · → Match</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <span style={{ color: '#3baa7a', fontWeight: 700, fontSize: '0.82rem' }}>{matchCount} ✓</span>
              <span style={{ color: '#e05a5a', fontWeight: 700, fontSize: '0.82rem' }}>{trashCount} ✕</span>
            </div>
          </div>
        </div>
      </div>

      {/* Trash confirm overlay */}
      {trashConfirm && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 20,
          background: 'rgba(14,8,8,0.72)', borderRadius: 28,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 12, padding: '0 24px',
        }}>
          <p style={{ color: 'white', fontWeight: 700, fontSize: '1.05rem', textAlign: 'center', margin: 0 }}>
            Masquer "{activity.name}" ?
          </p>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', textAlign: 'center', margin: 0 }}>
            Cette activité disparaîtra de ton deck.
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button onClick={() => setTrashConfirm(false)} style={{
              background: 'rgba(255,255,255,0.12)', color: 'white', borderRadius: 14,
              padding: '10px 22px', fontSize: '0.875rem', fontWeight: 600,
              border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            }}>Annuler</button>
            <button onClick={() => { setTrashConfirm(false); onTrash() }} style={{
              background: '#e05a5a', color: 'white', borderRadius: 14,
              padding: '10px 22px', fontSize: '0.875rem', fontWeight: 600,
              border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            }}>Masquer</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── AddActivityModal ───────────────────────────────────────────

function AddActivityModal({ city, userId, onClose, onAdded }) {
  const [form, setForm] = useState({ name: '', description: '', category: 'culture', price_eur: '' })
  const [customCategory, setCustomCategory] = useState('')
  const [photoFile, setPhotoFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const isCustom = form.category === CUSTOM_KEY

  async function submit() {
    if (!form.name.trim()) { setError('Le nom est requis.'); return }
    const finalCategory = isCustom ? (customCategory.trim() || 'other') : form.category
    setLoading(true); setError('')
    let photo_url = null
    if (photoFile) {
      const path = `${city}/${Date.now()}_${photoFile.name.replace(/\s+/g, '_')}`
      const { error: upErr } = await supabase.storage.from('activities').upload(path, photoFile, { upsert: true })
      if (!upErr) {
        const { data } = supabase.storage.from('activities').getPublicUrl(path)
        photo_url = data.publicUrl
      }
    }
    const price = form.price_eur === '' ? null : parseFloat(form.price_eur) || 0
    const { error: dbErr } = await supabase.from('activities').insert({
      city, name: form.name.trim(),
      description: form.description.trim() || null,
      category: finalCategory, price_eur: price,
      photo_url, added_by: userId,
    })
    if (dbErr) { setError('Erreur base de données.'); setLoading(false); return }
    onAdded()
  }

  const selectStyle = {
    padding: '10px 14px', fontSize: '0.875rem', width: '100%',
    borderRadius: '14px', border: '1.5px solid rgba(0,0,0,0.08)',
    background: 'rgba(0,0,0,0.04)', color: 'var(--text-primary)',
    fontFamily: 'inherit', outline: 'none', appearance: 'auto',
  }

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{
      position: 'fixed', inset: 0, zIndex: 100,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'flex-end',
    }}>
      <div style={{
        background: 'var(--bg-base)', borderRadius: '24px 24px 0 0',
        width: '100%', maxHeight: '88dvh', overflowY: 'auto',
        padding: '20px 16px',
        paddingBottom: 'calc(100px + env(safe-area-inset-bottom, 0px))',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(0,0,0,0.12)' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <p style={{ fontWeight: 700, fontSize: '1.1rem', margin: 0 }}>Proposer une activité</p>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: '50%',
            background: 'rgba(0,0,0,0.07)', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1rem', color: 'var(--text-secondary)',
          }}>×</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Nom de l'activité *" />
          <textarea value={form.description} onChange={e => set('description', e.target.value)}
            placeholder="Description (optionnel)" rows={2} style={{ resize: 'none' }} />
          <div>
            <p style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Catégorie</p>
            <select value={form.category} onChange={e => set('category', e.target.value)} style={selectStyle}>
              {Object.entries(CATEGORY_META).map(([k, v]) => (
                <option key={k} value={k}>{v.emoji} {v.label}</option>
              ))}
              <option value={CUSTOM_KEY}>✏️ Nouvelle catégorie…</option>
            </select>
            {isCustom && (
              <input value={customCategory} onChange={e => setCustomCategory(e.target.value)}
                placeholder="Nom de la catégorie" style={{ marginTop: 8 }} />
            )}
          </div>
          <input value={form.price_eur} onChange={e => set('price_eur', e.target.value)}
            placeholder="Prix en € (laisser vide = gratuit)" type="number" min="0" step="0.5" />
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
            onChange={e => setPhotoFile(e.target.files?.[0] ?? null)} />
          <button onClick={() => fileRef.current?.click()} style={{
            background: 'rgba(0,0,0,0.04)', border: '1.5px dashed rgba(0,0,0,0.15)',
            borderRadius: '14px', padding: '12px', fontSize: '0.875rem',
            color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit',
          }}>
            {photoFile ? `📷 ${photoFile.name}` : '📷 Ajouter une photo (optionnel)'}
          </button>
          {error && <p style={{ color: 'var(--trash)', fontSize: '0.8rem', margin: 0 }}>{error}</p>}
          <button onClick={submit} disabled={loading} className="btn-primary">
            {loading ? 'Envoi…' : "Proposer l'activité"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Sub-views ──────────────────────────────────────────────────

function ClosedView({ isAdmin, city, onOpen }) {
  const [maxAct, setMaxAct] = useState('3')
  const [loading, setLoading] = useState(false)

  async function openVotes() {
    setLoading(true)
    const today = new Date().toISOString().slice(0, 10)
    await supabase.from('day_config').upsert(
      { city, date: today, max_activities: parseInt(maxAct) || 3, votes_open: true },
      { onConflict: 'city,date' }
    )
    onOpen()
  }

  if (!isAdmin) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 24px', gap: 12, textAlign: 'center' }}>
      <p style={{ fontSize: '3rem', margin: 0 }}>⏳</p>
      <p style={{ fontWeight: 700, fontSize: '1.05rem', margin: 0 }}>Les votes n'ont pas encore ouvert</p>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
        Attends qu'Axel ouvre le deck du jour.
      </p>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <p style={{ fontWeight: 700, fontSize: '1.05rem', margin: 0 }}>Ouvrir les votes du jour</p>
      <div>
        <p style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
          Activités à valider
        </p>
        <input value={maxAct} onChange={e => setMaxAct(e.target.value)} type="number" min="1" max="10"
          style={{ textAlign: 'center', maxWidth: 120 }} />
      </div>
      <button onClick={openVotes} disabled={loading} className="btn-primary">
        {loading ? 'Ouverture…' : '🗳️ Ouvrir les votes'}
      </button>
    </div>
  )
}

function DoneView({ matchCount, doneCount, groupSize }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 24px', gap: 12, textAlign: 'center' }}>
      <p style={{ fontSize: '3rem', margin: 0 }}>🎉</p>
      <p style={{ fontWeight: 700, fontSize: '1.05rem', margin: 0 }}>Deck terminé !</p>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
        {matchCount} match{matchCount > 1 ? 's' : ''} de ta part
      </p>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
        En attente des autres… {doneCount}/{groupSize} ont terminé
      </p>
    </div>
  )
}

function ResultsView({ validated, maxActivities, isAdmin, onSecondTour, onClose }) {
  const needSecondTour = validated.length > maxActivities

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontWeight: 800, fontSize: '1.3rem', margin: 0, color: '#1a1714' }}>Résultats</h2>
        {isAdmin && (
          <button onClick={onClose} style={{
            fontSize: '0.78rem', padding: '6px 14px', borderRadius: 20,
            background: 'rgba(26,23,20,0.07)', color: '#6b6560',
            border: '1px solid rgba(26,23,20,0.08)', cursor: 'pointer', fontFamily: 'inherit',
          }}>Fermer les votes</button>
        )}
      </div>

      {needSecondTour && (
        <div style={{ ...glass, borderRadius: 16, padding: '12px 14px', borderColor: 'rgba(232,160,48,0.3)' }}>
          <p style={{ color: '#e8a030', fontWeight: 600, fontSize: '0.85rem', margin: 0 }}>
            {validated.length} validées pour {maxActivities} places — 2e tour requis !
          </p>
        </div>
      )}

      {validated.map((a, i) => {
        const meta = getCategoryMeta(a.category)
        const validated_slot = i < maxActivities
        return (
          <div key={a.id} style={{
            ...glass, borderRadius: 20, padding: '14px 16px',
            display: 'flex', alignItems: 'center', gap: 12,
            border: validated_slot ? '1.5px solid rgba(59,170,122,0.28)' : undefined,
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: 12, flexShrink: 0,
              background: 'rgba(26,23,20,0.07)', color: '#6b6560',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: '0.88rem',
            }}>{i + 1}</div>
            <div style={{
              width: 44, height: 44, borderRadius: 12, flexShrink: 0,
              background: a.photo_url ? `url(${a.photo_url}) center/cover` : meta.bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem',
            }}>
              {!a.photo_url && meta.emoji}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <p style={{ fontWeight: 700, fontSize: '0.9rem', margin: 0, color: '#1a1714' }}>{a.name}</p>
                {validated_slot && (
                  <span style={{
                    fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: 9999,
                    background: 'rgba(59,170,122,0.12)', color: '#3baa7a',
                  }}>Validé ✓</span>
                )}
              </div>
              <p style={{ color: '#b0aaa3', fontSize: '0.78rem', margin: '2px 0 0' }}>
                {a._matchCount} match{a._matchCount > 1 ? 's' : ''}
                {a.price_eur === 0 ? ' · Gratuit' : a.price_eur ? ` · ${a.price_eur}€` : ''}
              </p>
            </div>
            {validated_slot && <span style={{ color: '#3baa7a', fontSize: '1.1rem', flexShrink: 0 }}>✓</span>}
          </div>
        )
      })}

      {validated.length === 0 && (
        <p style={{ color: '#b0aaa3', fontSize: '0.85rem', textAlign: 'center', padding: '32px 0' }}>
          Aucune activité n'a atteint la majorité.
        </p>
      )}

      {needSecondTour && (
        <button onClick={onSecondTour} className="btn-primary" style={{ marginTop: 4 }}>
          Lancer le 2e tour →
        </button>
      )}
    </div>
  )
}

function SecondTourView({ candidates, maxActivities, onDone }) {
  const [selected, setSelected] = useState([])

  function toggle(id) {
    setSelected(s =>
      s.includes(id) ? s.filter(x => x !== id) : s.length < maxActivities ? [...s, id] : s
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <p style={{ fontWeight: 700, fontSize: '1.05rem', margin: 0 }}>2e tour</p>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: 2 }}>
          Choisis {maxActivities} · {selected.length}/{maxActivities} sélectionnées
        </p>
      </div>
      {candidates.map(a => {
        const meta = getCategoryMeta(a.category)
        const sel = selected.includes(a.id)
        return (
          <div key={a.id} onClick={() => toggle(a.id)} style={{
            ...glass, borderRadius: 20, padding: '14px 16px',
            display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
            outline: sel ? '2px solid #3baa7a' : 'none', outlineOffset: -2,
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12, flexShrink: 0,
              background: a.photo_url ? `url(${a.photo_url}) center/cover` : meta.bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem',
            }}>
              {!a.photo_url && meta.emoji}
            </div>
            <p style={{ flex: 1, fontWeight: 600, fontSize: '0.9rem', margin: 0 }}>{a.name}</p>
            {sel && <span style={{ color: '#3baa7a', fontWeight: 700, fontSize: '1.1rem' }}>✓</span>}
          </div>
        )
      })}
      <button onClick={() => onDone(selected)} disabled={selected.length !== maxActivities} className="btn-primary" style={{ marginTop: 4 }}>
        Valider ma sélection
      </button>
    </div>
  )
}

// ── Page principale ────────────────────────────────────────────

export default function Explorer() {
  const { user, profile } = useAuth()
  const isAdmin = profile?.role === 'admin'

  const [city, setCity] = useState('bruxelles')
  const [catFilter, setCatFilter] = useState('all')
  const [activities, setActivities] = useState([])
  const [dayConfig, setDayConfig] = useState(null)
  const [myVotes, setMyVotes] = useState([])
  const [allVotes, setAllVotes] = useState([])
  const [groupSize, setGroupSize] = useState(1)
  const [doneCount, setDoneCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [secondTour, setSecondTour] = useState(false)

  const fetchAll = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const today = new Date().toISOString().slice(0, 10)
    const [cfgRes, actRes, votesRes, countRes] = await Promise.all([
      supabase.from('day_config').select('*').eq('city', city).eq('date', today).maybeSingle(),
      supabase.from('activities').select('*').eq('city', city).eq('is_active', true),
      supabase.from('votes').select('*'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
    ])
    const acts = actRes.data ?? []
    const votes = votesRes.data ?? []
    const gSize = countRes.count ?? 1

    setDayConfig(cfgRes.data ?? null)
    setActivities(acts)
    setAllVotes(votes)
    setGroupSize(gSize)

    const actIds = new Set(acts.map(a => a.id))
    setMyVotes(votes.filter(v => v.user_id === user.id && actIds.has(v.activity_id)))

    const uids = [...new Set(votes.filter(v => actIds.has(v.activity_id)).map(v => v.user_id))]
    const done = uids.filter(uid => {
      const s = new Set(votes.filter(v => v.user_id === uid && actIds.has(v.activity_id)).map(v => v.activity_id))
      return s.size >= acts.length
    }).length
    setDoneCount(done)
    setLoading(false)
  }, [city, user])

  useEffect(() => { fetchAll() }, [fetchAll])

  useEffect(() => {
    const channel = supabase.channel(`explorer-${city}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'votes' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'day_config' }, fetchAll)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [city, fetchAll])

  async function vote(activity, voteType) {
    setMyVotes(v => [...v.filter(x => x.activity_id !== activity.id), { activity_id: activity.id, vote: voteType, user_id: user.id }])
    await supabase.from('votes').upsert(
      {
        activity_id: activity.id, user_id: user.id, vote: voteType,
        snooze_date: voteType === 'snooze' ? new Date(Date.now() + 86400000).toISOString().slice(0, 10) : null,
      },
      { onConflict: 'activity_id,user_id' }
    )
    const { data } = await supabase.from('votes').select('*')
    if (data) {
      setAllVotes(data)
      const actIds = new Set(activities.map(a => a.id))
      const uids = [...new Set(data.filter(v => actIds.has(v.activity_id)).map(v => v.user_id))]
      setDoneCount(uids.filter(uid => {
        const s = new Set(data.filter(v => v.user_id === uid && actIds.has(v.activity_id)).map(v => v.activity_id))
        return s.size >= activities.length
      }).length)
    }
  }

  async function closeVotes() {
    const today = new Date().toISOString().slice(0, 10)
    await supabase.from('day_config').update({ votes_open: false }).eq('city', city).eq('date', today)
    fetchAll()
  }

  // Derived state
  const myVotedIds = new Set(myVotes.map(v => v.activity_id))
  const globalDeck = activities.filter(a => !myVotedIds.has(a.id))
  const displayDeck = catFilter === 'all'
    ? globalDeck
    : globalDeck.filter(a => a.category === catFilter)
  const currentCard = displayDeck[0]
  const nextCard = displayDeck[1]

  const voteCounts = {}
  for (const v of allVotes) {
    if (!voteCounts[v.activity_id]) voteCounts[v.activity_id] = { match: 0, trash: 0 }
    if (v.vote === 'match') voteCounts[v.activity_id].match++
    else if (v.vote === 'trash') voteCounts[v.activity_id].trash++
  }

  const maxActivities = dayConfig?.max_activities ?? 3
  const matchThreshold = Math.ceil(groupSize / 2)
  const validated = activities
    .filter(a => (voteCounts[a.id]?.match ?? 0) >= matchThreshold)
    .map(a => ({ ...a, _matchCount: voteCounts[a.id]?.match ?? 0 }))
    .sort((a, b) => b._matchCount - a._matchCount)

  const myMatchCount = myVotes.filter(v => v.vote === 'match').length
  const totalVoted = myVotes.length
  const pct = activities.length > 0 ? Math.round(totalVoted / activities.length * 100) : 0
  const votesOpen = dayConfig?.votes_open === true
  const allDone = groupSize > 0 && doneCount >= groupSize

  let view = 'closed'
  if (votesOpen && globalDeck.length > 0 && !allDone) view = 'voting'
  else if (votesOpen && globalDeck.length > 0 && allDone) view = 'results'
  else if (votesOpen && globalDeck.length === 0 && !allDone) view = 'done'
  else if ((votesOpen && allDone) || (dayConfig && !votesOpen && activities.length > 0)) view = 'results'

  return (
    <div style={{ minHeight: '100dvh' }}>
      {/* Header */}
      <div style={{ padding: '20px 20px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: '0.72rem', fontWeight: 500, color: '#b0aaa3', margin: 0 }}>
            {CITY_LABELS[city]} · {activities.length} activités
          </p>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1a1714', margin: '2px 0 0', letterSpacing: '-0.02em' }}>
            Explorer
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <button onClick={() => setShowAdd(true)} style={{
            ...glass, borderRadius: 20, padding: '7px 14px',
            fontWeight: 600, fontSize: '0.8rem', border: 'none',
            cursor: 'pointer', color: '#1a1714', fontFamily: 'inherit',
          }}>
            + Activité
          </button>
          <HeaderAvatar />
        </div>
      </div>

      {/* City pills */}
      <div style={{ overflowX: 'auto', padding: '12px 20px 0', display: 'flex', gap: 8, scrollbarWidth: 'none' }}>
        {CITY_ORDER.map(c => (
          <button key={c} onClick={() => { setCity(c); setSecondTour(false); setCatFilter('all') }} style={{
            flexShrink: 0, borderRadius: 20, padding: '6px 14px',
            fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            border: city === c ? 'none' : '1px solid rgba(255,255,255,0.75)',
            background: city === c ? '#1a1714' : 'rgba(255,255,255,0.55)',
            color: city === c ? '#faf9f7' : '#6b6560',
            boxShadow: city === c ? '0 2px 8px rgba(26,23,20,0.2)' : 'none',
            transition: 'all 0.15s',
          }}>
            {CITY_LABELS[c]}
            {city === c && CITY_NIGHTS[c] && (
              <span style={{ fontWeight: 400, opacity: 0.75 }}> · {CITY_NIGHTS[c]}n</span>
            )}
          </button>
        ))}
      </div>

      {/* Category filter pills — only in voting state */}
      {view === 'voting' && (
        <div style={{ overflowX: 'auto', padding: '8px 20px 0', display: 'flex', gap: 7, scrollbarWidth: 'none' }}>
          {CAT_PILLS.map(p => (
            <button key={p.id} onClick={() => setCatFilter(p.id)} style={{
              flexShrink: 0, borderRadius: 20, padding: '5px 12px',
              fontSize: '0.73rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              border: catFilter === p.id ? 'none' : '1px solid rgba(26,23,20,0.08)',
              background: catFilter === p.id ? 'rgba(26,23,20,0.10)' : 'rgba(255,255,255,0.48)',
              color: catFilter === p.id ? '#1a1714' : '#6b6560',
              transition: 'all 0.15s',
            }}>
              {p.label}
            </button>
          ))}
        </div>
      )}

      {/* Progress bar */}
      {view === 'voting' && activities.length > 0 && (
        <div style={{ padding: '10px 20px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <p style={{ fontSize: '0.72rem', color: '#b0aaa3', margin: 0 }}>{totalVoted}/{activities.length} vus</p>
            <p style={{ fontSize: '0.72rem', color: '#b0aaa3', margin: 0 }}>{globalDeck.length} restant{globalDeck.length > 1 ? 's' : ''}</p>
          </div>
          <div style={{ height: 3, borderRadius: 2, background: 'rgba(26,23,20,0.08)', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 2, background: '#1a1714', width: `${pct}%`, transition: 'width 0.3s' }} />
          </div>
        </div>
      )}

      {/* Realtime "ont terminé" counter */}
      {votesOpen && groupSize > 0 && (
        <div style={{ padding: '8px 20px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
          {Array.from({ length: groupSize }).map((_, i) => (
            <div key={i} style={{
              width: 7, height: 7, borderRadius: '50%',
              background: i < doneCount ? '#3baa7a' : 'rgba(26,23,20,0.12)',
            }} />
          ))}
          <p style={{ fontSize: '0.72rem', color: '#b0aaa3', margin: 0 }}>
            {doneCount}/{groupSize} ont terminé
          </p>
        </div>
      )}

      {/* Rappel (votes fermés) */}
      {dayConfig === null && !loading && (
        <p style={{ padding: '6px 20px 0', fontSize: '0.72rem', color: '#b0aaa3', margin: 0 }}>
          1 vote par jour · {CITY_NIGHTS[city] ?? '?'} nuits prévues
        </p>
      )}

      {/* Main content */}
      <div style={{ padding: '12px 20px 120px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              border: '2.5px solid #1a1714', borderTopColor: 'transparent',
              animation: 'spin 0.7s linear infinite',
            }} />
          </div>
        ) : view === 'closed' ? (
          <ClosedView isAdmin={isAdmin} city={city} onOpen={fetchAll} />
        ) : view === 'voting' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {currentCard ? (
              <>
                {/* Card stack */}
                <div style={{ position: 'relative', height: 420 }}>
                  {nextCard && (
                    <div style={{
                      position: 'absolute', top: 8, left: 12, right: 12, bottom: 0, zIndex: 1,
                      ...glass, borderRadius: 28,
                    }} />
                  )}
                  <div style={{ position: 'absolute', inset: 0, zIndex: 2 }}>
                    <ActivityCard
                      key={currentCard.id}
                      activity={currentCard}
                      onMatch={() => vote(currentCard, 'match')}
                      onSnooze={() => vote(currentCard, 'snooze')}
                      onTrash={() => vote(currentCard, 'trash')}
                      matchCount={voteCounts[currentCard.id]?.match ?? 0}
                      trashCount={voteCounts[currentCard.id]?.trash ?? 0}
                    />
                  </div>
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
                  <button
                    onClick={() => vote(currentCard, 'trash')}
                    style={{
                      width: 64, height: 64, borderRadius: '50%', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit',
                      ...glass,
                      boxShadow: '0 4px 20px rgba(224,90,90,0.22), inset 0 1px 0 rgba(255,255,255,0.9)',
                    }}
                  >
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                      <path d="M18 6L6 18M6 6l12 12" stroke="#e05a5a" strokeWidth="2.5" strokeLinecap="round"/>
                    </svg>
                  </button>

                  <button
                    onClick={() => vote(currentCard, 'snooze')}
                    style={{
                      width: 46, height: 46, borderRadius: '50%', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit',
                      ...glass,
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="9" stroke="#b0aaa3" strokeWidth="1.8"/>
                      <path d="M12 7v5l3 3" stroke="#b0aaa3" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>

                  <button
                    onClick={() => vote(currentCard, 'match')}
                    style={{
                      width: 64, height: 64, borderRadius: '50%', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit',
                      ...glass,
                      boxShadow: '0 4px 20px rgba(59,170,122,0.26), inset 0 1px 0 rgba(255,255,255,0.9)',
                    }}
                  >
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                      <path d="M20 6L9 17l-5-5" stroke="#3baa7a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
              </>
            ) : (
              /* No cards in this category filter, but global deck still has cards */
              <div style={{
                height: 200, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 10, textAlign: 'center',
              }}>
                <p style={{ fontSize: '2rem', margin: 0 }}>🔍</p>
                <p style={{ fontWeight: 700, fontSize: '0.95rem', margin: 0, color: '#1a1714' }}>
                  Tout voté dans cette catégorie
                </p>
                <button onClick={() => setCatFilter('all')} style={{
                  ...glass, borderRadius: 16, padding: '8px 18px',
                  fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', border: 'none', fontFamily: 'inherit',
                }}>Voir tout</button>
              </div>
            )}
          </div>
        ) : view === 'done' ? (
          <DoneView matchCount={myMatchCount} doneCount={doneCount} groupSize={groupSize} />
        ) : view === 'results' ? (
          secondTour ? (
            <SecondTourView candidates={validated} maxActivities={maxActivities} onDone={() => setSecondTour(false)} />
          ) : (
            <ResultsView
              validated={validated} maxActivities={maxActivities}
              isAdmin={isAdmin} onSecondTour={() => setSecondTour(true)} onClose={closeVotes}
            />
          )
        ) : null}
      </div>

      {showAdd && (
        <AddActivityModal
          city={city} userId={user?.id}
          onClose={() => setShowAdd(false)}
          onAdded={() => { setShowAdd(false); fetchAll() }}
        />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
