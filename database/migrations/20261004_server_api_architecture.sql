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
