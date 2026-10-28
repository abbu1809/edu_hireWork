-- ==============================================================================
-- Migration: Add extended institute profile columns
-- Fixes:
-- 1. Could not find the 'designation' column of 'institutes' in the schema cache
-- 2. ERROR 42P16: cannot change name of view column 'city' to 'tagline'
-- ==============================================================================

-- 1. Add missing extended profile columns to base table public.institutes
ALTER TABLE public.institutes
  ADD COLUMN IF NOT EXISTS designation TEXT,
  ADD COLUMN IF NOT EXISTS tagline TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS faculty_count TEXT,
  ADD COLUMN IF NOT EXISTS established_year TEXT,
  ADD COLUMN IF NOT EXISTS facilities TEXT[] NOT NULL DEFAULT '{}';

-- 2. Safely recreate public_institutes view without CASCADE
-- (Using DROP VIEW IF EXISTS avoids Postgres error 42P16 when view column positions change)
DROP VIEW IF EXISTS public.public_institutes;

CREATE VIEW public.public_institutes AS
SELECT
  id,
  institute_name,
  city,
  state,
  location,
  tagline,
  website,
  institute_type,
  boards,
  facilities,
  student_count,
  faculty_count,
  established_year,
  verified,
  description,
  created_at
FROM public.institutes;

-- 3. Restore view permissions
GRANT SELECT ON public.public_institutes TO authenticated, anon;

-- 4. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
