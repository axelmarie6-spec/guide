-- ============================================================
-- PHASE 3 — Explorer : Activités & Votes
-- Colle dans Supabase > SQL Editor
-- ============================================================

-- ── Activités ─────────────────────────────────────────────────

CREATE TABLE public.activities (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  city        text NOT NULL,
  name        text NOT NULL,
  description text,
  category    text NOT NULL DEFAULT 'other'
              CHECK (category IN ('culture','nature','food','nightlife','shopping','sport','other')),
  price_eur   numeric(8,2),
  photo_url   text,
  added_by    uuid REFERENCES public.profiles(id),
  is_active   boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecture activités"
  ON public.activities FOR SELECT
  USING (auth.role() = 'authenticated' AND is_active = true);

CREATE POLICY "Tout le monde peut ajouter"
  ON public.activities FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admin désactive activités"
  ON public.activities FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ── Votes ──────────────────────────────────────────────────────

CREATE TABLE public.votes (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id uuid NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES public.profiles(id),
  vote        text NOT NULL CHECK (vote IN ('match','snooze','trash')),
  snooze_date date,   -- date où l'activité réapparaît (pour le swipeur)
  voted_at    timestamptz DEFAULT now(),
  UNIQUE (activity_id, user_id)
);

ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

-- Tout le monde voit tous les votes (pour les compteurs)
CREATE POLICY "Lecture votes"
  ON public.votes FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Insert vote"
  ON public.votes FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Update vote propre"
  ON public.votes FOR UPDATE
  USING (user_id = auth.uid());

-- ── Config journalière ─────────────────────────────────────────

CREATE TABLE public.day_config (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  city           text NOT NULL,
  date           date NOT NULL DEFAULT CURRENT_DATE,
  max_activities integer NOT NULL DEFAULT 3,
  votes_open     boolean DEFAULT true,
  created_by     uuid REFERENCES public.profiles(id),
  created_at     timestamptz DEFAULT now(),
  UNIQUE (city, date)
);

ALTER TABLE public.day_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecture day_config"
  ON public.day_config FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admin crée day_config"
  ON public.day_config FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admin modifie day_config"
  ON public.day_config FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ── Seed activités (test) ──────────────────────────────────────

INSERT INTO public.activities (city, name, description, category, price_eur) VALUES

-- BRUXELLES
('bruxelles','Atomium','L''iconic bâtiment en forme d''atome, vue panoramique sur Bruxelles','culture',16),
('bruxelles','Musées Royaux des Beaux-Arts','6000 œuvres de la Renaissance à l''art moderne dans un palais grandiose','culture',10),
('bruxelles','Dégustation de bières chez Moeder Lambic','Bar mythique avec +200 bières artisanales belges, meilleure sélection de la ville','food',15),
('bruxelles','Marché aux puces des Marolles','Marché animé toute la matinée dans le quartier le plus authentique de Bruxelles','shopping',0),
('bruxelles','Mini-Europe','Tous les monuments européens en miniature, kitsch et fascinant','culture',20),

-- AMSTERDAM
('amsterdam','Musée Van Gogh','La plus grande collection Van Gogh au monde — réserver à l''avance','culture',22),
('amsterdam','Rijksmuseum','Rembrandt, Vermeer, la crème des maîtres hollandais dans un musée grandiose','culture',22),
('amsterdam','Heineken Experience','Visite interactive et dégustation dans la brasserie historique','food',23),
('amsterdam','Flâner dans le Jordaan','Canaux, petites boutiques, terrasses — le quartier le plus pittoresque d''Amsterdam','nature',0),
('amsterdam','Anne Frank Huis','La maison cachée d''Anne Frank — réserver absolument à l''avance','culture',16),
('amsterdam','Bar hopping Leidseplein','La place la plus animée d''Amsterdam, concerts de rue et terrasses bondées','nightlife',0),

-- BERLIN
('berlin','East Side Gallery','1,3 km du mur de Berlin couvert de fresques monumentales','culture',0),
('berlin','Mémorial de l''Holocauste','2711 stèles de béton — un lieu sobre et puissant au cœur de Berlin','culture',0),
('berlin','Mauerpark le dimanche','Karaoké géant en plein air, marché de puces, musiciens de rue — Berlin à son meilleur','shopping',0),
('berlin','Currywurst chez Konnopke''s Imbiss','La currywurst originale depuis 1930, sous le métro aérien, incontournable','food',5),
('berlin','Tempelhof à vélo','L''ancien aéroport transformé en parc urbain géant — louer des vélos sur place','sport',5),
('berlin','Berghain (techno)','Le club le plus mythique du monde. Tenue noire, pas de téléphone, et peut-être refusé','nightlife',20),

-- PRAGUE
('prague','Château de Prague','Le plus grand complexe castral médiéval du monde avec vue sur toute la ville','culture',15),
('prague','Pont Charles au lever du soleil','Magique à l''aube avant les touristes — les 30 statues baroques dans la brume','culture',0),
('prague','Svíčková + pivo au U Fleků','Le plat national tchèque (joue de bœuf sauce crème) dans la plus vieille brasserie de Prague','food',12),
('prague','Vieux Cimetière Juif de Josefov','Un des cimetières les plus saisissants d''Europe, 12 couches de tombes superposées','culture',10),
('prague','Croisière sur la Vltava','Vue depuis l''eau sur les ponts, le château et les berges — 1h de balade','sport',15),
('prague','Bars alternatifs de Žižkov','Le quartier bohème de Prague, le plus de bars par habitant au monde','nightlife',0),

-- BUDAPEST
('budapest','Bains Széchenyi','Les bains thermaux emblématiques de Budapest — piscines en plein air, vapeur, massages','sport',25),
('budapest','Szimpla Kert (ruin bar)','Le premier ruin bar de Budapest dans une usine abandonnée, ambiance unique','nightlife',5),
('budapest','Grand Marché (Nagyvásárcsarnok)','Paprika, foie gras, Tokay, salami — le meilleur marché couvert de Budapest','food',0),
('budapest','Colline du Château (Várhegy)','Vue panoramique sur le Danube, Pest et les ponts — accessible à pied ou en funiculaire','nature',0),
('budapest','Soirée bateau sur le Danube','Croisière nocturne avec les ponts et bâtiments illuminés — magique','nightlife',15),

-- VIENNE
('vienne','Kunsthistorisches Museum','L''un des 10 plus grands musées du monde — Vermeer, Rubens, Dürer, Bruegel','culture',21),
('vienne','Schönbrunn & ses jardins','Le Versailles autrichien avec 1441 pièces et des jardins à la française','culture',18),
('vienne','Naschmarkt','Le plus grand marché en plein air de Vienne — épices, fromages, street food','food',0),
('vienne','Grande Roue du Prater','La roue de 1897, vue mythique sur Vienne depuis 65 mètres','other',13),
('vienne','Concerts en plein air (été)','L''été à Vienne c''est des concerts classiques gratuits dans les parcs — checker le programme','culture',0),
('vienne','Café Central','Le kaffeehaus le plus grandiose de Vienne, Freud y venait — strudel et Melange','food',10),

-- GENÈVE
('geneve','CERN (visite gratuite)','Le plus grand accélérateur de particules du monde — réserver la visite guidée gratuite à l''avance','culture',0),
('geneve','Jet d''eau et bord du lac','La fontaine de 140m emblématique de Genève, promenade le long du lac Léman','nature',0),
('geneve','Vieille Ville & Cathédrale St-Pierre','Vue imprenable sur le lac depuis les tours de la cathédrale, entrée libre','culture',0),
('geneve','Plage des Eaux-Vives','Baignade dans le lac Léman (eau douce et froide) — les Genevois y vont tous les jours','sport',0),
('geneve','Fondue au fromage','L''expérience gastronomique suisse incontournable — gruyère, vacherin, kirsch','food',30),
('geneve','Echecs géants du Parc des Bastions','Détente genevoise typique — les habitants jouent aux échecs sur des plateaux géants en plein air','nature',0);
