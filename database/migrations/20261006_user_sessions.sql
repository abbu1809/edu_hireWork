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
