import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useTutorial, STEPS } from '../context/TutorialContext'

const NAV_STEPS = STEPS.filter(s => s.type === 'navigate')

const btnGlass = {
  background: 'rgba(255,255,255,0.82)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(255,255,255,0.90)',
}

// ── Démo Explorer : 3 votes forcés ────────────────────────────

const DEMO_ACTS = [
  {
    emoji: '🏛️', name: 'Rijksmuseum', city: 'Amsterdam', tag: 'Culture', price: '20€',
    required: 'match',
    instruction: 'Tu es partant → tape',
    btnLabel: '✓',
    bg: 'rgba(74,144,217,0.12)',
    color: '#4a90d9',
  },
  {
    emoji: '🎡', name: 'Prater', city: 'Vienne', tag: 'Nature', price: 'Gratuit',
    required: 'snooze',
    instruction: 'Pas sûr(e) aujourd\'hui → tape',
    btnLabel: '⏱️',
    bg: 'rgba(59,170,122,0.10)',
    color: '#3baa7a',
  },
  {
    emoji: '🎤', name: 'Karaoké', city: 'Budapest', tag: 'Soirée', price: '15€',
    required: 'trash',
    instruction: 'Pas pour toi du tout → tape',
    btnLabel: '✕',
    bg: 'rgba(224,90,90,0.10)',
    color: '#e05a5a',
  },
]

function ExplorerDemo({ onComplete }) {
  const [idx, setIdx] = useState(0)
  const [done, setDone] = useState(false)
  const [hint, setHint] = useState('')
  const [shake, setShake] = useState('')

  function castVote(type) {
    const act = DEMO_ACTS[idx]
    if (type !== act.required) {
      const labels = { match: '✓', snooze: '⏱️', trash: '✕' }
      setHint(`Pas celui-là ! ${act.instruction} ${act.btnLabel}`)
      setShake(type)
      setTimeout(() => { setHint(''); setShake('') }, 1600)
      return
    }
    const next = idx + 1
    if (next >= DEMO_ACTS.length) {
      setDone(true)
      onComplete()
    } else {
      setIdx(next)
    }
  }

  if (done) {
    return (
      <div style={{ textAlign: 'center', padding: '8px 0 12px' }}>
        <p style={{ fontSize: '1.6rem', margin: '0 0 6px' }}>🎉</p>
        <p style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', margin: '0 0 4px' }}>
          Tu sais maintenant voter !
        </p>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
          Dans l'app les votes sont réels et partagés avec tout le groupe.
        </p>
      </div>
    )
  }

  const act = DEMO_ACTS[idx]

  return (
    <div>
      <style>{`
        @keyframes demoShake {
          0%,100% { transform: translateX(0); }
          25%      { transform: translateX(-5px); }
          75%      { transform: translateX(5px); }
        }
        @keyframes demoPulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(255,255,255,0.0); }
          50%      { box-shadow: 0 0 0 5px rgba(255,255,255,0.25); }
        }
      `}</style>

      {/* Progression */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        {DEMO_ACTS.map((a, i) => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 2,
            background: i < idx ? 'var(--accent)' : i === idx ? 'rgba(26,23,20,0.15)' : 'rgba(26,23,20,0.08)',
            transition: 'background 0.3s',
          }} />
        ))}
      </div>

      {/* Fausse carte activité */}
      <div style={{
        background: act.bg, borderRadius: '18px', padding: '16px 18px',
        marginBottom: 14, border: `1px solid ${act.color}25`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 52, height: 52, borderRadius: '16px', flexShrink: 0,
            background: `${act.color}20`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.6rem',
          }}>
            {act.emoji}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontWeight: 800, fontSize: '1rem', margin: 0, letterSpacing: '-0.01em' }}>{act.name}</p>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
              {act.city} · {act.tag} · {act.price}
            </p>
          </div>
        </div>
        <div style={{
          marginTop: 12, padding: '8px 12px', borderRadius: '10px',
          background: 'rgba(255,255,255,0.55)',
          fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)',
        }}>
          👉 {act.instruction} <span style={{ color: act.color }}>{act.btnLabel}</span>
        </div>
      </div>

      {/* Boutons de vote (vrais styles d'Explorer) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, marginBottom: 8 }}>

        {/* Trash ✕ */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
          <button
            onClick={() => castVote('trash')}
            style={{
              width: 60, height: 60, borderRadius: '50%', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit',
              ...btnGlass,
              boxShadow: '0 4px 20px rgba(224,90,90,0.22), inset 0 1px 0 rgba(255,255,255,0.9)',
              animation: shake === 'trash' ? 'demoShake 0.3s ease' : (act.required === 'trash' ? 'demoPulse 1.4s ease-in-out infinite' : 'none'),
              outline: act.required === 'trash' ? '2px solid rgba(224,90,90,0.5)' : 'none',
            }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="#e05a5a" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </button>
          <span style={{ fontSize: '0.58rem', fontWeight: 600, color: 'var(--text-tertiary)' }}>Non</span>
        </div>

        {/* Snooze ⏱️ */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
          <button
            onClick={() => castVote('snooze')}
            style={{
              width: 44, height: 44, borderRadius: '50%', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit',
              ...btnGlass,
              animation: shake === 'snooze' ? 'demoShake 0.3s ease' : (act.required === 'snooze' ? 'demoPulse 1.4s ease-in-out infinite' : 'none'),
              outline: act.required === 'snooze' ? '2px solid rgba(176,170,163,0.6)' : 'none',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="#b0aaa3" strokeWidth="1.8"/>
              <path d="M12 7v5l3 3" stroke="#b0aaa3" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <span style={{ fontSize: '0.58rem', fontWeight: 600, color: 'var(--text-tertiary)' }}>Plus tard</span>
        </div>

        {/* Match ✓ */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
          <button
            onClick={() => castVote('match')}
            style={{
              width: 60, height: 60, borderRadius: '50%', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit',
              ...btnGlass,
              boxShadow: '0 4px 20px rgba(59,170,122,0.26), inset 0 1px 0 rgba(255,255,255,0.9)',
              animation: shake === 'match' ? 'demoShake 0.3s ease' : (act.required === 'match' ? 'demoPulse 1.4s ease-in-out infinite' : 'none'),
              outline: act.required === 'match' ? '2px solid rgba(59,170,122,0.5)' : 'none',
            }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path d="M20 6L9 17l-5-5" stroke="#3baa7a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <span style={{ fontSize: '0.58rem', fontWeight: 600, color: 'var(--text-tertiary)' }}>Oui !</span>
        </div>
      </div>

      {hint && (
        <p style={{ fontSize: '0.78rem', color: 'var(--trash)', textAlign: 'center', margin: '4px 0 0', fontWeight: 600 }}>
          {hint}
        </p>
      )}
    </div>
  )
}

// ── Démo Oracle ────────────────────────────────────────────────

function OracleDemo() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '4px 0 8px' }}>
      {/* Message utilisateur */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{
          maxWidth: '78%', padding: '9px 13px',
          borderRadius: '18px 18px 4px 18px',
          background: 'linear-gradient(135deg, #e8a030, #c87818)',
          color: 'white', fontSize: '0.82rem', lineHeight: 1.45,
        }}>
          Que faire à Prague demain ?
        </div>
      </div>
      {/* Réponse Oracle */}
      <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
        <div style={{
          maxWidth: '88%', padding: '9px 13px',
          borderRadius: '4px 18px 18px 18px',
          background: 'rgba(255,255,255,0.85)',
          border: '1px solid rgba(255,255,255,0.9)',
          boxShadow: '0 2px 10px rgba(26,23,20,0.07)',
          fontSize: '0.82rem', lineHeight: 1.5, color: 'var(--text-primary)',
        }}>
          Demain à Prague je te suggère le <strong>Château de Prague</strong> le matin (entrée ~15€), puis le quartier de <strong>Malá Strana</strong> à pied — c'est gratuit et magnifique !
        </div>
      </div>
      {/* Chip suggestion activité */}
      <div style={{
        alignSelf: 'flex-start',
        background: 'rgba(232,160,48,0.10)', border: '1px solid rgba(232,160,48,0.30)',
        borderRadius: '12px', padding: '6px 10px',
        fontSize: '0.74rem', fontWeight: 600, color: 'var(--sun)',
        display: 'flex', alignItems: 'center', gap: 5,
      }}>
        <span>✦</span> Oracle peut aussi ajouter des activités dans le deck de votes
      </div>
    </div>
  )
}

// ── Overlay principal ──────────────────────────────────────────

export default function TutorialOverlay() {
  const { step, phase, active, currentStep, advance, onNavigated, skip } = useTutorial()
  const location = useLocation()
  const [skipConfirm, setSkipConfirm] = useState(false)
  const [demoComplete, setDemoComplete] = useState(false)

  useEffect(() => {
    if (active) onNavigated(location.pathname)
  }, [location.pathname, step])

  // Reset demo complete quand on change d'étape
  useEffect(() => { setDemoComplete(false) }, [step])

  useEffect(() => {
    if (!skipConfirm) return
    const t = setTimeout(() => setSkipConfirm(false), 3000)
    return () => clearTimeout(t)
  }, [skipConfirm])

  if (!active || !currentStep) return null

  const isModal = currentStep.type === 'modal'
  const navStepIndex = NAV_STEPS.indexOf(currentStep)
  const isExplorer = currentStep.id === 'explorer'
  const isOracle  = currentStep.id === 'oracle'
  const canAdvance = !isExplorer || demoComplete

  function handleSkip() {
    if (skipConfirm) { skip() } else { setSkipConfirm(true) }
  }

  const skipBtn = (light) => (
    <button onClick={handleSkip} style={{
      background: 'none', border: 'none', cursor: 'pointer',
      fontSize: '0.72rem', fontWeight: 500, fontFamily: 'inherit',
      color: light ? 'rgba(255,255,255,0.28)' : 'var(--text-tertiary)',
      padding: '6px 10px',
    }}>
      {skipConfirm ? 'Confirmer ?' : 'Passer'}
    </button>
  )

  // ── Modal (welcome / done) ─────────────────────────────────────
  if (isModal) {
    const isDone = currentStep.id === 'done'
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 300,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(8,8,8,0.80)',
        backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
        padding: '0 24px',
      }}>
        <div className="slide-up" style={{
          width: '100%', maxWidth: 360, background: 'var(--bg-base)',
          borderRadius: '28px', padding: '36px 28px 28px',
          boxShadow: '0 24px 80px rgba(0,0,0,0.3)', textAlign: 'center',
        }}>
          <p style={{ fontSize: '3rem', margin: '0 0 18px', lineHeight: 1 }}>{currentStep.emoji}</p>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0 0 12px', letterSpacing: '-0.02em' }}>
            {currentStep.title}
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: '0 0 28px', lineHeight: 1.65 }}>
            {currentStep.body}
          </p>
          <button onClick={() => advance(location.pathname)} className="btn-primary" style={{ width: '100%' }}>
            {currentStep.action}
          </button>
          {!isDone && <div style={{ marginTop: 10 }}>{skipBtn(false)}</div>}
        </div>
      </div>
    )
  }

  // Position précise de l'onglet cible dans la nav
  // Nav: width = 100vw - 32px, padding 6px, 5 items flex-1 égaux
  const tabCenterExpr = `calc(22px + (100vw - 44px) * ${(currentStep.tabIndex * 2 + 1) / 10})`

  // ── Navigate phase ─────────────────────────────────────────────
  if (phase === 'navigate') {
    return (
      <>
        <style>{`
          @keyframes tutoBounce {
            0%,100% { transform: translateX(-50%) translateY(0px); }
            50%      { transform: translateX(-50%) translateY(8px); }
          }
          @keyframes tutoPulse {
            0%,100% { box-shadow: 0 0 0 0 rgba(26,23,20,0.45), 0 0 12px rgba(26,23,20,0.10); }
            50%      { box-shadow: 0 0 0 7px rgba(26,23,20,0.0), 0 0 22px rgba(26,23,20,0.20); }
          }
        `}</style>
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', flexDirection: 'column', pointerEvents: 'none' }}>
          <div style={{
            flex: 1, background: 'rgba(8,8,8,0.74)', pointerEvents: 'all',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 20, padding: '0 28px',
          }}>
            <p style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.38)', margin: 0 }}>
              Étape {navStepIndex + 1} / {NAV_STEPS.length}
            </p>
            <div style={{
              background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.13)',
              borderRadius: '24px', padding: '26px 24px', textAlign: 'center', maxWidth: 300, width: '100%',
            }}>
              <p style={{ fontSize: '1rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)', margin: '0 0 6px' }}>
                Tape sur l'onglet
              </p>
              <p style={{ fontSize: '1.4rem', fontWeight: 800, color: 'white', margin: 0, letterSpacing: '-0.01em' }}>
                « {currentStep.tabLabel} »
              </p>
              <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.35)', margin: '10px 0 0' }}>
                dans la barre de navigation ci-dessous
              </p>
            </div>
            {skipBtn(true)}
          </div>

          {/* Hauteur dynamique : suit le bottom de la BottomBar (safe-area + 10px) */}
          {/* Oracle est surélevé de 20px → container plus grand + ring circulaire */}
          <div style={{ height: `calc(env(safe-area-inset-bottom, 0px) + ${isOracle ? 140 : 110}px)`, position: 'relative' }}>
            <div style={{
              position: 'absolute',
              bottom: isOracle
                ? 'calc(env(safe-area-inset-bottom, 0px) + 36px)'
                : 'calc(env(safe-area-inset-bottom, 0px) + 15px)',
              left: tabCenterExpr,
              transform: 'translateX(-50%)',
              width: isOracle ? 62 : 54,
              height: isOracle ? 62 : 54,
              borderRadius: isOracle ? '50%' : '18px',
              border: isOracle
                ? '2.5px solid rgba(232,160,48,0.90)'
                : '2.5px solid rgba(26,23,20,0.80)',
              animation: 'tutoPulse 1.4s ease-in-out infinite',
            }} />
            <div style={{
              position: 'absolute', top: isOracle ? 0 : 4, left: tabCenterExpr,
              transform: 'translateX(-50%)',
              fontSize: '1.4rem', color: 'white',
              animation: 'tutoBounce 0.8s ease-in-out infinite', lineHeight: 1,
            }}>↓</div>
          </div>
        </div>
      </>
    )
  }

  // ── Explain phase ──────────────────────────────────────────────
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', flexDirection: 'column', pointerEvents: 'none' }}>
      <div style={{ flex: 1, background: 'rgba(8,8,8,0.25)' }} />

      <div style={{ pointerEvents: 'all', padding: '0 12px 118px', maxHeight: '80vh', overflowY: 'auto' }}>
        <div className="slide-up" style={{
          background: 'white', borderRadius: '26px', padding: '22px 20px 18px',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.16)',
        }}>
          <p style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-tertiary)', margin: '0 0 6px' }}>
            Étape {navStepIndex + 1} / {NAV_STEPS.length}
          </p>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            {currentStep.title}
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '0 0 16px', lineHeight: 1.6 }}>
            {currentStep.body}
          </p>

          {isExplorer && (
            <ExplorerDemo onComplete={() => setDemoComplete(true)} />
          )}

          {isOracle && <OracleDemo />}

          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: (isExplorer || isOracle) ? 12 : 0 }}>
            <button
              onClick={() => canAdvance && advance(location.pathname)}
              className="btn-primary"
              style={{
                flex: 1, padding: '13px',
                opacity: canAdvance ? 1 : 0.35,
                cursor: canAdvance ? 'pointer' : 'default',
              }}
            >
              {isExplorer && !demoComplete ? 'Complète les 3 votes pour continuer' : `${currentStep.action} →`}
            </button>
            {skipBtn(false)}
          </div>
        </div>
      </div>
    </div>
  )
}
