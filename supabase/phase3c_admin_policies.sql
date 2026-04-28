-- ============================================================
-- Phase 3c — Policies admin + bucket activities
-- Colle dans Supabase > SQL Editor
-- ============================================================

-- ── Bucket activities (photos activités) ──────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('activities', 'activities', true)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "Auth uploade activities"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'activities');

CREATE POLICY "Admin supprime activities storage"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'activities' AND
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ── Suppression activités (admin) ─────────────────────────────
CREATE POLICY "Admin supprime activités"
ON public.activities FOR DELETE
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ── Suppression votes (admin) ─────────────────────────────────
CREATE POLICY "Admin supprime votes"
ON public.votes FOR DELETE
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ── Suppression profils (admin peut supprimer les autres) ─────
CREATE POLICY "Admin supprime profils"
ON public.profiles FOR DELETE
USING (
  id != auth.uid() AND
  EXISTS (SELECT 1 FROM public.profiles p2 WHERE p2.id = auth.uid() AND p2.role = 'admin')
);
