-- Supprime la contrainte CHECK sur activities.category
-- → permet les catégories personnalisées
ALTER TABLE public.activities DROP CONSTRAINT IF EXISTS activities_category_check;
