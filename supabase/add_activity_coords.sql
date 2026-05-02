-- Add optional GPS coordinates to activities
-- Set by Oracle AI only when it's 100% certain of the exact location.
ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS latitude  DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
