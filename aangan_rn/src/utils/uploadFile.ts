/**
 * uploadFile.ts — shared Supabase Storage upload helper for React Native.
 *
 * WHY THIS EXISTS:
 * Supabase JS client's `.upload(path, fileLikeObj)` expects a Blob /
 * File / ArrayBuffer / FormData. In React Native, passing the
 * `{uri, type, name}` object directly (as is common with expo-image-picker
 * results) silently uploads broken / empty files — the JS client just
 * JSON-stringifies the object. This is the #1 cause of "pic uploads
 * appear to work but image never appears" on iOS/Android.
 *
 * THE FIX (matches the working ProfileSetupScreen pattern):
 *   1. fetch(uri) → Response
 *   2. .blob() → Blob
 *   3. new Response(blob).arrayBuffer() → ArrayBuffer
 *   4. supabase.storage.upload(path, arrayBuffer, { contentType, upsert })
 *
 * History:
 *   - v0.13.20-v0.14.1: fixed for profile-avatar upload only
 *   - v0.15.8 (this commit): rolled out to posts, stories, event-photos
 *
 * Reference: https://supabase.com/docs/reference/javascript/storage-from-upload
 *            (see "React Native" callout)
 */

import { supabase } from '../config/supabase';
import { secureLog } from './security';

export interface UploadFileInput {
  /** Local URI from expo-image-picker / expo-file-system / Camera */
  uri: string;
  /** Storage bucket name (e.g. 'posts', 'event-photos', 'stories') */
  bucket: string;
  /** Path within the bucket (caller composes user/event/date prefixes) */
  path: string;
  /** MIME type. Defaults to 'image/jpeg' if not provided. */
  contentType?: string;
  /** Overwrite existing file at the path. Defaults to false. */
  upsert?: boolean;
}

export interface UploadFileResult {
  ok: boolean;
  publicUrl: string | null;
  error?: string;
}

/**
 * Upload a single file by URI to Supabase Storage. Returns a public URL on
 * success. Use this everywhere instead of `supabase.storage.upload(path, {uri,...})`.
 *
 * Example:
 *   const { ok, publicUrl } = await uploadFileToStorage({
 *     uri: file.uri,
 *     bucket: 'posts',
 *     path: `${userId}/${Date.now()}.jpg`,
 *     contentType: 'image/jpeg',
 *   });
 */
export async function uploadFileToStorage(input: UploadFileInput): Promise<UploadFileResult> {
  const { uri, bucket, path, contentType = 'image/jpeg', upsert = false } = input;

  try {
    // Step 1: fetch local URI → blob → ArrayBuffer.
    //   This is the RN-safe pattern. Skipping the arrayBuffer step (passing
    //   the blob directly) ALSO works on Hermes but is less universally
    //   compatible; the explicit arrayBuffer path is what ProfileSetupScreen
    //   has used since v0.13.20 without regression.
    const response = await fetch(uri);
    const blob = await response.blob();
    const arrayBuffer = await new Response(blob).arrayBuffer();

    // Sanity: zero-byte read is the symptom of an unreadable local URI.
    // Surface it as a clear error instead of letting Supabase save an empty
    // file (which is what would happen silently).
    if (arrayBuffer.byteLength === 0) {
      secureLog.warn(`[uploadFileToStorage] zero-byte read from uri=${uri}`);
      return { ok: false, publicUrl: null, error: 'File could not be read (zero bytes)' };
    }

    // Step 2: upload to Supabase Storage with explicit contentType.
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, arrayBuffer, {
        contentType,
        upsert,
      });

    if (uploadError) {
      secureLog.error(`[uploadFileToStorage] supabase upload error bucket=${bucket} path=${path}:`, uploadError);
      return { ok: false, publicUrl: null, error: uploadError.message };
    }

    // Step 3: derive the public URL.
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
    return { ok: true, publicUrl: urlData.publicUrl };
  } catch (err: any) {
    secureLog.error('[uploadFileToStorage] unexpected error:', err?.message ?? err);
    return { ok: false, publicUrl: null, error: err?.message ?? 'Upload failed' };
  }
}

/**
 * Infer a sensible contentType from a filename extension when the picker
 * doesn't provide one. Falls back to image/jpeg.
 */
export function contentTypeFromFilename(name: string | undefined | null, fallback = 'image/jpeg'): string {
  if (!name) return fallback;
  const ext = name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'png':  return 'image/png';
    case 'gif':  return 'image/gif';
    case 'webp': return 'image/webp';
    case 'heic': return 'image/heic';
    case 'heif': return 'image/heif';
    case 'mp4':  return 'video/mp4';
    case 'mov':  return 'video/quicktime';
    default:     return fallback;
  }
}
