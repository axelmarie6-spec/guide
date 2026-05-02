-- ─────────────────────────────────────────────────────────────────────────────
-- Fix RLS suppression activités
--
-- Problème : la policy "Admin supprime activités" de phase3c_admin_policies.sql
-- utilisait un subquery direct sur profiles (table RLS-protégée), ce qui cause
-- une récursion infinie → Supabase retourne 0 lignes sans erreur.
--
-- Solution : utiliser is_admin() (SECURITY DEFINER) créée dans fix_ban_rls.sql,
-- qui bypass la RLS de profiles pour vérifier le rôle.
--
-- À coller dans Supabase > SQL Editor et exécuter.
-- ─────────────────────────────────────────────────────────────────────────────

-- S'assurer que is_admin() existe (idem fix_ban_rls.sql, idempotent)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin');
$$;

-- Remplacer la policy cassée
DROP POLICY IF EXISTS "Admin supprime activités" ON public.activities;

CREATE POLICY "Admin supprime activités"
ON public.activities FOR DELETE
TO authenticated
USING (public.is_admin());
