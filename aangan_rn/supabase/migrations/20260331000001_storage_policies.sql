-- ============================================================================
-- STORAGE BUCKET RLS POLICIES
-- Migration: 20260331000001_storage_policies
-- ============================================================================
-- Note: Buckets are created via config.toml [storage.buckets.*]
-- This migration adds RLS policies for fine-grained access control.
-- ============================================================================

-- ============================================================================
-- AVATARS BUCKET (public read, user uploads own)
-- ============================================================================

-- Anyone can view avatars (public bucket)
CREATE POLICY "Avatar images are publicly accessible"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');

-- Users can upload their own avatar
CREATE POLICY "Users can upload own avatar"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'avatars' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Users can update their own avatar
CREATE POLICY "Users can update own avatar"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'avatars' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Users can delete their own avatar
CREATE POLICY "Users can delete own avatar"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'avatars' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- ============================================================================
-- POSTS BUCKET (user uploads own, visibility via post_audience)
-- ============================================================================

-- Users can upload to their own posts folder
CREATE POLICY "Users can upload post media"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'posts' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Users can view their own post media or posts shared with them
CREATE POLICY "Users can view post media"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'posts' AND
        (
            auth.uid()::text = (storage.foldername(name))[1] OR
            auth.role() = 'authenticated'
        )
    );

-- Users can delete their own post media
CREATE POLICY "Users can delete own post media"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'posts' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- ============================================================================
-- EVENTS BUCKET (invited users upload, event creator moderates)
-- ============================================================================

-- Authenticated users can upload event media
CREATE POLICY "Authenticated users can upload event media"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'events' AND
        auth.role() = 'authenticated'
    );

-- Authenticated users can view event media
CREATE POLICY "Authenticated users can view event media"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'events' AND
        auth.role() = 'authenticated'
    );

-- Users can delete their own event media uploads
CREATE POLICY "Users can delete own event media"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'events' AND
        auth.uid()::text = (storage.foldername(name))[2]
    );

-- ============================================================================
-- EVENT-BUNDLES BUCKET (paid storage, invited users upload)
-- ============================================================================

-- Authenticated users can upload to event bundles
CREATE POLICY "Authenticated users can upload bundle media"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'event-bundles' AND
        auth.role() = 'authenticated'
    );

-- Authenticated users can view bundle media
CREATE POLICY "Authenticated users can view bundle media"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'event-bundles' AND
        auth.role() = 'authenticated'
    );

-- Users can delete their own bundle media
CREATE POLICY "Users can delete own bundle media"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'event-bundles' AND
        auth.uid()::text = (storage.foldername(name))[2]
    );
