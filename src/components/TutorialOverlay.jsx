import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useTutorial, STEPS } from '../context/TutorialContext'

const NAV_STEPS = STEPS.filter(s => s.type === 'navigate')

// Démo interactive pour l'étape Explorer
function ExplorerDemo() {
  const [vote, setVote] = useState(null)
  const choices = [
    { key: 'yes',   icon: '✅', label: "Oui, on fait ça aujourd'hui !", color: '#16a34a', bg: 'rgba(22,163,74,0.10)' },
    { key: 'later', icon: '⏱️', label: 'Non, pas auj. mais pourquoi pas', color: '#e8a030', bg: 'rgba(232,160,48,0.10)' },
    { key: 'no',    icon: '🗑️', label: 'Non, pas pour moi du voyage',    color: '#dc2626', bg: 'rgba(220,38,38,0.08)' },
  ]
  const feedback = {
    yes:   "Super ! Si tout le groupe vote ✅, l'activité est validée pour la journée.",
    later: "L'activité reste dans la liste pour un autre jour.",
    no:    "L'activité disparaît de ta vue pour tout le voyage.",
  }
  return (
    <div style={{ marginBottom: 14 }}>
      <p style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 8px' }}>
        Essaie sur une activité fictive
      </p>
      <div style={{ background: 'rgba(26,23,20,0.05)', borderRadius: '12px', padding: '10px 14px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: '1.4rem' }}>🏛️</span>
        <div>
          <p style={{ fontWeight: 700, fontSize: '0.875rem', margin: 0 }}>Rijksmuseum</p>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: 0 }}>Amsterdam · Culture · 20€</p>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {choices.map(c => (
          <button key={c.key} onClick={() => setVote(c.key)} style={{
            flex: 1, padding: '10px 4px', borderRadius: '14px',
            background: vote === c.key ? c.bg : 'rgba(26,23,20,0.04)',
            border: `1.5px solid ${vote === c.key ? c.color : 'transparent'}`,
            cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
            transition: 'all 0.15s',
          }}>
            <span style={{ fontSize: '1.25rem' }}>{c.icon}</span>
            <span style={{ fontSize: '0.58rem', fontWeight: 600, color: vote === c.key ? c.color : 'var(--text-tertiary)', textAlign: 'center', lineHeight: 1.3 }}>
              {c.label}
            </span>
          </button>
        ))}
      </div>
      {vote && (
        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '10px 0 0', textAlign: 'center', lineHeight: 1.5 }}>
          {feedback[vote]}
        </p>
      )}
    </div>
  )
}

export default function TutorialOverlay() {
  const { step, phase, active, currentStep, advance, onNavigated, skip } = useTutorial()
  const location = useLocation()
  const [skipConfirm, setSkipConfirm] = useState(false)

  // Réagit aux changements de page ET aux changements de step (cas "déjà sur la bonne page")
  useEffect(() => {
    if (active) onNavigated(location.pathname)
  }, [location.pathname, step])

  useEffect(() => {
    if (!skipConfirm) return
    const t = setTimeout(() => setSkipConfirm(false), 3000)
    return () => clearTimeout(t)
  }, [skipConfirm])

  if (!active || !currentStep) return null

  const isModal = currentStep.type === 'modal'
  const navStepIndex = NAV_STEPS.indexOf(currentStep)

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
        <div style={{
          width: '100%', maxWidth: 360,
          background: 'var(--bg-base)',
          borderRadius: '28px',
          padding: '36px 28px 28px',
          boxShadow: '0 24px 80px rgba(0,0,0,0.3)',
          textAlign: 'center',
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

  // Position de la flèche et du glow (centre de l'onglet cible)
  // Nav: width = 100vw - 32px, padding 6px, 4 tabs égaux
  // Centre onglet i = 16px + 6px + (i + 0.5) * (100vw - 44px) / 4
  const tabCenterExpr = `calc(22px + (100vw - 44px) * ${(currentStep.tabIndex * 2 + 1) / 8})`

  // ── Navigate phase ─────────────────────────────────────────────
  if (phase === 'navigate') {
    return (
      <>
        <style>{`
          @keyframes tutoBounce {
            0%, 100% { transform: translateX(-50%) translateY(0px); }
            50%       { transform: translateX(-50%) translateY(8px); }
          }
          @keyframes tutoPulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(255,255,255,0.4), 0 0 20px rgba(255,255,255,0.2); }
            50%       { box-shadow: 0 0 0 6px rgba(255,255,255,0.0), 0 0 30px rgba(255,255,255,0.35); }
          }
        `}</style>

        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', flexDirection: 'column', pointerEvents: 'none' }}>

          {/* Zone bloquante */}
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

          {/* Zone transparente sur la nav — pointer-events: none → clics passent à la BottomBar */}
          <div style={{ height: 110, position: 'relative' }}>
            {/* Glow ring autour de l'onglet cible */}
            <div style={{
              position: 'absolute',
              bottom: 18,
              left: tabCenterExpr,
              transform: 'translateX(-50%)',
              width: 54, height: 54,
              borderRadius: '18px',
              border: '2px solid rgba(255,255,255,0.65)',
              animation: 'tutoPulse 1.4s ease-in-out infinite',
            }} />
            {/* Flèche animée */}
            <div style={{
              position: 'absolute', top: 4, left: tabCenterExpr,
              transform: 'translateX(-50%)',
              fontSize: '1.4rem', color: 'white',
              animation: 'tutoBounce 0.8s ease-in-out infinite',
              lineHeight: 1,
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

      <div style={{ pointerEvents: 'all', padding: '0 12px 118px' }}>
        <div style={{
          background: 'white', borderRadius: '26px', padding: '22px 22px 18px',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.16)',
        }}>
          <p style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-tertiary)', margin: '0 0 8px' }}>
            Étape {navStepIndex + 1} / {NAV_STEPS.length}
          </p>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            {currentStep.title}
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '0 0 14px', lineHeight: 1.6 }}>
            {currentStep.body}
          </p>

          {currentStep.id === 'explorer' && <ExplorerDemo />}

          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button onClick={() => advance(location.pathname)} className="btn-primary" style={{ flex: 1, padding: '13px' }}>
              {currentStep.action} →
            </button>
            {skipBtn(false)}
          </div>
        </div>
      </div>
    </div>
  )
}
