/**
 * Supabase Edge Function — Audit Logging
 * Aangan v0.2
 *
 * Records security-relevant events to the audit_logs table.
 * Must be called with service_role key (from server/edge only).
 *
 * POST /functions/v1/audit-log
 * Body: { actor_id, action, target_type?, target_id?, metadata?, ip_address?, user_agent? }
 * Returns: { success: boolean, id?: string }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Audit-log is a server-to-server function — only allow internal callers
// In production, invoke this only from other Edge Functions or backend code, not from the browser
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

  try {
    const body = await req.json();
    const { actor_id, action, target_type, target_id, metadata, ip_address, user_agent } = body;

    if (!actor_id || !action) {
      return new Response(
        JSON.stringify({ error: 'actor_id and action required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!VALID_ACTIONS.includes(action)) {
      return new Response(
        JSON.stringify({ error: 'invalid action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data, error } = await supabase
      .from('audit_logs')
      .insert({
        actor_id,
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
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
