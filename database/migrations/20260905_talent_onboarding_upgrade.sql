-- ==============================================================================
-- EduHire Bridge - Talent / Faculty Onboarding Upgrade Migration
-- Version: 2026-09-05
-- Description: Adds comprehensive professional educator fields, structured JSONB
--              education/experience records, document types, recruiter discovery view,
--              and notifies PostgREST to reload the schema cache.
-- ==============================================================================

-- 1. Extend public.profiles with profile photo, state, and city if not present
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;

-- 2. Extend public.teachers with all additive talent onboarding columns
ALTER TABLE public.teachers
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS current_location TEXT,
  ADD COLUMN IF NOT EXISTS willing_to_relocate TEXT DEFAULT 'Yes',
  ADD COLUMN IF NOT EXISTS languages TEXT[] DEFAULT '{"English", "Hindi"}',
  ADD COLUMN IF NOT EXISTS gender TEXT,
  ADD COLUMN IF NOT EXISTS dob DATE,
  ADD COLUMN IF NOT EXISTS primary_role TEXT DEFAULT 'Faculty / Teacher',
  ADD COLUMN IF NOT EXISTS secondary_roles TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS headline TEXT,
  ADD COLUMN IF NOT EXISTS primary_subject TEXT,
  ADD COLUMN IF NOT EXISTS secondary_subjects TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS specialization TEXT,
  ADD COLUMN IF NOT EXISTS specializations TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS exam_categories TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS experience_range TEXT,
  ADD COLUMN IF NOT EXISTS exam_prep_experience_years NUMERIC(4, 1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_organization TEXT,
  ADD COLUMN IF NOT EXISTS current_designation TEXT,
  ADD COLUMN IF NOT EXISTS previous_organizations TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS work_history JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS education_records JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS work_modes TEXT[] DEFAULT '{"Offline"}',
  ADD COLUMN IF NOT EXISTS preferred_cities TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS availability TEXT DEFAULT 'Immediately',
  ADD COLUMN IF NOT EXISTS employment_types TEXT[] DEFAULT '{"Full Time"}',
  ADD COLUMN IF NOT EXISTS target_levels TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS salary_currency TEXT DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS salary_period TEXT DEFAULT 'Annual CTC',
  ADD COLUMN IF NOT EXISTS min_expected_salary NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS preferred_salary NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS expected_salary_min NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS expected_salary_preferred NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS is_salary_negotiable BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS resume_url TEXT,
  ADD COLUMN IF NOT EXISTS resume_name TEXT,
  ADD COLUMN IF NOT EXISTS profile_visibility TEXT DEFAULT 'PUBLIC_VERIFIED_EMPLOYERS',
  ADD COLUMN IF NOT EXISTS job_alerts_enabled BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS application_updates_enabled BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS employer_interest_enabled BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS interview_notifications_enabled BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS "references" JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS profile_completion_percent INTEGER DEFAULT 35,
  ADD COLUMN IF NOT EXISTS profile_completion_percentage NUMERIC(5, 2) DEFAULT 0;

-- 3. Backfill city from preferred_location if city is null
UPDATE public.teachers
SET city = preferred_location
WHERE city IS NULL AND preferred_location IS NOT NULL;

-- 4. Extend documents table document_type check constraint
ALTER TABLE public.documents DROP CONSTRAINT IF EXISTS documents_document_type_check;
ALTER TABLE public.documents ADD CONSTRAINT documents_document_type_check
  CHECK (document_type IN ('RESUME', 'CERTIFICATE', 'KYC', 'PHOTO', 'EXPERIENCE_LETTER', 'PORTFOLIO'));

-- 5. Create fresh public_teachers view for safe, enriched recruiter discovery
-- Drop without CASCADE to protect any unrelated dependent objects
DROP VIEW IF EXISTS public.public_teachers;

CREATE VIEW public.public_teachers AS
SELECT
  id,
  name,
  profile_photo_url,
  primary_role,
  secondary_roles,
  headline,
  primary_subject,
  secondary_subjects,
  subjects,
  specialization,
  specializations,
  exam_categories,
  experience_years,
  experience_range,
  exam_prep_experience_years,
  qualification,
  education_records,
  current_organization,
  current_designation,
  previous_organizations,
  work_history,
  teaching_mode,
  work_modes,
  classes_taught,
  target_levels,
  city,
  state,
  current_location,
  preferred_location,
  preferred_cities,
  willing_to_relocate,
  languages,
  bio,
  availability,
  employment_types,
  expected_ctc,
  salary_currency,
  salary_period,
  min_expected_salary,
  preferred_salary,
  expected_salary_min,
  expected_salary_preferred,
  is_salary_negotiable,
  verified,
  premium_badge,
  rating,
  ratings_count,
  profile_completion_percent,
  profile_completion_percentage,
  created_at,
  updated_at
FROM public.teachers
WHERE profile_status = 'Active'
  AND COALESCE(profile_visibility, 'PUBLIC_VERIFIED_EMPLOYERS') != 'HIDDEN';

-- Restrict recruiter talent discovery view strictly to authenticated users (NO anonymous access)
GRANT SELECT ON public.public_teachers TO authenticated;

-- 6. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
