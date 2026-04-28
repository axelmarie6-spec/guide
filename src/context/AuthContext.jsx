import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    setProfile(data)
    setLoading(false)
  }

  const isProfileComplete = !!(
    profile &&
    profile.first_name &&
    profile.last_name &&
    profile.emergency_name &&
    profile.emergency_phone &&
    profile.passport_number &&
    profile.ceam_number
  )

  // Nom d'affichage : "Prénom Nom" ou pseudo en fallback
  const displayName = profile
    ? [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.pseudo || ''
    : ''

  const initials = profile
    ? `${(profile.first_name || profile.pseudo || '?')[0]}${(profile.last_name || '')[0] || ''}`.toUpperCase()
    : '?'

  async function signIn(email, password) {
    return supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{
      user, profile, loading, isProfileComplete,
      displayName, initials,
      fetchProfile, signIn, signOut,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
