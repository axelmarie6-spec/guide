import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useTutorial, STEPS } from '../context/TutorialContext'

const NAV_STEPS = STEPS.filter(s => s.type === 'navigate')

export default function TutorialOverlay() {
  const { step, phase, active, currentStep, advance, onNavigated, skip } = useTutorial()
  const location = useLocation()
  const [skipConfirm, setSkipConfirm] = useState(false)

  useEffect(() => {
    if (active) onNavigated(location.pathname)
  }, [location.pathname])

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
      color: light ? 'rgba(255,255,255,0.3)' : 'var(--text-tertiary)',
      padding: '6px 10px', letterSpacing: '0.01em',
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
        background: 'rgba(8,8,8,0.78)',
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
          <p style={{ fontSize: '3rem', margin: '0 0 18px', lineHeight: 1 }}>
            {currentStep.emoji}
          </p>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0 0 12px', letterSpacing: '-0.02em' }}>
            {currentStep.title}
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: '0 0 28px', lineHeight: 1.65 }}>
            {currentStep.body}
          </p>
          <button onClick={advance} className="btn-primary" style={{ width: '100%' }}>
            {currentStep.action}
          </button>
          {!isDone && (
            <div style={{ marginTop: 10 }}>{skipBtn(false)}</div>
          )}
        </div>
      </div>
    )
  }

  // ── Navigate phase: pointer l'onglet ─────────────────────────
  if (phase === 'navigate') {
    // Position de la flèche (% de la largeur de l'écran)
    // La nav fait calc(100vw - 32px) centrée, 4 onglets égaux
    const arrowLeft = `calc(${12.5 + currentStep.tabIndex * 25}vw)`

    return (
      <>
        <style>{`
          @keyframes tutoBounce {
            0%, 100% { transform: translateX(-50%) translateY(0px); }
            50%       { transform: translateX(-50%) translateY(7px); }
          }
        `}</style>
        {/* Overlay principal — pointer-events: none sur le container pour laisser passer vers la nav */}
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', flexDirection: 'column', pointerEvents: 'none' }}>

          {/* Zone bloquante (toute la page sauf la barre du bas) */}
          <div style={{
            flex: 1,
            background: 'rgba(8,8,8,0.72)',
            pointerEvents: 'all',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 20, padding: '0 28px',
          }}>
            <p style={{
              fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: 'rgba(255,255,255,0.38)', margin: 0,
            }}>
              Étape {navStepIndex + 1} / {NAV_STEPS.length}
            </p>

            <div style={{
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.13)',
              borderRadius: '24px',
              padding: '26px 24px',
              textAlign: 'center', maxWidth: 300, width: '100%',
            }}>
              <p style={{ fontSize: '1rem', fontWeight: 600, color: 'rgba(255,255,255,0.75)', margin: '0 0 6px' }}>
                Tape sur l'onglet
              </p>
              <p style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent)', margin: 0, letterSpacing: '-0.01em' }}>
                « {currentStep.tabLabel} »
              </p>
              <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.38)', margin: '10px 0 0' }}>
                dans la barre de navigation ci-dessous
              </p>
            </div>

            {skipBtn(true)}
          </div>

          {/* Zone transparente sur la nav (110px) — pointer-events: none → clics passent à la BottomBar */}
          <div style={{ height: 110, position: 'relative' }}>
            <div style={{
              position: 'absolute', top: 4, left: arrowLeft,
              fontSize: '1.5rem', color: 'rgba(255,255,255,0.85)',
              animation: 'tutoBounce 0.75s ease-in-out infinite',
              lineHeight: 1,
            }}>
              ↓
            </div>
          </div>
        </div>
      </>
    )
  }

  // ── Explain phase: card d'explication ────────────────────────
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', flexDirection: 'column', pointerEvents: 'none' }}>
      {/* Fond semi-transparent (ne bloque pas les clics) */}
      <div style={{ flex: 1, background: 'rgba(8,8,8,0.28)' }} />

      {/* Card explicative */}
      <div style={{ pointerEvents: 'all', padding: '0 12px 118px' }}>
        <div style={{
          background: 'white',
          borderRadius: '26px',
          padding: '22px 22px 18px',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.16), 0 2px 0 rgba(255,255,255,0.9) inset',
        }}>
          <p style={{
            fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em',
            textTransform: 'uppercase', color: 'var(--text-tertiary)', margin: '0 0 8px',
          }}>
            Étape {navStepIndex + 1} / {NAV_STEPS.length}
          </p>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            {currentStep.title}
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '0 0 18px', lineHeight: 1.6 }}>
            {currentStep.body}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button onClick={advance} className="btn-primary" style={{ flex: 1, padding: '13px' }}>
              {currentStep.action} →
            </button>
            {skipBtn(false)}
          </div>
        </div>
      </div>
    </div>
  )
}
