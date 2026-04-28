import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

// ── Constantes ─────────────────────────────────────────────────

const GROUP_SIZE = 5
const MATCH_THRESHOLD = Math.ceil(GROUP_SIZE / 2) // 3

const CATEGORY_META = {
  culture:   { emoji: '🏛️', gradient: 'linear-gradient(135deg,#667eea,#764ba2)' },
  nature:    { emoji: '🌿', gradient: 'linear-gradient(135deg,#56ab2f,#a8e063)' },
  food:      { emoji: '🍽️', gradient: 'linear-gradient(135deg,#f093fb,#f5576c)' },
  nightlife: { emoji: '🎶', gradient: 'linear-gradient(135deg,#1a1a2e,#16213e)' },
  shopping:  { emoji: '🛍️', gradient: 'linear-gradient(135deg,#f7971e,#ffd200)' },
  sport:     { emoji: '⚡', gradient: 'linear-gradient(135deg,#0f2027,#2c5364)' },
  other:     { emoji: '✨', gradient: 'linear-gradient(135deg,#8e9eab,#eef2f3)' },
}

const CITY_ORDER = ['bruxelles','amsterdam','berlin','prague','budapest','vienne','geneve']
const CITY_LABELS = {
  bruxelles: '🇧🇪 Bruxelles', amsterdam: '🇳🇱 Amsterdam', berlin: '🇩🇪 Berlin',
  prague: '🇨🇿 Prague', budapest: '🇭🇺 Budapest', vienne: '🇦🇹 Vienne', geneve: '🇨🇭 Genève',
}

// ── Hook swipe ─────────────────────────────────────────────────

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
          if (dx > 40)       { tint.style.background = 'rgba(22,163,74,0.35)';  tint.textContent = '✓ MATCH' }
          else if (dx < -40) { tint.style.background = 'rgba(220,38,38,0.35)';  tint.textContent = '✕ TRASH' }
          else if (dy > 40)  { tint.style.background = 'rgba(217,119,6,0.35)';  tint.textContent = '⏱ SNOOZE' }
          else               { tint.style.background = 'transparent'; tint.textContent = '' }
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
      if (tint) { tint.style.background = 'transparent'; tint.textContent = '' }
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

function ActivityCard({ activity, onMatch, onSnooze, onTrash }) {
  const [trashConfirm, setTrashConfirm] = useState(false)
  const meta = CATEGORY_META[activity.category] ?? CATEGORY_META.other

  const swipeRef = useSwipe({
    onRight: onMatch,
    onDown: onSnooze,
    onLeft: () => setTrashConfirm(true),
    disabled: trashConfirm,
  })

  return (
    <div ref={swipeRef} style={{ touchAction: 'pan-y', position: 'relative', userSelect: 'none' }}>
      <div style={{
        borderRadius: '24px', overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        position: 'relative', aspectRatio: '3/4',
        background: activity.photo_url ? `url(${activity.photo_url}) center/cover` : meta.gradient,
      }}>
        <div data-tint style={{
          position: 'absolute', inset: 0, zIndex: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '2rem', fontWeight: 700, color: 'white',
          borderRadius: '24px', pointerEvents: 'none',
        }} />
        {!activity.photo_url && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '5rem', pointerEvents: 'none',
          }}>
            {meta.emoji}
          </div>
        )}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%)',
          padding: '24px 18px 18px',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ color: 'white', fontWeight: 700, fontSize: '1.2rem', lineHeight: 1.2 }}>{activity.name}</p>
              {activity.description && (
                <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.78rem', marginTop: 4, lineHeight: 1.4 }}>
                  {activity.description.length > 90 ? activity.description.slice(0, 90) + '…' : activity.description}
                </p>
              )}
            </div>
            {activity.price_eur !== null && activity.price_eur !== undefined && (
              <div style={{
                backgroundColor: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)',
                borderRadius: '12px', padding: '4px 10px', flexShrink: 0,
              }}>
                <p style={{ color: 'white', fontWeight: 700, fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                  {activity.price_eur === 0 ? 'Gratuit' : `${activity.price_eur}€`}
                </p>
              </div>
            )}
          </div>
          <div style={{ marginTop: 8 }}>
            <span style={{
              backgroundColor: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)',
              borderRadius: '20px', padding: '3px 10px',
              color: 'white', fontSize: '0.72rem', fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>
              {meta.emoji} {activity.category}
            </span>
          </div>
        </div>
      </div>

      {trashConfirm && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 20,
          backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: '24px',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 12, padding: '0 20px',
        }}>
          <p style={{ color: 'white', fontWeight: 700, fontSize: '1.05rem', textAlign: 'center' }}>
            Trash "{activity.name}" ?
          </p>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.8rem', textAlign: 'center' }}>
            Tu ne la reverras plus.
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button onClick={() => setTrashConfirm(false)} style={{
              backgroundColor: 'rgba(255,255,255,0.15)', color: 'white',
              borderRadius: '14px', padding: '10px 20px', fontSize: '0.875rem', fontWeight: 600,
              border: 'none', cursor: 'pointer',
            }}>Annuler</button>
            <button onClick={() => { setTrashConfirm(false); onTrash() }} style={{
              backgroundColor: 'var(--trash)', color: 'white',
              borderRadius: '14px', padding: '10px 20px', fontSize: '0.875rem', fontWeight: 600,
              border: 'none', cursor: 'pointer',
            }}>🗑️ Oui</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── AddActivityModal ───────────────────────────────────────────

function AddActivityModal({ city, userId, onClose, onAdded }) {
  const [form, setForm] = useState({ name: '', description: '', category: 'other', price_eur: '' })
  const [photoFile, setPhotoFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function submit() {
    if (!form.name.trim()) { setError('Le nom est requis.'); return }
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
      category: form.category, price_eur: price,
      photo_url, added_by: userId,
    })
    if (dbErr) { setError('Erreur base de données.'); setLoading(false); return }
    onAdded()
  }

  const selectStyle = {
    padding: '10px 14px', fontSize: '0.875rem', width: '100%',
    borderRadius: '14px', border: '1.5px solid rgba(0,0,0,0.08)',
    background: 'rgba(0,0,0,0.04)', color: 'var(--text-primary)',
    fontFamily: 'inherit', outline: 'none',
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50, backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'flex-end',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'var(--bg-base)', borderRadius: '24px 24px 0 0',
        padding: '20px 16px 40px', width: '100%', maxHeight: '90dvh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <p style={{ fontWeight: 700, fontSize: '1.1rem', margin: 0 }}>Proposer une activité</p>
          <button onClick={onClose} style={{ fontSize: '1.4rem', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Nom de l'activité" />
          <textarea value={form.description} onChange={e => set('description', e.target.value)}
            placeholder="Description (optionnel)" rows={3} style={{ resize: 'none' }} />
          <div>
            <p style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Catégorie</p>
            <select value={form.category} onChange={e => set('category', e.target.value)} style={selectStyle}>
              {Object.entries(CATEGORY_META).map(([k, v]) => (
                <option key={k} value={k}>{v.emoji} {k}</option>
              ))}
            </select>
          </div>
          <input value={form.price_eur} onChange={e => set('price_eur', e.target.value)}
            placeholder="Prix en € (laisser vide si gratuit)" type="number" min="0" />
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
            onChange={e => setPhotoFile(e.target.files?.[0] ?? null)} />
          <button onClick={() => fileRef.current?.click()} style={{
            background: 'rgba(0,0,0,0.04)', border: '1.5px dashed rgba(0,0,0,0.15)',
            borderRadius: '14px', padding: '12px', fontSize: '0.875rem',
            color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit',
          }}>
            {photoFile ? `📷 ${photoFile.name}` : '+ Photo (optionnel)'}
          </button>
          {error && <p style={{ color: 'var(--trash)', fontSize: '0.8rem', margin: 0 }}>{error}</p>}
          <button onClick={submit} disabled={loading} className="btn-primary" style={{ marginTop: 4 }}>
            {loading ? 'Envoi…' : 'Proposer'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Vues ───────────────────────────────────────────────────────

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
          style={{ textAlign: 'center', maxWidth: 100 }} />
      </div>
      <button onClick={openVotes} disabled={loading} className="btn-primary">
        {loading ? 'Ouverture…' : '🗳️ Ouvrir les votes'}
      </button>
    </div>
  )
}

function DoneView({ matchCount }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 24px', gap: 12, textAlign: 'center' }}>
      <p style={{ fontSize: '3rem', margin: 0 }}>🎉</p>
      <p style={{ fontWeight: 700, fontSize: '1.05rem', margin: 0 }}>Deck terminé !</p>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
        {matchCount} match{matchCount > 1 ? 's' : ''} de ta part · attends les autres
      </p>
    </div>
  )
}

function ResultsView({ validated, maxActivities, isAdmin, onSecondTour, onClose }) {
  const needSecondTour = validated.length > maxActivities

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ fontWeight: 700, fontSize: '1.05rem', margin: 0 }}>Résultats</p>
        {isAdmin && (
          <button onClick={onClose} style={{
            fontSize: '0.78rem', padding: '5px 12px', borderRadius: '20px',
            backgroundColor: 'rgba(0,0,0,0.06)', color: 'var(--text-secondary)',
            border: 'none', cursor: 'pointer',
          }}>Fermer les votes</button>
        )}
      </div>

      {needSecondTour && (
        <div style={{ backgroundColor: 'rgba(217,119,6,0.1)', borderRadius: '14px', padding: '12px 14px' }}>
          <p style={{ color: 'var(--snooze)', fontWeight: 600, fontSize: '0.85rem', margin: 0 }}>
            {validated.length} validées pour {maxActivities} places — 2e tour requis !
          </p>
        </div>
      )}

      {validated.map(a => {
        const meta = CATEGORY_META[a.category] ?? CATEGORY_META.other
        return (
          <div key={a.id} className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: '12px', flexShrink: 0,
              background: a.photo_url ? `url(${a.photo_url}) center/cover` : meta.gradient,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem',
            }}>
              {!a.photo_url && meta.emoji}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 600, fontSize: '0.9rem', margin: 0 }}>{a.name}</p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', margin: 0 }}>
                {a._matchCount} match{a._matchCount > 1 ? 's' : ''}
                {a.price_eur === 0 ? ' · Gratuit' : a.price_eur ? ` · ${a.price_eur}€` : ''}
              </p>
            </div>
            <span style={{ color: 'var(--match)', fontSize: '1.1rem' }}>✓</span>
          </div>
        )
      })}

      {!needSecondTour && validated.length === 0 && (
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center', padding: '20px 0' }}>
          Aucune activité n'a atteint le seuil de {MATCH_THRESHOLD} matches.
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
        const meta = CATEGORY_META[a.category] ?? CATEGORY_META.other
        const sel = selected.includes(a.id)
        return (
          <div key={a.id} onClick={() => toggle(a.id)} className="card" style={{
            padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
            cursor: 'pointer',
            outline: sel ? '2px solid var(--match)' : 'none',
            outlineOffset: '-2px',
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: '12px', flexShrink: 0,
              background: a.photo_url ? `url(${a.photo_url}) center/cover` : meta.gradient,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem',
            }}>
              {!a.photo_url && meta.emoji}
            </div>
            <p style={{ flex: 1, fontWeight: 600, fontSize: '0.9rem', margin: 0 }}>{a.name}</p>
            {sel && <span style={{ color: 'var(--match)', fontWeight: 700, fontSize: '1.1rem' }}>✓</span>}
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
  const [activities, setActivities] = useState([])
  const [dayConfig, setDayConfig] = useState(null)
  const [myVotes, setMyVotes] = useState([])   // { activity_id, vote }[]
  const [allVotes, setAllVotes] = useState([]) // tous les votes du groupe
  const [doneCount, setDoneCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [secondTour, setSecondTour] = useState(false)

  const fetchAll = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const today = new Date().toISOString().slice(0, 10)
    const [cfgRes, actRes, votesRes] = await Promise.all([
      supabase.from('day_config').select('*').eq('city', city).eq('date', today).maybeSingle(),
      supabase.from('activities').select('*').eq('city', city).eq('is_active', true),
      supabase.from('votes').select('*'),
    ])
    const acts = actRes.data ?? []
    const votes = votesRes.data ?? []
    setDayConfig(cfgRes.data ?? null)
    setActivities(acts)
    setAllVotes(votes)
    const actIds = new Set(acts.map(a => a.id))
    const mine = votes.filter(v => v.user_id === user.id && actIds.has(v.activity_id))
    setMyVotes(mine)
    // Compteur terminé
    const usersWithVotes = [...new Set(votes.filter(v => actIds.has(v.activity_id)).map(v => v.user_id))]
    const done = usersWithVotes.filter(uid => {
      const uVotedIds = new Set(votes.filter(v => v.user_id === uid && actIds.has(v.activity_id)).map(v => v.activity_id))
      return uVotedIds.size >= acts.length
    }).length
    setDoneCount(done)
    setLoading(false)
  }, [city, user])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Realtime
  useEffect(() => {
    const channel = supabase.channel(`explorer-votes-${city}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'votes' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'day_config' }, fetchAll)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [city, fetchAll])

  async function vote(activity, voteType) {
    // Optimistic: retire du deck immédiatement
    setMyVotes(v => [...v.filter(x => x.activity_id !== activity.id), { activity_id: activity.id, vote: voteType, user_id: user.id }])
    await supabase.from('votes').upsert(
      { activity_id: activity.id, user_id: user.id, vote: voteType,
        snooze_date: voteType === 'snooze' ? new Date(Date.now() + 86400000).toISOString().slice(0, 10) : null },
      { onConflict: 'activity_id,user_id' }
    )
    // Refresh votes globaux pour le compteur
    const { data } = await supabase.from('votes').select('*')
    if (data) {
      setAllVotes(data)
      const actIds = new Set(activities.map(a => a.id))
      const usersWithVotes = [...new Set(data.filter(v => actIds.has(v.activity_id)).map(v => v.user_id))]
      const done = usersWithVotes.filter(uid => {
        const s = new Set(data.filter(v => v.user_id === uid && actIds.has(v.activity_id)).map(v => v.activity_id))
        return s.size >= activities.length
      }).length
      setDoneCount(done)
    }
  }

  async function closeVotes() {
    const today = new Date().toISOString().slice(0, 10)
    await supabase.from('day_config').update({ votes_open: false }).eq('city', city).eq('date', today)
    fetchAll()
  }

  // Deck = activités sans vote de ma part
  const myVotedIds = new Set(myVotes.map(v => v.activity_id))
  const deck = activities.filter(a => !myVotedIds.has(a.id))

  // Résultats
  const matchCounts = {}
  for (const v of allVotes) {
    if (v.vote === 'match') matchCounts[v.activity_id] = (matchCounts[v.activity_id] ?? 0) + 1
  }
  const maxActivities = dayConfig?.max_activities ?? 3
  const validated = activities
    .filter(a => (matchCounts[a.id] ?? 0) >= MATCH_THRESHOLD)
    .map(a => ({ ...a, _matchCount: matchCounts[a.id] ?? 0 }))
    .sort((a, b) => b._matchCount - a._matchCount)

  const myMatchCount = myVotes.filter(v => v.vote === 'match').length
  const votesOpen = dayConfig?.votes_open === true

  // View logic
  let view = 'closed'
  if (votesOpen && deck.length > 0) view = 'voting'
  else if (votesOpen && deck.length === 0) view = 'done'
  else if (dayConfig && !votesOpen && activities.length > 0) view = 'results'

  return (
    <div style={{ minHeight: '100dvh', backgroundColor: 'var(--bg-base)' }}>
      {/* Header */}
      <div style={{ padding: '24px 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Explorer</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: 2, marginBottom: 0 }}>
            Oracle de décision
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} style={{
          backgroundColor: 'var(--accent-light)', color: 'var(--accent)',
          borderRadius: '20px', padding: '6px 14px', fontWeight: 600, fontSize: '0.82rem',
          border: 'none', cursor: 'pointer', flexShrink: 0,
        }}>
          + Activité
        </button>
      </div>

      {/* City picker */}
      <div style={{
        overflowX: 'auto', padding: '12px 16px 0',
        display: 'flex', gap: 8, scrollbarWidth: 'none',
      }}>
        {CITY_ORDER.map(c => (
          <button key={c} onClick={() => { setCity(c); setSecondTour(false) }} style={{
            flexShrink: 0, borderRadius: '20px', padding: '5px 12px',
            fontSize: '0.78rem', fontWeight: 600, border: 'none', cursor: 'pointer',
            backgroundColor: city === c ? 'var(--accent)' : 'rgba(0,0,0,0.05)',
            color: city === c ? 'white' : 'var(--text-secondary)',
            transition: 'all 0.15s',
          }}>
            {CITY_LABELS[c]}
          </button>
        ))}
      </div>

      {/* Compteur terminé */}
      {votesOpen && (
        <div style={{ padding: '10px 16px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
          {Array.from({ length: GROUP_SIZE }).map((_, i) => (
            <div key={i} style={{
              width: 8, height: 8, borderRadius: '50%',
              backgroundColor: i < doneCount ? 'var(--match)' : 'rgba(0,0,0,0.12)',
            }} />
          ))}
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
            {doneCount}/{GROUP_SIZE} ont terminé
          </p>
        </div>
      )}

      {/* Contenu */}
      <div style={{ padding: '16px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              border: '2.5px solid var(--accent)', borderTopColor: 'transparent',
              animation: 'spin 0.7s linear infinite',
            }} />
          </div>
        ) : view === 'closed' ? (
          <ClosedView isAdmin={isAdmin} city={city} onOpen={fetchAll} />
        ) : view === 'voting' ? (
          <div>
            {/* Stack de cartes */}
            <div style={{ position: 'relative', marginBottom: 20 }}>
              {deck.slice(1, 3).map((a, i) => (
                <div key={a.id} style={{
                  position: 'absolute', top: 0, left: 0, right: 0, zIndex: 2 - i,
                  transform: `scale(${1 - (i + 1) * 0.04}) translateY(${-(i + 1) * 8}px)`,
                  transformOrigin: 'top center', pointerEvents: 'none',
                }}>
                  <ActivityCard activity={a} onMatch={() => {}} onSnooze={() => {}} onTrash={() => {}} />
                </div>
              ))}
              <div style={{ position: 'relative', zIndex: 10 }}>
                <ActivityCard
                  key={deck[0].id}
                  activity={deck[0]}
                  onMatch={() => vote(deck[0], 'match')}
                  onSnooze={() => vote(deck[0], 'snooze')}
                  onTrash={() => vote(deck[0], 'trash')}
                />
              </div>
            </div>

            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: 16 }}>
              {deck.length} restante{deck.length > 1 ? 's' : ''}
            </p>

            {/* Boutons action */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 20 }}>
              {[
                { type: 'trash', emoji: '🗑️', color: 'var(--trash)', bg: 'rgba(220,38,38,0.1)' },
                { type: 'snooze', emoji: '⏱️', color: 'var(--snooze)', bg: 'rgba(217,119,6,0.1)' },
                { type: 'match', emoji: '✅', color: 'var(--match)', bg: 'rgba(22,163,74,0.1)' },
              ].map(({ type, emoji, bg }) => (
                <button key={type} onClick={() => vote(deck[0], type)} style={{
                  width: 60, height: 60, borderRadius: '50%', border: 'none', cursor: 'pointer',
                  backgroundColor: bg, fontSize: '1.5rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{emoji}</button>
              ))}
            </div>
          </div>
        ) : view === 'done' ? (
          <DoneView matchCount={myMatchCount} />
        ) : view === 'results' ? (
          secondTour ? (
            <SecondTourView
              candidates={validated}
              maxActivities={maxActivities}
              onDone={() => setSecondTour(false)}
            />
          ) : (
            <ResultsView
              validated={validated}
              maxActivities={maxActivities}
              isAdmin={isAdmin}
              onSecondTour={() => setSecondTour(true)}
              onClose={closeVotes}
            />
          )
        ) : null}
      </div>

      {showAdd && (
        <AddActivityModal
          city={city}
          userId={user?.id}
          onClose={() => setShowAdd(false)}
          onAdded={() => { setShowAdd(false); fetchAll() }}
        />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
