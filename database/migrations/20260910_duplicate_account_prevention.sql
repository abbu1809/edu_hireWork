-- ==============================================================================
-- EduHire Bridge - Duplicate Account Prevention & Cross-Role Identity Verification
-- Idempotent Migration: Normalizes Email & Phone across Teacher and Institute Roles
-- ==============================================================================

-- 1. IMMUTABLE EMAIL NORMALIZATION FUNCTION
CREATE OR REPLACE FUNCTION public.normalize_email(raw_email TEXT)
RETURNS TEXT AS $$
BEGIN
  IF raw_email IS NULL OR TRIM(raw_email) = '' THEN
    RETURN NULL;
  END IF;
  RETURN LOWER(TRIM(raw_email));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 2. IMMUTABLE PHONE NORMALIZATION FUNCTION (Indian Standard & Universal Canonical)
CREATE OR REPLACE FUNCTION public.normalize_phone(raw_phone TEXT)
RETURNS TEXT AS $$
DECLARE
  digits TEXT;
BEGIN
  IF raw_phone IS NULL OR TRIM(raw_phone) = '' THEN
    RETURN NULL;
  END IF;

  -- Strip all non-digit characters
  digits := regexp_replace(raw_phone, '[^0-9]', '', 'g');

  -- Handle 12-digit Indian mobile numbers with country code (91XXXXXXXXXX)
  IF length(digits) = 12 AND digits LIKE '91%' THEN
    digits := substring(digits FROM 3);
  -- Handle 11-digit numbers with leading 0 (0XXXXXXXXXX)
  ELSIF length(digits) = 11 AND digits LIKE '0%' THEN
    digits := substring(digits FROM 2);
  END IF;

  -- Canonical 10-digit format prefixed with +91
  IF length(digits) = 10 THEN
    RETURN '+91' || digits;
  ELSIF length(digits) > 0 THEN
    RETURN '+' || digits;
  ELSE
    RETURN NULL;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 3. CROSS-ROLE PRE-FLIGHT DUPLICATE CHECK RPC
-- Accessible to public/anon for pre-registration validation without exposing sensitive data
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
  v_existing_role TEXT;
BEGIN
  v_norm_email := public.normalize_email(p_email);
  v_norm_phone := public.normalize_phone(p_phone);

  -- 1. Check Email across public.profiles & auth.users
  IF v_norm_email IS NOT NULL THEN
    -- Check profiles
    SELECT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE public.normalize_email(email) = v_norm_email
        AND (p_exclude_user_id IS NULL OR id != p_exclude_user_id)
    ) INTO v_email_exists;

    -- If not in profiles, check auth.users directly
    IF NOT v_email_exists THEN
      SELECT EXISTS (
        SELECT 1 FROM auth.users
        WHERE LOWER(TRIM(email)) = v_norm_email
          AND (p_exclude_user_id IS NULL OR id != p_exclude_user_id)
      ) INTO v_email_exists;
    END IF;
  END IF;

  -- 2. Check Phone across public.profiles, public.teachers, and public.institutes
  IF v_norm_phone IS NOT NULL THEN
    -- Check public.profiles
    SELECT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE public.normalize_phone(phone) = v_norm_phone
        AND (p_exclude_user_id IS NULL OR id != p_exclude_user_id)
    ) INTO v_phone_exists;

    -- Check public.teachers
    IF NOT v_phone_exists THEN
      SELECT EXISTS (
        SELECT 1 FROM public.teachers
        WHERE public.normalize_phone(phone) = v_norm_phone
          AND (p_exclude_user_id IS NULL OR id != p_exclude_user_id)
      ) INTO v_phone_exists;
    END IF;

    -- Check public.institutes
    IF NOT v_phone_exists THEN
      SELECT EXISTS (
        SELECT 1 FROM public.institutes
        WHERE public.normalize_phone(phone) = v_norm_phone
          AND (p_exclude_user_id IS NULL OR id != p_exclude_user_id)
      ) INTO v_phone_exists;
    END IF;

    -- Check auth.users metadata
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

  -- If duplicate found by either email or phone
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

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.normalize_email(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.normalize_phone(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_account_exists(TEXT, TEXT, UUID) TO anon, authenticated, service_role;

-- 4. HARDEN PUBLIC.HANDLE_NEW_USER TRIGGER (SUPABASE AUTH SIGNUP)
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

  -- Verify Phone uniqueness before inserting
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

  -- 2. Insert into role-specific table
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

-- 5. TRIGGER ON PROFILES TO ENFORCE NORMALIZATION & CROSS-ROLE PHONE UNIQUENESS
CREATE OR REPLACE FUNCTION public.enforce_profile_identity_uniqueness()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_duplicate_exists BOOLEAN := FALSE;
BEGIN
  -- Normalize email and phone
  IF NEW.email IS NOT NULL THEN
    NEW.email := public.normalize_email(NEW.email);
  END IF;

  IF NEW.phone IS NOT NULL THEN
    NEW.phone := public.normalize_phone(NEW.phone);
    
    -- Check if another profile already has this phone
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

-- 6. PARTIAL UNIQUE INDEX ON PROFILES PHONE
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_phone_unique
ON public.profiles (public.normalize_phone(phone))
WHERE phone IS NOT NULL AND TRIM(phone) != '';
