import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

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

export default function Login() {
  const { signIn } = useAuth()
  const [pseudo, setPseudo] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signIn(pseudo.trim(), password)
    if (error) setError('Pseudo ou mot de passe incorrect.')
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ backgroundColor: 'var(--bg-base)' }}>
      <div className="w-full max-w-sm">

        <h1 className="text-3xl font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
          Travel Hub
        </h1>
        <p className="mb-10 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Bruxelles → Amsterdam → Berlin → Prague → Budapest → Vienne → Genève
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs mb-1.5 font-medium" style={{ color: 'var(--text-secondary)' }}>
              Pseudo
            </label>
            <input type="text" value={pseudo} onChange={e => setPseudo(e.target.value)}
              placeholder="ton pseudo" autoComplete="username" required />
          </div>

          <div>
            <label className="block text-xs mb-1.5 font-medium" style={{ color: 'var(--text-secondary)' }}>
              Mot de passe
            </label>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" autoComplete="current-password" required
                style={{ paddingRight: '44px' }} />
              <button type="button" onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--text-secondary)' }}>
                <EyeIcon open={showPassword} />
              </button>
            </div>
          </div>

          {error && <p className="text-sm" style={{ color: 'var(--trash)' }}>{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary mt-2">
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        <p className="mt-8 text-xs text-center" style={{ color: 'var(--text-secondary)' }}>
          Pas encore de compte ? Utilise le lien d'invitation reçu.
        </p>
      </div>
    </div>
  )
}
