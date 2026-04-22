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
const MSG91_TEMPLATE_ID = Deno.env.get('MSG91_TEMPLATE_ID') ?? '';
const MSG91_SENDER_ID   = Deno.env.get('MSG91_SENDER_ID') ?? 'AANGFM';
const WEBHOOK_SECRET    = Deno.env.get('SUPABASE_WEBHOOK_SECRET') ?? '';

// Reviewer test numbers — belt-and-braces bypass so external store reviewers
// (Indus, Play pre-launch, App Store Connect) can verify signup flows even
// when DLT template approval is pending and MSG91 would 400 every real OTP.
// These same numbers are registered in supabase/config.toml [auth.sms.test_otp]
// so Supabase Auth short-circuits BEFORE invoking this hook. This list is a
// second line of defence in case the dashboard test_otp map isn't synced.
const REVIEWER_PHONES = new Set<string>([
  '919886110312',  // Indus App Store reviewer (primary)
  '919000000001',  // Google Play pre-launch reviewer
  '919000000002',  // App Store Connect reviewer (iOS)
  '919886146312',  // Internal QA (Kumar's phone)
]);

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Optional: Verify webhook secret if configured (prevents external abuse)
  if (WEBHOOK_SECRET) {
    const auth = req.headers.get('authorization') ?? '';
    if (auth !== `Bearer ${WEBHOOK_SECRET}`) {
      console.error('Unauthorized: invalid webhook secret');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
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
