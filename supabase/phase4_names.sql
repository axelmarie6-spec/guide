-- ============================================================
-- Phase 4 — Prénom / Nom (remplace pseudo dans l'UI)
-- Colle dans Supabase > SQL Editor
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name  text;

-- Mets à jour ton compte (remplace 'ton_pseudo' par le tien)
-- UPDATE public.profiles
--   SET first_name = 'Axel', last_name = 'Marie'
--   WHERE pseudo = 'ton_pseudo';
