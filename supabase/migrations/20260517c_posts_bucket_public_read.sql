-- =====================================================================
-- 20260517c_posts_bucket_public_read.sql
--
-- CRITICAL FIX (v0.16.1): posts bucket is public=false with NO SELECT
-- policy → getPublicUrl returns a URL that 403s. Uploads succeed (after
-- 20260517b added INSERT/UPDATE/DELETE policies), but the RN <Image>
-- component cannot fetch the bytes, so feed photos render as the
-- "फ़ोटो" placeholder.
--
-- DISCOVERY:
--   Kumar reported [5:48pm - 17May26] "Uploaded photos not visible in feed"
--   on TestFlight v0.16.0 (build 27). Investigation found:
--
--     supabase_migration_v2.sql:755 originally created posts as:
--       INSERT INTO storage.buckets (id, name, public)
--       VALUES ('posts', 'posts', false);
--
--     20260517b_posts_bucket_policies.sql claimed in its NOTE comment
--     that posts was public=true — that was incorrect. The bucket was
--     never flipped. No SELECT policy exists either, so the public-URL
--     route returns 403 / private-bucket error.
--
--   Working buckets for comparison:
--     family-photos  → public=true + public_read SELECT policy   ✓
--     event-photos   → public=true + (read via inherited public)  ✓
--     avatars        → public=true                                 ✓
--     voice-messages → public=false + owner-only SELECT policy    ✓
--     posts          → public=false + NO SELECT policy            ✗
--
-- DECISION — match family-photos pattern (public bucket + SELECT policy):
--   Aangan is a family social network. The `posts` table RLS already
--   controls WHO can read a given post row (audience_type / audience_level /
--   post_audience). The storage layer just serves bytes. Making the bucket
--   public has the same effective privacy posture as family-photos /
--   event-photos / avatars, which already hold sensitive family content.
--   The path includes a random suffix, so URLs are not enumerable.
--
--   Alternative considered: keep private + use createSignedUrl on every
--   feed render. Rejected — adds a server roundtrip per image per feed
--   refresh, hurts grandma-on-2G UX, and breaks RN <Image> caching.
--
-- WHAT THIS DOES:
--   1. Flip posts bucket to public=true (idempotent)
--   2. Add size limit (20 MiB) and MIME allowlist (gap left by
--      20260429g_storage_bucket_limits which skipped posts)
--   3. Add public_read SELECT policy on storage.objects for the posts bucket
--
-- ROLLBACK if this proves wrong:
--   UPDATE storage.buckets SET public = false WHERE id = 'posts';
--   DROP POLICY "posts_public_read" ON storage.objects;
--   (and switch RN to createSignedUrl + Authorization header on Image)
-- =====================================================================

BEGIN;

-- 1. Flip bucket to public + set size/MIME limits (idempotent upsert)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'posts',
    'posts',
    true,
    20 * 1024 * 1024,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'video/mp4', 'video/quicktime']
)
ON CONFLICT (id) DO UPDATE
SET public             = TRUE,
    file_size_limit    = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Public-read SELECT policy on objects (mirrors family_photos_public_read)
DROP POLICY IF EXISTS "posts_public_read" ON storage.objects;
CREATE POLICY "posts_public_read" ON storage.objects
    FOR SELECT USING (bucket_id = 'posts');

COMMIT;

-- =====================================================================
-- Verification (run in Supabase SQL editor after apply):
--
--   -- bucket flag flipped
--   SELECT id, public, file_size_limit, allowed_mime_types
--   FROM storage.buckets WHERE id = 'posts';
--   -- expected: public=t, 20971520, ARRAY[image/jpeg,...]
--
--   -- 4 policies on posts (3 write from 20260517b + 1 read from this file)
--   SELECT policyname, cmd FROM pg_policies
--    WHERE schemaname='storage' AND tablename='objects'
--      AND (qual::text ILIKE '%''posts''%' OR with_check::text ILIKE '%''posts''%')
--    ORDER BY cmd, policyname;
--   -- expected: posts_authenticated_insert (INSERT)
--   --           posts_owner_delete (DELETE)
--   --           posts_public_read  (SELECT)   ← new
--   --           posts_owner_update (UPDATE)
--
--   -- end-to-end: anon GET of a posts/* object should 200
--   curl -I "https://<project>.supabase.co/storage/v1/object/public/posts/<uid>/<file>"
--   -- expected: HTTP/2 200
-- =====================================================================
