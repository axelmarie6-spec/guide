-- ============================================================
-- SCHEMA TRAVEL HUB — à coller dans Supabase > SQL Editor
-- ============================================================

-- Table invitations (générées par l'admin, une par ami)
CREATE TABLE public.invitations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  token text UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  label text,          -- ex: "Lien pour Jean"
  used_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- Table profiles (étend auth.users avec nos données métier)
CREATE TABLE public.profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  pseudo text UNIQUE NOT NULL,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  -- Champs obligatoires (bloquants si vides)
  emergency_name text,
  emergency_phone text,
  allergies text,       -- optionnel
  passport_number text,
  ceam_number text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Invitations : lecture publique (validation du token avant inscription)
CREATE POLICY "Lecture invitations" ON public.invitations
  FOR SELECT USING (true);

-- Invitations : création réservée à l'admin
CREATE POLICY "Admin crée invitations" ON public.invitations
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Invitations : mise à jour pour marquer "utilisé" (juste après inscription)
CREATE POLICY "Mise à jour invitation" ON public.invitations
  FOR UPDATE USING (true);

-- Profiles : tout membre connecté peut lire tous les profils
CREATE POLICY "Lecture profils" ON public.profiles
  FOR SELECT USING (auth.role() = 'authenticated');

-- Profiles : chaque user gère uniquement son propre profil
CREATE POLICY "Insertion propre profil" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Modification propre profil" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- ============================================================
-- TRIGGER : mise à jour automatique de updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- APRÈS CRÉATION : passe ton propre compte en admin
-- Remplace 'ton-pseudo' par le pseudo que tu choisiras
-- ============================================================
-- UPDATE public.profiles SET role = 'admin' WHERE pseudo = 'ton-pseudo';
