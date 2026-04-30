-- ─────────────────────────────────────────────────────────────────────────────
-- Fix RLS profiles : autoriser les admins à modifier le profil d'autres users
-- À coller dans le SQL Editor de Supabase
-- ─────────────────────────────────────────────────────────────────────────────

-- Fonction helper qui vérifie si l'utilisateur courant est admin.
-- SECURITY DEFINER évite la récursion infinie (la fonction bypass la RLS
-- quand elle interroge la table profiles).
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Supprimer toutes les politiques UPDATE existantes sur profiles
-- (noms courants selon les templates Supabase)
DROP POLICY IF EXISTS "Users can update own profile"        ON profiles;
DROP POLICY IF EXISTS "Enable update for users based on id" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile"  ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile"       ON profiles;
DROP POLICY IF EXISTS "Users or admins can update profiles" ON profiles;

-- Nouvelle politique : chaque user peut modifier son propre profil,
-- les admins peuvent modifier n'importe quel profil (pour bannir, changer le rôle, etc.)
CREATE POLICY "Users or admins can update profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING    (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());
