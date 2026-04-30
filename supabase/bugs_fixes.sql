-- ─────────────────────────────────────────────────────────────────────────────
-- Corrections de bugs + nouvelles fonctionnalités
-- À coller dans le SQL Editor de Supabase
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Colonnes wifi manquantes sur airbnbs (cause du bug check-in/check-out)
--    Le UPDATE échouait silencieusement car ces colonnes n'existaient pas.
ALTER TABLE airbnbs ADD COLUMN IF NOT EXISTS wifi_name     text;
ALTER TABLE airbnbs ADD COLUMN IF NOT EXISTS wifi_password text;


-- 2. Statut "banni" sur les profils (remplace la suppression de compte)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS banned boolean NOT NULL DEFAULT false;


-- 3. RLS airbnbs : autoriser tous les membres authentifiés à modifier
--    (pas seulement les admins — nécessaire pour l'édition par tous)
DROP POLICY IF EXISTS "Admins can update airbnbs"           ON airbnbs;
DROP POLICY IF EXISTS "Enable update for admins"            ON airbnbs;
DROP POLICY IF EXISTS "Admin update airbnbs"                ON airbnbs;
DROP POLICY IF EXISTS "Only admins can update airbnbs"      ON airbnbs;
DROP POLICY IF EXISTS "Authenticated users can update airbnbs" ON airbnbs;

CREATE POLICY "Members can update airbnbs"
  ON airbnbs FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
