/**
 * Supabase Edge Function — Server-Side Rate Limiting
 * Aangan v0.2
 *
 * Enforces rate limits for sensitive operations at the server level.
 * Called by the app before OTP send, login, report submit, etc.
 *
 * POST /functions/v1/rate-limit
 * Body: { action: string, identifier: string }
 * Returns: { allowed: boolean, retryAfterSeconds?: number }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Restrict to known origins — update with your actual domains
const ALLOWED_ORIGINS = [
  'https://aangan.app',
  'https://www.aangan.app',
  'capacitor://localhost',   // Expo/Capacitor mobile
  'http://localhost:3000',   // Local development
  'http://localhost:8081',   // Expo dev server
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

// Max length for identifier to prevent storage pollution
const MAX_IDENTIFIER_LENGTH = 20;

// Allowed actions — must match rate_limits.valid_rate_action DB constraint
const ALLOWED_ACTIONS = new Set([
  'otp_send', 'otp_verify', 'login_attempt', 'report_submit', 'post_create', 'feedback_submit',
]);

// Rate limit configurations per action
const RATE_LIMITS: Record<string, { maxAttempts: number; windowMinutes: number; blockMinutes: number }> = {
  otp_send: { maxAttempts: 5, windowMinutes: 10, blockMinutes: 15 },
  otp_verify: { maxAttempts: 5, windowMinutes: 5, blockMinutes: 10 },
  login_attempt: { maxAttempts: 10, windowMinutes: 15, blockMinutes: 30 },
  report_submit: { maxAttempts: 10, windowMinutes: 60, blockMinutes: 60 },
  post_create: { maxAttempts: 20, windowMinutes: 60, blockMinutes: 30 },
  feedback_submit: { maxAttempts: 5, windowMinutes: 60, blockMinutes: 60 },
};

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  try {
    const body = await req.json();
    const { action, identifier } = body;

    // Validate required fields
    if (!action || !identifier) {
      return new Response(
        JSON.stringify({ error: 'action and identifier required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Validate identifier length to prevent storage pollution
    if (typeof identifier !== 'string' || identifier.length > MAX_IDENTIFIER_LENGTH || identifier.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'invalid identifier' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Validate action against allowlist
    if (!ALLOWED_ACTIONS.has(action)) {
      return new Response(
        JSON.stringify({ error: 'unknown action' }),
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

    // Create Supabase client with service role (bypasses RLS)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const now = new Date();

    // Check existing rate limit record
    const { data: existing } = await supabase
      .from('rate_limits')
      .select('*')
      .eq('identifier', identifier)
      .eq('action', action)
      .single();

    if (existing) {
      // Check if currently blocked
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
        // Window expired — reset
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

      // Within window — check count
      const newCount = existing.attempt_count + 1;

      if (newCount > config.maxAttempts) {
        // Block the user
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

      // Increment
      await supabase
        .from('rate_limits')
        .update({ attempt_count: newCount })
        .eq('id', existing.id);

      return new Response(
        JSON.stringify({ allowed: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // No existing record — create one
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
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
