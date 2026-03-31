import * as ImageManipulator from 'expo-image-manipulator';

/**
 * Compress an image for upload. Resizes to max 1920px width and compresses JPEG to 0.7 quality.
 * Typically reduces an 8MB photo to under 500KB.
 */
export async function compressImage(
  uri: string,
  options?: { maxWidth?: number; quality?: number }
): Promise<string> {
  const maxWidth = options?.maxWidth ?? 1920;
  const quality = options?.quality ?? 0.7;

  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: maxWidth } }],
    { compress: quality, format: ImageManipulator.SaveFormat.JPEG }
  );

  return result.uri;
}

/**
 * Compress a profile photo (smaller, 400x400)
 */
export async function compressProfilePhoto(uri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 400, height: 400 } }],
    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
  );
  return result.uri;
}
