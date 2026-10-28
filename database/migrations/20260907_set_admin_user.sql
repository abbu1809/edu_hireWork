-- ==============================================================================
-- Migration: 20260907_set_admin_user.sql
-- Set admin@eduhirebridge.in as SuperAdmin in public.profiles
-- ==============================================================================

-- 1. If a profile already exists for admin@eduhirebridge.in, elevate it to ADMIN
UPDATE public.profiles
SET role = 'ADMIN', updated_at = NOW()
WHERE LOWER(email) = 'admin@eduhirebridge.in';

-- 2. Update handle_new_user() trigger function to auto-assign ADMIN to admin@eduhirebridge.in upon registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS 
DECLARE
  v_role TEXT;
  v_name TEXT;
  v_phone TEXT;
  v_city TEXT;
  v_subjects TEXT[];
BEGIN
  -- Automatically assign ADMIN role for admin@eduhirebridge.in
  IF LOWER(NEW.email) = 'admin@eduhirebridge.in' THEN
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

  v_phone := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'phone', '')), '');
  v_city := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'city', '')), '');

  -- 1. Insert into public.profiles
  INSERT INTO public.profiles (id, name, email, role, phone, city)
  VALUES (NEW.id, v_name, NEW.email, v_role, v_phone, v_city)
  ON CONFLICT (id) DO UPDATE
  SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
    city = COALESCE(EXCLUDED.city, public.profiles.city),
    updated_at = NOW();

  -- 2. If Teacher, insert base educator profile
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
      NEW.email,
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
    ON CONFLICT (id) DO NOTHING;

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
      NEW.email,
      v_phone,
      v_city,
      NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'institute_type', '')), ''),
      'Pending',
      FALSE,
      'Standard'
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
;
