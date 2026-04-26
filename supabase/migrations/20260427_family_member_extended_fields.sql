-- ============================================================================
-- FAMILY MEMBER — EXTENDED PROFILE FIELDS + PHOTO BUCKET
-- ============================================================================
-- Adds mobile, email, full DOB/death dates, gender, occupation, current
-- address, and a custom_relationship_label slot to offline_family_members.
-- Also creates the public family-photos storage bucket used by the
-- "Add Family Member" flow (works for living and deceased members alike).
-- Created: 2026-04-27
-- ============================================================================

ALTER TABLE public.offline_family_members
    ADD COLUMN IF NOT EXISTS mobile_number TEXT,
    ADD COLUMN IF NOT EXISTS email TEXT,
    ADD COLUMN IF NOT EXISTS date_of_birth DATE,
    ADD COLUMN IF NOT EXISTS date_of_death DATE,
    ADD COLUMN IF NOT EXISTS gender TEXT,
    ADD COLUMN IF NOT EXISTS occupation TEXT,
    ADD COLUMN IF NOT EXISTS current_address TEXT,
    ADD COLUMN IF NOT EXISTS custom_relationship_label TEXT;

-- ============================================================================
-- STORAGE BUCKET: family-photos
-- Public-read so member avatars render without signed URLs. Writes restricted
-- to authenticated users; the `added_by` user owns and may overwrite/delete
-- their own uploads via the policies below.
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('family-photos', 'family-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Public can read all family photos (matches public bucket semantics)
DROP POLICY IF EXISTS "family_photos_public_read" ON storage.objects;
CREATE POLICY "family_photos_public_read" ON storage.objects
    FOR SELECT USING (bucket_id = 'family-photos');

-- Authenticated users can upload into a path prefixed with their own uid
DROP POLICY IF EXISTS "family_photos_authenticated_insert" ON storage.objects;
CREATE POLICY "family_photos_authenticated_insert" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'family-photos'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Owners can update their own files
DROP POLICY IF EXISTS "family_photos_owner_update" ON storage.objects;
CREATE POLICY "family_photos_owner_update" ON storage.objects
    FOR UPDATE TO authenticated
    USING (
        bucket_id = 'family-photos'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Owners can delete their own files
DROP POLICY IF EXISTS "family_photos_owner_delete" ON storage.objects;
CREATE POLICY "family_photos_owner_delete" ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'family-photos'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );
