/**
 * uploadFile.ts — shared Supabase Storage upload helper for React Native.
 *
 * ═══════════════════════════════════════════════════════════════
 * HISTORY OF THIS BUG (read me before changing this file)
 * ═══════════════════════════════════════════════════════════════
 *
 *   v0.13.x  — Original code passed { uri, type, name } object directly
 *              to supabase.storage.upload(). The Supabase JS client
 *              JSON-stringifies plain objects, silently uploading
 *              broken/empty files. Symptom: upload "succeeds" but the
 *              file at the URL is empty or invalid.
 *
 *   v0.13.20 — Fixed for ProfileSetupScreen ONLY using
 *              fetch(uri).blob().arrayBuffer(). Worked because profile
 *              avatars are small (<1 MB) and that path is exercised once
 *              at signup, so flakiness was masked.
 *
 *   v0.15.8  — Rolled the fetch+blob+arrayBuffer pattern to posts /
 *              stories / event-photos via a shared helper (this file).
 *              REPORTED BROKEN by Kumar same day. Root cause: the
 *              Response.arrayBuffer() path on Hermes/iOS is unreliable
 *              for files >~500 KB and for certain HEIC/large JPEG files.
 *              Sometimes returns 0 bytes, sometimes returns garbage.
 *
 *   v0.15.10 — THIS file. Switched to the community-proven gold-standard
 *              RN + Supabase pattern:
 *                1. expo-file-system FileSystem.readAsStringAsync(uri,
 *                   { encoding: 'base64' })  — reliable, well-tested
 *                2. atob() + Uint8Array (RN 0.71+ has native atob)
 *                3. Upload the Uint8Array (Supabase accepts ArrayBuffer-likes)
 *              This is what Signal, Trove, and ~all production RN+Supabase
 *              apps use as of 2024-2025. The fetch/blob path is officially
 *              "don't use this" in Supabase docs.
 *
 * ═══════════════════════════════════════════════════════════════
 * REQUIREMENTS
 * ═══════════════════════════════════════════════════════════════
 *
 *   Deps:    expo-file-system (already in package.json as ~19.0.21)
 *   Polyfills: none — atob is native in RN 0.71+
 *   Permissions: caller's responsibility (camera/media library)
 *
 * Reference: https://supabase.com/docs/guides/storage/uploads/standard-uploads
 *            (see "React Native" callout)
 */

import * as FileSystem from 'expo-file-system';
import { supabase } from '../config/supabase';
import { secureLog } from './security';

export interface UploadFileInput {
  /** Local URI from expo-image-picker / expo-file-system / Camera */
  uri: string;
  /** Storage bucket name (e.g. 'posts', 'event-photos', 'stories', 'avatars') */
  bucket: string;
  /** Path within the bucket (caller composes user/event/date prefixes) */
  path: string;
  /** MIME type. Defaults to 'image/jpeg'. */
  contentType?: string;
  /** Overwrite existing file at the path. Defaults to false. */
  upsert?: boolean;
}

export interface UploadFileResult {
  ok: boolean;
  publicUrl: string | null;
  error?: string;
  /** Bytes uploaded (for debugging — surfaced in dev logs) */
  bytesUploaded?: number;
}

/**
 * Upload a single file by URI to Supabase Storage. Returns a public URL on
 * success. Use this everywhere instead of `supabase.storage.upload(path, {uri,...})`.
 *
 * Why this pattern (and not fetch+blob+arrayBuffer):
 *   On Hermes/iOS, fetch(uri).then(r => r.blob()).then(b => b.arrayBuffer())
 *   is unreliable for files larger than ~500 KB. Sometimes the arrayBuffer
 *   is empty, sometimes garbage. expo-file-system reads the raw bytes
 *   directly from the OS file API and base64-encodes them — bypassing JS's
 *   fetch/blob layer entirely.
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
    // ── Step 1: Read the local file as base64 via expo-file-system. ──
    // This is the most reliable RN read pattern in 2024+. The OS-level
    // file API reads bytes directly; we get a base64 string that we can
    // decode synchronously in JS.
    //
    // Why not FileSystem.readAsStringAsync without encoding option?
    //   Without { encoding: 'base64' }, RN tries to decode as UTF-8 and
    //   silently corrupts any byte > 0x7F.
    let base64: string;
    try {
      base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
    } catch (readErr: any) {
      // Some Expo file URIs (ph:// from iOS Camera Roll) need a copy step
      // before they can be read directly. We try copying to a cache file
      // first, then reading.
      try {
        const cachedPath = `${FileSystem.cacheDirectory}upload-${Date.now()}.bin`;
        await FileSystem.copyAsync({ from: uri, to: cachedPath });
        base64 = await FileSystem.readAsStringAsync(cachedPath, {
          encoding: FileSystem.EncodingType.Base64,
        });
        // Best-effort cleanup
        FileSystem.deleteAsync(cachedPath, { idempotent: true }).catch(() => {});
      } catch (copyErr: any) {
        secureLog.warn('[uploadFileToStorage] cannot read uri:', uri, readErr?.message ?? readErr);
        return { ok: false, publicUrl: null, error: `Cannot read file: ${readErr?.message ?? 'unknown'}` };
      }
    }

    if (!base64 || base64.length === 0) {
      return { ok: false, publicUrl: null, error: 'File is empty or unreadable' };
    }

    // ── Step 2: Decode base64 → Uint8Array. ──
    // Native atob is available on RN 0.71+. No polyfill needed.
    // We construct a Uint8Array from the binary string.
    const binary = globalThis.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    if (bytes.length === 0) {
      secureLog.warn('[uploadFileToStorage] zero-byte file from uri=', uri);
      return { ok: false, publicUrl: null, error: 'File decoded to zero bytes' };
    }

    // ── Step 3: Upload the Uint8Array. ──
    // Supabase JS client accepts ArrayBufferView (Uint8Array IS one), so
    // we don't need to call .buffer. Pass contentType explicitly because
    // Supabase otherwise infers from the file extension on `path`.
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, bytes, {
        contentType,
        upsert,
        // cacheControl: 1 year for media (the URL path is unique per upload)
        cacheControl: '31536000',
      });

    if (uploadError) {
      secureLog.error(
        `[uploadFileToStorage] supabase upload error bucket=${bucket} path=${path} bytes=${bytes.length}:`,
        uploadError
      );
      return { ok: false, publicUrl: null, error: uploadError.message, bytesUploaded: 0 };
    }

    // ── Step 4: Derive the public URL. ──
    // getPublicUrl works synchronously and just composes the URL — it does
    // NOT verify the bucket is public. If photos don't appear despite a
    // successful upload, check that the bucket has a public-read policy.
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);

    secureLog.info(
      `[uploadFileToStorage] OK bucket=${bucket} path=${path} bytes=${bytes.length}`
    );

    return { ok: true, publicUrl: urlData.publicUrl, bytesUploaded: bytes.length };
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
    case 'm4a':  return 'audio/m4a';
    default:     return fallback;
  }
}
