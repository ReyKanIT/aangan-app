import { NextRequest, NextResponse } from 'next/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { b2Client, B2_BUCKET, B2_CDN_URL } from '@/lib/b2/client';
import { createSupabaseServer } from '@/lib/supabase/server';

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/quicktime'];

export async function POST(request: NextRequest) {
  // Auth check
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const folder = (formData.get('folder') as string) || 'posts';

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'File too large (max 25 MB)' }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'File type not allowed' }, { status: 400 });
  }

  const ext = file.name.split('.').pop() ?? 'jpg';
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  const key = `${folder}/${user.id}/${timestamp}_${random}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  const command = new PutObjectCommand({
    Bucket: B2_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: file.type,
  });

  try {
    await b2Client.send(command);
  } catch (err) {
    console.error('B2 upload error:', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }

  // B2 friendly URL format: /file/{bucket}/{key}
  // Cloudflare proxies media.aangan.app → f005.backblazeb2.com
  const url = `${B2_CDN_URL}/file/${B2_BUCKET}/${key}`;

  return NextResponse.json({ url, key });
}
