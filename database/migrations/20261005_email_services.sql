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
