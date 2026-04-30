-- Ajouter la colonne onboarding_done sur profiles
-- À coller dans le SQL Editor de Supabase

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS onboarding_done boolean NOT NULL DEFAULT false;
