-- ============================================================
-- TRAINS — à coller dans Supabase > SQL Editor
-- ============================================================

CREATE TABLE public.trains (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  leg_order     integer NOT NULL,
  date          date NOT NULL,
  from_station  text NOT NULL,
  to_station    text NOT NULL,
  train_number  text,
  departure_time time,
  arrival_time  time,
  platform_dep  text,   -- quai de départ (rempli sur place)
  platform_arr  text,   -- quai d'arrivée (rempli sur place)
  city_from     text,   -- ville de départ (pour groupage UI)
  city_to       text,   -- ville d'arrivée
  is_connection boolean DEFAULT false,  -- correspondance dans un trajet plus long
  notes         text
);

ALTER TABLE public.trains ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut lire
CREATE POLICY "Lecture trains" ON public.trains
  FOR SELECT USING (auth.role() = 'authenticated');

-- Seul l'admin peut modifier (pour les quais)
CREATE POLICY "Admin modifie trains" ON public.trains
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ── Données ──────────────────────────────────────────────────

INSERT INTO public.trains
  (leg_order, date, from_station, to_station, train_number, departure_time, arrival_time, city_from, city_to, is_connection, notes)
VALUES
  -- Tronçon 1 : Lison → Bruxelles (jour de départ, 2 trains)
  (1,  '2026-08-01', 'Lison',               'Paris Saint-Lazare', 'TNO 3304',   '07:31', '10:20', 'lison',     'bruxelles', false, 'Train de départ depuis chez nous'),
  (2,  '2026-08-01', 'Paris Nord',           'Bruxelles-Midi',     'EUR 9341',   '12:55', '14:17', 'lison',     'bruxelles', true,  'Attention : changer de gare à Paris (Saint-Lazare → Nord, prévoir le métro)'),

  -- Tronçon 2 : Bruxelles → Amsterdam
  (3,  '2026-08-04', 'Bruxelles-Midi',       'Amsterdam Zuid',     'ECD 9527',   '07:49', '09:54', 'bruxelles', 'amsterdam', false, 'Direction Lelystad Centrum'),

  -- Tronçon 3 : Amsterdam → Berlin (correspondance Hilversum 16 min ⚠️)
  (4,  '2026-08-08', 'Amsterdam Zuid',       'Hilversum',          'IC 1833',    '09:46', '10:06', 'amsterdam', 'berlin',    false, 'Direction Amersfoort Schothorst'),
  (5,  '2026-08-08', 'Hilversum',            'Berlin Hbf',         null,         '10:22', '15:45', 'amsterdam', 'berlin',    true,  '⚠️ Correspondance 16 min — la plus serrée du voyage'),

  -- Tronçon 4 : Berlin → Prague
  (6,  '2026-08-11', 'Berlin Südkreuz',      'Praha-Holešovice',   'RJ 173',     '09:37', '13:15', 'berlin',    'prague',    false, null),

  -- Tronçon 5 : Prague → Budapest
  (7,  '2026-08-14', 'Praha Hlavní nádraží', 'Budapest-Nyugati',   'RJ 275',     '07:37', '14:28', 'prague',    'budapest',  false, null),

  -- Tronçon 6 : Budapest → Vienne
  (8,  '2026-08-18', 'Budapest-Kelenfold',   'Wien Hbf',           'RJX 64',     '11:55', '14:20', 'budapest',  'vienne',    false, null),

  -- Tronçon 7 : Vienne → Genève (via Zurich, même jour, correspondance pure)
  (9,  '2026-08-21', 'Wien Hbf',             'Zürich HB',          'RJX 13470',  '10:28', '19:28', 'vienne',    'geneve',    false, null),
  (10, '2026-08-21', 'Zürich HB',            'Genève',             'IC 734',     null,    null,    'vienne',    'geneve',    true,  'Direction Genève-Aéroport — heure à confirmer');

-- ============================================================
-- AIRBNBS — à remplir avec les vraies adresses
-- ============================================================

CREATE TABLE public.airbnbs (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  city          text NOT NULL UNIQUE,
  address       text,
  entry_code    text,
  instructions  text,  -- markdown autorisé
  checkin_time  text,
  checkout_time text
);

ALTER TABLE public.airbnbs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecture airbnbs" ON public.airbnbs
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admin modifie airbnbs" ON public.airbnbs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Données vides à remplir (tu ajouteras les vraies infos dans Supabase ou depuis l'app admin)
INSERT INTO public.airbnbs (city, checkin_time, checkout_time) VALUES
  ('bruxelles', '15h00', '11h00'),
  ('amsterdam', '15h00', '11h00'),
  ('berlin',    '15h00', '11h00'),
  ('prague',    '15h00', '11h00'),
  ('budapest',  '15h00', '11h00'),
  ('vienne',    '15h00', '11h00'),
  ('geneve',    '15h00', '11h00');
