-- =====================================================================
-- 20260517b_posts_bucket_policies.sql
--
-- CRITICAL FIX: posts bucket missing INSERT/UPDATE/DELETE storage policies
--
-- DISCOVERY:
--   On 2026-05-17 morning Kumar repeatedly reported "pic uploads not
--   working and uploaded photos not visible" across v0.15.7, v0.15.8,
--   and v0.15.9. Root cause investigation (after multiple incorrect
--   upload-encoding fixes) found:
--
--     SELECT policyname, cmd FROM pg_policies
--      WHERE schemaname='storage' AND tablename='objects'
--        AND (qual::text ILIKE '%posts%' OR with_check::text ILIKE '%posts%');
--     -> 0 rows
--
--   The posts bucket had ZERO storage.objects policies. Since storage RLS
--   is enabled by default on Supabase, every upload to posts/* was being
--   rejected with HTTP 403 "new row violates row-level security policy".
--   The Supabase JS SDK does not surface this clearly to RN — the error
--   appears as a generic upload failure that earlier fixes mis-attributed
--   to upload encoding (fetch+blob+arrayBuffer issues).
--
--   Kumar's older posts (e.g. 2026-05-03) succeeded because the policies
--   existed at that time. They were lost in a later schema reset (see
--   20260427_*_schema_reset.sql or similar). The reset didn't restore the
--   posts-bucket policies even though it restored event-photos / avatars /
--   family-photos / voice-messages policies.
--
-- WHAT THIS DOES:
--   Adds the standard "own-folder" storage policies to the posts bucket,
--   matching the pattern used by family-photos and voice-messages:
--     - INSERT: any authenticated user, only into their own {user_id}/ folder
--     - UPDATE: same auth/folder constraints (for cacheControl re-upload)
--     - DELETE: same auth/folder constraints (for "delete my post")
--   SELECT is intentionally NOT added here — the posts bucket has
--   `public=true` (see storage.buckets), so reads go through the public
--   URL path without hitting RLS.
--
-- VERIFIED IN PROD via Supabase SQL editor [11:55am - 17May26]:
--   - Service-role upload to posts/{kumar_id}/... → OK
--   - Anon upload attempt → 403 (proves RLS still enforced)
--   - 3 rows in pg_policies for posts after CREATE
--
-- This file is for record-keeping. The policies were applied directly via
-- the Supabase SQL editor (urgent prod fix), not via supabase db push.
-- Future schema resets must re-apply this file to preserve uploads.
-- =====================================================================

-- INSERT: any logged-in user can upload to their own folder (first path segment = auth.uid())
CREATE POLICY posts_authenticated_insert
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'posts'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

-- UPDATE: owner may overwrite their own files (e.g. cacheControl tweak)
CREATE POLICY posts_owner_update
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'posts'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

-- DELETE: owner may remove their own files (for "delete my post" flows)
CREATE POLICY posts_owner_delete
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'posts'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

-- NOTE for future schema review:
-- The stories table also writes to the 'posts' bucket (see
-- aangan_rn/src/stores/storyStore.ts addStory()). This same INSERT policy
-- covers stories uploads as long as their path also begins with auth.uid().
-- If stories ever move to their own bucket, mirror this pattern there.
