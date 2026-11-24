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

-- 3. Update handle_new_user() trigger to automatically set ADMIN for facultykart@gmail.com
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role TEXT;
  v_name TEXT;
  v_phone TEXT;
  v_city TEXT;
  v_norm_email TEXT;
  v_norm_phone TEXT;
  v_duplicate_found BOOLEAN;
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

  -- Automatically assign ADMIN role for facultykart@gmail.com & admin@facultykart.in
  IF v_norm_email IN ('facultykart@gmail.com', 'admin@facultykart.in') THEN
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
    role = CASE WHEN v_norm_email IN ('facultykart@gmail.com', 'admin@facultykart.in') THEN 'ADMIN' ELSE public.profiles.role END,
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
    city = COALESCE(EXCLUDED.city, public.profiles.city),
    updated_at = NOW();

  -- 2. Insert into role-specific table with clean data
  IF v_role = 'TEACHER' THEN
    INSERT INTO public.teachers (
      id, name, email, phone, city,
      primary_subject, subjects, qualification, experience_years, resume_url
    )
    VALUES (
      NEW.id, v_name, v_norm_email, v_phone, v_city,
      NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'subject', '')), ''),
      CASE
        WHEN NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'subject', '')), '') IS NOT NULL
        THEN ARRAY[TRIM(NEW.raw_user_meta_data->>'subject')]
        ELSE '{}'::text[]
      END,
      NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'qualification', '')), ''),
      COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'experience_years'), '')::integer, 0),
      NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'resume_url', '')), '')
    )
    ON CONFLICT (id) DO UPDATE
    SET
      name = EXCLUDED.name,
      email = EXCLUDED.email,
      phone = COALESCE(EXCLUDED.phone, public.teachers.phone),
      city = COALESCE(EXCLUDED.city, public.teachers.city),
      updated_at = NOW();

  ELSIF v_role = 'INSTITUTE' THEN
    INSERT INTO public.institutes (
      id, institute_name, email, phone, city, institute_type
    )
    VALUES (
      NEW.id, v_name, v_norm_email, v_phone, v_city,
      COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'institute_type'), ''), 'Coaching Institute')
    )
    ON CONFLICT (id) DO UPDATE
    SET
      institute_name = EXCLUDED.institute_name,
      email = EXCLUDED.email,
      phone = COALESCE(EXCLUDED.phone, public.institutes.phone),
      city = COALESCE(EXCLUDED.city, public.institutes.city),
      updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$$;
