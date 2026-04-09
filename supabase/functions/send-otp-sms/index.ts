/**
 * Supabase Auth Hook — Send OTP via MSG91
 * Aangan v0.5
 *
 * Supabase sends: { user: { phone: "+91..." }, sms: { otp: "123456" } }
 * Must return: {} with status 200 on success
 */

const MSG91_AUTH_KEY   = Deno.env.get('MSG91_AUTH_KEY') ?? '';
const MSG91_TEMPLATE_ID = Deno.env.get('MSG91_TEMPLATE_ID') ?? '';
const MSG91_SENDER_ID  = Deno.env.get('MSG91_SENDER_ID') ?? 'AANGAN';

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
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

  console.log('Hook payload keys:', Object.keys(payload), 'phone:', phone ? 'yes' : 'no', 'otp:', otp ? 'yes' : 'no');

  if (!phone || !otp) {
    console.error('Missing phone or otp. Payload keys:', Object.keys(payload));
    return new Response(JSON.stringify({ error: 'Missing phone or otp' }), {
      status: 400,
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

  // MSG91 expects number without '+' prefix
  const mobile = phone.replace(/^\+/, '');

  try {
    const url = `https://control.msg91.com/api/v5/otp?template_id=${MSG91_TEMPLATE_ID}&mobile=${mobile}&authkey=${MSG91_AUTH_KEY}&otp=${otp}`;
    console.log('Sending OTP via MSG91 OTP API to', mobile.slice(-4));
    const msg91Resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    const result = await msg91Resp.json();

    if (!msg91Resp.ok || result.type === 'error') {
      console.error('MSG91 error:', JSON.stringify(result));
      return new Response(JSON.stringify({ error: 'SMS delivery failed' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('OTP sent to', mobile.slice(-4), 'via MSG91');
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
