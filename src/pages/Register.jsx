import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function EyeIcon({ open }) {
  return open ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  )
}

function PasswordInput({ value, onChange, placeholder, autoComplete }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input type={show ? 'text' : 'password'} value={value} onChange={onChange}
        placeholder={placeholder} autoComplete={autoComplete} required
        style={{ paddingRight: '44px' }} />
      <button type="button" onClick={() => setShow(v => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2"
        style={{ color: 'var(--text-secondary)' }}>
        <EyeIcon open={show} />
      </button>
    </div>
  )
}

export default function Register() {
  const { token } = useParams()
  const navigate = useNavigate()

  const [invitation, setInvitation] = useState(null)
  const [tokenError, setTokenError] = useState('')
  const [tokenLoading, setTokenLoading] = useState(true)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function validateToken() {
      const { data, error } = await supabase
        .from('invitations').select('*').eq('token', token).single()
      if (error || !data) setTokenError('Lien invalide ou inexistant.')
      else if (data.used_at) setTokenError('Ce lien a déjà été utilisé.')
      else setInvitation(data)
      setTokenLoading(false)
    }
    validateToken()
  }, [token])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!firstName.trim() || !lastName.trim()) { setError('Prénom et nom sont requis.'); return }
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas.'); return }
    if (password.length < 6) { setError('Le mot de passe doit faire au moins 6 caractères.'); return }

    setLoading(true)

    // Génère un pseudo unique interne
    const slug = `${firstName.trim().toLowerCase()}.${lastName.trim().toLowerCase()}.${Math.random().toString(36).slice(2, 6)}`

    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(), password
    })
    if (signUpError) {
      setError(`Erreur : ${signUpError.message}`)
      setLoading(false)
      return
    }

    const { error: profileError } = await supabase
      .from('profiles').insert({
        id: authData.user.id,
        pseudo: slug,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      })
    if (profileError) {
      setError("Erreur lors de la création du profil. Contacte l'admin.")
      setLoading(false)
      return
    }

    await supabase.from('invitations')
      .update({ used_at: new Date().toISOString() }).eq('token', token)

    navigate('/profil', { replace: true })
  }

  if (tokenLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: 'var(--sky)', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  if (tokenError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <p className="text-5xl mb-4">🔒</p>
        <h2 className="text-xl font-semibold mb-2">Lien invalide</h2>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{tokenError}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold mb-1">Rejoindre le groupe</h1>
        <p className="mb-8 text-sm" style={{ color: 'var(--text-secondary)' }}>
          {invitation?.label ? `Invitation : ${invitation.label}` : "Crée ton compte."}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label className="block text-xs mb-1.5 font-medium" style={{ color: 'var(--text-secondary)' }}>
                Prénom
              </label>
              <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)}
                placeholder="Axel" autoComplete="given-name" required />
            </div>
            <div style={{ flex: 1 }}>
              <label className="block text-xs mb-1.5 font-medium" style={{ color: 'var(--text-secondary)' }}>
                Nom
              </label>
              <input type="text" value={lastName} onChange={e => setLastName(e.target.value)}
                placeholder="Marie" autoComplete="family-name" required />
            </div>
          </div>

          <div>
            <label className="block text-xs mb-1.5 font-medium" style={{ color: 'var(--text-secondary)' }}>
              Email
            </label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="ton@email.com" autoComplete="email" required />
          </div>

          <div>
            <label className="block text-xs mb-1.5 font-medium" style={{ color: 'var(--text-secondary)' }}>
              Mot de passe
            </label>
            <PasswordInput value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" autoComplete="new-password" />
          </div>

          <div>
            <label className="block text-xs mb-1.5 font-medium" style={{ color: 'var(--text-secondary)' }}>
              Confirme le mot de passe
            </label>
            <PasswordInput value={confirm} onChange={e => setConfirm(e.target.value)}
              placeholder="••••••••" autoComplete="new-password" />
          </div>

          {error && <p className="text-sm" style={{ color: 'var(--trash)' }}>{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary mt-2">
            {loading ? 'Création du compte…' : 'Créer mon compte'}
          </button>
        </form>
      </div>
    </div>
  )
}
