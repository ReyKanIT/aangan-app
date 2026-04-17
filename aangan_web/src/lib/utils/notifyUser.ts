import { supabase } from '@/lib/supabase/client';
import type { NotificationType } from '@/types/database';

interface NotifyPayload {
  userId: string;
  type: NotificationType;
  titleHi: string;
  titleEn: string;
  bodyHi: string;
  bodyEn: string;
  data?: Record<string, unknown>;
}

/**
 * notifyUser — inserts a row into `notifications` so the recipient sees
 * a badge on their bell icon next time they open the app. Used when admins
 * reply or resolve an issue.
 *
 * Fails silently — notification delivery shouldn't block the primary action
 * (replying to the ticket). A broken notifications table is surprising but
 * not critical to the user's flow. Errors are logged to console for triage.
 */
export async function notifyUser(payload: NotifyPayload): Promise<boolean> {
  try {
    const { error } = await supabase.from('notifications').insert({
      user_id: payload.userId,
      type: payload.type,
      title: payload.titleEn,
      title_hindi: payload.titleHi,
      body: payload.bodyEn,
      body_hindi: payload.bodyHi,
      data: payload.data ?? null,
      is_read: false,
    });
    if (error) {
      console.warn('[notifyUser] failed:', error.message, error.code);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('[notifyUser] exception:', e);
    return false;
  }
}
