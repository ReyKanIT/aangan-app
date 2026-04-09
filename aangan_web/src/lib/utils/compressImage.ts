import imageCompression from 'browser-image-compression';

const COMPRESSION_OPTIONS = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  fileType: 'image/webp' as const,
};

/**
 * Compress an image file for upload.
 * Returns the original file if it's not an image or if compression fails.
 */
export async function compressImage(file: File): Promise<File> {
  // Only compress images, skip videos and other types
  if (!file.type.startsWith('image/')) return file;

  // Skip GIFs (compression would lose animation)
  if (file.type === 'image/gif') return file;

  // Skip if already small enough (< 500KB)
  if (file.size < 500 * 1024) return file;

  try {
    const compressed = await imageCompression(file, COMPRESSION_OPTIONS);
    // Only use compressed version if it's actually smaller
    return compressed.size < file.size ? compressed : file;
  } catch {
    // If compression fails, return the original
    return file;
  }
}
