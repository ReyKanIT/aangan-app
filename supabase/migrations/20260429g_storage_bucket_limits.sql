-- ============================================================================
-- Migration: 20260429g_storage_bucket_limits
-- P1 — bound every storage bucket to a sane file-size limit and MIME allowlist.
-- ----------------------------------------------------------------------------
-- Finding (audit 2026-04-29):
--   * `event-photos` allowed anonymous INSERT (v0.2.3_guest_upload.sql:32-66)
--     with no file_size_limit and no allowed_mime_types — a cost bomb +
--     abuse vector (illegal media uploaded under your project tag).
--   * `family-photos` (20260427_family_member_extended_fields.sql:28) is
--     authenticated-only and path-scoped, but still has no MIME / size guard.
--   * Voice-message and avatar buckets — if they exist — likely also unbounded.
--
-- Fix:
--   For each known bucket, set file_size_limit + allowed_mime_types.
--   ON CONFLICT updates the bucket if it already exists.
--   Sizes chosen for grandmother-friendly mobile uploads:
--     event-photos:    20 MiB (single-photo cap, 4K iPhone JPEG ~ 8 MiB)
--     family-photos:    8 MiB (avatar / member photo, no need for full-res)
--     voice-messages:  10 MiB (m4a @ 64kbps × 20 min ≈ 9.6 MiB)
--     avatars:          4 MiB (profile photo only)
-- ============================================================================

BEGIN;

-- ── event-photos ─────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'event-photos',
    'event-photos',
    true,
    20 * 1024 * 1024,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO UPDATE
SET file_size_limit    = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ── family-photos ────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'family-photos',
    'family-photos',
    true,
    8 * 1024 * 1024,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO UPDATE
SET file_size_limit    = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ── voice-messages ───────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'voice-messages',
    'voice-messages',
    false,
    10 * 1024 * 1024,
    ARRAY['audio/mp4', 'audio/m4a', 'audio/mpeg', 'audio/aac', 'audio/wav']
)
ON CONFLICT (id) DO UPDATE
SET file_size_limit    = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types,
    public             = FALSE;

-- ── avatars (profile photos) ─────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars',
    'avatars',
    true,
    4 * 1024 * 1024,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO UPDATE
SET file_size_limit    = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ── voice-messages access policies (sender + receiver only) ──────────────
-- Path convention: <senderId>/<timestamp>-<id>.m4a
-- Receiver lookup is done at app layer via the message row, so RLS only
-- needs to guarantee that the *uploader* and the storage owner match.
DO $$ BEGIN
    -- Re-create policies idempotently. Other bucket policies stay untouched.
    DROP POLICY IF EXISTS "voice_messages_owner_read" ON storage.objects;
    DROP POLICY IF EXISTS "voice_messages_owner_insert" ON storage.objects;
    DROP POLICY IF EXISTS "voice_messages_owner_delete" ON storage.objects;
END $$;

CREATE POLICY "voice_messages_owner_read" ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'voice-messages'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "voice_messages_owner_insert" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'voice-messages'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "voice_messages_owner_delete" ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'voice-messages'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

COMMIT;

-- ============================================================================
-- Verification:
--   SELECT id, public, file_size_limit, allowed_mime_types
--   FROM storage.buckets
--   ORDER BY id;
-- Every row should show non-null file_size_limit and allowed_mime_types.
-- ============================================================================
