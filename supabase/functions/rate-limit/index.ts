/**
 * Supabase Edge Function — Server-Side Rate Limiting
 * Aangan v0.2 — Hardened 2026-04-29 (audit fix)
 *
 * Enforces rate limits for sensitive operations at the server level.
 *
 * Auth model (one of):
 *   1. Authenticated user JWT (Authorization: Bearer <user JWT>) — for
 *      post-login rate limits (post_create, feedback_submit, report_submit).
 *      Identifier is FORCED to the JWT subject (cannot DoS another user).
 *   2. Service-shared secret (Authorization: Bearer <RATE_LIMIT_SHARED_SECRET>)
 *      — for pre-auth flows (otp_send, otp_verify, login_attempt) called by
 *      other edge functions or backend code only.
 *
 * Anonymous calls are rejected. Prior version accepted any caller and let
 * an attacker pass any identifier (phone) — exhausting the victim's OTP
 * quota and locking them out.
 *
 * POST /functions/v1/rate-limit
 * Body: { action: string, identifier?: string }
 * Returns: { allowed: boolean, retryAfterSeconds?: number }
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

const MAX_IDENTIFIER_LENGTH = 32; // bumped from 20 to fit hashed phone numbers

const ALLOWED_ACTIONS = new Set([
  'otp_send', 'otp_verify', 'login_attempt', 'report_submit', 'post_create', 'feedback_submit',
]);

// Pre-auth actions can only be invoked by callers presenting the shared
// secret. Post-auth actions require a user JWT.
const PREAUTH_ACTIONS = new Set(['otp_send', 'otp_verify', 'login_attempt']);
const POSTAUTH_ACTIONS = new Set(['report_submit', 'post_create', 'feedback_submit']);

const RATE_LIMITS: Record<string, { maxAttempts: number; windowMinutes: number; blockMinutes: number }> = {
  otp_send: { maxAttempts: 5, windowMinutes: 10, blockMinutes: 15 },
  otp_verify: { maxAttempts: 5, windowMinutes: 5, blockMinutes: 10 },
  login_attempt: { maxAttempts: 10, windowMinutes: 15, blockMinutes: 30 },
  report_submit: { maxAttempts: 10, windowMinutes: 60, blockMinutes: 60 },
  post_create: { maxAttempts: 20, windowMinutes: 60, blockMinutes: 30 },
  feedback_submit: { maxAttempts: 5, windowMinutes: 60, blockMinutes: 60 },
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const SHARED_SECRET = Deno.env.get('RATE_LIMIT_SHARED_SECRET') ?? '';

/** Constant-time string compare to avoid timing oracles on the shared secret. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

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

  let body: { action?: string; identifier?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
  const { action, identifier: bodyIdentifier } = body;

  if (!action || typeof action !== 'string' || !ALLOWED_ACTIONS.has(action)) {
    return new Response(
      JSON.stringify({ error: 'unknown action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // ── Auth gate: identifier source depends on action class ────────────────
  const authHeader = req.headers.get('authorization') ?? '';
  let identifier: string;

  if (POSTAUTH_ACTIONS.has(action)) {
    // Require user JWT; bind identifier to jwt.sub (ignore body input).
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
    identifier = user.id;
  } else if (PREAUTH_ACTIONS.has(action)) {
    // Require shared secret; identifier comes from body but caller is trusted.
    if (!SHARED_SECRET) {
      console.error('RATE_LIMIT_SHARED_SECRET not configured — refusing pre-auth request');
      return new Response(
        JSON.stringify({ error: 'Service misconfigured' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    const expected = `Bearer ${SHARED_SECRET}`;
    if (!safeEqual(authHeader, expected)) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    if (!bodyIdentifier || typeof bodyIdentifier !== 'string'
        || bodyIdentifier.trim().length === 0
        || bodyIdentifier.length > MAX_IDENTIFIER_LENGTH) {
      return new Response(
        JSON.stringify({ error: 'invalid identifier' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    identifier = bodyIdentifier.trim();
  } else {
    return new Response(
      JSON.stringify({ error: 'action not configured' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const config = RATE_LIMITS[action];
  if (!config) {
    return new Response(
      JSON.stringify({ error: 'action not configured' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const now = new Date();

    const { data: existing } = await supabase
      .from('rate_limits')
      .select('*')
      .eq('identifier', identifier)
      .eq('action', action)
      .single();

    if (existing) {
      if (existing.blocked_until && new Date(existing.blocked_until) > now) {
        const retryAfterSeconds = Math.ceil(
          (new Date(existing.blocked_until).getTime() - now.getTime()) / 1000,
        );
        return new Response(
          JSON.stringify({ allowed: false, retryAfterSeconds }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const windowStart = new Date(existing.window_start);
      const windowEnd = new Date(windowStart.getTime() + config.windowMinutes * 60 * 1000);

      if (now > windowEnd) {
        await supabase
          .from('rate_limits')
          .update({
            attempt_count: 1,
            window_start: now.toISOString(),
            blocked_until: null,
          })
          .eq('id', existing.id);

        return new Response(
          JSON.stringify({ allowed: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const newCount = existing.attempt_count + 1;

      if (newCount > config.maxAttempts) {
        const blockedUntil = new Date(now.getTime() + config.blockMinutes * 60 * 1000);
        await supabase
          .from('rate_limits')
          .update({
            attempt_count: newCount,
            blocked_until: blockedUntil.toISOString(),
          })
          .eq('id', existing.id);

        return new Response(
          JSON.stringify({
            allowed: false,
            retryAfterSeconds: config.blockMinutes * 60,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      await supabase
        .from('rate_limits')
        .update({ attempt_count: newCount })
        .eq('id', existing.id);

      return new Response(
        JSON.stringify({ allowed: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    await supabase.from('rate_limits').insert({
      identifier,
      action,
      attempt_count: 1,
      window_start: now.toISOString(),
    });

    return new Response(
      JSON.stringify({ allowed: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (_error) {
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
