/**
 * POST /api/panchang/subscribe — Daily Panchang opt-in for unauthenticated
 * SEO-landing visitors.
 *
 * CMO Review ICE #1 growth bet. Captures phone + email from /panchang page
 * so we can deliver the daily panchang via WhatsApp/SMS/email even to
 * people who haven't installed the app yet.
 *
 * Storage: `panchang_subscribers` (Supabase, RLS anon insert + unique
 * indexes on phone/email).
 * Delivery: handled by the existing `panchang-nudge` cron (Pass C — TBD).
 *
 * Validation:
 *  - At least one of phone_e164 / email must be present
 *  - Phone (if given) must match E.164: ^\+[1-9][0-9]{7,14}$
 *  - Email (if given) must match a reasonable regex
 *  - In-memory rate-limit: 10 subscribes per IP per hour (prevents spam)
 *
 * On duplicate (phone or email already subscribed and not unsubscribed):
 * returns 200 with `{ ok: true, status: 'already-subscribed' }` to avoid
 * leaking presence-or-absence of an existing subscription.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const PHONE_RE = /^\+[1-9][0-9]{7,14}$/;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const VALID_LOCALES = new Set(['hi-IN', 'en-IN', 'hi', 'en']);
const VALID_SOURCES = new Set(['panchang_page', 'festival_page', 'feed_widget', 'whatsapp_share']);

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

// In-memory rate limit: 10 subscribes / hour / IP. Survives single
// serverless instance; acceptable for an opt-in abuse surface.
const subscribeCounts = new Map<string, { count: number; resetAt: number }>();
const SUBSCRIBE_LIMIT = 10;
const SUBSCRIBE_WINDOW_MS = 60 * 60 * 1000;

function checkRate(ip: string): boolean {
  const now = Date.now();
  const entry = subscribeCounts.get(ip);
  if (!entry || entry.resetAt < now) {
    subscribeCounts.set(ip, { count: 1, resetAt: now + SUBSCRIBE_WINDOW_MS });
    return true;
  }
  if (entry.count >= SUBSCRIBE_LIMIT) return false;
  entry.count++;
  return true;
}

function getClientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

interface SubscribeBody {
  phone_e164?: string;
  email?: string;
  locale?: string;
  source?: string;
  state_code?: string;
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'cross-origin' }, { status: 403 });
  }

  const ip = getClientIp(request);
  if (!checkRate(ip)) {
    return NextResponse.json({ error: 'rate-limited' }, { status: 429 });
  }

  let body: SubscribeBody = {};
  try { body = await request.json(); } catch { /* empty body */ }

  const phone = body.phone_e164?.trim() || null;
  const email = body.email?.trim().toLowerCase() || null;
  const locale = body.locale && VALID_LOCALES.has(body.locale) ? body.locale : 'hi-IN';
  const source = body.source && VALID_SOURCES.has(body.source) ? body.source : 'panchang_page';
  const stateCode = body.state_code?.toUpperCase().slice(0, 4) || null;

  // Validation
  if (!phone && !email) {
    return NextResponse.json(
      { error: 'need-contact', message: 'Phone or email required' },
      { status: 400 },
    );
  }
  if (phone && !PHONE_RE.test(phone)) {
    return NextResponse.json(
      { error: 'bad-phone', message: 'Phone must be E.164 format (e.g. +919876543210)' },
      { status: 400 },
    );
  }
  if (email && !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: 'bad-email', message: 'Invalid email format' },
      { status: 400 },
    );
  }

  // Service role — anon inserts are allowed by RLS but we want to handle
  // the unique-constraint conflict gracefully ourselves rather than letting
  // it bubble as a 23505. Service role also lets us return a clean
  // "already-subscribed" without leaking row contents.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error('[panchang-subscribe] Supabase service-role not configured');
    return NextResponse.json({ error: 'misconfigured' }, { status: 503 });
  }
  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Check existing — if either contact is already subscribed (and not
  // unsubscribed), treat as success without re-inserting.
  if (phone || email) {
    const orFilters: string[] = [];
    if (phone) orFilters.push(`phone_e164.eq.${phone}`);
    if (email) orFilters.push(`email.eq.${email}`);
    const { data: existing } = await supabase
      .from('panchang_subscribers')
      .select('id, unsubscribed_at')
      .or(orFilters.join(','))
      .is('unsubscribed_at', null)
      .limit(1)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ ok: true, status: 'already-subscribed' });
    }
  }

  const { error: insertErr } = await supabase
    .from('panchang_subscribers')
    .insert({
      phone_e164: phone,
      email,
      locale,
      source,
      state_code: stateCode,
    });

  if (insertErr) {
    // Could be a race-condition unique-violation (23505) if two requests
    // landed in the same millisecond. Surface as "already-subscribed" for
    // a clean UX.
    if (insertErr.code === '23505') {
      return NextResponse.json({ ok: true, status: 'already-subscribed' });
    }
    console.error('[panchang-subscribe] insert failed', insertErr);
    return NextResponse.json(
      { error: 'insert-failed', message: insertErr.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, status: 'subscribed' });
}
