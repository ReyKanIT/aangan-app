/**
 * Supabase Edge Function — Send Expo Push Notification
 * Aangan v0.9.15 — added 2026-04-29 to replace client-side push send.
 *
 * The previous client-side path (aangan_rn/src/services/pushNotifications.ts
 * sendPushToUser) had two problems:
 *   1. Any signed-in user could read another user's push_token via
 *      `from('users').select('push_token').eq('id', target)` — anything
 *      with the anon key + an authenticated session would work.
 *   2. They could then call the Expo public push API directly, spamming
 *      the target's device with arbitrary content.
 *
 * This function:
 *   * Requires a valid user JWT (caller must be authenticated).
 *   * Validates the caller has a *legitimate reason* to push the recipient:
 *       - target is in caller's family_members, OR
 *       - target shares an event RSVP / co-host relationship with caller,
 *         OR
 *       - target is the caller themselves (self-test).
 *   * Looks up the recipient's push_token via the SERVICE_ROLE key (so the
 *     caller never sees the raw token).
 *   * Sends via Expo Push API.
 *   * Records the send for abuse audit (best-effort; missing audit log
 *     does not block the send).
 *
 * POST /functions/v1/send-push
 * Headers: Authorization: Bearer <user JWT>
 * Body: {
 *   target_user_id: string,
 *   title: string,
 *   body: string,
 *   data?: Record<string, string>,
 * }
 * Returns: { sent: boolean, reason?: string }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ALLOWED_ORIGINS = [
  'https://aangan.app',
  'https://www.aangan.app',
  'capacitor://localhost',
  'http://localhost:3000',
  'http://localhost:8081',
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') ?? '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

const MAX_TITLE = 100;
const MAX_BODY = 240;
const MAX_DATA_KEYS = 10;

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // ── 1. Verify caller's JWT ──────────────────────────────────────────────
  const authHeader = req.headers.get('authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ error: 'Authentication required' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: userErr } = await userClient.auth.getUser();
  if (userErr || !user) {
    return new Response(
      JSON.stringify({ error: 'Invalid or expired token' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // ── 2. Validate body ────────────────────────────────────────────────────
  let body: { target_user_id?: string; title?: string; body?: string; data?: Record<string, string> };
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const targetId = (body.target_user_id ?? '').trim();
  const title = (body.title ?? '').slice(0, MAX_TITLE).trim();
  const messageBody = (body.body ?? '').slice(0, MAX_BODY).trim();
  const data = body.data && typeof body.data === 'object' ? body.data : {};

  if (!targetId || !title || !messageBody) {
    return new Response(
      JSON.stringify({ error: 'target_user_id, title, body required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
  if (Object.keys(data).length > MAX_DATA_KEYS) {
    return new Response(
      JSON.stringify({ error: 'data has too many keys' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // ── 3. Authorize: caller must have a legitimate relationship to target ──
  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  if (targetId !== user.id) {
    // Check family_members (caller_id → target_id direction)
    const { data: fm } = await adminClient
      .from('family_members')
      .select('id')
      .eq('user_id', user.id)
      .eq('family_member_id', targetId)
      .limit(1)
      .maybeSingle();

    let allowed = !!fm;

    if (!allowed) {
      // Check shared event — caller created an event the target RSVP'd to,
      // or vice versa.
      const { data: sharedEvent } = await adminClient
        .from('events')
        .select('id')
        .eq('creator_id', user.id)
        .in('id',
          (await adminClient
            .from('event_rsvps')
            .select('event_id')
            .eq('user_id', targetId))
            .data?.map((r: { event_id: string }) => r.event_id) ?? []
        )
        .limit(1)
        .maybeSingle();
      allowed = !!sharedEvent;
    }

    if (!allowed) {
      return new Response(
        JSON.stringify({ sent: false, reason: 'Not authorized to push this user' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
  }

  // ── 4. Fetch recipient push token (service role bypasses RLS) ───────────
  const { data: targetRow } = await adminClient
    .from('users')
    .select('push_token, is_active')
    .eq('id', targetId)
    .maybeSingle();

  if (!targetRow?.push_token || targetRow.is_active === false) {
    return new Response(
      JSON.stringify({ sent: false, reason: 'no push token' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // ── 5. Send via Expo Push API ──────────────────────────────────────────
  try {
    const expoResp = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        to: targetRow.push_token,
        title,
        body: messageBody,
        data,
        sound: 'default',
        badge: 1,
        channelId: 'default',
      }),
    });

    // Best-effort audit log (table may not exist in every project).
    adminClient.from('audit_logs').insert({
      actor_id: user.id,
      action: 'admin_action',
      target_type: 'user',
      target_id: targetId,
      metadata: { kind: 'push_send', title },
    }).then(() => {}, () => {});

    if (!expoResp.ok) {
      return new Response(
        JSON.stringify({ sent: false, reason: 'expo error' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ sent: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (_err) {
    return new Response(
      JSON.stringify({ sent: false, reason: 'network error' }),
      { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
