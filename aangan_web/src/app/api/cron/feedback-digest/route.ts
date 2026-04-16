import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { timingSafeEqual } from 'crypto';

// ─── Service-role client ─────────────────────────────────────
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

// ─── IST window helper (yesterday-6PM → today-6PM) ──────────
function getISTDigestWindow(): { fromIso: string; toIso: string; istDateStr: string } {
  const now = new Date();
  const istOffsetMs = 330 * 60 * 1000;
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60 * 1000;
  const istNow = new Date(utcMs + istOffsetMs);
  const y = istNow.getFullYear();
  const m = String(istNow.getMonth() + 1).padStart(2, '0');
  const d = String(istNow.getDate()).padStart(2, '0');
  const istDateStr = `${y}-${m}-${d}`;

  // Window: previous day 6:00 PM IST  →  today 6:00 PM IST
  const toIso = `${istDateStr}T18:00:00+05:30`;
  const yesterday = new Date(new Date(toIso).getTime() - 24 * 60 * 60 * 1000);
  const fromIso = yesterday.toISOString();

  return { fromIso, toIso, istDateStr };
}

interface TicketRow {
  id: string;
  ticket_number: string;
  user_id: string;
  category: string;
  subject: string;
  status: string;
  priority: string;
  created_at: string;
  user?: { display_name: string | null; phone_number: string | null } | null;
}

interface MessageRow {
  ticket_id: string;
  message: string;
  created_at: string;
  is_from_support: boolean;
}

export async function GET(request: NextRequest) {
  // ─── Auth ────────────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !secureCompare(authHeader, `Bearer ${cronSecret}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = getServiceClient();
    const { fromIso, toIso, istDateStr } = getISTDigestWindow();

    // ─── 1. Fetch tickets created in the window ─────────────
    const { data: ticketsRaw, error: tErr } = await supabase
      .from('support_tickets')
      .select(
        `id, ticket_number, user_id, category, subject, status, priority, created_at,
         user:users!user_id (display_name, phone_number)`,
      )
      .gte('created_at', fromIso)
      .lt('created_at', toIso)
      .order('created_at', { ascending: false });

    if (tErr) throw tErr;
    const tickets = (ticketsRaw ?? []) as unknown as TicketRow[];

    // ─── 2. Fetch the first user message of each ticket ─────
    let messages: MessageRow[] = [];
    if (tickets.length > 0) {
      const ids = tickets.map((t) => t.id);
      const { data: msgRaw, error: mErr } = await supabase
        .from('support_messages')
        .select('ticket_id, message, created_at, is_from_support')
        .in('ticket_id', ids)
        .eq('is_from_support', false)
        .eq('is_internal_note', false)
        .order('created_at', { ascending: true });
      if (mErr) throw mErr;
      messages = (msgRaw ?? []) as MessageRow[];
    }
    const firstMsgByTicket = new Map<string, string>();
    for (const m of messages) {
      if (!firstMsgByTicket.has(m.ticket_id)) firstMsgByTicket.set(m.ticket_id, m.message);
    }

    // ─── 3. Build digest payload ────────────────────────────
    const counts: Record<string, number> = {
      feature_request: 0,
      bug_report: 0,
      complaint: 0,
      general: 0,
      billing: 0,
      account: 0,
    };
    const items = tickets.map((t) => {
      counts[t.category] = (counts[t.category] ?? 0) + 1;
      return {
        ticket_number: t.ticket_number,
        category: t.category,
        priority: t.priority,
        status: t.status,
        user_name: t.user?.display_name ?? 'Unknown',
        user_phone: t.user?.phone_number ?? null,
        message: firstMsgByTicket.get(t.id) ?? t.subject,
        created_at: t.created_at,
      };
    });

    const totalCount = tickets.length;
    const summaryLine =
      totalCount === 0
        ? `${istDateStr}: कोई नया फ़ीडबैक नहीं — No new feedback today.`
        : `${istDateStr}: ${totalCount} new — ` +
          `🐛${counts.bug_report} 💡${counts.feature_request} ` +
          `😟${counts.complaint} 💬${counts.general}`;

    // ─── 4. Fetch admin user IDs ────────────────────────────
    const { data: admins, error: aErr } = await supabase
      .from('users')
      .select('id')
      .or('is_app_admin.eq.true,admin_role.not.is.null');
    if (aErr) throw aErr;
    const adminIds = (admins ?? []).map((a) => a.id);

    // ─── 5. Insert in-app notification for each admin ───────
    let notificationsInserted = 0;
    if (adminIds.length > 0) {
      const rows = adminIds.map((id) => ({
        user_id: id,
        type: 'general' as const,
        title: `📬 Daily Feedback Digest — ${istDateStr}`,
        title_hindi: `📬 दैनिक फ़ीडबैक रिपोर्ट — ${istDateStr}`,
        body: summaryLine,
        body_hindi: summaryLine,
        data: {
          digest_type: 'feedback_daily',
          date: istDateStr,
          window_from: fromIso,
          window_to: toIso,
          counts,
          total: totalCount,
          items,
        },
        is_read: false,
      }));
      const { error: insertErr } = await supabase.from('notifications').insert(rows);
      if (insertErr) {
        console.error('Admin notification insert error:', insertErr);
      } else {
        notificationsInserted = rows.length;
      }
    }

    // ─── 6. Optional webhook delivery (Slack/Discord/Telegram) ──
    const webhook = process.env.FEEDBACK_DIGEST_WEBHOOK;
    let webhookSent = false;
    if (webhook && totalCount > 0) {
      try {
        const lines = items
          .slice(0, 20)
          .map(
            (it, i) =>
              `${i + 1}. [${it.category}] ${it.user_name}: ${it.message.slice(0, 200)}`,
          )
          .join('\n');
        const text = `*Aangan Daily Feedback — ${istDateStr}*\n${summaryLine}\n\n${lines}`;

        // Telegram expects { chat_id, text } in the body.
        // Slack / Discord / generic use { text, content }.
        const isTelegram = webhook.includes('api.telegram.org');
        const chatId = isTelegram ? new URL(webhook).searchParams.get('chat_id') : null;
        if (isTelegram && !chatId) {
          console.error('Telegram webhook missing chat_id in URL params — skipping delivery');
        }
        const body = isTelegram && chatId
          ? JSON.stringify({
              chat_id: chatId,
              text,
              parse_mode: 'Markdown',
              disable_web_page_preview: true,
            })
          : JSON.stringify({ text, content: text });

        const r = await fetch(webhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
        });
        webhookSent = r.ok;
        if (!r.ok) {
          const errBody = await r.text().catch(() => '');
          console.error('Webhook delivery non-OK:', r.status, errBody.slice(0, 200));
        }
      } catch (e) {
        console.error('Webhook delivery failed:', e);
      }
    }

    return NextResponse.json({
      message: 'Feedback digest generated',
      date: istDateStr,
      total: totalCount,
      counts,
      adminsNotified: notificationsInserted,
      webhookSent,
    });
  } catch (error) {
    console.error('Feedback digest error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 },
    );
  }
}
