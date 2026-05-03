import { supabase } from '@/lib/supabase/client';
import type { NotificationType } from '@/types/database';

interface NotifyFamilyPayload {
  actorId: string;
  type: NotificationType;
  titleHi: string;
  titleEn: string;
  bodyHi: string;
  bodyEn: string;
  data?: Record<string, unknown>;
}

/**
 * notifyFamilyL1 — fan out a notification to every Level-1 family member of
 * the actor. Two-channel delivery: writes a `notifications` row (in-app bell
 * badge, always works) and invokes the `send-push` edge function (mobile push,
 * works only for users with a registered push_token).
 *
 * Both channels fail silently per-recipient — a missing push token or a single
 * failed insert must not block the actor's primary action (creating the post
 * or event).
 *
 * Mirrors the RN postStore push fan-out so a post created on web triggers the
 * same family ripple as one created from the mobile app.
 */
export async function notifyFamilyL1(payload: NotifyFamilyPayload): Promise<void> {
  try {
    const { data: l1, error: famErr } = await supabase
      .from('family_members')
      .select('family_member_id')
      .eq('user_id', payload.actorId)
      .eq('connection_level', 1)
      .limit(50);

    if (famErr || !l1?.length) return;

    const recipientIds = l1.map((m: { family_member_id: string }) => m.family_member_id);

    // In-app rows — single batched insert
    const rows = recipientIds.map((uid) => ({
      user_id: uid,
      type: payload.type,
      title: payload.titleEn,
      title_hindi: payload.titleHi,
      body: payload.bodyEn,
      body_hindi: payload.bodyHi,
      data: payload.data ?? null,
      is_read: false,
    }));

    const { error: insErr } = await supabase.from('notifications').insert(rows);
    if (insErr) console.warn('[notifyFamilyL1] in-app insert failed:', insErr.message);

    // Push fan-out — fire-and-forget per recipient via edge function
    await Promise.all(
      recipientIds.map((uid) =>
        supabase.functions.invoke('send-push', {
          body: {
            target_user_id: uid,
            title: payload.titleHi,
            body: payload.bodyHi,
            data: Object.fromEntries(
              Object.entries(payload.data ?? {}).map(([k, v]) => [k, String(v)])
            ),
          },
        }).catch((e) => console.warn('[notifyFamilyL1] push failed:', e))
      )
    );
  } catch (e) {
    console.warn('[notifyFamilyL1] exception:', e);
  }
}
