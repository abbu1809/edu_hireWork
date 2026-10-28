-- ==============================================================================
-- EduHire Bridge — FULL RESET (DESTRUCTIVE, for testing only)
-- ------------------------------------------------------------------------------
-- Wipes everything EduHire created so setup_fresh_database.sql can run on a
-- clean slate. Use it when an existing project has older tables/columns.
--
--   1. Supabase → SQL Editor → New query → paste THIS file → Run
--   2. New query → paste setup_fresh_database.sql → Run
--   3. Register again with ADMIN_EMAIL to recreate the admin account
--
-- Deletes: every table, view and function in the public schema (all app data),
--          the signup trigger on auth.users, and ALL auth users (accounts).
-- Keeps:   storage buckets and uploaded files (empty them in Supabase →
--          Storage if you want), extensions, and project settings.
-- There is no undo. Never run this on a production database.
-- ==============================================================================

-- 1. Signup trigger lives on auth.users, outside the public schema.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Views, then tables (CASCADE also removes their triggers, policies and FKs).
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT viewname FROM pg_views WHERE schemaname = 'public' LOOP
    EXECUTE format('DROP VIEW IF EXISTS public.%I CASCADE', r.viewname);
  END LOOP;

  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('DROP TABLE IF EXISTS public.%I CASCADE', r.tablename);
  END LOOP;
END $$;

-- 3. Functions (all overloads), skipping anything owned by an extension.
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind IN ('f', 'p')
      AND NOT EXISTS (
        SELECT 1 FROM pg_depend d
        WHERE d.objid = p.oid AND d.deptype = 'e'
      )
  LOOP
    EXECUTE format('DROP ROUTINE IF EXISTS %s CASCADE', r.sig);
  END LOOP;
END $$;

-- 4. Accounts. Profiles were just dropped, so old logins would have no profile.
DELETE FROM auth.users;
