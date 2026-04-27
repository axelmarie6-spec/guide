import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

// ── Composants partagés ───────────────────────────────────────

function Field({ label, required, hint, children }) {
  return (
    <div>
      <label className="flex items-center gap-1 text-xs mb-1.5 font-medium"
        style={{ color: 'var(--text-secondary)' }}>
        {label}
        {required && <span style={{ color: 'var(--trash)' }}>*</span>}
        {hint && <span className="opacity-60 font-normal">({hint})</span>}
      </label>
      {children}
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="mb-5">
      <h2 className="text-xs font-semibold uppercase tracking-wider mb-2.5"
        style={{ color: 'var(--text-secondary)' }}>
        {title}
      </h2>
      <div className="card">
        {children}
      </div>
    </div>
  )
}

function Row({ label, value, blur }) {
  const [revealed, setRevealed] = useState(false)
  return (
    <div className="flex items-center justify-between px-4 py-3.5">
      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <span
        className={`text-sm font-medium transition-all ${blur && !revealed ? 'blur-sm' : ''}`}
        style={{ color: 'var(--text-primary)' }}
        onClick={() => blur && setRevealed(v => !v)}
      >
        {value || '—'}
      </span>
    </div>
  )
}

// ── Formulaire d'édition (onboarding + modification) ─────────

function ProfileForm({ profile, onSuccess, onCancel, isOnboarding }) {
  const [form, setForm] = useState({
    emergency_name: profile?.emergency_name || '',
    emergency_phone: profile?.emergency_phone || '',
    allergies: profile?.allergies || '',
    passport_number: profile?.passport_number || '',
    ceam_number: profile?.ceam_number || '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function set(field, value) { setForm(f => ({ ...f, [field]: value })) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.emergency_name || !form.emergency_phone || !form.passport_number || !form.ceam_number) {
      setError('Tous les champs marqués * sont obligatoires.')
      return
    }
    setLoading(true)
    const { error } = await supabase.from('profiles').update({
      emergency_name: form.emergency_name.trim(),
      emergency_phone: form.emergency_phone.trim(),
      allergies: form.allergies.trim() || null,
      passport_number: form.passport_number.trim(),
      ceam_number: form.ceam_number.trim(),
    }).eq('id', profile.id)

    if (error) setError('Erreur lors de la sauvegarde. Réessaie.')
    else onSuccess()
    setLoading(false)
  }

  return (
    <div className={isOnboarding ? 'min-h-screen flex flex-col px-6 py-10' : 'px-4 pb-20'}
      style={{ backgroundColor: 'var(--bg-base)' }}>

      {isOnboarding && (
        <>
          <h1 className="text-2xl font-semibold mb-1">Avant de partir…</h1>
          <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>
            Ces infos sont nécessaires en cas d'urgence. Visibles uniquement par le groupe.
          </p>
        </>
      )}

      {!isOnboarding && (
        <h1 className="text-2xl font-semibold mb-6">Modifier mon profil</h1>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Contact d'urgence — Nom" required>
          <input value={form.emergency_name} onChange={e => set('emergency_name', e.target.value)}
            placeholder="ex : Marie Dupont" />
        </Field>

        <Field label="Contact d'urgence — Téléphone" required>
          <input value={form.emergency_phone} onChange={e => set('emergency_phone', e.target.value)}
            placeholder="+33 6 12 34 56 78" type="tel" />
        </Field>

        <Field label="N° passeport ou carte d'identité" required>
          <input value={form.passport_number} onChange={e => set('passport_number', e.target.value)}
            placeholder="ex : 23AB12345" />
        </Field>

        <Field label="N° CEAM" required>
          <input value={form.ceam_number} onChange={e => set('ceam_number', e.target.value)}
            placeholder="ex : 80750112345678901" />
        </Field>

        <Field label="Allergies / restrictions alimentaires" hint="Optionnel">
          <input value={form.allergies} onChange={e => set('allergies', e.target.value)}
            placeholder="arachides, lactose…" />
        </Field>

        {error && <p className="text-sm" style={{ color: 'var(--trash)' }}>{error}</p>}

        <div className={`flex gap-3 mt-2 ${isOnboarding ? 'flex-col' : ''}`}>
          {!isOnboarding && (
            <button type="button" onClick={onCancel} className="btn-secondary flex-1">
              Annuler
            </button>
          )}
          <button type="submit" disabled={loading}
            className={`btn-primary ${isOnboarding ? '' : 'flex-1'}`}>
            {loading ? 'Sauvegarde…' : isOnboarding ? "Valider et accéder à l'app" : 'Sauvegarder'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ── Vue profil complet ────────────────────────────────────────

function ProfileView({ profile, isAdmin, onEdit, onSignOut }) {
  const [inviteLabel, setInviteLabel] = useState('')
  const [generatedLink, setGeneratedLink] = useState('')
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)

  async function generateInvite() {
    setGenerating(true)
    setGeneratedLink('')
    const { data, error } = await supabase
      .from('invitations').insert({ label: inviteLabel.trim() || null }).select().single()
    if (!error && data) setGeneratedLink(`${window.location.origin}/invite/${data.token}`)
    setGenerating(false)
  }

  async function copyLink() {
    await navigator.clipboard.writeText(generatedLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="p-4 pb-20">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Profil</h1>
        <button onClick={onEdit}
          className="text-sm font-medium px-4 py-1.5 rounded-full"
          style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>
          Modifier
        </button>
      </div>

      <Section title="Identité">
        <Row label="Pseudo" value={profile.pseudo} />
        <Row label="Rôle" value={profile.role === 'admin' ? '👑 Admin' : 'Membre'} />
      </Section>

      <Section title="Urgences">
        <Row label="Contact" value={profile.emergency_name} />
        <Row label="Téléphone" value={profile.emergency_phone} />
        <Row label="Allergies" value={profile.allergies || 'Aucune'} />
      </Section>

      <Section title="Documents">
        <Row label="Passeport / CNI" value={profile.passport_number} blur />
        <Row label="CEAM" value={profile.ceam_number} blur />
      </Section>

      {isAdmin && (
        <Section title="Liens d'invitation">
          <div className="p-4 flex flex-col gap-3">
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Un lien par ami. Chaque lien ne fonctionne qu'une seule fois.
            </p>
            <input value={inviteLabel} onChange={e => setInviteLabel(e.target.value)}
              placeholder="ex : Lien pour Jean" />
            <button onClick={generateInvite} disabled={generating} className="btn-primary">
              {generating ? 'Génération…' : 'Générer un lien'}
            </button>

            {generatedLink && (
              <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-base)', border: '1.5px solid var(--border)' }}>
                <p className="text-xs break-all mb-2" style={{ color: 'var(--text-primary)' }}>
                  {generatedLink}
                </p>
                <button onClick={copyLink} className="text-xs font-medium"
                  style={{ color: copied ? 'var(--match)' : 'var(--accent)' }}>
                  {copied ? '✓ Copié !' : 'Copier le lien'}
                </button>
              </div>
            )}
          </div>
        </Section>
      )}

      <button onClick={onSignOut} className="btn-secondary mt-2"
        style={{ color: 'var(--trash)', borderColor: 'var(--border)' }}>
        Se déconnecter
      </button>
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────

export default function Profil() {
  const { profile, isProfileComplete, fetchProfile, signOut } = useAuth()
  const [editing, setEditing] = useState(false)

  if (!isProfileComplete) {
    return (
      <ProfileForm
        profile={profile}
        isOnboarding
        onSuccess={() => fetchProfile(profile.id)}
      />
    )
  }

  if (editing) {
    return (
      <ProfileForm
        profile={profile}
        onSuccess={() => { fetchProfile(profile.id); setEditing(false) }}
        onCancel={() => setEditing(false)}
      />
    )
  }

  return (
    <ProfileView
      profile={profile}
      isAdmin={profile.role === 'admin'}
      onEdit={() => setEditing(true)}
      onSignOut={signOut}
    />
  )
}
