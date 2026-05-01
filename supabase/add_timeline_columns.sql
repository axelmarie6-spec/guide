-- Timeline : durée estimée et ordre de planification par journée
ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS duration_minutes integer NOT NULL DEFAULT 90,
  ADD COLUMN IF NOT EXISTS plan_order integer;
