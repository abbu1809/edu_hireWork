-- ==============================================================================
-- EduHire Bridge — ONE-SHOT SETUP FOR A NEW (EMPTY) SUPABASE PROJECT
-- ------------------------------------------------------------------------------
-- Paste this whole file into Supabase → SQL Editor → New query → Run.
-- It is the concatenation, in order, of:
--   1. schema.sql                                         (tables, RLS, views, storage)
--   2. migrations/20260910_admin_manual_management_verification.sql (admin RPCs)
--   3. migrations/20261004_server_api_architecture.sql    (signup trigger, inquiries, payments)
--   4. migrations/20261005_email_services.sql             (OTP, subscribers, email logs)
--   5. migrations/20261005_admin_via_api_only.sql         (no hard-coded admin email)
--   6. migrations/20261006_user_sessions.sql              (refresh-token sessions)
-- Generated file — edit the sources above, not this file.
-- Already set up an older database? Run only the migrations you're missing instead.
-- ==============================================================================


-- ##############################################################################
-- ## schema.sql
-- ##############################################################################

-- ==============================================================================
-- EduHire Bridge - Complete Production Supabase PostgreSQL Schema & Security Hardening
-- Single-file, Idempotent DDL for Supabase SQL Editor (Free Plan Compatible)
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 2. CORE DATABASE TABLES (10 Tables)
-- ==============================================================================

-- 2.1 PROFILES (Core identity mapped 1-to-1 with auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('TEACHER', 'INSTITUTE', 'ADMIN')),
  phone TEXT,
  city TEXT,
  state TEXT,
  profile_photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.2 TEACHERS (Extended educator profile details)
CREATE TABLE IF NOT EXISTS public.teachers (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  profile_photo_url TEXT,
  qualification TEXT,
  experience_years INTEGER DEFAULT 0,
  subjects TEXT[] NOT NULL DEFAULT '{}',
  classes_taught TEXT[] NOT NULL DEFAULT '{}',
  city TEXT,
  state TEXT,
  current_location TEXT,
  willing_to_relocate TEXT DEFAULT 'Yes',
  languages TEXT[] DEFAULT '{"English", "Hindi"}',
  gender TEXT,
  dob DATE,
  primary_role TEXT DEFAULT 'Faculty / Teacher',
  secondary_roles TEXT[] DEFAULT '{}',
  headline TEXT,
  primary_subject TEXT,
  secondary_subjects TEXT[] DEFAULT '{}',
  specialization TEXT,
  specializations TEXT[] DEFAULT '{}',
  exam_categories TEXT[] DEFAULT '{}',
  experience_range TEXT,
  exam_prep_experience_years NUMERIC(4, 1) DEFAULT 0,
  current_organization TEXT,
  current_designation TEXT,
  previous_organizations TEXT[] DEFAULT '{}',
  work_history JSONB DEFAULT '[]'::jsonb,
  education_records JSONB DEFAULT '[]'::jsonb,
  work_modes TEXT[] DEFAULT '{"Offline"}',
  preferred_location TEXT,
  preferred_cities TEXT[] DEFAULT '{}',
  availability TEXT DEFAULT 'Immediately',
  employment_types TEXT[] DEFAULT '{"Full Time"}',
  target_levels TEXT[] DEFAULT '{}',
  salary_currency TEXT DEFAULT 'INR',
  salary_period TEXT DEFAULT 'Annual CTC',
  min_expected_salary NUMERIC(12, 2),
  preferred_salary NUMERIC(12, 2),
  expected_salary_min NUMERIC(12, 2),
  expected_salary_preferred NUMERIC(12, 2),
  is_salary_negotiable BOOLEAN DEFAULT TRUE,
  resume_url TEXT,
  resume_name TEXT,
  profile_status TEXT NOT NULL DEFAULT 'Active' CHECK (profile_status IN ('Active', 'Inactive', 'Suspended', 'Archived')),
  kyc_status TEXT NOT NULL DEFAULT 'Pending' CHECK (kyc_status IN ('Pending', 'Approved', 'Rejected')),
  verification_status TEXT NOT NULL DEFAULT 'Pending' CHECK (verification_status IN ('Pending', 'Under Review', 'Verified', 'Rejected', 'Suspended')),
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  verification_notes TEXT,
  featured_on_homepage BOOLEAN NOT NULL DEFAULT FALSE,
  is_admin_created BOOLEAN NOT NULL DEFAULT FALSE,
  admin_notes TEXT,
  flagged BOOLEAN NOT NULL DEFAULT FALSE,
  custom_fields JSONB DEFAULT '{}'::jsonb,
  bio TEXT,
  expected_ctc TEXT,
  teaching_mode TEXT DEFAULT 'Offline Classroom',
  profile_visibility TEXT DEFAULT 'PUBLIC_VERIFIED_EMPLOYERS',
  job_alerts_enabled BOOLEAN DEFAULT TRUE,
  application_updates_enabled BOOLEAN DEFAULT TRUE,
  employer_interest_enabled BOOLEAN DEFAULT TRUE,
  interview_notifications_enabled BOOLEAN DEFAULT TRUE,
  "references" JSONB DEFAULT '[]'::jsonb,
  profile_completion_percent INTEGER DEFAULT 35,
  profile_completion_percentage NUMERIC(5, 2) DEFAULT 0,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  premium_badge BOOLEAN NOT NULL DEFAULT FALSE,
  rating NUMERIC(3,2) DEFAULT 5.0,
  ratings_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.3 INSTITUTES (Extended organization profile details)
CREATE TABLE IF NOT EXISTS public.institutes (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  institute_name TEXT NOT NULL,
  tagline TEXT,
  contact_person TEXT,
  designation TEXT,
  poc_name TEXT,
  poc_designation TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  website TEXT,
  location TEXT,
  city TEXT,
  state TEXT,
  institute_type TEXT,
  boards TEXT[] NOT NULL DEFAULT '{}',
  facilities TEXT[] NOT NULL DEFAULT '{}',
  student_count TEXT,
  faculty_count TEXT,
  established_year TEXT,
  branches_count INTEGER DEFAULT 1,
  courses TEXT[] DEFAULT '{}'::TEXT[],
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Suspended', 'Archived')),
  verification_status TEXT NOT NULL DEFAULT 'Pending' CHECK (verification_status IN ('Pending', 'Under Review', 'Verified', 'Rejected', 'Suspended')),
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  verification_notes TEXT,
  featured_on_homepage BOOLEAN NOT NULL DEFAULT FALSE,
  is_admin_created BOOLEAN NOT NULL DEFAULT FALSE,
  admin_notes TEXT,
  flagged BOOLEAN NOT NULL DEFAULT FALSE,
  profile_visibility TEXT DEFAULT 'PUBLIC',
  custom_fields JSONB DEFAULT '{}'::jsonb,
  description TEXT,
  unlocked_teachers UUID[] NOT NULL DEFAULT '{}',
  plan TEXT NOT NULL DEFAULT 'Standard',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.4 VACANCIES (Teaching requirements posted by Institutes)
CREATE TABLE IF NOT EXISTS public.vacancies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institute_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  institute_name TEXT NOT NULL,
  city TEXT NOT NULL,
  location TEXT,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  classes TEXT[] NOT NULL DEFAULT '{}',
  board TEXT DEFAULT 'CBSE / IIT-JEE / NEET',
  salary_range TEXT NOT NULL,
  min_experience TEXT DEFAULT '3+ Years',
  type TEXT DEFAULT 'Full-Time',
  description TEXT,
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Closed', 'Draft', 'Filled')),
  urgency TEXT NOT NULL DEFAULT 'Normal' CHECK (urgency IN ('Normal', 'High', 'Urgent')),
  applicants_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.5 APPLICATIONS (Teacher applications to Vacancies)
CREATE TABLE IF NOT EXISTS public.applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vacancy_id UUID NOT NULL REFERENCES public.vacancies(id) ON DELETE CASCADE,
  vacancy_title TEXT NOT NULL,
  institute_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  institute_name TEXT NOT NULL,
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  teacher_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'APPLIED' CHECK (status IN ('APPLIED', 'UNDER_REVIEW', 'SHORTLISTED', 'INTERVIEW', 'SELECTED', 'REJECTED', 'WITHDRAWN')),
  interview_date TEXT,
  interview_time TEXT,
  interview_link TEXT,
  interview_notes TEXT,
  resume_url TEXT,
  applied_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_application_vacancy_teacher UNIQUE (vacancy_id, teacher_id)
);

-- 2.6 DOCUMENTS (Resumes, Certificates, KYC Files)
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('RESUME', 'CERTIFICATE', 'KYC', 'PHOTO', 'EXPERIENCE_LETTER', 'PORTFOLIO')),
  file_size TEXT,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.7 NOTIFICATIONS (In-app notifications)
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'INFO' CHECK (type IN ('INFO', 'APPLICATION', 'INTERVIEW', 'KYC', 'PAYMENT')),
  read BOOLEAN NOT NULL DEFAULT FALSE,
  link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.8 INTERVIEWS (Whiteboard demos & trial rounds)
CREATE TABLE IF NOT EXISTS public.interviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  institute_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  topic TEXT NOT NULL,
  meeting_link TEXT,
  status TEXT NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'COMPLETED', 'CANCELLED')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.9 PAYMENTS (Razorpay Payment Records)
CREATE TABLE IF NOT EXISTS public.payments (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  payer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  payer_name TEXT,
  purpose TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'CREATED' CHECK (status IN ('CREATED', 'CAPTURED', 'FAILED', 'REFUNDED')),
  method TEXT DEFAULT 'Razorpay',
  razorpay_payment_id TEXT,
  razorpay_signature TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.10 ADMIN ACTIONS (Platform Governance & Audit Log)
CREATE TABLE IF NOT EXISTS public.admin_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  target_type TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 3. INDEXES FOR PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_vacancies_status ON public.vacancies(status);
CREATE INDEX IF NOT EXISTS idx_vacancies_subject ON public.vacancies(subject);
CREATE INDEX IF NOT EXISTS idx_vacancies_city ON public.vacancies(city);
CREATE INDEX IF NOT EXISTS idx_vacancies_institute ON public.vacancies(institute_id);
CREATE INDEX IF NOT EXISTS idx_applications_vacancy ON public.applications(vacancy_id);
CREATE INDEX IF NOT EXISTS idx_applications_teacher ON public.applications(teacher_id);
CREATE INDEX IF NOT EXISTS idx_applications_institute ON public.applications(institute_id);
CREATE INDEX IF NOT EXISTS idx_documents_user ON public.documents(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_interviews_teacher ON public.interviews(teacher_id);
CREATE INDEX IF NOT EXISTS idx_interviews_institute ON public.interviews(institute_id);
CREATE INDEX IF NOT EXISTS idx_payments_payer ON public.payments(payer_id);

-- ==============================================================================
-- 4. HARDENED SECURITY DEFINER FUNCTIONS & TRIGGERS
-- ==============================================================================

-- 4.1 Check Admin Role (Hardened search_path)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'ADMIN'
  );
$$;

-- 4.2 Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_teachers_updated_at ON public.teachers;
CREATE TRIGGER set_teachers_updated_at
  BEFORE UPDATE ON public.teachers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_institutes_updated_at ON public.institutes;
CREATE TRIGGER set_institutes_updated_at
  BEFORE UPDATE ON public.institutes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_vacancies_updated_at ON public.vacancies;
CREATE TRIGGER set_vacancies_updated_at
  BEFORE UPDATE ON public.vacancies
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_applications_updated_at ON public.applications;
CREATE TRIGGER set_applications_updated_at
  BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_interviews_updated_at ON public.interviews;
CREATE TRIGGER set_interviews_updated_at
  BEFORE UPDATE ON public.interviews
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 4.3 Enforce Profile Security (Prevents normal users from modifying role, id, or email)
CREATE OR REPLACE FUNCTION public.enforce_profile_update_security()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Allow direct SQL Editor / Dashboard / Database Owner / Admin / Service Role
  IF auth.uid() IS NULL OR current_user IN ('postgres', 'service_role', 'supabase_admin') OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Unauthorized: You cannot modify your account role.';
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Unauthorized: Account ID cannot be altered.';
  END IF;
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    RAISE EXCEPTION 'Unauthorized: Email address must be updated through authenticated auth service.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_profile_security_trigger ON public.profiles;
CREATE TRIGGER enforce_profile_security_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_profile_update_security();

-- 4.4 Enforce Teacher Verification Security (Prevents self-approving KYC, verification, badges, ratings, profile_status, email)
CREATE OR REPLACE FUNCTION public.enforce_teacher_update_security()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Allow direct SQL Editor / Dashboard / Database Owner / Admin / Service Role
  IF auth.uid() IS NULL OR current_user IN ('postgres', 'service_role', 'supabase_admin') OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Unauthorized: Account ID cannot be altered.';
  END IF;
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    RAISE EXCEPTION 'Unauthorized: Email address must be updated through authenticated auth service.';
  END IF;
  IF NEW.profile_status IS DISTINCT FROM OLD.profile_status THEN
    RAISE EXCEPTION 'Unauthorized: Only administrators can modify profile status.';
  END IF;
  IF NEW.verified IS DISTINCT FROM OLD.verified THEN
    RAISE EXCEPTION 'Unauthorized: Only administrators can modify verification badges.';
  END IF;
  IF NEW.kyc_status IS DISTINCT FROM OLD.kyc_status THEN
    RAISE EXCEPTION 'Unauthorized: Only administrators can approve or modify KYC status.';
  END IF;
  IF NEW.premium_badge IS DISTINCT FROM OLD.premium_badge THEN
    RAISE EXCEPTION 'Unauthorized: Only administrators or billing processes can grant premium badges.';
  END IF;
  IF NEW.rating IS DISTINCT FROM OLD.rating OR NEW.ratings_count IS DISTINCT FROM OLD.ratings_count THEN
    RAISE EXCEPTION 'Unauthorized: Ratings cannot be manually modified.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_teacher_security_trigger ON public.teachers;
CREATE TRIGGER enforce_teacher_security_trigger
  BEFORE UPDATE ON public.teachers
  FOR EACH ROW EXECUTE FUNCTION public.enforce_teacher_update_security();

-- 4.5 Enforce Institute Verification & Plan Security
CREATE OR REPLACE FUNCTION public.enforce_institute_update_security()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Allow direct SQL Editor / Dashboard / Database Owner / Admin / Service Role
  IF auth.uid() IS NULL OR current_user IN ('postgres', 'service_role', 'supabase_admin') OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Unauthorized: Account ID cannot be altered.';
  END IF;
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    RAISE EXCEPTION 'Unauthorized: Email address must be updated through authenticated auth service.';
  END IF;
  IF NEW.verified IS DISTINCT FROM OLD.verified THEN
    RAISE EXCEPTION 'Unauthorized: Only administrators can modify institute verification status.';
  END IF;
  IF NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
    RAISE EXCEPTION 'Unauthorized: Only administrators can modify institute verification status.';
  END IF;
  IF NEW.plan IS DISTINCT FROM OLD.plan THEN
    RAISE EXCEPTION 'Unauthorized: Plan upgrades must be processed through authorized billing.';
  END IF;
  IF NEW.unlocked_teachers IS DISTINCT FROM OLD.unlocked_teachers THEN
    RAISE EXCEPTION 'Unauthorized: Unlocked candidate list can only be updated through verified checkout.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_institute_security_trigger ON public.institutes;
CREATE TRIGGER enforce_institute_security_trigger
  BEFORE UPDATE ON public.institutes
  FOR EACH ROW EXECUTE FUNCTION public.enforce_institute_update_security();

-- 4.6 Enforce Application Ownership Immutability on UPDATE
CREATE OR REPLACE FUNCTION public.enforce_application_update_security()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Allow direct SQL Editor / Dashboard / Database Owner / Admin / Service Role
  IF auth.uid() IS NULL OR current_user IN ('postgres', 'service_role', 'supabase_admin') OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Unauthorized: Application ID cannot be altered.';
  END IF;
  IF NEW.teacher_id IS DISTINCT FROM OLD.teacher_id THEN
    RAISE EXCEPTION 'Unauthorized: Application cannot be reassigned to a different teacher.';
  END IF;
  IF NEW.institute_id IS DISTINCT FROM OLD.institute_id THEN
    RAISE EXCEPTION 'Unauthorized: Application cannot be reassigned to a different institute.';
  END IF;
  IF NEW.vacancy_id IS DISTINCT FROM OLD.vacancy_id THEN
    RAISE EXCEPTION 'Unauthorized: Application cannot be reassigned to a different vacancy.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_application_security_trigger ON public.applications;
CREATE TRIGGER enforce_application_security_trigger
  BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.enforce_application_update_security();

-- 4.7 Enforce Interview Ownership Immutability on UPDATE
CREATE OR REPLACE FUNCTION public.enforce_interview_update_security()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Allow direct SQL Editor / Dashboard / Database Owner / Admin / Service Role
  IF auth.uid() IS NULL OR current_user IN ('postgres', 'service_role', 'supabase_admin') OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Unauthorized: Interview ID cannot be altered.';
  END IF;
  IF NEW.application_id IS DISTINCT FROM OLD.application_id THEN
    RAISE EXCEPTION 'Unauthorized: Interview cannot be reassigned to a different application.';
  END IF;
  IF NEW.teacher_id IS DISTINCT FROM OLD.teacher_id THEN
    RAISE EXCEPTION 'Unauthorized: Interview cannot be reassigned to a different teacher.';
  END IF;
  IF NEW.institute_id IS DISTINCT FROM OLD.institute_id THEN
    RAISE EXCEPTION 'Unauthorized: Interview cannot be reassigned to a different institute.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_interview_security_trigger ON public.interviews;
CREATE TRIGGER enforce_interview_security_trigger
  BEFORE UPDATE ON public.interviews
  FOR EACH ROW EXECUTE FUNCTION public.enforce_interview_update_security();

-- 4.8 Secure Notification Dispatcher (Hardened with authorization check & search_path)
CREATE OR REPLACE FUNCTION public.send_notification(
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT DEFAULT 'INFO',
  p_link TEXT DEFAULT ''
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_notif_id UUID;
  v_caller_id UUID;
  v_is_authorized BOOLEAN := FALSE;
BEGIN
  v_caller_id := auth.uid();

  -- Caller must be Admin, or sending to themselves, or related via an active job application
  IF public.is_admin() OR v_caller_id = p_user_id THEN
    v_is_authorized := TRUE;
  ELSIF EXISTS (
    SELECT 1 FROM public.applications a
    WHERE (a.teacher_id = v_caller_id AND a.institute_id = p_user_id)
       OR (a.institute_id = v_caller_id AND a.teacher_id = p_user_id)
  ) THEN
    v_is_authorized := TRUE;
  END IF;

  IF NOT v_is_authorized THEN
    RAISE EXCEPTION 'Unauthorized: You cannot dispatch notifications to this recipient.';
  END IF;

  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (p_user_id, p_title, p_message, p_type, p_link)
  RETURNING id INTO v_notif_id;

  RETURN v_notif_id;
END;
$$;

-- Restrict execution privileges
REVOKE EXECUTE ON FUNCTION public.send_notification FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.send_notification FROM anon;
GRANT EXECUTE ON FUNCTION public.send_notification TO authenticated;

-- 4.9 Identity Normalization & Duplicate Account Prevention Functions
CREATE OR REPLACE FUNCTION public.normalize_email(raw_email TEXT)
RETURNS TEXT AS $$
BEGIN
  IF raw_email IS NULL OR TRIM(raw_email) = '' THEN
    RETURN NULL;
  END IF;
  RETURN LOWER(TRIM(raw_email));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.normalize_phone(raw_phone TEXT)
RETURNS TEXT AS $$
DECLARE
  digits TEXT;
BEGIN
  IF raw_phone IS NULL OR TRIM(raw_phone) = '' THEN
    RETURN NULL;
  END IF;

  digits := regexp_replace(raw_phone, '[^0-9]', '', 'g');

  IF length(digits) = 12 AND digits LIKE '91%' THEN
    digits := substring(digits FROM 3);
  ELSIF length(digits) = 11 AND digits LIKE '0%' THEN
    digits := substring(digits FROM 2);
  END IF;

  IF length(digits) = 10 THEN
    RETURN '+91' || digits;
  ELSIF length(digits) > 0 THEN
    RETURN '+' || digits;
  ELSE
    RETURN NULL;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 4.10 Cross-Role Pre-Flight Duplicate Check RPC
CREATE OR REPLACE FUNCTION public.check_account_exists(
  p_email TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_exclude_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_norm_email TEXT;
  v_norm_phone TEXT;
  v_email_exists BOOLEAN := FALSE;
  v_phone_exists BOOLEAN := FALSE;
BEGIN
  v_norm_email := public.normalize_email(p_email);
  v_norm_phone := public.normalize_phone(p_phone);

  -- 1. Check Email
  IF v_norm_email IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE public.normalize_email(email) = v_norm_email
        AND (p_exclude_user_id IS NULL OR id != p_exclude_user_id)
    ) INTO v_email_exists;

    IF NOT v_email_exists THEN
      SELECT EXISTS (
        SELECT 1 FROM auth.users
        WHERE LOWER(TRIM(email)) = v_norm_email
          AND (p_exclude_user_id IS NULL OR id != p_exclude_user_id)
      ) INTO v_email_exists;
    END IF;
  END IF;

  -- 2. Check Phone
  IF v_norm_phone IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE public.normalize_phone(phone) = v_norm_phone
        AND (p_exclude_user_id IS NULL OR id != p_exclude_user_id)
    ) INTO v_phone_exists;

    IF NOT v_phone_exists THEN
      SELECT EXISTS (
        SELECT 1 FROM public.teachers
        WHERE public.normalize_phone(phone) = v_norm_phone
          AND (p_exclude_user_id IS NULL OR id != p_exclude_user_id)
      ) INTO v_phone_exists;
    END IF;

    IF NOT v_phone_exists THEN
      SELECT EXISTS (
        SELECT 1 FROM public.institutes
        WHERE public.normalize_phone(phone) = v_norm_phone
          AND (p_exclude_user_id IS NULL OR id != p_exclude_user_id)
      ) INTO v_phone_exists;
    END IF;

    IF NOT v_phone_exists THEN
      SELECT EXISTS (
        SELECT 1 FROM auth.users
        WHERE (
          public.normalize_phone(phone) = v_norm_phone
          OR public.normalize_phone(raw_user_meta_data->>'phone') = v_norm_phone
        )
        AND (p_exclude_user_id IS NULL OR id != p_exclude_user_id)
      ) INTO v_phone_exists;
    END IF;
  END IF;

  IF v_email_exists OR v_phone_exists THEN
    RETURN jsonb_build_object(
      'exists', TRUE,
      'match_type', CASE
        WHEN v_email_exists AND v_phone_exists THEN 'both'
        WHEN v_email_exists THEN 'email'
        ELSE 'phone'
      END,
      'message', 'An account already exists with these details. Please log in instead.'
    );
  END IF;

  RETURN jsonb_build_object(
    'exists', FALSE,
    'match_type', NULL,
    'message', 'Available'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.normalize_email(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.normalize_phone(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_account_exists(TEXT, TEXT, UUID) TO anon, authenticated, service_role;

-- 4.11 Auth Signup Trigger (Hardened with duplicate account verification)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_role TEXT;
  v_name TEXT;
  v_phone TEXT;
  v_city TEXT;
  v_subjects TEXT[];
  v_norm_email TEXT;
  v_norm_phone TEXT;
  v_duplicate_found BOOLEAN := FALSE;
BEGIN
  v_norm_email := public.normalize_email(NEW.email);
  v_norm_phone := public.normalize_phone(NEW.raw_user_meta_data->>'phone');

  -- Verify Phone uniqueness before creating profiles
  IF v_norm_phone IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE public.normalize_phone(phone) = v_norm_phone
        AND id != NEW.id
    ) INTO v_duplicate_found;

    IF v_duplicate_found THEN
      RAISE EXCEPTION 'DUPLICATE_ACCOUNT: An account already exists with these details. Please log in instead.';
    END IF;
  END IF;

  -- Automatically assign ADMIN role for admin@eduhirebridge.in
  IF v_norm_email = 'admin@eduhirebridge.in' THEN
    v_role := 'ADMIN';
  ELSE
    v_role := UPPER(COALESCE(NEW.raw_user_meta_data->>'role', 'TEACHER'));
    IF v_role NOT IN ('TEACHER', 'INSTITUTE') THEN
      v_role := 'TEACHER';
    END IF;
  END IF;

  v_name := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))), '');
  IF v_name IS NULL THEN
    v_name := split_part(NEW.email, '@', 1);
  END IF;

  v_phone := v_norm_phone;
  v_city := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'city', '')), '');

  -- 1. Insert into public.profiles
  INSERT INTO public.profiles (id, name, email, role, phone, city)
  VALUES (NEW.id, v_name, v_norm_email, v_role, v_phone, v_city)
  ON CONFLICT (id) DO UPDATE
  SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
    city = COALESCE(EXCLUDED.city, public.profiles.city),
    updated_at = NOW();

  -- 2. Insert into role-specific table with clean data
  IF v_role = 'TEACHER' THEN
    IF NEW.raw_user_meta_data->'subjects' IS NOT NULL AND jsonb_typeof(NEW.raw_user_meta_data->'subjects') = 'array' THEN
      SELECT COALESCE(array_agg(x::text), '{}'::TEXT[]) INTO v_subjects
      FROM jsonb_array_elements_text(NEW.raw_user_meta_data->'subjects') AS x;
    ELSIF NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'subject', '')), '') IS NOT NULL THEN
      v_subjects := ARRAY[TRIM(NEW.raw_user_meta_data->>'subject')];
    ELSE
      v_subjects := '{}'::TEXT[];
    END IF;

    INSERT INTO public.teachers (
      id,
      name,
      email,
      phone,
      subjects,
      qualification,
      experience_years,
      preferred_location,
      profile_status,
      kyc_status,
      verified,
      premium_badge
    )
    VALUES (
      NEW.id,
      v_name,
      v_norm_email,
      v_phone,
      v_subjects,
      NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'qualification', '')), ''),
      COALESCE(NULLIF(NEW.raw_user_meta_data->>'experience_years', '')::INTEGER, 0),
      v_city,
      'Active',
      'Pending',
      FALSE,
      FALSE
    )
    ON CONFLICT (id) DO UPDATE
    SET
      name = EXCLUDED.name,
      email = EXCLUDED.email,
      phone = COALESCE(EXCLUDED.phone, public.teachers.phone),
      updated_at = NOW();

  ELSIF v_role = 'INSTITUTE' THEN
    INSERT INTO public.institutes (
      id,
      institute_name,
      email,
      phone,
      city,
      institute_type,
      verification_status,
      verified,
      plan
    )
    VALUES (
      NEW.id,
      v_name,
      v_norm_email,
      v_phone,
      v_city,
      NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'institute_type', '')), ''),
      'Pending',
      FALSE,
      'Standard'
    )
    ON CONFLICT (id) DO UPDATE
    SET
      institute_name = EXCLUDED.institute_name,
      email = EXCLUDED.email,
      phone = COALESCE(EXCLUDED.phone, public.institutes.phone),
      updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4.12 Trigger to enforce profile uniqueness & normalization
CREATE OR REPLACE FUNCTION public.enforce_profile_identity_uniqueness()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_duplicate_exists BOOLEAN := FALSE;
BEGIN
  IF NEW.email IS NOT NULL THEN
    NEW.email := public.normalize_email(NEW.email);
  END IF;

  IF NEW.phone IS NOT NULL THEN
    NEW.phone := public.normalize_phone(NEW.phone);

    IF NEW.phone IS NOT NULL AND NEW.phone != '' THEN
      SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE public.normalize_phone(phone) = NEW.phone
          AND id != NEW.id
      ) INTO v_duplicate_exists;

      IF v_duplicate_exists THEN
        RAISE EXCEPTION 'DUPLICATE_ACCOUNT: An account already exists with these details. Please log in instead.';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_profile_identity ON public.profiles;
CREATE TRIGGER trg_enforce_profile_identity
  BEFORE INSERT OR UPDATE OF email, phone ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_profile_identity_uniqueness();

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_phone_unique
ON public.profiles (public.normalize_phone(phone))
WHERE phone IS NOT NULL AND TRIM(phone) != '';

-- 4.13 VERIFICATION AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.verification_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('TEACHER', 'INSTITUTE')),
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  performed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  performed_by_email TEXT,
  reason TEXT,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.verification_audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.verification_audit_logs(created_at DESC);

-- 4.14 ADMIN MANAGEMENT & VERIFICATION RPCS
CREATE OR REPLACE FUNCTION public.admin_verify_profile(
  p_entity_type TEXT,
  p_entity_id UUID,
  p_status TEXT,
  p_reason TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_admin_id UUID := auth.uid();
  v_admin_email TEXT;
  v_is_verified BOOLEAN := (p_status = 'Verified');
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required.';
  END IF;

  IF p_status NOT IN ('Pending', 'Under Review', 'Verified', 'Rejected', 'Suspended') THEN
    RAISE EXCEPTION 'Invalid verification status: %', p_status;
  END IF;

  SELECT email INTO v_admin_email FROM public.profiles WHERE id = v_admin_id;

  IF p_entity_type = 'TEACHER' THEN
    UPDATE public.teachers
    SET
      verification_status = p_status,
      verified = v_is_verified,
      kyc_status = CASE WHEN v_is_verified THEN 'Approved' WHEN p_status = 'Rejected' THEN 'Rejected' ELSE kyc_status END,
      verified_at = CASE WHEN v_is_verified THEN NOW() ELSE verified_at END,
      verified_by = CASE WHEN v_is_verified THEN v_admin_id ELSE verified_by END,
      verification_notes = COALESCE(p_notes, p_reason, verification_notes),
      featured_on_homepage = CASE WHEN NOT v_is_verified THEN FALSE ELSE featured_on_homepage END,
      updated_at = NOW()
    WHERE id = p_entity_id;

    UPDATE public.profiles SET updated_at = NOW() WHERE id = p_entity_id;

  ELSIF p_entity_type = 'INSTITUTE' THEN
    UPDATE public.institutes
    SET
      verification_status = p_status,
      verified = v_is_verified,
      verified_at = CASE WHEN v_is_verified THEN NOW() ELSE verified_at END,
      verified_by = CASE WHEN v_is_verified THEN v_admin_id ELSE verified_by END,
      verification_notes = COALESCE(p_notes, p_reason, verification_notes),
      featured_on_homepage = CASE WHEN NOT v_is_verified THEN FALSE ELSE featured_on_homepage END,
      updated_at = NOW()
    WHERE id = p_entity_id;

    UPDATE public.profiles SET updated_at = NOW() WHERE id = p_entity_id;
  END IF;

  INSERT INTO public.verification_audit_logs (
    entity_type, entity_id, action, performed_by, performed_by_email, reason, notes, metadata
  ) VALUES (
    p_entity_type, p_entity_id, UPPER(REPLACE(p_status, ' ', '_')), v_admin_id, v_admin_email, p_reason, p_notes,
    jsonb_build_object('status', p_status, 'verified', v_is_verified)
  );

  RETURN jsonb_build_object('success', TRUE, 'status', p_status, 'verified', v_is_verified);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_feature_profile(
  p_entity_type TEXT,
  p_entity_id UUID,
  p_feature BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_admin_id UUID := auth.uid();
  v_admin_email TEXT;
  v_is_verified BOOLEAN := FALSE;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required.';
  END IF;

  SELECT email INTO v_admin_email FROM public.profiles WHERE id = v_admin_id;

  IF p_entity_type = 'TEACHER' THEN
    SELECT verified INTO v_is_verified FROM public.teachers WHERE id = p_entity_id;
    IF p_feature AND NOT COALESCE(v_is_verified, FALSE) THEN
      RAISE EXCEPTION 'Only verified profiles can be featured on the homepage.';
    END IF;
    UPDATE public.teachers SET featured_on_homepage = p_feature, updated_at = NOW() WHERE id = p_entity_id;

  ELSIF p_entity_type = 'INSTITUTE' THEN
    SELECT verified INTO v_is_verified FROM public.institutes WHERE id = p_entity_id;
    IF p_feature AND NOT COALESCE(v_is_verified, FALSE) THEN
      RAISE EXCEPTION 'Only verified profiles can be featured on the homepage.';
    END IF;
    UPDATE public.institutes SET featured_on_homepage = p_feature, updated_at = NOW() WHERE id = p_entity_id;
  END IF;

  INSERT INTO public.verification_audit_logs (
    entity_type, entity_id, action, performed_by, performed_by_email, reason, metadata
  ) VALUES (
    p_entity_type, p_entity_id, CASE WHEN p_feature THEN 'FEATURED' ELSE 'UNFEATURED' END, v_admin_id, v_admin_email,
    CASE WHEN p_feature THEN 'Featured on homepage by Admin' ELSE 'Removed from homepage by Admin' END,
    jsonb_build_object('featured', p_feature)
  );

  RETURN jsonb_build_object('success', TRUE, 'featured', p_feature);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_verify_profile(TEXT, UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_feature_profile(TEXT, UUID, BOOLEAN) TO authenticated;

-- ==============================================================================
-- 5. PUBLIC VIEWS FOR SAFE PROFESSIONAL DISCOVERY
-- ==============================================================================

-- 5.1 Public Teachers View (Exposes safe professional details; hides phone, email, resume, and KYC)
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
  verification_status,
  featured_on_homepage,
  is_admin_created,
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

-- 5.2 Public Institutes View (Exposes organizational info; hides private phone, contact person, designation, and plan)
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
  verification_status,
  featured_on_homepage,
  is_admin_created,
  courses,
  branches_count,
  description,
  created_at
FROM public.institutes
WHERE COALESCE(status, 'Active') = 'Active'
  AND COALESCE(profile_visibility, 'PUBLIC') != 'HIDDEN';

GRANT SELECT ON public.public_teachers TO authenticated, anon;
GRANT SELECT ON public.public_institutes TO authenticated, anon;

-- ==============================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institutes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vacancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 6.1 Profiles Policies (Private Account Data)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own profile or admins view all" ON public.profiles;
CREATE POLICY "Users can view own profile or admins view all"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Admins full management of profiles" ON public.profiles;
CREATE POLICY "Admins full management of profiles"
  ON public.profiles FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- 6.2 Teachers Policies (Protected Base Table)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Teachers view own, Reviewing institutes view applicants, Admins view all" ON public.teachers;
CREATE POLICY "Teachers view own, Reviewing institutes view applicants, Admins view all"
  ON public.teachers FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.applications a
      WHERE a.teacher_id = public.teachers.id AND a.institute_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Teachers can update own profile" ON public.teachers;
CREATE POLICY "Teachers can update own profile"
  ON public.teachers FOR UPDATE
  TO authenticated
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Teachers can insert own record" ON public.teachers;
CREATE POLICY "Teachers can insert own record"
  ON public.teachers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id OR public.is_admin());

-- ------------------------------------------------------------------------------
-- 6.3 Institutes Policies (Protected Base Table)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Institutes view own, Applied teachers view institute, Admins view all" ON public.institutes;
CREATE POLICY "Institutes view own, Applied teachers view institute, Admins view all"
  ON public.institutes FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.applications a
      WHERE a.institute_id = public.institutes.id AND a.teacher_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Institutes can update own profile" ON public.institutes;
CREATE POLICY "Institutes can update own profile"
  ON public.institutes FOR UPDATE
  TO authenticated
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Institutes can insert own profile" ON public.institutes;
CREATE POLICY "Institutes can insert own profile"
  ON public.institutes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Admins full management of institutes" ON public.institutes;
CREATE POLICY "Admins full management of institutes"
  ON public.institutes FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- 6.4 Vacancies Policies
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Active vacancies viewable by public" ON public.vacancies;
CREATE POLICY "Active vacancies viewable by public"
  ON public.vacancies FOR SELECT
  TO authenticated, anon
  USING (status = 'Active' OR auth.uid() = institute_id OR public.is_admin());

DROP POLICY IF EXISTS "Institutes can insert vacancies" ON public.vacancies;
CREATE POLICY "Institutes can insert vacancies"
  ON public.vacancies FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = institute_id OR public.is_admin());

DROP POLICY IF EXISTS "Institutes can update own vacancies" ON public.vacancies;
CREATE POLICY "Institutes can update own vacancies"
  ON public.vacancies FOR UPDATE
  TO authenticated
  USING (auth.uid() = institute_id OR public.is_admin())
  WITH CHECK (auth.uid() = institute_id OR public.is_admin());

DROP POLICY IF EXISTS "Institutes can delete own vacancies" ON public.vacancies;
CREATE POLICY "Institutes can delete own vacancies"
  ON public.vacancies FOR DELETE
  TO authenticated
  USING (auth.uid() = institute_id OR public.is_admin());

-- ------------------------------------------------------------------------------
-- 6.5 Applications Policies (Strict Role Status & Insertion Boundaries)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Teachers, Institutes, and Admins can view relevant applications" ON public.applications;
CREATE POLICY "Teachers, Institutes, and Admins can view relevant applications"
  ON public.applications FOR SELECT
  TO authenticated
  USING (auth.uid() = teacher_id OR auth.uid() = institute_id OR public.is_admin());

DROP POLICY IF EXISTS "Teachers can submit applications" ON public.applications;
CREATE POLICY "Teachers can submit applications"
  ON public.applications FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin()
    OR (
      auth.uid() = teacher_id
      AND status = 'APPLIED'
      AND EXISTS (
        SELECT 1 FROM public.vacancies v
        WHERE v.id = vacancy_id
          AND v.institute_id = applications.institute_id
          AND v.status = 'Active'
      )
    )
  );

DROP POLICY IF EXISTS "Institutes and Admins can manage application stages" ON public.applications;
CREATE POLICY "Institutes and Admins can manage application stages"
  ON public.applications FOR UPDATE
  TO authenticated
  USING (auth.uid() = institute_id OR public.is_admin())
  WITH CHECK (auth.uid() = institute_id OR public.is_admin());

DROP POLICY IF EXISTS "Teachers can withdraw own applications" ON public.applications;
CREATE POLICY "Teachers can withdraw own applications"
  ON public.applications FOR UPDATE
  TO authenticated
  USING (auth.uid() = teacher_id)
  WITH CHECK (auth.uid() = teacher_id AND status = 'WITHDRAWN');

-- ------------------------------------------------------------------------------
-- 6.6 Documents Policies (Private KYC vs Resume Access)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own documents, Admins view all" ON public.documents;
CREATE POLICY "Users can view own documents, Admins view all"
  ON public.documents FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR public.is_admin()
    OR (
      document_type IN ('RESUME', 'CERTIFICATE')
      AND EXISTS (
        SELECT 1 FROM public.applications a
        WHERE a.teacher_id = documents.user_id AND a.institute_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can manage own documents" ON public.documents;
CREATE POLICY "Users can manage own documents"
  ON public.documents FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users can update own documents" ON public.documents;
CREATE POLICY "Users can update own documents"
  ON public.documents FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users can delete own documents" ON public.documents;
CREATE POLICY "Users can delete own documents"
  ON public.documents FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

-- ------------------------------------------------------------------------------
-- 6.7 Notifications Policies
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users can mark own notifications read" ON public.notifications;
CREATE POLICY "Users can mark own notifications read"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Admins can insert notifications directly" ON public.notifications;
CREATE POLICY "Admins can insert notifications directly"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- 6.8 Interviews Policies (Validated Institute Ownership & Candidate Matching)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Interview participants and Admins can view interviews" ON public.interviews;
CREATE POLICY "Interview participants and Admins can view interviews"
  ON public.interviews FOR SELECT
  TO authenticated
  USING (auth.uid() = teacher_id OR auth.uid() = institute_id OR public.is_admin());

DROP POLICY IF EXISTS "Institutes and Admins can schedule interviews" ON public.interviews;
CREATE POLICY "Institutes and Admins can schedule interviews"
  ON public.interviews FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin()
    OR (
      auth.uid() = institute_id
      AND EXISTS (
        SELECT 1 FROM public.applications a
        WHERE a.id = application_id
          AND a.institute_id = auth.uid()
          AND a.teacher_id = interviews.teacher_id
      )
    )
  );

DROP POLICY IF EXISTS "Institutes and Admins can update interviews" ON public.interviews;
CREATE POLICY "Institutes and Admins can update interviews"
  ON public.interviews FOR UPDATE
  TO authenticated
  USING (auth.uid() = institute_id OR public.is_admin())
  WITH CHECK (auth.uid() = institute_id OR public.is_admin());

-- ------------------------------------------------------------------------------
-- 6.9 Payments Policies (Anti-Fraud: Browser cannot insert or update to CAPTURED)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Payers and Admins can view payments" ON public.payments;
CREATE POLICY "Payers and Admins can view payments"
  ON public.payments FOR SELECT
  TO authenticated
  USING (auth.uid() = payer_id OR public.is_admin());

DROP POLICY IF EXISTS "Payers can create initial order record" ON public.payments;
CREATE POLICY "Payers can create initial order record"
  ON public.payments FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin()
    OR (
      auth.uid() = payer_id
      AND status = 'CREATED'
      AND razorpay_payment_id IS NULL
      AND razorpay_signature IS NULL
    )
  );

-- Direct UPDATE on payments is strictly restricted to Admins & server-side service role
DROP POLICY IF EXISTS "Only Admins can update payment records" ON public.payments;
CREATE POLICY "Only Admins can update payment records"
  ON public.payments FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- 6.10 Admin Actions Policies
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins have full access to audit log" ON public.admin_actions;
CREATE POLICY "Admins have full access to audit log"
  ON public.admin_actions FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ==============================================================================
-- 7. STORAGE BUCKETS & POLICIES
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('resumes', 'resumes', false, 10485760, ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('documents', 'documents', false, 10485760, ARRAY['application/pdf', 'image/jpeg', 'image/png'])
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 7.1 Avatars (Public read, owner-only upload)
DROP POLICY IF EXISTS "Public can view avatars" ON storage.objects;
CREATE POLICY "Public can view avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can manage own avatar" ON storage.objects;
CREATE POLICY "Users can manage own avatar"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'avatars' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_admin()))
  WITH CHECK (bucket_id = 'avatars' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_admin()));

-- 7.2 Resumes (Private: Owner, SuperAdmin, or Reviewing Institute with active application)
DROP POLICY IF EXISTS "Users and reviewing institutes can view resumes" ON storage.objects;
CREATE POLICY "Users and reviewing institutes can view resumes"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'resumes'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.is_admin()
      OR EXISTS (
        SELECT 1 FROM public.applications a
        WHERE a.teacher_id::text = (storage.foldername(name))[1] AND a.institute_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can manage own resume" ON storage.objects;
CREATE POLICY "Users can manage own resume"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'resumes' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_admin()))
  WITH CHECK (bucket_id = 'resumes' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_admin()));

-- 7.3 Documents (Strictly Private: Owner & SuperAdmin only - NEVER public)
DROP POLICY IF EXISTS "Users and admins can view private documents" ON storage.objects;
CREATE POLICY "Users and admins can view private documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'documents' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_admin()));

DROP POLICY IF EXISTS "Users can manage own documents" ON storage.objects;
CREATE POLICY "Users can manage own documents"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'documents' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_admin()))
  WITH CHECK (bucket_id = 'documents' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_admin()));

-- ==============================================================================
-- 8. DYNAMIC FORM BUILDER, CMS, PAYMENT LINKS & PLATFORM SETTINGS
-- ==============================================================================

-- 8.1 Custom Fields on Teachers and Institutes
ALTER TABLE public.teachers
  ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS admin_notes TEXT,
  ADD COLUMN IF NOT EXISTS flagged BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.institutes
  ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS admin_notes TEXT,
  ADD COLUMN IF NOT EXISTS flagged BOOLEAN NOT NULL DEFAULT FALSE;

-- 8.2 Dynamic Form Builder
CREATE TABLE IF NOT EXISTS public.form_fields (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  form_type TEXT NOT NULL CHECK (form_type IN ('TEACHER', 'INSTITUTE')),
  section TEXT NOT NULL DEFAULT 'General',
  field_key TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  field_type TEXT NOT NULL CHECK (field_type IN ('TEXT', 'TEXTAREA', 'NUMBER', 'EMAIL', 'PHONE', 'DATE', 'DROPDOWN', 'MULTI_SELECT', 'RADIO', 'CHECKBOX', 'FILE')),
  options TEXT[] NOT NULL DEFAULT '{}',
  required BOOLEAN NOT NULL DEFAULT FALSE,
  visible BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_form_field_key UNIQUE (form_type, field_key)
);

-- 8.3 Blog Posts & Content Platform
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content_type TEXT NOT NULL DEFAULT 'BLOG' CHECK (content_type IN ('TEACHER_UPDATE', 'INSTITUTE_UPDATE', 'BLOG')),
  excerpt TEXT,
  content TEXT NOT NULL,
  cover_image_url TEXT,
  category TEXT NOT NULL DEFAULT 'Career Guidance',
  tags TEXT[] NOT NULL DEFAULT '{}',
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL DEFAULT 'EduHire Editorial Board',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'scheduled', 'archived')),
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  views_count INTEGER NOT NULL DEFAULT 0,
  reading_time_minutes INTEGER NOT NULL DEFAULT 4,
  seo_title TEXT,
  seo_description TEXT,
  canonical_url TEXT,
  og_image_url TEXT,
  published_at TIMESTAMPTZ,
  scheduled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8.4 Razorpay Payment Links
CREATE TABLE IF NOT EXISTS public.payment_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  plan TEXT NOT NULL DEFAULT 'Standard',
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  razorpay_url TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  features TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8.5 Platform Settings
CREATE TABLE IF NOT EXISTS public.platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8.6 RPC: Increment Article Views Count Safely
CREATE OR REPLACE FUNCTION public.increment_article_views(article_slug TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.blog_posts
  SET views_count = views_count + 1
  WHERE slug = article_slug;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_article_views(TEXT) TO authenticated, anon;

-- 8.7 Policies
ALTER TABLE public.form_fields ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view visible form fields" ON public.form_fields;
CREATE POLICY "Anyone can view visible form fields"
  ON public.form_fields FOR SELECT
  USING (visible = true OR public.is_admin());

DROP POLICY IF EXISTS "Admins can manage form fields" ON public.form_fields;
CREATE POLICY "Admins can manage form fields"
  ON public.form_fields FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read published blog posts" ON public.blog_posts;
CREATE POLICY "Anyone can read published blog posts"
  ON public.blog_posts FOR SELECT
  USING (status = 'published' OR public.is_admin());

DROP POLICY IF EXISTS "Admins can manage blog posts" ON public.blog_posts;
CREATE POLICY "Admins can manage blog posts"
  ON public.blog_posts FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

ALTER TABLE public.payment_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view active payment links" ON public.payment_links;
CREATE POLICY "Anyone can view active payment links"
  ON public.payment_links FOR SELECT
  USING (active = true OR public.is_admin());

DROP POLICY IF EXISTS "Admins can manage payment links" ON public.payment_links;
CREATE POLICY "Admins can manage payment links"
  ON public.payment_links FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view platform settings" ON public.platform_settings;
CREATE POLICY "Anyone can view platform settings"
  ON public.platform_settings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can manage platform settings" ON public.platform_settings;
CREATE POLICY "Admins can manage platform settings"
  ON public.platform_settings FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ==============================================================================
-- 9. RELOAD SCHEMA CACHE
-- ==============================================================================
NOTIFY pgrst, 'reload schema';



-- ##############################################################################
-- ## migrations/20260910_admin_manual_management_verification.sql
-- ##############################################################################

-- ==============================================================================
-- EduHire Bridge - Admin Manual Management, Verification & Featured Homepage System
-- Idempotent Migration: Verification Workflow, Audit Logs, and Admin Management RPCs
-- ==============================================================================

-- 1. EXTEND TEACHERS TABLE
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'Pending';
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS verification_notes TEXT;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS featured_on_homepage BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS is_admin_created BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS flagged BOOLEAN NOT NULL DEFAULT FALSE;

-- Ensure profile_status check allows Archived
DO $$
BEGIN
  ALTER TABLE public.teachers DROP CONSTRAINT IF EXISTS teachers_profile_status_check;
  ALTER TABLE public.teachers ADD CONSTRAINT teachers_profile_status_check 
    CHECK (profile_status IN ('Active', 'Inactive', 'Suspended', 'Archived'));
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- 2. EXTEND INSTITUTES TABLE
ALTER TABLE public.institutes ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';
ALTER TABLE public.institutes ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'Pending';
ALTER TABLE public.institutes ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE public.institutes ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.institutes ADD COLUMN IF NOT EXISTS verification_notes TEXT;
ALTER TABLE public.institutes ADD COLUMN IF NOT EXISTS featured_on_homepage BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.institutes ADD COLUMN IF NOT EXISTS is_admin_created BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.institutes ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE public.institutes ADD COLUMN IF NOT EXISTS flagged BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.institutes ADD COLUMN IF NOT EXISTS poc_name TEXT;
ALTER TABLE public.institutes ADD COLUMN IF NOT EXISTS poc_designation TEXT;
ALTER TABLE public.institutes ADD COLUMN IF NOT EXISTS branches_count INTEGER DEFAULT 1;
ALTER TABLE public.institutes ADD COLUMN IF NOT EXISTS courses TEXT[] DEFAULT '{}'::TEXT[];
ALTER TABLE public.institutes ADD COLUMN IF NOT EXISTS profile_visibility TEXT DEFAULT 'PUBLIC';

-- Ensure status check allows Archived
DO $$
BEGIN
  ALTER TABLE public.institutes DROP CONSTRAINT IF EXISTS institutes_status_check;
  ALTER TABLE public.institutes ADD CONSTRAINT institutes_status_check 
    CHECK (status IN ('Active', 'Inactive', 'Suspended', 'Archived'));
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- 3. ALLOW ADMIN-CREATED PROFILES (Drop hard foreign key to auth.users if needed)
DO $$
BEGIN
  ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
  -- Re-add with NOT VALID or keep open for admin-created profiles
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- 4. VERIFICATION AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.verification_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('TEACHER', 'INSTITUTE')),
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  performed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  performed_by_email TEXT,
  reason TEXT,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.verification_audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.verification_audit_logs(created_at DESC);

-- Enable RLS on audit logs
ALTER TABLE public.verification_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view and create audit logs" ON public.verification_audit_logs;
CREATE POLICY "Admins can view and create audit logs"
  ON public.verification_audit_logs
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 5. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_teachers_verification_status ON public.teachers(verification_status);
CREATE INDEX IF NOT EXISTS idx_teachers_featured_homepage ON public.teachers(featured_on_homepage) WHERE featured_on_homepage = TRUE;
CREATE INDEX IF NOT EXISTS idx_institutes_verification_status ON public.institutes(verification_status);
CREATE INDEX IF NOT EXISTS idx_institutes_featured_homepage ON public.institutes(featured_on_homepage) WHERE featured_on_homepage = TRUE;

-- 6. SECURE ADMIN RPC FUNCTIONS

-- 6.1 Admin Verify Profile (Teachers or Institutes)
CREATE OR REPLACE FUNCTION public.admin_verify_profile(
  p_entity_type TEXT,
  p_entity_id UUID,
  p_status TEXT,
  p_reason TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_admin_id UUID := auth.uid();
  v_admin_email TEXT;
  v_is_verified BOOLEAN := (p_status = 'Verified');
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required.';
  END IF;

  IF p_status NOT IN ('Pending', 'Under Review', 'Verified', 'Rejected', 'Suspended') THEN
    RAISE EXCEPTION 'Invalid verification status: %', p_status;
  END IF;

  SELECT email INTO v_admin_email FROM public.profiles WHERE id = v_admin_id;

  IF p_entity_type = 'TEACHER' THEN
    UPDATE public.teachers
    SET
      verification_status = p_status,
      verified = v_is_verified,
      kyc_status = CASE WHEN v_is_verified THEN 'Approved' WHEN p_status = 'Rejected' THEN 'Rejected' ELSE kyc_status END,
      verified_at = CASE WHEN v_is_verified THEN NOW() ELSE verified_at END,
      verified_by = CASE WHEN v_is_verified THEN v_admin_id ELSE verified_by END,
      verification_notes = COALESCE(p_notes, p_reason, verification_notes),
      -- Unfeature if not verified
      featured_on_homepage = CASE WHEN NOT v_is_verified THEN FALSE ELSE featured_on_homepage END,
      updated_at = NOW()
    WHERE id = p_entity_id;

    UPDATE public.profiles
    SET updated_at = NOW()
    WHERE id = p_entity_id;

  ELSIF p_entity_type = 'INSTITUTE' THEN
    UPDATE public.institutes
    SET
      verification_status = p_status,
      verified = v_is_verified,
      verified_at = CASE WHEN v_is_verified THEN NOW() ELSE verified_at END,
      verified_by = CASE WHEN v_is_verified THEN v_admin_id ELSE verified_by END,
      verification_notes = COALESCE(p_notes, p_reason, verification_notes),
      featured_on_homepage = CASE WHEN NOT v_is_verified THEN FALSE ELSE featured_on_homepage END,
      updated_at = NOW()
    WHERE id = p_entity_id;

    UPDATE public.profiles
    SET updated_at = NOW()
    WHERE id = p_entity_id;
  ELSE
    RAISE EXCEPTION 'Invalid entity type: %', p_entity_type;
  END IF;

  -- Insert audit log
  INSERT INTO public.verification_audit_logs (
    entity_type,
    entity_id,
    action,
    performed_by,
    performed_by_email,
    reason,
    notes,
    metadata
  ) VALUES (
    p_entity_type,
    p_entity_id,
    UPPER(REPLACE(p_status, ' ', '_')),
    v_admin_id,
    v_admin_email,
    p_reason,
    p_notes,
    jsonb_build_object('status', p_status, 'verified', v_is_verified)
  );

  RETURN jsonb_build_object('success', TRUE, 'status', p_status, 'verified', v_is_verified);
END;
$$;

-- 6.2 Admin Feature on Homepage
CREATE OR REPLACE FUNCTION public.admin_feature_profile(
  p_entity_type TEXT,
  p_entity_id UUID,
  p_feature BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_admin_id UUID := auth.uid();
  v_admin_email TEXT;
  v_is_verified BOOLEAN := FALSE;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required.';
  END IF;

  SELECT email INTO v_admin_email FROM public.profiles WHERE id = v_admin_id;

  IF p_entity_type = 'TEACHER' THEN
    SELECT verified INTO v_is_verified FROM public.teachers WHERE id = p_entity_id;
    IF p_feature AND NOT COALESCE(v_is_verified, FALSE) THEN
      RAISE EXCEPTION 'Only verified profiles can be featured on the homepage.';
    END IF;

    UPDATE public.teachers
    SET featured_on_homepage = p_feature, updated_at = NOW()
    WHERE id = p_entity_id;

  ELSIF p_entity_type = 'INSTITUTE' THEN
    SELECT verified INTO v_is_verified FROM public.institutes WHERE id = p_entity_id;
    IF p_feature AND NOT COALESCE(v_is_verified, FALSE) THEN
      RAISE EXCEPTION 'Only verified profiles can be featured on the homepage.';
    END IF;

    UPDATE public.institutes
    SET featured_on_homepage = p_feature, updated_at = NOW()
    WHERE id = p_entity_id;
  ELSE
    RAISE EXCEPTION 'Invalid entity type: %', p_entity_type;
  END IF;

  -- Insert audit log
  INSERT INTO public.verification_audit_logs (
    entity_type,
    entity_id,
    action,
    performed_by,
    performed_by_email,
    reason,
    metadata
  ) VALUES (
    p_entity_type,
    p_entity_id,
    CASE WHEN p_feature THEN 'FEATURED' ELSE 'UNFEATURED' END,
    v_admin_id,
    v_admin_email,
    CASE WHEN p_feature THEN 'Featured on homepage by Admin' ELSE 'Removed from homepage by Admin' END,
    jsonb_build_object('featured', p_feature)
  );

  RETURN jsonb_build_object('success', TRUE, 'featured', p_feature);
END;
$$;

-- 6.3 Admin Archive / Activate Profile
CREATE OR REPLACE FUNCTION public.admin_archive_profile(
  p_entity_type TEXT,
  p_entity_id UUID,
  p_archive BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_admin_id UUID := auth.uid();
  v_admin_email TEXT;
  v_status TEXT := CASE WHEN p_archive THEN 'Archived' ELSE 'Active' END;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required.';
  END IF;

  SELECT email INTO v_admin_email FROM public.profiles WHERE id = v_admin_id;

  IF p_entity_type = 'TEACHER' THEN
    UPDATE public.teachers
    SET
      profile_status = v_status,
      featured_on_homepage = CASE WHEN p_archive THEN FALSE ELSE featured_on_homepage END,
      updated_at = NOW()
    WHERE id = p_entity_id;

  ELSIF p_entity_type = 'INSTITUTE' THEN
    UPDATE public.institutes
    SET
      status = v_status,
      featured_on_homepage = CASE WHEN p_archive THEN FALSE ELSE featured_on_homepage END,
      updated_at = NOW()
    WHERE id = p_entity_id;
  END IF;

  INSERT INTO public.verification_audit_logs (
    entity_type,
    entity_id,
    action,
    performed_by,
    performed_by_email,
    reason,
    metadata
  ) VALUES (
    p_entity_type,
    p_entity_id,
    CASE WHEN p_archive THEN 'ARCHIVED' ELSE 'RESTORED' END,
    v_admin_id,
    v_admin_email,
    CASE WHEN p_archive THEN 'Profile archived by Admin' ELSE 'Profile restored to Active by Admin' END,
    jsonb_build_object('status', v_status)
  );

  RETURN jsonb_build_object('success', TRUE, 'status', v_status);
END;
$$;

-- 6.4 Admin Flag Profile
CREATE OR REPLACE FUNCTION public.admin_flag_profile(
  p_entity_type TEXT,
  p_entity_id UUID,
  p_flagged BOOLEAN,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_admin_id UUID := auth.uid();
  v_admin_email TEXT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required.';
  END IF;

  SELECT email INTO v_admin_email FROM public.profiles WHERE id = v_admin_id;

  IF p_entity_type = 'TEACHER' THEN
    UPDATE public.teachers
    SET
      flagged = p_flagged,
      admin_notes = COALESCE(p_notes, admin_notes),
      updated_at = NOW()
    WHERE id = p_entity_id;

  ELSIF p_entity_type = 'INSTITUTE' THEN
    UPDATE public.institutes
    SET
      flagged = p_flagged,
      admin_notes = COALESCE(p_notes, admin_notes),
      updated_at = NOW()
    WHERE id = p_entity_id;
  END IF;

  INSERT INTO public.verification_audit_logs (
    entity_type,
    entity_id,
    action,
    performed_by,
    performed_by_email,
    reason,
    notes,
    metadata
  ) VALUES (
    p_entity_type,
    p_entity_id,
    CASE WHEN p_flagged THEN 'FLAGGED' ELSE 'UNFLAGGED' END,
    v_admin_id,
    v_admin_email,
    CASE WHEN p_flagged THEN 'Flagged for internal review' ELSE 'Review flag cleared' END,
    p_notes,
    jsonb_build_object('flagged', p_flagged)
  );

  RETURN jsonb_build_object('success', TRUE, 'flagged', p_flagged);
END;
$$;

-- 6.5 Admin Create Teacher Manually (Without Auth Account)
CREATE OR REPLACE FUNCTION public.admin_create_teacher(p_data JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_admin_id UUID := auth.uid();
  v_admin_email TEXT;
  v_new_id UUID := gen_random_uuid();
  v_name TEXT;
  v_email TEXT;
  v_phone TEXT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required.';
  END IF;

  SELECT email INTO v_admin_email FROM public.profiles WHERE id = v_admin_id;

  v_name := COALESCE(p_data->>'name', 'Educator Profile');
  v_email := public.normalize_email(COALESCE(p_data->>'email', 'teacher_' || substring(v_new_id::text, 1, 8) || '@eduhire.manual'));
  v_phone := public.normalize_phone(p_data->>'phone');

  -- 1. Insert into public.profiles
  INSERT INTO public.profiles (
    id,
    name,
    email,
    role,
    phone,
    city,
    state,
    profile_photo_url
  ) VALUES (
    v_new_id,
    v_name,
    v_email,
    'TEACHER',
    v_phone,
    COALESCE(p_data->>'city', 'Kota'),
    p_data->>'state',
    p_data->>'profile_photo_url'
  );

  -- 2. Insert into public.teachers
  INSERT INTO public.teachers (
    id,
    name,
    email,
    phone,
    profile_photo_url,
    qualification,
    experience_years,
    subjects,
    classes_taught,
    city,
    state,
    current_location,
    willing_to_relocate,
    primary_role,
    secondary_roles,
    headline,
    primary_subject,
    secondary_subjects,
    specialization,
    exam_categories,
    experience_range,
    exam_prep_experience_years,
    current_organization,
    current_designation,
    work_history,
    education_records,
    work_modes,
    preferred_location,
    preferred_cities,
    availability,
    employment_types,
    salary_currency,
    salary_period,
    min_expected_salary,
    preferred_salary,
    is_salary_negotiable,
    resume_url,
    resume_name,
    profile_status,
    kyc_status,
    verification_status,
    verified,
    featured_on_homepage,
    is_admin_created,
    bio,
    teaching_mode,
    profile_visibility,
    custom_fields,
    admin_notes,
    flagged
  ) VALUES (
    v_new_id,
    v_name,
    v_email,
    v_phone,
    p_data->>'profile_photo_url',
    COALESCE(p_data->>'qualification', 'B.Tech / M.Sc'),
    COALESCE((p_data->>'experience_years')::INTEGER, 3),
    CASE WHEN p_data->'subjects' IS NOT NULL THEN (SELECT array_agg(x::text) FROM jsonb_array_elements_text(p_data->'subjects') x) ELSE ARRAY['Physics']::TEXT[] END,
    CASE WHEN p_data->'classes_taught' IS NOT NULL THEN (SELECT array_agg(x::text) FROM jsonb_array_elements_text(p_data->'classes_taught') x) ELSE '{}'::TEXT[] END,
    COALESCE(p_data->>'city', 'Kota'),
    p_data->>'state',
    p_data->>'current_location',
    COALESCE(p_data->>'willing_to_relocate', 'Yes'),
    COALESCE(p_data->>'primary_role', 'Faculty / Teacher'),
    CASE WHEN p_data->'secondary_roles' IS NOT NULL THEN (SELECT array_agg(x::text) FROM jsonb_array_elements_text(p_data->'secondary_roles') x) ELSE '{}'::TEXT[] END,
    p_data->>'headline',
    COALESCE(p_data->>'primary_subject', 'Physics'),
    CASE WHEN p_data->'secondary_subjects' IS NOT NULL THEN (SELECT array_agg(x::text) FROM jsonb_array_elements_text(p_data->'secondary_subjects') x) ELSE '{}'::TEXT[] END,
    p_data->>'specialization',
    CASE WHEN p_data->'exam_categories' IS NOT NULL THEN (SELECT array_agg(x::text) FROM jsonb_array_elements_text(p_data->'exam_categories') x) ELSE '{}'::TEXT[] END,
    p_data->>'experience_range',
    COALESCE((p_data->>'exam_prep_experience_years')::NUMERIC, 0),
    p_data->>'current_organization',
    p_data->>'current_designation',
    COALESCE(p_data->'work_history', '[]'::jsonb),
    COALESCE(p_data->'education_records', '[]'::jsonb),
    CASE WHEN p_data->'work_modes' IS NOT NULL THEN (SELECT array_agg(x::text) FROM jsonb_array_elements_text(p_data->'work_modes') x) ELSE ARRAY['Offline']::TEXT[] END,
    COALESCE(p_data->>'preferred_location', p_data->>'city', 'Kota'),
    CASE WHEN p_data->'preferred_cities' IS NOT NULL THEN (SELECT array_agg(x::text) FROM jsonb_array_elements_text(p_data->'preferred_cities') x) ELSE '{}'::TEXT[] END,
    COALESCE(p_data->>'availability', 'Immediately'),
    CASE WHEN p_data->'employment_types' IS NOT NULL THEN (SELECT array_agg(x::text) FROM jsonb_array_elements_text(p_data->'employment_types') x) ELSE ARRAY['Full Time']::TEXT[] END,
    COALESCE(p_data->>'salary_currency', 'INR'),
    COALESCE(p_data->>'salary_period', 'Annual CTC'),
    (p_data->>'min_expected_salary')::NUMERIC,
    (p_data->>'preferred_salary')::NUMERIC,
    COALESCE((p_data->>'is_salary_negotiable')::BOOLEAN, TRUE),
    p_data->>'resume_url',
    p_data->>'resume_name',
    'Active',
    'Pending',
    'Pending',
    FALSE,
    FALSE,
    TRUE,
    p_data->>'bio',
    COALESCE(p_data->>'teaching_mode', 'Offline Classroom'),
    COALESCE(p_data->>'profile_visibility', 'PUBLIC_VERIFIED_EMPLOYERS'),
    COALESCE(p_data->'custom_fields', '{}'::jsonb),
    p_data->>'admin_notes',
    COALESCE((p_data->>'flagged')::BOOLEAN, FALSE)
  );

  -- Audit log
  INSERT INTO public.verification_audit_logs (
    entity_type,
    entity_id,
    action,
    performed_by,
    performed_by_email,
    reason,
    metadata
  ) VALUES (
    'TEACHER',
    v_new_id,
    'CREATED_BY_ADMIN',
    v_admin_id,
    v_admin_email,
    'Teacher profile manually created by Admin',
    jsonb_build_object('is_admin_created', TRUE, 'name', v_name, 'email', v_email)
  );

  RETURN jsonb_build_object('success', TRUE, 'id', v_new_id);
END;
$$;

-- 6.6 Admin Create Institute Manually
CREATE OR REPLACE FUNCTION public.admin_create_institute(p_data JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_admin_id UUID := auth.uid();
  v_admin_email TEXT;
  v_new_id UUID := gen_random_uuid();
  v_name TEXT;
  v_email TEXT;
  v_phone TEXT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required.';
  END IF;

  SELECT email INTO v_admin_email FROM public.profiles WHERE id = v_admin_id;

  v_name := COALESCE(p_data->>'institute_name', 'Institute Profile');
  v_email := public.normalize_email(COALESCE(p_data->>'email', 'inst_' || substring(v_new_id::text, 1, 8) || '@eduhire.manual'));
  v_phone := public.normalize_phone(p_data->>'phone');

  -- 1. Insert into public.profiles
  INSERT INTO public.profiles (
    id,
    name,
    email,
    role,
    phone,
    city,
    state
  ) VALUES (
    v_new_id,
    v_name,
    v_email,
    'INSTITUTE',
    v_phone,
    COALESCE(p_data->>'city', 'Kota'),
    p_data->>'state'
  );

  -- 2. Insert into public.institutes
  INSERT INTO public.institutes (
    id,
    institute_name,
    tagline,
    contact_person,
    designation,
    poc_name,
    poc_designation,
    email,
    phone,
    website,
    location,
    city,
    state,
    institute_type,
    boards,
    facilities,
    student_count,
    faculty_count,
    established_year,
    branches_count,
    courses,
    status,
    verification_status,
    verified,
    featured_on_homepage,
    is_admin_created,
    profile_visibility,
    description,
    custom_fields,
    admin_notes,
    flagged
  ) VALUES (
    v_new_id,
    v_name,
    p_data->>'tagline',
    COALESCE(p_data->>'contact_person', p_data->>'poc_name'),
    COALESCE(p_data->>'designation', p_data->>'poc_designation'),
    p_data->>'poc_name',
    p_data->>'poc_designation',
    v_email,
    v_phone,
    p_data->>'website',
    p_data->>'location',
    COALESCE(p_data->>'city', 'Kota'),
    p_data->>'state',
    COALESCE(p_data->>'institute_type', 'Coaching Institute'),
    CASE WHEN p_data->'boards' IS NOT NULL THEN (SELECT array_agg(x::text) FROM jsonb_array_elements_text(p_data->'boards') x) ELSE ARRAY['CBSE / IIT-JEE / NEET']::TEXT[] END,
    CASE WHEN p_data->'facilities' IS NOT NULL THEN (SELECT array_agg(x::text) FROM jsonb_array_elements_text(p_data->'facilities') x) ELSE '{}'::TEXT[] END,
    COALESCE(p_data->>'student_count', '500+'),
    COALESCE(p_data->>'faculty_count', '25+'),
    p_data->>'established_year',
    COALESCE((p_data->>'branches_count')::INTEGER, 1),
    CASE WHEN p_data->'courses' IS NOT NULL THEN (SELECT array_agg(x::text) FROM jsonb_array_elements_text(p_data->'courses') x) ELSE '{}'::TEXT[] END,
    'Active',
    'Pending',
    FALSE,
    FALSE,
    TRUE,
    COALESCE(p_data->>'profile_visibility', 'PUBLIC'),
    p_data->>'description',
    COALESCE(p_data->'custom_fields', '{}'::jsonb),
    p_data->>'admin_notes',
    COALESCE((p_data->>'flagged')::BOOLEAN, FALSE)
  );

  INSERT INTO public.verification_audit_logs (
    entity_type,
    entity_id,
    action,
    performed_by,
    performed_by_email,
    reason,
    metadata
  ) VALUES (
    'INSTITUTE',
    v_new_id,
    'CREATED_BY_ADMIN',
    v_admin_id,
    v_admin_email,
    'Institute profile manually created by Admin',
    jsonb_build_object('is_admin_created', TRUE, 'name', v_name, 'email', v_email)
  );

  RETURN jsonb_build_object('success', TRUE, 'id', v_new_id);
END;
$$;

-- 6.7 Admin Delete Profile (Soft Archive or Permanent Delete)
CREATE OR REPLACE FUNCTION public.admin_delete_profile(
  p_entity_type TEXT,
  p_entity_id UUID,
  p_permanent BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_admin_id UUID := auth.uid();
  v_admin_email TEXT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required.';
  END IF;

  SELECT email INTO v_admin_email FROM public.profiles WHERE id = v_admin_id;

  IF p_permanent THEN
    IF p_entity_type = 'TEACHER' THEN
      DELETE FROM public.teachers WHERE id = p_entity_id;
      DELETE FROM public.profiles WHERE id = p_entity_id;
    ELSIF p_entity_type = 'INSTITUTE' THEN
      DELETE FROM public.institutes WHERE id = p_entity_id;
      DELETE FROM public.profiles WHERE id = p_entity_id;
    END IF;

    INSERT INTO public.verification_audit_logs (
      entity_type,
      entity_id,
      action,
      performed_by,
      performed_by_email,
      reason,
      metadata
    ) VALUES (
      p_entity_type,
      p_entity_id,
      'PERMANENTLY_DELETED',
      v_admin_id,
      v_admin_email,
      'Profile permanently deleted by Admin',
      jsonb_build_object('permanent', TRUE)
    );

    RETURN jsonb_build_object('success', TRUE, 'deleted', TRUE);
  ELSE
    -- Safe archive
    IF p_entity_type = 'TEACHER' THEN
      UPDATE public.teachers
      SET profile_status = 'Archived', featured_on_homepage = FALSE, updated_at = NOW()
      WHERE id = p_entity_id;
    ELSIF p_entity_type = 'INSTITUTE' THEN
      UPDATE public.institutes
      SET status = 'Archived', featured_on_homepage = FALSE, updated_at = NOW()
      WHERE id = p_entity_id;
    END IF;

    INSERT INTO public.verification_audit_logs (
      entity_type,
      entity_id,
      action,
      performed_by,
      performed_by_email,
      reason,
      metadata
    ) VALUES (
      p_entity_type,
      p_entity_id,
      'ARCHIVED',
      v_admin_id,
      v_admin_email,
      'Profile archived by Admin',
      jsonb_build_object('status', 'Archived')
    );

    RETURN jsonb_build_object('success', TRUE, 'archived', TRUE);
  END IF;
END;
$$;

-- Grant permissions on RPCs
GRANT EXECUTE ON FUNCTION public.admin_verify_profile(TEXT, UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_feature_profile(TEXT, UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_archive_profile(TEXT, UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_flag_profile(TEXT, UUID, BOOLEAN, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_teacher(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_institute(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_profile(TEXT, UUID, BOOLEAN) TO authenticated;

-- 7. RECREATE PUBLIC VIEWS SAFELY
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
  verification_status,
  featured_on_homepage,
  is_admin_created,
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
  verification_status,
  featured_on_homepage,
  is_admin_created,
  courses,
  branches_count,
  description,
  created_at
FROM public.institutes
WHERE COALESCE(status, 'Active') = 'Active'
  AND COALESCE(profile_visibility, 'PUBLIC') != 'HIDDEN';

GRANT SELECT ON public.public_teachers TO authenticated, anon;
GRANT SELECT ON public.public_institutes TO authenticated, anon;


-- ##############################################################################
-- ## migrations/20261004_server_api_architecture.sql
-- ##############################################################################

-- ==============================================================================
-- EduHire Bridge - Server API Architecture Support
-- Idempotent migration. Run after schema.sql and all earlier migrations.
--
-- 1. Google / OAuth signups no longer default to TEACHER. When a new auth user
--    has no explicit role in metadata, no profile is created; the Express API
--    creates it after the user picks a role (POST /api/auth/oauth/complete).
-- 2. Exactly one ADMIN profile is allowed (single platform administrator).
-- 3. contact_inquiries table backs the public Contact form.
-- 4. payments gains columns that link an order to what it unlocks.
-- 5. teachers.demo_video_url and notification types used by the API.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Signup trigger: require an explicit role (except for the admin email)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_role TEXT;
  v_name TEXT;
  v_phone TEXT;
  v_city TEXT;
  v_subjects TEXT[];
  v_norm_email TEXT;
  v_norm_phone TEXT;
  v_duplicate_found BOOLEAN := FALSE;
BEGIN
  v_norm_email := public.normalize_email(NEW.email);
  v_norm_phone := public.normalize_phone(NEW.raw_user_meta_data->>'phone');

  IF v_norm_email = 'admin@eduhirebridge.in' THEN
    v_role := 'ADMIN';
  ELSE
    v_role := UPPER(NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'role', '')), ''));
    -- OAuth signups carry no role: the API creates the profile once the user chooses one.
    IF v_role IS NULL OR v_role NOT IN ('TEACHER', 'INSTITUTE') THEN
      RETURN NEW;
    END IF;
  END IF;

  IF v_norm_phone IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE public.normalize_phone(phone) = v_norm_phone
        AND id != NEW.id
    ) INTO v_duplicate_found;

    IF v_duplicate_found THEN
      RAISE EXCEPTION 'DUPLICATE_ACCOUNT: An account already exists with these details. Please log in instead.';
    END IF;
  END IF;

  v_name := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', '')), '');
  IF v_name IS NULL THEN
    v_name := split_part(NEW.email, '@', 1);
  END IF;

  v_phone := v_norm_phone;
  v_city := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'city', '')), '');

  INSERT INTO public.profiles (id, name, email, role, phone, city)
  VALUES (NEW.id, v_name, v_norm_email, v_role, v_phone, v_city)
  ON CONFLICT (id) DO UPDATE
  SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
    city = COALESCE(EXCLUDED.city, public.profiles.city),
    updated_at = NOW();

  IF v_role = 'TEACHER' THEN
    IF NEW.raw_user_meta_data->'subjects' IS NOT NULL AND jsonb_typeof(NEW.raw_user_meta_data->'subjects') = 'array' THEN
      SELECT COALESCE(array_agg(x::text), '{}'::TEXT[]) INTO v_subjects
      FROM jsonb_array_elements_text(NEW.raw_user_meta_data->'subjects') AS x;
    ELSIF NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'subject', '')), '') IS NOT NULL THEN
      v_subjects := ARRAY[TRIM(NEW.raw_user_meta_data->>'subject')];
    ELSE
      v_subjects := '{}'::TEXT[];
    END IF;

    INSERT INTO public.teachers (
      id, name, email, phone, subjects, primary_subject, city, preferred_location,
      profile_status, kyc_status, verified, premium_badge
    )
    VALUES (
      NEW.id, v_name, v_norm_email, v_phone, v_subjects,
      NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'subject', '')), ''),
      v_city, v_city, 'Active', 'Pending', FALSE, FALSE
    )
    ON CONFLICT (id) DO UPDATE
    SET
      name = EXCLUDED.name,
      email = EXCLUDED.email,
      phone = COALESCE(EXCLUDED.phone, public.teachers.phone),
      updated_at = NOW();

  ELSIF v_role = 'INSTITUTE' THEN
    INSERT INTO public.institutes (
      id, institute_name, email, phone, city, institute_type, verification_status, verified, plan
    )
    VALUES (
      NEW.id, v_name, v_norm_email, v_phone, v_city,
      NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'institute_type', '')), ''),
      'Pending', FALSE, 'Standard'
    )
    ON CONFLICT (id) DO UPDATE
    SET
      institute_name = EXCLUDED.institute_name,
      email = EXCLUDED.email,
      phone = COALESCE(EXCLUDED.phone, public.institutes.phone),
      updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 2. Single platform administrator
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_single_admin
    ON public.profiles ((role))
    WHERE role = 'ADMIN';
EXCEPTION
  WHEN unique_violation THEN
    RAISE NOTICE 'More than one ADMIN profile exists. Demote extra admins, then re-run this migration.';
END $$;

-- ------------------------------------------------------------------------------
-- 3. Contact inquiries (public contact form)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contact_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'IN_PROGRESS', 'RESOLVED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contact_inquiries_created_at ON public.contact_inquiries(created_at DESC);

ALTER TABLE public.contact_inquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage contact inquiries" ON public.contact_inquiries;
CREATE POLICY "Admins manage contact inquiries"
  ON public.contact_inquiries FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- 4. Payments: link each order to what it pays for
-- ------------------------------------------------------------------------------
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS purpose_type TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS target_id UUID;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS captured_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_payer ON public.payments(payer_id);

-- ------------------------------------------------------------------------------
-- 5. Columns and enum values used by the API
-- ------------------------------------------------------------------------------
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS demo_video_url TEXT;

DO $$
BEGIN
  ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
  ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
    CHECK (type IN ('INFO', 'APPLICATION', 'INTERVIEW', 'KYC', 'PAYMENT', 'SYSTEM', 'MATCH'));
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

NOTIFY pgrst, 'reload schema';


-- ##############################################################################
-- ## migrations/20261005_email_services.sql
-- ##############################################################################

-- ==============================================================================
-- 2026-10-05 · Email services (Nodemailer)
--   1. email_otps            — one-time codes for email verification (sign-up)
--   2. newsletter_subscribers — public subscribe / unsubscribe list
--   3. email_broadcasts       — admin email campaigns (audit + delivery counts)
--   4. email_logs             — per-recipient delivery log
--   5. Institute email preference column
-- All tables are written only by the API with the service-role key; RLS is on
-- and only admins may read them directly.
-- ==============================================================================

-- 1. One-time passcodes ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.email_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('SIGNUP', 'EMAIL_CHANGE', 'LOGIN')),
  code_hash TEXT NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  consumed_at TIMESTAMPTZ,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_otps_lookup ON public.email_otps(lower(email), purpose, created_at DESC);

ALTER TABLE public.email_otps ENABLE ROW LEVEL SECURITY;
-- No policies: only the service role (API) can read or write OTP rows.

-- 2. Newsletter subscribers -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  name TEXT,
  role TEXT CHECK (role IS NULL OR role IN ('TEACHER', 'INSTITUTE', 'OTHER')),
  status TEXT NOT NULL DEFAULT 'SUBSCRIBED' CHECK (status IN ('SUBSCRIBED', 'UNSUBSCRIBED')),
  unsubscribe_token TEXT NOT NULL DEFAULT (replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')),
  source TEXT,
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unsubscribed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_newsletter_email ON public.newsletter_subscribers(lower(email));
CREATE UNIQUE INDEX IF NOT EXISTS idx_newsletter_token ON public.newsletter_subscribers(unsubscribe_token);

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read subscribers" ON public.newsletter_subscribers;
CREATE POLICY "Admins read subscribers"
  ON public.newsletter_subscribers FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- 3. Email broadcasts -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.email_broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  audience TEXT NOT NULL CHECK (audience IN ('ALL', 'TEACHER', 'INSTITUTE', 'SUBSCRIBERS', 'SELECTED')),
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  cta_label TEXT,
  cta_url TEXT,
  recipients_count INT NOT NULL DEFAULT 0,
  sent_count INT NOT NULL DEFAULT 0,
  failed_count INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED', 'SENDING', 'COMPLETED', 'FAILED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_email_broadcasts_created ON public.email_broadcasts(created_at DESC);

ALTER TABLE public.email_broadcasts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read email broadcasts" ON public.email_broadcasts;
CREATE POLICY "Admins read email broadcasts"
  ON public.email_broadcasts FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- 4. Delivery log ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email TEXT NOT NULL,
  template TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('SENT', 'FAILED', 'SKIPPED')),
  error TEXT,
  message_id TEXT,
  broadcast_id UUID REFERENCES public.email_broadcasts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_logs_created ON public.email_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_broadcast ON public.email_logs(broadcast_id);

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read email logs" ON public.email_logs;
CREATE POLICY "Admins read email logs"
  ON public.email_logs FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- 5. Preferences ------------------------------------------------------------------
-- Teachers already have job_alerts_enabled / application_updates_enabled /
-- interview_notifications_enabled / employer_interest_enabled.
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS marketing_emails_enabled BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.institutes ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.institutes ADD COLUMN IF NOT EXISTS marketing_emails_enabled BOOLEAN NOT NULL DEFAULT TRUE;

NOTIFY pgrst, 'reload schema';


-- ##############################################################################
-- ## migrations/20261005_admin_via_api_only.sql
-- ##############################################################################

-- ==============================================================================
-- 2026-10-05 · Admin role is granted by the API / SQL editor only
-- Removes the hard-coded "admin@eduhirebridge.in → ADMIN" rule from the signup
-- trigger. The API still creates the admin profile for the ADMIN_EMAIL set in
-- server/.env (once), so changing admins no longer leaves a backdoor address.
-- Everything else in handle_new_user is unchanged.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_role TEXT;
  v_name TEXT;
  v_phone TEXT;
  v_city TEXT;
  v_subjects TEXT[];
  v_norm_email TEXT;
  v_norm_phone TEXT;
  v_duplicate_found BOOLEAN := FALSE;
BEGIN
  v_norm_email := public.normalize_email(NEW.email);
  v_norm_phone := public.normalize_phone(NEW.raw_user_meta_data->>'phone');

  -- Only self-service roles are trusted from signup metadata (anyone can call
  -- Supabase signUp with the public key). The single ADMIN profile is created
  -- by the API for the configured ADMIN_EMAIL, or assigned in the SQL editor.
  v_role := UPPER(NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'role', '')), ''));
  -- OAuth signups carry no role: the API creates the profile once the user chooses one.
  IF v_role IS NULL OR v_role NOT IN ('TEACHER', 'INSTITUTE') THEN
    RETURN NEW;
  END IF;

  IF v_norm_phone IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE public.normalize_phone(phone) = v_norm_phone
        AND id != NEW.id
    ) INTO v_duplicate_found;

    IF v_duplicate_found THEN
      RAISE EXCEPTION 'DUPLICATE_ACCOUNT: An account already exists with these details. Please log in instead.';
    END IF;
  END IF;

  v_name := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', '')), '');
  IF v_name IS NULL THEN
    v_name := split_part(NEW.email, '@', 1);
  END IF;

  v_phone := v_norm_phone;
  v_city := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'city', '')), '');

  INSERT INTO public.profiles (id, name, email, role, phone, city)
  VALUES (NEW.id, v_name, v_norm_email, v_role, v_phone, v_city)
  ON CONFLICT (id) DO UPDATE
  SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
    city = COALESCE(EXCLUDED.city, public.profiles.city),
    updated_at = NOW();

  IF v_role = 'TEACHER' THEN
    IF NEW.raw_user_meta_data->'subjects' IS NOT NULL AND jsonb_typeof(NEW.raw_user_meta_data->'subjects') = 'array' THEN
      SELECT COALESCE(array_agg(x::text), '{}'::TEXT[]) INTO v_subjects
      FROM jsonb_array_elements_text(NEW.raw_user_meta_data->'subjects') AS x;
    ELSIF NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'subject', '')), '') IS NOT NULL THEN
      v_subjects := ARRAY[TRIM(NEW.raw_user_meta_data->>'subject')];
    ELSE
      v_subjects := '{}'::TEXT[];
    END IF;

    INSERT INTO public.teachers (
      id, name, email, phone, subjects, primary_subject, city, preferred_location,
      profile_status, kyc_status, verified, premium_badge
    )
    VALUES (
      NEW.id, v_name, v_norm_email, v_phone, v_subjects,
      NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'subject', '')), ''),
      v_city, v_city, 'Active', 'Pending', FALSE, FALSE
    )
    ON CONFLICT (id) DO UPDATE
    SET
      name = EXCLUDED.name,
      email = EXCLUDED.email,
      phone = COALESCE(EXCLUDED.phone, public.teachers.phone),
      updated_at = NOW();

  ELSIF v_role = 'INSTITUTE' THEN
    INSERT INTO public.institutes (
      id, institute_name, email, phone, city, institute_type, verification_status, verified, plan
    )
    VALUES (
      NEW.id, v_name, v_norm_email, v_phone, v_city,
      NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'institute_type', '')), ''),
      'Pending', FALSE, 'Standard'
    )
    ON CONFLICT (id) DO UPDATE
    SET
      institute_name = EXCLUDED.institute_name,
      email = EXCLUDED.email,
      phone = COALESCE(EXCLUDED.phone, public.institutes.phone),
      updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';


-- ##############################################################################
-- ## migrations/20261006_user_sessions.sql
-- ##############################################################################

-- ==============================================================================
-- 2026-10-06 · Server-managed sessions (refresh tokens stored in the database)
--
-- Each login creates one row. The browser holds an opaque refresh token in an
-- httpOnly cookie; only its SHA-256 hash is stored here. The token rotates on
-- every refresh, and presenting an already-rotated token (theft / replay)
-- revokes the whole session. The upstream Supabase refresh token is stored
-- AES-256-GCM encrypted and never leaves the server.
-- Only the API (service role) touches this table.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Current opaque refresh token (hash only) and the one it replaced.
  refresh_token_hash TEXT NOT NULL,
  previous_token_hash TEXT,
  rotated_at TIMESTAMPTZ,
  rotation_count INT NOT NULL DEFAULT 0,

  -- Upstream Supabase session (encrypted refresh token + session id from the JWT).
  supabase_refresh_token_enc TEXT NOT NULL,
  supabase_session_id TEXT,

  -- Device info for the "active sessions" list.
  user_agent TEXT,
  ip_address TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_sessions_token ON public.user_sessions(refresh_token_hash);
CREATE INDEX IF NOT EXISTS idx_user_sessions_previous ON public.user_sessions(previous_token_hash) WHERE previous_token_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON public.user_sessions(user_id, revoked_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_supabase ON public.user_sessions(supabase_session_id) WHERE revoked_at IS NULL;

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
-- No policies: browsers can never read session rows or token hashes directly.

-- Housekeeping: delete sessions that expired or were revoked more than 30 days ago.
-- Run manually, or schedule with pg_cron:
--   SELECT cron.schedule('purge-sessions', '0 3 * * *', 'SELECT public.purge_old_sessions()');
CREATE OR REPLACE FUNCTION public.purge_old_sessions()
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH deleted AS (
    DELETE FROM public.user_sessions
    WHERE expires_at < NOW() - INTERVAL '30 days'
       OR revoked_at < NOW() - INTERVAL '30 days'
    RETURNING 1
  )
  SELECT COUNT(*)::INTEGER FROM deleted;
$$;

REVOKE ALL ON FUNCTION public.purge_old_sessions() FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';


NOTIFY pgrst, 'reload schema';
