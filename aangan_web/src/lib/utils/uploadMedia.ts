import { uploadToB2 } from './uploadB2';

export async function uploadPostMedia(file: File, userId: string): Promise<string> {
  return uploadToB2(file, 'posts');
}

export async function uploadAvatar(file: File, userId: string): Promise<string> {
  return uploadToB2(file, 'avatars');
}
