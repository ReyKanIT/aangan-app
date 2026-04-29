/**
 * Supabase Edge Function — Audit Logging
 * Aangan v0.2 — Hardened 2026-04-29 (audit fix)
 *
 * Records security-relevant events to the audit_logs table.
 * Caller MUST present a valid Supabase user JWT in the Authorization header.
 * The function validates the JWT, derives actor_id from the JWT subject, and
 * IGNORES any actor_id in the body (prior version trusted body input —
 * audit log spoofing).
 *
 * POST /functions/v1/audit-log
 * Headers: Authorization: Bearer <user JWT>
 * Body: { action, target_type?, target_id?, metadata?, ip_address?, user_agent? }
 * Returns: { success: boolean, id?: string }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ALLOWED_ORIGINS = [
  'https://aangan.app',
  'https://www.aangan.app',
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

const VALID_ACTIONS = [
  'user_login', 'user_logout', 'profile_update',
  'post_create', 'post_delete',
  'event_create', 'event_delete',
  'family_add', 'family_remove',
  'photo_moderate', 'report_resolve',
  'admin_action', 'account_deactivate', 'content_report',
];

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

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

  // ── 1. JWT verification (added 2026-04-29). Body actor_id is no longer trusted.
  const authHeader = req.headers.get('authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ error: 'Missing bearer token' }),
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

  const actor_id = user.id;

  try {
    const body = await req.json();
    const { action, target_type, target_id, metadata, ip_address, user_agent } = body;

    if (!action) {
      return new Response(
        JSON.stringify({ error: 'action required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!VALID_ACTIONS.includes(action)) {
      return new Response(
        JSON.stringify({ error: 'invalid action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Service-role client for the actual insert (RLS-bypassing write to audit_logs).
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data, error } = await adminClient
      .from('audit_logs')
      .insert({
        actor_id, // bound to verified JWT subject — body cannot override
        action,
        target_type: target_type || null,
        target_id: target_id || null,
        metadata: metadata || {},
        ip_address: ip_address || req.headers.get('x-forwarded-for') || null,
        user_agent: user_agent || req.headers.get('user-agent') || null,
      })
      .select('id')
      .single();

    if (error) {
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ success: true, id: data.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (_error) {
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
