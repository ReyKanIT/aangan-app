import { NextRequest, NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getPanchang, moonPhaseEmoji, yogaDescription, DELHI } from '@/services/panchangService';
import { timingSafeEqual } from 'crypto';
import {
  type SystemFestival,
  festivalAppliesToState,
  daysBetween,
  istDateStr,
  addDaysIST,
} from '@/lib/festivals';
import {
  upcoming as upcomingTithiEvents,
  type TithiEvent,
} from '@/services/tithiEventService';

// ─────────────────────────────────────────────────────────────────────────────
// Daily Panchang + Festival nudge cron
//
// Two-pass design:
//   Pass A — Daily panchang broadcast: identical for everyone (today's tithi,
//            nakshatra, vara message, special-tithi flag if applicable). Sent
//            once per day, deduped by date.
//   Pass B — Festival reminder, per-user: looks up active festivals in the
//            next N days (default 7, overridable per-user), filters by
//            state_code (regional festivals like Chhath/Karwa Chauth only fire
//            for users in those states), and respects user_festival_prefs
//            opt-outs. Per-user dedup via notifications.data->festival_id
//            check, so each (user, festival) reminder only fires once.
//
// Schema source-of-truth: supabase/migrations/20260428_system_festivals.sql
// ─────────────────────────────────────────────────────────────────────────────

interface SpecialMsg { hi: string; en: string; emoji: string; }

const SPECIAL_TITHI_MESSAGES: Record<string, SpecialMsg> = {
  'पूर्णिमा': { hi: 'आज पूर्णिमा है! चंद्रमा की पूर्ण छटा का आनंद लें।', en: 'Full Moon today! Enjoy the beautiful moonlight.', emoji: '🌕' },
  'अमावस्या': { hi: 'आज अमावस्या है। पितरों को याद करें।', en: 'New Moon today. Remember your ancestors.', emoji: '🌑' },
  'एकादशी':   { hi: 'आज एकादशी है — व्रत का दिन।',           en: 'Ekadashi today — a day of fasting.',          emoji: '🙏' },
};

const VARA_MESSAGES: Record<string, SpecialMsg> = {
  'रविवार':   { hi: 'सूर्य देव को नमन करें।',          en: 'Bow to Lord Surya.',                   emoji: '☀️' },
  'सोमवार':   { hi: 'शिव जी का दिन — ॐ नमः शिवाय।',   en: "Lord Shiva's day — Om Namah Shivaya.", emoji: '🔱' },
  'मंगलवार':  { hi: 'हनुमान जी का दिन — जय बजरंग बली!', en: "Hanuman ji's day — Jai Bajrang Bali!", emoji: '🙏' },
  'बुधवार':   { hi: 'गणेश जी का आशीर्वाद आपके साथ।',    en: "Lord Ganesha's blessings with you.",   emoji: '🐘' },
  'गुरुवार':  { hi: 'गुरुवार — बृहस्पति देव का दिन।',   en: 'Thursday — Day of Lord Brihaspati.',    emoji: '📿' },
  'शुक्रवार': { hi: 'माँ लक्ष्मी का दिन — शुभ लाभ!',    en: "Goddess Lakshmi's day — Prosperity!",  emoji: '🪷' },
  'शनिवार':   { hi: 'शनि देव का दिन — धैर्य रखें।',     en: "Lord Shani's day — Stay patient.",     emoji: '🪐' },
};

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Missing Supabase service role config');
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function secureCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

// ─── Pass A: build the daily broadcast nudge (identical for everyone) ──────

interface DailyNudge {
  title: string;
  titleHindi: string;
  body: string;
  bodyHindi: string;
  type: 'panchang_special' | 'panchang_daily';
}

function buildDailyNudge(istDate: Date): DailyNudge {
  const panchang = getPanchang(istDate, DELHI);
  const moonEmoji = moonPhaseEmoji(panchang.moonPhasePercent);
  const yogaNote = yogaDescription(panchang.yoga);
  const specialTithi = SPECIAL_TITHI_MESSAGES[panchang.tithi];
  const varaMsg = VARA_MESSAGES[panchang.vara];

  if (specialTithi) {
    return {
      title: `${specialTithi.emoji} ${panchang.vara} — ${panchang.tithi}`,
      titleHindi: `${specialTithi.emoji} ${panchang.vara} — ${panchang.tithi}`,
      body: `${specialTithi.en} | Nakshatra: ${panchang.nakshatra} | Yoga: ${panchang.yoga} (${yogaNote}) | Sunrise: ${panchang.sunrise}`,
      bodyHindi: `${specialTithi.hi} | नक्षत्र: ${panchang.nakshatra} | योग: ${panchang.yoga} (${yogaNote}) | सूर्योदय: ${panchang.sunrise}`,
      type: 'panchang_special',
    };
  }

  return {
    title: `${moonEmoji} शुभ प्रभात — ${panchang.vara}`,
    titleHindi: `${moonEmoji} शुभ प्रभात — ${panchang.vara}`,
    body: `${panchang.tithi} (${panchang.paksha}) | Nakshatra: ${panchang.nakshatra} | Yoga: ${panchang.yoga} (${yogaNote}) | Sunrise: ${panchang.sunrise}`,
    bodyHindi: `${varaMsg?.hi ?? 'शुभ दिन!'} ${panchang.tithi} (${panchang.paksha}) | नक्षत्र: ${panchang.nakshatra} | योग: ${panchang.yoga} (${yogaNote}) | सूर्योदय: ${panchang.sunrise}`,
    type: 'panchang_daily',
  };
}

// ─── Pass B: per-user festival reminders ────────────────────────────────────

interface UserRow {
  id: string;
  push_token: string | null;
  state_code: string | null;
}

interface PrefRow {
  user_id: string;
  festival_id: string;
  opt_in: boolean;
  notify_days_before: number | null;
}

async function loadActiveFestivals(supabase: SupabaseClient, todayStr: string, maxLookahead: number): Promise<SystemFestival[]> {
  const horizon = addDaysIST(todayStr, maxLookahead);
  const { data, error } = await supabase
    .from('system_festivals')
    .select('*')
    .eq('is_active', true)
    .gte('date', todayStr)
    .lte('date', horizon)
    .order('date', { ascending: true });
  if (error) throw error;
  return (data ?? []) as SystemFestival[];
}

async function loadPrefs(supabase: SupabaseClient, userIds: string[]): Promise<Map<string, PrefRow[]>> {
  if (userIds.length === 0) return new Map();
  const { data, error } = await supabase
    .from('user_festival_prefs')
    .select('user_id, festival_id, opt_in, notify_days_before')
    .in('user_id', userIds);
  if (error) throw error;
  const byUser = new Map<string, PrefRow[]>();
  for (const row of (data ?? []) as PrefRow[]) {
    if (!byUser.has(row.user_id)) byUser.set(row.user_id, []);
    byUser.get(row.user_id)!.push(row);
  }
  return byUser;
}

function pickFestivalForUser(
  user: UserRow,
  festivals: SystemFestival[],
  userPrefs: PrefRow[] | undefined,
  todayStr: string
): SystemFestival | null {
  const optedOut = new Set((userPrefs ?? []).filter((p) => !p.opt_in).map((p) => p.festival_id));
  const customLead = new Map((userPrefs ?? []).filter((p) => p.notify_days_before !== null).map((p) => [p.festival_id, p.notify_days_before as number]));

  // Walk soonest-first; pick the first festival that:
  //   - matches user's state
  //   - is not opted-out
  //   - is within the user's lead-time window
  for (const f of festivals) {
    if (optedOut.has(f.id)) continue;
    if (!festivalAppliesToState(f.region, user.state_code)) continue;
    const lead = customLead.get(f.id) ?? f.notify_days_before;
    const days = daysBetween(todayStr, f.date);
    if (days >= 0 && days <= lead) return f;
  }
  return null;
}

function buildFestivalNudge(festival: SystemFestival, daysUntil: number) {
  const icon = festival.icon ?? '🎉';
  const daysHi = daysUntil === 0 ? 'आज' : daysUntil === 1 ? 'कल' : `${daysUntil} दिन बाद`;
  const daysEn = daysUntil === 0 ? 'today' : daysUntil === 1 ? 'tomorrow' : `in ${daysUntil} days`;
  return {
    title: `${icon} ${festival.name_hi} ${daysHi}!`,
    titleHindi: `${icon} ${festival.name_hi} ${daysHi}!`,
    body: `${festival.name_en} ${daysEn}${festival.description_en ? ' — ' + festival.description_en : ''}`,
    bodyHindi: `${festival.name_hi} ${daysHi}${festival.description_hi ? ' — ' + festival.description_hi : ''}`,
  };
}

// ─── API Route Handler ───────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('CRON_SECRET environment variable is not configured');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader || !secureCompare(authHeader, `Bearer ${cronSecret}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = getServiceClient();
    const todayStr = istDateStr();
    const istDate = new Date(todayStr + 'T08:00:00+05:30'); // 8 AM IST as nominal "today" for panchang

    // ─── Pass A: daily broadcast nudge ───
    const daily = buildDailyNudge(istDate);

    // Date-based dedup — has any panchang nudge gone out today?
    const { data: anyDailyToday } = await supabase
      .from('notifications')
      .select('id')
      .eq('type', 'general')
      .gte('created_at', `${todayStr}T00:00:00+05:30`)
      .lte('created_at', `${todayStr}T23:59:59+05:30`)
      .or('data->nudge_type.eq.panchang_special,data->nudge_type.eq.panchang_daily')
      .limit(1);
    const dailyAlreadySent = (anyDailyToday ?? []).length > 0;

    // ─── Load all users + their festival prefs (paginated) ───
    const allUsers: UserRow[] = [];
    let offset = 0;
    const PAGE_SIZE = 1000;
    while (true) {
      const { data: page, error: pageErr } = await supabase
        .from('users')
        .select('id, push_token, state_code')
        .range(offset, offset + PAGE_SIZE - 1);
      if (pageErr) throw pageErr;
      if (!page || page.length === 0) break;
      allUsers.push(...(page as UserRow[]));
      if (page.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }

    if (allUsers.length === 0) {
      return NextResponse.json({ message: 'No users found', sent: 0 });
    }

    const MAX_LEAD = 30;
    const festivals = await loadActiveFestivals(supabase, todayStr, MAX_LEAD);
    const prefsByUser = await loadPrefs(supabase, allUsers.map((u) => u.id));

    // ─── Pass A insert: daily broadcast (skip if already sent) ───
    interface NotificationRow {
      user_id: string;
      type: 'general';
      title: string;
      title_hindi: string;
      body: string;
      body_hindi: string;
      data: Record<string, unknown>;
      is_read: boolean;
    }
    const dailyRows: NotificationRow[] = dailyAlreadySent
      ? []
      : allUsers.map((u) => ({
          user_id: u.id,
          type: 'general',
          title: daily.title,
          title_hindi: daily.titleHindi,
          body: daily.body,
          body_hindi: daily.bodyHindi,
          data: { nudge_type: daily.type },
          is_read: false,
        }));

    // ─── Pass B insert: per-user festival reminders ───
    type Row = NotificationRow;
    const festivalRows: Row[] = [];
    const festivalReminderUsers: { user: UserRow; festivalId: string; daysUntil: number }[] = [];
    for (const user of allUsers) {
      const f = pickFestivalForUser(user, festivals, prefsByUser.get(user.id), todayStr);
      if (!f) continue;
      const daysUntil = daysBetween(todayStr, f.date);
      const fnudge = buildFestivalNudge(f, daysUntil);
      festivalRows.push({
        user_id: user.id,
        type: 'general' as const,
        title: fnudge.title,
        title_hindi: fnudge.titleHindi,
        body: fnudge.body,
        body_hindi: fnudge.bodyHindi,
        data: { nudge_type: 'festival', festival_id: f.id, days_until: daysUntil },
        is_read: false,
      });
      festivalReminderUsers.push({ user, festivalId: f.id, daysUntil });
    }

    // Per-user, per-festival dedup — filter out (user, festival) pairs that
    // already received a reminder for this festival_id on any prior day.
    let dedupedFestivalRows = festivalRows;
    if (festivalReminderUsers.length > 0) {
      const candidates = festivalReminderUsers.map((r) => ({ uid: r.user.id, fid: r.festivalId }));
      // Pull existing festival reminders for any of the candidate (user, festival)
      // pairs. Postgres OR can get long — chunk to keep the query reasonable.
      const seen = new Set<string>();
      const CHUNK = 200;
      for (let i = 0; i < candidates.length; i += CHUNK) {
        const slice = candidates.slice(i, i + CHUNK);
        const userIds = Array.from(new Set(slice.map((c) => c.uid)));
        const festIds = Array.from(new Set(slice.map((c) => c.fid)));
        const { data: existing } = await supabase
          .from('notifications')
          .select('user_id, data')
          .in('user_id', userIds)
          .contains('data', { nudge_type: 'festival' });
        for (const row of (existing ?? []) as { user_id: string; data: { festival_id?: string } }[]) {
          const fid = row.data?.festival_id;
          if (fid && festIds.includes(fid)) seen.add(`${row.user_id}:${fid}`);
        }
      }
      dedupedFestivalRows = festivalRows.filter((r) => {
        const fid = (r.data as { festival_id?: string }).festival_id;
        return fid && !seen.has(`${r.user_id}:${fid}`);
      });
    }

    // ─── Insert (batched) ───
    const BATCH_SIZE = 500;
    let dailyInserted = 0;
    let festivalInserted = 0;
    const insertBatched = async (rows: Row[]): Promise<number> => {
      let total = 0;
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);
        const { error } = await supabase.from('notifications').insert(batch);
        if (error) console.error(`Batch insert error at offset ${i}:`, error);
        else total += batch.length;
      }
      return total;
    };

    if (dailyRows.length > 0) dailyInserted = await insertBatched(dailyRows);
    if (dedupedFestivalRows.length > 0) festivalInserted = await insertBatched(dedupedFestivalRows);

    // ─── Push setup (declared early so Pass C can append festival-style
    // pushes too — actual send happens at the bottom of the handler) ───
    let pushSent = 0;
    const pushTokenByUser = new Map(
      allUsers
        .filter((u) => u.push_token && u.push_token.startsWith('ExponentPushToken'))
        .map((u) => [u.id, u.push_token!])
    );
    const pushBatch: { to: string; title: string; body: string; data: Record<string, unknown>; sound: 'default'; channelId: string }[] = [];
    if (!dailyAlreadySent) {
      for (const [, token] of pushTokenByUser) {
        pushBatch.push({
          to: token,
          title: daily.titleHindi,
          body: daily.bodyHindi,
          data: { screen: 'Panchang', nudge_type: daily.type },
          sound: 'default',
          channelId: 'reminders',
        });
      }
    }
    for (const r of dedupedFestivalRows) {
      const token = pushTokenByUser.get(r.user_id);
      if (!token) continue;
      pushBatch.push({
        to: token,
        title: r.title_hindi,
        body: r.body_hindi,
        data: { screen: 'Festivals', ...(r.data as Record<string, unknown>) },
        sound: 'default',
        channelId: 'reminders',
      });
    }

    // ─── Pass C: per-user personal events (birthdays/anniversaries/shraddha)
    // Dual-calendar: each user's tithi_events fire on BOTH the next tithi
    // anniversary AND the next Gregorian (English-date) anniversary, when
    // either falls within the event's notify_days_before window.
    let personalInserted = 0;
    let personalEventsLoaded = 0;
    try {
      const { data: tithiEventRows } = await supabase
        .from('tithi_events')
        .select('id, user_id, name, type, tithi_number, paksha, masa, gregorian_ref, note, notify_days_before')
        .eq('is_active', true);

      type TithiRow = {
        id: string; user_id: string; name: string; type: TithiEvent['type'];
        tithi_number: number; paksha: 'shukla' | 'krishna'; masa: number;
        gregorian_ref: string | null; note: string | null; notify_days_before: number;
      };
      personalEventsLoaded = (tithiEventRows ?? []).length;

      // Group by user
      const eventsByUser = new Map<string, { row: TithiRow; event: TithiEvent }[]>();
      for (const r of (tithiEventRows ?? []) as TithiRow[]) {
        const event: TithiEvent = {
          id: r.id, name: r.name, type: r.type,
          tithiNumber: r.tithi_number, paksha: r.paksha, masa: r.masa,
          gregorianReference: r.gregorian_ref ?? undefined,
          note: r.note ?? undefined,
          createdAt: '',
        };
        if (!eventsByUser.has(r.user_id)) eventsByUser.set(r.user_id, []);
        eventsByUser.get(r.user_id)!.push({ row: r, event });
      }

      const todayDate = new Date(todayStr + 'T06:00:00+05:30');
      const personalRows: NotificationRow[] = [];
      const personalKeys: { user_id: string; event_id: string; date: string; src: string }[] = [];

      for (const user of allUsers) {
        const userEvents = eventsByUser.get(user.id);
        if (!userEvents || userEvents.length === 0) continue;
        // Compute upcoming (both tithi + Gregorian) within next 14 days
        const matches = upcomingTithiEvents(userEvents.map((x) => x.event), 14, todayDate);
        for (const m of matches) {
          const er = userEvents.find((x) => x.event.id === m.event.id)?.row;
          if (!er) continue;
          // Apply per-event lead time
          if (m.daysAway > er.notify_days_before) continue;

          const icon = er.type === 'birthday' ? '🎂' : er.type === 'anniversary' ? '💍' :
                       er.type === 'shraddha' ? '🙏' : er.type === 'festival' ? '🎉' : '📌';
          const calendarTagHi = m.calendarSource === 'tithi' ? '(तिथि)' : '(तारीख़)';
          const calendarTagEn = m.calendarSource === 'tithi' ? '(by tithi)' : '(by date)';
          const daysHi = m.daysAway === 0 ? 'आज' : m.daysAway === 1 ? 'कल' : `${m.daysAway} दिन बाद`;
          const daysEn = m.daysAway === 0 ? 'today' : m.daysAway === 1 ? 'tomorrow' : `in ${m.daysAway} days`;

          const dateKey = istDateStr(m.date);
          const srcKey = m.calendarSource ?? 'tithi';
          personalRows.push({
            user_id: user.id,
            type: 'general',
            title: `${icon} ${er.name} — ${daysHi} ${calendarTagHi}`,
            title_hindi: `${icon} ${er.name} — ${daysHi} ${calendarTagHi}`,
            body: `${er.name} ${daysEn} ${calendarTagEn}${er.note ? ' — ' + er.note : ''}`,
            body_hindi: `${er.name} ${daysHi} ${calendarTagHi}${er.note ? ' — ' + er.note : ''}`,
            data: { nudge_type: 'tithi_event', event_id: er.id, date: dateKey, calendar_source: srcKey, days_until: m.daysAway },
            is_read: false,
          });
          personalKeys.push({ user_id: user.id, event_id: er.id, date: dateKey, src: srcKey });
        }
      }

      // Per (user, event, target-date, calendar) dedup — once a reminder
      // fires for a specific anniversary date, don't fire it again on
      // subsequent cron runs in the lead-window.
      let dedupedPersonalRows = personalRows;
      if (personalKeys.length > 0) {
        const userIds = Array.from(new Set(personalKeys.map((k) => k.user_id)));
        const { data: existing } = await supabase
          .from('notifications')
          .select('user_id, data')
          .in('user_id', userIds)
          .contains('data', { nudge_type: 'tithi_event' });
        const seen = new Set<string>();
        for (const row of (existing ?? []) as { user_id: string; data: { event_id?: string; date?: string; calendar_source?: string } }[]) {
          if (row.data?.event_id && row.data?.date) {
            seen.add(`${row.user_id}:${row.data.event_id}:${row.data.date}:${row.data.calendar_source ?? 'tithi'}`);
          }
        }
        dedupedPersonalRows = personalRows.filter((_, i) => {
          const k = personalKeys[i];
          return !seen.has(`${k.user_id}:${k.event_id}:${k.date}:${k.src}`);
        });
      }

      if (dedupedPersonalRows.length > 0) personalInserted = await insertBatched(dedupedPersonalRows);

      // Push fan-out for personal events
      for (const r of dedupedPersonalRows) {
        const token = pushTokenByUser.get(r.user_id);
        if (!token) continue;
        pushBatch.push({
          to: token,
          title: r.title_hindi,
          body: r.body_hindi,
          data: { screen: 'TithiReminders', ...(r.data as Record<string, unknown>) },
          sound: 'default',
          channelId: 'reminders',
        });
      }
    } catch (e) {
      // Table may not be applied yet — log and skip Pass C gracefully.
      console.error('Pass C (personal events) error:', e);
    }

    // ─── Send all queued push notifications (daily + festival + personal)
    if (pushBatch.length > 0) {
      const PUSH_BATCH = 100;
      for (let i = 0; i < pushBatch.length; i += PUSH_BATCH) {
        const slice = pushBatch.slice(i, i + PUSH_BATCH);
        try {
          const resp = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify(slice),
          });
          if (resp.ok) pushSent += slice.length;
        } catch (e) {
          console.error('Push send error:', e);
        }
      }
    }

    return NextResponse.json({
      message: 'Panchang + festival + personal-event nudges processed',
      stats: {
        usersTotal: allUsers.length,
        dailyAlreadySent,
        dailyType: daily.type,
        dailyInserted,
        festivalsLoaded: festivals.length,
        festivalRemindersInserted: festivalInserted,
        personalEventsLoaded,
        personalRemindersInserted: personalInserted,
        pushNotificationsSent: pushSent,
      },
    });
  } catch (error) {
    console.error('Panchang nudge error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
