-- ============================================================
-- Aangan v0.2.3 — Guest QR Photo Upload Support
-- Run in Supabase SQL Editor AFTER v0.2.2 migration
-- ============================================================

-- 1. Allow uploader_id to be NULL for guest uploads
ALTER TABLE public.event_photos
  ALTER COLUMN uploader_id DROP NOT NULL;

-- 2. Add guest_name and is_video columns
ALTER TABLE public.event_photos
  ADD COLUMN IF NOT EXISTS guest_name TEXT,
  ADD COLUMN IF NOT EXISTS is_video BOOLEAN NOT NULL DEFAULT FALSE;

-- Constraint: either uploader_id or guest_name must be present
ALTER TABLE public.event_photos
  ADD CONSTRAINT uploader_or_guest
  CHECK (uploader_id IS NOT NULL OR (guest_name IS NOT NULL AND guest_name <> ''));

-- 3. Index for finding guest uploads per event
CREATE INDEX IF NOT EXISTS idx_event_photos_event_id
  ON public.event_photos(event_id);

CREATE INDEX IF NOT EXISTS idx_event_photos_guest
  ON public.event_photos(event_id, guest_name)
  WHERE guest_name IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_event_photos_uploader
  ON public.event_photos(uploader_id)
  WHERE uploader_id IS NOT NULL;

-- 4. Storage bucket policy: allow anonymous uploads to event-photos
-- Run this in Supabase Dashboard → Storage → event-photos → Policies
-- OR use the SQL below (requires storage schema access):

-- Allow public read of approved photos
DO $$
BEGIN
  INSERT INTO storage.policies (bucket_id, name, definition, check_definition, command, roles)
  VALUES (
    'event-photos',
    'Allow public read of event photos',
    'TRUE',
    NULL,
    'SELECT',
    ARRAY['anon', 'authenticated']
  ) ON CONFLICT DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Storage policy insert skipped (run via Supabase Dashboard instead): %', SQLERRM;
END $$;

-- Allow anonymous uploads (guests scanning QR code)
DO $$
BEGIN
  INSERT INTO storage.policies (bucket_id, name, definition, check_definition, command, roles)
  VALUES (
    'event-photos',
    'Allow guest uploads to event-photos',
    NULL,
    '(bucket_id = ''event-photos''::text)',
    'INSERT',
    ARRAY['anon', 'authenticated']
  ) ON CONFLICT DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Storage policy insert skipped (run via Supabase Dashboard instead): %', SQLERRM;
END $$;

-- ============================================================
-- SUPABASE DASHBOARD STEPS (if SQL above fails for storage):
-- 1. Go to Storage → Buckets → event-photos
-- 2. Make bucket PUBLIC (toggle)
-- 3. Add policies:
--    a. SELECT: Allow for "anon" and "authenticated" roles
--    b. INSERT: Allow for "anon" (with bucket_id = 'event-photos' check)
-- ============================================================

-- 5. Add SUPABASE_SERVICE_ROLE_KEY reminder
-- The API route /api/guest-upload requires this env var.
-- Add to aangan_web/.env.local:
--   SUPABASE_SERVICE_ROLE_KEY=<your service role key from Supabase Settings → API>

-- ============================================================
-- VERIFICATION QUERY — run after applying migration:
-- ============================================================
-- SELECT column_name, is_nullable, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'event_photos'
--   AND column_name IN ('uploader_id', 'guest_name', 'is_video')
-- ORDER BY column_name;
