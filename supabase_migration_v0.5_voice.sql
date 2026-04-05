-- Aangan v0.5 Migration: Voice Messages Support
-- Run this in Supabase SQL Editor

-- 1. Add voice message columns to direct_messages table
ALTER TABLE direct_messages
  ADD COLUMN IF NOT EXISTS message_type TEXT NOT NULL DEFAULT 'text'
    CHECK (message_type IN ('text', 'voice')),
  ADD COLUMN IF NOT EXISTS audio_url TEXT,
  ADD COLUMN IF NOT EXISTS audio_duration_seconds NUMERIC;

-- 2. Create voice-messages storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'voice-messages',
  'voice-messages',
  true,
  5242880, -- 5MB
  ARRAY['audio/mp4', 'audio/m4a', 'audio/mpeg', 'audio/aac', 'audio/x-m4a']
)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage RLS policies for voice-messages bucket

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload voice messages to own folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'voice-messages'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow all authenticated users to read voice messages
CREATE POLICY "Authenticated users can read voice messages"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'voice-messages');

-- Allow users to delete their own voice messages
CREATE POLICY "Users can delete own voice messages"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'voice-messages'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 4. Index on message_type for filtering voice messages
CREATE INDEX IF NOT EXISTS idx_direct_messages_type
  ON direct_messages (message_type)
  WHERE message_type = 'voice';

-- Done!
-- Verify: SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'direct_messages' AND column_name IN ('message_type', 'audio_url', 'audio_duration_seconds');
