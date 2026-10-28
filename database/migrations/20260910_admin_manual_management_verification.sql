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
