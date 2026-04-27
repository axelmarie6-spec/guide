-- ============================================================
-- PHASE 2 — Mises à jour à coller dans Supabase > SQL Editor
-- ============================================================

-- 1. Corriger les horaires Zürich → Genève
UPDATE public.trains
SET departure_time = '20:32',
    arrival_time   = '23:25',
    notes          = 'Direction Genève-Aéroport'
WHERE leg_order = 10;


-- 2. Table des billets PDF (liés à un tronçon)
CREATE TABLE IF NOT EXISTS public.ticket_pdfs (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  leg_order    integer NOT NULL,
  label        text NOT NULL,
  storage_path text NOT NULL,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE public.ticket_pdfs ENABLE ROW LEVEL SECURITY;

-- Tous les membres peuvent lire
CREATE POLICY "Lecture ticket_pdfs"
  ON public.ticket_pdfs FOR SELECT
  USING (auth.role() = 'authenticated');

-- Seul l'admin peut ajouter
CREATE POLICY "Admin insère ticket_pdfs"
  ON public.ticket_pdfs FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Seul l'admin peut supprimer
CREATE POLICY "Admin supprime ticket_pdfs"
  ON public.ticket_pdfs FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
