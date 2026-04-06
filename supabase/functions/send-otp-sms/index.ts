/**
 * Supabase Auth Hook — Send OTP via MSG91
 * Aangan v0.4.5
 *
 * Configure in Supabase Dashboard:
 *   Authentication → Hooks → Send SMS OTP → this function URL
 *
 * Required env vars (set in Supabase Dashboard → Edge Functions → Secrets):
 *   MSG91_AUTH_KEY      — your MSG91 auth key
 *   MSG91_TEMPLATE_ID   — your DLT-approved OTP template ID
 *   MSG91_SENDER_ID     — 6-char sender ID (e.g. AANGAN) — optional for transactional
 */

const MSG91_AUTH_KEY   = Deno.env.get('MSG91_AUTH_KEY') ?? '';
const MSG91_TEMPLATE_ID = Deno.env.get('MSG91_TEMPLATE_ID') ?? '';
const MSG91_SENDER_ID  = Deno.env.get('MSG91_SENDER_ID') ?? 'AANGAN';

interface AuthHookPayload {
  user: {
    phone: string;
  };
  otp: string;
}

Deno.serve(async (req: Request) => {
  // Only accept POST from Supabase Auth (hook secret validated by Supabase)
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  let payload: AuthHookPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid payload' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { user, otp } = payload;
  if (!user?.phone || !otp) {
    return new Response(JSON.stringify({ error: 'Missing phone or otp' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!MSG91_AUTH_KEY || !MSG91_TEMPLATE_ID) {
    console.error('MSG91 secrets not configured:', { hasAuthKey: !!MSG91_AUTH_KEY, hasTemplateId: !!MSG91_TEMPLATE_ID });
    return new Response(JSON.stringify({ error: 'SMS provider not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // MSG91 expects number without '+' prefix
  const mobile = user.phone.replace(/^\+/, '');

  try {
    const msg91Resp = await fetch('https://api.msg91.com/api/v5/otp', {
      method: 'POST',
      headers: {
        'authkey': MSG91_AUTH_KEY,
        'Content-Type': 'application/json',
        'accept': 'application/json',
      },
      body: JSON.stringify({
        template_id: MSG91_TEMPLATE_ID,
        mobile,
        otp,
        sender: MSG91_SENDER_ID,
      }),
    });

    const result = await msg91Resp.json();

    if (!msg91Resp.ok || result.type === 'error') {
      console.error('MSG91 error:', result);
      return new Response(JSON.stringify({ error: 'SMS delivery failed', detail: result }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`OTP sent to ${mobile} via MSG91`);
    return new Response(JSON.stringify({ success: true }), {
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
