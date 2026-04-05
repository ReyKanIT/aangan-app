/**
 * Audio Storage Service for Aangan
 * Handles upload, download, and deletion of voice messages via Supabase Storage.
 */

import { supabase } from '../config/supabase';

const BUCKET_NAME = 'voice-messages';

/**
 * Generate a random alphanumeric ID.
 */
function randomId(length = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Upload a voice message file to Supabase storage.
 *
 * @param uri - Local file URI (e.g. from expo-av recording)
 * @param senderId - The user ID of the sender
 * @returns Object with public URL and storage path, or null on failure
 */
export async function uploadVoiceMessage(
  uri: string,
  senderId: string
): Promise<{ url: string; path: string } | null> {
  try {
    const timestamp = Date.now();
    const id = randomId();
    const filePath = `${senderId}/${timestamp}-${id}.m4a`;

    // Fetch the local file and convert to ArrayBuffer
    const response = await fetch(uri);
    const arrayBuffer = await response.arrayBuffer();

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, arrayBuffer, {
        contentType: 'audio/mp4',
        upsert: false,
      });

    if (error) {
      console.error('[audioStorageService] Upload error:', error.message);
      return null;
    }

    const url = getVoiceMessageUrl(filePath);
    return { url, path: filePath };
  } catch (err) {
    console.error('[audioStorageService] Upload failed:', err);
    return null;
  }
}

/**
 * Delete a voice message from Supabase storage.
 *
 * @param path - The storage path (e.g. "senderId/timestamp-id.m4a")
 * @returns true if deleted successfully, false otherwise
 */
export async function deleteVoiceMessage(path: string): Promise<boolean> {
  try {
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([path]);

    if (error) {
      console.error('[audioStorageService] Delete error:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[audioStorageService] Delete failed:', err);
    return false;
  }
}

/**
 * Get the public URL for a voice message.
 *
 * @param path - The storage path (e.g. "senderId/timestamp-id.m4a")
 * @returns The public URL string
 */
export function getVoiceMessageUrl(path: string): string {
  const { data } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(path);

  return data.publicUrl;
}
