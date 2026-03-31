import { supabase } from '@/lib/supabase/client';

export async function uploadPostMedia(file: File, userId: string): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg';
  const filePath = `${userId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage
    .from('posts')
    .upload(filePath, file, { contentType: file.type, upsert: false });

  if (error) throw error;

  const { data } = supabase.storage.from('posts').getPublicUrl(filePath);
  return data.publicUrl;
}

export async function uploadAvatar(file: File, userId: string): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg';
  const filePath = `${userId}/avatar.${ext}`;

  const { error } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, { contentType: file.type, upsert: true });

  if (error) throw error;

  const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
  return `${data.publicUrl}?t=${Date.now()}`;
}
