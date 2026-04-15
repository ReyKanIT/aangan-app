const COMPRESSION_OPTIONS = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  fileType: 'image/webp' as const,
};

/**
 * Compress an image file for upload.
 * Returns the original file if it's not an image or if compression fails.
 *
 * `browser-image-compression` (~20KB gz) is lazy-loaded on first call so it
 * stays out of the initial /feed bundle — users on 3G don't pay for it until
 * they actually attach a photo to a post.
 */
export async function compressImage(file: File): Promise<File> {
  // Only compress images, skip videos and other types
  if (!file.type.startsWith('image/')) return file;

  // Skip GIFs (compression would lose animation)
  if (file.type === 'image/gif') return file;

  // Skip if already small enough (< 500KB)
  if (file.size < 500 * 1024) return file;

  try {
    const { default: imageCompression } = await import('browser-image-compression');
    const compressed = await imageCompression(file, COMPRESSION_OPTIONS);
    // Only use compressed version if it's actually smaller
    return compressed.size < file.size ? compressed : file;
  } catch {
    // If compression fails, return the original
    return file;
  }
}
