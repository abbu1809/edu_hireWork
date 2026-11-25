-- ==============================================================================
-- Migration: Faculty Platform Fee (₹9) & Admin Assignment (facultykart@gmail.com)
-- Date: 2026-11-24
-- ==============================================================================

-- 1. Add platform fee columns to teachers
ALTER TABLE public.teachers
  ADD COLUMN IF NOT EXISTS is_platform_fee_paid BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS platform_fee_paid_at TIMESTAMPTZ;

-- 2. Update existing profiles and auth.users for facultykart@gmail.com
UPDATE public.profiles
SET role = 'ADMIN', updated_at = NOW()
WHERE LOWER(email) = 'facultykart@gmail.com';

UPDATE auth.users
SET
  raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role": "ADMIN"}'::jsonb,
  raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role": "ADMIN"}'::jsonb
WHERE LOWER(email) = 'facultykart@gmail.com';

-- 3. Update handle_new_user() trigger:
--    - Auto-assigns ADMIN for facultykart@gmail.com (and admin@facultykart.in)
--    - Preserves OAuth flow: if no role is present in metadata for non-admin users,
--      returns NEW without creating a profile so /auth/callback can ask the user
--      to choose Teacher or Institute.
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

  IF v_norm_email IN ('facultykart@gmail.com', 'admin@facultykart.in') THEN
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
    role = CASE WHEN v_norm_email IN ('facultykart@gmail.com', 'admin@facultykart.in') THEN 'ADMIN' ELSE public.profiles.role END,
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
