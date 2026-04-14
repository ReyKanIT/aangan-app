import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServer } from '@/lib/supabase/server';

const VALID_CATEGORIES = ['feature_request', 'bug_report', 'complaint', 'general'] as const;
type Category = (typeof VALID_CATEGORIES)[number];

const SUBJECT_BY_CATEGORY: Record<Category, string> = {
  feature_request: 'सुझाव — Feature request',
  bug_report: 'समस्या — Bug report',
  complaint: 'शिकायत — Complaint',
  general: 'सामान्य — General feedback',
};

interface FeedbackBody {
  category?: string;
  message?: string;
}

export async function POST(request: Request) {
  // ─── 1. Verify user session (anon client w/ cookies) ──────
  const sb = await createSupabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // ─── 2. Validate body ─────────────────────────────────────
  let body: FeedbackBody;
  try {
    body = (await request.json()) as FeedbackBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const category = (body.category ?? 'general') as Category;
  if (!VALID_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
  }
  const message = (body.message ?? '').trim();
  if (!message) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 });
  }
  if (message.length > 4000) {
    return NextResponse.json({ error: 'Message too long' }, { status: 400 });
  }

  // ─── 3. Service-role client (bypass RLS) ──────────────────
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error('Missing Supabase service role config');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ─── 4. Ensure profile row exists (avoid FK violation) ────
  const { data: existing } = await admin
    .from('users')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (!existing) {
    const fallbackName =
      (user.user_metadata?.display_name as string | undefined) ??
      (user.user_metadata?.full_name as string | undefined) ??
      (user.email ? user.email.split('@')[0] : 'User');
    const { error: profileErr } = await admin.from('users').insert({
      id: user.id,
      display_name: fallbackName,
      phone_number: user.phone ?? null,
      email: user.email ?? null,
    });
    if (profileErr) {
      console.error('Profile auto-create failed:', profileErr);
      return NextResponse.json(
        { error: 'Could not create profile', details: profileErr.message },
        { status: 500 },
      );
    }
  }

  // ─── 5. Create ticket ────────────────────────────────────
  const { data: ticket, error: ticketErr } = await admin
    .from('support_tickets')
    .insert({
      user_id: user.id,
      category,
      subject: SUBJECT_BY_CATEGORY[category],
      status: 'open',
      priority: category === 'bug_report' ? 'high' : 'medium',
    })
    .select('id, ticket_number')
    .single();

  if (ticketErr || !ticket) {
    console.error('Ticket insert failed:', ticketErr);
    return NextResponse.json(
      { error: 'Could not create ticket', details: ticketErr?.message },
      { status: 500 },
    );
  }

  // ─── 6. Create message ───────────────────────────────────
  const { error: msgErr } = await admin.from('support_messages').insert({
    ticket_id: ticket.id,
    sender_id: user.id,
    message,
    is_from_support: false,
    is_internal_note: false,
  });

  if (msgErr) {
    console.error('Message insert failed:', msgErr);
    return NextResponse.json(
      { error: 'Could not save message', details: msgErr.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    ticket_id: ticket.id,
    ticket_number: ticket.ticket_number,
  });
}
