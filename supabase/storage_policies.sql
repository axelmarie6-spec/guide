-- ============================================================
-- Politiques Storage — bucket "tickets"
-- Colle dans Supabase > SQL Editor
-- ============================================================

-- Lecture : tous les membres authentifiés
CREATE POLICY "Auth lit tickets"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'tickets');

-- Upload : admin uniquement
CREATE POLICY "Admin uploade tickets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'tickets' AND
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Suppression : admin uniquement
CREATE POLICY "Admin supprime tickets"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'tickets' AND
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
