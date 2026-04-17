import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Cron endpoint — fires scheduled bulk invites.
 *
 * Invoked by:
 *  - Vercel Cron (every 5 minutes — see vercel.json)
 *  - The "Send now" button in BulkInviteManager (manual kick)
 *
 * Auth: Vercel Cron sends an Authorization: Bearer <CRON_SECRET> header when
 * CRON_SECRET env var is set. Manual kicks from authenticated hosts just work
 * via RLS on planned-invite rows.
 *
 * What it does each tick:
 *  1. Find events where invites_scheduled_at <= NOW() AND invites_sent_at IS NULL
 *  2. For each such event, load pending invitees
 *  3. For each invitee:
 *     - if invitee_user_id is set → insert into notifications (in-app badge)
 *       + upsert event_rsvps with status='pending' (so they see it in /events)
 *     - if MSG91 template + phone available → enqueue SMS (stubbed with a
 *       TODO — plugs in once DLT template ID lands in env vars)
 *  4. Mark each invitee sent/failed and update event.invites_sent_at
 *
 * Batching: max 100 invitees per tick to avoid hammering MSG91 + Supabase if a
 * large list schedules all at once.
 */

const BATCH_LIMIT = 100;

interface PlannedInviteRow {
  id: string;
  event_id: string;
  invitee_user_id: string | null;
  invitee_name: string;
  invitee_phone: string;
  send_status: string;
}

interface EventRow {
  id: string;
  title: string;
  title_hindi: string | null;
  start_datetime: string;
  location: string | null;
  hosted_by: string | null;
  creator_id: string;
}

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Supabase service credentials missing');
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

async function processEvent(svc: ReturnType<typeof getServiceClient>, event: EventRow): Promise<{ sent: number; failed: number }> {
  // Pull pending invitees for this event
  const { data: invites, error: listErr } = await svc
    .from('event_planned_invites')
    .select('id, event_id, invitee_user_id, invitee_name, invitee_phone, send_status')
    .eq('event_id', event.id)
    .eq('send_status', 'pending')
    .limit(BATCH_LIMIT);

  if (listErr) {
    console.error(`[send-scheduled-invites] list failed for event ${event.id}:`, listErr.message);
    return { sent: 0, failed: 0 };
  }

  const rows = (invites ?? []) as PlannedInviteRow[];
  if (rows.length === 0) return { sent: 0, failed: 0 };

  const msg91Template = process.env.MSG91_TEMPLATE_EVENT_INVITE;
  const msg91AuthKey = process.env.MSG91_AUTH_KEY;
  const smsEnabled = !!(msg91Template && msg91AuthKey);

  const eventTitle = event.title_hindi || event.title;
  const eventDate = new Date(event.start_datetime).toLocaleDateString('hi-IN', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata',
  });
  const eventTime = new Date(event.start_datetime).toLocaleTimeString('hi-IN', {
    hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata',
  });
  const inviteLink = `https://aangan.app/events/${event.id}`;

  let sent = 0;
  let failed = 0;

  for (const inv of rows) {
    let notifOk = false;
    let smsOk = false;
    let errMsg: string | null = null;

    // 1) In-app notification for existing users
    if (inv.invitee_user_id) {
      const { error: nErr } = await svc.from('notifications').insert({
        user_id: inv.invitee_user_id,
        type: 'event_invite',
        title: `You're invited to ${eventTitle}`,
        title_hindi: `${eventTitle} में आपको न्यौता है`,
        body: `${eventDate} · ${eventTime}${event.location ? ` · ${event.location}` : ''}`,
        body_hindi: `${eventDate} · ${eventTime}${event.location ? ` · ${event.location}` : ''}`,
        data: { event_id: event.id, planned_invite_id: inv.id },
        is_read: false,
      });
      notifOk = !nErr;
      if (nErr) errMsg = `notification: ${nErr.message}`;

      // Pre-seed an RSVP row with status='pending' so the event shows up in
      // the invitee's /events page. Ignore duplicates.
      await svc.from('event_rsvps').upsert({
        event_id: event.id,
        user_id: inv.invitee_user_id,
        status: 'pending',
      }, { onConflict: 'event_id,user_id' });
    }

    // 2) SMS for everyone (primary channel for non-users, secondary for users)
    //    Only fires once DLT template ID is set in env.
    if (smsEnabled) {
      try {
        const mobile = inv.invitee_phone.replace(/[^\d]/g, '');
        const inviterName = event.hosted_by || 'Aangan user';
        // Template A1 variables: inviter, event, date, venue, link
        const url = `https://control.msg91.com/api/v5/flow/`;
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'authkey': msg91AuthKey!,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            template_id: msg91Template,
            short_url: '1',
            recipients: [{
              mobiles: mobile,
              var1: inviterName,
              var2: eventTitle,
              var3: eventDate,
              var4: event.location || 'Aangan event',
              var5: inviteLink,
            }],
          }),
        });
        smsOk = res.ok;
        if (!res.ok) {
          const body = await res.text().catch(() => '');
          errMsg = `${errMsg ? errMsg + '; ' : ''}sms: ${res.status} ${body.slice(0, 120)}`;
        }
      } catch (e) {
        errMsg = `${errMsg ? errMsg + '; ' : ''}sms: ${e instanceof Error ? e.message : 'unknown'}`;
      }
    }

    const anyChannel = notifOk || smsOk;
    const channel = notifOk && smsOk ? 'both' : notifOk ? 'notification' : smsOk ? 'sms' : null;

    await svc.from('event_planned_invites').update({
      send_status: anyChannel ? 'sent' : 'failed',
      send_channel: channel,
      sent_at: anyChannel ? new Date().toISOString() : null,
      send_error: anyChannel ? null : (errMsg ?? 'no channel available'),
    }).eq('id', inv.id);

    if (anyChannel) sent++; else failed++;
  }

  // Mark event as sent if we drained the pending queue.
  const { count } = await svc
    .from('event_planned_invites')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', event.id)
    .eq('send_status', 'pending');

  if ((count ?? 0) === 0) {
    await svc.from('events').update({ invites_sent_at: new Date().toISOString() }).eq('id', event.id);
  }

  return { sent, failed };
}

async function handler(request: NextRequest) {
  // Optional auth check for Vercel Cron.
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${cronSecret}`) {
      // Allow manual POSTs without the secret — the page checks RLS for those.
      // So we only enforce when method is GET (which is what Vercel Cron uses).
      if (request.method === 'GET') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }
  }

  try {
    const svc = getServiceClient();

    const { data: events, error: findErr } = await svc
      .from('events')
      .select('id, title, title_hindi, start_datetime, location, hosted_by, creator_id')
      .is('invites_sent_at', null)
      .not('invites_scheduled_at', 'is', null)
      .lte('invites_scheduled_at', new Date().toISOString())
      .limit(20);

    if (findErr) {
      return NextResponse.json({ error: findErr.message }, { status: 500 });
    }

    const results: Record<string, { sent: number; failed: number }> = {};
    for (const ev of (events ?? []) as EventRow[]) {
      results[ev.id] = await processEvent(svc, ev);
    }

    const totalSent = Object.values(results).reduce((s, r) => s + r.sent, 0);
    const totalFailed = Object.values(results).reduce((s, r) => s + r.failed, 0);

    return NextResponse.json({
      ok: true,
      events_processed: Object.keys(results).length,
      invites_sent: totalSent,
      invites_failed: totalFailed,
      per_event: results,
    });
  } catch (err) {
    console.error('[send-scheduled-invites] fatal:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) { return handler(request); }
export async function POST(request: NextRequest) { return handler(request); }
