import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getPanchang, moonPhaseEmoji, yogaDescription, DELHI } from '@/services/panchangService';
import { timingSafeEqual } from 'crypto';

// ─── Festival data (2026–2027) ───────────────────────────────────────────────
interface Festival {
  name: string;
  nameHindi: string;
  date: string;
  icon: string;
}

const FESTIVALS: Festival[] = [
  { name: 'Ram Navami', nameHindi: 'राम नवमी', date: '2026-04-02', icon: '🏹' },
  { name: 'Hanuman Jayanti', nameHindi: 'हनुमान जयंती', date: '2026-04-04', icon: '🙏' },
  { name: 'Baisakhi', nameHindi: 'बैसाखी', date: '2026-04-14', icon: '🌾' },
  { name: 'Akshaya Tritiya', nameHindi: 'अक्षय तृतीया', date: '2026-04-25', icon: '✨' },
  { name: 'Buddha Purnima', nameHindi: 'बुद्ध पूर्णिमा', date: '2026-05-12', icon: '☸️' },
  { name: 'Rath Yatra', nameHindi: 'रथ यात्रा', date: '2026-06-22', icon: '🛕' },
  { name: 'Guru Purnima', nameHindi: 'गुरु पूर्णिमा', date: '2026-07-11', icon: '📿' },
  { name: 'Raksha Bandhan', nameHindi: 'रक्षा बंधन', date: '2026-08-12', icon: '🎀' },
  { name: 'Janmashtami', nameHindi: 'जन्माष्टमी', date: '2026-08-22', icon: '🪈' },
  { name: 'Ganesh Chaturthi', nameHindi: 'गणेश चतुर्थी', date: '2026-09-07', icon: '🐘' },
  { name: 'Navratri', nameHindi: 'नवरात्रि', date: '2026-10-08', icon: '🪔' },
  { name: 'Dussehra', nameHindi: 'दशहरा', date: '2026-10-17', icon: '🔥' },
  { name: 'Karwa Chauth', nameHindi: 'करवा चौथ', date: '2026-10-27', icon: '🌙' },
  { name: 'Diwali', nameHindi: 'दिवाली', date: '2026-11-05', icon: '🪔' },
  { name: 'Bhai Dooj', nameHindi: 'भाई दूज', date: '2026-11-07', icon: '👫' },
  { name: 'Chhath Puja', nameHindi: 'छठ पूजा', date: '2026-11-09', icon: '☀️' },
  { name: 'Makar Sankranti', nameHindi: 'मकर संक्रांति', date: '2027-01-14', icon: '🪁' },
  { name: 'Republic Day', nameHindi: 'गणतंत्र दिवस', date: '2027-01-26', icon: '🇮🇳' },
  { name: 'Maha Shivaratri', nameHindi: 'महा शिवरात्रि', date: '2027-02-17', icon: '🔱' },
  { name: 'Holi', nameHindi: 'होली', date: '2027-03-04', icon: '🎨' },
];

// ─── Special tithi messages ──────────────────────────────────────────────────
const SPECIAL_TITHI_MESSAGES: Record<string, { hi: string; en: string; emoji: string }> = {
  'पूर्णिमा': { hi: 'आज पूर्णिमा है! चंद्रमा की पूर्ण छटा का आनंद लें।', en: 'Full Moon today! Enjoy the beautiful moonlight.', emoji: '🌕' },
  'अमावस्या': { hi: 'आज अमावस्या है। पितरों को याद करें।', en: 'New Moon today. Remember your ancestors.', emoji: '🌑' },
  'एकादशी': { hi: 'आज एकादशी है — व्रत का दिन।', en: 'Ekadashi today — a day of fasting.', emoji: '🙏' },
};

// ─── Vara (day) special messages ─────────────────────────────────────────────
const VARA_MESSAGES: Record<string, { hi: string; en: string; emoji: string }> = {
  'रविवार': { hi: 'सूर्य देव को नमन करें।', en: 'Bow to Lord Surya.', emoji: '☀️' },
  'सोमवार': { hi: 'शिव जी का दिन — ॐ नमः शिवाय।', en: "Lord Shiva's day — Om Namah Shivaya.", emoji: '🔱' },
  'मंगलवार': { hi: 'हनुमान जी का दिन — जय बजरंग बली!', en: "Hanuman ji's day — Jai Bajrang Bali!", emoji: '🙏' },
  'बुधवार': { hi: 'गणेश जी का आशीर्वाद आपके साथ।', en: "Lord Ganesha's blessings with you.", emoji: '🐘' },
  'गुरुवार': { hi: 'गुरुवार — बृहस्पति देव का दिन।', en: 'Thursday — Day of Lord Brihaspati.', emoji: '📿' },
  'शुक्रवार': { hi: 'माँ लक्ष्मी का दिन — शुभ लाभ!', en: "Goddess Lakshmi's day — Prosperity!", emoji: '🪷' },
  'शनिवार': { hi: 'शनि देव का दिन — धैर्य रखें।', en: "Lord Shani's day — Stay patient.", emoji: '🪐' },
};

// ─── IST date helper (reliable, no anti-pattern) ────────────────────────────
function getISTDate(): { date: Date; dateStr: string } {
  const now = new Date();
  // IST = UTC + 5:30 = UTC + 330 minutes
  const istOffsetMs = 330 * 60 * 1000;
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60 * 1000;
  const istMs = utcMs + istOffsetMs;
  const istDate = new Date(istMs);
  // Format YYYY-MM-DD manually from IST components
  const y = istDate.getFullYear();
  const m = String(istDate.getMonth() + 1).padStart(2, '0');
  const d = String(istDate.getDate()).padStart(2, '0');
  return { date: istDate, dateStr: `${y}-${m}-${d}` };
}

// ─── Supabase service client ─────────────────────────────────────────────────
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Missing Supabase service role config');
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ─── Secure comparison ──────────────────────────────────────────────────────
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

// ─── Build today's nudge message ─────────────────────────────────────────────
function buildNudgeMessage(todayIST: Date, todayStr: string): {
  title: string;
  titleHindi: string;
  body: string;
  bodyHindi: string;
  type: string;
} {
  const panchang = getPanchang(todayIST, DELHI);
  const moonEmoji = moonPhaseEmoji(panchang.moonPhasePercent);
  const yogaNote = yogaDescription(panchang.yoga);

  // Check for today's festival
  const todayFestival = FESTIVALS.find(f => f.date === todayStr);

  // Check for upcoming festival (next 3 days)
  const todayMs = new Date(todayStr + 'T00:00:00+05:30').getTime();
  const threeDaysMs = todayMs + 3 * 86400000;
  const upcomingFestival = FESTIVALS.find(f => {
    const fMs = new Date(f.date + 'T00:00:00+05:30').getTime();
    return fMs > todayMs && fMs <= threeDaysMs;
  });

  // Special tithi check
  const specialTithi = SPECIAL_TITHI_MESSAGES[panchang.tithi];

  // ─── Priority: Festival today > Special Tithi > Upcoming Festival > Daily Panchang
  if (todayFestival) {
    return {
      title: `${todayFestival.icon} आज ${todayFestival.nameHindi} है!`,
      titleHindi: `${todayFestival.icon} आज ${todayFestival.nameHindi} है!`,
      body: `Happy ${todayFestival.name}! ${panchang.vara}, ${panchang.tithi} (${panchang.paksha}) | ${moonEmoji} Nakshatra: ${panchang.nakshatra}`,
      bodyHindi: `${todayFestival.nameHindi} की हार्दिक शुभकामनाएँ! ${panchang.vara}, ${panchang.tithi} (${panchang.paksha}) | ${moonEmoji} नक्षत्र: ${panchang.nakshatra}`,
      type: 'festival',
    };
  }

  if (specialTithi) {
    return {
      title: `${specialTithi.emoji} ${panchang.vara} — ${panchang.tithi}`,
      titleHindi: `${specialTithi.emoji} ${panchang.vara} — ${panchang.tithi}`,
      body: `${specialTithi.en} | Nakshatra: ${panchang.nakshatra} | Yoga: ${panchang.yoga} (${yogaNote}) | Sunrise: ${panchang.sunrise}`,
      bodyHindi: `${specialTithi.hi} | नक्षत्र: ${panchang.nakshatra} | योग: ${panchang.yoga} (${yogaNote}) | सूर्योदय: ${panchang.sunrise}`,
      type: 'panchang_special',
    };
  }

  if (upcomingFestival) {
    const daysUntil = Math.ceil((new Date(upcomingFestival.date + 'T00:00:00+05:30').getTime() - todayMs) / 86400000);
    const daysText = daysUntil === 1 ? 'कल' : `${daysUntil} दिन बाद`;
    const daysTextEn = daysUntil === 1 ? 'tomorrow' : `in ${daysUntil} days`;
    return {
      title: `${moonEmoji} शुभ प्रभात — ${panchang.vara}`,
      titleHindi: `${moonEmoji} शुभ प्रभात — ${panchang.vara}`,
      body: `${panchang.tithi} (${panchang.paksha}) | ${upcomingFestival.icon} ${upcomingFestival.name} ${daysTextEn}! | Sunrise: ${panchang.sunrise}`,
      bodyHindi: `${panchang.tithi} (${panchang.paksha}) | ${upcomingFestival.icon} ${upcomingFestival.nameHindi} ${daysText}! | सूर्योदय: ${panchang.sunrise}`,
      type: 'panchang_upcoming',
    };
  }

  // Default daily panchang nudge
  const varaMsg = VARA_MESSAGES[panchang.vara];
  return {
    title: `${moonEmoji} शुभ प्रभात — ${panchang.vara}`,
    titleHindi: `${moonEmoji} शुभ प्रभात — ${panchang.vara}`,
    body: `${panchang.tithi} (${panchang.paksha}) | Nakshatra: ${panchang.nakshatra} | Yoga: ${panchang.yoga} (${yogaNote}) | Sunrise: ${panchang.sunrise}`,
    bodyHindi: `${varaMsg?.hi ?? 'शुभ दिन!'} ${panchang.tithi} (${panchang.paksha}) | नक्षत्र: ${panchang.nakshatra} | योग: ${panchang.yoga} (${yogaNote}) | सूर्योदय: ${panchang.sunrise}`,
    type: 'panchang_daily',
  };
}

// ─── API Route Handler ───────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  // ─── P0 FIX: CRON_SECRET must be configured ───
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

    // ─── P1 FIX: Reliable IST date (no toLocaleString anti-pattern) ───
    const { date: istDate, dateStr: todayStr } = getISTDate();

    // Build the nudge message
    const nudge = buildNudgeMessage(istDate, todayStr);

    // ─── P0 FIX: Date-based dedup (works for ALL nudge types) ───
    const { data: existingNudge } = await supabase
      .from('notifications')
      .select('id')
      .eq('type', 'general')
      .gte('created_at', `${todayStr}T00:00:00+05:30`)
      .lte('created_at', `${todayStr}T23:59:59+05:30`)
      .contains('data', { nudge_type: nudge.type })
      .limit(1);

    // Also check for ANY panchang nudge today (prevents double-send if type changes)
    const { data: anyNudgeToday } = await supabase
      .from('notifications')
      .select('id')
      .eq('type', 'general')
      .gte('created_at', `${todayStr}T00:00:00+05:30`)
      .lte('created_at', `${todayStr}T23:59:59+05:30`)
      .or('data->nudge_type.eq.festival,data->nudge_type.eq.panchang_special,data->nudge_type.eq.panchang_upcoming,data->nudge_type.eq.panchang_daily')
      .limit(1);

    if ((existingNudge && existingNudge.length > 0) || (anyNudgeToday && anyNudgeToday.length > 0)) {
      return NextResponse.json({ message: 'Nudge already sent today', sent: 0 });
    }

    // Get all active users (paginated to avoid memory issues)
    let allUsers: { id: string; push_token: string | null }[] = [];
    let offset = 0;
    const PAGE_SIZE = 1000;
    while (true) {
      const { data: page, error: pageErr } = await supabase
        .from('users')
        .select('id, push_token')
        .range(offset, offset + PAGE_SIZE - 1);
      if (pageErr) throw pageErr;
      if (!page || page.length === 0) break;
      allUsers = allUsers.concat(page);
      if (page.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }

    if (allUsers.length === 0) {
      return NextResponse.json({ message: 'No users found', sent: 0 });
    }

    // Insert in-app notifications in batches of 500
    const BATCH_SIZE = 500;
    let totalInserted = 0;
    for (let i = 0; i < allUsers.length; i += BATCH_SIZE) {
      const batch = allUsers.slice(i, i + BATCH_SIZE).map(user => ({
        user_id: user.id,
        type: 'general' as const,
        title: nudge.title,
        title_hindi: nudge.titleHindi,
        body: nudge.body,
        body_hindi: nudge.bodyHindi,
        data: { nudge_type: nudge.type },
        is_read: false,
      }));
      const { error: insertErr } = await supabase.from('notifications').insert(batch);
      if (insertErr) {
        console.error(`Batch insert error at offset ${i}:`, insertErr);
      } else {
        totalInserted += batch.length;
      }
    }

    // Send push notifications to users with Expo push tokens
    const pushTokens = allUsers
      .filter(u => u.push_token && u.push_token.startsWith('ExponentPushToken'))
      .map(u => u.push_token!);

    let pushSent = 0;
    if (pushTokens.length > 0) {
      const PUSH_BATCH = 100;
      for (let i = 0; i < pushTokens.length; i += PUSH_BATCH) {
        const batch = pushTokens.slice(i, i + PUSH_BATCH).map(token => ({
          to: token,
          title: nudge.titleHindi,
          body: nudge.bodyHindi,
          data: { screen: 'Panchang', nudge_type: nudge.type },
          sound: 'default' as const,
          channelId: 'reminders',
        }));

        try {
          const resp = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify(batch),
          });
          if (resp.ok) pushSent += batch.length;
        } catch (e) {
          console.error('Push send error:', e);
        }
      }
    }

    return NextResponse.json({
      message: 'Panchang nudge sent',
      type: nudge.type,
      stats: {
        usersTotal: allUsers.length,
        notificationsInserted: totalInserted,
        pushNotificationsSent: pushSent,
      },
    });
  } catch (error) {
    // Log full error server-side; return generic message to caller so
    // DB error details / stack traces don't leak through the response.
    console.error('Panchang nudge error:', error);
    return NextResponse.json(
      { error: 'Internal error' },
      { status: 500 },
    );
  }
}
