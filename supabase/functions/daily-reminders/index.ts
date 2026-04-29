/**
 * Supabase Edge Function — Daily Family Reminder Notifications
 * Aangan v0.4.4
 *
 * Runs daily at 08:00 IST (02:30 UTC) via pg_cron.
 * Checks for upcoming birthdays, anniversaries, and custom important dates
 * within the next 7 days, then sends push notifications to all relevant
 * family members who have a push_token registered.
 *
 * Notification windows: same-day (0), 1 day before, 3 days before, 7 days before.
 * A dedup log prevents sending the same reminder twice per day.
 *
 * Deploy: supabase functions deploy daily-reminders --no-verify-jwt
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL    = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY     = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const EXPO_PUSH_URL   = 'https://exp.host/--/api/v2/push/send';
const NOTIFY_WINDOWS  = [0, 1, 3, 7]; // days before event to notify

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserRow {
  id: string;
  display_name: string;
  display_name_hindi: string | null;
  push_token: string | null;
  date_of_birth: string | null;      // ISO date
  wedding_anniversary: string | null; // ISO date
}

interface FamilyMemberRow {
  user_id: string;
  family_member_id: string;
}

interface ImportantDate {
  id: string;
  created_by: string;
  category: string;
  person_name: string;
  person_name_hindi: string | null;
  event_month: number;
  event_day: number;
  event_year: number | null;
  notify_days_before: number[];
  notify_family: boolean;
}

interface AanganEvent {
  id: string;
  creator_id: string;
  title: string;
  title_hindi: string | null;
  event_date: string; // ISO date
  audience_type: string;
}

interface NotificationPayload {
  to: string;
  title: string;
  body: string;
  data: Record<string, string>;
  sound: string;
  badge: number;
  channelId: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Format a Date to YYYY-MM-DD in UTC */
function toISO(d: Date): string {
  return d.toISOString().split('T')[0];
}

/** Return a Date that is `days` ahead of today (UTC midnight) */
function daysFromNow(days: number): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

/** Get month (1-12) and day from ISO date string */
function monthDay(iso: string): { month: number; day: number } {
  const d = new Date(iso);
  return { month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

/** Hindi label for days remaining */
function daysLabel(daysAhead: number, isHindi = true): string {
  if (daysAhead === 0) return isHindi ? 'आज' : 'Today';
  if (daysAhead === 1) return isHindi ? 'कल' : 'Tomorrow';
  return isHindi ? `${daysAhead} दिन बाद` : `in ${daysAhead} days`;
}

/** Category emoji */
function categoryEmoji(cat: string): string {
  switch (cat) {
    case 'birthday':     return '🎂';
    case 'anniversary':  return '💑';
    case 'barsi':        return '🪔';
    case 'puja':         return '🙏';
    default:             return '⭐';
  }
}

/** Event type emoji */
function eventEmoji(type: string): string {
  switch (type) {
    case 'wedding':      return '💍';
    case 'birthday':     return '🎂';
    case 'puja':         return '🙏';
    case 'mundan':       return '✂️';
    case 'housewarming': return '🏠';
    case 'engagement':   return '💍';
    default:             return '📅';
  }
}

// ─── Batch push sender ────────────────────────────────────────────────────────

async function sendBatchPush(payloads: NotificationPayload[]): Promise<void> {
  if (payloads.length === 0) return;
  // Expo allows up to 100 per batch
  for (let i = 0; i < payloads.length; i += 100) {
    const chunk = payloads.slice(i, i + 100);
    try {
      await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(chunk),
      });
    } catch (_) { /* best-effort */ }
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? '';

/** Constant-time string compare to avoid timing oracles on the cron secret. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  // Hardened 2026-04-29: require CRON_SECRET. Prior version was openly callable
  // and would happily blast reminders to all users on demand, leaking the
  // family graph by who got what notification. Set CRON_SECRET via:
  //   supabase secrets set CRON_SECRET="<random>"
  // and configure pg_cron / Vercel cron to send Authorization: Bearer <secret>.
  if (!CRON_SECRET) {
    console.error('CRON_SECRET not configured — refusing to run');
    return new Response(JSON.stringify({ error: 'Service misconfigured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const auth = req.headers.get('authorization') ?? '';
  if (!safeEqual(auth, `Bearer ${CRON_SECRET}`)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const db = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  const today = daysFromNow(0);
  const todayISO = toISO(today);

  // ── 1. Load all users with push tokens ──────────────────────────────────────
  const { data: allUsers, error: usersErr } = await db
    .from('users')
    .select('id, display_name, display_name_hindi, push_token, date_of_birth, wedding_anniversary')
    .not('push_token', 'is', null);

  if (usersErr) return new Response(JSON.stringify({ error: usersErr.message }), { status: 500 });
  const users = (allUsers ?? []) as UserRow[];
  const userMap = new Map(users.map((u) => [u.id, u]));

  // ── 2. Build family graph (user_id → Set of family_member_ids) ───────────────
  const { data: fmRows } = await db
    .from('family_members')
    .select('user_id, family_member_id');

  const familyOf = new Map<string, Set<string>>();
  for (const fm of (fmRows ?? []) as FamilyMemberRow[]) {
    if (!familyOf.has(fm.user_id)) familyOf.set(fm.user_id, new Set());
    familyOf.get(fm.user_id)!.add(fm.family_member_id);
  }

  /** Returns Set of user IDs who should receive a notification for `ownerId`'s event */
  function getRecipients(ownerId: string, notifyFamily: boolean): Set<string> {
    const r = new Set<string>([ownerId]);
    if (notifyFamily) {
      for (const [uid, members] of familyOf.entries()) {
        if (members.has(ownerId)) r.add(uid);
      }
    }
    return r;
  }

  // ── 3. Load existing notification log for today (dedup) ─────────────────────
  const { data: sentRows } = await db
    .from('reminder_notification_log')
    .select('user_id, source_type, source_id')
    .eq('notify_date', todayISO);

  const alreadySent = new Set<string>(
    (sentRows ?? []).map((r: any) => `${r.user_id}|${r.source_type}|${r.source_id}`),
  );

  const logInserts: Array<{ user_id: string; source_type: string; source_id: string; notify_date: string }> = [];
  const pushPayloads: NotificationPayload[] = [];

  function enqueue(
    recipient: UserRow,
    title: string,
    body: string,
    sourceType: string,
    sourceId: string,
    data: Record<string, string> = {},
  ) {
    const dedupKey = `${recipient.id}|${sourceType}|${sourceId}`;
    if (alreadySent.has(dedupKey)) return;
    if (!recipient.push_token) return;
    alreadySent.add(dedupKey);

    pushPayloads.push({
      to: recipient.push_token,
      title,
      body,
      data: { sourceType, sourceId, ...data },
      sound: 'default',
      badge: 1,
      channelId: 'reminders',
    });
    logInserts.push({ user_id: recipient.id, source_type: sourceType, source_id: sourceId, notify_date: todayISO });
  }

  // ── 4. Birthdays from users.date_of_birth ────────────────────────────────────
  for (const daysAhead of NOTIFY_WINDOWS) {
    const target = daysFromNow(daysAhead);
    const { month: tMonth, day: tDay } = { month: target.getUTCMonth() + 1, day: target.getUTCDate() };

    for (const person of users) {
      if (!person.date_of_birth) continue;
      const { month, day } = monthDay(person.date_of_birth);
      if (month !== tMonth || day !== tDay) continue;

      const personName = person.display_name_hindi || person.display_name;
      const when = daysLabel(daysAhead);
      const when_en = daysLabel(daysAhead, false);
      const title = `🎂 जन्मदिन ${when}!`;
      const body = `${personName} का जन्मदिन ${when} है। उन्हें बधाई दें! 🎉`;

      const recipients = getRecipients(person.id, true);
      for (const rid of recipients) {
        const r = userMap.get(rid);
        if (!r) continue;
        // Don't notify the birthday person themselves on the same day in the same message
        // (they get a separate self-notification)
        if (rid === person.id) {
          enqueue(r, `🎂 आपका जन्मदिन ${when} है!`, `परिवार आपको बधाई देना चाहता है 🎉`, 'birthday', person.id, { screen: 'FamilyTree' });
        } else {
          enqueue(r, title, body, 'birthday', person.id, { screen: 'FamilyTree' });
        }
      }
    }
  }

  // ── 5. Wedding anniversaries from users.wedding_anniversary ─────────────────
  for (const daysAhead of NOTIFY_WINDOWS) {
    const target = daysFromNow(daysAhead);
    const { month: tMonth, day: tDay } = { month: target.getUTCMonth() + 1, day: target.getUTCDate() };

    for (const person of users) {
      if (!person.wedding_anniversary) continue;
      const { month, day } = monthDay(person.wedding_anniversary);
      if (month !== tMonth || day !== tDay) continue;

      const personName = person.display_name_hindi || person.display_name;
      const when = daysLabel(daysAhead);
      const title = `💑 शादी की सालगिरह ${when}!`;
      const body = `${personName} की शादी की सालगिरह ${when} है। बधाई देना न भूलें! 💐`;

      const recipients = getRecipients(person.id, true);
      for (const rid of recipients) {
        const r = userMap.get(rid);
        if (!r) continue;
        enqueue(r, title, body, 'anniversary', person.id, { screen: 'FamilyTree' });
      }
    }
  }

  // ── 6. Custom family_important_dates ────────────────────────────────────────
  const { data: importantDates } = await db
    .from('family_important_dates')
    .select('*')
    .eq('is_active', true);

  for (const date of (importantDates ?? []) as ImportantDate[]) {
    for (const daysAhead of NOTIFY_WINDOWS) {
      if (!date.notify_days_before.includes(daysAhead)) continue;

      const target = daysFromNow(daysAhead);
      const tMonth = target.getUTCMonth() + 1;
      const tDay = target.getUTCDate();

      if (date.event_month !== tMonth || date.event_day !== tDay) continue;

      const personName = date.person_name_hindi || date.person_name;
      const when = daysLabel(daysAhead);
      const emoji = categoryEmoji(date.category);

      let title = '';
      let body = '';
      switch (date.category) {
        case 'birthday':
          title = `${emoji} जन्मदिन ${when}!`;
          body = `${personName} का जन्मदिन ${when} है। 🎉`;
          break;
        case 'anniversary':
          title = `${emoji} सालगिरह ${when}!`;
          body = `${personName} की सालगिरह ${when} है। 💐`;
          break;
        case 'barsi':
          title = `${emoji} बरसी ${when}`;
          body = `${personName} की बरसी ${when} है। श्रद्धांजलि।`;
          break;
        case 'puja':
          title = `${emoji} पूजा ${when}`;
          body = `${personName} की पूजा ${when} है। 🙏`;
          break;
        default:
          title = `${emoji} ${personName} — ${when}`;
          body = `यह विशेष अवसर ${when} है।`;
      }

      const recipients = getRecipients(date.created_by, date.notify_family);
      for (const rid of recipients) {
        const r = userMap.get(rid);
        if (!r) continue;
        enqueue(r, title, body, 'important_date', date.id, { screen: 'ImportantDates' });
      }
    }
  }

  // ── 7. Upcoming events (next 7 days) ──────────────────────────────────
  // FIX 2026-04-29: was 'aangan_events' — that table does not exist; the real
  // table is public.events (per supabase_schema.sql:358). The whole block was
  // silently returning zero rows in prod, so no event reminders were firing.
  const sevenDaysLater = toISO(daysFromNow(7));
  const { data: upcomingEvents } = await db
    .from('events')
    .select('id, creator_id, title, title_hindi, event_date, event_type, audience_type')
    .gte('event_date', todayISO)
    .lte('event_date', sevenDaysLater);

  for (const evt of (upcomingEvents ?? []) as (AanganEvent & { event_type: string })[]) {
    const evtDate = new Date(evt.event_date);
    const daysAhead = Math.round((evtDate.getTime() - today.getTime()) / 86400000);
    if (![0, 1, 3, 7].includes(daysAhead)) continue;

    const evtName = evt.title_hindi || evt.title;
    const when = daysLabel(daysAhead);
    const emoji = eventEmoji(evt.event_type);
    const title = `${emoji} ${evtName} — ${when}`;
    const body = `परिवार का कार्यक्रम ${when} है। RSVP करना न भूलें।`;

    // Notify family of the event creator
    const recipients = getRecipients(evt.creator_id, true);
    for (const rid of recipients) {
      const r = userMap.get(rid);
      if (!r) continue;
      enqueue(r, title, body, 'event', evt.id, { screen: 'EventDetail', eventId: evt.id });
    }
  }

  // ── 8. Send all notifications & log ─────────────────────────────────────────
  await sendBatchPush(pushPayloads);

  if (logInserts.length > 0) {
    await db.from('reminder_notification_log').insert(logInserts);
  }

  return new Response(
    JSON.stringify({
      ok: true,
      date: todayISO,
      notificationsSent: pushPayloads.length,
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
});
