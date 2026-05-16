/**
 * POST /api/account/delete — permanent account deletion.
 *
 * Required by Google Play (App Content → User-data deletion) and increasingly
 * by Apple App Review. Apps that don't ship an in-app deletion path get
 * blocked from updates after 2023.
 *
 * Flow:
 *   1. Verify caller's session via SSR cookie → get auth.users.id
 *   2. Same-origin guard (defence in depth on top of SameSite=Lax cookies)
 *   3. Confirm payload includes the literal string "DELETE" (typed by user)
 *   4. Use service-role to call auth.admin.deleteUser(id)
 *   5. Supabase cascades auth.users → users.id (FK with ON DELETE CASCADE),
 *      which fans out to posts/family_members/event_rsvps/etc. via their
 *      own cascading FKs to users.id.
 *
 * The request returns 200 on success; the client then signs out and
 * redirects. We do NOT remove the auth cookie here — the client owns that
 * via supabase.auth.signOut().
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServer } from '@/lib/supabase/server';

function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try {
    const reqHost = new URL(request.url).host;
    const originHost = new URL(origin).host;
    if (reqHost === originHost) return true;
    if (/(^|\.)aangan\.app$/.test(originHost)) return true;
    if (/(^|\.)vercel\.app$/.test(originHost)) return true;
    return false;
  } catch {
    return false;
  }
}

// In-memory rate limit: 3 delete attempts per user per hour. A signed-in
// attacker shouldn't be able to brute-force the typed-confirmation; this
// also caps abuse from a compromised session.
const deleteCounts = new Map<string, { count: number; resetAt: number }>();
const DELETE_LIMIT = 3;
const DELETE_WINDOW_MS = 60 * 60 * 1000;

function checkRate(userId: string): boolean {
  const now = Date.now();
  const entry = deleteCounts.get(userId);
  if (!entry || entry.resetAt < now) {
    deleteCounts.set(userId, { count: 1, resetAt: now + DELETE_WINDOW_MS });
    return true;
  }
  if (entry.count >= DELETE_LIMIT) return false;
  entry.count++;
  return true;
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'cross-origin' }, { status: 403 });
  }

  // 1. Verify caller's session
  const supabaseSSR = await createSupabaseServer();
  const { data: { user }, error: authErr } = await supabaseSSR.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  if (!checkRate(user.id)) {
    return NextResponse.json({ error: 'rate-limited' }, { status: 429 });
  }

  // 2. Confirm typed-confirmation payload
  let body: { confirm?: string } = {};
  try { body = await request.json(); } catch { /* empty body ok */ }
  if (body.confirm !== 'DELETE') {
    return NextResponse.json(
      { error: 'must-type-DELETE', message: 'Confirmation phrase missing' },
      { status: 400 },
    );
  }

  // 3. Service-role admin client
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceKey || !url) {
    console.error('[account-delete] SUPABASE_SERVICE_ROLE_KEY or URL not configured');
    return NextResponse.json({ error: 'misconfigured' }, { status: 503 });
  }
  const supabaseAdmin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 4. Delete auth.users → cascades to users → cascades to posts/family/etc.
  const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(user.id);
  if (delErr) {
    console.error('[account-delete] admin.deleteUser failed', { uid: user.id, err: delErr.message });
    return NextResponse.json({ error: 'delete-failed', message: delErr.message }, { status: 500 });
  }

  // 5. Best-effort audit log (won't block on failure — the user is gone either way)
  try {
    await supabaseAdmin.from('account_deletion_log').insert({
      deleted_at: new Date().toISOString(),
      // Hash phone/email so we keep a forensic trail but no PII
      auth_metadata_keys: Object.keys(user.user_metadata ?? {}),
    });
  } catch {
    // Table may not exist yet — non-blocking.
  }

  return NextResponse.json({ ok: true });
}
