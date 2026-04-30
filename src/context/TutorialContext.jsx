import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const TutorialContext = createContext(null)
const LS_KEY = 'tuto_step'

export const STEPS = [
  {
    id: 'welcome',
    type: 'modal',
    emoji: '✈️',
    title: 'Bienvenue sur Travel Hub !',
    body: "Ton passeport numérique pour 23 jours et 7 villes en Europe. On te fait faire le tour de l'app en quelques secondes.",
    action: 'Commencer la visite',
  },
  {
    id: 'aujourdhui',
    type: 'navigate',
    path: '/',
    tabIndex: 0,
    tabLabel: "Aujourd'hui",
    title: "Aujourd'hui",
    body: "Chaque matin tu retrouves ici la ville du jour, les activités proposées, les votes en cours et où vous en êtes dans le voyage.",
    action: 'Suivant',
  },
  {
    id: 'explorer',
    type: 'navigate',
    path: '/explorer',
    tabIndex: 1,
    tabLabel: 'Explorer',
    title: 'Explorer & Voter',
    body: "Découvrez les activités de chaque ville et votez. Quand tout le groupe vote oui, l'activité est validée pour la journée !",
    action: 'Suivant',
  },
  {
    id: 'voyage',
    type: 'navigate',
    path: '/voyage',
    tabIndex: 2,
    tabLabel: 'Voyage',
    title: 'Trains & Hébergements',
    body: "Retrouve tous tes trains avec horaires, voies et billets PDF. Et les infos de chaque Airbnb : adresse, code d'entrée, Wi-Fi, check-in et check-out.",
    action: 'Suivant',
  },
  {
    id: 'coffre',
    type: 'navigate',
    path: '/coffre-fort',
    tabIndex: 3,
    tabLabel: 'Coffre',
    title: 'Coffre-Fort',
    body: "Tes documents importants au même endroit : passeport, CEAM, billets PDF. Et les contacts d'urgence de tout le groupe.",
    action: 'Suivant',
  },
  {
    id: 'done',
    type: 'modal',
    emoji: '🎉',
    title: "C'est tout !",
    body: "Tu connais l'essentiel. Tu peux retrouver ce tutoriel à tout moment depuis ton profil. Bon voyage !",
    action: "C'est parti !",
  },
]

const NAV_STEPS = STEPS.filter(s => s.type === 'navigate')

export function TutorialProvider({ children }) {
  const { user, profile } = useAuth()
  const [step, setStep] = useState(null)   // null = en attente, -1 = terminé, 0+ = actif
  const [phase, setPhase] = useState('explain') // 'navigate' | 'explain'
  const initialized = useRef(false)

  useEffect(() => {
    if (!profile || initialized.current) return
    initialized.current = true

    if (profile.onboarding_done) { setStep(-1); return }

    const saved = localStorage.getItem(LS_KEY)
    const n = saved !== null ? parseInt(saved, 10) : 0
    const validStep = (n >= 0 && n < STEPS.length) ? n : 0
    setStep(validStep)
    setPhase(STEPS[validStep].type === 'navigate' ? 'navigate' : 'explain')
  }, [profile])

  async function markDone() {
    localStorage.removeItem(LS_KEY)
    setStep(-1)
    if (user) await supabase.from('profiles').update({ onboarding_done: true }).eq('id', user.id)
  }

  function advance(currentPath) {
    const next = step + 1
    if (next >= STEPS.length) { markDone(); return }
    localStorage.setItem(LS_KEY, String(next))
    setStep(next)
    const nextStep = STEPS[next]
    const alreadyThere = nextStep.type === 'navigate' && currentPath && nextStep.path === currentPath
    setPhase(alreadyThere ? 'explain' : (nextStep.type === 'navigate' ? 'navigate' : 'explain'))
  }

  function onNavigated(path) {
    if (step === null || step < 0) return
    const current = STEPS[step]
    if (current.type === 'navigate' && phase === 'navigate' && current.path === path) {
      setPhase('explain')
    }
  }

  async function skip() {
    await markDone()
  }

  async function reset() {
    localStorage.removeItem(LS_KEY)
    initialized.current = false
    if (user) await supabase.from('profiles').update({ onboarding_done: false }).eq('id', user.id)
    setStep(0)
    setPhase('explain')
  }

  return (
    <TutorialContext.Provider value={{
      step,
      phase,
      active: step !== null && step >= 0,
      currentStep: (step !== null && step >= 0) ? STEPS[step] : null,
      navStepCount: NAV_STEPS.length,
      advance,
      onNavigated,
      skip,
      reset,
    }}>
      {children}
    </TutorialContext.Provider>
  )
}

export const useTutorial = () => useContext(TutorialContext)
