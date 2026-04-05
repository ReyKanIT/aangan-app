import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Service-role client — bypasses RLS for guest upload metadata insert.
// This key is NEVER exposed to the browser.
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Missing Supabase service role config');
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Rate limit: max 20 guest uploads per event per IP per hour
const uploadCounts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string, eventId: string): boolean {
  const key = `${ip}:${eventId}`;
  const now = Date.now();
  const entry = uploadCounts.get(key);

  if (!entry || entry.resetAt < now) {
    uploadCounts.set(key, { count: 1, resetAt: now + 60 * 60 * 1000 });
    return true;
  }
  if (entry.count >= 20) return false;
  entry.count++;
  return true;
}

// Sanitize guest name: strip HTML, limit length
function sanitizeGuestName(name: string): string {
  return name
    .replace(/[<>"'&]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 50);
}

export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
    const body = await req.json();
    const { event_id, guest_name, photo_url, storage_path, is_video } = body;

    if (!event_id || !guest_name || !photo_url || !storage_path) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!checkRateLimit(ip, event_id)) {
      return NextResponse.json(
        { error: 'बहुत ज़्यादा अपलोड। थोड़ी देर बाद कोशिश करें। / Too many uploads. Try again later.' },
        { status: 429 }
      );
    }

    const cleanName = sanitizeGuestName(guest_name);
    if (!cleanName) {
      return NextResponse.json({ error: 'Invalid guest name' }, { status: 400 });
    }

    // Validate photo_url is from our own storage domain (prevent SSRF)
    const supabaseHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).host;
    const photoHost = new URL(photo_url).host;
    if (photoHost !== supabaseHost) {
      return NextResponse.json({ error: 'Invalid photo URL' }, { status: 400 });
    }

    const supabase = getServiceClient();

    // Verify the event exists and is not in the past (within 7 days after end)
    const { data: event, error: eventErr } = await supabase
      .from('events')
      .select('id, end_time')
      .eq('id', event_id)
      .single();

    if (eventErr || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const uploadDeadline = event.end_time
      ? new Date(new Date(event.end_time).getTime() + 7 * 24 * 60 * 60 * 1000)
      : null;

    if (uploadDeadline && new Date() > uploadDeadline) {
      return NextResponse.json(
        { error: 'इवेंट समाप्त हो गया है। / This event has ended.' },
        { status: 410 }
      );
    }

    const now = new Date().toISOString();

    // Insert photo metadata — uses service role to bypass RLS
    const { error: insertErr } = await supabase
      .from('event_photos')
      .insert({
        event_id,
        uploader_id: null,           // null = guest upload
        guest_name: cleanName,
        photo_url,
        thumbnail_url: null,
        caption: null,
        status: 'pending',           // host must approve
        privacy_type: 'all',
        privacy_level_min: 1,
        privacy_level_max: 99,
        privacy_user_ids: [],
        is_video: is_video ?? false,
        created_at: now,
        updated_at: now,
      });

    if (insertErr) {
      console.error('[guest-upload] Insert error:', insertErr.message);
      return NextResponse.json({ error: 'Failed to save photo metadata' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[guest-upload] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
