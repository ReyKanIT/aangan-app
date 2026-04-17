import { compressImage } from './compressImage';

/**
 * Upload a file to Backblaze B2 via the /api/upload route.
 * Images are automatically compressed before upload (max 1MB, 1920px, WebP).
 * Returns the CDN URL of the uploaded file.
 */
export async function uploadToB2(file: File, folder: 'posts' | 'avatars' | 'event-photos' | 'event-covers' | 'event-audio' = 'posts'): Promise<string> {
  // Compress images before upload (skips videos, GIFs, small files)
  const optimizedFile = await compressImage(file);

  const formData = new FormData();
  formData.append('file', optimizedFile);
  formData.append('folder', folder);

  const res = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(err.error || 'Upload failed');
  }

  const { url } = await res.json();
  return url;
}
