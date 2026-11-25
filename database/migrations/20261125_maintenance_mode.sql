-- ==============================================================================
-- Migration: Maintenance Mode Settings
-- Date: 2026-11-25
-- ==============================================================================

INSERT INTO public.platform_settings (key, value, description)
VALUES
  ('maintenance_mode', 'false'::jsonb, 'When true, only admins can access the platform'),
  ('maintenance_message', '"FacultyKart is currently undergoing scheduled maintenance. We will be back shortly."'::jsonb, 'Message shown to visitors during maintenance')
ON CONFLICT (key) DO NOTHING;

NOTIFY pgrst, 'reload schema';
