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

// ─── In-memory rate limit: 5 feedback submits per user per hour ──
// Prevents an authenticated user from spamming the support queue /
// bloating the daily digest. Survives only within a single serverless
// instance, which is acceptable for this abuse surface.
const submitCounts = new Map<string, { count: number; resetAt: number }>();
const SUBMIT_LIMIT = 5;
const SUBMIT_WINDOW_MS = 60 * 60 * 1000;

function checkSubmitRate(userId: string): boolean {
  const now = Date.now();
  const entry = submitCounts.get(userId);
  if (!entry || entry.resetAt < now) {
    submitCounts.set(userId, { count: 1, resetAt: now + SUBMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= SUBMIT_LIMIT) return false;
  entry.count++;
  return true;
}

// ─── Same-origin guard for state-changing requests ────────
// Defence in depth on top of SameSite=Lax cookies. We accept
// same-origin, Vercel preview deployments, and requests with no
// Origin header (native apps, server-to-server, curl).
function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true; // no Origin = not a browser CSRF vector
  try {
    const reqHost = new URL(request.url).host;
    const originHost = new URL(origin).host;
    if (reqHost === originHost) return true;
    // Allow Vercel preview / production aliases (*.vercel.app, *.aangan.app)
    if (/(^|\.)aangan\.app$/.test(originHost)) return true;
    if (/(^|\.)vercel\.app$/.test(originHost)) return true;
    return false;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  // ─── 0. CSRF: reject cross-origin browser POSTs ──────────
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
  }

  // ─── 1. Verify user session (anon client w/ cookies) ──────
  const sb = await createSupabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // ─── 1b. Rate limit per user ─────────────────────────────
  if (!checkSubmitRate(user.id)) {
    return NextResponse.json(
      { error: 'बहुत ज़्यादा फ़ीडबैक। एक घंटे बाद कोशिश करें। / Too many submissions. Try again in an hour.' },
      { status: 429 },
    );
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
        { error: 'Could not create profile' },
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
      { error: 'Could not create ticket' },
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
      { error: 'Could not save message' },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    ticket_id: ticket.id,
    ticket_number: ticket.ticket_number,
  });
}
