/**
 * Supabase Auth Hook — Send OTP via MSG91
 * Aangan v0.9 — DLT registered (Apr 2026, Vilpower Reg# VI-1100093984)
 *
 * Supabase sends: { user: { phone: "+91..." }, sms: { otp: "123456" } }
 * Must return: {} with status 200 on success
 *
 * Security: Only accept calls from Supabase Auth (via webhook secret).
 */

const MSG91_AUTH_KEY     = Deno.env.get('MSG91_AUTH_KEY') ?? '';
// Vi DLT OTP template — approved 2026-04-26 under PEID VI-1100093984,
// Header AANGFM. The runbook (MSG91_TEMPLATE_IDS.md) documents the secret
// name as `MSG91_TEMPLATE_OTP`, but earlier code read `MSG91_TEMPLATE_ID`.
// Read both, falling back to the known-approved template ID so the
// function still works if the secret was never set on the deployed
// project (silent 503 "SMS provider not configured" was the failure
// mode that kept SMS from going out even after Vi approval).
const MSG91_TEMPLATE_ID =
  Deno.env.get('MSG91_TEMPLATE_OTP') ??
  Deno.env.get('MSG91_TEMPLATE_ID') ??
  '1107177660181979501';
const MSG91_SENDER_ID   = Deno.env.get('MSG91_SENDER_ID') ?? 'AANGFM';
const WEBHOOK_SECRET    = Deno.env.get('SUPABASE_WEBHOOK_SECRET') ?? '';

// Reviewer bypass — phones in this set skip the MSG91 call and return 200
// immediately. The actual OTP that gets accepted is set in Supabase
// Dashboard → Auth → Phone → Test phone numbers (must mirror this list,
// Dashboard is authoritative for verification).
//
// Driven by env var REVIEWER_PHONES_E164, a comma-separated list of E.164
// numbers *without* leading "+", e.g. "919999999999,918888888888". Kept as
// env so Apple/Google review credentials can be rotated without redeploy.
//
// To add Apple App Review demo account (see APPLE_REVIEW_DEMO_ACCOUNT.md):
//   1. Pick a fixed phone like +91 99999 99999, OTP like 123456
//   2. Supabase Dashboard → Auth → Phone → Test phone numbers → add pair
//   3. Supabase function secrets → REVIEWER_PHONES_E164 = "919999999999"
//   4. Apple ASC → App Review → Sign-in info → phone +91 99999 99999, OTP 123456
//   5. After Apple approval, remove the entry from both Dashboard and env
const REVIEWER_PHONES = new Set<string>(
  (Deno.env.get('REVIEWER_PHONES_E164') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0),
);

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Fail-closed webhook auth (hardened 2026-04-29).
  // Previously: if WEBHOOK_SECRET was unset (?? '') the auth check was
  // silently skipped — anyone with the function URL could trigger MSG91 SMS,
  // burning DLT credits and potentially DoS-ing real users.
  if (!WEBHOOK_SECRET) {
    console.error('SUPABASE_WEBHOOK_SECRET not configured — refusing to accept request');
    return new Response(JSON.stringify({ error: 'Service misconfigured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const auth = req.headers.get('authorization') ?? '';
  if (auth !== `Bearer ${WEBHOOK_SECRET}`) {
    console.error('Unauthorized: invalid webhook secret');
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    console.error('Failed to parse request body');
    return new Response(JSON.stringify({ error: 'Invalid payload' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Supabase Auth Hook sends: { user: { phone }, sms: { otp } }
  const phone = payload?.user?.phone;
  const otp = payload?.sms?.otp;

  console.log('Hook invoked, phone:', phone ? `***${phone.slice(-4)}` : 'MISSING', 'otp:', otp ? 'yes' : 'no');

  if (!phone || !otp) {
    console.error('Missing phone or otp. Payload keys:', Object.keys(payload));
    return new Response(JSON.stringify({ error: 'Missing phone or otp' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // MSG91 expects number without '+' prefix, with country code
  const mobile = phone.replace(/^\+/, '');

  // Reviewer bypass — return 200 immediately without hitting MSG91. Supabase
  // Auth's [auth.sms.test_otp] map accepts the paired fixed OTP on verify,
  // so the reviewer completes signup with no real SMS needed.
  if (REVIEWER_PHONES.has(mobile)) {
    console.log('Reviewer bypass for ***' + mobile.slice(-4) + ' — no MSG91 call');
    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!MSG91_AUTH_KEY || !MSG91_TEMPLATE_ID) {
    console.error('MSG91 secrets not configured');
    return new Response(JSON.stringify({ error: 'SMS provider not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Validate: only Indian numbers (91XXXXXXXXXX)
  if (!/^91[6-9]\d{9}$/.test(mobile)) {
    console.error('Invalid Indian phone number:', mobile.slice(-4));
    return new Response(JSON.stringify({ error: 'Invalid phone number' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const url = `https://control.msg91.com/api/v5/otp?template_id=${MSG91_TEMPLATE_ID}&mobile=${mobile}&authkey=${MSG91_AUTH_KEY}&otp=${otp}`;
    console.log('Sending OTP via MSG91 to ***' + mobile.slice(-4));
    const msg91Resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    const result = await msg91Resp.json();

    if (!msg91Resp.ok || result.type === 'error') {
      console.error('MSG91 error:', JSON.stringify(result));
      return new Response(JSON.stringify({ error: 'SMS delivery failed', detail: result.message ?? '' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('OTP sent to ***' + mobile.slice(-4), 'via MSG91, request_id:', result.request_id ?? 'n/a');
    // Supabase expects empty object with 200
    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
