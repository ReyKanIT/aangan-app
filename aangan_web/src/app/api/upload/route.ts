import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { b2Client, B2_BUCKET, B2_CDN_URL } from '@/lib/b2/client';
import { createSupabaseServer } from '@/lib/supabase/server';

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'video/mp4', 'video/quicktime',
  'audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/mp4', 'audio/mp3', 'audio/x-m4a',
];

// Buckets that use Supabase Storage (service role) rather than B2.
// B2 credentials are local-only; Supabase service key is always on Vercel.
//
// 2026-05-03 (v0.13.20): added 'posts'. Backblaze B2 refused to flip the
// bucket to public ("Account has no payment history. Please make a payment
// before making a public bucket"), so every uploaded image was returning
// 401 from media.aangan.app. Routing posts through Supabase Storage instead.
// 2026-05-03 (v0.14.1): added 'event-covers' and 'event-audio' for the same
// reason — there were no rows yet using those B2 paths so no migration
// needed, but new uploads would have been broken on render. The matching
// public buckets were created via the Supabase API earlier today.
const SUPABASE_STORAGE_FOLDERS = ['avatars', 'posts', 'event-covers', 'event-audio'];

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

  // Derive extension from MIME type (compressed files lose their original
  // name and end up as `.blob`, which is cosmetically wrong even if next/image
  // serves them via Content-Type).
  const MIME_TO_EXT: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'video/mp4': 'mp4',
    'video/quicktime': 'mov',
    'audio/webm': 'webm',
    'audio/ogg': 'ogg',
    'audio/mpeg': 'mp3',
    'audio/mp3': 'mp3',
    'audio/mp4': 'm4a',
    'audio/x-m4a': 'm4a',
  };
  const nameParts = file.name.split('.');
  const nameExt = nameParts.length > 1 ? nameParts.pop()!.toLowerCase() : '';
  const ext = MIME_TO_EXT[file.type] || (nameExt && nameExt.length <= 4 ? nameExt : 'bin');
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  const key = `${user.id}/${timestamp}_${random}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  // ── Supabase Storage path (avatars) ──────────────────────────────────────
  if (SUPABASE_STORAGE_FOLDERS.includes(folder)) {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) {
      return NextResponse.json({ error: 'Storage not configured' }, { status: 500 });
    }
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);

    // Create bucket if missing (idempotent — errors if already exists, which is fine)
    await admin.storage.createBucket(folder, { public: true }).catch(() => {});

    const { error: upErr } = await admin.storage
      .from(folder)
      .upload(key, buffer, { contentType: file.type, upsert: true });

    if (upErr) {
      console.error('[upload] Supabase storage error:', upErr.message);
      return NextResponse.json({ error: upErr.message }, { status: 500 });
    }

    const { data: { publicUrl } } = admin.storage.from(folder).getPublicUrl(key);
    return NextResponse.json({ url: publicUrl, key });
  }

  // ── Backblaze B2 path (posts, event-covers, event-audio, …) ─────────────
  const b2Key = `${folder}/${key}`;
  const command = new PutObjectCommand({
    Bucket: B2_BUCKET,
    Key: b2Key,
    Body: buffer,
    ContentType: file.type,
  });

  try {
    await b2Client.send(command);
  } catch (err) {
    console.error('[upload] B2 error:', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }

  const url = `${B2_CDN_URL}/file/${B2_BUCKET}/${b2Key}`;
  return NextResponse.json({ url, key: b2Key });
}
