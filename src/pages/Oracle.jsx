import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { getCurrentCity, CITY_SCHEDULE } from '../lib/travel'
import { buildSystemPrompt, streamChat } from '../lib/openrouter'

const CATEGORY_META = {
  culture:   { emoji: '🏛️', label: 'Culture' },
  nature:    { emoji: '🌿', label: 'Nature' },
  food:      { emoji: '🍽️', label: 'Resto & Bar' },
  nightlife: { emoji: '🎶', label: 'Soirée' },
  shopping:  { emoji: '🛍️', label: 'Shopping' },
  sport:     { emoji: '⚡',  label: 'Sport' },
  other:     { emoji: '✨', label: 'Autre' },
}

const CITY_LABELS = {
  bruxelles: 'Bruxelles', amsterdam: 'Amsterdam', berlin: 'Berlin',
  prague: 'Prague', budapest: 'Budapest', vienne: 'Vienne', geneve: 'Genève',
}

const SUGGESTIONS = [
  'Que faire aujourd\'hui ?',
  'Meilleurs restos pas chers',
  'Une anecdote historique',
  'Activité insolite à faire',
]

// ── Helpers ────────────────────────────────────────────────────

function today() {
  const d = new Date()
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function formatText(text) {
  return text
    .split('\n')
    .map((line, i) => {
      const bold = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      return `<span key="${i}">${bold}</span>`
    })
    .join('<br/>')
}

// ── Sub-components ─────────────────────────────────────────────

function MessageBubble({ message, live }) {
  const isUser = message.role === 'user'
  return (
    <div style={{
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      animation: live ? 'none' : 'slideUp 0.18s ease both',
    }}>
      <div style={{
        maxWidth: '82%',
        padding: isUser ? '10px 14px' : '12px 14px',
        borderRadius: isUser ? '18px 18px 4px 18px' : '4px 18px 18px 18px',
        background: isUser
          ? 'linear-gradient(135deg, var(--sun), #c87818)'
          : 'rgba(255,255,255,0.88)',
        backdropFilter: isUser ? 'none' : 'blur(16px)',
        border: isUser ? 'none' : '1px solid rgba(255,255,255,0.9)',
        boxShadow: isUser
          ? '0 2px 10px rgba(200,120,24,0.28)'
          : '0 2px 12px rgba(26,23,20,0.07)',
        color: isUser ? 'white' : 'var(--text-primary)',
        fontSize: '0.9375rem',
        lineHeight: 1.55,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}>
        {message.content}
        {live && (
          <span style={{
            display: 'inline-block', width: 6, height: 14,
            background: 'var(--sun)', borderRadius: 2,
            marginLeft: 3, verticalAlign: 'middle',
            animation: 'blink 0.8s step-start infinite',
          }} />
        )}
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
      <div style={{
        padding: '12px 16px', borderRadius: '4px 18px 18px 18px',
        background: 'rgba(255,255,255,0.88)', border: '1px solid rgba(255,255,255,0.9)',
        boxShadow: '0 2px 12px rgba(26,23,20,0.07)',
        display: 'flex', gap: 5, alignItems: 'center',
      }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 7, height: 7, borderRadius: '50%',
            background: 'var(--text-tertiary)',
            animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>
    </div>
  )
}

function ActivityCard({ activity, onConfirm, onDismiss, loading }) {
  const meta = CATEGORY_META[activity.category] ?? CATEGORY_META.other
  const cityLabel = CITY_LABELS[activity.city] ?? activity.city

  return (
    <div style={{
      background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px)',
      border: '1.5px solid rgba(232,160,48,0.35)',
      borderRadius: '16px', padding: '14px 16px',
      boxShadow: '0 2px 16px rgba(232,160,48,0.12), 0 2px 8px rgba(26,23,20,0.06)',
      animation: 'slideUp 0.22s cubic-bezier(0.22,1,0.36,1) both',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--sun)', letterSpacing: '0.03em' }}>
          ✦ ORACLE SUGGÈRE
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <span style={{ fontSize: '1.4rem', lineHeight: 1, marginTop: 1 }}>{meta.emoji}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '0.9375rem', marginBottom: 3, lineHeight: 1.3 }}>
            {activity.name}
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.45, marginBottom: 6 }}>
            {activity.description}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{
              fontSize: '0.75rem', fontWeight: 500, padding: '2px 8px',
              borderRadius: '20px', background: 'rgba(26,23,20,0.06)',
              color: 'var(--text-secondary)',
            }}>
              {meta.label}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              📍 {cityLabel}
            </span>
            {activity.price_eur != null && (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                ~{activity.price_eur === 0 ? 'Gratuit' : `${activity.price_eur}€`}
              </span>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button
          onClick={onDismiss}
          style={{
            flex: 1, padding: '10px', borderRadius: '12px', border: 'none',
            background: 'rgba(26,23,20,0.06)', color: 'var(--text-secondary)',
            fontSize: '0.875rem', fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer',
          }}
        >
          Ignorer
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          style={{
            flex: 2, padding: '10px', borderRadius: '12px', border: 'none',
            background: loading ? 'rgba(26,23,20,0.08)' : 'var(--ink)',
            color: loading ? 'var(--text-secondary)' : 'white',
            fontSize: '0.875rem', fontWeight: 700, fontFamily: 'inherit',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'background 0.15s',
          }}
        >
          {loading ? '…' : 'Ajouter au deck ✓'}
        </button>
      </div>
    </div>
  )
}

function WelcomeScreen({ currentCity, onSuggestion }) {
  const cityName = currentCity ? `${currentCity.flag} ${currentCity.label}` : 'le voyage'

  return (
    <div style={{ padding: '24px 0 16px', animation: 'fadeIn 0.3s ease both' }}>
      <div style={{
        width: 56, height: 56, borderRadius: '50%',
        background: 'linear-gradient(145deg, #e8a030, #c87818)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 16,
        boxShadow: '0 4px 16px rgba(232,160,48,0.38)',
      }}>
        <svg viewBox="0 0 24 24" fill="none" width={26} height={26}>
          <path d="M12 2.5L13.2 8.8L19.5 10L13.2 11.2L12 17.5L10.8 11.2L4.5 10L10.8 8.8L12 2.5Z" fill="white"/>
          <path d="M19.5 4L20.1 6.4L22.5 7L20.1 7.6L19.5 10L18.9 7.6L16.5 7L18.9 6.4L19.5 4Z" fill="white" opacity={0.7}/>
        </svg>
      </div>

      <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 6px' }}>
        Bonjour, je suis Oracle
      </h2>
      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '0 0 20px', lineHeight: 1.5 }}>
        Ton guide pour {cityName} et tout le voyage.<br />
        Pose-moi n'importe quelle question sur les étapes,<br />
        ou demande-moi de suggérer des activités.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {SUGGESTIONS.map(s => (
          <button
            key={s}
            onClick={() => onSuggestion(s)}
            style={{
              textAlign: 'left', padding: '11px 14px',
              borderRadius: '14px', border: '1px solid rgba(26,23,20,0.08)',
              background: 'rgba(255,255,255,0.7)', color: 'var(--text-primary)',
              fontSize: '0.875rem', fontFamily: 'inherit', cursor: 'pointer',
              transition: 'background 0.12s',
            }}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────

export default function Oracle() {
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [streamText, setStreamText] = useState('')
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [pendingActivity, setPendingActivity] = useState(null)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [deckActivities, setDeckActivities] = useState([])
  const [trains, setTrains]   = useState([])
  const [airbnbs, setAirbnbs] = useState([])

  // Weather read directly from localStorage cache (written by the dashboard)
  const weather = (() => {
    try { return JSON.parse(localStorage.getItem('weather_cache_v6')) } catch { return null }
  })()

  const bottomRef = useRef(null)
  const inputRef  = useRef(null)
  const currentCity = getCurrentCity()

  // Fetch all context data in parallel at mount
  useEffect(() => {
    Promise.all([
      supabase.from('activities').select('city, name'),
      supabase.from('trains').select('leg_order, date, from_station, to_station, departure_time, arrival_time, train_number, platform_dep, platform_arr, is_connection, notes').order('leg_order'),
      supabase.from('airbnbs').select('city, address, checkin_time, checkout_time, wifi_name, instructions'),
    ]).then(([activitiesRes, trainsRes, airbnbsRes]) => {
      if (activitiesRes.data) setDeckActivities(activitiesRes.data)
      if (trainsRes.data)     setTrains(trainsRes.data)
      if (airbnbsRes.data)    setAirbnbs(airbnbsRes.data)
    })
  }, [])

  // Auto-scroll on new content — scroll page to absolute bottom
  // so the last message is never hidden behind the fixed input bar
  useEffect(() => {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' })
  }, [messages, streamText, pendingActivity])

  function buildContext() {
    const activitiesByCity = {}
    for (const c of CITY_SCHEDULE) activitiesByCity[c.city] = []
    for (const a of deckActivities) {
      if (activitiesByCity[a.city]) activitiesByCity[a.city].push(a)
    }
    return { today: today(), currentCity, activitiesByCity, trains, airbnbs, weather }
  }

  async function handleSend(text) {
    const content = (text ?? input).trim()
    if (!content || streaming) return

    const userMsg = { role: 'user', content }
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    setInput('')
    setStreamText('')
    setPendingActivity(null)
    setStreaming(true)

    let accText = ''
    let toolCall = null

    try {
      const systemPrompt = buildSystemPrompt(buildContext())
      const apiMessages  = nextMessages.map(m => ({ role: m.role, content: m.content }))

      for await (const chunk of streamChat({ messages: apiMessages, systemPrompt })) {
        if (chunk.type === 'text') {
          accText += chunk.content
          setStreamText(accText)
        } else if (chunk.type === 'tool_call') {
          toolCall = chunk.args
        }
      }
    } catch (err) {
      accText = `Désolé, une erreur est survenue : ${err.message}`
    }

    if (accText) {
      setMessages(prev => [...prev, { role: 'assistant', content: accText }])
    }
    setStreamText('')

    if (toolCall) setPendingActivity(toolCall)

    setStreaming(false)
  }

  async function handleConfirm() {
    if (!pendingActivity) return
    setConfirmLoading(true)

    const { error } = await supabase.from('activities').insert({
      city:        pendingActivity.city,
      name:        pendingActivity.name,
      description: pendingActivity.description || null,
      category:    pendingActivity.category,
      price_eur:   pendingActivity.price_eur ?? null,
      latitude:    pendingActivity.latitude  ?? null,
      longitude:   pendingActivity.longitude ?? null,
      added_by:    user.id,
    })

    const cityLabel = CITY_LABELS[pendingActivity.city] ?? pendingActivity.city
    const feedback = error
      ? 'Erreur lors de l\'ajout. Réessaie.'
      : `✅ **${pendingActivity.name}** ajouté au deck pour ${cityLabel} !`

    setMessages(prev => [...prev, { role: 'assistant', content: feedback }])
    setPendingActivity(null)
    setConfirmLoading(false)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const showWelcome = messages.length === 0 && !streaming

  return (
    <>
      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-5px); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>

      {/* Header */}
      <div style={{
        padding: '20px 16px 10px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
            ✦ Oracle
          </h1>
          <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            {currentCity
              ? `${currentCity.flag} ${currentCity.label} · ${currentCity.from} → ${currentCity.to}`
              : 'Assistant de voyage'}
          </p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => { setMessages([]); setPendingActivity(null); setStreamText('') }}
            style={{
              padding: '6px 12px', borderRadius: '20px', border: 'none',
              background: 'rgba(26,23,20,0.06)', color: 'var(--text-secondary)',
              fontSize: '0.8rem', fontFamily: 'inherit', cursor: 'pointer',
            }}
          >
            Effacer
          </button>
        )}
      </div>

      {/* Messages */}
      <div style={{ padding: '4px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {showWelcome && (
          <WelcomeScreen currentCity={currentCity} onSuggestion={s => handleSend(s)} />
        )}

        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}

        {streamText && (
          <MessageBubble message={{ role: 'assistant', content: streamText }} live />
        )}

        {!streamText && streaming && <TypingIndicator />}

        {pendingActivity && !streaming && (
          <ActivityCard
            activity={pendingActivity}
            onConfirm={handleConfirm}
            onDismiss={() => setPendingActivity(null)}
            loading={confirmLoading}
          />
        )}

        <div ref={bottomRef} style={{ height: 1 }} />
      </div>

      {/* Fixed input bar — positioned above BottomBar */}
      <div style={{
        position: 'fixed',
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 88px)',
        left: '50%', transform: 'translateX(-50%)',
        width: 'calc(100% - 32px)', maxWidth: '480px',
        background: 'var(--glass-bar)',
        backdropFilter: 'blur(32px) saturate(180%)',
        WebkitBackdropFilter: 'blur(32px) saturate(180%)',
        borderRadius: '22px',
        border: '1px solid rgba(255,255,255,0.9)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.09), inset 0 1px 0 rgba(255,255,255,1)',
        padding: '8px 8px 8px 16px',
        display: 'flex', alignItems: 'center', gap: 8,
        zIndex: 40,
      }}>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={streaming ? 'Oracle écrit…' : 'Pose une question sur le voyage…'}
          disabled={streaming}
          style={{
            flex: 1, background: 'transparent', border: 'none',
            fontSize: '0.9375rem', outline: 'none', padding: 0,
            color: 'var(--text-primary)', fontFamily: 'inherit',
          }}
        />
        <button
          onClick={() => handleSend()}
          disabled={streaming || !input.trim()}
          style={{
            width: 38, height: 38, borderRadius: '14px', border: 'none', flexShrink: 0,
            background: (!streaming && input.trim()) ? 'linear-gradient(135deg, #e8a030, #c87818)' : 'rgba(26,23,20,0.07)',
            cursor: (!streaming && input.trim()) ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.15s, transform 0.1s',
            boxShadow: (!streaming && input.trim()) ? '0 2px 8px rgba(200,120,24,0.30)' : 'none',
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" width={18} height={18}>
            <path d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
              stroke={(!streaming && input.trim()) ? 'white' : 'var(--text-tertiary)'}
              strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </>
  )
}
