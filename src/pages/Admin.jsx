import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useTutorial } from '../context/TutorialContext'

const CITY_ORDER = ['bruxelles','amsterdam','berlin','prague','budapest','vienne','geneve']
const CITY_LABELS = {
  bruxelles: '🇧🇪 Bruxelles', amsterdam: '🇳🇱 Amsterdam', berlin: '🇩🇪 Berlin',
  prague: '🇨🇿 Prague', budapest: '🇭🇺 Budapest', vienne: '🇦🇹 Vienne', geneve: '🇨🇭 Genève',
}

const CATEGORY_FR = {
  culture: 'Culture', nature: 'Nature', food: 'Resto & Bar',
  nightlife: 'Soirée', shopping: 'Shopping', sport: 'Sport', other: 'Autre',
}

// ── Confirmation inline ────────────────────────────────────────

function DeleteButton({ onConfirm, resetLabel }) {
  const [confirm, setConfirm] = useState(false)
  if (confirm) return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <button onClick={() => setConfirm(false)} style={{
        fontSize: '0.72rem', padding: '4px 10px', borderRadius: '10px',
        backgroundColor: 'rgba(0,0,0,0.06)', border: 'none', cursor: 'pointer',
        color: 'var(--text-secondary)',
      }}>Annuler</button>
      <button onClick={() => { setConfirm(false); onConfirm() }} style={{
        fontSize: '0.72rem', padding: '4px 10px', borderRadius: '10px',
        backgroundColor: 'rgba(220,38,38,0.12)', border: 'none', cursor: 'pointer',
        color: 'var(--trash)', fontWeight: 600,
      }}>Confirmer</button>
    </div>
  )
  if (resetLabel) return (
    <button onClick={() => setConfirm(true)} style={{
      fontSize: '0.75rem', padding: '5px 12px', borderRadius: '20px',
      backgroundColor: 'rgba(220,38,38,0.08)', color: 'var(--trash)',
      border: 'none', cursor: 'pointer', fontWeight: 600,
    }}>{resetLabel}</button>
  )
  return (
    <button onClick={() => setConfirm(true)} style={{
      width: 28, height: 28, borderRadius: '50%',
      backgroundColor: 'rgba(220,38,38,0.08)', border: 'none',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer', flexShrink: 0, fontSize: '0.8rem', color: 'var(--trash)',
    }}>✕</button>
  )
}

// ── Section utilisateurs ───────────────────────────────────────

function UsersTab({ currentUserId }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [banError, setBanError] = useState('')

  async function fetchUsers() {
    const { data } = await supabase.from('profiles').select('id, first_name, last_name, pseudo, role, banned, created_at').order('created_at')
    if (data) setUsers(data)
    setLoading(false)
  }

  useEffect(() => { fetchUsers() }, [])

  async function toggleBan(user) {
    setBanError('')
    const { error } = await supabase.from('profiles').update({ banned: !user.banned }).eq('id', user.id)
    if (error) { setBanError('Erreur : ' + error.message); return }
    fetchUsers()
  }

  async function toggleRole(user) {
    const newRole = user.role === 'admin' ? 'member' : 'admin'
    await supabase.from('profiles').update({ role: newRole }).eq('id', user.id)
    fetchUsers()
  }

  if (loading) return <Spinner />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {banError && (
        <p style={{ fontSize: '0.8rem', color: 'var(--trash)', padding: '8px 12px', background: 'rgba(220,38,38,0.06)', borderRadius: '10px', margin: 0 }}>
          {banError}
        </p>
      )}
      {users.length === 0 && (
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '40px 0', fontSize: '0.875rem' }}>
          Aucun utilisateur
        </p>
      )}
      {users.map(u => (
        <div key={u.id} className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, opacity: u.banned ? 0.55 : 1 }}>
          <div style={{
            width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
            backgroundColor: 'var(--accent-light)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: '1rem', color: 'var(--accent)',
          }}>
            {(u.first_name || u.pseudo || '?')[0].toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontWeight: 600, fontSize: '0.9rem', margin: 0 }}>
              {[u.first_name, u.last_name].filter(Boolean).join(' ') || u.pseudo}
              {u.id === currentUserId && <span style={{ color: 'var(--text-secondary)', fontWeight: 400, fontSize: '0.75rem' }}> (toi)</span>}
            </p>
            <button onClick={() => toggleRole(u)} style={{
              fontSize: '0.7rem', padding: '2px 8px', borderRadius: '10px', border: 'none',
              cursor: u.id === currentUserId ? 'default' : 'pointer',
              backgroundColor: u.role === 'admin' ? 'var(--accent-light)' : 'rgba(0,0,0,0.06)',
              color: u.role === 'admin' ? 'var(--accent)' : 'var(--text-secondary)',
              fontWeight: 600, marginTop: 3,
            }}>
              {u.role === 'admin' ? '🛡️ Admin' : '👤 Membre'}
            </button>
          </div>
          {u.id !== currentUserId && (
            <button onClick={() => toggleBan(u)} style={{
              fontSize: '0.72rem', padding: '4px 10px', borderRadius: '10px', border: 'none',
              cursor: 'pointer', fontWeight: 600, flexShrink: 0,
              backgroundColor: u.banned ? 'rgba(22,163,74,0.1)' : 'rgba(220,38,38,0.08)',
              color: u.banned ? 'var(--match)' : 'var(--trash)',
            }}>
              {u.banned ? 'Débannir' : 'Bannir'}
            </button>
          )}
        </div>
      ))}
      <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '8px 0 0' }}>
        Bannir un utilisateur révoque son accès à l'app sans supprimer son compte.
      </p>
      <ResetTutorialButton currentUserId={currentUserId} />
    </div>
  )
}

function ResetTutorialButton({ currentUserId }) {
  const { reset } = useTutorial()
  const [done, setDone] = useState(false)
  async function handle() {
    await reset()
    setDone(true)
    setTimeout(() => setDone(false), 2500)
  }
  return (
    <div style={{ marginTop: 16, padding: '14px 16px', borderRadius: '16px', background: 'rgba(74,144,217,0.07)', border: '1px dashed rgba(74,144,217,0.25)' }}>
      <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--sky)', margin: '0 0 8px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
        Test du tutoriel
      </p>
      <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0 0 10px' }}>
        Relance le tuto sur ton compte pour le tester sans créer de nouveau compte.
      </p>
      <button onClick={handle} style={{
        fontSize: '0.82rem', fontWeight: 700, padding: '8px 16px', borderRadius: '12px',
        background: done ? 'rgba(22,163,74,0.1)' : 'rgba(74,144,217,0.12)',
        color: done ? 'var(--match)' : 'var(--sky)',
        border: 'none', cursor: 'pointer', fontFamily: 'inherit',
      }}>
        {done ? '✓ Tuto relancé !' : '▶ Rejouer le tutoriel'}
      </button>
    </div>
  )
}

// ── Section activités ──────────────────────────────────────────

function ActivitiesTab() {
  const [city, setCity] = useState('bruxelles')
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)

  async function fetchActivities() {
    setLoading(true)
    const { data } = await supabase
      .from('activities')
      .select('*')
      .eq('city', city)
      .order('created_at')
    if (data) setActivities(data)
    setLoading(false)
  }

  useEffect(() => { fetchActivities() }, [city])

  async function toggleActive(act) {
    await supabase.from('activities').update({ is_active: !act.is_active }).eq('id', act.id)
    fetchActivities()
  }

  async function deleteActivity(id) {
    await supabase.from('activities').delete().eq('id', id)
    fetchActivities()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* City picker */}
      <div style={{ overflowX: 'auto', display: 'flex', gap: 8, scrollbarWidth: 'none', paddingBottom: 2 }}>
        {CITY_ORDER.map(c => (
          <button key={c} onClick={() => setCity(c)} style={{
            flexShrink: 0, borderRadius: '20px', padding: '5px 12px',
            fontSize: '0.75rem', fontWeight: 600, border: 'none', cursor: 'pointer',
            backgroundColor: city === c ? 'var(--accent)' : 'rgba(0,0,0,0.05)',
            color: city === c ? 'white' : 'var(--text-secondary)',
          }}>
            {CITY_LABELS[c]}
          </button>
        ))}
      </div>

      {loading ? <Spinner /> : activities.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '40px 0', fontSize: '0.875rem' }}>
          Aucune activité pour {CITY_LABELS[city]}
        </p>
      ) : (
        activities.map(a => (
          <div key={a.id} className="card" style={{
            padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10,
            opacity: a.is_active ? 1 : 0.5,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 600, fontSize: '0.875rem', margin: 0 }}>{a.name}</p>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                {CATEGORY_FR[a.category] ?? a.category}
                {a.price_eur === 0 ? ' · Gratuit' : a.price_eur != null ? ` · ${a.price_eur}€` : ''}
                {!a.is_active && ' · Masquée'}
              </p>
            </div>
            <button onClick={() => toggleActive(a)} style={{
              fontSize: '0.72rem', padding: '4px 10px', borderRadius: '10px',
              backgroundColor: a.is_active ? 'rgba(0,0,0,0.06)' : 'rgba(22,163,74,0.1)',
              color: a.is_active ? 'var(--text-secondary)' : 'var(--match)',
              border: 'none', cursor: 'pointer', fontWeight: 600, flexShrink: 0,
            }}>
              {a.is_active ? 'Masquer' : 'Réactiver'}
            </button>
            <DeleteButton onConfirm={() => deleteActivity(a.id)} />
          </div>
        ))
      )}
    </div>
  )
}

// ── Section votes ──────────────────────────────────────────────

function VotesTab() {
  const [city, setCity] = useState('bruxelles')
  const [votes, setVotes] = useState([])
  const [profiles, setProfiles] = useState([])
  const [activities, setActivities] = useState([])
  const [dayConfig, setDayConfig] = useState(null)
  const [loading, setLoading] = useState(true)

  async function fetchAll() {
    const today = new Date().toISOString().split('T')[0]
    setLoading(true)
    const [votesRes, profilesRes, activitiesRes, cfgRes] = await Promise.all([
      supabase.from('votes').select('*'),
      supabase.from('profiles').select('id, first_name, last_name, pseudo'),
      supabase.from('activities').select('id, name, city').eq('city', city),
      supabase.from('day_config').select('*').eq('city', city).eq('date', today).maybeSingle(),
    ])
    setVotes(votesRes.data ?? [])
    setProfiles(profilesRes.data ?? [])
    setActivities(activitiesRes.data ?? [])
    setDayConfig(cfgRes.data ?? null)
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [city])

  async function resetVotesForCity() {
    const actIds = activities.map(a => a.id)
    if (actIds.length === 0) return
    await supabase.from('votes').delete().in('activity_id', actIds)
    await supabase.from('day_config').delete().eq('city', city)
    fetchAll()
  }

  async function deleteVote(id) {
    await supabase.from('votes').delete().eq('id', id)
    fetchAll()
  }

  async function closeVotes() {
    const today = new Date().toISOString().split('T')[0]
    await supabase.from('day_config').update({ votes_open: false }).eq('city', city).eq('date', today)
    fetchAll()
  }

  const profileMap = Object.fromEntries(profiles.map(p => [
    p.id,
    [p.first_name, p.last_name].filter(Boolean).join(' ') || p.pseudo,
  ]))
  const actMap = Object.fromEntries(activities.map(a => [a.id, a.name]))
  const cityVotes = votes.filter(v => activities.some(a => a.id === v.activity_id))

  const VOTE_ICON = { match: '✅', snooze: '⏱️', trash: '🗑️' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ overflowX: 'auto', display: 'flex', gap: 8, scrollbarWidth: 'none', paddingBottom: 2 }}>
        {CITY_ORDER.map(c => (
          <button key={c} onClick={() => setCity(c)} style={{
            flexShrink: 0, borderRadius: '20px', padding: '5px 12px',
            fontSize: '0.75rem', fontWeight: 600, border: 'none', cursor: 'pointer',
            backgroundColor: city === c ? 'var(--accent)' : 'rgba(0,0,0,0.05)',
            color: city === c ? 'white' : 'var(--text-secondary)',
          }}>
            {CITY_LABELS[c]}
          </button>
        ))}
      </div>

      {loading ? <Spinner /> : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
                {cityVotes.length} vote{cityVotes.length > 1 ? 's' : ''}
              </p>
              <span style={{
                fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px',
                background: dayConfig?.votes_open ? 'rgba(59,170,122,0.12)' : 'rgba(0,0,0,0.06)',
                color: dayConfig?.votes_open ? 'var(--mint)' : 'var(--text-secondary)',
              }}>
                {dayConfig?.votes_open ? '🟢 Ouverts' : '🔴 Fermés'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {dayConfig?.votes_open && (
                <button onClick={closeVotes} style={{
                  fontSize: '0.75rem', padding: '5px 12px', borderRadius: '20px',
                  backgroundColor: 'rgba(232,160,48,0.12)', color: 'var(--sun)',
                  border: 'none', cursor: 'pointer', fontWeight: 600,
                }}>🔒 Fermer les votes</button>
              )}
              {cityVotes.length > 0 && (
                <DeleteButton onConfirm={resetVotesForCity} resetLabel="🔄 Reset tous" />
              )}
            </div>
          </div>
          {cityVotes.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '30px 0', fontSize: '0.875rem' }}>
              Aucun vote pour cette ville
            </p>
          ) : (
            cityVotes.map(v => (
              <div key={v.id} className="card" style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px',
              }}>
                <span style={{ fontSize: '1rem', flexShrink: 0 }}>
                  {VOTE_ICON[v.vote] ?? '❓'}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: '0.82rem', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {actMap[v.activity_id] ?? 'Activité inconnue'}
                  </p>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: 0 }}>
                    {profileMap[v.user_id] ?? '?'}
                  </p>
                </div>
                <DeleteButton onConfirm={() => deleteVote(v.id)} />
              </div>
            ))
          )}
        </>
      )}
    </div>
  )
}

// ── Spinner ────────────────────────────────────────────────────

function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
      <div style={{
        width: 24, height: 24, borderRadius: '50%',
        border: '2px solid var(--accent)', borderTopColor: 'transparent',
        animation: 'spin 0.7s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// ── Page principale ────────────────────────────────────────────

const TABS = [
  { key: 'users',      label: '👥 Utilisateurs' },
  { key: 'activities', label: '🗂️ Activités' },
  { key: 'votes',      label: '🗳️ Votes' },
]

export default function Admin() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const initialTab = ['users', 'activities', 'votes'].includes(searchParams.get('tab'))
    ? searchParams.get('tab') : 'users'
  const [tab, setTab] = useState(initialTab)

  return (
    <div style={{ minHeight: '100dvh' }}>
      <div style={{ padding: '24px 16px 0' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Administration</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: 2, marginBottom: 16 }}>
          Gestion du groupe
        </p>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 8, padding: '0 16px 16px', overflowX: 'auto', scrollbarWidth: 'none' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            flexShrink: 0, borderRadius: '20px', padding: '7px 14px',
            fontSize: '0.82rem', fontWeight: 600, border: 'none', cursor: 'pointer',
            backgroundColor: tab === t.key ? 'var(--accent)' : 'rgba(0,0,0,0.05)',
            color: tab === t.key ? 'white' : 'var(--text-secondary)',
            transition: 'all 0.15s',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '0 16px' }}>
        {tab === 'users' && <UsersTab currentUserId={user?.id} />}
        {tab === 'activities' && <ActivitiesTab />}
        {tab === 'votes' && <VotesTab />}
      </div>
    </div>
  )
}
